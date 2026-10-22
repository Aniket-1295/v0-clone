# v0-clone: product-readiness audit and roadmap

Audited 17 Oct 2026 against `master` (commit `9f85c85`) and the live deployment at
https://v0-clone-alpha-kohl.vercel.app.

## 1. Verdict in one paragraph

This is a solid **tutorial-grade prototype** of the v0 / Lovable loop: prompt in, AI agent
writes a Next.js app into an E2B sandbox, preview in an iframe, chat to iterate, credits and
a Pro plan via Clerk. The architecture choices (Next 16 App Router, Clerk, Prisma on Neon,
Inngest AgentKit, E2B) are the right ones and are what the real products use. But the core
loop has several defects that make it unusable as a product today: previews die five
minutes after generation, results do not show up without a page reload, failed generations
hang forever and still burn credits, and production runs on Clerk's development instance.
There are no tests, no CI, no TypeScript, no monitoring, and the landing page is an event
badge template rather than a product page. Roughly 30 to 35 percent of the way to a sellable
v1. The good news is that the foundation does not need to be rewritten; it needs to be
hardened, then extended.

## 2. What exists today

### Stack

| Layer | Choice | State |
|---|---|---|
| Framework | Next.js 16.1.1, React 19, App Router, JavaScript (no TS) | Builds clean. `middleware.js` is deprecated in Next 16 (should be `proxy.js`). |
| UI | Tailwind 4, shadcn/ui (every component installed), motion, Streamdown, Prism | Fine. Many unused components. |
| Auth | Clerk (`@clerk/nextjs` 6) | Works. Live site uses a `pk_test` key on `accounts.dev`. |
| Billing | Clerk Billing `PricingTable`, plan slug `pro` | Wired, unverified end to end. |
| DB | Prisma 6 + PostgreSQL (Neon) | 4 migrations: User, Project, Message, Fragment, Usage. |
| Jobs / AI | Inngest 3 + `@inngest/agent-kit`, Gemini 2.5 Flash | One function: `code-agent/run`. |
| Sandbox | E2B `@e2b/code-interpreter`, custom template `v0-version-final-next` (Next 16 + shadcn) | Works. No lifetime management. |
| Hosting | Vercel | Deployed from `master`. |

### Request flow

1. `ProjectsForm` → server action `createProject` → `consumeCredits()` → insert Project + USER
   message → `inngest.send("code-agent/run")` → redirect to `/projects/[id]`.
2. Inngest `codeAgentFunction` (`src/inngest/functions.js`): create sandbox → load message
   history → AgentKit network (one agent, tools `terminal`, `createOrUpdateFiles`,
   `readFiles`, max 10 iterations) → stop when the agent emits `<task_summary>` → two more
   Gemini calls for a title and a reply → save ASSISTANT message + Fragment
   (`sandboxUrl`, `title`, `files`).
3. `ProjectView` polls `getMessages`, shows the latest Fragment in an iframe (Demo tab) or a
   file tree with Prism highlighting (Code tab).

### Data model

`User (clerkId) 1:N Project 1:N Message 1:1 Fragment(sandboxUrl, title, files Json)`, plus a
`Usage` table owned by `rate-limiter-flexible` (5 points / 30 days free, 100 for Pro).

## 3. Defects found (ordered by severity)

### P0: the core loop is broken for a real user

1. **Previews die after 5 minutes.** `Sandbox.create()` is called with no `timeoutMs` and
   `setTimeout` is never called, so E2B kills the sandbox after its default 300 s. The
   `sandboxUrl` is stored permanently in `Fragment`, so every project older than a few
   minutes shows a dead iframe. (`src/inngest/functions.js:25`)
2. **Results never arrive without a reload.** `useGetMessages` passes a function to
   `refetchInterval`; in TanStack Query v5 that callback receives the `Query` object, not the
   data, so `data?.length` is always `undefined` and polling is off. New assistant messages
   appear only on window refocus or refresh. (`src/modules/messages/hooks/message.js:18`)
3. **Failed generations hang forever and still cost a credit.** The Inngest function has no
   error path. If sandbox creation, Gemini, or the DB write throws, Inngest retries and then
   gives up; no ERROR message is written, so the UI shows the loader indefinitely. The credit
   was consumed before the job was even queued. (`src/inngest/functions.js`,
   `src/modules/projects/actions/index.js:17`)
