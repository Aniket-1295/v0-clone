"use client";

import React, { useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, LayoutGrid, MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TEMPLATE_CATEGORIES } from "@/templates/registry";
import { CATEGORY_ICONS } from "@/modules/templates/components/category-icons";
import { cn } from "@/lib/utils";

const NAV_LINK =
  "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground";

const TemplatesMenu = () => {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(NAV_LINK, "inline-flex items-center gap-1 cursor-pointer", open && "text-foreground")}
      >
        Templates
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
          <div role="menu" className="w-64 rounded-xl border bg-popover p-1.5 shadow-xl dark:bg-neutral-950">
            {TEMPLATE_CATEGORIES.map(({ id, label }) => {
              const Icon = CATEGORY_ICONS[id];
              return (
                <Link
                  key={id}
                  role="menuitem"
                  href={`/templates?category=${id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
            <div className="my-1 h-px bg-border" />
            <Link
              role="menuitem"
              href="/templates"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <LayoutGrid className="size-4" />
              Browse all templates
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 md:hidden" aria-label="Open menu">
          <MenuIcon className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 dark:bg-black">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4 text-sm">
          <p className="px-2 pt-2 text-xs text-muted-foreground">Templates</p>
          {TEMPLATE_CATEGORIES.map(({ id, label }) => (
            <Link key={id} href={`/templates?category=${id}`} onClick={close} className="rounded-md px-2 py-2 hover:bg-accent">
              {label}
            </Link>
          ))}
          <Link href="/templates" onClick={close} className="rounded-md px-2 py-2 hover:bg-accent">
            Browse all templates
          </Link>
          <div className="my-2 h-px bg-border" />
          <Link href="/pricing" onClick={close} className="rounded-md px-2 py-2 hover:bg-accent">
            Pricing
          </Link>
          <Link href="/#faq" onClick={close} className="rounded-md px-2 py-2 hover:bg-accent">
            FAQ
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b bg-background/80 backdrop-blur-md dark:bg-black/80">
      <div className="h-full w-full px-4 grid grid-cols-[1fr_auto_1fr] items-center">
        <Link href={"/"} className="flex items-center gap-2 justify-self-start" aria-label="Home">
          <Image
            src={"/logo.svg"}
            alt="v0"
            width={28}
            height={28}
            className="shrink-0 invert dark:invert-0"
          />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <TemplatesMenu />
          <Link href="/pricing" className={NAV_LINK}>
            Pricing
          </Link>
          <Link href="/#faq" className={NAV_LINK}>
            FAQ
          </Link>
        </div>

        <div className="justify-self-end flex items-center gap-2">
          <SignedOut>
            <SignInButton>
              <Button className="cursor-pointer h-8" variant={"outline"} size={"sm"}>
                Log In
              </Button>
            </SignInButton>

            <SignUpButton>
              <Button
                className="cursor-pointer h-8 bg-foreground text-background hover:bg-foreground/90"
                size={"sm"}
              >
                Sign Up
              </Button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <UserButton />
          </SignedIn>
          <MobileMenu />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
