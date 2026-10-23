import Sandbox, { NotFoundError } from "@e2b/code-interpreter";
import db from "@/lib/db";
import { MessageRole, MessageType } from "@prisma/client";
import { getChatEnv, SANDBOX_ENV_PATH, toEnvFile } from "@/lib/env-vars";
import { DESIGN_SCRIPT, DESIGN_SCRIPT_FILE } from "@/lib/design-mode-script";
import { applyBrandCss, loadChatDesignSystem } from "@/lib/design-system";

// v0-version-final-next (1 GB) plus npm settings, with 2 GB of memory: next dev uses ~700 MB
// once warm, which left npm installs too little room. See sandbox-templates/next-js.
export const SANDBOX_TEMPLATE = "v0-next-2gb";
// E2B kills sandboxes after 5 minutes by default; keep previews alive for 30.
export const SANDBOX_TIMEOUT_MS = 30 * 60 * 1000;
// A snapshot takes ~2 s; far longer means the sandbox is overloaded or hung.
const SNAPSHOT_TIMEOUT_MS = 30_000;
// How long a trivial command may take before a sandbox counts as hung.
const HEALTH_CHECK_TIMEOUT_MS = 10_000;
// npm's audit and fund requests nearly exhaust the sandbox's 1 GB next to the dev server
// (measured: 27 MB left and a hang, versus ~200 MB left and done in seconds without them).
export const LIGHT_NPM_FLAGS = "--no-audit --no-fund --prefer-offline --progress=false";

const APP_ROOT = "/home/user";

// Runs inside the sandbox and prints the project tree as JSON { relativePath: content }.
// Dot entries (.next, .git, shell profile, caches), node_modules, lockfiles and binary
// or very large files are left out; the template provides those on rebuild.
const SNAPSHOT_SCRIPT = `
const fs = require("fs");
const path = require("path");
const ROOT = ${JSON.stringify(APP_ROOT)};
const SKIP_DIRS = new Set(["node_modules"]);
// Stale copy of the app that the template build failed to remove; not part of the project.
const SKIP_ROOT_DIRS = new Set(["nextjs-app"]);
// The design mode helper we add to sandboxes; not part of the user's app.
const SKIP_ROOT_FILES = new Set(["instrumentation-client.js"]);
const SKIP_FILES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lock", "bun.lockb"]);
const MAX_BYTES = 200 * 1024;
const out = {};
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (dir === ROOT && (SKIP_ROOT_DIRS.has(entry.name) || SKIP_ROOT_FILES.has(entry.name))) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full);
      continue;
    }
    if (!entry.isFile() || SKIP_FILES.has(entry.name)) continue;
    const buf = fs.readFileSync(full);
    if (buf.length > MAX_BYTES || buf.includes(0)) continue;
    out[path.relative(ROOT, full)] = buf.toString("utf8");
  }
};
walk(ROOT);
process.stdout.write(JSON.stringify(out));
`;

export const getSandboxUrl = (sandbox) => `https://${sandbox.getHost(3000)}`;

