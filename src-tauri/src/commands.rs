//! This module contains all the Tauri commands that can be invoked from the frontend.

use crate::platform::{
    exe_path_from_hwnd, get_icon_base64_from_exe, get_packaged_app_icon_from_hwnd,
    get_window_icon_base64_from_hwnd, get_window_title,
};
use crate::utils::{smooth_move, smooth_resize};
use enigo::{Enigo, MouseControllable};
use std::{thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager};
use winapi::um::winuser::GetForegroundWindow;

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
                    let current_dot_size = window.outer_size().unwrap_or(tauri::PhysicalSize {
                        width: 10,
                        height: 10,
                    });
                    smooth_resize(&window, current_dot_size, original_size, 8, 12);
                    let _ = app.emit("exit_follow_mode", ());
                    let _ = app.emit("onboarding_done", ());
                    break;
                }

                if distance > 40.0 && (dx.abs() > 1 || dy.abs() > 1) {
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
        if let (Ok(Some(monitor)), Ok(size)) = (window.current_monitor(), window.outer_size()) {
            let screen = monitor.size();
            let x = ((screen.width as i32 - size.width as i32) / 2).max(0);
            let y = ((screen.height as i32 - size.height as i32) / 2).max(0);
            let _ =
                window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
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

#[tauri::command]
pub fn hide_magic_dot(app: AppHandle) {
    if let Some(dot) = app.get_webview_window("magic-dot") {
        let _ = dot.hide();
    }
}

#[tauri::command]
pub fn show_magic_dot(app: AppHandle) {
    if let Some(dot) = app.get_webview_window("magic-dot") {
        let _ = dot.show();
    }
}
