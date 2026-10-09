"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ApiRequestError } from "@/src/lib/api/client";
import type { World } from "@/src/lib/api/generated";

export type CreateBookChoice =
  | { mode: "existing"; worldId: string }
  | { mode: "new"; worldName: string };

interface CreateBookDialogProps {
  open: boolean;
  worlds: World[];
  onSubmit: (name: string, choice: CreateBookChoice) => Promise<void>;
  onCancel: () => void;
}

const optionClass = (selected: boolean) =>
  `flex-1 border p-3 text-left transition ${
    selected
      ? "border-[#2dd4bf]/55 bg-[#2dd4bf]/[0.07]"
      : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
  }`;

export default function CreateBookDialog({ open, worlds, onSubmit, onCancel }: CreateBookDialogProps) {
  const reduce = useReducedMotion();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [existingWorldId, setExistingWorldId] = useState("");
  const [newWorldName, setNewWorldName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setNewWorldName("");
    setError("");
    setBusy(false);
    const firstWorld = worlds[0];
    setMode(firstWorld?.id ? "existing" : "new");
    setExistingWorldId(firstWorld?.id ?? "");
  }, [open, worlds]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  const canSubmit =
    Boolean(name.trim()) &&
    (mode === "existing" ? Boolean(existingWorldId) : Boolean(newWorldName.trim()));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(
        name.trim(),
        mode === "existing"
          ? { mode: "existing", worldId: existingWorldId }
          : { mode: "new", worldName: newWorldName.trim() },
      );
    } catch (err) {
      // A 401 is already redirecting the user to sign in; stay quiet.
      if (err instanceof ApiRequestError && err.status === 401) return;
      setError(err instanceof Error ? err.message : "The book could not be created. Please try again.");
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
            aria-label="Create a book"
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="frosted-panel relative w-full max-w-lg p-6 sm:p-7"
          >
            <h2 className="font-serif text-xl text-white">Create a book</h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              A book always belongs to a world. Choose one you already have, or start a new
              world with it.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div>
                <label
                  htmlFor="create-book-name"
                  className="block text-xs font-mono uppercase tracking-wider text-foreground-subtle"
                >
                  Book name
                </label>
                <input
                  id="create-book-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Emberfall"
                  maxLength={80}
                  autoFocus
                  disabled={busy}
                  className="input rounded-none mt-2"
                />
              </div>

              <fieldset>
                <legend className="block text-xs font-mono uppercase tracking-wider text-foreground-subtle">
                  World
                </legend>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  {worlds.length > 0 && (
                    <button
                      type="button"
                      aria-pressed={mode === "existing"}
                      onClick={() => setMode("existing")}
                      className={optionClass(mode === "existing")}
                    >
                      <span className="block text-sm text-white/85">Existing world</span>
                      <span className="mt-1 block text-[11px] leading-4 text-white/40">
                        Pick from the worlds you already have
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    aria-pressed={mode === "new"}
                    onClick={() => setMode("new")}
                    className={optionClass(mode === "new")}
                  >
                    <span className="block text-sm text-white/85">New world</span>
                    <span className="mt-1 block text-[11px] leading-4 text-white/40">
                      Start a brand new world
                    </span>
                  </button>
                </div>
              </fieldset>

              {mode === "existing" && worlds.length > 0 && (
                <div>
                  <label
                    htmlFor="create-book-world-select"
                    className="block text-xs font-mono uppercase tracking-wider text-foreground-subtle"
                  >
                    Which world
                  </label>
                  <select
                    id="create-book-world-select"
                    value={existingWorldId}
                    onChange={(event) => setExistingWorldId(event.target.value)}
                    disabled={busy}
                    className="input rounded-none mt-2"
                  >
                    {worlds.map((world) => (
                      <option key={world.id} value={world.id ?? ""}>
                        {world.name ?? ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {mode === "new" && (
                <div>
                  <label
                    htmlFor="create-book-new-world"
                    className="block text-xs font-mono uppercase tracking-wider text-foreground-subtle"
                  >
                    World name
                  </label>
                  <input
                    id="create-book-new-world"
                    type="text"
                    value={newWorldName}
                    onChange={(event) => setNewWorldName(event.target.value)}
                    placeholder="e.g. Aurora"
                    maxLength={80}
                    disabled={busy}
                    className="input rounded-none mt-2"
                  />
                </div>
              )}

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
                <button type="submit" disabled={!canSubmit || busy} className="btn btn-primary rounded-none">
                  Create book
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
