"use client";

import DatabaseSection from "./database-section";
import DesignSystemSection from "./design-system-section";
import EnvVarsSection from "./env-vars-section";
import GithubSection from "./github-section";
import InstructionsSection from "./instructions-section";
import PublishSection from "./publish-section";
import ShareSection from "./share-section";
import { useGetChat } from "@/modules/chats/hooks/chat";

/**
 * Chat settings: instructions, secrets, sharing, GitHub and publishing in one place.
 * Share and Publish header shortcuts reuse the same sections.
 */
export default function SettingsView({ chatId }) {
  const { data: chat } = useGetChat(chatId);
  const project = chat?.project;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">Settings</p>
        <p className="text-xs text-muted-foreground">
          Instructions, database, secrets, sharing, GitHub and publishing for this chat.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mx-auto flex max-w-xl flex-col gap-3">
          {project && (
            <section className="overflow-hidden rounded-lg border bg-card">
              <InstructionsSection
                scope="project"
                id={project.id}
                value={project.instructions ?? ""}
                title="Project instructions"
                description={`Rules for every chat in ${project.name}. Chat instructions below override these when they conflict.`}
              />
            </section>
          )}
          <section className="overflow-hidden rounded-lg border bg-card">
            <InstructionsSection
              scope="chat"
              id={chatId}
              value={chat?.instructions ?? ""}
              title="Chat instructions"
              description="Rules v0 follows on every generation in this chat."
            />
          </section>
          <section className="overflow-hidden rounded-lg border bg-card">
            <DesignSystemSection
              scope="chat"
              id={chatId}
              value={chat?.designSystemId ?? ""}
              projectDefault={project?.designSystem ?? null}
            />
          </section>
          <section className="overflow-hidden rounded-lg border bg-card">
            <EnvVarsSection chatId={chatId} />
          </section>
          <section className="overflow-hidden rounded-lg border bg-card">
            <DatabaseSection chatId={chatId} />
          </section>
          <section className="overflow-hidden rounded-lg border bg-card">
            <ShareSection chatId={chatId} />
          </section>
          <section className="overflow-hidden rounded-lg border bg-card">
            <GithubSection chatId={chatId} />
          </section>
          <section className="overflow-hidden rounded-lg border bg-card">
            <PublishSection chatId={chatId} />
          </section>
        </div>
      </div>
    </div>
  );
}
