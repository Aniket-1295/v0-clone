import { describe, expect, it, vi } from "vitest";
import {
  TEAM_ROLE,
  assertTeamOwner,
  canAccessChat,
  canAccessProject,
  chatListWhere,
  emailsMatch,
  findAccessibleChat,
  findAccessibleProject,
  inviteExpiresAt,
  isInviteOpen,
  isLastOwner,
  isPersonalWorkspace,
  isTeamMember,
  isValidEmail,
  normalizeEmail,
  parseTeamName,
  parseWorkspaceId,
  personalizeProject,
  projectForNewChat,
  projectListWhere,
} from "@/lib/teams";

const personalProject = { id: "p1", userId: "alice", teamId: null };
const teamProject = { id: "p2", userId: "alice", teamId: "team1" };
const members = new Set(["team1"]);

describe("parseWorkspaceId", () => {
  it("treats empty, personal and junk as Personal", () => {
    expect(parseWorkspaceId(null)).toBe("personal");
    expect(parseWorkspaceId("")).toBe("personal");
    expect(parseWorkspaceId("personal")).toBe("personal");
    expect(parseWorkspaceId(12)).toBe("personal");
    expect(isPersonalWorkspace("personal")).toBe(true);
  });

  it("keeps a team id", () => {
    expect(parseWorkspaceId("team_abc")).toBe("team_abc");
    expect(isPersonalWorkspace("team_abc")).toBe(false);
  });
});

describe("canAccessProject", () => {
  it("lets the owner open a Personal project and nobody else", () => {
    expect(canAccessProject(personalProject, "alice", members)).toBe(true);
    expect(canAccessProject(personalProject, "bob", members)).toBe(false);
  });

  it("lets any team member open a team project, not an outsider", () => {
    expect(canAccessProject(teamProject, "alice", members)).toBe(true);
    expect(canAccessProject(teamProject, "bob", members)).toBe(true);
    expect(canAccessProject(teamProject, "eve", new Set())).toBe(false);
  });
});

describe("canAccessChat", () => {
  const draft = { id: "c1", userId: "alice", project: null };
  const personalChat = { id: "c2", userId: "alice", project: personalProject };
  const teamChat = { id: "c3", userId: "alice", project: teamProject };

  it("lets only the creator open a draft or Personal chat", () => {
    expect(canAccessChat(draft, "alice", members)).toBe(true);
    expect(canAccessChat(draft, "bob", members)).toBe(false);
    expect(canAccessChat(personalChat, "alice", members)).toBe(true);
    expect(canAccessChat(personalChat, "bob", members)).toBe(false);
  });

  it("lets a teammate open a team chat, not an outsider", () => {
    expect(canAccessChat(teamChat, "bob", members)).toBe(true);
    expect(canAccessChat(teamChat, "eve", new Set())).toBe(false);
  });
});

