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
} from "../actions";

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
