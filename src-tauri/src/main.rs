#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Declare the modules that make up the application logic.
mod commands;
mod platform;
mod utils;

fn main() {
    tauri::Builder::default()
        // Register all the invokable commands from the `commands` module.
        .invoke_handler(tauri::generate_handler![
            commands::follow_magic_dot,
            commands::pin_magic_dot,
            commands::start_window_watch,
            commands::close_magic_dot,
            commands::close_magic_chat,
            commands::stick_chat_to_dot,
            commands::animate_chat_expand,
            commands::hide_magic_dot,
            commands::show_magic_dot,
            commands::center_magic_dot
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
