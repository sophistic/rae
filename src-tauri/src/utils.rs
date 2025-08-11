//! This module contains general-purpose utility functions, like window animations.

use std::{thread, time::Duration};
use tauri::WebviewWindow;

/// Animates a window's size from a starting to an ending size over a series of steps.
pub fn smooth_resize(
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


/// Animates a window's position from a starting to an ending position over a series of steps.
pub fn smooth_move(
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
    let _ = window.set_position(tauri::Position::Physical(to));
}
