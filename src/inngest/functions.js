import { inngest } from "./client";
import { gemini, createAgent } from "@inngest/agent-kit";
// import Sandbox from "@e2b/code-interpreter"
// import { Sandbox } from "@e2b/sdk";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "agent/hello" },


  async ({ event, step }) => {

    // const sandboxId = await step.run("get-sandbox-id",async()=>{

    //   const sandbox = await Sandbox.create("v0-nextjs-dev")

    //   return sandbox.sandboxId
    // })

    // const sandboxId = await step.run("get-sandbox-id", async () => {
    //   const sandbox = await Sandbox.create({
    //     template: "7cl2nt1ar3m08c01aoet",
    //   });

    //   return sandbox.id;
    // });


    

   const helloAgent = createAgent({
    name:"hello-agent",
    description:"An agent that says hello",
    system:"You're a friendly agent that greets people.",
    model:gemini({model:"gemini-2.5-flash"}),
   })

   const {output} = await helloAgent.run("Hello, how are you?");

  //  const sandboxUrl = await step.run("get-sandbox-url", async() => {
  //   const sandbox = await Sandbox.connect(sandboxId);
  //   const host = sandbox.getHost(3000);

  //   return `http://${host}`;
  // });

  // const sandboxUrl = await step.run("get-sandbox-url", async () => {
  //   const sandbox = await Sandbox.fromId(sandboxId);
  //   const url = sandbox.getPortUrl(3000);

  //   return url;
  // });

   return{
    message: output[0].content,
    // sandboxUrl,
   }
  },

);