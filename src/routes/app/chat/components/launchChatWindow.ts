import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";

export const launchMagicChat = async () => {
  try {
    const magicWindow = new WebviewWindow("chat", {
      url: "/app/chat",
      width: 780,
      height: 520,
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

    // Apply stealth mode to the newly created chat window
    try {
      await invoke("apply_stealth_mode_to_window", { windowLabel: "chat" });
    } catch (error) {
      console.error("Failed to apply stealth mode to chat window:", error);
    }

    return magicWindow;
  } catch (error) {
    console.error("Failed to create magic chat window:", error);
    throw error;
  }
};

export const animateChatExpand = async (toWidth = 780, toHeight = 520) => {
  await invoke("animate_chat_expand", { toWidth, toHeight });
};

