// Test de l'onglet Sources de l'écran Administration (cf. sources-admin.component.ts), généré avec l'assistance
// de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
//
// Depuis C11-01 (Phase 11), la saisie (création/modification, cascade Type→Instance, autocomplétions) est portée
// par `SqmFormulaireSourceComponent` et testée dans `formulaire-source.component.spec.ts` : ce fichier se
// recentre sur les filtres groupe/projet propres à cet écran, la liste agrégée, la suppression et le câblage vers
// le composant enfant (visibilité du formulaire, source à modifier transmise, fermeture sur
// `enregistree`/`annulee`).
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

  it("agrège les sources de tous les groupes et projets tant qu'aucun filtre n'est sélectionné", () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: undefined,
    });
    const autreGroupeId = donneesApplication.creerGroupe({
      nom: 'Socle Technique',
      description: '',
      instances: [
        {
          id: 'instance-gitlab-2',
          type: TypeInstance.Gitlab,
          nom: 'gitlab-tech',
          urlBase: 'https://gitlab-tech.test',
        },
      ],
    });
    const autreProjetId = donneesApplication.creerProjet(autreGroupeId, {
      nom: 'API Paiement',
      description: '',
    });
    donneesApplication.creerSource(autreGroupeId, autreProjetId, {
      instanceId: 'instance-gitlab-2',
      type: TypeSource.DepotGitlab,
      idExterne: '5678',
      refAuditee: undefined,
    });

    const lignes = composant.lignesSources();

    expect(lignes).toHaveLength(2);
    const ligneFacturation = lignes.find((l) => l.source.idExterne === '1234');
    expect(ligneFacturation?.groupeId).toBe(groupeId);
    expect(ligneFacturation?.projetId).toBe(projetId);
    expect(ligneFacturation?.projetNom).toBe('API Facturation');
    const lignePaiement = lignes.find((l) => l.source.idExterne === '5678');
    expect(lignePaiement?.groupeId).toBe(autreGroupeId);
    expect(lignePaiement?.projetId).toBe(autreProjetId);
  });

  it('calcule le lien direct vers l’instance réellement interrogée, avec un indice au survol uniquement pour GitLab (RG-045, C15-13)', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    const groupeAvecSonarId = donneesApplication.creerGroupe({
      nom: 'Socle Sonar',
      description: '',
      instances: [
        {
          id: 'instance-sonar',
          type: TypeInstance.Sonar,
          nom: 'sonar-prod',
          urlBase: 'https://sonar.test',
        },
      ],
    });
    const projetSonarId = donneesApplication.creerProjet(groupeAvecSonarId, {
      nom: 'API Paiement',
      description: '',
    });
    donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: undefined,
    });
    donneesApplication.creerSource(groupeAvecSonarId, projetSonarId, {
      instanceId: 'instance-sonar',
      type: TypeSource.ProjetSonar,
      idExterne: 'entreprise:api-paiement',
      refAuditee: undefined,
    });

    const lignes = composant.lignesSources();

    const ligneGitlab = lignes.find((l) => l.source.idExterne === '1234');
    expect(ligneGitlab?.urlLien).toBe('https://gitlab.test/projects/1234');
    expect(ligneGitlab?.titreLien).toContain("n'est pas garanti");

    const ligneSonar = lignes.find((l) => l.source.idExterne === 'entreprise:api-paiement');
    expect(ligneSonar?.urlLien).toBe('https://sonar.test/dashboard?id=entreprise%3Aapi-paiement');
    expect(ligneSonar?.titreLien).toBeUndefined();
  });

  it('laisse urlLien/titreLien à undefined, sans lien affiché, quand l’instance de rattachement de la source est introuvable (RG-045, C15-13)', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-inexistante',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: undefined,
    });

    const lignes = composant.lignesSources();

    expect(lignes).toHaveLength(1);
    expect(lignes[0].urlLien).toBeUndefined();
    expect(lignes[0].titreLien).toBeUndefined();
  });

  it('restreint les sources aux projets du groupe filtré quand aucun projet n’est sélectionné', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: undefined,
    });
    const autreGroupeId = donneesApplication.creerGroupe({
      nom: 'Socle Technique',
      description: '',
      instances: [],
    });
    const autreProjetId = donneesApplication.creerProjet(autreGroupeId, {
      nom: 'API Paiement',
      description: '',
    });
    donneesApplication.creerSource(autreGroupeId, autreProjetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '5678',
      refAuditee: undefined,
    });

    composant.selectionnerGroupe(groupeId);

    expect(composant.lignesSources()).toHaveLength(1);
    expect(composant.lignesSources()[0].source.idExterne).toBe('1234');
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
    expect(composant.lignesSources()).toHaveLength(1);
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

  it('sélectionner un projet directement, sans groupe préalablement choisi, aligne automatiquement le filtre Groupe sur son groupe réel', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;

    composant.selectionnerProjet(projetId);

    expect(composant.groupeSelectionneId).toBe(groupeId);
    expect(composant.projetSelectionneId).toBe(projetId);
  });

  it('ouvre le formulaire en édition avec la source correspondante, portant son groupe/projet réels', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    const sourceId = donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: 'develop',
    });
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    const ligne = composant.lignesSources().find((l) => l.source.id === sourceId);
    if (!ligne) {
      throw new Error('ligne attendue pour ce test');
    }

    composant.ouvrirEdition(ligne);

    expect(composant.formulaireVisible).toBe(true);
    expect(composant.ligneEnEdition?.source.id).toBe(sourceId);
    expect(composant.groupeIdFormulaire).toBe(groupeId);
    expect(composant.projetIdFormulaire).toBe(projetId);
  });

  it('repose le focus sur le champ Type en basculant directement d’une édition à une autre, sans fermeture préalable (C15-02, anomalie n°2)', async () => {
    const fixture = TestBed.createComponent(SqmSourcesAdminComponent);
    const composant = fixture.componentInstance;
    const sourceAId = donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: 'projet-a',
      refAuditee: undefined,
    });
    const sourceBId = donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: 'projet-b',
      refAuditee: undefined,
    });
    fixture.detectChanges();
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    fixture.detectChanges();
    await fixture.whenStable();
    const ligneA = composant.lignesSources().find((l) => l.source.id === sourceAId);
    const ligneB = composant.lignesSources().find((l) => l.source.id === sourceBId);
    if (!ligneA || !ligneB) {
      throw new Error('lignes attendues pour ce test');
    }

    composant.ouvrirEdition(ligneA);
    fixture.detectChanges();
    await fixture.whenStable();
    const champType = DomTestUtils.obtenirElementNatif(fixture).querySelector<HTMLElement>(
      '#formulaire-source-champ-type',
    );
    champType?.blur();

    composant.ouvrirEdition(ligneB);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(champType);
  });

  it('ouvre le formulaire en création (ligneEnEdition à null), en figeant les filtres courants pour le composant enfant', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);

    composant.ouvrirCreation();

    expect(composant.formulaireVisible).toBe(true);
    expect(composant.ligneEnEdition).toBeNull();
    expect(composant.groupeIdFormulaire).toBe(groupeId);
    expect(composant.projetIdFormulaire).toBe(projetId);
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

  it('n’affiche pas le composant enfant tant que groupe et projet ne sont pas tous deux sélectionnés', () => {
    const fixture = TestBed.createComponent(SqmSourcesAdminComponent);
    const composant = fixture.componentInstance;
    composant.ouvrirCreation();
    fixture.detectChanges();

    const elementNatif = DomTestUtils.obtenirElementNatif(fixture);
    expect(elementNatif.querySelector('app-formulaire-source')).toBeNull();

    const boutonCreer = elementNatif.querySelector('#sources-admin-bouton-creer');
    if (!(boutonCreer instanceof HTMLButtonElement)) {
      throw new Error('bouton de création introuvable dans le gabarit sous test.');
    }
    expect(boutonCreer.disabled).toBe(true);
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
    const ligne = composant.lignesSources().find((l) => l.source.id === sourceId);
    if (!ligne) {
      throw new Error('ligne attendue pour ce test');
    }
    composant.ouvrirEdition(ligne);

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
    const ligne = composant.lignesSources().find((l) => l.source.id === sourceId);
    if (!ligne) {
      throw new Error('ligne attendue pour ce test');
    }

    composant.demanderSuppression(ligne);
    composant.confirmerSuppression();

    expect(composant.lignesSources()).toEqual([]);
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'La source a été supprimée.' }),
    ]);
  });

  it('modifie une source à partir de la liste agrégée « Tous les groupes », en utilisant son groupe/projet réels plutôt que les filtres courants (nuls ici)', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: undefined,
    });
    const autreGroupeId = donneesApplication.creerGroupe({
      nom: 'Socle Technique',
      description: '',
      instances: [],
    });
    const autreProjetId = donneesApplication.creerProjet(autreGroupeId, {
      nom: 'API Paiement',
      description: '',
    });
    const autreSourceId = donneesApplication.creerSource(autreGroupeId, autreProjetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '5678',
      refAuditee: undefined,
    });
    const ligne = composant.lignesSources().find((l) => l.source.id === autreSourceId);
    if (!ligne) {
      throw new Error('ligne attendue pour ce test');
    }

    composant.demanderSuppression(ligne);
    composant.confirmerSuppression();

    expect(composant.lignesSources()).toHaveLength(1);
    expect(composant.lignesSources()[0].source.idExterne).toBe('1234');
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
    const ligne = composant.lignesSources().find((l) => l.source.id === sourceId);
    if (!ligne) {
      throw new Error('ligne attendue pour ce test');
    }

    composant.demanderSuppression(ligne);
    composant.annulerSuppression();

    expect(composant.ligneASupprimer).toBeNull();
    expect(composant.lignesSources()).toHaveLength(1);
  });
});
