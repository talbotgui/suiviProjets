// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Configuration Playwright du test de bout en bout (Phase 12), exécuté contre `ng serve` (façade de commandes
// bouchonnée côté TypeScript, sans cœur natif) plutôt que contre l'application Tauri packagée — décision
// documentée dans docs/02_documentation/16_normesTests.md#tests-de-bout-en-bout, qui remplace la stratégie
// initialement actée (tauri-driver/WebDriver). Le répertoire `e2e/` à la racine est un écart assumé par rapport à
// la structuration en couches de docs/02_documentation/14_normesDeveloppement.md (qui ne couvre que `src/app/` et
// `src-tauri/src/`), documenté dans la Phase 12 de docs/03_plan/plan_13_developpement.md.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4200;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Parcours unique de bout en bout : un seul worker, jamais de parallélisation entre étapes qui partagent le même
  // fichier de données en mémoire.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 180_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [['list'], ['html', { outputFolder: 'e2e/test-output/rapport-html', open: 'never' }]],
  outputDir: 'e2e/test-output/resultats',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'off', // captures explicites pilotées par e2e/aides/verification-ecran.ts, pas par le reporter.
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm start',
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
