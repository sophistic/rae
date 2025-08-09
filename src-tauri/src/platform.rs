//! This module contains Windows-specific functionality using the winapi crate.
//! It handles getting information about the active window, its process, and its icon.

use base64::{engine::general_purpose, Engine as _};
use image::{codecs::png::PngEncoder, ColorType, ImageBuffer, ImageEncoder, Rgba}; // <--- FIX IS HERE
use std::{
    ffi::OsString,
    os::windows::ffi::{OsStrExt, OsStringExt},
    path::PathBuf,
    ptr,
};
use winapi::{
    shared::windef::{HICON, HWND},
    um::{
        handleapi::CloseHandle,
        processthreadsapi::OpenProcess,
        psapi::GetModuleFileNameExW,
        shellapi::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON},
        wingdi::{
            GetDIBits, GetObjectW, BITMAP, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        },
        winnt::{PROCESS_QUERY_INFORMATION, PROCESS_VM_READ},
        winuser::{DestroyIcon, GetIconInfo, GetWindowThreadProcessId, ICONINFO},
    },
};

/// Gets the full executable path from a window handle (HWND).
pub fn exe_path_from_hwnd(hwnd: HWND) -> Option<PathBuf> {
    unsafe {
        let mut pid = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == 0 {
            return None;
        }

        let process_handle = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, 0, pid);
        if process_handle.is_null() {
            return None;
        }

        let mut buf = vec![0u16; 260]; // MAX_PATH
        let len = GetModuleFileNameExW(
            process_handle,
            ptr::null_mut(),
            buf.as_mut_ptr(),
            buf.len() as u32,
        );
        CloseHandle(process_handle);

        if len == 0 {
            return None;
        }

        buf.truncate(len as usize);
        Some(PathBuf::from(OsString::from_wide(&buf)))
    }
}

/// Extracts the icon from an executable file and returns it as a Base64 encoded PNG.
pub fn get_icon_base64_from_exe(exe_path: &PathBuf) -> Option<String> {
    unsafe {
        let mut shinfo: SHFILEINFOW = std::mem::zeroed();
        let exe_wide: Vec<u16> = exe_path.as_os_str().encode_wide().chain(Some(0)).collect();

        if SHGetFileInfoW(
            exe_wide.as_ptr(),
            0,
            &mut shinfo,
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_LARGEICON,
        ) == 0
        {
            return None;
        }

        if shinfo.hIcon.is_null() {
            return None;
        }

        hicon_to_base64_png(shinfo.hIcon)
    }
}

/// Converts a Windows icon handle (HICON) to a Base64 encoded PNG string.
fn hicon_to_base64_png(hicon: HICON) -> Option<String> {
    unsafe {
        let mut icon_info: ICONINFO = std::mem::zeroed();
        if GetIconInfo(hicon, &mut icon_info) == 0 {
            return None;
        }

        let mut bmp: BITMAP = std::mem::zeroed();
        if GetObjectW(
            icon_info.hbmColor as _,
            std::mem::size_of::<BITMAP>() as i32,
            &mut bmp as *mut _ as *mut _,
        ) == 0
        {
            return None;
        }

        let width = bmp.bmWidth as u32;
        let height = bmp.bmHeight as u32;

        let mut bi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width as i32,
                biHeight: -(height as i32), // top-down DIB
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB,
                ..std::mem::zeroed()
            },
            ..std::mem::zeroed()
        };

        let mut pixels = vec![0u8; (width * height * 4) as usize];
        if GetDIBits(
            winapi::um::winuser::GetDC(ptr::null_mut()),
            icon_info.hbmColor,
            0,
            height,
            pixels.as_mut_ptr() as *mut _,
            &mut bi,
            DIB_RGB_COLORS,
        ) == 0
        {
            return None;
        }

        // BGRA from GetDIBits to RGBA for the PNG encoder
        for chunk in pixels.chunks_mut(4) {
            chunk.swap(0, 2);
        }

        let img = ImageBuffer::<Rgba<u8>, _>::from_raw(width, height, pixels)?;
        let mut png_bytes = Vec::new();
        PngEncoder::new(&mut png_bytes)
            .write_image(&img, width, height, ColorType::Rgba8) // This line will now compile
            .ok()?;

        DestroyIcon(hicon);

        Some(general_purpose::STANDARD.encode(&png_bytes))
    }
}
