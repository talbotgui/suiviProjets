// Test de la superposition de Verrouillage (cf. verrouillage.component.ts, US-026), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatFichier, EtatSessionService } from '../../services/avecetat/etat/etat-session.service';
import type { DonneesRacine } from '../../services/avecetat/etat/types-donnees';
import { SqmVerrouillageComponent } from './verrouillage.component';

// `isTauri` toujours vrai ici : ce test exerce le passage réel par `invoke` (cf. `InvocationCommandeUtils`), sur
// le modèle de `facade-commandes.service.spec.ts`.
jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);
const isTauriSimule = jest.mocked(isTauri);

/**
 * Composant factice utilisé comme cible de route de test (même motif que `synthese-audits.component.spec.ts`).
 */
@Component({ selector: 'app-composant-factice', template: '' })
class ComposantFactice {}

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine de test avec un seuil d'échecs de déverrouillage réduit, pour raccourcir les tests.
   * @param echecsAvantFermeture - Seuil d'échecs consécutifs avant fermeture complète du fichier.
   * @returns La racine de test construite.
   */
  public static racine(echecsAvantFermeture: number): DonneesRacine {
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
        verrouillage: { delaiInactiviteMinutes: 15, echecsAvantFermeture },
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

describe('SqmVerrouillageComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let etatSession: EtatSessionService;

  beforeEach(async () => {
    invokeSimule.mockReset();
    isTauriSimule.mockReturnValue(true);
    await TestBed.configureTestingModule({
      imports: [SqmVerrouillageComponent],
      providers: [provideRouter([{ path: '**', component: ComposantFactice }])],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    etatSession = TestBed.inject(EtatSessionService);
    donneesApplication.chargerRacine(DonneesDeTest.racine(3));
    etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
    etatSession.verrouiller();
  });

  /**
   * Crée et initialise un fixture du composant.
   * @returns Le fixture prêt à l'emploi.
   */
  function creerFixture(): ComponentFixture<SqmVerrouillageComponent> {
    const fixture = TestBed.createComponent(SqmVerrouillageComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('affiche 0 échec au départ et aucun message d’erreur', () => {
    const fixture = creerFixture();

    expect(fixture.componentInstance.echecsDeverrouillage()).toBe(0);
    expect(fixture.componentInstance.messageErreur).toBeNull();
    expect(fixture.componentInstance.essaisRestants()).toBe(3);
  });

  it('déverrouille la session avec le bon mot de passe', async () => {
    const fixture = creerFixture();
    invokeSimule.mockResolvedValue(undefined);

    await fixture.componentInstance.deverrouiller('bon-mot-de-passe');

    expect(fixture.componentInstance.messageErreur).toBeNull();
    expect(etatSession.etatFichier()).toBe(EtatFichier.Ouvert);
  });

  it('affiche un message d’erreur sans détail technique et décrémente les essais restants', async () => {
    const fixture = creerFixture();
    invokeSimule.mockRejectedValue({ type: 'motDePasseOuFichierInvalide' });

    await fixture.componentInstance.deverrouiller('mauvais-mot-de-passe');

    expect(fixture.componentInstance.messageErreur).toBe('Mot de passe incorrect.');
    expect(fixture.componentInstance.echecsDeverrouillage()).toBe(1);
    expect(fixture.componentInstance.essaisRestants()).toBe(2);
    expect(etatSession.etatFichier()).toBe(EtatFichier.Verrouille);
  });

  it('ferme le fichier et navigue vers /demarrage après le nombre paramétré d’échecs (US-026)', async () => {
    const fixture = creerFixture();
    const router = TestBed.inject(Router);
    invokeSimule.mockRejectedValue({ type: 'motDePasseOuFichierInvalide' });

    await fixture.componentInstance.deverrouiller('mauvais-mot-de-passe');
    await fixture.componentInstance.deverrouiller('mauvais-mot-de-passe');
    await fixture.componentInstance.deverrouiller('mauvais-mot-de-passe');
    await fixture.whenStable();

    expect(etatSession.etatFichier()).toBe(EtatFichier.Ferme);
    expect(donneesApplication.racine()).toBeNull();
    expect(router.url).toBe('/demarrage');
  });
});
