import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";

import { useChatStore } from "@/store/chatStore";
import { Overlay } from "./Overlay";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

const MagicDot = () => {
  const [expanded, setExpanded] = useState(false); // Appears as magic dot initially 
  const [isPinned, setIsPinned] = useState(false);
  const hasStartedFollowing = useRef(false);
  const [inputText, setInputText] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showInput, setShowInput] = useState(true); // NEW STATE
  const [windowName, setWindowName] = useState("");
  const [windowIcon, setWindowIcon] = useState("");
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const messages = useChatStore((s) => s.messages);
  const setMessages = useChatStore((s) => s.setMessages);
  const [chatInputText, setChatInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAdjustingBg, setIsAdjustingBg] = useState(false);
  const [bgPercent, setBgPercent] = useState<{ x: number; y: number }>({
    x: 50,
    y: 50,
  });
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const lastAppliedHeightRef = useRef<number>(60);
  const openMessageIndexRef = useRef<number>(0);

  useEffect(() => {
    invoke("start_window_watch").catch(() => {});

    interface ActiveWindowChangedPayload {
      name?: string;
      icon?: string; // data UR (e.g., data:image/png;base64,...)
    }

    const unlistenPromise = listen<ActiveWindowChangedPayload>(
      "active_window_changed",
      (event) => {
        if (event?.payload) {
          const { name, icon } = event.payload;
          setWindowName(name ?? "");
          setWindowIcon(icon ?? "");
        }
      },
    );

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);
  const applyCollapsedSize = () => {
    const win = getCurrentWebviewWindow();
    win.setSize(new LogicalSize(500, 60)).catch(() => {});
  };

  useEffect(() => {
    if (!expanded && !hasStartedFollowing.current) {
      invoke("follow_magic_dot").catch(console.error);
      hasStartedFollowing.current = true;
    } else if (expanded && !showChat) {
      // Ensure proper width when first expanded (not in chat mode)
      smoothResize(500, 60);
    }
  }, [expanded, showChat]);

  useEffect(() => {
    let unlistenExit: UnlistenFn | null = null;
    let unlistenCollapse: UnlistenFn | null = null;

    listen("exit_follow_mode", () => {
      setExpanded(true);
      // keep size controlled explicitly when opening chat
      invoke("center_magic_dot").catch(() => {});
    }).then((fn) => {
      unlistenExit = fn;
    });

    listen("collapse_to_dot", () => {
      setExpanded(false);
      setIsPinned(false);
      invoke("follow_magic_dot").catch(console.error);
    }).then((fn) => {
      unlistenCollapse = fn;
    });

    return () => {
      if (unlistenExit) unlistenExit();
      if (unlistenCollapse) unlistenCollapse();
    };
  }, []);

  const handleFollowClick = async () => {
    setExpanded(false);
    setIsPinned(false);
    setShowInput(true);
    invoke("follow_magic_dot").catch(console.error);
  };

  const handlePinClick = () => {
    if (isPinned) {
      setIsPinned(false);
      setExpanded(true);
      setShowChat(false);
      applyCollapsedSize();
      invoke("center_magic_dot").catch(() => {});
      return;
    }
    setIsPinned(true);
    invoke("pin_magic_dot").catch(console.error);
  };

  const smoothResize = async (width: number, height: number) => {
    const win = getCurrentWebviewWindow();
    win.setSize(new LogicalSize(width, height)).catch(() => {});
  };

  const handleSendClick = async () => {
    const text = inputText.trim();
    if (!text) return;
    if (!showChat) {
      openMessageIndexRef.current = messages.length;
      setShowChat(true);
      await smoothResize(500, 480);
      lastAppliedHeightRef.current = 480;
    }
    setInputText("");
    handleAIResponse(text);
  };

  const handleCloseChatClick = async () => {
    // Just close the chat, keep the bar expanded with input field
    setShowChat(false);
    await smoothResize(500, 60);
    lastAppliedHeightRef.current = 60;
    // Reset chat session state so next open starts clean
    setMessages([]);
    setChatInputText("");
    setBackgroundUrl(null);
    setIsAdjustingBg(false);
    setBgPercent({ x: 50, y: 50 });
    openMessageIndexRef.current = 0;
  };

  const renderInputActionButton = () => {
    if (!showChat && inputText.trim().length > 0) {
      return (
        <button
          className="no-drag h-full flex items-center gap-1 hover:bg-zinc-200 rounded p-2 text-sm border-r border-gray-300"
          onClick={handleSendClick}
        >
          <span className="text-sm font-medium ">Send</span>
        </button>
      );
    }
    return null;
  };

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
    };
  }, [backgroundUrl]);

  const handleBackgroundSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBackgroundUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setBgPercent({ x: 50, y: 50 });
    setIsAdjustingBg(true);
    e.currentTarget.value = "";
  };

  return (
    <div className="w-full h-screen">
      {expanded ? (
        <Overlay
          expanded={expanded}
          setExpanded={setExpanded}
          isPinned={isPinned}
          isActive={isActive}
          setIsActive={setIsActive}
          micOn={micOn}
          inputText={inputText}
          setInputText={setInputText}
          showChat={showChat}
          setShowChat={setShowChat}
          messages={messages}
          setMessages={setMessages}
          chatInputText={chatInputText}
          setChatInputText={setChatInputText}
          windowIcon={windowIcon}
          handleSendClick={handleSendClick}
          handleAIresponse={handleAIResponse}
          handleCloseChatClick={handleCloseChatClick}
          handlePinClick={handlePinClick}
          handleFollowClick={handleFollowClick}
          renderInputActionButton={renderInputActionButton}
          fileInputRef={fileInputRef}
          handleBackgroundSelect={handleBackgroundSelect}
          backgroundUrl={backgroundUrl}
          isAdjustingBg={isAdjustingBg}
          setIsAdjustingBg={setIsAdjustingBg}
          bgPercent={bgPercent}
          setBgPercent={setBgPercent}
          chatContainerRef={chatContainerRef}
          bottomRef={bottomRef}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div
            className="shrink-0 w-3 h-3 bg-yellow-400 rounded-full shadow cursor-pointer"
            onClick={() => setExpanded(true)}
            title="Expand Magic Dot"
          />
        </div>
      )}
    </div>
  );
};

export default MagicDot;
