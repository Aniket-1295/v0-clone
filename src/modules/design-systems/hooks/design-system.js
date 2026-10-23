import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "@/lib/action-result";
import { createDesignSystem, deleteDesignSystem, listDesignSystems, updateDesignSystem } from "../actions";

const KEY = ["design-systems"];

export const useDesignSystems = ({ enabled = true } = {}) =>
  useQuery({ queryKey: KEY, queryFn: async () => unwrap(await listDesignSystems()), enabled });

const useDesignSystemMutation = (fn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args) => unwrap(await fn(...args)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      // A chat or project may show this system's name/swatches.
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

/** mutateAsync([input]) */
export const useCreateDesignSystem = () => useDesignSystemMutation((input) => createDesignSystem(input));
/** mutateAsync([id, input]) */
export const useUpdateDesignSystem = () => useDesignSystemMutation((id, input) => updateDesignSystem(id, input));
/** mutateAsync([id]) */
export const useDeleteDesignSystem = () => useDesignSystemMutation((id) => deleteDesignSystem(id));
