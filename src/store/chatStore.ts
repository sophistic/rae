import { create } from "zustand";

import { GetConvos } from "@/api/chat";
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

  convoTitleLoading: boolean;
  setConvoTitleLoading: (loading: boolean) => void;

  // Current convo message controls
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;

  // Conversation management
  addNewConvo: () => void;
  setCurrentConvo: (id: number) => void;
  setTitleById: (id: number, newTitle: string) => void;
  updateConvoId: (tempId: number, newId: number) => void;
  updateConvoMessages: (id: number, messages: ChatMessage[]) => void;

  fetchConvoHistory: (email: string) => Promise<void>;
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
  convoTitleLoading: false,
  setConvoTitleLoading: (loading) => set({ convoTitleLoading: loading }),

  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [] }),
  fetchConvoHistory: async (email: string) => {
    try {
      if (!email) {
        console.error("No email found in user store");
        return;
      }
      set({ convoTitleLoading: true });
      const res = await GetConvos({ email });
      if (res.success === false) {
        console.error("Failed to load convos", res.message);
        return;
      }

      const withPlaceholder = [
        {
          id: -1,
          title: "New Chat",
          messages: [],
        },
        ...res.data,
      ];

      set({ convoHistory: withPlaceholder, convoTitleLoading: false });
    } catch (err) {
      console.error("Error fetching convo history:", err);
    }
  },
  addNewConvo: () => {
    const { currentConvoId, messages, convoHistory } = get();

    // If the active convo is still the placeholder and empty, don't add a new one
    if (currentConvoId === -1 && messages.length === 0) {
      return;
    }

    // Check if a conversation with id -1 already exists
    const existingPlaceholder = convoHistory.find((convo) => convo.id === -1);
    if (existingPlaceholder) {
      return; // Don't add a duplicate placeholder
    }

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
