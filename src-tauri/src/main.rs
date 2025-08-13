#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Declare the modules that make up the application logic.
mod commands;
mod platform;
mod utils;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // Register all the invokable commands from the `commands` module.
        .invoke_handler(tauri::generate_handler![
            commands::follow_magic_dot,
            commands::pin_magic_dot,
            commands::start_window_watch,
            commands::close_magic_dot,
            commands::close_magic_chat,
            commands::stick_chat_to_dot,
            commands::animate_chat_expand,
            commands::center_magic_dot,
            commands::toggle_magic_dot,
            commands::set_magic_dot_creation_enabled,
            commands::show_magic_dot,
            commands::set_auto_show_on_copy_enabled,
            commands::get_auto_show_on_copy_enabled
            ,commands::set_auto_show_on_selection_enabled
            ,commands::get_auto_show_on_selection_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
