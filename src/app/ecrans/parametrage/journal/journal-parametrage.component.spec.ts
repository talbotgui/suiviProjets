// Test de l'onglet Journal des modifications de l'écran Paramétrage (cf. journal-parametrage.component.ts), généré
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DomTestUtils } from '../../../testing/dom-test.utils';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { SqmJournalParametrageComponent } from './journal-parametrage.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

const invokeSimule = jest.mocked(invoke);

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine minimale, avec le journal des modifications fourni.
   * @param journal - Journal des modifications, vide par défaut.
   * @returns Une racine de test.
   */
  public static racine(journal: DonneesRacine['journal'] = []): DonneesRacine {
    return {
      versionSchema: 1,
      meta: {
        creeLe: '2026-07-20T08:00:00Z',
        modifieLe: '2026-07-20T08:00:00Z',
        application: 'Test',
      },
      groupes: [],
      referentiels: {
        reglesDependances: [],
        reglesMarqueursIA: [],
        motifNommageBranches: '^(main|develop)$',
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
            critique: { seuilOrange: 10, seuilRouge: 25 },
          },
          materialiteBrouillon: { variationRelative: 0.1 },
        },
        verrouillage: { delaiInactiviteMinutes: 15, echecsAvantFermeture: 5 },
        audit: {},
        proxy: {},
        sauvegarde: {},
      },
      campagnes: [],
      brouillon: null,
      traitementsAlertes: [],
      journal,
      vuesEnregistrees: [],
    };
  }
}

describe('SqmJournalParametrageComponent', () => {
  let donneesApplication: DonneesApplicationService;

  beforeEach(async () => {
    invokeSimule.mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmJournalParametrageComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
  });

  it('affiche un message explicite lorsque le journal est vide', () => {
    donneesApplication.chargerRacine(DonneesDeTest.racine([]));
    const fixture = TestBed.createComponent(SqmJournalParametrageComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.textContent).toContain('Aucune entrée de journal des modifications');
    expect(element.querySelector('table')).toBeNull();
  });

  it('trie les entrées de la plus récente à la plus ancienne', () => {
    donneesApplication.chargerRacine(
      DonneesDeTest.racine([
        {
          id: 'j1',
          horodatage: '2026-07-01T08:00:00Z',
          objet: 'parametres.seuils.vitalite.mortJours',
          avant: 365,
          apres: 400,
          origine: 'Paramétrage',
        },
        {
          id: 'j2',
          horodatage: '2026-07-20T08:00:00Z',
          objet: 'referentiels.motifNommageBranches',
          avant: '^(main|develop)$',
          apres: '^(main|develop|release/.*)$',
          origine: 'Paramétrage',
          detailOrigine: 'Édition manuelle',
        },
        {
          id: 'j3',
          horodatage: '2026-07-10T08:00:00Z',
          objet: 'referentiels.reglesDependances',
          avant: undefined,
          apres: { id: 'd1', motif: 'moment' },
          origine: 'Paramétrage',
        },
      ]),
    );
    const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;

    const entrees = composant.entrees();

    expect(entrees.map((entree) => entree.id)).toEqual(['j2', 'j3', 'j1']);
  });

  it('met en forme les valeurs avant/après, y compris une valeur absente', () => {
    donneesApplication.chargerRacine(
      DonneesDeTest.racine([
        {
          id: 'j1',
          horodatage: '2026-07-01T08:00:00Z',
          objet: 'referentiels.reglesDependances',
          avant: undefined,
          apres: { id: 'd1', motif: 'moment' },
          origine: 'Paramétrage',
        },
      ]),
    );
    const fixture = TestBed.createComponent(SqmJournalParametrageComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.textContent).toContain('—');
    expect(element.textContent).toContain('{"id":"d1","motif":"moment"}');
  });

  it("affiche l'origine et le détail d'origine d'une entrée", () => {
    donneesApplication.chargerRacine(
      DonneesDeTest.racine([
        {
          id: 'j1',
          horodatage: '2026-07-01T08:00:00Z',
          objet: 'referentiels.motifNommageBranches',
          avant: 'a',
          apres: 'b',
          origine: 'Paramétrage',
          detailOrigine: 'Édition manuelle',
        },
      ]),
    );
    const fixture = TestBed.createComponent(SqmJournalParametrageComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.textContent).toContain('Paramétrage');
    expect(element.textContent).toContain('Édition manuelle');
  });
});
