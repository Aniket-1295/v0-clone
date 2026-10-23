"use server";

import db from "@/lib/db";
import { ActionErrorCode, fail, ok } from "@/lib/action-result";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { findAccessibleProject, projectListWhere } from "@/lib/teams";
import { getCurrentUser } from "@/modules/auth/actions";
import { validateInstructions } from "@/lib/instructions";
import { MessageType } from "@prisma/client";

const UNAUTHORIZED = () => fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");
const NOT_FOUND = () => fail(ActionErrorCode.NOT_FOUND, "Project not found.");

export const createProject = async (name) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const trimmed = (name ?? "").trim();
  if (!trimmed) return fail(ActionErrorCode.INTERNAL, "Give your project a name.");

  const workspace = await resolveActiveWorkspace(user.id);
  const teamId = workspace === "personal" ? null : workspace;

  try {
    const project = await db.project.create({
      data: { name: trimmed.slice(0, 80), userId: user.id, teamId },
    });
    return ok(project);
  } catch (error) {
    console.error("createProject failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Failed to create project. Please try again.");
  }
};

/** The active workspace's projects (starred first, then most recently updated) with chat counts. */
export const getProjects = async () => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  try {
    const workspace = await resolveActiveWorkspace(user.id);
    const projects = await db.project.findMany({
      where: projectListWhere({ userId: user.id, workspaceId: workspace }),
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
    if (!(await findAccessibleProject(db, projectId, user.id))) return NOT_FOUND();

    const project = await db.project.findFirst({
      where: { id: projectId },
      include: {
        chats: { orderBy: { updatedAt: "desc" }, select: { id: true, title: true, updatedAt: true } },
        designSystem: { select: { id: true, name: true, primaryColor: true, accentColor: true } },
      },
    });

    if (!project) return NOT_FOUND();

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
  if (!(await findAccessibleProject(db, projectId, user.id))) return NOT_FOUND();

  const { count } = await db.project.updateMany({ where: { id: projectId }, data: { name: trimmed.slice(0, 80) } });
  return count ? ok({ id: projectId }) : NOT_FOUND();
};

/** Standing rules for every chat in this project. Empty string clears them. */
export const updateProjectInstructions = async (projectId, value) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const { instructions, error } = validateInstructions(value);
  if (error) return fail(ActionErrorCode.INVALID_INPUT, error);
  if (!(await findAccessibleProject(db, projectId, user.id))) return NOT_FOUND();

  const { count } = await db.project.updateMany({
    where: { id: projectId },
    data: { instructions: instructions || null },
  });
  return count
    ? ok({ id: projectId, instructions: instructions || null })
    : NOT_FOUND();
};

/** Sets the project's default design system (or clears it with null). */
export const updateProjectDesignSystem = async (projectId, designSystemId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  if (designSystemId) {
    const owned = await db.designSystem.findFirst({ where: { id: designSystemId, userId: user.id }, select: { id: true } });
    if (!owned) return fail(ActionErrorCode.NOT_FOUND, "Design system not found.");
  }
  if (!(await findAccessibleProject(db, projectId, user.id))) return NOT_FOUND();

  const { count } = await db.project.updateMany({
    where: { id: projectId },
    data: { designSystemId: designSystemId || null },
  });
  return count
    ? ok({ id: projectId, designSystemId: designSystemId || null })
    : NOT_FOUND();
};

export const setProjectStarred = async (projectId, starred) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  if (!(await findAccessibleProject(db, projectId, user.id))) return NOT_FOUND();

  const { count } = await db.project.updateMany({ where: { id: projectId }, data: { starred: !!starred } });
  return count ? ok({ id: projectId, starred: !!starred }) : NOT_FOUND();
};

/** Deletes a project and every chat in it. */
export const deleteProject = async (projectId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  if (!(await findAccessibleProject(db, projectId, user.id))) return NOT_FOUND();

  const { count } = await db.project.deleteMany({ where: { id: projectId } });
  return count ? ok({ id: projectId }) : NOT_FOUND();
};
