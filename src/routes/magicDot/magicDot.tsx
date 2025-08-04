import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";

import { launchMagicChat } from "../magic-chat/launchChatWindow";
import { Pin, Torus, X } from "lucide-react";

const MagicDot = () => {
  const [expanded, setExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const hasStartedFollowing = useRef(false);
  const [windowName, setWindowName] = useState("");
  const [inputText, setInputText] = useState("");
  const [inputTouched, setInputTouched] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let unlistenWindow: (() => void) | null = null;
    const currentAppWindow = "magic-dot";

    listen("exit_follow_mode", () => {
      console.log("Received exit_follow_mode");
      setExpanded(true);
      launchMagicChat();
    }).then((fn) => {
      unlisten = fn;
    });

    listen<string>("active_window_changed", (event) => {
      setWindowName(event.payload);

      // Hide input actions if current app is not active
      if (!event.payload?.toLowerCase().includes(currentAppWindow)) {
        setInputTouched(false);
      }
    }).then((fn) => {
      unlistenWindow = fn;
    });

    launchMagicChat();

    if (!hasStartedFollowing.current) {
      invoke("follow_magic_dot").catch(console.error);
      invoke("start_window_watch").catch(console.error);
      hasStartedFollowing.current = true;
    }

    return () => {
      if (unlisten) unlisten();
      if (unlistenWindow) unlistenWindow();
    };
  }, []);

  const handleFollowClick = () => {
    setExpanded(false);
    setIsPinned(false);
    invoke("close_magic_chat").catch(console.error);
    invoke("follow_magic_dot").catch(console.error);
  };

  const handlePinClick = () => {
    if (isPinned) {
      setIsPinned(false);
      setExpanded(false);
      invoke("close_magic_chat").catch(console.error);
      invoke("follow_magic_dot").catch(console.error);
      return;
    }
    setIsPinned(true);
    invoke("pin_magic_dot").catch(console.error);
  };

  const handleSendClick = async () => {
    const message = {
      sender: "user",
      text: inputText.trim(),
    };

    launchMagicChat();

    setTimeout(() => {
      emit("new_message", message); // Now send
    }, 500);

    // Dummy AI reply
    setTimeout(() => {
      emit("new_message", {
        sender: "ai",
        text: "This is a dummy AI response.",
      });
    }, 1000);

    setInputText("");
  };

  const handleCloseClick = () => {
    invoke("close_magic_chat").catch(console.error);
    setInputText("");
  };

  const renderInputActionButton = () => {
    if (!inputTouched) return null;
    if (inputText.trim()) {
      return (
        <button
          className="no-drag flex items-center gap-1 hover:bg-gray-200 rounded p-2 text-sm border-r"
          onClick={handleSendClick}
        >
          <span className="text-sm font-medium">Send</span>
        </button>
      );
    } else {
      return (
        <button
          className="no-drag flex items-center gap-1 hover:bg-gray-200 rounded p-2 text-sm border-r"
          onClick={handleCloseClick}
        >
          <X className="scale-75" />
        </button>
      );
    }
  };

  return (
    <>
      {expanded ? (
        <main
          className={`w-full h-[38px] bg-white flex items-center gap-2 rounded-lg shadow-lg overflow-hidden ${
            isPinned ? "" : "drag"
          }`}
        >
          <div className="flex items-center gap-2 pl-4 w-full">
            <div className="w-3 h-2 bg-green-500 rounded-full" />
            <input
              type="text"
              className="text-sm font-medium text-gray-800 border-none outline-none bg-transparent w-full"
              placeholder={`Listening to ${windowName}`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={() => setInputTouched(true)}
            />
          </div>
          <div className="ml-auto flex items-center pr-2">
            {renderInputActionButton()}
            <button
              onClick={handlePinClick}
              className={`no-drag hover:bg-gray-300 rounded p-2 border-r ${
                isPinned ? "bg-gray-400" : ""
              }`}
            >
              <Pin className="scale-75" />
            </button>
            <button
              onClick={handleFollowClick}
              className="no-drag hover:bg-gray-300 rounded p-2 border-r "
            >
              <Torus className="scale-75" />
            </button>
            <button className="no-drag hover:bg-gray-200 rounded p-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </button>
          </div>
        </main>
      ) : (
        <main className="w-full h-full bg-yellow-400 rounded-full absolute top-0 left-0 cursor-pointer" />
      )}
    </>
  );
};

export default MagicDot;
