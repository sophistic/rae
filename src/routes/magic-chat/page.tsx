import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    invoke("stick_chat_to_dot").catch(console.error);

    const unlisten = listen<ChatMessage>("new_message", (event) => {
      setMessages((prev) => [...prev, event.payload]);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="drag min-h-screen flex flex-col rounded-lg items-center justify-center bg-white p-4">
      <div className="no-drag w-full max-w-md flex flex-col gap-2 overflow-y-auto max-h-[80vh] scrollbar-hide">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`px-4 py-2 rounded-lg text-sm max-w-[80%] ${
              msg.sender === "user"
                ? "bg-blue-100 self-end text-right"
                : "bg-green-100 self-start text-left"
            }`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
