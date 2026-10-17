import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function fixture(page: Page, incomplete = false, initialText = "The tide returned.") {
  const requests: {
    path: string;
    method: string;
    body: Record<string, unknown>;
  }[] = [];
  const chapters = [
    {
      id: "chapter-1",
      bookId: "book-1",
      name: "Introduction",
      position: 0,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: initialText }],
          },
        ],
      },
    },
    {
      id: "chapter-2",
      bookId: "book-1",
      name: "Across the bay",
      position: 1,
      content: { type: "doc", content: [{ type: "paragraph" }] },
    },
  ];
  const books = [{ id: "book-1", worldId: "world-1", name: "The Far Shore" }];
  const worlds = [{ id: "world-1", name: "The Tide Isles" }];
  await page.addInitScript(() =>
    localStorage.setItem("pacific_aurora_token", "test-session"),
  );
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const body = request.postDataJSON() as Record<string, unknown> | null;
    if (method !== "GET") requests.push({ path, method, body: body ?? {} });
    let data: unknown = [];
    if (path === "/api/auth/session")
      data = {
        user: { id: "author" },
        profile: {
          username: "Mira",
          userId: incomplete ? null : "mira",
          onboardingComplete: !incomplete,
        },
      };
    else if (path === "/api/books/book-1") data = books[0];
    else if (path === "/api/worlds/world-1") data = worlds[0];
    else if (path === "/api/worlds") data = worlds;
    else if (path.endsWith("/ai-suggestions/eligibility"))
      data = { completedMilestone: 0, nextEligibleAt: null, checkpointVersion: 0 };
    else if (path.endsWith("/books")) data = books;
    else if (path.endsWith("/chapters")) data = chapters;
    else if (path.endsWith("/characters"))
      data = [
        {
          entityId: "character-1",
          name: "Mira Vale",
          status: "alive",
          notes: "Navigator",
        },
        { entityId: "character-2", name: "Oren Finch", status: "alive" },
      ];
    else if (path.endsWith("/items"))
      data = [
        {
          entityId: "item-1",
          name: "Tide compass",
          wielderEntityId: "character-1",
        },
      ];
    else if (path.endsWith("/places"))
      data = [
        { entityId: "place-1", name: "North quay", lastChapterId: "chapter-1" },
      ];
    else if (method !== "GET") data = { id: "created", ...body };
    if (method === "DELETE") await route.fulfill({ status: 204 });
    else await route.fulfill({ json: { data } });
  });
  return requests;
}

