"use client";

import { useMemo, useState } from "react";
import { BarChart3, CreditCard, DollarSign, Home, Settings, ShoppingCart, TrendingDown, TrendingUp, Users } from "lucide-react";

const RANGES = { "7d": 7, "30d": 30, "90d": 90 };

// Deterministic pseudo-random series so the chart is stable between renders.
const makeSeries = (days) =>
  Array.from({ length: days }, (_, i) => {
    const wave = Math.sin(i / 3) * 900 + Math.cos(i / 7) * 600;
    return Math.round(4200 + i * 35 + wave + ((i * 7919) % 500));
  });

const ORDERS = [
  { id: "#3210", customer: "Olivia Martin", amount: 42.25, status: "Paid" },
  { id: "#3209", customer: "Ava Johnson", amount: 74.99, status: "Pending" },
  { id: "#3208", customer: "Michael Chen", amount: 64.5, status: "Paid" },
  { id: "#3207", customer: "Lisa Anderson", amount: 34.0, status: "Refunded" },
  { id: "#3206", customer: "Samantha Green", amount: 89.99, status: "Paid" },
];

const STATUS_STYLES = {
  Paid: "bg-emerald-500/15 text-emerald-400",
  Pending: "bg-amber-500/15 text-amber-400",
  Refunded: "bg-rose-500/15 text-rose-400",
};

function LineChart({ data }) {
  const w = 640;
  const h = 220;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 20) - 10;
    return [x, y];
  });
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="rgb(255 255 255 / 0.06)" />
      ))}
      <path d={area} fill="url(#fill)" />
      <path d={line} fill="none" stroke="rgb(129 140 248)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState("30d");
  const [nav, setNav] = useState("Overview");
  const series = useMemo(() => makeSeries(RANGES[range]), [range]);
  const revenue = series.reduce((a, b) => a + b, 0);
  const half = Math.floor(series.length / 2);
  const growth = ((series.slice(half).reduce((a, b) => a + b, 0) / series.slice(0, half).reduce((a, b) => a + b, 0) - 1) * 100).toFixed(1);

  const stats = [
    { label: "Revenue", value: `$${(revenue / 1000).toFixed(1)}k`, change: `+${growth}%`, up: true, icon: DollarSign },
    { label: "Orders", value: Math.round(revenue / 58).toLocaleString(), change: "+8.2%", up: true, icon: ShoppingCart },
    { label: "Customers", value: Math.round(revenue / 140).toLocaleString(), change: "+3.1%", up: true, icon: Users },
    { label: "Refund rate", value: "1.8%", change: "-0.4%", up: false, icon: CreditCard },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="hidden w-60 shrink-0 border-r border-white/5 p-4 md:block">
        <div className="mb-8 flex items-center gap-2 px-2 font-semibold">
          <BarChart3 className="size-5 text-indigo-400" /> Pulse
        </div>
        {[["Overview", Home], ["Orders", ShoppingCart], ["Customers", Users], ["Settings", Settings]].map(([label, Icon]) => (
          <button
            key={label}
            onClick={() => setNav(label)}
            className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${nav === label ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </aside>

      <main className="flex-1 space-y-6 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{nav}</h1>
            <p className="text-sm text-zinc-400">Store performance for the last {RANGES[range]} days</p>
          </div>
          <div className="flex rounded-lg border border-white/10 p-1 text-sm">
            {Object.keys(RANGES).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1 transition ${range === r ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, change, up, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between text-sm text-zinc-400">
                {label} <Icon className="size-4" />
              </div>
              <p className="mt-3 text-2xl font-semibold">{value}</p>
              <p className={`mt-1 flex items-center gap-1 text-xs ${up ? "text-emerald-400" : "text-rose-400"}`}>
                {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />} {change} vs previous period
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Revenue</h2>
            <span className="text-sm text-zinc-400">Daily</span>
          </div>
          <LineChart data={series} />
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
          <h2 className="mb-4 font-medium">Recent orders</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-400">
              <tr>
                <th className="pb-3 font-normal">Order</th>
                <th className="pb-3 font-normal">Customer</th>
                <th className="pb-3 font-normal">Status</th>
                <th className="pb-3 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              {ORDERS.map((o) => (
                <tr key={o.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 text-zinc-400">{o.id}</td>
                  <td className="py-3">{o.customer}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                  </td>
                  <td className="py-3 text-right">${o.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
