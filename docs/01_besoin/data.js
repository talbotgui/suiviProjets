// Jeu de données d'exemple (dérivé du fichier fourni) + calcul des indicateurs
// à partir des constats bruts et des seuils/référentiels courants.
// Principe : "le constat est stocké, le jugement est calculé".

export const AUJOURDHUI = new Date('2026-07-09T09:00:00Z');

export const parametres = {
  seuils: {
    vitalite: { mourantJours: 180, mortJours: 365 },
    tailleDepot: { borneS: 20000000, borneL: 100000000, borneXL: 500000000 },
    couverture: { seuilRouge: 40.0, seuilOrange: 60.0 },
    fraicheurSonar: { toleranceJours: 7 },
    fraicheurAudit: { ancienJours: 30 },
    mrOuvertes: { ageOrangeJours: 30, ageRougeJours: 90, pourcentageConflitRouge: 50.0 },
    couleursViolations: {
      bloquant: { seuilOrange: 1, seuilRouge: 3 },
      critique: { seuilOrange: 10, seuilRouge: 25 },
    },
  },
};

function joursDepuis(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Math.round((AUJOURDHUI - d) / 86400000);
}

export function statutVitalite(dernierCommitLe) {
  const j = joursDepuis(dernierCommitLe);
  if (j === null) return { label: '—', niveau: 'neutre' };
  const s = parametres.seuils.vitalite;
  if (j > s.mortJours) return { label: 'Mort', niveau: 'rouge', jours: j };
  if (j > s.mourantJours) return { label: 'Mourant', niveau: 'orange', jours: j };
  return { label: 'Vivant', niveau: 'vert', jours: j };
}

export function classeTaille(octets) {
  const s = parametres.seuils.tailleDepot;
  if (octets < s.borneS) return 'S';
  if (octets < s.borneL) return 'L';
  if (octets < s.borneXL) return 'XL';
  return 'XXL';
}

export function statutCouverture(pct) {
  if (pct === null || pct === undefined) return { label: '—', niveau: 'neutre' };
  const s = parametres.seuils.couverture;
  if (pct < s.seuilRouge) return { label: pct.toFixed(1) + '%', niveau: 'rouge' };
  if (pct < s.seuilOrange) return { label: pct.toFixed(1) + '%', niveau: 'orange' };
  return { label: pct.toFixed(1) + '%', niveau: 'vert' };
}

const LETTRES = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' };
const NIVEAU_LETTRE = { A: 'vert', B: 'vert', C: 'orange', D: 'rouge', E: 'rouge' };
export function noteLettre(n) {
  if (!n) return { lettre: '—', niveau: 'neutre' };
  const lettre = LETTRES[Math.round(n)] || '—';
  return { lettre, niveau: NIVEAU_LETTRE[lettre] || 'neutre' };
}

export function statutViolations(bloquant, critique) {
  const s = parametres.seuils.couleursViolations;
  const nivB = bloquant >= s.bloquant.seuilRouge ? 'rouge' : bloquant >= s.bloquant.seuilOrange ? 'orange' : 'vert';
  const nivC = critique >= s.critique.seuilRouge ? 'rouge' : critique >= s.critique.seuilOrange ? 'orange' : 'vert';
  return { nivB, nivC };
}

export function statutFraicheurSonar(dernierCommitLe, derniereAnalyseLe, aucuneAnalyse, pasDeSource) {
  if (pasDeSource) return { ko: false, na: true, label: 'Pas de source Sonar' };
  if (aucuneAnalyse || !derniereAnalyseLe) return { ko: true, na: false, label: 'Aucune analyse Sonar' };
  const ecart = Math.round((new Date(dernierCommitLe) - new Date(derniereAnalyseLe)) / 86400000);
  const tol = parametres.seuils.fraicheurSonar.toleranceJours;
  if (ecart > tol) return { ko: true, na: false, label: `SONAR_KO — écart ${ecart} j (commit ${dernierCommitLe} / analyse ${derniereAnalyseLe})` };
  return { ko: false, na: false, label: `À jour — écart ${ecart} j` };
}

