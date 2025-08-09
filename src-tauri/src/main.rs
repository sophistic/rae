#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use enigo::{Enigo, MouseControllable};

use image::ColorType;
use std::{thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
// Windows API imports
use base64::{engine::general_purpose, Engine as _};
use image::{ImageBuffer, ImageEncoder, Rgba};
use std::os::windows::ffi::OsStrExt;

use std::{ffi::OsString, os::windows::ffi::OsStringExt, path::PathBuf, ptr};
use winapi::shared::windef::HICON;
use winapi::um::handleapi::CloseHandle;
use winapi::um::processthreadsapi::OpenProcess;
use winapi::um::psapi::{GetModuleBaseNameW, GetModuleFileNameExW};
use winapi::um::shellapi::SHFILEINFOW;
use winapi::um::shellapi::{SHGetFileInfoW, SHGFI_ICON, SHGFI_LARGEICON};
use winapi::um::wingdi::{
    GetDIBits, GetObjectW, BITMAP, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
};
use winapi::um::winnt::{PROCESS_QUERY_INFORMATION, PROCESS_VM_READ};
use winapi::um::winuser::{
    DestroyIcon, GetForegroundWindow, GetIconInfo, GetWindowThreadProcessId, ICONINFO,
};

fn get_active_process_name() -> Option<String> {
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_null() {
            return None;
        }

        let mut process_id: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut process_id);

        if process_id == 0 {
            return None;
        }

        let process_handle =
            OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, 0, process_id);

        if process_handle.is_null() {
            return None;
        }

        let mut buffer: [u16; 512] = [0; 512];
        let len = GetModuleBaseNameW(
            process_handle,
            ptr::null_mut(),
            buffer.as_mut_ptr(),
            buffer.len() as u32,
        );

        CloseHandle(process_handle);

        if len > 0 {
            let os_string = OsString::from_wide(&buffer[..len as usize]);
            if let Ok(process_name) = os_string.into_string() {
                // Remove .exe extension if present
                if process_name.ends_with(".exe") {
                    Some(process_name[..process_name.len() - 4].to_string())
                } else {
                    Some(process_name)
                }
            } else {
                None
            }
        } else {
            None
        }
    }
}

fn smooth_resize(
    window: &WebviewWindow,
    from: tauri::PhysicalSize<u32>,
    to: tauri::PhysicalSize<u32>,
    steps: u32,
    delay: u64,
) {
    if steps == 0 {
        let _ = window.set_size(tauri::Size::Physical(to));
        return;
    }

    let step_width = (to.width as i32 - from.width as i32) / steps as i32;
    let step_height = (to.height as i32 - from.height as i32) / steps as i32;

    for i in 1..=steps {
        let new_width = from.width as i32 + step_width * i as i32;
        let new_height = from.height as i32 + step_height * i as i32;

        // Setting the new size, ensuring the dimensions are not less than 1.
        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: new_width.max(1) as u32,
            height: new_height.max(1) as u32,
        }));

        // Wait for a short duration to create the animation effect.
        thread::sleep(Duration::from_millis(delay));
    }
    // Ensure the final size is exactly the target size as defined in the tauri.conf.json file
    let _ = window.set_size(tauri::Size::Physical(to));
}

fn smooth_move(
    window: &WebviewWindow,
    from: tauri::PhysicalPosition<i32>,
    to: tauri::PhysicalPosition<i32>,
    steps: u32,
    delay: u64,
) {
    if steps == 0 {
        let _ = window.set_position(tauri::Position::Physical(to));
        return;
    }

    let dx = (to.x - from.x) / steps as i32;
    let dy = (to.y - from.y) / steps as i32;

    for i in 1..=steps {
        let new_x = from.x + dx * i as i32;
        let new_y = from.y + dy * i as i32;

        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: new_x,
            y: new_y,
        }));

        thread::sleep(Duration::from_millis(delay));
    }

    // Ensure final position is accurate
    let _ = window.set_position(tauri::Position::Physical(to));
}

