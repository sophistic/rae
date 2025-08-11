import WindowControls from "./WindowControls";
import { SquareArrowOutUpRight, ArrowLeft, ArrowRight } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useNavigate, useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import React, { useState } from "react";
import { isRegistered, unregister } from "@tauri-apps/plugin-global-shortcut";
export default function Titlebar() {
  const { clearUser } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [shrunk, setShrunk] = useState<boolean>(false);

  const handlelogout = async () => {
    clearUser();
    // Disable magic dot creation and close any existing one
    invoke("set_magic_dot_creation_enabled", { enabled: false }).catch(console.error);
    invoke("close_magic_dot").catch(console.error);
    invoke("close_magic_chat").catch(console.error);
    // Unregister the global shortcut to prevent toggling after logout
    try {
      const combo = "Ctrl+H";
      if (await isRegistered(combo)) {
        await unregister(combo);
      }
    } catch (e) {
      console.warn("Failed to unregister global shortcut on logout", e);
    }
    navigate("/");
  };

  return (
    <div className="drag shrink-0 z-[1000] flex h-[36px] items-center justify-between p-0 bg-zinc-950 text-white">
      <div className="flex items-center gap-2 ml-2">
        <button
          className={`rounded p-1 ${location.pathname === "/app/landing" ? "bg-zinc-900 text-gray-500 cursor-not-allowed" : "hover:bg-zinc-800"}`}
          onClick={() => {
            if (location.pathname === "/app/landing") return;
            // Try to go back, but if no history, go to /app/landing
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/app/landing");
            }
          }}
          title="Back"
          disabled={location.pathname === "/app/landing"}
        >
          <ArrowLeft size={18} />
        </button>
        <button
          className="hover:bg-zinc-800 rounded p-1"
          onClick={() => navigate(1)}
          title="Forward"
        >
          <ArrowRight size={18} />
        </button>
        <span className="font-semibold text-sm ml-2">Quack</span>
      </div>
      <div className="no-drag flex items-center h-full ">
        <button
          onClick={handlelogout}
          className=" hover:bg-zinc-800 h-[36px] px-2 text-sm  gap-2 w-fit flex items-center justify-center "
          title="Logout"
        >
          Log out
          <SquareArrowOutUpRight size={12} />
        </button>
        <WindowControls shrunk={shrunk} onToggleShrink={() => setShrunk((s) => !s)} />
      </div>
    </div>
  );
}

