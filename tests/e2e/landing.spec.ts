import { expect, test, type Page } from "@playwright/test";
import { bookTimeline } from "../../src/components/landing/book-timeline";
test.use({ reducedMotion: "no-preference" });

async function scrub(page: Page, progress: number) {
  await page.evaluate(p => {
    const root = document.querySelector('[aria-label="From a book to a world"]') as HTMLElement;
    window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY + (root.offsetHeight - innerHeight) * p, behavior: "instant" });
  }, progress);
  await expect.poll(async () => Math.abs(Number(await page.locator("canvas").getAttribute("data-book-pose")) - progress)).toBeLessThan(.005);
}

test("the landing consists only of the book story, FAQ, and footer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every story. A world within.");
  await expect(page.getByRole("link", { name: "Start writing", exact: true }).first()).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");
  await expect(page.locator("main > section")).toHaveCount(2);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("figure")).toHaveCount(0);
  await page.getByRole("link", { name: "Questions", exact: true }).click();
  await expect(page).toHaveURL(/#questions$/);
  await page.getByText("Does AI change my writing?", { exact: true }).click();
  await expect(page.getByText(/AI never rewrites your manuscript/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  await expect(page.getByRole("link", { name: "Terms and Conditions" })).toHaveAttribute("href", "/terms");
});

test("scroll reveals real content on successive book spreads and reverses it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("canvas[data-book-pose]")).toHaveCount(1);
  for (const [progress, name] of [[.415, "Writing"], [.58, "Worlds"], [.73, "Connections"], [.415, "Writing"]] as const) {
    await scrub(page, progress);
    const article = page.getByRole("article", { name: `Book page: ${name}` });
    await expect(article).toBeVisible();
    await expect(article.locator("h2")).toHaveText(name);
    await expect(page.locator("canvas")).toHaveAttribute("data-book-spread", String(["Writing", "Worlds", "Connections"].indexOf(name)));
    expect(await article.evaluate(element => element.closest('[style*="matrix3d"]') !== null)).toBe(true);
  }
  await scrub(page, 1);
  await expect(page.getByRole("heading", { name: "The world is yours." })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("pause freezes the current book rather than removing the page contents", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas[data-book-pose]")).toHaveCount(1);
  await scrub(page, .415);
  await page.getByRole("button", { name: "Pause motion" }).click();
  const pose = await page.locator("canvas").getAttribute("data-book-pose");
  await expect(page.locator("main")).toHaveAttribute("data-motion", "paused");
  await expect(page.getByRole("article", { name: "Book page: Writing" })).toBeVisible();
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "instant" }));
  await expect(page.locator("canvas")).toHaveAttribute("data-book-pose", pose!);
  await page.getByRole("button", { name: "Play motion" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-motion", "running");
});

test("the dark finale keeps a contrasting ground behind its invitation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("canvas[data-book-pose]")).toHaveCount(1);
  await scrub(page, 1);
  const finale = page.getByRole("heading", { name: "The world is yours." }).locator("..");
  await expect(finale).toBeVisible();
  const colors = await finale.evaluate(element => ({
    text: getComputedStyle(element).color,
    ground: getComputedStyle(element, "::before").backgroundImage,
  }));
  expect(colors.text).toBe("rgb(241, 240, 235)");
  expect(colors.ground).toContain("rgb(22, 26, 26) 60px");
  const action = finale.getByRole("link", { name: "Start writing" });
  await action.focus();
  await expect(action).toBeFocused();
});

test("reduced motion exposes all feature pages without WebGL", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Motion reduced by your device" })).toBeDisabled();
    for (const name of ["Writing", "Worlds", "Connections"]) await expect(page.getByRole("article", { name: `Book page: ${name}` })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("the reading page stays within the mobile viewport", async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator("canvas[data-book-pose]")).toHaveCount(1);
    await scrub(page, .58);
    const article = page.getByRole("article", { name: "Book page: Worlds" });
    await expect(article).toBeVisible();
    const box = await article.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-5);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("content fades on a stationary spread before the turn and invitations remain operable", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas[data-book-pose]")).toHaveCount(1);
  await scrub(page, .39);
  const first = await page.locator("canvas").getAttribute("data-book-camera");
  await scrub(page, .42);
  await expect(page.locator("canvas")).toHaveAttribute("data-book-camera", first!);
  await scrub(page, .46);
  await expect(page.locator("canvas")).not.toHaveAttribute("data-book-camera", first!);
  for (const progress of [.09, .94]) {
    await scrub(page, progress);
    const action = page.getByRole("link", { name: "Start writing", exact: true });
    await expect(action).toHaveCount(1);
    await action.focus();
    await expect(action).toBeFocused();
    expect(await action.evaluate(element => element.closest("[inert]") === null)).toBe(true);
  }
});

