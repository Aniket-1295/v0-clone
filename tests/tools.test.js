import { describe, expect, it } from "vitest";
import { npmInstallPackages, withLightNpmFlags } from "@/inngest/tools";

describe("npmInstallPackages", () => {
  it("lists package names without versions", () => {
    expect(npmInstallPackages("npm install lucide-react --yes")).toEqual(["lucide-react"]);
    expect(npmInstallPackages("npm i @radix-ui/react-dialog@^1.1 framer-motion")).toEqual(["@radix-ui/react-dialog", "framer-motion"]);
    expect(npmInstallPackages("npm install react@19")).toEqual(["react"]);
  });

  it("ignores installs without packages and chained commands", () => {
    expect(npmInstallPackages("npm install --yes")).toBeNull();
    expect(npmInstallPackages("npm install x && rm -rf /")).toBeNull();
    expect(npmInstallPackages("npm run build")).toBeNull();
  });
});

describe("withLightNpmFlags", () => {
  it("adds the light flags to every npm install", () => {
    expect(withLightNpmFlags("cd app && npm i recharts")).toBe(
      "cd app && npm i --no-audit --no-fund --prefer-offline --progress=false recharts"
    );
  });

  it("leaves other npm and npx commands alone", () => {
    for (const command of ["npm init -y", "npm run build", "npx shadcn add button"]) {
      expect(withLightNpmFlags(command)).toBe(command);
    }
  });
});
