"use client";

import { Code, DatabaseIcon, EyeIcon, GitCompareIcon, PlusIcon, ScrollTextIcon, SettingsIcon, TerminalIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { closedPanels, panelById } from "@/lib/workspace-panels";
import { cn } from "@/lib/utils";

const ICONS = {
  preview: EyeIcon,
  code: Code,
  diff: GitCompareIcon,
  logs: ScrollTextIcon,
  terminal: TerminalIcon,
  database: DatabaseIcon,
  settings: SettingsIcon,
};

/**
 * Open workspace tabs plus a "+" menu of closed ones. Preview has no close button.
 */
const WorkspaceTabBar = ({ openPanels, onOpen, onClose }) => {
  const closed = closedPanels(openPanels);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <TabsList className="h-8 p-0.5">
        {openPanels.map((id) => {
          const panel = panelById(id);
          if (!panel) return null;
          const Icon = ICONS[id];
          return (
            <div key={id} className="flex items-center">
              <TabsTrigger value={id} className={cn("h-7 gap-1.5 px-2.5 text-xs", panel.closeable && "pr-1")}>
                {Icon && <Icon className="size-3.5" />}
                {panel.label}
              </TabsTrigger>
              {panel.closeable && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`Close ${panel.label}`}
                  className="-ml-1 mr-0.5 flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose(id);
                  }}
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>
          );
        })}
      </TabsList>

      {closed.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Add panel">
              <PlusIcon className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {closed.map((panel) => {
              const Icon = ICONS[panel.id];
              return (
                <DropdownMenuItem key={panel.id} onSelect={() => onOpen(panel.id)} className="gap-2 text-xs">
                  {Icon && <Icon className="size-3.5" />}
                  {panel.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default WorkspaceTabBar;
