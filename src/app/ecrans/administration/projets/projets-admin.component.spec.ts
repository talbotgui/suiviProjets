// Test de l'onglet Projets de l'écran Administration (cf. projets-admin.component.ts), généré avec l'assistance
// de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { SqmProjetsAdminComponent } from './projets-admin.component';

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

describe('SqmProjetsAdminComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let composant: SqmProjetsAdminComponent;
  let groupeId: string;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmProjetsAdminComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    groupeId = donneesApplication.creerGroupe({
      nom: 'Socle Comptable',
      description: '',
      instances: [],
    });
    composant = TestBed.createComponent(SqmProjetsAdminComponent).componentInstance;
  });

  it("n'affiche aucun projet tant qu'aucun groupe n'est sélectionné", () => {
    expect(composant.projets()).toEqual([]);
  });

  it('affiche les projets du groupe sélectionné', () => {
    donneesApplication.creerProjet(groupeId, { nom: 'API Facturation', description: '' });

    composant.selectionnerGroupe(groupeId);

    expect(composant.projets()).toHaveLength(1);
  });

  it('refuse la création sans nom', () => {
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.nom = '  ';

    composant.enregistrer();

    expect(composant.messageErreur).toBe('Le nom du projet est obligatoire.');
    expect(composant.projets()).toEqual([]);
  });

  it('crée un projet avec la politique IA interdite par défaut (RG-014)', () => {
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.nom = 'API Facturation';

    composant.enregistrer();

    expect(composant.projets()[0].iaAutorisee).toBe(false);
    expect(composant.formulaireVisible).toBe(false);
  });

  it('modifie un projet existant', () => {
    const projetId = donneesApplication.creerProjet(groupeId, {
      nom: 'API Facturation',
      description: '',
    });
    composant.selectionnerGroupe(groupeId);

    composant.ouvrirEdition(projetId);
    composant.nom = 'Nouveau nom';
    composant.enregistrer();

    expect(composant.projets()[0].nom).toBe('Nouveau nom');
  });

  it('duplique un projet avec ses sources', () => {
    const projetId = donneesApplication.creerProjet(groupeId, {
      nom: 'API Facturation',
      description: '',
    });
    composant.selectionnerGroupe(groupeId);

    composant.dupliquer(projetId);

    expect(composant.projets()).toHaveLength(2);
    expect(composant.projets().some((p) => p.nom === 'API Facturation (copie)')).toBe(true);
  });

  it('supprime un projet après confirmation', () => {
    const projetId = donneesApplication.creerProjet(groupeId, {
      nom: 'API Facturation',
      description: '',
    });
    composant.selectionnerGroupe(groupeId);

    composant.demanderSuppression(projetId);
    composant.confirmerSuppression();

    expect(composant.projets()).toEqual([]);
  });

  it("n'effectue aucune suppression en cas d'annulation", () => {
    const projetId = donneesApplication.creerProjet(groupeId, {
      nom: 'API Facturation',
      description: '',
    });
    composant.selectionnerGroupe(groupeId);

    composant.demanderSuppression(projetId);
    composant.annulerSuppression();

    expect(composant.projets()).toHaveLength(1);
  });
});
