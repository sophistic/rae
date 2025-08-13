import { create } from "zustand";
import { persist } from "zustand/middleware";

// shape of our user state
interface UserState {
  email: string | null;
  name: string | null;

  loggedIn: boolean;
  showSplash: boolean;
  // actions
  setUser: (user: Partial<Pick<UserState, "email" | "name">>) => void;
  setLoggedIn: (flag: boolean) => void;
  setShowSplash: (flag: boolean) => void;
  clearUser: () => void;
}

// Create a persisted user store
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      email: null,
      name: null,

      loggedIn: false,
      showSplash: true,
      setUser: ({ email, name }) =>
        set((state) => ({
          email: email ?? state.email,
          name: name ?? state.name,
        })),
      setLoggedIn: (flag: boolean) => set(() => ({ loggedIn: flag })),
      setShowSplash: (flag: boolean) => set(() => ({ showSplash: flag })),
      clearUser: () =>
        set(() => ({
          email: null,
          name: null,

          loggedIn: false,
          showSplash: true,
        })),
    }),
    {
      name: "user-storage", // key in localStorage

      partialize: (state) => ({
        email: state.email,
        name: state.name,
        loggedIn: state.loggedIn,
        showSplash: state.showSplash,
      }),
    },
  ),
);
