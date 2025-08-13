// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register, isRegistered, unregister } from "@tauri-apps/plugin-global-shortcut";
import { MAGIC_DOT_TOGGLE_COMBO, MAGIC_DOT_TOGGLE_COOLDOWN_MS } from "./constants/shortcuts";
import Landing from "./routes/landing/page";
import MagicDot from "./routes/overlay/magicDot";
import Onboarding from "./routes/onboarding/OnBoardings";
import ChatWindow from "./routes/magic-chat/page";
import ShortcutsPage from "./routes/shortcuts/page";
import MainApp from "./routes/MainApp";
function App() {
  // Register a global keyboard shortcut (Ctrl+H) to toggle the magic dot.
  // We use a small debounce to avoid rapid double-toggles when keys repeat.
  useEffect(() => {
    const combo = MAGIC_DOT_TOGGLE_COMBO;
    const cooldownMs = MAGIC_DOT_TOGGLE_COOLDOWN_MS;
    let lastFired = 0;
    const setup = async () => {
      try {
        try {
          if (await isRegistered(combo)) {
            await unregister(combo);
          }
        } catch (e) {
          console.warn("isRegistered/unregister failed; continuing", e);
        }
        await register(combo, async () => {
          console.log("Global shortcut pressed:", combo);
          const now = Date.now();
          if (now - lastFired < cooldownMs) {
            return;
          }
          lastFired = now;
          try {
            await invoke("toggle_magic_dot");
            console.log("Invoked toggle_magic_dot");
          } catch (e) {
            console.error("Failed to toggle magic dot", e);
          }
        });
        const ok = await isRegistered(combo);
        console.log("Registered global shortcut:", combo, ok);
      } catch (e) {
        console.error("Failed to register global shortcut", e);
      }
    };
    setup();
    return () => {
      unregister(combo).catch(() => {});
    };
  }, []);

  // Listen for clipboard_text_copied events and show the magic dot when enabled
  useEffect(() => {
    let unlisten: undefined | (() => void);
    let unlistenSel: undefined | (() => void);
    async function setup() {
      try {
        // If previously enabled, ensure watcher thread is running after reload
        const enabled = await invoke<boolean>("get_auto_show_on_copy_enabled");
        if (enabled) {
          await invoke("set_auto_show_on_copy_enabled", { enabled: true });
        }
      } catch (_) {}
      try {
        // Enable selection watcher by default
        await invoke("set_auto_show_on_selection_enabled", { enabled: true });
      } catch (_) {}
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<{ text: string }>("clipboard_text_copied", async () => {
          try { await invoke("show_magic_dot"); } catch (_) {}
        });
        unlistenSel = await listen<{ text: string }>("text_selected", async () => {
          try {
            await invoke("show_magic_dot");
            // Force collapse state on auto-show
            const { emit } = await import("@tauri-apps/api/event");
            await emit("collapse_to_dot");
          } catch (_) {}
        });
      } catch (_) {}
    }
    setup();
    return () => {
      if (unlisten) unlisten();
      if (unlistenSel) unlistenSel();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/magic-dot" element={<MagicDot />} />
        <Route path="/shortcuts" element={<ShortcutsPage />} />
        <Route path="/app" element={<MainApp />}>
          <Route path="landing" element={<Landing />} />
          <Route path="chat" element={<ChatWindow />} />
          <Route path="shortcuts" element={<ShortcutsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
