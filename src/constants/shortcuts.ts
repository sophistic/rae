{/* Shortcuts for Magic Dot */}
export const MAGIC_DOT_TOGGLE_COMBO = "Ctrl+H";
export const MAGIC_DOT_TOGGLE_COOLDOWN_MS = 300;

{/* Shortcuts for showing overlay in center */}
export const SHOW_OVERLAY_CENTER_COMBO = "Ctrl+M";
export const SHOW_OVERLAY_CENTER_COOLDOWN_MS = 300;

{/* Shortcuts for Magic Chat */}

interface Shortcut {
    combo: string[];
    title: string;
    description: string;
}

export const shortcuts : Shortcut[] = [
    {
        combo: ["Ctrl", "H"],
        title: "Toggle overlay visibility",
        description: "Show or hide the overlay window"
    },
    {
        combo: ["Ctrl", "M"],
        title: "Show overlay in center",
        description: "Show the overlay bar in the center of the screen"
    },
    {
        combo: ["Ctrl", "D"],
        title: "Toggle dock mode",
        description: "Dock or undock the overlay window"
    },
    {
        combo: ["Ctrl", "Shift", "Enter"],
        title: "Open chat",
        description: "Open the chat in the overlay window"
    }
]
