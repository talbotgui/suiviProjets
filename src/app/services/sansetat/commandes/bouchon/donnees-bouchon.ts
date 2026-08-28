// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Jeu de données du bouchon TS des commandes d'interrogation GitLab/Sonar (`BouchonCommandesUtils`), utilisé hors
// contexte Tauri (`ng serve`) pour permettre le test manuel de l'interface sans cœur natif. Reprend telles quelles
// les valeurs de `docs/01_besoin/exemple-donnees.json` (dernier audit disponible par source, au 2026-07-28), par
// convention pour toute donnée par défaut non fixée par un texte normatif
// (cf. .claude/rules/09-normes-developpement.md#structure-et-nommage). Trois écarts assumés par rapport au fichier
// source, faute de valeur disponible pour toutes les sources, signalés comme décisions arbitraires à valider par un
// humain :
// - `sonar.dette` n'est renseigné dans le fichier source que pour une seule source (`api-facturation`) : une valeur
//   de repli forfaitaire est utilisée pour les trois autres sources Sonar ci-dessous ;
// - la liste de branches complète (`gitlab.branches`) n'est renseignée que pour une seule source (`1234`), le
//   groupe « Portail Nova » désactivant même cet indicateur (`indicateursDesactives`) : les autres sources
//   reçoivent une liste réduite à leur seule ref auditée (ou `main`/`master` à défaut) ;
// - `sonar.couverture.couvertureNouveauCode` vaut `null` dans le fichier source pour la source `api-portail`
//   (métrique `new_coverage` jamais calculée, aucune ligne de nouveau code) : le champ est simplement omis, la
//   propriété étant devenue optionnelle sur `ResultatSonarCouverture` (correction de bug du 2026-08-27).
//
// Évolution du 2026-08-02 (US-008, RG-036) : `SOURCES_DISPONIBLES_PAR_INSTANCE`, jeu de données du bouchon de
// `listerSourcesDisponibles`, reprend les identifiants externes déjà attachés dans
// `docs/01_besoin/exemple-donnees.json` (mêmes valeurs que `SOURCE_ID_PAR_ID_EXTERNE_GITLAB`/`_SONAR` de
// `bouchon-commandes.utils.ts`), complétés d'un dépôt/projet supplémentaire non encore attaché par instance, afin
// de montrer que la liste ne se limite pas aux seules sources déjà en place.
import type {
  Branche,
  Contributeur,
  MembreGitlab,
  MergeRequestOuverte,
  Marqueur,
  Dependance,
  ResultatSonarCouverture,
  ResultatSonarDette,
  ResultatSonarNcloc,
  ResultatSonarNotes,
  ResultatSonarViolations,
  SourceDisponible,
} from '../types-facade';

/**
 * Constat GitLab brut du bouchon pour une source, avant enveloppe `{ sourceId, refEffective, shaTete, ... }` :
 * cette dernière est reconstituée par `BouchonCommandesUtils` à partir des paramètres reçus (le bouchon ne connaît
 * `sourceId` qu'au moment de l'appel, jamais figé dans ce jeu de données).
 */
export interface ConstatGitlabBouchon {
  readonly refEffective: string;
  readonly shaTete: string;
  readonly dernierCommitLe: string;
  readonly tailleOctets: number;
  readonly contributeurs: readonly Contributeur[];
  readonly mrOuvertes: readonly MergeRequestOuverte[];
  readonly membres: readonly MembreGitlab[];
  readonly marqueurs: readonly Marqueur[];
  readonly dependances: readonly Dependance[];
  readonly branches: readonly Branche[];
  readonly branchesAutocompletion: readonly string[];
}

/**
 * Constat Sonar brut du bouchon pour une source, avant application de l'aléatoire (cf. `BouchonCommandesUtils`) et
 * avant enveloppe `{ sourceId, ... }`.
 */
