"use client";
import { useAuth } from "@clerk/nextjs";
import { useGetProjects } from "@/modules/projects/hooks/project";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban } from "lucide-react";
import React from "react";
import Link from "next/link";

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const Header = () => (
  <h2 id="projects" className="mb-5 text-xl md:text-2xl font-semibold tracking-tight">
    Your projects
  </h2>
);

const ProjectList = () => {
  const { isSignedIn } = useAuth();
  const { data: projects, isPending } = useGetProjects({ enabled: !!isSignedIn });

  // A disabled query stays "pending", so never show skeletons to a signed-out visitor.
  if (!isSignedIn) {
    return null;
  }

  if (isPending) {
    return (
      <section className="w-full">
        <Header />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-[16/10] rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <section className="w-full">
      <Header />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6">
        {projects.map((project) => (
          <Link href={`/projects/${project.id}`} key={project.id} className="group">
            <div className="flex aspect-[16/10] items-center justify-center rounded-lg border bg-card transition-colors group-hover:border-foreground/30">
              <div className="flex size-10 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground transition-colors group-hover:text-foreground">
                <FolderKanban className="size-5" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-sm font-medium line-clamp-1">{project.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Created {formatDate(project.createdAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ProjectList;
