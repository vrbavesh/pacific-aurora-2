import { expect, test } from "vitest";
import { liveAiEnvironment } from "@/tests/helpers/live-ai-environment";

test("live AI suites refuse to load credentials without explicit confirmation", () => {
  const previous = process.env.PA_AI_LIVE_CONFIRM;
  delete process.env.PA_AI_LIVE_CONFIRM;
  try {
    expect(() => liveAiEnvironment()).toThrow("PA_AI_LIVE_CONFIRM=MAIN_PROJECT_DISPOSABLE_USERS");
  } finally {
    if (previous === undefined) delete process.env.PA_AI_LIVE_CONFIRM;
    else process.env.PA_AI_LIVE_CONFIRM = previous;
  }
});
