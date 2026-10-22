import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "@/lib/action-result";
import {
  createChat,
  createChatFromTemplate,
  deleteChat,
  deleteEnvVar,
  disconnectDatabase,
  duplicateChat,
  disconnectGithub,
  getDatabaseStatus,
  listDatabaseSchema,
  setDatabaseUrl,
  enableDesignMode,
  getAppLogs,
  getChat,
  getChats,
  getGithubStatus,
  getPublishStatus,
  listEnvVars,
  moveChat,
  publishChat,
  pushToGithub,
  renameChat,
  restoreVersion,
  setChatStarred,
  runTerminalCommand,
  saveCodeEdits,
  setEnvVar,
  shareChat,
  unshareChat,
  updateChatInstructions,
  wakeChatSandbox,
} from "../actions";

const KEEP_ALIVE_INTERVAL_MS = 2 * 60 * 1000;
const LOGS_INTERVAL_MS = 3000;

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

/** mutateAsync([prompt, projectId|null, image?, tierId?, images?]); image is { mimeType, data: base64 }. */
export const useCreateChat = () => useChatMutation(createChat);
/** mutateAsync([slug]) */
export const useCreateChatFromTemplate = () => useChatMutation(createChatFromTemplate);
/** mutateAsync([chatId, title]) */
export const useRenameChat = () => useChatMutation(renameChat);
/** mutateAsync([chatId, starred]) */
export const useStarChat = () => useChatMutation(setChatStarred);
/** mutateAsync([chatId]); resolves to the new chat. */
export const useDuplicateChat = () => useChatMutation(duplicateChat);

/** mutateAsync([chatId, instructions]) — standing rules for this chat. */
export const useUpdateChatInstructions = (chatId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instructions) => unwrap(await updateChatInstructions(chatId, instructions)),
    onSuccess: (data) => {
      queryClient.setQueryData(["chats", "one", chatId], (prev) =>
        prev ? { ...prev, instructions: data.instructions } : prev
      );
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};
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

/** mutateAsync({ fragmentId, edits }): saves hand edits of the latest version as a new version. */
export const useSaveCodeEdits = (chatId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fragmentId, edits }) => unwrap(await saveCodeEdits(chatId, fragmentId, edits)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};

// Environment variables (masked) of a chat.
export const useEnvVars = (chatId) =>
  useQuery({
    queryKey: ["env", chatId],
    queryFn: async () => unwrap(await listEnvVars(chatId)),
    enabled: !!chatId,
  });

const useEnvMutation = (chatId, fn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args) => unwrap(await fn(chatId, ...args)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["env", chatId] }),
  });
};
/** mutateAsync([key, value]) */
export const useSetEnvVar = (chatId) => useEnvMutation(chatId, setEnvVar);
/** mutateAsync([key]) */
export const useDeleteEnvVar = (chatId) => useEnvMutation(chatId, deleteEnvVar);

export const useDatabaseStatus = (chatId) =>
  useQuery({
    queryKey: ["chats", "db", chatId],
    queryFn: async () => unwrap(await getDatabaseStatus(chatId)),
    enabled: !!chatId,
  });

export const useDatabaseSchema = (chatId, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["chats", "db-schema", chatId],
    queryFn: async () => unwrap(await listDatabaseSchema(chatId)),
    enabled: enabled && !!chatId,
  });

const useDatabaseMutation = (chatId, fn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (arg) => unwrap(await fn(chatId, arg)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats", "db", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats", "db-schema", chatId] });
      queryClient.invalidateQueries({ queryKey: ["env", chatId] });
    },
  });
};

/** mutateAsync(url) */
export const useSetDatabaseUrl = (chatId) => useDatabaseMutation(chatId, setDatabaseUrl);
/** mutateAsync() — arg unused */
export const useDisconnectDatabase = (chatId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await disconnectDatabase(chatId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats", "db", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats", "db-schema", chatId] });
      queryClient.invalidateQueries({ queryKey: ["env", chatId] });
    },
  });
};

/** mutateAsync(): installs the design mode helper in the chat's sandbox. */
export const useEnableDesignMode = (chatId) =>
  useMutation({ mutationFn: async () => unwrap(await enableDesignMode(chatId)) });

// GitHub connection and this chat's repository.
export const useGithubStatus = (chatId) =>
  useQuery({
    queryKey: ["github", chatId],
    queryFn: async () => unwrap(await getGithubStatus(chatId)),
    enabled: !!chatId,
  });

/** mutateAsync({ repoName, isPrivate }) */
export const usePushToGithub = (chatId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (options) => unwrap(await pushToGithub(chatId, options)),
    onSuccess: (data) => queryClient.setQueryData(["github", chatId], data),
    onError: () => queryClient.invalidateQueries({ queryKey: ["github", chatId] }),
  });
};

export const useDisconnectGithub = (chatId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await disconnectGithub()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["github"] }),
  });
};

// Share link on/off; the chat query (useGetChat) carries the current shareId.
const useShareMutation = (chatId, action) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await action(chatId)),
    onSuccess: ({ shareId }) =>
      queryClient.setQueryData(["chats", "one", chatId], (chat) => (chat ? { ...chat, shareId } : chat)),
  });
};
export const useShareChat = (chatId) => useShareMutation(chatId, shareChat);
export const useUnshareChat = (chatId) => useShareMutation(chatId, unshareChat);

// Publish state of a chat; polls while Vercel is building it.
export const usePublishStatus = (chatId) =>
  useQuery({
    queryKey: ["publish", chatId],
    queryFn: async () => unwrap(await getPublishStatus(chatId)),
    enabled: !!chatId,
    refetchInterval: (query) => (query.state.data?.status === "building" ? 3000 : false),
  });

/** mutate(): publishes (or updates) the chat's latest version. */
export const usePublishChat = (chatId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await publishChat(chatId)),
    onSuccess: (data) => queryClient.setQueryData(["publish", chatId], data),
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

/** The dev-server log of the chat's sandbox, refreshed every few seconds while `enabled`. */
export const useAppLogs = (chatId, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["app-logs", chatId],
    queryFn: async () => unwrap(await getAppLogs(chatId)),
    enabled: !!chatId && enabled,
    refetchInterval: enabled ? LOGS_INTERVAL_MS : false,
    retry: false,
  });

/** Runs a command in the chat's sandbox and returns its output. */
export const useRunTerminalCommand = (chatId) =>
  useMutation({
    mutationFn: async (command) => unwrap(await runTerminalCommand(chatId, command)),
  });
