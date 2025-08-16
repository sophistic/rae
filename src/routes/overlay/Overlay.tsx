import gradientGif from "@/assets/gradient.gif";
import { useChatStore } from "@/store/chatStore";
import { invoke } from "@tauri-apps/api/core";
import { LogicalSize } from "@tauri-apps/api/dpi";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useRef, useState } from "react";
import Overlay from "./components/OverlayCard";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

// DEV FLAG: Set to false to disable MagicDot for development
const DEV_MAGIC_DOT_ENABLED = true;

const MagicDot = () => {
  const [expanded, setExpanded] = useState(true); // Expanded bar state
  const [isPinned, setIsPinned] = useState(false);
  const hasStartedFollowing = useRef(false);
  const [inputText, setInputText] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showInput, setShowInput] = useState(true); // NEW STATE
  const [windowName, setWindowName] = useState("");
  const [windowIcon, setWindowIcon] = useState("");
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const messages = useChatStore((s) => s.messages);
  const setMessages = useChatStore((s) => s.setMessages);
  const [chatInputText, setChatInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [pendingAIMessage, setPendingAIMessage] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAdjustingBg, setIsAdjustingBg] = useState(false);
  const [bgPercent, setBgPercent] = useState<{ x: number; y: number }>({
    x: 50,
    y: 50,
  });
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const hoverExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastAppliedHeightRef = useRef<number>(60);
  const openMessageIndexRef = useRef<number>(0);

  useEffect(() => {
    invoke("start_window_watch").catch(() => {});

    interface ActiveWindowChangedPayload {
      name?: string;
      icon?: string; // data UR (e.g., data:image/png;base64,...)
    }

    const unlistenPromise = listen<ActiveWindowChangedPayload>(
      "active_window_changed",
      (event) => {
        if (event?.payload) {
          const { name, icon } = event.payload;
          setWindowName(name ?? "");
          setWindowIcon(icon ?? "");
        }
      },
    );

    // Force top-center positioning after component mounts
    const positionTimer = setTimeout(() => {
      invoke("force_top_center_magic_dot").catch(() => {});
    }, 200);

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
      clearTimeout(positionTimer);
    };
  }, []);
  // Dimensions for expanded bar and collapsed notch
  const EXPANDED = { w: 500, h: 60 } as const;
  const NOTCH = { w: 180, h: 28 } as const;

  const applyCollapsedSize = () => {
    const win = getCurrentWebviewWindow();
    win.setSize(new LogicalSize(NOTCH.w, NOTCH.h)).catch(() => {});
  };

  useEffect(() => {
    if (!expanded) {
      // Collapsed notch - resize and position atomically
      smoothResize(NOTCH.w, NOTCH.h);
      hasStartedFollowing.current = true;
      // No need for follow_magic_dot since smoothResize handles positioning
    } else if (expanded && showChat) {
      // Expanded chat mode: ensure full chat size
      smoothResize(500, 750);
      lastAppliedHeightRef.current = 750;
      // No need for follow_magic_dot since smoothResize handles positioning
    } else if (expanded && !showChat) {
      // Expanded bar mode (no chat)
      smoothResize(EXPANDED.w, EXPANDED.h);
      lastAppliedHeightRef.current = EXPANDED.h;
      // No need for follow_magic_dot since smoothResize handles positioning
    }
  }, [expanded, showChat]);

  useEffect(() => {
    let unlistenExit: UnlistenFn | null = null;
    let unlistenCollapse: UnlistenFn | null = null;

    listen("exit_follow_mode", () => {
      setExpanded(true);

      // keep size controlled explicitly when opening chat
      // invoke("center_magic_dot").catch(() => {});
    }).then((fn) => {
      unlistenExit = fn;
    });

    listen("collapse_to_dot", () => {
      setExpanded(false);
      setIsPinned(false);
      // invoke("follow_magic_dot").catch(console.error);
    }).then((fn) => {
      unlistenCollapse = fn;
    });

    return () => {
      if (unlistenExit) unlistenExit();
      if (unlistenCollapse) unlistenCollapse();
    };
  }, []);

  const handleFollowClick = async () => {
    // setExpanded(false);
    // setIsPinned(false);
    // setShowInput(true);
    // invoke("follow_magic_dot").catch(console.error);
  };

  const handlePinClick = () => {
    invoke("pin_magic_dot").catch(console.error);
  };

  const smoothResize = async (width: number, height: number) => {
    try {
      // Use backend command that atomically resizes and re-centers to top
      await invoke("resize_and_top_center_magic_dot", {
        to_width: width,
        to_height: height,
        animate: false,
      });
      // Force positioning after resize to ensure it's centered
      setTimeout(() => {
        invoke("force_top_center_magic_dot").catch(() => {});
      }, 100);
    } catch (_) {
      const win = getCurrentWebviewWindow();
      win.setSize(new LogicalSize(width, height)).catch(() => {});
      // Force positioning for fallback too
      setTimeout(() => {
        invoke("force_top_center_magic_dot").catch(() => {});
      }, 100);
    }
  };

  const handleSendClick = async () => {
    const text = inputText.trim();
    if (!text) return;
    if (!showChat) {
      openMessageIndexRef.current = messages.length;
      setShowChat(true);
      await smoothResize(500, 750);
      lastAppliedHeightRef.current = 750;
    }
    setInputText("");
    // Add the message to chat and trigger AI response
    const newMessages = [
      ...messages,
      {
        sender: "user" as const,
        text: text,
      },
    ];
    setMessages(newMessages);
  };

  const handleCloseChatClick = async () => {
    // Just close the chat, keep the bar expanded with input field
    setShowChat(false);
    await smoothResize(500, 60);
    lastAppliedHeightRef.current = 60;
    // Reset chat session state so next open starts clean
    setMessages([]);
    setChatInputText("");
    setBackgroundUrl(null);
    setIsAdjustingBg(false);
    setBgPercent({ x: 50, y: 50 });
    openMessageIndexRef.current = 0;
  };

  

  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    return () => {
      if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
    };
  }, [backgroundUrl]);

  const handleBackgroundSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBackgroundUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setBgPercent({ x: 50, y: 50 });
    setIsAdjustingBg(true);
    e.currentTarget.value = "";
  };

  return (
    <div className="w-full h-screen">
      {expanded ? (
        <div
          onMouseEnter={() => {
            if (collapseTimerRef.current) {
              clearTimeout(collapseTimerRef.current);
              collapseTimerRef.current = null;
            }
          }}
          onMouseLeave={() => {
            if (collapseTimerRef.current) {
              clearTimeout(collapseTimerRef.current);
            }
            // Only reposition if window might have moved during interaction
            // The smoothResize calls handle positioning automatically

            // Auto-collapse to notch after short inactivity when not pinned and chat closed
            if (!isPinned && !showChat) {
              collapseTimerRef.current = setTimeout(() => {
                setExpanded(false);
              }, 3000);
            }
          }}
        >
          <Overlay />
        </div>
      ) : (
        // Collapsed notch UI: mac-style notch (flat top, rounded bottom corners)
        <div className="w-full h-full flex items-start justify-center">
          <div
            className="cursor-pointer select-none bg-white border border-gray-300 border-t-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)] overflow-hidden"
            style={{
              width: NOTCH.w,
              height: NOTCH.h,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
            }}
            onMouseDown={() => {
              const win = getCurrentWebviewWindow();
              if (hoverExpandTimer.current) {
                clearTimeout(hoverExpandTimer.current);
                hoverExpandTimer.current = null;
              }
              win.startDragging().catch(() => {});
            }}
            onMouseEnter={() => {
              if (hoverExpandTimer.current) {
                clearTimeout(hoverExpandTimer.current);
              }
              hoverExpandTimer.current = setTimeout(() => {
                setExpanded(true);
                // Ensure proper positioning after expansion with force command
                setTimeout(() => {
                  invoke("force_top_center_magic_dot").catch(() => {});
                }, 100);
              }, 200);
            }}
            onMouseLeave={() => {
              if (hoverExpandTimer.current) {
                clearTimeout(hoverExpandTimer.current);
                hoverExpandTimer.current = null;
              }
            }}
            title="Expand"
          >
            <img
              src={gradientGif}
              alt="gradient"
              draggable={false}
              className="pointer-events-none"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DEV_MAGIC_DOT_ENABLED ? MagicDot : () => null;
