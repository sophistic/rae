use tauri::{AppHandle, Emitter};
use crate::platform::{exe_path_from_hwnd, get_icon_base64_from_exe, get_packaged_app_icon_from_hwnd, get_window_icon_base64_from_hwnd, get_window_title};
use std::{thread, time::Duration};
use winapi::um::winuser::{GetForegroundWindow, SendInput, INPUT, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_UNICODE};
use std::os::windows::ffi::OsStrExt;
use winapi::shared::windef::HWND as WinHWND;
use winapi::um::winuser::{FindWindowW, SetForegroundWindow};

#[tauri::command]
pub fn start_window_watch(app: AppHandle) {
	thread::spawn(move || loop {
		unsafe {
			let hwnd = GetForegroundWindow();
			if !hwnd.is_null() {
				let icon_base64 = get_window_icon_base64_from_hwnd(hwnd)
					.or_else(|| get_packaged_app_icon_from_hwnd(hwnd))
					.or_else(|| {
						exe_path_from_hwnd(hwnd).and_then(|p| get_icon_base64_from_exe(&p))
					});
				if let Some(icon_base64) = icon_base64 {
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
pub fn inject_text_to_window_by_title(text: String, window_title: String) -> Result<(), String> {
	unsafe {
		let wide_title: Vec<u16> = std::ffi::OsStr::new(&window_title)
			.encode_wide()
			.chain(std::iter::once(0))
			.collect();

		let hwnd = FindWindowW(std::ptr::null(), wide_title.as_ptr());
		if hwnd.is_null() {
			return Err(format!("Window with title '{}' not found", window_title));
		}
		inject_text_to_window(text, hwnd)
	}
}

fn inject_text_to_window(text: String, hwnd: WinHWND) -> Result<(), String> {
	unsafe {
		if SetForegroundWindow(hwnd) == 0 {
			return Err("Failed to bring target window to foreground".into());
		}
		std::thread::sleep(std::time::Duration::from_millis(50));
		for ch in text.chars() {
			let mut input = INPUT {
				type_: INPUT_KEYBOARD,
				u: std::mem::zeroed(),
			};
			*input.u.ki_mut() = KEYBDINPUT {
				wVk: 0,
				wScan: ch as u16,
				dwFlags: KEYEVENTF_UNICODE,
				time: 0,
				dwExtraInfo: 0,
			};
			SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
		}
		Ok(())
	}
}

#[derive(serde::Serialize)]
pub struct WindowInfo {
	pub hwnd: isize,
	pub title: String,
}
