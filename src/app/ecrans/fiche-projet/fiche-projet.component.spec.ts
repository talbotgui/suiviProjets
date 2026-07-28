// Test de l'écran Fiche projet (cf. fiche-projet.component.ts, US-017, RG-006 à RG-011, RG-013, RG-016), généré
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';
import { toPng } from 'html-to-image';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../services/avecetat/etat/etat-session.service';
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

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));
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
   * @returns L'audit de test.
   */
  public static auditComplet(options: {
    readonly derniereAnalyseLe?: string;
    readonly dernierCommitLe?: string;
  }): Audit {
    const dernierCommitLe = options.dernierCommitLe ?? DonneesDeTest.ilYA(-2);
    return {
      id: 'audit-1',
      date: DonneesDeTest.ilYA(-1),
      campagneId: 'campagne-1',
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
            { username: 'inconnu1', nom: 'Inconnu Un', niveauAcces: 40, herite: false },
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
      instances: [{ id: 'instance-gitlab', type: TypeInstance.Gitlab, nom: 'GitLab', urlBase: '' }],
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
        audit: {},
        proxy: {},
        sauvegarde: {},
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

  it('affiche le badge membre inconnu en en-tête dès qu’un membre du dépôt est de statut inconnu (RG-006 à RG-009)', () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('Membre inconnu');
    expect(element.textContent).toContain('gravité elevee');
  });

  it(
    'affiche la réserve RG-016 explicitement pour un projet IA interdite sans marqueur détecté ' +
      '(« absence de preuve ≠ preuve d’absence »), jamais un simple badge conforme opaque',
    () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})], false);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.textContent).toContain('conforme sous réserve');
      expect(element.textContent).toContain("ne prouve pas l'absence d'usage réel");
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

  it('propose un lien « Qualifier ce membre » vers l’Administration pour un membre inconnu', () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const lien = element.querySelector('a[href="/administration"]');
    expect(lien).not.toBeNull();
    expect(lien?.textContent).toContain('Qualifier ce membre');
  });

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

  it('exporterPng déclenche toPng sur le conteneur et provoque un téléchargement', async () => {
    jest.mocked(toPng).mockResolvedValue('data:image/png;base64,test');
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditComplet({})]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const clicSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    await fixture.componentInstance.exporterPng();

    expect(toPng).toHaveBeenCalled();
    expect(clicSpy).toHaveBeenCalled();
    clicSpy.mockRestore();
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

  it('crée une annotation de portée projet après confirmation du mot de passe (US-019)', async () => {
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

    expect(composant.messageErreurAnnotation).not.toBeNull();
    expect(composant.formulaireAnnotationVisible()).toBe(true);
  });
});
