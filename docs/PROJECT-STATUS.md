# v0-clone: project status, scope and features

Snapshot taken 23 Oct 2026. `master` was at commit `d790e6d` after 61 merged PRs and 168 commits
when the rebrand started. Live deployment: https://v0-clone-alpha-kohl.vercel.app (Figma import and
Teams are live there).

Recently shipped: **Rebrand to Draftsmith** — the product name, an original logo and favicon, and
plain Mini / Pro / Max model names. The name lives in `src/lib/site.js` (`SITE_NAME`, `SITE_SLUG`),
so a later rename is one line. Before that: **Teams + Invite (slim)** — optional Team above
Project, workspace switcher, invite by email (copy link); Personal is unchanged and credits stay
per-user. Earlier: Figma import, Database, Design Systems. Next: the launch items in section 6, and
the open items in [V0-FEATURE-GAP.md](V0-FEATURE-GAP.md).

## 1. What the project is

An AI app builder modelled on Vercel v0. The user describes an app, or attaches a screenshot of
one. An AI agent then writes a real Next.js app inside a cloud sandbox and shows it in a live
preview. The user keeps chatting to change it. The finished app can be edited by hand,
downloaded, shared, pushed to GitHub, or published to a permanent Vercel URL.

## 2. Status at a glance

| Area | State |
|---|---|
| Core loop (prompt → agent → live preview → follow-ups) | Working |
| Reliability (sandbox lifetime, failures, refunds, polling) | Fixed (Phase 1 of the audit) |
| Unit tests | 26 files, 173 tests, all passing (`npm test`) |
| Lint | Clean: 0 errors, 1 warning (`react-hooks/exhaustive-deps`) |
| CI | GitHub Actions on every PR and push to `master`: Prisma validate, lint, tests, build |
| Post-deploy check | `node scripts/smoke.mjs <url> --sync` |
| Error monitoring | Sentry (client, server, Inngest), on when `SENTRY_DSN` is set |
| Language | JavaScript (no TypeScript) |
| Production readiness | Feature-rich prototype. Not ready for public launch (see section 6) |

The audit in [PRODUCT-READINESS-AUDIT.md](PRODUCT-READINESS-AUDIT.md) (17 Oct 2026) put the
project at 30–35% of a sellable v1. Since then all of Phase 1 has shipped, most of the Phase 3
feature list, and most of the Phase 2 production-hygiene list (webhook onboarding, Sentry, legal
and SEO pages). A separate [v0.app feature gap](V0-FEATURE-GAP.md) doc tracks parity work with
v0's workspace (panels through Settings, Instructions, GitHub import, model tiers, Generate
Images, Database, Design Systems and Figma import shipped).

## 3. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.1 (App Router, Turbopack), React 19 |
| UI | Tailwind CSS 4, shadcn/ui, motion, Streamdown (markdown), Prism |
| Data fetching | TanStack Query (polling for messages and agent steps) |
| Auth | Clerk (`@clerk/nextjs`). Route protection lives in `src/proxy.js` |
| Billing / credits | Clerk Billing (`pro` plan) + `rate-limiter-flexible` on Postgres |
| Database | PostgreSQL (Neon) via Prisma 6 |
| Background jobs | Inngest (`code-agent/run` function, cancel on Stop, failure handler) |
| AI model | Google Gemini 3 Flash family via `@google/genai`, rotating across models on quota or 503 errors |
| Code sandbox | E2B, custom template `v0-next-2gb` (Next.js + shadcn, 2 GB RAM, 30-minute lifetime) |
| Publishing | Vercel REST API (one Vercel project per chat) |
| Git import / export | GitHub OAuth app + REST API (import downloads a repo zipball) |
| Tests | Vitest |
| Hosting | Vercel |

## 4. Features

### 4.1 Public site
- **Landing page** in the style of v0.app: hero prompt box with prompt chips, a feature section
  with hover animations, a template showcase, a mobile showcase, FAQ, CTA and footer.
- **Template gallery** (`/templates`, `/templates/[slug]`): 12 working starter apps, each with a
  live preview: analytics dashboard, BMI calculator, image carousel, loan calculator, login form,
  memory game, newsletter signup, portfolio, pricing table, SaaS landing, smart home, task list.
  "Use template" opens the template's code in a new chat.
- **Pricing page** (`/pricing`) using Clerk's `PricingTable`.
- **Sign in / sign up** through Clerk.

### 4.2 Signed-in app shell
- v0-style sidebar with an account menu, a workspace switcher (Personal or a team), a search
  dialog, and recent chats and projects.
- **Projects** (`/projects`, `/projects/[id]`): group chats. Create, rename, star and delete.
  The project page also edits standing **Instructions** for every chat in that project. Lists
  follow the active workspace (Personal or a team).
- **Team** (`/team`, `/invite/[token]`): create a team, invite by email (copy the accept link),
  manage members. Every member can edit that team's projects. Deleting a team returns its
  projects to each creator's Personal workspace.
- **Chats** (`/chats`): list, rename, move into or out of a project, and delete. A chat with no
  project is a draft.
