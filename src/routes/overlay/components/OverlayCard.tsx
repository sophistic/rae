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
import { Pin, X, Mic, Maximize, Palette } from "lucide-react";
import notchSound from "../../../assets/sounds/bubble-pop-06-351337.mp3";
import gradientGif from "../../../assets/gradient.gif";
import { invoke } from "@tauri-apps/api/core";
import { animations } from "@/constants/animations";
import { useUserStore } from "@/store/userStore";
import { useNoteStore } from "@/store/noteStore";
import { GetNotes } from "@/api/notes";
const DEFAULT_CHAT = [480, 470];
const EXPANDED_CHAT = [600, 570];
const NOTCH_TIMEOUT = 2000;

// Constants for notch styling
const NOTCH_SHADOW = `
  0 8px 32px rgba(0, 0, 0, 0.3),
  inset 0 1px 0 rgba(255, 255, 255, 0.2),
  inset 0 -1px 0 rgba(0, 0, 0, 0.1),
  0 0 0 1px rgba(255, 255, 255, 0.1)
`;

const GRADIENT_OPACITY = "";

// Function to play notch collapse sound with sync with notch animation
const playNotchSound = () => {
  try {
    const audio = new Audio(notchSound);
    audio.volume = 0.3; // Set volume to 30%
    audio.play().catch((err) => console.log("Sound play failed:", err));
  } catch (error) {
    console.log("Audio playback error:", error);
  }
};

// DEV FLAG: Set to false to disable MagicDot for development
const DEV_MAGIC_DOT_ENABLED = true;

// Refs for global state
const DISABLE_NOTCH_ON_SHOW = { current: false };
const DISABLE_PIN_ON_SHOW = { current: false };

/**
 * Helper functions for notch styling and layout
 */
const getNotchClasses = (isNotch: boolean, showGradient: boolean) => {
  const baseClasses = "flex flex-col overflow-hidden min-h-0";

  if (!isNotch) return `${baseClasses} text-foreground`;

  const notchClasses = "w-[360px] h-24 -mt-2 border-border backdrop-blur-sm relative";
  const backgroundClasses = showGradient
    ? "bg-white/80 dark:bg-black/80"
    : "dark:bg-black bg-white";

  return `${baseClasses} ${notchClasses} ${backgroundClasses}`;
};

const getNotchStyle = (isNotch: boolean) =>
  isNotch ? { boxShadow: NOTCH_SHADOW } : {};

