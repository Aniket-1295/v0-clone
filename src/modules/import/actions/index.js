"use server";

import { MessageRole, MessageType } from "@prisma/client";
import db from "@/lib/db";
import { ActionErrorCode, fail, ok } from "@/lib/action-result";
import { decryptSecret } from "@/lib/secrets";
import { downloadZipball, isGithubConfigured, listBranches, listRepositories } from "@/lib/github";
import { MAX_ZIP_BYTES, filesFromZipball, normalizeFolder, selectNextApp } from "@/lib/github-import";
import { getCurrentUser } from "@/modules/auth/actions";

const UNAUTHORIZED = () => fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const MAX_BRANCH_LENGTH = 250;

/** The signed-in user's GitHub token, or a failed result explaining what to do. */
const githubTokenFor = async (userId) => {
  if (!isGithubConfigured()) return { error: fail(ActionErrorCode.INTERNAL, "GitHub is not set up on this server.") };
  const account = await db.user.findUnique({ where: { id: userId }, select: { githubTokenEncrypted: true } });
  if (!account?.githubTokenEncrypted) return { error: fail(ActionErrorCode.UNAUTHORIZED, "Connect your GitHub account first.") };
  return { token: decryptSecret(account.githubTokenEncrypted) };
};

/** A GitHub API failure as a result the import page can show. */
const githubFailure = async (error, userId, fallback) => {
  if (error.status === 401) {
    await db.user.update({ where: { id: userId }, data: { githubLogin: null, githubTokenEncrypted: null } });
    return fail(ActionErrorCode.UNAUTHORIZED, "Your GitHub connection has expired. Connect GitHub again.");
  }
  if (error.status === 404) return fail(ActionErrorCode.NOT_FOUND, "Repository or branch not found, or your GitHub account cannot access it.");
  if (error.tooLarge) return fail(ActionErrorCode.INVALID_INPUT, "This repository is too large to import (over 30 MB as a zip).");
  console.error(fallback, error.message);
  return fail(ActionErrorCode.INTERNAL, fallback);
};

/** Whether GitHub is set up and connected, for the import page. */
export const getImportStatus = async () => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  const account = await db.user.findUnique({ where: { id: user.id }, select: { githubLogin: true, githubTokenEncrypted: true } });
  return ok({
    configured: isGithubConfigured(),
    connected: !!account?.githubTokenEncrypted,
    login: account?.githubLogin ?? null,
  });
};

/** The user's GitHub repositories, most recently pushed first. */
export const getGithubRepos = async () => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  const { token, error } = await githubTokenFor(user.id);
  if (error) return error;
  try {
    return ok(await listRepositories(token));
  } catch (githubError) {
    return githubFailure(githubError, user.id, "Could not load your repositories. Please try again.");
  }
};

/** Branch names of one of the user's repositories. */
export const getGithubBranches = async (repo) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  if (!REPO_PATTERN.test(repo ?? "")) return fail(ActionErrorCode.INVALID_INPUT, "Choose a repository.");
  const { token, error } = await githubTokenFor(user.id);
  if (error) return error;
  try {
    return ok(await listBranches(token, repo));
  } catch (githubError) {
    return githubFailure(githubError, user.id, "Could not load the branches. Please try again.");
  }
};

/**
 * Starts a chat from a GitHub repository: downloads `branch`, keeps the Next.js app at
 * `folder` (or the only one found), and saves its files as the chat's first version. Costs no
 * credit. The chat page builds the preview sandbox from that version when it opens.
 */
export const importGithubRepo = async ({ repo, branch, folder = "", projectId = null } = {}) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  if (!REPO_PATTERN.test(repo ?? "")) return fail(ActionErrorCode.INVALID_INPUT, "Choose a repository.");
  if (!branch || typeof branch !== "string" || branch.length > MAX_BRANCH_LENGTH) {
    return fail(ActionErrorCode.INVALID_INPUT, "Choose a branch.");
  }
  const cleanFolder = normalizeFolder(folder);
  if (cleanFolder === null) return fail(ActionErrorCode.INVALID_INPUT, "That folder name is not valid.");

  if (projectId) {
    const project = await db.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true } });
    if (!project) return fail(ActionErrorCode.NOT_FOUND, "Project not found.");
  }

  const { token, error } = await githubTokenFor(user.id);
  if (error) return error;

  let zip;
  try {
    zip = await downloadZipball(token, repo, branch, MAX_ZIP_BYTES);
  } catch (githubError) {
    return githubFailure(githubError, user.id, "Could not download the repository. Please try again.");
  }

  let extracted;
  try {
    extracted = filesFromZipball(zip);
  } catch {
    return fail(ActionErrorCode.INVALID_INPUT, "Could not read the repository archive.");
  }

  const app = selectNextApp(extracted.files, cleanFolder);
  if (app.error) {
    const hint = app.candidates?.length ? ` Next.js apps found in: ${app.candidates.map((c) => c || "(root)").join(", ")}.` : "";
    return fail(ActionErrorCode.INVALID_INPUT, `${app.error}${hint}`);
  }

  const name = repo.split("/")[1];
  const source = `${repo}${app.folder ? `/${app.folder}` : ""}`;
  const fileCount = Object.keys(app.files).length;
  const skippedNote = extracted.skipped
    ? ` ${extracted.skipped} file${extracted.skipped === 1 ? " was" : "s were"} left out (images and other binary files, lockfiles, hidden or very large files).`
    : "";

  try {
    const chat = await db.chat.create({ data: { title: name, userId: user.id, projectId } });

    // Created one after the other so the chat shows them in this order.
    await db.message.create({
      data: { chatId: chat.id, content: `Import ${source} (branch ${branch}) from GitHub.`, role: MessageRole.USER, type: MessageType.RESULT },
    });
    await db.message.create({
      data: {
        chatId: chat.id,
        content: `Imported **${source}** at \`${branch}\`: ${fileCount} files.${skippedNote} The preview starts in a moment; ask me for any change you want.`,
        role: MessageRole.ASSISTANT,
        type: MessageType.RESULT,
        // No sandbox yet: the chat page builds one from these files (see wakeChatSandbox).
        fragments: { create: { sandboxUrl: "", title: `Imported ${name}`, files: app.files } },
      },
    });

    if (projectId) await db.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });

    return ok({ id: chat.id });
  } catch (dbError) {
    console.error("importGithubRepo failed:", dbError);
    return fail(ActionErrorCode.INTERNAL, "Could not create the chat. Please try again.");
  }
};
