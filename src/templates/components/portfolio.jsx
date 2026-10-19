"use client";

import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";

const PROJECTS = [
  { title: "Fieldnotes", type: "Mobile", year: 2026, tone: "bg-[#e8e4dc]" },
  { title: "Northwind Bank", type: "Web", year: 2025, tone: "bg-[#d9dfe4]" },
  { title: "Ritual", type: "Branding", year: 2025, tone: "bg-[#e6dccf]" },
  { title: "Atlas Maps", type: "Mobile", year: 2024, tone: "bg-[#dfe3da]" },
  { title: "Kiln Studio", type: "Branding", year: 2024, tone: "bg-[#e9dfdb]" },
  { title: "Orbit CRM", type: "Web", year: 2023, tone: "bg-[#dcdde6]" },
];

const FILTERS = ["All", "Web", "Mobile", "Branding"];

export default function Portfolio() {
  const [filter, setFilter] = useState("All");
  const [sent, setSent] = useState(false);
  const visible = PROJECTS.filter((p) => filter === "All" || p.type === filter);

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-neutral-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm">
        <span className="font-semibold">Maya Lindqvist</span>
        <nav className="flex gap-6 text-neutral-500">
          <a href="#work" className="hover:text-neutral-900">Work</a>
          <a href="#about" className="hover:text-neutral-900">About</a>
          <a href="#contact" className="hover:text-neutral-900">Contact</a>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12">
        <h1 className="max-w-4xl text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl">
          Product designer crafting calm, useful software.
        </h1>
        <p className="mt-6 text-neutral-500">Currently leading design at Fieldnotes. Based in Stockholm.</p>
      </section>

      <section id="work" className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-sm uppercase tracking-widest text-neutral-500">Selected work</h2>
          <div className="flex gap-1 text-sm">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 transition ${filter === f ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <a key={p.title} href="#" className="group">
              <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${p.tone}`}>
                <div className="absolute inset-8 rounded-xl bg-white/60 shadow-sm transition duration-500 group-hover:scale-105" />
                <span className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white opacity-0 transition group-hover:opacity-100">
                  <ArrowUpRight className="size-4" />
                </span>
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span className="font-medium">{p.title}</span>
                <span className="text-neutral-500">{p.type} · {p.year}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2">
        <h2 className="text-sm uppercase tracking-widest text-neutral-500">About</h2>
        <p className="text-xl leading-relaxed">
          Ten years designing products for banks, startups and studios. I care about clear systems, honest copy and the
          details that make software feel quiet.
        </p>
      </section>

      <section id="contact" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-medium tracking-tight">Let&apos;s work together</h2>
        {sent ? (
          <p className="mt-6 flex items-center gap-2 text-emerald-700"><Check className="size-5" /> Thanks, I&apos;ll reply within two days.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="mt-6 grid max-w-xl gap-3">
            <input required placeholder="Your name" aria-label="Your name" className="rounded-xl border border-neutral-300 bg-transparent px-4 py-3 outline-none focus:border-neutral-900" />
            <input required type="email" placeholder="Email" aria-label="Email" className="rounded-xl border border-neutral-300 bg-transparent px-4 py-3 outline-none focus:border-neutral-900" />
            <textarea required rows={4} placeholder="Tell me about your project" aria-label="Message" className="rounded-xl border border-neutral-300 bg-transparent px-4 py-3 outline-none focus:border-neutral-900" />
            <button className="justify-self-start rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700">Send message</button>
          </form>
        )}
      </section>
    </div>
  );
}
