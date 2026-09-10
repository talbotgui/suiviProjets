// Test de la zone Réglages applicatifs de l'écran Paramétrage (cf. reglages-applicatifs-parametrage.component.ts,
// US-034, US-035, Phase 10 incrément 8), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { DomTestUtils } from '../../../testing/dom-test.utils';
import { SqmReglagesApplicatifsParametrageComponent } from './reglages-applicatifs-parametrage.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine minimale portant des réglages applicatifs connus.
   * @returns Une racine de test.
   */
  public static racine(): DonneesRacine {
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
        motifNommageBranches: '',
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
        proxy: { url: 'http://proxy.exemple.local:3128' },
        sauvegarde: { nombreSauvegardesSecurite: 5 },
        seuilAvertissementTailleOctets: 10_485_760,
        cadenceCommits: {
          fenetreJours: 28,
          seuilJoursOuvresSansPoussee: 3,
          multiplicateurEcartCadence: 2,
          ponderationInactivite: 0.5,
          ponderationEcartCadence: 0.3,
          ponderationSoiree: 0.2,
          heureDebutSoiree: 19,
          heureFinSoiree: 7,
          fuseauHoraire: 'Europe/Paris',
          comptesExclus: [],
        },
      },
      campagnes: [],
      brouillon: null,
      traitementsAlertes: [],
      journal: [],
      vuesEnregistrees: [],
    };
  }
}

