// Push to GitHub: OAuth (each user connects their own account) and exporting a version's
// files to a repository as one commit. Needs GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET
// (a GitHub OAuth App whose callback URL is <app>/api/github/callback).

import { SITE_SLUG } from "@/lib/site";

const API = "https://api.github.com";
// `repo` lets the app create private repositories and push to them.
const SCOPES = "repo";
const MAX_FILE_BYTES = 1024 * 1024;

export const isGithubConfigured = () => !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

export const authorizeUrl = ({ state, redirectUri }) => {
  const params = new URLSearchParams({ client_id: process.env.GITHUB_CLIENT_ID, redirect_uri: redirectUri, scope: SCOPES, state, allow_signup: "true" });
  return `https://github.com/login/oauth/authorize?${params}`;
};

/** Trades the OAuth code for an access token. */
export const exchangeCode = async ({ code, redirectUri }) => {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code, redirect_uri: redirectUri }),
  });
  const body = await response.json();
  if (!body.access_token) throw new Error(body.error_description || "GitHub did not return a token.");
  return body.access_token;
};

const github = async (token, path, options = {}) => {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.errors?.map((error) => error.message).filter(Boolean).join("; ");
    const error = new Error(detail || body.message || `GitHub API error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
};

export const getGithubUser = (token) => github(token, "/user");

/** Removes the app's access for this token (best effort, when the user disconnects). */
export const revokeToken = async (token) => {
  const basic = Buffer.from(`${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`).toString("base64");
  await fetch(`${API}/applications/${process.env.GITHUB_CLIENT_ID}/grant`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${basic}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: token }),
  }).catch(() => {});
};

/** A valid repository name from a chat title, e.g. "rosas-bakery". */
export const repoNameFor = (title) =>
  String(title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80) || `${SITE_SLUG}-app`;

/**
 * The Git tree for a version's files ({ path: content }): text files only, no dot files
 * (secrets live in .env files) and nothing over 1 MB. Returns { tree, skipped }.
 */
export const buildTree = (files) => {
  const tree = [];
  const skipped = [];
  for (const [rawPath, content] of Object.entries(files ?? {})) {
    const path = rawPath.replace(/^\/+/, "");
    const hidden = path.split("/").some((part) => part.startsWith("."));
    if (typeof content !== "string" || hidden || path.split("/").includes("..")) {
      skipped.push(path);
      continue;
    }
    if (Buffer.byteLength(content) > MAX_FILE_BYTES) {
      skipped.push(path);
      continue;
    }
    tree.push({ path, mode: "100644", type: "blob", content });
  }
  tree.sort((a, b) => a.path.localeCompare(b.path));
  return { tree, skipped };
};

/** Creates a repository for the signed-in user. Returns { repo: "owner/name", branch }. */
export const createRepository = async (token, { name, isPrivate, description }) => {
  // auto_init gives the repository a first commit, so the branch exists to push onto.
  const repo = await github(token, "/user/repos", {
    method: "POST",
    body: JSON.stringify({ name, private: isPrivate, description, auto_init: true }),
  });
  return { repo: repo.full_name, branch: repo.default_branch || "main", url: repo.html_url };
};

/**
 * Pushes `files` as one commit on `branch`, replacing the previous tree entirely (files the
 * version no longer has are removed). Returns the commit sha.
 */
export const pushFiles = async (token, { repo, branch, files, message }) => {
  const { tree } = buildTree(files);
  if (tree.length === 0) throw new Error("This version has no files to push.");

  const ref = await github(token, `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  const parent = ref.object.sha;
  const newTree = await github(token, `/repos/${repo}/git/trees`, { method: "POST", body: JSON.stringify({ tree }) });
  const commit = await github(token, `/repos/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree.sha, parents: [parent] }),
  });
  await github(token, `/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });
  return commit.sha;
};

/** The user's repositories (own, collaborator, organization), most recently pushed first. */
export const listRepositories = async (token) => {
  const repos = await github(token, "/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member");
  return repos.map((repo) => ({
    fullName: repo.full_name,
    private: repo.private,
    defaultBranch: repo.default_branch || "main",
    description: repo.description || "",
    pushedAt: repo.pushed_at,
  }));
};

/** Branch names of a repository ("owner/name"). */
export const listBranches = async (token, repo) => {
  const branches = await github(token, `/repos/${repo}/branches?per_page=100`);
  return branches.map((branch) => branch.name);
};

/**
 * Downloads a branch of a repository as a zip (one request; GitHub redirects to a signed
 * codeload URL). Refuses archives over `maxBytes`. Returns the bytes as a Uint8Array.
 */
export const downloadZipball = async (token, repo, branch, maxBytes) => {
  const response = await fetch(`${API}/repos/${repo}/zipball/${encodeURIComponent(branch)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!response.ok) {
    const error = new Error(`GitHub API error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const declared = Number(response.headers.get("content-length"));
  if (declared && declared > maxBytes) throw Object.assign(new Error("Repository is too large to import."), { tooLarge: true });

  // Read with a running cap: codeload often streams without a content-length.
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maxBytes) throw Object.assign(new Error("Repository is too large to import."), { tooLarge: true });
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
};
