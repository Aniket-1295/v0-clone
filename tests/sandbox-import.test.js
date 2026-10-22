import { describe, expect, it } from "vitest";
import { nextVersionOf, templateAppCleanup } from "@/lib/sandbox";

describe("templateAppCleanup", () => {
  it("keeps only the favicon when the project has its own app/", () => {
    expect(templateAppCleanup(["package.json", "app/page.tsx"])).toBe("find /home/user/app -type f ! -name favicon.ico -delete");
    expect(templateAppCleanup(["/home/user/app/layout.tsx"])).toMatch(/^find /);
  });

  it("removes the whole folder when the project routes from src/app or pages", () => {
    expect(templateAppCleanup(["package.json", "src/app/page.tsx"])).toBe("rm -rf /home/user/app");
    expect(templateAppCleanup(["package.json", "pages/index.js"])).toBe("rm -rf /home/user/app");
  });
});

describe("nextVersionOf", () => {
  it("reads next from dependencies or devDependencies", () => {
    expect(nextVersionOf(JSON.stringify({ dependencies: { next: "16.1.1" } }))).toBe("16.1.1");
    expect(nextVersionOf(JSON.stringify({ devDependencies: { next: "^14.2.0" } }))).toBe("^14.2.0");
    expect(nextVersionOf(JSON.stringify({ dependencies: {} }))).toBeNull();
    expect(nextVersionOf("{")).toBeNull();
  });
});
