// Test de l'onglet Journal des modifications de l'écran Paramétrage (cf. journal-parametrage.component.ts), généré
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DomTestUtils } from '../../../testing/dom-test.utils';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
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
        audit: { concurrence: 4 },
        proxy: {},
        sauvegarde: { nombreSauvegardesSecurite: 5 },
        seuilAvertissementTailleOctets: 10_485_760,
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

  describe('filtre par origine et par date (R10-16)', () => {
    /**
     * Construit trois entrées de journal d'origines et de dates distinctes, pour couvrir le filtre par origine et
     * par intervalle de dates.
     * @returns Les trois entrées de test.
     */
    function troisEntrees(): DonneesRacine['journal'] {
      return [
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
          horodatage: '2026-07-10T08:00:00Z',
          objet: 'groupes.groupe-1.membresConnus',
          avant: undefined,
          apres: { username: 'jdupont' },
          origine: 'Administration',
        },
        {
          id: 'j3',
          horodatage: '2026-07-20T08:00:00Z',
          objet: 'referentiels.motifNommageBranches',
          avant: '^(main)$',
          apres: '^(main|develop)$',
          origine: 'Paramétrage',
        },
      ];
    }

    it('propose les origines distinctes des entrées chargées, triées alphabétiquement', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine(troisEntrees()));
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;

      expect(composant.origines()).toEqual(['Administration', 'Paramétrage']);
    });

    it('restreint les entrées affichées à l’origine sélectionnée', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine(troisEntrees()));
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;

      composant.definirFiltreOrigine('Administration');

      expect(composant.entreesFiltrees().map((entree) => entree.id)).toEqual(['j2']);
    });

    it('restreint les entrées affichées à l’intervalle de dates sélectionné', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine(troisEntrees()));
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;

      composant.definirFiltreDateDebut('2026-07-05');
      composant.definirFiltreDateFin('2026-07-15');

      expect(composant.entreesFiltrees().map((entree) => entree.id)).toEqual(['j2']);
    });

    it('combine le filtre d’origine et le filtre de date', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine(troisEntrees()));
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;

      composant.definirFiltreOrigine('Paramétrage');
      composant.definirFiltreDateDebut('2026-07-15');

      expect(composant.entreesFiltrees().map((entree) => entree.id)).toEqual(['j3']);
    });

    it('affiche un message explicite quand aucune entrée ne correspond aux filtres', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine(troisEntrees()));
      const fixture = TestBed.createComponent(SqmJournalParametrageComponent);
      fixture.detectChanges();

      fixture.componentInstance.definirFiltreOrigine('Administration');
      fixture.componentInstance.definirFiltreDateDebut('2026-07-01');
      fixture.componentInstance.definirFiltreDateFin('2026-07-05');
      fixture.detectChanges();

      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.textContent).toContain('Aucune entrée de journal ne correspond');
      expect(element.querySelector('table')).toBeNull();
    });

    it('réinitialise l’ensemble des filtres', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine(troisEntrees()));
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;

      composant.definirFiltreOrigine('Administration');
      composant.definirFiltreDateDebut('2026-07-05');
      composant.definirFiltreDateFin('2026-07-15');
      expect(composant.auMoinsUnFiltreActif()).toBe(true);

      composant.reinitialiserFiltres();

      expect(composant.auMoinsUnFiltreActif()).toBe(false);
      expect(composant.entreesFiltrees()).toHaveLength(3);
    });

    it('revient à la première page à chaque changement de filtre', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine(troisEntrees()));
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;

      composant.pageSuivante();
      composant.definirFiltreOrigine('Paramétrage');

      expect(composant.pageAffichee()).toBe(1);
    });
  });

  describe('pagination (R10-16)', () => {
    /**
     * Construit vingt-cinq entrées de journal, pour dépasser la taille de page (20) et couvrir la navigation entre
     * pages.
     * @returns Les vingt-cinq entrées de test, de la plus ancienne (j0) à la plus récente (j24).
     */
    function vingtCinqEntrees(): DonneesRacine['journal'] {
      return Array.from({ length: 25 }, (_valeur, indice) => ({
        id: `j${indice}`,
        horodatage: `2026-07-${String(indice + 1).padStart(2, '0')}T08:00:00Z`,
        objet: `parametres.seuils.mrOuvertes.ageOrangeJours`,
        avant: indice,
        apres: indice + 1,
        origine: 'Paramétrage',
      }));
    }

    it('plafonne la première page à vingt entrées, la plus récente en tête', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine(vingtCinqEntrees()));
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;

      expect(composant.entreesPage()).toHaveLength(20);
      expect(composant.entreesPage()[0]?.id).toBe('j24');
      expect(composant.nombrePages()).toBe(2);
      expect(composant.pagePrecedenteDisponible()).toBe(false);
      expect(composant.pageSuivanteDisponible()).toBe(true);
    });

    it('affiche les entrées restantes sur la seconde page', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine(vingtCinqEntrees()));
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;

      composant.pageSuivante();

      expect(composant.pageAffichee()).toBe(2);
      expect(composant.entreesPage()).toHaveLength(5);
      expect(composant.pagePrecedenteDisponible()).toBe(true);
      expect(composant.pageSuivanteDisponible()).toBe(false);
    });

    it('ignore une nouvelle demande de page suivante au-delà de la dernière page', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine(vingtCinqEntrees()));
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;

      composant.pageSuivante();
      composant.pageSuivante();

      expect(composant.pageAffichee()).toBe(2);
    });

    it('écrête la page affichée quand la racine chargée change et réduit le nombre de pages disponibles', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine(vingtCinqEntrees()));
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;

      composant.pageSuivante();
      expect(composant.pageAffichee()).toBe(2);

      // Rechargement d'une racine ne portant plus qu'une seule entrée : le nombre de pages disponibles retombe à 1,
      // {@link pageAffichee} doit refléter cet écrêtage sans action explicite de l'utilisateur sur la pagination.
      donneesApplication.chargerRacine(DonneesDeTest.racine([vingtCinqEntrees()[0]]));

      expect(composant.nombrePages()).toBe(1);
      expect(composant.pageAffichee()).toBe(1);
    });
  });

  describe('purge du journal des modifications (US-036, RG-034, Phase 10 incrément 8)', () => {
    beforeEach(() => {
      donneesApplication.chargerRacine(DonneesDeTest.racine([]));
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    });

    it('prévisualise la purge et affiche le nombre d’entrées concernées', async () => {
      invokeSimule.mockResolvedValue({ nbEntreesSupprimees: 4, octetsAvant: 100, octetsApres: 40 });
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;

      await composant.previsualiserPurge();

      expect(invokeSimule).toHaveBeenCalledWith('previsualiser_purge_journal', expect.anything());
      expect(composant.previsualisationPurge).toEqual({
        nbEntreesSupprimees: 4,
        octetsAvant: 100,
        octetsApres: 40,
      });
    });

    it('ne demande pas l’exécution tant qu’aucune prévisualisation n’a été faite, ou si elle est nulle', () => {
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;

      composant.demanderExecutionPurge();
      expect(composant.purgeEnAttenteMotDePasse).toBe(false);

      composant.previsualisationPurge = {
        nbEntreesSupprimees: 0,
        octetsAvant: 10,
        octetsApres: 10,
      };
      composant.demanderExecutionPurge();
      expect(composant.purgeEnAttenteMotDePasse).toBe(false);
    });

    it('exécute la purge après confirmation du mot de passe et réinitialise la prévisualisation', async () => {
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;
      composant.previsualisationPurge = {
        nbEntreesSupprimees: 2,
        octetsAvant: 100,
        octetsApres: 60,
      };
      invokeSimule.mockResolvedValue(DonneesDeTest.racine([]));

      composant.demanderExecutionPurge();
      expect(composant.purgeEnAttenteMotDePasse).toBe(true);
      await composant.confirmerExecutionPurge('mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith(
        'executer_purge_journal',
        expect.objectContaining({ motDePasse: 'mot-de-passe' }),
      );
      expect(composant.previsualisationPurge).toBeNull();
      expect(composant.purgeEnAttenteMotDePasse).toBe(false);
      expect(TestBed.inject(NotificationService).liste()).toEqual([
        expect.objectContaining({ type: 'succes' }),
      ]);
    });

    it('convertit un rejet typé « sessionVerrouillee » en message explicite à la purge', async () => {
      const composant = TestBed.createComponent(SqmJournalParametrageComponent).componentInstance;
      composant.previsualisationPurge = {
        nbEntreesSupprimees: 2,
        octetsAvant: 100,
        octetsApres: 60,
      };
      invokeSimule.mockRejectedValue({ type: 'sessionVerrouillee' });

      composant.demanderExecutionPurge();
      await composant.confirmerExecutionPurge('mot-de-passe');

      expect(TestBed.inject(NotificationService).liste()).toEqual([
        expect.objectContaining({
          type: 'erreur',
          message: 'La session est verrouillée : déverrouillez-la avant de purger.',
        }),
      ]);
    });
  });
});
