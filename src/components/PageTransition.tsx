"use client";

import { motion, useReducedMotion } from "motion/react";
import { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -16 }}
      transition={{
        duration: reduce ? 0 : 0.45,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={reduce ? undefined : { opacity: 1 }}
      transition={{
        staggerChildren: reduce ? 0 : 0.06,
        delayChildren: reduce ? 0 : 0.1,
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.5,
        delay: reduce ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

export function GlassPanel({ children, className = "", hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={`
        relative rounded-2xl border border-white/10
        bg-white/5 backdrop-blur-2xl
        shadow-[0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]
        ${className}
      `}
      whileHover={hover && !reduce ? { scale: 1.008, y: -2, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } : undefined}
      whileTap={!reduce ? { scale: 0.995 } : undefined}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent opacity-50 pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}