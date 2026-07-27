// Test du Shell applicatif (cf. shell.component.ts), généré avec l'assistance de l'IA (Claude Code), conformément
// à .claude/rules/01-usage-ia-et-conventions.md.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../services/avecetat/etat/etat-session.service';
import type { Brouillon, DonneesRacine } from '../../services/avecetat/etat/types-donnees';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmShellComponent } from './shell.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

/**
 * Composant factice utilisé comme cible des routes de test : seul son enregistrement importe, jamais son rendu.
 */
@Component({ selector: 'app-composant-factice', template: '' })
class ComposantFactice {}

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine minimale, vide de tout groupe.
   * @returns Une racine de test.
   */
  public static racineVide(): DonneesRacine {
    return {
      versionSchema: 1,
      meta: {
        creeLe: '2026-07-20T08:00:00Z',
        modifieLe: '2026-07-08T17:45:00Z',
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
        verrouillage: {},
        audit: {},
        proxy: {},
        sauvegarde: {},
      },
      campagnes: [],
      brouillon: null,
      traitementsAlertes: [],
      journal: [],
      vuesEnregistrees: [],
    };
  }

  /**
   * Construit un brouillon minimal en attente de traitement.
   * @returns Un brouillon de test.
   */
  public static brouillonEnAttente(): Brouillon {
    return { campagneId: 'campagne-1', creeLe: '2026-07-01T00:00:00Z', resultatsParProjet: [] };
  }
}

describe('SqmShellComponent', () => {
  let router: Router;
  let donneesApplication: DonneesApplicationService;
  let etatSession: EtatSessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmShellComponent],
      providers: [provideRouter([{ path: '**', component: ComposantFactice }])],
    }).compileComponents();
    router = TestBed.inject(Router);
    donneesApplication = TestBed.inject(DonneesApplicationService);
    etatSession = TestBed.inject(EtatSessionService);
  });

  it('affiche la navigation principale et une zone de contenu routée', () => {
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.textContent).toContain('Accueil');
    expect(element.textContent).toContain('Administration');
    expect(element.textContent).toContain('Audits');
    expect(element.textContent).toContain('Synthèse des audits');
    expect(element.textContent).toContain('Synthèse graphique');
    expect(element.querySelector('router-outlet')).not.toBeNull();
  });

  it('signale comme non interactives les entrées de sidebar dont l’écran n’existe pas encore', () => {
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    // Liste de travail (Synthèse des audits depuis la Phase 6 incrément 4, Synthèse graphique depuis la Phase 6
    // incrément 7 et Paramétrage depuis la Phase 7 incrément 2 sont désormais interactives).
    const entreesAVenir = element.querySelectorAll('[aria-disabled="true"]');
    expect(entreesAVenir.length).toBe(1);
  });

  it('navigue vers Synthèse des audits au clic sur l’entrée de sidebar correspondante', async () => {
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    const lien = Array.from(element.querySelectorAll('a.shell__lien')).find((candidat) =>
      candidat.textContent?.includes('Synthèse des audits'),
    );
    expect(lien).not.toBeUndefined();
    lien?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(router.url).toBe('/synthese-audits');
  });

  it('navigue vers Synthèse graphique au clic sur l’entrée de sidebar correspondante', async () => {
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    const lien = Array.from(element.querySelectorAll('a.shell__lien')).find((candidat) =>
      candidat.textContent?.includes('Synthèse graphique'),
    );
    expect(lien).not.toBeUndefined();
    lien?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(router.url).toBe('/synthese-graphique');
  });

  it('navigue vers Paramétrage au clic sur l’entrée de sidebar correspondante', async () => {
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    const lien = Array.from(element.querySelectorAll('a.shell__lien')).find((candidat) =>
      candidat.textContent?.includes('Paramétrage'),
    );
    expect(lien).not.toBeUndefined();
    lien?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(router.url).toBe('/parametrage');
  });

  it('affiche un libellé de repli quand aucun fichier n’est chargé', () => {
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.nomFichier()).toBe('Aucun fichier ouvert');
    expect(fixture.componentInstance.statutSauvegarde()).toBe('—');
  });

  it('affiche le nom du fichier ouvert et son statut de sauvegarde une fois un fichier chargé', () => {
    etatSession.ouvrirFichier('/chemin/vers/suivi-qualimetrie-2026.qdb');
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.nomFichier()).toBe('suivi-qualimetrie-2026.qdb');
    expect(fixture.componentInstance.statutSauvegarde()).toBe('sauvegardé 08/07 17:45');
  });

  it('ouvre Constitution de campagne par défaut (aucune campagne en cours, aucun brouillon)', async () => {
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.ouvrirAudits();
    await fixture.whenStable();

    expect(router.url).toBe('/audits/constitution-campagne');
    expect(fixture.componentInstance.auditsActif()).toBe(true);
  });

  it('ouvre le Tableau de bord d’exécution si une campagne est en cours', async () => {
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    etatSession.demarrerProgressionCampagne(['projet-1']);
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.ouvrirAudits();
    await fixture.whenStable();

    expect(router.url).toBe('/audits/tableau-de-bord');
  });

  it('ouvre le Brouillon si un brouillon reste à traiter et qu’aucune campagne n’est en cours', async () => {
    donneesApplication.chargerRacine({
      ...DonneesDeTest.racineVide(),
      brouillon: DonneesDeTest.brouillonEnAttente(),
    });
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.ouvrirAudits();
    await fixture.whenStable();

    expect(router.url).toBe('/audits/brouillon');
  });

  it('ouvre la recherche transversale au clic sur le bouton de la barre supérieure', () => {
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.querySelector('[role="dialog"]')).toBeNull();

    const bouton = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Recherche transversale"]',
    );
    bouton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('ouvre la recherche transversale sur Ctrl+K depuis n’importe quel écran routé', () => {
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const zoneEcran = element.querySelector('.shell__ecran');
    expect(zoneEcran).not.toBeNull();

    zoneEcran?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
    );
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('referme la recherche transversale sur émission de son événement de fermeture', () => {
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();
    fixture.componentInstance.ouvrirRecherche();
    fixture.detectChanges();

    fixture.componentInstance.fermerRecherche();
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('ignore les autres combinaisons de touches', () => {
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const zoneEcran = element.querySelector('.shell__ecran');

    zoneEcran?.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });
});
