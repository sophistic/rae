import { useEffect, useRef, useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import { Generate, GenerateWithWebSearch, GenerateWithSupermemory } from "@/api/chat";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  animate,
} from "framer-motion";
import {
  X,
  Send,
  SquareArrowOutUpRight,
  Trash2,
  ChevronDown,
  Loader2,
  Minimize2,
  Maximize2,
  ArrowRight,
  Globe,
  Brain,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import CodeBlock from "@/components/misc/CodeBlock";

import { animations } from "@/constants/animations";
import { invoke } from "@tauri-apps/api/core";
import { useNoteStore } from "@/store/noteStore";
import animatedUnscreenGif from "../../../assets/animated-gifs01-unscreen.gif";
const MODELS = [
  { label: "OpenAi", value: "gpt-4o-mini" },
  { label: "OpenAi", value: "gpt-4o" },
  { label: "gemini", value: "gemini-2.5-flash" },
];

// Animated blob background constants
const SPRING = { stiffness: 80, damping: 60, mass: 0.1 };
const RANGE_VW = 15; // Reduced range for chat view

interface ChatViewProps {
  onClose: () => void;
  initialMessage?: string;
  showChat?: boolean;
  setShowChat?: (show: boolean) => void;
  smoothResize: (width: number, height: number) => void;
  windowName: string;
  windowIcon: string;
  expandedChat?: boolean;
  setExpandedChat?: (expanded: boolean) => void;
  windowScreenshot?: string;
}

// Utility function for smooth window resizing with easing
const performSmoothResize = async (
  targetWidth: number,
  targetHeight: number,
  duration: number = 160,
) => {
  const win = getCurrentWebviewWindow();
  const currentSize = await win.innerSize();

  const startWidth = currentSize.width;
  const startHeight = currentSize.height;
  const startTime = performance.now();

  return new Promise<void>((resolve) => {
    const animate = async (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth acceleration/deceleration
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);

      const currentWidth = Math.round(
        startWidth + (targetWidth - startWidth) * easedProgress,
      );
      const currentHeight = Math.round(
        startHeight + (targetHeight - startHeight) * easedProgress,
      );

      await win.setSize(new LogicalSize(currentWidth, currentHeight));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure final size is exact
        await win.setSize(new LogicalSize(targetWidth, targetHeight));
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
};

export const ChatView = ({
  onClose,
  initialMessage,
  showChat,
  setShowChat,
  smoothResize,
  windowName,
  windowIcon,
  expandedChat,
  setExpandedChat,
  windowScreenshot,
}: ChatViewProps) => {
  const { email } = useUserStore();
  const {
    messages,
    setMessages,
    overlayChatTitle,
    setOverlayChatTitle,
    overlayConvoId,
    setOverlayConvoId,
  } = useChatStore();

  const { notes } = useNoteStore();

  // Chat-specific state

  const [chatInputText, setChatInputText] = useState("");
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  // const [expandedChat, setExpanded] = useState(false);
  const [titleLoading, setTitleLoading] = useState(false);
  const [currResponse, setCurrResponse] = useState<string>("");
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [typingText, setTypingText] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const [isInputTyping, setIsInputTyping] = useState(false);
  const [selectedTool, setSelectedTool] = useState<0 | 1 | 2>(0); // 0=none, 1=web search, 2=supermemory
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Animated blob background motion values
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const ix = useMotionValue(0);
  const iy = useMotionValue(0);

  const x = useSpring(tx, SPRING);
  const y = useSpring(ty, SPRING);
  const isx = useSpring(ix, SPRING);
  const isy = useSpring(iy, SPRING);

  const xNeg = useTransform(x, (v) => -v);
  const yNeg = useTransform(y, (v) => -v);
  const x06 = useTransform(x, (v) => v * 0.6);
  const y06 = useTransform(y, (v) => v * 0.6);

  const tBlob1 = useMotionTemplate`translate(${x}vw, ${y}vw)`;
  const tBlob2 = useMotionTemplate`translate(${xNeg}vw, ${yNeg}vw)`;
  const tBlob3 = useMotionTemplate`translate(${x06}vw, ${y06}vw)`;
  const idleBlob = useMotionTemplate`translate(${isx}vw, ${isy}vw)`;

  // Refs for scrolling
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const typingRef = useRef<{ animationId: number | null }>({
    animationId: null,
  });

  const handleAIResponse = async (userMsg: string, manualImage?: string) => {
    if (userMsg.trim() === "") return;

    // Stop any ongoing typing animation
    setIsTyping(false);
    setTypingText("");
    if (typingRef.current.animationId !== null) {
      cancelAnimationFrame(typingRef.current.animationId);
      typingRef.current.animationId = null;
    }

    const newMessages = [
      ...messages,
      { sender: "user" as const, text: userMsg },
    ];
    setMessages(newMessages);
    if (overlayConvoId === -1) setTitleLoading(true);

    // Set AI thinking state to true
    setIsAIThinking(true);

    console.log("Sending:", messages, "overlay convo id :", overlayConvoId);

    // Use manual image if provided, otherwise use window screenshot
    const imageToSend = manualImage || windowScreenshot || "";
    console.log(
      "Image to send:",
      imageToSend.length || 0,
      "characters",
      manualImage ? "(manual)" : "(window screenshot)",
    );

    try {
      const ai_res = await Generate({
        email: email,
        message: userMsg,
        newConvo: overlayConvoId === -1,
        conversationId: overlayConvoId,
        provider: currentModel.label,
        modelName: currentModel.value,
        image: imageToSend,
      });

      // Start typing animation instead of immediately showing the full response
      const updatedMessages = [
        ...newMessages,
        { sender: "ai" as const, text: ai_res.aiResponse },
      ];

      // Auto-expand chat when AI response is received (if not already expanded)
      if (!expandedChat && setExpandedChat) {
        await performSmoothResize(600, 570, 160);
        setExpandedChat(true);
      }

      setMessages(updatedMessages);
      setCurrResponse(ai_res.aiResponse);
      // Start typing animation
      setIsTyping(true);
      setTypingText("");

      if (overlayConvoId === -1) {
        setOverlayChatTitle(ai_res.title);
        setOverlayConvoId(ai_res.conversationId);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessages = [
        ...newMessages,
        { sender: "ai" as const, text: "Sorry, I encountered an error." },
      ];
      setMessages(errorMessages);
    } finally {
      setTitleLoading(false);
      // Always clear the thinking state
      setIsAIThinking(false);
    }
  };

  // Effect to handle the initial message passed from the overlay bar
  useEffect(() => {
    if (initialMessage) {
      handleAIResponse(initialMessage);
    }
  }, [initialMessage]);

  // Scroll to bottom when new messages appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingRef.current.animationId !== null) {
        cancelAnimationFrame(typingRef.current.animationId);
      }
    };
  }, []);

  // Typing animation effect
  useEffect(() => {
    if (isTyping && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === "ai") {
        const fullText = lastMessage.text;
        let currentIndex = 0;
        let lastTime = 0;
        const typingSpeed = 20; // 20ms per character for smooth typing for ai response

        // Cancel any existing animation
        if (typingRef.current.animationId !== null) {
          cancelAnimationFrame(typingRef.current.animationId);
        }

        const typeNextChar = (currentTime: number) => {
          if (!isTyping) return; // Stop if typing was cancelled

          if (currentTime - lastTime >= typingSpeed) {
            if (currentIndex < fullText.length) {
              setTypingText(fullText.slice(0, currentIndex + 1));
              currentIndex++;
              lastTime = currentTime;
            } else {
              // Typing complete
              setIsTyping(false);
              setTypingText("");
              typingRef.current.animationId = null;
              return;
            }
          }

          typingRef.current.animationId = requestAnimationFrame(typeNextChar);
        };

        typingRef.current.animationId = requestAnimationFrame(typeNextChar);
      }
    }

    return () => {
      // Cleanup on unmount or dependency change
      if (typingRef.current.animationId !== null) {
        cancelAnimationFrame(typingRef.current.animationId);
        typingRef.current.animationId = null;
      }
    };
  }, [isTyping, messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + / for focus on input
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        input?.focus();
      }
      // Escape to close dropdown
      if (e.key === 'Escape' && dropdownOpen) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen]);

  // Blob animation effects
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * RANGE_VW;
      const ny = (e.clientY / window.innerHeight - 0.5) * RANGE_VW;
      tx.set(nx);
      ty.set(ny);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [tx, ty]);

  // Idle blob animation
  useEffect(() => {
    const loop = () => {
      animate(ix, (Math.random() - 0.5) * RANGE_VW, {
        duration: 8,
        ease: "easeInOut",
        onComplete: loop,
      });
      animate(iy, (Math.random() - 0.5) * RANGE_VW, {
        duration: 10,
        ease: "easeInOut",
      });
    };
    loop();
  }, [ix, iy]);

  const handleNewChat = () => {
    setMessages([]);
    setOverlayChatTitle("New Chat");
    setOverlayConvoId(-1);
    setChatInputText("");
    setCurrResponse(""); // Clear the current response to hide the insert button
    setIsTyping(false); // Stop typing animation
    setTypingText("");
    setIsInputTyping(false); // Reset input typing state
    setSelectedTool(0); // Reset selected tool
    setAttachedImage(null); // Clear attached image
    setImagePreview(null); // Clear image preview
    if (typingRef.current.animationId !== null) {
      cancelAnimationFrame(typingRef.current.animationId);
      typingRef.current.animationId = null;
    }
  };

  // Handle image paste
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setAttachedImage(base64);
            setImagePreview(base64);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  // Clear attached image
  const clearImage = () => {
    setAttachedImage(null);
    setImagePreview(null);
  };

  // Handler for web search
  const handleWebSearch = async (userMsg: string, manualImage?: string) => {
    if (!userMsg.trim()) return;

    // Stop any ongoing typing animation
    setIsTyping(false);
    setTypingText("");
    if (typingRef.current.animationId !== null) {
      cancelAnimationFrame(typingRef.current.animationId);
      typingRef.current.animationId = null;
    }

    const newMessages = [
      ...messages,
      { sender: "user" as const, text: userMsg }, // Normal message without prefix
    ];
    setMessages(newMessages);
    if (overlayConvoId === -1) setTitleLoading(true);

    setIsAIThinking(true);

    // Use manual image if provided, otherwise use window screenshot
    const imageToSend = manualImage || windowScreenshot || "";

    try {
      const ai_res = await GenerateWithWebSearch({
        email: email,
        message: userMsg,
        newConvo: overlayConvoId === -1,
        conversationId: overlayConvoId,
        provider: currentModel.label,
        modelName: currentModel.value,
        image: imageToSend,
      });

      const updatedMessages = [
        ...newMessages,
        { sender: "ai" as const, text: ai_res.aiResponse },
      ];

      if (!expandedChat && setExpandedChat) {
        await performSmoothResize(600, 570, 160);
        setExpandedChat(true);
      }

      setMessages(updatedMessages);
      setCurrResponse(ai_res.aiResponse);
      setIsTyping(true);
      setTypingText("");

      if (overlayConvoId === -1) {
        setOverlayChatTitle(ai_res.title);
        setOverlayConvoId(ai_res.conversationId);
      }
    } catch (error) {
      console.error("Error getting web search response:", error);
      const errorMessages = [
        ...newMessages,
        { sender: "ai" as const, text: "Sorry, I encountered an error with web search." },
      ];
      setMessages(errorMessages);
    } finally {
      setTitleLoading(false);
      setIsAIThinking(false);
    }
  };

  // Handler for supermemory
  const handleSupermemory = async (userMsg: string, manualImage?: string) => {
    if (!userMsg.trim()) return;

    // Stop any ongoing typing animation
    setIsTyping(false);
    setTypingText("");
    if (typingRef.current.animationId !== null) {
      cancelAnimationFrame(typingRef.current.animationId);
      typingRef.current.animationId = null;
    }

    const newMessages = [
      ...messages,
      { sender: "user" as const, text: userMsg }, // Normal message without prefix
    ];
    setMessages(newMessages);
    if (overlayConvoId === -1) setTitleLoading(true);

    setIsAIThinking(true);

    // Use manual image if provided, otherwise use window screenshot
    const imageToSend = manualImage || windowScreenshot || "";

    try {
      const ai_res = await GenerateWithSupermemory({
        email: email,
        message: userMsg,
        newConvo: overlayConvoId === -1,
        conversationId: overlayConvoId,
        provider: currentModel.label,
        modelName: currentModel.value,
        image: imageToSend,
      });

      const updatedMessages = [
        ...newMessages,
        { sender: "ai" as const, text: ai_res.aiResponse },
      ];

      if (!expandedChat && setExpandedChat) {
        await performSmoothResize(600, 570, 160);
        setExpandedChat(true);
      }

      setMessages(updatedMessages);
      setCurrResponse(ai_res.aiResponse);
      setIsTyping(true);
      setTypingText("");

      if (overlayConvoId === -1) {
        setOverlayChatTitle(ai_res.title);
        setOverlayConvoId(ai_res.conversationId);
      }
    } catch (error) {
      console.error("Error getting supermemory response:", error);
      const errorMessages = [
        ...newMessages,
        { sender: "ai" as const, text: "Sorry, I encountered an error with memory search." },
      ];
      setMessages(errorMessages);
    } finally {
      setTitleLoading(false);
      setIsAIThinking(false);
    }
  };

  const handleSendMessage = () => {
    const userMsg = chatInputText.trim();
    if (!userMsg) return;

    setChatInputText("");
    setIsInputTyping(false);

    // Use selected tool if any
    if (selectedTool === 1) {
      handleWebSearch(userMsg, attachedImage || undefined);
    } else if (selectedTool === 2) {
      handleSupermemory(userMsg, attachedImage || undefined);
    } else {
      handleAIResponse(userMsg, attachedImage || undefined);
    }

    // Reset tool selection and image after sending
    setSelectedTool(0);
    setAttachedImage(null);
    setImagePreview(null);
  };

  const handleExpandChat = async () => {
    if (expandedChat) {
      // Collapsing - use delayed resize to match animation timing
      setTimeout(async () => {
        await performSmoothResize(480, 470, 200);
      }, animations.overlayExpand * 1000);
    } else {
      // Expanding - immediate resize
      await performSmoothResize(600, 570, 160);
    }
    setExpandedChat(!expandedChat);
  };

  const getCurrentTime = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleInject = async () => {
    await invoke("inject_text_to_window_by_title", {
      text: currResponse,
      windowTitle: windowName,
    });
  };

  return (
    <motion.div
      initial={{ y: "-100%" }}
      animate={{ y: "0%" }}
      exit={{ y: "-100%" }}
      transition={{ duration: animations.overlayChat, ease: "circInOut" }}
      ref={chatContainerRef}
      className="no-drag flex flex-col overflow-hidden border border-white/25 bg-gradient-to-br from-[#ff928c] to-white backdrop-blur-xl relative min-h-[400px] z-[1000] rounded-xl shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-title"
      aria-describedby="chat-messages"
    >
      {/* Animated blob background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
        {/* Idle Layer (always animating) */}
        <motion.div
          style={{ transform: idleBlob }}
          className="bg-black/15 size-[30vw] absolute rounded-full z-0 left-[20vw] top-[20vw] will-change-transform transform-gpu"
          aria-hidden
        />
        <motion.div
          style={{ transform: idleBlob }}
          className="bg-black/10 size-[25vw] absolute rounded-full z-0 right-[15vw] bottom-[15vw] will-change-transform transform-gpu"
          aria-hidden
        />

        {/* Interactive Layer (mouse-driven) */}
        <motion.div
          style={{ transform: tBlob1 }}
          className="bg-black/20 size-[20vw] absolute rounded-full z-[1] left-[25vw] bottom-[-10vw] will-change-transform transform-gpu"
          aria-hidden
        />
        <motion.div
          style={{ transform: tBlob2 }}
          className="bg-black/15 size-[25vw] absolute rounded-full z-0 left-[10vw] bottom-[-5vw] will-change-transform transform-gpu"
          aria-hidden
        />
        <motion.div
          style={{ transform: tBlob3 }}
          className="bg-black/10 size-[18vw] absolute rounded-full z-[1] right-[20vw] top-[10vw] will-change-transform transform-gpu"
          aria-hidden
        />
      </div>

      {/* Backdrop blur overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/3 to-transparent backdrop-blur-[60px] pointer-events-none rounded-xl z-[2]" />

      <div className="flex-1 flex flex-col overflow-hidden text-foreground bg-black/10 backdrop-blur-md min-h-[300px] relative transition-all duration-200 z-[10] border border-white/20 rounded-xl">
        {/* Chat header */}
        <header className="h-[44px] border-b overflow-hidden border-b-white/30 bg-black/15 backdrop-blur-lg w-full flex shadow-sm">
          <div className="h-full w-full flex justify-between items-center px-4 py-2 tracking-tight font-medium">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 text-foreground min-w-0 flex-1">
                {titleLoading ? (
                  <div className="flex items-center gap-2 min-w-0" aria-live="polite">
                    <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                    <span className="truncate" id="chat-title">Generating title...</span>
                  </div>
                ) : (
                  <h2 className="truncate flex-1" id="chat-title">{overlayChatTitle}</h2>
                )}
              </div>
              {/* Insert button next to chat title */}
              <AnimatePresence>
                {currResponse && currResponse.trim() && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95, y: 0 }}
                    transition={{
                      duration: 0.25,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    onClick={handleInject}
                    className="shrink-0 bg-gradient-to-br from-white/25 to-white/15 hover:from-white/35 hover:to-white/25 backdrop-blur-md border border-white/40 text-foreground px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg flex items-center gap-1.5 transition-all duration-300 group relative overflow-hidden"
                    title={`Insert text into ${windowName || "active window"}`}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg blur-[3px]"
                    />
                    <motion.div className="relative z-10 flex items-center gap-1.5">
                      {windowIcon ? (
                        <img
                          src={windowIcon}
                          alt="App icon"
                          className="w-4 h-4 rounded-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-4 h-4 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex-shrink-0 flex items-center justify-center text-xs text-white shadow-sm">
                          ?
                        </div>
                      )}
                      <span className="text-xs font-medium whitespace-nowrap">
                        Insert
                      </span>
                    </motion.div>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <time className="text-white/70 text-sm font-light shrink-0 ml-4 bg-black/15 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20" aria-label="Current time">
              {getCurrentTime()}
            </time>
          </div>
          <nav className="h-full flex ml-auto shrink-0" aria-label="Chat actions">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95, y: 0 }}
              className="border-l h-[44px] hover:bg-gradient-to-br from-[#ff928c]/35 to-[#ff6b6b]/35 border-white/30 bg-transparent backdrop-blur-md aspect-square shrink-0 flex items-center justify-center transition-all duration-300 text-white/70 hover:text-white group relative overflow-hidden"
              onClick={handleNewChat}
              aria-label="Start new chat"
              title="New Chat"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-[#ff928c]/20 to-[#ff6b6b]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg blur-[2px]"
              />
              <motion.div className="relative z-10">
                <Trash2 size={18} aria-hidden="true" />
              </motion.div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95, y: 0 }}
              className="border-l h-[44px] hover:bg-gradient-to-br from-[#ff928c]/35 to-[#ff6b6b]/35 border-white/30 bg-transparent backdrop-blur-md aspect-square shrink-0 flex items-center justify-center transition-all duration-300 text-white/70 hover:text-white group relative overflow-hidden"
              onClick={handleExpandChat}
              aria-label="Expand chat to full window"
              title="Open in main window"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-[#ff928c]/20 to-[#ff6b6b]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg blur-[2px]"
              />
              <motion.div className="relative z-10">
                {expandedChat == true ? (
                  <Minimize2 size={18} />
                ) : (
                  <Maximize2 size={18} />
                )}
              </motion.div>
            </motion.button>
          </nav>
        </header>

        {/* Messages area */}
        <main
          className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-hide relative flex flex-col bg-gradient-to-b from-transparent via-black/5 to-black/8"
          id="chat-messages"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {loadingMessages && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-lg z-10 rounded-xl"
              role="status"
              aria-label="Loading messages"
            >
              <Loader2 className="animate-spin text-white" size={24} aria-hidden="true" />
              <span className="sr-only">Loading messages...</span>
            </div>
          )}
          {messages.map((msg, idx) => {
            const isLastMessage = idx === messages.length - 1;
            const isTypingThisMessage =
              isTyping && msg.sender === "ai" && isLastMessage;
            const displayText = isTypingThisMessage ? typingText : msg.text;

            return (
              <div
                key={idx}
                className={`px-5 py-4 rounded-2xl text-sm backdrop-blur-sm border shadow-md ${
                  msg.sender === "user"
                    ? "bg-gradient-to-br from-[#ff928c]/80 to-[#ff6b6b]/80 text-white font-medium self-end text-right ml-auto w-fit max-w-[70%] border-white/30"
                    : "bg-black/25 dark:bg-black/30 text-white self-start text-left w-fit max-w-[450px] border-white/20"
                }`}
              >
                {msg.sender === "ai" ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:hidden prose-code:hidden">
                    {(() => {
                      try {
                        return (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={{
                              code: ({
                                className,
                                children,
                                ...props
                              }: any) => {
                                const inline = props.inline;
                                return (
                                  <CodeBlock
                                    className={className}
                                    inline={inline}
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, "")}
                                  </CodeBlock>
                                );
                              },
                            }}
                          >
                            {displayText || ""}
                          </ReactMarkdown>
                        );
                      } catch (error) {
                        console.error("Markdown render error:", error);
                        // Fallback: Simple line break preservation
                        return (
                          <div style={{ whiteSpace: "pre-wrap" }}>
                            {displayText}
                          </div>
                        );
                      }
                    })()}
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            );
          })}

          {/* AI Thinking Animation - Simple Pulsing Dot */}
          {isAIThinking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="self-start flex items-center justify-center"
            >
              <img
                src={animatedUnscreenGif}
                alt="AI thinking animation"
                className="w-10 h-10 object-cover"
              />
            </motion.div>
          )}

          <div ref={bottomRef} />
        </main>

        {/* Input area with overlay icons */}
        <section
          className="relative"
          aria-label="Message input"
          role="region"
        >
          {/* Typing Icons - appear when user is typing */}
          <AnimatePresence>
            {isInputTyping && chatInputText.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full right-4 mb-2 flex gap-2 z-10"
                role="toolbar"
                aria-label="Quick actions"
              >
                {/* Web Search Icon */}
                <motion.button
                  whileHover={{ scale: 1.15, y: -3 }}
                  whileTap={{ scale: 0.85, y: 1 }}
                  onClick={() => setSelectedTool(selectedTool === 1 ? 0 : 1)}
                  className={`rounded-full p-2.5 transition-all duration-300 flex items-center justify-center shadow-md backdrop-blur-md group relative overflow-hidden ${
                    selectedTool === 1
                      ? "bg-gradient-to-br from-blue-500/85 to-blue-600/85 ring-2 ring-blue-400/70 border-white/30"
                      : "bg-gradient-to-br from-blue-400/75 to-blue-500/75 hover:from-blue-500/80 hover:to-blue-600/80 border-white/20"
                  } text-white`}
                  title={selectedTool === 1 ? "Web search active - click to deactivate" : "Activate web search"}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-blue-300/30 to-blue-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full blur-[4px] scale-110"
                  />
                  <motion.div className="relative z-10">
                    <Globe size={16} />
                  </motion.div>
                </motion.button>

                {/* Supermemory Icon */}
                <motion.button
                  whileHover={{ scale: 1.15, y: -3 }}
                  whileTap={{ scale: 0.85, y: 1 }}
                  onClick={() => setSelectedTool(selectedTool === 2 ? 0 : 2)}
                  className={`rounded-full p-2.5 transition-all duration-300 flex items-center justify-center shadow-md backdrop-blur-md group relative overflow-hidden ${
                    selectedTool === 2
                      ? "bg-gradient-to-br from-purple-500/85 to-purple-600/85 ring-2 ring-purple-400/70 border-white/30"
                      : "bg-gradient-to-br from-purple-400/75 to-purple-500/75 hover:from-purple-500/80 hover:to-purple-600/80 border-white/20"
                  } text-white`}
                  title={selectedTool === 2 ? "Supermemory active - click to deactivate" : "Activate supermemory"}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-purple-300/30 to-purple-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full blur-[4px] scale-110"
                  />
                  <motion.div className="relative z-10">
                    <Brain size={16} />
                  </motion.div>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-[44px] focus-within:bg-black/25 text-foreground bg-black/20 backdrop-blur-lg border-t border-white/30 relative flex items-center shrink-0 shadow-md">
            <div className="relative h-full">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98, y: 0 }}
                type="button"
                className={`shrink-0 w-[120px] whitespace-nowrap bg-transparent hover:bg-gradient-to-br from-[#ff928c]/30 to-[#ff6b6b]/30 h-full border-r border-white/30 px-3 text-sm gap-2 flex items-center justify-center font-medium text-white select-none transition-all duration-300 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 group relative overflow-hidden ${dropdownOpen ? "bg-gradient-to-br from-[#ff928c]/35 to-[#ff6b6b]/35" : ""}`}
                onClick={() => setDropdownOpen((v) => !v)}
                aria-expanded={dropdownOpen}
                aria-haspopup="listbox"
                aria-label="Select AI model"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-[#ff928c]/20 to-[#ff6b6b]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg blur-[2px]"
                />
                <motion.div className="relative z-10 flex items-center gap-2">
                  <span>{currentModel.value}</span>
                  <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </motion.div>
              </motion.button>
              {dropdownOpen && (
                <div
                  className="absolute left-0 bottom-full z-10 mb-1 w-40 bg-black/30 backdrop-blur-lg border border-white/30 rounded-lg shadow-xl"
                  role="listbox"
                  aria-label="AI models"
                >
                  {MODELS.map((model, index) => (
                    <button
                      key={model.value}
                      className={`w-full text-left px-3 py-2.5 text-sm text-white transition-all duration-300 hover:bg-gradient-to-br from-[#ff928c]/30 to-[#ff6b6b]/30 focus:outline-none focus:bg-gradient-to-br from-[#ff928c]/30 to-[#ff6b6b]/30 rounded-lg mx-1 ${
                        model.value === currentModel.value
                          ? "font-bold bg-gradient-to-br from-[#ff928c]/35 to-[#ff6b6b]/35"
                          : ""
                      }`}
                      onClick={() => {
                        setCurrentModel(model);
                        setDropdownOpen(false);
                      }}
                      role="option"
                      aria-selected={model.value === currentModel.value}
                    >
                      {model.value}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative flex-1">
              <label htmlFor="chat-input" className="sr-only">
                {attachedImage ? "Describe what you want to know about this image" : "Enter your message"}
              </label>
              <input
                id="chat-input"
                type="text"
                value={chatInputText}
                autoFocus
                onChange={(e) => {
                  setChatInputText(e.target.value);
                  setIsInputTyping(e.target.value.length > 0);
                }}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && chatInputText.trim()) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={attachedImage ? "Describe what you want to know about this image..." : "Enter your message or paste a screenshot"}
                className="w-full px-3 h-full bg-transparent text-white placeholder:text-white/60 text-sm outline-none focus:outline-none focus:ring-0 pr-12"
                aria-describedby={attachedImage ? "image-attachment" : undefined}
                aria-invalid={false}
                maxLength={2000}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />

              {/* Image attachment indicator */}
              <AnimatePresence>
                {imagePreview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    <div className="relative group">
                      <img
                        src={imagePreview}
                        alt="Attached screenshot"
                        className="w-6 h-6 object-cover rounded-lg border-2 border-white/40 shadow-lg backdrop-blur-sm cursor-pointer"
                        title="Screenshot attached - Click to remove"
                        onClick={clearImage}
                        id="image-attachment"
                      />
                      <button
                        onClick={clearImage}
                        className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400 shadow-lg backdrop-blur-sm"
                        title="Remove image"
                        aria-label="Remove attached image"
                      >
                        ×
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="h-full w-fit right-0 inset-y-0 flex items-center">
              <motion.button
                whileHover={chatInputText.trim() ? { scale: 1.1, y: -2 } : {}}
                whileTap={chatInputText.trim() ? { scale: 0.9, y: 0 } : {}}
                onClick={handleSendMessage}
                className={`h-full border-l border-white/30 bg-transparent backdrop-blur-md aspect-square shrink-0 flex items-center justify-center transition-all duration-300 group relative overflow-hidden ${
                  chatInputText.trim()
                    ? "hover:bg-gradient-to-br from-[#ff928c]/45 to-[#ff6b6b]/45 text-white"
                    : "text-white/40 cursor-not-allowed"
                }`}
                disabled={!chatInputText.trim()}
                title="Send message"
                aria-label="Send message"
              >
                {chatInputText.trim() && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-[#ff928c]/30 to-[#ff6b6b]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg blur-[3px]"
                  />
                )}
                <motion.div className="relative z-10">
                  <Send size={18} aria-hidden="true" />
                </motion.div>
              </motion.button>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
};
