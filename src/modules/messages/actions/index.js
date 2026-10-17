"use server";

import { MessageRole, MessageType } from "@prisma/client";
import db from "@/lib/db";
import { inngest } from "@/inngest/client";
import { getCurrentUser } from "@/modules/auth/actions";
import { consumeCredits } from "@/lib/usage";
import { ActionErrorCode, fail, ok } from "@/lib/action-result";

const OUT_OF_CREDITS_MESSAGE =
  "You have run out of credits. Upgrade to keep generating.";

export const createMessages = async (value, projectId) => {
  const user = await getCurrentUser();

  if (!user) return fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

  const project = await db.project.findUnique({
    where: {
      id: projectId,
      userId: user.id,
    },
  });

  if (!project) return fail(ActionErrorCode.NOT_FOUND, "Project not found.");

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
    const newMessage = await db.message.create({
      data: {
        projectId: projectId,
        content: value,
        role: MessageRole.USER,
        type: MessageType.RESULT,
      },
    });

    await inngest.send({
      name: "code-agent/run",
      data: {
        value: value,
        projectId: projectId,
        userId: user.clerkId,
      },
    });

    return ok(newMessage);
  } catch (error) {
    console.error("createMessages failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Failed to send message. Please try again.");
  }
};

export const getMessages = async (projectId) => {
  const user = await getCurrentUser();

  if (!user) return fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

  const project = await db.project.findUnique({
    where: {
      id: projectId,
      userId: user.id,
    },
  });

  if (!project) return fail(ActionErrorCode.NOT_FOUND, "Project not found.");

  const messages = await db.message.findMany({
    where:{
        projectId
    },
    orderBy:{
        updatedAt:"asc"
    },
    include:{
        fragments:true
    }
  })

  return ok(messages);
};
