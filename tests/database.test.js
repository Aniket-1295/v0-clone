import { describe, expect, it } from "vitest";
import {
  buildDatabaseNote,
  parsePostgresUrl,
  publicDatabase,
  publicHost,
  shapeTables,
} from "@/lib/database";

describe("parsePostgresUrl", () => {
  it("trims a valid postgres URL", () => {
    expect(parsePostgresUrl("  postgresql://u:p@db.example.com/app  ")).toEqual({
      url: "postgresql://u:p@db.example.com/app",
    });
  });

  it("rejects empty or missing values", () => {
    expect(parsePostgresUrl("").error).toMatch(/Enter a Postgres/);
    expect(parsePostgresUrl("   ").error).toMatch(/Enter a Postgres/);
    expect(parsePostgresUrl(null).error).toMatch(/Enter a Postgres/);
  });

  it("rejects non-strings, bad URLs and the wrong scheme", () => {
    expect(parsePostgresUrl(12).error).toMatch(/must be text/);
    expect(parsePostgresUrl("not a url").error).toMatch(/not a valid URL/);
    expect(parsePostgresUrl("mysql://db.example.com/app").error).toMatch(/postgres/);
    expect(parsePostgresUrl("postgresql:///nohost").error).toMatch(/host/);
  });
});

describe("publicHost and publicDatabase", () => {
  it("returns the hostname and database name", () => {
    const url = "postgresql://u:p@ep-cool.neon.tech/neondb?sslmode=require";
    expect(publicHost(url)).toBe("ep-cool.neon.tech");
    expect(publicDatabase(url)).toBe("neondb");
  });

  it("returns empty strings for garbage", () => {
    expect(publicHost("nope")).toBe("");
    expect(publicDatabase("nope")).toBe("");
  });
});

describe("shapeTables", () => {
  it("groups information_schema rows", () => {
    const { tables } = shapeTables([
      { table_schema: "public", table_name: "users", column_name: "id", data_type: "uuid" },
      { table_schema: "public", table_name: "users", column_name: "email", data_type: "text" },
      { table_schema: "app", table_name: "posts", column_name: "title", data_type: "text" },
    ]);
    expect(tables).toHaveLength(2);
    expect(tables[0]).toEqual({
      schema: "public",
      name: "users",
      columns: [
        { name: "id", type: "uuid" },
        { name: "email", type: "text" },
      ],
    });
    expect(tables[1].name).toBe("posts");
  });
});

describe("buildDatabaseNote", () => {
  it("returns nothing when there are no tables", () => {
    expect(buildDatabaseNote([])).toBe("");
    expect(buildDatabaseNote(null)).toBe("");
  });

  it("lists tables and columns without the URL", () => {
    const note = buildDatabaseNote([
      { schema: "public", name: "users", columns: [{ name: "id" }, { name: "email" }] },
      { schema: "app", name: "posts", columns: [{ name: "title" }] },
    ]);
    expect(note).toContain("users (id, email)");
    expect(note).toContain("app.posts (title)");
    expect(note).toContain("process.env.DATABASE_URL");
    expect(note).toContain("do not override the file-safety");
    expect(note).not.toContain("postgres");
  });
});
