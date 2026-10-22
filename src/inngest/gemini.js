import { GoogleGenAI } from "@google/genai";

// Gemini models to use, in order. On the free tier each model has its own daily request
// quota, so when one runs out the next is used. Override with GEMINI_MODELS (comma list).
const DEFAULT_AGENT_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
];
// Titles and short replies start on the lightest model to save the agent models' quota.
const DEFAULT_TEXT_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"];

const parseList = (value) => (value ?? "").split(",").map((m) => m.trim()).filter(Boolean);

export const AGENT_MODELS = parseList(process.env.GEMINI_MODELS).length
  ? parseList(process.env.GEMINI_MODELS)
  : DEFAULT_AGENT_MODELS;
const TEXT_MODELS = [...DEFAULT_TEXT_MODELS, ...AGENT_MODELS];

// The Max tier's models (Gemini Pro needs a paid key). Override with GEMINI_MAX_MODELS.
const DEFAULT_MAX_MODELS = ["gemini-3.1-pro-preview"];
export const MAX_MODELS = parseList(process.env.GEMINI_MAX_MODELS).length
  ? parseList(process.env.GEMINI_MAX_MODELS)
  : DEFAULT_MAX_MODELS;

// How much the model thinks per turn (MINIMAL, LOW, MEDIUM, HIGH). Lower is much faster.
const AGENT_THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || "LOW";

/**
 * The models a tier's agent runs on, in order, and how much they think. Mini and Pro share
 * the Flash rotation (Pro thinks harder). Max tries its Pro models first and falls back to
 * the Flash rotation; `primary` tells which models count as the tier's own.
 */
export const tierModels = (tierId) => {
  if (tierId === "max") return { models: [...MAX_MODELS, ...AGENT_MODELS], primary: MAX_MODELS, thinkingLevel: "HIGH" };
  return { models: AGENT_MODELS, primary: AGENT_MODELS, thinkingLevel: tierId === "pro" ? "HIGH" : AGENT_THINKING_LEVEL };
};

// Gemini 3 binds thought signatures to the model that produced them. When a turn from one
// model is replayed to another, its function calls carry this documented placeholder instead.
const SIGNATURE_PLACEHOLDER = "skip_thought_signature_validator";

// Created lazily so `next build` does not need GEMINI_API_KEY. No SDK retries: a quota
// error should move to the next model at once, and Inngest retries the step otherwise.
let client;
const getClient = () =>
  (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { retryOptions: { attempts: 1 } } }));

// Models to skip until a given time (per server instance): out of quota, or busy.
const exhaustedUntil = new Map();
// A busy model ("high demand", 503) usually recovers within a minute or two.
const BUSY_SKIP_MS = 60 * 1000;

const isQuotaError = (error) => error?.status === 429 || /RESOURCE_EXHAUSTED/.test(error?.message ?? "");
// Temporary overload on Google's side; another model usually still answers.
const isBusyError = (error) =>
  error?.status === 503 || /UNAVAILABLE|high demand|overloaded/i.test(error?.message ?? "");

const retryAfterMs = (error) => {
  const match = /retry in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i.exec(error?.message ?? "");
  if (!match) return 10 * 60 * 1000;
  const [, h = 0, m = 0, s = 0] = match;
  return ((Number(h) * 60 + Number(m)) * 60 + Number(s)) * 1000;
};

/** Contents as sent to `model`: our bookkeeping field removed, foreign signatures replaced. */
const contentsFor = (contents, model) =>
  contents.map(({ role, parts, producedBy }) => ({
    role,
    parts: (parts ?? []).map((part) => {
      if (!producedBy || producedBy === model || !part.thoughtSignature) return part;
      const { thoughtSignature, ...rest } = part;
      void thoughtSignature;
      return part.functionCall ? { ...rest, thoughtSignature: SIGNATURE_PLACEHOLDER } : rest;
    }),
  }));

/**
 * Calls `request(model)` for each model in `order`, skipping any that are out of quota or
 * busy, and returns the first answer with its model. Other errors are thrown at once.
 */
const withModelRotation = async (order, request) => {
  let lastError;

  for (const model of order) {
    if ((exhaustedUntil.get(model) ?? 0) > Date.now()) continue;
    try {
      return { model, response: await request(model) };
    } catch (error) {
      if (isQuotaError(error)) exhaustedUntil.set(model, Date.now() + retryAfterMs(error));
      else if (isBusyError(error)) exhaustedUntil.set(model, Date.now() + BUSY_SKIP_MS);
      else throw error;
      lastError = error;
    }
  }

  // Every model is out of quota or busy.
  throw Object.assign(lastError ?? new Error("Every Gemini model is busy or out of quota. Try again later."), {
    unavailable: true,
  });
};

/**
 * One model turn, trying `models` in order (starting with `preferredModel` if given) and
 * skipping any that are out of quota or busy. Returns the model's content exactly as received,
 * tagged with the model that produced it (its thought signatures must be replayed as-is).
 * When every model is out of quota or busy, the step fails and Inngest retries it later.
 */
export const runGeminiTurn = async ({
  system,
  contents,
  tools,
  thinkingLevel = AGENT_THINKING_LEVEL,
  models = AGENT_MODELS,
  preferredModel,
}) => {
  const order = preferredModel ? [preferredModel, ...models.filter((m) => m !== preferredModel)] : models;
  const { model, response } = await withModelRotation(order, (model) =>
    getClient().models.generateContent({
      model,
      contents: contentsFor(contents, model),
      config: {
        systemInstruction: system,
        thinkingConfig: { thinkingLevel },
        ...(tools ? { tools: [{ functionDeclarations: tools }] } : {}),
      },
    })
  );
  const candidate = response.candidates?.[0];
  return {
    model,
    content: { ...(candidate?.content ?? { role: "model", parts: [] }), producedBy: model },
    finishReason: candidate?.finishReason ?? null,
  };
};

// Image models for the generateImage tool (they need a paid key). Override with GEMINI_IMAGE_MODELS.
const DEFAULT_IMAGE_MODELS = ["gemini-3.1-flash-image", "gemini-2.5-flash-image"];
const IMAGE_MODELS = parseList(process.env.GEMINI_IMAGE_MODELS).length
  ? parseList(process.env.GEMINI_IMAGE_MODELS)
  : DEFAULT_IMAGE_MODELS;

/**
 * One image from a text prompt: { model, mimeType, data } with `data` as base64. Throws an
 * error with `unavailable` when every image model is out of quota or busy, and a plain
 * error when the model answers without an image (for example, a refused prompt).
 */
export const generateImage = async ({ prompt, aspectRatio }) => {
  const { model, response } = await withModelRotation(IMAGE_MODELS, (model) =>
    getClient().models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio } },
    })
  );
  const image = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;
  if (!image) throw new Error("The image model returned no image for this prompt.");
  return { model, mimeType: image.mimeType, data: image.data };
};

export const textOf = (content) =>
  (content?.parts ?? [])
    .filter((part) => typeof part.text === "string" && !part.thought)
    .map((part) => part.text)
    .join("");

/** A short single-shot completion (titles, user-facing summaries). */
export const generateText = async ({ system, prompt }) => {
  const { content } = await runGeminiTurn({
    system,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    thinkingLevel: "MINIMAL",
    models: TEXT_MODELS,
  });
  return textOf(content).trim();
};
