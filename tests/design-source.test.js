import { describe, expect, it } from "vitest";
import { applyElementEdit, findElementSource, readStyle, writeStyle } from "@/lib/design-source";

const page = `export default function Page() {
  return (
    <main className="min-h-screen bg-white">
      <h1 className="text-5xl font-bold text-gray-900">
        Simple, honest pricing
      </h1>
      <p className="text-gray-500">Start free.</p>
      <p className="text-gray-500">Upgrade later.</p>
      <Button className={cn("px-4", active && "bg-blue-600")}>Go</Button>
    </main>
  );
}
`;
const files = { "app/page.tsx": page, "components/ui/button.tsx": '<p className="text-gray-500">Start free.</p>', "README.md": "" };

describe("findElementSource", () => {
  it("finds an element by its classes, in any order", () => {
    const found = findElementSource(files, { tag: "h1", className: "font-bold text-gray-900 text-5xl", text: "Simple, honest pricing" });
    expect(found.path).toBe("app/page.tsx");
    expect(found.element.text).toBe("Simple, honest pricing");
  });

  it("uses the text when several elements share the classes, and skips components/ui", () => {
    const found = findElementSource(files, { tag: "p", className: "text-gray-500", text: "Upgrade later." });
    expect(found.path).toBe("app/page.tsx");
    expect(found.element.text).toBe("Upgrade later.");
  });

  it("reports elements it cannot locate unambiguously", () => {
    expect(findElementSource(files, { tag: "button", className: "px-4 bg-blue-600", text: "Go" })).toEqual({ matches: 0 });
    expect(findElementSource(files, { tag: "p", className: "text-gray-500", text: null })).toEqual({ matches: 2 });
  });
});

describe("applyElementEdit", () => {
  it("changes only that element's text and classes, keeping indentation", () => {
    const { element } = findElementSource(files, { tag: "h1", className: "text-5xl font-bold text-gray-900", text: "Simple, honest pricing" });
    const updated = applyElementEdit(page, element, { className: "text-6xl font-bold text-blue-600", text: "Fair pricing" });
    expect(updated).toContain(`<h1 className="text-6xl font-bold text-blue-600">\n        Fair pricing\n      </h1>`);
    expect(updated).toContain(`<p className="text-gray-500">Start free.</p>`);
    expect(updated.length).toBeLessThan(page.length);
  });
});

describe("Tailwind style groups", () => {
  it("reads and replaces one group, leaving prefixed classes alone", () => {
    const classes = "text-5xl md:text-7xl font-bold text-gray-900 hover:text-gray-700";
    expect(readStyle(classes, "textColor")).toBe("text-gray-900");
    expect(readStyle(classes, "fontSize")).toBe("text-5xl");
    expect(writeStyle(classes, "textColor", "text-blue-600")).toBe("text-5xl md:text-7xl font-bold hover:text-gray-700 text-blue-600");
    expect(writeStyle(classes, "fontWeight", "")).toBe("text-5xl md:text-7xl text-gray-900 hover:text-gray-700");
  });

  it("treats Tailwind arbitrary values as part of their group", () => {
    const classes = "text-[38px] sm:text-[46px] font-extrabold text-[#111827] bg-[rgb(1,2,3)] p-[18px] rounded-[10px]";
    expect(readStyle(classes, "textColor")).toBe("text-[#111827]");
    expect(readStyle(classes, "fontSize")).toBe("text-[38px]");
    expect(readStyle(classes, "background")).toBe("bg-[rgb(1,2,3)]");
    expect(readStyle(classes, "padding")).toBe("p-[18px]");
    expect(readStyle(classes, "radius")).toBe("rounded-[10px]");
    expect(writeStyle(classes, "textColor", "text-blue-600")).toBe(
      "text-[38px] sm:text-[46px] font-extrabold bg-[rgb(1,2,3)] p-[18px] rounded-[10px] text-blue-600"
    );
  });
});
