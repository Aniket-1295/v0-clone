"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TextAreaAutosize from "react-textarea-autosize";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  FolderIcon,
  FolderPlusIcon,
  GithubIcon,
  ImagePlusIcon,
  InboxIcon,
  LayoutTemplateIcon,
  ListChecksIcon,
  MicIcon,
  PlusIcon,
  SearchIcon,
  SquareIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Hint } from "@/components/ui/hint";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { showActionError } from "@/lib/show-action-error";
import { useSpeechInput } from "@/hooks/use-speech-input";
import { useImageAttachment } from "@/hooks/use-image-attachment";
import { ImageAttachmentPreview } from "@/components/image-attachment-preview";
import { PromptLength, isPromptTooLong } from "@/components/prompt-length";
import { useCreateChat } from "@/modules/chats/hooks/chat";
import { useGetProjectById, useGetProjects } from "@/modules/projects/hooks/project";
import InstructionsSection from "@/modules/projects/components/instructions-section";
import { useAppShell } from "./app-shell";
import ModelPicker, { useModelTier } from "./model-picker";
import { GenerateImagesChip, GenerateImagesMenuItem } from "./generate-images-toggle";
import { useGenerateImages } from "@/hooks/use-stored-preference";

// Sent when the user attaches an image without typing anything.
const IMAGE_ONLY_PROMPT = "Recreate this design.";

const ghostButton =
  "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer";

/**
 * The signed-in prompt box: "+" menu, model picker, project picker, dictation and send.
 * Sending starts a chat in the chosen project, or a draft when no project is chosen.
 */