export function statutMR(mrOuvertes) {
  if (!mrOuvertes || mrOuvertes.length === 0) return { niveau: 'neutre', label: 'Aucune', ageMax: 0, pctConflit: 0 };
  const s = parametres.seuils.mrOuvertes;
  const ages = mrOuvertes.map(mr => joursDepuis(mr.creeLe));
  const ageMax = Math.max(...ages);
  const nbConflit = mrOuvertes.filter(mr => mr.enConflit).length;
  const pctConflit = Math.round((nbConflit / mrOuvertes.length) * 100);
  let niveau = 'vert';
  if (ageMax > s.ageRougeJours || pctConflit >= s.pourcentageConflitRouge) niveau = 'rouge';
  else if (ageMax > s.ageOrangeJours || nbConflit > 0) niveau = 'orange';
  return { niveau, label: `${mrOuvertes.length} ouverte(s), ${nbConflit} en conflit`, ageMax, pctConflit, nbConflit, total: mrOuvertes.length };
}

// Résout le statut d'un membre selon la précédence username > email > domaine.
export function statutMembre(membre, contexteGroupe) {
  const regles = contexteGroupe.membresConnus;
  const parUsername = regles.find(r => r.typeCritere === 'username' && r.critere === membre.username);
  if (parUsername) return { statut: parUsername.statut, libelle: parUsername.libelle };
  const email = membre.emailPublic || membre.emailDeduit;
  if (email) {
    const parEmail = regles.find(r => r.typeCritere === 'email' && r.critere === email);
    if (parEmail) return { statut: parEmail.statut, libelle: parEmail.libelle };
    const domaine = '*@' + email.split('@')[1];
    const parDomaine = regles.find(r => r.typeCritere === 'domaineEmail' && r.critere === domaine);
    if (parDomaine) return { statut: parDomaine.statut, libelle: null };
  }
  return { statut: 'inconnu', libelle: null };
}

export function statutDependance(dep, regles) {
  const regle = regles.find(r => {
    if (r.motif.includes('*')) {
      const prefix = r.motif.replace('*', '');
      return dep.reference.startsWith(prefix);
    }
    return r.motif === dep.reference;
  });
  if (!regle) return { statut: 'nonClasse', label: 'Non classé' };
  const v = regle.versions.find(v => {
    if (v.motifVersion === '*') return true;
    const prefix = v.motifVersion.replace('*', '');
    return dep.version.startsWith(prefix);
  });
  if (!v) return { statut: 'nonClasse', label: 'Non classé' };
  const labels = { obsolete: 'Obsolète', maintenu: 'Maintenu', aJourM3: 'À jour M-3', aJourM1: 'À jour M-1' };
  return { statut: v.statut, label: labels[v.statut] || v.statut };
}

// ---------------------------------------------------------------------------
// Référentiels
export const reglesDependances = [
  { motif: 'org.springframework:*', versions: [{ motifVersion: '4.*', statut: 'obsolete' }, { motifVersion: '5.3.*', statut: 'maintenu' }, { motifVersion: '6.1.*', statut: 'aJourM1' }] },
  { motif: 'log4j:log4j', versions: [{ motifVersion: '*', statut: 'obsolete' }] },
  { motif: 'org.apache.logging.log4j:*', versions: [{ motifVersion: '2.17.*', statut: 'maintenu' }, { motifVersion: '2.23.*', statut: 'aJourM1' }] },
  { motif: 'org.apache.struts:*', versions: [{ motifVersion: '*', statut: 'obsolete' }] },
  { motif: '@angular/*', versions: [{ motifVersion: '16.*', statut: 'maintenu' }, { motifVersion: '17.*', statut: 'aJourM3' }, { motifVersion: '18.*', statut: 'aJourM1' }] },
  { motif: 'moment', versions: [{ motifVersion: '*', statut: 'obsolete' }] },
];

// ---------------------------------------------------------------------------
// Groupes / projets (données condensées)
export const groupes = [
  {
    id: 'g1', nom: 'Socle Comptable',
    instances: [{ nom: 'gitlab-prod', type: 'gitlab' }, { nom: 'sonar-core', type: 'sonar' }],
    membresConnus: [
      { critere: '*@entreprise.fr', typeCritere: 'domaineEmail', statut: 'interne' },
      { critere: 'mdurand', typeCritere: 'username', statut: 'interne', libelle: 'Marie Durand' },
      { critere: 'jpetit', typeCritere: 'username', statut: 'interne', libelle: 'Julien Petit' },
      { critere: 'alopez-ext', typeCritere: 'username', statut: 'partenaire', libelle: 'Ana Lopez (Presta-Dev)' },
    ],
  },
  {
    id: 'g2', nom: 'Portail Nova',
    instances: [{ nom: 'gitlab-nova', type: 'gitlab' }, { nom: 'sonar-nova', type: 'sonar' }],
    membresConnus: [
      { critere: '*@entreprise.fr', typeCritere: 'domaineEmail', statut: 'interne' },
      { critere: '*@nova-corp.com', typeCritere: 'domaineEmail', statut: 'client' },
      { critere: 'smartin', typeCritere: 'username', statut: 'interne', libelle: 'Sofia Martin' },
      { critere: 'kbenali', typeCritere: 'username', statut: 'client', libelle: 'Karim Benali (Nova Corp)' },
    ],
  },
];