describe('SqmReglagesApplicatifsParametrageComponent', () => {
  beforeEach(async () => {
    invokeSimule.mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmReglagesApplicatifsParametrageComponent],
    }).compileComponents();
    TestBed.inject(DonneesApplicationService).chargerRacine(DonneesDeTest.racine());
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
  });

  it('signale que la concurrence d’audit fait exception à l’application immédiate (US-040)', () => {
    const fixture = TestBed.createComponent(SqmReglagesApplicatifsParametrageComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.textContent).toContain("à l'exception de la concurrence d'audit par défaut");
    expect(element.textContent).toContain(
      "S'applique aux campagnes lancées après cette modification",
    );
  });

  it('pré-remplit le formulaire de verrouillage avec les valeurs actuelles', () => {
    const composant = TestBed.createComponent(
      SqmReglagesApplicatifsParametrageComponent,
    ).componentInstance;

    composant.ouvrirEditionVerrouillage();

    expect(composant.delaiInactiviteMinutesFormulaire).toBe(15);
    expect(composant.echecsAvantFermetureFormulaire).toBe(5);
  });

  it('bloque l’enregistrement du verrouillage avec un délai nul ou négatif', () => {
    const composant = TestBed.createComponent(
      SqmReglagesApplicatifsParametrageComponent,
    ).componentInstance;
    composant.ouvrirEditionVerrouillage();
    composant.delaiInactiviteMinutesFormulaire = 0;

    composant.demanderEnregistrementVerrouillage();

    expect(composant.messageErreur).not.toBeNull();
    expect(composant.reglageEnAttenteMotDePasse()).toBeNull();
  });

  it('enregistre le verrouillage après confirmation du mot de passe (US-034, RG-031)', async () => {
    const composant = TestBed.createComponent(
      SqmReglagesApplicatifsParametrageComponent,
    ).componentInstance;
    invokeSimule.mockResolvedValue(DonneesDeTest.racine());
    composant.ouvrirEditionVerrouillage();
    composant.delaiInactiviteMinutesFormulaire = 30;
    composant.echecsAvantFermetureFormulaire = 3;

    composant.demanderEnregistrementVerrouillage();
    await composant.confirmerEnregistrementVerrouillage('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_verrouillage',
      expect.objectContaining({ delaiInactiviteMinutes: 30, echecsAvantFermeture: 3 }),
    );
    expect(composant.verrouillageEditVisible()).toBe(false);
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'succes',
        message: 'Les réglages de verrouillage ont été enregistrés.',
      }),
    ]);
  });

  it('enregistre la concurrence d’audit après confirmation du mot de passe (US-034, RG-031)', async () => {
    const composant = TestBed.createComponent(
      SqmReglagesApplicatifsParametrageComponent,
    ).componentInstance;
    invokeSimule.mockResolvedValue(DonneesDeTest.racine());
    composant.ouvrirEditionConcurrence();
    composant.concurrenceFormulaire = 8;

    composant.demanderEnregistrementConcurrence();
    await composant.confirmerEnregistrementConcurrence('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_concurrence_audit',
      expect.objectContaining({ concurrence: 8 }),
    );
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'succes',
        message: 'La concurrence d’audit a été enregistrée.',
      }),
    ]);
  });

  it('pré-remplit puis enregistre le réglage de proxy, url et chemin vides transmis comme absents', async () => {
    const composant = TestBed.createComponent(
      SqmReglagesApplicatifsParametrageComponent,
    ).componentInstance;
    invokeSimule.mockResolvedValue(DonneesDeTest.racine());
    composant.ouvrirEditionProxy();
    expect(composant.urlProxyFormulaire).toBe('http://proxy.exemple.local:3128');
    composant.urlProxyFormulaire = '   ';
    composant.cheminBundleCaFormulaire = '';

    composant.demanderEnregistrementProxy();
    await composant.confirmerEnregistrementProxy('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_proxy',
      expect.objectContaining({ url: undefined, cheminBundleCa: undefined }),
    );
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'Le réglage de proxy a été enregistré.' }),
    ]);
  });

  it('enregistre le nombre de sauvegardes de sécurité après confirmation du mot de passe (US-034, RG-031)', async () => {
    const composant = TestBed.createComponent(
      SqmReglagesApplicatifsParametrageComponent,
    ).componentInstance;
    invokeSimule.mockResolvedValue(DonneesDeTest.racine());
    composant.ouvrirEditionNombreSauvegardes();
    composant.nombreSauvegardesFormulaire = 10;

    composant.demanderEnregistrementNombreSauvegardes();
    await composant.confirmerEnregistrementNombreSauvegardes('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_nombre_sauvegardes_securite',
      expect.objectContaining({ nombre: 10 }),
    );
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'succes',
        message: 'Le nombre de sauvegardes de sécurité a été enregistré.',
      }),
    ]);
  });

  it('convertit le seuil d’avertissement en octets à l’enregistrement (US-035, RG-032)', async () => {
    const composant = TestBed.createComponent(
      SqmReglagesApplicatifsParametrageComponent,
    ).componentInstance;
    invokeSimule.mockResolvedValue(DonneesDeTest.racine());
    expect(composant.seuilAvertissementMoActuel()).toBe(10);
    composant.ouvrirEditionSeuilAvertissement();
    composant.seuilAvertissementMoFormulaire = 5;

    composant.demanderEnregistrementSeuilAvertissement();
    await composant.confirmerEnregistrementSeuilAvertissement('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_seuil_avertissement_taille',
      expect.objectContaining({ seuilOctets: 5 * 1024 * 1024 }),
    );
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'succes',
        message: 'Le seuil d’avertissement de taille a été enregistré.',
      }),
    ]);
  });

  it('enregistre les seuils « Commits des membres » après confirmation du mot de passe (US-060, RG-060)', async () => {
    const composant = TestBed.createComponent(
      SqmReglagesApplicatifsParametrageComponent,
    ).componentInstance;
    invokeSimule.mockResolvedValue(DonneesDeTest.racine());
    composant.ouvrirEditionCadenceCommits();
    composant.cadenceCommitsFormulaire.fenetreJours = 14;
    composant.cadenceCommitsFormulaire.fuseauHoraire = 'UTC';
    composant.cadenceCommitsFormulaire.comptesExclusTexte = 'robot-ci\nrobot-ci\nrelease-bot';

    composant.demanderEnregistrementCadenceCommits();
    await composant.confirmerEnregistrementCadenceCommits('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_parametres_cadence_commits',
      expect.objectContaining({
        motDePasse: 'mot-de-passe',
        parametres: {
          fenetreJours: 14,
          seuilJoursOuvresSansPoussee: 3,
          multiplicateurEcartCadence: 2,
          ponderationInactivite: 0.5,
          ponderationEcartCadence: 0.3,
          ponderationSoiree: 0.2,
          heureDebutSoiree: 19,
          heureFinSoiree: 7,
          fuseauHoraire: 'UTC',
          comptesExclus: ['robot-ci', 'release-bot'],
        },
      }),
    );
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'succes',
        message: 'Les seuils « Commits des membres » ont été enregistrés.',
      }),
    ]);
  });

  it('bloque les seuils « Commits des membres » hors bornes sans ressaisie du mot de passe', () => {
    const composant = TestBed.createComponent(
      SqmReglagesApplicatifsParametrageComponent,
    ).componentInstance;
    composant.ouvrirEditionCadenceCommits();
    composant.cadenceCommitsFormulaire.fenetreJours = 3;

    composant.demanderEnregistrementCadenceCommits();

    expect(composant.reglageEnAttenteMotDePasse()).toBeNull();
    expect(composant.messageErreur).not.toBeNull();
  });

  it('bloque une plage de soirée aux bornes identiques et des pondérations toutes nulles', () => {
    const composant = TestBed.createComponent(
      SqmReglagesApplicatifsParametrageComponent,
    ).componentInstance;

    composant.ouvrirEditionCadenceCommits();
    composant.cadenceCommitsFormulaire.heureDebutSoiree = 21;
    composant.cadenceCommitsFormulaire.heureFinSoiree = 21;
    composant.demanderEnregistrementCadenceCommits();
    expect(composant.reglageEnAttenteMotDePasse()).toBeNull();
    expect(composant.messageErreur).not.toBeNull();

    composant.ouvrirEditionCadenceCommits();
    composant.cadenceCommitsFormulaire.ponderationInactivite = 0;
    composant.cadenceCommitsFormulaire.ponderationEcartCadence = 0;
    composant.cadenceCommitsFormulaire.ponderationSoiree = 0;
    composant.demanderEnregistrementCadenceCommits();
    expect(composant.reglageEnAttenteMotDePasse()).toBeNull();
    expect(composant.messageErreur).not.toBeNull();
  });

  it('dédoublonne les comptes exclus sans tenir compte de la casse (première occurrence conservée)', async () => {
    const composant = TestBed.createComponent(
      SqmReglagesApplicatifsParametrageComponent,
    ).componentInstance;
    invokeSimule.mockResolvedValue(DonneesDeTest.racine());
    composant.ouvrirEditionCadenceCommits();
    composant.cadenceCommitsFormulaire.comptesExclusTexte = 'Robot-CI\nrobot-ci, bot';

    composant.demanderEnregistrementCadenceCommits();
    await composant.confirmerEnregistrementCadenceCommits('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_parametres_cadence_commits',
      expect.objectContaining({
        parametres: {
          fenetreJours: 28,
          seuilJoursOuvresSansPoussee: 3,
          multiplicateurEcartCadence: 2,
          ponderationInactivite: 0.5,
          ponderationEcartCadence: 0.3,
          ponderationSoiree: 0.2,
          heureDebutSoiree: 19,
          heureFinSoiree: 7,
          fuseauHoraire: 'Europe/Paris',
          comptesExclus: ['Robot-CI', 'bot'],
        },
      }),
    );
  });

  it('convertit un rejet typé « reglageApplicatifInvalide » en message explicite', async () => {
    const composant = TestBed.createComponent(
      SqmReglagesApplicatifsParametrageComponent,
    ).componentInstance;
    invokeSimule.mockRejectedValue({ type: 'reglageApplicatifInvalide' });
    composant.ouvrirEditionConcurrence();
    composant.concurrenceFormulaire = 1;

    composant.demanderEnregistrementConcurrence();
    await composant.confirmerEnregistrementConcurrence('mot-de-passe');

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'erreur', message: 'Ce réglage n’est pas valide.' }),
    ]);
  });
});
