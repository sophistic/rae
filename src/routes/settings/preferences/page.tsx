import { invoke } from "@tauri-apps/api/core";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useDarkThemeStore } from "../../../store/darkThemeStore";
import { emit } from "@tauri-apps/api/event";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-5 py-2.5 bg-background border-b border-border">
      <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">
        {title}
      </span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background">
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
      <span className="text-sm text-foreground font-medium">{label}</span>
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className={`relative inline-flex h-5 w-10 outline transition-none outline-border  items-center rounded-sm  overflow-hidden ${
          enabled ? "bg-foreground dark:bg-surface" : "bg-foreground/20 hover:bg-foreground/30 "
        }`}
        aria-pressed={enabled}
      >
        <motion.div
          initial={{ x: enabled ? "100%" : "0%" }}
          animate={{ x: enabled ? "100%" : "0%" }}
          className="absolute rounded-sm z-50 left-0 h-full aspect-square bg-background flex items-center justify-center leading-0 text-center"
        ></motion.div>
      </button>
    </div>
  );
}

const Preferences = () => {
  const [autoShowOnCopy, setAutoShowOnCopy] = useState<boolean>(false);
  const [autoShowOnSelection, setAutoShowOnSelection] = useState<boolean>(false);
  const [notchWindowDisplay, setNotchWindowDisplay] = useState<boolean>(true);

  useEffect(() => {
    invoke<boolean>("get_auto_show_on_copy_enabled")
      .then((v) => setAutoShowOnCopy(!!v))
      .catch(() => {});
    invoke<boolean>("get_auto_show_on_selection_enabled")
      .then((v) => setAutoShowOnSelection(!!v))
      .catch(() => {});
    invoke<boolean>("get_notch_window_display_enabled")
      .then((v) => setNotchWindowDisplay(!!v))
      .catch(() => {});
  }, []);

  const { darkTheme, setDarkTheme, initializeTheme } = useDarkThemeStore();

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  const [gradient, setGradient] = useState<boolean>(localStorage.getItem("gradient") === "true")

  return (
    <div className="w-full h-full bg-background text-foreground  overflow-y-auto">
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
          <div className="divide-y divide-border">
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
          <div className="divide-y divide-border">
            <ToggleRow
              label="Dark theme"
              enabled={darkTheme}
              onToggle={async (next) => {
                
                setDarkTheme(next);
              }}
            />
            <ToggleRow
              label="Gradient in notch"
              enabled={gradient}
              onToggle={async (next) => {
                localStorage.setItem("gradient", String(next))
                emit("gradient_changed", { gradient: next })
                setGradient(next)
              }}
            />
            <ToggleRow
              label="Show window info in notch"
              enabled={notchWindowDisplay}
              onToggle={async (next) => {
                setNotchWindowDisplay(next);
                try {
                  await invoke("set_notch_window_display_enabled", {
                    enabled: next,
                  });
                  emit("notch_window_display_changed", next);
                } catch (_) {}
              }}
            />
            {/* <ToggleRow
              label="Gradient in notch"
              enabled={darkTheme}
              onToggle={async (next) => {
                setDarkTheme(next);
              }}
            /> */}
            
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Preferences;