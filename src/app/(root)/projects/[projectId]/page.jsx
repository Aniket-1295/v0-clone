import ProjectDetail from "@/modules/projects/components/project-detail";

export default async function Page({ params }) {
  const { projectId } = await params;
  return <ProjectDetail projectId={projectId} />;
}
