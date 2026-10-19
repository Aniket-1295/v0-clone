"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    blurb: "Everything you need to try it out.",
    monthly: 9,
    features: ["1 workspace", "5 GB storage", "Email support", null, null],
  },
  {
    name: "Pro",
    blurb: "For professionals who need more power.",
    monthly: 29,
    popular: true,
    features: ["5 workspaces", "100 GB storage", "Priority support", "Advanced analytics", null],
  },
  {
    name: "Team",
    blurb: "Collaborate across your whole company.",
    monthly: 79,
    features: ["Unlimited workspaces", "1 TB storage", "24/7 support", "Advanced analytics", "SSO and audit log"],
  },
];

export default function PricingTable() {
  const [yearly, setYearly] = useState(true);
  const [selected, setSelected] = useState("Pro");

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-16 text-neutral-900">
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Choose your plan</h1>
        <p className="mt-3 text-neutral-500">Start free for 14 days. Cancel anytime.</p>

        <label className="mt-8 inline-flex cursor-pointer items-center gap-3 text-sm font-medium">
          <span className={yearly ? "text-neutral-400" : ""}>Monthly</span>
          <button
            role="switch"
            aria-checked={yearly}
            onClick={() => setYearly(!yearly)}
            className={`relative h-6 w-11 rounded-full transition ${yearly ? "bg-neutral-900" : "bg-neutral-300"}`}
          >
            <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${yearly ? "left-[22px]" : "left-0.5"}`} />
          </button>
          <span className={yearly ? "" : "text-neutral-400"}>Yearly</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Save 20%</span>
        </label>

        <div className="mt-12 grid gap-6 text-left md:grid-cols-3">
          {PLANS.map((plan) => {
            const price = yearly ? Math.round(plan.monthly * 0.8) : plan.monthly;
            const isSelected = selected === plan.name;
            return (
              <button
                key={plan.name}
                onClick={() => setSelected(plan.name)}
                className={`relative rounded-3xl border bg-white p-8 text-left transition hover:shadow-xl ${
                  isSelected ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200"
                }`}
              >
                {plan.popular && (
                  <span className="absolute right-6 top-6 rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-medium text-white">Popular</span>
                )}
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <p className="mt-1 text-sm text-neutral-500">{plan.blurb}</p>
                <p className="mt-6 flex items-end gap-1">
                  <span className="text-5xl font-bold tracking-tight">${price}</span>
                  <span className="pb-1.5 text-sm text-neutral-500">/ month</span>
                </p>
                <p className="mt-1 h-4 text-xs text-neutral-400">{yearly ? `Billed $${price * 12} yearly` : ""}</p>
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((feature, i) => (
                    <li key={i} className={`flex items-center gap-2 ${feature ? "" : "text-neutral-300"}`}>
                      {feature ? <Check className="size-4 text-emerald-600" /> : <Minus className="size-4" />}
                      {feature ?? "Not included"}
                    </li>
                  ))}
                </ul>
                <span
                  className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition ${
                    isSelected ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-900"
                  }`}
                >
                  {isSelected ? "Selected" : `Choose ${plan.name}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
