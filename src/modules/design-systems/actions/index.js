"use server";

import db from "@/lib/db";
import { ActionErrorCode, fail, ok } from "@/lib/action-result";
import { getCurrentUser } from "@/modules/auth/actions";
import { validateDesignSystem, validateImportedDesignSystem } from "@/lib/design-system";

const UNAUTHORIZED = () => fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");

const SELECT = {
  id: true,
  name: true,
  primaryColor: true,
  accentColor: true,
  radius: true,
  font: true,
  tokens: true,
  updatedAt: true,
};

// An imported theme carries a `tokens` object; a simple theme carries hex colors + radius/font.
const validate = (input) => (input?.tokens ? validateImportedDesignSystem(input) : validateDesignSystem(input));

/** The user's design systems, newest first. */
export const listDesignSystems = async () => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  const systems = await db.designSystem.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: SELECT,
  });
  return ok(systems);
};

export const getDesignSystem = async (id) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  const system = await db.designSystem.findFirst({ where: { id, userId: user.id }, select: SELECT });
  return system ? ok(system) : fail(ActionErrorCode.NOT_FOUND, "Design system not found.");
};

export const createDesignSystem = async (input) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  const { data, error } = validate(input);
  if (error) return fail(ActionErrorCode.INVALID_INPUT, error);
  const system = await db.designSystem.create({ data: { ...data, userId: user.id }, select: SELECT });
  return ok(system);
};

export const updateDesignSystem = async (id, input) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  const { data, error } = validate(input);
  if (error) return fail(ActionErrorCode.INVALID_INPUT, error);
  const { count } = await db.designSystem.updateMany({ where: { id, userId: user.id }, data });
  return count ? ok({ id, ...data }) : fail(ActionErrorCode.NOT_FOUND, "Design system not found.");
};

/** Deletes a design system. Chats and projects that used it keep their apps; they just lose the theme. */
export const deleteDesignSystem = async (id) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  const { count } = await db.designSystem.deleteMany({ where: { id, userId: user.id } });
  return count ? ok({ id }) : fail(ActionErrorCode.NOT_FOUND, "Design system not found.");
};
