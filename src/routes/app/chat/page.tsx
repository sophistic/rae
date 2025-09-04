import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, MessageCircle, Globe, Brain } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import animatedUnscreenGif from "../../../assets/animated-gifs01-unscreen.gif";
import ChatSidebarButton from "./components/ChatSidebarButton";
import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import { Generate, GenerateWithWebSearch, GenerateWithSupermemory, getConvoMessage } from "@/api/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import CodeBlock from "@/components/misc/CodeBlock";
import ChatInput from "./components/ChatInput";
import { useNoteStore } from "@/store/noteStore";
import { GetNotes } from "@/api/notes";
const MODELS = [
  { label: "OpenAi", value: "gpt-4o-mini" },
  { label: "OpenAi", value: "gpt-4o" },
  { label: "Gemini", value: "gemini-2.5-flash" },
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
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentInputMessage, setCurrentInputMessage] = useState("");
  const [selectedTool, setSelectedTool] = useState<0 | 1 | 2>(0); // 0=none, 1=web search, 2=supermemory
  const [searchParams] = useSearchParams();
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Get initial message from URL params
  const initialMessage = searchParams.get("message");

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
  const handleSend = async (userMsg: string, manualImage?: string) => {
    // This is the same as the old handleAIResponse logic
    let newMessages = [
      ...messages,
      {
        sender: "user" as const,
        text: userMsg, // Normal message without prefix
      },
    ];
    setMessages(newMessages);
    updateConvoMessages(currentConvoId, newMessages);

    // Set AI thinking state to true
    setIsAIThinking(true);

    try {
      // Use manual image if provided, otherwise capture window screenshot
      let imageToSend = manualImage || "";
      if (!manualImage) {
        try {
          imageToSend = (await invoke(
            "capture_window_screenshot",
          )) as string;
          console.log(
            "Screenshot captured for normal chat, length:",
            imageToSend.length,
          );
          console.log(
            "Normal chat screenshot starts with:",
            imageToSend.substring(0, 50),
          );
        } catch (screenshotError) {
          console.error(
            "Failed to capture screenshot for normal chat:",
            screenshotError,
          );
          // Continue without screenshot if capture fails
        }
      } else {
        console.log(
          "Using manually pasted image, length:",
          manualImage.length,
        );
        console.log(
          "Manual image starts with:",
          manualImage.substring(0, 50),
        );
      }

      // Use selected tool if any
      let ai_res;
      if (selectedTool === 1) {
        ai_res = await GenerateWithWebSearch({
          email: email,
          message: userMsg,
          newConvo: currentConvoId == -1 ? true : false,
          conversationId: currentConvoId,
          provider: currentModel.label,
          modelName: currentModel.value,
          image: imageToSend,
        });
      } else if (selectedTool === 2) {
        ai_res = await GenerateWithSupermemory({
          email: email,
          message: userMsg,
          newConvo: currentConvoId == -1 ? true : false,
          conversationId: currentConvoId,
          provider: currentModel.label,
          modelName: currentModel.value,
          image: imageToSend,
        });
      } else {
        ai_res = await Generate({
          email: email,
          message: userMsg,
          newConvo: currentConvoId == -1 ? true : false,
          conversationId: currentConvoId,
          provider: currentModel.label,
          modelName: currentModel.value,
          image: imageToSend,
        });
      }

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
    } finally {
      // Always clear the thinking state
      setIsAIThinking(false);
      // Reset tool selection after sending
      setSelectedTool(0);
    }
  };

  const convoChange = async (convoId: number) => {
    setCurrentConvo(convoId);
    setIsAIThinking(false);
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
    setIsAIThinking(false);
    setSelectedTool(0); // Reset selected tool
  };

  // Handler for typing state changes from ChatInput
  const handleTypingChange = (typing: boolean) => {
    setIsTyping(typing);
  };



  // Handler for web search (called from handleSend when tool is selected)
  const handleWebSearch = async (userMsg: string) => {
    // This function is now only called from handleSend with the selected tool
    // The actual logic is in handleSend function above
    return;
  };

  // Handler for supermemory (called from handleSend when tool is selected)
  const handleSupermemory = async (userMsg: string) => {
    // This function is now only called from handleSend with the selected tool
    // The actual logic is in handleSend function above
    return;
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

          {/* Input area with overlay icons */}
          <div className="relative">
            {/* Typing Icons - appear when user is typing */}
            <AnimatePresence>
              {isTyping && currentInputMessage.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-full right-4 mb-2 flex gap-2 z-10"
                >
                                  {/* Web Search Icon */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedTool(selectedTool === 1 ? 0 : 1)}
                  className={`rounded-full p-2 shadow-md transition-all duration-200 flex items-center justify-center ${
                    selectedTool === 1
                      ? "bg-blue-600 ring-2 ring-blue-400/50 shadow-blue-500/30"
                      : "bg-blue-500/90 hover:bg-blue-600 hover:shadow-blue-500/20"
                  } text-white backdrop-blur-sm border border-white/20`}
                  title={selectedTool === 1 ? "Web search active - click to deactivate" : "Activate web search"}
                >
                  <Globe size={16} />
                </motion.button>

                {/* Supermemory Icon */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedTool(selectedTool === 2 ? 0 : 2)}
                  className={`rounded-full p-2 shadow-md transition-all duration-200 flex items-center justify-center ${
                    selectedTool === 2
                      ? "bg-purple-600 ring-2 ring-purple-400/50 shadow-purple-500/30"
                      : "bg-purple-500/90 hover:bg-purple-600 hover:shadow-purple-500/20"
                  } text-white backdrop-blur-sm border border-white/20`}
                  title={selectedTool === 2 ? "Supermemory active - click to deactivate" : "Activate supermemory"}
                >
                  <Brain size={16} />
                </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            <ChatInput
              onSend={handleSend}
              onWebSearch={handleWebSearch}
              onSupermemory={handleSupermemory}
              currentModel={currentModel}
              setCurrentModel={setCurrentModel}
              models={MODELS}
              initialMessage={initialMessage}
              onTypingChange={handleTypingChange}
              onMessageChange={setCurrentInputMessage}
              selectedTool={selectedTool}
              onToolChange={setSelectedTool}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
