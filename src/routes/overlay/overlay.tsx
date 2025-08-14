import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import { Generate } from "@/api/chat";
import { AnimatePresence, motion } from "framer-motion";
import { OverlayButton } from "./OverlayComponents";
import {
  Pin,
  Torus,
  X,
  Mic,
  Send,
  Pencil,
  Minimize2,
  Monitor,
  SquareArrowOutUpRight,
  Delete,
  Trash2,
  ChevronDown,
  Loader2,
  Maximize,
} from "lucide-react";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

const MODELS = [
  { label: "gemini", value: "gemini-2.5-flash" },
  { label: "GPT-4o", value: "gpt-4o" },
  { label: "GPT-3.5", value: "gpt-3.5" },
];

// DEV FLAG: Set to false to disable MagicDot for development
const DEV_MAGIC_DOT_ENABLED = true;

const NOTCH_TIMEOUT = 3000; // 3 seconds of no mouse activity before becoming notch

const Overlay = () => {
  const { email } = useUserStore();
  const { messages, setMessages } = useChatStore();
  const [isPinned, setIsPinned] = useState(false);
  const [inputText, setInputText] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showInput, setShowInput] = useState(true);
  const [windowName, setWindowName] = useState("");
  const [windowIcon, setWindowIcon] = useState("");

  const [isNotch, setIsNotch] = useState(false);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatInputText, setChatInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const lastAppliedHeightRef = useRef<number>(60);
  const openMessageIndexRef = useRef<number>(0);
  const [inputActive, setInputActive] = useState(false);

  // Chat functionality state
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatTitle, setChatTitle] = useState("New Chat");
  const [currentConvoId, setCurrentConvoId] = useState(-1);
  const [titleLoading, setTitleLoading] = useState(false);

  const mainRef = useRef<HTMLDivElement | null>(null);
  const notchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

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

  useEffect(() => {
    if (!showChat) {
      smoothResize(500, 60);
    }
  }, [showChat]);

  useEffect(() => {
    if (notchTimeoutRef.current) {
      clearTimeout(notchTimeoutRef.current);
      notchTimeoutRef.current = null;
    }

    if (isPinned && !showChat && !isNotch) {
      notchTimeoutRef.current = setTimeout(() => {
        setIsNotch(true);
      }, NOTCH_TIMEOUT);
    }

    return () => {
      if (notchTimeoutRef.current) {
        clearTimeout(notchTimeoutRef.current);
      }
    };
  }, [isPinned, showChat, isNotch]);

  const handleMouseEnter = () => {
    if (notchTimeoutRef.current) {
      clearTimeout(notchTimeoutRef.current);
      notchTimeoutRef.current = null;
    }
    if (isNotch && isPinned) {
      setIsNotch(false);
    }
  };

  const handleMouseLeave = () => {
    if (isPinned && !showChat && !isNotch) {
      notchTimeoutRef.current = setTimeout(() => {
        setIsNotch(true);
      }, NOTCH_TIMEOUT);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPinned) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && isPinned && dragStartRef.current) {
      const deltaX = Math.abs(e.clientX - dragStartRef.current.x);
      const deltaY = Math.abs(e.clientY - dragStartRef.current.y);

      if (deltaX > 5 || deltaY > 5) {
        setIsPinned(false);
        console.log("Pinned was made false");
        setIsDragging(false);
        dragStartRef.current = null;

        if (isNotch) {
          setIsNotch(false);
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => document.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const handlePinClick = () => {
    if (!isPinned) {
      invoke("pin_magic_dot").catch(console.error);
      setIsPinned((prev) => !prev);
      return;
    }
    if (isPinned) {
      setIsNotch(false);
      if (notchTimeoutRef.current) {
        clearTimeout(notchTimeoutRef.current);
        notchTimeoutRef.current = null;
      }
      setIsPinned((prev) => !prev);
    }
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
    setInputText("");
  };

  const handleOpenChat = async () => {
    setShowChat(true);
    await smoothResize(500, 480);
    lastAppliedHeightRef.current = 480;
    setInputText("");

    setIsNotch(false);
    if (notchTimeoutRef.current) {
      clearTimeout(notchTimeoutRef.current);
      notchTimeoutRef.current = null;
    }
  };

  const handleCloseChatClick = async () => {
    setShowChat(false);
    await smoothResize(500, 60);
    lastAppliedHeightRef.current = 60;
    setChatInputText("");
    openMessageIndexRef.current = 0;
  };

  const renderInputActionButton = () => {
    if (!showChat && inputText.trim().length > 0) {
      return (
        <button
          className="no-drag h-full flex items-center gap-1 hover:bg-zinc-200 rounded p-2 text-sm border-r border-gray-300"
          onClick={handleSendClick}
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

  const handleAIResponse = async (userMsg: string) => {
    if (userMsg.trim() === "") return;

    let newMessages = [
      ...messages,
      {
        sender: "user" as const,
        text: userMsg,
      },
    ];

    setMessages(newMessages);
    if (currentConvoId == -1) setTitleLoading(true);

    try {
      const ai_res = await Generate({
        email: email,
        message: userMsg,
        newConvo: currentConvoId == -1,
        conversationId: currentConvoId,
        provider: currentModel.label,
        modelName: currentModel.value,
        messageHistory: JSON.stringify(messages),
        notes: [""],
        agentId: 0,
        agentContext: "",
      });

      let updatedMessages = [
        ...newMessages,
        {
          sender: "ai" as const,
          text: ai_res.aiResponse,
        },
      ];

      setMessages(updatedMessages);

      if (currentConvoId === -1) {
        setChatTitle(ai_res.title || "New Chat");
        setCurrentConvoId(ai_res.conversationId);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      let errorMessages = [
        ...newMessages,
        {
          sender: "ai" as const,
          text: "Sorry, I encountered an error. Please try again.",
        },
      ];
      setMessages(errorMessages);
    } finally {
      setTitleLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setChatTitle("New Chat");
    setCurrentConvoId(-1);
    setChatInputText("");
  };

  const handleSendMessage = () => {
    const userMsg = chatInputText.trim();
    if (!userMsg) return;
    setChatInputText("");
    handleAIResponse(userMsg);
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    // *** MODIFIED: Added p-2 and box-border back to this wrapper div ***
    <div className="w-full h-screen flex items-center justify-center p-2 box-border">
      <motion.main
        ref={mainRef}
        animate={
          isNotch
            ? {
                scale: 0.5,
                transition: { type: "spring", stiffness: 400, damping: 35 },
              }
            : {
                scale: 1,
                transition: { type: "spring", stiffness: 400, damping: 35 },
              }
        }
        className={`w-full h-full bg-white flex flex-col shadow-lg overflow-hidden min-h-0 ${
          isNotch ? "rounded-full" : "rounded-xl"
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Header bar */}
        <motion.div
          className={`flex items-center w-full h-[44px] shrink-0 ${
            isPinned ? "" : "drag"
          } ${
            // This logic correctly hides the content when notched
            isNotch ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          <OverlayButton
            className="!border-none"
            customBgColor="white"
            active={isActive}
            onClick={() => setIsActive(!isActive)}
          >
            <div
              className={`size-3 ${
                isActive ? "bg-green-500" : "bg-gray-700"
              } rounded-full`}
            ></div>
          </OverlayButton>

          <div className="group drag flex-1 h-full flex items-center w-full">
            {!showChat ? (
              inputActive ? (
                <div
                  key="input-field"
                  className="flex w-full h-full items-center border-x border-gray-300 px-4 py-2 drag bg-white shadow-sm max-w-xs"
                >
                  <input
                    autoFocus
                    type="text"
                    className="no-drag text-sm font-medium text-zinc-800 border-none outline-none bg-transparent w-full placeholder:text-gray-500"
                    placeholder={`Ask Quack anything...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onBlur={() => setInputActive(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && inputText.trim()) {
                        handleSendClick();
                        const userMsg = inputText.trim();
                        setInputActive(false);
                        handleAIResponse(userMsg);
                      }
                    }}
                  />
                </div>
              ) : (
                <div
                  key="input-field"
                  className="flex w-full h-full items-center border-x border-gray-300 px-4 py-2 drag bg-white shadow-sm max-w-xs cursor-text"
                  onClick={() => setInputActive(true)}
                >
                  <span
                    className={`text-sm font-medium cursor-text z-50 text-zinc-800 ${
                      inputText ? "" : "text-gray-500"
                    }`}
                  >
                    {inputText || "Ask Quack anything..."}
                  </span>
                </div>
              )
            ) : (
              <div
                key="listening-field"
                className="flex drag items-center gap-2 px-4 py-2 text-sm text-gray-600"
              >
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

          <div className="flex items-center h-full ml-auto">
            {!showChat && inputText.trim().length > 0 && (
              <button
                className="no-drag h-full flex items-center gap-1 hover:bg-zinc-200 rounded p-2 text-sm border-r border-gray-300"
                onClick={() => {
                  const userMsg = inputText.trim();
                  if (!userMsg) return;
                  handleSendClick();
                  setInputActive(false);
                  handleAIResponse(userMsg);
                }}
              >
                <span className="text-sm font-medium ">Send</span>
              </button>
            )}
            <OverlayButton onClick={() => {}} active={micOn} title="Voice">
              <Mic size={16} />
            </OverlayButton>
            <OverlayButton
              onClick={handlePinClick}
              active={isPinned}
              title="Pin"
            >
              <Pin size={16} />
            </OverlayButton>
            {showChat && (
              <OverlayButton
                onClick={handleCloseChatClick}
                className="no-drag hover:bg-gray-300 rounded p-2"
                title="Close chat"
              >
                <X size={16} />
              </OverlayButton>
            )}
            {!showChat && (
              <OverlayButton
                onClick={handleOpenChat}
                className="no-drag hover:bg-gray-300 rounded p-2"
                title="Open chat"
              >
                <Maximize size={16} />
              </OverlayButton>
            )}
          </div>
        </motion.div>

        {isNotch && (
          <div className=" no-drag absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              ref={chatContainerRef}
              className={`no-drag flex-1 flex flex-col overflow-hidden border-t border-gray-200 relative min-h-0`}
            >
              <div className="flex-1 flex flex-col overflow-hidden bg-white min-h-0">
                <div className="h-[44px] border-b overflow-hidden border-b-gray-200 border-x border-x-transparent w-full flex">
                  <div className="h-full w-full flex justify-between items-center p-2 tracking-tight font-medium">
                    <div className="flex items-center gap-2">
                      {titleLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          <span>Generating title...</span>
                        </>
                      ) : (
                        chatTitle
                      )}
                    </div>
                    <div className="text-zinc-600 text-sm font-light">
                      {getCurrentTime()}
                    </div>
                  </div>
                  <div className="h-full flex ml-auto shrink-0">
                    <button
                      className="border-l h-[44px] hover:bg-zinc-300 border-gray-300 bg-white aspect-square shrink-0 flex items-center justify-center"
                      onClick={handleNewChat}
                      title="New Chat"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button
                      className="border-l h-[44px] hover:bg-zinc-300 border-gray-300 bg-white aspect-square shrink-0 flex items-center justify-center"
                      onClick={async () => {
                        try {
                          await emit("quack:transfer-chat", {
                            messages,
                            navigate: true,
                          });
                          setShowChat(false);
                        } catch (e) {
                          setShowChat(false);
                        }
                      }}
                      title="Open in main window"
                    >
                      <SquareArrowOutUpRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide relative">
                  {loadingMessages && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                      <Loader2
                        className="animate-spin text-zinc-700"
                        size={24}
                      />
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`px-4 py-2 rounded-lg text-sm w-fit ${
                        msg.sender === "user"
                          ? "bg-zinc-900 text-white self-end text-right ml-auto"
                          : "bg-zinc-200 self-start text-left"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <div className="h-[44px] focus-within:bg-zinc-200 bg-white border-t border-gray-200 relative flex items-center shrink-0">
                  <div className="relative h-full">
                    <button
                      type="button"
                      className="shrink-0 w-[120px] whitespace-nowrap bg-white h-full border-r border-gray-300 px-4 text-sm gap-2 flex items-center justify-center font-medium text-gray-800 select-none hover:bg-gray-50"
                      onClick={() => setDropdownOpen((v) => !v)}
                    >
                      {currentModel.label}
                      <ChevronDown size={16} />
                    </button>
                    {dropdownOpen && (
                      <div className="absolute left-0 bottom-full z-10 mb-1 w-40 bg-white border border-gray-200 rounded shadow-lg">
                        {MODELS.map((model) => (
                          <button
                            key={model.value}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 ${
                              model.value === currentModel.value
                                ? "font-bold bg-zinc-100"
                                : ""
                            }`}
                            onClick={() => {
                              setCurrentModel(model);
                              setDropdownOpen(false);
                            }}
                          >
                            {model.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && chatInputText.trim()) {
                        handleSendMessage();
                      }
                    }}
                    placeholder="Enter your message here"
                    className="w-full px-4 h-full bg-transparent text-gray-800 placeholder:text-gray-500 text-sm outline-none pr-28"
                  />

                  <div className="h-full w-fit right-0 inset-y-0 flex items-center">
                    <button
                      onClick={handleSendMessage}
                      className="h-full border-l hover:bg-zinc-300 border-gray-300 bg-white aspect-square shrink-0 flex items-center justify-center"
                      disabled={!chatInputText.trim()}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
};

export default DEV_MAGIC_DOT_ENABLED ? Overlay : () => null;
