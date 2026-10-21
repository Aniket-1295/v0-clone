import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, isSecretsConfigured } from "@/lib/secrets";

describe("secrets", () => {
  beforeEach(() => {
    process.env.ENV_VARS_SECRET = randomBytes(32).toString("base64");
  });

  it("round-trips a value and never stores it in plain text", () => {
    const stored = encryptSecret("sk-test-123");
    expect(stored).not.toContain("sk-test-123");
    expect(decryptSecret(stored)).toBe("sk-test-123");
    expect(encryptSecret("sk-test-123")).not.toBe(stored); // fresh IV each time
  });

  it("rejects tampered values", () => {
    const [iv, tag, data] = encryptSecret("value").split(".");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 1;
    expect(() => decryptSecret([iv, tag, flipped.toString("base64")].join("."))).toThrow();
  });

  it("requires a 32-byte key", () => {
    process.env.ENV_VARS_SECRET = Buffer.from("short").toString("base64");
    expect(isSecretsConfigured()).toBe(false);
    expect(() => encryptSecret("x")).toThrow(/32 bytes/);
  });
});
