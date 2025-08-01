import { create } from "zustand";
import { persist } from "zustand/middleware";

// shape of our user state
interface UserState {
  email: string | null;
  name: string | null;

  loggedIn: boolean;
  // actions
  setUser: (user: Partial<Pick<UserState, "email" | "name">>) => void;
  setLoggedIn: (flag: boolean) => void;
  clearUser: () => void;
}

// Create a persisted user store
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      email: null,
      name: null,

      loggedIn: false,
      setUser: ({ email, name }) =>
        set((state) => ({
          email: email ?? state.email,
          name: name ?? state.name,
        })),
      setLoggedIn: (flag: boolean) => set(() => ({ loggedIn: flag })),
      clearUser: () =>
        set(() => ({
          email: null,
          name: null,

          loggedIn: false,
        })),
    }),
    {
      name: "user-storage", // key in localStorage

      partialize: (state) => ({
        email: state.email,
        name: state.name,

        loggedIn: state.loggedIn,
      }),
    },
  ),
);
