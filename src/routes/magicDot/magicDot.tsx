import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";

import { Pin, Torus, X, Mic, Send, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

const MagicDot = () => {
  const [expanded, setExpanded] = useState(false);
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAdjustingBg, setIsAdjustingBg] = useState(false);
  const [bgPercent, setBgPercent] = useState<{ x: number; y: number }>({
    x: 50,
    y: 50,
  });
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialBgPercent = useRef<{ x: number; y: number }>({ x: 50, y: 50 });

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
  console.log(showInput);
  console.log(windowName);
  const applyCollapsedSize = () => {
    const win = getCurrentWebviewWindow();
    win.setSize(new LogicalSize(500, 60)).catch(() => {});
  };

  useEffect(() => {
    if (!expanded && !hasStartedFollowing.current) {
      invoke("follow_magic_dot").catch(console.error);
      hasStartedFollowing.current = true;
    } else if (expanded && !showChat) {
      // Ensure proper width when first expanded (not in chat mode)
      smoothResize(500, 60);
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
      invoke("follow_magic_dot").catch(console.error);
    }).then((fn) => {
      unlistenCollapse = fn;
    });

    return () => {
      if (unlistenExit) unlistenExit();
      if (unlistenCollapse) unlistenCollapse();
    };
  }, []);

  const handleFollowClick = async () => {
    setExpanded(false);
    setIsPinned(false);
    setShowInput(true);
    invoke("follow_magic_dot").catch(console.error);
  };

  const handlePinClick = () => {
    if (isPinned) {
      setIsPinned(false);
      setExpanded(true);
      setShowChat(false);
      applyCollapsedSize();
      invoke("center_magic_dot").catch(() => {});
      return;
    }
    setIsPinned(true);
    invoke("pin_magic_dot").catch(console.error);
  };

  const smoothResize = async (width: number, height: number) => {
    const win = getCurrentWebviewWindow();
    win.setSize(new LogicalSize(width, height)).catch(() => {});
  };

  const handleSendClick = async () => {
    const text = inputText.trim();
    if (!text) return;
    if (!showChat) {
      openMessageIndexRef.current = messages.length;
      setShowChat(true);
      await smoothResize(500, 480);
      lastAppliedHeightRef.current = 480;
    }
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInputText("");
    handleAIResponse(text);
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
          className="no-drag flex items-center gap-1 hover:bg-gray-200 rounded p-2 text-sm border-r border-gray-300 shrink-0"
          onClick={handleSendClick}
        >
          <span className="text-sm font-medium whitespace-nowrap">Send</span>
        </button>
      );
    }
    return null;
  };

  // Chat behaviors
  const handleAIResponse = (userMessage: string) => {
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "🤖 This is a dummy AI response for: " + userMessage,
        },
      ]);
    }, 800);
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isAdjustingBg || !backgroundUrl) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialBgPercent.current = { ...bgPercent };
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  // Add global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!isAdjustingBg || !backgroundUrl) return;
        e.preventDefault();

        const container = chatContainerRef.current;
        if (!container) return;

        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;

        const containerRect = container.getBoundingClientRect();

        // Increase sensitivity by using a multiplier
        const sensitivity = 0.5;
        const percentDeltaX =
          (deltaX / containerRect.width) * 100 * sensitivity;
        const percentDeltaY =
          (deltaY / containerRect.height) * 100 * sensitivity;

        // Use natural drag direction for background positioning
        const newX = Math.max(
          0,
          Math.min(100, initialBgPercent.current.x + percentDeltaX),
        );
        const newY = Math.max(
          0,
          Math.min(100, initialBgPercent.current.y + percentDeltaY),
        );

        setBgPercent({ x: newX, y: newY });
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      document.addEventListener("mousemove", handleGlobalMouseMove, {
        passive: false,
      });
      document.addEventListener("mouseup", handleGlobalMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [isDragging, isAdjustingBg, backgroundUrl]);

  return (
    <div className="w-full h-screen">
      {expanded ? (
        <div className="w-full h-full flex items-center justify-center p-2 box-border">
          <main
            className={`w-full h-full bg-white flex flex-col rounded-2xl shadow-lg overflow-hidden min-h-0`}
          >
            {/* Header bar */}
            <div
              className={`flex items-center pl-4 pr-2 w-full h-[44px] border-b border-gray-300 shrink-0 overflow-hidden ${
                isPinned ? "" : "drag"
              }`}
            >
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={`no-drag relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors duration-150 shrink-0 ${
                  isActive ? "bg-green-500" : "bg-gray-300"
                }`}
                title={isActive ? "On" : "Off"}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform duration-150 ${
                    isActive ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </button>

              <div className="group no-drag mx-2 flex-1 min-w-0 overflow-hidden max-w-[260px]">
                {!showChat ? (
                  <div
                    key="input-field"
                    className="flex items-center rounded-full px-4 py-2 bg-gray-200 shadow-sm ring-1 ring-gray-300 no-drag w-full overflow-hidden"
                  >
                    <input
                      type="text"
                      className="no-drag text-sm font-medium text-gray-800 border-none outline-none bg-transparent w-full placeholder:text-gray-500"
                      placeholder={`Ask Quack anything...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendClick();
                      }}
                    />
                  </div>
                ) : (
                  <div
                    key="listening-field"
                    className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 overflow-hidden"
                  >
                    <span className="select-none font-semibold">
                      Listening to:
                    </span>
                    {windowIcon ? (
                      <img
                        src={windowIcon}
                        alt="App icon"
                        className="w-5 h-5 rounded-sm shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 bg-gray-300 rounded-sm flex items-center justify-center shrink-0">
                        <span className="text-xs text-gray-600">?</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center pr-2 no-drag ml-auto shrink-0">
                {renderInputActionButton()}
                <button
                  onClick={() => setMicOn((v) => !v)}
                  className={`no-drag hover:bg-gray-300 rounded p-2 border-r border-gray-300 shrink-0 ${
                    micOn ? "bg-gray-200" : ""
                  }`}
                  title="Voice"
                >
                  <Mic className="scale-90" />
                </button>
                <button
                  onClick={handlePinClick}
                  className={`no-drag hover:bg-gray-300 rounded p-2 border-r border-gray-300 shrink-0 ${
                    isPinned ? "bg-gray-400" : ""
                  }`}
                  title="Pin"
                >
                  <Pin className="scale-90" />
                </button>
                {showChat && (
                  <button
                    onClick={handleCloseChatClick}
                    className="no-drag hover:bg-gray-300 rounded p-2 shrink-0"
                    title="Close chat"
                  >
                    <X className="scale-90" />
                  </button>
                )}
                {!showChat && (
                  <button
                    onClick={handleFollowClick}
                    className="no-drag hover:bg-gray-300 rounded p-2 shrink-0"
                    title="Follow"
                  >
                    <Torus className="scale-90" />
                  </button>
                )}
              </div>
            </div>

            {/* Chat area */}
            <AnimatePresence initial={false}>
              {showChat && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: -14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  ref={chatContainerRef}
                  className={`no-drag flex-1 flex flex-col overflow-hidden border-t border-gray-200 relative min-h-0 ${
                    backgroundUrl && isAdjustingBg ? "cursor-move" : ""
                  }`}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  style={
                    backgroundUrl
                      ? {
                          backgroundImage: `url(${backgroundUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: `${bgPercent.x}% ${bgPercent.y}%`,
                        }
                      : undefined
                  }
                >
                  <div className="flex-1 flex flex-col overflow-hidden bg-white/40 backdrop-blur-sm min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 scrollbar-hide">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`px-4 py-2 rounded-lg text-sm w-fit ${
                            msg.sender === "user"
                              ? "bg-gray-900 text-white self-end text-right ml-auto"
                              : "bg-gray-200 self-start text-left"
                          }`}
                        >
                          {msg.text}
                        </div>
                      ))}
                      <div ref={bottomRef} />
                    </div>

                    <div className="px-4 py-3 bg-white border-t border-gray-200 relative flex items-center shrink-0 overflow-hidden">
                      <input
                        type="text"
                        value={chatInputText}
                        onChange={(e) => setChatInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && chatInputText.trim()) {
                            const userMsg = chatInputText.trim();
                            setMessages((prev) => [
                              ...prev,
                              { sender: "user", text: userMsg },
                            ]);
                            setChatInputText("");
                            handleAIResponse(userMsg);
                          }
                        }}
                        placeholder="Enter your message here"
                        className="w-full bg-transparent text-gray-800 placeholder:text-gray-500 text-sm outline-none pr-48"
                      />

                      <div className="absolute right-4 inset-y-0 flex items-center gap-2 shrink-0">
                        {chatInputText.trim().length > 0 && (
                          <button
                            onClick={() => {
                              const userMsg = chatInputText.trim();
                              setMessages((prev) => [
                                ...prev,
                                { sender: "user", text: userMsg },
                              ]);
                              setChatInputText("");
                              handleAIResponse(userMsg);
                            }}
                            className="w-8 h-8 rounded-full bg-black text-white grid place-items-center hover:bg-black/90 shrink-0"
                            title="Send"
                          >
                            <Send className="w-[14px] h-[14px]" />
                          </button>
                        )}
                        <button
                          className="w-9 h-9 rounded-full border border-gray-200 bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-not-allowed shrink-0"
                          disabled
                          title="Voice (disabled)"
                        >
                          <Mic className="w-[14px] h-[14px]" />
                        </button>
                        <button
                          className="w-9 h-9 rounded-full border border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-not-allowed shrink-0"
                          disabled
                          title="Mention (disabled)"
                        >
                          <span className="text-gray-600 text-sm">@</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleBackgroundSelect}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-9 h-9 rounded-full border border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 shrink-0"
                          title="Personalise background"
                          aria-label="Personalise background"
                        >
                          <Pencil className="w-[16px] h-[16px]" />
                        </button>
                        {backgroundUrl && isAdjustingBg && (
                          <button
                            onClick={() => setIsAdjustingBg(false)}
                            className="px-3 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm shrink-0 whitespace-nowrap"
                            title="Done"
                          >
                            Done
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="shrink-0 w-3 h-3 bg-yellow-400 rounded-full shadow" />
        </div>
      )}
    </div>
  );
};

export default MagicDot;
