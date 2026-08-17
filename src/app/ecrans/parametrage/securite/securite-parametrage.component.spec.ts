// Test de l'onglet Sécurité de l'écran Paramétrage (cf. securite-parametrage.component.ts, Phase 15, C15-03,
// US-040, RG-038), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { SqmSecuriteParametrageComponent } from './securite-parametrage.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine minimale suffisante pour ce test.
   * @returns Une racine de test.
   */
  public static racine(): DonneesRacine {
    return {
      versionSchema: 1,
      meta: {
        creeLe: '2026-08-17T08:00:00Z',
        modifieLe: '2026-08-17T08:00:00Z',
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

describe('SqmSecuriteParametrageComponent', () => {
  beforeEach(async () => {
    invokeSimule.mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmSecuriteParametrageComponent],
    }).compileComponents();
    TestBed.inject(DonneesApplicationService).chargerRacine(DonneesDeTest.racine());
  });

  it("masque l'action tant qu'aucun fichier n'est chargé et déverrouillé (décision arbitrée le 2026-08-17)", () => {
    const composant = TestBed.createComponent(SqmSecuriteParametrageComponent).componentInstance;

    expect(composant.fichierOuvert()).toBe(false);
  });

  it('propose l’action dès qu’un fichier est chargé et déverrouillé', () => {
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    const composant = TestBed.createComponent(SqmSecuriteParametrageComponent).componentInstance;

    expect(composant.fichierOuvert()).toBe(true);
  });

  it('bloque la validation locale si le nouveau mot de passe est vide', () => {
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    const composant = TestBed.createComponent(SqmSecuriteParametrageComponent).componentInstance;

    composant.demanderChangement();

    expect(composant.messageErreur).not.toBeNull();
    expect(composant.confirmationMotDePasseVisible()).toBe(false);
  });

  it('bloque la validation locale si les deux mots de passe saisis ne correspondent pas', () => {
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    const composant = TestBed.createComponent(SqmSecuriteParametrageComponent).componentInstance;
    composant.nouveauMotDePasseFormulaire = 'nouveau';
    composant.confirmationNouveauMotDePasseFormulaire = 'different';

    composant.demanderChangement();

    expect(composant.messageErreur).not.toBeNull();
    expect(composant.confirmationMotDePasseVisible()).toBe(false);
  });

  it('ouvre la ressaisie de l’ancien mot de passe une fois le formulaire localement valide', () => {
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    const composant = TestBed.createComponent(SqmSecuriteParametrageComponent).componentInstance;
    composant.nouveauMotDePasseFormulaire = 'nouveau-mot-de-passe';
    composant.confirmationNouveauMotDePasseFormulaire = 'nouveau-mot-de-passe';

    composant.demanderChangement();

    expect(composant.messageErreur).toBeNull();
    expect(composant.confirmationMotDePasseVisible()).toBe(true);
  });

  it('change le mot de passe après confirmation de l’ancien (US-040, RG-038)', async () => {
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    invokeSimule.mockResolvedValue(DonneesDeTest.racine());
    const composant = TestBed.createComponent(SqmSecuriteParametrageComponent).componentInstance;
    composant.nouveauMotDePasseFormulaire = 'nouveau-mot-de-passe';
    composant.confirmationNouveauMotDePasseFormulaire = 'nouveau-mot-de-passe';
    composant.demanderChangement();

    await composant.confirmerChangement('ancien-mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'changer_mot_de_passe_fichier',
      expect.objectContaining({
        ancienMotDePasse: 'ancien-mot-de-passe',
        nouveauMotDePasse: 'nouveau-mot-de-passe',
      }),
    );
    expect(composant.confirmationMotDePasseVisible()).toBe(false);
    expect(composant.nouveauMotDePasseFormulaire).toBe('');
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'succes',
        message: 'Le mot de passe du fichier a été changé.',
      }),
    ]);
  });

  it('convertit un rejet typé « motDePasseSessionDivergent » en message explicite', async () => {
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    invokeSimule.mockRejectedValue({ type: 'motDePasseSessionDivergent' });
    const composant = TestBed.createComponent(SqmSecuriteParametrageComponent).componentInstance;
    composant.nouveauMotDePasseFormulaire = 'nouveau-mot-de-passe';
    composant.confirmationNouveauMotDePasseFormulaire = 'nouveau-mot-de-passe';
    composant.demanderChangement();

    await composant.confirmerChangement('mot-de-passe-incorrect');

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'erreur',
        message: 'Le mot de passe actuel saisi est incorrect.',
      }),
    ]);
  });
});
