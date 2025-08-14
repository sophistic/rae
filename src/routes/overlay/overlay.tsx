import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { AnimatePresence, motion } from "framer-motion";
import { OverlayButton } from "./OverlayComponents";
import { ChatView } from "./chatView";
import { Pin, X, Mic, Maximize } from "lucide-react";
import gradientGif from "../../assets/gradient.gif";

// DEV FLAG: Set to false to disable MagicDot for development
const DEV_MAGIC_DOT_ENABLED = true;

const NOTCH_TIMEOUT = 3000;

const Overlay = () => {
  // State for the overlay shell itself
  const [isPinned, setIsPinned] = useState(false);
  const [inputText, setInputText] = useState(""); // For the main input bar
  const [micOn, setMicOn] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [windowName, setWindowName] = useState("");
  const [windowIcon, setWindowIcon] = useState("");
  const [isNotch, setIsNotch] = useState(false);
  const [inputActive, setInputActive] = useState(false);

  // State to control and pass data to the chat view
  const [showChat, setShowChat] = useState(false);
  const [initialChatMessage, setInitialChatMessage] = useState<
    string | undefined
  >();

  // Refs for dragging and notch timeout
  const notchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    invoke("start_window_watch").catch(() => {});
    const unlistenPromise = listen<{ name?: string; icon?: string }>(
      "active_window_changed",
      (event) => {
        if (event?.payload) {
          setWindowName(event.payload.name ?? "");
          setWindowIcon(event.payload.icon ?? "");
        }
      }
    );
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Effect to handle resizing when chat is opened/closed
  useEffect(() => {
    if (showChat) {
      smoothResize(500, 480);
    } else {
      smoothResize(500, 60);
    }
  }, [showChat]);

  // Effect for notch timeout
  useEffect(() => {
    if (notchTimeoutRef.current) clearTimeout(notchTimeoutRef.current);
    if (isPinned && !showChat && !isNotch) {
      notchTimeoutRef.current = setTimeout(
        () => setIsNotch(true),
        NOTCH_TIMEOUT
      );
    }
    return () => {
      if (notchTimeoutRef.current) clearTimeout(notchTimeoutRef.current);
    };
  }, [isPinned, showChat, isNotch]);

  const handleMouseEnter = () => {
    if (notchTimeoutRef.current) clearTimeout(notchTimeoutRef.current);
    if (isNotch && isPinned) setIsNotch(false);
  };

  const handleMouseLeave = () => {
    if (isPinned && !showChat && !isNotch) {
      notchTimeoutRef.current = setTimeout(
        () => setIsNotch(true),
        NOTCH_TIMEOUT
      );
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPinned) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isPinned || !dragStartRef.current) return;
    const deltaX = Math.abs(e.clientX - dragStartRef.current.x);
    const deltaY = Math.abs(e.clientY - dragStartRef.current.y);

    if (deltaX > 5 || deltaY > 5) {
      // When dragging while not pinned, we can implement actual window dragging here
      // For now, just reset the drag state
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => document.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const handlePinClick = () => {
    invoke("pin_magic_dot").catch(console.error);
    setIsPinned((prev) => !prev);
    if (isPinned) setIsNotch(false);
  };

  const smoothResize = async (width: number, height: number) => {
    const win = getCurrentWebviewWindow();
    win.setSize(new LogicalSize(width, height)).catch(() => {});
  };

  // *** MODIFIED: This function now just sets state to trigger the chat view ***
  const handleSendFromMainBar = () => {
    const userMsg = inputText.trim();
    if (!userMsg) return;
    setInitialChatMessage(userMsg);
    setShowChat(true);
    setInputText("");
    setInputActive(false);
  };

  const handleOpenChat = () => {
    setInitialChatMessage(undefined); // Ensure no old message is passed
    setShowChat(true);
    setIsNotch(false);
    if (notchTimeoutRef.current) clearTimeout(notchTimeoutRef.current);
  };

  const handleCloseChatClick = () => {
    setShowChat(false);
  };

  return (
    <div
      className={`w-full h-screen flex ${
        isNotch ? "items-start" : "items-center"
      } justify-center ${isNotch ? "pt-0" : "p-2"} box-border`}
    >
      <motion.main
        animate={
          isNotch
            ? {
                scale: 0.5,
                y: -10,
                borderRadius: "0 0 28px 28px",
                boxShadow: "0 10px 36px rgba(0, 0, 0, 0.4), 0 0 22px rgba(255, 255, 255, 0.1)",
              }
            : {
                scale: 1,
                y: 0,
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
              }
        }
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8,
        }}
        className={`${
          isNotch
            ? "w-[360px] h-16 -mt-3 border-2 border-white/20 backdrop-blur-sm" // enhanced notch styling
            : "w-full h-full"
        } ${
          isNotch ? "" : "bg-white"
        } flex flex-col overflow-hidden min-h-0`}
        style={
          isNotch
            ? {
                backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.1) 100%), url(${gradientGif})`,
                backgroundSize: "cover, cover",
                backgroundPosition: "center, center",
                backgroundRepeat: "no-repeat, no-repeat",
                boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            inset 0 -1px 0 rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.1)
          `,
              }
            : {}
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Header bar */}
        <motion.div
          animate={{
            opacity: isNotch ? 0 : 1,
            y: isNotch ? -10 : 0,
          }}
          transition={{
            opacity: { duration: 0.2, ease: "easeOut" },
            y: { duration: 0.3, ease: "easeOut" },
          }}
          className={`flex items-center w-full h-[44px] shrink-0 ${
            !isPinned ? "drag" : ""
          } ${isNotch ? "pointer-events-none" : ""}`}
        >
          <OverlayButton
            className="!border-none"
            customBgColor="white"
            active={isActive}
            onClick={() => setIsActive(!isActive)}
          >
            <div
              className={`size-2 ${
                isActive ? "bg-green-500 animate-pulse" : "bg-gray-700"
              } rounded-full`}
            />
          </OverlayButton>

          <div className={`group ${!isPinned ? "drag" : ""} flex-1 h-full flex items-center w-full`}>
            {!showChat ? (
              inputActive ? (
                <div className={`flex w-full h-full items-center border-x border-gray-300 px-4 py-2 ${!isPinned ? "drag" : ""} bg-white shadow-sm max-w-xs`}>
                  <input
                    autoFocus
                    type="text"
                    className="no-drag text-sm font-medium text-zinc-800 border-none outline-none bg-transparent w-full placeholder:text-gray-500"
                    placeholder="Ask Quack anything..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onBlur={() => setInputActive(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendFromMainBar();
                    }}
                  />
                </div>
              ) : (
                <div
                  className={`flex w-full h-full items-center border-x border-gray-300 px-4 py-2 ${!isPinned ? "drag" : ""} bg-white shadow-sm max-w-xs cursor-text`}
                  onClick={() => setInputActive(true)}
                >
                  <span
                    className={`text-sm font-medium cursor-text z-50 ${
                      inputText ? "text-zinc-800" : "text-gray-500"
                    }`}
                  >
                    {inputText || "Ask Quack anything..."}
                  </span>
                </div>
              )
            ) : (
              <div className={`flex ${!isPinned ? "drag" : ""} items-center gap-2 px-4 py-2 text-sm text-gray-600`}>
                <span className="select-none font-medium">Listening to:</span>
                {windowIcon ? (
                  <img
                    src={windowIcon}
                    alt="App icon"
                    className="w-5 h-5 rounded-sm"
                  />
                ) : (
                  <div className="w-5 h-5 bg-gray-300 rounded-sm flex items-center justify-center">
                    ?
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center h-full ml-auto">
            {!showChat && inputText.trim().length > 0 && (
              <button
                className="no-drag h-full flex items-center gap-1 hover:bg-zinc-200 rounded p-2 text-sm border-r border-gray-300"
                onClick={handleSendFromMainBar}
              >
                Send
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
            {showChat ? (
              <OverlayButton onClick={handleCloseChatClick} title="Close chat">
                <X size={16} />
              </OverlayButton>
            ) : (
              <OverlayButton onClick={handleOpenChat} title="Open chat">
                <Maximize size={16} />
              </OverlayButton>
            )}
          </div>
        </motion.div>
        {/* Notch mode: the bar itself is the notch with animated status dot */}
        <AnimatePresence>
          {isNotch && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                delay: 0.3,
                type: "spring",
                stiffness: 500,
                damping: 25,
              }}
              className="absolute inset-0 flex items-center justify-start pl-5"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
              />
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0, 0.3, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute w-6 h-6 bg-green-400 rounded-full -ml-1.5"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showChat && (
            <ChatView
              onClose={handleCloseChatClick}
              initialMessage={initialChatMessage}
            />
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
};

export default DEV_MAGIC_DOT_ENABLED ? Overlay : () => null;
