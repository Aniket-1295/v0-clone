"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Bold,
  Bot,
  ChevronDown,
  ChevronsUpDown,
  Cloud,
  CloudUpload,
  CreditCard,
  Database,
  Diamond,
  Github,
  Globe,
  Italic,
  KeyRound,
  ListChecks,
  Mail,
  MessageSquare,
  Plus,
  Rocket,
  Search,
  ShoppingCart,
  Sparkles,
  Webhook,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TemplateThumbnail from "@/modules/templates/components/template-thumbnail";

// Springy ease used across the cards (same curve as v0's hover animations).
const SPRING = "ease-[cubic-bezier(0.34,1.56,0.64,1)]";

/** Calls onEnter/onMove/onLeave for pointer activity anywhere on the enclosing card. */
const useCardPointer = (ref, { onEnter, onMove, onLeave }) => {
  const handlers = useRef({ onEnter, onMove, onLeave });
  useEffect(() => {
    handlers.current = { onEnter, onMove, onLeave };
  });

  useEffect(() => {
    const card = ref.current?.closest("[data-card]");
    if (!card) return;
    const enter = (e) => handlers.current.onEnter?.(e, card);
    const move = (e) => handlers.current.onMove?.(e, card);
    const leave = (e) => handlers.current.onLeave?.(e, card);
    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    return () => {
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
    };
  }, [ref]);
};

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
    "group relative flex flex-col overflow-hidden rounded-2xl border bg-card dark:bg-neutral-950",
    className
  );
  return href ? (
    <Link href={href} data-card className={classes}>
      {body}
    </Link>
  ) : (
    <div data-card className={classes}>
      {body}
    </div>
  );
};

