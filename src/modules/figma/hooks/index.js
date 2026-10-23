import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "@/lib/action-result";
import { connectFigma, disconnectFigma, getFigmaStatus, importFigmaFrame, previewFigmaUrl } from "../actions";

export const useFigmaStatus = () =>
  useQuery({ queryKey: ["figma-status"], queryFn: async () => unwrap(await getFigmaStatus()) });

export const useConnectFigma = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token) => unwrap(await connectFigma(token)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["figma-status"] }),
  });
};

export const useDisconnectFigma = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await disconnectFigma()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["figma-status"] }),
  });
};

export const usePreviewFigmaUrl = () =>
  useMutation({
    mutationFn: async ({ url, nodeId } = {}) => unwrap(await previewFigmaUrl(url, nodeId ?? null)),
  });

export const useImportFigmaFrame = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input) => unwrap(await importFigmaFrame(input)),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
      if (input?.chatId) queryClient.invalidateQueries({ queryKey: ["messages", input.chatId] });
    },
  });
};
