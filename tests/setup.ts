// Charge .env.test.local avant tout import de lib/db — les tests
// d'intégration nécessitant une base ont besoin de DATABASE_URL pointant vers
// une base de test dédiée, jamais vers une base de développement ou de
// production. Ce fichier n'est jamais commité (voir .gitignore) ; copier
// .env.test.example pour le créer localement.
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const testEnvPath = resolve(__dirname, "../.env.test.local");
if (existsSync(testEnvPath)) {
  config({ path: testEnvPath });
}
