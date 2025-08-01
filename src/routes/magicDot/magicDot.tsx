import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const MagicDot = () => {
  const [expanded, setExpanded] = useState(false);
  const hasStartedFollowing = useRef(false); // persist across renders

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    // Listen for backend signal to expand
    listen("exit_follow_mode", () => {
      console.log("Received exit_follow_mode");
      setExpanded(true);
    }).then((fn) => {
      unlisten = fn;
    });

    if (!hasStartedFollowing.current) {
      invoke("follow_magic_dot").catch(console.error);
      hasStartedFollowing.current = true;
    }

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleFollowClick = () => {
    setExpanded(false);
    invoke("follow_magic_dot").catch(console.error);
  };

  return (
    <>
      {expanded ? (
        <main className="drag w-full h-screen bg-white p-2 flex items-center gap-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 pl-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-medium text-gray-800">
              Listening...
            </span>
          </div>
          <div className="ml-auto flex items-center">
            <button
              onClick={handleFollowClick}
              className="no-drag flex items-center gap-1 hover:bg-gray-200 rounded p-2 text-sm border-r"
            >
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
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Chat
            </button>
            <button className="no-drag hover:bg-gray-200 rounded p-2 border-r">
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
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
              </svg>
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