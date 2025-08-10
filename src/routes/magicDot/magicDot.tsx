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
  const [bgPercent, setBgPercent] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<
    | null
    | {
        startX: number;
        startY: number;
        startPercentX: number;
        startPercentY: number;
      }
  >(null);
  const lastAppliedHeightRef = useRef<number>(60);
  const targetWidthRef = useRef<number>(550);
  const openMessageIndexRef = useRef<number>(0);

  useEffect(() => {
    invoke("start_window_watch").catch(() => {});

    interface ActiveWindowChangedPayload {
      name?: string;
      icon?: string; // data URL (e.g., data:image/png;base64,...)
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
  const applyCollapsedSize = () => {
    const win = getCurrentWebviewWindow();
    win.setSize(new LogicalSize(440, 60)).catch(() => {});
  };

  // applyChatSize kept for reference in case of future direct sizing

  useEffect(() => {
    if (!expanded && !hasStartedFollowing.current) {
      invoke("follow_magic_dot").catch(console.error);
      hasStartedFollowing.current = true;
    } else if (expanded && !showChat) {
      // Ensure proper width when first expanded (not in chat mode)
      smoothResize(targetWidthRef.current, 60);
    }
  }, [expanded, showChat]);

  useEffect(() => {
    let unlistenExit: UnlistenFn | null = null;
    let unlistenCollapse: UnlistenFn | null = null;

    listen("exit_follow_mode", () => {
      setExpanded(true);
      // keep size controlled explicitly when opening chat
      invoke("center_magic_dot").catch(() => {});
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
      await smoothResize(targetWidthRef.current, 480);
      lastAppliedHeightRef.current = 480;
    }
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInputText("");
    handleAIResponse(text);
  };

  const handleCloseChatClick = async () => {
    // Just close the chat, keep the bar expanded with input field
    setShowChat(false);
    await smoothResize(targetWidthRef.current, 60);
    lastAppliedHeightRef.current = 60;
    // Reset chat session state so next open starts clean
    setMessages([]);
    setChatInputText("");
    setBackgroundUrl(null);
    setIsAdjustingBg(false);
    setBgPercent({ x: 50, y: 50 });
    openMessageIndexRef.current = 0;
  };

  const handleCloseClick = async () => {
    setInputText("");
    setShowInput(true);
    setShowChat(false);
    await smoothResize(440, 60);
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
          className="no-drag flex items-center gap-1 hover:bg-gray-200 rounded p-2 text-sm border-r border-gray-300"
          onClick={handleSendClick}
        >
          <span className="text-sm font-medium">Send</span>
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
        { sender: "ai", text: "🤖 This is a dummy AI response for: " + userMessage },
      ]);
    }, 800);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Smoothly grow chat window height as messages accumulate
  useEffect(() => {
    if (!showChat) return;
    const base = 480; // initial chat height
    const max = 600; // cap to keep compact
    const newCount = Math.max(0, messages.length - openMessageIndexRef.current);
    const desired = Math.min(base + newCount * 36, max);
    if (desired > lastAppliedHeightRef.current) {
      smoothResize(targetWidthRef.current, desired);
      lastAppliedHeightRef.current = desired;
    }
  }, [messages.length, showChat]);

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
        <div className="w-full h-full flex items-center justify-center p-2 box-border">
          <main
            className={`w-fit h-full bg-white flex flex-col rounded-2xl shadow-lg overflow-hidden min-h-0`}
          >
            {/* Header bar */}
            <div className={`flex items-center pl-4 pr-2 w-full h-[44px] border-b border-gray-300 shrink-0 ${
              isPinned ? "" : "drag"
            }`}>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={`no-drag relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors duration-150 ${
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

              <div className="group no-drag mx-2 flex-1">
                {!showChat ? (
                  <div key="input-field" className="flex items-center rounded-full px-4 py-2 bg-gray-200 shadow-sm ring-1 ring-gray-300 no-drag max-w-xs">
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
                  <div key="listening-field" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600">
                    <span className="select-none font-medium">Listening to:</span>
                    {windowIcon ? (
                      <img
                        src={windowIcon}
                        alt="App icon"
                        className="w-5 h-5 rounded-sm"
                      />
                    ) : (
                      <div className="w-5 h-5 bg-gray-300 rounded-sm flex items-center justify-center">
                        <span className="text-xs text-gray-600">?</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center pr-2 no-drag ml-auto">
                {renderInputActionButton()}
                <button
                  onClick={() => setMicOn((v) => !v)}
                  className={`no-drag hover:bg-gray-300 rounded p-2 border-r border-gray-300 ${
                    micOn ? "bg-gray-200" : ""
                  }`}
                  title="Voice"
                >
                  <Mic className="scale-90" />
                </button>
                <button
                  onClick={handlePinClick}
                  className={`no-drag hover:bg-gray-300 rounded p-2 border-r border-gray-300 ${
                    isPinned ? "bg-gray-400" : ""
                  }`}
                  title="Pin"
                >
                  <Pin className="scale-90" />
                </button>
                {showChat && (
                  <button
                    onClick={handleCloseChatClick}
                    className="no-drag hover:bg-gray-300 rounded p-2"
                    title="Close chat"
                  >
                    <X className="scale-90" />
                  </button>
                )}
                {!showChat && (
                  <button
                    onClick={handleFollowClick}
                    className="no-drag hover:bg-gray-300 rounded p-2"
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
                style={
                  backgroundUrl
                    ? {
                        backgroundImage: `url(${backgroundUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: `${bgPercent.x}% ${bgPercent.y}%`,
                      }
                    : undefined
                }
                onMouseDown={(e) => {
                  if (!backgroundUrl || !isAdjustingBg) return;
                  dragStateRef.current = {
                    startX: e.clientX,
                    startY: e.clientY,
                    startPercentX: bgPercent.x,
                    startPercentY: bgPercent.y,
                  };
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseMove={(e) => {
                  if (!dragStateRef.current || !chatContainerRef.current) return;
                  const { startX, startY, startPercentX, startPercentY } =
                    dragStateRef.current;
                  const dx = e.clientX - startX;
                  const dy = e.clientY - startY;
                  const w = chatContainerRef.current.clientWidth || 1;
                  const h = chatContainerRef.current.clientHeight || 1;
                  const nextX = Math.max(0, Math.min(100, startPercentX - (dx / w) * 100));
                  const nextY = Math.max(0, Math.min(100, startPercentY - (dy / h) * 100));
                  setBgPercent({ x: nextX, y: nextY });
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseUp={(e) => {
                  dragStateRef.current = null;
                  e?.stopPropagation?.();
                }}
                onMouseLeave={(e) => {
                  dragStateRef.current = null;
                  e?.stopPropagation?.();
                }}
              >
                {/* Removed inner navbar/logo for a cleaner chat area */}

                <div className="flex-1 flex flex-col overflow-hidden bg-white/40 backdrop-blur-sm min-h-0">
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 scrollbar-hide">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`px-4 py-2 rounded-lg text-sm max-w-[80%] ${
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

                  <div className="px-4 py-3 bg-white border-t border-gray-200 relative flex items-center shrink-0">
                    <input
                      type="text"
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && chatInputText.trim()) {
                          const userMsg = chatInputText.trim();
                          setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
                          setChatInputText("");
                          handleAIResponse(userMsg);
                        }
                      }}
                      placeholder="Enter your message here"
                      className="w-full bg-transparent text-gray-800 placeholder:text-gray-500 text-sm outline-none pr-28"
                    />

                    <div className="absolute right-4 inset-y-0 flex items-center gap-2">
                      {chatInputText.trim().length > 0 && (
                        <button
                          onClick={() => {
                            const userMsg = chatInputText.trim();
                            setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
                            setChatInputText("");
                            handleAIResponse(userMsg);
                          }}
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
                        className="w-9 h-9 rounded-full border border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                        title="Personalise background"
                        aria-label="Personalise background"
                      >
                        <Pencil className="w-[16px] h-[16px]" />
                      </button>
                      {backgroundUrl && isAdjustingBg && (
                        <button
                          onClick={() => setIsAdjustingBg(false)}
                          className="px-3 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm"
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