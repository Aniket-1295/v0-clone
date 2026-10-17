import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageRole } from "@prisma/client";
import { unwrap } from "@/lib/action-result";
import { createMessages, getMessages } from "../actions";

const POLL_INTERVAL_MS = 3000;

export const prefetchMessages = async(queryClient , projectId)=>{
    await queryClient.prefetchQuery({
        queryKey:["messages" , projectId],
        queryFn:async()=>unwrap(await getMessages(projectId)),
        staleTime:10000
    })
}

export const useGetMessages = (projectId)=>{
    return useQuery({
        queryKey:["messages" , projectId],
        queryFn:async()=>unwrap(await getMessages(projectId)),
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

export const useCreateMessages = (projectId)=>{
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn:async(value)=>unwrap(await createMessages(value , projectId)),
        onSuccess:()=>{
            queryClient.invalidateQueries({
                queryKey:["messages" , projectId]
            })
            queryClient.invalidateQueries({
                queryKey:["status"]
            })
        }
    })
}
