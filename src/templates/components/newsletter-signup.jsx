"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";

const TOPICS = ["Design", "Engineering", "Product", "Startups", "AI", "Careers"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [topics, setTopics] = useState(["Design"]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const toggleTopic = (topic) =>
    setTopics((t) => (t.includes(topic) ? t.filter((x) => x !== topic) : [...t, topic]));

  const onSubmit = (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) return setError("Please enter a valid email address.");
    if (topics.length === 0) return setError("Pick at least one topic.");
    setError("");
    setStatus("loading");
    setTimeout(() => setStatus("done"), 1200);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f1e9] p-6 font-serif text-[#2b2118]">
      <div className="w-full max-w-lg">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-[#a0522d]">The Sunday Letter</p>
        <h1 className="mt-4 text-5xl leading-tight">Ideas worth your Sunday morning.</h1>
        <p className="mt-4 font-sans text-[#6b5a4a]">
          One thoughtful email a week on building products people love. No spam, unsubscribe anytime.
        </p>

        {status === "done" ? (
          <div className="mt-10 flex items-start gap-3 rounded-2xl bg-white p-6 font-sans shadow-sm">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold">You are on the list!</p>
              <p className="mt-1 text-sm text-[#6b5a4a]">
                We sent a confirmation to {email}. Topics: {topics.join(", ")}.
              </p>
              <button onClick={() => { setStatus("idle"); setEmail(""); }} className="mt-3 text-sm font-medium text-[#a0522d] underline-offset-4 hover:underline">
                Subscribe another email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 font-sans" noValidate>
            <p className="text-sm font-medium">What should we write to you about?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TOPICS.map((topic) => {
                const on = topics.includes(topic);
                return (
                  <button
                    type="button"
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-[#2b2118] bg-[#2b2118] text-white" : "border-[#d9cbb8] hover:border-[#2b2118]"}`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>

            <div className={`mt-6 flex items-center gap-2 rounded-2xl border bg-white p-2 pl-4 transition focus-within:border-[#2b2118] ${error ? "border-red-400" : "border-[#d9cbb8]"}`}>
              <Mail className="size-4 text-[#a08c76]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-[#b9a993]"
              />
              <button
                disabled={status === "loading"}
                className="inline-flex items-center gap-2 rounded-xl bg-[#a0522d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8a4526] disabled:opacity-70"
              >
                {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                Subscribe
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <p className="mt-4 text-xs text-[#8a7966]">Join 24,000 readers. Sent every Sunday at 8am.</p>
          </form>
        )}
      </div>
    </div>
  );
}
