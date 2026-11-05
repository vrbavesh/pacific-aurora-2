"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import { Pause, Play, Plus } from "@phosphor-icons/react";
import ThemeSettings from "@/src/components/home/ThemeSettings";
import BookJourney from "./BookJourney";
import styles from "./landing.module.css";

const questions = [
  ["What is a world in Pacific Aurora?", "A world is the persistent setting behind your stories. It holds characters, places, items, relationships, and your own custom entity types. Multiple books can belong to the same world."],
  ["Can I write more than one book in a world?", "Yes. Every book belongs to one world, and a world can hold multiple books. Your world information stays connected while each book keeps its own chapters and character timelines."],
  ["Can I create my own kinds of entities?", "Yes. Alongside characters, places, and items, you can create custom sections with their own attributes for factions, species, kingdoms, or anything else your world needs."],
  ["Does AI change my writing?", "No. Suggestions can help you capture world facts from your writing. You choose whether to accept each suggestion. AI never rewrites your manuscript, and writing and saving remain available when suggestions are unavailable."],
  ["How is my writing saved?", "You save your chapters explicitly, with Save or Ctrl/Cmd+S. The Writer also keeps session drafts for recovery."],
];

export default function LandingExperience() {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  useLayoutEffect(() => {
    try {
      if (!localStorage.getItem("pacific_aurora_theme")) {
        document.documentElement.dataset.theme = "light";
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
      }
    } catch { /* The landing remains usable without storage. */ }
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motionPreference = () => setReduced(media.matches);
    const visibility = () => setTabVisible(!document.hidden);
    motionPreference(); visibility();
    media.addEventListener("change", motionPreference);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", motionPreference);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const running = !paused && !reduced && tabVisible;
  return <main className={styles.page} data-motion={running ? "running" : "paused"}>
    <a className={styles.skipLink} href="#questions">Skip the book animation</a>
    <header className={styles.header}>
      <Link href="/" aria-label="Pacific Aurora home" className={styles.logo}>Pacific Aurora</Link>
      <nav aria-label="Main navigation"><a href="#questions">Questions</a><Link href="/signin">Sign in</Link></nav>
    </header>
    <BookJourney running={running} reduced={reduced} />
    <section className={styles.questionsSection} id="questions" aria-labelledby="questions-title">
      <h2 id="questions-title">Before your first page.</h2>
      <div className={styles.questions}>{questions.map(([question, answer]) => <details key={question}>
        <summary><span>{question}</span><Plus size={20} aria-hidden /></summary><p>{answer}</p>
      </details>)}</div>
    </section>
    <footer className={styles.footer}>
      <Link href="/">Pacific Aurora</Link>
      <nav aria-label="Footer navigation"><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms and Conditions</Link></nav>
      <small>© 2026 Pacific Aurora</small>
    </footer>
    <div className={styles.appearance}>
      <button type="button" className={styles.motionButton} disabled={reduced} aria-label={reduced ? "Motion reduced by your device" : paused ? "Play motion" : "Pause motion"} onClick={() => setPaused(value => !value)}>
        {paused || reduced ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
      </button>
      <ThemeSettings compact />
    </div>
  </main>;
}
