// Team workspace access: Personal projects stay user-owned (teamId null). A team
// project is visible to every member. Chat.userId is still the creator; teammates
// open a team chat through the project's membership, not ownership.

export const PERSONAL_WORKSPACE = "personal";
export const WORKSPACE_COOKIE = "v0-workspace";
export const WORKSPACE_STORAGE_KEY = "v0:workspace";
export const TEAM_ROLE = { OWNER: "owner", MEMBER: "member" };
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const TEAM_NAME_MAX = 80;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const parseWorkspaceId = (raw) => {
  if (raw == null || raw === "" || raw === PERSONAL_WORKSPACE) return PERSONAL_WORKSPACE;
  if (typeof raw !== "string") return PERSONAL_WORKSPACE;
  const id = raw.trim();
  if (!id || id.length > 80) return PERSONAL_WORKSPACE;
  return id;
};

export const isPersonalWorkspace = (id) => parseWorkspaceId(id) === PERSONAL_WORKSPACE;

export const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();

export const isValidEmail = (email) => EMAIL_PATTERN.test(normalizeEmail(email));

export const emailsMatch = (a, b) => normalizeEmail(a) === normalizeEmail(b) && normalizeEmail(a) !== "";

export const isInviteOpen = (invite, now = Date.now()) =>
  !!invite && !invite.acceptedAt && new Date(invite.expiresAt).getTime() > now;

export const inviteExpiresAt = (now = Date.now()) => new Date(now + INVITE_TTL_MS);

export const parseTeamName = (name) => {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return { error: "Give the team a name." };
  return { name: trimmed.slice(0, TEAM_NAME_MAX) };
};

/** Personal project: only the owner. Team project: any member of that team. */
export const canAccessProject = (project, userId, memberTeamIds = new Set()) => {
  if (!project || !userId) return false;
  if (project.teamId) return memberTeamIds.has(project.teamId);
  return project.userId === userId;
};

/**
 * Chat in a team project: any member. Otherwise (draft or Personal project): only
 * the chat's creator.
 */
export const canAccessChat = (chat, userId, memberTeamIds = new Set()) => {
  if (!chat || !userId) return false;
  if (chat.project?.teamId) return memberTeamIds.has(chat.project.teamId);
  return chat.userId === userId;
};

/** After a team is deleted, projects keep their creator and become Personal. */
export const personalizeProject = (project) => (project ? { ...project, teamId: null } : project);

export const isLastOwner = (ownerCount, role) => role === TEAM_ROLE.OWNER && ownerCount <= 1;

export const projectListWhere = ({ userId, workspaceId }) => {
  if (isPersonalWorkspace(workspaceId)) return { userId, teamId: null };
  return { teamId: workspaceId };
};

/**
 * Personal lists the user's drafts and their Personal-project chats.
 * A team workspace lists every chat in that team's projects (no drafts).
 * `scope` is "all", "drafts", or a project id.
 * Returns null when the list is empty by definition (team + drafts).
 */
export const chatListWhere = ({ userId, workspaceId, scope = "all" }) => {
  if (!isPersonalWorkspace(workspaceId)) {
    if (scope === "drafts") return null;
    const where = { project: { teamId: workspaceId } };
    if (scope !== "all") where.projectId = scope;
    return where;
  }
  if (scope === "drafts") return { userId, projectId: null };
  if (scope !== "all") return { userId, projectId: scope, OR: [{ project: { teamId: null } }, { projectId: null }] };
  return { userId, OR: [{ projectId: null }, { project: { teamId: null } }] };
};

export const loadMemberTeamIds = async (db, userId) => {
  if (!userId) return new Set();
  const rows = await db.teamMember.findMany({ where: { userId }, select: { teamId: true } });
  return new Set(rows.map((row) => row.teamId));
};

export const isTeamMember = async (db, teamId, userId) => {
  if (!teamId || !userId) return false;
  const row = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { teamId: true },
  });
  return !!row;
};

export const getTeamMembership = async (db, teamId, userId) => {
  if (!teamId || !userId) return null;
  return db.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
};

export const assertTeamOwner = async (db, teamId, userId) => {
  const member = await getTeamMembership(db, teamId, userId);
  if (!member || member.role !== TEAM_ROLE.OWNER) return null;
  return member;
};

export const countTeamOwners = async (db, teamId) =>
  db.teamMember.count({ where: { teamId, role: TEAM_ROLE.OWNER } });

export const findAccessibleProject = async (db, projectId, userId) => {
  if (!projectId || !userId) return null;
  const project = await db.project.findFirst({
    where: { id: projectId },
    select: { id: true, userId: true, teamId: true },
  });
  if (!project) return null;
  if (!project.teamId) return project.userId === userId ? project : null;
  return (await isTeamMember(db, project.teamId, userId)) ? project : null;
};

/**
 * Loads the chat when the user owns it (Personal / draft) or is a member of its
 * team project. `extra` is passed through to a second find (select / include).
 */
export const findAccessibleChat = async (db, chatId, userId, extra) => {
  if (!chatId || !userId) return null;
  const access = await db.chat.findFirst({
    where: { id: chatId },
    select: { id: true, userId: true, projectId: true, project: { select: { id: true, userId: true, teamId: true } } },
  });
  if (!access) return null;
  const memberTeamIds = access.project?.teamId ? new Set([access.project.teamId]) : new Set();
  if (access.project?.teamId) {
    if (!(await isTeamMember(db, access.project.teamId, userId))) return null;
  } else if (!canAccessChat(access, userId, memberTeamIds)) {
    return null;
  }
  if (!extra) return access;
  return db.chat.findFirst({ where: { id: chatId }, ...extra });
};

/** A project the user may attach a new chat to, or an error string. */
export const projectForNewChat = async (db, { userId, projectId, workspaceId }) => {
  if (projectId) {
    const project = await findAccessibleProject(db, projectId, userId);
    if (!project) return { error: "Project not found." };
    if (!isPersonalWorkspace(workspaceId) && project.teamId !== workspaceId) {
      return { error: "Project not found." };
    }
    return { project };
  }
  if (!isPersonalWorkspace(workspaceId)) {
    return { error: "Pick a project first. Team chats cannot be drafts." };
  }
  return { project: null };
};
