import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function authenticatedFixture(page: Page) {
  const timestamp = "2026-10-10T00:00:00.000Z";
  await page.addInitScript(() =>
    localStorage.setItem("pacific_aurora_token", "deployment-test-session"),
  );
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path === "/api/auth/session") {
      data = {
        user: { id: "author" },
        profile: {
          username: "Mira",
          userId: "mira",
          onboardingComplete: true,
        },
      };
    } else if (path === "/api/books/book-1") {
      data = {
        id: "book-1",
        worldId: "world-1",
        name: "The Far Shore",
        updatedAt: timestamp,
      };
    } else if (path === "/api/worlds/world-1") {
      data = { id: "world-1", name: "The Tide Isles", updatedAt: timestamp };
    } else if (path.endsWith("/books")) {
      data = [
        {
          id: "book-1",
          worldId: "world-1",
          name: "The Far Shore",
          updatedAt: timestamp,
        },
      ];
    } else if (path.endsWith("/chapters")) {
      data = [
        {
          id: "chapter-1",
          bookId: "book-1",
          name: "Introduction",
          position: 0,
          content: { type: "doc", content: [{ type: "paragraph" }] },
          updatedAt: timestamp,
        },
      ];
    } else if (path.endsWith("/characters")) {
      data = [
        {
          entityId: "character-1",
          name: "Mira Vale",
          status: "alive",
          updatedAt: timestamp,
        },
      ];
    }
    await route.fulfill({ json: { data } });
  });
}

test("security headers are present on browser responses", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  const headers = response!.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("reduced motion uses the static aurora fallback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(0);
});

for (const route of ["/", "/books/book-1", "/worlds/world-1"]) {
  test(`${route} has no serious accessibility violations`, async ({ page }) => {
    if (route !== "/") await authenticatedFixture(page);
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blockingViolations = results.violations
      .filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      )
      .map((violation) => ({
        id: violation.id,
        targets: violation.nodes.map((node) => node.target),
      }));
    expect(blockingViolations).toEqual([]);
  });
}

test("book and world workspaces fit mobile, tablet, and desktop widths", async ({
  page,
}) => {
  await authenticatedFixture(page);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/books/book-1", "/worlds/world-1"]) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${route} overflowed at ${width}px`,
      ).toBe(true);
    }
  }
});
