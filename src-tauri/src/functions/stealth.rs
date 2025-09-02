use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager};

// Static variable to track stealth mode state
static STEALTH_MODE_ENABLED: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub fn set_stealth_mode_enabled(app: AppHandle, enabled: bool) {
    STEALTH_MODE_ENABLED.store(enabled, Ordering::Relaxed);

    // Apply stealth mode to all existing windows
    if let Some(main_window) = app.get_webview_window("main") {
        apply_stealth_to_window(&main_window, enabled);
    }

    if let Some(overlay_window) = app.get_webview_window("overlay") {
        apply_stealth_to_window(&overlay_window, enabled);
    }

    if let Some(chat_window) = app.get_webview_window("chat") {
        apply_stealth_to_window(&chat_window, enabled);
    }

    println!("Stealth mode {}", if enabled { "enabled" } else { "disabled" });
}

#[tauri::command]
pub fn get_stealth_mode_enabled() -> bool {
    STEALTH_MODE_ENABLED.load(Ordering::Relaxed)
}

#[tauri::command]
pub fn apply_stealth_mode_to_window(app: AppHandle, window_label: &str) {
    let enabled = STEALTH_MODE_ENABLED.load(Ordering::Relaxed);
    if let Some(window) = app.get_webview_window(window_label) {
        apply_stealth_to_window(&window, enabled);
    }
}

fn apply_stealth_to_window(window: &tauri::WebviewWindow, enabled: bool) {
    if enabled {
        // Hide from taskbar/Alt+Tab
        let _ = window.set_skip_taskbar(true);

        // Enable content protection to prevent screenshots
        let _ = window.set_content_protected(true);

        // Set random window title periodically
        start_title_randomization(window.clone());

        println!("Applied stealth measures to window: {}", window.label());
    } else {
        // Restore normal behavior
        let _ = window.set_skip_taskbar(false);
        let _ = window.set_content_protected(false);

        // Reset to default title
        let _ = window.set_title("Rae");

        println!("Removed stealth measures from window: {}", window.label());
    }
}

fn start_title_randomization(window: tauri::WebviewWindow) {
    let titles = [
        "System Configuration",
        "Audio Settings",
        "Network Monitor",
        "Performance Monitor",
        "System Information",
        "Device Manager",
        "Background Services",
        "System Updates",
        "Security Center",
        "Task Manager",
        "Resource Monitor",
        "System Properties",
        "Network Connections",
        "Audio Devices",
        "Display Settings",
        "Power Options",
        "System Tools",
        "Hardware Monitor",
    ];

    std::thread::spawn(move || {
        loop {
            // Only continue if stealth mode is still enabled
            if !STEALTH_MODE_ENABLED.load(Ordering::Relaxed) {
                break;
            }

            if let Some(random_title) = titles
                .get(fastrand::usize(0..titles.len()))
                .map(|s| s.to_string())
            {
                let _ = window.set_title(&random_title);
            }

            // Change title every 30-60 seconds
            std::thread::sleep(std::time::Duration::from_millis(
                30000 + fastrand::u64(0..30000)
            ));
        }
    });
}
