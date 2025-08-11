import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { useChatStore } from "@/store/chatStore";

export default function ChatWindow() {
  const messages = useChatStore((s) => s.messages);
  const setMessages = useChatStore((s) => s.setMessages);
  const [chatInputText, setChatInputText] = useState("");
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Dummy AI response for demo
  const handleAIResponse = (userMsg: string) => {
    console.log("usermsg:", userMsg);
    if (userMsg.trim() == "") return;
    // Add user message
    const newMessages = [
      ...messages,
      {
        sender: "user" as const,
        text: userMsg,
      },
    ];
    setMessages(newMessages);

    // Add AI response after delay
    setTimeout(() => {
      setMessages([
        ...newMessages, // Use the updated messages array
        {
          sender: "ai" as const,
          text: "🤖 This is a dummy AI response for: " + userMsg,
        },
      ]);
    }, 800);
  };

  const handleSend = () => {
    const userMsg = chatInputText.trim();
    if (!userMsg) return;
    setChatInputText("");
    handleAIResponse(userMsg);
  };

  return (
    <div className="w-full h-[calc(100vh-36px)] flex flex-col bg-white">
      {/* Chat area */}
      <motion.div
        layout
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        ref={chatContainerRef}
        className="flex-1 flex flex-col overflow-y-auto border-t border-gray-200 relative min-h-0"
      >
        <div className="flex-1 flex flex-col overflow-y-auto p-2 space-y-1 scrollbar-hide">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`px-4 py-2 rounded-lg text-sm w-fit ${msg.sender === "user" ? "bg-zinc-900 text-white self-end text-right ml-auto" : "bg-zinc-200 self-start text-left"}`}
            >
              {msg.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="h-[44px]  focus-within:bg-zinc-200 bg-white border-t border-gray-200 relative flex items-center shrink-0">
          <input
            type="text"
            value={chatInputText}
            onChange={(e) => setChatInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && chatInputText.trim()) {
                handleSend();
              }
            }}
            placeholder="Enter your message here"
            className="w-full px-4 h-full bg-transparent text-gray-800 placeholder:text-gray-500 text-sm outline-none pr-28"
          />
          <div className="h-full w-fit right-0 inset-y-0 flex items-center gap-2">
            <button
              onClick={handleSend}
              className="h-full border-l hover:bg-zinc-300 border-gray-300 bg-white aspect-square shrink-0 flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
