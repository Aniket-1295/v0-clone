import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const created = vi.hoisted(() => []);
vi.mock("@/lib/db", () => ({
  default: {
    generatedImage: {
      create: async ({ data, select }) => {
        created.push(data);
        return Object.fromEntries(Object.keys(select).map((key) => [key, key === "id" ? "img1" : data[key]]));
      },
    },
  },
}));

const { saveGeneratedImage } = await import("@/lib/generated-images");

describe("saveGeneratedImage", () => {
  it("stores the model's PNG as WebP, no wider than 1600px", async () => {
    const png = await sharp({ create: { width: 2048, height: 1152, channels: 3, background: "#3366ff" } }).png().toBuffer();

    const image = await saveGeneratedImage({ chatId: "chat1", prompt: "blue", data: png.toString("base64") });

    expect(image).toMatchObject({ id: "img1", width: 1600, height: 900 });
    expect(image.url).toMatch(/\/api\/images\/img1$/);
    expect(created[0]).toMatchObject({ chatId: "chat1", prompt: "blue", mimeType: "image/webp" });
    expect((await sharp(created[0].data).metadata()).format).toBe("webp");
  });
});
