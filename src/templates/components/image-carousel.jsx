"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

const SLIDES = [
  { title: "Aurora", caption: "Northern lights over a frozen lake.", bg: "from-emerald-400 via-teal-600 to-indigo-900" },
  { title: "Dunes", caption: "Golden hour in the Namib desert.", bg: "from-amber-300 via-orange-500 to-rose-700" },
  { title: "Reef", caption: "Coral gardens in shallow tropical water.", bg: "from-cyan-300 via-sky-500 to-blue-800" },
  { title: "Bloom", caption: "Spring fields after the first rain.", bg: "from-pink-300 via-fuchsia-500 to-purple-800" },
];

export default function ImageCarousel() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const go = useCallback((delta) => setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => go(1), 4000);
    return () => clearInterval(id);
  }, [playing, go]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
      <div className="w-full max-w-4xl">
        <div className="group relative aspect-[16/9] overflow-hidden rounded-3xl">
          <div className="flex h-full transition-transform duration-700 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
            {SLIDES.map((slide) => (
              <div key={slide.title} className={`relative h-full w-full shrink-0 bg-gradient-to-br ${slide.bg}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_45%)]" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-8 text-white">
                  <h2 className="text-3xl font-bold">{slide.title}</h2>
                  <p className="mt-1 text-white/80">{slide.caption}</p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => go(-1)} aria-label="Previous slide" className="absolute left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-white/30">
            <ChevronLeft className="size-5" />
          </button>
          <button onClick={() => go(1)} aria-label="Next slide" className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-white/30">
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-2">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.title}
                onClick={() => setIndex(i)}
                aria-label={`Go to ${slide.title}`}
                className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-white" : "w-2 bg-white/30 hover:bg-white/60"}`}
              />
            ))}
          </div>
          <button onClick={() => setPlaying(!playing)} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {playing ? "Pause" : "Play"}
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-white/40">Use the arrow keys to navigate</p>
      </div>
    </div>
  );
}
