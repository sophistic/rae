use crate::utils::{smooth_move, smooth_resize};
use enigo::{Enigo, MouseControllable};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, Monitor};

// Import stealth functions
use super::stealth::apply_stealth_mode_to_window;

// Controls whether toggle_magic_dot is allowed to create the window
static ALLOW_MAGIC_DOT_CREATE: AtomicBool = AtomicBool::new(true);

// Helper function to get the monitor that contains a given position
fn get_monitor_for_position(app: &AppHandle, position: &tauri::PhysicalPosition<i32>) -> Option<Monitor> {
    if let Ok(monitors) = app.available_monitors() {
        for monitor in monitors {
            let monitor_pos = monitor.position();
            let monitor_size = monitor.size();

            // Check if the position is within this monitor's bounds
            if position.x >= monitor_pos.x
                && position.x < monitor_pos.x + monitor_size.width as i32
                && position.y >= monitor_pos.y
                && position.y < monitor_pos.y + monitor_size.height as i32
            {
                return Some(monitor);
            }
        }
    }
    None
}

#[tauri::command]
pub fn follow_magic_dot(app: AppHandle) {
    if let Some(window) = app.get_webview_window("overlay") {
        if let (Ok(current_size), Ok(current_pos)) =
            (window.outer_size(), window.outer_position())
        {
            // Use the helper function to get the correct monitor for the current position
            if let Some(monitor) = get_monitor_for_position(&app, &current_pos) {
                let monitor_pos = monitor.position();
                let screen_size = monitor.size();
                let center_x = monitor_pos.x + ((screen_size.width as i32 - current_size.width as i32) / 2).max(0);
                let target_pos = tauri::PhysicalPosition { x: center_x, y: monitor_pos.y };
                let _ = window.set_position(tauri::Position::Physical(target_pos));
            }
        }
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.set_always_on_top(true);
        let _ = window.set_ignore_cursor_events(false);
    }
}

#[tauri::command]
pub fn pin_magic_dot(app: AppHandle) {
    if let Some(window) = app.get_webview_window("overlay") {
        if let (Ok(current_pos), Ok(current_size)) = (
            window.outer_position(),
            window.outer_size(),
        ) {
            // Use the helper function to get the correct monitor for the current position
            if let Some(monitor) = get_monitor_for_position(&app, &current_pos) {
                let monitor_pos = monitor.position();
                let screen_size = monitor.size();
                let center_x = monitor_pos.x + ((screen_size.width as i32 - current_size.width as i32) / 2).max(0);
                let target_pos = tauri::PhysicalPosition { x: center_x, y: monitor_pos.y };
                NotchWatcher::start(window.clone());
                smooth_move(&window, current_pos, target_pos, 8, 12);
            }
        }
    }
}

