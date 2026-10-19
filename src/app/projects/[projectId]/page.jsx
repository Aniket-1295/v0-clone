import ProjectView from "@/modules/projects/components/project-view";
import React from "react";

const Page = async ({ params, searchParams }) => {
  const { projectId } = await params;
  const { tab } = await searchParams;

  return (
    <ProjectView projectId={projectId} initialTab={tab === "code" ? "code" : "preview"} />
  );
};

export default Page;
