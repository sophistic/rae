import { emit, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Send,
  Settings,
  Minus,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";

export default function ChatWindow() {
  const [visible, setVisible] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: 1024,
    h: 768,
  });
  const [inputText, setInputText] = useState("");
  const [listeningWindow, setListeningWindow] = useState<string>("");

  useEffect(() => {
    const unlisten = listen<any>("new_message", () => {
      setVisible(true);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Track viewport size to compute pixel sizes for smooth animation
  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Listen to the same "active_window_changed" event as magic dot and show it in chat
  useEffect(() => {
    // Ensure backend watcher is running (idempotent expectation)
    invoke("start_window_watch").catch(() => {});

    let unlisten: (() => void) | undefined;
    listen<string>("active_window_changed", (event) => {
      if (typeof event.payload === "string") {
        setListeningWindow(event.payload);
      }
    }).then((fn) => (unlisten = fn));

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="w-full h-full bg-transparent">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          width: Math.min(isCompact ? 620 : 760, Math.floor(viewport.w * 0.95)),
          height: Math.min(
            isCompact ? 360 : 400,
            Math.floor(viewport.h * 0.85),
          ),
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="bg-white/70 backdrop-blur-md rounded-xl shadow-2xl border border-white/70 overflow-hidden flex flex-col relative"
      >
        {/* Header */}
        <div className="drag flex items-center justify-between px-4 py-2 bg-white/40 backdrop-blur-md border-b border-gray-300">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 bg-yellow-200 rounded-full shrink-0"></div>
            <span className="text-gray-900 text-sm font-medium">
              QuackQuery
            </span>
          </div>
          <div className="no-drag flex items-center gap-1 text-gray-600">
            {/* Minimize to dot */}
            <button
              onClick={async () => {
                try {
                  await invoke("show_magic_dot");
                  await invoke("follow_magic_dot");
                  await emit("collapse_to_dot");
                } finally {
                  invoke("close_magic_chat").catch(() => {});
                }
              }}
              className="w-8 h-8 grid place-items-center rounded-full transition-colors duration-150 hover:bg-gray-200"
              title="Minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
            {/* Expand / Shrink */}
            <button
              onClick={() => setIsCompact((v) => !v)}
              className="w-8 h-8 grid place-items-center rounded-full transition-colors duration-150 hover:bg-gray-200"
              title={isCompact ? "Expand" : "Shrink"}
            >
              {isCompact ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-4 h-4" />
              )}
            </button>
            {/* Close */}
            <button
              onClick={() => invoke("close_magic_chat").catch(() => {})}
              className="w-8 h-8 grid place-items-center rounded-full transition-colors duration-150 hover:bg-gray-200"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Settings (non-functional) */}
            <button
              className="w-8 h-8 grid place-items-center rounded-full transition-colors duration-150 hover:bg-gray-200 cursor-not-allowed"
              disabled
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area - Recents List */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white/30 backdrop-blur-md">
          <div className="flex-1 overflow-y-hidden px-6 py-4">
            <div className="max-w-full">
              <div className="text-sm text-gray-600 mb-4 font-medium">
                Recents
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-0 py-2 text-gray-700 hover:text-black cursor-pointer">
                  <div className="w-4 h-4 rounded-sm bg-gray-200 flex items-center justify-center">
                    <div className="w-3 h-[1px] bg-gray-500"></div>
                  </div>
                  <div className="text-sm">Casual Greeting and Interaction</div>
                </div>
                <div className="flex items-center gap-3 px-0 py-2 text-gray-700 hover:text-black cursor-pointer">
                  <div className="w-4 h-4 rounded-sm bg-gray-200 flex items-center justify-center">
                    <div className="w-3 h-[1px] bg-gray-500"></div>
                  </div>
                  <div className="text-sm">Adding Google Calendar Event</div>
                </div>
                <div className="flex items-center gap-3 px-0 py-2 text-gray-700 hover:text-black cursor-pointer">
                  <div className="w-4 h-4 rounded-sm bg-gray-200 flex items-center justify-center">
                    <div className="w-3 h-[1px] bg-gray-500"></div>
                  </div>
                  <div className="text-sm">Adding Google Calendar Event</div>
                </div>
                <div className="flex items-center gap-3 px-0 py-2 mt-2">
                  <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-[10px] text-gray-500">⋯</span>
                  </div>
                  <button className="text-gray-600 text-sm hover:text-gray-800">
                    Show more
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Listening to status (above input) */}
          <div className="px-4 py-2 bg-white/60 backdrop-blur-sm border-t border-gray-200 flex items-center gap-2 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-100">
            <div className="truncate">
              Listening to:{" "}
              <span className="font-medium text-gray-800">
                {listeningWindow || "(no data)"}
              </span>
            </div>
          </div>

          {/* Bottom Input Bar */}
          <div className="px-4 py-3 bg-white border-t border-gray-200 relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputText.trim()) {
                  setInputText("");
                }
              }}
              placeholder="Ask Quack anything .."
              className="w-full bg-transparent text-gray-800 placeholder:text-gray-500 text-sm outline-none pr-28"
            />

            <div className="absolute right-4 inset-y-0 flex items-center gap-2">
              {inputText.trim().length > 0 && (
                <button
                  onClick={() => setInputText("")}
                  className="w-8 h-8 rounded-full bg-black text-white grid place-items-center hover:bg-black/90"
                  title="Send"
                >
                  <Send className="w-[14px] h-[14px]" />
                </button>
              )}
              <button
                className="w-9 h-9 rounded-full border border-gray-200 bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-not-allowed"
                disabled
                title="Voice (disabled)"
              >
                <Mic className="w-[14px] h-[14px]" />
              </button>
              <button
                className="w-9 h-9 rounded-full border border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-not-allowed"
                disabled
              >
                <span className="text-gray-600 text-sm">@</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