test("writer saves text and preserves unsaved work between chapter tabs", async ({
  page,
}) => {
  const requests = await fixture(page);
  await page.goto("/books/book-1");
  const editor = page.getByRole("textbox", { name: "Introduction manuscript" });
  await expect(editor).toContainText("The tide returned.");
  await editor.fill("The tide returned before dawn.");
  await page
    .getByLabel("Open chapter", { exact: true })
    .selectOption("chapter-2");
  await page
    .getByRole("button", { name: "Introduction *", exact: true })
    .click();
  await expect(editor).toContainText("before dawn");
  await page
    .getByRole("button", { name: "Save", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole("status").filter({ visible: true, hasText: "Saved" })).toHaveText(
    "Saved",
  );
  expect(
    requests.some(
      (request) =>
        request.method === "PATCH" &&
        request.path.endsWith("/chapter-1") &&
        JSON.stringify(request.body.content).includes("before dawn"),
    ),
  ).toBe(true);
});

test("writer loads an old chapter and saves allowlisted formatting", async ({
  page,
}) => {
  const requests = await fixture(page);
  await page.goto("/books/book-1");
  const editor = page.getByRole("textbox", { name: "Introduction manuscript" });
  await expect(editor).toContainText("The tide returned.");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.getByRole("button", { name: "Underline", exact: true }).click();
  await page.getByRole("button", { name: "Italic", exact: true }).click();
  await page
    .getByLabel("Font family")
    .filter({ visible: true })
    .selectOption("Georgia, serif");
  await page
    .getByLabel("Font size")
    .filter({ visible: true })
    .selectOption("18px");
  await page
    .getByLabel("Text alignment")
    .filter({ visible: true })
    .selectOption("center");
  await editor.focus();
  await page.keyboard.press("ControlOrMeta+S");
  await expect(page.getByRole("status").filter({ visible: true, hasText: "Saved" })).toHaveText(
    "Saved",
  );
  const patch = requests.find(
    (request) =>
      request.method === "PATCH" && request.path.endsWith("/chapter-1"),
  );
  expect(JSON.stringify(patch?.body.content)).toContain('"type":"underline"');
  expect(JSON.stringify(patch?.body.content)).toContain('"type":"italic"');
  expect(JSON.stringify(patch?.body.content)).toContain(
    '"fontFamily":"Georgia, serif"',
  );
  expect(JSON.stringify(patch?.body.content)).toContain('"fontSize":"18px"');
  expect(JSON.stringify(patch?.body.content)).toContain('"textAlign":"center"');
});

test("writer word count updates when text is pasted", async ({ page }) => {
  await fixture(page);
  await page.goto("/books/book-1");
  const editor = page.getByRole("textbox", { name: "Introduction manuscript" });
  await expect(page.getByText("3 words", { exact: true })).toBeVisible();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate(() => navigator.clipboard.writeText("The kingdom had not seen sunlight for seventeen years."));
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Control+V");
  await expect(page.getByText("9 words", { exact: true })).toBeVisible();
});

test("settings persists light and dark themes across routes and restores focus", async ({ page }) => {
  await fixture(page);
  await page.goto("/home");
  const settings = page.getByRole("button", { name: "Settings" });
  await settings.click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name: "Light" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("pacific_aurora_theme"))).toBe("light");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(settings).toBeFocused();

  for (const route of ["/books/book-1", "/privacy", "/terms", "/signin", "/"]) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(243, 248, 247)");
  }

  const landingThemeToggle = page.getByRole("button", { name: "Switch to dark theme" });
  await landingThemeToggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("pacific_aurora_theme"))).toBe("dark");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.setViewportSize({ width: 375, height: 720 });
  await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto("/home");
  await settings.click();
  await dialog.getByRole("radio", { name: "Dark" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("light settings remain usable on mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fixture(page);
  await page.goto("/home");
  await page.getByRole("button", { name: "Open workspace navigation" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("radio", { name: "Light" }).check();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("light route surfaces retain accessible contrast", async ({ page }) => {
  test.setTimeout(120_000);
  await fixture(page);
  await page.goto("/home");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("radio", { name: "Light" }).check();
  await page.keyboard.press("Escape");
  for (const route of ["/home", "/books/book-1", "/worlds/world-1", "/signin", "/signup", "/forgot-password", "/privacy", "/terms", "/"]) {
    await page.goto(route);
    if (route === "/home") await expect(page.getByText("The Far Shore").first()).toBeVisible();
    if (route === "/books/book-1") await expect(page.getByRole("textbox", { name: "Introduction manuscript" })).toBeVisible();
    if (["/signin", "/signup", "/forgot-password"].includes(route)) {
      await page.waitForFunction(() =>
        [...document.querySelectorAll('main [style*="opacity"]')].every(
          (element) => getComputedStyle(element).opacity === "1",
        ),
      );
    }
    if (route === "/home" || route === "/books/book-1" || route === "/") {
      await page.screenshot({ path: test.info().outputPath(`light-${route === "/" ? "landing" : route.slice(1).replaceAll("/", "-")}.png`) });
    }
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations, `Accessibility violations on ${route}`).toEqual([]);
  }
});

test("legal pages are public and consent gates email authentication", async ({
  page,
}) => {
  await page.goto("/privacy");
  await expect(page).toHaveTitle("Privacy Policy | Pacific Aurora");
  await expect(
    page.getByRole("heading", { name: "Privacy Policy" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI writing suggestions" })).toBeVisible();
  await expect(
    page.getByText("pacificaurora2.0@gmail.com").first(),
  ).toBeVisible();

  await page.goto("/terms");
  await expect(page).toHaveTitle("Terms and Conditions | Pacific Aurora");
  await expect(
    page.getByRole("heading", { name: "Terms and Conditions" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI suggestions" })).toBeVisible();

  await page.goto("/signup");
  const signupButton = page.getByRole("button", {
    name: "Continue with Email",
  });
  await expect(signupButton).toBeDisabled();
  await page
    .getByLabel(/I agree to the Terms and Conditions and the Privacy Policy/)
    .check();
  await expect(signupButton).toBeEnabled();

  await page.goto("/signin");
  const signinButton = page.getByRole("button", { name: "Sign In" });
  await expect(signinButton).toBeDisabled();
  await page
    .getByLabel(/I agree to the Terms and Conditions and the Privacy Policy/)
    .check();
  await expect(signinButton).toBeEnabled();
});

test("account deletion requires an explicit confirmation before clearing the session", async ({
  page,
}) => {
  const requests = await fixture(page);
  await page.goto("/books/book-1");

  await page.getByRole("button", { name: "Open account menu" }).click();
  await page
    .getByRole("button", { name: "Delete account", exact: true })
    .click();

  const dialog = page.getByRole("dialog", {
    name: "Delete account permanently?",
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Delete account", exact: true }),
  ).toBeDisabled();

  await dialog.getByRole("textbox").fill("DELETE");
  await Promise.all([
    page.waitForURL("**/"),
    dialog.getByRole("button", { name: "Delete account", exact: true }).click(),
  ]);

  expect(
    requests.some(
      (request) =>
        request.method === "DELETE" &&
        request.path === "/api/auth/account" &&
        request.body.confirmation === "DELETE",
    ),
  ).toBe(true);
});

test("world editing sends explicit null when removing a wielder", async ({
  page,
}) => {
  const requests = await fixture(page);
  await page.goto("/worlds/world-1");
  await page.getByRole("button", { name: "Tide compass", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Character", exact: true })
    .selectOption("");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    requests.find(
      (request) =>
        request.path === "/api/items/item-1" && request.method === "PATCH",
    )?.body,
  ).toMatchObject({ wielderEntityId: null, manualWielderName: null });
});

test("timeline opens a chapter in the writer", async ({ page }) => {
  await fixture(page);
  await page.goto("/books/book-1?tab=timeline");
  await page.locator("summary").filter({ hasText: "Across the bay" }).click();
  await page.getByRole("button", { name: "Open chapter", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Across the bay manuscript" }),
  ).toBeVisible();
});

test("incomplete profiles cannot open home directly", async ({ page }) => {
  await fixture(page, true);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("world page fits mobile and connected books open in a new tab", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await page.goto("/worlds/world-1");
  await expect(
    page.getByRole("heading", { name: "The Tide Isles" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /The Far Shore/ }),
  ).toHaveAttribute("target", "_blank");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("world-mobile.png"),
    fullPage: true,
  });
});

test("relationship canvas adds a character node", async ({ page }) => {
  await fixture(page);
  await page.goto("/books/book-1?tab=relationships");
  await page.getByRole("button", { name: "Mira Vale", exact: true }).click();
  await expect(page.locator(".react-flow__node")).toContainText("Mira Vale");
  await page.screenshot({
    path: test.info().outputPath("relationships-desktop.png"),
    fullPage: true,
  });
});

test("failed saves preserve a recoverable draft", async ({ page }) => {
  await fixture(page);
  await page.route("**/api/books/book-1/chapters/chapter-1", (route) =>
    route.fulfill({
      status: 500,
      json: { error: { message: "Save temporarily unavailable" } },
    }),
  );
  await page.goto("/books/book-1");
  const editor = page.getByRole("textbox", { name: "Introduction manuscript" });
  await editor.fill("A recovered manuscript.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Save temporarily unavailable" }),
  ).toContainText("Your text is still here");
  page.on("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(editor).toContainText("A recovered manuscript.");
  await page.screenshot({
    path: test.info().outputPath("writer-desktop.png"),
    fullPage: true,
  });
});

test("ideas wait for 500 words and a pause, then apply only the accepted card", async ({ page }) => {
  await fixture(page);
  let completedMilestone = 0;
  let analysisCount = 0;
  let applyCount = 0;
  let declineCount = 0;
  const suggestionId = "11111111-1111-4111-8111-111111111111";
  await page.route("**/api/books/book-1/chapters/chapter-1/ai-suggestions**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/eligibility")) {
      await route.fulfill({ json: { data: { completedMilestone, nextEligibleAt: null, checkpointVersion: completedMilestone } } });
    } else if (path.endsWith("/apply")) {
      applyCount += 1;
      await route.fulfill({ json: { data: { suggestionId, kind: "chapter_point", resourceId: "point-1" } } });
    } else if (path.endsWith("/decline")) {
      declineCount += 1;
      await route.fulfill({ json: { data: { declined: true } } });
    } else {
      analysisCount += 1;
      completedMilestone = (route.request().postDataJSON() as { milestone: number }).milestone;
      await route.fulfill({ json: { data: { completedMilestone, nextEligibleAt: null, checkpointVersion: completedMilestone, suggestions: [
        { suggestionId, kind: "chapter_point", action: "add_point", chapterId: "chapter-1", changes: { content: "Remember the tide" }, summary: "Remember the tide", sourceExcerpt: null },
      ] } } });
    }
  });
  await page.goto("/books/book-1");
  const editor = page.getByRole("textbox", { name: "Introduction manuscript" });
  const words = Array.from({ length: 500 }, (_, index) => `word${index}`);
  await editor.fill(words.slice(0, 499).join(" "));
  await page.waitForTimeout(1400);
  expect(analysisCount).toBe(0);
  await editor.fill(words.join(" "));
  await expect(page.getByRole("heading", { name: "Remember the tide" })).toBeVisible();
  await page.waitForTimeout(1400);
  expect(analysisCount).toBe(1);
  await page.getByRole("button", { name: "Accept Remember the tide" }).click();
  await expect(page.getByRole("heading", { name: "Remember the tide" })).toHaveCount(0);
  expect(applyCount).toBe(1);
  await expect(editor).toContainText("word499");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  await editor.fill([...words, ...words].join(" "));
  await expect(page.getByRole("heading", { name: "Remember the tide" })).toBeVisible();
  expect(analysisCount).toBe(2);
  await page.getByRole("button", { name: "Decline Remember the tide" }).click();
  await expect(page.getByRole("heading", { name: "Remember the tide" })).toHaveCount(0);
  expect(applyCount).toBe(1);
  expect(declineCount).toBe(1);
});

test("a saved 550-word chapter starts analysis on load", async ({ page }) => {
  await fixture(page, false, Array(550).fill("word").join(" "));
  let analysisCount = 0;
  await page.route("**/api/books/book-1/chapters/chapter-1/ai-suggestions", async (route) => {
    analysisCount += 1;
    await route.fulfill({ json: { data: {
      completedMilestone: 1, nextEligibleAt: null, checkpointVersion: 1, suggestions: [],
    } } });
  });
  await page.goto("/books/book-1");
  await expect(page.getByText("550 words", { exact: true })).toBeVisible();
  await expect.poll(() => analysisCount).toBe(1);
});

test("cooldown repeats the latest 500-word window without blocking the writer", async ({ page }) => {
  await fixture(page);
  let completedMilestone = 0;
  let checkpointVersion = 0;
  let nextEligibleAt: string | null = null;
  let analysisCount = 0;
  const milestones: number[] = [];
  await page.route("**/api/books/book-1/chapters/chapter-1/ai-suggestions**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.endsWith("/eligibility")) {
      milestones.push((route.request().postDataJSON() as { milestone: number }).milestone);
      completedMilestone = Math.max(completedMilestone, milestones.at(-1) ?? 0);
      checkpointVersion += 1;
      analysisCount += 1;
      nextEligibleAt = new Date(Date.now() + 3500).toISOString();
    }
    await route.fulfill({ json: { data: path.endsWith("/eligibility")
      ? { completedMilestone, nextEligibleAt, checkpointVersion }
      : { completedMilestone, nextEligibleAt, checkpointVersion, suggestions: [{
        suggestionId: analysisCount === 1 ? "33333333-3333-4333-8333-333333333333" : "44444444-4444-4444-8444-444444444444",
        kind: "chapter_point", action: "add_point", chapterId: "chapter-1",
        changes: { content: "Keep the clue" }, summary: "Keep the clue", sourceExcerpt: null,
      }] } } });
  });
  await page.goto("/books/book-1");
  const editor = page.getByRole("textbox", { name: "Introduction manuscript" });
  await editor.fill(Array(500).fill("word").join(" "));
  await expect.poll(() => analysisCount).toBe(1);
  await expect(page.getByText(/Next analysis in/)).toBeVisible();
  await page.waitForTimeout(1600);
  expect(analysisCount).toBe(1);
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  await expect.poll(() => analysisCount, { timeout: 8000 }).toBe(2);
  expect(milestones).toEqual([1, 1]);
  await expect(page.getByRole("heading", { name: "Keep the clue" })).toHaveCount(1);
});

test("a second browser tab respects the shared cooldown", async ({ page, context }) => {
  let completedMilestone = 0;
  let analysisCount = 0;
  let nextEligibleAt: string | null = null;
  const install = async (tab: Page) => {
    await fixture(tab);
    await tab.route("**/api/books/book-1/chapters/chapter-1/ai-suggestions**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (!path.endsWith("/eligibility")) {
        completedMilestone = 1;
        analysisCount += 1;
        nextEligibleAt = new Date(Date.now() + 60_000).toISOString();
      }
      await route.fulfill({ json: { data: path.endsWith("/eligibility")
        ? { completedMilestone, nextEligibleAt, checkpointVersion: completedMilestone }
        : { completedMilestone, nextEligibleAt, checkpointVersion: completedMilestone, suggestions: [] } } });
    });
  };
  await install(page);
  await page.goto("/books/book-1");
  await page.getByRole("textbox", { name: "Introduction manuscript" }).fill(Array(500).fill("word").join(" "));
  await expect.poll(() => analysisCount).toBe(1);
  const second = await context.newPage();
  await install(second);
  await second.goto("/books/book-1");
  await second.getByRole("textbox", { name: "Introduction manuscript" }).fill(Array(500).fill("word").join(" "));
  await expect(second.getByText("Ideas are cooling down.")).toBeVisible();
  expect(analysisCount).toBe(1);
  await second.close();
});

test("ideas survive chapter switches but disappear when their chapter closes", async ({ page }) => {
  await fixture(page);
  const suggestionId = "22222222-2222-4222-8222-222222222222";
  await page.route("**/api/books/book-1/chapters/chapter-1/ai-suggestions**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({ json: { data: path.endsWith("/eligibility")
      ? { completedMilestone: 0, nextEligibleAt: null, checkpointVersion: 0 }
      : { completedMilestone: 1, nextEligibleAt: null, checkpointVersion: 1, suggestions: [
        { suggestionId, kind: "chapter_point", action: "add_point", chapterId: "chapter-1", changes: { content: "A clue" }, summary: "A clue", sourceExcerpt: null },
      ] } } });
  });
  await page.goto("/books/book-1");
  await page.getByRole("textbox", { name: "Introduction manuscript" }).fill(Array(500).fill("word").join(" "));
  await expect(page.getByRole("heading", { name: "A clue" })).toBeVisible();
  await page.getByLabel("Open chapter", { exact: true }).selectOption("chapter-2");
  await expect(page.getByRole("heading", { name: "A clue" })).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Close Introduction" }).click();
  await page.getByRole("button", { name: "Discard" }).click();
  await expect(page.getByRole("heading", { name: "A clue" })).toHaveCount(0);
});

test("provider outage leaves the manuscript editable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await page.route("**/api/books/book-1/chapters/chapter-1/ai-suggestions", (route) => route.fulfill({
    status: 503, json: { error: { code: "AI_UNAVAILABLE", message: "Provider unavailable" } },
  }));
  await page.goto("/books/book-1");
  const editor = page.getByRole("textbox", { name: "Introduction manuscript" });
  await editor.fill(Array(500).fill("word").join(" "));
  await expect(page.getByText("Ideas are unavailable right now. Your writing and Save still work.")).toBeVisible();
  await editor.fill("Editing still works.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toContainText("Editing still works.");
  const panel = page.getByRole("complementary", { name: "Writing suggestions" });
  await expect(panel).toBeInViewport();
});
