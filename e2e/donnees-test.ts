// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Jeu de données fixe du test de bout en bout (Phase 12) : valeurs de saisie toutes constantes, jamais générées
// aléatoirement (exigence explicite de l'utilisateur), afin que le parcours reste strictement rejouable. Les
// membres et la dépendance utilisés dans les assertions correspondent au constat GitLab de repli enrichi à cette
// même phase (`CONSTAT_GITLAB_REPLI`, src/app/services/sansetat/commandes/bouchon/donnees-bouchon.ts), commun à
// toutes les sources créées par ce test (aucune n'existe dans le jeu de données d'exemple du bouchon).

export const MOT_DE_PASSE_FICHIER = 'TestE2E-Sqm-2026!';

export const GROUPE_A = {
  nom: 'Groupe E2E Alpha',
  description: 'Groupe créé par le test de bout en bout Playwright (Phase 12).',
  instanceGitlab: { nom: 'gitlab-e2e-alpha', urlBase: 'https://gitlab-e2e-alpha.exemple.test' },
  instanceSonar: { nom: 'sonar-e2e-alpha', urlBase: 'https://sonar-e2e-alpha.exemple.test' },
};

export const GROUPE_B = {
  nom: 'Groupe E2E Beta',
  description: 'Second groupe créé par le test de bout en bout Playwright (Phase 12).',
  instanceGitlab: { nom: 'gitlab-e2e-beta', urlBase: 'https://gitlab-e2e-beta.exemple.test' },
  instanceSonar: { nom: 'sonar-e2e-beta', urlBase: 'https://sonar-e2e-beta.exemple.test' },
};

export const PROJET_A1 = {
  nom: 'Projet E2E Alpha 1',
  description: 'Premier projet du groupe Alpha.',
};
export const PROJET_A2 = {
  nom: 'Projet E2E Alpha 2',
  description: 'Second projet du groupe Alpha.',
};
export const PROJET_B1 = {
  nom: 'Projet E2E Beta 1',
  description: 'Premier projet du groupe Beta.',
};
export const PROJET_B2 = { nom: 'Projet E2E Beta 2', description: 'Second projet du groupe Beta.' };

/** Identifiant externe GitLab/Sonar fixe par projet (jamais aléatoire), ref auditée fixe pour la source GitLab. */
export const SOURCES = {
  a1: {
    idExterneGitlab: 'e2e/projet-alpha-1',
    idExterneSonar: 'e2e:projet-alpha-1',
    refAuditee: 'main',
  },
  a2: {
    idExterneGitlab: 'e2e/projet-alpha-2',
    idExterneSonar: 'e2e:projet-alpha-2',
    refAuditee: 'main',
  },
  b1: {
    idExterneGitlab: 'e2e/projet-beta-1',
    idExterneSonar: 'e2e:projet-beta-1',
    refAuditee: 'main',
  },
  b2: {
    idExterneGitlab: 'e2e/projet-beta-2',
    idExterneSonar: 'e2e:projet-beta-2',
    refAuditee: 'main',
  },
};

/** Credential de test fixe, jamais un vrai secret (RG-004 : jamais persisté, mémoire de session uniquement). */
export const CREDENTIAL_TEST = 'jeton-e2e-facultatif-000000';

export const MEMBRE_QUALIFIE_ANTICIPATION = {
  critere: 'entreprise-e2e.fr',
  typeCritere: 'domaineEmail',
  statut: 'interne',
  libelle: 'Domaine interne E2E',
};

export const MEMBRE_A_QUALIFIER_DEPUIS_ALERTE = {
  username: 'kbenali-e2e',
  statut: 'partenaire',
};

export const REGLE_DEPENDANCE = {
  motif: 'org.exemple:lib-e2e',
  versionsInitiales: '1.0.*=obsolete',
  versionsRevues: '1.0.*=maintenu',
};

export const MARQUEUR_IA = {
  motif: '.env.e2e',
  outil: 'copilot-e2e',
};

export const REGLAGE_CONCURRENCE_AUDIT = 3;

export const SEUIL_VITALITE_MORT_JOURS = 400;
