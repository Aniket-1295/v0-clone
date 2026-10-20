import Sandbox from "@e2b/code-interpreter";

// Checks the generated app the way a first visitor would: request its pages from the
// sandbox's Next dev server and look for a build or server-render error. Errors that
// only happen in the browser (event handlers, effects) are not caught here.

const MAX_ROUTES = 3;
const MAX_ERROR_CHARS = 1500;
const STATUS_MARKER = "__V0_STATUS__";

/** "/" plus static routes of pages written this run (app/about/page.tsx -> /about). */
export const routesToCheck = (writtenPaths) => {
  const routes = new Set(["/"]);
  for (const filePath of writtenPaths) {
    const match = /(?:^|\/)app\/(.*?)\/?page\.[jt]sx?$/.exec(filePath);
    if (!match) continue;
    const segments = match[1].split("/").filter((segment) => segment && !/^\(.*\)$/.test(segment));
    if (segments.some((segment) => segment.startsWith("[") || segment.startsWith("@"))) continue;
    routes.add(`/${segments.join("/")}`);
  }
  return [...routes].slice(0, MAX_ROUTES);
};

// Next's dev error page carries the error as escaped JSON: "message":"...","stack".
const unescape = (text) =>
  text
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0026/g, "&")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, "");

export const extractError = (html) => {
  const page = unescape(html);

  // Thrown while rendering: {"name":"TypeError","message":"Cannot read ...","stack":[...]}
  const thrown = /"name":"(\w*Error)","message":"([^\n]*?)","stack"/.exec(page);
  if (thrown) return stripAnsi(`${thrown[1]}: ${thrown[2]}`).trim();

  // Build errors: "message":"./app/page.tsx:1:1\nModule not found: ...","stack":"..."
  const build = /"message":"(\.\/[\s\S]*?)","stack":"/.exec(page);
  if (build) return stripAnsi(build[1]).trim();

  // Client components that crash while server rendering: <template data-next-error-stack="TypeError: ...">
  const client = /data-next-error-stack="([^"\n]*)/.exec(html) ?? /data-next-error-message="([^"]*)"/.exec(html);
  return client ? client[1].replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim() : null;
};

/** Returns null when every checked page renders, or a short error report. */
export const checkApp = async (sandboxId, routes) => {
  const sandbox = await Sandbox.connect(sandboxId);

  for (const route of routes) {
    const result = await sandbox.commands
      .run(`curl -s --max-time 90 -w '\\n${STATUS_MARKER}%{http_code}' http://localhost:3000${route}`, { timeoutMs: 100_000 })
      .catch((error) => error.result ?? { stdout: "" });
    const output = result.stdout ?? "";
    const markerAt = output.lastIndexOf(STATUS_MARKER);
    const status = markerAt === -1 ? 0 : Number(output.slice(markerAt + STATUS_MARKER.length));
    if (status >= 200 && status < 400) continue;

    const detail = extractError(output) ?? (status ? `The page returned HTTP ${status}.` : "The dev server did not respond.");
    return `Route ${route}: ${detail}`.slice(0, MAX_ERROR_CHARS);
  }

  return null;
};
