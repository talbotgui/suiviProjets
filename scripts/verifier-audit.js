// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Croise la sortie JSON de `cargo audit --json`/`npm audit --json` avec le fichier d'exceptions versionné
// unique `audit-exceptions.json` (Phase 14, cf. docs/02_documentation/15_normesSecurite.md#analyse-des-dépendances-vulnérables) :
// échoue (code de sortie 1) si une vulnérabilité critique/élevée n'y figure pas.
//
// Usage :
//   cargo audit --json | node scripts/verifier-audit.js --ecosysteme cargo
//   npm audit --json   | node scripts/verifier-audit.js --ecosysteme npm
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const indexArgument = process.argv.indexOf('--ecosysteme');
const ecosysteme = indexArgument !== -1 ? process.argv[indexArgument + 1] : undefined;

if (ecosysteme !== 'cargo' && ecosysteme !== 'npm') {
  console.error('Usage : <commande audit> --json | node scripts/verifier-audit.js --ecosysteme <cargo|npm>');
  process.exit(2);
}

const rapport = JSON.parse(fs.readFileSync(0, 'utf8'));
const cheminExceptions = path.join(__dirname, '..', 'audit-exceptions.json');
const exceptions = JSON.parse(fs.readFileSync(cheminExceptions, 'utf8')).exceptions;
const exceptionsEcosysteme = exceptions.filter((exception) => exception.ecosysteme === ecosysteme);
const aujourdhui = new Date().toISOString().slice(0, 10);

/**
 * Restitue, pour l'écosystème npm, les vulnérabilités de gravité critique ou élevée rapportées par
 * `npm audit --json` (schéma npm 7+ : objet `vulnerabilities` indexé par nom de paquet).
 */
function extraireVulnerabilitesNpm() {
  return Object.values(rapport.vulnerabilities ?? {})
    .filter((vulnerabilite) => vulnerabilite.severity === 'critical' || vulnerabilite.severity === 'high')
    .map((vulnerabilite) => ({
      id: vulnerabilite.name,
      paquet: vulnerabilite.name,
      gravite: vulnerabilite.severity,
    }));
}

/**
 * Restitue les vulnérabilités rapportées par `cargo audit --json`. cargo-audit ne fournissant pas
 * systématiquement un niveau de gravité CVSS fiable et uniforme selon les avis RUSTSEC, toute
 * vulnérabilité remontée est traitée comme bloquante par défaut (conservateur), sauf exception
 * documentée dans `audit-exceptions.json`.
 */
function extraireVulnerabilitesCargo() {
  return (rapport.vulnerabilities?.list ?? []).map((vulnerabilite) => ({
    id: vulnerabilite.advisory.id,
    paquet: vulnerabilite.package.name,
    gravite: 'critique/élevée (RUSTSEC, sans CVSS uniforme)',
  }));
}

const vulnerabilites = ecosysteme === 'npm' ? extraireVulnerabilitesNpm() : extraireVulnerabilitesCargo();

for (const exception of exceptionsEcosysteme) {
  if (exception.dateReevaluation < aujourdhui) {
    console.warn(
      `Exception ${ecosysteme}/${exception.id} (${exception.paquet}) : date de réévaluation dépassée (${exception.dateReevaluation}), à revoir.`,
    );
  }
}

const nonCouvertes = vulnerabilites.filter(
  (vulnerabilite) =>
    !exceptionsEcosysteme.some(
      (exception) => exception.id === vulnerabilite.id && exception.paquet === vulnerabilite.paquet,
    ),
);

if (nonCouvertes.length > 0) {
  console.error(`Vulnérabilités ${ecosysteme} critiques/élevées non couvertes par une exception documentée :`);
  for (const vulnerabilite of nonCouvertes) {
    console.error(`  - ${vulnerabilite.id} (${vulnerabilite.paquet}, ${vulnerabilite.gravite})`);
  }
  process.exit(1);
}

console.log(`Aucune vulnérabilité ${ecosysteme} bloquante non couverte par une exception.`);
