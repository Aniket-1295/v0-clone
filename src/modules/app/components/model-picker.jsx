"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { CheckIcon, ChevronDownIcon, LockIcon, SparklesIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useStoredPreference } from "@/hooks/use-stored-preference";
import { DEFAULT_TIER_ID, MODEL_TIERS, creditsLabel, getTier } from "@/lib/model-tiers";

/**
 * The model tier to send with a prompt, and a setter. A remembered paid tier falls back to
 * Mini while the user is not on the Pro plan (the server checks the plan too).
 */
export const useModelTier = () => {
  // Remembered in this browser and shared by every prompt box.
  const [stored, setTierId] = useStoredPreference("v0-model-tier", DEFAULT_TIER_ID);
  const { has } = useAuth();
  const hasPro = !!has?.({ plan: "pro" });
  const tier = getTier(stored);
  const usable = tier.plan === "pro" && !hasPro ? getTier(DEFAULT_TIER_ID) : tier;

  return { tier: usable, hasPro, setTierId };
};

/** The prompt box's model dropdown: Mini / Pro / Max with their credit cost. */
export default function ModelPicker({ className, disabled = false }) {
  const { tier, hasPro, setTierId } = useModelTier();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger disabled={disabled} aria-label={`Model: ${tier.name}`} className={cn("whitespace-nowrap", className)}>
        <SparklesIcon className="size-3.5" /> {tier.name} <ChevronDownIcon className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Model</DropdownMenuLabel>
        {MODEL_TIERS.map((option) => {
          const locked = option.plan === "pro" && !hasPro;
          const body = (
            <>
              <div className="flex-1">
                <p className="flex items-center gap-2 text-sm">
                  {option.name}
                  <span className="text-xs text-muted-foreground">{creditsLabel(option.credits)}</span>
                </p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              {locked ? (
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <LockIcon className="size-3" /> Pro plan
                </span>
              ) : (
                <CheckIcon className={cn("mt-0.5 size-4", option.id !== tier.id && "invisible")} />
              )}
            </>
          );

          return locked ? (
            <DropdownMenuItem key={option.id} asChild className="items-start">
              <Link href="/pricing">{body}</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={option.id} className="items-start" onSelect={() => setTierId(option.id)}>
              {body}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
