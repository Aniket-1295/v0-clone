import ProjectView from "@/modules/projects/components/project-view";
import { parseTabParam } from "@/lib/workspace-panels";
import React from "react";

const Page = async ({ params, searchParams }) => {
  const { chatId } = await params;
  const { tab } = await searchParams;

  return <ProjectView key={chatId} chatId={chatId} initialTab={parseTabParam(tab)} />;
};

export default Page;
