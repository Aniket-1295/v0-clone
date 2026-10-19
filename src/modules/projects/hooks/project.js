import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "@/lib/action-result";
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjects,
  renameProject,
  setProjectStarred,
} from "../actions";

export const useGetProjects = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ["projects"],
    queryFn: async () => unwrap(await getProjects()),
    enabled,
  });

export const useGetProjectById = (projectId, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["projects", projectId],
    queryFn: async () => unwrap(await getProjectById(projectId)),
    enabled: enabled && !!projectId,
  });

// Every project mutation refreshes project lists, project pages and chat lists.
const useProjectMutation = (fn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args) => unwrap(await fn(...args)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};

/** mutateAsync([name]) */
export const useCreateProject = () => useProjectMutation(createProject);
/** mutateAsync([projectId, name]) */
export const useRenameProject = () => useProjectMutation(renameProject);
/** mutateAsync([projectId, starred]) */
export const useStarProject = () => useProjectMutation(setProjectStarred);
/** mutateAsync([projectId]) */
export const useDeleteProject = () => useProjectMutation(deleteProject);
