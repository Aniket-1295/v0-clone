import { GoogleGenAI } from "@google/genai";

// Gemini 3 model for the code agent. Override with GEMINI_MODEL without a code change.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// How much the model thinks per turn (MINIMAL, LOW, MEDIUM, HIGH). Lower is much faster.
const AGENT_THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || "LOW";

// Created lazily so `next build` does not need GEMINI_API_KEY.
let client;
const getClient = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

/**
 * One model turn. Returns the model's content exactly as received: Gemini 3 attaches a
 * thoughtSignature to function-call parts, and it must be sent back unchanged on the next
 * turn or the request is rejected.
 */
export const runGeminiTurn = async ({ system, contents, tools, thinkingLevel = AGENT_THINKING_LEVEL }) => {
  const response = await getClient().models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: system,
      thinkingConfig: { thinkingLevel },
      ...(tools ? { tools: [{ functionDeclarations: tools }] } : {}),
    },
  });

  const candidate = response.candidates?.[0];
  return {
    content: candidate?.content ?? { role: "model", parts: [] },
    finishReason: candidate?.finishReason ?? null,
  };
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
  });
  return textOf(content).trim();
};
