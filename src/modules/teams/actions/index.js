"use server";

import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { currentUser } from "@clerk/nextjs/server";

import db from "@/lib/db";
import { ActionErrorCode, fail, ok } from "@/lib/action-result";
import { readWorkspaceCookie, resolveActiveWorkspace, writeWorkspaceCookie } from "@/lib/active-workspace";
import {
  PERSONAL_WORKSPACE,
  TEAM_ROLE,
  assertTeamOwner,
  countTeamOwners,
  emailsMatch,
  getTeamMembership,
  inviteExpiresAt,
  isInviteOpen,
  isLastOwner,
  isPersonalWorkspace,
  isValidEmail,
  normalizeEmail,
  parseTeamName,
  parseWorkspaceId,
} from "@/lib/teams";
import { getCurrentUser } from "@/modules/auth/actions";

const UNAUTHORIZED = () => fail(ActionErrorCode.UNAUTHORIZED, "Please sign in first.");
const NOT_FOUND = (message = "Team not found.") => fail(ActionErrorCode.NOT_FOUND, message);
const FORBIDDEN = (message) => fail(ActionErrorCode.UNAUTHORIZED, message);

const MEMBER_SELECT = { id: true, userId: true, role: true, createdAt: true, user: { select: { name: true, email: true, image: true } } };
const INVITE_SELECT = { id: true, email: true, role: true, expiresAt: true, createdAt: true };

const originFromHeaders = async () => {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return host ? `${protocol}://${host}` : "";
};

const clerkEmails = async () => {
  try {
    const clerk = await currentUser();
    return (clerk?.emailAddresses ?? []).map((row) => row.emailAddress).filter(Boolean);
  } catch {
    return [];
  }
};

const emailMatchesInvite = async (user, inviteEmail) => {
  const candidates = [user.email, ...(await clerkEmails())];
  return candidates.some((email) => emailsMatch(email, inviteEmail));
};

export const listWorkspaces = async () => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const rows = await db.teamMember.findMany({
    where: { userId: user.id },
    select: { role: true, team: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return ok({
    personal: true,
    active: await resolveActiveWorkspace(user.id),
    teams: rows.map((row) => ({ id: row.team.id, name: row.team.name, role: row.role })),
  });
};

export const setActiveWorkspace = async (id) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const workspace = parseWorkspaceId(id);
  if (!isPersonalWorkspace(workspace)) {
    const member = await getTeamMembership(db, workspace, user.id);
    if (!member) return NOT_FOUND();
  }

  await writeWorkspaceCookie(workspace);
  return ok({ active: workspace });
};

export const createTeam = async (name) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const parsed = parseTeamName(name);
  if (parsed.error) return fail(ActionErrorCode.INVALID_INPUT, parsed.error);

  try {
    const team = await db.team.create({
      data: {
        name: parsed.name,
        members: { create: { userId: user.id, role: TEAM_ROLE.OWNER } },
      },
      select: { id: true, name: true },
    });
    await writeWorkspaceCookie(team.id);
    return ok({ id: team.id, name: team.name, role: TEAM_ROLE.OWNER });
  } catch (error) {
    console.error("createTeam failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not create the team. Please try again.");
  }
};

export const getTeam = async (teamId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const id = teamId || (await resolveActiveWorkspace(user.id));
  if (isPersonalWorkspace(id)) return NOT_FOUND("Select a team first.");

  const member = await getTeamMembership(db, id, user.id);
  if (!member) return NOT_FOUND();

  const team = await db.team.findFirst({
    where: { id },
    select: {
      id: true,
      name: true,
      members: { orderBy: { createdAt: "asc" }, select: MEMBER_SELECT },
      invites: {
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        select: INVITE_SELECT,
      },
    },
  });
  if (!team) return NOT_FOUND();

  return ok({
    id: team.id,
    name: team.name,
    role: member.role,
    isOwner: member.role === TEAM_ROLE.OWNER,
    members: team.members.map((row) => ({
      id: row.id,
      userId: row.userId,
      role: row.role,
      name: row.user.name,
      email: row.user.email,
      image: row.user.image,
    })),
    invites: team.invites,
  });
};

export const renameTeam = async (teamId, name) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  if (!(await assertTeamOwner(db, teamId, user.id))) return FORBIDDEN("Only the team owner can rename the team.");

  const parsed = parseTeamName(name);
  if (parsed.error) return fail(ActionErrorCode.INVALID_INPUT, parsed.error);

  const { count } = await db.team.updateMany({ where: { id: teamId }, data: { name: parsed.name } });
  return count ? ok({ id: teamId, name: parsed.name }) : NOT_FOUND();
};