#[tauri::command]
fn follow_magic_dot(app: AppHandle) {
    let Some(window) = app.get_webview_window("magic-dot") else {
        println!("Magic-dot window not found");
        return;
    };

    // Get the window's current size to animate from.
    let current_size = window.outer_size().unwrap();

    // Animate the window shrinking into a small "dot".
    smooth_resize(
        &window,
        current_size,
        tauri::PhysicalSize {
            width: 20,
            height: 20,
        },
        10, // steps
        10, // delay in ms
    );

    // Spawn a new thread to handle the mouse-following logic,
    // so the main thread is not blocked.
    thread::spawn(move || {
        let enigo = Enigo::new();

        // Define the constant original size to restore to.
        let original_size = tauri::PhysicalSize {
            width: 500,
            height: 60,
        };

        // Loop for indefinitely to track the mouse.
        loop {
            // Get the current mouse cursor position on the screen.
            let (mouse_x, mouse_y) = enigo.mouse_location();

            // Get the window's current position.
            if let Ok(position) = window.outer_position() {
                // Calculate the center of the "dot" window.
                let window_center_x = position.x + 10; // 10 is half of the dot's width (20)
                let window_center_y = position.y + 10; // 10 is half of the dot's height (20)

                // Calculate the vector and distance from the window center to the mouse.
                let dx = mouse_x - window_center_x;
                let dy = mouse_y - window_center_y;
                let distance = ((dx * dx + dy * dy) as f64).sqrt();
                println!("Distance to mouse: {}", distance);
                // If the mouse gets very close to the dot, exit follow mode.
                if distance < 10.0 {
                    // Emit an event to the frontend to signal the exit.

                    let current_dot_size = window.outer_size().unwrap_or(tauri::PhysicalSize {
                        width: 10,
                        height: 10,
                    });

                    // Animate the window expanding back to its original size.
                    smooth_resize(&window, current_dot_size, original_size, 10, 10);
                    println!("Emitting exit_follow_mode");
                    let _ = app.emit("exit_follow_mode", ());
                    println!("Emitting onboarding_done");
                    let _ = app.emit("onboarding_done", ());
                    // Break the loop to stop following the mouse.
                    break;
                }

                // If the mouse is a certain distance away, move the dot towards it.
                // This creates a "lag" or "spring" effect.
                if distance > 40.0 {
                    let new_x = position.x + ((dx as f64) * 0.15) as i32;
                    let new_y = position.y + ((dy as f64) * 0.15) as i32;

                    // Set the window's new position.
                    let _ =
                        window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                            x: new_x,
                            y: new_y,
                        }));
                }
            }

            // Sleep for ~16ms to target roughly 60 updates per second.
            thread::sleep(Duration::from_millis(4));
        }
    });
}

#[tauri::command]
fn pin_magic_dot(app: AppHandle) {
    if let Some(window) = app.get_webview_window("magic-dot") {
        if let (Ok(current_pos), Ok(current_size), Ok(Some(monitor))) = (
            window.outer_position(),
            window.outer_size(),
            window.current_monitor(),
        ) {
            let screen_size = monitor.size();

            let center_x = ((screen_size.width as i32 - current_size.width as i32) / 2).max(0);
            let target_pos = tauri::PhysicalPosition { x: center_x, y: 0 };

            // Smoothly move the window to the top-center of the screen
            smooth_move(&window, current_pos, target_pos, 10, 10);

            println!("Pinned magic dot to top-center");
        }
    } else {
        println!("magic-dot window not found");
    }
}

fn exe_path_from_hwnd(hwnd: winapi::shared::windef::HWND) -> Option<PathBuf> {
    unsafe {
        let mut pid = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);

        if pid == 0 {
            return None;
        }

        let process_handle = OpenProcess(
            winapi::um::winnt::PROCESS_QUERY_INFORMATION | winapi::um::winnt::PROCESS_VM_READ,
            0,
            pid,
        );

        if process_handle.is_null() {
            return None;
        }

        let mut buf = vec![0u16; 260];
        let len = GetModuleFileNameExW(
            process_handle,
            ptr::null_mut(),
            buf.as_mut_ptr(),
            buf.len() as u32,
        );
        CloseHandle(process_handle);

        if len == 0 {
            return None;
        }

        buf.truncate(len as usize);
        Some(PathBuf::from(OsString::from_wide(&buf)))
    }
}

fn hicon_to_base64_png(hicon: HICON) -> Option<String> {
    unsafe {
        let mut icon_info: ICONINFO = std::mem::zeroed();
        if GetIconInfo(hicon, &mut icon_info) == 0 {
            return None;
        }

        let mut bmp: BITMAP = std::mem::zeroed();
        if GetObjectW(
            icon_info.hbmColor as _,
            std::mem::size_of::<BITMAP>() as i32,
            &mut bmp as *mut _ as *mut _,
        ) == 0
        {
            return None;
        }

        let width = bmp.bmWidth as u32;
        let height = bmp.bmHeight as u32;

        let mut bi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width as i32,
                biHeight: -(height as i32), // top-down
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [std::mem::zeroed(); 1],
        };

        let row_size = (width * 4) as usize;
        let buf_size = row_size * height as usize;
        let mut pixels = vec![0u8; buf_size];

        if GetDIBits(
            winapi::um::winuser::GetDC(ptr::null_mut()),
            icon_info.hbmColor,
            0,
            height as u32,
            pixels.as_mut_ptr() as *mut _,
            &mut bi,
            DIB_RGB_COLORS,
        ) == 0
        {
            return None;
        }

        // Convert BGRA → RGBA
        for chunk in pixels.chunks_mut(4) {
            chunk.swap(0, 2);
        }

        let img = ImageBuffer::<Rgba<u8>, _>::from_raw(width, height, pixels)?;
        let mut png_bytes = Vec::new();
        image::codecs::png::PngEncoder::new(&mut png_bytes)
            .write_image(&img, width, height, ColorType::Rgba8.into())
            .ok()?;

        DestroyIcon(hicon);

        Some(general_purpose::STANDARD.encode(&png_bytes))
    }
}

