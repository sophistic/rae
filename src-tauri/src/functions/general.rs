use crate::platform::{
    get_exe_path_from_window, get_icon_from_exe, get_packaged_app_icon, get_window_icon,
    get_window_title_text, WindowHandle,
};
use base64::encode;
use image::{DynamicImage, ImageFormat};
use std::io;
use std::{thread, time::Duration};
use tauri::{AppHandle, Emitter};

// Windows-specific imports
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStrExt;
#[cfg(target_os = "windows")]
use winapi::ctypes::c_void;
#[cfg(target_os = "windows")]
use winapi::shared::windef::HWND as WinHWND;
#[cfg(target_os = "windows")]
use winapi::shared::windef::RECT;
#[cfg(target_os = "windows")]
use winapi::um::wingdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits,
    SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, SRCCOPY,
};
#[cfg(target_os = "windows")]
use winapi::um::winuser::{FindWindowW, SetForegroundWindow};
#[cfg(target_os = "windows")]
use winapi::um::winuser::{
    GetDC, GetSystemMetrics, GetWindowRect, PrintWindow, ReleaseDC, SM_CXSCREEN, SM_CYSCREEN,
};
#[cfg(target_os = "windows")]
use winapi::um::winuser::{
    GetForegroundWindow, SendInput, INPUT, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_UNICODE,
};

// macOS-specific imports
#[cfg(target_os = "macos")]
use cocoa::appkit::{NSApplication, NSRunningApplication};
#[cfg(target_os = "macos")]
use cocoa::foundation::{NSAutoreleasePool, NSString};
#[cfg(target_os = "macos")]
use core_foundation::string::CFString;
#[cfg(target_os = "macos")]
use objc::runtime::{Class, Object};
#[cfg(target_os = "macos")]
use objc::{msg_send, sel, sel_impl};
#[cfg(target_os = "macos")]
use std::ffi::CStr;

