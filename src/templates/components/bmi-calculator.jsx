"use client";

import { useState } from "react";
import { Activity } from "lucide-react";

const CATEGORIES = [
  { label: "Underweight", max: 18.5, color: "bg-sky-400", text: "A BMI below 18.5 may mean you are not getting enough nutrition." },
  { label: "Healthy", max: 25, color: "bg-emerald-400", text: "A BMI between 18.5 and 24.9 is considered a healthy range." },
  { label: "Overweight", max: 30, color: "bg-amber-400", text: "A BMI between 25 and 29.9 is above the healthy range." },
  { label: "Obese", max: Infinity, color: "bg-rose-400", text: "A BMI of 30 or more is associated with higher health risks." },
];

const SCALE_MIN = 15;
const SCALE_MAX = 40;

export default function BmiCalculator() {
  const [unit, setUnit] = useState("metric");
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(70);
  const [feet, setFeet] = useState(5);
  const [inches, setInches] = useState(9);
  const [pounds, setPounds] = useState(154);

  const meters = unit === "metric" ? height / 100 : (feet * 12 + inches) * 0.0254;
  const kg = unit === "metric" ? weight : pounds * 0.4536;
  const bmi = meters > 0 && kg > 0 ? kg / (meters * meters) : 0;
  const category = CATEGORIES.find((c) => bmi < c.max);
  const markerPct = Math.min(100, Math.max(0, ((bmi - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100));

  const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-slate-900";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-emerald-500" />
          <h1 className="text-xl font-bold">BMI Calculator</h1>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium">
          {["metric", "imperial"].map((u) => (
            <button key={u} onClick={() => setUnit(u)} className={`rounded-lg py-2 capitalize transition ${unit === u ? "bg-white shadow" : "text-slate-500"}`}>
              {u}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4 text-sm">
          {unit === "metric" ? (
            <>
              <label className="block">
                <span className="mb-1.5 block font-medium">Height (cm)</span>
                <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} className={field} />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-medium">Weight (kg)</span>
                <input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className={field} />
              </label>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block font-medium">Feet</span>
                  <input type="number" value={feet} onChange={(e) => setFeet(Number(e.target.value))} className={field} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-medium">Inches</span>
                  <input type="number" value={inches} onChange={(e) => setInches(Number(e.target.value))} className={field} />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block font-medium">Weight (lb)</span>
                <input type="number" value={pounds} onChange={(e) => setPounds(Number(e.target.value))} className={field} />
              </label>
            </>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">Your BMI</p>
          <p className="text-6xl font-black tracking-tight">{bmi ? bmi.toFixed(1) : "-"}</p>
          {category && bmi > 0 && (
            <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white ${category.color}`}>{category.label}</span>
          )}
        </div>

        <div className="relative mt-6">
          <div className="flex h-3 overflow-hidden rounded-full">
            <div className="w-[14%] bg-sky-400" />
            <div className="w-[26%] bg-emerald-400" />
            <div className="w-[20%] bg-amber-400" />
            <div className="flex-1 bg-rose-400" />
          </div>
          {bmi > 0 && (
            <div className="absolute -top-1 size-5 -translate-x-1/2 rounded-full border-4 border-white bg-slate-900 shadow transition-all" style={{ left: `${markerPct}%` }} />
          )}
          <div className="mt-2 flex justify-between text-xs text-slate-400">
            <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
          </div>
        </div>

        {category && bmi > 0 && <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{category.text}</p>}
      </div>
    </div>
  );
}
