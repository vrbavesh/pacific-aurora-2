"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";
import BookSpread from "./BookSpread";
import { bookChapters, bookSpreads, bookTimeline, chapterProgress } from "./book-timeline";
import styles from "./book-journey.module.css";

const BookScene = dynamic(() => import("./BookScene"), { ssr: false });

export default function BookJourney({ running, reduced }: { running: boolean; reduced: boolean }) {
  const root = useRef<HTMLElement>(null);
  const [beat, setBeat] = useState(() => bookTimeline(0));
  const [inView, setInView] = useState(true);
  const [failed, setFailed] = useState(false);
  const sceneReady = useCallback(() => setFailed(false), []);
  const sceneFailed = useCallback(() => setFailed(true), []);
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end end"] });
  const target = useMotionValue(0);
  const score = useMotionValue(0);
  const staticLayout = reduced || failed;
  useMotionValueEvent(score, "change", p => {
    const pose = bookTimeline(p);
    if (beat.chapter !== pose.chapter || beat.introVisible !== pose.introVisible || beat.sideVisible !== pose.sideVisible || beat.finaleVisible !== pose.finaleVisible) {
      // Bridge only discrete accessibility changes from the external 3D frame.
      flushSync(() => setBeat(pose));
    }
  });
  useMotionValueEvent(scrollYProgress, "change", p => { if (running && inView) target.set(p); });
  useEffect(() => { if (running && inView) target.set(scrollYProgress.get()); }, [running, inView, target, scrollYProgress]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const introOpacity = useTransform(score, [0, .07, .12, .24], [1, 1, 0, 0]);
  const introTransform = useTransform(score, [0, .12], ["translate3d(0,0,0)", "translate3d(-15%,0,0)"]);
  const sideOpacity = useTransform(score, [.075, .13, .235, .30], [0, 1, 1, 0]);
  const leftTransform = useTransform(score, [.08, .18, .3], ["translate3d(-25%,0,0)", "translate3d(0,0,0)", "translate3d(-20%,0,0)"]);
  const rightTransform = useTransform(score, [.08, .18, .3], ["translate3d(25%,0,0)", "translate3d(0,0,0)", "translate3d(20%,0,0)"]);
  const finaleOpacity = useTransform(score, [.92, .975, 1], [0, 1, 1]);
  const finaleTransform = useTransform(score, [.92, 1], ["translate3d(0,45px,0)", "translate3d(0,0,0)"]);
  const jump = (index: number) => {
    if (!root.current) return;
    const top = root.current.getBoundingClientRect().top + window.scrollY;
    target.set(chapterProgress[index]); score.set(chapterProgress[index]);
    window.scrollTo({ top: top + (root.current.offsetHeight - innerHeight) * chapterProgress[index], behavior: "instant" });
  };

  return <section ref={root} className={styles.journey} data-static={staticLayout} data-book-chapter={bookChapters[beat.chapter]} aria-label="From a book to a world">
    <p className={styles.srOnly}>A white book rises from a white board. Its pages introduce Writing, Worlds, and Connections, then a castle grows from the final spread. Scrolling reverses the scene. Use the chapter controls or skip directly to questions.</p>
    <div className={styles.stage}>
      {!staticLayout && <div className={styles.scene}><BookScene progress={target} renderedProgress={score} running={running && inView} onReady={sceneReady} onFailure={sceneFailed} /></div>}
      <motion.div className={styles.intro} style={staticLayout ? undefined : { opacity: introOpacity, transform: introTransform }} aria-hidden={!staticLayout && !beat.introVisible} inert={!staticLayout && !beat.introVisible}>
        <h1>Every story.<br />{" "}A world within.</h1>
        <p>Write your book.<br />Build everything inside it.</p>
        <Link className={styles.primary} href="/signup">Start writing <ArrowRight size={18} aria-hidden /></Link>
      </motion.div>
      {!staticLayout && <>
        <motion.div className={`${styles.side} ${styles.left}`} style={{ opacity: sideOpacity, transform: leftTransform }} aria-hidden={!beat.sideVisible}>
          <h2>A place<br />to write.</h2><p>Stay with the sentence<br />in front of you.</p>
        </motion.div>
        <motion.div className={`${styles.side} ${styles.right}`} style={{ opacity: sideOpacity, transform: rightTransform }} aria-hidden={!beat.sideVisible}>
          <h2>A world<br />to build.</h2><p>Keep every person, place,<br />and possibility connected.</p>
        </motion.div>
        <motion.div className={styles.finale} style={{ opacity: finaleOpacity, transform: finaleTransform }} aria-hidden={!beat.finaleVisible} inert={!beat.finaleVisible}>
          <h2>The world is yours.</h2><p>One world. As many stories as you can imagine.</p>
          <Link className={styles.primary} href="/signup">Start writing <ArrowRight size={18} aria-hidden /></Link>
        </motion.div>
      </>}
    </div>
    {staticLayout && <div className={styles.staticSpreads}>{bookSpreads.map((_, index) => <BookSpread key={index} index={index} />)}<div className={styles.staticFinale}><h2>The world is yours.</h2><Link className={styles.primary} href="/signup">Start writing <ArrowRight size={18} aria-hidden /></Link></div></div>}
    {!staticLayout && <nav className={styles.chapterNav} aria-label="Book journey chapters">{bookChapters.map((name, index) => <button key={name} type="button" aria-label={name} aria-current={beat.chapter === index ? "step" : undefined} onClick={() => jump(index)}>{name}</button>)}</nav>}
  </section>;
}
