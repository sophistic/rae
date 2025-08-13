import { useEffect, useRef, useState } from "react";
import ChatHistoryTab from "@/components/ChatHistoryTab";
import { motion } from "framer-motion";
import { ChevronDown, Send, Plus } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { handleAiResponse } from "@/utils/handleAiResponse";
const MODELS = [
  { label: "Gemini 2.5", value: "gemini-2.5" },
  { label: "Gemini 1.5", value: "gemini-1.5" },
  { label: "GPT-4o", value: "gpt-4o" },
  { label: "GPT-3.5", value: "gpt-3.5" },
];

export default function ChatWindow() {
  const {
    messages,
    setMessages,
    convoHistory,
    addNewConvo,
    setCurrentConvo,
    currentConvoId,
  } = useChatStore();
  const [chatInputText, setChatInputText] = useState("");
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAIResponse = (userMsg: string) => {
    console.log("usermsg:", userMsg);
    if (userMsg.trim() === "") return;
    handleAiResponse({
      message: userMsg,
      provider: "gemini",
      modelName: "flash-2.0-live",
      conversationId: currentConvoId,
    });
  };

  const handleSend = () => {
    const userMsg = chatInputText.trim();
    if (!userMsg) return;
    setChatInputText("");
    handleAIResponse(userMsg);
  };

  return (
    <div className="w-full h-[calc(100vh-36px)] flex bg-white">
      {/* Sidebar - Chat history */}
      <div className="w-[200px] shrink-0 h-full flex flex-col gap-1 p-2 border-r border-gray-200">
        <button
          onClick={() => addNewConvo()}
          className="flex items-center justify-center gap-2 px-3 py-2 mb-2 bg-zinc-900 text-white rounded hover:bg-zinc-800 text-sm"
        >
          <Plus size={16} /> New Chat
        </button>

        {convoHistory.length === 0 ? (
          <div className="text-gray-500 text-sm text-center mt-4">
            No conversations yet
          </div>
        ) : (
          convoHistory.map((convo) => (
            <ChatHistoryTab
              key={convo.id}
              message={convo.title}
              active={currentConvoId === convo.id}
              onClick={() => setCurrentConvo(convo.id)}
            />
          ))
        )}
      </div>

      {/* Chat Area */}
      <div className="flex flex-col w-full">
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

          {/* Input area */}
          <div className="h-[44px] focus-within:bg-zinc-200 bg-white border-t border-gray-200 relative flex items-center shrink-0">
            <div className="relative h-full">
              <button
                type="button"
                className="shrink-0 w-[120px] whitespace-nowrap bg-white h-full border-r border-gray-300 px-4 text-sm gap-2 flex items-center justify-center font-medium text-gray-800 select-none"
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
    </div>
  );
}
