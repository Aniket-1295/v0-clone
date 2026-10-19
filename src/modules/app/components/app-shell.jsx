"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { PanelLeftIcon } from "lucide-react";
import { showActionError } from "@/lib/show-action-error";
import { useCreateProject } from "@/modules/projects/hooks/project";
import AppSidebar from "./app-sidebar";
import SearchDialog from "./search-dialog";
import RenameDialog from "./rename-dialog";

const AppShellContext = createContext({ openSearch: () => {}, openNewProject: () => {} });

/** Opens the app-wide dialogs (search palette, new project) from anywhere in the shell. */
export const useAppShell = () => useContext(AppShellContext);

/** Re-opens the sidebar when it is collapsed (always shown on phones, where it is a sheet). */
const ReopenSidebar = () => {
  const { open, isMobile, toggleSidebar } = useSidebar();
  if (open && !isMobile) return null;
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label="Open sidebar"
      className="fixed left-3 top-3 z-40 flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground cursor-pointer dark:bg-black"
    >
      <PanelLeftIcon className="size-4" />
    </button>
  );
};

/** The signed-in app frame: v0-style sidebar plus the page. */
export default function AppShell({ children, defaultOpen = true }) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const createProject = useCreateProject();

  // Cmd/Ctrl+K opens search, like v0.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = {
    openSearch: () => setSearchOpen(true),
    openNewProject: () => setNewProjectOpen(true),
  };

  return (
    <AppShellContext.Provider value={value}>
      <SidebarProvider defaultOpen={defaultOpen} className="bg-background dark:bg-black">
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background dark:bg-black">
          <ReopenSidebar />
          {children}
        </SidebarInset>
      </SidebarProvider>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <RenameDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        title="New project"
        placeholder="Project name"
        submitLabel="Create"
        onSubmit={async (name) => {
          try {
            const project = await createProject.mutateAsync([name]);
            setNewProjectOpen(false);
            toast.success(`Created ${project.name}`);
            router.push(`/projects/${project.id}`);
          } catch (error) {
            showActionError(error, router);
          }
        }}
      />
    </AppShellContext.Provider>
  );
}
