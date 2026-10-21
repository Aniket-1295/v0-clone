"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Code, ExternalLink, EyeIcon, MoonIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MessageCard from "@/modules/projects/components/message-card";
import FragmentWeb from "@/modules/projects/components/fragment-web";
import { FileExplorer } from "@/modules/projects/components/file-explorer";

const PREVIEW_NOTES = {
  published: "Showing the published site. It may be an earlier version than the latest one.",
};

const AsleepPreview = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
    <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
      <MoonIcon className="size-5" />
    </div>
    <p className="text-sm font-medium text-foreground">The preview is asleep</p>
    <p className="max-w-xs text-xs">
      The live preview only runs while its owner is working on it. You can still read the code in the Code tab.
    </p>
  </div>
);

/** Read-only view of a shared chat: the conversation, the latest version's preview and code. */
const SharedChatView = ({ shareId, chat }) => {
  const [tab, setTab] = useState(chat.preview.mode === "asleep" && chat.latest ? "code" : "preview");
  const { preview } = chat;
  const attachmentSrc = (id) => `/api/share/${shareId}/attachments/${id}`;

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:h-dvh">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link href="/" aria-label="v0 clone home" className="shrink-0">
            <Image src="/logo.svg" alt="v0" width={24} height={24} className="invert dark:invert-0" />
          </Link>
          <span className="text-muted-foreground/60">/</span>
          <span className="truncate font-medium">{chat.title}</span>
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">Read-only</span>
        </div>
        <Button asChild size="sm" className="h-8 bg-foreground text-background hover:bg-foreground/90">
          <Link href="/">Build your own</Link>
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="min-h-0 overflow-y-auto border-b lg:border-b-0 lg:border-r">
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-5">
            {chat.messages.map((message) => (
              <MessageCard
                key={message.id}
                content={message.content}
                role={message.role}
                type={message.type}
                fragment={message.fragments}
                createdAt={message.createdAt}
                attachments={message.attachments}
                attachmentSrc={attachmentSrc}
                isActiveFragment={!!message.fragments && message.fragments.id === chat.latest?.id}
                onFragmentClick={() => setTab("preview")}
              />
            ))}
          </div>
        </div>

        <div className="h-[75dvh] p-2 lg:h-auto lg:min-h-0">
          <Tabs value={tab} onValueChange={setTab} className="flex h-full flex-col gap-0 overflow-hidden rounded-lg border bg-card">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b px-2">
              <TabsList className="h-8 p-0.5">
                <TabsTrigger value="preview" className="h-7 gap-1.5 px-2.5 text-xs">
                  <EyeIcon className="size-3.5" /> Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="h-7 gap-1.5 px-2.5 text-xs">
                  <Code className="size-3.5" /> Code
                </TabsTrigger>
              </TabsList>
              {tab === "preview" && preview.url && (
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                  {PREVIEW_NOTES[preview.mode] && (
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline">{PREVIEW_NOTES[preview.mode]}</span>
                  )}
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Open preview in new tab" asChild>
                    <a href={preview.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
            <TabsContent value="preview" className="min-h-0 flex-1 bg-background">
              {preview.url ? <FragmentWeb data={{ sandboxUrl: preview.url }} refreshKey={0} /> : <AsleepPreview />}
            </TabsContent>
            <TabsContent value="code" className="min-h-0 flex-1">
              {chat.latest?.files ? (
                <FileExplorer files={chat.latest.files} />
              ) : (
                <p className="p-6 text-sm text-muted-foreground">No code yet.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SharedChatView;
