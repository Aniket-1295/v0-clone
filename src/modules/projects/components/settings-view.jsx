"use client";

import EnvVarsSection from "./env-vars-section";
import GithubSection from "./github-section";
import PublishSection from "./publish-section";
import ShareSection from "./share-section";

/**
 * Chat settings: secrets, sharing, GitHub and publishing in one place. The same
 * sections power the Share and Publish header shortcuts.
 */
export default function SettingsView({ chatId }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium">Settings</p>
        <p className="text-xs text-muted-foreground">Secrets, sharing, GitHub and publishing for this chat.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mx-auto flex max-w-xl flex-col gap-3">
          <section className="overflow-hidden rounded-lg border bg-card">
            <EnvVarsSection chatId={chatId} />
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
