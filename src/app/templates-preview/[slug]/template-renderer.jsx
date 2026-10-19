"use client";

import dynamic from "next/dynamic";
import { TEMPLATE_LOADERS } from "@/templates";

// Client-side only: templates use browser state (timers, random shuffles) and are
// shown inside iframes, so there is nothing to gain from SSR.
const TEMPLATE_COMPONENTS = Object.fromEntries(
  Object.entries(TEMPLATE_LOADERS).map(([slug, load]) => [
    slug,
    dynamic(load, { ssr: false, loading: () => <div className="min-h-screen bg-white" /> }),
  ])
);

export default function TemplateRenderer({ slug }) {
  const Template = TEMPLATE_COMPONENTS[slug];
  return <Template />;
}
