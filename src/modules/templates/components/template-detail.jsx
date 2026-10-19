"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  ChevronRight,
  Code,
  CopyCheckIcon,
  CopyIcon,
  ExternalLink,
  EyeIcon,
  Monitor,
  RefreshCcw,
  Smartphone,
  Tablet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/hint";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { showActionError } from "@/lib/show-action-error";
import { CodeView } from "@/modules/projects/components/code-view";
import { useCreateProjectFromTemplate } from "@/modules/projects/hooks/project";
import { getCategoryLabel } from "@/templates/registry";
import TemplateCard from "./template-card";

const DEVICES = [
  { id: "desktop", icon: Monitor, width: "100%" },
  { id: "tablet", icon: Tablet, width: "768px" },
  { id: "phone", icon: Smartphone, width: "390px" },
];

const UseTemplateButton = ({ template }) => {
  const router = useRouter();
  const { mutateAsync, isPending } = useCreateProjectFromTemplate();

  const onUse = async () => {
    try {
      const project = await mutateAsync(template.slug);
      toast.success(`${template.name} added to your projects`);
      router.push(`/projects/${project.id}?tab=code`);
    } catch (error) {
      showActionError(error, router, "Could not start a project from this template");
    }
  };

  const className = "h-9 bg-foreground text-background hover:bg-foreground/90 cursor-pointer";

  return (
    <>
      <SignedIn>
        <Button onClick={onUse} disabled={isPending} className={className}>
          {isPending && <Spinner />}
          Use template
        </Button>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <Button className={className}>Use template</Button>
        </SignInButton>
      </SignedOut>
    </>
  );
};

export default function TemplateDetail({ template, source, related }) {
  const [tab, setTab] = useState("preview");
  const [device, setDevice] = useState("desktop");
  const [frameKey, setFrameKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const previewUrl = `/templates-preview/${template.slug}`;
  const fileName = `components/${template.slug}.jsx`;

  const copyCode = () => {
    navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/templates" className="hover:text-foreground">Templates</Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/templates?category=${template.category}`} className="hover:text-foreground">
          {getCategoryLabel(template.category)}
        </Link>
      </nav>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight">{template.name}</h1>
          <p className="mt-2 text-muted-foreground">{template.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" className="h-9">
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Open preview
            </a>
          </Button>
          <UseTemplateButton template={template} />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <div className="flex h-11 items-center gap-2 border-b px-2">
          <div className="flex rounded-lg bg-muted p-0.5">
            {[["preview", EyeIcon, "Preview"], ["code", Code, "Code"]].map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors cursor-pointer",
                  tab === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>

          {tab === "preview" ? (
            <div className="ml-auto flex items-center gap-1">
              {DEVICES.map(({ id, icon: Icon }) => (
                <Hint key={id} text={id[0].toUpperCase() + id.slice(1)} side="bottom">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${id} width`}
                    aria-pressed={device === id}
                    onClick={() => setDevice(id)}
                    className={cn("size-8", device === id && "bg-accent")}
                  >
                    <Icon className="size-4" />
                  </Button>
                </Hint>
              ))}
              <Hint text="Reload" side="bottom">
                <Button variant="ghost" size="icon" aria-label="Reload preview" className="size-8" onClick={() => setFrameKey((k) => k + 1)}>
                  <RefreshCcw className="size-3.5" />
                </Button>
              </Hint>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{fileName}</span>
              <Hint text={copied ? "Copied" : "Copy code"} side="bottom">
                <Button variant="ghost" size="icon" aria-label="Copy code" className="size-8" onClick={copyCode}>
                  {copied ? <CopyCheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                </Button>
              </Hint>
            </div>
          )}
        </div>

        <div className="h-[70vh] min-h-[480px] bg-muted/40">
          {tab === "preview" ? (
            <div className="flex h-full justify-center">
              <iframe
                key={frameKey}
                src={previewUrl}
                title={`${template.name} preview`}
                className="h-full border-x bg-white transition-[width] duration-300"
                style={{ width: DEVICES.find((d) => d.id === device).width }}
              />
            </div>
          ) : (
            <div className="h-full overflow-auto bg-background">
              <CodeView code={source} lang="jsx" />
            </div>
          )}
        </div>
      </div>

      <section className="mt-12 rounded-xl border bg-card p-5">
        <h2 className="text-sm font-medium">Prompt</h2>
        <p className="mt-2 text-sm text-muted-foreground">{template.prompt}</p>
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 text-xl font-semibold tracking-tight">More {getCategoryLabel(template.category)}</h2>
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((t) => (
              <TemplateCard key={t.slug} template={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
