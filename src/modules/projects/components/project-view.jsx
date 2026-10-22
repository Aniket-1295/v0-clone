"use client";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ProjectHeader from "./project-header";
import MessageContainer from "./message-container";
import { strToU8, zipSync } from "fflate";
import {
  Code,
  CrownIcon,
  MousePointerClickIcon,
  DownloadIcon,
  ExternalLink,
  EyeIcon,
  MessageSquare,
  MonitorIcon,
  RefreshCcw,
} from "lucide-react";
import FragmentWeb from "./fragment-web";
import { FileExplorer } from "./file-explorer";
import { Hint } from "@/components/ui/hint";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  DEFAULT_OPEN,
  closePanel,
  getOpenPanelsSnapshot,
  nextActive,
  openPanel,
  parseOpenPanels,
  parseTabParam,
  saveOpenPanels,
  subscribePanelStore,
} from "@/lib/workspace-panels";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageRole } from "@prisma/client";
import { useEnableDesignMode, useGetChat, useKeepSandboxAlive, useSaveCodeEdits } from "@/modules/chats/hooks/chat";
import { useCreateMessages, useGetMessages } from "@/modules/messages/hooks/message";
import DesignPanel from "./design-panel";
import DiffView from "./diff-view";
import LogsView from "./logs-view";
import TerminalView from "./terminal-view";
import SettingsView from "./settings-view";
import WorkspaceTabBar from "./workspace-tab-bar";
import GithubReturnToasts from "./github-return-toasts";
import { showActionError } from "@/lib/show-action-error";
import PublishButton from "./publish-button";
import ShareButton from "./share-button";

const EmptyPane = ({ icon: Icon, text }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
    <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
      <Icon className="size-5" />
    </div>
    <p className="text-sm">{text}</p>
  </div>
);

