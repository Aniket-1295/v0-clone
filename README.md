# 🚀 V0 Clone — AI Powered UI Generation Platform

A full-stack, production-ready **V0-style AI UI generator** built to explore modern SaaS architecture, AI workflows, and scalable system design.

This project focuses on **real-world engineering practices** such as authentication, billing, background jobs, sandboxed execution, and clean database design — not just UI demos.

---

## ✨ What is V0 Clone?

**V0 Clone** is an AI-powered web application that allows users to generate UI components and layouts using natural language prompts.

Users can:
- Sign up and authenticate securely
- Submit prompts to generate UI code
- Preview generated UI safely in isolated sandboxes
- Track usage and billing
- Experience fast, responsive UI with modern tooling

This project is inspired by platforms like **Vercel v0**, but implemented from scratch to deeply understand the underlying architecture.

---

## 🧠 Why This Project?

This project was built as a **portfolio-grade SaaS application** to demonstrate:
- Full-stack ownership
- Scalable architecture
- AI integration
- Secure execution of untrusted code
- Production-level tooling and workflows

It goes far beyond a CRUD app or UI clone.

---

## 🛠️ Tech Stack

### Frontend
- **Next.js** — App Router based architecture
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Accessible, modern UI components
- **TanStack Query + Router** — Efficient data fetching, caching, and routing

### Authentication & Billing
- **Clerk** — Authentication, user management
- **Clerk Billing** — Subscription plans and usage control

### Backend & Infrastructure
- **Prisma ORM** — Type-safe database access
- **PostgreSQL (NeonDB)** — Serverless Postgres
- **Inngest** — Background jobs & event-driven workflows
- **Inngest Agent Kit** — AI agent orchestration
- **E2B Sandboxes** — Secure execution of AI-generated code

### AI
- **Google Gemini AI** — UI generation from natural language prompts

---

## 🗄️ Database Setup

The project uses **PostgreSQL with Prisma ORM**.

### Steps completed:
- Prisma initialized
- Prisma Client configured
- NeonDB connected using `DATABASE_URL`
- Test migration executed successfully
- Database verified using Prisma Studio

```bash
npx prisma migrate dev
npx prisma studio

## 🚀 Production setup

These are optional locally; set them in Vercel for production.

- **Clerk webhook (user sync)**: in the Clerk dashboard → Webhooks, add an endpoint `https://<your-domain>/api/webhooks/clerk` subscribed to `user.created`, `user.updated` and `user.deleted`, and set its signing secret as `CLERK_WEBHOOK_SIGNING_SECRET`. Without it, users are still created on their first action.
- **Sentry (error monitoring)**: `SENTRY_DSN` (server), `NEXT_PUBLIC_SENTRY_DSN` (browser). For readable stack traces, also `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` (source map upload at build time). Monitoring is off when the DSNs are unset.
- **Site URL and support email**: `NEXT_PUBLIC_SITE_URL` (canonical URL for metadata, `robots.txt` and the sitemap; defaults to the Vercel production URL) and `NEXT_PUBLIC_SUPPORT_EMAIL` (shown on the Terms and Privacy pages).
- **Name**: the product name lives in `src/lib/site.js`.
- **Legal pages**: `/terms` and `/privacy` are drafts; review them before launch.

## ✅ Checks

- **Every pull request and push to `master`** runs `.github/workflows/ci.yml`: Prisma validate, lint, unit tests and a production build. Wait for it to pass before merging.
- **Unit tests** (`npm test`, Vitest) cover the agent's error extraction, npm-install handling, Gemini model rotation, secret encryption, environment-variable helpers and code-edit validation. They need no database, sandbox or network.
- **After a production deploy**, run the smoke check against the live site (`--sync` also re-registers the Inngest functions):

  ```bash
  node scripts/smoke.mjs https://v0-clone-alpha-kohl.vercel.app --sync
  ```
