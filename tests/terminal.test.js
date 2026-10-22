import { describe, expect, it } from "vitest";
import { MAX_COMMAND_LENGTH, MAX_OUTPUT_BYTES, clampOutput, validateCommand } from "@/lib/terminal";

describe("validateCommand", () => {
  it("trims and accepts a command", () => {
    expect(validateCommand("  ls -la \n")).toEqual({ command: "ls -la" });
  });

  it("rejects empty, blank and non-string input", () => {
    expect(validateCommand("").error).toBeTruthy();
    expect(validateCommand("   ").error).toBeTruthy();
    expect(validateCommand(undefined).error).toBeTruthy();
  });

  it("rejects a command over the limit but accepts one at the limit", () => {
    expect(validateCommand("a".repeat(MAX_COMMAND_LENGTH)).command).toHaveLength(MAX_COMMAND_LENGTH);
    expect(validateCommand("a".repeat(MAX_COMMAND_LENGTH + 1)).error).toMatch(/too long/);
  });
});

describe("clampOutput", () => {
  it("leaves short output untouched", () => {
    expect(clampOutput("hello")).toBe("hello");
    expect(clampOutput("")).toBe("");
    expect(clampOutput(undefined)).toBe("");
  });

  it("keeps the tail and flags trimming when output is too long", () => {
    const result = clampOutput("x".repeat(MAX_OUTPUT_BYTES + 100));
    expect(result.startsWith("… (earlier output trimmed)")).toBe(true);
    expect(result.length).toBeLessThan(MAX_OUTPUT_BYTES + 60);
    expect(result.endsWith("x")).toBe(true);
  });
});
