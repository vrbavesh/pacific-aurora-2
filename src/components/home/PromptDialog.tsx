"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ApiRequestError } from "@/src/lib/api/client";

interface PromptDialogProps {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  onSubmit: (value: string) => Promise<void>;
  onCancel: () => void;
}

export default function PromptDialog({
  open,
  title,
  label,
  placeholder,
  initialValue = "",
  submitLabel = "Save",
  onSubmit,
  onCancel,
}: PromptDialogProps) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setBusy(false);
      setError("");
    }
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(trimmed);
    } catch (err) {
      // A 401 is already redirecting the user to sign in; stay quiet.
      if (err instanceof ApiRequestError && err.status === 401) return;
      setError(err instanceof Error ? err.message : "That did not go through. Please try again.");
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => {
              if (!busy) onCancel();
            }}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="frosted-panel relative w-full max-w-md p-6"
          >
            <h2 className="font-serif text-xl text-white">{title}</h2>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="prompt-dialog-input"
                  className="block text-xs font-mono uppercase tracking-wider text-foreground-subtle"
                >
                  {label}
                </label>
                <input
                  id="prompt-dialog-input"
                  type="text"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={placeholder}
                  maxLength={80}
                  autoFocus
                  disabled={busy}
                  className="input rounded-none mt-2"
                />
              </div>

              {error && (
                <div className="calm-notice p-3 text-xs leading-5 text-white/95">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={busy}
                  className="btn btn-secondary rounded-none"
                >
                  Cancel
                </button>
                <button type="submit" disabled={busy || !value.trim()} className="btn btn-primary rounded-none">
                  {submitLabel}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
