//! This module contains all the Tauri commands that can be invoked from the frontend.

use crate::platform::{
    exe_path_from_hwnd, get_icon_base64_from_exe, get_packaged_app_icon_from_hwnd,
    get_window_icon_base64_from_hwnd, get_window_title,
};
use crate::utils::{smooth_move, smooth_resize};
use enigo::{Enigo, MouseControllable};
use std::sync::atomic::{AtomicBool, Ordering};
use std::{thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

// Controls whether toggle_magic_dot is allowed to create the window
// when it doesn't already exist (e.g., disabled on logout).
static ALLOW_MAGIC_DOT_CREATE: AtomicBool = AtomicBool::new(true);
use winapi::um::winuser::{
    GetClipboardSequenceNumber, GetForegroundWindow, IsClipboardFormatAvailable, CF_UNICODETEXT,
};

// Controls the clipboard watcher feature (auto-show magic dot on text copy)
static AUTO_SHOW_ON_COPY: AtomicBool = AtomicBool::new(false);
static CLIPBOARD_WATCHER_RUNNING: AtomicBool = AtomicBool::new(false);

unsafe fn read_clipboard_unicode_text() -> Option<String> {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use winapi::shared::minwindef::HGLOBAL;
    use winapi::um::winbase::{GlobalLock, GlobalUnlock};
    use winapi::um::winuser::{CloseClipboard, GetClipboardData, OpenClipboard};

    if IsClipboardFormatAvailable(CF_UNICODETEXT) == 0 {
        return None;
    }
    if OpenClipboard(std::ptr::null_mut()) == 0 {
        return None;
    }
    let handle: HGLOBAL = GetClipboardData(CF_UNICODETEXT);
    if handle.is_null() {
        CloseClipboard();
        return None;
    }
    let locked = GlobalLock(handle) as *const u16;
    if locked.is_null() {
        CloseClipboard();
        return None;
    }
    // Determine length until null terminator
    let mut len: usize = 0;
    while *locked.add(len) != 0 {
        len += 1;
    }
    let slice = std::slice::from_raw_parts(locked, len);
    let os_string = OsString::from_wide(slice);
    let text = os_string.to_string_lossy().into_owned();
    let _ = GlobalUnlock(handle);
    CloseClipboard();
    Some(text)
}

fn ensure_clipboard_watcher_started(app: &AppHandle) {
    if CLIPBOARD_WATCHER_RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }
    let app_handle = app.clone();
    std::thread::spawn(move || {
        println!("clipboard watcher started");
        let mut last_text: Option<String> = None;
        let mut last_seq: u32 = unsafe { GetClipboardSequenceNumber() };
        loop {
            if !AUTO_SHOW_ON_COPY.load(Ordering::Relaxed) {
                // Stop watcher
                CLIPBOARD_WATCHER_RUNNING.store(false, Ordering::SeqCst);
                break;
            }
            // Check clipboard sequence number to avoid unnecessary reads
            let seq_now = unsafe { GetClipboardSequenceNumber() };
            if seq_now == last_seq {
                std::thread::sleep(std::time::Duration::from_millis(250));
                continue;
            }
            last_seq = seq_now;

            // Try to read clipboard text (ignore errors)
            let current = unsafe { read_clipboard_unicode_text() }
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());

            if let Some(ref txt) = current {
                let is_new = match last_text {
                    Some(ref prev) => prev != txt,
                    None => true,
                };
                // Emit only when text changed and is not trivially short
                if is_new && txt.len() >= 3 {
                    // Immediately show magic dot regardless of hidden state
                    show_magic_dot(app_handle.clone());
                    // Emit event as well (for any UI listeners)
                    let _ = app_handle
                        .emit("clipboard_text_copied", serde_json::json!({ "text": txt }));
                    println!(
                        "clipboard text detected ({} chars) -> magic dot shown",
                        txt.len()
                    );
                    last_text = current.clone();
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(250));
        }
    });
}

