"use server";

import { inngest } from "@/inngest/client";
import db from "@/lib/db";
import { consumeCredits } from "@/lib/usage";
import { ActionErrorCode, fail, ok } from "@/lib/action-result";
import { getCurrentUser } from "@/modules/auth/actions";
import { MessageRole, MessageType } from "@prisma/client";
import { generateSlug } from "random-word-slugs";

const OUT_OF_CREDITS_MESSAGE =
  "You have run out of credits. Upgrade to keep generating.";

export const createProject = async (value) => {
  const user = await getCurrentUser();

  if (!user) return fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

  try {
    await consumeCredits();
  } catch (error) {
    // rate-limiter-flexible rejects with a RateLimiterRes (not an Error) when
    // the user is out of points; anything else is a real failure.
    if (error instanceof Error) {
      console.error("consumeCredits failed:", error);
      return fail(ActionErrorCode.INTERNAL, "Something went wrong. Please try again.");
    }

    return fail(ActionErrorCode.TOO_MANY_REQUESTS, OUT_OF_CREDITS_MESSAGE);
  }

  try {
    const newProject = await db.project.create({
      data: {
        name: generateSlug(2, { format: "kebab" }),
        userId: user.id,
        messages: {
          create: {
            content: value,
            role: MessageRole.USER,
            type: MessageType.RESULT,
          },
        },
      },
    });

    await inngest.send({
      name: "code-agent/run",
      data: {
        value: value,
        projectId: newProject.id,
        userId: user.clerkId,
      },
    });

    return ok(newProject);
  } catch (error) {
    console.error("createProject failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Failed to create project. Please try again.");
  }
};

export const getProjects = async () => {
  const user = await getCurrentUser();

  if (!user) return fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

  const projects = await db.project.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return ok(projects);
};

export const getProjectById = async (projectId) => {
  const user = await getCurrentUser();

  if (!user) return fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

  const project = await db.project.findUnique({
    where: {
      id: projectId,
      userId: user.id,
    },
  });

  if (!project) return fail(ActionErrorCode.NOT_FOUND, "Project not found.");

  return ok(project);
};
