"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";

const PRIORITIES = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-sky-100 text-sky-700",
};

const INITIAL = [
  { id: 1, title: "Review pull request #42", priority: "high", done: false },
  { id: 2, title: "Write release notes", priority: "medium", done: false },
  { id: 3, title: "Book design review", priority: "low", done: true },
];

export default function TaskList() {
  const [tasks, setTasks] = useState(INITIAL);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [filter, setFilter] = useState("all");

  const add = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setTasks((t) => [{ id: Date.now(), title: title.trim(), priority, done: false }, ...t]);
    setTitle("");
  };

  const visible = tasks.filter((t) => (filter === "all" ? true : filter === "active" ? !t.done : t.done));
  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <div className="flex min-h-screen justify-center bg-stone-100 p-6 pt-16 text-stone-900">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold tracking-tight">Today</h1>
        <p className="mt-1 text-sm text-stone-500">{remaining} {remaining === 1 ? "task" : "tasks"} left</p>

        <form onSubmit={add} className="mt-6 flex gap-2 rounded-2xl bg-white p-2 shadow-sm">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task..."
            aria-label="Task title"
            className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
          />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority" className="rounded-lg bg-stone-100 px-2 text-sm outline-none">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button aria-label="Add task" className="flex size-9 items-center justify-center rounded-xl bg-stone-900 text-white hover:bg-stone-700">
            <Plus className="size-4" />
          </button>
        </form>

        <div className="mt-6 flex gap-1 text-sm">
          {["all", "active", "completed"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 capitalize transition ${filter === f ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-200"}`}>
              {f}
            </button>
          ))}
        </div>

        <ul className="mt-4 space-y-2">
          {visible.map((task) => (
            <li key={task.id} className="group flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <button
                onClick={() => setTasks((t) => t.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)))}
                aria-label={task.done ? "Mark as not done" : "Mark as done"}
                className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition ${task.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-stone-300 hover:border-stone-500"}`}
              >
                {task.done && <Check className="size-3.5" />}
              </button>
              <span className={`flex-1 text-sm ${task.done ? "text-stone-400 line-through" : ""}`}>{task.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${PRIORITIES[task.priority]}`}>{task.priority}</span>
              <button onClick={() => setTasks((t) => t.filter((x) => x.id !== task.id))} aria-label="Delete task" className="text-stone-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-500">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
          {visible.length === 0 && <li className="rounded-2xl border-2 border-dashed border-stone-200 p-8 text-center text-sm text-stone-400">Nothing here.</li>}
        </ul>

        {tasks.some((t) => t.done) && (
          <button onClick={() => setTasks((t) => t.filter((x) => !x.done))} className="mt-4 text-sm text-stone-500 hover:text-stone-900">
            Clear completed
          </button>
        )}
      </div>
    </div>
  );
}
