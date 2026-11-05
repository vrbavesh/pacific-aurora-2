const clamp = (value: number) => Math.min(1, Math.max(0, value));
const segment = (p: number, start: number, end: number) => {
  const t = clamp((p - start) / (end - start));
  return t * t * (3 - 2 * t);
};

export const bookChapters = ["Begin", "Lift", "Open", "Writing", "Worlds", "Connections", "Reveal", "Your world"] as const;
export const chapterProgress = [0, .18, .3, .37, .55, .71, .9, 1] as const;
export const bookSpreads = [
  { title: "Stay with the story.", heading: "A place for every chapter.", body: "Write your book with the world close at hand.", details: [["Make the words yours.", "Format your manuscript, organize chapters, and keep the sentence in front of you."], ["Save deliberately.", "Explicit Save, Ctrl/Cmd+S, and session drafts for recovery."]] },
  { title: "Keep a world within.", heading: "More than a collection of notes.", body: "The people, places, and things in your stories share one connected home.", details: [["Remember the details.", "Characters, places, items, and your own custom entity types."], ["Return in another book.", "One persistent world can hold many books."]] },
  { title: "Pull a single thread.", heading: "See how everything connects.", body: "Keep relationships and histories in view as the story changes.", details: [["Follow your characters.", "Map relationships and record character events chapter by chapter."], ["Stay in control.", "AI suggests world facts from your prose. Only your explicit acceptance applies them."]] },
] as const;

// Finish each fade before turning; reveal the next spread only after it lands.
export function bookTimeline(progress: number) {
  const p = clamp(Number.isFinite(progress) ? progress : 0);
  const lift = segment(p, .07, .2);
  const open = segment(p, .235, .355);
  const settle = segment(p, .805, .88);
  const world = segment(p, .875, .975);
  const contentOpacity = [[.355, .37, .43], [.535, .55, .61], [.695, .71, .77]].map(([start, peak, end]) =>
    clamp((p - start) / (peak - start)) * (1 - clamp((p - peak) / (end - peak))),
  );
  const spread = contentOpacity.findIndex(opacity => opacity > 0);
  const reading = segment(p, .31, .37) * (1 - segment(p, .79, .84));
  return {
    progress: p, lift, open, settle, world, spread, reading, contentOpacity,
    introVisible: p < .12,
    sideVisible: p > .075 && p < .3,
    finaleVisible: p > .92,
    chapter: p < .07 ? 0 : p < .235 ? 1 : p < .365 ? 2 : p < .535 ? 3 : p < .695 ? 4 : p < .805 ? 5 : p < .975 ? 6 : 7,
    coverAngle: Math.PI * open,
    openingPagesAngle: Math.PI * (open - 1),
    height: -.15 + lift * 1.2 - open * .5 - settle * .7,
    yaw: -.28 + lift * .58 - open * .3 - settle * .2,
    pitch: .05 + lift * .17 - open * .22,
    pages: [[.43, .495], [.46, .535], [.61, .665], [.63, .695], [.77, .815], [.79, .84], [.815, .86]].map(([start, end]) => segment(p, start, end)),
  };
}

// Keep the spread still for its fades; orbit only while its blank leaves turn.
export function bookCamera(progress: number, narrow: boolean) {
  const pose = bookTimeline(progress);
  const sweep = Math.max(...pose.pages.map(turn => Math.sin(turn * Math.PI)));
  const angle = .56 - pose.lift * .88 + pose.open * .62 + pose.settle * .25;
  const radius = 9.4 - pose.lift * .7 + pose.settle * (narrow ? .7 : 1.6);
  const focus = narrow ? 1.05 : .28;
  return {
    position: [
      Math.sin(angle) * radius * (1 - pose.reading) + focus * pose.reading + sweep * (narrow ? .12 : .65),
      (6.8 + pose.lift * .7 + pose.settle * (narrow ? -.55 : .05)) * (1 - pose.reading) + 8.4 * pose.reading - sweep * .45,
      Math.cos(angle) * radius * (1 - pose.reading) + (narrow ? 1.9 : 2.7) * pose.reading + sweep * .6,
    ] as [number, number, number],
    target: [narrow ? pose.reading * 1.05 : 0, narrow ? .65 - pose.settle * 1.4 : -.1 - pose.settle * .7, 0] as [number, number, number],
  };
}
