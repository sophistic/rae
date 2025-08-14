import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { useChatStore } from "@/store/chatStore";
import waveGif from "@/assets/wave.gif";
import gradientGif from "@/assets/gradient.gif";
import { Overlay } from "./Overlay";

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

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
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
      // Collapsed notch
      invoke("follow_magic_dot").catch(() => {});
      smoothResize(NOTCH.w, NOTCH.h);
      setTimeout(() => {
        invoke("follow_magic_dot").catch(() => {});
      }, 50);
      hasStartedFollowing.current = true;
    } else if (expanded && showChat) {
      // Expanded chat mode: ensure full chat size
      smoothResize(500, 750);
      setTimeout(() => {
        invoke("follow_magic_dot").catch(() => {});
      }, 50);
      lastAppliedHeightRef.current = 750;
    } else if (expanded && !showChat) {
      // Expanded bar mode (no chat)
      smoothResize(EXPANDED.w, EXPANDED.h);
      setTimeout(() => {
        invoke("follow_magic_dot").catch(() => {});
      }, 50);
      lastAppliedHeightRef.current = EXPANDED.h;
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
    // if (isPinned) {
    //   setIsPinned(false);
    //   setExpanded(true);
    //   setShowChat(false);
    //   // applyCollapsedSize();
    //   invoke("center_magic_dot").catch(() => {});
    //   return;
    // }
    // setIsPinned(true);
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
    } catch (_) {
      const win = getCurrentWebviewWindow();
      win.setSize(new LogicalSize(width, height)).catch(() => {});
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

  const renderInputActionButton = () => {
    if (!showChat && inputText.trim().length > 0) {
      return (
        <button
          className="no-drag h-full flex items-center gap-1 hover:bg-zinc-200 rounded p-2 text-sm border-r border-gray-300"
          onClick={() => {
            const text = inputText.trim();
            if (!text) return;
            handleSendClick(); // This opens chat and adds the message
            setPendingAIMessage(text); // Signal that we need AI response
          }}
        >
          <span className="text-sm font-medium ">Send</span>
        </button>
      );
    }
    return null;
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
            // ensure staying top-center on brief mouse leave/enter flutters
            setTimeout(() => {
              invoke("follow_magic_dot").catch(() => {});
            }, 50);
            // Auto-collapse to notch after short inactivity when not pinned and chat closed
            if (!isPinned && !showChat) {
              collapseTimerRef.current = setTimeout(() => {
                setExpanded(false);
              }, 3000);
            }
          }}
        >
        <Overlay
          expanded={expanded}
          setExpanded={setExpanded}
          isPinned={isPinned}
          isActive={isActive}
          setIsActive={setIsActive}
          micOn={micOn}
          inputText={inputText}
          setInputText={setInputText}
          showChat={showChat}
          setShowChat={setShowChat}
          messages={messages}
          setMessages={setMessages}
          chatInputText={chatInputText}
          setChatInputText={setChatInputText}
          windowIcon={windowIcon}
          handleSendClick={handleSendClick}
          handleCloseChatClick={handleCloseChatClick}
          handlePinClick={handlePinClick}
          handleFollowClick={handleFollowClick}
          renderInputActionButton={renderInputActionButton}
          fileInputRef={fileInputRef}
          handleBackgroundSelect={handleBackgroundSelect}
          backgroundUrl={backgroundUrl}
          isAdjustingBg={isAdjustingBg}
          setIsAdjustingBg={setIsAdjustingBg}
          bgPercent={bgPercent}
          setBgPercent={setBgPercent}
          chatContainerRef={chatContainerRef}
          bottomRef={bottomRef}
          pendingAIMessage={pendingAIMessage}
          setPendingAIMessage={setPendingAIMessage}
        />
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