const slugify = (text) =>
  (text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "v0-app";

/** Zips a version's files (the full app tree) in the browser and saves it. */
const downloadFiles = (files, name) => {
  const folder = slugify(name);
  const zipped = zipSync(
    Object.fromEntries(
      Object.entries(files)
        .filter(([, content]) => typeof content === "string")
        .map(([filePath, content]) => [`${folder}/${filePath.replace(/^\/+/, "")}`, strToU8(content)])
    )
  );
  const url = URL.createObjectURL(new Blob([zipped], { type: "application/zip" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `${folder}.zip` });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const PreviewPane = ({ chatId, activeFragment, tabState, setTabState, openPanels, onOpenPanel, onClosePanel }) => {
  const router = useRouter();
  const { data: chat } = useGetChat(chatId);
  const { data: messages } = useGetMessages(chatId);
  const saveEdits = useSaveCodeEdits(chatId);
  // Only the latest version can be edited, and not while the agent is working on it.
  const latestFragmentId = messages?.findLast((message) => message.fragments)?.fragments.id;
  const generating = messages?.at(-1)?.role === MessageRole.USER;
  const isLatest = !!activeFragment && activeFragment.id === latestFragmentId;
  const versions = useMemo(() => messages?.flatMap((message) => (message.fragments ? [message.fragments] : [])) ?? [], [messages]);
  const readOnlyReason = !isLatest ? "Older version: restore it to edit." : generating ? "Editing is paused while v0 works." : null;

  const onSaveEdits = async (edits) => {
    try {
      await saveEdits.mutateAsync({ fragmentId: activeFragment.id, edits });
      toast.success("Saved as a new version");
    } catch (error) {
      showActionError(error, router, "Could not save your changes.");
      throw error;
    }
  };
  const [previewKey, setPreviewKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const sandboxUrl = activeFragment?.sandboxUrl;

  // Design mode: a helper inside the preview reports the clicked element (postMessage).
  const iframeRef = useRef(null);
  const [designing, setDesigning] = useState(false);
  const [selection, setSelection] = useState(null);
  const enableDesign = useEnableDesignMode(chatId);
  const askV0 = useCreateMessages(chatId);
  const canDesign = isLatest && !generating && !!activeFragment?.files && !!sandboxUrl;
  // Leaving the latest version or starting a generation pauses design mode.
  const designOn = designing && canDesign;
  const tellPreview = useCallback((enabled) => {
    iframeRef.current?.contentWindow?.postMessage({ type: "v0-design", enabled }, "*");
  }, []);

  useEffect(() => {
    const onMessage = (event) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      if (event.data?.type === "v0-design:ready") tellPreview(designOn);
      if (event.data?.type === "v0-design:select" && designOn) setSelection(event.data);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [designOn, tellPreview]);

  useEffect(() => {
    tellPreview(designOn);
  }, [designOn, tellPreview]);

  const stopDesign = useCallback(() => {
    setDesigning(false);
    setSelection(null);
    tellPreview(false);
  }, [tellPreview]);

  const startDesign = async () => {
    try {
      await enableDesign.mutateAsync();
      setDesigning(true);
      setTabState("preview");
      tellPreview(true);
    } catch (error) {
      showActionError(error, router, "Could not start design mode.");
    }
  };

  const applyDesign = async (path, source) => {
    try {
      await onSaveEdits({ [path]: source });
      setSelection(null);
      // Clears the highlighted element; the preview reloads the changed file itself.
      tellPreview(false);
      tellPreview(true);
    } catch {
      // onSaveEdits already showed the error.
    }
  };

  const askDesignChange = async (prompt) => {
    try {
      await askV0.mutateAsync(prompt);
      toast.success("Sent to v0");
      stopDesign();
    } catch (error) {
      showActionError(error, router, "Could not send the request.");
    }
  };

  const onCopy = () => {
    navigator.clipboard.writeText(sandboxUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tabs
      className="h-full gap-0 flex flex-col overflow-hidden rounded-lg border bg-card"
      value={tabState}
      onValueChange={setTabState}
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-2">
        <WorkspaceTabBar openPanels={openPanels} onOpen={onOpenPanel} onClose={onClosePanel} />

        {tabState === "preview" && sandboxUrl && (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <Hint text={canDesign ? "Design: click an element to edit it" : readOnlyReason || "Design"} side="bottom">
              <Button
                variant={designOn ? "secondary" : "ghost"}
                size="sm"
                className="h-8 shrink-0 gap-1.5 text-xs"
                aria-pressed={designOn}
                disabled={!canDesign || enableDesign.isPending}
                onClick={designOn ? stopDesign : startDesign}
              >
                {enableDesign.isPending ? <Spinner className="size-3.5" /> : <MousePointerClickIcon className="size-3.5" />}
                Design
              </Button>
            </Hint>
            <Hint text="Refresh" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Refresh preview"
                onClick={() => setPreviewKey((key) => key + 1)}
              >
                <RefreshCcw className="size-3.5" />
              </Button>
            </Hint>
            <Hint text={copied ? "Copied" : "Copy URL"} side="bottom">
              <button
                type="button"
                onClick={onCopy}
                className="flex h-8 min-w-0 flex-1 items-center rounded-md border bg-background px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <span className="truncate">{sandboxUrl}</span>
              </button>
            </Hint>
            <Hint text="Open in new tab" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Open preview in new tab"
                onClick={() => window.open(sandboxUrl, "_blank")}
              >
                <ExternalLink className="size-3.5" />
              </Button>
            </Hint>
          </div>
        )}

        {activeFragment?.files && (
          <Hint text="Download code" side="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto size-8 shrink-0"
              aria-label="Download code as a zip"
              onClick={() => downloadFiles(activeFragment.files, chat?.title || activeFragment.title)}
            >
              <DownloadIcon className="size-3.5" />
            </Button>
          </Hint>
        )}
      </div>

      <TabsContent value="preview" className="flex min-h-0 flex-1 bg-background">
        {activeFragment ? (
          <>
            <div className="min-w-0 flex-1">
              <FragmentWeb data={activeFragment} refreshKey={previewKey} iframeRef={iframeRef} />
            </div>
            {designOn && (
              <div className="w-72 shrink-0 border-l bg-card">
                <DesignPanel
                  key={selection ? `${selection.tag}:${selection.className}:${selection.text}` : "none"}
                  selection={selection}
                  files={activeFragment.files}
                  onApply={applyDesign}
                  onAskV0={askDesignChange}
                  busy={saveEdits.isPending || askV0.isPending}
                  onClose={stopDesign}
                />
              </div>
            )}
          </>
        ) : (
          <EmptyPane icon={MonitorIcon} text="Your preview will appear here" />
        )}
      </TabsContent>

      {openPanels.includes("code") && (
        <TabsContent value="code" className="min-h-0 flex-1">
          {activeFragment?.files ? (
            <FileExplorer
              key={activeFragment.id}
              files={activeFragment.files}
              editable={isLatest && !generating}
              readOnlyReason={readOnlyReason}
              onSave={onSaveEdits}
              saving={saveEdits.isPending}
            />
          ) : (
            <EmptyPane icon={Code} text="Generated code will appear here" />
          )}
        </TabsContent>
      )}

      {openPanels.includes("diff") && (
        <TabsContent value="diff" className="min-h-0 flex-1">
          <DiffView versions={versions} activeFragment={activeFragment} />
        </TabsContent>
      )}

      {openPanels.includes("logs") && (
        <TabsContent value="logs" className="min-h-0 flex-1">
          <LogsView chatId={chatId} active={tabState === "logs"} />
        </TabsContent>
      )}

      {openPanels.includes("terminal") && (
        <TabsContent value="terminal" className="min-h-0 flex-1">
          <TerminalView chatId={chatId} active={tabState === "terminal"} />
        </TabsContent>
      )}

      {openPanels.includes("settings") && (
        <TabsContent value="settings" className="min-h-0 flex-1">
          <SettingsView chatId={chatId} />
        </TabsContent>
      )}
    </Tabs>
  );
};

const ProjectView = ({ chatId, initialTab = "preview" }) => {
  const requested = parseTabParam(initialTab);
  const [activeFragment, setActiveFragment] = useState(null);
  const [tabState, setTabState] = useState(requested);
  const storedJson = useSyncExternalStore(
    subscribePanelStore,
    () => getOpenPanelsSnapshot(chatId),
    () => JSON.stringify(DEFAULT_OPEN)
  );
  const storedOpen = parseOpenPanels(storedJson);
  const openPanels = openPanel(storedOpen, tabState);
  // Phones get one pane at a time instead of side-by-side panels.
  const [mobilePane, setMobilePane] = useState(requested === "preview" ? "chat" : "preview");
  const isMobile = useIsMobile();

  useKeepSandboxAlive(chatId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (tabState === "preview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tabState);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [tabState]);

  const focusTab = (id) => {
    saveOpenPanels(chatId, openPanel(storedOpen, id));
    setTabState(id);
    setMobilePane("preview");
  };

  const closeTab = (id) => {
    saveOpenPanels(chatId, closePanel(storedOpen, id));
    setTabState((active) => nextActive({ open: storedOpen, active, closing: id }));
  };

  const chat = (
    <MessageContainer
      chatId={chatId}
      activeFragment={activeFragment}
      setActiveFragment={setActiveFragment}
      onFragmentOpen={() => {
        setTabState("preview");
        setMobilePane("preview");
      }}
      onOpenInstructions={() => focusTab("settings")}
    />
  );

  const preview = (
    <PreviewPane
      chatId={chatId}
      activeFragment={activeFragment}
      tabState={tabState}
      setTabState={setTabState}
      openPanels={openPanels}
      onOpenPanel={focusTab}
      onClosePanel={closeTab}
    />
  );

  return (
    <div className="h-dvh flex flex-col bg-background">
      <GithubReturnToasts />
      <ProjectHeader chatId={chatId}>
        {isMobile && (
          <div className="flex rounded-md border p-0.5">
            {[
              { value: "chat", icon: MessageSquare, label: "Chat" },
              { value: "preview", icon: EyeIcon, label: "Preview" },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                aria-label={label}
                aria-pressed={mobilePane === value}
                onClick={() => setMobilePane(value)}
                className={cn(
                  "flex size-7 items-center justify-center rounded-[5px] text-muted-foreground transition-colors cursor-pointer",
                  mobilePane === value && "bg-accent text-foreground"
                )}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
        )}
        <ShareButton chatId={chatId} />
        <PublishButton chatId={chatId} />
        <Button asChild size="sm" variant="outline" className="h-8">
          <Link href={"/pricing"}>
            <CrownIcon className="size-3.5" />
            Upgrade
          </Link>
        </Button>
      </ProjectHeader>

      {isMobile ? (
        <div className="min-h-0 flex-1">
          <div className={cn("h-full flex flex-col", mobilePane !== "chat" && "hidden")}>
            {chat}
          </div>
          <div className={cn("h-full p-2", mobilePane !== "preview" && "hidden")}>
            {preview}
          </div>
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
          <ResizablePanel defaultSize={35} minSize={25} className="flex flex-col min-h-0">
            {chat}
          </ResizablePanel>
          <ResizableHandle className="bg-transparent hover:bg-border transition-colors" />
          <ResizablePanel defaultSize={65} minSize={40} className="p-2 pl-0">
            {preview}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
};

export default ProjectView;
