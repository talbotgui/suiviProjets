// Test du Shell applicatif (cf. shell.component.ts), généré avec l'assistance de l'IA (Claude Code), conformément
// à .claude/rules/01-usage-ia-et-conventions.md.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../services/avecetat/etat/etat-session.service';
import type { Brouillon, DonneesRacine } from '../../services/avecetat/etat/types-donnees';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmShellComponent } from './shell.component';

// `isTauri` toujours vrai ici : ce test exerce le passage réel par `invoke` (cf. `InvocationCommandeUtils`), sur
// le modèle de `facade-commandes.service.spec.ts`.
jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);
const isTauriSimule = jest.mocked(isTauri);

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
    invokeSimule.mockReset();
    isTauriSimule.mockReturnValue(true);
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

  it('rend interactives les sept entrées de sidebar, toutes désormais construites (Phase 8)', () => {
    const fixture = TestBed.createComponent(SqmShellComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    // Plus aucune entrée « à venir » depuis la Phase 8 (Liste de travail, dernière entrée restée non interactive).
    expect(element.querySelectorAll('[aria-disabled="true"]').length).toBe(0);
    const lienListeTravail = Array.from(element.querySelectorAll('a.shell__lien')).find(
      (candidat) => candidat.textContent?.includes('Liste de travail'),
    );
    expect(lienListeTravail).not.toBeUndefined();
    expect(lienListeTravail?.getAttribute('href')).toBe('/liste-travail');
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

  it('ouvre le Brouillon plutôt que le Tableau de bord une fois la dernière campagne achevée (Phase 12, R12-04)', async () => {
    // `progressionCampagne` reste non `null` pour le reste de la session une fois une première campagne lancée
    // (« la campagne en cours ou la dernière campagne exécutée ») : `cibleAudits` doit donc bien vérifier que la
    // campagne est *encore* en cours (au moins un projet non terminal), pas seulement que `progressionCampagne`
    // a déjà été renseigné une fois, sous peine de router indéfiniment vers le Tableau de bord d'une campagne déjà
    // achevée, sans jamais pouvoir rejoindre le Brouillon qui en résulte.
    donneesApplication.chargerRacine({
      ...DonneesDeTest.racineVide(),
      brouillon: DonneesDeTest.brouillonEnAttente(),
    });
    etatSession.demarrerProgressionCampagne(['projet-1']);
    etatSession.mettreAJourProgressionProjet('projet-1', { statut: 'termine' });
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
      'button[title="Recherche transversale (Ctrl+K)"]',
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

  describe('verrouillage manuel et automatique (US-026, RNF-014)', () => {
    it('verrouille manuellement au clic sur le bouton 🔒 et affiche la superposition', async () => {
      invokeSimule.mockResolvedValue(undefined);
      donneesApplication.chargerRacine(DonneesDeTest.racineVide());
      etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
      const fixture = TestBed.createComponent(SqmShellComponent);
      fixture.detectChanges();
      const element = DomTestUtils.obtenirElementNatif(fixture);

      element
        .querySelector<HTMLButtonElement>('button[title="Verrouillage manuel"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(invokeSimule).toHaveBeenCalledWith('verrouiller_session', {});
      expect(element.querySelector('app-verrouillage')).not.toBeNull();
    });

    it('n’affiche pas la superposition de verrouillage tant qu’aucun fichier n’est ouvert', () => {
      const fixture = TestBed.createComponent(SqmShellComponent);
      fixture.detectChanges();
      const element = DomTestUtils.obtenirElementNatif(fixture);

      expect(element.querySelector('app-verrouillage')).toBeNull();
    });

    it('verrouille automatiquement après le délai d’inactivité paramétré (RNF-014)', () => {
      jest.useFakeTimers();
      try {
        invokeSimule.mockResolvedValue(undefined);
        donneesApplication.chargerRacine(DonneesDeTest.racineVide());
        etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
        const fixture = TestBed.createComponent(SqmShellComponent);
        fixture.detectChanges();

        jest.advanceTimersByTime(15 * 60_000);

        expect(invokeSimule).toHaveBeenCalledWith('verrouiller_session', {});
      } finally {
        jest.useRealTimers();
      }
    });

    it('repousse le verrouillage automatique sur activité (clic)', () => {
      jest.useFakeTimers();
      try {
        invokeSimule.mockResolvedValue(undefined);
        donneesApplication.chargerRacine(DonneesDeTest.racineVide());
        etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
        const fixture = TestBed.createComponent(SqmShellComponent);
        fixture.detectChanges();

        jest.advanceTimersByTime(10 * 60_000);
        fixture.componentInstance.gererActivitePointeur();
        jest.advanceTimersByTime(10 * 60_000);

        expect(invokeSimule).not.toHaveBeenCalledWith('verrouiller_session', {});
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('sauvegarde manuelle (RG-001 à RG-003)', () => {
    it('sauvegarde le fichier après confirmation du mot de passe et referme le panneau', async () => {
      invokeSimule.mockResolvedValue(undefined);
      donneesApplication.chargerRacine(DonneesDeTest.racineVide());
      etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
      const fixture = TestBed.createComponent(SqmShellComponent);
      fixture.detectChanges();
      const element = DomTestUtils.obtenirElementNatif(fixture);

      element
        .querySelector<HTMLButtonElement>('button[title="Sauvegarder"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(element.querySelector('app-confirmation-mot-de-passe')).not.toBeNull();

      await fixture.componentInstance.confirmerSauvegarde('mot-de-passe');
      fixture.detectChanges();

      expect(invokeSimule).toHaveBeenCalledWith(
        'sauvegarder_fichier',
        expect.objectContaining({ chemin: '/tmp/donnees-test.sqm', motDePasse: 'mot-de-passe' }),
      );
      expect(element.querySelector('app-confirmation-mot-de-passe')).toBeNull();
    });

    it('affiche un message d’erreur bref si la sauvegarde échoue', async () => {
      invokeSimule.mockRejectedValue({ type: 'fichierVerrouille' });
      donneesApplication.chargerRacine(DonneesDeTest.racineVide());
      etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
      const fixture = TestBed.createComponent(SqmShellComponent);
      fixture.detectChanges();
      const element = DomTestUtils.obtenirElementNatif(fixture);

      element
        .querySelector<HTMLButtonElement>('button[title="Sauvegarder"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      await fixture.componentInstance.confirmerSauvegarde('mot-de-passe');
      fixture.detectChanges();

      expect(element.textContent).toContain('La sauvegarde a échoué. Réessayez.');
    });

    it('affiche l’avertissement de taille après une sauvegarde dépassant le seuil (US-035, RG-032)', async () => {
      const racine: DonneesRacine = {
        ...DonneesDeTest.racineVide(),
        parametres: {
          ...DonneesDeTest.racineVide().parametres,
          seuilAvertissementTailleOctets: 10,
        },
      };
      invokeSimule.mockResolvedValue(undefined);
      donneesApplication.chargerRacine(racine);
      etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
      const fixture = TestBed.createComponent(SqmShellComponent);
      fixture.detectChanges();

      await fixture.componentInstance.confirmerSauvegarde('mot-de-passe');
      fixture.detectChanges();
      const element = DomTestUtils.obtenirElementNatif(fixture);

      expect(fixture.componentInstance.avertissementTailleActif()).toBe(true);
      expect(element.textContent).toContain('dépasse le seuil de taille configuré');
    });

    it('ne déclenche pas l’avertissement de taille sous le seuil configuré', async () => {
      invokeSimule.mockResolvedValue(undefined);
      donneesApplication.chargerRacine(DonneesDeTest.racineVide());
      etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
      const fixture = TestBed.createComponent(SqmShellComponent);
      fixture.detectChanges();

      await fixture.componentInstance.confirmerSauvegarde('mot-de-passe');

      expect(fixture.componentInstance.avertissementTailleActif()).toBe(false);
    });

    it('referme l’avertissement de taille sans naviguer', async () => {
      const racine: DonneesRacine = {
        ...DonneesDeTest.racineVide(),
        parametres: {
          ...DonneesDeTest.racineVide().parametres,
          seuilAvertissementTailleOctets: 10,
        },
      };
      invokeSimule.mockResolvedValue(undefined);
      donneesApplication.chargerRacine(racine);
      etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
      const fixture = TestBed.createComponent(SqmShellComponent);
      fixture.detectChanges();
      await fixture.componentInstance.confirmerSauvegarde('mot-de-passe');

      fixture.componentInstance.fermerAvertissementTaille();

      expect(fixture.componentInstance.avertissementTailleActif()).toBe(false);
    });
  });
});
