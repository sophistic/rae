import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
export default function ChatWindow() {
  useEffect(() => {
    invoke("stick_chat_to_dot").catch(console.error);
  }, []);
  return (
    <div className="drag min-h-screen flex items-center rounded-md justify-center bg-gradient-to-b from-white to-yellow-200">
      ok bro
    </div>
  );
}
