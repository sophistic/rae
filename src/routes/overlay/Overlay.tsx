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
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { OverlayButton } from "./OverlayComponents";
import { emit, } from "@tauri-apps/api/event";
import { Window } from "@tauri-apps/api/window";

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
  if (!expanded) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="shrink-0 w-3 h-3 bg-yellow-400 rounded-full shadow" />
      </div>
    );
  }
  const [inputActive, setInputActive] = useState(false);

  return (
    <div className="w-full h-full  flex items-center justify-center p-2 box-border">
      <main
        className={`w-full  h-full bg-white flex flex-col rounded-xl shadow-lg overflow-hidden min-h-0`}
      >
        {/* Header bar */}
        <div
          className={`flex items-center  w-full h-[44px] shrink-0 ${
            isPinned ? "" : "drag"
          }`}
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
          <div className="group drag  flex-1 h-full flex items-center w-full">
            {!showChat ? (
              inputActive ? (
                <div
                  key="input-field"
                  className="flex w-full h-full items-center border-x border-gray-300 px-4 py-2 drag bg-white  shadow-sm  max-w-xs"
                >
                  <input
                    autoFocus
                    type="text"
                    className="no-drag text-sm font-medium  text-zinc-800 border-none outline-none bg-transparent w-full placeholder:text-gray-500"
                    placeholder={`Ask Quack anything...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onBlur={() => setInputActive(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendClick();
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
          <div className="flex items-center h-full  ml-auto">
            {renderInputActionButton()}
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
        </div>
        {/* Chat area */}
        <AnimatePresence initial={false}>
          {showChat && (
            <motion.div
              layout
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
              <div className="flex-1 flex flex-col overflow-hidden bg-white/40 backdrop-blur-sm min-h-0">
                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
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
                <div className=" h-[44px] focus-within:bg-zinc-200 bg-white border-t border-gray-200 relative flex items-center shrink-0">
                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && chatInputText.trim()) {
                        const userMsg = chatInputText.trim();
                        setMessages([
                          ...messages,
                          { sender: "user", text: userMsg },
                        ]);
                        setChatInputText("");
                        // handleAIResponse(userMsg); // Should be handled in parent
                      }
                    }}
                    placeholder="Enter your message here"
                    className="w-full px-4 h-full bg-transparent text-gray-800 placeholder:text-gray-500 text-sm outline-none pr-28"
                  />
                  <div className="h-full w-fit  right-0 inset-y-0 flex items-center ">
                    <button
                      onClick={() => {
                        const userMsg = chatInputText.trim();
                        setMessages([
                          ...messages,
                          { sender: "user", text: userMsg },
                        ]);
                        setChatInputText("");
                      }}
                      className="h-full border-l hover:bg-zinc-300 border-gray-300 bg-white aspect-square shrink-0 flex items-center justify-center"
                    >
                      <Send size={18}></Send>
                    </button>
                    <button
                      className="h-full border-l hover:bg-zinc-300 border-gray-300 bg-white aspect-square shrink-0 flex items-center justify-center"
                      onClick={async () => {
                        try {
                          await emit("quack:transfer-chat", { messages, navigate: true });
                          setShowChat(false);
                          
                        } catch (e) {
                          setShowChat(false);
                        }
                      }}
                    >
                      <SquareArrowOutUpRight size={18}></SquareArrowOutUpRight>
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
