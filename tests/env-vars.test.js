import { describe, expect, it } from "vitest";
import { ENV_KEY_PATTERN, maskValue, toEnvFile } from "@/lib/env-vars";

describe("env vars", () => {
  it("writes values quoted so any characters survive", () => {
    expect(toEnvFile({ A: "plain", B: 'with "quotes" and\nnewline' })).toBe('A="plain"\nB="with \\"quotes\\" and\\nnewline"\n');
  });

  it("masks values, showing only the end of long ones", () => {
    expect(maskValue("short")).toBe("••••••••");
    expect(maskValue("sk-proj-abcdefgh1234")).toBe("••••••••1234");
  });

  it("accepts UPPER_SNAKE_CASE names only", () => {
    for (const ok of ["OPENAI_API_KEY", "_PRIVATE", "NEXT_PUBLIC_X1"]) expect(ENV_KEY_PATTERN.test(ok)).toBe(true);
    for (const bad of ["openai", "1KEY", "MY-KEY", "A B"]) expect(ENV_KEY_PATTERN.test(bad)).toBe(false);
  });
});
