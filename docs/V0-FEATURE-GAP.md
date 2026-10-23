# v0.app vs our app: feature gap and build order

Written 22 Oct 2026. Sources: four screenshots of v0.app (signed in, workspace "serviceos"), v0's public product,
and our code on `feat/settings-panel` (after Terminal PR #47). The signed-in v0 pages could not be browsed directly (they need a login).

Legend: ✅ we have it · 🟡 partly · ❌ missing · ⛔ not possible for us

## 1. Workspace panels (chat page, top-right tabs and the "+" menu)

| v0 feature | Ours | Notes |
|---|---|---|
| Preview | ✅ | Live sandbox iframe |
| Code (view + edit) | ✅ | File tree, editor, save as version |
| **Diff** (changes between versions) | ✅ | Per-file `+/-` and a line-by-line diff from version snapshots |
| **Logs** (dev server / build output) | ✅ | Next.js server + browser console from the sandbox, filterable |
| **Terminal** (run commands) | ✅ | One-shot commands in the chat's sandbox; blocked during a generation |
| **Settings** (chat settings panel) | ✅ | Instructions, env vars, database, share, Figma, GitHub and publish; Share + Publish stay in the header |
| **Database** (connect Supabase / Neon / Upstash, browse data) | 🟡 | Postgres URL per chat, read-only table browser; no Neon OAuth, Supabase app or Upstash yet |
| Add/close panels with "+" | ✅ | Preview stays open; Code / Diff / Logs / Terminal / Database / Settings can be added or closed |

## 2. Prompt box ("+" menu and model picker)

| v0 feature | Ours | Notes |
|---|---|---|
| Upload from computer | 🟡 | Images only; v0 also takes files |
| Voice dictation | ✅ | |
| **Instructions** (custom rules the AI always follows) | ✅ | Per project and per chat, added to the system prompt; chat wins on conflict |
| **Generate Images** (AI images inside the app) | 🟡 | "+" menu switch; agent tool stores images in our DB, served at `/api/images/<id>`; needs a paid Gemini key — PR open |
| **Import from Figma** | ✅ | PAT in Settings; paste a file or frame URL; exported frame image + structure go to the agent (one credit) |
| Skills | ❌ | Reusable prompt packs; can follow Instructions |
| MCPs | ❌ | Connect tools to the agent; large, later |
| Auto Permissions | ⛔ | Specific to v0's agent; not needed for ours |
| **Model picker: Mini / Pro / Max** | ✅ | Mini 1 credit, Pro 2 (high thinking), Max 4 (Gemini 3.1 Pro, Pro plan) (PR #52) |
| "Use your ChatGPT plan in v0" | ⛔ | Vercel–OpenAI partnership |

## 3. Starting work (New Chat menu, home)

| v0 feature | Ours | Notes |
|---|---|---|
| Blank chat | ✅ | |
| Start from template | ✅ | 12 templates |
| **Import from GitHub** | ✅ | Pick repo, branch and folder; its Next.js app becomes version 1 (PR #50) |
| **Import from Figma** | ✅ | `/import/figma`, home `+` dialog and in-chat follow-up; PAT, then a file or frame URL |
| Project picker with search + "Create new project" | ✅ | Picker has search and New project |
| Prompt chips (Contact Form, Mini Game, ...) | ✅ | |

## 4. Navigation, header, account

| v0 feature | Ours | Notes |
|---|---|---|
| Search, Home, Projects, Chats, Templates | ✅ | |
| Drafts + Projects in sidebar | ✅ | |
| **Design Systems** | ✅ | Saved theme applied to a chat/project: simple (colour, radius, font) or a full shadcn token set imported from CSS, with starter presets (PR #57, #58). Importing a whole component library (v0 "DS 2.0") not yet |
| Workspace / team switcher ("serviceos") | ❌ | Needs teams |
| **Invite** (collaborators) | ❌ | Needs teams and roles |
| Star a chat | ✅ | Projects and chats can be starred (favorites listed first) |
| Private / public lock on a chat | 🟡 | Share link exists; no visible privacy toggle in the header |
| Title menu (rename, duplicate, delete, move) | ✅ | Rename, favorite, duplicate, move, delete |
| Publish | ✅ | Vercel |
| Credits balance in the sidebar ("$5") | 🟡 | We show generations left, not in the sidebar footer |
| "Worked for 1s" collapsible run summary | 🟡 | We show live steps; no total time |

## 5. Build order (one PR each)

Ordered by value to users and how much existing code each one reuses.

1. ✅ **Diff panel**: compare any version with the one before it. (PR #45, merged)
2. ✅ **Logs panel**: dev-server output from the sandbox, refreshed live. (PR #46, merged)
3. ✅ **Terminal panel**: run commands in the chat's sandbox. (PR #47, merged)
4. ✅ **Settings panel + "+" panel menu**: one place for env vars, GitHub, sharing, publishing; add/close panels like v0. (PR #48, merged)
5. ✅ **Instructions**: per-project and per-chat rules for the agent. (PR #49, merged)
6. ✅ **Import from GitHub**: start a chat from an existing repository. (PR #50, merged)
7. ✅ **Model tiers**: Mini / Pro / Max mapped to Gemini models, limited by plan, with credit costs. (PR #52, merged)
8. ✅ **Generate Images**: the agent can create images for the app. (PR #53, merged)
9. ✅ **Small polish**: favorite and duplicate chats, searchable project picker. (PR #54, merged)
10. ✅ **Database**: connect a Postgres URL and browse tables the agent can see (PR #56, merged). Neon OAuth / Upstash later.
11. ✅ **Design Systems**: simple themes + a full shadcn token set imported from CSS, with starter presets (PR #57, #58). Component-library import ("DS 2.0") later.
12. ✅ **Figma import**: personal access token, file/frame URL, frame image + structure → agent.
13. **Teams + Invite** (workspace switcher, roles, shared projects) — largest; changes the data model.

Not planned: ChatGPT plan, Auto Permissions, MCPs (revisit after Instructions and Skills).
