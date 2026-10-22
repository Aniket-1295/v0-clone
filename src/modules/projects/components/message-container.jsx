import {
    useGetMessages,
    useGetAgentSteps,
    useStopGeneration,
    prefetchMessages,
  } from "@/modules/messages/hooks/message";
  import React, { useEffect, useRef } from "react";
  import { MessageRole } from "@prisma/client";
  import { useQueryClient } from "@tanstack/react-query";
  import { Spinner } from "@/components/ui/spinner";
  import MessageCard from "./message-card";
  import MessageForm from "./message-form";
  import MessageLoading from "./message-loader";
  import { useRouter } from "next/navigation";
  import { toast } from "sonner";
  import { useRestoreVersion } from "@/modules/chats/hooks/chat";
  import { showActionError } from "@/lib/show-action-error";
  
  const MessageContainer = ({ chatId, activeFragment, setActiveFragment, onFragmentOpen, onOpenInstructions }) => {
    const queryClient = useQueryClient();
    const bottomRef = useRef(null);
    const lastAssistantMessageIdRef = useRef(null);
    const router = useRouter();
    const restore = useRestoreVersion(chatId);
  
    const {
      data: messages,
      isPending,
      isError,
      error,
    } = useGetMessages(chatId);

    const lastMessage = messages?.[messages.length - 1];
    const isLastMessageUser = lastMessage?.role === MessageRole.USER
    const { data: steps } = useGetAgentSteps(chatId, isLastMessageUser);
    const stop = useStopGeneration(chatId);

    // The run just ended: fetch its final step states once.
    useEffect(() => {
      if (!isLastMessageUser) queryClient.invalidateQueries({ queryKey: ["steps", chatId] });
    }, [isLastMessageUser, chatId, queryClient]);
  
    useEffect(() => {
      if (chatId) {
        prefetchMessages(queryClient, chatId);
      }
    }, [chatId, queryClient]);
  
    useEffect(()=>{
      // The newest reply with a version; "Stopped" and error replies have none.
      const lastAssistantMessage = messages?.findLast(
        (message) => message.role === MessageRole.ASSISTANT && message.fragments
      );
  
      // Keyed on the sandbox URL too, so a rebuilt sandbox refreshes the preview.
      const key = `${lastAssistantMessage?.id}:${lastAssistantMessage?.fragments?.sandboxUrl}`
      if(lastAssistantMessage?.fragments && key !== lastAssistantMessageIdRef.current){
        setActiveFragment(lastAssistantMessage?.fragments);
        lastAssistantMessageIdRef.current = key
      }
    },[messages , setActiveFragment])
  
    useEffect(()=>{
      bottomRef.current?.scrollIntoView({behavior:"smooth"})
    },[messages?.length])
  
    if (isPending) {
      return (
        <div className="flex items-center justify-center h-full">
          <Spinner className={"text-muted-foreground"} />
        </div>
      );
    }
  
    if (isError) {
      return (
        <div className="flex items-center justify-center h-full text-red-500">
          Error: {error?.message || "Failed to load messages"}
        </div>
      );
    }
  
    if (!messages || messages.length === 0) {
      return (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            No messages yet. Describe what you want to build.
          </div>
          <div className="relative p-3 pt-1">
            <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-background pointer-events-none" />
            <MessageForm chatId={chatId} onOpenInstructions={onOpenInstructions}/>
          </div>
        </div>
      );
    }
  
    const latestFragmentId = messages.findLast((message) => message.fragments)?.fragments.id

    const stepsByPrompt = (steps ?? []).reduce((groups, step) => {
      (groups[step.promptId] ??= []).push(step)
      return groups
    }, {})
    // Each reply's steps belong to the user message just before it.
    const promptIdBefore = (index) => messages.slice(0, index).findLast((message) => message.role === MessageRole.USER)?.id

    const onStop = () => {
      stop.mutate(undefined, {
        onError: (error) => showActionError(error, router, "Could not stop the generation."),
      })
    }

    const onRestore = (fragment) => {
      restore.mutate(fragment.id, {
        onSuccess: () => toast.success(`Restored "${fragment.title}"`),
        onError: (error) => showActionError(error, router, "Could not restore this version."),
      })
    }
  
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-5">
          {messages.map((message, index) => (
            <MessageCard 
            key={message.id}
            content={message.content}
            role={message.role}
            fragment={message.fragments}
            createdAt={message.createdAt}
            isActiveFragment={activeFragment?.id === message.fragments?.id}
            onFragmentClick={()=>{
              setActiveFragment(message.fragments)
              onFragmentOpen?.()
            }}
            type={message.type}
            attachments={message.attachments}
            canRestore={!!message.fragments && message.fragments.id !== latestFragmentId}
            onRestore={() => onRestore(message.fragments)}
            isRestoring={restore.isPending && restore.variables === message.fragments?.id}
            restoreDisabled={restore.isPending || isLastMessageUser}
            steps={message.role === MessageRole.ASSISTANT ? stepsByPrompt[promptIdBefore(index)] : undefined}
            />
          ))}
          {isLastMessageUser && <MessageLoading steps={stepsByPrompt[lastMessage.id]} startedAt={lastMessage.createdAt}/>}
          <div ref={bottomRef}/>
          </div>
        </div>
  
        <div className="relative p-3 pt-1">
             <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-background pointer-events-none" />
             <div className="mx-auto max-w-3xl">
               <MessageForm chatId={chatId} isGenerating={isLastMessageUser} onStop={onStop} isStopping={stop.isPending} onOpenInstructions={onOpenInstructions}/>
             </div>
        </div>
      </div>
    );
  };
  
  export default MessageContainer;