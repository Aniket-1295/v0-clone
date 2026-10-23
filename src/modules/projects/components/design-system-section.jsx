"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { showActionError } from "@/lib/show-action-error";
import { useDesignSystems } from "@/modules/design-systems/hooks/design-system";
import { useUpdateChatDesignSystem } from "@/modules/chats/hooks/chat";
import { useUpdateProjectDesignSystem } from "@/modules/projects/hooks/project";

const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm disabled:opacity-60";

/**
 * Applies a saved design system to a chat or a project. New apps are generated in that
 * theme; existing apps re-theme on their next build. A chat's own system overrides the
 * project default.
 */
const DesignSystemSection = ({ scope, id, value, projectDefault = null }) => {
  const router = useRouter();
  const { data: systems, isPending } = useDesignSystems();
  const chatSave = useUpdateChatDesignSystem(scope === "chat" ? id : null);
  const projectSave = useUpdateProjectDesignSystem(scope === "project" ? id : null);
  const save = scope === "chat" ? chatSave : projectSave;

  const onChange = async (next) => {
    try {
      await save.mutateAsync(next || null);
    } catch (error) {
      showActionError(error, router, "Could not apply the design system.");
    }
  };

  return (
    <>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">Design system</p>
        <p className="text-xs text-muted-foreground">
          {scope === "project"
            ? "Default theme for this project's chats. A chat can override it."
            : "Theme this chat's app is built in."}
        </p>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <select
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value)}
            disabled={isPending || save.isPending}
            aria-label="Design system"
            className={selectClass}
          >
            <option value="">
              {scope === "chat" && projectDefault ? `Project default (${projectDefault.name})` : "None"}
            </option>
            {(systems ?? []).map((system) => (
              <option key={system.id} value={system.id}>{system.name}</option>
            ))}
          </select>
          {save.isPending && <Spinner className="size-4 text-muted-foreground" />}
        </div>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Link href="/design-systems" className="inline-flex items-center gap-1 underline-offset-2 hover:text-foreground hover:underline">
            Manage design systems <ExternalLinkIcon className="size-3" />
          </Link>
          · Applies to the next generation.
        </p>
      </div>
    </>
  );
};

export default DesignSystemSection;