test("rapid reversals keep page content on the rendered book clock", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas[data-book-pose]")).toHaveCount(1);
  for (const target of [.73, .25, .58, .415, .8, .58]) {
    await page.evaluate(p => {
      const root = document.querySelector('[aria-label="From a book to a world"]') as HTMLElement;
      window.scrollTo({ top: root.offsetTop + (root.offsetHeight - innerHeight) * p, behavior: "instant" });
    }, target);
    for (let sample = 0; sample < 4; sample++) {
      const state = await page.evaluate(async () => {
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        const canvas = document.querySelector("canvas")!;
        return { pose: Number(canvas.dataset.bookPose), spread: Number(canvas.dataset.bookSpread), title: document.querySelector('[data-book-page]:not([hidden]) article[data-side="right"] h2')?.textContent ?? null };
      });
      const boundaries = [.355, .43, .535, .61, .695, .77];
      if (boundaries.some(boundary => Math.abs(boundary - state.pose) < .008)) continue;
      const expected = bookTimeline(state.pose).spread;
      expect(state.spread).toBe(expected);
      expect(state.title).toBe(expected < 0 ? null : ["Writing", "Worlds", "Connections"][expected]);
    }
  }
});

test("opening pages follow the cover, then each spread fades completely before turning", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator("canvas[data-book-pose]")).toHaveCount(1);
    const angles: number[] = [];
    for (const progress of [.27, .32, .355]) {
      await scrub(page, progress);
      const state = await page.locator("canvas").evaluate(element => ({
        page: Number(element.dataset.bookPageAngle), cover: Number(element.dataset.bookCoverAngle),
      }));
      expect(state.cover - state.page).toBeCloseTo(Math.PI, 2);
      angles.push(state.page);
    }
    expect(angles[1] - angles[0]).toBeGreaterThan(1);
    expect(Math.abs(angles[2])).toBeLessThan(.025);
    for (const [index, start, peak, end] of [[0, .355, .37, .43], [1, .535, .55, .61], [2, .695, .71, .77]]) {
      const content = page.locator(`[data-book-page="${index}"]`).filter({ has: page.locator('article[data-side="right"]') });
      await scrub(page, (start + peak) / 2);
      await expect.poll(async () => Number(await content.evaluate(element => getComputedStyle(element).opacity))).toBeGreaterThan(.25);
      expect(Number(await content.evaluate(element => getComputedStyle(element).opacity))).toBeLessThan(.75);
      await scrub(page, peak);
      await expect.poll(async () => Number(await content.evaluate(element => getComputedStyle(element).opacity))).toBeGreaterThan(.98);
      await scrub(page, peak + .015);
      await expect.poll(async () => Number(await content.evaluate(element => getComputedStyle(element).opacity))).toBeLessThan(.9);
      expect((await page.locator("canvas").getAttribute("data-book-turns"))!.split(",").map(Number).every(turn => turn === 0 || turn === 1)).toBe(true);
      await scrub(page, end + .015);
      await expect(content).toBeHidden();
      await expect(page.getByRole("article")).toHaveCount(0);
      expect((await page.locator("canvas").getAttribute("data-book-turns"))!.split(",").map(Number).some(turn => turn > 0 && turn < 1)).toBe(true);
      await scrub(page, peak);
      await expect.poll(async () => Number(await content.evaluate(element => getComputedStyle(element).opacity))).toBeGreaterThan(.98);
    }
  }
});

test("pause freezes an in-flight pose and a runtime reduced-motion change exposes the pages", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("canvas[data-book-pose]")).toHaveCount(1);
  await scrub(page, .49);
  await page.getByRole("button", { name: "Pause motion" }).click();
  const pose = await page.locator("canvas").getAttribute("data-book-pose");
  await page.evaluate(() => window.scrollBy({ top: 1200, behavior: "instant" }));
  await page.evaluate(() => new Promise<void>(resolve => { let n = 0; const frame = () => ++n > 12 ? resolve() : requestAnimationFrame(frame); frame(); }));
  await expect(page.locator("canvas")).toHaveAttribute("data-book-pose", pose!);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("canvas")).toHaveCount(0);
  for (const name of ["Writing", "Worlds", "Connections"]) await expect(page.getByRole("article", { name: `Book page: ${name}` })).toBeVisible();
  await page.waitForTimeout(650); // R3F releases its renderer after the DOM unmount.
  expect(errors).toEqual([]);
});

test("unavailable WebGL preserves all product content and signup", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { value: function(this: HTMLCanvasElement, name: string, ...args: unknown[]) {
      return name.startsWith("webgl") ? null : Reflect.apply(original, this, [name, ...args]);
    } });
  });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(0);
  for (const name of ["Writing", "Worlds", "Connections"]) await expect(page.getByRole("article", { name: `Book page: ${name}` })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start writing", exact: true }).first()).toHaveAttribute("href", "/signup");
});
