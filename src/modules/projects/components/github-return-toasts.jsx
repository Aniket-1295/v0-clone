"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const RETURN_MESSAGES = {
  connected: ["success", "GitHub connected"],
  cancelled: ["info", "GitHub connection cancelled"],
  failed: ["error", "Could not connect GitHub. Please try again."],
  "not-configured": ["error", "GitHub export is not set up yet."],
};

/**
 * Toasts the GitHub OAuth return (?github=…) even when the Settings panel is closed,
 * then strips that query without dropping ?tab=.
 */
const GithubReturnToasts = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returned = searchParams.get("github");

  useEffect(() => {
    if (!returned || !RETURN_MESSAGES[returned]) return;
    const [kind, message] = RETURN_MESSAGES[returned];
    toast[kind](message);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("github");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [returned, pathname, router, searchParams]);

  return null;
};

export default GithubReturnToasts;
