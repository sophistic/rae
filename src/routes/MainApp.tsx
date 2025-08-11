

import { Outlet, useNavigate } from "react-router-dom";
import Titlebar from "@/components/Titlebar";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { register, isRegistered, unregister } from "@tauri-apps/plugin-global-shortcut";
import { MAGIC_DOT_TOGGLE_COMBO, MAGIC_DOT_TOGGLE_COOLDOWN_MS } from "@/constants/shortcuts";

export default function MainApp() {
  const navigate = useNavigate();

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<{ navigate?: boolean }>("quack:transfer-chat", (event) => {
      if (event?.payload?.navigate) {
        navigate("/app/chat");
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, [navigate]);

  // Ensure magic-dot can be created and the global shortcut is registered
  // whenever the app shell is mounted (e.g., after login).
  useEffect(() => {
    // Re-enable magic-dot creation
    invoke("set_magic_dot_creation_enabled", { enabled: true }).catch(() => {});

    const combo = MAGIC_DOT_TOGGLE_COMBO;
    const cooldownMs = MAGIC_DOT_TOGGLE_COOLDOWN_MS;
    let lastFired = 0;
    const setup = async () => {
      try {
        try {
          if (await isRegistered(combo)) {
            await unregister(combo);
          }
        } catch (_) {}
        await register(combo, async () => {
          const now = Date.now();
          if (now - lastFired < cooldownMs) return;
          lastFired = now;
          try {
            await invoke("toggle_magic_dot");
          } catch (_) {}
        });
      } catch (_) {}
    };
    setup();
    return () => {
      unregister(combo).catch(() => {});
    };
  }, []);

  return (
    <div className="rounded-lg bg-white size-full overflow-hidden flex flex-col">
      <Titlebar />
      <Outlet />
    </div>
  );
}
