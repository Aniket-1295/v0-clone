import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in for Google's SDK: models listed in `busy` answer 503, others reply "ok".
const fake = vi.hoisted(() => ({ calls: [], busy: new Set(), quota: new Set(), badRequest: false }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async ({ model }) => {
        fake.calls.push(model);
        if (fake.badRequest) throw Object.assign(new Error("INVALID_ARGUMENT"), { status: 400 });
        if (fake.quota.has(model)) throw Object.assign(new Error("RESOURCE_EXHAUSTED. Please retry in 30s."), { status: 429 });
        if (fake.busy.has(model)) throw Object.assign(new Error('{"error":{"code":503,"status":"UNAVAILABLE"}}'), { status: 503 });
        return { candidates: [{ content: { role: "model", parts: [{ text: `ok from ${model}` }] }, finishReason: "STOP" }] };
      },
    };
  },
}));

const turn = async () => {
  const { runGeminiTurn } = await import("@/inngest/gemini");
  return runGeminiTurn({ system: "s", contents: [{ role: "user", parts: [{ text: "hi" }] }] });
};

describe("runGeminiTurn model rotation", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(fake, { calls: [], busy: new Set(), quota: new Set(), badRequest: false });
  });

  it("moves to the next model when one is busy, and skips it on the next turn", async () => {
    fake.busy.add("gemini-3-flash-preview");
    expect((await turn()).model).toBe("gemini-3.5-flash");
    fake.calls.length = 0;
    // Same module instance: the busy mark is remembered.
    const { runGeminiTurn } = await import("@/inngest/gemini");
    await runGeminiTurn({ system: "s", contents: [{ role: "user", parts: [{ text: "hi" }] }] });
    expect(fake.calls).toEqual(["gemini-3.5-flash"]);
  });

  it("moves to the next model when one is out of quota", async () => {
    fake.quota.add("gemini-3-flash-preview");
    expect((await turn()).model).toBe("gemini-3.5-flash");
  });

  it("throws other errors without trying more models", async () => {
    fake.badRequest = true;
    await expect(turn()).rejects.toMatchObject({ status: 400 });
    expect(fake.calls).toHaveLength(1);
  });

  it("throws when every model is busy, so Inngest retries the step", async () => {
    ["gemini-3-flash-preview", "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash"].forEach((m) => fake.busy.add(m));
    await expect(turn()).rejects.toMatchObject({ status: 503 });
  });
});

describe("generateImage", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(fake, { calls: [], busy: new Set(), quota: new Set(), badRequest: false });
  });

  it("throws an unavailable error when every image model is out of quota", async () => {
    const { generateImage } = await import("@/inngest/gemini");
    ["gemini-3.1-flash-image", "gemini-2.5-flash-image"].forEach((m) => fake.quota.add(m));
    await expect(generateImage({ prompt: "a cup", aspectRatio: "1:1" })).rejects.toMatchObject({ unavailable: true });
  });

  it("fails clearly when the model answers without an image", async () => {
    // The fake SDK answers with text only.
    const { generateImage } = await import("@/inngest/gemini");
    await expect(generateImage({ prompt: "a cup", aspectRatio: "1:1" })).rejects.toThrow(/no image/);
  });
});
