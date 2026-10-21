// Builds the sandbox template the app uses (`v0-next-2gb`) on top of the original
// `v0-version-final-next`, so it keeps exactly the same files and packages.
// Run from the repo root with E2B_API_KEY set:  node sandbox-templates/next-js/build-2gb.mjs
import { Template, waitForURL } from "e2b";

const template = Template()
  .fromTemplate("v0-version-final-next")
  // npm's audit and fund requests nearly exhaust memory next to the dev server.
  .runCmd("npm config set audit false && npm config set fund false && npm config set progress false")
  .setStartCmd("/compile_page.sh", waitForURL("http://localhost:3000"));

const info = await Template.build(template, {
  alias: "v0-next-2gb",
  memoryMB: 2048,
  cpuCount: 2,
  onBuildLogs: (log) => console.log(String(log)),
});
console.log("Built", info);