export const projets = [
  {
    id: 'p1', groupeId: 'g1', nom: 'API Facturation', description: 'API centrale de facturation',
    iaAutorisee: false, premierCommitInterne: '2021-03-15',
    dernierAudit: '2026-07-08', auditsCount: 2, campagneEchec: false,
    refAuditee: 'develop',
    dernierCommitLe: '2026-07-08', tailleOctets: 52411002,
    dependances: [
      { reference: 'org.springframework:spring-core', version: '6.1.8' },
      { reference: 'org.apache.logging.log4j:log4j-core', version: '2.17.1' },
      { reference: 'com.fasterxml.jackson.core:jackson-databind', version: '2.17.1' },
    ],
    membres: [
      { username: 'mdurand', nom: 'Marie Durand', niveauAcces: 40 },
      { username: 'jpetit', nom: 'Julien Petit', niveauAcces: 30 },
      { username: 'alopez-ext', nom: 'Ana Lopez', niveauAcces: 30, herite: true },
    ],
    marqueursIA: [],
    mrOuvertes: [
      { iid: 214, titre: 'Paiement SEPA', creeLe: '2026-06-20', enConflit: false },
      { iid: 209, titre: 'Refonte mapping tiers', creeLe: '2026-04-02', enConflit: true },
    ],
    sonar: { violations: { bloquant: 2, critique: 11, majeur: 88, mineur: 240 }, couverture: 64.8, couvertureNouveauCode: 82.5, notes: { fiabilite: 2, securite: 2, maintenabilite: 2, revueSecurite: 2 }, ncloc: 86950, derniereAnalyseLe: '2026-07-08' },
    pasDeSonar: false,
  },
  {
    id: 'p2', groupeId: 'g1', nom: 'Batch Comptable', description: 'Traitements de nuit comptables',
    iaAutorisee: false, premierCommitInterne: '2019-09-02',
    dernierAudit: '2026-06-05', auditsCount: 1, campagneEchec: false, campagneIgnore: true,
    refAuditee: 'main',
    dernierCommitLe: '2026-06-05', tailleOctets: 9834122,
    dependances: [
      { reference: 'org.springframework.boot:spring-boot-starter-batch', version: '3.2.5' },
      { reference: 'org.apache.struts:struts2-core', version: '2.5.30' },
    ],
    membres: [{ username: 'mdurand', nom: 'Marie Durand', niveauAcces: 40, herite: true }],
    marqueursIA: [],
    mrOuvertes: [],
    sonar: { violations: { bloquant: 1, critique: 22, majeur: 130, mineur: 310 }, couverture: 38.4, couvertureNouveauCode: 22.0, notes: { fiabilite: 3, securite: 3, maintenabilite: 4, revueSecurite: 3 }, ncloc: 21400, derniereAnalyseLe: '2026-06-05' },
    pasDeSonar: false,
  },
  {
    id: 'p3', groupeId: 'g1', nom: 'Référentiel Tiers', description: "Ancien référentiel des tiers — candidat au décommissionnement",
    iaAutorisee: false, premierCommitInterne: '2016-01-20',
    dernierAudit: '2026-06-05', auditsCount: 1, campagneEchec: false,
    refAuditee: 'master',
    dernierCommitLe: '2024-11-03', tailleOctets: 3120440,
    dependances: [
      { reference: 'org.springframework:spring-core', version: '4.3.30' },
      { reference: 'log4j:log4j', version: '1.2.17' },
    ],
    membres: [{ username: 'jpetit', nom: 'Julien Petit', niveauAcces: 40, herite: true }],
    marqueursIA: [],
    mrOuvertes: [{ iid: 45, titre: 'Montée Spring 5', creeLe: '2024-09-12', enConflit: true }],
    sonar: null, pasDeSonar: true,
  },
  {
    id: 'p4', groupeId: 'g2', nom: 'Front Portail', description: 'Front Angular du portail client',
    iaAutorisee: true, iaAutoriseeDepuis: '2026-05-20', premierCommitInterne: '2023-06-12',
    dernierAudit: '2026-07-08', auditsCount: 2, campagneEchec: false,
    refAuditee: 'develop',
    dernierCommitLe: '2026-07-08', tailleOctets: 156700900,
    dependances: [
      { reference: '@angular/core', version: '18.2.1' },
      { reference: 'rxjs', version: '7.8.1' },
      { reference: 'moment', version: '2.29.4' },
    ],
    membres: [
      { username: 'smartin', nom: 'Sofia Martin', niveauAcces: 40 },
      { username: 'kbenali', nom: 'Karim Benali', niveauAcces: 30 },
    ],
    marqueursIA: [{ chemin: 'CLAUDE.md', nature: 'fichier', outil: 'claude' }, { chemin: '.claude', nature: 'répertoire', outil: 'claude' }, { chemin: '.mcp.json', nature: 'fichier', outil: 'claude' }],
    mrOuvertes: [{ iid: 88, titre: 'Dashboard client v2', creeLe: '2026-07-01', enConflit: false }],
    sonar: { violations: { bloquant: 0, critique: 3, majeur: 41, mineur: 120 }, couverture: 72.6, couvertureNouveauCode: 88.1, notes: { fiabilite: 1, securite: 2, maintenabilite: 1, revueSecurite: 1 }, ncloc: 44300, derniereAnalyseLe: '2026-07-08' },
    pasDeSonar: false,
  },
  {
    id: 'p5', groupeId: 'g2', nom: 'API Portail', description: 'Backend Node du portail',
    iaAutorisee: false, premierCommitInterne: '2023-08-01',
    dernierAudit: '2026-06-05', auditsCount: 1, campagneEchec: true,
    campagneEchecMotif: "HTTP 401 Unauthorized sur GET /api/authentication/validate — le token de sonar-nova semble expiré.",
    refAuditee: 'main',
    dernierCommitLe: '2026-06-05', tailleOctets: 18220000,
    dependances: [
      { reference: 'express', version: '4.18.2' },
      { reference: 'lodash', version: '4.17.21' },
    ],
    membres: [
      { username: 'kbenali', nom: 'Karim Benali', niveauAcces: 40 },
      { username: 'dmx-dev', nom: 'dmx', niveauAcces: 40, emailDeduit: 'dev.mystere@gmail.com' },
    ],
    marqueursIA: [{ chemin: '.cursorrules', nature: 'fichier', outil: 'cursor' }],
    mrOuvertes: [
      { iid: 31, titre: 'Auth OIDC', creeLe: '2026-05-14', enConflit: true },
      { iid: 29, titre: 'Rate limiting', creeLe: '2026-03-02', enConflit: true },
      { iid: 34, titre: 'Logs structurés', creeLe: '2026-06-28', enConflit: false },
    ],
    sonar: { violations: { bloquant: 2, critique: 8, majeur: 55, mineur: 90 }, couverture: 51.0, couvertureNouveauCode: null, notes: { fiabilite: 2, securite: 4, maintenabilite: 3, revueSecurite: 4 }, ncloc: 15800, derniereAnalyseLe: '2026-04-19' },
    pasDeSonar: false,
  },
  {
    id: 'p6', groupeId: 'g2', nom: 'Mobile Nova', description: "Application mobile Android — pas encore de projet Sonar",
    iaAutorisee: false, premierCommitInterne: '2026-02-10',
    dernierAudit: '2026-06-05', auditsCount: 1, campagneEchec: false,
    refAuditee: 'main',
    dernierCommitLe: '2026-06-05', tailleOctets: 5400200,
    dependances: [{ reference: 'com.squareup.retrofit2:retrofit', version: '2.11.0' }],
    membres: [{ username: 'smartin', nom: 'Sofia Martin', niveauAcces: 50 }],
    marqueursIA: [],
    mrOuvertes: [],
    sonar: null, pasDeSonar: true,
  },
];

export function groupeDe(projet) {
  return groupes.find(g => g.id === projet.groupeId);
}

export function membresAvecStatut(projet) {
  const g = groupeDe(projet);
  return projet.membres.map(m => ({ ...m, ...statutMembre(m, g) }));
}
