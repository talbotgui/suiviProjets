// Test de la section Purge des audits de l'écran Paramétrage (cf. purge-parametrage.component.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { SqmPurgeParametrageComponent } from './purge-parametrage.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

const invokeSimule = jest.mocked(invoke);

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine minimale.
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
      journal: [],
      vuesEnregistrees: [],
    };
  }
}

describe('SqmPurgeParametrageComponent', () => {
  let donneesApplication: DonneesApplicationService;

  beforeEach(async () => {
    invokeSimule.mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmPurgeParametrageComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
  });

  it('prévisualise une purge par densité et affiche le résumé renvoyé', async () => {
    invokeSimule.mockResolvedValue({
      nbAuditsSupprimes: 3,
      nbProjetsConcernes: 1,
      octetsAvant: 2_400_000,
      octetsApres: 900_000,
    });
    const composant = TestBed.createComponent(SqmPurgeParametrageComponent).componentInstance;

    await composant.previsualiserDensite();

    expect(invokeSimule).toHaveBeenCalledWith('previsualiser_purge_densite', {
      donnees: DonneesDeTest.racineVide(),
    });
    expect(composant.previsualisationDensite).toEqual({
      nbAuditsSupprimes: 3,
      nbProjetsConcernes: 1,
      octetsAvant: 2_400_000,
      octetsApres: 900_000,
    });
    expect(composant.formaterOctets(2_400_000)).toBe('2,4 Mo');
  });

  it("n'ouvre pas la ressaisie du mot de passe si la prévisualisation ne concerne aucun audit", async () => {
    invokeSimule.mockResolvedValue({
      nbAuditsSupprimes: 0,
      nbProjetsConcernes: 0,
      octetsAvant: 100,
      octetsApres: 100,
    });
    const composant = TestBed.createComponent(SqmPurgeParametrageComponent).componentInstance;
    await composant.previsualiserDensite();

    composant.demanderExecutionDensite();

    expect(composant.actionEnAttenteMotDePasse).toBeNull();
  });

  it('exécute une purge par densité après confirmation du mot de passe, réinitialise la prévisualisation', async () => {
    invokeSimule.mockResolvedValueOnce({
      nbAuditsSupprimes: 2,
      nbProjetsConcernes: 1,
      octetsAvant: 1_000_000,
      octetsApres: 500_000,
    });
    const composant = TestBed.createComponent(SqmPurgeParametrageComponent).componentInstance;
    await composant.previsualiserDensite();
    composant.demanderExecutionDensite();
    expect(composant.actionEnAttenteMotDePasse).toBe('densite');

    invokeSimule.mockResolvedValueOnce(DonneesDeTest.racineVide());
    await composant.confirmerExecutionDensite('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'executer_purge_densite',
      expect.objectContaining({
        chemin: '/tmp/donnees-test.sqm',
        motDePasse: 'mot-de-passe',
      }),
    );
    expect(composant.previsualisationDensite).toBeNull();
    expect(composant.actionEnAttenteMotDePasse).toBeNull();
    expect(composant.messageSucces).toContain('purge par densité');
  });

  it('prévisualise une purge par âge pour le mode sélectionné et réinitialise au changement de mode', async () => {
    invokeSimule.mockResolvedValue({
      nbAuditsSupprimes: 5,
      nbProjetsConcernes: 2,
      octetsAvant: 3_000_000,
      octetsApres: 1_000_000,
    });
    const composant = TestBed.createComponent(SqmPurgeParametrageComponent).componentInstance;

    await composant.previsualiserAge();

    expect(invokeSimule).toHaveBeenCalledWith(
      'previsualiser_purge_age',
      expect.objectContaining({ mode: 'suppression' }),
    );
    expect(composant.previsualisationAge?.nbAuditsSupprimes).toBe(5);

    composant.changerModeAge('agregationMensuelle');

    expect(composant.modeAge).toBe('agregationMensuelle');
    expect(composant.previsualisationAge).toBeNull();
  });

  it('affiche un message explicite quand la commande native échoue', async () => {
    invokeSimule.mockRejectedValue({ type: 'motDePasseOuFichierInvalide' });
    const composant = TestBed.createComponent(SqmPurgeParametrageComponent).componentInstance;

    await composant.previsualiserDensite();

    expect(composant.messageErreur).toBe('Mot de passe incorrect.');
    expect(composant.previsualisationDensite).toBeNull();
  });

  it("n'ouvre pas la ressaisie du mot de passe pour l'âge sans prévisualisation préalable", () => {
    const composant = TestBed.createComponent(SqmPurgeParametrageComponent).componentInstance;

    composant.demanderExecutionAge();

    expect(composant.actionEnAttenteMotDePasse).toBeNull();
  });

  it('affiche un message explicite quand la prévisualisation par âge échoue', async () => {
    invokeSimule.mockRejectedValue({ type: 'erreurInterne' });
    const composant = TestBed.createComponent(SqmPurgeParametrageComponent).componentInstance;

    await composant.previsualiserAge();

    expect(composant.messageErreur).toBe("Une erreur inattendue est survenue lors de l'opération.");
    expect(composant.previsualisationAge).toBeNull();
  });

  it("affiche un message explicite quand l'exécution de la purge par densité échoue", async () => {
    invokeSimule.mockResolvedValueOnce({
      nbAuditsSupprimes: 1,
      nbProjetsConcernes: 1,
      octetsAvant: 100,
      octetsApres: 50,
    });
    const composant = TestBed.createComponent(SqmPurgeParametrageComponent).componentInstance;
    await composant.previsualiserDensite();
    composant.demanderExecutionDensite();

    invokeSimule.mockRejectedValueOnce({ type: 'fichierVerrouille' });
    await composant.confirmerExecutionDensite('mot-de-passe');

    expect(composant.messageErreur).toBe(
      'Le fichier de données est verrouillé par un autre processus.',
    );
    expect(composant.actionEnAttenteMotDePasse).toBeNull();
  });

  it("affiche un message explicite quand la session est verrouillée à l'exécution de la purge (R10-01)", async () => {
    invokeSimule.mockResolvedValueOnce({
      nbAuditsSupprimes: 1,
      nbProjetsConcernes: 1,
      octetsAvant: 100,
      octetsApres: 50,
    });
    const composant = TestBed.createComponent(SqmPurgeParametrageComponent).componentInstance;
    await composant.previsualiserDensite();
    composant.demanderExecutionDensite();

    invokeSimule.mockRejectedValueOnce({ type: 'sessionVerrouillee' });
    await composant.confirmerExecutionDensite('mot-de-passe');

    expect(composant.messageErreur).toBe(
      'La session est verrouillée : déverrouillez-la avant de sauvegarder.',
    );
  });

  it('exécute une purge par âge après confirmation du mot de passe, réinitialise la prévisualisation', async () => {
    invokeSimule.mockResolvedValueOnce({
      nbAuditsSupprimes: 4,
      nbProjetsConcernes: 2,
      octetsAvant: 2_000_000,
      octetsApres: 1_000_000,
    });
    const composant = TestBed.createComponent(SqmPurgeParametrageComponent).componentInstance;
    await composant.previsualiserAge();
    composant.demanderExecutionAge();

    invokeSimule.mockResolvedValueOnce(DonneesDeTest.racineVide());
    await composant.confirmerExecutionAge('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'executer_purge_age',
      expect.objectContaining({ mode: 'suppression', motDePasse: 'mot-de-passe' }),
    );
    expect(composant.previsualisationAge).toBeNull();
    expect(composant.actionEnAttenteMotDePasse).toBeNull();
    expect(composant.messageSucces).toContain('purge par âge');
  });

  it('annule la ressaisie du mot de passe en cours', async () => {
    invokeSimule.mockResolvedValue({
      nbAuditsSupprimes: 1,
      nbProjetsConcernes: 1,
      octetsAvant: 100,
      octetsApres: 50,
    });
    const composant = TestBed.createComponent(SqmPurgeParametrageComponent).componentInstance;
    await composant.previsualiserAge();
    composant.demanderExecutionAge();
    expect(composant.actionEnAttenteMotDePasse).toBe('age');

    composant.annulerMotDePasse();

    expect(composant.actionEnAttenteMotDePasse).toBeNull();
  });
});
