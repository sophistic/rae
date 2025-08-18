use enigo::{Enigo, MouseControllable};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};

static AUTO_SHOW_ON_COPY: AtomicBool = AtomicBool::new(false);
static CLIPBOARD_WATCHER_RUNNING: AtomicBool = AtomicBool::new(false);
static AUTO_SHOW_ON_SELECTION: AtomicBool = AtomicBool::new(false);
static SELECTION_WATCHER_RUNNING: AtomicBool = AtomicBool::new(false);
static QUACK_WATCHER_ENABLED: AtomicBool = AtomicBool::new(false);
static QUACK_WATCHER_RUNNING: AtomicBool = AtomicBool::new(false);

use winapi::um::winuser::{
    GetAsyncKeyState, GetClipboardSequenceNumber, IsClipboardFormatAvailable, CF_UNICODETEXT,
    VK_LBUTTON,
};

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
        let mut last_text: Option<String> = None;
        let mut last_seq: u32 = unsafe { GetClipboardSequenceNumber() };
        loop {
            if !AUTO_SHOW_ON_COPY.load(Ordering::Relaxed) {
                CLIPBOARD_WATCHER_RUNNING.store(false, Ordering::SeqCst);
                break;
            }
            let seq_now = unsafe { GetClipboardSequenceNumber() };
            if seq_now == last_seq {
                std::thread::sleep(std::time::Duration::from_millis(250));
                continue;
            }
            last_seq = seq_now;
            let current = unsafe { read_clipboard_unicode_text() }
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());
            if let Some(ref txt) = current {
                let is_new = match last_text {
                    Some(ref prev) => prev != txt,
                    None => true,
                };
                if is_new && txt.len() >= 3 {
                    crate::functions::overlay::show_magic_dot(app_handle.clone());
                    let _ = app_handle
                        .emit("clipboard_text_copied", serde_json::json!({ "text": txt }));
                    last_text = current.clone();
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(250));
        }
    });
}

