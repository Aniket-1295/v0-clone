"use client";

import { useMemo, useState } from "react";
import { Landmark } from "lucide-react";

const money = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function Slider({ label, value, min, max, step, onChange, format }) {
  return (
    <label className="block">
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-emerald-600"
      />
    </label>
  );
}

export default function LoanCalculator() {
  const [amount, setAmount] = useState(250000);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState(30);

  const { monthly, totalInterest, balances } = useMemo(() => {
    const r = rate / 100 / 12;
    const n = years * 12;
    const payment = r === 0 ? amount / n : (amount * r) / (1 - Math.pow(1 + r, -n));
    let balance = amount;
    const yearly = [];
    for (let m = 1; m <= n; m++) {
      balance -= payment - balance * r;
      if (m % 12 === 0) yearly.push(Math.max(0, balance));
    }
    return { monthly: payment, totalInterest: payment * n - amount, balances: yearly };
  }, [amount, rate, years]);

  const principalPct = (amount / (amount + totalInterest)) * 100;

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2 text-emerald-700">
          <Landmark className="size-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">Mortgage planner</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Loan calculator</h1>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.3fr]">
          <div className="space-y-8 rounded-2xl bg-white p-6 shadow-sm">
            <Slider label="Loan amount" value={amount} min={10000} max={1000000} step={5000} onChange={setAmount} format={money} />
            <Slider label="Interest rate" value={rate} min={0} max={15} step={0.1} onChange={setRate} format={(v) => `${v.toFixed(1)}%`} />
            <Slider label="Term" value={years} min={5} max={40} step={1} onChange={setYears} format={(v) => `${v} years`} />
          </div>

          <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
            <p className="text-sm text-white/60">Monthly payment</p>
            <p className="mt-1 text-5xl font-bold tracking-tight">{money(monthly)}</p>

            <div className="mt-6 flex h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className="bg-emerald-400 transition-all" style={{ width: `${principalPct}%` }} />
              <div className="flex-1 bg-amber-400" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="flex items-center gap-2 text-white/60"><span className="size-2 rounded-full bg-emerald-400" /> Principal</p>
                <p className="mt-1 font-semibold">{money(amount)}</p>
              </div>
              <div>
                <p className="flex items-center gap-2 text-white/60"><span className="size-2 rounded-full bg-amber-400" /> Total interest</p>
                <p className="mt-1 font-semibold">{money(totalInterest)}</p>
              </div>
            </div>

            <p className="mt-8 text-sm text-white/60">Remaining balance by year</p>
            <div className="mt-3 flex h-32 items-end gap-[2px]">
              {balances.map((b, i) => (
                <div key={i} title={`Year ${i + 1}: ${money(b)}`} className="flex-1 rounded-t bg-emerald-400/70 transition-all hover:bg-emerald-300" style={{ height: `${(b / amount) * 100}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
