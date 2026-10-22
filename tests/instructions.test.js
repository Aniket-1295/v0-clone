import { describe, expect, it } from "vitest";
import {
  MAX_INSTRUCTIONS_LENGTH,
  buildInstructionsNote,
  loadChatInstructions,
  validateInstructions,
} from "@/lib/instructions";

describe("validateInstructions", () => {
  it("trims and accepts normal text", () => {
    expect(validateInstructions("  Use blue buttons \n")).toEqual({ instructions: "Use blue buttons" });
  });

  it("allows empty or missing values to clear the rules", () => {
    expect(validateInstructions("")).toEqual({ instructions: "" });
    expect(validateInstructions("   ")).toEqual({ instructions: "" });
    expect(validateInstructions(null)).toEqual({ instructions: "" });
    expect(validateInstructions(undefined)).toEqual({ instructions: "" });
  });

  it("rejects non-strings and text over the limit", () => {
    expect(validateInstructions(12).error).toMatch(/must be text/);
    expect(validateInstructions("a".repeat(MAX_INSTRUCTIONS_LENGTH)).instructions).toHaveLength(
      MAX_INSTRUCTIONS_LENGTH
    );
    expect(validateInstructions("a".repeat(MAX_INSTRUCTIONS_LENGTH + 1)).error).toMatch(/too long/);
  });
});

describe("buildInstructionsNote", () => {
  it("returns nothing when both sides are empty", () => {
    expect(buildInstructionsNote({})).toBe("");
    expect(buildInstructionsNote({ project: "  ", chat: "" })).toBe("");
  });

  it("includes only the project block when chat is empty", () => {
    const note = buildInstructionsNote({ project: "Always use Inter." });
    expect(note).toContain("Project instructions:");
    expect(note).toContain("Always use Inter.");
    expect(note).not.toContain("Chat instructions:");
    expect(note).toContain("do not override the file-safety");
  });

  it("includes only the chat block when project is empty", () => {
    const note = buildInstructionsNote({ chat: "One-page pricing only." });
    expect(note).toContain("Chat instructions:");
    expect(note).toContain("One-page pricing only.");
    expect(note).not.toContain("Project instructions:");
  });

  it("includes both and says chat wins on conflict", () => {
    const note = buildInstructionsNote({
      project: "Use green.",
      chat: "Use red for this chat.",
    });
    expect(note).toContain("Project instructions:");
    expect(note).toContain("Use green.");
    expect(note).toContain("Chat instructions:");
    expect(note).toContain("Use red for this chat.");
    expect(note).toContain("follow the chat instructions");
  });

  it("ignores non-string values", () => {
    expect(buildInstructionsNote({ project: 1, chat: null })).toBe("");
  });
});

describe("loadChatInstructions", () => {
  it("returns empty rules when the chat is missing", async () => {
    expect(await loadChatInstructions({ chat: { findFirst: async () => null } }, "c1")).toEqual({
      project: "",
      chat: "",
    });
    expect(await loadChatInstructions({ chat: { findFirst: async () => null } }, "")).toEqual({
      project: "",
      chat: "",
    });
  });

  it("reads project and chat text from the row", async () => {
    const db = {
      chat: {
        findFirst: async () => ({
          instructions: "Keep it one screen.",
          project: { instructions: "Use Inter." },
        }),
      },
    };
    expect(await loadChatInstructions(db, "c1")).toEqual({
      project: "Use Inter.",
      chat: "Keep it one screen.",
    });
  });
});
