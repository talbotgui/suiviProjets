// Test de l'onglet Groupes de l'écran Administration (cf. groupes-admin.component.ts), généré avec l'assistance
// de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
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
      referentiels: {},
      parametres: {},
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

  it('refuse la création sans nom', () => {
    composant.ouvrirCreation();
    composant.nom = '   ';

    composant.enregistrer();

    expect(composant.messageErreur).toBe('Le nom du groupe est obligatoire.');
    expect(composant.groupes()).toEqual([]);
  });

  it('crée un groupe valide et referme le formulaire', () => {
    composant.ouvrirCreation();
    composant.nom = 'Socle Comptable';
    composant.description = 'Description';

    composant.enregistrer();

    expect(composant.groupes()).toHaveLength(1);
    expect(composant.groupes()[0].nom).toBe('Socle Comptable');
    expect(composant.formulaireVisible).toBe(false);
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

  it('modifie un groupe existant', () => {
    const id = donneesApplication.creerGroupe({
      nom: 'Socle Comptable',
      description: 'Description',
      instances: [],
    });
    composant.ouvrirEdition(id);
    composant.nom = 'Nouveau nom';

    composant.enregistrer();

    expect(composant.groupes()[0].nom).toBe('Nouveau nom');
  });

  it('supprime un groupe après confirmation', () => {
    const id = donneesApplication.creerGroupe({
      nom: 'Socle Comptable',
      description: 'Description',
      instances: [],
    });

    composant.demanderSuppression(id);
    composant.confirmerSuppression();

    expect(composant.groupes()).toEqual([]);
    expect(composant.groupeASupprimerId).toBeNull();
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
});
