import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.test.local") });

if (!process.env.DATABASE_URL?.includes("_test")) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL does not look like a test database. " +
      "Copy .env.test.example to .env.test.local and point it at a *_test database."
  );
}
