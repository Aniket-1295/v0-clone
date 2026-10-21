import { describe, expect, it } from "vitest";
import { validateCodeEdits } from "@/lib/sandbox";

const files = { "app/page.tsx": "export default function Page() {}", "README.md": "# App" };

describe("validateCodeEdits", () => {
  it("accepts edits of existing files", () => {
    expect(validateCodeEdits({ "app/page.tsx": "changed" }, files)).toBeNull();
  });

  it("rejects paths outside the app, unknown files, oversized and empty saves", () => {
    expect(validateCodeEdits({ "../etc/passwd": "x" }, files)).toMatch(/Invalid file path/);
    expect(validateCodeEdits({ "/home/user/app/page.tsx": "x" }, files)).toMatch(/Invalid file path/);
    expect(validateCodeEdits({ "app/new.tsx": "x" }, files)).toMatch(/not part of this version/);
    expect(validateCodeEdits({ "app/page.tsx": "x".repeat(250 * 1024) }, files)).toMatch(/too large/);
    expect(validateCodeEdits({}, files)).toMatch(/no changes/);
  });
});
