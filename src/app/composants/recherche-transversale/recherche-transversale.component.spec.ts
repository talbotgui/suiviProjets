// Test de SqmRechercheTransversaleComponent (cf. recherche-transversale.component.ts, US-021, F16), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import type { DonneesRacine, Groupe } from '../../services/avecetat/etat/types-donnees';
import { TypeSource } from '../../services/avecetat/etat/types-donnees';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmRechercheTransversaleComponent } from './recherche-transversale.component';

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
   * Construit une racine de test à un groupe et un projet portant une dépendance « log4j » sur son dernier audit.
   * @returns Une racine de test.
   */
  public static racineAvecDependance(): DonneesRacine {
    const groupe: Groupe = {
      id: 'groupe-1',
      nom: 'Équipe Paiement',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [
        {
          id: 'projet-1',
          nom: 'Service Facturation',
          description: '',
          iaAutorisee: false,
          sources: [
            {
              id: 'source-1',
              instanceId: 'instance-1',
              type: TypeSource.DepotGitlab,
              idExterne: 'groupe/service-facturation',
            },
          ],
          annotations: [],
          audits: [
            {
              id: 'audit-0',
              date: '2026-06-01T08:00:00Z',
              campagneId: 'campagne-0',
              typeAudit: 'reguliere',
              resultats: [
                {
                  type: 'gitlab.dependances',
                  sourceId: 'source-1',
                  refEffective: 'main',
                  shaTete: 'sha0',
                  dependances: [{ reference: 'log4j', version: '2.14.0', manifeste: 'pom.xml' }],
                },
              ],
            },
            {
              id: 'audit-1',
              date: '2026-07-01T08:00:00Z',
              campagneId: 'campagne-1',
              typeAudit: 'reguliere',
              resultats: [
                {
                  type: 'gitlab.dependances',
                  sourceId: 'source-1',
                  refEffective: 'main',
                  shaTete: 'sha1',
                  dependances: [{ reference: 'log4j', version: '2.17.1', manifeste: 'pom.xml' }],
                },
              ],
            },
          ],
        },
      ],
    };
    return {
      versionSchema: 1,
      meta: {
        creeLe: '2026-07-20T08:00:00Z',
        modifieLe: '2026-07-20T08:00:00Z',
        application: 'Test',
      },
      groupes: [groupe],
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
   * Saisit un terme dans le champ de recherche et déclenche l'événement `input` correspondant.
   * @param champ - Champ de recherche natif.
   * @param terme - Terme à saisir.
   */
  public static saisirTerme(champ: HTMLInputElement, terme: string): void {
    champ.value = terme;
    champ.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

describe('SqmRechercheTransversaleComponent', () => {
  let router: Router;
  let donneesApplication: DonneesApplicationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmRechercheTransversaleComponent],
      providers: [provideRouter([{ path: '**', component: ComposantFactice }])],
    }).compileComponents();
    router = TestBed.inject(Router);
    donneesApplication = TestBed.inject(DonneesApplicationService);
  });

  it('affiche un message d’indisponibilité tant qu’aucun fichier n’est chargé', () => {
    const fixture = TestBed.createComponent(SqmRechercheTransversaleComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.textContent).toContain('Recherche indisponible');
    expect(element.querySelector('input[type="text"]')).toBeNull();
  });

  it('affiche les résultats groupés par nature et navigue vers la fiche projet en sélectionnant une occurrence', async () => {
    donneesApplication.chargerRacine(DonneesDeTest.racineAvecDependance());
    const fixture = TestBed.createComponent(SqmRechercheTransversaleComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);
    let fermee = false;
    fixture.componentInstance.fermee.subscribe(() => {
      fermee = true;
    });

    const champ = element.querySelector('input[type="text"]');
    expect(champ).toBeInstanceOf(HTMLInputElement);
    if (!(champ instanceof HTMLInputElement)) {
      throw new Error('champ de recherche introuvable');
    }
    DonneesDeTest.saisirTerme(champ, 'log4j');
    fixture.detectChanges();

    expect(element.textContent).toContain('Dépendances');
    expect(element.textContent).toContain('log4j');

    const boutonResultat = element.querySelector('.recherche-transversale__groupe button');
    expect(boutonResultat).not.toBeNull();
    boutonResultat?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(router.url).toBe('/fiche-projet/projet-1');
    expect(fermee).toBe(true);
  });

  it('affiche un message explicite quand aucun résultat ne correspond au terme', () => {
    donneesApplication.chargerRacine(DonneesDeTest.racineAvecDependance());
    const fixture = TestBed.createComponent(SqmRechercheTransversaleComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    const champ = element.querySelector('input[type="text"]');
    if (!(champ instanceof HTMLInputElement)) {
      throw new Error('champ de recherche introuvable');
    }
    DonneesDeTest.saisirTerme(champ, 'inexistant');
    fixture.detectChanges();

    expect(element.textContent).toContain('Aucun résultat');
  });

  it('navigue vers la fiche projet en sélectionnant une entité « projet »', async () => {
    donneesApplication.chargerRacine(DonneesDeTest.racineAvecDependance());
    const fixture = TestBed.createComponent(SqmRechercheTransversaleComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    composant.naviguerVersEntite({
      type: 'projet',
      id: 'projet-1',
      libelle: 'Service Facturation',
      groupeNom: 'Équipe Paiement',
      projetId: 'projet-1',
    });
    await fixture.whenStable();

    expect(router.url).toBe('/fiche-projet/projet-1');
  });

  it('navigue vers l’Administration en sélectionnant une entité « groupe »', async () => {
    donneesApplication.chargerRacine(DonneesDeTest.racineAvecDependance());
    const fixture = TestBed.createComponent(SqmRechercheTransversaleComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    composant.naviguerVersEntite({
      type: 'groupe',
      id: 'groupe-1',
      libelle: 'Équipe Paiement',
      groupeNom: 'Équipe Paiement',
      projetId: undefined,
    });
    await fixture.whenStable();

    expect(router.url).toBe('/administration');
  });

  it('étend la recherche à l’historique quand l’option est activée', () => {
    donneesApplication.chargerRacine(DonneesDeTest.racineAvecDependance());
    const fixture = TestBed.createComponent(SqmRechercheTransversaleComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    expect(composant.inclureHistorique()).toBe(false);
    composant.basculerInclureHistorique();

    expect(composant.inclureHistorique()).toBe(true);
  });

  it('affiche la date d’un audit historique quand l’historique est inclus', () => {
    donneesApplication.chargerRacine(DonneesDeTest.racineAvecDependance());
    const fixture = TestBed.createComponent(SqmRechercheTransversaleComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const champ = element.querySelector('input[type="text"]');
    if (!(champ instanceof HTMLInputElement)) {
      throw new Error('champ de recherche introuvable');
    }
    DonneesDeTest.saisirTerme(champ, 'log4j');

    fixture.componentInstance.basculerInclureHistorique();
    fixture.detectChanges();

    expect(element.textContent).toContain('audit du 01/06/2026');
  });

  it('émet fermee sur activation du bouton de fermeture', () => {
    const fixture = TestBed.createComponent(SqmRechercheTransversaleComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    let fermee = false;
    composant.fermee.subscribe(() => {
      fermee = true;
    });

    composant.fermer();

    expect(fermee).toBe(true);
  });

  it('émet fermee sur la touche Échap, jamais sur une autre touche', () => {
    const fixture = TestBed.createComponent(SqmRechercheTransversaleComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    let fermee = false;
    composant.fermee.subscribe(() => {
      fermee = true;
    });

    composant.gererTouche(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(fermee).toBe(false);

    composant.gererTouche(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fermee).toBe(true);
  });

  it('émet fermee sur activation de l’arrière-plan', () => {
    const fixture = TestBed.createComponent(SqmRechercheTransversaleComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);
    let fermee = false;
    fixture.componentInstance.fermee.subscribe(() => {
      fermee = true;
    });

    element
      .querySelector('.recherche-transversale__arriere-plan')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(fermee).toBe(true);
  });
});
