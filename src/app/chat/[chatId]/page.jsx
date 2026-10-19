import ProjectView from "@/modules/projects/components/project-view";
import React from "react";

const Page = async ({ params, searchParams }) => {
  const { chatId } = await params;
  const { tab } = await searchParams;

  return <ProjectView chatId={chatId} initialTab={tab === "code" ? "code" : "preview"} />;
};

export default Page;
