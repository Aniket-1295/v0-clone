import React from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b bg-background/80 backdrop-blur-md">
      <div className="h-full w-full px-4 grid grid-cols-[1fr_auto_1fr] items-center">
        <Link href={"/"} className="flex items-center gap-2 justify-self-start">
          <Image
            src={"/logo.svg"}
            alt="v0"
            width={28}
            height={28}
            className="shrink-0 invert dark:invert-0"
          />
        </Link>

        <div className="flex items-center gap-1 text-sm">
          <Link
            href="/pricing"
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Pricing
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
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
