import { useEffect, useRef, useState } from "react";
import ChatHistoryTab from "@/components/ChatHistoryTab";
import { motion } from "framer-motion";
import { ChevronDown, Send, Plus, Loader2 } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import { Generate, getConvoMessage } from "@/api/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import CodeBlock from "@/components/CodeBlock";
const MODELS = [
  { label: "gemini", value: "gemini-2.5-flash" },
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
    setTitleById,
    updateConvoId,
    updateConvoMessages,
    fetchConvoHistory,
    convoTitleLoading,
  } = useChatStore();
  const { email } = useUserStore();
  const [chatInputText, setChatInputText] = useState("");
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (email) {
      fetchConvoHistory(email);
      setCurrentConvo(-1);
    }
  }, [email, fetchConvoHistory]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAIResponse = async (userMsg: string) => {
    console.log("usermsg:", userMsg);
    if (userMsg.trim() === "") return;

    let newMessages = [
      ...messages,
      {
        sender: "user" as const,
        text: userMsg,
      },
    ];

    setMessages(newMessages);
    updateConvoMessages(currentConvoId, newMessages);

    try {
      // get ai gen message back :
      const ai_res = await Generate({
        email: email,
        message: userMsg,
        newConvo: currentConvoId == -1 ? true : false,
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
      console.log("Res data:", ai_res);
      setMessages(updatedMessages);

      if (currentConvoId === -1) {
        setTitleById(-1, ai_res.title);
        updateConvoId(-1, ai_res.conversationId);
        updateConvoMessages(ai_res.conversationId, updatedMessages);
        setCurrentConvo(ai_res.conversationId);
      } else {
        updateConvoMessages(currentConvoId, updatedMessages);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessages = [
        ...newMessages,
        {
          sender: "ai" as const,
          text: "Sorry, I encountered an error. Please try again.",
        },
      ];
      setMessages(errorMessages);
      updateConvoMessages(currentConvoId, errorMessages);
    }
  };

  const handleSend = () => {
    const userMsg = chatInputText.trim();
    if (!userMsg) return;
    setChatInputText("");
    handleAIResponse(userMsg);
  };

  const convoChange = async (convoId: number) => {
    setCurrentConvo(convoId);
    const existingMessages =
      messages.length > 0 && currentConvoId === convoId ? messages : [];

    if (existingMessages.length > 0) {
      // Already loaded → just set messages
      setMessages(existingMessages);
      return;
    }
    setLoadingMessages(true);

    try {
      const res = await getConvoMessage({ convoId });
      console.log("Fetched Raw Convos:", res.data);
      if (res.success && Array.isArray(res.data)) {
        const formattedMessages = res.data.map((m: any) => ({
          sender: m.sender == "user" ? "user" : "ai",
          text: m.content,
        }));
        console.log("New convo msges:", formattedMessages);
        setMessages(formattedMessages);
        updateConvoMessages(convoId, formattedMessages);
      } else {
        console.error("Failed to fetch messages:", res.message);
      }
    } finally {
      setLoadingMessages(false); // stop loader
    }
  };

  const handleNewChat = () => {
    addNewConvo();
    setCurrentConvo(-1);
    setMessages([]);
  };
  return (
    <div className="w-full h-[calc(100vh-36px)] flex bg-white">
      {/* Sidebar - Chat history */}
      <div className="w-[240px] shrink-0 h-full flex flex-col p-3 border-r border-gray-200 bg-gray-50">
        <button
          onClick={() => handleNewChat()}
          className="flex items-center justify-center gap-2 px-3 py-2 mb-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 text-sm font-medium transition-colors"
        >
          <Plus size={16} /> New Chat
        </button>

        <div className="flex-1 overflow-y-auto space-y-1">
          {convoHistory.length === 0 ? (
            <div className="text-gray-500 text-sm text-center mt-8 px-2">
              <p className="mb-2">No conversations yet</p>
              <p className="text-xs text-gray-400">
                Start a new chat to see your history here
              </p>
            </div>
          ) : (
            convoHistory.map((convo, idx) => (
              <ChatHistoryTab
                key={convo.id !== undefined ? convo.id : `temp-${idx}`}
                message={convo.title || "New Chat"}
                active={currentConvoId === convo.id}
                onClick={() => convoChange(convo.id)}
              />
            ))
          )}
        </div>

        {convoTitleLoading && (
          <div className="flex justify-center py-2">
            <Loader2 className="animate-spin text-zinc-600" size={18} />
          </div>
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
            {loadingMessages && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                <Loader2 className="animate-spin text-zinc-700" size={24} />
              </div>
            )}

            {messages.length === 0 && !loadingMessages && (
              <div className="flex-1 flex items-center justify-center text-zinc-500">
                <div className="text-center">
                  <p className="text-lg mb-2">Start a conversation</p>
                  <p className="text-sm">
                    Type a message below to begin chatting with AI
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`px-4 py-2 rounded-lg text-sm ${
                  msg.sender === "user"
                    ? "bg-zinc-900 text-white self-end text-right ml-auto w-fit max-w-[70%]"
                    : "bg-zinc-200 self-start text-left w-fit max-w-[450px]"
                }`}
              >
                {msg.sender === "ai" ? (
                  <div className="prose prose-sm max-w-fit prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:hidden prose-code:hidden">
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
                                    className={`${className} `}
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
                          <div style={{ whiteSpace: "pre-wrap" }}>
                            {msg.text}
                          </div>
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
