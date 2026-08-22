// Test de l'écran Fiche projet (cf. fiche-projet.component.ts, US-017, RG-006 à RG-011, RG-013, RG-016), généré
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';
import { toPng } from 'html-to-image';
import { SqmModaleSaisieMasseComponent } from '../../composants/modale-saisie-masse/modale-saisie-masse.component';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import {
  StatutMembre,
  TypeCritereMembre,
  TypeSource,
} from '../../services/avecetat/etat/types-donnees';
import type {
  Audit,
  DonneesRacine,
  Groupe,
  Projet,
} from '../../services/avecetat/etat/types-donnees';
import { TypeInstance } from '../../services/sansetat/commandes/types-facade';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmFicheProjetComponent } from './fiche-projet.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));
jest.mock('html-to-image', () => ({ toPng: jest.fn() }));

/**
 * Composant factice utilisé comme cible des routes de test (cf. `SqmShellComponent`/`SqmSyntheseAuditsComponent`,
 * même motif) : seul son enregistrement importe, jamais son rendu.
 */
@Component({ selector: 'app-composant-factice', template: '' })
class ComposantFactice {}

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction hors
 * classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Formate une date de référence décalée d'un nombre de jours (négatif = dans le passé) en ISO 8601.
   * @param decalageJours - Décalage en jours par rapport à maintenant (négatif = passé).
   * @returns La date ISO 8601 correspondante.
   */
  public static ilYA(decalageJours: number): string {
    return new Date(Date.now() + decalageJours * JOUR_MS).toISOString();
  }

  /**
   * Construit un audit complet consommé par la Fiche projet, personnalisable par les options fournies.
   * @param options - Valeurs personnalisées de l'audit de test.
   * @param options.derniereAnalyseLe - Date de la dernière analyse Sonar (`croise.fraicheur_sonar`).
   * @param options.dernierCommitLe - Date du dernier commit constaté.
   * @param options.niveauAccesInconnu - Niveau d'accès GitLab du membre inconnu `inconnu1` (RG-010, 40 = gravité
   * élevée par défaut).
   * @returns L'audit de test.
   */
  public static auditComplet(options: {
    readonly derniereAnalyseLe?: string;
    readonly dernierCommitLe?: string;
    readonly niveauAccesInconnu?: number;
  }): Audit {
    const dernierCommitLe = options.dernierCommitLe ?? DonneesDeTest.ilYA(-2);
    return {
      id: 'audit-1',
      date: DonneesDeTest.ilYA(-1),
      campagneId: 'campagne-1',
      typeAudit: 'reguliere',
      resultats: [
        {
          type: 'gitlab.dependances',
          sourceId: 'source-gitlab',
          refEffective: 'develop',
          shaTete: 'abc123',
          dependances: [
            {
              reference: 'org.springframework:spring-core',
              version: '5.3.30',
              manifeste: 'pom.xml',
            },
            { reference: 'moment', version: '2.29.0', manifeste: 'package.json' },
            { reference: 'inconnue:lib', version: '1.0.0', manifeste: 'package.json' },
          ],
        },
        {
          type: 'gitlab.membres',
          sourceId: 'source-gitlab',
          refEffective: 'develop',
          shaTete: 'abc123',
          membres: [
            { username: 'jdupont', nom: 'Jean Dupont', niveauAcces: 30, herite: false },
            {
              username: 'inconnu1',
              nom: 'Inconnu Un',
              niveauAcces: options.niveauAccesInconnu ?? 40,
              herite: false,
            },
          ],
        },
        {
          type: 'gitlab.marqueurs_ia',
          sourceId: 'source-gitlab',
          refEffective: 'develop',
          shaTete: 'abc123',
          marqueurs: [],
        },
        {
          type: 'gitlab.taille_depot',
          sourceId: 'source-gitlab',
          refEffective: 'develop',
          shaTete: 'abc123',
          tailleOctets: 30_000_000,
        },
        {
          type: 'gitlab.merge_requests',
          sourceId: 'source-gitlab',
          refEffective: 'develop',
          shaTete: 'abc123',
          mrOuvertes: [
            {
              iid: 1,
              titre: 'Ajout fonctionnalité',
              creeLe: DonneesDeTest.ilYA(-5),
              enConflit: false,
              webUrl: 'https://gitlab.exemple.test/groupe/projet/-/merge_requests/1',
            },
          ],
        },
        {
          type: 'sonar.couverture',
          sourceId: 'source-sonar',
          couverture: 55,
          couvertureNouveauCode: 60,
        },
        {
          type: 'sonar.notes',
          sourceId: 'source-sonar',
          fiabilite: 2,
          securite: 1,
          maintenabilite: 3,
          revueSecurite: 1,
        },
        {
          type: 'sonar.violations',
          sourceId: 'source-sonar',
          parSeverite: { bloquant: 0, critique: 2, majeur: 1, mineur: 0, info: 0 },
          nouvellesViolations: 0,
        },
        {
          type: 'croise.fraicheur_sonar',
          dernierCommitLe,
          derniereAnalyseLe: options.derniereAnalyseLe ?? dernierCommitLe,
          aucuneAnalyse: false,
        },
      ],
    };
  }

  /**
   * Construit un projet de test complet (sources, annotations, premier commit interne).
   * @param id - Identifiant du projet.
   * @param audits - Historique des audits du projet.
   * @param iaAutorisee - Politique d'autorisation de l'IA du projet.
   * @returns Le projet de test.
   */
  public static projet(id: string, audits: readonly Audit[], iaAutorisee = false): Projet {
    return {
      id,
      nom: 'Projet Test',
      description: 'Une description de test.',
      iaAutorisee,
      premierCommitInterne: {
        date: '2021-01-01',
        sha: 'abcdef1',
        emailAuteur: 'julien.petit@entreprise.fr',
        calculeLe: '2026-01-01',
        empreinteReferentiel: 'sha256:test',
        statut: 'determine',
      },
      sources: [
        {
          id: 'source-gitlab',
          instanceId: 'instance-gitlab',
          type: TypeSource.DepotGitlab,
          idExterne: '1234',
          refAuditee: 'develop',
        },
      ],
      annotations: [
        { id: 'annotation-1', date: '2026-04-01', libelle: 'Jalon', categorie: 'jalon' },
      ],
      audits,
    };
  }

  /**
   * Construit une racine de test avec un groupe et un projet uniques, avec les référentiels de dépendances requis
   * pour exercer `StatutObsolescenceUtils`.
   * @param projet - Projet de test à insérer dans le groupe.
   * @param campagnes - Traces d'exécution des campagnes, vide par défaut.
   * @param journal - Journal des modifications, vide par défaut.
   * @returns La racine de test.
   */
  public static racine(
    projet: Projet,
    campagnes: DonneesRacine['campagnes'] = [],
    journal: DonneesRacine['journal'] = [],
  ): DonneesRacine {
    const groupe: Groupe = {
      id: 'groupe-1',
      nom: 'Groupe Test',
      description: '',
      instances: [
        {
          id: 'instance-gitlab',
          type: TypeInstance.Gitlab,
          nom: 'GitLab',
          urlBase: 'https://gitlab.test',
        },
      ],
      membresConnus: [
        {
          id: 'membre-connu-1',
          critere: 'jdupont',
          typeCritere: TypeCritereMembre.Username,
          statut: StatutMembre.Interne,
        },
      ],
      annotations: [],
      indicateursDesactives: [],
      projets: [projet],
    };
    return {
      versionSchema: 1,
      meta: {
        creeLe: '2026-07-20T08:00:00Z',
        modifieLe: '2026-07-20T08:00:00Z',
        application: 'Test',
      },
      groupes: [groupe],
      referentiels: {
        reglesDependances: [
          {
            id: 'regle-dependance-1',
            motif: 'org.springframework:*',
            versions: [
              { motifVersion: '4.*', statut: 'obsolete' },
              { motifVersion: '5.3.*', statut: 'maintenu' },
            ],
          },
          {
            id: 'regle-dependance-2',
            motif: 'moment',
            versions: [{ motifVersion: '*', statut: 'obsolete' }],
          },
        ],
        reglesMarqueursIA: [],
        motifNommageBranches: '',
      },
      parametres: {
        seuils: {
          vitalite: { mourantJours: 180, mortJours: 365 },
          tailleDepot: { borneS: 20_000_000, borneL: 100_000_000, borneXL: 500_000_000 },
          couverture: { seuilRouge: 40, seuilOrange: 60 },
          fraicheurSonar: { toleranceJours: 7 },
          activiteSansQualite: { minCommits: 20, minNouvellesViolations: 10 },
          fraicheurAudit: { ancienJours: 30 },
          mrOuvertes: { ageOrangeJours: 30, ageRougeJours: 90, pourcentageConflitRouge: 50 },
          couleursViolations: {
            bloquant: { seuilOrange: 1, seuilRouge: 3 },
            critique: { seuilOrange: 1, seuilRouge: 5 },
          },
          materialiteBrouillon: { variationRelative: 0.1 },
        },
        verrouillage: { delaiInactiviteMinutes: 15, echecsAvantFermeture: 5 },
        audit: { concurrence: 4 },
        proxy: {},
        sauvegarde: { nombreSauvegardesSecurite: 5 },
        seuilAvertissementTailleOctets: 10_485_760,
      },
      campagnes,
      brouillon: null,
      traitementsAlertes: [],
      journal,
      vuesEnregistrees: [],
    };
  }
}

