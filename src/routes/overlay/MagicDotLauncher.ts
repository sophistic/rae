// magicDotLauncher.ts
// import { Window } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
// Creates (or reuses) the magic dot window and ensures it is visible and focused.
// Emits `collapse_to_dot` so the UI starts in the small dot state.
export const launchMagicDotWindow = async () => {
  try {
    // Launch small "notch" size; the overlay will expand on hover
    const NOTCH_WIDTH = 140;
    const NOTCH_HEIGHT = 28;

    // If window already exists, just resize and focus it
    const existing = await WebviewWindow.getByLabel("magic-dot");
    if (existing) {
      try {
        await existing.setSize(new LogicalSize(NOTCH_WIDTH, NOTCH_HEIGHT));
      } catch (_) {}
      await existing.show();
      await existing.setFocus();
      await existing.setAlwaysOnTop(true);
      // Ensuring 
      // it starts collapsed dot state
      try { await existing.emit("collapse_to_dot"); } catch (_) {}
      return existing;
    }

    // Create a new pre-configured window
    const magicWindow = new WebviewWindow("magic-dot", {
      url: "/magic-dot",
      width: NOTCH_WIDTH,
      height: NOTCH_HEIGHT,
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
      console.log("Magic dot window successfully created");
    });

    magicWindow.once("tauri://error", function (e) {
      console.error("Error creating magic dot window:", e);
    });

    await magicWindow.show();
    await magicWindow.setFocus();
    await magicWindow.setAlwaysOnTop(true);
    try { await magicWindow.emit("collapse_to_dot"); } catch (_) {}

    console.log("Magic dot window shown");
    return magicWindow;
  } catch (error) {
    console.error("Failed to create magic dot window:", error);
    throw error;
  }
};
