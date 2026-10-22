import { useMutation, useQuery } from "@tanstack/react-query";
import { unwrap } from "@/lib/action-result";
import { getGithubBranches, getGithubRepos, getImportStatus, importGithubRepo } from "../actions";

export const useImportStatus = () =>
  useQuery({ queryKey: ["import-status"], queryFn: async () => unwrap(await getImportStatus()) });

export const useGithubRepos = ({ enabled }) =>
  useQuery({ queryKey: ["github-repos"], queryFn: async () => unwrap(await getGithubRepos()), enabled, retry: false });

export const useGithubBranches = (repo) =>
  useQuery({
    queryKey: ["github-branches", repo],
    queryFn: async () => unwrap(await getGithubBranches(repo)),
    enabled: !!repo,
    retry: false,
  });

export const useImportGithubRepo = () =>
  useMutation({ mutationFn: async (input) => unwrap(await importGithubRepo(input)) });