export default function AppPrompt({ initialProjectId = null }) {
  const router = useRouter();
  const { openNewProject } = useAppShell();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [projectQuery, setProjectQuery] = useState("");
  const { data: projects } = useGetProjects();
  const { data: projectDetail } = useGetProjectById(projectId, { enabled: instructionsOpen && !!projectId });
  const createChat = useCreateChat();
  const { tier } = useModelTier();
  const [generateImages] = useGenerateImages();
  const speech = useSpeechInput({ getBase: () => value, onText: setValue });
  const project = projects?.find((p) => p.id === projectId);
  const query = projectQuery.trim().toLowerCase();
  const matchingProjects = query ? projects?.filter((p) => p.name.toLowerCase().includes(query)) : projects;
  const attachment = useImageAttachment();
  const hasText = value.trim().length > 0;
  const tooLong = isPromptTooLong(value);
  const hasContent = hasText || !!attachment.image;
  const canSend = hasContent && !attachment.processing && !tooLong;

  const openInstructions = () => {
    if (!projectId) {
      toast.info("Start the chat, then set instructions in Settings.");
      return;
    }
    setInstructionsOpen(true);
  };

  const submit = async () => {
    if (!canSend || createChat.isPending) return;
    try {
      const chat = await createChat.mutateAsync([value.trim() || IMAGE_ONLY_PROMPT, projectId, attachment.image, tier.id, generateImages]);
      router.push(`/chat/${chat.id}`);
    } catch (error) {
      showActionError(error, router, "Failed to start the chat");
    }
  };

  return (
    <div
      {...attachment.dropProps}
      className={cn(
        "w-full rounded-xl border bg-card px-3 pb-2.5 pt-1 shadow-sm transition-colors dark:bg-neutral-950",
        focused && "border-foreground/30"
      )}
    >
      <input {...attachment.inputProps} />
      <ImageAttachmentPreview previewUrl={attachment.previewUrl} processing={attachment.processing} onRemove={attachment.clear} />
      <TextAreaAutosize
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPaste={attachment.onPaste}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        minRows={2}
        maxRows={12}
        aria-label="Describe what you want to build"
        placeholder={speech.listening ? "Listening..." : "Ask v0 to build..."}
        className="w-full resize-none bg-transparent px-1 pt-3 text-sm outline-none placeholder:text-muted-foreground md:text-base"
      />

      <div className="flex items-center gap-1 pt-1">
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Add" className={cn(ghostButton, "w-8 justify-center px-0")}>
            <PlusIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onSelect={openInstructions}>
              <ListChecksIcon className="size-4" /> Instructions
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={attachment.openPicker}>
              <ImagePlusIcon className="size-4" /> Attach image
            </DropdownMenuItem>
            <GenerateImagesMenuItem />
            <DropdownMenuItem asChild>
              <Link href="/templates"><LayoutTemplateIcon className="size-4" /> Start from a template</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/import"><GithubIcon className="size-4" /> Import from GitHub</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={openNewProject}>
              <FolderPlusIcon className="size-4" /> New project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ModelPicker className={ghostButton} />
        <GenerateImagesChip />

        <div className="ml-auto flex items-center gap-1.5">
          <PromptLength text={value} className="mr-1" />
          <DropdownMenu onOpenChange={(open) => !open && setProjectQuery("")}>
            <DropdownMenuTrigger className={cn(ghostButton, "max-w-44")}>
              <span className="truncate">{project ? project.name : "Project"}</span>
              <ChevronDownIcon className="size-3.5 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Start the chat in</DropdownMenuLabel>
              {projects?.length > 0 && (
                <div className="flex items-center gap-2 border-b px-2 pb-1.5">
                  <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <input
                    autoFocus
                    value={projectQuery}
                    onChange={(e) => setProjectQuery(e.target.value)}
                    // Keep typing in the box: the menu would treat letters as type-ahead.
                    onKeyDown={(e) => e.key !== "Escape" && e.key !== "ArrowDown" && e.stopPropagation()}
                    placeholder="Search projects"
                    aria-label="Search projects"
                    className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              )}
              {!query && (
                <DropdownMenuItem onSelect={() => setProjectId(null)}>
                  <InboxIcon className="size-4" /> No project (Drafts)
                  {!projectId && <CheckIcon className="ml-auto size-4" />}
                </DropdownMenuItem>
              )}
              {!query && projects?.length > 0 && <DropdownMenuSeparator />}
              {query && !matchingProjects?.length && (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">No projects match.</p>
              )}
              {matchingProjects?.map((p) => (
                <DropdownMenuItem key={p.id} onSelect={() => setProjectId(p.id)}>
                  <FolderIcon className="size-4" /> <span className="truncate">{p.name}</span>
                  {projectId === p.id && <CheckIcon className="ml-auto size-4" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={openNewProject}>
                <FolderPlusIcon className="size-4" /> New project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {hasContent ? (
            <button
              type="button"
              aria-label="Send"
              onClick={submit}
              disabled={createChat.isPending || !canSend}
              className="flex size-8 items-center justify-center rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60 cursor-pointer"
            >
              {createChat.isPending ? <Spinner /> : <ArrowUpIcon className="size-4" />}
            </button>
          ) : (
            speech.supported && (
              <Hint text={speech.listening ? "Stop dictation" : "Dictate"} side="bottom">
                <button
                  type="button"
                  aria-label={speech.listening ? "Stop dictation" : "Start dictation"}
                  aria-pressed={speech.listening}
                  onClick={speech.toggle}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md cursor-pointer",
                    speech.listening ? "bg-red-500/15 text-red-500" : "bg-foreground text-background hover:bg-foreground/90"
                  )}
                >
                  {speech.listening ? <SquareIcon className="size-3.5 fill-current" /> : <MicIcon className="size-4" />}
                </button>
              </Hint>
            )
          )}
        </div>
      </div>

      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Project instructions</DialogTitle>
            <DialogDescription>Rules for every chat in this project.</DialogDescription>
          </DialogHeader>
          {projectId && (
            <div className="overflow-hidden rounded-lg">
              <InstructionsSection
                scope="project"
                id={projectId}
                value={projectDetail?.instructions ?? ""}
                title="Project instructions"
                description={`Rules for every chat in ${project?.name ?? "this project"}.`}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
