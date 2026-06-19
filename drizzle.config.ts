import path from "node:path";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: `file:${path.resolve(process.cwd(), "sqlite.db")}`,
  },
});
