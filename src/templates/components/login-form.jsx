"use client";

import { useState } from "react";
import { Eye, EyeOff, Github, Loader2, Lock, Mail, User } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const [mode, setMode] = useState("signin");
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [status, setStatus] = useState("idle");

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (mode === "signup" && values.name.trim().length < 2) next.name = "Enter your name.";
    if (!EMAIL_RE.test(values.email)) next.email = "Enter a valid email.";
    if (values.password.length < 8) next.password = "At least 8 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus("loading");
    setTimeout(() => setStatus("done"), 1000);
  };

  const input = (key, icon, props) => {
    const Icon = icon;
    return (
      <div>
        <div className={`flex items-center gap-2 rounded-xl border bg-white px-3 transition focus-within:ring-2 focus-within:ring-violet-500/30 ${errors[key] ? "border-red-400" : "border-zinc-200 focus-within:border-violet-500"}`}>
          <Icon className="size-4 text-zinc-400" />
          <input {...props} value={values[key]} onChange={set(key)} className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" />
          {key === "password" && (
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="text-zinc-400 hover:text-zinc-700">
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>
        {errors[key] && <p className="mt-1 text-xs text-red-500">{errors[key]}</p>}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 to-zinc-100 p-6 text-zinc-900">
      <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white/80 p-8 shadow-xl backdrop-blur">
        {status === "done" ? (
          <div className="py-8 text-center">
            <p className="text-lg font-semibold">{mode === "signin" ? "Welcome back!" : "Account created!"}</p>
            <p className="mt-1 text-sm text-zinc-500">Signed in as {values.email}</p>
            <button onClick={() => setStatus("idle")} className="mt-6 text-sm font-medium text-violet-600 hover:underline">Sign out</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1 text-sm font-medium">
              {[["signin", "Sign in"], ["signup", "Sign up"]].map(([id, label]) => (
                <button key={id} onClick={() => { setMode(id); setErrors({}); }} className={`rounded-lg py-2 transition ${mode === id ? "bg-white shadow-sm" : "text-zinc-500"}`}>
                  {label}
                </button>
              ))}
            </div>

            <h1 className="mt-6 text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
            <p className="mt-1 text-sm text-zinc-500">{mode === "signin" ? "Sign in to continue to your workspace." : "Start your 14-day free trial."}</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium hover:bg-zinc-50">
                <Github className="size-4" /> GitHub
              </button>
              <button className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium hover:bg-zinc-50">
                <span className="font-bold text-blue-500">G</span> Google
              </button>
            </div>

            <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
              <div className="h-px flex-1 bg-zinc-200" /> or <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <form onSubmit={onSubmit} className="space-y-3" noValidate>
              {mode === "signup" && input("name", User, { placeholder: "Full name", "aria-label": "Full name" })}
              {input("email", Mail, { type: "email", placeholder: "Email", "aria-label": "Email" })}
              {input("password", Lock, { type: showPassword ? "text" : "password", placeholder: "Password", "aria-label": "Password" })}

              {mode === "signin" && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-zinc-600">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-violet-600" />
                    Remember me
                  </label>
                  <a href="#" className="font-medium text-violet-600 hover:underline">Forgot password?</a>
                </div>
              )}

              <button disabled={status === "loading"} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-70">
                {status === "loading" && <Loader2 className="size-4 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
