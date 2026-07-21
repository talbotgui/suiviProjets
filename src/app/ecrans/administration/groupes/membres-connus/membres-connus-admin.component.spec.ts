// Test du sous-onglet Membres connus de l'écran Administration (cf. membres-connus-admin.component.ts), généré
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../../services/avecetat/etat/etat-session.service';
import type {
  DonneesRacine,
  MembreConnu,
  ReponseQualificationMembre,
} from '../../../../services/avecetat/etat/types-donnees';
import { StatutMembre, TypeCritereMembre } from '../../../../services/avecetat/etat/types-donnees';
import { SqmMembresConnusAdminComponent } from './membres-connus-admin.component';

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
   * Construit une règle de membre connu de test.
   * @param id - Identifiant de la règle.
   * @returns Une règle de test.
   */
  public static membre(id: string): MembreConnu {
    return {
      id,
      critere: 'alice',
      typeCritere: TypeCritereMembre.Username,
      statut: StatutMembre.Interne,
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

describe('SqmMembresConnusAdminComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let composant: SqmMembresConnusAdminComponent;
  let groupeId: string;

  beforeEach(async () => {
    invokeSimule.mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmMembresConnusAdminComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    groupeId = donneesApplication.creerGroupe({
      nom: 'Socle Comptable',
      description: '',
      instances: [],
    });
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    composant = TestBed.createComponent(SqmMembresConnusAdminComponent).componentInstance;
  });

  it("n'affiche aucune règle tant qu'aucun groupe n'est sélectionné", () => {
    expect(composant.membresConnus()).toEqual([]);
  });

  it('affiche les règles du groupe sélectionné', () => {
    const racineAvecMembre: DonneesRacine = {
      ...DonneesDeTest.racineActuelle(donneesApplication),
      groupes: DonneesDeTest.racineActuelle(donneesApplication).groupes.map((g) =>
        g.id === groupeId ? { ...g, membresConnus: [DonneesDeTest.membre('m1')] } : g,
      ),
    };
    donneesApplication.chargerRacine(racineAvecMembre);

    composant.selectionnerGroupe(groupeId);

    expect(composant.membresConnus()).toHaveLength(1);
  });

  it('refuse la création sans critère', () => {
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.critere = '  ';

    composant.demanderEnregistrement();

    expect(composant.messageErreur).toBe('Le critère est obligatoire.');
    expect(composant.actionEnAttenteMotDePasse).toBeNull();
  });

  it('ouvre la ressaisie du mot de passe pour un formulaire valide', () => {
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.critere = 'alice';

    composant.demanderEnregistrement();

    expect(composant.actionEnAttenteMotDePasse).toBe('enregistrement');
  });

  it('pré-remplit le formulaire lors de la modification', () => {
    const racineAvecMembre: DonneesRacine = {
      ...DonneesDeTest.racineActuelle(donneesApplication),
      groupes: DonneesDeTest.racineActuelle(donneesApplication).groupes.map((g) =>
        g.id === groupeId ? { ...g, membresConnus: [DonneesDeTest.membre('m1')] } : g,
      ),
    };
    donneesApplication.chargerRacine(racineAvecMembre);
    composant.selectionnerGroupe(groupeId);

    composant.ouvrirEdition('m1');

    expect(composant.membreEnEditionId).toBe('m1');
    expect(composant.critere).toBe('alice');
    expect(composant.statut).toBe(StatutMembre.Interne);
  });

  it('enregistre une règle après confirmation du mot de passe et met à jour la liste', async () => {
    const racineMiseAJour: DonneesRacine = {
      ...DonneesDeTest.racineActuelle(donneesApplication),
      groupes: DonneesDeTest.racineActuelle(donneesApplication).groupes.map((g) =>
        g.id === groupeId ? { ...g, membresConnus: [DonneesDeTest.membre('m1')] } : g,
      ),
    };
    const reponse: ReponseQualificationMembre = { donnees: racineMiseAJour, membresEnConflit: [] };
    invokeSimule.mockResolvedValue(reponse);
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.critere = 'alice';
    composant.demanderEnregistrement();

    await composant.confirmerEnregistrement('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'qualifier_membre',
      expect.objectContaining({
        groupeId,
        critere: 'alice',
        typeCritere: TypeCritereMembre.Username,
        statut: StatutMembre.Interne,
        origine: 'Administration',
        motDePasse: 'mot-de-passe',
      }),
    );
    expect(composant.formulaireVisible).toBe(false);
    expect(composant.actionEnAttenteMotDePasse).toBeNull();
    expect(composant.membresConnus()).toHaveLength(1);
  });

  it('signale les règles en conflit renvoyées par la commande native (RG-008)', async () => {
    const reponse: ReponseQualificationMembre = {
      donnees: DonneesDeTest.racineActuelle(donneesApplication),
      membresEnConflit: ['m1', 'm2'],
    };
    invokeSimule.mockResolvedValue(reponse);
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.critere = 'alice';
    composant.demanderEnregistrement();

    await composant.confirmerEnregistrement('mot-de-passe');

    expect(composant.estEnConflit('m1')).toBe(true);
    expect(composant.estEnConflit('m2')).toBe(true);
    expect(composant.estEnConflit('m3')).toBe(false);
  });

  it('affiche un message d’erreur en cas de doublon de username (RG-008)', async () => {
    invokeSimule.mockRejectedValue({ type: 'doublonUsernameMembreConnu' });
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.critere = 'alice';
    composant.demanderEnregistrement();

    await composant.confirmerEnregistrement('mot-de-passe');

    expect(composant.messageErreur).toBe(
      'Ce username est déjà utilisé par une autre règle de ce groupe.',
    );
    expect(composant.actionEnAttenteMotDePasse).toBeNull();
  });

  it('annule la ressaisie du mot de passe sans appeler la commande native', () => {
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.critere = 'alice';
    composant.demanderEnregistrement();

    composant.annulerMotDePasse();

    expect(composant.actionEnAttenteMotDePasse).toBeNull();
    expect(invokeSimule).not.toHaveBeenCalled();
  });

  it('supprime une règle après confirmation de la suppression puis du mot de passe', async () => {
    const racineAvecMembre: DonneesRacine = {
      ...DonneesDeTest.racineActuelle(donneesApplication),
      groupes: DonneesDeTest.racineActuelle(donneesApplication).groupes.map((g) =>
        g.id === groupeId ? { ...g, membresConnus: [DonneesDeTest.membre('m1')] } : g,
      ),
    };
    donneesApplication.chargerRacine(racineAvecMembre);
    invokeSimule.mockResolvedValue(DonneesDeTest.racineVide());
    composant.selectionnerGroupe(groupeId);

    composant.demanderSuppression('m1');
    composant.confirmerSuppression();
    await composant.confirmerSuppressionMotDePasse('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith('supprimer_membre_connu', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: racineAvecMembre,
      groupeId,
      membreId: 'm1',
      origine: 'Administration',
      motDePasse: 'mot-de-passe',
    });
    expect(composant.membreASupprimerId).toBeNull();
    expect(composant.actionEnAttenteMotDePasse).toBeNull();
  });

  it("n'effectue aucune suppression en cas d'annulation", () => {
    composant.selectionnerGroupe(groupeId);

    composant.demanderSuppression('m1');
    composant.annulerSuppression();

    expect(composant.membreASupprimerId).toBeNull();
    expect(invokeSimule).not.toHaveBeenCalled();
  });

  it('referme le formulaire sans enregistrer', () => {
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();

    composant.fermerFormulaire();

    expect(composant.formulaireVisible).toBe(false);
  });

  it("n'invoque pas la commande native si le contexte de suppression est incomplet", async () => {
    composant.selectionnerGroupe(groupeId);
    // Aucune règle désignée par `demanderSuppression` : `membreASupprimerId` reste `null`.
    composant.confirmerSuppression();

    await composant.confirmerSuppressionMotDePasse('mot-de-passe');

    expect(invokeSimule).not.toHaveBeenCalled();
    expect(composant.actionEnAttenteMotDePasse).toBeNull();
  });

  it('affiche un message d’erreur si la suppression échoue', async () => {
    const racineAvecMembre: DonneesRacine = {
      ...DonneesDeTest.racineActuelle(donneesApplication),
      groupes: DonneesDeTest.racineActuelle(donneesApplication).groupes.map((g) =>
        g.id === groupeId ? { ...g, membresConnus: [DonneesDeTest.membre('m1')] } : g,
      ),
    };
    donneesApplication.chargerRacine(racineAvecMembre);
    invokeSimule.mockRejectedValue({ type: 'membreIntrouvable' });
    composant.selectionnerGroupe(groupeId);

    composant.demanderSuppression('m1');
    composant.confirmerSuppression();
    await composant.confirmerSuppressionMotDePasse('mot-de-passe');

    expect(composant.messageErreur).toBe(
      'Cette règle est introuvable : elle a peut-être déjà été supprimée.',
    );
  });
});
