import { cookies } from "next/headers";

import db from "@/lib/db";
import { PERSONAL_WORKSPACE, WORKSPACE_COOKIE, isPersonalWorkspace, isTeamMember, parseWorkspaceId } from "@/lib/teams";

const COOKIE = {
  path: "/",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365,
};

export const readWorkspaceCookie = async () => {
  try {
    const jar = await cookies();
    return parseWorkspaceId(jar.get(WORKSPACE_COOKIE)?.value);
  } catch {
    return PERSONAL_WORKSPACE;
  }
};

export const writeWorkspaceCookie = async (id) => {
  const jar = await cookies();
  jar.set(WORKSPACE_COOKIE, parseWorkspaceId(id), COOKIE);
};

/** Cookie value, or Personal when the user is not a member of that team. */
export const resolveActiveWorkspace = async (userId) => {
  const id = await readWorkspaceCookie();
  if (isPersonalWorkspace(id) || !userId) return PERSONAL_WORKSPACE;
  return (await isTeamMember(db, id, userId)) ? id : PERSONAL_WORKSPACE;
};
