"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TextAreaAutosize from "react-textarea-autosize";
import { ArrowUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import z from "zod";
import { Spinner } from "@/components/ui/spinner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";

import { useCreateProject } from "@/modules/projects/hooks/project";
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
  const { mutateAsync, isPending } = useCreateProject();

  const onSubmit = async (values) => {
    try {
      const res = await mutateAsync(values.content);
      router.push(`/projects/${res.id}`);
      toast.success("Project created successfully");
      form.reset();
    } catch (error) {
      showActionError(error, router, "Failed to create project");
    }
  };

  const isButtonDisabled = isPending || !form.watch("content").trim();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "relative rounded-xl border bg-card px-3 pb-3 pt-1 shadow-sm transition-colors",
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
              placeholder="Ask v0 to build..."
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
                field.onBlur();
              }}
              minRows={2}
              maxRows={10}
              className="pt-3 px-1 resize-none border-none w-full outline-none bg-transparent text-sm md:text-base placeholder:text-muted-foreground"
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
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              <span>&#8984;</span>Enter
            </kbd>
            to send
          </div>
          <Button
            aria-label="Create project"
            className="ml-auto size-8 rounded-md cursor-pointer bg-foreground text-background hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
            disabled={isButtonDisabled}
            type="submit"
          >
            {isPending ? <Spinner /> : <ArrowUpIcon className="size-4" />}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProjectsForm;
