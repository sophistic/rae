import { useEffect, useState } from "react";
import { MAGIC_DOT_TOGGLE_KEYS } from "@/constants/shortcuts";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "motion/react";
import { Circle, CircleEllipsis, Minus } from "lucide-react";

export default function ShortcutsPage(): JSX.Element {
  const [autoShowOnCopy, setAutoShowOnCopy] = useState<boolean>(false);
  const [autoShowOnSelection, setAutoShowOnSelection] =
    useState<boolean>(false);

  useEffect(() => {
    invoke<boolean>("get_auto_show_on_copy_enabled")
      .then((v) => setAutoShowOnCopy(!!v))
      .catch(() => {});
    invoke<boolean>("get_auto_show_on_selection_enabled")
      .then((v) => setAutoShowOnSelection(!!v))
      .catch(() => {});
  }, []);

  return (
    <div className="w-full h-full bg-white text-black overflow-auto">
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        <header className="space-y-1">
          <div className="text-2xl font-semibold tracking-tight">
            Shortcuts & Automation
          </div>
          <p className="text-sm text-zinc-500">
            Quick actions and behaviors to speed up your workflow.
          </p>
        </header>

        <Card>
          <SectionHeader title="Global Shortcuts" />
          <div className="divide-y divide-zinc-200">
            <ShortcutRow
              keys={MAGIC_DOT_TOGGLE_KEYS}
              label="Toggle Magic Dot"
              subLabel="Show or hide the Magic Dot from anywhere."
            />
          </div>
        </Card>

        <Card>
          <SectionHeader title="Automation" />
          <div className="divide-y divide-zinc-200">
            <ToggleRow
              label="Auto-show Magic Dot when text is copied"
              enabled={autoShowOnCopy}
              onToggle={async (next) => {
                setAutoShowOnCopy(next);
                try {
                  await invoke("set_auto_show_on_copy_enabled", {
                    enabled: next,
                  });
                } catch (_) {}
              }}
            />
            <ToggleRow
              label="Auto-show Magic Dot when text is selected"
              enabled={autoShowOnSelection}
              onToggle={async (next) => {
                setAutoShowOnSelection(next);
                try {
                  await invoke("set_auto_show_on_selection_enabled", {
                    enabled: next,
                  });
                } catch (_) {}
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function ShortcutRow({
  keys,
  label,
  subLabel,
}: {
  keys: string[];
  label: string;
  subLabel?: string;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-zinc-900">{label}</span>
        {subLabel ? (
          <span className="text-xs text-zinc-500">{subLabel}</span>
        ) : null}
      </div>
      <KeyCombo keys={keys} />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-2.5 bg-zinc-50 border-b border-zinc-200">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
      {children}
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

function ToggleRow({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: (next: boolean) => void | Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-zinc-800">{label}</span>
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className={`relative inline-flex h-5 w-10 outline outline-zinc-300  items-center rounded-sm transition-colors overflow-hidden ${
          enabled ? "bg-zinc-950" : "bg-zinc-400 hover:bg-zinc-500 "
        }`}
        aria-pressed={enabled}
      >
        <motion.div
          animate={{ x: enabled ? "100%" : "0%" }}
          className="absolute rounded-sm z-50 left-0 h-full aspect-square bg-white flex items-center justify-center leading-0 text-center text-zinc-400"
        >
          {/* {enabled ? (
            <>
              <Minus strokeWidth="4px" className="rotate-90" size={10}></Minus>
            </>
          ) : (
            <>
              <Circle strokeWidth="4px" size={10}></Circle>
            </>
          )} */}
        </motion.div>
      </button>
    </div>
  );
}

function RowHint({ text }: { text: string }) {
  return (
    <div className="px-5 py-2 text-xs text-zinc-500 bg-zinc-50">{text}</div>
  );
}
