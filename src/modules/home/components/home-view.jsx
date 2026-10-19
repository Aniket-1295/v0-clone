"use client";
import React from "react";
import Link from "next/link";
import { ChevronRight, LayoutGrid } from "lucide-react";

import { TEMPLATES } from "@/templates/registry";
import ProjectsForm, { usePromptForm } from "./ProjectsForm";
import PromptChips from "./prompt-chips";
import TemplateSection from "./template-section";
import FeaturesSection from "./features-section";
import MobileShowcase from "./mobile-showcase";
import FaqSection from "./faq-section";
import CtaSection from "./cta-section";
import SiteFooter from "./site-footer";

const HomeView = () => {
  const form = usePromptForm();

  const focusPrompt = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    form.setFocus("content");
  };

  const pickPrompt = (prompt) => {
    form.setValue("content", prompt, { shouldValidate: true, shouldDirty: true });
    focusPrompt();
  };

  return (
    <>
      <div className="w-full px-4">
        <section className="mx-auto flex max-w-2xl flex-col items-center pt-20 pb-28 md:pt-28 md:pb-36">
          <Link
            href="/templates"
            className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs md:text-sm text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30 dark:bg-black"
          >
            <LayoutGrid className="size-3.5" />
            <span>
              Explore <span className="font-medium text-foreground">{TEMPLATES.length} ready-to-run templates</span>
            </span>
            <ChevronRight className="size-3.5" />
          </Link>

          <h1 className="mb-6 text-center text-3xl md:text-4xl font-semibold tracking-tight text-balance">
            What do you want to create?
          </h1>

          <div className="w-full">
            <ProjectsForm form={form} />
          </div>

          <PromptChips onPick={pickPrompt} />
        </section>

        <div className="mx-auto max-w-6xl space-y-24 pb-24 md:space-y-32">
          <TemplateSection />
          <FeaturesSection />
          <MobileShowcase />
          <FaqSection />
          <CtaSection onStart={focusPrompt} />
        </div>
      </div>
      <SiteFooter />
    </>
  );
};

export default HomeView;
