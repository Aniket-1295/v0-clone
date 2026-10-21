import { vi } from "vitest";

// Tests never touch the database; modules that import it get an empty stand-in.
vi.mock("@/lib/db", () => ({ default: {} }));
