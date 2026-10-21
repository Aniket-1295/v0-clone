import db from "@/lib/db";
import { decryptSecret } from "@/lib/secrets";

// Chat environment variables, server-side only. Values are decrypted just before they are
// written into a sandbox or sent to Vercel, and never returned to the browser.

export const ENV_KEY_PATTERN = /^[A-Z_][A-Z0-9_]*$/;
export const MAX_ENV_VARS = 50;
export const MAX_ENV_VALUE_BYTES = 4 * 1024;
// Written into the app root of the sandbox; snapshots skip dot files, so values never
// reach saved versions, zip downloads or shared pages.
export const SANDBOX_ENV_PATH = "/home/user/.env.local";

/** { KEY: value } for a chat. */
export const getChatEnv = async (chatId) => {
  const rows = await db.chatEnvVar.findMany({ where: { chatId }, orderBy: { key: "asc" } });
  return Object.fromEntries(rows.map((row) => [row.key, decryptSecret(row.valueEncrypted)]));
};

export const getChatEnvKeys = async (chatId) =>
  (await db.chatEnvVar.findMany({ where: { chatId }, orderBy: { key: "asc" }, select: { key: true } })).map((row) => row.key);

/** .env file text; values are double-quoted with escapes so any characters survive. */
export const toEnvFile = (env) =>
  Object.entries(env)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n") + "\n";

/** Shown instead of the value: dots, plus the last 4 characters of long values. */
export const maskValue = (value) => (value.length >= 12 ? `••••••••${value.slice(-4)}` : "••••••••");
