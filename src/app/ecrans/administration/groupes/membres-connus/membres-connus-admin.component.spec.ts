// Test du sous-onglet Membres connus de l'écran Administration (cf. membres-connus-admin.component.ts), généré
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { DomTestUtils } from '../../../../testing/dom-test.utils';
import { DonneesApplicationService } from '../../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../../../services/avecetat/etat/notification.service';
import type {
  DonneesRacine,
  MembreConnu,
  ReponseQualificationMembre,
} from '../../../../services/avecetat/etat/types-donnees';
import { StatutMembre, TypeCritereMembre } from '../../../../services/avecetat/etat/types-donnees';
import { SqmMembresConnusAdminComponent } from './membres-connus-admin.component';

// `isTauri` toujours vrai ici : ce test exerce le passage réel par `invoke` (cf. `InvocationCommandeUtils`), sur
// le modèle de `facade-commandes.service.spec.ts`.
jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);
const isTauriSimule = jest.mocked(isTauri);

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
    isTauriSimule.mockReturnValue(true);
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
    expect(composant.actionEnAttenteMotDePasse()).toBeNull();
  });

  it('pose le focus sur le champ Critère à l’ouverture du formulaire de création (C15-02)', async () => {
    const fixture = TestBed.createComponent(SqmMembresConnusAdminComponent);
    const instance = fixture.componentInstance;
    fixture.detectChanges();
    instance.selectionnerGroupe(groupeId);
    fixture.detectChanges();
    await fixture.whenStable();

    instance.ouvrirCreation();
    fixture.detectChanges();
    await fixture.whenStable();

    const champCritere: HTMLInputElement | null = DomTestUtils.obtenirElementNatif(
      fixture,
    ).querySelector('#membres-connus-admin-champ-critere');
    expect(champCritere).not.toBeNull();
    expect(document.activeElement).toBe(champCritere);
  });

  it('ouvre la ressaisie du mot de passe pour un formulaire valide', () => {
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.critere = 'alice';

    composant.demanderEnregistrement();

    expect(composant.actionEnAttenteMotDePasse()).toBe('enregistrement');
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

  it('enregistre une règle après confirmation du mot de passe et met à jour la liste (US-038 : notification de succès)', async () => {
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
    expect(composant.formulaireVisible()).toBe(false);
    expect(composant.actionEnAttenteMotDePasse()).toBeNull();
    expect(composant.membresConnus()).toHaveLength(1);
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'Le membre a été qualifié.' }),
    ]);
  });

  it('notifie la modification d’une règle existante avec un libellé distinct (US-038)', async () => {
    const racineAvecMembre: DonneesRacine = {
      ...DonneesDeTest.racineActuelle(donneesApplication),
      groupes: DonneesDeTest.racineActuelle(donneesApplication).groupes.map((g) =>
        g.id === groupeId ? { ...g, membresConnus: [DonneesDeTest.membre('m1')] } : g,
      ),
    };
    donneesApplication.chargerRacine(racineAvecMembre);
    const reponse: ReponseQualificationMembre = { donnees: racineAvecMembre, membresEnConflit: [] };
    invokeSimule.mockResolvedValue(reponse);
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirEdition('m1');
    composant.demanderEnregistrement();

    await composant.confirmerEnregistrement('mot-de-passe');

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'La règle de membre a été modifiée.' }),
    ]);
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

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'erreur',
        message: 'Ce username est déjà utilisé par une autre règle de ce groupe.',
      }),
    ]);
    expect(composant.actionEnAttenteMotDePasse()).toBeNull();
  });

  it('affiche un message d’erreur en cas de conflit de règles courriel/domaine (RG-008, R10-07)', async () => {
    invokeSimule.mockRejectedValue({ type: 'conflitReglesMembreConnu' });
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.critere = 'alice';
    composant.demanderEnregistrement();

    await composant.confirmerEnregistrement('mot-de-passe');

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'erreur',
        message:
          'Cette règle entre en conflit avec une autre règle de ce groupe portant le même critère et un statut différent.',
      }),
    ]);
    expect(composant.actionEnAttenteMotDePasse()).toBeNull();
  });

  it('annule la ressaisie du mot de passe sans appeler la commande native', () => {
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.critere = 'alice';
    composant.demanderEnregistrement();

    composant.annulerMotDePasse();

    expect(composant.actionEnAttenteMotDePasse()).toBeNull();
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
    expect(composant.membreASupprimerId()).toBeNull();
    expect(composant.actionEnAttenteMotDePasse()).toBeNull();
  });

  it("n'effectue aucune suppression en cas d'annulation", () => {
    composant.selectionnerGroupe(groupeId);

    composant.demanderSuppression('m1');
    composant.annulerSuppression();

    expect(composant.membreASupprimerId()).toBeNull();
    expect(invokeSimule).not.toHaveBeenCalled();
  });

  it('referme le formulaire sans enregistrer', () => {
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();

    composant.fermerFormulaire();

    expect(composant.formulaireVisible()).toBe(false);
  });

  it("n'invoque pas la commande native si le contexte de suppression est incomplet", async () => {
    composant.selectionnerGroupe(groupeId);
    // Aucune règle désignée par `demanderSuppression` : `membreASupprimerId` reste `null`.
    composant.confirmerSuppression();

    await composant.confirmerSuppressionMotDePasse('mot-de-passe');

    expect(invokeSimule).not.toHaveBeenCalled();
    expect(composant.actionEnAttenteMotDePasse()).toBeNull();
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

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'erreur',
        message: 'Cette règle est introuvable : elle a peut-être déjà été supprimée.',
      }),
    ]);
  });

  it('affiche un message explicite quand le mot de passe saisi diverge de la session (R10-01)', async () => {
    const racineAvecMembre: DonneesRacine = {
      ...DonneesDeTest.racineActuelle(donneesApplication),
      groupes: DonneesDeTest.racineActuelle(donneesApplication).groupes.map((g) =>
        g.id === groupeId ? { ...g, membresConnus: [DonneesDeTest.membre('m1')] } : g,
      ),
    };
    donneesApplication.chargerRacine(racineAvecMembre);
    invokeSimule.mockRejectedValue({ type: 'motDePasseSessionDivergent' });
    composant.selectionnerGroupe(groupeId);

    composant.demanderSuppression('m1');
    composant.confirmerSuppression();
    await composant.confirmerSuppressionMotDePasse('mauvais-mot-de-passe');

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'erreur',
        message: 'Le mot de passe saisi ne correspond pas à celui de la session en cours.',
      }),
    ]);
  });

  describe(
    'présélection depuis la Fiche projet (lien « Qualifier ce membre », groupeIdPreselectionne/' +
      'critereInitial/typeCritereInitial)',
    () => {
      it('présélectionne le groupe et pré-remplit le formulaire de création (membre inconnu)', () => {
        const fixture = TestBed.createComponent(SqmMembresConnusAdminComponent);
        fixture.componentRef.setInput('groupeIdPreselectionne', groupeId);
        fixture.componentRef.setInput('critereInitial', 'exemple.fr');
        fixture.componentRef.setInput('typeCritereInitial', 'domaineEmail');

        fixture.detectChanges();

        expect(fixture.componentInstance.groupeSelectionneId).toBe(groupeId);
        expect(fixture.componentInstance.formulaireVisible()).toBe(true);
        expect(fixture.componentInstance.critere).toBe('exemple.fr');
        expect(fixture.componentInstance.typeCritere).toBe(TypeCritereMembre.DomaineEmail);
      });

      it(
        'présélectionne uniquement le groupe, sans ouvrir de formulaire, quand aucun critère n’est ' +
          'fourni (membre en conflit de règles)',
        () => {
          const fixture = TestBed.createComponent(SqmMembresConnusAdminComponent);
          fixture.componentRef.setInput('groupeIdPreselectionne', groupeId);

          fixture.detectChanges();

          expect(fixture.componentInstance.groupeSelectionneId).toBe(groupeId);
          expect(fixture.componentInstance.formulaireVisible()).toBe(false);
        },
      );

      it("ignore un type de critère non reconnu transmis par l'URL, sans ouvrir de formulaire", () => {
        const fixture = TestBed.createComponent(SqmMembresConnusAdminComponent);
        fixture.componentRef.setInput('groupeIdPreselectionne', groupeId);
        fixture.componentRef.setInput('critereInitial', 'exemple.fr');
        fixture.componentRef.setInput('typeCritereInitial', 'valeurInconnue');

        fixture.detectChanges();

        expect(fixture.componentInstance.formulaireVisible()).toBe(false);
      });
    },
  );

  describe(
    'présélection depuis la Fiche projet (lien « Marquer comme parti », RG-061, §8.5 du plan plan_18 : ' +
      'groupeIdPreselectionne/critereInitial/typeCritereInitial désignant une règle déjà existante, ' +
      'partiLeInitial)',
    () => {
      it(
        'ouvre la règle existante en modification et pré-remplit partiLe à la valeur transmise ' +
          "(règle sans date de départ jusqu'ici)",
        () => {
          const racineAvecMembre: DonneesRacine = {
            ...DonneesDeTest.racineActuelle(donneesApplication),
            groupes: DonneesDeTest.racineActuelle(donneesApplication).groupes.map((g) =>
              g.id === groupeId ? { ...g, membresConnus: [DonneesDeTest.membre('m1')] } : g,
            ),
          };
          donneesApplication.chargerRacine(racineAvecMembre);

          const fixture = TestBed.createComponent(SqmMembresConnusAdminComponent);
          fixture.componentRef.setInput('groupeIdPreselectionne', groupeId);
          fixture.componentRef.setInput('critereInitial', 'alice');
          fixture.componentRef.setInput('typeCritereInitial', 'username');
          fixture.componentRef.setInput('partiLeInitial', '2026-09-04');

          fixture.detectChanges();

          expect(fixture.componentInstance.membreEnEditionId).toBe('m1');
          expect(fixture.componentInstance.formulaireVisible()).toBe(true);
          expect(fixture.componentInstance.critere).toBe('alice');
          expect(fixture.componentInstance.partiLe).toBe('2026-09-04');
        },
      );

      it("n'écrase pas une date de départ déjà enregistrée sur la règle existante", () => {
        const racineAvecMembre: DonneesRacine = {
          ...DonneesDeTest.racineActuelle(donneesApplication),
          groupes: DonneesDeTest.racineActuelle(donneesApplication).groupes.map((g) =>
            g.id === groupeId
              ? { ...g, membresConnus: [{ ...DonneesDeTest.membre('m1'), partiLe: '2025-01-01' }] }
              : g,
          ),
        };
        donneesApplication.chargerRacine(racineAvecMembre);

        const fixture = TestBed.createComponent(SqmMembresConnusAdminComponent);
        fixture.componentRef.setInput('groupeIdPreselectionne', groupeId);
        fixture.componentRef.setInput('critereInitial', 'alice');
        fixture.componentRef.setInput('typeCritereInitial', 'username');
        fixture.componentRef.setInput('partiLeInitial', '2026-09-04');

        fixture.detectChanges();

        expect(fixture.componentInstance.membreEnEditionId).toBe('m1');
        expect(fixture.componentInstance.partiLe).toBe('2025-01-01');
      });

      it(
        'ouvre le formulaire de création (pas de règle existante), même si partiLeInitial est fourni ' +
          '(membre réellement inconnu, cf. autre describe ci-dessus)',
        () => {
          const fixture = TestBed.createComponent(SqmMembresConnusAdminComponent);
          fixture.componentRef.setInput('groupeIdPreselectionne', groupeId);
          fixture.componentRef.setInput('critereInitial', 'bob');
          fixture.componentRef.setInput('typeCritereInitial', 'username');
          fixture.componentRef.setInput('partiLeInitial', '2026-09-04');

          fixture.detectChanges();

          expect(fixture.componentInstance.membreEnEditionId).toBeNull();
          expect(fixture.componentInstance.formulaireVisible()).toBe(true);
          expect(fixture.componentInstance.critere).toBe('bob');
          expect(fixture.componentInstance.partiLe).toBe('');
        },
      );
    },
  );
});
