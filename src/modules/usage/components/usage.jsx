import Link from "next/link";
import { CrownIcon } from "lucide-react";
import { formatDuration, intervalToDuration } from "date-fns";
import { Button } from "@/components/ui/button";
import { useStatus } from "../hooks/usage";
import { useAuth } from "@clerk/nextjs";
import { Spinner } from "@/components/ui/spinner";

export const Usage = () => {
  const { data, isPending, error } = useStatus();
  const { has } = useAuth();
  const hasProAccess = has?.({ plan: "pro" });

  if (isPending) {
    return (
      <div className="rounded-t-xl bg-muted/50 border border-b-0 px-3 py-2">
        <Spinner className={"text-muted-foreground"} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-t-xl bg-muted/50 border border-b-0 px-3 py-2">
        <p className="text-sm text-destructive">Error loading usage</p>
      </div>
    );
  }

  const points = data?.remainingPoints ?? 0;
  const msBeforeNext = data?.msBeforeNext ?? 0;

  return (
    <div className="rounded-t-xl bg-muted/50 border border-b-0 px-3 py-2">
      <div className="flex items-center gap-x-2">
        <div>
          <p className="text-xs font-medium">{points} credits remaining</p>
          <p className="text-xs text-muted-foreground">
            Resets in{" "}
            {formatDuration(
              intervalToDuration({
                start: new Date(0),
                end: new Date(msBeforeNext),
              }),
              { format: ["months", "days", "hours"] }
            )}
          </p>
        </div>
        {!hasProAccess && (
          <Button asChild size={"sm"} variant={"outline"} className={"ml-auto h-7 text-xs"}>
            <Link href={"/pricing"}>
              <CrownIcon /> Upgrade
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};