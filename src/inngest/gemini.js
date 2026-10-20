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

// How much the model thinks per turn (MINIMAL, LOW, MEDIUM, HIGH). Lower is much faster.
const AGENT_THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || "LOW";

// Gemini 3 binds thought signatures to the model that produced them. When a turn from one
// model is replayed to another, its function calls carry this documented placeholder instead.
const SIGNATURE_PLACEHOLDER = "skip_thought_signature_validator";

// Created lazily so `next build` does not need GEMINI_API_KEY. No SDK retries: a quota
// error should move to the next model at once, and Inngest retries the step otherwise.
let client;
const getClient = () =>
  (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { retryOptions: { attempts: 1 } } }));

// Models that returned "quota exceeded", until when (per server instance).
const exhaustedUntil = new Map();

const isQuotaError = (error) => error?.status === 429 || /RESOURCE_EXHAUSTED/.test(error?.message ?? "");

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
 * One model turn, trying `models` in order (starting with `preferredModel` if given) and
 * skipping any that are out of quota. Returns the model's content exactly as received,
 * tagged with the model that produced it (its thought signatures must be replayed as-is).
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
  let lastError;

  for (const model of order) {
    if ((exhaustedUntil.get(model) ?? 0) > Date.now()) continue;
    try {
      const response = await getClient().models.generateContent({
        model,
        contents: contentsFor(contents, model),
        config: {
          systemInstruction: system,
          thinkingConfig: { thinkingLevel },
          ...(tools ? { tools: [{ functionDeclarations: tools }] } : {}),
        },
      });
      const candidate = response.candidates?.[0];
      return {
        model,
        content: { ...(candidate?.content ?? { role: "model", parts: [] }), producedBy: model },
        finishReason: candidate?.finishReason ?? null,
      };
    } catch (error) {
      if (!isQuotaError(error)) throw error;
      exhaustedUntil.set(model, Date.now() + retryAfterMs(error));
      lastError = error;
    }
  }

  throw lastError ?? new Error("Every Gemini model is out of quota. Try again later.");
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
