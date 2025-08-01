#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use enigo::{Enigo, MouseControllable};

use std::{thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

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

        // Set the new size, ensuring the dimensions are not less than 1.
        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: new_width.max(1) as u32,
            height: new_height.max(1) as u32,
        }));

        // Wait for a short duration to create the animation effect.
        thread::sleep(Duration::from_millis(delay));
    }
    // Ensure the final size is exactly the target size
    let _ = window.set_size(tauri::Size::Physical(to));
}

#[tauri::command]
fn follow_magic_dot(app: AppHandle) {
    let Some(window) = app.get_webview_window("magic-dot") else {
        println!("Magic-dot window not found");
        return;
    };

    // Store the window's original size to restore it later.
    let original_size = window.outer_size().unwrap_or(tauri::PhysicalSize {
        width: 350,
        height: 55,
    });

    // Animate the window shrinking into a small "dot".
    smooth_resize(
        &window,
        original_size,
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

        // Loop indefinitely to track the mouse.
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
                if distance < 20.0 {
                    // Emit an event to the frontend to signal the exit.

                    let current_size = window.outer_size().unwrap_or(tauri::PhysicalSize {
                        width: 20,
                        height: 20,
                    });

                    // Animate the window expanding back to its original size.
                    smooth_resize(&window, current_size, original_size, 10, 10);
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
            thread::sleep(Duration::from_millis(8));
        }
    });
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![follow_magic_dot])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}