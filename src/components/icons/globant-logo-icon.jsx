import { cn } from "@/lib/utils";

export default function GlobantLogoIcon({ size = 20, className, ...props }) {
  const aspectRatio = 5.5;
  const width = size * aspectRatio;
  const height = size;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 40"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      {...props}
    >
      <path d="M20 0C8.954 0 0 8.954 0 20s8.954 20 20 20 20-8.954 20-20S31.046 0 20 0zm0 32c-6.627 0-12-5.373-12-12S13.373 8 20 8s12 5.373 12 12-5.373 12-12 12zm0-18c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm50.4 4.8h-8.8v-4.8H72v4.8h-1.6zM56 10h24v4.8H56V10zm0 20v-4.8h24V30H56zm32-20h6.4v20H88V10zm10 0h16.4v4.8h-10v3.6h10V23h-10v3.6h10V31H98V10zm28.8 0H138v20h-6.4v-15.2H124V10h2.8zm18.4 0h6.4v20h-6.4V10zm10 0h16.4v4.8h-10v3.6h10V23h-10v3.6h10V31H155V10zm26.4 0H208v4.8h-7.2V30h-6.4V14.8H188V10h-7.2zm31.2 0h6.4l6 11.6V10h6.4v20h-6.4l-6-11.6V30H214V10z" />
    </svg>
  );
}
