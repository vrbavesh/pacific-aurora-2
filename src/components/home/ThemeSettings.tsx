"use client";

import { useEffect, useRef, useState } from "react";
import { GearSix, Moon, Sun, X } from "@phosphor-icons/react";

const STORAGE_KEY = "pacific_aurora_theme";
type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export default function ThemeSettings({ compact = false }: { compact?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      applyTheme(event.newValue === "light" ? "light" : "dark");
      sync();
    };
    sync();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The current tab still honors the choice when storage is unavailable.
    }
  };

  if (compact) {
    const next = theme === "dark" ? "light" : "dark";
    return (
      <button
        type="button"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface-wash text-foreground-muted transition hover:border-accent/40 hover:text-foreground active:scale-[0.98]"
        aria-label={`Switch to ${next} theme`}
        title={`Switch to ${next} theme`}
        onClick={() => choose(next)}
      >
        {next === "light" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      </button>
    );
  }

  return (
    <div className="border-t border-border p-4">
      <button
        ref={trigger}
        type="button"
        className="flex min-h-11 w-full items-center gap-3 px-3 text-sm text-foreground-muted transition-colors hover:bg-background-card hover:text-foreground"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <GearSix size={18} aria-hidden="true" />
        Settings
      </button>
      <dialog
        ref={dialog}
        className="theme-settings-dialog"
        aria-labelledby="appearance-title"
        onClose={() => trigger.current?.focus()}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 id="appearance-title" className="font-serif text-2xl text-foreground">Settings</h2>
            <p className="mt-1 text-sm text-foreground-muted">Choose how your workspace looks.</p>
          </div>
          <button type="button" className="ws-button" aria-label="Close settings" onClick={() => dialog.current?.close()}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <fieldset className="mt-5">
          <legend className="mb-3 text-sm font-medium text-foreground">Appearance</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["light", "dark"] as const).map((option) => (
              <label key={option} className="theme-choice">
                <input
                  type="radio"
                  name="appearance"
                  value={option}
                  checked={theme === option}
                  onChange={() => choose(option)}
                />
                {option === "light" ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
                <span>{option === "light" ? "Light" : "Dark"}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="mt-4 text-xs text-foreground-muted">Saved on this browser.</p>
      </dialog>
    </div>
  );
}
