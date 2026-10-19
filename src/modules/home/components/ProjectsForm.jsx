"use client";
import React, { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TextAreaAutosize from "react-textarea-autosize";
import { ArrowUpIcon, MicIcon, SquareIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";
import { Spinner } from "@/components/ui/spinner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/hint";
import { Form, FormField } from "@/components/ui/form";

import { useCreateChat } from "@/modules/chats/hooks/chat";
import { useSpeechInput } from "@/hooks/use-speech-input";
import { showActionError } from "@/lib/show-action-error";

const formSchema = z.object({
  content: z
    .string()
    .min(1, "Project description is required")
    .max(1000, "Description is too long"),
});

/** The prompt form state, created by the page so starters elsewhere can fill it. */
export const usePromptForm = () =>
  useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    },
    mode: "onChange",
  });

const ProjectsForm = ({ form }) => {
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const { mutateAsync, isPending } = useCreateChat();
  const { supported: speechSupported, listening, toggle: toggleVoice } = useSpeechInput({
    getBase: () => form.getValues("content"),
    onText: (text) => form.setValue("content", text, { shouldValidate: true }),
  });
  const content = useWatch({ control: form.control, name: "content" }) ?? "";
  const hasText = content.trim().length > 0;

  const onSubmit = async (values) => {
    try {
      const chat = await mutateAsync([values.content, null]);
      router.push(`/chat/${chat.id}`);
      toast.success("Chat started");
      form.reset();
    } catch (error) {
      showActionError(error, router, "Failed to start the chat");
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "relative rounded-xl border bg-card px-3 pb-3 pt-1 shadow-sm transition-colors dark:bg-neutral-950",
          isFocused && "border-foreground/30"
        )}
      >
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <TextAreaAutosize
              {...field}
              aria-label="Describe what you want to build"
              placeholder={listening ? "Listening..." : "Ask v0 to build..."}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
                field.onBlur();
              }}
              minRows={2}
              maxRows={10}
              className="pt-3 px-1 resize-none border-none w-full outline-none bg-transparent text-sm md:text-base placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter adds a new line.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (hasText && !isPending) form.handleSubmit(onSubmit)(e);
                }
              }}
            />
          )}
        />

        <div className="flex gap-x-2 items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Shift + Enter for a new line
          </p>
          <div className="ml-auto flex items-center gap-1.5">
            {speechSupported && (
              <Hint text={listening ? "Stop dictation" : "Dictate"} side="bottom">
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={listening ? "Stop dictation" : "Start dictation"}
                  aria-pressed={listening}
                  onClick={toggleVoice}
                  className={cn("size-8 rounded-md cursor-pointer", listening && "bg-red-500/15 text-red-500 hover:bg-red-500/20")}
                >
                  {listening ? <SquareIcon className="size-3.5 fill-current" /> : <MicIcon className="size-4" />}
                </Button>
              </Hint>
            )}
            <Button
              aria-label="Create project"
              className="size-8 rounded-md cursor-pointer bg-foreground text-background hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
              disabled={isPending || !hasText}
              type="submit"
            >
              {isPending ? <Spinner /> : <ArrowUpIcon className="size-4" />}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default ProjectsForm;
