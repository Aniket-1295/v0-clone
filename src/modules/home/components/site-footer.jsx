import Image from "next/image";
import Link from "next/link";
import { TEMPLATE_CATEGORIES } from "@/templates/registry";
import { SITE_NAME } from "@/lib/site";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Home", href: "/" },
      { label: "Templates", href: "/templates" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Templates",
    links: TEMPLATE_CATEGORIES.map(({ id, label }) => ({ label, href: `/templates?category=${id}` })),
  },
  {
    title: "Resources",
    links: [
      { label: "FAQs", href: "/#faq" },
      { label: "Browse templates", href: "/templates" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
  {
    title: "Social",
    links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/aniket-kamble-865694214/", external: true }],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-6">
        <div className="col-span-2 md:col-span-1">
          <Image src="/logo.svg" alt="v0" width={28} height={28} className="invert dark:invert-0" />
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="text-sm font-medium">{column.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a href={link.href} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto w-full max-w-6xl px-4 pb-10 text-xs text-muted-foreground">© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
    </footer>
  );
}
