"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Bot,
  Cloud,
  CreditCard,
  Database,
  Github,
  Globe,
  KeyRound,
  Mail,
  MessageSquare,
  MousePointer2,
  Rocket,
  Search,
  ShoppingCart,
  Webhook,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TemplateThumbnail from "@/modules/templates/components/template-thumbnail";

const Card = ({ className, title, text, children, href }) => {
  const body = (
    <>
      {title && (
        <div className="p-8 pb-4">
          <h3 className="mb-2 text-lg font-semibold tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      )}
      {children}
    </>
  );
  const classes = cn(
    "group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-foreground/20 dark:bg-neutral-950",
    className
  );
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
};

const Orb = ({ children }) => (
  <div className="flex size-20 items-center justify-center rounded-full border bg-background shadow-[0_0_40px_rgba(255,255,255,0.08)] transition-shadow duration-500 group-hover:shadow-[0_0_60px_rgba(255,255,255,0.18)] dark:bg-black">
    {children}
  </div>
);

const SyncVisual = () => (
  <div className="flex flex-1 items-center justify-center gap-0 pb-10">
    <Orb>
      <Image src="/logo.svg" alt="" width={32} height={32} className="invert dark:invert-0" />
    </Orb>
    <svg width="64" height="8" viewBox="0 0 64 8" className="text-muted-foreground" aria-hidden>
      <line
        x1="0"
        y1="4"
        x2="64"
        y2="4"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="6 6"
        className="group-hover:animate-dash-flow"
      />
    </svg>
    <Orb>
      <Github className="size-8" />
    </Orb>
  </div>
);

const INTEGRATIONS = [
  [Database, "text-emerald-400"],
  [CreditCard, "text-violet-400"],
  [Mail, "text-sky-400"],
  [Bot, "text-orange-400"],
  [Cloud, "text-blue-400"],
  [KeyRound, "text-yellow-400"],
  [BarChart3, "text-pink-400"],
  [Webhook, "text-rose-400"],
  [Search, "text-cyan-400"],
  [Zap, "text-amber-400"],
  [MessageSquare, "text-lime-400"],
  [ShoppingCart, "text-fuchsia-400"],
];

const IntegrationsVisual = () => (
  <div className="relative flex-1 space-y-3 overflow-hidden pb-6 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
    {[0, 1, 2, 3].map((row) => {
      const icons = [...INTEGRATIONS.slice(row * 3), ...INTEGRATIONS.slice(0, row * 3)];
      return (
        <div
          key={row}
          className="flex w-max gap-3 animate-marquee-x group-hover:[animation-play-state:paused]"
          style={{ "--marquee-duration": `${24 + row * 6}s`, animationDirection: row % 2 ? "reverse" : "normal" }}
        >
          {[...icons, ...icons].map(([Icon, color], i) => (
            <div key={i} className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-background dark:bg-black">
              <Icon className={cn("size-5", color)} />
            </div>
          ))}
        </div>
      );
    })}
  </div>
);

const PublishVisual = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-5 pb-10">
    <div className="relative flex size-24 items-center justify-center">
      <span className="absolute inset-0 rounded-full border border-dashed border-foreground/20 transition-transform duration-[2s] group-hover:rotate-180" />
      <span className="absolute inset-3 rounded-full border border-foreground/10" />
      <Globe className="size-10 text-foreground/80" />
      <Rocket className="absolute -right-1 -top-1 size-6 transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1" />
    </div>
    <div className="flex h-7 items-center gap-2 rounded-full border px-3 text-xs">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full rounded-full bg-amber-400 opacity-75 animate-ping group-hover:bg-emerald-400" />
        <span className="relative inline-flex size-2 rounded-full bg-amber-400 transition-colors group-hover:bg-emerald-400" />
      </span>
      <span className="group-hover:hidden">Building...</span>
      <span className="hidden group-hover:inline">Live at your-app.com</span>
    </div>
  </div>
);

const BUTTON_STYLES = [
  { label: "Solid", className: "rounded-lg bg-white text-black", note: "bg white · radius 8" },
  { label: "Pill", className: "rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400 text-white", note: "gradient · radius full" },
  { label: "Outline", className: "rounded-none border-2 border-white bg-transparent text-white", note: "border 2 · radius 0" },
  { label: "Soft", className: "rounded-xl bg-emerald-400/20 text-emerald-300", note: "emerald/20 · radius 12" },
];

const DesignModeVisual = () => {
  const [style, setStyle] = useState(0);
  const current = BUTTON_STYLES[style];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-8">
      <div className="relative">
        <button
          type="button"
          onClick={() => setStyle((s) => (s + 1) % BUTTON_STYLES.length)}
          aria-label="Change button style"
          className={cn(
            "relative px-8 py-3 text-lg font-medium shadow-lg transition-all duration-300 cursor-pointer",
            "outline-2 outline-offset-4 outline-sky-400 group-hover:outline-dashed",
            current.className
          )}
        >
          RSVP Here
        </button>
        <MousePointer2 className="pointer-events-none absolute -bottom-5 -right-6 size-6 fill-white text-black transition-transform duration-300 group-hover:-translate-x-2 group-hover:-translate-y-2" />
      </div>
      <p className="h-5 rounded-md bg-sky-400/15 px-2 font-mono text-[11px] leading-5 text-sky-500 opacity-0 transition-opacity group-hover:opacity-100">
        {current.note} · click to restyle
      </p>
    </div>
  );
};