export interface ConstatSonarBouchon {
  readonly violations: ResultatSonarViolations['parSeverite'];
  readonly nouvellesViolations: number;
  readonly dette: Omit<ResultatSonarDette, 'sourceId'>;
  readonly couverture: Omit<ResultatSonarCouverture, 'sourceId'>;
  readonly notes: Omit<ResultatSonarNotes, 'sourceId'>;
  readonly ncloc: Omit<ResultatSonarNcloc, 'sourceId'>;
  readonly derniereAnalyseLe: string | null;
}

/** Valeur de repli forfaitaire de `sonar.dette`, absente du fichier source pour trois des quatre sources Sonar. */
const DETTE_REPLI: Omit<ResultatSonarDette, 'sourceId'> = { detteMinutes: 12000, ratioDette: 3.0 };

/** Constats GitLab du bouchon, indexés par `Source.id` (`docs/01_besoin/exemple-donnees.json#groupes[].projets[].sources[]`). */
export const CONSTATS_GITLAB_BOUCHON: ReadonlyMap<string, ConstatGitlabBouchon> = new Map<
  string,
  ConstatGitlabBouchon
>([
  [
    'f0000000-0000-4000-8000-000000000001', // API Facturation
    {
      refEffective: 'develop',
      shaTete: '3fa2b91c',
      dernierCommitLe: '2026-07-08',
      tailleOctets: 52411002,
      contributeurs: [
        { email: 'marie.durand@entreprise.fr', nom: 'Marie Durand', nombreCommits: 42 },
        { email: 'julien.petit@entreprise.fr', nom: 'Julien Petit', nombreCommits: 17 },
        { email: 'a.lopez@presta-dev.io', nom: 'Ana Lopez', nombreCommits: 8 },
      ],
      mrOuvertes: [
        {
          iid: 214,
          titre: 'Paiement SEPA',
          creeLe: '2026-06-20',
          enConflit: false,
          webUrl: 'https://gitlab.entreprise.fr/finance/api-facturation/-/merge_requests/214',
        },
        {
          iid: 209,
          titre: 'Refonte mapping tiers',
          creeLe: '2026-04-02',
          enConflit: true,
          webUrl: 'https://gitlab.entreprise.fr/finance/api-facturation/-/merge_requests/209',
        },
      ],
      membres: [
        {
          username: 'mdurand',
          nom: 'Marie Durand',
          niveauAcces: 40,
          direct: true,
          groupesInvites: [],
        },
        {
          username: 'jpetit',
          nom: 'Julien Petit',
          niveauAcces: 30,
          direct: true,
          groupesInvites: [],
        },
        {
          username: 'alopez-ext',
          nom: 'Ana Lopez',
          niveauAcces: 30,
          direct: false,
          groupesInvites: [],
        },
      ],
      marqueurs: [],
      dependances: [
        { reference: 'java', version: '21', manifeste: 'pom.xml' },
        { reference: 'org.springframework:spring-core', version: '6.1.8', manifeste: 'pom.xml' },
        {
          reference: 'org.apache.logging.log4j:log4j-core',
          version: '2.17.1',
          manifeste: 'pom.xml',
        },
        {
          reference: 'com.fasterxml.jackson.core:jackson-databind',
          version: '2.17.1',
          manifeste: 'pom.xml',
        },
      ],
      branches: [
        { nom: 'develop', avecMR: false, dernierCommitLe: '2026-07-08' },
        { nom: 'feature/paiement-sepa', avecMR: true, dernierCommitLe: '2026-07-08' },
        { nom: 'wip-test-julien', avecMR: false, dernierCommitLe: '2026-02-11' },
      ],
      branchesAutocompletion: ['develop', 'feature/paiement-sepa', 'wip-test-julien'],
    },
  ],
  [
    'f0000000-0000-4000-8000-000000000003', // Batch Comptable
    {
      refEffective: 'main',
      shaTete: '77aa19d0',
      dernierCommitLe: '2026-06-05',
      tailleOctets: 9834122,
      contributeurs: [
        { email: 'marie.durand@entreprise.fr', nom: 'Marie Durand', nombreCommits: 55 },
      ],
      mrOuvertes: [],
      membres: [
        {
          username: 'mdurand',
          nom: 'Marie Durand',
          niveauAcces: 40,
          direct: false,
          groupesInvites: [],
        },
      ],
      marqueurs: [],
      dependances: [
        { reference: 'java', version: '17', manifeste: 'pom.xml' },
        {
          reference: 'org.springframework.boot:spring-boot-starter-batch',
          version: '3.2.5',
          manifeste: 'pom.xml',
        },
        { reference: 'org.apache.struts:struts2-core', version: '2.5.30', manifeste: 'pom.xml' },
      ],
      branches: [{ nom: 'main', avecMR: false, dernierCommitLe: '2026-06-05' }],
      branchesAutocompletion: ['main'],
    },
  ],
  [
    'f0000000-0000-4000-8000-000000000005', // Référentiel Tiers (gelé)
    {
      refEffective: 'master',
      shaTete: 'b2c3d4e5',
      dernierCommitLe: '2024-11-03',
      tailleOctets: 3120440,
      contributeurs: [],
      mrOuvertes: [
        {
          iid: 45,
          titre: 'Montée Spring 5',
          creeLe: '2024-09-12',
          enConflit: true,
          webUrl: 'https://gitlab.entreprise.fr/legacy/referentiel-tiers/-/merge_requests/45',
        },
      ],
      membres: [
        {
          username: 'jpetit',
          nom: 'Julien Petit',
          niveauAcces: 40,
          direct: false,
          groupesInvites: [],
        },
      ],
      marqueurs: [],
      dependances: [
        { reference: 'java', version: '8', manifeste: 'pom.xml' },
        { reference: 'org.springframework:spring-core', version: '4.3.30', manifeste: 'pom.xml' },
        { reference: 'log4j:log4j', version: '1.2.17', manifeste: 'pom.xml' },
      ],
      branches: [{ nom: 'master', avecMR: false, dernierCommitLe: '2024-11-03' }],
      branchesAutocompletion: ['master'],
    },
  ],
  [
    'f0000000-0000-4000-8000-000000000006', // Front Portail
    {
      refEffective: 'develop',
      shaTete: '9e8f7a6b',
      dernierCommitLe: '2026-07-08',
      tailleOctets: 156700900,
      contributeurs: [
        { email: 'sofia.martin@entreprise.fr', nom: 'Sofia Martin', nombreCommits: 61 },
        { email: 'k.benali@nova-corp.com', nom: 'Karim Benali', nombreCommits: 24 },
      ],
      mrOuvertes: [
        {
          iid: 88,
          titre: 'Dashboard client v2',
          creeLe: '2026-07-01',
          enConflit: false,
          webUrl: 'https://gitlab.entreprise.fr/portail-nova/front-portail/-/merge_requests/88',
        },
      ],
      membres: [
        {
          username: 'smartin',
          nom: 'Sofia Martin',
          niveauAcces: 40,
          direct: true,
          groupesInvites: [],
        },
        {
          username: 'kbenali',
          nom: 'Karim Benali',
          niveauAcces: 30,
          direct: true,
          groupesInvites: [],
        },
      ],
      marqueurs: [
        { chemin: 'CLAUDE.md', nature: 'fichier', outil: 'claude' },
        { chemin: '.claude', nature: 'repertoire', outil: 'claude' },
        { chemin: '.mcp.json', nature: 'fichier', outil: 'claude' },
      ],
      dependances: [
        { reference: '@angular/core', version: '18.2.1', manifeste: 'package.json' },
        { reference: 'rxjs', version: '7.8.1', manifeste: 'package.json' },
        { reference: 'moment', version: '2.29.4', manifeste: 'package.json' },
      ],
      // Indicateur `gitlab.branches` désactivé pour le groupe « Portail Nova » (`indicateursDesactives`).
      branches: [{ nom: 'develop', avecMR: false, dernierCommitLe: '2026-07-08' }],
      branchesAutocompletion: ['develop'],
    },
  ],
  [
    'f0000000-0000-4000-8000-000000000008', // API Portail
    {
      refEffective: 'main',
      shaTete: 'c4d5e6f7',
      dernierCommitLe: '2026-06-05',
      tailleOctets: 18220000,
      contributeurs: [
        { email: 'k.benali@nova-corp.com', nom: 'Karim Benali', nombreCommits: 19 },
        { email: 'dev.mystere@gmail.com', nom: 'dmx', nombreCommits: 6 },
      ],
      mrOuvertes: [
        {
          iid: 31,
          titre: 'Auth OIDC',
          creeLe: '2026-05-14',
          enConflit: true,
          webUrl: 'https://gitlab.entreprise.fr/portail-nova/api-portail/-/merge_requests/31',
        },
        {
          iid: 29,
          titre: 'Rate limiting',
          creeLe: '2026-03-02',
          enConflit: true,
          webUrl: 'https://gitlab.entreprise.fr/portail-nova/api-portail/-/merge_requests/29',
        },
        {
          iid: 34,
          titre: 'Logs structurés',
          creeLe: '2026-06-28',
          enConflit: false,
          webUrl: 'https://gitlab.entreprise.fr/portail-nova/api-portail/-/merge_requests/34',
        },
      ],
      membres: [
        {
          username: 'kbenali',
          nom: 'Karim Benali',
          niveauAcces: 40,
          direct: true,
          groupesInvites: [],
        },
        { username: 'dmx-dev', nom: 'dmx', niveauAcces: 40, direct: true, groupesInvites: [] },
      ],
      marqueurs: [{ chemin: '.cursorrules', nature: 'fichier', outil: 'cursor' }],
      dependances: [
        { reference: 'express', version: '4.18.2', manifeste: 'package.json' },
        { reference: 'lodash', version: '4.17.21', manifeste: 'package.json' },
      ],
      branches: [{ nom: 'main', avecMR: false, dernierCommitLe: '2026-06-05' }],
      branchesAutocompletion: ['main'],
    },
  ],
  [
    'f0000000-0000-4000-8000-000000000010', // Mobile Nova
    {
      refEffective: 'main',
      shaTete: 'd5e6f7a8',
      dernierCommitLe: '2026-06-05',
      tailleOctets: 5400200,
      contributeurs: [
        { email: 'sofia.martin@entreprise.fr', nom: 'Sofia Martin', nombreCommits: 12 },
      ],
      mrOuvertes: [],
      membres: [
        {
          username: 'smartin',
          nom: 'Sofia Martin',
          niveauAcces: 50,
          direct: true,
          groupesInvites: [],
        },
      ],
      marqueurs: [],
      dependances: [
        {
          reference: 'com.squareup.retrofit2:retrofit',
          version: '2.11.0',
          manifeste: 'build.gradle',
        },
      ],
      branches: [{ nom: 'main', avecMR: false, dernierCommitLe: '2026-06-05' }],
      branchesAutocompletion: ['main'],
    },
  ],
]);

