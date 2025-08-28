import { useEffect, useRef, useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import { Generate } from "@/api/chat";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import CodeBlock from "@/components/misc/CodeBlock";
import { resize } from "@/utils/windowUtils";
import { animations } from "@/constants/animations";
import { invoke } from "@tauri-apps/api/core";
import { useNoteStore } from "@/store/noteStore";
import animatedUnscreenGif from "../../../assets/animated-gifs01-unscreen.gif";
const MODELS = [
  { label: "OpenAi", value: "gpt-4o-mini" },
  { label: "OpenAi", value: "gpt-4.0" },
  { label: "gemini", value: "gemini-2.5-flash" },
];

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

  // Refs for scrolling
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const typingRef = useRef<{ animationId: number | null }>({
    animationId: null,
  });

  const handleAIResponse = async (userMsg: string) => {
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
    console.log("windowScreenshot in ChatView:", windowScreenshot?.length || 0, "characters");
    try {
      const lastFiveMessages = messages.slice(-10);
      const ai_res = await Generate({
        email: email,
        message: userMsg,
        newConvo: overlayConvoId === -1,
        conversationId: overlayConvoId,
        provider: currentModel.label,
        modelName: currentModel.value,
        messageHistory: JSON.stringify(lastFiveMessages),
        notes: notes,
        image: windowScreenshot,
      });

      // Start typing animation instead of immediately showing the full response
      const updatedMessages = [
        ...newMessages,
        { sender: "ai" as const, text: ai_res.aiResponse },
      ];
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

  const handleNewChat = () => {
    setMessages([]);
    setOverlayChatTitle("New Chat");
    setOverlayConvoId(-1);
    setChatInputText("");
    setCurrResponse(""); // Clear the current response to hide the insert button
    setIsTyping(false); // Stop typing animation
    setTypingText("");
    if (typingRef.current.animationId !== null) {
      cancelAnimationFrame(typingRef.current.animationId);
      typingRef.current.animationId = null;
    }
  };

  const handleSendMessage = () => {
    const userMsg = chatInputText.trim();
    if (!userMsg) return;
    setChatInputText("");
    handleAIResponse(userMsg);
  };

  const handleExpandChat = async () => {
    if (expandedChat) {
      setTimeout(() => {
        resize(500, 480);
      }, animations.overlayExpand * 1000);
    }
    if (!expandedChat) {
      resize(600, 580);
      // setExpandedChat(!expandedChat);
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
      className="no-drag  flex-1 flex flex-col overflow-hidden border-t border-border relative min-h-0 z-[1000] rounded-b-xl"
    >
      <div className="flex-1 flex flex-col overflow-hidden text-foreground bg-background min-h-0 relative transition-all duration-200">
        {/* Chat header */}
        <div className="h-[44px] border-b overflow-hidden border-b-border w-full flex">
          <div className="h-full w-full flex justify-between items-center p-2 tracking-tight font-medium">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 text-foreground min-w-0 flex-1">
                {titleLoading ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <Loader2 className="animate-spin" size={16} />
                    <span className="truncate">Generating title...</span>
                  </div>
                ) : (
                  <span className="truncate flex-1">{overlayChatTitle}</span>
                )}
              </div>
              {/* Insert button next to chat title */}
              <AnimatePresence>
                {currResponse && currResponse.trim() && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{
                      duration: 0.25,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    onClick={handleInject}
                    className="shrink-0 bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/15 backdrop-blur-sm border border-white/40 dark:border-white/20 text-foreground px-2 py-1 rounded-md shadow-sm hover:shadow-md flex items-center gap-1 transition-all duration-200"
                    title={`Insert text into ${windowName || "active window"}`}
                  >
                    {windowIcon ? (
                      <img
                        src={windowIcon}
                        alt="App icon"
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-4 h-4 bg-gray-300 rounded-sm flex-shrink-0 flex items-center justify-center text-xs">
                        ?
                      </div>
                    )}
                    <span className="text-xs font-medium whitespace-nowrap">Insert</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <div className="text-zinc-600 text-sm font-light shrink-0 ml-2">
              {getCurrentTime()}
            </div>
          </div>
          <div className="h-full flex ml-auto shrink-0">
            <button
              className="border-l h-[44px] hover:bg-foreground/10 border-border bg-background aspect-square shrink-0 flex items-center justify-center"
              onClick={handleNewChat}
              title="New Chat"
            >
              <Trash2 size={18} />
            </button>
            <button
              className="border-l h-[44px] hover:bg-foreground/10 border-border bg-background aspect-square shrink-0 flex items-center justify-center"
              onClick={handleExpandChat}
              title="Open in main window"
            >
              {expandedChat == true ? (
                <Minimize2 size={18} />
              ) : (
                <Maximize2 size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide relative flex flex-col">
          {loadingMessages && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
              <Loader2 className="animate-spin text-zinc-700" size={24} />
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
                className={`px-4 py-2 rounded-lg text-sm ${
                  msg.sender === "user"
                    ? "bg-foreground dark:bg-surface font-medium text-background self-end text-right ml-auto w-fit max-w-[70%]"
                    : "bg-zinc-200 dark:bg-[#333333] dark:text-white  self-start text-left w-fit max-w-[450px]"
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
        </div>

        {/* Input area */}
        <div className="h-[44px] focus-within:bg-foreground/10 text-foreground bg-background border-t border-border relative flex items-center shrink-0">
          <div className="relative h-full">
            <button
              type="button"
              className={`shrink-0 w-[120px] whitespace-nowrap bg-background h-full border-r border-border px-4 text-sm gap-2 flex items-center justify-center font-medium text-foreground select-none transition-colors hover:bg-foreground/10 ${dropdownOpen ? "bg-foreground/10" : ""}`}
              onClick={() => setDropdownOpen((v) => !v)}
            >
              {currentModel.value}
              <ChevronDown size={16} />
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 bottom-full z-10 mb-1 w-40 bg-background border border-border rounded shadow-lg">
                {MODELS.map((model) => (
                  <button
                    key={model.value}
                    className={`w-full text-left px-4 py-2 text-sm text-foreground transition-colors hover:bg-foreground/10 ${
                      model.value === currentModel.value
                        ? "font-bold bg-foreground/10"
                        : ""
                    }`}
                    onClick={() => {
                      setCurrentModel(model);
                      setDropdownOpen(false);
                    }}
                  >
                    {model.value}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            value={chatInputText}
            autoFocus
            onChange={(e) => setChatInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && chatInputText.trim())
                handleSendMessage();
            }}
            placeholder="Enter your message here"
            className="w-full px-4 h-full bg-transparent text-foreground placeholder:text-foreground/50 text-sm outline-none pr-12"
          />
          <div className="h-full w-fit right-0 inset-y-0 flex items-center">
            <button
              onClick={handleSendMessage}
              className="h-full border-l hover:bg-foreground/10 border-border bg-background aspect-square shrink-0 flex items-center justify-center"
              disabled={!chatInputText.trim()}
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