/* Sync with a repo: two discs slide together and melt into one through an SVG goo filter. */
const SyncVisual = () => {
  const filterId = useId().replace(/:/g, "");
  const disc =
    "absolute flex size-[88px] items-center justify-center rounded-full bg-background transition-transform duration-700 dark:bg-neutral-900 " +
    SPRING;

  return (
    <div className="flex flex-1 items-center justify-center pb-6">
      <svg className="absolute size-0" aria-hidden>
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="2 0 0 0 0  0 2 0 0 0  0 0 2 0 0  0 0 0 45 -12" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>
      <div className="relative flex h-[164px] w-[300px] items-center justify-center [filter:drop-shadow(0_4px_12px_rgba(0,0,0,0.04))_drop-shadow(0_8px_24px_rgba(0,0,0,0.06))] dark:[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.3))_drop-shadow(0_8px_24px_rgba(0,0,0,0.6))]">
        <div className="relative flex h-full w-full items-center justify-center" style={{ filter: `url(#${filterId})` }}>
          <div className={cn(disc, "-translate-x-16 group-hover:-translate-x-[50px]")}>
            <Image src="/logo.svg" alt="" width={36} height={36} className="invert dark:invert-0" />
          </div>
          <div className={cn(disc, "translate-x-16 group-hover:translate-x-[50px]")}>
            <Github className="size-9" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* Integrate with apps: a honeycomb of app icons with a fisheye that follows the cursor. */
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
  [MessageSquare, "text-lime-500"],
  [ShoppingCart, "text-fuchsia-400"],
];
const COLS = 10;
const ROWS = 6;
const CELL = 56;
const ICON = 40;
const FIELD_W = (COLS - 1) * CELL + CELL / 2 + ICON;
const FIELD_H = (ROWS - 1) * CELL + ICON;
const CELLS = Array.from({ length: COLS * ROWS }, (_, k) => {
  const row = Math.floor(k / COLS);
  const col = k % COLS;
  return { x: col * CELL + (row % 2 ? CELL / 2 : 0), y: row * CELL, icon: INTEGRATIONS[(k * 5 + row) % INTEGRATIONS.length] };
});
// Smoothing time constant in ms: frame-rate independent, so it settles the same at 30, 60 or 120 fps.
const FISHEYE = { rest: 0.883, peak: 1.12, radius: 160, push: 5.5, smoothMs: 70 };

const IntegrationsVisual = () => {
  const fieldRef = useRef(null);
  const itemsRef = useRef([]);
  const sim = useRef({ pointer: null, active: false, frame: 0, last: 0, state: CELLS.map(() => ({ s: 1, x: 0, y: 0 })) });

  const tick = (now) => {
    const { pointer, active, state } = sim.current;
    const dt = sim.current.last ? Math.min(now - sim.current.last, 100) : 16;
    sim.current.last = now;
    const k = 1 - Math.exp(-dt / FISHEYE.smoothMs);
    let moving = false;
    CELLS.forEach((cell, i) => {
      let ts = 1;
      let tx = 0;
      let ty = 0;
      if (active && pointer) {
        const dx = cell.x + ICON / 2 - pointer.x;
        const dy = cell.y + ICON / 2 - pointer.y;
        const d = Math.hypot(dx, dy);
        const f = d < FISHEYE.radius ? Math.cos((d / FISHEYE.radius) * (Math.PI / 2)) : 0;
        ts = FISHEYE.rest + (FISHEYE.peak - FISHEYE.rest) * f;
        if (d > 0.5) {
          tx = (dx / d) * FISHEYE.push * f;
          ty = (dy / d) * FISHEYE.push * f;
        }
      }
      const s = state[i];
      s.s += (ts - s.s) * k;
      s.x += (tx - s.x) * k;
      s.y += (ty - s.y) * k;
      if (Math.abs(ts - s.s) > 0.0005 || Math.abs(tx - s.x) > 0.05 || Math.abs(ty - s.y) > 0.05) moving = true;
      const el = itemsRef.current[i];
      if (el) el.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px) scale(${s.s.toFixed(4)})`;
    });
    sim.current.frame = moving ? requestAnimationFrame(tick) : 0;
    if (!moving) sim.current.last = 0;
  };

  const kick = () => {
    if (!sim.current.frame) sim.current.frame = requestAnimationFrame(tick);
  };

  useCardPointer(fieldRef, {
    onMove: (e) => {
      const r = fieldRef.current.getBoundingClientRect();
      sim.current.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      sim.current.active = true;
      kick();
    },
    onLeave: () => {
      sim.current.active = false;
      kick();
    },
  });

  useEffect(() => {
    const current = sim.current;
    return () => cancelAnimationFrame(current.frame);
  }, []);

  return (
    <div className="relative h-[280px] w-full overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div ref={fieldRef} className="relative shrink-0" style={{ width: FIELD_W, height: FIELD_H }}>
          {CELLS.map(({ x, y, icon: [Icon, color] }, i) => (
            <div
              key={i}
              ref={(el) => {
                itemsRef.current[i] = el;
              }}
              className={cn("absolute flex items-center justify-center rounded-full border bg-background shadow-sm will-change-transform dark:border-neutral-800 dark:bg-neutral-900", color)}
              style={{ left: x, top: y, width: ICON, height: ICON }}
            >
              <Icon className="size-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* Publish: the mark lifts, scales up and tilts in 3D toward the cursor, with a parallax ghost behind. */
const PublishVisual = () => {
  const markRef = useRef(null);
  const ghostRef = useRef(null);

  const tilt = (e, card) => {
    const r = card.getBoundingClientRect();
    const rel = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    const mark = markRef.current;
    mark.style.transition = "transform 0.15s ease-out, filter 0.15s ease-out";
    mark.style.transform = `translateY(-12px) rotateY(${(rel * 20).toFixed(2)}deg) scale(1.15)`;
    mark.style.filter = `drop-shadow(rgba(0,0,0,0.25) ${(-rel * 1.7).toFixed(2)}px 2.5px 5px)`;
    ghostRef.current.style.transform = `translateX(${(-rel * 3).toFixed(2)}px)`;
  };

  useCardPointer(markRef, {
    onEnter: tilt,
    onMove: tilt,
    onLeave: () => {
      const mark = markRef.current;
      mark.style.transition = "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.6s ease";
      mark.style.transform = "translateY(-12px) rotateY(0deg) scale(1)";
      mark.style.filter = "none";
      ghostRef.current.style.transform = "translateX(0px)";
    },
  });

  return (
    <div className="flex h-[220px] items-center justify-center">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[linear-gradient(180deg,transparent_0%,rgba(127,127,127,0.06)_45%,transparent_55%)] [perspective:1000px]">
        <div
          ref={markRef}
          className="relative flex items-center justify-center [transform-style:preserve-3d]"
          style={{ transform: "translateY(-12px) rotateY(0deg) scale(1)" }}
        >
          <CloudUpload
            ref={ghostRef}
            aria-hidden
            className="absolute size-24 text-foreground opacity-40 brightness-110 transition-transform duration-150 ease-out"
            style={{ zIndex: -1 }}
            strokeWidth={1.5}
          />
          <CloudUpload className="size-24 text-foreground" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
};

/* Design mode: a cursor glides onto the button, it gets selected, then the style toolbar rises in. */
const DesignModeVisual = () => (
  <div className="flex h-[220px] items-center justify-center">
    <div className="relative flex h-[195px] w-[280px] flex-col items-center justify-center">
      {/* Selection label */}
      <div className="mb-2 flex items-center gap-1.5 rounded-md border border-sky-400 bg-sky-50 px-2 py-0.5 text-sm font-medium text-sky-600 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:delay-200 dark:bg-sky-950 dark:text-sky-300">
        <Diamond className="size-3.5" /> button <ChevronDown className="size-3.5" />
      </div>

      {/* Button with its selection frame */}
      <div className="relative">
        <div
          className={cn(
            "rounded-lg bg-white px-8 py-2.5 text-xl text-black shadow-lg ring-1 ring-black/10 transition-transform duration-500 translate-y-1 group-hover:translate-y-0",
            SPRING
          )}
        >
          RSVP Here
        </div>
        <div className="pointer-events-none absolute -inset-1.5 rounded-md border-2 border-sky-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:delay-200">
          <div className="absolute inset-1 rounded-[4px] border border-dashed border-sky-400" />
        </div>
        <Plus
          className={cn(
            "pointer-events-none absolute -bottom-3 -right-3 size-6 text-foreground opacity-80 transition-all duration-700 translate-x-8 translate-y-[22px] group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100",
            SPRING
          )}
          strokeWidth={1.5}
        />
      </div>

      {/* Style toolbar */}
      <div
        className={cn(
          "flex items-center gap-4 rounded-xl bg-white px-4 py-2 text-black shadow-xl ring-1 ring-black/10 opacity-0 transition-all duration-500 translate-y-7 scale-[0.92] group-hover:translate-y-4 group-hover:scale-95 group-hover:opacity-100 group-hover:delay-500",
          SPRING
        )}
      >
        <span className="size-5 rounded-full bg-neutral-900" />
        <span className="flex items-center gap-1 text-base">
          3XL <ChevronsUpDown className="size-3.5 text-neutral-500" />
        </span>
        <Bold className="size-4" />
        <Italic className="size-4" />
      </div>
    </div>
  </div>
);

/* Start with templates: a grayscale collage that zooms out into full color, alternate columns rising. */
const COLLAGE = [
  [{ slug: "memory-game", mobile: true }],
  [{ slug: "saas-landing" }, { slug: "analytics-dashboard" }, { slug: "pricing-table" }],
  [{ slug: "newsletter-signup", mobile: true }],
  [{ slug: "portfolio" }, { slug: "loan-calculator" }, { slug: "image-carousel" }],
];

const TemplatesVisual = () => (
  <div className="flex h-[220px] items-start justify-center overflow-hidden">
    <div
      className={cn(
        "flex h-full w-full items-start gap-1 scale-110 saturate-0 contrast-125 transition-[scale,filter] duration-700 group-hover:scale-100 group-hover:saturate-100 group-hover:contrast-100",
        SPRING
      )}
    >
      {COLLAGE.map((column, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-1 flex-col gap-1 overflow-hidden rounded-[8px] transition-transform duration-500",
            i % 2 === 1 && "group-hover:-translate-y-1.5",
            SPRING
          )}
        >
          {column.map(({ slug, mobile }) => (
            <div key={slug} className="overflow-hidden rounded-[6px]">
              <TemplateThumbnail slug={slug} mobile={mobile} />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/* Create design systems: themed cards ride a diagonal conveyor while the card is hovered. */
const THEMES = [
  { name: "Midnight", font: "Inter", bg: "#0f172a", fg: "#e2e8f0", accent: "#6366f1", fontClass: "font-sans" },
  { name: "Sunset", font: "Fraunces", bg: "#fff7ed", fg: "#7c2d12", accent: "#f97316", fontClass: "font-serif" },
  { name: "Forest", font: "Geist", bg: "#f0fdf4", fg: "#14532d", accent: "#16a34a", fontClass: "font-sans" },
  { name: "Terminal", font: "Geist Mono", bg: "#09090b", fg: "#a3e635", accent: "#84cc16", fontClass: "font-mono" },
  { name: "Blush", font: "Playfair", bg: "#fdf2f8", fg: "#831843", accent: "#db2777", fontClass: "font-serif" },
  { name: "Ocean", font: "DM Sans", bg: "#ecfeff", fg: "#164e63", accent: "#0891b2", fontClass: "font-sans" },
];
// Slot for a card at conveyor position p = (index + step) % 6.
const SLOTS = [
  { x: 0, y: 0, opacity: 1, z: 30 },
  { x: -120, y: -80, opacity: 0.7, z: 20 },
  { x: -200, y: -140, opacity: 0, z: 0 },
  { x: -200, y: -140, opacity: 0, z: 0 },
  { x: 180, y: 140, opacity: 0, z: 5 },
  { x: 120, y: 80, opacity: 0.5, z: 15 },
];

const DesignSystemVisual = () => {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [step, setStep] = useState(0);

  useCardPointer(ref, {
    onEnter: () => setHovered(true),
    onLeave: () => {
      setHovered(false);
      setStep(0);
    },
  });

  useEffect(() => {
    if (!hovered) return;
    const id = setInterval(() => setStep((s) => s + 1), 2400);
    return () => clearInterval(id);
  }, [hovered]);

  return (
    <div ref={ref} className="flex h-[280px] items-center justify-center">
      <div className="relative -mt-8 h-[150px] w-[240px]">
        {THEMES.map((theme, i) => {
          const slot = SLOTS[(i + step) % THEMES.length];
          return (
            <div
              key={theme.name}
              className="absolute left-0 top-0 w-full transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
              style={{
                transform: `translateX(${slot.x}px) translateY(${slot.y}px) rotate(-7deg)`,
                opacity: slot.opacity,
                zIndex: slot.z,
              }}
            >
              <div className={cn("overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/10", theme.fontClass)} style={{ background: theme.bg, color: theme.fg }}>
                <div className="flex items-center justify-between px-4 pt-3 text-[11px] opacity-70">
                  <span>{theme.name}</span>
                  <span>{theme.font}</span>
                </div>
                <div className="px-4 pb-4 pt-2">
                  <p className="text-xl font-semibold leading-tight">Aa Bb Cc</p>
                  <p className="mt-1 text-xs opacity-70">The quick brown fox jumps over the lazy dog.</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-md px-3 py-1 text-xs font-medium text-white" style={{ background: theme.accent }}>
                      Button
                    </span>
                    <span className="size-4 rounded-full" style={{ background: theme.fg }} />
                    <span className="size-4 rounded-full" style={{ background: theme.accent }} />
                    <span className="size-4 rounded-full ring-1 ring-black/10" style={{ background: theme.bg }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* Agentic by default: capability chips orbit the logo and spread out on hover. */
const AGENT_STEPS = [
  ["Web", Globe],
  ["Plan", ListChecks],
  ["DB", Database],
  ["API", Webhook],
  ["Deploy", Rocket],
  ["LLM", Sparkles],
];
const point = (i, r) => {
  const a = (-90 + i * 60) * (Math.PI / 180);
  return [Math.cos(a) * r, Math.sin(a) * r];
};

const AgenticVisual = () => (
  <div className="flex h-[280px] items-center justify-center">
    <div className="relative h-[200px] w-[280px] scale-110">
      <svg
        viewBox="-140 -100 280 200"
        className={cn(
          "absolute inset-0 h-full w-full overflow-visible text-muted-foreground scale-[0.8333] transition-transform duration-700 group-hover:scale-100",
          SPRING
        )}
        aria-hidden
      >
        {AGENT_STEPS.map((_, i) => {
          const [x, y] = point(i, 90);
          return <line key={i} x1="0" y1="0" x2={x} y2={y} stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />;
        })}
      </svg>
      <div className="absolute left-1/2 top-1/2 z-10 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] bg-background dark:bg-neutral-950">
        <Image src="/logo.svg" alt="" width={22} height={22} className="invert dark:invert-0" />
      </div>
      {AGENT_STEPS.map(([label, Icon], i) => {
        const [x75, y75] = point(i, 75);
        const [x90, y90] = point(i, 90);
        return (
          <div
            key={label}
            className={cn(
              "absolute left-1/2 top-1/2 z-10 transition-transform duration-700",
              "[transform:translate(-50%,-50%)_translate(var(--x0),var(--y0))] group-hover:[transform:translate(-50%,-50%)_translate(var(--x1),var(--y1))]",
              SPRING
            )}
            style={{ "--x0": `${x75}px`, "--y0": `${y75}px`, "--x1": `${x90}px`, "--y1": `${y90}px` }}
          >
            <div className="flex items-center gap-1.5 whitespace-nowrap rounded border bg-background px-3 py-1.5 dark:bg-neutral-950">
              <Icon className="size-3" />
              <span className="font-mono text-[10px]">{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

/* Built for every screen: the phone settles down into place on hover. */
const DeviceVisual = () => (
  <div className="flex h-[280px] items-start justify-center overflow-hidden pt-8">
    <div
      className={cn(
        "w-[200px] -translate-y-5 overflow-hidden rounded-[2rem] border-[7px] border-neutral-800 bg-neutral-800 shadow-2xl transition-transform duration-700 group-hover:translate-y-0 group-hover:scale-[0.94]",
        SPRING
      )}
    >
      <div className="overflow-hidden rounded-[1.5rem] bg-white">
        <TemplateThumbnail slug="memory-game" mobile />
      </div>
    </div>
  </div>
);

export default function FeaturesSection() {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="min-h-[436px] justify-center p-8">
        <h3 className="text-4xl xl:text-[2.75rem] xl:leading-[1.1] font-semibold tracking-tighter">
          Prompt.
          <br />
          Build. Publish.
        </h3>
        <p className="mt-4 max-w-xs text-muted-foreground">
          Generate working applications in minutes with AI. Preview them live and share in seconds.
        </p>
      </Card>

      <Card title="Sync with a repo" text="Connect to GitHub and keep every version of your code in your own repository." className="min-h-[436px]">
        <SyncVisual />
      </Card>

      <Card title="Integrate with apps" text="Build with your favorite tools and APIs: databases, payments, email and AI." className="min-h-[436px]">
        <IntegrationsVisual />
      </Card>

      <Card title="Publish in one click" text="Go live with a shareable URL as soon as your app looks right.">
        <PublishVisual />
      </Card>

      <Card title="Edit with design mode" text="Fine-tune every detail with visual controls and a live preview.">
        <DesignModeVisual />
      </Card>

      <Card title="Start with templates" text="Launch faster with ready-made apps, components and full-page designs." href="/templates">
        <TemplatesVisual />
      </Card>

      <Card title="Create design systems" text="Define colors, typography and styles you can reuse across projects." className="min-h-[412px]">
        <DesignSystemVisual />
      </Card>

      <Card title="Agentic by default" text="v0 plans, creates tasks and wires up data and APIs as it builds." className="min-h-[412px]">
        <AgenticVisual />
      </Card>

      <Card title="Built for every screen" text="Every app is responsive. Preview it at desktop, tablet and phone sizes." className="min-h-[412px]" href="/templates/memory-game">
        <DeviceVisual />
      </Card>
    </section>
  );
}