const getGradientBackgroundStyle = (gradientGif: string) => ({
  backgroundImage: `url(${gradientGif})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
});

const Overlay = () => {
  // State for the overlay shell itself
  const [isPinned, setIsPinned] = useState(false);
  const [inputText, setInputText] = useState(""); // For the main input bar
  const [micOn, setMicOn] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [windowName, setWindowName] = useState("");
  const [windowIcon, setWindowIcon] = useState("");
  const [windowHwnd, setWindowHwnd] = useState<number | null>(null);
  const [isNotch, setIsNotch] = useState(false);
  const [inputActive, setInputActive] = useState(false);
  const [showGradient, setShowGradient] = useState<boolean>(
    localStorage.getItem("gradient") === "true"
  );

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
    const unlistenPromise = listen<{
      name?: string;
      icon?: string;
      hwnd?: number;
    }>("active_window_changed", (event) => {
      if (
        event.payload.name &&
        !event.payload.name.toLowerCase().includes("tauri")
      ) {
        setWindowName(event.payload.name);
        setWindowIcon(event.payload.icon ?? "");
        if (typeof event.payload.hwnd === "number") {
          setWindowHwnd(event.payload.hwnd);
        }
      }
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
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
  const [notchWindowDisplayEnabled, setNotchWindowDisplayEnabled] = useState(true);

  // Load window display preference on mount
  useEffect(() => {
    invoke<boolean>("get_notch_window_display_enabled")
      .then((v) => setNotchWindowDisplayEnabled(!!v))
      .catch(() => {});
  }, []);

  // Listen for preference changes from settings
  useEffect(() => {
    const unlisten = listen("notch_window_display_changed", (event) => {
      const enabled = event.payload as boolean;
      setNotchWindowDisplayEnabled(enabled);
    });
    return () => {
      unlisten.then((unlisten) => unlisten());
    };
  }, []);

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
    if (
      isPinned &&
      !showChat &&
      !isNotch &&
      !inputActive &&
      !DISABLE_NOTCH_ON_SHOW.current
    ) {
      console.log("Setting notch timeout:", NOTCH_TIMEOUT, "ms");
      notchTimeoutRef.current = setTimeout(() => {
        // Double check that user isn't typing when timeout fires and notch not disabled
        if (
          !inputActiveRef.current &&
          isPinned &&
          !DISABLE_NOTCH_ON_SHOW.current
        ) {
          console.log("Enabling notch - all conditions met");
          invoke("enable_notch")
            .then(() => {
              console.log("Notch enabled successfully");
              setIsNotch(true);
              // Play sound with perfect timing - synced with smooth resize animation (200ms total, play at 100ms)
              setTimeout(() => playNotchSound(), 60);
            })
            .catch((error) => {
              console.error("Failed to enable notch:", error);
            });
        } else {
          console.log("Notch conditions not met at timeout:", {
            inputActive: inputActiveRef.current,
            isPinned,
            disableNotch: DISABLE_NOTCH_ON_SHOW.current,
          });
        }
      }, NOTCH_TIMEOUT);
    } else {
      console.log("Not setting notch timeout - conditions not met:", {
        isPinned,
        showChat,
        isNotch,
        inputActive,
        disableNotch: DISABLE_NOTCH_ON_SHOW.current,
      });
    }

    // Safety mechanism: If we're pinned and conditions are mostly met but notch is disabled,
    // try to enable it after a shorter delay
    if (
      isPinned &&
      !showChat &&
      !inputActive &&
      DISABLE_NOTCH_ON_SHOW.current
    ) {
      console.log(
        "Safety: Setting fallback notch timeout (10s) due to disabled flag"
      );
      setTimeout(() => {
        if (isPinned && !showChat && !inputActive) {
          console.log("Safety: Attempting to enable notch");
          DISABLE_NOTCH_ON_SHOW.current = false; // Reset the flag
          invoke("enable_notch")
            .then(() => {
              console.log("Safety: Notch enabled via fallback");
              setIsNotch(true);
              setTimeout(() => playNotchSound(), 60);
            })
            .catch((error) => {
              console.error("Safety: Failed to enable notch:", error);
            });
        }
      }, 10000); // 10 second fallback
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

  // Setup event listeners for overlay controls
  useEffect(() => {
    const eventListeners = [
      listen("disable_notch_on_show", () => {
        console.log("Disabling notch on show");
        DISABLE_NOTCH_ON_SHOW.current = true;
        setIsNotch(false);
        if (notchTimeoutRef.current) {
          clearTimeout(notchTimeoutRef.current);
          notchTimeoutRef.current = null;
        }
      }),

      listen("disable_pin_on_show", () => {
        console.log("Disabling auto-pin on show");
        DISABLE_PIN_ON_SHOW.current = true;
        setIsPinned(false);
      }),

      listen("gradient_changed", (event) => {
        console.log("OverlayCard: gradient_changed event received:", event.payload);
        const gradient = event.payload as { gradient: boolean };
        console.log("OverlayCard: Setting showGradient to:", gradient.gradient);
        setShowGradient(gradient.gradient);
      })
    ];

    return () => {
      eventListeners.forEach(promise => promise.then(unlisten => unlisten()));
    };
  }, []);

  // Debug keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        const debugInfo = {
          isPinned,
          showChat,
          isNotch,
          inputActive,
          showGradient,
          disableNotch: DISABLE_NOTCH_ON_SHOW.current,
          timeoutActive: !!notchTimeoutRef.current,
          NOTCH_TIMEOUT
        };

        console.log("=== NOTCH DEBUG INFO ===");
        console.table(debugInfo);
        console.log("========================");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPinned, showChat, isNotch, inputActive, showGradient]);

  const handleMouseLeave = () => {
    // Only set timeout if conditions are met and notch not disabled
    if (
      isPinned &&
      !showChat &&
      !isNotch &&
      !inputActive &&
      !DISABLE_NOTCH_ON_SHOW.current
    ) {
      console.log("Mouse leave: Setting notch timeout");
      // Clear any existing timeout first
      if (notchTimeoutRef.current) {
        clearTimeout(notchTimeoutRef.current);
      }

      notchTimeoutRef.current = setTimeout(() => {
        // Double check conditions when timeout fires and notch not disabled
        if (
          !inputActiveRef.current &&
          isPinned &&
          !showChat &&
          !DISABLE_NOTCH_ON_SHOW.current
        ) {
          console.log("Mouse leave: Enabling notch - all conditions met");
          invoke("enable_notch")
            .then(() => {
              console.log("Mouse leave: Notch enabled successfully");
              setIsNotch(true);
              // Play sound with perfect timing - synced with smooth resize animation (200ms total, play at 100ms)
              setTimeout(() => playNotchSound(), 60);
            })
            .catch((error) => {
              console.error("Mouse leave: Failed to enable notch:", error);
            });
        } else {
          console.log("Mouse leave: Notch conditions not met at timeout:", {
            inputActive: inputActiveRef.current,
            isPinned,
            showChat,
            disableNotch: DISABLE_NOTCH_ON_SHOW.current,
          });
        }
      }, NOTCH_TIMEOUT);
    } else {
      console.log(
        "Mouse leave: Not setting notch timeout - conditions not met:",
        {
          isPinned,
          showChat,
          isNotch,
          inputActive,
          disableNotch: DISABLE_NOTCH_ON_SHOW.current,
        }
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
  const [windowScreenshot, setWindowScreenshot] = useState<string>("");
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [isHoveringScreenshot, setIsHoveringScreenshot] = useState(false);
  const [isHoveringTrigger, setIsHoveringTrigger] = useState(false);
  const screenshotHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debug: Log state changes
  useEffect(() => {
    console.log(
      "Screenshot state changed - showScreenshot:",
      showScreenshot,
      "screenshot length:",
      windowScreenshot.length
    );
  }, [showScreenshot, windowScreenshot]);

  // Manage screenshot visibility based on hover states
  useEffect(() => {
    const isAnyHovering = isHoveringTrigger || isHoveringScreenshot;

    if (isAnyHovering) {
      cancelScreenshotHide();
      if (!showScreenshot && windowScreenshot) {
        setShowScreenshot(true);
      }
    } else {
      scheduleScreenshotHide();
    }
  }, [isHoveringTrigger, isHoveringScreenshot, showScreenshot, windowScreenshot]);

  // Cleanup screenshot on unmount or when window changes
  useEffect(() => {
    return () => {
      if (screenshotHideTimeoutRef.current) {
        clearTimeout(screenshotHideTimeoutRef.current);
      }
      hideScreenshot();
    };
  }, []);

  // Clear screenshot when window changes
  useEffect(() => {
    hideScreenshot();
  }, [windowName, windowIcon, windowHwnd]);

  const cancelScreenshotHide = () => {
    if (screenshotHideTimeoutRef.current) {
      clearTimeout(screenshotHideTimeoutRef.current);
      screenshotHideTimeoutRef.current = null;
    }
  };

  const hideScreenshot = () => {
    setShowScreenshot(false);
    setWindowScreenshot("");
  };

  const scheduleScreenshotHide = () => {
    cancelScreenshotHide(); // Clear any existing timeout first
    screenshotHideTimeoutRef.current = setTimeout(() => {
      hideScreenshot();
      screenshotHideTimeoutRef.current = null;
    }, 200); // Reduced delay for better responsiveness
  };

  const handleScreenshotHover = async () => {
    console.log("Hover triggered - capturing screenshot...");
    setIsHoveringTrigger(true);

    try {
      if (windowHwnd == null) return;
      const screenshot = (await invoke("capture_window_screenshot_by_hwnd", {
        hwnd: windowHwnd,
      })) as string;
      console.log("Screenshot received, length:", screenshot.length);
      setWindowScreenshot(screenshot);
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
    }
  };

  const handleScreenshotLeave = () => {
    console.log("Left trigger area");
    setIsHoveringTrigger(false);
  };

  const handleTooltipHover = () => {
    console.log("Hovering over tooltip");
    setIsHoveringScreenshot(true);
  };

  const handleTooltipLeave = () => {
    console.log("Left tooltip area");
    setIsHoveringScreenshot(false);
  };

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
        className={getNotchClasses(isNotch, showGradient)}
        style={getNotchStyle(isNotch)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Gradient background overlay */}
        {isNotch && showGradient && (
          <div
            className={`absolute inset-0 ${GRADIENT_OPACITY} pointer-events-none`}
            style={getGradientBackgroundStyle(gradientGif)}
          />
        )}

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
                } items-center gap-2 px-4 h-full py-2 text-sm border-l border-border text-gray-600 relative`}
                onMouseEnter={handleScreenshotHover}
                onMouseLeave={handleScreenshotLeave}
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

                {/* Screenshot tooltip */}
                {showScreenshot && windowScreenshot && (
                  <div
                    className="absolute top-full left-0 mt-2 z-[1000001] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-1 animate-in fade-in-0 zoom-in-95 duration-200"
                    onMouseEnter={handleTooltipHover}
                    onMouseLeave={handleTooltipLeave}
                  >
                    <img
                      src={windowScreenshot}
                      alt="Window screenshot"
                      className="min-w-[250px] max-h-[350px] rounded shadow-md"
                      onLoad={() => console.log("✅ Image loaded successfully")}
                      onError={(e) =>
                        console.error("❌ Image failed to load:", e)
                      }
                      style={{ imageRendering: "crisp-edges" }}
                    />
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
        {/* Notch mode: the bar itself is the notch with animated status dot which will play notch collapse sound with sync with notch animation */}
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
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="flex items-center absolute left-4">
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
              </div>

              {/* App information in notch */}
              {windowName && notchWindowDisplayEnabled && (
                <div className="flex items-center gap-4 ml-4 text-white/95">
                  {windowIcon ? (
                    <img
                      src={windowIcon}
                      alt="App icon"
                      className="w-8 h-8 rounded-sm"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-white/20 rounded-sm flex items-center justify-center">
                      <span className="text-xl text-white/60">?</span>
                    </div>
                  )}
                  <span className="text-xl font-bold max-w-[200px] truncate">
                    {windowName}
                  </span>
                </div>
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
              windowScreenshot={windowScreenshot}
            />
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
};

export default Overlay;
