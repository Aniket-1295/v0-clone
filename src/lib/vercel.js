// Publishing: deploys a chat's app (a Fragment's file tree) to its own Vercel project with
// Vercel's REST API. Needs VERCEL_TOKEN; VERCEL_TEAM_ID picks the team (scope) to deploy to.

const API = "https://api.vercel.com";
const MAX_ERROR_CHARS = 1500;

// `next dev` tolerates TypeScript errors but `next build` fails on them; a published app
// should build whenever its preview worked. Only the untouched default config is replaced.
const DEFAULT_NEXT_CONFIG_MARKER = "/* config options here */";
const PUBLISH_NEXT_CONFIG = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
`;

export const isPublishConfigured = () => !!process.env.VERCEL_TOKEN;

const withTeam = (path) => {
  const team = process.env.VERCEL_TEAM_ID;
  if (!team) return path;
  return `${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(team)}`;
};

const vercel = async (path, options = {}) => {
  const response = await fetch(`${API}${withTeam(path)}`, {
    ...options,
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, "Content-Type": "application/json", ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Vercel API error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
};

/** A valid, readable Vercel project name for a chat, e.g. "v0-rosas-bakery-k2x9qz". */
export const projectNameFor = (chat) => {
  const slug = (chat.title || "app")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return `v0-${slug || "app"}-${chat.id.slice(-6).toLowerCase()}`;
};

/** Starts a production deployment of `files` ({ path: content }). Returns its id. */
export const createDeployment = async ({ projectName, files }) => {
  const entries = Object.entries(files).filter(([, content]) => typeof content === "string");
  const deployment = await vercel("/v13/deployments?skipAutoDetectionConfirmation=1", {
    method: "POST",
    body: JSON.stringify({
      name: projectName,
      target: "production",
      projectSettings: { framework: "nextjs" },
      files: entries.map(([file, content]) => ({
        file: file.replace(/^\/+/, ""),
        data: file === "next.config.ts" && content.includes(DEFAULT_NEXT_CONFIG_MARKER) ? PUBLISH_NEXT_CONFIG : content,
        encoding: "utf-8",
      })),
    }),
  });
  return { id: deployment.id };
};

// The permanent production address: the project's shortest *.vercel.app alias.
const productionUrl = (deployment) => {
  const aliases = (deployment.alias ?? []).filter((alias) => alias.endsWith(".vercel.app"));
  const best = aliases.sort((a, b) => a.length - b.length)[0] ?? deployment.url;
  return best ? `https://${best}` : null;
};

const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, "");
// npm prints these on every Vercel build; they are never the cause.
const NOISE = /^npm warn|Unknown env config|next major version of npm/i;

/** The build log from its first error onwards (colour codes and npm noise removed). */
const buildError = async (deploymentId) => {
  try {
    const events = await vercel(`/v3/deployments/${deploymentId}/events?direction=backward&limit=80`);
    const lines = (Array.isArray(events) ? events : [])
      .map((event) => ({ type: event.type, text: stripAnsi(event.payload?.text ?? event.text ?? "") }))
      .filter(({ type, text }) => text.trim() && (type === "stderr" || /error|failed/i.test(text)))
      .flatMap(({ text }) => text.split("\n"))
      .map((line) => line.trimEnd())
      .filter((line) => line.trim() && !NOISE.test(line))
      .reverse();
    const firstError = lines.findIndex((line) => /error/i.test(line));
    return lines.slice(Math.max(firstError, 0)).join("\n").slice(0, MAX_ERROR_CHARS) || null;
  } catch {
    return null;
  }
};

/** { state: "building" | "ready" | "error", url?, error? } for a deployment. */
export const getDeploymentState = async (deploymentId) => {
  const deployment = await vercel(`/v13/deployments/${deploymentId}`);
  if (deployment.readyState === "READY") {
    // Production aliases are attached right after the build; wait for them.
    if (deployment.aliasAssigned === false || !(deployment.alias?.length > 0)) return { state: "building" };
    return { state: "ready", url: productionUrl(deployment) };
  }
  if (deployment.readyState === "ERROR" || deployment.readyState === "CANCELED") {
    return {
      state: "error",
      error: (await buildError(deploymentId)) || deployment.errorMessage || "The build failed on Vercel.",
    };
  }
  return { state: "building" };
};
