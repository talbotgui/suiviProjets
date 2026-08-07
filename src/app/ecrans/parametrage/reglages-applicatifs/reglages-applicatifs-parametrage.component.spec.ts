// Test de la zone Réglages applicatifs de l'écran Paramétrage (cf. reglages-applicatifs-parametrage.component.ts,
// US-034, US-035, Phase 10 incrément 8), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
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
        proxy: { url: 'http://proxy.exemple.local:3128' },
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

describe('SqmReglagesApplicatifsParametrageComponent', () => {
  beforeEach(async () => {
    invokeSimule.mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmReglagesApplicatifsParametrageComponent],
    }).compileComponents();
    TestBed.inject(DonneesApplicationService).chargerRacine(DonneesDeTest.racine());
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
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
    expect(composant.reglageEnAttenteMotDePasse).toBeNull();
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
    expect(composant.verrouillageEditVisible).toBe(false);
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