/** Constats Sonar du bouchon, indexés par `Source.id`. */
export const CONSTATS_SONAR_BOUCHON: ReadonlyMap<string, ConstatSonarBouchon> = new Map<
  string,
  ConstatSonarBouchon
>([
  [
    'f0000000-0000-4000-8000-000000000002', // API Facturation
    {
      violations: { bloquant: 2, critique: 11, majeur: 88, mineur: 240, info: 31 },
      nouvellesViolations: 3,
      dette: { detteMinutes: 13980, ratioDette: 3.1 },
      couverture: { couverture: 64.8, couvertureNouveauCode: 82.5 },
      notes: { fiabilite: 2.0, securite: 2.0, maintenabilite: 2.0, revueSecurite: 2.0 },
      ncloc: { ncloc: 86950, parLangage: { java: 82100, xml: 4410, js: 440 } },
      derniereAnalyseLe: '2026-07-08',
    },
  ],
  [
    'f0000000-0000-4000-8000-000000000004', // Batch Comptable
    {
      violations: { bloquant: 1, critique: 22, majeur: 130, mineur: 310, info: 12 },
      nouvellesViolations: 18,
      dette: DETTE_REPLI,
      couverture: { couverture: 38.4, couvertureNouveauCode: 22.0 },
      notes: { fiabilite: 3.0, securite: 3.0, maintenabilite: 4.0, revueSecurite: 3.0 },
      ncloc: { ncloc: 21400, parLangage: { java: 21400 } },
      derniereAnalyseLe: '2026-06-05',
    },
  ],
  [
    'f0000000-0000-4000-8000-000000000007', // Front Portail
    {
      violations: { bloquant: 0, critique: 3, majeur: 41, mineur: 120, info: 9 },
      nouvellesViolations: 1,
      dette: DETTE_REPLI,
      couverture: { couverture: 72.6, couvertureNouveauCode: 88.1, duplicationNouveauCode: 1.4 },
      notes: { fiabilite: 1.0, securite: 2.0, maintenabilite: 1.0, revueSecurite: 1.0 },
      ncloc: { ncloc: 44300, parLangage: { ts: 39800, html: 3200, css: 1300 } },
      derniereAnalyseLe: '2026-07-08',
    },
  ],
  [
    'f0000000-0000-4000-8000-000000000009', // API Portail
    {
      violations: { bloquant: 2, critique: 8, majeur: 55, mineur: 90, info: 4 },
      nouvellesViolations: 0,
      dette: DETTE_REPLI,
      // `couvertureNouveauCode` vaut `null` dans le fichier source pour cette source (métrique `new_coverage`
      // jamais calculée) : champ omis, cf. en-tête de fichier.
      couverture: { couverture: 51.0 },
      notes: { fiabilite: 2.0, securite: 4.0, maintenabilite: 3.0, revueSecurite: 4.0 },
      ncloc: { ncloc: 15800, parLangage: { ts: 15800 } },
      derniereAnalyseLe: '2026-04-19',
    },
  ],
]);

