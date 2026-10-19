"use client";

import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Layers, Sparkles, Zap, ShieldCheck, BarChart3, Users } from "lucide-react";

const FEATURES = [
  { icon: Zap, title: "Instant sync", text: "Changes reach every teammate in milliseconds, online or off." },
  { icon: ShieldCheck, title: "Secure by default", text: "SSO, audit logs and encryption at rest on every plan." },
  { icon: BarChart3, title: "Built-in insights", text: "See where work gets stuck with live cycle-time charts." },
  { icon: Layers, title: "Flexible views", text: "Board, list and timeline views over the same data." },
  { icon: Users, title: "Guest access", text: "Invite clients to a project without giving away the rest." },
  { icon: Sparkles, title: "Smart triage", text: "Auto-label and route incoming requests to the right owner." },
];

const PLANS = [
  { name: "Starter", monthly: 0, desc: "For individuals getting organised.", features: ["3 projects", "Unlimited tasks", "Basic integrations"] },
  { name: "Pro", monthly: 12, desc: "For growing teams that ship weekly.", features: ["Unlimited projects", "Timeline view", "Insights", "Priority support"], popular: true },
  { name: "Business", monthly: 24, desc: "For companies with security needs.", features: ["Everything in Pro", "SSO and SCIM", "Audit logs", "Dedicated manager"] },
];

const FAQS = [
  { q: "Can I try Lumen for free?", a: "Yes. The Starter plan is free forever, and Pro comes with a 14-day trial with no card required." },
  { q: "How does yearly billing work?", a: "Pay once a year and get two months free. You can switch between monthly and yearly at any time." },
  { q: "Can I import from other tools?", a: "Lumen imports projects from CSV and the most popular project tools in a couple of clicks." },
  { q: "Is my data secure?", a: "Data is encrypted in transit and at rest, and Business plans add SSO, SCIM and audit logs." },
];

export default function SaasLanding() {
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="#" className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Layers className="size-4" />
            </span>
            Lumen
          </a>
          <nav className="hidden gap-8 text-sm text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <a href="#pricing" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Get started
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          <Sparkles className="size-3.5" /> New: smart triage is here
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight md:text-6xl">
          Plan, track and ship work your team actually finishes
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600">
          Lumen brings projects, tasks and insights into one fast workspace so nothing slips through the cracks.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a href="#pricing" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500">
            Start free trial <ArrowRight className="size-4" />
          </a>
          <a href="#features" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium hover:bg-slate-50">
            See features
          </a>
        </div>
      </section>

      <section id="features" className="border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Everything your team needs</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
                <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Simple pricing</h2>
          <div className="mt-6 inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 text-sm">
            {["Monthly", "Yearly"].map((label) => {
              const active = (label === "Yearly") === yearly;
              return (
                <button
                  key={label}
                  onClick={() => setYearly(label === "Yearly")}
                  className={`rounded-full px-4 py-1.5 font-medium transition ${active ? "bg-white shadow" : "text-slate-500"}`}
                >
                  {label}
                  {label === "Yearly" && <span className="ml-1.5 text-xs text-indigo-600">-17%</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-10 grid gap-6 text-left md:grid-cols-3">
            {PLANS.map((plan) => {
              const price = yearly ? Math.round(plan.monthly * 10) : plan.monthly;
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border p-6 ${plan.popular ? "border-indigo-600 shadow-xl shadow-indigo-600/10" : "border-slate-200"}`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-6 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-medium text-white">Most popular</span>
                  )}
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{plan.desc}</p>
                  <p className="mt-6 text-4xl font-bold">
                    ${price}
                    <span className="text-base font-normal text-slate-500">/{yearly ? "year" : "month"}</span>
                  </p>
                  <ul className="mt-6 space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="size-4 text-indigo-600" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button className={`mt-8 w-full rounded-lg py-2.5 text-sm font-medium ${plan.popular ? "bg-indigo-600 text-white hover:bg-indigo-500" : "border border-slate-300 hover:bg-slate-50"}`}>
                    {plan.monthly === 0 ? "Start for free" : "Start trial"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-slate-100 py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Questions and answers</h2>
          <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200">
            {FAQS.map((item, i) => (
              <div key={item.q}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left font-medium"
                >
                  {item.q}
                  <ChevronDown className={`size-4 transition ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && <p className="px-5 pb-4 text-sm text-slate-600">{item.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © 2026 Lumen Labs. All rights reserved.
      </footer>
    </div>
  );
}
