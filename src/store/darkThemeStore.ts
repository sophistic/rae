import { create } from 'zustand';

interface DarkThemeState {
  darkTheme: boolean;
  setDarkTheme: (value: boolean) => void;
  initializeTheme: () => void;
}

export const useDarkThemeStore = create<DarkThemeState>((set) => ({
  darkTheme: false,
  setDarkTheme: (value: boolean) => {
    set({ darkTheme: value });
    localStorage.setItem('darkTheme', value ? 'true' : 'false');
  },
  initializeTheme: () => {
    const stored = localStorage.getItem('darkTheme');
    set({ darkTheme: stored === 'true' });
  },
}));
