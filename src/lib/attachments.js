// Images attached to prompts. The browser resizes them first (see compress-image.js), so a
// generous server limit still keeps Server Action requests small.
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Validates an uploaded image ({ mimeType, data: base64 }). Returns { image } with the
 * bytes as a Buffer, or { error } with a message for the user. No image is fine.
 */
export const parseImage = (image) => {
  if (!image) return { image: null };
  if (!IMAGE_TYPES.includes(image.mimeType) || typeof image.data !== "string") {
    return { error: "Attach a PNG, JPEG or WebP image." };
  }
  const data = Buffer.from(image.data, "base64");
  if (data.length === 0 || data.length > MAX_IMAGE_BYTES) {
    return { error: "The image is too large. Try a smaller screenshot." };
  }
  return { image: { mimeType: image.mimeType, data } };
};
