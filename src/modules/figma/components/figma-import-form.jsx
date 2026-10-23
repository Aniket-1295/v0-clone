"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FigmaIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { showActionError } from "@/lib/show-action-error";
import { useGenerateImages } from "@/hooks/use-stored-preference";
import { useModelTier } from "@/modules/app/components/model-picker";
import { useGetProjects } from "@/modules/projects/hooks/project";
import {
  useConnectFigma,
  useFigmaStatus,
  useImportFigmaFrame,
  usePreviewFigmaUrl,
} from "../hooks";

const tokenHelp = "Create a token in Figma → Settings → Security. Grant file content read access. We store it encrypted and never show it again.";

/**
 * Connect Figma (PAT), paste a file or frame URL, preview, then start a generation.
 * Used by the import dialog, the /import/figma page, and the in-chat shortcut.
 */
export default function FigmaImportForm({
  chatId = null,
  initialProjectId = null,
  onImported,
}) {
  const router = useRouter();
  const status = useFigmaStatus();
  const connect = useConnectFigma();
  const preview = usePreviewFigmaUrl();
  const importing = useImportFigmaFrame();
  const { data: projects } = useGetProjects();
  const { tier } = useModelTier();
  const [generateImages] = useGenerateImages();

  const [token, setToken] = useState("");
  const [url, setUrl] = useState("");
  const [extra, setExtra] = useState("");
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [previewData, setPreviewData] = useState(null);
  const [nodeId, setNodeId] = useState(null);
  const [error, setError] = useState(null);

  const connected = !!status.data?.connected;
  const busy = connect.isPending || preview.isPending || importing.isPending;
  const selectedId = nodeId || previewData?.nodeId;
  const showProject = !chatId;

  const onConnect = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await connect.mutateAsync(token);
      setToken("");
    } catch (connectError) {
      setError(connectError.message || "Could not connect Figma.");
    }
  };

  const onPreview = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      const data = await preview.mutateAsync({ url });
      setPreviewData(data);
      setNodeId(data.nodeId);
    } catch (previewError) {
      setPreviewData(null);
      setNodeId(null);
      setError(previewError.message || "Could not read that Figma link.");
    }
  };

  const onPickFrame = async (id) => {
    setNodeId(id);
    setError(null);
    try {
      const data = await preview.mutateAsync({ url, nodeId: id });
      setPreviewData((current) => ({
        ...data,
        frames: current?.frames?.length ? current.frames : data.frames,
      }));
    } catch (previewError) {
      setError(previewError.message || "Could not load that frame.");
    }
  };

  const onImport = async (event) => {
    event.preventDefault();
    if (!selectedId || importing.isPending) return;
    setError(null);
    try {
      const result = await importing.mutateAsync({
        url,
        nodeId: selectedId,
        prompt: extra,
        projectId: projectId || null,
        chatId,
        tierId: tier.id,
        images: generateImages,
      });
      onImported?.(result);
      if (!onImported && result?.id && !chatId) router.push(`/chat/${result.id}`);
    } catch (importError) {
      showActionError(importError, router, "Could not import the Figma frame.");
      setError(importError.message || "Could not import the Figma frame.");
    }
  };

  if (status.isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (!connected) {
    return (
      <form onSubmit={onConnect} className="space-y-4">
        <div className="rounded-xl border bg-card p-6 text-center">
          <FigmaIcon className="mx-auto size-8" />
          <h2 className="mt-4 font-medium">Connect Figma</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{tokenHelp}</p>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Personal access token</span>
          <Input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="figd_…"
            autoComplete="off"
            aria-label="Figma personal access token"
            className="h-9 font-mono text-sm"
          />
        </label>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={!token.trim() || busy}>
          {connect.isPending && <Spinner className="size-4" />}
          Connect Figma
        </Button>
      </form>
    );
  }

  const frames = previewData?.frames ?? [];

  return (
    <form onSubmit={previewData ? onImport : onPreview} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connected as <span className="font-medium text-foreground">{status.data.handle || "Figma"}</span>.
        Paste a file link, or copy a frame link from Figma (right-click → Copy link to selection).
      </p>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Figma link</span>
        <Input
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setPreviewData(null);
            setNodeId(null);
          }}
          placeholder="https://www.figma.com/design/…?node-id=12-34"
          aria-label="Figma file or frame link"
          className="h-9"
        />
      </label>

      {previewData && (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <p className="truncate text-sm font-medium">{previewData.fileName}</p>
          {previewData.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:${previewData.thumbnail.mimeType};base64,${previewData.thumbnail.data}`}
              alt={previewData.nodeName || previewData.fileName}
              className="max-h-48 w-full rounded-md border object-contain bg-muted/40"
            />
          )}
          {frames.length > 1 && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Frame</span>
              <select
                value={selectedId || ""}
                onChange={(event) => onPickFrame(event.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/30"
                aria-label="Figma frame"
              >
                <option value="">Choose a frame</option>
                {frames.map((frame) => (
                  <option key={frame.id} value={frame.id}>
                    {frame.page} / {frame.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {previewData.nodeName && frames.length <= 1 && (
            <p className="text-xs text-muted-foreground">Frame: {previewData.nodeName}</p>
          )}
        </div>
      )}

      {previewData && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">What should we build?</span>
          <Input
            value={extra}
            onChange={(event) => setExtra(event.target.value)}
            placeholder="Optional — e.g. the checkout flow"
            aria-label="What should we build?"
            className="h-9"
          />
        </label>
      )}

      {showProject && previewData && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Project</span>
          <select
            value={projectId || ""}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/30"
            aria-label="Project"
          >
            <option value="">No project (Drafts)</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!previewData ? (
        <Button type="submit" className="w-full" disabled={!url.trim() || busy}>
          {preview.isPending && <Spinner className="size-4" />}
          Preview
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="flex-1" disabled={busy} onClick={onPreview}>
            {preview.isPending && <Spinner className="size-4" />}
            Refresh
          </Button>
          <Button type="submit" className="flex-1" disabled={!selectedId || busy}>
            {importing.isPending && <Spinner className="size-4" />}
            Import
          </Button>
        </div>
      )}

      {previewData && (
        <p className="text-xs text-muted-foreground">
          Import starts a generation and uses one credit, like attaching a screenshot.
        </p>
      )}
    </form>
  );
}
