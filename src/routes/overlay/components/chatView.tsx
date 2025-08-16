import { useEffect, useRef, useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import { Generate } from "@/api/chat";
import { motion } from "framer-motion";
import {
  X,
  Send,
  SquareArrowOutUpRight,
  Trash2,
  ChevronDown,
  Loader2,
  Minimize2,
  Maximize2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import CodeBlock from "@/components/misc/CodeBlock";
import { invoke } from "@tauri-apps/api/core";

const MODELS = [
  { label: "gemini", value: "gemini-2.5-flash" },
  { label: "GPT-4o", value: "gpt-4o" },
  { label: "GPT-3.5", value: "gpt-3.5" },
];

interface ChatViewProps {
  onClose: () => void;
  initialMessage?: string;
  windowName: string;
  smoothResize: (width: number, height: number) => void;
}

export const ChatView = ({
  onClose,
  initialMessage,
  smoothResize,
  windowName,
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

  // Chat-specific state
  const [chatInputText, setChatInputText] = useState("");
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isExpanded, setExpanded] = useState(false);
  const [titleLoading, setTitleLoading] = useState(false);

  // Refs for scrolling
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const handleAIResponse = async (userMsg: string) => {
    if (userMsg.trim() === "") return;

    const newMessages = [
      ...messages,
      { sender: "user" as const, text: userMsg },
    ];
    setMessages(newMessages);
    if (overlayConvoId === -1) setTitleLoading(true);
    console.log("Sending:", messages, "overlay convo id :", overlayConvoId);
    try {
      const ai_res = await Generate({
        email: email,
        message: userMsg,
        newConvo: overlayConvoId === -1,
        conversationId: overlayConvoId,
        provider: currentModel.label,
        modelName: currentModel.value,
        messageHistory: JSON.stringify(messages),
        notes: [""],
        agentId: 0,
        agentContext: "",
      });

      const updatedMessages = [
        ...newMessages,
        { sender: "ai" as const, text: ai_res.aiResponse },
      ];
      setMessages(updatedMessages);

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

  const handleNewChat = () => {
    setMessages([]);
    setOverlayChatTitle("New Chat");
    setOverlayConvoId(-1);
    setChatInputText("");
  };

  const handleSendMessage = () => {
    const userMsg = chatInputText.trim();
    if (!userMsg) return;
    setChatInputText("");
    handleAIResponse(userMsg);
  };

  const handleExpandChat = async () => {
    if (isExpanded) smoothResize(500, 480);
    if (!isExpanded) smoothResize(600, 580);
    setExpanded((prev) => !prev);
  };

  const getCurrentTime = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleInject = async () => {
    await invoke("inject_text_to_window_by_title", {
      text: "Great thats fucking fantastic wow ",
      windowTitle: windowName,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      ref={chatContainerRef}
      className="no-drag flex-1 flex flex-col overflow-hidden border-t border-border relative min-h-0"
    >
      <div className="flex-1 flex flex-col overflow-hidden text-foreground bg-background min-h-0">
        {/* Chat header */}
        <div className="h-[44px] border-b overflow-hidden border-b-border w-full flex">
          <div className="h-full w-full flex justify-between items-center p-2 tracking-tight font-medium">
            <div
              className="flex items-center gap-2 text-foreground"
              onClickCapture={handleInject}
            >
              {titleLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Generating title...</span>
                </>
              ) : (
                overlayChatTitle
              )}
            </div>
            <div className="text-zinc-600 text-sm font-light">
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
              {isExpanded == true ? (
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
          {messages.map((msg, idx) => (
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
                            code: ({ className, children, ...props }: any) => {
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
                          {msg.text || ""}
                        </ReactMarkdown>
                      );
                    } catch (error) {
                      console.error("Markdown render error:", error);
                      // Fallback: Simple line break preservation
                      return (
                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                      );
                    }
                  })()}
                </div>
              ) : (
                msg.text
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="h-[44px] focus-within:bg-foreground/10 text-foreground bg-background border-t border-border relative flex items-center shrink-0">
          <div className="relative h-full">
            <button
              type="button"
              className="shrink-0 w-[120px] whitespace-nowrap bg-background h-full border-r border-border px-4 text-sm gap-2 flex items-center justify-center font-medium text-gray-800 select-none hover:bg-gray-50"
              onClick={() => setDropdownOpen((v) => !v)}
            >
              {currentModel.label}
              <ChevronDown size={16} />
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 bottom-full z-10 mb-1 w-40 bg-background border border-border rounded shadow-lg">
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
            autoFocus
            onChange={(e) => setChatInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && chatInputText.trim())
                handleSendMessage();
            }}
            placeholder="Enter your message here"
            className="w-full px-4 h-full bg-transparent text-gray-800 placeholder:text-gray-500 text-sm outline-none pr-28"
          />
          <div className="h-full w-fit right-0 inset-y-0 flex items-center">
            <button
              onClick={handleSendMessage}
              className="h-full border-l hover:bg-foreground/10 border-border bg-background aspect-square shrink-0 flex items-center justify-center"
              disabled={!chatInputText.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