fn ensure_selection_watcher_started(app: &AppHandle) {
    if SELECTION_WATCHER_RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }
    let app_handle = app.clone();
    std::thread::spawn(move || {
        #[cfg(target_os = "windows")]
        unsafe {
            use windows::Win32::System::Com::{
                CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
                COINIT_APARTMENTTHREADED,
            };
            use windows::Win32::UI::Accessibility::{
                CUIAutomation, IUIAutomation, IUIAutomationTextPattern, UIA_TextPatternId,
            };
            let _hr = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
            let mut automation: Option<IUIAutomation> = None;
            let mut last_text: Option<String> = None;
            let mut last_uia_emit_at: Option<std::time::Instant> = None;
            let mut last_fallback_emit_at: Option<std::time::Instant> = None;
            let mut mouse_was_down: bool = false;
            let mut drag_origin: Option<(i32, i32)> = None;
            let mut did_drag: bool = false;
            let mut press_started_at: Option<std::time::Instant> = None;
            let mut pending_selected_text: Option<String> = None;
            let enigo_mouse = Enigo::new();
            loop {
                if !AUTO_SHOW_ON_SELECTION.load(Ordering::Relaxed) {
                    SELECTION_WATCHER_RUNNING.store(false, Ordering::SeqCst);
                    break;
                }
                let mouse_state: u16 = GetAsyncKeyState(VK_LBUTTON as i32) as u16;
                let mouse_is_down = (mouse_state & 0x8000u16) != 0;
                if mouse_is_down && !mouse_was_down {
                    let (mx, my) = enigo_mouse.mouse_location();
                    drag_origin = Some((mx, my));
                    did_drag = false;
                    press_started_at = Some(std::time::Instant::now());
                } else if mouse_is_down && mouse_was_down {
                    if let Some((ox, oy)) = drag_origin {
                        let (mx, my) = enigo_mouse.mouse_location();
                        let dx = mx - ox;
                        let dy = my - oy;
                        if (dx * dx + dy * dy) as f64 > 144.0 {
                            did_drag = true;
                        }
                    }
                } else if !mouse_is_down && mouse_was_down {
                    let press_duration_ms = press_started_at
                        .map(|t| t.elapsed().as_millis() as u64)
                        .unwrap_or(0);
                    if did_drag && press_duration_ms >= 120 {
                        if let Some(final_text) = pending_selected_text
                            .take()
                            .filter(|s| !s.trim().is_empty())
                        {
                            let is_new = match &last_text {
                                Some(prev) => prev != &final_text,
                                None => true,
                            };
                            if is_new {
                                crate::functions::overlay::show_magic_dot(app_handle.clone());
                                let _ = app_handle.emit(
                                    "text_selected",
                                    serde_json::json!({ "text": final_text }),
                                );
                                last_text = Some(final_text);
                                last_uia_emit_at = Some(std::time::Instant::now());
                            }
                        } else {
                            let allow_fallback = match last_uia_emit_at {
                                Some(t) => t.elapsed().as_millis() as u64 > 250,
                                None => true,
                            } && match last_fallback_emit_at {
                                Some(t) => t.elapsed().as_millis() as u64 > 500,
                                None => true,
                            };
                            if allow_fallback {
                                crate::functions::overlay::show_magic_dot(app_handle.clone());
                                let _ = app_handle
                                    .emit("text_selected", serde_json::json!({ "text": "" }));
                                last_fallback_emit_at = Some(std::time::Instant::now());
                            }
                        }
                    }
                    drag_origin = None;
                    did_drag = false;
                    press_started_at = None;
                }
                mouse_was_down = mouse_is_down;
                if automation.is_none() {
                    automation = CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).ok();
                    if automation.is_none() {
                        std::thread::sleep(std::time::Duration::from_millis(500));
                        continue;
                    }
                }
                let Some(auto) = &automation else { continue };
                let focused_element = auto.GetFocusedElement();
                if let Ok(element) = focused_element {
                    let pattern =
                        element.GetCurrentPatternAs::<IUIAutomationTextPattern>(UIA_TextPatternId);
                    if let Ok(text_pattern) = pattern {
                        let selection = text_pattern.GetSelection();
                        if let Ok(selection_array) = selection {
                            let len = selection_array.Length();
                            if let Ok(len) = len {
                                if len > 0 {
                                    let first_range = selection_array.GetElement(0);
                                    if let Ok(range) = first_range {
                                        let get_text = range.GetText(4096);
                                        if let Ok(bstr) = get_text {
                                            let text = bstr.to_string();
                                            let trimmed = text.trim().to_string();
                                            if !trimmed.is_empty() && trimmed.len() >= 1 {
                                                let should_update_pending =
                                                    match &pending_selected_text {
                                                        Some(prev) => prev != &trimmed,
                                                        None => true,
                                                    };
                                                if should_update_pending {
                                                    pending_selected_text = Some(trimmed.clone());
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                std::thread::sleep(std::time::Duration::from_millis(30));
            }
            CoUninitialize();
        }
    });
}

fn ensure_quack_watcher_started(app: &AppHandle) {
    if QUACK_WATCHER_RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }
    let app_handle = app.clone();
    std::thread::spawn(move || {
        #[cfg(target_os = "windows")]
        unsafe {
            use std::collections::VecDeque;
            use winapi::shared::minwindef::{HINSTANCE, LPARAM, LRESULT, WPARAM};
            use winapi::shared::windef::HHOOK;
            use winapi::um::winuser::{
                CallNextHookEx, DispatchMessageW, PeekMessageW, SetWindowsHookExW,
                TranslateMessage, UnhookWindowsHookEx, HC_ACTION, KBDLLHOOKSTRUCT, MSG, PM_REMOVE,
                WH_KEYBOARD_LL, WM_KEYDOWN, WM_QUIT, WM_SYSKEYDOWN,
            };

            let mut typed_chars = VecDeque::new();
            let mut hook_handle: HHOOK = std::ptr::null_mut();

            // We need to pass the app_handle to the hook procedure somehow
            // Since we can't capture it in the extern "system" function, we'll use a different approach

            // Store a reference to check if watcher is still enabled
            let watcher_enabled = &QUACK_WATCHER_ENABLED;
            let app_for_emit = app_handle.clone();

            unsafe extern "system" fn keyboard_hook_proc(
                code: i32,
                wparam: WPARAM,
                lparam: LPARAM,
            ) -> LRESULT {
                // We can't access the VecDeque from here easily, so let's redesign this
                CallNextHookEx(std::ptr::null_mut(), code, wparam, lparam)
            }

            println!("Starting quack watcher...");

            // Install the hook with a simpler approach - checking key states directly
            loop {
                if !QUACK_WATCHER_ENABLED.load(Ordering::Relaxed) {
                    println!("Quack watcher disabled, stopping...");
                    break;
                }

                // Check for individual key presses using GetAsyncKeyState
                // This is a simpler approach than the low-level keyboard hook
                use winapi::um::winuser::GetAsyncKeyState;

                // Check for @ key (Shift+2 on US keyboards)
                let shift_state = GetAsyncKeyState(0x10) as u16 & 0x8000u16; // VK_SHIFT
                let two_key_state = GetAsyncKeyState(0x32) as u16; // VK_2

                // For simplicity, let's check if specific keys are pressed in sequence
                // This is a basic implementation - you might want to improve it

                // Check each character of "@quack"
                let at_pressed = shift_state != 0 && (two_key_state & 0x01) != 0;
                let q_pressed = (GetAsyncKeyState(0x51) as u16 & 0x01) != 0; // Q key
                let u_pressed = (GetAsyncKeyState(0x55) as u16 & 0x01) != 0; // U key
                let a_pressed = (GetAsyncKeyState(0x41) as u16 & 0x01) != 0; // A key
                let c_pressed = (GetAsyncKeyState(0x43) as u16 & 0x01) != 0; // C key
                let k_pressed = (GetAsyncKeyState(0x4B) as u16 & 0x01) != 0; // K key

                if at_pressed {
                    typed_chars.clear();
                    typed_chars.push_back('@');
                    println!("Detected @");
                } else if !typed_chars.is_empty() {
                    if q_pressed && typed_chars.len() == 1 && typed_chars[0] == '@' {
                        typed_chars.push_back('q');
                        println!("Detected @q");
                    } else if u_pressed && typed_chars.len() == 2 && typed_chars[1] == 'q' {
                        typed_chars.push_back('u');
                        println!("Detected @qu");
                    } else if a_pressed && typed_chars.len() == 3 && typed_chars[2] == 'u' {
                        typed_chars.push_back('a');
                        println!("Detected @qua");
                    } else if c_pressed && typed_chars.len() == 4 && typed_chars[3] == 'a' {
                        typed_chars.push_back('c');
                        println!("Detected @quac");
                    } else if k_pressed && typed_chars.len() == 5 && typed_chars[4] == 'c' {
                        typed_chars.push_back('k');
                        let sequence: String = typed_chars.iter().collect();
                        if sequence == "@quack" {
                            println!("QUACK DETECTED! Emitting event...");
                            let _ = app_for_emit.emit("quack_mentioned", serde_json::json!({}));
                            typed_chars.clear();
                        }
                    } else {
                        // Reset if wrong key pressed
                        if (GetAsyncKeyState(0x08) as u16 & 0x01) != 0 || // Backspace
                           (GetAsyncKeyState(0x0D) as u16 & 0x01) != 0 || // Enter
                           (GetAsyncKeyState(0x20) as u16 & 0x01) != 0
                        // Space
                        {
                            typed_chars.clear();
                        }
                    }
                }

                std::thread::sleep(std::time::Duration::from_millis(50));
            }

            println!("Quack watcher stopped");
        }
        QUACK_WATCHER_RUNNING.store(false, Ordering::SeqCst);
    });
}

#[tauri::command]
pub fn set_auto_show_on_copy_enabled(app: AppHandle, enabled: bool) {
    AUTO_SHOW_ON_COPY.store(enabled, Ordering::Relaxed);
    if enabled {
        ensure_clipboard_watcher_started(&app);
    }
}

#[tauri::command]
pub fn get_auto_show_on_copy_enabled() -> bool {
    AUTO_SHOW_ON_COPY.load(Ordering::Relaxed)
}

#[tauri::command]
pub fn set_auto_show_on_selection_enabled(app: AppHandle, enabled: bool) {
    AUTO_SHOW_ON_SELECTION.store(enabled, Ordering::Relaxed);
    if enabled {
        ensure_selection_watcher_started(&app);
    }
}

#[tauri::command]
pub fn get_auto_show_on_selection_enabled() -> bool {
    AUTO_SHOW_ON_SELECTION.load(Ordering::Relaxed)
}

#[tauri::command]
pub fn set_quack_watcher_enabled(app: AppHandle, enabled: bool) {
    println!("Setting quack watcher enabled: {}", enabled);
    QUACK_WATCHER_ENABLED.store(enabled, Ordering::Relaxed);
    if enabled {
        ensure_quack_watcher_started(&app);
    }
}

#[tauri::command]
pub fn get_quack_watcher_enabled() -> bool {
    QUACK_WATCHER_ENABLED.load(Ordering::Relaxed)
}
