import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const MagicDot = () => {
  const [expanded, setExpanded] = useState(true); // ← start small

  useEffect(() => {
    const unlisten = listen("exit_follow_mode", () => {
      setTimeout(() => setExpanded(true), 1200);
    });
    // invoke("follow_magic_dot");
    return () => {
      unlisten.then((f) => f());
    };
  }, []);
  const handleClick = () => {
    invoke("follow_magic_dot");
    setExpanded(false);
  };

  return (
    <>
      {expanded ? (
        <main className="drag w-full h-screen bg-white p-2  flex items-center gap-2 transition-all duration-300 ">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <button className="text-sm font-medium text-gray-800 w-20">
            Listening...
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => handleClick()}
              className="no-drag hover:bg-gray-200 rounded p-1"
            >
              ⭐
            </button>
            <button className="hover:bg-gray-200 rounded p-1">🖥</button>
            <button className="hover:bg-gray-200 rounded p-1">🎤</button>
          </div>
        </main>
      ) : (
        <main className="w-full h-full bg-yellow-300 rounded-full absolute top-0 left-0" />
      )}
    </>
  );
};

export default MagicDot;
