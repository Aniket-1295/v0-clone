"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { unwrap } from "@/lib/action-result";
import { PERSONAL_WORKSPACE, WORKSPACE_STORAGE_KEY, isPersonalWorkspace, parseWorkspaceId } from "@/lib/teams";
import { useStoredPreference } from "@/hooks/use-stored-preference";
import {
  acceptInvite,
  createTeam,
  deleteTeam,
  getInvitePreview,
  getTeam,
  inviteToTeam,
  leaveTeam,
  listWorkspaces,
  removeMember,
  renameTeam,
  revokeInvite,
  setActiveWorkspace,
} from "../actions";

export const useListWorkspaces = () =>
  useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => unwrap(await listWorkspaces()),
  });

export const useActiveWorkspace = () => {
  const queryClient = useQueryClient();
  const [stored, setStored] = useStoredPreference(WORKSPACE_STORAGE_KEY, PERSONAL_WORKSPACE);
  const { data, isFetching } = useListWorkspaces();
  const requested = parseWorkspaceId(stored);
  const known = isPersonalWorkspace(requested) || data?.teams?.some((team) => team.id === requested);
  const workspace = !data || isFetching || known ? requested : PERSONAL_WORKSPACE;
  const team = data?.teams?.find((row) => row.id === workspace) ?? null;
  const isPersonal = isPersonalWorkspace(workspace);

  useEffect(() => {
    if (!data || isFetching || known) return;
    setStored(PERSONAL_WORKSPACE);
  }, [data, isFetching, known, setStored]);

  useEffect(() => {
    setActiveWorkspace(workspace).catch(() => {});
  }, [workspace]);

  const switchTo = async (id) => {
    const next = parseWorkspaceId(id);
    setStored(next);
    await unwrap(await setActiveWorkspace(next));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
      queryClient.invalidateQueries({ queryKey: ["chats"] }),
      queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
    ]);
  };

  return { workspace, team, isPersonal, switchTo };
};

const useTeamMutation = (fn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args) => unwrap(await fn(...(Array.isArray(args) ? args : [args]))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};

/** mutateAsync(name) */
export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  const [, setStored] = useStoredPreference(WORKSPACE_STORAGE_KEY, PERSONAL_WORKSPACE);
  return useMutation({
    mutationFn: async (name) => unwrap(await createTeam(name)),
    onSuccess: (team) => {
      setStored(team.id);
      queryClient.setQueryData(["workspaces"], (prev) => ({
        personal: true,
        active: team.id,
        teams: [...(prev?.teams ?? []).filter((row) => row.id !== team.id), { id: team.id, name: team.name, role: team.role }],
      }));
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};

export const useGetTeam = (teamId, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["team", teamId ?? "active"],
    queryFn: async () => unwrap(await getTeam(teamId)),
    enabled,
  });

/** mutateAsync([teamId, name]) */
export const useRenameTeam = () => useTeamMutation(renameTeam);
/** mutateAsync([teamId, email]) — returns { acceptUrl } */
export const useInviteToTeam = () => useTeamMutation(inviteToTeam);
/** mutateAsync(inviteId) */
export const useRevokeInvite = () => useTeamMutation(revokeInvite);
/** mutateAsync([teamId, userId]) */
export const useRemoveMember = () => useTeamMutation(removeMember);
/** mutateAsync(teamId) */
export const useLeaveTeam = () => useTeamMutation(leaveTeam);
/** mutateAsync(teamId) */
export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  const [, setStored] = useStoredPreference(WORKSPACE_STORAGE_KEY, PERSONAL_WORKSPACE);
  return useMutation({
    mutationFn: async (teamId) => unwrap(await deleteTeam(teamId)),
    onSuccess: () => {
      setStored(PERSONAL_WORKSPACE);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};

export const useInvitePreview = (token) =>
  useQuery({
    queryKey: ["invite", token],
    queryFn: async () => unwrap(await getInvitePreview(token)),
    enabled: !!token,
    retry: false,
  });

export const useAcceptInvite = () => {
  const queryClient = useQueryClient();
  const [, setStored] = useStoredPreference(WORKSPACE_STORAGE_KEY, PERSONAL_WORKSPACE);
  return useMutation({
    mutationFn: async (token) => unwrap(await acceptInvite(token)),
    onSuccess: (team) => {
      setStored(team.teamId);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};
