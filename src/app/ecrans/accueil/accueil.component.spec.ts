// Test de l'écran Accueil (cf. accueil.component.ts, US-005, RG-009, RG-026), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import {
  StatutMembre,
  StatutTraitementAlerte,
  TypeCritereMembre,
} from '../../services/avecetat/etat/types-donnees';
import type {
  Audit,
  Campagne,
  DonneesRacine,
  Groupe,
  MembreConnu,
  Projet,
} from '../../services/avecetat/etat/types-donnees';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmAccueilComponent } from './accueil.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit un audit minimal ne portant que le constat `gitlab.membres`, seul type de résultat exploité par cet
   * écran à ce stade (cf. commentaire d'en-tête de `accueil.component.ts`).
   * @param date - Date de l'audit (ISO 8601).
   * @param usernames - Identifiants des membres du dépôt constatés lors de cet audit.
   * @returns L'audit de test.
   */
  public static auditAvecMembres(date: string, usernames: readonly string[]): Audit {
    return {
      id: `audit-${date}`,
      date,
      campagneId: 'campagne-1',
      typeAudit: 'reguliere',
      resultats: [
        {
          type: 'gitlab.membres',
          sourceId: 'source-1',
          refEffective: 'main',
          shaTete: 'abc123',
          membres: usernames.map((username) => ({
            username,
            nom: username,
            niveauAcces: 30,
            herite: false,
          })),
        },
      ],
    };
  }

  /**
   * Construit un projet de test.
   * @param id - Identifiant du projet.
   * @param nom - Nom du projet.
   * @param audits - Historique des audits du projet.
   * @returns Le projet de test.
   */
  public static projet(id: string, nom: string, audits: readonly Audit[]): Projet {
    return {
      id,
      nom,
      description: '',
      iaAutorisee: false,
      sources: [],
      annotations: [],
      audits,
    };
  }

  /**
   * Construit une règle de membre connu de type `username`.
   * @param critere - Identifiant de connexion reconnu.
   * @returns La règle de test.
   */
  public static membreConnu(critere: string): MembreConnu {
    return {
      id: `membre-${critere}`,
      critere,
      typeCritere: TypeCritereMembre.Username,
      statut: StatutMembre.Interne,
    };
  }

  /**
   * Construit une racine de test avec un unique groupe et les projets fournis.
   * @param projets - Projets du groupe unique de cette racine.
   * @param membresConnus - Règles de membres connus du groupe.
   * @param campagnes - Traces d'exécution de campagnes.
   * @param traitementsAlertes - Historique de traitement des alertes (RG-026).
   * @returns La racine de test.
   */
  public static racine(
    projets: readonly Projet[],
    membresConnus: readonly MembreConnu[] = [],
    campagnes: readonly Campagne[] = [],
    traitementsAlertes: DonneesRacine['traitementsAlertes'] = [],
  ): DonneesRacine {
    const groupe: Groupe = {
      id: 'groupe-1',
      nom: 'Socle Comptable',
      description: '',
      instances: [],
      membresConnus,
      annotations: [],
      indicateursDesactives: [],
      projets,
    };
    return {
      versionSchema: 1,
      meta: {
        creeLe: '2026-07-20T08:00:00Z',
        modifieLe: '2026-07-20T08:00:00Z',
        application: 'Test',
      },
      groupes: [groupe],
      referentiels: { reglesDependances: [], reglesMarqueursIA: [], motifNommageBranches: '' },
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
            critique: { seuilOrange: 10, seuilRouge: 25 },
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
      traitementsAlertes,
      journal: [],
      vuesEnregistrees: [],
    };
  }
}

