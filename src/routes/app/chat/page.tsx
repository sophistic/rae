import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2, MessageCircle } from "lucide-react";
import ChatSidebarButton from "./components/ChatSidebarButton";
import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import { Generate, getConvoMessage } from "@/api/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import CodeBlock from "@/components/misc/CodeBlock";
import ChatInput from "./components/ChatInput";
import { useNoteStore } from "@/store/noteStore";
import { GetNotes } from "@/api/notes";
const MODELS = [
  { label: "Gemini", value: "gemini-2.5-flash" },
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
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { setNotes, notes } = useNoteStore();
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

  // Chat input logic is now handled by ChatInput component

  // Handler for ChatInput
  const handleSend = async (userMsg: string) => {
    // This is the same as the old handleAIResponse logic
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
      const ai_res = await Generate({
        email: email,
        message: userMsg,
        newConvo: currentConvoId == -1 ? true : false,
        conversationId: currentConvoId,
        provider: currentModel.label,
        modelName: currentModel.value,
        messageHistory: JSON.stringify(messages),
        notes: notes,
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
    <div className="w-full h-[calc(100vh-36px)] flex bg-background">
      {/* Sidebar - Chat history */}
      <div className="w-fit shrink-0 h-full flex flex-col py-[2px] border-r border-border bg-background">
        <div className="flex-1 overflow-y-auto ">
          {convoHistory.length === 0 ? (
            <div className="text-gray-500 text-sm text-center mt-8 px-2">
              <p className="mb-2">No conversations yet</p>
              <p className="text-xs text-gray-400">
                Start a new chat to see your history here
              </p>
            </div>
          ) : (
            convoHistory.map((convo, idx) => (
              <ChatSidebarButton
                key={convo.id !== undefined ? convo.id : `temp-${idx}`}
                icon={<MessageCircle size={16} />}
                active={currentConvoId === convo.id}
                onClick={() => convoChange(convo.id)}
              >
                {convo.title || "New Chat"}
              </ChatSidebarButton>
            ))
          )}
          <ChatSidebarButton
            icon={<Plus size={16} />}
            active={false}
            onClick={handleNewChat}
          >
            New Chat
          </ChatSidebarButton>
        </div>
        <div className=""></div>

        {convoTitleLoading && (
          <div className="flex justify-center py-2">
            <Loader2 className="animate-spin text-zinc-600" size={18} />
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex flex-col w-full">
        <motion.div
          ref={chatContainerRef}
          className="flex-1 flex flex-col overflow-y-auto  border-border relative min-h-0"
        >
          <div className="flex-1 flex flex-col overflow-y-auto p-2 space-y-1 scrollbar-hide">
            {loadingMessages && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 z-10">
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
                    ? "bg-foreground dark:bg-surface font-medium text-background self-end text-right ml-auto w-fit max-w-[70%]"
                    : "bg-zinc-200 dark:bg-[#333333] dark:text-white  self-start text-left w-fit max-w-[450px]"
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
          <ChatInput
            onSend={handleSend}
            currentModel={currentModel}
            setCurrentModel={setCurrentModel}
            models={MODELS}
          />
        </motion.div>
      </div>
    </div>
  );
}
