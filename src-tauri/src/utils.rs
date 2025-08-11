//! This module contains general-purpose utility functions, like window animations.

use std::{thread, time::Duration};
use tauri::WebviewWindow;

/// Animates a window's size from a starting to an ending size over a series of steps.
/// Animates a window's size and position from a starting to an ending size/position over a series of steps.
/// The `speed` parameter (in milliseconds) controls the total animation duration.
pub fn smooth_resize(
    window: &WebviewWindow,
    from: tauri::PhysicalSize<u32>,
    to: tauri::PhysicalSize<u32>,
    _steps: u32,
    _delay: u64,
    speed: u64, // total animation duration in ms
) {
    let steps = 32; // much smoother
    let delay = if steps > 0 { speed / steps } else { 0 };

    if steps == 0 {
        let _ = window.set_size(tauri::Size::Physical(to));
        return;
    }

    // Also get the current position so we can move the window to keep it centered
    let from_pos = window.outer_position().unwrap_or(tauri::PhysicalPosition { x: 0, y: 0 });
    let to_pos = {
        // Calculate the new top-left so the window expands equally on all sides
        let dx = (from.width as i32 - to.width as i32) / 2;
        let dy = (from.height as i32 - to.height as i32) / 2;
        tauri::PhysicalPosition {
            x: from_pos.x + dx,
            y: from_pos.y + dy,
        }
    };

    // EaseInOut function (cubic)
    fn ease_in_out(t: f32) -> f32 {
        if t < 0.5 {
            4.0 * t * t * t
        } else {
            1.0 - (-2.0 * t + 2.0).powf(3.0) / 2.0
        }
    }

    for i in 1..=steps {
        let t = i as f32 / steps as f32;
        let eased = ease_in_out(t);

        let new_width = from.width as f32 + (to.width as f32 - from.width as f32) * eased;
        let new_height = from.height as f32 + (to.height as f32 - from.height as f32) * eased;
        let new_x = from_pos.x as f32 + (to_pos.x as f32 - from_pos.x as f32) * eased;
        let new_y = from_pos.y as f32 + (to_pos.y as f32 - from_pos.y as f32) * eased;

        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: new_x.round() as i32,
            y: new_y.round() as i32,
        }));
        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: new_width.max(1.0).round() as u32,
            height: new_height.max(1.0).round() as u32,
        }));
        thread::sleep(Duration::from_millis(delay));
    }
    // Ensure the final size and position are exactly the target
    let _ = window.set_position(tauri::Position::Physical(to_pos));
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
