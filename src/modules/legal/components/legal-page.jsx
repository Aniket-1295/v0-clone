import Link from "next/link";

// Shared layout for the Terms and Privacy pages.
export default function LegalPage({ title, updated, children }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
      <p className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        Draft: this page is a starting point and has not been reviewed by a lawyer. Review and complete it before a public
        launch.
      </p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-foreground">
        {children}
      </div>
      <p className="mt-12 text-sm">
        <Link href="/" className="underline underline-offset-4">
          Back to home
        </Link>
      </p>
    </article>
  );
}
