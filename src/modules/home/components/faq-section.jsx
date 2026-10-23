import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: `What is ${SITE_NAME}?`,
    a: `${SITE_NAME} turns a description in plain English into a working web app. It writes a Next.js app with Tailwind CSS and shadcn/ui, runs it in a cloud sandbox and shows you a live preview.`,
  },
  {
    q: "What can I build?",
    a: "Landing pages, dashboards, internal tools, forms, games, calculators and UI components. Start from a prompt or from one of the templates.",
  },
  {
    q: "Can I change an app after it is generated?",
    a: `Yes. Keep chatting in the project: describe what to change and ${SITE_NAME} builds a new version. Earlier versions stay in the chat, so you can open any of them again.`,
  },
  {
    q: "Can I see and copy the code?",
    a: "Every version has a Code tab with its files. Templates show their source too, so you can copy it into your own project.",
  },
  {
    q: "How do credits work?",
    a: (
      <>
        Each generation uses one credit. You get free credits to start, and paid plans add more every month. See{" "}
        <Link href="/pricing" className="underline underline-offset-4 hover:text-foreground">pricing</Link> for details.
      </>
    ),
  },
  {
    q: "What are templates?",
    a: (
      <>
        Templates are complete starter apps you can try live, read the code of, and use as the starting point for a
        project. <Link href="/templates" className="underline underline-offset-4 hover:text-foreground">Browse them all</Link>.
      </>
    ),
  },
];

export default function FaqSection() {
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20">
      <h2 className="text-center text-2xl md:text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
      <Accordion type="single" collapsible className="mt-8">
        {FAQS.map(({ q, a }) => (
          <AccordionItem key={q} value={q}>
            <AccordionTrigger className="text-base hover:no-underline cursor-pointer">{q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
