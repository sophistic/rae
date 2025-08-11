declare module "@tauri-apps/plugin-global-shortcut" {
  export function register(
    shortcut: string,
    handler: () => void
  ): Promise<void>;
  export function unregister(shortcut: string): Promise<void>;
  export function isRegistered(shortcut: string): Promise<boolean>;
}


