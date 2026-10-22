import sharp from "sharp";
import db from "@/lib/db";
import { SITE_URL } from "@/lib/site";

// Images the agent may generate in one run (each is a paid image-model call).
export const MAX_IMAGES_PER_RUN = 4;
export const IMAGE_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];
// Stored as WebP no wider than this: plenty for a hero image, and a fraction of the PNG.
const MAX_WIDTH = 1600;

/** The public URL the generated app uses for an image (works in the preview, downloads and published sites). */
export const generatedImageUrl = (id, base = SITE_URL) => `${base}/api/images/${id}`;

/**
 * Stores an image the model returned (base64) for a chat, converted to WebP.
 * Returns { id, url, width, height }.
 */
export const saveGeneratedImage = async ({ chatId, prompt, data }) => {
  const { data: webp, info } = await sharp(Buffer.from(data, "base64"))
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const image = await db.generatedImage.create({
    data: { chatId, prompt, mimeType: "image/webp", width: info.width, height: info.height, data: webp },
    select: { id: true, width: true, height: true },
  });
  return { ...image, url: generatedImageUrl(image.id) };
};
