"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import AuroraBackground from "@/src/components/AuroraBackground";

export default function LandingPage() {
  const { scrollY } = useScroll();

  const heroY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.3]);

  return (
    <main className="relative flex min-h-screen flex-col px-6 py-6 sm:px-12 sm:py-10">
      <AuroraBackground />

      {/* 1. NAVIGATION */}
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 text-sm font-medium tracking-widest uppercase text-[#9ac8c0]">
          <span className="h-2 w-2 rounded-full bg-[#2dd4bf]" />
          Pacific Aurora
        </Link>
        <nav className="flex items-center gap-6 text-xs uppercase tracking-widest text-white/80">
          <a href="#how-it-works" className="hover:text-white transition">How it works</a>
          <Link href="/signin" className="hover:text-white transition">Sign in</Link>
          <Link href="/signup" className="rounded-full bg-[#2dd4bf] px-5 py-2 text-[#020a14] font-bold hover:bg-[#2bd0c9] transition">Start writing</Link>
        </nav>
      </header>

      {/* 2. HERO */}
      <section className="flex-1 flex flex-col items-center justify-center text-center mt-20 max-w-5xl mx-auto">
        <motion.h1 style={{ y: heroY, opacity: heroOpacity }} className="text-5xl sm:text-7xl font-serif italic leading-tight text-white">
          Write the story.<br />Keep the world alive.
        </motion.h1>
        <p className="mt-6 text-lg text-[#bef7eb] max-w-2xl">
          Pacific Aurora lets you build the full world behind your fiction — every character, place, item, and custom fact — and then write your books directly inside that world, so nothing drifts out of sync.
        </p>
        <div className="mt-10 flex gap-4">
          <Link href="/signup" className="rounded-full bg-[#2dd4bf] px-8 py-4 text-[#020a14] font-bold text-sm uppercase tracking-wider">Start writing</Link>
          <a href="#how-it-works" className="rounded-full border border-white/20 px-8 py-4 text-sm uppercase tracking-wider text-white/80 hover:bg-white/5 transition">How it works</a>
        </div>
      </section>

      {/* 3. PRODUCT PREVIEW */}
      <section className="max-w-6xl mx-auto w-full mt-24 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-2xl font-serif italic text-white">An actual glimpse of the workflow</h2>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-[#b8e9dc]">
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-white font-semibold mb-2">World: Aurora</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Characters</li>
              <li>Places</li>
              <li>Items</li>
              <li>Custom sections</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-white font-semibold mb-2">Books</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>The Beginning</li>
              <li>Emberfall</li>
              <li>The Drift</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-white font-semibold mb-2">Current Book</p>
            <div className="rounded-lg bg-black/40 p-3">
              <p className="text-white leading-relaxed italic">&ldquo;The terminal dings softly as Adaeze sets the prototype down.&rdquo;</p>
              <p className="mt-3 text-[#2dd4bf] font-mono text-xs">Editor mode active</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="max-w-5xl mx-auto w-full mt-20 space-y-12">
        <h2 className="text-3xl font-serif italic text-white">How it works</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 p-5">
            <h3 className="text-white font-semibold mb-2">Page structure</h3>
            <p className="text-sm text-[#a5d8cd]">A clean map of the platform: worlds, books, chapters, and entities stay bound to one another so design research never lives in a separate app.</p>
          </div>
          <div className="rounded-xl border border-white/10 p-5">
            <h3 className="text-white font-semibold mb-2">Walking the process</h3>
            <p className="text-sm text-[#a5d8cd]">Front page, overview, worlds, books, chapters: a clear subdivision so you can drop into any stage without hunting.</p>
          </div>
          <div className="rounded-xl border border-white/10 p-5">
            <h3 className="text-white font-semibold mb-2">What you create here</h3>
            <p className="text-sm text-[#a5d8cd]">Characters, places, items, and custom sections—each as a fully fleshed object, not a static note.</p>
          </div>
        </div>
      </section>

      {/* 5. BUILDING THE STORY INFRASTRUCTURE */}
      <section className="max-w-5xl mx-auto w-full mt-16">
        <h2 className="text-2xl font-serif italic text-white">Building the story infrastructure</h2>
        <p className="mt-4 text-[#b8e9dc]">Set up the page structure and editor grouping so your writing flows naturally. Define the outline of the page first, then assign content to each block.</p>
      </section>

      {/* 6. STRATEGY MAP */}
      <section className="max-w-5xl mx-auto w-full mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {["Universe", "Book", "Chapter", "Words"].map((label) => (
          <div key={label} className="rounded-lg border border-white/10 py-4">
            <span className="text-white font-semibold">{label}</span>
          </div>
        ))}
      </section>

      {/* 7. EDITOR & ASSETS */}
      <section className="max-w-5xl mx-auto w-full mt-12 grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-white font-semibold mb-2">Editor & assets</h3>
          <p className="text-sm text-[#a5d8cd]">Embed editor docs, outline tasks, and linked items directly in the page so research and prose never split apart.</p>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-2">Basic page items</h3>
          <p className="text-sm text-[#a5d8cd]">Add any tool widget, embed URL, or reference asset from the content library to any work page.</p>
        </div>
      </section>

      {/* 8. PROJECT TRACKING */}
      <section className="max-w-5xl mx-auto w-full mt-16">
        <h2 className="text-2xl font-serif italic text-white">Project tracking</h2>
        <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
          {["To Do", "In Progress", "Done"].map((c) => (
            <div key={c} className="rounded-lg border border-white/10 p-3">
              <p className="text-white mb-2">{c}</p>
              <div className="h-24 rounded bg-white/5" />
            </div>
          ))}
        </div>
      </section>

      {/* 9. SECTIONS AND LISTS */}
      <section className="max-w-5xl mx-auto w-full mt-16">
        <h2 className="text-2xl font-serif italic text-white">Sections and lists</h2>
        <p className="mt-2 text-[#a5d8cd]">Toggle any workspace between outline, spec-sheet, and notebook-mode writes.</p>
      </section>

      {/* 10. TIME ZONES & SCHEDULES */}
      <section className="max-w-5xl mx-auto w-full mt-16">
        <h2 className="text-2xl font-serif italic text-white">Time zones & schedules</h2>
        <p className="mt-2 text-[#a5d8cd]">Disambiguate scenes against timeline, then reorder explorations, drafts, and reviews on the same timeline.</p>
      </section>

      {/* 11. MONITORING TABLE */}
      <section className="max-w-5xl mx-auto w-full mt-16">
        <h2 className="text-2xl font-serif italic text-white">Monitoring table</h2>
        <div className="mt-4 grid grid-cols-6 gap-2 text-[10px]">
          {Array.from({length:12}).map((_,i) => (
            <div key={i} className="rounded bg-white/5 h-10"></div>
          ))}
        </div>
      </section>

      {/* 12. EXPLORE YOUR CONTENT SYSTEM */}
      <section className="max-w-5xl mx-auto w-full mt-16 border border-white/10 rounded-xl p-8 text-center">
        <h2 className="text-xl text-white">Explore your content system</h2>
        <p className="mt-2 text-[#a5d8cd]">Run your own constraint checks against the outline at any point.</p>
      </section>

      {/* 13. BOOKS AND MAGAZINE LAYOUTS */}
      <section className="max-w-5xl mx-auto w-full mt-16">
        <h2 className="text-2xl font-serif italic text-white">Books and magazine layouts</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 rounded-lg bg-white/5 border border-white/10" />)}
        </div>
      </section>

      {/* 14. INTEGRATION BUTTONS */}
      <section className="max-w-5xl mx-auto w-full mt-16">
        <h2 className="text-2xl font-serif italic text-white">Integration buttons</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Gmail','Drive','YouTube','WhatsApp','Instagram','Telegram'].map(s => (
            <span key={s} className="rounded-full border border-white/20 px-4 py-2 text-xs">{s}</span>
          ))}
        </div>
      </section>

      {/* 15. FAQ */}
      <section id="faq" className="max-w-3xl mx-auto w-full mt-20 space-y-6">
        <h2 className="text-2xl font-serif italic text-white">Common questions</h2>
        {[
          {q:'Where do I start?', a:'Create a workspace, then add a book to bind the outline.'},
          {q:'Can I import existing notes?', a:'Yes, import a spreadsheet variant or .notion file.'},
          {q:'Is my work private?', a:'Private by default with optional sharing.'},
        ].map((item,i) => (
          <details key={i} className="group rounded-lg border border-white/10 p-4">
            <summary className="cursor-pointer text-white font-medium">{item.q}</summary>
            <p className="mt-2 text-[#a5d8cd]">{item.a}</p>
          </details>
        ))}
      </section>

      {/* 16. FINAL CTA */}
      <footer className="mt-24 pt-12 border-t border-white/10 max-w-5xl mx-auto flex flex-col items-center text-center">
        <h2 className="text-2xl text-white">Ready to write?</h2>
        <Link href="/signup" className="mt-6 rounded-full bg-[#2dd4bf] px-8 py-4 text-[#020a14] font-bold uppercase tracking-widest">Start writing</Link>
        <p className="mt-6 text-xs text-white/40">© 2026 Pacific Aurora</p>
      </footer>
    </main>
  );
}
