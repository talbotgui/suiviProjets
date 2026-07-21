// Test de l'onglet Projets de l'écran Administration (cf. projets-admin.component.ts), généré avec l'assistance
// de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { SqmProjetsAdminComponent } from './projets-admin.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

const invokeSimule = jest.mocked(invoke);

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

  /**
   * Racine actuellement chargée dans le Store, sans recourir à une assertion de non-nullité (interdite par les
   * normes de développement du projet) : lève une erreur explicite si aucune racine n'est chargée, ce qui ne doit
   * jamais se produire dans ces tests (chargée systématiquement en `beforeEach`).
   * @param donneesApplication - Store d'état applicatif dont la racine est attendue.
   * @returns La racine actuellement chargée.
   */
  public static racineActuelle(donneesApplication: DonneesApplicationService): DonneesRacine {
    const racine = donneesApplication.racine();
    if (!racine) {
      throw new Error('racine attendue pour ce test');
    }
    return racine;
  }
}

describe('SqmProjetsAdminComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let composant: SqmProjetsAdminComponent;
  let groupeId: string;

  beforeEach(async () => {
    invokeSimule.mockReset();
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
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
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

  describe('politique IA (US-024, Phase 4)', () => {
    let projetId: string;

    beforeEach(() => {
      projetId = donneesApplication.creerProjet(groupeId, {
        nom: 'API Facturation',
        description: '',
      });
      composant.selectionnerGroupe(groupeId);
    });

    it('ouvre la ressaisie du mot de passe avant toute bascule', () => {
      composant.demanderBasculePolitiqueIA(projetId);

      expect(composant.projetPolitiqueIAEnAttenteId).toBe(projetId);
    });

    it('annule la bascule demandée', () => {
      composant.demanderBasculePolitiqueIA(projetId);

      composant.annulerBasculePolitiqueIA();

      expect(composant.projetPolitiqueIAEnAttenteId).toBeNull();
    });

    it('autorise l’IA après confirmation du mot de passe et crée une annotation système (RG-015)', async () => {
      const racineAutorisee: DonneesRacine = {
        ...DonneesDeTest.racineActuelle(donneesApplication),
        groupes: DonneesDeTest.racineActuelle(donneesApplication).groupes.map((g) =>
          g.id === groupeId
            ? {
                ...g,
                projets: g.projets.map((p) =>
                  p.id === projetId
                    ? {
                        ...p,
                        iaAutorisee: true,
                        iaAutoriseeDepuis: '2026-07-21T10:00:00Z',
                        annotations: [
                          {
                            id: 'a1',
                            date: '2026-07-21T10:00:00Z',
                            libelle: "Usage de l'IA autorisé",
                            categorie: 'politiqueIA',
                            systeme: true,
                          },
                        ],
                      }
                    : p,
                ),
              }
            : g,
        ),
      };
      invokeSimule.mockResolvedValue(racineAutorisee);
      const racineAvantAppel = DonneesDeTest.racineActuelle(donneesApplication);

      composant.demanderBasculePolitiqueIA(projetId);
      await composant.confirmerBasculePolitiqueIA('mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('definir_politique_ia', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        groupeId,
        projetId,
        iaAutorisee: true,
        motDePasse: 'mot-de-passe',
      });
      expect(composant.projets()[0].iaAutorisee).toBe(true);
      expect(composant.projets()[0].annotations).toHaveLength(1);
      expect(composant.projetPolitiqueIAEnAttenteId).toBeNull();
    });

    it('affiche un message d’erreur en cas de mot de passe incorrect', async () => {
      invokeSimule.mockRejectedValue({ type: 'motDePasseOuFichierInvalide' });

      composant.demanderBasculePolitiqueIA(projetId);
      await composant.confirmerBasculePolitiqueIA('mauvais-mot-de-passe');

      expect(composant.messageErreurPolitiqueIA).toBe('Mot de passe incorrect.');
      expect(composant.projets()[0].iaAutorisee).toBe(false);
    });
  });
});