- **Usage / credits** display: 5 generations per 30 days on the free plan, 100 on Pro. Running
  out shows an Upgrade prompt.

### 4.3 Generation (the AI agent)
- Prompt by text, by **voice** (`use-speech-input`), or with an **image attachment**. With an
  image, the agent recreates the screenshot or mockup. **Import from Figma** attaches a rendered
  frame plus its structure and uses the same recreate path.
- The agent runs on Inngest with tools to run terminal commands, read files and create or update
  files. It is limited to 25 turns and receives the last 20 messages as context.
- **Live progress**: each step (setting up, reading, writing files, running a command, checking)
  appears in the chat while the run works. A **Stop** button cancels the run.
- **Self-healing**: when the agent finishes, the app's changed routes are requested in the sandbox.
  Any compile or runtime errors go back to the agent, which gets up to 2 rounds to fix them.
- Skips `npm install` for packages the app already has.
- **Gemini model rotation**: when one model runs out of quota or is busy (503), the next one is
  used.
- **Failure handling**: a failed run writes an error message in the chat and refunds the credit.
- **Abuse controls**: one generation at a time per user (the server refuses a second, backed by a
  per-user Inngest concurrency limit of 1), and prompts are limited to 4,000 characters server-side
  with a live character counter in the prompt boxes.
