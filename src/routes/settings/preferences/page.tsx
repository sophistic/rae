import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "motion/react";

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
      <span className="text-sm text-zinc-800 font-medium">{label}</span>
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className={`relative inline-flex h-5 w-10 outline outline-zinc-300  items-center rounded-sm transition-colors overflow-hidden ${
          enabled ? "bg-zinc-950" : "bg-zinc-400 hover:bg-zinc-500 "
        }`}
        aria-pressed={enabled}
      >
        <motion.div
          initial={{ x: enabled ? "100%" : "0%" }}
          animate={{ x: enabled ? "100%" : "0%" }}
          className="absolute rounded-sm z-50 left-0 h-full aspect-square bg-white flex items-center justify-center leading-0 text-center text-zinc-400"
        ></motion.div>
      </button>
    </div>
  );
}

const Preferences = () => {
  const [autoShowOnCopy, setAutoShowOnCopy] = useState<boolean>(false);
  const [autoShowOnSelection, setAutoShowOnSelection] = useState<boolean>(false);

  useEffect(() => {
    invoke<boolean>("get_auto_show_on_copy_enabled")
      .then((v) => setAutoShowOnCopy(!!v))
      .catch(() => {});
    invoke<boolean>("get_auto_show_on_selection_enabled")
      .then((v) => setAutoShowOnSelection(!!v))
      .catch(() => {});
  }, []);

  const [darkTheme, setDarkTheme] = useState(true)

  return (
    <div className="w-full h-full bg-white text-black overflow-auto">
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        <header className="space-y-1">
          <div className="text-2xl font-semibold tracking-tight">
            Preferences
          </div>
          <p className="text-sm text-zinc-500">
            Personalize your experience.
          </p>
        </header>

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
        <Card>
          <SectionHeader title="Appearance" />
          <div className="divide-y divide-zinc-200">
            <ToggleRow
              label="Dark theme"
              enabled={darkTheme}
              onToggle={async (next) => {
                setDarkTheme(next);
                
              }}
            />
            
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Preferences;