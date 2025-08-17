import { create } from "zustand";
import { updateUserNotes } from "@/api/notes";
interface NoteState {
  notes: string[] | null;
  setNotes: (newNotes: string[]) => void;
  updateNotes: (email: string, newNotes: string[]) => void;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  setNotes: (newNotes) => set({ notes: newNotes }),
  updateNotes: async (email: string, newNotes: string[]) => {
    try {
      if (!email) {
        console.error("No email found in user store");
        return;
      }
      const res = await updateUserNotes({ email, newNotes });
      set({ notes: newNotes });
      if (res.success === false) {
        console.error("Failed to update notes", res.message);
        return;
      }
    } catch (err: any) {
      console.error("Error updating user notes:", err);
    }
  },
}));
