import { toast } from "sonner";
import { ActionErrorCode } from "./action-result";

/**
 * Toast a failed server action. Out-of-credits errors get an "Upgrade" action
 * that takes the user to /pricing.
 */
export const showActionError = (error, router, fallback = "Something went wrong") => {
  const message = error?.message || fallback;

  if (error?.code === ActionErrorCode.TOO_MANY_REQUESTS) {
    toast.error(message, {
      action: {
        label: "Upgrade",
        onClick: () => router.push("/pricing"),
      },
    });
    return;
  }

  toast.error(message);
};