#[tauri::command]
pub fn start_window_watch(app: AppHandle) {
    thread::spawn(move || loop {
        #[cfg(target_os = "windows")]
        unsafe {
            use winapi::um::winuser::GetForegroundWindow;
            let hwnd = GetForegroundWindow();
            if !hwnd.is_null() {
                let icon_base64 = get_window_icon(hwnd)
                    .or_else(|| get_packaged_app_icon(hwnd))
                    .or_else(|| get_exe_path_from_window(hwnd).and_then(|p| get_icon_from_exe(&p)));
                if let Some(icon_base64) = icon_base64 {
                    let mut app_name = get_window_title_text(hwnd);
                    if app_name.is_empty() {
                        if let Some(exe_path) = get_exe_path_from_window(hwnd) {
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
                            "icon": format!("data:image/png;base64,{}", icon_base64),
                            "hwnd": hwnd as isize,
                        }),
                    );
                }
            }
        }

        #[cfg(target_os = "macos")]
        {
            // macOS implementation using NSWorkspace
            unsafe {
                let workspace_class = Class::get("NSWorkspace").unwrap();
                let workspace: *mut Object = msg_send![workspace_class, sharedWorkspace];
                let frontmost_app: *mut Object = msg_send![workspace, frontmostApplication];

                if !frontmost_app.is_null() {
                    // Get application name
                    let localized_name: *mut Object = msg_send![frontmost_app, localizedName];
                    let app_name = if !localized_name.is_null() {
                        let name_str: *const std::os::raw::c_char =
                            msg_send![localized_name, UTF8String];
                        if !name_str.is_null() {
                            CStr::from_ptr(name_str).to_string_lossy().into_owned()
                        } else {
                            String::new()
                        }
                    } else {
                        String::new()
                    };

                    // Get application icon
                    let icon_base64 = get_mac_app_icon(frontmost_app);

                    // Get process identifier for hwnd equivalent
                    let pid: i32 = msg_send![frontmost_app, processIdentifier];

                    // Only emit if we have a valid app name and it's not our own app
                    if !app_name.is_empty() && !app_name.to_lowercase().contains("rae") {
                        let _ = app.emit(
                            "active_window_changed",
                            serde_json::json!({
                                "name": app_name,
                                "icon": icon_base64.unwrap_or_else(|| String::new()),
                                "hwnd": pid as isize,
                            }),
                        );
                    }
                }
            }
        }

        thread::sleep(Duration::from_secs(1));
    });
}
#[tauri::command]
pub fn inject_text_to_window_by_title(text: String, window_title: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    unsafe {
        use winapi::um::winuser::FindWindowW;
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

    #[cfg(target_os = "macos")]
    {
        // macOS text injection is more complex and requires different APIs
        // For now, return a placeholder error
        Err("Text injection not implemented for macOS".into())
    }
}

#[cfg(target_os = "windows")]
fn inject_text_to_window(text: String, hwnd: winapi::shared::windef::HWND) -> Result<(), String> {
    unsafe {
        use winapi::um::winuser::{
            SendInput, SetForegroundWindow, INPUT, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_UNICODE,
        };
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

#[tauri::command]
pub fn capture_window_screenshot() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    unsafe {
        use winapi::um::wingdi::{
            BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits,
            SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, SRCCOPY,
        };
        use winapi::um::winuser::{GetDC, GetSystemMetrics, ReleaseDC, SM_CXSCREEN, SM_CYSCREEN};

        // Get screen dimensions
        let screen_width = GetSystemMetrics(SM_CXSCREEN);
        let screen_height = GetSystemMetrics(SM_CYSCREEN);

        if screen_width <= 0 || screen_height <= 0 {
            return Err("Invalid screen dimensions".to_string());
        }

        // Get screen DC
        let screen_dc = GetDC(std::ptr::null_mut());
        if screen_dc.is_null() {
            return Err("Failed to get screen DC".to_string());
        }

        // Create memory DC
        let memory_dc = CreateCompatibleDC(screen_dc);
        if memory_dc.is_null() {
            ReleaseDC(std::ptr::null_mut(), screen_dc);
            return Err("Failed to create memory DC".to_string());
        }

        // Create bitmap
        let bitmap = CreateCompatibleBitmap(screen_dc, screen_width, screen_height);
        if bitmap.is_null() {
            DeleteDC(memory_dc);
            ReleaseDC(std::ptr::null_mut(), screen_dc);
            return Err("Failed to create bitmap".to_string());
        }

        let old_bitmap = SelectObject(memory_dc, bitmap as *mut c_void);

        // Copy screen to bitmap
        if BitBlt(
            memory_dc,
            0,
            0,
            screen_width,
            screen_height,
            screen_dc,
            0,
            0,
            SRCCOPY,
        ) == 0
        {
            SelectObject(memory_dc, old_bitmap);
            DeleteObject(bitmap as *mut c_void);
            DeleteDC(memory_dc);
            ReleaseDC(std::ptr::null_mut(), screen_dc);
            return Err("Failed to capture screen".to_string());
        }

        // Get bitmap data
        let mut bitmap_info: BITMAPINFO = std::mem::zeroed();
        bitmap_info.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        bitmap_info.bmiHeader.biWidth = screen_width;
        bitmap_info.bmiHeader.biHeight = -screen_height; // Negative for top-down
        bitmap_info.bmiHeader.biPlanes = 1;
        bitmap_info.bmiHeader.biBitCount = 32;
        bitmap_info.bmiHeader.biCompression = BI_RGB;

        let bitmap_size = (screen_width * screen_height * 4) as usize;
        let mut buffer: Vec<u8> = vec![0; bitmap_size];

        if GetDIBits(
            memory_dc,
            bitmap,
            0,
            screen_height as u32,
            buffer.as_mut_ptr() as *mut c_void,
            &mut bitmap_info,
            DIB_RGB_COLORS,
        ) == 0
        {
            SelectObject(memory_dc, old_bitmap);
            DeleteObject(bitmap as *mut c_void);
            DeleteDC(memory_dc);
            ReleaseDC(std::ptr::null_mut(), screen_dc);
            return Err("Failed to get bitmap data".to_string());
        }

        // Convert BGRA to RGBA
        for chunk in buffer.chunks_exact_mut(4) {
            let b = chunk[0];
            let g = chunk[1];
            let r = chunk[2];
            let a = chunk[3];
            chunk[0] = r;
            chunk[1] = g;
            chunk[2] = b;
            chunk[3] = a;
        }

        // Create image
        let img =
            match image::RgbaImage::from_raw(screen_width as u32, screen_height as u32, buffer) {
                Some(img) => img,
                None => {
                    SelectObject(memory_dc, old_bitmap);
                    DeleteObject(bitmap as *mut c_void);
                    DeleteDC(memory_dc);
                    ReleaseDC(std::ptr::null_mut(), screen_dc);
                    return Err("Failed to create image".to_string());
                }
            };

        // Convert to PNG
        let dynamic_img = DynamicImage::ImageRgba8(img);
        let mut png_data = Vec::new();
        if dynamic_img
            .write_to(&mut io::Cursor::new(&mut png_data), ImageFormat::Png)
            .is_err()
        {
            SelectObject(memory_dc, old_bitmap);
            DeleteObject(bitmap as *mut c_void);
            DeleteDC(memory_dc);
            ReleaseDC(std::ptr::null_mut(), screen_dc);
            return Err("Failed to encode PNG".to_string());
        }

        // Cleanup
        SelectObject(memory_dc, old_bitmap);
        DeleteObject(bitmap as *mut c_void);
        DeleteDC(memory_dc);
        ReleaseDC(std::ptr::null_mut(), screen_dc);

        let base64_data = encode(&png_data);
        Ok(format!("data:image/png;base64,{}", base64_data))
    }

    #[cfg(target_os = "macos")]
    {
        // macOS screenshot functionality requires different APIs (CGWindowList, CGImage, etc.)
        // For now, return a placeholder error
        Err("Screenshot functionality not implemented for macOS".into())
    }
}

#[cfg(target_os = "windows")]
fn capture_hwnd_to_png_base64(hwnd: winapi::shared::windef::HWND) -> Result<String, String> {
    unsafe {
        use winapi::shared::windef::RECT;
        use winapi::um::wingdi::{
            BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits,
            SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, SRCCOPY,
        };
        use winapi::um::winuser::{GetDC, GetWindowRect, PrintWindow, ReleaseDC};

        let mut window_rect: RECT = std::mem::zeroed();
        if GetWindowRect(hwnd, &mut window_rect) == 0 {
            return Err("Failed to get window rectangle".to_string());
        }

        let width = (window_rect.right - window_rect.left).max(0);
        let height = (window_rect.bottom - window_rect.top).max(0);
        if width == 0 || height == 0 {
            return Err("Invalid window dimensions".to_string());
        }

        let window_dc = GetDC(hwnd);
        if window_dc.is_null() {
            return Err("Failed to get window DC".to_string());
        }

        let memory_dc = CreateCompatibleDC(window_dc);
        if memory_dc.is_null() {
            ReleaseDC(hwnd, window_dc);
            return Err("Failed to create memory DC".to_string());
        }

        let bitmap = CreateCompatibleBitmap(window_dc, width, height);
        if bitmap.is_null() {
            DeleteDC(memory_dc);
            ReleaseDC(hwnd, window_dc);
            return Err("Failed to create compatible bitmap".to_string());
        }

        let old_bitmap = SelectObject(memory_dc, bitmap as *mut c_void);

        // Try PrintWindow with full-content first (more robust for occluded/UWP windows)
        let mut pw_ok = PrintWindow(hwnd, memory_dc, 2);
        if pw_ok == 0 {
            // Fallback to default flags
            pw_ok = PrintWindow(hwnd, memory_dc, 0);
        }
        if pw_ok == 0 {
            // Fallback to BitBlt from window DC
            if BitBlt(memory_dc, 0, 0, width, height, window_dc, 0, 0, SRCCOPY) == 0 {
                SelectObject(memory_dc, old_bitmap);
                DeleteObject(bitmap as *mut c_void);
                DeleteDC(memory_dc);
                ReleaseDC(hwnd, window_dc);
                return Err("Failed to capture window content".to_string());
            }
        }

        // Prepare to extract bitmap bits
        let mut bitmap_info: BITMAPINFO = std::mem::zeroed();
        bitmap_info.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        bitmap_info.bmiHeader.biWidth = width;
        bitmap_info.bmiHeader.biHeight = -height; // top-down
        bitmap_info.bmiHeader.biPlanes = 1;
        bitmap_info.bmiHeader.biBitCount = 32; // BGRA
        bitmap_info.bmiHeader.biCompression = BI_RGB;

        let bitmap_size = (width * height * 4) as usize;
        let mut buffer: Vec<u8> = vec![0; bitmap_size];
        if GetDIBits(
            memory_dc,
            bitmap,
            0,
            height as u32,
            buffer.as_mut_ptr() as *mut c_void,
            &mut bitmap_info,
            DIB_RGB_COLORS,
        ) == 0
        {
            SelectObject(memory_dc, old_bitmap);
            DeleteObject(bitmap as *mut c_void);
            DeleteDC(memory_dc);
            ReleaseDC(hwnd, window_dc);
            return Err("Failed to get bitmap data".to_string());
        }

        // Convert BGRA -> RGBA
        for chunk in buffer.chunks_exact_mut(4) {
            let b = chunk[0];
            let g = chunk[1];
            let r = chunk[2];
            let a = chunk[3];
            chunk[0] = r;
            chunk[1] = g;
            chunk[2] = b;
            chunk[3] = a;
        }

        let img = match image::RgbaImage::from_raw(width as u32, height as u32, buffer) {
            Some(img) => img,
            None => {
                SelectObject(memory_dc, old_bitmap);
                DeleteObject(bitmap as *mut c_void);
                DeleteDC(memory_dc);
                ReleaseDC(hwnd, window_dc);
                return Err("Failed to create image".to_string());
            }
        };

        let dynamic_img = DynamicImage::ImageRgba8(img);
        let mut png_data = Vec::new();
        if dynamic_img
            .write_to(&mut io::Cursor::new(&mut png_data), ImageFormat::Png)
            .is_err()
        {
            SelectObject(memory_dc, old_bitmap);
            DeleteObject(bitmap as *mut c_void);
            DeleteDC(memory_dc);
            ReleaseDC(hwnd, window_dc);
            return Err("Failed to encode PNG".to_string());
        }

        // Cleanup
        SelectObject(memory_dc, old_bitmap);
        DeleteObject(bitmap as *mut c_void);
        DeleteDC(memory_dc);
        ReleaseDC(hwnd, window_dc);

        let base64_data = encode(&png_data);
        Ok(format!("data:image/png;base64,{}", base64_data))
    }
}

#[tauri::command]
pub fn capture_window_screenshot_by_title(window_title: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    unsafe {
        use winapi::um::winuser::FindWindowW;
        let wide_title: Vec<u16> = std::ffi::OsStr::new(&window_title)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        let hwnd = FindWindowW(std::ptr::null(), wide_title.as_ptr());
        if hwnd.is_null() {
            return Err(format!("Window '{}' not found", window_title));
        }

        capture_hwnd_to_png_base64(hwnd)
    }

    #[cfg(target_os = "macos")]
    {
        // macOS window screenshot by title requires different APIs
        Err("Window screenshot by title not implemented for macOS".into())
    }
}

#[cfg(target_os = "macos")]
unsafe fn get_mac_app_icon(app: *mut Object) -> Option<String> {
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine;
    use cocoa::foundation::NSSize;
    use objc::runtime::Class;

    // Get the app icon
    let icon: *mut Object = msg_send![app, icon];
    if icon.is_null() {
        return None;
    }

    // Set icon size
    let size = NSSize::new(32.0, 32.0);
    let _: () = msg_send![icon, setSize: size];

    // Get TIFF representation
    let tiff_data: *mut Object = msg_send![icon, TIFFRepresentation];
    if tiff_data.is_null() {
        return None;
    }

    // Convert to PNG using NSBitmapImageRep
    let bitmap_class = Class::get("NSBitmapImageRep")?;
    let bitmap: *mut Object = msg_send![bitmap_class, imageRepWithData: tiff_data];
    if bitmap.is_null() {
        return None;
    }

    // Get PNG representation (NSBitmapImageFileTypePNG = 4)
    let dict_class = Class::get("NSDictionary").unwrap();
    let png_props: *mut Object = msg_send![dict_class, dictionary];
    let png_data: *mut Object = msg_send![bitmap, representationUsingType: 4 properties: png_props];

    if png_data.is_null() {
        return None;
    }

    // Convert NSData to bytes
    let length: usize = msg_send![png_data, length];
    let bytes: *const u8 = msg_send![png_data, bytes];

    if bytes.is_null() || length == 0 {
        return None;
    }

    // Convert to base64
    let data_slice = std::slice::from_raw_parts(bytes, length);
    let base64_string = STANDARD.encode(data_slice);
    Some(format!("data:image/png;base64,{}", base64_string))
}

#[tauri::command]
pub fn capture_window_screenshot_by_hwnd(hwnd: isize) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    unsafe {
        let hwnd_ptr = hwnd as winapi::shared::windef::HWND;
        if hwnd_ptr.is_null() {
            return Err("Invalid HWND".to_string());
        }
        capture_hwnd_to_png_base64(hwnd_ptr)
    }

    #[cfg(target_os = "macos")]
    {
        // macOS window screenshot by handle requires different APIs
        Err("Window screenshot by handle not implemented for macOS".into())
    }
}
