"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AiAnalysisResult, AiApplyResult, AiEligibility, AiSuggestion, Chapter } from "@/src/lib/api/generated";
import { ApiRequestError } from "@/src/lib/api/client";
import { button, message, read, write } from "./shared";

export type WriterSnapshot = { wordCount: number; windowText: string; revision: number };
type Card = { chapterId: string; suggestion: AiSuggestion };

const path = (bookId: string, chapterId: string) =>
  `/api/books/${bookId}/chapters/${chapterId}/ai-suggestions`;

export default function WriterSuggestions({ bookId, chapters, activeChapterId, openChapterIds, snapshots, visible }: {
  bookId: string;
  chapters: Chapter[];
  activeChapterId?: string;
  openChapterIds: string[];
  snapshots: Record<string, WriterSnapshot>;
  visible: boolean;
}) {
  const cache = useQueryClient();
  const [cards, setCards] = useState<Card[]>([]);
  const [eligibility, setEligibility] = useState<AiEligibility>();
  const [status, setStatus] = useState("Ideas will appear here as you write.");
  const [applyingId, setApplyingId] = useState<string>();
  const [expanded, setExpanded] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [retryTick, setRetryTick] = useState(0);
  const activeRef = useRef(activeChapterId);
  const openRef = useRef(openChapterIds);
  const snapshotsRef = useRef(snapshots);
  const inFlight = useRef(false);
  activeRef.current = activeChapterId;
  openRef.current = openChapterIds;
  snapshotsRef.current = snapshots;

  useEffect(() => {
    setCards((previous) => previous.filter((card) => openChapterIds.includes(card.chapterId)));
  }, [openChapterIds]);

  useEffect(() => {
    if (!visible || !activeChapterId) return;
    let current = true;
    setEligibility(undefined);
    void read<AiEligibility>(`${path(bookId, activeChapterId)}/eligibility`)
      .then((result) => { if (current) setEligibility(result); })
      .catch((error) => { if (current) setStatus(message(error)); });
    return () => { current = false; };
  }, [bookId, activeChapterId, visible]);

  const nextEligibleAt = eligibility?.nextEligibleAt;
  useEffect(() => {
    if (!nextEligibleAt || !visible) return;
    const remaining = new Date(nextEligibleAt).getTime() - Date.now();
    if (remaining <= 0) return;
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const retry = window.setTimeout(() => setRetryTick((value) => value + 1), remaining + 50);
    return () => { window.clearInterval(clock); window.clearTimeout(retry); };
  }, [nextEligibleAt, visible]);

  const snapshot = activeChapterId ? snapshots[activeChapterId] : undefined;
  useEffect(() => {
    if (!visible || !activeChapterId || !snapshot) return;
    const chapterId = activeChapterId;
    const paused = window.setTimeout(async () => {
      if (activeRef.current !== chapterId || !openRef.current.includes(chapterId)) return;
      if (snapshot.wordCount < 500) {
        setStatus(chapters.length === 1 && snapshot.wordCount > 0
          ? "Keep writing. The ideas need a little more to work with."
          : "Ideas begin after 500 words.");
        return;
      }
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const current = await read<AiEligibility>(`${path(bookId, chapterId)}/eligibility`);
        if (!openRef.current.includes(chapterId)) return;
        if (activeRef.current === chapterId) setEligibility(current);
        const milestone = Math.floor(snapshot.wordCount / 500);
        if (current.nextEligibleAt && new Date(current.nextEligibleAt).getTime() > Date.now()) {
          setStatus("Ideas are cooling down.");
          return;
        }
        if (activeRef.current !== chapterId || !openRef.current.includes(chapterId)) return;
        setStatus("Finding ideas...");
        const result = await write<AiAnalysisResult>(path(bookId, chapterId), "POST", {
          text: snapshot.windowText,
          wordCount: snapshot.wordCount,
          milestone,
          checkpointVersion: current.checkpointVersion,
        });
        if (!openRef.current.includes(chapterId)) return;
        setEligibility(result);
        setCards((previous) => {
          const existing = new Set(previous.filter((card) => card.chapterId === chapterId)
            .map((card) => JSON.stringify([card.suggestion.kind, card.suggestion.action, card.suggestion.changes])));
          return [...previous, ...result.suggestions.filter((suggestion) =>
            !existing.has(JSON.stringify([suggestion.kind, suggestion.action, suggestion.changes])))
            .map((suggestion) => ({ chapterId, suggestion }))];
        });
        if (result.suggestions.length) setExpanded(true);
        setStatus(result.suggestions.length ? "Review each idea before applying it." : "No new ideas this time. Checking again in five minutes.");
      } catch (error) {
        if (!openRef.current.includes(chapterId)) return;
        if (error instanceof ApiRequestError && (error.status === 409 || error.status === 429)) {
          try {
            const current = await read<AiEligibility>(`${path(bookId, chapterId)}/eligibility`);
            if (activeRef.current === chapterId) setEligibility(current);
          } catch { /* Keep the original error visible. */ }
        }
        setStatus(error instanceof ApiRequestError && (error.status === 502 || error.status === 503)
          ? "Ideas are unavailable right now. Your writing and Save still work."
          : message(error));
      } finally {
        inFlight.current = false;
        if (activeRef.current !== chapterId || snapshotsRef.current[chapterId]?.revision !== snapshot.revision)
          setRetryTick((value) => value + 1);
      }
    }, 1200);
    return () => window.clearTimeout(paused);
  }, [bookId, activeChapterId, snapshot, retryTick, visible, chapters.length]);

  const accept = async (card: Card) => {
    const { chapterId, suggestion } = card;
    setApplyingId(suggestion.suggestionId);
    try {
      await write<AiApplyResult>(`${path(bookId, chapterId)}/apply`, "POST", { suggestion });
      setCards((previous) => previous.filter((entry) => entry.suggestion.suggestionId !== suggestion.suggestionId));
      if (suggestion.kind === "chapter_point") await cache.invalidateQueries({ queryKey: ["points", chapterId] });
      else if (suggestion.kind === "character_timeline_point") {
        await cache.invalidateQueries({ queryKey: ["character-timelines"] });
        await cache.invalidateQueries({ queryKey: ["character-points"] });
      } else {
        await cache.invalidateQueries({ queryKey: ["world-entities"] });
        await cache.invalidateQueries({ queryKey: ["relationships"] });
      }
      setStatus("Idea applied. Your manuscript was not changed.");
    } catch (error) {
      setStatus(message(error));
    } finally {
      setApplyingId(undefined);
    }
  };

  const decline = async (card: Card) => {
    const { chapterId, suggestion } = card;
    setApplyingId(suggestion.suggestionId);
    try {
      await write<{ declined: true }>(`${path(bookId, chapterId)}/decline`, "POST", { suggestion });
      setCards((previous) => previous.filter((entry) => entry.suggestion.suggestionId !== suggestion.suggestionId));
      setStatus("Idea declined. It will not be suggested again for this chapter.");
    } catch (error) {
      setStatus(message(error));
    } finally {
      setApplyingId(undefined);
    }
  };

  if (!visible || !activeChapterId) return null;
  const cooldown = nextEligibleAt ? Math.max(0, Math.ceil((new Date(nextEligibleAt).getTime() - now) / 1000)) : 0;
  return (
    <aside className="ws-suggestions" aria-label="Writing suggestions">
      <button className="ws-suggestions-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <span>Ideas {cards.length ? `(${cards.length})` : ""}</span>
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && <div className="ws-suggestions-body">
        <p className="text-sm text-foreground-muted" role="status">{status}</p>
        {cooldown > 0 && <p className="text-xs text-foreground-muted">Next analysis in {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, "0")}</p>}
        {cards.map((card) => {
          const { suggestion } = card;
          const chapterName = chapters.find((chapter) => chapter.id === card.chapterId)?.name ?? "Chapter";
          return <article className="ws-suggestion-card" key={suggestion.suggestionId}>
            <p className="text-xs text-foreground-muted">{chapterName} · {suggestion.kind.replaceAll("_", " ")}</p>
            <h3 className="font-medium">{suggestion.summary}</h3>
            {suggestion.sourceExcerpt && <blockquote className="ws-suggestion-excerpt">“{suggestion.sourceExcerpt}”</blockquote>}
            <dl className="ws-suggestion-changes">
              {Object.entries(suggestion.changes).map(([key, value]) => <div key={key}>
                <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
                <dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd>
              </div>)}
            </dl>
            <div className="flex gap-2">
              <button className={`${button} ws-primary`} disabled={!!applyingId} onClick={() => void accept(card)} aria-label={`Accept ${suggestion.summary}`}>
                {applyingId === suggestion.suggestionId ? "Applying..." : "Accept"}
              </button>
              <button className={button} disabled={!!applyingId} onClick={() => void decline(card)} aria-label={`Decline ${suggestion.summary}`}>
                {applyingId === suggestion.suggestionId ? "Saving..." : "Decline"}
              </button>
            </div>
          </article>;
        })}
      </div>}
    </aside>
  );
}
