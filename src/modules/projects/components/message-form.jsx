"use client";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import TextAreaAutosize from "react-textarea-autosize";
import { ArrowUpIcon } from "lucide-react";
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


const formSchema = z.object({
  content: z
    .string()
    .min(1, "Message description is required")
    .max(1000, "Description is too long"),
});



const MessageForm = ({projectId}) => {
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const {mutateAsync , isPending} = useCreateMessages(projectId)

  const {data:usage} = useStatus()

  const showUsage = !!usage;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    },
    mode:"onChange"
  });

  const content = useWatch({ control: form.control, name: "content" }) ?? "";

 
  const onSubmit = async (values) => {
    try {
      await mutateAsync(values.content)
      form.reset()
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
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn(
            "relative rounded-xl border bg-card px-3 pb-3 pt-1 shadow-sm transition-colors",
            showUsage && "rounded-t-none",
            isFocused && "border-foreground/30"
          )}
        >
         <FormField
         control={form.control}
         name="content"
         render={({field})=>(
                <TextAreaAutosize
                {...field}
                disabled={isPending}
                aria-label="Ask for a change"
                placeholder="Ask v0 to change something..."
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
            <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                <span>&#8984;</span>Enter
              </kbd>
              to send
            </div>
            <Button
            aria-label="Send message"
            className="ml-auto size-8 rounded-md cursor-pointer bg-foreground text-background hover:bg-foreground/90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
            disabled={isPending || !content.trim()}
            type="submit"
            >
              {
                isPending ? (<Spinner/>) : (<ArrowUpIcon className="size-4"/>)
              }
            </Button>
         </div>
        </form>
      </Form>
   
  );
};

export default MessageForm;