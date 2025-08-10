import { useState } from "react";
import WindowControls from "@/components/WindowControls";

export default function ShortcutsPage(): JSX.Element {
  const [shrunk, setShrunk] = useState<boolean>(false);

  return (
    <div
      className="min-h-screen flex flex-col rounded-md overflow-hidden text-black transition-transform duration-300 ease-in-out"
      style={{
        transform: `scale(${shrunk ? 0.9 : 1})`,
        transformOrigin: "top center",
      }}
    >
      <div className="drag flex items-center justify-between p-0 bg-black text-white">
        <div className="flex items-center gap-2 pl-2">
          <span className="font-semibold">Quack</span>
        </div>
        <WindowControls
          shrunk={shrunk}
          onToggleShrink={() => setShrunk((s) => !s)}
          className="pr-2"
        />
      </div>
      <div className="bg-white flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">Keyboard Shortcuts</h1>
        <p className="text-gray-600 mb-6">
          Static list for now. We can make this dynamic later.
        </p>
        <div className="space-y-4">
          <ShortcutRow keys={["Ctrl", "Shift", "K"]} label="Open Magic Chat" />
          <ShortcutRow keys={["Ctrl", "."]} label="Toggle Magic Dot" />
          <ShortcutRow keys={["Ctrl", "/"]} label="Search" />
          <ShortcutRow keys={["Alt", "Enter"]} label="Run Action" />
          <ShortcutRow keys={["Esc"]} label="Close/Cancel" />
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({
  keys,
  label,
}: {
  keys: string[];
  label: string;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between border rounded-md p-3">
      <span className="text-gray-800">{label}</span>
      <div className="flex gap-2">
        {keys.map((k) => (
          <kbd
            key={k}
            className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}