const COLLAGE = [
  ["saas-landing", "pricing-table"],
  ["analytics-dashboard", "image-carousel"],
  ["portfolio", "loan-calculator"],
];

const TemplatesVisual = () => (
  <div className="relative h-64 overflow-hidden px-4 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
    <div className="grid grid-cols-3 gap-2">
      {COLLAGE.map((column, i) => (
        <div
          key={i}
          className="space-y-2 transition-transform duration-[3s] ease-out group-hover:-translate-y-16"
          style={{ transitionDelay: `${i * 120}ms`, marginTop: i === 1 ? 24 : 0 }}
        >
          {column.map((slug) => (
            <div key={slug} className="overflow-hidden rounded-md border">
              <TemplateThumbnail slug={slug} />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Stacked palette cards that fan out on hover (base and hover transforms per card).
const PALETTES = [
  {
    name: "Midnight",
    colors: ["#0f172a", "#6366f1", "#e2e8f0"],
    font: "Inter",
    className: "z-30 [transform:translateY(0)] group-hover:[transform:translate(-64px,-8px)_rotate(-8deg)]",
  },
  {
    name: "Sunset",
    colors: ["#7c2d12", "#fb923c", "#fef3c7"],
    font: "Fraunces",
    className: "z-20 [transform:translateY(-14px)_scale(0.95)] group-hover:[transform:translateY(-20px)]",
  },
  {
    name: "Forest",
    colors: ["#052e16", "#22c55e", "#ecfccb"],
    font: "Geist",
    className: "z-10 [transform:translateY(-28px)_scale(0.9)] group-hover:[transform:translate(64px,-8px)_rotate(8deg)]",
  },
];

const DesignSystemVisual = () => (
  <div className="relative flex flex-1 items-end justify-center pb-6">
    <div className="relative h-36 w-56">
      {PALETTES.map((p) => (
        <div
          key={p.name}
          className={cn(
            "absolute inset-x-0 bottom-0 rounded-xl border bg-background p-3 shadow-lg transition-transform duration-500 ease-out dark:bg-neutral-900",
            p.className
          )}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{p.name}</span>
            <span className="text-muted-foreground">{p.font}</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {p.colors.map((c) => (
              <span key={c} className="h-6 flex-1 rounded-md border border-black/10" style={{ background: c }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AGENT_STEPS = ["Web", "Plan", "DB", "API", "Deploy", "LLM"];

const AgenticVisual = () => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % AGENT_STEPS.length), 1100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center px-8 pb-8">
      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {AGENT_STEPS.map((step, i) => (
          <div
            key={step}
            className={cn(
              "flex h-10 items-center justify-center rounded-lg border text-sm transition-all duration-300",
              i === active
                ? "border-foreground/40 bg-foreground text-background shadow-[0_0_24px_rgba(255,255,255,0.15)]"
                : i < active
                  ? "text-foreground"
                  : "text-muted-foreground"
            )}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
};

const DeviceVisual = () => (
  <div className="flex flex-1 justify-center overflow-hidden">
    <div className="h-64 w-40 translate-y-2 overflow-hidden rounded-t-[1.75rem] border-[6px] border-b-0 border-neutral-800 bg-neutral-800 transition-transform duration-500 group-hover:translate-y-0">
      <div className="h-full overflow-hidden rounded-t-[1.25rem] bg-white">
        <TemplateThumbnail slug="memory-game" mobile className="rounded-t-[1.25rem]" />
      </div>
    </div>
  </div>
);

export default function FeaturesSection() {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="min-h-[340px] justify-center p-8">
        <h3 className="text-4xl xl:text-[2.75rem] xl:leading-[1.1] font-semibold tracking-tighter">
          Prompt.
          <br />
          Build. Publish.
        </h3>
        <p className="mt-4 max-w-xs text-muted-foreground">
          Generate working applications in minutes with AI. Preview them live and share in seconds.
        </p>
      </Card>

      <Card title="Sync with a repo" text="Connect to GitHub and keep every version of your code in your own repository." className="min-h-[340px]">
        <SyncVisual />
      </Card>

      <Card title="Integrate with apps" text="Build with your favorite tools and APIs: databases, payments, email and AI." className="min-h-[340px]">
        <IntegrationsVisual />
      </Card>

      <Card title="Publish in one click" text="Go live with a shareable URL as soon as your app looks right." className="min-h-[340px]">
        <PublishVisual />
      </Card>

      <Card title="Edit with design mode" text="Fine-tune every detail with visual controls and a live preview." className="min-h-[340px]">
        <DesignModeVisual />
      </Card>

      <Card title="Start with templates" text="Launch faster with ready-made apps, components and full-page designs." className="min-h-[340px]" href="/templates">
        <TemplatesVisual />
      </Card>

      <Card title="Create design systems" text="Define colors, typography and styles you can reuse across projects." className="min-h-[340px]">
        <DesignSystemVisual />
      </Card>

      <Card title="Agentic by default" text="v0 plans, creates tasks and wires up data and APIs as it builds." className="min-h-[340px]">
        <AgenticVisual />
      </Card>

      <Card title="Built for every screen" text="Every app is responsive. Preview it at desktop, tablet and phone sizes." className="min-h-[340px]" href="/templates/memory-game">
        <DeviceVisual />
      </Card>
    </section>
  );
}