/**
 * Constat Sonar de repli, utilisé quand une source inconnue du jeu de données ci-dessus est interrogée (ex. projet
 * créé pendant la session de test manuel plutôt qu'importé du jeu de données d'exemple) : valeurs médianes
 * plausibles plutôt qu'une erreur, pour ne pas interrompre le parcours de test manuel.
 */
export const CONSTAT_SONAR_REPLI: ConstatSonarBouchon = {
  violations: { bloquant: 0, critique: 2, majeur: 20, mineur: 50, info: 5 },
  nouvellesViolations: 1,
  dette: DETTE_REPLI,
  couverture: { couverture: 60.0, couvertureNouveauCode: 70.0 },
  notes: { fiabilite: 2.0, securite: 2.0, maintenabilite: 2.0, revueSecurite: 2.0 },
  ncloc: { ncloc: 10000, parLangage: { autre: 10000 } },
  derniereAnalyseLe: null,
};

/**
 * Constat GitLab de repli, utilisé quand une source inconnue du jeu de données ci-dessus est interrogée (ex.
 * projet créé pendant une session de test manuel, ou par le test de bout en bout Playwright de la Phase 12).
 *
 * Enrichi à la Phase 12 (décision explicite de l'utilisateur : « le bouchon est enrichi pour permettre à ce test
 * de passer ») d'un membre déjà qualifiable par anticipation (`mdurand-e2e`, domaine `entreprise-e2e.fr`) et d'un
 * second membre volontairement laissé inconnu (`kbenali-e2e`, sans domaine reconnu) pour produire une alerte
 * « membre inconnu » exploitable par le parcours E2E, ainsi que d'une dépendance (`org.exemple:lib-e2e`)
 * exploitable par une règle de dépendances créée par ce même parcours. Toutes les sources créées par ce test
 * partagent ce même constat de repli (aucune n'est présente dans {@link CONSTATS_GITLAB_BOUCHON} ci-dessus) :
 * valeurs volontairement identiques sur les quatre projets, sans conséquence pour un parcours qui ne compare pas
 * les projets entre eux sur ce point.
 */
