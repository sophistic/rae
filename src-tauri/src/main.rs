#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Declare the modules that make up the application logic.
mod functions;
mod platform;
mod utils;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // Register all the invokable commands from the `commands` module.
        .invoke_handler(tauri::generate_handler![
            functions::overlay::enable_notch,
            functions::overlay::follow_magic_dot,
            functions::overlay::pin_magic_dot,
            functions::general::start_window_watch,
            functions::overlay::start_notch_watcher,
            functions::overlay::close_magic_dot,
            functions::overlay::close_magic_chat,
            functions::overlay::stick_chat_to_dot,
            functions::overlay::animate_chat_expand,
            functions::overlay::center_magic_dot,
            functions::overlay::enable_mouse_events,
            functions::overlay::toggle_magic_dot,
            functions::overlay::set_magic_dot_creation_enabled,
            functions::overlay::show_magic_dot,
            functions::chat::set_auto_show_on_copy_enabled,
            functions::chat::get_auto_show_on_copy_enabled,
            functions::chat::set_auto_show_on_selection_enabled,
            functions::chat::get_auto_show_on_selection_enabled,
            functions::chat::set_quack_watcher_enabled,
            functions::chat::get_quack_watcher_enabled,
            functions::chat::set_notch_window_display_enabled,
            functions::chat::get_notch_window_display_enabled,
            functions::general::inject_text_to_window_by_title,
            functions::general::capture_window_screenshot,
            functions::general::capture_window_screenshot_by_title,
            functions::general::capture_window_screenshot_by_hwnd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
