import { beforeEach, describe, expect, it, vi } from "vitest";

// Stand-ins: the image model and the image store. The sandbox is never reached by generateImage.
const fake = vi.hoisted(() => ({ result: null, saved: [] }));
vi.mock("@/inngest/gemini", () => ({
  generateImage: async () => {
    if (fake.result instanceof Error) throw fake.result;
    return fake.result;
  },
}));
vi.mock("@/lib/generated-images", async (importOriginal) => ({
  ...(await importOriginal()),
  saveGeneratedImage: async ({ chatId, prompt }) => {
    fake.saved.push({ chatId, prompt });
    return { id: "img1", url: "https://site.test/api/images/img1", width: 1600, height: 900 };
  },
}));

const { agentTools, runTool } = await import("@/inngest/tools");
const { describeCall } = await import("@/inngest/progress");
const { generatedImageUrl } = await import("@/lib/generated-images");

const call = (args = { prompt: "A sunlit cafe interior", aspectRatio: "16:9" }) => ({ id: "c1", name: "generateImage", args });
const responseOf = (result) => result.part.functionResponse.response;

describe("agentTools", () => {
  it("offers generateImage only when images are on", () => {
    expect(agentTools().map((tool) => tool.name)).not.toContain("generateImage");
    expect(agentTools({ images: true }).map((tool) => tool.name)).toContain("generateImage");
  });
});

describe("generateImage tool", () => {
  beforeEach(() => Object.assign(fake, { result: { model: "m", mimeType: "image/png", data: "AAAA" }, saved: [] }));

  it("stores the image and returns its public URL and size", async () => {
    const result = await runTool(call(), "sandbox-unused", { chatId: "chat1", images: true, imagesLeft: 4 });
    expect(responseOf(result)).toEqual({ output: { url: "https://site.test/api/images/img1", width: 1600, height: 900 } });
    expect(fake.saved).toEqual([{ chatId: "chat1", prompt: "A sunlit cafe interior" }]);
  });

  it("is refused when images are off, even if the model calls it", async () => {
    expect(responseOf(await runTool(call(), "s", { chatId: "chat1" })).error).toMatch(/Unknown tool/);
    expect(fake.saved).toHaveLength(0);
  });

  it("stops at the per-run limit", async () => {
    const response = responseOf(await runTool(call(), "s", { chatId: "chat1", images: true, imagesLeft: 0 }));
    expect(response.error).toMatch(/limit/);
    expect(response.error).toMatch(/placeholder/);
    expect(fake.saved).toHaveLength(0);
  });

  it("tells the agent to use placeholders when the image models have no quota", async () => {
    fake.result = Object.assign(new Error("RESOURCE_EXHAUSTED"), { unavailable: true });
    const response = responseOf(await runTool(call(), "s", { chatId: "chat1", images: true, imagesLeft: 4 }));
    expect(response.error).toMatch(/unavailable/);
    expect(response.error).toMatch(/Do not call generateImage again/);
  });

  it("validates the aspect ratio", async () => {
    const response = responseOf(await runTool(call({ prompt: "x", aspectRatio: "2:1" }), "s", { chatId: "c", images: true, imagesLeft: 4 }));
    expect(response.error).toMatch(/Invalid arguments/);
  });
});

describe("image helpers", () => {
  it("labels the progress step with the prompt", () => {
    expect(describeCall({ name: "generateImage", args: { prompt: "A red bicycle" } })).toEqual({
      kind: "image",
      label: "Generating an image: A red bicycle",
    });
  });

  it("builds the public image URL from the site URL", () => {
    expect(generatedImageUrl("abc", "https://app.example.com")).toBe("https://app.example.com/api/images/abc");
  });
});
