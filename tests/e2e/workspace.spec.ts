import { expect, test, type Page } from "@playwright/test";

async function fixture(page: Page, incomplete = false) {
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
            content: [{ type: "text", text: "The tide returned." }],
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
  await expect(page.getByRole("status").filter({ visible: true })).toHaveText(
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

test("world editing sends explicit null when removing a wielder", async ({
  page,
}) => {
  const requests = await fixture(page);
  await page.goto("/worlds/world-1");
  await page.getByRole("button", { name: "Tide compass", exact: true }).click();
  await page.getByRole("combobox", { name: "Character", exact: true }).selectOption("");
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
  await expect(page.getByRole("alert").filter({ hasText: "Save temporarily unavailable" })).toContainText(
    "Your text is still here",
  );
  page.on("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(editor).toContainText("A recovered manuscript.");
  await page.screenshot({
    path: test.info().outputPath("writer-desktop.png"),
    fullPage: true,
  });
});
