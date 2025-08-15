// src/App.tsx
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useDarkThemeStore } from "./store/darkThemeStore";
import { invoke } from "@tauri-apps/api/core";
import {
  register,
  isRegistered,
  unregister,
} from "@tauri-apps/plugin-global-shortcut";
import {
  MAGIC_DOT_TOGGLE_COMBO,
  MAGIC_DOT_TOGGLE_COOLDOWN_MS,
} from "./constants/shortcuts";
import Landing from "./routes/app/landing/page";
import Overlay from "./routes/overlay/OverlayCard";
import Onboarding from "./routes/app/onboarding/OnBoardings";
import ChatWindow from "./routes/app/magic-chat/page";
import ShortcutsPage from "./routes/settings/shortcuts/page";
import MainApp from "./routes/MainApp";
import { Settings } from "./routes/settings/page";
import Preferences from "./routes/settings/preferences/page";
import { AnimatePresence, motion } from "motion/react";
import Application from "./routes/app/page";
import SettingsPage from "./routes/settings/Settings";
import Notes from "./routes/app/notes/page";

function App() {
  const { darkTheme, initializeTheme } = useDarkThemeStore();
  // Register a global keyboard shortcut (Ctrl+H) to toggle the magic dot.
  // We use a small debounce to avoid rapid double-toggles when keys repeat.
  // Initialize darkTheme from localStorage on mount
  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

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

  // Listen for events and conditionally start watchers based on saved settings
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
        // Respect saved selection-watcher setting; do not force-enable
        const selEnabled = await invoke<boolean>(
          "get_auto_show_on_selection_enabled"
        );
        if (selEnabled) {
          await invoke("set_auto_show_on_selection_enabled", { enabled: true });
        }
      } catch (_) {}
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<{ text: string }>(
          "clipboard_text_copied",
          async () => {
            try {
              await invoke("show_magic_dot");
            } catch (_) {}
          }
        );
        unlistenSel = await listen<{ text: string }>(
          "text_selected",
          async () => {
            try {
              await invoke("show_magic_dot");
            } catch (_) {}
          }
        );
      } catch (_) {}
    }
    setup();
    return () => {
      if (unlisten) unlisten();
      if (unlistenSel) unlistenSel();
    };
  }, []);

  // Actively update the root html class when darkTheme changes
  useEffect(() => {
    const root = document.documentElement;
    if (darkTheme) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [darkTheme]);

  return (
    // <div className="size-full bg-background rounded-lg overflow-hidden">
    <Routes>
      <Route path="/" element={<Onboarding />} />
      <Route path="/overlay" element={<Overlay />} />
      <Route path="/app" element={<MainApp />}>
        <Route path="landing" element={<Landing />} />
        <Route path="chat" element={<ChatWindow />} />
        <Route path="shortcuts" element={<ShortcutsPage />} />
        <Route path="notes" element={<Notes />} />
        <Route path="settings" element={<Settings />}>
          <Route path="" element={<SettingsPage />}></Route>
          <Route path="shortcuts" element={<ShortcutsPage />} />
          <Route path="preferences" element={<Preferences />} />
        </Route>
      </Route>
    </Routes>
    // </div>
  );
}

export default App;