#[tauri::command]
pub fn follow_magic_dot(app: AppHandle) {
    let Some(window) = app.get_webview_window("magic-dot") else {
        println!("Magic-dot window not found");
        return;
    };

    let current_size = window.outer_size().unwrap();

    smooth_resize(
        &window,
        current_size,
        tauri::PhysicalSize {
            width: 20,
            height: 20,
        },
        8,  // steps
        12, // delay in ms
    );

    thread::spawn(move || {
        let enigo = Enigo::new();
        let original_size = tauri::PhysicalSize {
            width: 500,
            height: 60,
        };

        loop {
            let (mouse_x, mouse_y) = enigo.mouse_location();
            if let Ok(position) = window.outer_position() {
                let window_center_x = position.x + 10;
                let window_center_y = position.y + 10;

                let dx = mouse_x - window_center_x;
                let dy = mouse_y - window_center_y;
                let distance = ((dx * dx + dy * dy) as f64).sqrt();

                if distance < 10.0 {
                    // Larger threshold for easier hover
                    let current_dot_size = window.outer_size().unwrap_or(tauri::PhysicalSize {
                        width: 10,
                        height: 10,
                    });

                    // NO ONE FUCKING TOUCHES THIS SHIT IT WORKS FINALLY OMG

                    let win_clone = window.clone();
                    std::thread::spawn(move || {
                        smooth_resize(&win_clone, current_dot_size, original_size, 12, 12);
                    });
                    let _ = app.emit("exit_follow_mode", ());

                    //TOUCH ISKE NEECHE SE PLEASE

                    let _ = app.emit("onboarding_done", ());
                    break;
                } else if distance > 40.0 && (dx.abs() > 1 || dy.abs() > 1) {
                    let new_x = position.x + ((dx as f64) * 0.15) as i32;
                    let new_y = position.y + ((dy as f64) * 0.15) as i32;
                    let _ =
                        window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                            x: new_x,
                            y: new_y,
                        }));
                }
            }
            thread::sleep(Duration::from_millis(4)); // <- the lesser the value the smoother the movement
        }
    });
}

#[tauri::command]
pub fn pin_magic_dot(app: AppHandle) {
    if let Some(window) = app.get_webview_window("magic-dot") {
        if let (Ok(current_pos), Ok(current_size), Ok(Some(monitor))) = (
            window.outer_position(),
            window.outer_size(),
            window.current_monitor(),
        ) {
            let screen_size = monitor.size();
            let center_x = ((screen_size.width as i32 - current_size.width as i32) / 2).max(0);
            let target_pos = tauri::PhysicalPosition { x: center_x, y: 0 };
            smooth_move(&window, current_pos, target_pos, 8, 12);
            println!("Pinned magic dot to top-center");
        }
    }
}

#[tauri::command]
pub fn start_window_watch(app: AppHandle) {
    thread::spawn(move || loop {
        unsafe {
            let hwnd = GetForegroundWindow();
            if !hwnd.is_null() {
                // 1) Try to get the real window icon
                let icon_base64 = get_window_icon_base64_from_hwnd(hwnd)
                    // 1.5) Try packaged app icon via AUMID
                    .or_else(|| get_packaged_app_icon_from_hwnd(hwnd))
                    // 2) Fallback to exe icon
                    .or_else(|| {
                        exe_path_from_hwnd(hwnd).and_then(|p| get_icon_base64_from_exe(&p))
                    });

                if let Some(icon_base64) = icon_base64 {
                    // Prefer window title, fallback to exe stem
                    let mut app_name = get_window_title(hwnd);
                    if app_name.is_empty() {
                        if let Some(exe_path) = exe_path_from_hwnd(hwnd) {
                            app_name = exe_path
                                .file_stem()
                                .and_then(|s| s.to_str())
                                .unwrap_or("")
                                .to_string();
                        }
                    }

                    let _ = app.emit(
                        "active_window_changed",
                        serde_json::json!({
                            "name": app_name,
                            "icon": format!("data:image/png;base64,{}", icon_base64)
                        }),
                    );
                }
            }
        }
        thread::sleep(Duration::from_secs(1));
    });
}

#[tauri::command]
pub fn stick_chat_to_dot(app: AppHandle) {
    std::thread::spawn(move || {
        let mut last_sent: Option<(i32, i32)> = None;
        loop {
            let (Some(dot), Some(chat)) = (
                app.get_webview_window("magic-dot"),
                app.get_webview_window("magic-chat"),
            ) else {
                break;
            };

            if let (Ok(dot_pos), Ok(dot_size), Ok(Some(monitor))) = (
                dot.outer_position(),
                dot.outer_size(),
                dot.current_monitor(),
            ) {
                let screen_size = monitor.size();
                let preferred_y = dot_pos.y + dot_size.height as i32;
                let fallback_y = dot_pos.y - 200 - 10 - 100;

                let y = if preferred_y + 200 < screen_size.height as i32 {
                    preferred_y
                } else {
                    fallback_y.max(0)
                };

                let chat_width: i32 = chat.outer_size().map(|s| s.width as i32).unwrap_or(780);
                let x = dot_pos.x + (dot_size.width as i32 / 2) - (chat_width / 2);

                let tx = x.max(0);
                let ty = y;
                if last_sent
                    .map(|(lx, ly)| lx == tx && ly == ty)
                    .unwrap_or(false)
                    == false
                {
                    let _ = chat.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                        x: tx,
                        y: ty,
                    }));
                    last_sent = Some((tx, ty));
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(16));
        }
    });
}

