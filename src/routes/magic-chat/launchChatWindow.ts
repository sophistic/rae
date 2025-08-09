import {
  WebviewWindow,
  getCurrentWebviewWindow,
} from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";

export const launchMagicChat = async () => {
  try {
    const magicWindow = new WebviewWindow("magic-chat", {
      url: "/magic-chat",
      width: 500,
      height: 300,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      shadow: false,
      fullscreen: false,
      maximizable: false,
    });

    magicWindow.once("tauri://created", function () {
      console.log("Magic chat window successfully created");
    });

    magicWindow.once("tauri://error", function (e) {
      console.error("Error creating magic chat window:", e);
    });

    await magicWindow.show();
    await magicWindow.setFocus();
    await magicWindow.setAlwaysOnTop(true);

    return magicWindow;
  } catch (error) {
    console.error("Failed to create magic chat window:", error);
    throw error;
  }
};

export const animateChatExpand = async (toWidth = 500, toHeight = 520) => {
  await invoke("animate_chat_expand", { toWidth, toHeight });
};

export const hideMagicDot = async () => invoke("hide_magic_dot");
export const showMagicDot = async () => invoke("show_magic_dot");
