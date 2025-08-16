use enigo::{Enigo, MouseControllable};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use crate::utils::{smooth_move, smooth_resize};
use std::{sync::atomic::{AtomicBool, Ordering}, thread, time::Duration};


// Controls whether toggle_magic_dot is allowed to create the window
static ALLOW_MAGIC_DOT_CREATE: AtomicBool = AtomicBool::new(true);

#[tauri::command]
pub fn follow_magic_dot(app: AppHandle) {
	if let Some(window) = app.get_webview_window("overlay") {
		if let (Ok(current_size), Ok(Some(monitor))) =
			(window.outer_size(), window.current_monitor())
		{
			let screen_size = monitor.size();
			let center_x = ((screen_size.width as i32 - current_size.width as i32) / 2).max(0);
			let target_pos = tauri::PhysicalPosition { x: center_x, y: 0 };
			let _ = window.set_position(tauri::Position::Physical(target_pos));
		}
		let _ = window.show();
		let _ = window.set_focus();
		let _ = window.set_always_on_top(true);
		let _ = window.set_ignore_cursor_events(true);
	}
}

#[tauri::command]
pub fn pin_magic_dot(app: AppHandle) {
	if let Some(window) = app.get_webview_window("overlay") {
		if let (Ok(current_pos), Ok(current_size), Ok(Some(monitor))) = (
			window.outer_position(),
			window.outer_size(),
			window.current_monitor(),
		) {
			let screen_size = monitor.size();
			let center_x = ((screen_size.width as i32 - current_size.width as i32) / 2).max(0);
			let target_pos = tauri::PhysicalPosition { x: center_x, y: 0 };
            let _ = window.set_ignore_cursor_events(true);
			smooth_move(&window, current_pos, target_pos, 8, 12);
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
		if let (Ok(Some(monitor)), Ok(size), Ok(current_pos)) = (
			window.current_monitor(),
			window.outer_size(),
			window.outer_position(),
		) {
			let screen = monitor.size();
            window.set_ignore_cursor_events(true).ok();
			let x = ((screen.width as i32 - size.width as i32) / 2).max(0);
			let y = ((screen.height as i32 - size.height as i32) / 2).max(0);
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
				let _ = dot.set_ignore_cursor_events(true);
				MousePositionRecorder::start();
				if let (Ok(current_size), Ok(Some(monitor))) =
					(dot.outer_size(), dot.current_monitor())
				{
					let screen_size = monitor.size();
					let center_x =
						((screen_size.width as i32 - current_size.width as i32) / 2).max(0);
					let target_pos = tauri::PhysicalPosition { x: center_x, y: 0 };
					let _ = dot.set_position(tauri::Position::Physical(target_pos));
				}
			}
			Err(_) => {
				let _ = dot.show();
				let _ = dot.set_ignore_cursor_events(true);
				MousePositionRecorder::start();
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
			let _ = w.set_ignore_cursor_events(true);
			MousePositionRecorder::start();
			Ok(())
		});
	
}

/// Continuously records and prints the mouse position in a background thread.
pub struct MousePositionRecorder;
impl MousePositionRecorder {
    pub fn start() {
        thread::spawn(move || {
            let mut enigo = Enigo::new();
            loop {
                let (x, y) = enigo.mouse_location();
                println!("Mouse position: x={}, y={}", x, y);
                thread::sleep(Duration::from_millis(100));
            }
        });
    }
}

#[tauri::command]
pub fn show_magic_dot(app: AppHandle) {
	if let Some(dot) = app.get_webview_window("overlay") {
		let _ = dot.show();
		let _ = dot.set_focus();
		let _ = dot.set_always_on_top(true);
		let _ = dot.set_ignore_cursor_events(true);
		if let (Ok(current_size), Ok(Some(monitor))) = (dot.outer_size(), dot.current_monitor()) {
			let screen_size = monitor.size();
			let center_x = ((screen_size.width as i32 - current_size.width as i32) / 2).max(0);
			let target_pos = tauri::PhysicalPosition { x: center_x, y: 0 };
			let _ = dot.set_position(tauri::Position::Physical(target_pos));
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
			let _ = w.set_ignore_cursor_events(true);
			if let (Ok(current_size), Ok(Some(monitor))) = (w.outer_size(), w.current_monitor()) {
				let screen_size = monitor.size();
				let center_x = ((screen_size.width as i32 - current_size.width as i32) / 2).max(0);
				let target_pos = tauri::PhysicalPosition { x: center_x, y: 0 };
				let _ = w.set_position(tauri::Position::Physical(target_pos));
			}
			Ok(())
		});
	
}

#[tauri::command]
pub fn set_magic_dot_creation_enabled(enabled: bool) {
	ALLOW_MAGIC_DOT_CREATE.store(enabled, Ordering::Relaxed);
}
