// Test de la section Seuils de couleur de l'écran Paramétrage (cf. seuils-parametrage.component.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { SqmSeuilsParametrageComponent } from './seuils-parametrage.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine minimale avec des seuils connus.
   * @returns Une racine de test.
   */
  public static racineVide(): DonneesRacine {
    return {
      versionSchema: 1,
      meta: {
        creeLe: '2026-07-20T08:00:00Z',
        modifieLe: '2026-07-20T08:00:00Z',
        application: 'Test',
      },
      groupes: [],
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

describe('SqmSeuilsParametrageComponent', () => {
  let donneesApplication: DonneesApplicationService;

  beforeEach(async () => {
    invokeSimule.mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmSeuilsParametrageComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
  });

  it("affiche un état vide quand aucun fichier n'est chargé", () => {
    const composant = TestBed.createComponent(SqmSeuilsParametrageComponent).componentInstance;

    expect(composant.fichierCharge()).toBe(false);
    expect(composant.nombreDeModifications()).toBe(0);
    composant.demanderEnregistrement();
    expect(composant.actionEnAttenteMotDePasse).toBe(false);
  });

  it('annule la ressaisie du mot de passe en cours', () => {
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    const composant = TestBed.createComponent(SqmSeuilsParametrageComponent).componentInstance;
    composant.vitaliteMortJours = 400;
    composant.demanderEnregistrement();

    composant.annulerMotDePasse();

    expect(composant.actionEnAttenteMotDePasse).toBe(false);
  });

  it.each([
    ['fichierVerrouille', 'Le fichier de données est verrouillé par un autre processus.'],
    ['motDePasseOuFichierInvalide', 'Mot de passe incorrect.'],
    ['sessionVerrouillee', 'La session est verrouillée : déverrouillez-la avant de sauvegarder.'],
    [
      'motDePasseSessionDivergent',
      'Le mot de passe saisi ne correspond pas à celui de la session en cours.',
    ],
    ['erreurInterne', "Une erreur inattendue est survenue lors de l'enregistrement."],
  ] as const)('traduit l’anomalie « %s » en message explicite', async (type, messageAttendu) => {
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    const composant = TestBed.createComponent(SqmSeuilsParametrageComponent).componentInstance;
    composant.vitaliteMortJours = 400;
    invokeSimule.mockRejectedValue({ type });

    composant.demanderEnregistrement();
    await composant.confirmerEnregistrement('mot-de-passe');

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'erreur', message: messageAttendu }),
    ]);
  });

  it('initialise le formulaire depuis les seuils chargés', () => {
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());

    const composant = TestBed.createComponent(SqmSeuilsParametrageComponent).componentInstance;

    expect(composant.fichierCharge()).toBe(true);
    expect(composant.vitaliteMortJours).toBe(365);
    expect(composant.materialiteBrouillonVariationRelative).toBe(0.1);
    expect(composant.nombreDeModifications()).toBe(0);
  });

  it('détecte les champs modifiés et ne demande rien si aucun changement', () => {
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    const composant = TestBed.createComponent(SqmSeuilsParametrageComponent).componentInstance;

    composant.demanderEnregistrement();
    expect(composant.actionEnAttenteMotDePasse).toBe(false);

    composant.vitaliteMortJours = 400;
    expect(composant.nombreDeModifications()).toBe(1);

    composant.demanderEnregistrement();
    expect(composant.actionEnAttenteMotDePasse).toBe(true);
  });

  it('invoque definir_seuil une fois par champ modifié puis réinitialise le formulaire', async () => {
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    const composant = TestBed.createComponent(SqmSeuilsParametrageComponent).componentInstance;
    composant.vitaliteMortJours = 400;
    composant.couvertureSeuilRouge = 45;
    invokeSimule.mockResolvedValue(DonneesDeTest.racineVide());

    composant.demanderEnregistrement();
    await composant.confirmerEnregistrement('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledTimes(2);
    expect(invokeSimule).toHaveBeenNthCalledWith(
      1,
      'definir_seuil',
      expect.objectContaining({ cle: 'vitalite.mortJours', valeur: 400 }),
    );
    expect(invokeSimule).toHaveBeenNthCalledWith(
      2,
      'definir_seuil',
      expect.objectContaining({ cle: 'couverture.seuilRouge', valeur: 45 }),
    );
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes' }),
    ]);
    expect(composant.nombreDeModifications()).toBe(0);
    expect(composant.actionEnAttenteMotDePasse).toBe(false);
  });

  it('arrête la séquence au premier échec sans tenter les seuils suivants', async () => {
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    const composant = TestBed.createComponent(SqmSeuilsParametrageComponent).componentInstance;
    composant.vitaliteMortJours = 400;
    composant.couvertureSeuilRouge = 45;
    invokeSimule.mockRejectedValue({ type: 'cleSeuilIntrouvable' });

    composant.demanderEnregistrement();
    await composant.confirmerEnregistrement('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'erreur',
        message: "Ce seuil n'est pas reconnu par le fichier de données ouvert.",
      }),
    ]);
  });
});
