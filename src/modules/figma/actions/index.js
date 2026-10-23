"use server";

import db from "@/lib/db";
import { ActionErrorCode, fail, ok } from "@/lib/action-result";
import { decryptSecret, encryptSecret, isSecretsConfigured } from "@/lib/secrets";
import {
  buildFigmaPrompt,
  exportFigmaPng,
  exportFigmaPreviewPng,
  figmaErrorMessage,
  getFigmaFile,
  getFigmaMe,
  getFigmaNodes,
  listTopFrames,
  normalizeNodeId,
  parseFigmaUrl,
  summarizeNode,
} from "@/lib/figma";
import { getCurrentUser } from "@/modules/auth/actions";
import { createChat } from "@/modules/chats/actions";
import { createMessages } from "@/modules/messages/actions";

const UNAUTHORIZED = () => fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

const nodeEntry = (nodes, nodeId) => nodes?.nodes?.[nodeId] || nodes?.nodes?.[nodeId.replace(/:/g, "-")] || null;

const figmaTokenFor = async (userId) => {
  if (!isSecretsConfigured()) return { error: fail(ActionErrorCode.INTERNAL, "Secrets are not set up on this server.") };
  const account = await db.user.findUnique({ where: { id: userId }, select: { figmaTokenEncrypted: true } });
  if (!account?.figmaTokenEncrypted) return { error: fail(ActionErrorCode.UNAUTHORIZED, "Connect Figma first.") };
  return { token: decryptSecret(account.figmaTokenEncrypted) };
};

const figmaFailure = async (error, userId, fallback) => {
  if (error.status === 401) {
    await db.user.update({ where: { id: userId }, data: { figmaHandle: null, figmaTokenEncrypted: null } });
    return fail(ActionErrorCode.UNAUTHORIZED, "Your Figma connection has expired. Connect Figma again.");
  }
  if (error.status === 403) return fail(ActionErrorCode.UNAUTHORIZED, figmaErrorMessage(403));
  if (error.status === 404) return fail(ActionErrorCode.NOT_FOUND, figmaErrorMessage(404));
  if (error.status === 429) return fail(ActionErrorCode.TOO_MANY_REQUESTS, figmaErrorMessage(429));
  if (error.status === 413) return fail(ActionErrorCode.INVALID_INPUT, figmaErrorMessage(413));
  console.error(fallback, error);
  return fail(ActionErrorCode.INTERNAL, fallback);
};

const thumbnailOf = async (token, fileKey, nodeId) => {
  try {
    const png = await exportFigmaPreviewPng(token, fileKey, nodeId);
    return { mimeType: png.mimeType, data: png.data.toString("base64") };
  } catch {
    return null;
  }
};

/** Whether Figma is connected. Never returns the token. */
export const getFigmaStatus = async () => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  try {
    const account = await db.user.findUnique({
      where: { id: user.id },
      select: { figmaHandle: true, figmaTokenEncrypted: true },
    });
    return ok({
      connected: !!account?.figmaTokenEncrypted,
      handle: account?.figmaHandle ?? null,
    });
  } catch (error) {
    console.error("getFigmaStatus failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not load Figma status.");
  }
};

/** Validate a personal access token with Figma and store it encrypted. */
export const connectFigma = async (token) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  if (!isSecretsConfigured()) return fail(ActionErrorCode.INTERNAL, "Secrets are not set up on this server.");

  if (typeof token !== "string") return fail(ActionErrorCode.INVALID_INPUT, "Paste a Figma personal access token.");
  const clean = token.trim();
  if (!clean) return fail(ActionErrorCode.INVALID_INPUT, "Paste a Figma personal access token.");
  if (clean.length < 10 || clean.length > 512) {
    return fail(ActionErrorCode.INVALID_INPUT, "That does not look like a Figma personal access token.");
  }

  try {
    const me = await getFigmaMe(clean);
    const handle = me.handle || me.email || "Figma";
    await db.user.update({
      where: { id: user.id },
      data: { figmaHandle: handle, figmaTokenEncrypted: encryptSecret(clean) },
    });
    return ok({ connected: true, handle });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return fail(ActionErrorCode.UNAUTHORIZED, figmaErrorMessage(error.status));
    }
    console.error("connectFigma failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not connect Figma. Please try again.");
  }
};

