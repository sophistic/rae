import { create } from "zustand";

export interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export interface Conversation {
  id: number;
  title: string;
  messages: ChatMessage[];
}

interface ChatState {
  messages: ChatMessage[]; // messages for the current convo
  currentConvoId: number;
  convoHistory: Conversation[];

  // Current convo message controls
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;

  // Conversation management
  addNewConvo: () => void;
  setCurrentConvo: (id: number) => void;
  setTitleById: (id: number, newTitle: string) => void;
  updateConvoId: (tempId: number, newId: number) => void;
  updateConvoMessages: (id: number, messages: ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentConvoId: -1,
  convoHistory: [
    {
      id: -1,
      title: "New Chat",
      messages: [],
    },
  ],

  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [] }),

  addNewConvo: () => {
    const newConvo: Conversation = {
      id: -1,
      title: "New Chat",
      messages: [],
    };
    set((state) => ({
      convoHistory: [...state.convoHistory, newConvo],
      currentConvoId: newConvo.id,
      messages: [],
    }));
  },

  setCurrentConvo: (id) => {
    const convo = get().convoHistory.find((c) => c.id === id);
    set({
      currentConvoId: id,
      messages: convo ? convo.messages : [],
    });
  },

  setTitleById: (id, newTitle) =>
    set((state) => ({
      convoHistory: state.convoHistory.map((c) =>
        c.id === id ? { ...c, title: newTitle } : c,
      ),
    })),

  updateConvoId: (tempId, newId) =>
    set((state) => ({
      convoHistory: state.convoHistory.map((c) =>
        c.id === tempId && tempId === -1 ? { ...c, id: newId } : c,
      ),
      currentConvoId:
        state.currentConvoId === tempId && tempId === -1
          ? newId
          : state.currentConvoId,
    })),

  updateConvoMessages: (id, messages) =>
    set((state) => ({
      convoHistory: state.convoHistory.map((c) =>
        c.id === id ? { ...c, messages } : c,
      ),
      ...(state.currentConvoId === id ? { messages } : {}),
    })),
}));