#[tauri::command]
pub fn stick_chat_to_dot(app: AppHandle) {
    std::thread::spawn(move || {
        let mut last_sent: Option<(i32, i32)> = None;
        loop {
            let (Some(dot), Some(chat)) = (
                app.get_webview_window("overlay"),
                app.get_webview_window("chat"),
            ) else {
                break;
            };

            if let (Ok(dot_pos), Ok(dot_size)) = (
                dot.outer_position(),
                dot.outer_size(),
            ) {
                // Use the helper function to get the correct monitor for the dot's position
                if let Some(monitor) = get_monitor_for_position(&app, &dot_pos) {
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
            }
            std::thread::sleep(std::time::Duration::from_millis(16));
        }
    });
}

#[tauri::command]
pub fn animate_chat_expand(app: AppHandle, to_width: u32, to_height: u32) {
    if let Some(chat) = app.get_webview_window("chat") {
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
    if let Some(window) = app.get_webview_window("overlay") {
        if let (Ok(size), Ok(current_pos)) = (
            window.outer_size(),
            window.outer_position(),
        ) {
            // Use the helper function to get the correct monitor for the current position
            if let Some(monitor) = get_monitor_for_position(&app, &current_pos) {
                let monitor_pos = monitor.position();
                let screen_size = monitor.size();
                window.set_ignore_cursor_events(false).ok();
                let x = monitor_pos.x + ((screen_size.width as i32 - size.width as i32) / 2).max(0);
                let y = monitor_pos.y + ((screen_size.height as i32 - size.height as i32) / 2).max(0);
                smooth_move(
                    &window,
                    current_pos,
                    tauri::PhysicalPosition { x, y },
                    8,
                    12,
                );
            }
        }
    }
}

#[tauri::command]
pub fn close_magic_dot(app: AppHandle) {
    if let Some(window) = app.get_webview_window("overlay") {
        let _ = window.close();
    }
}

#[tauri::command]
pub fn close_magic_chat(app: AppHandle) {
    if let Some(window) = app.get_webview_window("chat") {
        let _ = window.close();
    }
}

#[tauri::command]
pub fn show_overlay_center(app: AppHandle) {
    if let Some(dot) = app.get_webview_window("overlay") {
        let _ = dot.show();
        let _ = dot.set_focus();
        let _ = dot.set_always_on_top(true);
        let _ = dot.set_ignore_cursor_events(false);

        // Emit notch-hover event to expand from notch to bar if currently in notch mode
        let _ = dot.emit("notch-hover", ());

        // Emit event to unpin the overlay so it doesn't auto-collapse back to notch
        let _ = dot.emit("unpin_for_center", ());

        if let (Ok(current_size), Ok(current_pos)) =
            (dot.outer_size(), dot.outer_position())
        {
            // Use the helper function to get the correct monitor for the current position
            if let Some(monitor) = get_monitor_for_position(&app, &current_pos) {
                let monitor_pos = monitor.position();
                let screen_size = monitor.size();
                let center_x = monitor_pos.x +
                    ((screen_size.width as i32 - current_size.width as i32) / 2).max(0);
                let center_y = monitor_pos.y +
                    ((screen_size.height as i32 - current_size.height as i32) / 2).max(0);
                let target_pos = tauri::PhysicalPosition { x: center_x, y: center_y };
                smooth_move(&dot, current_pos, target_pos, 12, 8);
            }
        }
        NotchWatcher::start(dot.clone());
    } else {
        // If overlay doesn't exist, create it
        let overlay_window = WebviewWindowBuilder::new(&app, "overlay", WebviewUrl::App("/overlay".into()))
            .title("rae")
            .inner_size(500.0, 60.0)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .resizable(false)
            .shadow(false)
            .fullscreen(false)
            .maximizable(false)
            .skip_taskbar(true) //that's all
            .build()
            .unwrap();

        let _ = overlay_window.show();
        let _ = overlay_window.set_focus();
        let _ = overlay_window.set_always_on_top(true);

        // Position in center with smooth animation
        if let (Ok(current_size), Ok(current_pos)) =
            (overlay_window.outer_size(), overlay_window.outer_position())
        {
            // Use the helper function to get the correct monitor for the current position
            if let Some(monitor) = get_monitor_for_position(&app, &current_pos) {
                let monitor_pos = monitor.position();
                let screen_size = monitor.size();
                let center_x = monitor_pos.x +
                    ((screen_size.width as i32 - current_size.width as i32) / 2).max(0);
                let center_y = monitor_pos.y +
                    ((screen_size.height as i32 - current_size.height as i32) / 2).max(0);
                let target_pos = tauri::PhysicalPosition { x: center_x, y: center_y };
                smooth_move(&overlay_window, current_pos, target_pos, 12, 8);
            }
        }

        NotchWatcher::start(overlay_window);
    }
}

#[tauri::command]
pub fn toggle_magic_dot(app: AppHandle) {
    if let Some(dot) = app.get_webview_window("overlay") {
        match dot.is_visible() {
            Ok(true) => {
                let _ = dot.hide();
            }
            Ok(false) => {
                let _ = dot.show();
                let _ = dot.set_focus();
                let _ = dot.set_always_on_top(true);
                let _ = dot.set_ignore_cursor_events(false);
                NotchWatcher::start(dot.clone());
                if let (Ok(current_size), Ok(current_pos)) =
                    (dot.outer_size(), dot.outer_position())
                {
                    // Use the helper function to get the correct monitor for the current position
                    if let Some(monitor) = get_monitor_for_position(&app, &current_pos) {
                        let monitor_pos = monitor.position();
                        let screen_size = monitor.size();
                        let center_x = monitor_pos.x +
                            ((screen_size.width as i32 - current_size.width as i32) / 2).max(0);
                        let target_pos = tauri::PhysicalPosition { x: center_x, y: monitor_pos.y };
                        let _ = dot.set_position(tauri::Position::Physical(target_pos));
                    }
                }
            }
            Err(_) => {
                let _ = dot.show();
                let _ = dot.set_ignore_cursor_events(false);
                NotchWatcher::start(dot.clone());
            }
        }
        return;
    }
    if !ALLOW_MAGIC_DOT_CREATE.load(Ordering::Relaxed) {
        return;
    }
    let _ = WebviewWindowBuilder::new(&app, "overlay", WebviewUrl::App("/overlay".into()))
        .title("overlay")
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
            let _ = w.set_ignore_cursor_events(false);

            // Apply stealth mode to the newly created window
            apply_stealth_mode_to_window(app.clone(), "overlay");

            NotchWatcher::start(w.clone());
            Ok(())
        });
}

