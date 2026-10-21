import { describe, expect, it } from "vitest";
import { extractError, routesToCheck } from "@/inngest/check-app";

describe("routesToCheck", () => {
  it("checks / plus static pages written in the run, at most 3", () => {
    expect(
      routesToCheck([
        "app/page.tsx",
        "app/about/page.tsx",
        "app/(marketing)/pricing/page.tsx",
        "app/blog/[slug]/page.tsx",
        "components/x.tsx",
        "/home/user/app/contact/page.jsx",
      ])
    ).toEqual(["/", "/about", "/pricing"]);
  });
});

// Shapes taken from real Next 16 dev error pages in the sandbox.
describe("extractError", () => {
  it("reads build errors such as Module not found", () => {
    const html = String.raw`..."source":"server","message":"./app/page.tsx:1:1\nModule not found: Can't resolve '@/components/nope'\n> 1 | import X from \"@/components/nope\";","stack":"Error: ./app/page.tsx:1:1...`;
    expect(extractError(html)).toBe(`./app/page.tsx:1:1\nModule not found: Can't resolve '@/components/nope'\n> 1 | import X from "@/components/nope";`);
  });

  it("reads errors thrown while server rendering", () => {
    const html = `2b:E{"digest":"1","name":"TypeError","message":"Cannot read properties of undefined (reading 'y')","stack":[["Page"]]}`;
    expect(extractError(html)).toBe("TypeError: Cannot read properties of undefined (reading 'y')");
  });

  it("reads client components that crash during server rendering", () => {
    const html = `<template data-next-error-message="Cannot read properties of null (reading &#x27;name&#x27;)" data-next-error-stack="TypeError: Cannot read properties of null (reading &#x27;name&#x27;)\n    at Page"></template>`;
    expect(extractError(html)).toBe("TypeError: Cannot read properties of null (reading 'name')");
  });

  it("returns null for a page without an error", () => {
    expect(extractError("<html><body><h1>Hello</h1></body></html>")).toBeNull();
  });
});
