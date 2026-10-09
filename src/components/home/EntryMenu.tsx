"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DotsThreeVertical } from "@phosphor-icons/react";

export interface EntryMenuItem {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

interface EntryMenuProps {
  /** Accessible name for the trigger, e.g. "Options for Emberfall". */
  label: string;
  items: EntryMenuItem[];
}

export default function EntryMenu({ label, items }: EntryMenuProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="mr-1.5 p-1.5 text-white/35 transition hover:bg-white/[0.07] hover:text-white/80 active:scale-95"
      >
        <DotsThreeVertical size={16} weight="bold" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label={label}
            initial={reduce ? false : { opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-[var(--z-dropdown)] mt-1 w-40 origin-top-right border border-white/10 bg-[#08141f]/95 p-1 shadow-[0_20px_44px_-14px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition ${
                  item.danger
                    ? "text-red-300/90 hover:bg-red-400/10 hover:text-red-200"
                    : "text-white/75 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span className="shrink-0 opacity-80">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
