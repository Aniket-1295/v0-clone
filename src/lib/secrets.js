import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM for secrets stored in the database (chat environment variables).
// ENV_VARS_SECRET is 32 random bytes, base64 (e.g. `openssl rand -base64 32`).

const getKey = () => {
  const key = Buffer.from(process.env.ENV_VARS_SECRET ?? "", "base64");
  if (key.length !== 32) throw new Error("ENV_VARS_SECRET must be 32 bytes, base64-encoded.");
  return key;
};

export const isSecretsConfigured = () => Buffer.from(process.env.ENV_VARS_SECRET ?? "", "base64").length === 32;

/** "iv.tag.ciphertext", each base64. */
export const encryptSecret = (plain) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64")).join(".");
};

export const decryptSecret = (stored) => {
  const [iv, tag, data] = stored.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
};