export const CONSTAT_GITLAB_REPLI: ConstatGitlabBouchon = {
  refEffective: 'main',
  shaTete: '00000000',
  dernierCommitLe: '2026-07-01',
  tailleOctets: 1000000,
  contributeurs: [
    { email: 'mdurand@entreprise-e2e.fr', nom: 'Marie Durand E2E', nombreCommits: 12 },
    { email: 'kbenali@externe-e2e.fr', nom: 'Karim Benali E2E', nombreCommits: 4 },
  ],
  mrOuvertes: [],
  membres: [
    {
      username: 'mdurand-e2e',
      nom: 'Marie Durand E2E',
      niveauAcces: 40,
      direct: true,
      groupesInvites: [],
      emailPublic: 'mdurand@entreprise-e2e.fr',
    },
    {
      username: 'kbenali-e2e',
      nom: 'Karim Benali E2E',
      niveauAcces: 40,
      direct: true,
      groupesInvites: [],
      emailPublic: 'kbenali@externe-e2e.fr',
    },
    // US-017 : un membre issu d'un groupe invité au projet et un membre hérité de l'arborescence, pour que les
    // trois sections repliables de la Fiche projet soient non vides pendant le test manuel et le parcours E2E.
    {
      username: 'ninvite-e2e',
      nom: 'Noé Invité E2E',
      niveauAcces: 30,
      direct: false,
      groupesInvites: ['e2e-alpha/equipe-transverse'],
    },
    {
      username: 'hherite-e2e',
      nom: 'Hana Héritée E2E',
      niveauAcces: 20,
      direct: false,
      groupesInvites: [],
    },
  ],
  marqueurs: [],
  dependances: [{ reference: 'org.exemple:lib-e2e', version: '1.0.0', manifeste: 'pom.xml' }],
  branches: [{ nom: 'main', avecMR: false, dernierCommitLe: '2026-07-01' }],
  branchesAutocompletion: ['main'],
};

