import { useEffect, useRef, useState } from "react";
import {
  Pin,
  Torus,
  X,
  Mic,
  Send,
  Pencil,
  Minimize2,
  Monitor,
  SquareArrowOutUpRight,
  Delete,
  Trash2,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { OverlayButton } from "./OverlayComponents";
import { emit } from "@tauri-apps/api/event";
import { Window } from "@tauri-apps/api/window";

// Add these imports - you'll need to adjust paths based on your project structure
import { useUserStore } from "@/store/userStore";
import { Generate, getConvoMessage } from "@/api/chat";

const MODELS = [
  { label: "gemini", value: "gemini-2.5-flash" },
  { label: "GPT-4o", value: "gpt-4o" },
  { label: "GPT-3.5", value: "gpt-3.5" },
];

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export interface OverlayProps {
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  isPinned: boolean;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  micOn: boolean;
  inputText: string;
  setInputText: (v: string) => void;
  showChat: boolean;
  setShowChat: (v: boolean) => void;
  messages: ChatMessage[];
  setMessages: (v: ChatMessage[]) => void;
  chatInputText: string;
  setChatInputText: (v: string) => void;
  windowIcon: string;

  handleSendClick: () => void;
  handleCloseChatClick: () => void;
  handlePinClick: () => void;
  handleFollowClick: () => void;
  renderInputActionButton: () => React.ReactNode;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleBackgroundSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  backgroundUrl: string | null;
  isAdjustingBg: boolean;
  setIsAdjustingBg: (v: boolean) => void;
  bgPercent: { x: number; y: number };
  setBgPercent: (v: { x: number; y: number }) => void;
  chatContainerRef: React.RefObject<HTMLDivElement>;
  bottomRef: React.RefObject<HTMLDivElement>;
}

export const Overlay = ({
  expanded,
  setExpanded,
  isPinned,
  isActive,
  setIsActive,
  micOn,
  inputText,
  setInputText,
  showChat,
  setShowChat,
  messages,
  setMessages,
  chatInputText,
  setChatInputText,
  windowIcon,

  handleSendClick,
  handleCloseChatClick,
  handlePinClick,
  handleFollowClick,
  renderInputActionButton,
  fileInputRef,
  handleBackgroundSelect,
  backgroundUrl,
  isAdjustingBg,
  setIsAdjustingBg,
  bgPercent,
  setBgPercent,
  chatContainerRef,
  bottomRef,
}: OverlayProps) => {
  const [inputActive, setInputActive] = useState(false);

  // Chat functionality state
  const [currentModel, setCurrentModel] = useState(MODELS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatTitle, setChatTitle] = useState("New Chat");
  const [currentConvoId, setCurrentConvoId] = useState(-1);
  const [titleLoading, setTitleLoading] = useState(false);

  // Get user email from store
  const { email } = useUserStore();

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
    if (currentConvoId == -1) setTitleLoading(true);

    try {
      // Get AI response
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
        setChatTitle(ai_res.title || "New Chat");
        setCurrentConvoId(ai_res.conversationId);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      // Add error message to chat
      let errorMessages = [
        ...newMessages,
        {
          sender: "ai" as const,
          text: "Sorry, I encountered an error. Please try again.",
        },
      ];
      setMessages(errorMessages);
    } finally {
      setTitleLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setChatTitle("New Chat");
    setCurrentConvoId(-1);
    setChatInputText("");
  };

  const handleSendMessage = () => {
    const userMsg = chatInputText.trim();
    if (!userMsg) return;
    setChatInputText("");
    handleAIResponse(userMsg);
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-2 box-border">
      <main
        className={`w-full h-full bg-white flex flex-col rounded-xl shadow-lg overflow-hidden min-h-0`}
      >
        {/* Header bar */}
        <motion.div
          className={`flex items-center w-full h-[44px] shrink-0 ${
            isPinned ? "" : "drag"
          }`}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          <OverlayButton
            className="!border-none"
            customBgColor="white"
            active={isActive}
            onClick={() => setIsActive(!isActive)}
          >
            <div
              className={`size-3 ${
                isActive ? "bg-green-500" : "bg-gray-700"
              } rounded-full`}
            ></div>
          </OverlayButton>

          <div className="group drag flex-1 h-full flex items-center w-full">
            {!showChat ? (
              inputActive ? (
                <div
                  key="input-field"
                  className="flex w-full h-full items-center border-x border-gray-300 px-4 py-2 drag bg-white shadow-sm max-w-xs"
                >
                  <input
                    autoFocus
                    type="text"
                    className="no-drag text-sm font-medium text-zinc-800 border-none outline-none bg-transparent w-full placeholder:text-gray-500"
                    placeholder={`Ask Quack anything...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onBlur={() => setInputActive(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && inputText.trim()) {
                        handleSendClick();
                        const userMsg = inputText.trim();

                        setInputActive(false);

                        handleAIResponse(userMsg);
                      }
                    }}
                  />
                </div>
              ) : (
                <div
                  key="input-field"
                  className="flex w-full h-full items-center border-x border-gray-300 px-4 py-2 drag bg-white shadow-sm max-w-xs cursor-text"
                  onClick={() => setInputActive(true)}
                >
                  <span
                    className={`text-sm font-medium cursor-text z-50 text-zinc-800 ${
                      inputText ? "" : "text-gray-500"
                    }`}
                  >
                    {inputText || "Ask Quack anything..."}
                  </span>
                </div>
              )
            ) : (
              <div
                key="listening-field"
                className="flex drag items-center gap-2 px-4 py-2 text-sm text-gray-600"
              >
                <span className="select-none font-medium">Listening to:</span>
                {windowIcon ? (
                  <img
                    src={windowIcon}
                    alt="App icon"
                    className="w-5 h-5 rounded-sm"
                  />
                ) : (
                  <div className="w-5 h-5 bg-gray-300 rounded-sm flex items-center justify-center">
                    <span className="text-xs text-gray-600">?</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center h-full ml-auto">
            {!showChat && inputText.trim().length > 0 && (
              <button
                className="no-drag h-full flex items-center gap-1 hover:bg-zinc-200 rounded p-2 text-sm border-r border-gray-300"
                onClick={() => {
                  const userMsg = inputText.trim();
                  if (!userMsg) return;
                  handleSendClick();
                  setInputActive(false);
                  handleAIResponse(userMsg);
                }}
              >
                <span className="text-sm font-medium ">Send</span>
              </button>
            )}
            <OverlayButton onClick={() => {}} active={micOn} title="Voice">
              <Mic size={16} />
            </OverlayButton>
            <OverlayButton
              onClick={handlePinClick}
              active={isPinned}
              title="Pin"
            >
              <Pin size={16} />
            </OverlayButton>
            {showChat && (
              <OverlayButton
                onClick={handleCloseChatClick}
                className="no-drag hover:bg-gray-300 rounded p-2"
                title="Close chat"
              >
                <X size={16} />
              </OverlayButton>
            )}
            {!showChat && (
              <OverlayButton
                onClick={handleFollowClick}
                className="no-drag hover:bg-gray-300 rounded p-2"
                title="Follow"
              >
                <Minimize2 size={16} />
              </OverlayButton>
            )}
          </div>
        </motion.div>

        {/* Chat area */}
        <AnimatePresence initial={false}>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              ref={chatContainerRef}
              className={`no-drag flex-1 flex flex-col overflow-hidden border-t border-gray-200 relative min-h-0 ${
                backgroundUrl && isAdjustingBg ? "cursor-move" : ""
              }`}
              style={
                backgroundUrl
                  ? {
                      backgroundImage: `url(${backgroundUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: `${bgPercent.x}% ${bgPercent.y}%`,
                    }
                  : undefined
              }
            >
              <div className="flex-1 flex flex-col overflow-hidden bg-white min-h-0">
                {/* Chat header */}
                <div className="h-[44px] border-b overflow-hidden border-b-gray-200 border-x border-x-transparent w-full flex">
                  <div className="h-full w-full flex justify-between items-center p-2 tracking-tight font-medium">
                    <div className="flex items-center gap-2">
                      {titleLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          <span>Generating title...</span>
                        </>
                      ) : (
                        chatTitle
                      )}
                    </div>
                    <div className="text-zinc-600 text-sm font-light">
                      {getCurrentTime()}
                    </div>
                  </div>
                  <div className="h-full flex ml-auto shrink-0">
                    <button
                      className="border-l h-[44px] hover:bg-zinc-300 border-gray-300 bg-white aspect-square shrink-0 flex items-center justify-center"
                      onClick={handleNewChat}
                      title="New Chat"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button
                      className="border-l h-[44px] hover:bg-zinc-300 border-gray-300 bg-white aspect-square shrink-0 flex items-center justify-center"
                      onClick={async () => {
                        try {
                          await emit("quack:transfer-chat", {
                            messages,
                            navigate: true,
                          });
                          setShowChat(false);
                        } catch (e) {
                          setShowChat(false);
                        }
                      }}
                      title="Open in main window"
                    >
                      <SquareArrowOutUpRight size={18} />
                    </button>
                  </div>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide relative">
                  {loadingMessages && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                      <Loader2
                        className="animate-spin text-zinc-700"
                        size={24}
                      />
                    </div>
                  )}

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
                  {/* Model selector */}
                  <div className="relative h-full">
                    <button
                      type="button"
                      className="shrink-0 w-[120px] whitespace-nowrap bg-white h-full border-r border-gray-300 px-4 text-sm gap-2 flex items-center justify-center font-medium text-gray-800 select-none hover:bg-gray-50"
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
                        handleSendMessage();
                      }
                    }}
                    placeholder="Enter your message here"
                    className="w-full px-4 h-full bg-transparent text-gray-800 placeholder:text-gray-500 text-sm outline-none pr-28"
                  />

                  <div className="h-full w-fit right-0 inset-y-0 flex items-center">
                    <button
                      onClick={handleSendMessage}
                      className="h-full border-l hover:bg-zinc-300 border-gray-300 bg-white aspect-square shrink-0 flex items-center justify-center"
                      disabled={!chatInputText.trim()}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
