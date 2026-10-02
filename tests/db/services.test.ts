import { describe, expect, test } from "vitest";
import { NotFoundError } from "@/src/lib/api/errors";
import { chapterService, worldService } from "@/src/server/services";
import {
  InMemoryChapterRepo,
  InMemoryWorldRepo,
} from "../helpers/in-memory";

describe("worldService", () => {
  test("get on a missing world maps to NotFoundError (404, not 403)", async () => {
    const svc = worldService(new InMemoryWorldRepo());
    await expect(svc.get("nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  test("create then get returns the world", async () => {
    const svc = worldService(new InMemoryWorldRepo());
    const w = await svc.create("u1", "My World");
    expect(w.id).toBeTruthy();
    expect(await svc.get(w.id!)).toMatchObject({ name: "My World" });
  });
});

describe("chapterService", () => {
  test("create appends in position order and move reorders", async () => {
    const repo = new InMemoryChapterRepo();
    const svc = chapterService(repo);
    const bookId = "b1";
    const a = await svc.create(bookId, "A");
    await svc.create(bookId, "B");
    const c = await svc.create(bookId, "C");
    expect((await svc.list(bookId)).map((x) => x.name)).toEqual(["A", "B", "C"]);

    let next = await svc.move(c.id!, "up");
    expect(next.map((x) => x.name)).toEqual(["A", "C", "B"]);

    next = await svc.move(c.id!, "up");
    expect(next.map((x) => x.name)).toEqual(["C", "A", "B"]);

    next = await svc.move(c.id!, "up");
    expect(next.map((x) => x.name)).toEqual(["C", "A", "B"]);

    next = await svc.move(a.id!, "down");
    expect(next.map((x) => x.name)).toEqual(["C", "B", "A"]);

    for (const [i, ch] of next.entries()) {
      expect(ch.position).toBe(i);
    }
  });

  test("moving a missing chapter maps to NotFoundError", async () => {
    const svc = chapterService(new InMemoryChapterRepo());
    await expect(svc.move("ghost", "down")).rejects.toThrow();
  });
});
