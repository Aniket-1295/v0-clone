import { inngest } from "./client";
import { gemini, createAgent } from "@inngest/agent-kit";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "agent/hello" },


  async ({ event, step }) => {
    
   const helloAgent = createAgent({
    name:"hello-agent",
    description:"An agent that says hello",
    system:"You're a friendly agent that greets people.",
    model:gemini({model:"gemini-2.5-flash"}),
   })

   const {output} = await helloAgent.run("Hello, how are you?");

   return{
    message: output[0].content
   }
  },

);