export const inviteToTeam = async (teamId, email) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  if (!(await assertTeamOwner(db, teamId, user.id))) return FORBIDDEN("Only the team owner can invite people.");

  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return fail(ActionErrorCode.INVALID_INPUT, "Enter a valid email address.");

  const already = await db.teamMember.findFirst({
    where: { teamId, user: { email: { equals: normalized, mode: "insensitive" } } },
    select: { id: true },
  });
  if (already) return fail(ActionErrorCode.INVALID_INPUT, "That person is already on the team.");

  await db.teamInvite.deleteMany({ where: { teamId, email: normalized, acceptedAt: null } });

  const token = randomBytes(12).toString("base64url");
  const invite = await db.teamInvite.create({
    data: {
      teamId,
      email: normalized,
      token,
      role: TEAM_ROLE.MEMBER,
      invitedById: user.id,
      expiresAt: inviteExpiresAt(),
    },
    select: { id: true, email: true, expiresAt: true },
  });

  const origin = await originFromHeaders();
  return ok({ ...invite, acceptUrl: `${origin}/invite/${token}` });
};

export const revokeInvite = async (inviteId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const invite = await db.teamInvite.findFirst({ where: { id: inviteId }, select: { id: true, teamId: true } });
  if (!invite) return NOT_FOUND("Invite not found.");
  if (!(await assertTeamOwner(db, invite.teamId, user.id))) return FORBIDDEN("Only the team owner can revoke invites.");

  await db.teamInvite.delete({ where: { id: inviteId } });
  return ok({ id: inviteId });
};

export const removeMember = async (teamId, userId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  if (!(await assertTeamOwner(db, teamId, user.id))) return FORBIDDEN("Only the team owner can remove members.");

  const target = await getTeamMembership(db, teamId, userId);
  if (!target) return NOT_FOUND("Member not found.");

  const owners = await countTeamOwners(db, teamId);
  if (isLastOwner(owners, target.role)) {
    return fail(ActionErrorCode.INVALID_INPUT, "The team needs at least one owner.");
  }

  await db.teamMember.delete({ where: { id: target.id } });
  return ok({ teamId, userId });
};

export const leaveTeam = async (teamId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();

  const member = await getTeamMembership(db, teamId, user.id);
  if (!member) return NOT_FOUND();

  const owners = await countTeamOwners(db, teamId);
  if (isLastOwner(owners, member.role)) {
    return fail(ActionErrorCode.INVALID_INPUT, "Add another owner before leaving, or delete the team.");
  }

  const current = await readWorkspaceCookie();
  await db.teamMember.delete({ where: { id: member.id } });
  if (current === teamId) await writeWorkspaceCookie(PERSONAL_WORKSPACE);
  return ok({ teamId });
};

export const deleteTeam = async (teamId) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  if (!(await assertTeamOwner(db, teamId, user.id))) return FORBIDDEN("Only the team owner can delete the team.");

  try {
    const current = await readWorkspaceCookie();
    // onDelete: SetNull on Project.teamId — those projects become the creator's Personal ones.
    await db.team.delete({ where: { id: teamId } });
    if (current === teamId) await writeWorkspaceCookie(PERSONAL_WORKSPACE);
    return ok({ id: teamId });
  } catch (error) {
    console.error("deleteTeam failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not delete the team. Please try again.");
  }
};

/** Public preview of an invite (no token in the payload). */
export const getInvitePreview = async (token) => {
  if (!token || typeof token !== "string") return NOT_FOUND("Invite not found.");

  const invite = await db.teamInvite.findFirst({
    where: { token },
    select: { email: true, expiresAt: true, acceptedAt: true, team: { select: { name: true } } },
  });
  if (!invite) return NOT_FOUND("Invite not found.");

  return ok({
    teamName: invite.team.name,
    email: invite.email,
    accepted: !!invite.acceptedAt,
    expired: !isInviteOpen(invite),
  });
};

export const acceptInvite = async (token) => {
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED();
  if (!token || typeof token !== "string") return NOT_FOUND("Invite not found.");

  const invite = await db.teamInvite.findFirst({
    where: { token },
    select: { id: true, teamId: true, email: true, role: true, expiresAt: true, acceptedAt: true, team: { select: { name: true } } },
  });
  if (!invite) return NOT_FOUND("Invite not found.");
  if (invite.acceptedAt) return fail(ActionErrorCode.INVALID_INPUT, "This invite has already been used.");
  if (!isInviteOpen(invite)) return fail(ActionErrorCode.INVALID_INPUT, "This invite has expired.");
  if (!(await emailMatchesInvite(user, invite.email))) {
    return fail(ActionErrorCode.UNAUTHORIZED, `Sign in with ${invite.email} to accept this invite.`);
  }

  const existing = await getTeamMembership(db, invite.teamId, user.id);
  try {
    if (!existing) {
      await db.teamMember.create({ data: { teamId: invite.teamId, userId: user.id, role: invite.role } });
    }
    await db.teamInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    await writeWorkspaceCookie(invite.teamId);
    return ok({ teamId: invite.teamId, name: invite.team.name });
  } catch (error) {
    console.error("acceptInvite failed:", error);
    return fail(ActionErrorCode.INTERNAL, "Could not accept the invite. Please try again.");
  }
};