4. **Rate-limit errors are unreadable.** `throw new Error({ code, message })` produces the
   message `[object Object]`, and Next.js masks server-action error messages in production
   anyway, so an out-of-credits user sees a generic error toast.
   (`src/modules/projects/actions/index.js:21`, `src/modules/messages/actions/index.js:27`)
5. **Conversation history is sent newest-first.** Messages are loaded with
   `orderBy: createdAt desc` and fed to the agent in that order, so follow-up prompts are
   interpreted against a reversed transcript. (`src/inngest/functions.js:39`)
6. **Preview iframe is `http://` on an `https://` page.** Browsers block mixed-content
   iframes. Commit `d4a4c7d` changed this to https and `6334cb1` reverted it. Needs to be
   verified on a fresh generation; E2B hosts serve https. (`src/inngest/functions.js:268`)

### P1: production hygiene

7. **Clerk development instance in production.** The live HTML contains a `pk_test_` key and
   sign-in redirects to `unique-mole-4.accounts.dev`. Dev instances are user-capped, show a
   development banner, and are not meant for real customers. Needs a production instance on
   a custom domain and the live keys set in Vercel.
8. **Anonymous homepage fires failing server actions.** `ProjectList` renders on the public
   `/` and calls `getProjects`, which throws `Unauthorized`; the live site logs three
   `POST / 500` per anonymous visit.
9. **DB write on every page view.** `(root)/layout.jsx` runs `onBoardUser()` (a Prisma
   upsert) on every request. This belongs in a Clerk `user.created` / `user.updated`
   webhook.
10. **Prisma logs every query in production** (`log: ["query", ...]` in `src/lib/db.js`).
11. **`/api(.*)` is fully public in middleware.** Correct for the Inngest endpoint, but any
    future API route is unauthenticated by default.
12. **Lint fails** (3 errors: impure `Math.random` in `components/ui/sidebar.jsx:576`,
    component created during render in `motion-primitives/animated-group.jsx:116`, and
    synchronous `setState` in an effect in `lanyard-with-controls.jsx:184`) and nothing runs
    lint, tests, or type checks in CI. No tests exist. No TypeScript.
13. **Unused weight.** `three`, `@react-three/fiber`, `@react-three/drei`,
    `@react-three/rapier`, `meshline`, `e2b`, `@e2b/sdk` are installed and never imported
    (the 3D lanyard was replaced by a CSS card). `node_modules` is 1.1 GB. Dead code:
    `onInvoke` sends an `agent/hello` event nobody handles; `lanyard.png` in
    `components/ui` is 0 bytes; `lanyard copy.png` and `v0-logo-dark2.png` are duplicates.

### P2: product gaps versus v0, Lovable, Bolt

14. No streaming or progress. The user sees a bouncing loader for 1 to 3 minutes with no
    idea what the agent is doing. The competitors stream the plan, each file write, and
    terminal output live.
15. No self-healing. The agent never reads the dev-server or browser errors after writing
    files, so a single TypeScript error ships a broken preview. (The template already has a
    running dev server; its output is not captured.)
16. Fragments are write-only. There is no restore / rollback to an earlier fragment into a
    live sandbox, no diff between versions.
17. No export, no deploy, no GitHub. `Fragment.files` holds only the AI-written files, not
    the full project, so even a zip download would be incomplete.
18. Projects are named with random slugs (`fuzzy-tiger`); no rename, delete, duplicate,
    search, or sharing / public links.
19. Single cheap model (Gemini 2.5 Flash) with `maxIter: 10` and no token or time budget.
    No model choice, no fallback provider.
20. Template cards (`PROJECT_TEMPLATES`) exist but are commented out of the form.
21. Landing page is an event-badge template: "Register Now" links to `#link`, "Contact Host"
    links to a personal LinkedIn, the hero reads "Attendee / Your Name". No product
    screenshots, no feature list, no pricing summary, no footer.
22. Branding is "V0 Clone" with the v0 logo. A real product cannot ship under Vercel's mark.
23. No SEO (`title: "V0 Clone"`, no Open Graph, no `robots.txt`, no sitemap), no analytics,
    no error monitoring (Sentry), no email (welcome, receipts, generation-finished), no
    Terms / Privacy pages, no support channel.
24. No mobile layout for the workspace (`ResizablePanelGroup` horizontal only, min 50 percent
    for the preview).

