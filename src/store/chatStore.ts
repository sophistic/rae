import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

interface ChatState {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      setMessages: (messages) => set({ messages }),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({ messages: state.messages }),
    }
  )
);
