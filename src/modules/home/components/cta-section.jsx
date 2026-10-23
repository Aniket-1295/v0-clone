"use client";

import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/site";

const CTA_BUTTON = "h-11 rounded-full px-6 text-base bg-foreground text-background hover:bg-foreground/90 cursor-pointer";

export default function CtaSection({ onStart }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border bg-card px-6 py-20 text-center dark:bg-neutral-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
      <h2 className="relative text-4xl md:text-5xl font-semibold tracking-tighter">Start building with {SITE_NAME}</h2>
      <p className="relative mx-auto mt-3 max-w-md text-muted-foreground">
        Go from idea to a running app in minutes, then keep shaping it in chat.
      </p>
      <div className="relative mt-8">
        <SignedIn>
          <Button className={CTA_BUTTON} onClick={onStart}>
            Get Started
          </Button>
        </SignedIn>
        <SignedOut>
          <SignUpButton>
            <Button className={CTA_BUTTON}>Get Started</Button>
          </SignUpButton>
        </SignedOut>
      </div>
    </section>
  );
}
