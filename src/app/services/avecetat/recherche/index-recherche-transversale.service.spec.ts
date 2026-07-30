// Test de IndexRechercheTransversaleService (cf. index-recherche-transversale.service.ts, US-021, F16), généré
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { DonneesApplicationService } from '../etat/donnees-application.service';
import type { DonneesRacine, Groupe } from '../etat/types-donnees';
import { TypeSource } from '../etat/types-donnees';
import { IndexRechercheTransversaleService } from './index-recherche-transversale.service';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit un unique groupe portant un projet et une dépendance « log4j » sur son dernier audit.
   * @returns Le groupe de test.
   */
  public static groupeAvecDependance(): Groupe {
    return {
      id: 'groupe-1',
      nom: 'Équipe Paiement',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [
        {
          id: 'projet-1',
          nom: 'Service Facturation',
          description: '',
          iaAutorisee: false,
          sources: [
            {
              id: 'source-1',
              instanceId: 'instance-1',
              type: TypeSource.DepotGitlab,
              idExterne: 'groupe/service-facturation',
            },
          ],
          annotations: [],
          audits: [
            {
              id: 'audit-1',
              date: '2026-07-01T08:00:00Z',
              campagneId: 'campagne-1',
              resultats: [
                {
                  type: 'gitlab.dependances',
                  sourceId: 'source-1',
                  refEffective: 'main',
                  shaTete: 'sha1',
                  dependances: [{ reference: 'log4j', version: '2.17.1', manifeste: 'pom.xml' }],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  /**
   * Construit une racine minimale portant les groupes fournis.
   * @param groupes - Groupes à intégrer à la racine.
   * @returns Une racine de test.
   */
  public static racine(groupes: readonly Groupe[]): DonneesRacine {
    return {
      versionSchema: 1,
      meta: {
        creeLe: '2026-07-20T08:00:00Z',
        modifieLe: '2026-07-20T08:00:00Z',
        application: 'Test',
      },
      groupes,
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
      campagnes: [],
      brouillon: null,
      traitementsAlertes: [],
      journal: [],
      vuesEnregistrees: [],
    };
  }
}

describe('IndexRechercheTransversaleService', () => {
  let service: IndexRechercheTransversaleService;
  let donneesApplication: DonneesApplicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IndexRechercheTransversaleService);
    donneesApplication = TestBed.inject(DonneesApplicationService);
  });

  it('signale la recherche indisponible tant qu’aucun fichier n’est chargé', () => {
    expect(service.pret()).toBe(false);
    expect(service.rechercher('log4j', { inclureHistorique: false }).aucunResultat).toBe(true);
  });

  it('signale la recherche disponible dès qu’un fichier est chargé, même sans groupe', () => {
    donneesApplication.chargerRacine(DonneesDeTest.racine([]));

    expect(service.pret()).toBe(true);
  });

  it('délègue la recherche à l’index construit à partir des groupes actuellement chargés', () => {
    donneesApplication.chargerRacine(DonneesDeTest.racine([DonneesDeTest.groupeAvecDependance()]));

    const resultats = service.rechercher('log4j', { inclureHistorique: false });

    expect(resultats.dependances.nombreTotal).toBe(1);
    expect(resultats.dependances.occurrences[0]?.projetId).toBe('projet-1');
  });

  it('reconstruit l’index quand la racine change (nouveau chargement de fichier)', () => {
    donneesApplication.chargerRacine(DonneesDeTest.racine([]));
    expect(service.rechercher('log4j', { inclureHistorique: false }).dependances.nombreTotal).toBe(
      0,
    );

    donneesApplication.chargerRacine(DonneesDeTest.racine([DonneesDeTest.groupeAvecDependance()]));
    expect(service.rechercher('log4j', { inclureHistorique: false }).dependances.nombreTotal).toBe(
      1,
    );
  });
});
