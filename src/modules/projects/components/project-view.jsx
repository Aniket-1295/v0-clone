"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ProjectHeader from "./project-header";
import MessageContainer from "./message-container";
import { strToU8, zipSync } from "fflate";
import {
  Code,
  CrownIcon,
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
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useGetChat, useKeepSandboxAlive } from "@/modules/chats/hooks/chat";
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

const PreviewPane = ({ chatId, activeFragment, tabState, setTabState }) => {
  const { data: chat } = useGetChat(chatId);
  const [previewKey, setPreviewKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const sandboxUrl = activeFragment?.sandboxUrl;

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
        <TabsList className="h-8 p-0.5">
          <TabsTrigger value="preview" className="h-7 px-2.5 gap-1.5 text-xs">
            <EyeIcon className="size-3.5" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="code" className="h-7 px-2.5 gap-1.5 text-xs">
            <Code className="size-3.5" />
            Code
          </TabsTrigger>
        </TabsList>

        {tabState === "preview" && sandboxUrl && (
          <div className="flex min-w-0 flex-1 items-center gap-1">
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

      <TabsContent value="preview" className="min-h-0 flex-1 bg-background">
        {activeFragment ? (
          <FragmentWeb data={activeFragment} refreshKey={previewKey} />
        ) : (
          <EmptyPane icon={MonitorIcon} text="Your preview will appear here" />
        )}
      </TabsContent>

      <TabsContent value="code" className="min-h-0 flex-1">
        {activeFragment?.files ? (
          <FileExplorer files={activeFragment.files} />
        ) : (
          <EmptyPane icon={Code} text="Generated code will appear here" />
        )}
      </TabsContent>
    </Tabs>
  );
};

const ProjectView = ({ chatId, initialTab = "preview" }) => {
  const [activeFragment, setActiveFragment] = useState(null);
  const [tabState, setTabState] = useState(initialTab);
  // Phones get one pane at a time instead of side-by-side panels.
  const [mobilePane, setMobilePane] = useState(initialTab === "code" ? "preview" : "chat");
  const isMobile = useIsMobile();

  useKeepSandboxAlive(chatId);

  const chat = (
    <MessageContainer
      chatId={chatId}
      activeFragment={activeFragment}
      setActiveFragment={setActiveFragment}
      onFragmentOpen={() => {
        setTabState("preview");
        setMobilePane("preview");
      }}
    />
  );

  const preview = (
    <PreviewPane
      chatId={chatId}
      activeFragment={activeFragment}
      tabState={tabState}
      setTabState={setTabState}
    />
  );

  return (
    <div className="h-dvh flex flex-col bg-background">
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