## 4. Roadmap to a sellable v1

Each phase is shippable on its own. Estimates assume one engineer working with an AI pair.

### Phase 1: make the loop reliable (1 week)

- Sandbox lifetime: create with `timeoutMs` of 15 to 30 minutes, and add a
  "wake / rebuild" path: when a fragment's sandbox is gone, re-create one from the template,
  write `Fragment.files` back, and update the URL. Store `sandboxId` on `Fragment`.
- Fix polling (use the `query` argument, or better, replace polling with Inngest Realtime /
  a `status` column on `Message` with `PENDING | RUNNING | DONE | ERROR`).
- Wrap the Inngest function in a failure handler (`onFailure`) that writes an ERROR message
  and refunds the credit. Consume credits inside the job on success, or reserve-then-commit.
- Return typed results from server actions (`{ ok, error: { code, message } }`) instead of
  throwing; render out-of-credits as an upgrade prompt.
- Reverse the history order; cap history by token budget.
- Switch to `https://` sandbox URL and verify in the browser.
- Lint clean, `proxy.js`, Prisma log level by env, Clerk webhook for onboarding,
  `ProjectList` only when signed in.
- Add CI: `npm run lint`, `prisma validate`, `next build`, on every PR.

### Phase 2: production platform (1 to 2 weeks)

- Clerk production instance + custom domain; live keys in Vercel; verify Pro checkout and
  entitlement end to end; Clerk Billing webhooks → `plan` column on `User`.
- Observability: Sentry (client + server + Inngest), Vercel Analytics or PostHog, structured
  logs with `projectId` / `runId`.
- Abuse controls: per-IP sign-up throttle, per-user concurrent-generation limit, prompt
  length and content checks, E2B spend cap alerts.
- Convert to TypeScript incrementally (actions and Inngest function first). Add Vitest for
  `convertFilesToTreeItems`, credit logic, and action error mapping. Add one Playwright
  smoke test for sign-in → generate → preview.
- Move `getCurrentUser` to a single cached lookup per request; add `@@index` on
  `Project.userId`, `Message.projectId`.
- Terms, Privacy, support email, `robots.txt`, OG image, real metadata.

### Phase 3: parity features that make it a product (3 to 4 weeks)

- **Live progress**: stream agent steps (plan, file writes, terminal output) over Inngest
  Realtime or SSE into the chat; show "Writing `app/page.tsx`…" with file chips.
- **Self-healing**: after each write batch, run `npx tsc --noEmit` and tail the dev-server
  log inside the sandbox; feed errors back to the agent before finishing.
- **Versions**: restore any fragment into the live sandbox; show a diff between fragments.
- **Export and deploy**: snapshot the full sandbox tree (not just AI files) into
  `Fragment.files` or object storage; one-click zip download; "Push to GitHub" via a GitHub
  App; "Deploy to Vercel" via the Vercel API with the user's token.
- **Project management**: AI-generated project names, rename, delete, duplicate, search,
  public share links (read-only preview + code).
- **Model strategy**: Claude Sonnet / Opus for the coding agent (Gemini Flash is too weak
  for multi-file apps), Flash kept for title/reply; per-plan model tiers; token and wall
  clock budgets per run; cost tracked per generation.
- **Input richness**: image / screenshot upload, "edit this element" selection in the
  preview, template gallery back on the home page.
- Responsive workspace (stacked tabs on mobile).

### Phase 4: go to market (ongoing)

- Rename and rebrand away from "v0". New landing page: hero with a real generated demo,
  three feature sections, pricing table, FAQ, footer.
- Pricing: Free (5 gens / month), Pro (100), Team (seats + shared projects). Annual discount.
- Lifecycle email (Resend): welcome, generation finished, credits low, receipt.
- Usage dashboard per user; admin dashboard for you (generations, failures, cost per run).
- Waitlist / Product Hunt launch assets.

## 5. Decisions you need to make

1. **Name and brand.** Required before any public launch.
2. **Coding model.** Stay on Gemini (cheap, weaker) or move the coding agent to Claude.
   This changes output quality more than anything else on this list.
3. **TypeScript now or later.** Recommended now, in Phase 2, before the codebase grows.
4. **Sandbox economics.** 30 minute sandboxes with rebuild-on-demand is the cheapest
   workable model; always-on previews need a different architecture (Vercel Sandbox,
   WebContainers, or static export for previews).
