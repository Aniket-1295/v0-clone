import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "@/lib/action-result";
import {
  createChat,
  createChatFromTemplate,
  deleteChat,
  getChat,
  getChats,
  moveChat,
  renameChat,
  restoreVersion,
  wakeChatSandbox,
} from "../actions";

const KEEP_ALIVE_INTERVAL_MS = 2 * 60 * 1000;

/** scope: "all", "drafts" or a project id. */
export const useGetChats = (scope = "all", { enabled = true } = {}) =>
  useQuery({
    queryKey: ["chats", scope],
    queryFn: async () => unwrap(await getChats(scope)),
    enabled,
  });

export const useGetChat = (chatId) =>
  useQuery({
    queryKey: ["chats", "one", chatId],
    queryFn: async () => unwrap(await getChat(chatId)),
    enabled: !!chatId,
  });

const useChatMutation = (fn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args) => unwrap(await fn(...args)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
    },
  });
};

/** mutateAsync([prompt, projectId|null]) */
export const useCreateChat = () => useChatMutation(createChat);
/** mutateAsync([slug]) */
export const useCreateChatFromTemplate = () => useChatMutation(createChatFromTemplate);
/** mutateAsync([chatId, title]) */
export const useRenameChat = () => useChatMutation(renameChat);
/** mutateAsync([chatId, projectId|null]) */
export const useMoveChat = () => useChatMutation(moveChat);
/** mutateAsync([chatId]) */
export const useDeleteChat = () => useChatMutation(deleteChat);

/** mutate(fragmentId): makes an earlier version of the chat the latest one again. */
export const useRestoreVersion = (chatId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fragmentId) => unwrap(await restoreVersion(chatId, fragmentId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      queryClient.invalidateQueries({ queryKey: ["sandbox", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};

// Keeps the chat's sandbox alive while the page is open (TanStack pauses the interval in
// background tabs) and rebuilds it when it has expired; on a rebuild the messages are
// refetched so the preview picks up the new sandbox URL.
export const useKeepSandboxAlive = (chatId) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["sandbox", chatId],
    queryFn: async () => {
      const data = unwrap(await wakeChatSandbox(chatId));
      if (data.status === "rebuilt") {
        await queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      }
      return data;
    },
    enabled: !!chatId,
    refetchInterval: KEEP_ALIVE_INTERVAL_MS,
    staleTime: KEEP_ALIVE_INTERVAL_MS,
    retry: false,
  });
};
