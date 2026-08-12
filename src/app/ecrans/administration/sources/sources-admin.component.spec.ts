// Test de l'onglet Sources de l'écran Administration (cf. sources-admin.component.ts), généré avec l'assistance
// de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
//
// Depuis C11-01 (Phase 11), la saisie (création/modification, cascade Type→Instance, autocomplétions) est portée
// par `SqmFormulaireSourceComponent` et testée dans `formulaire-source.component.spec.ts` : ce fichier se
// recentre sur la cascade groupe/projet propre à cet écran, la liste, la suppression et le câblage vers le
// composant enfant (visibilité du formulaire, source à modifier transmise, fermeture sur `enregistree`/`annulee`).
import { TestBed } from '@angular/core/testing';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { TypeSource } from '../../../services/avecetat/etat/types-donnees';
import { TypeInstance } from '../../../services/sansetat/commandes/types-facade';
import { DomTestUtils } from '../../../testing/dom-test.utils';
import { SqmSourcesAdminComponent } from './sources-admin.component';

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

describe('SqmSourcesAdminComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let groupeId: string;
  let projetId: string;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmSourcesAdminComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    groupeId = donneesApplication.creerGroupe({
      nom: 'Socle Comptable',
      description: '',
      instances: [
        {
          id: 'instance-gitlab',
          type: TypeInstance.Gitlab,
          nom: 'gitlab-prod',
          urlBase: 'https://gitlab.test',
        },
      ],
    });
    projetId = donneesApplication.creerProjet(groupeId, {
      nom: 'API Facturation',
      description: '',
    });
  });

  it("n'affiche aucune source tant qu'aucun projet n'est sélectionné", () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;

    expect(composant.sources()).toEqual([]);
  });

  it('filtre les projets par groupe puis les sources par projet sélectionnés', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: undefined,
    });

    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);

    expect(composant.projets()).toHaveLength(1);
    expect(composant.sources()).toHaveLength(1);
  });

  it('réinitialise le projet sélectionné et referme le formulaire au changement de groupe', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    composant.ouvrirCreation();

    composant.selectionnerGroupe(groupeId);

    expect(composant.projetSelectionneId).toBeNull();
    expect(composant.formulaireVisible).toBe(false);
  });

  it('ouvre le formulaire en édition avec la source correspondante', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    const sourceId = donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: 'develop',
    });
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);

    composant.ouvrirEdition(sourceId);

    expect(composant.formulaireVisible).toBe(true);
    expect(composant.sourceEnEdition?.id).toBe(sourceId);
  });

  it('ouvre le formulaire en création (sourceEnEdition à null)', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);

    composant.ouvrirCreation();

    expect(composant.formulaireVisible).toBe(true);
    expect(composant.sourceEnEdition).toBeNull();
  });

  it('referme le formulaire quand le composant enfant émet enregistree ou annulee', () => {
    const fixture = TestBed.createComponent(SqmSourcesAdminComponent);
    const composant = fixture.componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    composant.ouvrirCreation();
    fixture.detectChanges();

    const elementNatif = DomTestUtils.obtenirElementNatif(fixture);
    expect(elementNatif.querySelector('app-formulaire-source')).not.toBeNull();

    composant.fermerFormulaire();

    expect(composant.formulaireVisible).toBe(false);
  });

  it('notifie le succès et referme le formulaire à la création (US-038)', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    composant.ouvrirCreation();

    composant.onSourceEnregistree();

    expect(composant.formulaireVisible).toBe(false);
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'La source a été créée.' }),
    ]);
  });

  it('notifie le succès de la modification (US-038)', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    const sourceId = donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: undefined,
    });
    composant.ouvrirEdition(sourceId);

    composant.onSourceEnregistree();

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'La source a été modifiée.' }),
    ]);
  });

  it('supprime une source après confirmation (US-038 : notification de succès)', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    const sourceId = donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: undefined,
    });

    composant.demanderSuppression(sourceId);
    composant.confirmerSuppression();

    expect(composant.sources()).toEqual([]);
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'La source a été supprimée.' }),
    ]);
  });

  it('annule la suppression demandée', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    const sourceId = donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: undefined,
    });

    composant.demanderSuppression(sourceId);
    composant.annulerSuppression();

    expect(composant.sourceASupprimerId).toBeNull();
    expect(composant.sources()).toHaveLength(1);
  });
});
