// Test de l'onglet Groupes de l'écran Administration (cf. groupes-admin.component.ts), généré avec l'assistance
// de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { DomTestUtils } from '../../../testing/dom-test.utils';
import { SqmGroupesAdminComponent } from './groupes-admin.component';

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

describe('SqmGroupesAdminComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let composant: SqmGroupesAdminComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmGroupesAdminComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    composant = TestBed.createComponent(SqmGroupesAdminComponent).componentInstance;
  });

  it("n'affiche aucun groupe initialement", () => {
    expect(composant.groupes()).toEqual([]);
  });

  it('affiche le sous-onglet Groupes par défaut', () => {
    expect(composant.sousOngletActif).toBe('groupes');
  });

  it('bascule vers le sous-onglet Membres connus (US-022, US-023)', () => {
    composant.selectionnerSousOnglet('membresConnus');

    expect(composant.sousOngletActif).toBe('membresConnus');
  });

  it('bascule vers le sous-onglet Annotations (US-019, RG-033, Phase 10 incrément 8)', () => {
    composant.selectionnerSousOnglet('annotations');

    expect(composant.sousOngletActif).toBe('annotations');
  });

  it('refuse la création sans nom', () => {
    composant.ouvrirCreation();
    composant.nom = '   ';

    composant.enregistrer();

    expect(composant.messageErreur).toBe('Le nom du groupe est obligatoire.');
    expect(composant.groupes()).toEqual([]);
  });

  it('crée un groupe valide et referme le formulaire (US-038 : notification de succès)', () => {
    composant.ouvrirCreation();
    composant.nom = 'Socle Comptable';
    composant.description = 'Description';

    composant.enregistrer();

    expect(composant.groupes()).toHaveLength(1);
    expect(composant.groupes()[0].nom).toBe('Socle Comptable');
    expect(composant.formulaireVisible).toBe(false);
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'Le groupe a été créé.' }),
    ]);
  });

  it('refuse une instance sans nom ni URL', () => {
    composant.ouvrirCreation();
    composant.nom = 'Socle Comptable';
    composant.ajouterInstance();

    composant.enregistrer();

    expect(composant.messageErreur).toBe('Chaque instance doit porter un nom et une URL.');
  });

  it('crée un groupe avec ses instances', () => {
    composant.ouvrirCreation();
    composant.nom = 'Socle Comptable';
    composant.ajouterInstance();
    composant.instances[0].nom = 'gitlab-prod';
    composant.instances[0].urlBase = 'https://gitlab.exemple.test';

    composant.enregistrer();

    expect(composant.groupes()[0].instances).toHaveLength(1);
    expect(composant.groupes()[0].instances[0].nom).toBe('gitlab-prod');
  });

  it('retire une instance ajoutée par erreur', () => {
    composant.ouvrirCreation();
    composant.ajouterInstance();
    const idInstance = composant.instances[0].id;

    composant.supprimerInstance(idInstance);

    expect(composant.instances).toEqual([]);
  });

  it('pose le focus sur le champ Type de la nouvelle instance à chaque clic sur « Ajouter une instance » (C15-02)', async () => {
    const fixture = TestBed.createComponent(SqmGroupesAdminComponent);
    const composantLocal = fixture.componentInstance;
    composantLocal.ouvrirCreation();
    fixture.detectChanges();
    await fixture.whenStable();

    composantLocal.ajouterInstance();
    fixture.detectChanges();
    await fixture.whenStable();

    const champTypePremiereInstance = DomTestUtils.obtenirElementNatif(
      fixture,
    ).querySelector<HTMLElement>('#groupes-admin-instance-0-champ-type');
    expect(document.activeElement).toBe(champTypePremiereInstance);

    composantLocal.ajouterInstance();
    fixture.detectChanges();
    await fixture.whenStable();

    const champTypeDeuxiemeInstance = DomTestUtils.obtenirElementNatif(
      fixture,
    ).querySelector<HTMLElement>('#groupes-admin-instance-1-champ-type');
    expect(document.activeElement).toBe(champTypeDeuxiemeInstance);
  });

  it('pré-remplit le formulaire lors de la modification', () => {
    const id = donneesApplication.creerGroupe({
      nom: 'Socle Comptable',
      description: 'Description',
      instances: [],
    });

    composant.ouvrirEdition(id);

    expect(composant.groupeEnEditionId).toBe(id);
    expect(composant.nom).toBe('Socle Comptable');
  });

  it('modifie un groupe existant (US-038 : notification de succès)', () => {
    const id = donneesApplication.creerGroupe({
      nom: 'Socle Comptable',
      description: 'Description',
      instances: [],
    });
    composant.ouvrirEdition(id);
    composant.nom = 'Nouveau nom';

    composant.enregistrer();

    expect(composant.groupes()[0].nom).toBe('Nouveau nom');
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'Le groupe a été modifié.' }),
    ]);
  });

  it('supprime un groupe après confirmation (US-038 : notification de succès)', () => {
    const id = donneesApplication.creerGroupe({
      nom: 'Socle Comptable',
      description: 'Description',
      instances: [],
    });

    composant.demanderSuppression(id);
    composant.confirmerSuppression();

    expect(composant.groupes()).toEqual([]);
    expect(composant.groupeASupprimerId).toBeNull();
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'Le groupe a été supprimé.' }),
    ]);
  });

  it("n'effectue aucune suppression en cas d'annulation", () => {
    const id = donneesApplication.creerGroupe({
      nom: 'Socle Comptable',
      description: 'Description',
      instances: [],
    });

    composant.demanderSuppression(id);
    composant.annulerSuppression();

    expect(composant.groupes()).toHaveLength(1);
    expect(composant.groupeASupprimerId).toBeNull();
  });

  describe(
    'présélection du sous-onglet Membres connus (lien « Qualifier ce membre » de la Fiche projet, relayé ' +
      'depuis SqmAdministrationComponent)',
    () => {
      it('bascule sur Membres connus dès que groupeIdPreselectionne est renseigné', () => {
        const fixture = TestBed.createComponent(SqmGroupesAdminComponent);
        fixture.componentRef.setInput('groupeIdPreselectionne', 'groupe-1');

        fixture.detectChanges();

        expect(fixture.componentInstance.sousOngletActif).toBe('membresConnus');
      });

      it("n'affecte pas le sous-onglet par défaut quand aucun groupe n'est présélectionné", () => {
        const fixture = TestBed.createComponent(SqmGroupesAdminComponent);

        fixture.detectChanges();

        expect(fixture.componentInstance.sousOngletActif).toBe('groupes');
      });
    },
  );
});
