import { cn } from "@/lib/utils";

export default function V0Icon({ size = 24, className, ...props }) {
  return (
    <svg
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      {...props}
    >
      <path d="M11.612 2.307C8.767 2.92 6.486 5.215 6.487 8.04c0 1.5.546 2.87 1.454 3.934L5.5 18.5h2.5l1.56-4.18A5.63 5.63 0 0 0 11.612 14.8c2.828-.614 5.112-2.89 5.112-5.745a5.748 5.748 0 0 0-5.112-6.748ZM12 7a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
    </svg>
  );
}
