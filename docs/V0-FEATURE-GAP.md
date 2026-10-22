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
| **Settings** (chat settings panel) | ✅ | Env vars, share, GitHub and publish in one panel; Share + Publish stay in the header |
| **Database** (connect Supabase / Neon / Upstash, browse data) | ❌ | Needs connection + table browser; env vars are the base |
| Add/close panels with "+" | ✅ | Preview stays open; Code / Diff / Logs / Terminal / Settings can be added or closed |

## 2. Prompt box ("+" menu and model picker)

| v0 feature | Ours | Notes |
|---|---|---|
| Upload from computer | 🟡 | Images only; v0 also takes files |
| Voice dictation | ✅ | |
| **Instructions** (custom rules the AI always follows) | ✅ | Per project and per chat, added to the system prompt; chat wins on conflict |
| **Generate Images** (AI images inside the app) | ❌ | Gemini image model, saved into the app's `public/` |
| **Import from Figma** | ❌ | Needs a Figma token; frame → image/structure → agent |
| Skills | ❌ | Reusable prompt packs; can follow Instructions |
| MCPs | ❌ | Connect tools to the agent; large, later |
| Auto Permissions | ⛔ | Specific to v0's agent; not needed for ours |
| **Model picker: Mini / Pro / Max** | 🟡 | Picker exists with one model; add tiers mapped to Gemini models and plans |
| "Use your ChatGPT plan in v0" | ⛔ | Vercel–OpenAI partnership |

## 3. Starting work (New Chat menu, home)

| v0 feature | Ours | Notes |
|---|---|---|
| Blank chat | ✅ | |
| Start from template | ✅ | 12 templates |
| **Import from GitHub** | ✅ | Pick repo, branch and folder; its Next.js app becomes version 1 (PR #50) |
| Project picker with search + "Create new project" | 🟡 | Picker exists, no search |
| Prompt chips (Contact Form, Mini Game, ...) | ✅ | |

## 4. Navigation, header, account

| v0 feature | Ours | Notes |
|---|---|---|
| Search, Home, Projects, Chats, Templates | ✅ | |
| Drafts + Projects in sidebar | ✅ | |
| **Design Systems** | ❌ | Saved theme (colours, fonts, radius, components) applied to new chats |
| Workspace / team switcher ("serviceos") | ❌ | Needs teams |
| **Invite** (collaborators) | ❌ | Needs teams and roles |
| Star a chat | 🟡 | Projects can be starred, chats cannot |
| Private / public lock on a chat | 🟡 | Share link exists; no visible privacy toggle in the header |
| Title menu (rename, duplicate, delete, move) | 🟡 | No duplicate / fork |
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
7. **Model tiers**: Mini / Pro / Max mapped to Gemini models, limited by plan, with credit costs.
8. **Generate Images**: the agent can create images for the app.
9. **Small polish**: star and duplicate chats, project search in the picker, "Worked for Xs", credits in the sidebar.
10. **Database**: connect Neon / Supabase, browse tables.
11. **Design Systems**.
12. **Figma import**.
13. **Teams + Invite** (workspace switcher, roles, shared projects) — largest; changes the data model.

Not planned: ChatGPT plan, Auto Permissions, MCPs (revisit after Instructions and Skills).