fn get_icon_base64_from_exe(exe_path: &PathBuf) -> Option<String> {
    unsafe {
        let mut shinfo: SHFILEINFOW = std::mem::zeroed();
        let exe_wide: Vec<u16> = exe_path.as_os_str().encode_wide().chain(Some(0)).collect();

        if SHGetFileInfoW(
            exe_wide.as_ptr(),
            0,
            &mut shinfo,
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        ) == 0
        {
            return None;
        }

        if shinfo.hIcon.is_null() {
            return None;
        }

        hicon_to_base64_png(shinfo.hIcon)
    }
}

#[tauri::command]
fn start_window_watch(app: AppHandle) {
    thread::spawn(move || {
        loop {
            unsafe {
                let hwnd = GetForegroundWindow();
                if hwnd.is_null() {
                    thread::sleep(Duration::from_millis(500));
                    continue;
                }

                if let Some(exe_path) = exe_path_from_hwnd(hwnd) {
                    if let Some(icon_base64) = get_icon_base64_from_exe(&exe_path) {
                        // Get app name from exe path
                        let app_name = exe_path
                            .file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("")
                            .to_string();

                        // Send the data to the frontend
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
        }
    });
}
#[tauri::command]
fn close_magic_dot(app: AppHandle) {
    if let Some(window) = app.get_webview_window("magic-dot") {
        let _ = window.close();
    }
}

#[tauri::command]
fn close_magic_chat(app: AppHandle) {
    if let Some(window) = app.get_webview_window("magic-chat") {
        let _ = window.close();
    }
}

#[tauri::command]
fn stick_chat_to_dot(app: AppHandle) {
    std::thread::spawn(move || {
        loop {
            let Some(dot) = app.get_webview_window("magic-dot") else {
                break;
            };
            let Some(chat) = app.get_webview_window("magic-chat") else {
                break;
            };

            if let (Ok(dot_pos), Ok(dot_size), Ok(Some(monitor))) = (
                dot.outer_position(),
                dot.outer_size(),
                dot.current_monitor(),
            ) {
                let screen_size = monitor.size();

                // Try to place chat window just below the dot
                let preferred_y = dot_pos.y + dot_size.height as i32;
                let fallback_y = dot_pos.y - 200 - 10 - 100; // if no space below

                let y = if preferred_y + 200 < screen_size.height as i32 {
                    preferred_y
                } else {
                    fallback_y.max(0)
                };

                let x = dot_pos.x + (dot_size.width as i32 / 2) - (475 / 2); // center align chat window

                let _ = chat.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: x.max(0),
                    y,
                }));
            }

            // Update ~30 FPS
            std::thread::sleep(std::time::Duration::from_millis(8));
        }
    });
}

// NEW: animate the magic-chat window from its current size to target size
#[tauri::command]
fn animate_chat_expand(app: AppHandle, to_width: u32, to_height: u32) {
    if let Some(chat) = app.get_webview_window("magic-chat") {
        if let Ok(current) = chat.outer_size() {
            smooth_resize(
                &chat,
                current,
                tauri::PhysicalSize {
                    width: to_width,
                    height: to_height,
                },
                12,
                12,
            );
        }
    }
}

#[tauri::command]
fn hide_magic_dot(app: AppHandle) {
    if let Some(dot) = app.get_webview_window("magic-dot") {
        let _ = dot.hide();
    }
}

#[tauri::command]
fn show_magic_dot(app: AppHandle) {
    if let Some(dot) = app.get_webview_window("magic-dot") {
        let _ = dot.show();
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            follow_magic_dot,
            pin_magic_dot,
            start_window_watch,
            close_magic_dot,
            close_magic_chat,
            stick_chat_to_dot,
            animate_chat_expand,
            hide_magic_dot,
            show_magic_dot // close_onboarding_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
