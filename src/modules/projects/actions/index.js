"use server";

import db from "@/lib/db";
import { ActionErrorCode, fail, ok } from "@/lib/action-result";
import { getCurrentUser } from "@/modules/auth/actions";
import { validateInstructions } from "@/lib/instructions";
import { MessageType } from "@prisma/client";

const UNAUTHORIZED = () => fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

export const createProject = async (name) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const trimmed = (name ?? "").trim();
  if (!trimmed) return fail(ActionErrorCode.INTERNAL, "Give your project a name.");

  try {
    const project = await db.project.create({ data: { name: trimmed.slice(0, 80), userId: user.id } });
    return ok(project);
  } catch (error) {
    console.error("createProject failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Failed to create project. Please try again.");
  }
};

/** The user's projects (starred first, then most recently updated) with chat counts. */
export const getProjects = async () => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  try {
    const projects = await db.project.findMany({
      where: { userId: user.id },
      orderBy: [{ starred: "desc" }, { updatedAt: "desc" }],
      include: { _count: { select: { chats: true } } },
    });

    return ok(projects);
  } catch (error) {
    console.error("getProjects failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not load projects.");
  }
};

/** A project with its recent chats and its latest generated version. */
export const getProjectById = async (projectId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  try {
    const project = await db.project.findFirst({
      where: { id: projectId, userId: user.id },
      include: {
        chats: { orderBy: { updatedAt: "desc" }, select: { id: true, title: true, updatedAt: true } },
      },
    });

    if (!project) return fail(ActionErrorCode.NOT_FOUND, "Project not found.");

    const latestVersion = await db.fragment.findFirst({
      where: { message: { type: MessageType.RESULT, chat: { projectId } } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        sandboxUrl: true,
        createdAt: true,
        message: { select: { chatId: true } },
      },
    });

    return ok({ ...project, latestVersion });
  } catch (error) {
    console.error("getProjectById failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not load the project.");
  }
};

export const renameProject = async (projectId, name) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const trimmed = (name ?? "").trim();
  if (!trimmed) return fail(ActionErrorCode.INTERNAL, "Name cannot be empty.");

  const { count } = await db.project.updateMany({ where: { id: projectId, userId: user.id }, data: { name: trimmed.slice(0, 80) } });
  return count ? ok({ id: projectId }) : fail(ActionErrorCode.NOT_FOUND, "Project not found.");
};

/** Standing rules for every chat in this project. Empty string clears them. */
export const updateProjectInstructions = async (projectId, value) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const { instructions, error } = validateInstructions(value);
  if (error) return fail(ActionErrorCode.INVALID_INPUT, error);

  const { count } = await db.project.updateMany({
    where: { id: projectId, userId: user.id },
    data: { instructions: instructions || null },
  });
  return count
    ? ok({ id: projectId, instructions: instructions || null })
    : fail(ActionErrorCode.NOT_FOUND, "Project not found.");
};

export const setProjectStarred = async (projectId, starred) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const { count } = await db.project.updateMany({ where: { id: projectId, userId: user.id }, data: { starred: !!starred } });
  return count ? ok({ id: projectId, starred: !!starred }) : fail(ActionErrorCode.NOT_FOUND, "Project not found.");
};

/** Deletes a project and every chat in it. */
export const deleteProject = async (projectId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const { count } = await db.project.deleteMany({ where: { id: projectId, userId: user.id } });
  return count ? ok({ id: projectId }) : fail(ActionErrorCode.NOT_FOUND, "Project not found.");
};
