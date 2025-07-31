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
        <main className="drag w-full h-screen bg-white p-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <button className="text-sm font-medium text-gray-800 w-20">
            Listening...
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleFollowClick}
              className="no-drag hover:bg-gray-200 rounded p-1"
            >
              ⭐
            </button>
            <button className="hover:bg-gray-200 rounded p-1">🖥</button>
            <button className="hover:bg-gray-200 rounded p-1">🎤</button>
          </div>
        </main>
      ) : (
        <main className="w-full h-full bg-yellow-300 rounded-full absolute top-0 left-0 cursor-pointer" />
      )}
    </>
  );
};

export default MagicDot;
