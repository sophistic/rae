import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { easeInOut, motion } from "framer-motion";
import { Mic, Send, Pencil } from "lucide-react";
import enhancedLogo from "../../assets/enhanced_logo.png";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [visible, setVisible] = useState(true);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: 1024,
    h: 768,
  });
  const [inputText, setInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAdjustingBg, setIsAdjustingBg] = useState(false);
  const [bgPercent, setBgPercent] = useState<{ x: number; y: number }>({
    x: 50,
    y: 50,
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<
    | null
    | {
        startX: number;
        startY: number;
        startPercentX: number;
        startPercentY: number;
      }
  >(null);

  // AI Analysis Function (dummy for now)
  const handleAIResponse = (userMessage: string) => {
    console.log("AI analyzing:", userMessage);
    // Simulate AI delay
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
    // Show the chat immediately upon mount to avoid race with first message
    setVisible(true);
    invoke("stick_chat_to_dot").catch(console.error);
    const unlisten = listen<ChatMessage>("new_message", (event) => {
      const newMsg = event.payload;
      setMessages((prev) => [...prev, newMsg]);

      if (newMsg.sender === "user") {
        handleAIResponse(newMsg.text);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
    };
  }, [backgroundUrl]);

  const handleBackgroundSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBackgroundUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setBgPercent({ x: 50, y: 50 });
    setIsAdjustingBg(true);
    // reset input so selecting the same file again triggers onChange
    e.currentTarget.value = "";
  };

  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!visible) return null;

  // Dynamic height: grows with messages but caps at 500px
  const dynamicHeight = Math.min(360 + messages.length * 40, 500);

  return (
    <div className="w-full h-full bg-transparent flex items-center justify-center">
      <motion.div
        ref={containerRef}
        layout
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          width: Math.min(780, Math.floor(viewport.w * 0.95)),
          height: dynamicHeight,
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`${backgroundUrl ? "bg-white/10" : "bg-white/70"} ${
          backgroundUrl && isAdjustingBg ? "cursor-move" : ""
        } backdrop-blur-md rounded-xl shadow-2xl border border-white/70 overflow-hidden flex flex-col relative`}
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
        }}
        onMouseMove={(e) => {
          if (!dragStateRef.current || !containerRef.current) return;
          const { startX, startY, startPercentX, startPercentY } =
            dragStateRef.current;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          const w = containerRef.current.clientWidth || 1;
          const h = containerRef.current.clientHeight || 1;
          const nextX = Math.max(0, Math.min(100, startPercentX - (dx / w) * 100));
          const nextY = Math.max(0, Math.min(100, startPercentY - (dy / h) * 100));
          setBgPercent({ x: nextX, y: nextY });
        }}
        onMouseUp={() => {
          dragStateRef.current = null;
        }}
        onMouseLeave={() => {
          dragStateRef.current = null;
        }}
      >
        {/* Header */}
        <div className="drag flex items-center justify-between px-4 py-2 bg-white/50 backdrop-blur-md border-b border-white/60">
          <div className="flex items-center gap-2 min-w-0 select-none">
            <img
              src={enhancedLogo}
              alt="Quack"
              className="h-5 w-auto rounded-sm shadow-sm"
              draggable={false}
            />
            <span className="text-gray-900 text-sm font-semibold tracking-wide">
              Quack
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white/30 backdrop-blur-md">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 scrollbar-hide">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: easeInOut }}
                className={`px-4 py-2 rounded-lg text-sm max-w-[80%] ${
                  msg.sender === "user"
                    ? "bg-blue-100 self-end text-right ml-auto"
                    : "bg-green-100 self-start text-left"
                }`}
              >
                {msg.text}
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input Bar */}
          <div className="px-4 py-3 bg-white border-t border-gray-200 relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputText.trim()) {
                  const userMsg = inputText.trim();
                  setMessages((prev) => [
                    ...prev,
                    { sender: "user", text: userMsg },
                  ]);
                  setInputText("");
                  handleAIResponse(userMsg);
                }
              }}
              placeholder="Ask Quack anything .."
              className="w-full bg-transparent text-gray-800 placeholder:text-gray-500 text-sm outline-none pr-28"
            />

            <div className="absolute right-4 inset-y-0 flex items-center gap-2">
              {inputText.trim().length > 0 && (
                <button
                  onClick={() => {
                    const userMsg = inputText.trim();
                    setMessages((prev) => [
                      ...prev,
                      { sender: "user", text: userMsg },
                    ]);
                    setInputText("");
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
              {/* Personalise button and hidden file input */}
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
    </div>
  );
}