/**
 * Dépôts GitLab et projets Sonar disponibles du bouchon de `listerSourcesDisponibles` (US-008, RG-036, ajouté le
 * 2026-08-02), indexés par `Instance.id` (`docs/01_besoin/exemple-donnees.json#groupes[].instances[]`) : non triés
 * ici, le tri alphabétique insensible à la casse (RG-036) est appliqué par `BouchonCommandesUtils`, sur le même
 * principe que le cœur natif.
 */
export const SOURCES_DISPONIBLES_PAR_INSTANCE: ReadonlyMap<string, readonly SourceDisponible[]> =
  new Map([
    [
      'b0000000-0000-4000-8000-000000000001', // gitlab-prod (groupe Socle Comptable)
      [
        { idExterne: '1234', libelle: 'entreprise/api-facturation' },
        { idExterne: '1567', libelle: 'entreprise/batch-comptable' },
        { idExterne: '402', libelle: 'entreprise/referentiel-tiers' },
        { idExterne: '77', libelle: 'entreprise/outil-interne' },
      ],
    ],
    [
      'b0000000-0000-4000-8000-000000000002', // sonar-core (groupe Socle Comptable)
      [
        { idExterne: 'entreprise:api-facturation', libelle: 'API Facturation' },
        { idExterne: 'entreprise:batch-comptable', libelle: 'Batch Comptable' },
        { idExterne: 'entreprise:referentiel-tiers', libelle: 'Référentiel Tiers' },
      ],
    ],
    [
      'b0000000-0000-4000-8000-000000000003', // gitlab-nova (groupe Portail Nova)
      [
        { idExterne: '88', libelle: 'nova/front-portail' },
        { idExterne: '91', libelle: 'nova/api-portail' },
        { idExterne: '104', libelle: 'nova/mobile-nova' },
        { idExterne: '120', libelle: 'nova/legacy-batch' },
      ],
    ],
    [
      'b0000000-0000-4000-8000-000000000004', // sonar-nova (groupe Portail Nova)
      [
        { idExterne: 'nova:front-portail', libelle: 'Front Portail' },
        { idExterne: 'nova:api-portail', libelle: 'API Portail' },
        { idExterne: 'nova:mobile-nova', libelle: 'Mobile Nova' },
      ],
    ],
  ]);