describe('SqmAccueilComponent', () => {
  let donneesApplication: DonneesApplicationService;

  beforeEach(async () => {
    jest.mocked(invoke).mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmAccueilComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
  });

  it('affiche le bandeau membre inconnu dès qu’un membre inconnu existe, sans aucun traitement enregistré', () => {
    const audit = DonneesDeTest.auditAvecMembres('2026-07-20T00:00:00Z', ['jdupont']);
    const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
    donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));

    const fixture = TestBed.createComponent(SqmAccueilComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(composant.membreInconnuDetecte()).toBe(true);
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(element.textContent).toContain('membre au statut inconnu');
  });

  it('n’affiche pas le bandeau lorsque tous les membres constatés sont connus', () => {
    const audit = DonneesDeTest.auditAvecMembres('2026-07-20T00:00:00Z', ['jdupont']);
    const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
    donneesApplication.chargerRacine(
      DonneesDeTest.racine([projet], [DonneesDeTest.membreConnu('jdupont')]),
    );

    const fixture = TestBed.createComponent(SqmAccueilComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(composant.membreInconnuDetecte()).toBe(false);
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it(
    "ne compte qu'une seule alerte pour un même membre inconnu constaté sur deux sources GitLab du même " +
      'projet, plutôt que de le compter deux fois (R15-02)',
    () => {
      const audit: Audit = {
        id: 'audit-1',
        date: '2026-07-20T00:00:00Z',
        campagneId: 'campagne-1',
        typeAudit: 'reguliere',
        resultats: [
          {
            type: 'gitlab.membres',
            sourceId: 'source-back',
            refEffective: 'main',
            shaTete: 'abc123',
            membres: [{ username: 'inconnu1', nom: 'inconnu1', niveauAcces: 30, herite: false }],
          },
          {
            type: 'gitlab.membres',
            sourceId: 'source-front',
            refEffective: 'main',
            shaTete: 'def456',
            membres: [{ username: 'inconnu1', nom: 'inconnu1', niveauAcces: 30, herite: false }],
          },
        ],
      };
      const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
      donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));

      const fixture = TestBed.createComponent(SqmAccueilComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      expect(composant.alertesActives()).toHaveLength(1);
      expect(composant.nombreProjetsAvecMembreInconnu()).toBe(1);
    },
  );

  it(
    'libelle la carte statistique en « Projets avec membre inconnu », jamais « Membres inconnus » (nombre de ' +
      'projets concernés, pas de membres, R15-02)',
    () => {
      const audit = DonneesDeTest.auditAvecMembres('2026-07-20T00:00:00Z', ['jdupont']);
      const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
      donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));

      const fixture = TestBed.createComponent(SqmAccueilComponent);
      fixture.detectChanges();
      const element = DomTestUtils.obtenirElementNatif(fixture);

      expect(element.textContent).toContain('Projets avec membre inconnu');
      expect(element.textContent).not.toContain('Membres inconnus');
    },
  );

  it('fait réapparaître, avec la mention de son traitement antérieur, une alerte membre inconnu dont la cause persiste (RG-026)', () => {
    const audit = DonneesDeTest.auditAvecMembres('2026-07-20T00:00:00Z', ['jdupont']);
    const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
    donneesApplication.chargerRacine(
      DonneesDeTest.racine(
        [projet],
        [],
        [],
        [
          {
            id: 'traitement-1',
            cleAlerte: 'membreInconnu|projet-1|jdupont',
            statut: StatutTraitementAlerte.Traitee,
            commentaire: 'Investigation en cours.',
            horodatage: '2026-07-01T09:00:00Z',
          },
        ],
      ),
    );

    const fixture = TestBed.createComponent(SqmAccueilComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    expect(composant.membreInconnuDetecte()).toBe(true);
    const alertes = composant.alertesActives();
    expect(alertes).toHaveLength(1);
    expect(alertes[0].traitementAnterieur?.commentaire).toBe('Investigation en cours.');

    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('traité précédemment');
  });

  it('ne fait pas réapparaître une alerte membre inconnu traitée dont la cause a disparu (membre depuis qualifié)', () => {
    const audit = DonneesDeTest.auditAvecMembres('2026-07-20T00:00:00Z', ['jdupont']);
    const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
    // Le membre est désormais connu du groupe : la cause de l'alerte a disparu, malgré l'entrée de traitement
    // historique conservée dans `traitementsAlertes`.
    donneesApplication.chargerRacine(
      DonneesDeTest.racine(
        [projet],
        [DonneesDeTest.membreConnu('jdupont')],
        [],
        [
          {
            id: 'traitement-1',
            cleAlerte: 'membreInconnu|projet-1|jdupont',
            statut: StatutTraitementAlerte.Traitee,
            horodatage: '2026-07-01T09:00:00Z',
          },
        ],
      ),
    );

    const fixture = TestBed.createComponent(SqmAccueilComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    expect(composant.membreInconnuDetecte()).toBe(false);
    expect(composant.alertesActives()).toEqual([]);
  });

  it('calcule un encart résumé correct (groupes/projets, dernière campagne, projets non audités depuis longtemps)', () => {
    const projetJamaisAudite = DonneesDeTest.projet('projet-jamais', 'Jamais audité', []);
    const auditRecent = DonneesDeTest.auditAvecMembres(new Date().toISOString(), []);
    const projetRecent = DonneesDeTest.projet('projet-recent', 'Audité récemment', [auditRecent]);
    const auditAncien = DonneesDeTest.auditAvecMembres(
      new Date(Date.now() - 40 * JOUR_MS).toISOString(),
      [],
    );
    const projetAncien = DonneesDeTest.projet('projet-ancien', 'Audité il y a longtemps', [
      auditAncien,
    ]);
    const campagne: Campagne = {
      id: 'campagne-1',
      date: '2026-07-08T14:05:00Z',
      perimetre: ['projet-recent'],
      verdicts: [],
    };
    donneesApplication.chargerRacine(
      DonneesDeTest.racine([projetJamaisAudite, projetRecent, projetAncien], [], [campagne]),
    );

    const fixture = TestBed.createComponent(SqmAccueilComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    expect(composant.nombreGroupes()).toBe(1);
    expect(composant.nombreProjets()).toBe(3);
    expect(composant.derniereCampagneLabel()).toBe('08/07 14:05');

    const nonAudites = composant
      .projetsNonAuditesDepuisLongtemps()
      .map((projet) => projet.projetId);
    expect(nonAudites).toContain('projet-jamais');
    expect(nonAudites).toContain('projet-ancien');
    expect(nonAudites).not.toContain('projet-recent');

    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('Jamais audité');
    expect(element.textContent).toContain('Audité il y a longtemps');
  });

  it('affiche un message explicite en l’absence de toute alerte et de tout projet ancien', () => {
    const auditRecent = DonneesDeTest.auditAvecMembres(new Date().toISOString(), ['jdupont']);
    const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [auditRecent]);
    donneesApplication.chargerRacine(
      DonneesDeTest.racine([projet], [DonneesDeTest.membreConnu('jdupont')]),
    );

    const fixture = TestBed.createComponent(SqmAccueilComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.textContent).toContain('Aucune alerte active.');
    expect(element.textContent).toContain('Tous les projets ont été audités récemment.');
  });

  it('affiche des valeurs neutres en l’absence de tout fichier chargé', () => {
    const fixture = TestBed.createComponent(SqmAccueilComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    expect(composant.nombreGroupes()).toBe(0);
    expect(composant.nombreProjets()).toBe(0);
    expect(composant.derniereCampagneLabel()).toBe('Aucune campagne');
    expect(composant.membreInconnuDetecte()).toBe(false);
    expect(composant.projetsNonAuditesDepuisLongtemps()).toEqual([]);
  });
});
