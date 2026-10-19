"use client";

import { useEffect, useState } from "react";
import { Anchor, Bird, Cherry, Flame, Heart, Moon, RotateCcw, Star, Sun, Trophy } from "lucide-react";

const ICONS = [
  { icon: Heart, color: "bg-rose-400" },
  { icon: Star, color: "bg-amber-400" },
  { icon: Moon, color: "bg-indigo-400" },
  { icon: Sun, color: "bg-orange-400" },
  { icon: Cherry, color: "bg-pink-400" },
  { icon: Flame, color: "bg-red-400" },
  { icon: Bird, color: "bg-sky-400" },
  { icon: Anchor, color: "bg-teal-400" },
];

const shuffle = () =>
  [...ICONS, ...ICONS]
    .map((card, i) => ({ ...card, id: i, key: card.color, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort);

export default function MemoryGame() {
  const [cards, setCards] = useState(shuffle);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [best, setBest] = useState(null);
  const won = matched.length === cards.length;
  const started = moves > 0;

  useEffect(() => {
    if (!started || won) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [started, won]);

  const onFlip = (card) => {
    if (flipped.length === 2 || flipped.includes(card.id) || matched.includes(card.id)) return;
    const next = [...flipped, card.id];
    setFlipped(next);
    if (next.length === 2) {
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      const [a, b] = next.map((id) => cards.find((c) => c.id === id));
      if (a.key === b.key) {
        const nextMatched = [...matched, a.id, b.id];
        setMatched(nextMatched);
        setFlipped([]);
        if (nextMatched.length === cards.length) setBest((prev) => (prev === null ? nextMoves : Math.min(prev, nextMoves)));
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  const restart = () => {
    setCards(shuffle());
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setSeconds(0);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-violet-100 via-pink-50 to-amber-100 p-6 text-slate-800">
      <h1 className="text-3xl font-black tracking-tight">Memory Match</h1>
      <p className="mt-1 text-sm text-slate-500">Find all eight pairs in as few moves as you can.</p>

      <div className="mt-6 flex gap-3 text-sm font-medium">
        <span className="rounded-full bg-white/80 px-4 py-1.5 shadow-sm">Moves: {moves}</span>
        <span className="rounded-full bg-white/80 px-4 py-1.5 shadow-sm">Time: {seconds}s</span>
        <span className="rounded-full bg-white/80 px-4 py-1.5 shadow-sm">Best: {best ?? "-"}</span>
      </div>

      <div className="mt-6 grid w-full max-w-sm grid-cols-4 gap-3">
        {cards.map((card) => {
          const open = flipped.includes(card.id) || matched.includes(card.id);
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => onFlip(card)}
              aria-label={open ? "Revealed card" : "Hidden card"}
              className={`flex aspect-square items-center justify-center rounded-2xl text-white shadow-md transition duration-300 ${
                open ? `${card.color} scale-100` : "bg-slate-800 hover:-translate-y-0.5 hover:bg-slate-700"
              } ${matched.includes(card.id) ? "opacity-80 ring-4 ring-white/70" : ""}`}
            >
              {open ? <Icon className="size-8" /> : <span className="text-2xl font-black text-white/30">?</span>}
            </button>
          );
        })}
      </div>

      {won && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold shadow-lg">
          <Trophy className="size-5 text-amber-500" /> You won in {moves} moves and {seconds}s!
        </div>
      )}

      <button onClick={restart} className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
        <RotateCcw className="size-4" /> Restart
      </button>
    </div>
  );
}