describe("invite email and expiry", () => {
  it("matches emails case-insensitively", () => {
    expect(emailsMatch("Ada@Example.com", "ada@example.com")).toBe(true);
    expect(emailsMatch("ada@example.com", "bob@example.com")).toBe(false);
    expect(normalizeEmail("  Ada@Example.com ")).toBe("ada@example.com");
    expect(isValidEmail("ada@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("rejects expired and already-used tokens", () => {
    const now = Date.parse("2026-10-23T12:00:00Z");
    const open = { acceptedAt: null, expiresAt: "2026-10-30T12:00:00Z" };
    const used = { acceptedAt: "2026-10-24T12:00:00Z", expiresAt: "2026-10-30T12:00:00Z" };
    const expired = { acceptedAt: null, expiresAt: "2026-10-22T12:00:00Z" };
    expect(isInviteOpen(open, now)).toBe(true);
    expect(isInviteOpen(used, now)).toBe(false);
    expect(isInviteOpen(expired, now)).toBe(false);
    expect(inviteExpiresAt(now).toISOString()).toBe("2026-10-30T12:00:00.000Z");
  });
});

describe("delete team returns projects to Personal", () => {
  it("clears teamId and keeps the creator", () => {
    expect(personalizeProject(teamProject)).toEqual({ id: "p2", userId: "alice", teamId: null });
  });
});

describe("list scopes", () => {
  it("keeps Personal lists on the user's own rows with teamId null", () => {
    expect(projectListWhere({ userId: "alice", workspaceId: "personal" })).toEqual({ userId: "alice", teamId: null });
    expect(chatListWhere({ userId: "alice", workspaceId: "personal", scope: "all" })).toEqual({
      userId: "alice",
      OR: [{ projectId: null }, { project: { teamId: null } }],
    });
    expect(chatListWhere({ userId: "alice", workspaceId: "personal", scope: "drafts" })).toEqual({
      userId: "alice",
      projectId: null,
    });
  });

  it("lists a team's projects and chats, and has no team drafts", () => {
    expect(projectListWhere({ userId: "alice", workspaceId: "team1" })).toEqual({ teamId: "team1" });
    expect(chatListWhere({ userId: "alice", workspaceId: "team1", scope: "all" })).toEqual({
      project: { teamId: "team1" },
    });
    expect(chatListWhere({ userId: "alice", workspaceId: "team1", scope: "drafts" })).toBeNull();
  });
});

describe("parseTeamName and last owner", () => {
  it("trims and rejects an empty name", () => {
    expect(parseTeamName("  Acme  ")).toEqual({ name: "Acme" });
    expect(parseTeamName("   ").error).toMatch(/name/);
  });

  it("blocks removing the last owner", () => {
    expect(isLastOwner(1, TEAM_ROLE.OWNER)).toBe(true);
    expect(isLastOwner(2, TEAM_ROLE.OWNER)).toBe(false);
    expect(isLastOwner(1, TEAM_ROLE.MEMBER)).toBe(false);
  });
});

describe("db loaders", () => {
  it("findAccessibleProject: owner, teammate, outsider", async () => {
    const db = {
      project: {
        findFirst: async ({ where }) => (where.id === "p2" ? teamProject : personalProject),
      },
      teamMember: {
        findUnique: async ({ where }) =>
          where.teamId_userId.userId === "bob" || where.teamId_userId.userId === "alice"
            ? { teamId: "team1" }
            : null,
      },
    };
    expect(await findAccessibleProject(db, "p1", "alice")).toEqual(personalProject);
    expect(await findAccessibleProject(db, "p1", "bob")).toBeNull();
    expect(await findAccessibleProject(db, "p2", "bob")).toEqual(teamProject);
    expect(await isTeamMember(db, "team1", "eve")).toBe(false);
  });

  it("findAccessibleChat: teammate via project, outsider denied", async () => {
    const teamChat = { id: "c3", userId: "alice", projectId: "p2", project: teamProject };
    const db = {
      chat: {
        findFirst: async () => teamChat,
      },
      teamMember: {
        findUnique: async ({ where }) => (where.teamId_userId.userId === "bob" ? { teamId: "team1" } : null),
      },
    };
    expect(await findAccessibleChat(db, "c3", "bob")).toEqual(teamChat);
    expect(await findAccessibleChat(db, "c3", "eve")).toBeNull();
  });

  it("assertTeamOwner only returns owners", async () => {
    const db = {
      teamMember: {
        findUnique: async ({ where }) => {
          if (where.teamId_userId.userId === "alice") return { role: TEAM_ROLE.OWNER, userId: "alice" };
          if (where.teamId_userId.userId === "bob") return { role: TEAM_ROLE.MEMBER, userId: "bob" };
          return null;
        },
      },
    };
    expect(await assertTeamOwner(db, "team1", "alice")).toMatchObject({ role: "owner" });
    expect(await assertTeamOwner(db, "team1", "bob")).toBeNull();
  });

  it("projectForNewChat requires a team project in a team workspace", async () => {
    const db = {
      project: {
        findFirst: async ({ where }) => (where.id === "p2" ? teamProject : null),
      },
      teamMember: {
        findUnique: async ({ where }) => (where.teamId_userId.userId === "bob" ? { teamId: "team1" } : null),
      },
    };
    expect((await projectForNewChat(db, { userId: "bob", projectId: null, workspaceId: "team1" })).error).toMatch(
      /Pick a project/
    );
    expect((await projectForNewChat(db, { userId: "bob", projectId: "p2", workspaceId: "team1" })).project).toEqual(
      teamProject
    );
    expect((await projectForNewChat(db, { userId: "alice", projectId: null, workspaceId: "personal" })).project).toBeNull();
  });
});

// Keep the mock from tests/setup.js from leaking into this file's named db objects.
vi.unstubAllEnvs();