/// Continuously records and prints the mouse position in a background thread.

// Notch area constants (customize as needed)
const NOTCH_WIDTH: i32 = 200; // Width of notch
const NOTCH_HEIGHT: i32 = 20; // Height of notch

pub struct NotchWatcher;
impl NotchWatcher {
    pub fn start(window: tauri::WebviewWindow) {
        std::thread::spawn(move || {
            let enigo = Enigo::new();
            let app = window.app_handle();
            loop {
                // Get current window position and monitor info in each iteration
                // This ensures we always have the correct monitor info even if window moved
                let (screen_width, monitor_x) = if let Ok(current_pos) = window.outer_position() {
                    get_monitor_for_position(&app, &current_pos)
                        .map(|m| (m.size().width as i32, m.position().x))
                        .unwrap_or((1920, 0))
                } else {
                    (1920, 0)
                };
                let notch_x = monitor_x + (screen_width - NOTCH_WIDTH) / 2;
                let notch_y = 0;

                let (mouse_x, mouse_y) = enigo.mouse_location();
                // Check if mouse is inside the centered notch area
                if mouse_x >= notch_x
                    && mouse_x < notch_x + NOTCH_WIDTH
                    && mouse_y >= notch_y
                    && mouse_y < notch_y + NOTCH_HEIGHT
                {
                    let _ = window.set_ignore_cursor_events(false);
                    // println!("Mouse hovered over notch");
                    let _ = window.emit("notch-hover", ());
                }
                std::thread::sleep(std::time::Duration::from_millis(100));
            }
        });
    }
}

#[tauri::command]
pub fn start_notch_watcher(app: AppHandle) {
    NotchWatcher::start(app.get_webview_window("overlay").unwrap());
}

#[tauri::command]
pub fn enable_notch(app: AppHandle) {
    if let Some(window) = app.get_webview_window("overlay") {
        // println!("Enabling notch");
        let _ = window.set_ignore_cursor_events(true);
    }
}

#[tauri::command]
pub fn enable_mouse_events(app: AppHandle) {
    if let Some(window) = app.get_webview_window("overlay") {
        println!("Enabling mouse events");
        let _ = window.set_ignore_cursor_events(false);
    }
}
#[tauri::command]
pub fn show_magic_dot(app: AppHandle) {
    if let Some(dot) = app.get_webview_window("overlay") {
        let _ = dot.show();
        let _ = dot.set_focus();
        let _ = dot.set_always_on_top(true);
        let _ = dot.set_ignore_cursor_events(false);

        // Emit events to prevent notch and pinning
        let _ = dot.emit("disable_notch_on_show", ());
        let _ = dot.emit("disable_pin_on_show", ());

        // Place window near mouse cursor with smooth animation
        if let Ok(cursor_pos) = dot.cursor_position() {
            if let Ok(current_pos) = dot.outer_position() {
                let offset_x = 10.0;
                let offset_y = 10.0;
                let target_pos = tauri::PhysicalPosition::new(
                    (cursor_pos.x + offset_x) as i32,
                    (cursor_pos.y + offset_y) as i32,
                );
                smooth_move(&dot, current_pos, target_pos, 8, 8);
            }
        }
        return;
    }

    let _ = WebviewWindowBuilder::new(&app, "overlay", WebviewUrl::App("/overlay".into()))
        .title("overlay")
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
            let _ = w.set_ignore_cursor_events(false);

            // Apply stealth mode to the newly created window
            apply_stealth_mode_to_window(app.clone(), "overlay");

            // Emit events to prevent notch and pinning
            let _ = w.emit("disable_notch_on_show", ());
            let _ = w.emit("disable_pin_on_show", ());

            // Place new window near mouse cursor with smooth animation
            if let Ok(cursor_pos) = w.cursor_position() {
                if let Ok(current_pos) = w.outer_position() {
                    let offset_x = 10.0;
                    let offset_y = 10.0;
                    let target_pos = tauri::PhysicalPosition::new(
                        (cursor_pos.x + offset_x) as i32,
                        (cursor_pos.y + offset_y) as i32,
                    );
                    smooth_move(&w, current_pos, target_pos, 8, 8);
                }
            }
            Ok(())
        });
}
#[tauri::command]
pub fn set_magic_dot_creation_enabled(enabled: bool) {
    ALLOW_MAGIC_DOT_CREATE.store(enabled, Ordering::Relaxed);
}
