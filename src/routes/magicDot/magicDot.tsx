import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";

import { launchMagicChat } from "../magic-chat/launchChatWindow";
import {
  animateChatExpand,
  showMagicDot,
} from "../magic-chat/launchChatWindow";
import { Pin, Torus, X, Mic } from "lucide-react";

const MagicDot = () => {
  const [expanded, setExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const hasStartedFollowing = useRef(false);
  const [inputText, setInputText] = useState("");
  const [inputTouched, setInputTouched] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showInput, setShowInput] = useState(true); // NEW STATE
  const [windowName, setWindowName] = useState("");

  useEffect(() => {
    invoke("start_window_watch").catch(() => {});
    const unlistenPromise = listen<string>("active_window_changed", (event) => {
      if (event?.payload) {
        setWindowName(event.payload);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);
  const applyExpandedSize = () => {
    const win = getCurrentWebviewWindow();
    win.setSize(new LogicalSize(500, 60)).catch(() => {});
  };

  useEffect(() => {
    if (!expanded && !hasStartedFollowing.current) {
      invoke("follow_magic_dot").catch(console.error);
      hasStartedFollowing.current = true;
    }
  }, [expanded]);

  useEffect(() => {
    let unlistenExit = null;
    let unlistenCollapse = null;

    listen("exit_follow_mode", () => {
      setExpanded(true);
      applyExpandedSize();
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
    await invoke("close_magic_chat").catch(console.error);
    await showMagicDot().catch(() => {});
    invoke("follow_magic_dot").catch(console.error);
  };

  const handlePinClick = () => {
    if (isPinned) {
      setIsPinned(false);
      setExpanded(true);
      invoke("close_magic_chat").catch(console.error);
      applyExpandedSize();
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

    try {
      await launchMagicChat();
      await animateChatExpand();
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      emit("new_message", message);
    }, 350);

    setInputText("");
    setShowInput(false);
  };

  const handleCloseClick = () => {
    invoke("close_magic_chat").catch(console.error);
    setInputText("");
    setShowInput(true);
  };

  const renderInputActionButton = () => {
    if (showInput) {
      return (
        <button
          className="no-drag flex items-center gap-1 hover:bg-gray-200 rounded p-2 text-sm border-r border-gray-300"
          onClick={handleSendClick}
        >
          <span className="text-sm font-medium">Send</span>
        </button>
      );
    } else {
      return (
        <button
          className="no-drag flex items-center gap-1 hover:bg-gray-200 rounded p-2 text-sm border-r border-gray-300"
          onClick={handleCloseClick}
        >
          <X className="scale-75" />
        </button>
      );
    }
  };

  return (
    <div className="w-full h-full">
      {expanded ? (
        <div className="w-full h-full flex items-center justify-center p-2 box-border">
          <main
            className={`w-full h-[44px] bg-white flex items-center gap-2 rounded-2xl shadow-lg overflow-hidden ${
              isPinned ? "" : "drag"
            }`}
          >
            <div className="flex items-center gap-2 pl-4 w-full">
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={`no-drag relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors duration-150 ${
                  isActive ? "bg-green-500" : "bg-gray-300"
                }`}
                title={isActive ? "On" : "Off"}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform duration-150 ${
                    isActive ? "translate-x-3.5" : "translate-x-0.5"
                  }`}
                />
              </button>

              <div className="flex-1 group">
                {showInput ? (
                  <div className="flex items-center gap-2 rounded-full px-3 py-1 transition-all hover:bg-gray-200 hover:shadow-sm hover:ring-1 hover:ring-gray-300">
                    <input
                      type="text"
                      className="text-sm font-medium text-gray-800 border-none outline-none bg-transparent w-full placeholder:text-gray-400 group-hover:placeholder:text-gray-600"
                      placeholder={`Ask Quack anything...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onFocus={() => setInputTouched(true)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 text-sm text-gray-500">
                    {windowName
                      ? `Listening to: ${windowName}`
                      : "Waiting for active window..."}
                  </div>
                )}
              </div>
            </div>

            <div className="ml-auto flex items-center pr-2">
              {renderInputActionButton()}
              <button
                onClick={() => setMicOn((v) => !v)}
                className={`no-drag hover:bg-gray-300 rounded p-2 border-r border-gray-300 ${
                  micOn ? "bg-gray-200" : ""
                }`}
                title="Voice"
              >
                <Mic className="scale-75" />
              </button>
              <button
                onClick={handlePinClick}
                className={`no-drag hover:bg-gray-300 rounded p-2 border-r border-gray-300 ${
                  isPinned ? "bg-gray-400" : ""
                }`}
                title="Pin"
              >
                <Pin className="scale-75" />
              </button>
              <button
                onClick={handleFollowClick}
                className="no-drag hover:bg-gray-300 rounded p-2"
                title="Follow"
              >
                <Torus className="scale-75" />
              </button>
            </div>
          </main>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="shrink-0 w-3 h-3 bg-yellow-400 rounded-full shadow" />
        </div>
      )}
    </div>
  );
};

export default MagicDot;
