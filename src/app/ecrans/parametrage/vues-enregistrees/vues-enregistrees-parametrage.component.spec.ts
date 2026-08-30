// Test de l'onglet Vues enregistrées de l'écran Paramétrage (cf. vues-enregistrees-parametrage.component.ts,
// US-054, RG-054), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { DonneesRacine, VueEnregistree } from '../../../services/avecetat/etat/types-donnees';
import { SqmVuesEnregistreesParametrageComponent } from './vues-enregistrees-parametrage.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);

/**
 * Fabrique de données de test (classe à membres statiques uniquement, cf. normes du projet).
 */
class DonneesDeTest {
  /**
   * Construit une racine de test portant les vues fournies.
   * @param vues - Vues enregistrées à placer dans la racine.
   * @returns Une racine de test.
   */
  public static racine(vues: readonly VueEnregistree[]): DonneesRacine {
    return {
      versionSchema: 10,
      meta: {
        creeLe: '2026-08-30T08:00:00Z',
        modifieLe: '2026-08-30T08:00:00Z',
        application: 'Test',
      },
      groupes: [],
      referentiels: {
        reglesDependances: [],
        reglesMarqueursIA: [],
        motifNommageBranches: '^(main)$',
        categoriesDependances: [],
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
      journal: [],
      vuesEnregistrees: vues,
    };
  }

  /**
   * Construit une vue enregistrée de test.
   * @param partiel - Champs à surcharger.
   * @returns Une vue enregistrée.
   */
  public static vue(partiel: Partial<VueEnregistree> = {}): VueEnregistree {
    return {
      id: 'v1',
      nom: 'Ma vue',
      ecran: 'obsolescence',
      versionFiltres: 1,
      parDefaut: false,
      filtres: { groupeId: 'g1', projetIds: null },
      ...partiel,
    };
  }
}

describe('SqmVuesEnregistreesParametrageComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let notification: NotificationService;

  beforeEach(async () => {
    invokeSimule.mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmVuesEnregistreesParametrageComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    notification = TestBed.inject(NotificationService);
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
  });

  it('affiche un message explicite en l’absence de toute vue enregistrée', () => {
    donneesApplication.chargerRacine(DonneesDeTest.racine([]));
    const composant = TestBed.createComponent(
      SqmVuesEnregistreesParametrageComponent,
    ).componentInstance;

    expect(composant.aucuneVue()).toBe(true);
  });

  it('regroupe les vues par écran, avec un libellé lisible', () => {
    donneesApplication.chargerRacine(
      DonneesDeTest.racine([
        DonneesDeTest.vue({ id: 'a', ecran: 'listeTravail', nom: 'Alertes' }),
        DonneesDeTest.vue({ id: 'b', ecran: 'obsolescence', nom: 'Retards' }),
      ]),
    );
    const composant = TestBed.createComponent(
      SqmVuesEnregistreesParametrageComponent,
    ).componentInstance;

    const groupes = composant.groupes();
    expect(groupes.map((g) => g.libelleEcran)).toEqual(['Liste de travail', 'Obsolescence']);
  });

  it('renomme une vue sans altérer ses filtres et journalise via definir_vue (RG-054)', async () => {
    const racine = DonneesDeTest.racine([DonneesDeTest.vue()]);
    donneesApplication.chargerRacine(racine);
    invokeSimule.mockResolvedValue({ ...racine, versionSchema: 11 });
    const composant = TestBed.createComponent(
      SqmVuesEnregistreesParametrageComponent,
    ).componentInstance;

    composant.ouvrirRenommage(DonneesDeTest.vue());
    composant.nomEnRenommage.set('Ma vue renommée');
    composant.validerRenommage(DonneesDeTest.vue());
    await composant.confirmerMotDePasse('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_vue',
      expect.objectContaining({
        id: 'v1',
        nom: 'Ma vue renommée',
        ecran: 'obsolescence',
        versionFiltres: 1,
        parDefaut: false,
        filtres: { groupeId: 'g1', projetIds: null },
        origine: 'Vues enregistrées',
      }),
    );
    expect(notification.liste()).toEqual([expect.objectContaining({ type: 'succes' })]);
  });

  it('ne demande pas de mot de passe si le nom est inchangé ou vide', () => {
    donneesApplication.chargerRacine(DonneesDeTest.racine([DonneesDeTest.vue()]));
    const composant = TestBed.createComponent(
      SqmVuesEnregistreesParametrageComponent,
    ).componentInstance;

    composant.ouvrirRenommage(DonneesDeTest.vue());
    composant.nomEnRenommage.set('  Ma vue  ');
    composant.validerRenommage(DonneesDeTest.vue());

    expect(composant.actionEnAttente()).toBeNull();
  });

  it('duplique une vue en créant une copie « … (copie) » non par défaut', async () => {
    const racine = DonneesDeTest.racine([DonneesDeTest.vue({ parDefaut: true })]);
    donneesApplication.chargerRacine(racine);
    invokeSimule.mockResolvedValue({ ...racine, versionSchema: 11 });
    const composant = TestBed.createComponent(
      SqmVuesEnregistreesParametrageComponent,
    ).componentInstance;

    composant.demanderDuplication(DonneesDeTest.vue({ parDefaut: true }));
    await composant.confirmerMotDePasse('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_vue',
      expect.objectContaining({ id: undefined, nom: 'Ma vue (copie)', parDefaut: false }),
    );
  });

  it('bascule le statut de vue par défaut', async () => {
    const racine = DonneesDeTest.racine([DonneesDeTest.vue()]);
    donneesApplication.chargerRacine(racine);
    invokeSimule.mockResolvedValue({ ...racine, versionSchema: 11 });
    const composant = TestBed.createComponent(
      SqmVuesEnregistreesParametrageComponent,
    ).componentInstance;

    composant.demanderBasculeParDefaut(DonneesDeTest.vue());
    await composant.confirmerMotDePasse('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_vue',
      expect.objectContaining({ id: 'v1', parDefaut: true }),
    );
  });

  it('supprime une vue après double confirmation (suppression puis mot de passe)', async () => {
    const racine = DonneesDeTest.racine([DonneesDeTest.vue()]);
    donneesApplication.chargerRacine(racine);
    invokeSimule.mockResolvedValue({ ...racine, versionSchema: 11, vuesEnregistrees: [] });
    const composant = TestBed.createComponent(
      SqmVuesEnregistreesParametrageComponent,
    ).componentInstance;

    composant.demanderSuppression(DonneesDeTest.vue());
    expect(composant.vueEnSuppression()).not.toBeNull();
    composant.confirmerSuppression();
    await composant.confirmerMotDePasse('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'supprimer_vue',
      expect.objectContaining({ id: 'v1', origine: 'Vues enregistrées' }),
    );
  });

  it("notifie une erreur si la mutation d'une vue échoue", async () => {
    donneesApplication.chargerRacine(DonneesDeTest.racine([DonneesDeTest.vue()]));
    invokeSimule.mockRejectedValue({ type: 'erreurInterne' });
    const composant = TestBed.createComponent(
      SqmVuesEnregistreesParametrageComponent,
    ).componentInstance;

    composant.demanderDuplication(DonneesDeTest.vue());
    await composant.confirmerMotDePasse('mot-de-passe');

    expect(notification.liste()).toEqual([expect.objectContaining({ type: 'erreur' })]);
  });
});
