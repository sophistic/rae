import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const MagicDot = () => {
  const [expanded, setExpanded] = useState(false); // ← start small

  useEffect(() => {
    const unlisten = listen("exit_follow_mode", () => {
      setExpanded(true); // expand to UI
    });

    invoke("follow_magic_dot");

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  if (!expanded) {
    return (
      <main className="w-full h-full bg-green-500 rounded-full absolute top-0 left-0" />
    );
  }

  return (
    <main className="w-full h-full bg-white/80 backdrop-blur-md shadow-xl rounded-2xl p-2 flex items-center gap-2 transition-all duration-300">
      <div className="w-2 h-2 bg-green-500 rounded-full" />
      <input
        className="text-sm font-medium text-gray-800 w-20"
        placeholder="listening..."
      />
      <div className="ml-auto flex items-center gap-2">
        <button className="hover:bg-gray-200 rounded p-1">💬</button>
        <button className="hover:bg-gray-200 rounded p-1">🖥</button>
        <button className="hover:bg-gray-200 rounded p-1">🎤</button>
      </div>
    </main>
  );
};

export default MagicDot;
