import { MAX_IMAGE_BYTES } from "@/lib/attachments";
import { MAX_PROMPT_LENGTH } from "@/lib/generation-limits";

export const FIGMA_API = "https://api.figma.com/v1";
export const FIGMA_PROMPT_PREFIX = "Figma:";
export const DEFAULT_FIGMA_REQUEST = "Recreate this Figma design as a working app.";
export const MAX_TOP_FRAMES = 40;
export const MAX_SUMMARY_CHARS = 2400;
export const MAX_SUMMARY_DEPTH = 4;
export const MAX_SUMMARY_CHILDREN = 12;
export const FIGMA_FILE_KINDS = new Set(["design", "file", "proto"]);

const FRAME_TYPES = new Set(["FRAME", "COMPONENT", "COMPONENT_SET"]);

/** True when a user prompt was built by `buildFigmaPrompt`. */
export const isFigmaPrompt = (text) =>
  typeof text === "string" && text.trimStart().startsWith(FIGMA_PROMPT_PREFIX);

/** Figma URLs use hyphens in `node-id`; the API uses colons. */
export const normalizeNodeId = (id) => {
  if (id == null || id === "") return null;
  const value = String(id).trim();
  return value ? value.replace(/-/g, ":") : null;
};

/**
 * Parse a Figma file or frame link. Returns `{ fileKey, nodeId }` (`nodeId` is null
 * when the URL has no node-id) or `{ error }`.
 */
export const parseFigmaUrl = (input) => {
  if (input == null || input === "") return { error: "Paste a Figma file or frame link." };
  if (typeof input !== "string") return { error: "The Figma link must be text." };
  const raw = input.trim();
  if (!raw) return { error: "Paste a Figma file or frame link." };

  let url;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return { error: "That is not a valid Figma link." };
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "figma.com") return { error: "Use a figma.com file or frame link." };

  const parts = url.pathname.split("/").filter(Boolean);
  const kind = (parts[0] || "").toLowerCase();
  const fileKey = parts[1] || "";
  if (!FIGMA_FILE_KINDS.has(kind) || !/^[A-Za-z0-9_-]+$/.test(fileKey)) {
    return { error: "Use a Figma file or frame link." };
  }

  return { fileKey, nodeId: normalizeNodeId(url.searchParams.get("node-id")) };
};

/** Top-level frames on each page of a depth-2 file document. Capped at `MAX_TOP_FRAMES`. */
export const listTopFrames = (document, { limit = MAX_TOP_FRAMES } = {}) => {
  const frames = [];
  for (const page of document?.children || []) {
    for (const child of page.children || []) {
      if (!FRAME_TYPES.has(child.type)) continue;
      frames.push({
        id: child.id,
        name: child.name || child.type,
        page: page.name || "Page",
        type: child.type,
      });
      if (frames.length >= limit) return frames;
    }
  }
  return frames;
};

const toHexByte = (n) => Math.round((Number(n) || 0) * 255).toString(16).padStart(2, "0");

export const rgbToHex = (color) => {
  if (!color || typeof color !== "object") return null;
  return `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}`;
};

const fillsToHex = (fills) => {
  if (!Array.isArray(fills)) return [];
  return fills
    .filter((fill) => fill && fill.visible !== false && fill.type === "SOLID" && fill.color)
    .map((fill) => rgbToHex(fill.color))
    .filter(Boolean);
};

const walkSummary = (node, depth, colors) => {
  if (!node || depth > MAX_SUMMARY_DEPTH) return null;
  const box = node.absoluteBoundingBox || {};
  const item = { name: node.name || node.type, type: node.type };
  if (box.width && box.height) item.size = `${Math.round(box.width)}x${Math.round(box.height)}`;
  if (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL") {
    item.layout = node.layoutMode === "HORIZONTAL" ? "row" : "col";
    const pads = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft];
    if (pads.some((value) => value)) item.pad = pads.map((value) => value || 0).join("/");
    if (node.itemSpacing) item.gap = node.itemSpacing;
  }
  if (typeof node.characters === "string" && node.characters) {
    item.text = node.characters.length > 200 ? `${node.characters.slice(0, 199)}…` : node.characters;
  }
  const hexes = fillsToHex(node.fills);
  hexes.forEach((hex) => colors.add(hex));
  if (hexes[0]) item.fill = hexes[0];
  if (node.type === "INSTANCE" && node.name) item.component = node.name;

  const kids = [];
  for (const child of node.children || []) {
    if (kids.length >= MAX_SUMMARY_CHILDREN) break;
    const next = walkSummary(child, depth + 1, colors);
    if (next) kids.push(next);
  }
  if (kids.length) item.children = kids;
  return item;
};

/**
 * Compact tree + colors for the agent. Drops unused Figma fields and caps size so
 * `buildFigmaPrompt` stays under `MAX_PROMPT_LENGTH`.
 */
export const summarizeNode = (node, { maxChars = MAX_SUMMARY_CHARS } = {}) => {
  const colors = new Set();
  const tree = walkSummary(node, 0, colors) || { name: "Frame", type: "FRAME" };
  const palette = [...colors].slice(0, 24);

  const encode = () => JSON.stringify(tree);
  let text = encode();
  while (text.length > maxChars && tree.children?.length) {
    tree.children.pop();
    text = encode();
  }
  if (text.length > maxChars) text = `${text.slice(0, Math.max(0, maxChars - 1))}…`;

  return { tree, colors: palette, text };
};

