// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Configuration Jest pour les tests unitaires Angular/TypeScript, mise en place lors du bootstrap du poste de
// développement (Phase 0 du plan de développement), conformément aux normes de tests du projet : Jest est retenu,
// jamais Karma/Jasmine (cf. docs/02_documentation/16_normesTests.md#tests-unitaires).
//
// Décision technique : le builder de test natif d'Angular CLI 21 (`@angular/build:unit-test`) ne propose que deux
// runners, Karma ou Vitest (aucun support natif de Jest à ce jour). Conformément à l'option de repli prévue par la
// consigne de cette phase, Jest est donc intégré via `jest-preset-angular` plutôt que via ce builder natif ; la
// commande `npm test` invoque directement Jest (et non `ng test`), le script `ng test` restant sans objet ici.
//
// Seuils de couverture : ils reprennent la stratégie de l'étape 11 (90 % pour le Moteur de jugement, 80 % pour le
// reste de la logique applicative de l'UI, aucun seuil chiffré pour les écrans/composants de présentation, cf.
// docs/02_documentation/16_normesTests.md#stratégie-de-couverture-de-code).
//
// Correction apportée en relecture (Phase 0) : la première version de ce fichier déclarait un seuil pour chacun des
// cinq périmètres (`jugement`, `campagne`, `etat`, `recherche`, `commandes`) même lorsque le dossier correspondant ne
// contient encore aucun fichier `.ts` réel (seul un `README.md` de structure y figure à ce stade). Or Jest fait
// échouer `--coverage` (donc le script `test:coverage`) dès qu'un motif de `coverageThreshold` ne correspond à aucun
// fichier de couverture collecté (« Coverage data for ... was not found »), contrairement à ce qu'affirmait le
// commentaire précédent : `npm test` seul n'échouait pas (couverture non collectée par défaut), mais `npm run
// test:coverage` échouait bel et bien dès aujourd'hui pour les périmètres encore vides. Le seuil de chaque périmètre
// n'est donc désormais déclaré que si ce périmètre contient déjà au moins un fichier `.ts` réel (hors spec) : il
// s'active alors automatiquement, sans modification de ce fichier, dès l'ajout des premiers fichiers réels sous les
// dossiers encore vides.
//
// La couverture n'est pas collectée par défaut (`collectCoverage: false`) : `npm test` reste rapide au quotidien ;
// la variante avec couverture est disponible via le script `test:coverage` (voir package.json).
//
// Chemins mis à jour le 2026-07-19 (relecture de la Phase 0) : les cinq dossiers ci-dessous sont désormais imbriqués
// sous `src/app/services/sansetat/` ou `src/app/services/avecetat/` selon leur caractère stateless/stateful, cf.
// docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches ; le contenu et les
// seuils de chaque périmètre restent inchangés.
const fs = require('node:fs');
const path = require('node:path');

/**
 * Périmètres de couverture de la stratégie de l'étape 11, avec leur seuil associé (cf. commentaire ci-dessus).
 */
const PERIMETRES_COUVERTURE = [
  { dossier: 'src/app/services/sansetat/jugement', seuil: 90 },
  { dossier: 'src/app/services/sansetat/commandes', seuil: 80 },
  { dossier: 'src/app/services/avecetat/campagne', seuil: 80 },
  { dossier: 'src/app/services/avecetat/etat', seuil: 80 },
  { dossier: 'src/app/services/avecetat/recherche', seuil: 80 },
];

/**
 * Indique si le dossier donné (relatif à la racine du dépôt) contient au moins un fichier `.ts` réel, hors fichier
 * de test (`.spec.ts`), condition nécessaire pour que Jest puisse évaluer un seuil de couverture sur ce périmètre
 * sans échouer faute de correspondance.
 * @param {string} dossierRelatif - Chemin du dossier, relatif à la racine du dépôt.
 * @returns {boolean} `true` si au moins un fichier `.ts` réel est présent.
 */
const contientAuMoinsUnFichierTypescriptReel = (dossierRelatif) => {
  const dossierAbsolu = path.join(__dirname, dossierRelatif);
  if (!fs.existsSync(dossierAbsolu)) {
    return false;
  }
  return fs
    .readdirSync(dossierAbsolu)
    .some((entree) => entree.endsWith('.ts') && !entree.endsWith('.spec.ts'));
};

const coverageThreshold = {};
for (const { dossier, seuil } of PERIMETRES_COUVERTURE) {
  if (contientAuMoinsUnFichierTypescriptReel(dossier)) {
    coverageThreshold[`./${dossier}/**/*.ts`] = {
      branches: seuil,
      functions: seuil,
      lines: seuil,
      statements: seuil,
    };
  }
}

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/src-tauri/'],
  collectCoverage: false,
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/*.routes.ts',
    '!src/app/**/*.config.ts',
  ],
  coverageThreshold,
};
