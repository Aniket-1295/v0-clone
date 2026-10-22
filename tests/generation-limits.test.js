import { describe, expect, it, vi } from "vitest";
import db from "@/lib/db";
import { ActionErrorCode } from "@/lib/action-result";
import { MAX_PROMPT_LENGTH, RUN_STALE_MS, findRunningChatId, validatePrompt } from "@/lib/generation-limits";
import { checkNoRunningGeneration } from "@/lib/generation-guard";

describe("validatePrompt", () => {
  it("trims and accepts a normal prompt", () => {
    expect(validatePrompt("  Build a todo app \n")).toEqual({ prompt: "Build a todo app" });
  });

  it("rejects empty, blank and non-string prompts", () => {
    expect(validatePrompt("").error).toBeTruthy();
    expect(validatePrompt("   \n ").error).toBeTruthy();
    expect(validatePrompt(undefined).error).toBeTruthy();
    expect(validatePrompt({ text: "hi" }).error).toBeTruthy();
  });

  it("allows exactly the limit and rejects one character more", () => {
    expect(validatePrompt("a".repeat(MAX_PROMPT_LENGTH)).prompt).toHaveLength(MAX_PROMPT_LENGTH);
    expect(validatePrompt("a".repeat(MAX_PROMPT_LENGTH + 1)).error).toMatch(/too long/);
  });

  it("measures the trimmed prompt", () => {
    expect(validatePrompt(` ${"a".repeat(MAX_PROMPT_LENGTH)} `).prompt).toBeDefined();
  });
});

describe("findRunningChatId", () => {
  const now = Date.parse("2026-10-22T12:00:00Z");
  const ago = (ms) => new Date(now - ms);

  it("finds a chat whose latest message is a recent prompt", () => {
    const messages = [
      { chatId: "b", role: "ASSISTANT", createdAt: ago(1_000) },
      { chatId: "a", role: "USER", createdAt: ago(60_000) },
    ];
    expect(findRunningChatId(messages, now)).toBe("a");
  });

  it("ignores a prompt that already has a reply", () => {
    const messages = [
      { chatId: "a", role: "ASSISTANT", createdAt: ago(1_000) },
      { chatId: "a", role: "USER", createdAt: ago(60_000) },
    ];
    expect(findRunningChatId(messages, now)).toBeNull();
  });

  it("treats a prompt older than the stale window as stuck, not running", () => {
    expect(findRunningChatId([{ chatId: "a", role: "USER", createdAt: ago(RUN_STALE_MS + 1) }], now)).toBeNull();
  });

  it("returns null with no recent messages", () => {
    expect(findRunningChatId([], now)).toBeNull();
  });
});

describe("checkNoRunningGeneration", () => {
  it("fails while one of the user's chats is generating", async () => {
    db.message = { findMany: vi.fn().mockResolvedValue([{ chatId: "a", role: "USER", createdAt: new Date() }]) };
    const result = await checkNoRunningGeneration("user_1");
    expect(result).toMatchObject({ ok: false, code: ActionErrorCode.GENERATION_IN_PROGRESS });
    expect(db.message.findMany.mock.calls[0][0].where.chat).toEqual({ userId: "user_1" });
  });

  it("passes when nothing is generating", async () => {
    db.message = { findMany: vi.fn().mockResolvedValue([{ chatId: "a", role: "ASSISTANT", createdAt: new Date() }]) };
    expect(await checkNoRunningGeneration("user_1")).toBeNull();
  });
});
