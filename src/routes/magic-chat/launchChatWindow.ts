
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
export const launchMagicChat = async () => {
  try {
    // Get the pre-configured window with larger size to accommodate both compact and expanded views
    const magicWindow = new WebviewWindow("magic-chat", {
      url: "/magic-chat",
      width: 900,
      height: 520,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      shadow: false,
      fullscreen: false,
      maximizable: false,
    });

    // Set up event listeners
    magicWindow.once("tauri://created", function () {
      console.log("Magic chat window successfully created");
    });

    magicWindow.once("tauri://error", function (e) {
      console.error("Error creating magic chat window:", e);
    });

    await magicWindow.show();
    await magicWindow.setFocus();
    await magicWindow.setAlwaysOnTop(true);

    console.log("Magic chat window shown");
    return magicWindow;
  } catch (error) {
    console.error("Failed to create magic chat window:", error);
    throw error;
  }
};