#[tauri::command]
pub fn animate_chat_expand(app: AppHandle, to_width: u32, to_height: u32) {
    if let Some(chat) = app.get_webview_window("magic-chat") {
        if let Ok(current) = chat.outer_size() {
            smooth_resize(
                &chat,
                current,
                tauri::PhysicalSize {
                    width: to_width,
                    height: to_height,
                },
                8,
                12,
            );
        }
    }
}

#[tauri::command]
pub fn center_magic_dot(app: AppHandle) {
    if let Some(window) = app.get_webview_window("magic-dot") {
        if let (Ok(Some(monitor)), Ok(size), Ok(current_pos)) = (
            window.current_monitor(),
            window.outer_size(),
            window.outer_position(),
        ) {
            let screen = monitor.size();
            let x = ((screen.width as i32 - size.width as i32) / 2).max(0);
            let y = ((screen.height as i32 - size.height as i32) / 2).max(0);

            // Smoothly move from current position to the center
            smooth_move(
                &window,
                current_pos,
                tauri::PhysicalPosition { x, y },
                8,  // steps
                12, // delay in ms
            );
        }
    }
}

#[tauri::command]
pub fn close_magic_dot(app: AppHandle) {
    if let Some(window) = app.get_webview_window("magic-dot") {
        let _ = window.close();
    }
}

#[tauri::command]
pub fn close_magic_chat(app: AppHandle) {
    if let Some(window) = app.get_webview_window("magic-chat") {
        let _ = window.close();
    }
}

/// Toggles the visibility of the `magic-dot` window.
///
/// Behavior:
/// - If the window exists and is visible, it will be hidden.
/// - If the window exists and is hidden, it will be shown and focused (and kept always-on-top).
/// - If the window does not exist yet, it will be created with the correct window flags and then shown.
///
/// This single command replaces separate hide/show commands to simplify the
/// frontend integration (a single global shortcut can call this to toggle).
#[tauri::command]
pub fn toggle_magic_dot(app: AppHandle) {
    println!("toggle_magic_dot invoked");
    if let Some(dot) = app.get_webview_window("magic-dot") {
        match dot.is_visible() {
            Ok(true) => {
                println!("hiding magic-dot");
                let _ = dot.hide();
            }
            Ok(false) => {
                println!("showing magic-dot");
                let _ = dot.show();
                let _ = dot.set_focus();
                let _ = dot.set_always_on_top(true);
            }
            Err(_) => {
                println!("dot visibility unknown, forcing show");
                let _ = dot.show();
            }
        }
        return;
    }

    // If the magic dot window does not exist yet, create it and show it
    // so the toggle can be used as a "summon" action as well.
    if !ALLOW_MAGIC_DOT_CREATE.load(Ordering::Relaxed) {
        println!("magic-dot creation disabled; toggle ignored");
        return;
    }
    let _ = WebviewWindowBuilder::new(&app, "magic-dot", WebviewUrl::App("/magic-dot".into()))
        .title("magic-dot")
        .transparent(true)
        .decorations(false)
        .resizable(false)
        .shadow(false)
        .always_on_top(true)
        .inner_size(500.0, 60.0)
        .build()
        .and_then(|w| {
            println!("created magic-dot window via toggle");
            let _ = w.show();
            let _ = w.set_focus();
            Ok(())
        });
}

/// Ensures the magic-dot window is shown and focused (creates if needed)
#[tauri::command]
pub fn show_magic_dot(app: AppHandle) {
    if let Some(dot) = app.get_webview_window("magic-dot") {
        let _ = dot.show();
        let _ = dot.set_focus();
        let _ = dot.set_always_on_top(true);
        return;
    }
    let _ = WebviewWindowBuilder::new(&app, "magic-dot", WebviewUrl::App("/magic-dot".into()))
        .title("magic-dot")
        .transparent(true)
        .decorations(false)
        .resizable(false)
        .shadow(false)
        .always_on_top(true)
        .inner_size(500.0, 60.0)
        .build()
        .and_then(|w| {
            let _ = w.show();
            let _ = w.set_focus();
            Ok(())
        });
}

/// Enable/disable auto-show-on-copy feature
#[tauri::command]
pub fn set_auto_show_on_copy_enabled(app: AppHandle, enabled: bool) {
    AUTO_SHOW_ON_COPY.store(enabled, Ordering::Relaxed);
    if enabled {
        ensure_clipboard_watcher_started(&app);
    }
}

/// Query auto-show-on-copy status
#[tauri::command]
pub fn get_auto_show_on_copy_enabled() -> bool {
    AUTO_SHOW_ON_COPY.load(Ordering::Relaxed)
}

/// Enables or disables the ability for `toggle_magic_dot` to create the
/// magic-dot window when it doesn't exist.
#[tauri::command]
pub fn set_magic_dot_creation_enabled(enabled: bool) {
    ALLOW_MAGIC_DOT_CREATE.store(enabled, Ordering::Relaxed);
    println!("magic-dot creation enabled: {}", enabled);
}
