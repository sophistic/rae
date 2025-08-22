import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  smoothResize,
  pinMagicDot,
  resize,
  refreshStyles,
} from "@/utils/windowUtils";
import { AnimatePresence, motion } from "framer-motion";
import { OverlayButton } from "./OverlayComponents";
import { ChatView } from "./chatView";
import { Pin, X, Mic, Maximize } from "lucide-react";
import gradientGif from "../../../assets/gradient.gif";
import { invoke } from "@tauri-apps/api/core";
import { animations } from "@/constants/animations";
import { useUserStore } from "@/store/userStore";
import { useNoteStore } from "@/store/noteStore";
import { GetNotes } from "@/api/notes";
const DEFAULT_CHAT = [480, 470];
const EXPANDED_CHAT = [600, 570];
// DEV FLAG: Set to false to disable MagicDot for development
const DEV_MAGIC_DOT_ENABLED = true;

const NOTCH_TIMEOUT = 5000;
const DISABLE_NOTCH_ON_SHOW = { current: false };
const DISABLE_PIN_ON_SHOW = { current: false };

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
  const inputActiveRef = useRef(inputActive);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const { email } = useUserStore();
  const { setNotes } = useNoteStore();
  const fetchNotes = async () => {
    try {
      const res = await GetNotes({ email });
      setNotes(res);
    } catch (err: any) {
      console.error("notes fetching me err agaya bhaijan", err);
    }
  };
  useEffect(() => {
    fetchNotes();
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    inputActiveRef.current = inputActive;
  }, [inputActive]);

  useEffect(() => {
    invoke("start_window_watch").catch(() => {});
    const unlistenPromise = listen<{ name?: string; icon?: string }>(
      "active_window_changed",
      (event) => {
        if (
          event.payload.name &&
          !event.payload.name.toLowerCase().includes("tauri")
        ) {
          setWindowName(event.payload.name);
          setWindowIcon(event.payload.icon ?? "");
        }
      },
    );
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const unlisten = listen(
      "gradient_changed",
      ({
        payload,
      }: {
        payload: {
          gradient: boolean;
        };
      }) => {
        setGradient(payload.gradient);
        //invoke("enable_mouse_events")
        // window.location.reload();
      },
    );

    return () => {
      unlisten.then((unlisten) => unlisten());
    };
  }, []);

  // Effect to handle resizing when chat is opened/closed
  useEffect(() => {
    if (showChat) {
      resize(500, 480);
    } else {
      resize(500, 60);
    }
  }, [showChat]);

  const [chatOpen, setChatOpen] = useState(false);
  // Effect for notch timeout
  useEffect(() => {
    // Clear any existing timeout
    if (notchTimeoutRef.current) {
      clearTimeout(notchTimeoutRef.current);
      notchTimeoutRef.current = null;
    }

    // If user starts typing, immediately clear notch
    if (inputActive && isNotch) {
      setIsNotch(false);
      return;
    }

    // Clear notch if not pinned
    if (!isPinned && isNotch) {
      setIsNotch(false);
      return;
    }

    // Only set notch timeout if pinned, not in chat, not already notch, not typing, and notch not disabled
    if (isPinned && !showChat && !isNotch && !inputActive && !DISABLE_NOTCH_ON_SHOW.current) {
      notchTimeoutRef.current = setTimeout(() => {
        // Double check that user isn't typing when timeout fires and notch not disabled
        if (!inputActiveRef.current && isPinned && !DISABLE_NOTCH_ON_SHOW.current) {
          // console.log("Enabling notch");
          invoke("enable_notch");
          setIsNotch(true);
        }
      }, NOTCH_TIMEOUT);
    }

    return () => {
      if (notchTimeoutRef.current) {
        clearTimeout(notchTimeoutRef.current);
        notchTimeoutRef.current = null;
      }
    };
  }, [isPinned, showChat, isNotch, inputActive]);

  const handleMouseEnter = () => {
    // // Always clear any pending timeouts
    // if (notchTimeoutRef.current) {
    //   clearTimeout(notchTimeoutRef.current);
    //   notchTimeoutRef.current = null;
    // }
    // // Clear notch if it's showing and we're pinned
    // if (isNotch && isPinned) {
    //   setIsNotch(false);
    // }
  };
  useEffect(() => {
    const unlisten = listen("notch-hover", () => {
      // Expand the notch when the event is received

      console.log("notch-hover", isNotch, isPinned);

      if (notchTimeoutRef.current) {
        clearTimeout(notchTimeoutRef.current);
        notchTimeoutRef.current = null;
      }

      setIsNotch(false);
    });
    return () => {
      unlisten.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const unlistenNotch = listen("disable_notch_on_show", () => {
      console.log("Disabling notch on show");
      DISABLE_NOTCH_ON_SHOW.current = true;
      setIsNotch(false);
      if (notchTimeoutRef.current) {
        clearTimeout(notchTimeoutRef.current);
        notchTimeoutRef.current = null;
      }
    });

    const unlistenPin = listen("disable_pin_on_show", () => {
      console.log("Disabling auto-pin on show");
      DISABLE_PIN_ON_SHOW.current = true;
      setIsPinned(false);
    });

    return () => {
      unlistenNotch.then((unlisten) => unlisten());
      unlistenPin.then((unlisten) => unlisten());
    };
  }, []);

  const handleMouseLeave = () => {
    // Only set timeout if conditions are met and notch not disabled
    if (isPinned && !showChat && !isNotch && !inputActive && !DISABLE_NOTCH_ON_SHOW.current) {
      // Clear any existing timeout first
      if (notchTimeoutRef.current) {
        clearTimeout(notchTimeoutRef.current);
      }

      notchTimeoutRef.current = setTimeout(() => {
        // Double check conditions when timeout fires and notch not disabled
        if (!inputActiveRef.current && isPinned && !showChat && !DISABLE_NOTCH_ON_SHOW.current) {
          // console.log("Enabling notch");
          invoke("enable_notch");
          setIsNotch(true);
        }
      }, NOTCH_TIMEOUT);
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
    setIsPinned((prev) => {
      if (prev == false) {
        pinMagicDot();
        // Reset the disable pin flag when user manually pins
        DISABLE_PIN_ON_SHOW.current = false;
      }
      const newPinned = !prev;
      if (!newPinned) {
        setIsNotch(false);
        console.log("Unpinned magic dot");
      } else {
        console.log("Pinning magic dot...");
      }
      if (notchTimeoutRef.current) {
        clearTimeout(notchTimeoutRef.current);
      }
      return newPinned;
    });
  };

  // *** MODIFIED: This function now just sets state to trigger the chat view ***
  const handleSendFromMainBar = () => {
    const userMsg = inputText.trim();
    if (!userMsg) return;
    setChatOpen(true);
    setShowChat(true);
    setInputText("");
    setInputActive(false);
    fetchNotes();
    setInitialChatMessage(userMsg);
  };

  const handleOpenChat = () => {
    setInitialChatMessage(undefined); // Ensure no old message is passed
    setShowChat(true);
    setChatOpen(true);
    setIsNotch(false);
    // Reset the disable notch flag when user manually opens chat
    DISABLE_NOTCH_ON_SHOW.current = false;
    if (notchTimeoutRef.current) clearTimeout(notchTimeoutRef.current);
  };

  const handleCloseChatClick = () => {
    setChatOpen(false);
    setTimeout(() => {
      setShowChat(false);
    }, animations.overlayChat * 1000);
  };

  const [expandedChat, setExpandedChat] = useState(false);

  const [gradient, setGradient] = useState(
    localStorage.getItem("gradient") === "true",
  );

  return (
    <div
      className={`w-full h-screen  flex z-[1000000]${
        isNotch ? "items-start " : "items-center"
      } justify-center ${isNotch ? "pt-2" : "p-2"} box-border`}
    >
      <motion.main
        animate={
          isNotch
            ? {
                scale: 0.6,
                y: -10,
                borderRadius: "0 0 28px 28px",
              }
            : {
                scale: 1,
                y: 0,
                borderRadius: "12px",
                width: expandedChat ? EXPANDED_CHAT[0] : DEFAULT_CHAT[0],
                height: expandedChat ? EXPANDED_CHAT[1] : DEFAULT_CHAT[1],
              }
        }
        transition={{
          type: "tween",
          duration: animations.overlayExpand,
          ease: "circOut",
        }}
        className={`${
          isNotch
            ? "w-[360px] h-24 -mt-2 dark:bg-black bg-white  border-border backdrop-blur-sm" // enhanced notch styling
            : ""
        } ${
          isNotch ? "" : " text-foreground"
        } flex flex-col overflow-hidden min-h-0`}
        style={
          isNotch
            ? {
                backgroundImage:
                  gradient == true &&
                  `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.1) 100%), url(${gradientGif})`,

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
            borderBottomLeftRadius: chatOpen ? "0" : "12px",
            borderBottomRightRadius: chatOpen ? "0" : "12px",
          }}
          transition={{
            opacity: { duration: 0.2, ease: "easeOut" },
            y: { duration: 0.3, ease: "easeOut" },
          }}
          className={`flex items-center z-[100000] ${
            showChat && "outline-border outline"
          } bg-background w-full h-[44px] shrink-0 ${!isPinned ? "drag" : ""} ${
            isNotch ? "pointer-events-none" : ""
          }`}
        >
          <OverlayButton
            className="!border-none hover:!bg-foreground/5 !aspect-auto !w-[40px] !rounded-l-[12px] hover:!rounded-l-[12px]"
            customBgColor="white"
            active={false}
            onClick={() => setIsActive(!isActive)}
            draggable={!isPinned}
          >
            <div className="relative flex items-center justify-center w-4 h-4">
              <motion.div
                animate={
                  isActive
                    ? {
                        // scale: [1, 1.2, 1],
                        opacity: [0.8, 1, 0.8],
                      }
                    : {
                        scale: 1,
                        opacity: 0.6,
                      }
                }
                transition={{
                  duration: 2,
                  repeat: isActive ? Infinity : 0,
                  ease: "easeInOut",
                }}
                className={`w-2 h-2 rounded-full shadow-md ${
                  isActive
                    ? "bg-green-400 shadow-green-400/50"
                    : "bg-gray-400 shadow-gray-400/30"
                }`}
              />
              {isActive && (
                <motion.div
                  animate={{
                    // scale: [1, 1.5, 1],
                    opacity: [0, 0.3, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute size-4 bg-green-400 rounded-full"
                />
              )}
            </div>
          </OverlayButton>

          <div
            className={`group ${
              !isPinned ? "drag" : ""
            } flex-1 h-full flex items-center w-full`}
          >
            {!showChat ? (
              inputActive ? (
                <div
                  className={`flex w-full h-full items-center border-l border-border px-4 py-2 ${
                    !isPinned ? "drag" : ""
                  } bg-background max-w-xs`}
                >
                  <input
                    autoFocus
                    type="text"
                    className="no-drag text-foreground/60 text-sm font-medium border-none outline-none bg-transparent w-full placeholder:text-foreground/50"
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
                  className={`flex w-full h-full items-center border-l border-border px-4 py-2 ${
                    !isPinned ? "drag" : ""
                  } bg-background max-w-xs cursor-text`}
                  onClick={() => {
                    setInputActive(true);
                    if (isNotch) setIsNotch(false);
                    // Reset the disable flags when user manually interacts
                    DISABLE_NOTCH_ON_SHOW.current = false;
                    DISABLE_PIN_ON_SHOW.current = false;
                    if (notchTimeoutRef.current)
                      clearTimeout(notchTimeoutRef.current);
                  }}
                >
                  <span
                    className={`text-sm font-medium cursor-text z-50 ${
                      inputText ? "text-foreground" : "text-gray-500"
                    }`}
                  >
                    {inputText || "Ask Quack anything..."}
                  </span>
                </div>
              )
            ) : (
              <div
                className={`flex ${
                  !isPinned ? "drag" : ""
                } items-center gap-2 px-4 h-full py-2 text-sm border-l border-border text-gray-600`}
              >
                <span className="select-none font-medium text-foreground/90">
                  Listening to:
                </span>
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
                className="no-drag h-full flex items-center gap-1 hover:bg-foreground/10  p-2 text-sm border-l border-border"
                onClick={handleSendFromMainBar}
              >
                Send
              </button>
            )}
            <OverlayButton
              onClick={() => {}}
              active={micOn}
              title="Voice"
              draggable={!isPinned}
            >
              <Mic size={16} />
            </OverlayButton>
            <OverlayButton
              onClick={handlePinClick}
              active={isPinned}
              title="Pin"
              draggable={!isPinned}
              className={isPinned ? "!text-[#ffe941] dark:!text-surface" : ""}
            >
              <Pin size={16} />
            </OverlayButton>
            {showChat ? (
              <OverlayButton
                onClick={handleCloseChatClick}
                title="Close chat"
                draggable={!isPinned}
              >
                <X size={16} />
              </OverlayButton>
            ) : (
              <OverlayButton
                onClick={handleOpenChat}
                title="Open chat"
                draggable={!isPinned}
              >
                <Maximize size={16} />
              </OverlayButton>
            )}
          </div>
        </motion.div>
        {/* Notch mode: the bar itself is the notch with animated status dot */}
        <AnimatePresence>
          {isNotch && (
            <motion.div
              initial={{ opacity: 0, scale: 1 }}
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
                animate={
                  isActive
                    ? {
                        scale: [1, 1.2, 1],
                        opacity: [0.8, 1, 0.8],
                      }
                    : {
                        scale: 1,
                        opacity: 0.6,
                      }
                }
                transition={{
                  duration: 2,
                  repeat: isActive ? Infinity : 0,
                  ease: "easeInOut",
                }}
                className={`size-3 rounded-full shadow-lg ${
                  isActive
                    ? "bg-green-400 shadow-green-400/50"
                    : "bg-gray-400 shadow-gray-400/30"
                }`}
              />
              {isActive && (
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
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="sync">
          {chatOpen && (
            <ChatView
              onClose={handleCloseChatClick}
              initialMessage={initialChatMessage}
              smoothResize={smoothResize}
              showChat={showChat}
              setShowChat={setShowChat}
              windowName={windowName}
              windowIcon={windowIcon}
              expandedChat={expandedChat}
              setExpandedChat={setExpandedChat}
            />
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
};

export default Overlay;
