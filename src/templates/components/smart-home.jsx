"use client";

import { useState } from "react";
import { Fan, Lamp, Lock, Minus, Plus, Speaker, Thermometer, Tv, Zap } from "lucide-react";

const ROOMS = {
  "Living room": [
    { id: "lamp", name: "Floor lamp", icon: Lamp, on: true },
    { id: "tv", name: "Smart TV", icon: Tv, on: false },
    { id: "speaker", name: "Speaker", icon: Speaker, on: true },
    { id: "fan", name: "Ceiling fan", icon: Fan, on: false },
  ],
  Bedroom: [
    { id: "bedlamp", name: "Bedside lamp", icon: Lamp, on: false },
    { id: "bedfan", name: "Fan", icon: Fan, on: true },
  ],
  Entrance: [
    { id: "lock", name: "Front door lock", icon: Lock, on: true },
    { id: "porch", name: "Porch light", icon: Lamp, on: false },
  ],
};

const USAGE = [12, 18, 9, 22, 16, 25, 14];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function SmartHome() {
  const [room, setRoom] = useState("Living room");
  const [devices, setDevices] = useState(ROOMS);
  const [temp, setTemp] = useState(21);

  const toggle = (id) =>
    setDevices((all) => ({ ...all, [room]: all[room].map((d) => (d.id === id ? { ...d, on: !d.on } : d)) }));

  const activeCount = Object.values(devices).flat().filter((d) => d.on).length;
  const maxUsage = Math.max(...USAGE);

  return (
    <div className="min-h-screen bg-[#111214] p-6 text-white md:p-10">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-white/50">Good evening</p>
        <h1 className="mt-1 text-3xl font-semibold">Welcome home, Sam</h1>
        <p className="mt-1 text-sm text-white/50">{activeCount} devices are on</p>

        <div className="mt-6 flex gap-2 overflow-x-auto">
          {Object.keys(devices).map((name) => (
            <button
              key={name}
              onClick={() => setRoom(name)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${room === name ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {devices[room].map(({ id, name, icon: Icon, on }) => (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={`rounded-3xl p-5 text-left transition ${on ? "bg-amber-300 text-black" : "bg-white/5 hover:bg-white/10"}`}
            >
              <div className="flex items-center justify-between">
                <Icon className="size-6" />
                <span className={`relative h-5 w-9 rounded-full ${on ? "bg-black/80" : "bg-white/20"}`}>
                  <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
                </span>
              </div>
              <p className="mt-8 font-medium">{name}</p>
              <p className={`text-xs ${on ? "text-black/60" : "text-white/40"}`}>{on ? "On" : "Off"}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-white/5 p-6">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Thermometer className="size-4" /> Thermostat
            </div>
            <div className="mt-6 flex items-center justify-between">
              <button onClick={() => setTemp((t) => Math.max(16, t - 1))} aria-label="Lower temperature" className="flex size-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <Minus className="size-5" />
              </button>
              <div className="text-center">
                <p className="text-6xl font-light">{temp}°</p>
                <p className="text-xs text-white/50">{temp > 22 ? "Heating" : temp < 20 ? "Cooling" : "Eco"}</p>
              </div>
              <button onClick={() => setTemp((t) => Math.min(28, t + 1))} aria-label="Raise temperature" className="flex size-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <Plus className="size-5" />
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 p-6">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Zap className="size-4" /> Energy this week
            </div>
            <div className="mt-6 flex h-28 items-end gap-3">
              {USAGE.map((kwh, i) => (
                <div key={i} className="group flex flex-1 flex-col items-center gap-2">
                  <div className="relative w-full rounded-lg bg-amber-300/80 transition group-hover:bg-amber-300" style={{ height: `${(kwh / maxUsage) * 100}%` }}>
                    <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 text-xs group-hover:block">{kwh}kWh</span>
                  </div>
                  <span className="text-xs text-white/40">{DAYS[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