- The agent writes an AI-generated chat title and reply after each run.
- **Instructions** (PR #49, merged): standing rules per project and per chat, loaded from the database
  on every run and added to the system prompt. Chat rules override project rules when they
  conflict. Empty clears them. Max 2,000 characters each. File-safety and runtime rules stay
  above user rules. Not applied to title/reply prompts, and not shown on share pages.

### 4.4 Workspace (`/chat/[chatId]`)
- **Preview tab**: the live app in an iframe. Each chat keeps one sandbox, which is kept alive
  while the page is open. An expired sandbox is rebuilt from the latest version.
- **Code tab**: file tree plus editor. Files can be **edited by hand**, and saving creates a new
  version.
- **Diff tab**: what a version added, changed or deleted compared with an earlier one, with
  per-file `+/-` counts and a line-by-line diff. Computed in the browser from the file snapshots.
- **Logs tab**: the app's live Next.js server output and the preview's browser console (read from
  the sandbox's dev-server log), refreshed every few seconds, filterable by level, source and text.
- **Terminal tab**: run one-shot shell commands in the chat's sandbox and see their output, with
  exit codes and command history. Blocked while a generation is running.
- **Settings panel**: instructions, env vars, database, sharing, Figma, GitHub and publish in one
  place. Share and Publish also stay in the header. If the chat belongs to a project, that
  project's rules are shown above the chat rules.
- **Prompt `+` shortcut**: in a chat, Instructions opens Settings, Database opens the
  Database panel, and Import from Figma opens the import dialog. On the home prompt, Instructions
  edits the selected project's rules and Import from Figma starts a new chat.
- **"+" panel menu**: Preview stays open. Code, Diff, Logs, Terminal, Database and Settings can
  be added or closed. The open set is stored per chat; `?tab=` is the active tab.
- **Versions**: every agent reply is a version holding a full snapshot of the files. Any version
  can be **restored**, or **downloaded as a zip**.
- **Design mode**: click an element in the preview to find it in the source and change it from a
  design panel, without a prompt.
- **Environment variables**: secrets per chat, encrypted at rest with AES-256-GCM, written to the
  sandbox's `.env.local` and sent to Vercel on publish. The agent sees the variable names but
  never the values.
- **Database**: one Postgres URL per chat (Neon, Supabase or any Postgres), stored encrypted.
  Settings connects or disconnects it. The Database panel lists tables and columns (read-only).
  The URL is injected as `DATABASE_URL` for the sandbox and publish. The agent sees table names
  only, never the URL or rows.
- **Design Systems** (PR #57, #58): a saved theme applied to a chat or a project so new apps are
  built in that look (a chat's own theme overrides its project default). A theme is either simple
  (brand colours, radius, font) or a full shadcn token set **imported from CSS** — paste a
  `globals.css` (e.g. from tweakcn) and the whole oklch token set, light and dark, is captured. It
  is written into the sandbox's `globals.css` (one marker block, replaced on rebuild) so every
  shadcn component re-brands, and summarised in the agent's system prompt so custom markup matches.
  Managed on the `/design-systems` page; starter presets included.
- **Share**: a read-only public link (`/share/[shareId]`) that can be revoked.
- **Publish**: one click deploys the app to its own Vercel project at a permanent URL, with
  build-status tracking.
- **Push to GitHub**: connect a GitHub account with OAuth (the token is stored encrypted), then
  create a repository and push the current version.
- **Import from GitHub** (PR #50, merged): `/import` (New Chat menu and the prompt's `+` menu).
  Pick a repository, branch and optional folder; its Next.js app becomes the chat's first version.
  Only text files are kept (no dot files, `node_modules`, lockfiles, binaries or large files). No
  credit is spent. The preview sandbox replaces the template's `app/` folder (so `src/app` and
  `pages` projects work), retries installs with `--legacy-peer-deps`, and restarts the dev server
  when the project uses a different Next.js version.
- **Import from Figma**: personal access token stored encrypted on the user (Settings → Figma).
  Home `+` menu, New Chat menu (`/import/figma`) and the in-chat `+` menu. Paste a file or frame
  URL, preview, pick a frame when the link has no `node-id`, then export a PNG and a compact
  structure note. Starts a generation through `createChat` / `createMessages` (one credit). OAuth,
  multi-frame mid-run reads and Figma variable sync are later.

### 4.5 Data model (Prisma)
`User 1:N Project 1:N Chat 1:N Message 1:1 Fragment (version)`, plus:
- `Team` / `TeamMember` / `TeamInvite`: optional workspace above Project. `Project.teamId` is
  null for Personal (owned by `userId`); team members see every project on that team.
- `AgentStep`: live progress rows for each run.
- `Attachment`: prompt images, stored as bytes.
- `ChatEnvVar`: encrypted environment variables.
- `Usage`: the credit counter.
- `DesignSystem`: a saved theme (colours, radius, font, and an optional full `tokens` JSON set).

`User` also holds encrypted GitHub and Figma tokens (never sent to the client).
The `Chat` table also holds sandbox, publish, share, GitHub and an encrypted database URL.
`Project` and `Chat` each have optional `instructions` — standing rules the agent follows — and an
optional `designSystem` (the chat's wins over the project's).

## 5. Scope

**In scope (built):** a flow from prompt to working Next.js app, iterating on it, managing
versions, and taking the app out of the platform: zip, GitHub, Vercel, or a share link. An
optional Team can own projects; members are invited by email (copy link). Credits stay per-user.

**Out of scope today:**
- Per-chat Can View / Can Edit, shared credit pools, Clerk Organizations, Vercel seats.
- Frameworks other than Next.js.
- Backends other than a connected Postgres URL (no Neon OAuth, no row editor, no Upstash).
- Other AI providers. The agent runs only on Gemini.
- Real-time streaming. Progress is polled.
- Mobile layout for the workspace.

## 6. Still open before a public launch

Based on the audit's Phases 2 and 4, updated 22 Oct 2026.

**Done since the first snapshot:**
- ✅ Onboarding via Clerk webhook (`/api/webhooks/clerk`), instead of a DB write on every page load.
- ✅ Error monitoring with Sentry (client, server, Inngest), off unless the DSN env vars are set.
- ✅ Legal / SEO: Terms and Privacy pages, `robots.txt`, sitemap, Open Graph image and metadata.
- ✅ Abuse controls: one generation at a time per user, server-side prompt length limit.
- ✅ Brand: renamed to **Draftsmith** (working name) with an original logo and favicon; no v0 name
  or mark in the UI. Check the name is free to use (trademark, domain) before launch. Internal ids
  that users never see (storage keys, the Inngest app id, the design-mode message types) keep their
  old `v0` prefix on purpose, because renaming them would reset saved settings or orphan functions.
  Already-published apps keep their Vercel project and URL (the name is saved on first publish).

**Still open:**
1. **Clerk production instance** and custom domain. The live site still uses a `pk_test` key. Then
   verify Pro checkout and entitlement end to end, and configure the webhook on the prod instance.
2. **Analytics**: no product analytics yet (Sentry covers errors only).
3. **Abuse controls, remaining**: no prompt content checks and no E2B spend-cap alerts.
4. **TypeScript**: not started. No end-to-end (Playwright) test yet.
5. **Model strategy**: the audit suggests a stronger coding model, with per-plan model tiers and
   token, time and cost budgets per run.
6. **Lifecycle email** (welcome, generation finished, low credits, receipts), and usage and
   admin dashboards.
7. **Responsive workspace** for phones.

## 7. Running locally

```bash
npm install
npm run dev
```

Required environment variables (names only):
- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `GEMINI_API_KEY`
- `E2B_API_KEY`
- `ENV_VARS_SECRET`

Optional variables:
- `INNGEST_DEV`, `INNGEST_BASE_URL` (local Inngest dev server)
- `VERCEL_TOKEN`, `VERCEL_TEAM_ID` (Publish)
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (Push to GitHub)
- `GEMINI_MODELS`, `GEMINI_THINKING_LEVEL` (Mini / Pro model overrides), `GEMINI_MAX_MODELS` (Max tier; default `gemini-3.1-pro-preview`, needs a paid Gemini key), `GEMINI_IMAGE_MODELS` (Generate images; default `gemini-3.1-flash-image`, `gemini-2.5-flash-image`, needs a paid key)
- `CLERK_WEBHOOK_SIGNING_SECRET` (user-sync webhook; onboarding falls back to lazy creation without it)
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, and `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` (error monitoring + source maps)
- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL` (canonical URL for metadata/sitemap; support email on legal pages)

Local note: the dev setup uses a Dockerised Postgres (see `.env.local`, `localhost:55432`,
container `a1-e2e-pg`). If sign-in shows "Please sign in first", the database is unreachable —
start Docker and run `docker start a1-e2e-pg`.

Checks: `npm test`, `npx eslint src`, `npx prisma validate`, `npm run build`.