describe('SqmFicheProjetComponent', () => {
  beforeEach(async () => {
    jest.mocked(invoke).mockReset();
    jest.mocked(toPng).mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmFicheProjetComponent],
      providers: [provideRouter([{ path: '**', component: ComposantFactice }])],
    }).compileComponents();
  });

  /**
   * Crée et initialise un fixture du composant, avec la racine fournie chargée dans le Store.
   * @param projetId - Identifiant du projet à afficher.
   * @param racine - Racine à charger avant le rendu, `undefined` pour ne charger aucun fichier.
   * @returns Le fixture prêt à l'emploi.
   */
  function creerFixture(
    projetId: string,
    racine?: DonneesRacine,
  ): ComponentFixture<SqmFicheProjetComponent> {
    const donneesApplication = TestBed.inject(DonneesApplicationService);
    if (racine !== undefined) {
      donneesApplication.chargerRacine(racine);
    }
    const fixture = TestBed.createComponent(SqmFicheProjetComponent);
    fixture.componentRef.setInput('projetId', projetId);
    fixture.detectChanges();
    return fixture;
  }

  /**
   * Construit un audit dérivé de `DonneesDeTest.auditComplet`, avec la liste de dépendances du résultat
   * `gitlab.dependances` remplacée par celle fournie (US-043 : jeux de test nécessitant davantage de dépendances
   * non référencées que le jeu de test par défaut).
   * @param dependances - Dépendances à substituer au résultat `gitlab.dependances` par défaut.
   * @returns L'audit de test avec ses dépendances remplacées, tous les autres résultats inchangés.
   */
  function auditAvecDependances(
    dependances: readonly {
      readonly reference: string;
      readonly version: string;
      readonly manifeste: string;
    }[],
  ): Audit {
    const audit = DonneesDeTest.auditComplet({});
    return {
      ...audit,
      resultats: audit.resultats.map((resultat) =>
        resultat.type === 'gitlab.dependances' ? { ...resultat, dependances } : resultat,
      ),
    };
  }

  /**
   * Construit six dépendances distinctes, non couvertes par aucune règle du référentiel de test
   * (`DonneesDeTest.racine`), pour les tests du seuil de déclenchement du lien « Créer des règles en masse »
   * (RG-040 : plus de cinq).
   * @param nombre - Nombre de dépendances distinctes à construire.
   * @returns Les dépendances construites (`pkg1`, `pkg2`, ...).
   */
  function dependancesNonReferencees(nombre: number): readonly {
    readonly reference: string;
    readonly version: string;
    readonly manifeste: string;
  }[] {
    return Array.from({ length: nombre }, (_, index) => ({
      reference: `pkg${index + 1}`,
      version: '1.0.0',
      manifeste: 'package.json',
    }));
  }

  /**
   * Construit un audit dérivé de `DonneesDeTest.auditComplet`, avec la liste de membres du résultat
   * `gitlab.membres` remplacée par celle fournie (US-044 : jeux de test nécessitant davantage de membres
   * `inconnu` que le jeu de test par défaut).
   * @param membres - Membres à substituer au résultat `gitlab.membres` par défaut.
   * @returns L'audit de test avec ses membres remplacés, tous les autres résultats inchangés.
   */
  function auditAvecMembres(
    membres: readonly {
      readonly username: string;
      readonly nom: string;
      readonly niveauAcces: number;
      readonly herite: boolean;
    }[],
  ): Audit {
    const audit = DonneesDeTest.auditComplet({});
    return {
      ...audit,
      resultats: audit.resultats.map((resultat) =>
        resultat.type === 'gitlab.membres' ? { ...resultat, membres } : resultat,
      ),
    };
  }

  /**
   * Construit un nombre donné de membres distincts, strictement `inconnu` (aucune règle de membre connu du
   * groupe de test ne les couvre), pour les tests du seuil de déclenchement du lien « Créer des règles en masse »
   * (RG-041 : plus de cinq).
   * @param nombre - Nombre de membres distincts à construire.
   * @returns Les membres construits (`inconnu1`, `inconnu2`, ...).
   */
  function membresInconnus(nombre: number): readonly {
    readonly username: string;
    readonly nom: string;
    readonly niveauAcces: number;
    readonly herite: boolean;
  }[] {
    return Array.from({ length: nombre }, (_, index) => ({
      username: `inconnu${index + 1}`,
      nom: `Inconnu ${index + 1}`,
      niveauAcces: 30,
      herite: false,
    }));
  }

  it("affiche un message explicite quand aucun fichier n'est chargé (jamais un écran vide silencieux)", () => {
    const fixture = creerFixture('projet-1');
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain("Aucun fichier n'est actuellement chargé");
  });

  it('affiche un message explicite quand le projet est introuvable, avec un lien de retour', () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-inexistant', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('Projet introuvable');
    expect(element.querySelector('a[href="/synthese-audits"]')).not.toBeNull();
  });

  it("affiche le fil d'ariane, la description et la ref auditée", () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('Groupe Test');
    expect(element.textContent).toContain('Projet Test');
    expect(element.textContent).toContain('Une description de test.');
    expect(element.textContent).toContain('develop');
  });

  it(
    'sélectionne le dernier audit RÉGULIER comme audit affiché par défaut, jamais un audit historique même ' +
      'plus récemment intégré (C15-14, US-046, RG-046), et le liste séparément dans un encart dédié',
    () => {
      /**
       * Réplique locale de `SqmFicheProjetComponent.formaterDateCourte` (méthode privée, non testable
       * directement) : permet de comparer le libellé affiché sans dépendre d'un format de date écrit en dur,
       * insensible au fuseau horaire d'exécution du test (même méthode `new Date(...)` que le composant, dans
       * le même processus).
       * @param dateIso - Date ISO 8601 à mettre en forme.
       * @returns Le libellé court correspondant.
       */
      function formaterDateCourte(dateIso: string): string {
        const date = new Date(dateIso);
        const deuxChiffres = (valeur: number): string => valeur.toString().padStart(2, '0');
        return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
      }

      const auditRegulier = DonneesDeTest.auditComplet({});
      const dateCibleeHistorique = DonneesDeTest.ilYA(-30);
      const dateExecutionHistorique = DonneesDeTest.ilYA(0);
      const auditHistorique: Audit = {
        id: 'audit-historique-1',
        date: dateCibleeHistorique,
        campagneId: 'campagne-2',
        typeAudit: 'historique',
        dateExecution: dateExecutionHistorique,
        resultats: [],
      };
      // L'audit historique est intégré APRÈS l'audit régulier (dernier de `Projet.audits`) : un `.at(-1)` naïf
      // le sélectionnerait à tort comme « dernier audit » affiché par défaut.
      const projet = DonneesDeTest.projet('projet-1', [auditRegulier, auditHistorique]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      const element = DomTestUtils.obtenirElementNatif(fixture);

      // Isole la métadonnée « Dernier audit » du reste de la page (l'encart des audits historiques ci-dessous
      // contient légitimement la date ciblée historique, un simple `element.textContent` ne suffirait donc pas).
      const metadonneeDernierAudit = Array.from(
        element.querySelectorAll('.fiche-projet__metadonnee'),
      ).find((bloc) => bloc.textContent?.includes('Dernier audit'));
      expect(metadonneeDernierAudit?.textContent).toContain(formaterDateCourte(auditRegulier.date));
      expect(metadonneeDernierAudit?.textContent).not.toContain(
        formaterDateCourte(dateCibleeHistorique),
      );

      const encartHistorique = element.querySelector('.fiche-projet__audits-historiques');
      expect(encartHistorique).not.toBeNull();
      expect(encartHistorique?.textContent).toContain('Audits historiques (1)');
      expect(encartHistorique?.textContent).toContain(formaterDateCourte(dateCibleeHistorique));
      expect(encartHistorique?.textContent).toContain(formaterDateCourte(dateExecutionHistorique));
    },
  );

  it("n'affiche aucun encart d'audits historiques quand le projet n'en compte aucun", () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.querySelector('.fiche-projet__audits-historiques')).toBeNull();
  });

  it('affiche le lien direct vers le dépôt GitLab, avec un indice au survol signalant son caractère non contractuel (RG-045, C15-13)', () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const lien = element.querySelector<HTMLAnchorElement>('.fiche-projet__sources-externes a');
    expect(lien?.getAttribute('href')).toBe('https://gitlab.test/projects/1234');
    expect(lien?.textContent?.trim()).toBe('Dépôt GitLab');
    expect(lien?.getAttribute('title')).toContain("n'est pas garanti");
  });

  it('affiche également le lien direct vers le projet Sonar d’une source Sonar rattachée, sans indice au survol (RG-045, C15-13)', () => {
    const projetGitlab = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const projet: Projet = {
      ...projetGitlab,
      sources: [
        ...projetGitlab.sources,
        {
          id: 'source-sonar',
          instanceId: 'instance-sonar',
          type: TypeSource.ProjetSonar,
          idExterne: 'entreprise:api-facturation',
        },
      ],
    };
    const racine = DonneesDeTest.racine(projet);
    const racineAvecSonar: DonneesRacine = {
      ...racine,
      groupes: [
        {
          ...racine.groupes[0],
          instances: [
            ...racine.groupes[0].instances,
            {
              id: 'instance-sonar',
              type: TypeInstance.Sonar,
              nom: 'Sonar',
              urlBase: 'https://sonar.test',
            },
          ],
        },
      ],
    };
    const fixture = creerFixture('projet-1', racineAvecSonar);
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const liens = element.querySelectorAll<HTMLAnchorElement>('.fiche-projet__sources-externes a');
    expect(liens.length).toBe(2);
    expect(liens[1].getAttribute('href')).toBe(
      'https://sonar.test/dashboard?id=entreprise%3Aapi-facturation',
    );
    expect(liens[1].textContent?.trim()).toBe('Projet Sonar');
    expect(liens[1].getAttribute('title')).toBeNull();
  });

  it('ignore silencieusement une source dont l’instance de rattachement est introuvable, sans lien cassé (RG-045, C15-13)', () => {
    const projetGitlab = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const projet: Projet = {
      ...projetGitlab,
      sources: [{ ...projetGitlab.sources[0], instanceId: 'instance-inexistante' }],
    };
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.querySelector('.fiche-projet__sources-externes')).toBeNull();
  });

  it('affiche le badge membre inconnu en en-tête dès qu’un membre du dépôt est de statut inconnu (RG-006 à RG-009)', () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('Membre inconnu');
    expect(element.textContent).toContain('gravité elevee');
  });

  it(
    'distingue visuellement les deux niveaux de gravité de l’alerte membre inconnu, jamais par le seul texte ' +
      '(RG-010, R10-14)',
    () => {
      const projetGraviteElevee = DonneesDeTest.projet('projet-1', [
        DonneesDeTest.auditComplet({ niveauAccesInconnu: 40 }),
      ]);
      const fixtureElevee = creerFixture('projet-1', DonneesDeTest.racine(projetGraviteElevee));
      const elementElevee = DomTestUtils.obtenirElementNatif(fixtureElevee);
      const graviteElevee = elementElevee.querySelector('.fiche-projet__gravite');
      expect(graviteElevee?.textContent).toContain('gravité elevee');
      expect(graviteElevee?.classList.contains('fiche-projet__gravite--elevee')).toBe(true);
      expect(graviteElevee?.classList.contains('fiche-projet__gravite--moderee')).toBe(false);

      const projetGraviteModeree = DonneesDeTest.projet('projet-1', [
        DonneesDeTest.auditComplet({ niveauAccesInconnu: 20 }),
      ]);
      const fixtureModeree = creerFixture('projet-1', DonneesDeTest.racine(projetGraviteModeree));
      const elementModeree = DomTestUtils.obtenirElementNatif(fixtureModeree);
      const graviteModeree = elementModeree.querySelector('.fiche-projet__gravite');
      expect(graviteModeree?.textContent).toContain('gravité moderee');
      expect(graviteModeree?.classList.contains('fiche-projet__gravite--moderee')).toBe(true);
      expect(graviteModeree?.classList.contains('fiche-projet__gravite--elevee')).toBe(false);
    },
  );

  it(
    'affiche la réserve RG-016 explicitement pour un projet IA interdite sans marqueur détecté ' +
      '(« absence de preuve ≠ preuve d’absence »), jamais un simple badge conforme opaque',
    () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})], false);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.textContent).toContain('conforme sous réserve');
      expect(element.textContent).toContain("ne prouve pas l'absence d'usage réel");
      const badgeIa = element.querySelector('.fiche-projet__badges .badge');
      expect(badgeIa?.classList.contains('badge--bleu')).toBe(true);
      expect(badgeIa?.classList.contains('badge--orange')).toBe(false);
    },
  );

  it('grise les indicateurs Sonar avec une légende explicative quand SONAR_KO est actif (RG-013)', () => {
    const projet = DonneesDeTest.projet('projet-1', [
      DonneesDeTest.auditComplet({
        dernierCommitLe: DonneesDeTest.ilYA(0),
        derniereAnalyseLe: DonneesDeTest.ilYA(-60),
      }),
    ]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('SONAR_KO');
    expect(element.querySelector('.fiche-projet__bloc-sonar--grise')).not.toBeNull();
    expect(element.textContent).toContain('au-delà de');
  });

  it('affiche les dépendances avec leur statut d’obsolescence calculé (RG-011, jamais stocké)', () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('org.springframework:spring-core');
    expect(element.textContent).toContain('maintenu');
    expect(element.textContent).toContain('moment');
    expect(element.textContent).toContain('obsolète');
    expect(element.textContent).toContain('non référencé');
  });

  it(
    'propose, pour chaque dépendance, une action de copie rapide de sa référence dans le presse-papiers, avec ' +
      'confirmation visuelle explicite du succès de la copie (US-042)',
    async () => {
      const ecrireDansPressePapiers = jest
        .fn<Promise<void>, [string]>()
        .mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: ecrireDansPressePapiers },
        configurable: true,
      });
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      const element = DomTestUtils.obtenirElementNatif(fixture);

      const boutonCopie = element.querySelector<HTMLButtonElement>(
        'button[aria-label="Copier la référence org.springframework:spring-core"]',
      );
      expect(boutonCopie).not.toBeNull();

      boutonCopie?.click();
      await Promise.resolve();
      fixture.detectChanges();

      expect(ecrireDansPressePapiers).toHaveBeenCalledWith('org.springframework:spring-core');
      expect(element.textContent).toContain('Copié');
    },
  );

  it(
    'affiche un encart d’anomalie technique quand la dernière campagne a échoué, en conservant les ' +
      'indicateurs du dernier audit intégré (état particulier)',
    () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
      const campagnes: DonneesRacine['campagnes'] = [
        {
          id: 'campagne-echec',
          date: DonneesDeTest.ilYA(0),
          perimetre: ['projet-1'],
          verdicts: [
            {
              projetId: 'projet-1',
              statut: 'echec',
              anomalies: [
                {
                  indicateur: 'gitlab.membres',
                  sourceId: 'source-gitlab',
                  anomalie: { type: 'droitsInsuffisants', message: 'Statut HTTP 403 reçu' },
                },
              ],
            },
          ],
        },
      ];
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet, campagnes));
      const element = DomTestUtils.obtenirElementNatif(fixture);

      expect(element.querySelector('.fiche-projet__anomalie')).not.toBeNull();
      expect(element.textContent).toContain('a échoué pour ce projet');
      expect(element.textContent).toContain('Droits insuffisants');
      expect(element.textContent).toContain('Statut HTTP 403 reçu');
      // Les indicateurs du dernier audit intégré (couverture Sonar) restent affichés malgré l'échec.
      expect(element.textContent).toContain('55.0 %');
    },
  );

  it('n’affiche aucun encart d’anomalie quand la dernière campagne est un succès', () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const campagnes: DonneesRacine['campagnes'] = [
      {
        id: 'campagne-1',
        date: DonneesDeTest.ilYA(0),
        perimetre: ['projet-1'],
        verdicts: [{ projetId: 'projet-1', statut: 'succes' }],
      },
    ];
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet, campagnes));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.querySelector('.fiche-projet__anomalie')).toBeNull();
  });

  it(
    'propose un lien « Qualifier ce membre » vers Administration, pré-rempli du username faute ' +
      'd’email public (membre inconnu)',
    () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      const element = DomTestUtils.obtenirElementNatif(fixture);
      const lien = element.querySelector<HTMLAnchorElement>('a[href^="/administration?"]');
      expect(lien).not.toBeNull();
      expect(lien?.textContent).toContain('Qualifier ce membre');
      const params = new URLSearchParams(lien?.getAttribute('href')?.split('?')[1]);
      expect(params.get('groupeId')).toBe('groupe-1');
      expect(params.get('typeCritere')).toBe('username');
      expect(params.get('critere')).toBe('inconnu1');
    },
  );

  it(
    'pré-remplit le lien « Qualifier ce membre » avec le domaine de l’email public plutôt que le ' +
      'username, quand le membre inconnu en dispose',
    () => {
      const audit = DonneesDeTest.auditComplet({});
      const projet = DonneesDeTest.projet('projet-1', [
        {
          ...audit,
          resultats: audit.resultats.map((resultat) =>
            resultat.type === 'gitlab.membres'
              ? {
                  ...resultat,
                  membres: resultat.membres.map((membre) =>
                    membre.username === 'inconnu1'
                      ? { ...membre, emailPublic: 'inconnu1@exemple.fr' }
                      : membre,
                  ),
                }
              : resultat,
          ),
        },
      ]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      const element = DomTestUtils.obtenirElementNatif(fixture);
      const lien = element.querySelector<HTMLAnchorElement>('a[href^="/administration?"]');
      const params = new URLSearchParams(lien?.getAttribute('href')?.split('?')[1]);
      expect(params.get('typeCritere')).toBe('domaineEmail');
      expect(params.get('critere')).toBe('exemple.fr');
    },
  );

  it(
    'ne pré-remplit pas le lien « Qualifier ce membre » pour un membre en conflit de règles : seul le ' +
      'groupe est transmis, pour orienter vers la liste des règles existantes plutôt qu’une création',
    () => {
      const audit = DonneesDeTest.auditComplet({});
      const projet = DonneesDeTest.projet('projet-1', [
        {
          ...audit,
          resultats: audit.resultats.map((resultat) =>
            resultat.type === 'gitlab.membres'
              ? {
                  ...resultat,
                  membres: [
                    ...resultat.membres,
                    {
                      username: 'conflit1',
                      nom: 'Conflit Un',
                      niveauAcces: 40,
                      herite: false,
                      emailPublic: 'conflit1@exemple.fr',
                    },
                  ],
                }
              : resultat,
          ),
        },
      ]);
      const racineBase = DonneesDeTest.racine(projet);
      const racine: DonneesRacine = {
        ...racineBase,
        groupes: racineBase.groupes.map((groupe) => ({
          ...groupe,
          membresConnus: [
            ...groupe.membresConnus,
            {
              id: 'membre-connu-email',
              critere: 'conflit1@exemple.fr',
              typeCritere: TypeCritereMembre.Email,
              statut: StatutMembre.Interne,
            },
            {
              id: 'membre-connu-alias',
              critere: 'quelquun',
              typeCritere: TypeCritereMembre.Username,
              statut: StatutMembre.Client,
              aliasEmail: 'conflit1@exemple.fr',
            },
          ],
        })),
      };
      const fixture = creerFixture('projet-1', racine);
      const element = DomTestUtils.obtenirElementNatif(fixture);
      const liens = Array.from(
        element.querySelectorAll<HTMLAnchorElement>('a[href^="/administration?"]'),
      );
      const lienConflit = liens.find((lien) => {
        const params = new URLSearchParams(lien.getAttribute('href')?.split('?')[1]);
        return !params.has('critere');
      });
      expect(lienConflit).toBeDefined();
      const params = new URLSearchParams(lienConflit?.getAttribute('href')?.split('?')[1]);
      expect(params.get('groupeId')).toBe('groupe-1');
      expect(params.has('typeCritere')).toBe(false);
    },
  );

  it(
    'câble un lien vers la Comparaison entre deux audits (US-018, `ecrans/comparaison-audits/`) sans ' +
      'dépendance circulaire',
    () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      const element = DomTestUtils.obtenirElementNatif(fixture);
      const lien = element.querySelector('a[href="/comparaison-audits/projet-1"]');
      expect(lien).not.toBeNull();
    },
  );

  it('n’affiche que les entrées de journal concernant spécifiquement ce projet', () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const journal: DonneesRacine['journal'] = [
      {
        id: 'journal-1',
        horodatage: '2026-05-20T14:00:00Z',
        objet: 'projet:projet-1.iaAutorisee',
        avant: false,
        apres: true,
        origine: 'saisieManuelle',
      },
      {
        id: 'journal-2',
        horodatage: '2026-05-15T09:30:00Z',
        objet: 'parametres.seuils.vitalite.mortJours',
        avant: null,
        apres: 365,
        origine: 'saisieManuelle',
      },
    ];
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet, [], journal));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('projet:projet-1.iaAutorisee');
    expect(element.textContent).not.toContain('parametres.seuils.vitalite.mortJours');
  });

  it('affiche les marqueurs IA détectés et les merge requests ouvertes', () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('Ajout fonctionnalité');
  });

  it(
    'cumule les merge requests ouvertes de toutes les sources GitLab du projet, plutôt que de ne retenir que ' +
      'la première (R15-06)',
    () => {
      const audit = DonneesDeTest.auditComplet({});
      const projet = DonneesDeTest.projet('projet-1', [
        {
          ...audit,
          resultats: [
            ...audit.resultats,
            {
              type: 'gitlab.merge_requests',
              sourceId: 'source-gitlab-front',
              refEffective: 'develop',
              shaTete: 'def456',
              mrOuvertes: [
                {
                  iid: 1,
                  titre: 'Correction front',
                  creeLe: DonneesDeTest.ilYA(-3),
                  enConflit: false,
                  webUrl: 'https://gitlab.exemple.test/groupe/projet-front/-/merge_requests/1',
                },
              ],
            },
          ],
        },
      ]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.textContent).toContain('Ajout fonctionnalité');
      expect(element.textContent).toContain('Correction front');
      expect(element.textContent).toContain('2 · ok');
    },
  );

  it(
    "n'affiche pas le nom d'utilisateur entre parenthèses quand il est identique au nom affiché, et trie les " +
      'membres par ordre alphabétique de leur nom (R15-03)',
    () => {
      const audit = DonneesDeTest.auditComplet({});
      const projet = DonneesDeTest.projet('projet-1', [
        {
          ...audit,
          resultats: audit.resultats.map((resultat) =>
            resultat.type === 'gitlab.membres'
              ? {
                  ...resultat,
                  membres: [
                    { username: 'zdupont', nom: 'zdupont', niveauAcces: 30, herite: false },
                    { username: 'jdupont', nom: 'Jean Dupont', niveauAcces: 30, herite: false },
                  ],
                }
              : resultat,
          ),
        },
      ]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      const element = DomTestUtils.obtenirElementNatif(fixture);
      const lignes = Array.from(
        element.querySelectorAll('.fiche-projet__colonne li > span:first-child'),
      ).map((span) => span.textContent?.trim());
      expect(lignes[0]).toBe('Jean Dupont (jdupont)');
      expect(lignes[1]).toBe('zdupont');
    },
  );

  it(
    'exporterPng déclenche toPng sur le conteneur, provoque un téléchargement nommé ' +
      "fiche-projet-<nomProjet normalisé>-<horodatage complet>.png et confirme l'export (C15-15, RG-047)",
    async () => {
      jest.mocked(toPng).mockResolvedValue('data:image/png;base64,test');
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      let nomFichierTelecharge = '';
      const clicSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        nomFichierTelecharge = this.download;
      });

      await fixture.componentInstance.exporterPng();

      expect(toPng).toHaveBeenCalled();
      expect(clicSpy).toHaveBeenCalled();
      expect(nomFichierTelecharge).toMatch(
        /^fiche-projet-Projet-Test-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.png$/,
      );
      const notifications = TestBed.inject(NotificationService).liste();
      expect(notifications.length).toBe(1);
      expect(notifications[0]?.type).toBe('succes');
      expect(notifications[0]?.message).toContain(nomFichierTelecharge);
      clicSpy.mockRestore();
    },
  );

  it('pose le focus sur le champ Date à l’ouverture du formulaire de création d’annotation (C15-02)', async () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const composant = fixture.componentInstance;

    composant.ouvrirCreationAnnotation();
    fixture.detectChanges();
    await fixture.whenStable();

    const champDate: HTMLInputElement | null = DomTestUtils.obtenirElementNatif(
      fixture,
    ).querySelector('input[name="dateAnnotation"]');
    expect(champDate).not.toBeNull();
    expect(document.activeElement).toBe(champDate);
  });

  it("refuse la demande de création d'annotation quand le libellé est vide (US-019)", () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const composant = fixture.componentInstance;

    composant.ouvrirCreationAnnotation();
    composant.libelleAnnotation = '';
    composant.demanderCreationAnnotation();

    expect(composant.messageErreurAnnotation).not.toBeNull();
    expect(composant.attenteMotDePasseAnnotation()).toBe(false);
  });

  it('crée une annotation de portée projet après confirmation du mot de passe (US-019, US-038 : notification de succès)', async () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const racine = DonneesDeTest.racine(projet);
    const fixture = creerFixture('projet-1', racine);
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    jest.mocked(invoke).mockResolvedValue(racine);
    const composant = fixture.componentInstance;

    composant.ouvrirCreationAnnotation();
    composant.libelleAnnotation = 'Migration majeure';
    composant.categorieAnnotation = 'technique';
    composant.demanderCreationAnnotation();
    expect(composant.attenteMotDePasseAnnotation()).toBe(true);

    await composant.confirmerCreationAnnotation('mot-de-passe');

    expect(invoke).toHaveBeenCalledWith(
      'creer_annotation',
      expect.objectContaining({
        groupeId: 'groupe-1',
        projetId: 'projet-1',
        libelle: 'Migration majeure',
        categorie: 'technique',
        motDePasse: 'mot-de-passe',
      }),
    );
    expect(composant.formulaireAnnotationVisible()).toBe(false);
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: "L'annotation a été créée." }),
    ]);
  });

  it("affiche un message d'erreur lorsque la création d'annotation échoue", async () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    jest.mocked(invoke).mockRejectedValue({ type: 'fichierVerrouille' });
    const composant = fixture.componentInstance;

    composant.ouvrirCreationAnnotation();
    composant.libelleAnnotation = 'Migration majeure';
    composant.demanderCreationAnnotation();
    await composant.confirmerCreationAnnotation('mot-de-passe');

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'erreur' }),
    ]);
    expect(composant.formulaireAnnotationVisible()).toBe(true);
  });

  it('supprime une annotation de portée projet après confirmation puis ressaisie du mot de passe (US-019, RG-033)', async () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const racine = DonneesDeTest.racine(projet);
    const fixture = creerFixture('projet-1', racine);
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    jest.mocked(invoke).mockResolvedValue(racine);
    const composant = fixture.componentInstance;

    composant.demanderSuppressionAnnotation('a1');
    expect(composant.annotationASupprimerId()).toBe('a1');
    composant.confirmerSuppressionAnnotation();
    expect(composant.attenteMotDePasseSuppressionAnnotation()).toBe(true);

    await composant.confirmerSuppressionAnnotationMotDePasse('mot-de-passe');

    expect(invoke).toHaveBeenCalledWith(
      'supprimer_annotation',
      expect.objectContaining({
        groupeId: 'groupe-1',
        projetId: 'projet-1',
        annotationId: 'a1',
        motDePasse: 'mot-de-passe',
      }),
    );
    expect(composant.annotationASupprimerId()).toBeNull();
  });

  it("affiche un message d'erreur lorsque la suppression d'annotation échoue", async () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    jest.mocked(invoke).mockRejectedValue({ type: 'annotationSystemeNonSupprimable' });
    const composant = fixture.componentInstance;

    composant.demanderSuppressionAnnotation('a1');
    composant.confirmerSuppressionAnnotation();
    await composant.confirmerSuppressionAnnotationMotDePasse('mot-de-passe');

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'erreur' }),
    ]);
  });

  describe('saisie en masse de règles de dépendances (US-043, RG-040, C15-07)', () => {
    it("n'affiche pas le lien « Créer des règles en masse » à exactement cinq dépendances non référencées", () => {
      const projet = DonneesDeTest.projet('projet-1', [
        auditAvecDependances(dependancesNonReferencees(5)),
      ]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));

      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.querySelector('#fiche-projet-bouton-saisie-masse-dependances')).toBeNull();
    });

    it('affiche le lien « Créer des règles en masse » dès plus de cinq dépendances non référencées (RG-040)', () => {
      const projet = DonneesDeTest.projet('projet-1', [
        auditAvecDependances(dependancesNonReferencees(6)),
      ]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));

      const element = DomTestUtils.obtenirElementNatif(fixture);
      const bouton = element.querySelector('#fiche-projet-bouton-saisie-masse-dependances');
      expect(bouton).not.toBeNull();
    });

    it('pré-remplit la modale, à l’ouverture, d’une ligne par dépendance non référencée distincte, statut vide', () => {
      const projet = DonneesDeTest.projet('projet-1', [
        auditAvecDependances(dependancesNonReferencees(6)),
      ]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      const composant = fixture.componentInstance;

      composant.ouvrirSaisieMasseDependances();
      fixture.detectChanges();

      const modale = DomTestUtils.obtenirComposantEnfant(fixture, SqmModaleSaisieMasseComponent);
      const lignesAttendues = dependancesNonReferencees(6).map(
        (dependance) => `${dependance.reference};${dependance.version}=`,
      );
      expect(modale.texte().split('\n').sort()).toEqual([...lignesAttendues].sort());
    });

    it('enregistre chaque règle regroupée par un appel indépendant à definirReferentiel, notifie le succès total et referme la modale', async () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
      const racine = DonneesDeTest.racine(projet);
      const fixture = creerFixture('projet-1', racine);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      jest.mocked(invoke).mockResolvedValue(racine);
      const composant = fixture.componentInstance;

      composant.ouvrirSaisieMasseDependances();

      const resultat = await composant.traiterSaisieMasseDependances(
        'pkg1;4.*=obsolete\npkg1;5.*=maintenu\npkg2;1.0.0=maintenu',
        'mot-de-passe',
      );

      expect(resultat).toEqual({ texteRestant: '', erreurs: [], nombreReussies: 2 });
      expect(invoke).toHaveBeenCalledTimes(2);
      expect(invoke).toHaveBeenCalledWith(
        'definir_referentiel',
        expect.objectContaining({
          typeReferentiel: 'reglesDependances',
          motDePasse: 'mot-de-passe',
        }),
      );
      const appels = jest.mocked(invoke).mock.calls;
      const motifsAppeles = appels.map((appel) => {
        const parametres = appel[1];
        if (
          parametres === undefined ||
          typeof parametres !== 'object' ||
          !('entree' in parametres)
        ) {
          throw new Error('Paramètres de commande inattendus dans ce test.');
        }
        const entree = parametres['entree'];
        if (
          entree === undefined ||
          typeof entree !== 'object' ||
          entree === null ||
          !('motif' in entree)
        ) {
          throw new Error('Entrée de commande inattendue dans ce test.');
        }
        return entree.motif;
      });
      expect(motifsAppeles).toEqual(['pkg1', 'pkg2']);
      expect(TestBed.inject(NotificationService).liste()).toEqual([
        expect.objectContaining({
          type: 'succes',
          message: '2 règles de dépendances enregistrées.',
        }),
      ]);

      composant.gererResultatSaisieMasseDependances(resultat);
      expect(composant.modaleSaisieMasseDependancesVisible()).toBe(false);
    });

    it('rejette une ligne dont le motif correspond à une règle déjà existante avant tout enregistrement, sans bloquer les autres lignes (additivité stricte, RG-040)', async () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
      const racine = DonneesDeTest.racine(projet);
      const fixture = creerFixture('projet-1', racine);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      jest.mocked(invoke).mockResolvedValue(racine);
      const composant = fixture.componentInstance;

      const resultat = await composant.traiterSaisieMasseDependances(
        'moment;*=maintenu\npkg1;1.0.0=maintenu',
        'mot-de-passe',
      );

      expect(invoke).toHaveBeenCalledTimes(1);
      expect(invoke).toHaveBeenCalledWith(
        'definir_referentiel',
        expect.objectContaining({ typeReferentiel: 'reglesDependances' }),
      );
      expect(resultat.nombreReussies).toBe(1);
      expect(resultat.erreurs).toEqual([
        {
          ligne: 'moment;*=maintenu',
          message:
            'Une règle existe déjà pour le motif « moment » : ligne rejetée (saisie en masse strictement additive).',
        },
      ]);
      expect(resultat.texteRestant).toBe('moment;*=maintenu');
    });

    it('échec partiel : conserve les règles déjà enregistrées avec succès, ne laisse que les lignes en échec dans le texte restant, et ne referme pas la modale (RG-040)', async () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
      const racine = DonneesDeTest.racine(projet);
      const fixture = creerFixture('projet-1', racine);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      jest
        .mocked(invoke)
        .mockResolvedValueOnce(racine)
        .mockRejectedValueOnce({ type: 'motDePasseOuFichierInvalide' });
      const composant = fixture.componentInstance;
      composant.ouvrirSaisieMasseDependances();

      const resultat = await composant.traiterSaisieMasseDependances(
        'pkg1;1.0.0=maintenu\npkg2;1.0.0=maintenu',
        'mot-de-passe',
      );

      expect(invoke).toHaveBeenCalledTimes(2);
      expect(resultat.nombreReussies).toBe(1);
      expect(resultat.erreurs).toEqual([
        {
          ligne: 'pkg2;1.0.0=maintenu',
          message: 'Une erreur inattendue est survenue lors de l’enregistrement.',
        },
      ]);
      expect(resultat.texteRestant).toBe('pkg2;1.0.0=maintenu');
      expect(TestBed.inject(NotificationService).liste()).toEqual([
        expect.objectContaining({
          type: 'succes',
          message: '1 règle de dépendances enregistrée.',
        }),
      ]);

      composant.gererResultatSaisieMasseDependances(resultat);
      expect(composant.modaleSaisieMasseDependancesVisible()).toBe(true);

      // Nouvelle tentative, uniquement sur la ligne restée en échec (pkg1 n'est jamais re-soumise, cf. RG-040).
      jest.mocked(invoke).mockReset();
      jest.mocked(invoke).mockResolvedValue(racine);
      const secondeTentative = await composant.traiterSaisieMasseDependances(
        resultat.texteRestant,
        'mot-de-passe',
      );

      expect(invoke).toHaveBeenCalledTimes(1);
      expect(invoke).toHaveBeenCalledWith(
        'definir_referentiel',
        expect.objectContaining({ typeReferentiel: 'reglesDependances' }),
      );
      expect(secondeTentative).toEqual({ texteRestant: '', erreurs: [], nombreReussies: 1 });
    });
  });

  describe('saisie en masse de qualifications de membres connus (US-044, RG-041, C15-08)', () => {
    it("n'affiche pas le lien « Créer des règles en masse » à exactement cinq membres inconnu", () => {
      const projet = DonneesDeTest.projet('projet-1', [auditAvecMembres(membresInconnus(5))]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));

      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.querySelector('#fiche-projet-bouton-saisie-masse-membres')).toBeNull();
    });

    it('affiche le lien « Créer des règles en masse » dès plus de cinq membres inconnu (RG-041)', () => {
      const projet = DonneesDeTest.projet('projet-1', [auditAvecMembres(membresInconnus(6))]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));

      const element = DomTestUtils.obtenirElementNatif(fixture);
      const bouton = element.querySelector('#fiche-projet-bouton-saisie-masse-membres');
      expect(bouton).not.toBeNull();
    });

    it('pré-remplit la modale, à l’ouverture, d’une ligne par membre inconnu distinct, statut jamais pré-rempli (RG-041, point 3)', () => {
      const projet = DonneesDeTest.projet('projet-1', [auditAvecMembres(membresInconnus(6))]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      const composant = fixture.componentInstance;

      composant.ouvrirSaisieMasseMembres();
      fixture.detectChanges();

      const modale = DomTestUtils.obtenirComposantEnfant(fixture, SqmModaleSaisieMasseComponent);
      const lignesAttendues = membresInconnus(6).map((membre) => `${membre.username};username=`);
      expect(modale.texte().split('\n').sort()).toEqual([...lignesAttendues].sort());
      // Aucune ligne ne porte de statut pré-rempli après le séparateur « = » (RG-041, point 3).
      for (const ligne of modale.texte().split('\n')) {
        expect(ligne.endsWith('=')).toBe(true);
      }
    });

    it('enregistre chaque ligne par un appel indépendant à qualifierMembre (sans regroupement, RG-041 point 4), notifie le succès total et referme la modale', async () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
      const racine = DonneesDeTest.racine(projet);
      const fixture = creerFixture('projet-1', racine);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      jest.mocked(invoke).mockResolvedValue({ donnees: racine, membresEnConflit: [] });
      const composant = fixture.componentInstance;

      composant.ouvrirSaisieMasseMembres();

      const resultat = await composant.traiterSaisieMasseMembres(
        'mnovak;username=interne\ninconnu1;email=client',
        'mot-de-passe',
      );

      expect(resultat).toEqual({ texteRestant: '', erreurs: [], nombreReussies: 2 });
      expect(invoke).toHaveBeenCalledTimes(2);
      expect(invoke).toHaveBeenCalledWith(
        'qualifier_membre',
        expect.objectContaining({
          groupeId: 'groupe-1',
          origine: 'Saisie en masse (Fiche projet)',
          motDePasse: 'mot-de-passe',
        }),
      );
      const appels = jest.mocked(invoke).mock.calls;
      const parametresAppeles = appels.map((appel) => appel[1]);
      expect(parametresAppeles).toEqual([
        expect.objectContaining({
          membreId: undefined,
          critere: 'mnovak',
          typeCritere: 'username',
          statut: 'interne',
        }),
        expect.objectContaining({
          membreId: undefined,
          critere: 'inconnu1',
          typeCritere: 'email',
          statut: 'client',
        }),
      ]);
      expect(TestBed.inject(NotificationService).liste()).toEqual([
        expect.objectContaining({ type: 'succes', message: '2 membres qualifiés.' }),
      ]);

      composant.gererResultatSaisieMasseMembres(resultat);
      expect(composant.modaleSaisieMasseMembresVisible()).toBe(false);
    });

    it('rejette une ligne dont le critère correspond à une règle déjà existante avant tout enregistrement, sans bloquer les autres lignes (additivité stricte, RG-041 point 1)', async () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
      const racine = DonneesDeTest.racine(projet);
      const fixture = creerFixture('projet-1', racine);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      jest.mocked(invoke).mockResolvedValue({ donnees: racine, membresEnConflit: [] });
      const composant = fixture.componentInstance;

      // « jdupont;username » figure déjà parmi les membres connus du groupe de test (DonneesDeTest.racine).
      const resultat = await composant.traiterSaisieMasseMembres(
        'jdupont;username=client\ninconnu1;username=interne',
        'mot-de-passe',
      );

      expect(invoke).toHaveBeenCalledTimes(1);
      expect(invoke).toHaveBeenCalledWith(
        'qualifier_membre',
        expect.objectContaining({ critere: 'inconnu1' }),
      );
      expect(resultat.nombreReussies).toBe(1);
      expect(resultat.erreurs).toEqual([
        {
          ligne: 'jdupont;username=client',
          message:
            'Une règle existe déjà pour le critère « jdupont » (username) : ligne rejetée (saisie en masse strictement additive).',
        },
      ]);
      expect(resultat.texteRestant).toBe('jdupont;username=client');
    });

    it('échec partiel : conserve les qualifications déjà enregistrées avec succès, ne laisse que la ligne en échec dans le texte restant, et ne referme pas la modale (RG-041 point 5)', async () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
      const racine = DonneesDeTest.racine(projet);
      const fixture = creerFixture('projet-1', racine);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      jest
        .mocked(invoke)
        .mockResolvedValueOnce({ donnees: racine, membresEnConflit: [] })
        .mockRejectedValueOnce({ type: 'motDePasseOuFichierInvalide' });
      const composant = fixture.componentInstance;
      composant.ouvrirSaisieMasseMembres();

      const resultat = await composant.traiterSaisieMasseMembres(
        'inconnu1;username=interne\ninconnu2;username=client',
        'mot-de-passe',
      );

      expect(invoke).toHaveBeenCalledTimes(2);
      expect(resultat.nombreReussies).toBe(1);
      expect(resultat.erreurs).toEqual([
        {
          ligne: 'inconnu2;username=client',
          message: 'Une erreur inattendue est survenue lors de l’enregistrement.',
        },
      ]);
      expect(resultat.texteRestant).toBe('inconnu2;username=client');
      expect(TestBed.inject(NotificationService).liste()).toEqual([
        expect.objectContaining({ type: 'succes', message: '1 membre qualifié.' }),
      ]);

      composant.gererResultatSaisieMasseMembres(resultat);
      expect(composant.modaleSaisieMasseMembresVisible()).toBe(true);

      // Nouvelle tentative, uniquement sur la ligne restée en échec (inconnu1 n'est jamais re-soumis, RG-041).
      jest.mocked(invoke).mockReset();
      jest.mocked(invoke).mockResolvedValue({ donnees: racine, membresEnConflit: [] });
      const secondeTentative = await composant.traiterSaisieMasseMembres(
        resultat.texteRestant,
        'mot-de-passe',
      );

      expect(invoke).toHaveBeenCalledTimes(1);
      expect(invoke).toHaveBeenCalledWith(
        'qualifier_membre',
        expect.objectContaining({ critere: 'inconnu2' }),
      );
      expect(secondeTentative).toEqual({ texteRestant: '', erreurs: [], nombreReussies: 1 });
    });

    it("rejette une ligne dont le statut n'est pas explicitement saisi, sans jamais lui attribuer de valeur par défaut (RG-041, point 3)", async () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
      const racine = DonneesDeTest.racine(projet);
      const fixture = creerFixture('projet-1', racine);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      const composant = fixture.componentInstance;

      const resultat = await composant.traiterSaisieMasseMembres(
        'inconnu1;username=',
        'mot-de-passe',
      );

      expect(invoke).not.toHaveBeenCalled();
      expect(resultat.nombreReussies).toBe(0);
      expect(resultat.erreurs).toHaveLength(1);
      expect(resultat.texteRestant).toBe('inconnu1;username=');
    });
  });
});