/** True when the sandbox runs a trivial command promptly. */
const isResponsive = async (sandbox) => {
  try {
    await sandbox.commands.run("true", { timeoutMs: HEALTH_CHECK_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
};

/**
 * Connects to a running or paused sandbox and extends its timeout; null when it is gone.
 * With `checkHealth`, a sandbox that no longer answers (out of memory) is killed and
 * also reported as gone, so the caller rebuilds it.
 */
export const connectSandbox = async (sandboxId, { checkHealth = false } = {}) => {
  try {
    const sandbox = await Sandbox.connect(sandboxId, { timeoutMs: SANDBOX_TIMEOUT_MS });
    if (checkHealth && !(await isResponsive(sandbox))) {
      console.error(`Sandbox ${sandboxId} is not responding; replacing it.`);
      await sandbox.kill().catch(() => {});
      return null;
    }
    await sandbox.setTimeout(SANDBOX_TIMEOUT_MS);
    return sandbox;
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
};

/** Full project file tree of a sandbox, keyed by path relative to the app root. */
export const snapshotFiles = async (sandbox) => {
  // Piped through stdin: re-writing a script file in /tmp fails with "permission denied".
  const result = await sandbox.commands.run(
    `node - <<'V0_SNAPSHOT_EOF'\n${SNAPSHOT_SCRIPT}\nV0_SNAPSHOT_EOF`,
    { timeoutMs: SNAPSHOT_TIMEOUT_MS }
  );
  return JSON.parse(result.stdout);
};

const toRelativePath = (filePath) => filePath.replace(/^\/home\/user\//, "");

/**
 * The sandbox's file tree, or, when it cannot be read (an overloaded or hung sandbox),
 * the chat's latest saved version with `writtenFiles` applied on top, so a finished
 * generation is never lost just because the snapshot failed.
 */
export const snapshotWithFallback = async (sandboxId, chatId, writtenFiles = {}) => {
  try {
    return await snapshotFiles(await Sandbox.connect(sandboxId));
  } catch (error) {
    console.error(`Snapshot of sandbox ${sandboxId} failed; using the saved files instead:`, error.message);
    const previous = await getLatestFragment(chatId);
    const written = Object.fromEntries(Object.entries(writtenFiles).map(([path, content]) => [toRelativePath(path), content]));
    return { ...(previous?.files ?? {}), ...written };
  }
};

const toAbsolutePath = (filePath) =>
  filePath.startsWith("/") ? filePath : `${APP_ROOT}/${filePath}`;

/** Creates a fresh sandbox from the template and writes `files` (a Fragment.files object) into it. */
export const createSandboxFromFiles = async (files, { env = {} } = {}) => {
  const sandbox = await Sandbox.create(SANDBOX_TEMPLATE, { timeoutMs: SANDBOX_TIMEOUT_MS });
  const entries = Object.entries(files || {}).filter(
    ([, content]) => typeof content === "string"
  );

  // The chat's environment variables, before the dev server compiles the app.
  if (Object.keys(env).length > 0) await sandbox.files.write(SANDBOX_ENV_PATH, toEnvFile(env));

  if (entries.length === 0) return sandbox;

  const packageJsonPath = `${APP_ROOT}/package.json`;
  const templatePackageJson = await sandbox.files.read(packageJsonPath);

  const restoredPackageJson = entries.find(
    ([filePath]) => toAbsolutePath(filePath) === packageJsonPath
  )?.[1];

  // A whole project (snapshots and GitHub imports carry package.json) replaces the
  // template's app/ folder. Otherwise a project using src/app would be shadowed by the
  // template's app/, or two page files (page.tsx and page.jsx) would clash.
  if (restoredPackageJson) {
    await sandbox.commands.run(templateAppCleanup(entries.map(([filePath]) => filePath)), { cwd: APP_ROOT, timeoutMs: 30_000 });
  }

  await sandbox.files.write(
    entries.map(([filePath, content]) => ({ path: toAbsolutePath(filePath), data: content }))
  );

  // The agent may have installed packages, or the project was imported; package.json then
  // differs from the template's.
  if (restoredPackageJson && restoredPackageJson !== templatePackageJson) {
    await installPackages(sandbox);
    // The running dev server keeps the template's Next.js in memory; a different version
    // needs a fresh one.
    if (nextVersionOf(restoredPackageJson) !== nextVersionOf(templatePackageJson)) {
      await restartDevServer(sandbox);
    }
  }

  // Warm up the dev server so the first preview load does not wait for compilation.
  await sandbox.commands
    .run("curl -s -o /dev/null --max-time 60 http://localhost:3000", { timeoutMs: 70_000 })
    .catch(() => {});

  return sandbox;
};

/**
 * npm install for a restored or imported package.json. Projects often pin peer versions
 * that conflict with the template's packages (ERESOLVE), and their .npmrc (a dot file, not
 * imported) usually allowed that, so such a failure is retried with --legacy-peer-deps.
 */
const installPackages = async (sandbox) => {
  const install = (extra = "") =>
    sandbox.commands.run(`npm install ${LIGHT_NPM_FLAGS}${extra}`, { cwd: APP_ROOT, timeoutMs: 5 * 60 * 1000 });
  try {
    await install();
  } catch (error) {
    if (!String(error?.stderr ?? "").includes("ERESOLVE")) throw error;
    await install(" --legacy-peer-deps");
  }
};

const relativePath = (filePath) => filePath.replace(new RegExp(`^${APP_ROOT}/`), "").replace(/^\/+/, "");

/**
 * The shell command that clears the template's app/ folder before a whole project is
 * written: everything except its favicon when the project has its own app/ (it rewrites
 * the rest), or the whole folder when the project routes from src/app or pages.
 */
export const templateAppCleanup = (filePaths) =>
  filePaths.some((filePath) => relativePath(filePath).startsWith("app/"))
    ? `find ${APP_ROOT}/app -type f ! -name favicon.ico -delete`
    : `rm -rf ${APP_ROOT}/app`;

/** The `next` version range a package.json asks for, or null. */
export const nextVersionOf = (packageJson) => {
  try {
    const pkg = JSON.parse(packageJson);
    return pkg.dependencies?.next ?? pkg.devDependencies?.next ?? null;
  } catch {
    return null;
  }
};

/** Stops the template's dev server and starts one with the project's own Next.js. */
const restartDevServer = async (sandbox) => {
  // "[n]ext" matches the dev server but not this shell, whose own command line has the pattern.
  await sandbox.commands.run("pkill -f '[n]ext dev' ; pkill -f '[n]ext-server' ; true", { timeoutMs: 15_000 }).catch(() => {});
  await sandbox.commands.run("npx next dev -p 3000", { cwd: APP_ROOT, background: true });
  // Wait for it to listen (the warm-up request afterwards compiles the first page).
  await sandbox.commands
    .run("for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:3000 && exit 0; sleep 1; done; exit 1", { timeoutMs: 75_000 })
    .catch(() => {});
};

/** The chat's most recent generated version. */
export const getLatestFragment = (chatId) =>
  db.fragment.findFirst({
    where: { message: { chatId, type: MessageType.RESULT } },
    orderBy: { createdAt: "desc" },
  });

/** Template chats preview our hosted template page and need no sandbox until a follow-up. */
export const isHostedPreview = (fragment) => !!fragment?.sandboxUrl?.includes("/templates-preview/");

// globals.css lives here in a stock app, or under src/ in an imported one.
const GLOBALS_CANDIDATES = [`${APP_ROOT}/app/globals.css`, `${APP_ROOT}/src/app/globals.css`];

/**
 * Applies the chat's design system to the freshly built sandbox by overriding the brand
 * tokens in globals.css. Every shadcn component then inherits the brand. Idempotent via the
 * marker in applyBrandCss, so rebuilds re-theme (if the system changed) without duplicating.
 */
const applyChatDesignSystem = async (sandbox, chatId) => {
  const ds = await loadChatDesignSystem(db, chatId);
  if (!ds) return;
  for (const path of GLOBALS_CANDIDATES) {
    const css = await sandbox.files.read(path).catch(() => null);
    if (css == null) continue;
    const branded = applyBrandCss(css, ds);
    if (branded !== css) await sandbox.files.write(path, branded);
    return;
  }
};

/**
 * Returns the chat's sandbox, recreating it from the latest fragment when it has expired.
 * On a rebuild the chat and the latest fragment are pointed at the new sandbox so the
 * preview iframe works again.
 */
export const getOrCreateChatSandbox = async (chatId) => {
  const chat = await db.chat.findUnique({
    where: { id: chatId },
    select: { sandboxId: true },
  });

  if (chat?.sandboxId) {
    const sandbox = await connectSandbox(chat.sandboxId, { checkHealth: true });
    if (sandbox) return { sandbox, rebuilt: false };
  }

  const fragment = await getLatestFragment(chatId);
  const sandbox = await createSandboxFromFiles(fragment?.files, { env: await getChatEnv(chatId) });
  await applyChatDesignSystem(sandbox, chatId);

  await db.chat.update({
    where: { id: chatId },
    data: { sandboxId: sandbox.sandboxId },
  });

  if (fragment) {
    await db.fragment.update({
      where: { id: fragment.id },
      data: { sandboxId: sandbox.sandboxId, sandboxUrl: getSandboxUrl(sandbox) },
    });
  }

  return { sandbox, rebuilt: true };
};

/**
 * Saves `fragment` (an earlier version) as the chat's new latest version, in a fresh
 * sandbox built from its files so nothing from later versions is left behind. The chat's
 * previous sandbox is killed. Returns the new assistant message with its fragment.
 */
export const restoreFragment = async (chatId, fragment, previousSandboxId) => {
  // Template versions are served by this app; the sandbox is built on the next prompt.
  const sandbox = isHostedPreview(fragment)
    ? null
    : await createSandboxFromFiles(fragment.files, { env: await getChatEnv(chatId) });

  const message = await db.message.create({
    data: {
      chatId,
      content: `Restored the version **${fragment.title}**.`,
      role: MessageRole.ASSISTANT,
      type: MessageType.RESULT,
      fragments: {
        create: {
          title: fragment.title,
          files: fragment.files,
          sandboxId: sandbox?.sandboxId ?? null,
          sandboxUrl: sandbox ? getSandboxUrl(sandbox) : fragment.sandboxUrl,
        },
      },
    },
    include: { fragments: true },
  });

  await db.chat.update({ where: { id: chatId }, data: { sandboxId: sandbox?.sandboxId ?? null } });

  // The previous sandbox holds the newer code and nothing points at it any more.
  if (previousSandboxId) await Sandbox.kill(previousSandboxId).catch(() => {});

  return message;
};

// Limits for code edited by hand in the Code tab.
const MAX_EDIT_FILES = 50;
const MAX_EDIT_FILE_BYTES = 200 * 1024;
const MAX_EDIT_TOTAL_BYTES = 1024 * 1024;

/**
 * Checks hand edits ({ path: content }) against the version they change: only files that
 * already exist, relative paths inside the app, and size limits. Returns an error message
 * for the user, or null when the edits are fine.
 */
export const validateCodeEdits = (edits, files) => {
  const entries = Object.entries(edits ?? {});
  if (entries.length === 0) return "There are no changes to save.";
  if (entries.length > MAX_EDIT_FILES) return `Save at most ${MAX_EDIT_FILES} files at once.`;

  let total = 0;
  for (const [path, content] of entries) {
    if (typeof content !== "string") return `Invalid content for ${path}.`;
    if (path.startsWith("/") || path.split("/").includes("..")) return `Invalid file path: ${path}.`;
    if (typeof files?.[path] !== "string") return `${path} is not part of this version.`;
    const bytes = Buffer.byteLength(content);
    if (bytes > MAX_EDIT_FILE_BYTES) return `${path} is too large to save here.`;
    total += bytes;
  }
  return total > MAX_EDIT_TOTAL_BYTES ? "The changes are too large to save at once." : null;
};

/**
 * Saves hand edits of the chat's latest version (`latest`, a Fragment): writes them into
 * the chat's sandbox so the preview updates, and records them as a new version.
 * Returns the new assistant message with its fragment.
 */
export const saveCodeEditsAsVersion = async (chatId, latest, edits) => {
  const { sandbox } = await getOrCreateChatSandbox(chatId);
  await sandbox.files.write(
    Object.entries(edits).map(([path, data]) => ({ path: `${APP_ROOT}/${path}`, data }))
  );

  const names = Object.keys(edits).map((path) => `\`${path}\``);
  const listed = names.length > 3 ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more` : names.join(", ");

  return db.message.create({
    data: {
      chatId,
      content: `Edited ${listed} by hand.`,
      role: MessageRole.ASSISTANT,
      type: MessageType.RESULT,
      fragments: {
        create: {
          title: latest.title,
          files: { ...latest.files, ...edits },
          sandboxId: sandbox.sandboxId,
          sandboxUrl: getSandboxUrl(sandbox),
        },
      },
    },
    include: { fragments: true },
  });
};

/**
 * Rewrites .env.local in the chat's running sandbox after its environment variables
 * change (next dev reloads it). A sandbox that is gone gets the variables when rebuilt.
 */
export const syncChatEnvToSandbox = async (chatId) => {
  const chat = await db.chat.findUnique({ where: { id: chatId }, select: { sandboxId: true } });
  if (!chat?.sandboxId) return;
  try {
    const sandbox = await Sandbox.connect(chat.sandboxId);
    await sandbox.files.write(SANDBOX_ENV_PATH, toEnvFile(await getChatEnv(chatId)));
  } catch (error) {
    if (!(error instanceof NotFoundError)) console.error(`Could not update env of sandbox ${chat.sandboxId}:`, error.message);
  }
};

/**
 * Makes sure the chat's sandbox has the design mode helper (rebuilding the sandbox if it is
 * gone) and returns the preview URL. Writing it the first time reloads the preview.
 */
export const installDesignScript = async (chatId) => {
  const { sandbox } = await getOrCreateChatSandbox(chatId);
  const path = `${APP_ROOT}/${DESIGN_SCRIPT_FILE}`;
  const current = await sandbox.files.read(path).catch(() => null);
  if (current !== DESIGN_SCRIPT) await sandbox.files.write(path, DESIGN_SCRIPT);
  return { sandboxUrl: getSandboxUrl(sandbox), installed: current !== DESIGN_SCRIPT };
};
