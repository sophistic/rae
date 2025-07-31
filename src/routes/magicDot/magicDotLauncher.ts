// magicDotLauncher.ts
// import { Window } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
export const launchMagicDotWindow = async () => {
  try {
    // Get the pre-configured window
    const magicWindow = new WebviewWindow("magic-dot", {
      url: "/magic-dot",
      width: 150,
      height: 150,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
    });

    // Set up event listeners
    magicWindow.once("tauri://created", function () {
      console.log("Magic dot window successfully created");
    });

    magicWindow.once("tauri://error", function (e) {
      console.error("Error creating magic dot window:", e);
    });

    await magicWindow.show();
    await magicWindow.setFocus();
    await magicWindow.setAlwaysOnTop(true);

    console.log("Magic dot window shown");
    return magicWindow;
  } catch (error) {
    console.error("Failed to create magic dot window:", error);
    throw error;
  }
};
