import { describe, expect, it } from "vitest";
import { bookCamera, bookTimeline } from "../../src/components/landing/book-timeline";

describe("scroll-directed book", () => {
  it("lifts, opens, turns pages, settles, then grows its world", () => {
    expect(bookTimeline(0)).toMatchObject({ open: 0, lift: 0, world: 0, chapter: 0 });
    expect(bookTimeline(.2).lift).toBe(1);
    expect(bookTimeline(.415)).toMatchObject({ open: 1, world: 0, spread: 0 });
    expect(bookTimeline(.54).pages[0]).toBe(1);
    expect(bookTimeline(.54).pages[6]).toBe(0);
    expect(bookTimeline(.58).spread).toBe(1);
    expect(bookTimeline(.73).spread).toBe(2);
    expect(bookTimeline(.51).spread).toBe(-1);
    expect(bookTimeline(.88).settle).toBe(1);
    expect(bookTimeline(1)).toMatchObject({ world: 1, coverAngle: Math.PI, chapter: 7 });
    expect(bookTimeline(1).pages.every(value => value === 1)).toBe(true);
  });
  it("can scrub backwards without accumulating animation state", () => {
    const middle = bookTimeline(.52);
    bookTimeline(1);
    expect(bookTimeline(.52)).toEqual(middle);
    expect(bookTimeline(-10)).toEqual(bookTimeline(0));
    expect(bookTimeline(10)).toEqual(bookTimeline(1));
    expect(bookTimeline(NaN)).toEqual(bookTimeline(0));
    for (let index = 0; index <= 100; index++) {
      const frame = bookTimeline(index / 100);
      expect(frame.pages.every(value => value >= 0 && value <= 1)).toBe(true);
      expect(frame.world).toBeLessThanOrEqual(frame.settle);
    }
  });
  it("keeps the camera still during fades and orbits only after the content is gone", () => {
    const start = bookCamera(0, false).position;
    const lifted = bookCamera(.2, false).position;
    expect(Math.abs(Math.atan2(start[0], start[2]) - Math.atan2(lifted[0], lifted[2]))).toBeGreaterThan(.75);
    for (const narrow of [false, true]) {
      for (const [a, b] of [[.38, .42], [.56, .60], [.72, .76]]) {
        const first = bookCamera(a, narrow);
        const second = bookCamera(b, narrow);
        expect(second.position).toEqual(first.position);
        expect(first.target).toEqual(second.target);
      }
    }
    expect(bookCamera(.46, false).position[0]).toBeGreaterThan(bookCamera(.43, false).position[0] + .1);
    expect(bookCamera(.46, false).position[1]).toBeLessThan(bookCamera(.43, false).position[1] - .1);
  });
  it("turns the opening page block with the front cover", () => {
    expect(bookTimeline(.235).openingPagesAngle).toBe(-Math.PI);
    expect(bookTimeline(.355).openingPagesAngle).toBe(0);
    for (const progress of [.24, .27, .295, .32, .35]) {
      const frame = bookTimeline(progress);
      expect(frame.coverAngle - frame.openingPagesAngle).toBeCloseTo(Math.PI, 12);
      expect(frame.openingPagesAngle).toBeGreaterThan(-Math.PI);
      expect(frame.openingPagesAngle).toBeLessThan(0);
    }
  });
  it("fades in on opening and fades out on the very next scroll increment", () => {
    for (const [index, start, peak, end] of [[0, .355, .37, .43], [1, .535, .55, .61], [2, .695, .71, .77]]) {
      expect(bookTimeline(start).contentOpacity[index]).toBe(0);
      expect(bookTimeline((start + peak) / 2).contentOpacity[index]).toBeCloseTo(.5);
      expect(bookTimeline(peak).contentOpacity[index]).toBe(1);
      expect(bookTimeline(peak + .001).contentOpacity[index]).toBeLessThan(1);
      expect(bookTimeline((peak + end) / 2).contentOpacity[index]).toBeCloseTo(.5);
      expect(bookTimeline(end).contentOpacity[index]).toBe(0);
    }
    for (let step = 355; step < 860; step++) {
      const current = bookTimeline(step / 1000), next = bookTimeline((step + 1) / 1000);
      expect(current.contentOpacity.some((value, index) => value !== next.contentOpacity[index]) || current.pages.some((value, index) => value !== next.pages[index])).toBe(true);
    }
  });
  it("never turns a page with visible content or reveals content before a spread is open", () => {
    for (let step = 0; step <= 10000; step++) {
      const frame = bookTimeline(step / 10000);
      if (frame.contentOpacity.some(opacity => opacity > 0)) {
        expect(frame.open).toBe(1);
        expect(frame.pages.every(turn => turn === 0 || turn === 1)).toBe(true);
      }
      if (frame.pages.some(turn => turn > 0 && turn < 1)) {
        expect(frame.contentOpacity).toEqual([0, 0, 0]);
        expect(frame.spread).toBe(-1);
      }
    }
  });
  it("keeps visible invitations available during their fades", () => {
    expect(bookTimeline(.09).introVisible).toBe(true);
    expect(bookTimeline(.12).introVisible).toBe(false);
    expect(bookTimeline(.92).finaleVisible).toBe(false);
    expect(bookTimeline(.94).finaleVisible).toBe(true);
  });
});
