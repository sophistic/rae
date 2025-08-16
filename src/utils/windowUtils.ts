import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { invoke } from "@tauri-apps/api/core";

export const resize = async (targetWidth: number, targetHeight: number) => {
  const win = getCurrentWebviewWindow();
  try {
    await win.setSize(new LogicalSize(targetWidth, targetHeight));
  } catch (err) {
    console.error("Error during smooth resize:", err);
  }
};

export const smoothResize = async (
  targetWidth: number,
  targetHeight: number,
  duration = 20
) => {
  const win = getCurrentWebviewWindow();
  try {
    const currentSize = await win.innerSize();
    let currentWidth = currentSize.width;
    let currentHeight = currentSize.height;
    const steps = 10;
    const stepDelay = duration / steps;
    const deltaWidth = (targetWidth - currentWidth) / steps;
    const deltaHeight = (targetHeight - currentHeight) / steps;
    for (let i = 1; i <= steps; i++) {
      currentWidth += deltaWidth;
      currentHeight += deltaHeight;
      await win.setSize(
        new LogicalSize(Math.round(currentWidth), Math.round(currentHeight))
      );
      await new Promise((res) => setTimeout(res, stepDelay));
    }
    await win.setSize(new LogicalSize(targetWidth, targetHeight));
  } catch (err) {
    console.error("Error during smooth resize:", err);
  }
};

export const pinMagicDot = async () => {
  try {
    await invoke("pin_magic_dot");
  } catch (err) {
    console.error("Failed to pin magic dot:", err);
  }
};
