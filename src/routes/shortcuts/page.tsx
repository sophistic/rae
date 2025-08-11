import { useState } from "react";
import { MAGIC_DOT_TOGGLE_KEYS } from "@/constants/shortcuts";
// removed header icon per request

export default function ShortcutsPage(): JSX.Element {
  const [shrunk, setShrunk] = useState<boolean>(false);

  return (
    <div
      className="min-h-screen flex flex-col rounded-md overflow-hidden text-black transition-transform duration-300 ease-in-out"
      style={{ transform: `scale(${shrunk ? 0.9 : 1})`, transformOrigin: "top center" }}
    >
      <div className="bg-white flex-1 p-8 flex items-start justify-center">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight">Keyboard Shortcuts</h1>
            <p className="text-sm text-zinc-500">For making your life easier</p>
          </div>

          <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
            <SectionHeader title="MagicDot Shortcuts" />
            <div className="divide-y divide-zinc-200">
              <ShortcutRow keys={MAGIC_DOT_TOGGLE_KEYS} label="Hide / Unhide Magic Dot" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-zinc-800">{label}</span>
      <KeyCombo keys={keys} />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-2.5 bg-zinc-50 border-b border-zinc-200">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</span>
    </div>
  );
}

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1.5 select-none">
      {keys.map((k, idx) => (
        <div key={`${k}-${idx}`} className="flex items-center gap-1.5">
          <kbd className="px-2 py-1 rounded-md border border-zinc-300 bg-zinc-100 text-[11px] font-mono text-zinc-800 shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]">
            {k}
          </kbd>
          {idx < keys.length - 1 ? (
            <span className="text-zinc-400 text-xs font-medium">+</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
