// Quick checks against a deployed site, run by hand after `vercel deploy --prod`:
//   node scripts/smoke.mjs [baseUrl] [--sync]
// --sync also re-registers the Inngest functions (PUT /api/inngest), as every deploy needs.
const args = process.argv.slice(2);
const base = (args.find((arg) => !arg.startsWith("--")) ?? "https://v0-clone-alpha-kohl.vercel.app").replace(/\/$/, "");
const sync = args.includes("--sync");

const checks = [
  ["/", 200],
  ["/templates", 200],
  ["/pricing", 200],
  ["/templates-preview/saas-landing", 200],
  ["/share/does-not-exist", 404],
  ["/api/attachments/does-not-exist", 401],
];

let failed = 0;
for (const [path, expected] of checks) {
  const response = await fetch(base + path, { redirect: "manual" }).catch((error) => ({ status: `error: ${error.message}` }));
  const ok = response.status === expected;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${path} -> ${response.status}${ok ? "" : ` (expected ${expected})`}`);
}

if (sync) {
  const response = await fetch(`${base}/api/inngest`, { method: "PUT" });
  const body = await response.json().catch(() => ({}));
  const ok = response.ok && /registered/i.test(body.message ?? "");
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} PUT /api/inngest -> ${response.status} ${body.message ?? ""}`);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
