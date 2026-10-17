import {useQuery , useMutation , useQueryClient} from "@tanstack/react-query"
import { unwrap } from "@/lib/action-result"
import { createProject , getProjectById , getProjects } from "../actions"

export const useGetProjects = ({ enabled = true } = {})=>{
    return useQuery({
        queryKey:["projects"],
        queryFn:async()=>unwrap(await getProjects()),
        enabled
    })
}

export const useCreateProject = ()=>{
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn:async(value)=>unwrap(await createProject(value)),
        onSuccess:()=>{
            queryClient.invalidateQueries({queryKey:["projects"]})
            queryClient.invalidateQueries({queryKey:["status"]})
        }
    })
}


export const useGetProjectById = (projectId)=>{
    return useQuery({
        queryKey:["project" , projectId],
        queryFn:async()=>unwrap(await getProjectById(projectId))
    })
}
