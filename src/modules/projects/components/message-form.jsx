"use client";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TextAreaAutosize from "react-textarea-autosize";
import { ArrowUpIcon, ImagePlusIcon, ListChecksIcon, PlusIcon, SquareIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";
import { useState } from "react";
import z from "zod";
import { Spinner } from "@/components/ui/spinner"

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { useCreateMessages } from "@/modules/messages/hooks/message";
import { useStatus } from "@/modules/usage/hooks/usage";
import { Usage } from "@/modules/usage/components/usage";
import { showActionError } from "@/lib/show-action-error";
import { useImageAttachment } from "@/hooks/use-image-attachment";
import { ImageAttachmentPreview } from "@/components/image-attachment-preview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MAX_PROMPT_LENGTH } from "@/lib/generation-limits";
import { PromptLength, isPromptTooLong } from "@/components/prompt-length";


// Empty is allowed when an image is attached (the prompt then asks to recreate it).
const formSchema = z.object({
  content: z.string().max(MAX_PROMPT_LENGTH, "Description is too long"),
});

const IMAGE_ONLY_PROMPT = "Recreate this design.";



// While a generation runs (isGenerating) the send button becomes Stop.
const MessageForm = ({chatId, isGenerating = false, onStop, isStopping = false, onOpenInstructions}) => {
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const {mutateAsync , isPending} = useCreateMessages(chatId)

  const {data:usage} = useStatus()
  const attachment = useImageAttachment()

  const showUsage = !!usage;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    },
    mode:"onChange"
  });

  const content = useWatch({ control: form.control, name: "content" }) ?? "";
  const canSend = (!!content.trim() || !!attachment.image) && !attachment.processing && !isPromptTooLong(content);

 
  const onSubmit = async (values) => {
    if (isGenerating || !canSend) return;
    try {
      await mutateAsync({ value: values.content.trim() || IMAGE_ONLY_PROMPT, image: attachment.image })
      form.reset()
      attachment.clear()
      toast.success("Message sent successfully")
    } catch (error) {
      showActionError(error, router, "Failed to send message");
    }
  };


  

  return (
      <Form {...form}>
        {
          showUsage && (
            <Usage/>
          )
        }
        <form
          {...attachment.dropProps}
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn(
            "relative rounded-xl border bg-card px-3 pb-3 pt-1 shadow-sm transition-colors",
            showUsage && "rounded-t-none",
            isFocused && "border-foreground/30"
          )}
        >
         <input {...attachment.inputProps} />
         <ImageAttachmentPreview previewUrl={attachment.previewUrl} processing={attachment.processing} onRemove={attachment.clear} />
         <FormField
         control={form.control}
         name="content"
         render={({field})=>(
                <TextAreaAutosize
                {...field}
                disabled={isPending}
                aria-label="Ask for a change"
                placeholder="Ask v0 to change something..."
                onPaste={attachment.onPaste}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false);
                  field.onBlur();
                }}
                minRows={2}
                maxRows={8}
                className={cn(
                  "pt-3 px-1 resize-none border-none w-full outline-none bg-transparent text-sm placeholder:text-muted-foreground",
                  isPending && "opacity-50"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    form.handleSubmit(onSubmit)(e);
                  }
                }}
              />
         )}
         />

         <div className="flex gap-x-2 items-center justify-between pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={isPending}
                  aria-label="Add"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50 cursor-pointer"
                >
                  <PlusIcon className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onSelect={() => onOpenInstructions?.()}>
                  <ListChecksIcon className="size-4" /> Instructions
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={attachment.openPicker}>
                  <ImagePlusIcon className="size-4" /> Attach image
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                <span>&#8984;</span>Enter
              </kbd>
              to send
            </div>
            <div className="ml-auto flex items-center gap-2">
            <PromptLength text={content} />
            {isGenerating ? (
              <Button
              aria-label="Stop generating"
              title="Stop"
              className="ml-auto size-8 rounded-md cursor-pointer bg-foreground text-background hover:bg-foreground/90 disabled:opacity-70"
              disabled={isStopping}
              type="button"
              onClick={onStop}
              >
                {isStopping ? <Spinner/> : <SquareIcon className="size-3 fill-current"/>}
              </Button>
            ) : (
              <Button
              aria-label="Send message"
              className="ml-auto size-8 rounded-md cursor-pointer bg-foreground text-background hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
              disabled={isPending || !canSend}
              type="submit"
              >
                {
                  isPending ? (<Spinner/>) : (<ArrowUpIcon className="size-4"/>)
                }
              </Button>
            )}
            </div>
         </div>
        </form>
      </Form>
   
  );
};

export default MessageForm;