/** Forget the stored Figma token. */
export const disconnectFigma = async () => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  try {
    await db.user.update({
      where: { id: user.id },
      data: { figmaHandle: null, figmaTokenEncrypted: null },
    });
    return ok({ connected: false, handle: null });
  } catch (error) {
    console.error("disconnectFigma failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not disconnect Figma. Please try again.");
  }
};

/**
 * Read a Figma URL without starting a generation. Returns the file name, optional
 * top-level frames, the selected node, and a small thumbnail.
 */
export const previewFigmaUrl = async (url, nodeId = null) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const parsed = parseFigmaUrl(url);
  if (parsed.error) return fail(ActionErrorCode.INVALID_INPUT, parsed.error);

  const { token, error } = await figmaTokenFor(user.id);
  if (error) return error;

  const selectedId = normalizeNodeId(nodeId) || parsed.nodeId;

  try {
    if (selectedId) {
      const nodes = await getFigmaNodes(token, parsed.fileKey, selectedId);
      const entry = nodeEntry(nodes, selectedId);
      if (!entry?.document) return fail(ActionErrorCode.NOT_FOUND, figmaErrorMessage(404));
      return ok({
        fileKey: parsed.fileKey,
        fileName: nodes.name || parsed.fileKey,
        nodeId: selectedId,
        nodeName: entry.document.name || selectedId,
        frames: [],
        thumbnail: await thumbnailOf(token, parsed.fileKey, selectedId),
      });
    }

    const file = await getFigmaFile(token, parsed.fileKey, { depth: 2 });
    const frames = listTopFrames(file.document);
    const selected = frames.length === 1 ? frames[0] : null;
    return ok({
      fileKey: parsed.fileKey,
      fileName: file.name || parsed.fileKey,
      nodeId: selected?.id ?? null,
      nodeName: selected?.name ?? null,
      frames,
      thumbnail: selected ? await thumbnailOf(token, parsed.fileKey, selected.id) : null,
    });
  } catch (figmaError) {
    return figmaFailure(figmaError, user.id, "Could not read the Figma file. Please try again.");
  }
};

/**
 * Export a frame and start a generation (new chat, or a follow-up when `chatId` is set).
 * Costs one credit via createChat / createMessages.
 */
export const importFigmaFrame = async ({
  url,
  nodeId = null,
  prompt = "",
  projectId = null,
  chatId = null,
  tierId = null,
  images = false,
} = {}) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const parsed = parseFigmaUrl(url);
  if (parsed.error) return fail(ActionErrorCode.INVALID_INPUT, parsed.error);

  const id = normalizeNodeId(nodeId) || parsed.nodeId;
  if (!id) return fail(ActionErrorCode.INVALID_INPUT, "Choose a frame to import.");

  const { token, error } = await figmaTokenFor(user.id);
  if (error) return error;

  let fileName;
  let node;
  let png;
  try {
    const nodes = await getFigmaNodes(token, parsed.fileKey, id);
    const entry = nodeEntry(nodes, id);
    if (!entry?.document) return fail(ActionErrorCode.NOT_FOUND, figmaErrorMessage(404));
    fileName = nodes.name || parsed.fileKey;
    node = entry.document;
    png = await exportFigmaPng(token, parsed.fileKey, id);
  } catch (figmaError) {
    return figmaFailure(figmaError, user.id, "Could not export the Figma frame. Please try again.");
  }

  const value = buildFigmaPrompt({
    fileName,
    nodeName: node.name,
    fileKey: parsed.fileKey,
    nodeId: id,
    summary: summarizeNode(node),
    userText: prompt,
  });
  const image = { mimeType: png.mimeType, data: png.data.toString("base64") };

  if (chatId) {
    const result = await createMessages(value, chatId, image, tierId, images);
    if (!result.ok) return result;
    return ok({ id: chatId });
  }

  const result = await createChat(value, projectId, image, tierId, images);
  if (!result.ok) return result;
  return ok({ id: result.data.id });
};
