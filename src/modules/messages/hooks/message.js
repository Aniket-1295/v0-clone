import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageRole } from "@prisma/client";
import { unwrap } from "@/lib/action-result";
import { createMessages, getAgentSteps, getMessages, stopGeneration } from "../actions";

const POLL_INTERVAL_MS = 3000;
const STEPS_POLL_INTERVAL_MS = 1500;

export const prefetchMessages = async(queryClient , chatId)=>{
    await queryClient.prefetchQuery({
        queryKey:["messages" , chatId],
        queryFn:async()=>unwrap(await getMessages(chatId)),
        staleTime:10000
    })
}

export const useGetMessages = (chatId)=>{
    return useQuery({
        queryKey:["messages" , chatId],
        queryFn:async()=>unwrap(await getMessages(chatId)),
        staleTime:10000,
        // TanStack Query v5 passes the Query object here, not the data.
        // Poll only while the agent is still working, i.e. the last message
        // is the user's and no assistant reply has landed yet.
        refetchInterval:(query)=>{
            const messages = query.state.data;
            const lastMessage = messages?.[messages.length - 1];

            return lastMessage?.role === MessageRole.USER ? POLL_INTERVAL_MS : false;
        }
    })
}

export const useCreateMessages = (chatId)=>{
    const queryClient = useQueryClient();

    return useMutation({
        // value: the prompt, or { value, image, tierId } with an image to recreate and a model tier.
        mutationFn:async(input)=>{
            const { value, image = null, tierId = null } = typeof input === "string" ? { value: input } : input
            return unwrap(await createMessages(value , chatId, image, tierId))
        },
        onSuccess:()=>{
            queryClient.invalidateQueries({
                queryKey:["messages" , chatId]
            })
            queryClient.invalidateQueries({
                queryKey:["status"]
            })
            queryClient.invalidateQueries({
                queryKey:["chats"]
            })
            queryClient.invalidateQueries({
                queryKey:["projects"]
            })
        }
    })
}


// Agent progress for the chat. Polls quickly only while a generation is running.
export const useGetAgentSteps = (chatId, isGenerating)=>{
    return useQuery({
        queryKey:["steps" , chatId],
        queryFn:async()=>unwrap(await getAgentSteps(chatId)),
        enabled:!!chatId,
        refetchInterval:isGenerating ? STEPS_POLL_INTERVAL_MS : false,
    })
}

export const useStopGeneration = (chatId)=>{
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn:async()=>unwrap(await stopGeneration(chatId)),
        onSuccess:()=>{
            queryClient.invalidateQueries({ queryKey:["messages" , chatId] })
            queryClient.invalidateQueries({ queryKey:["steps" , chatId] })
            queryClient.invalidateQueries({ queryKey:["status"] })
        }
    })
}