/**
 * User-visible prompt sent to `createChat` / `createMessages`. First line starts with
 * `Figma:` so the agent can attach FIGMA_NOTE. Stays at or under `MAX_PROMPT_LENGTH`.
 */
export const buildFigmaPrompt = ({ fileName, nodeName, fileKey, nodeId, summary, userText } = {}) => {
  const extra = typeof userText === "string" ? userText.trim() : "";
  const titleName = nodeName || fileName || "this Figma design";
  const head = [
    `${FIGMA_PROMPT_PREFIX} Recreate ${titleName}`,
    "",
    `File: ${fileName || fileKey || "Figma"} (${fileKey || "unknown"})`,
    `Frame: ${nodeName || nodeId || "frame"} (${nodeId || "unknown"})`,
    "",
    extra || DEFAULT_FIGMA_REQUEST,
  ];
  const colors = Array.isArray(summary?.colors) ? summary.colors : [];
  const colorBlock = colors.length ? ["", "## Colors", colors.join(", ")] : [];
  const footer = ["", "Match the attached frame image. Use the exact text and colors from the structure."];

  let structure = summary?.text || (summary?.tree ? JSON.stringify(summary.tree) : "");
  const wrap = (body) => [...head, "", "## Structure", body, ...colorBlock, ...footer].join("\n");
  let prompt = wrap(structure);
  if (prompt.length > MAX_PROMPT_LENGTH) {
    const overflow = prompt.length - MAX_PROMPT_LENGTH + 1;
    structure = `${structure.slice(0, Math.max(0, structure.length - overflow))}…`;
    prompt = wrap(structure);
  }
  if (prompt.length > MAX_PROMPT_LENGTH) prompt = prompt.slice(0, MAX_PROMPT_LENGTH);
  return prompt;
};

export const figmaErrorMessage = (status) => {
  if (status === 401) return "That Figma token is invalid or expired. Create a new personal access token.";
  if (status === 403) {
    return "This Figma account cannot open that file. Ask for access, or use a token from an account that can.";
  }
  if (status === 404) return "Figma file or frame not found.";
  if (status === 429) return "Figma rate limit reached. Wait a minute and try again.";
  if (status === 413) return "That frame's image is too large to import. Try a smaller frame.";
  return "Could not read the Figma file. Please try again.";
};

const figmaError = (status, message) => {
  const error = new Error(message || figmaErrorMessage(status));
  error.status = status;
  return error;
};

const figmaFetch = async (token, path) => {
  const response = await fetch(`${FIGMA_API}${path}`, {
    headers: { "X-Figma-Token": token },
    cache: "no-store",
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const status = body?.status || response.status;
  if (!response.ok || body?.err) throw figmaError(status, figmaErrorMessage(status));
  return body;
};

/** `GET /v1/me` — validate a PAT and read the handle. */
export const getFigmaMe = (token) => figmaFetch(token, "/me");

/** `GET /v1/files/:key` — optional `depth` to keep the tree small. */
export const getFigmaFile = (token, fileKey, { depth } = {}) => {
  const query = depth ? `?depth=${depth}` : "";
  return figmaFetch(token, `/files/${encodeURIComponent(fileKey)}${query}`);
};

/** `GET /v1/files/:key/nodes?ids=` — one or more node subtrees. */
export const getFigmaNodes = (token, fileKey, ids) => {
  const list = Array.isArray(ids) ? ids.join(",") : ids;
  return figmaFetch(token, `/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(list)}`);
};

const imageUrlFor = (images, nodeId) => {
  if (!images || !nodeId) return null;
  return images[nodeId] || images[nodeId.replace(/:/g, "-")] || null;
};

const downloadPng = async (imageUrl, maxBytes) => {
  const response = await fetch(imageUrl, { cache: "no-store" });
  if (!response.ok) throw figmaError(response.status);
  const data = Buffer.from(await response.arrayBuffer());
  if (!data.length) throw figmaError(404, "Figma did not return an image for that frame.");
  if (data.length > maxBytes) return null;
  return data;
};

/**
 * Export a node as PNG. Tries scale 2, then 1, so the file stays under `MAX_IMAGE_BYTES`.
 * Downloads the short-lived Figma URL immediately.
 */
export const exportFigmaPng = async (token, fileKey, nodeId, { maxBytes = MAX_IMAGE_BYTES, scales = [2, 1] } = {}) => {
  const id = normalizeNodeId(nodeId);
  if (!id) throw figmaError(400, "Choose a frame.");

  let lastTooLarge = false;
  for (const scale of scales) {
    const json = await figmaFetch(
      token,
      `/images/${encodeURIComponent(fileKey)}?ids=${encodeURIComponent(id)}&format=png&scale=${scale}`
    );
    const imageUrl = imageUrlFor(json.images, id);
    if (!imageUrl) throw figmaError(404, "Figma did not return an image for that frame.");
    const data = await downloadPng(imageUrl, maxBytes);
    if (data) return { mimeType: "image/png", data };
    lastTooLarge = true;
  }
  if (lastTooLarge) throw figmaError(413);
  throw figmaError(404, "Figma did not return an image for that frame.");
};

/** Small PNG for the import preview (no credit). */
export const exportFigmaPreviewPng = (token, fileKey, nodeId) =>
  exportFigmaPng(token, fileKey, nodeId, { scales: [0.5, 1] });
