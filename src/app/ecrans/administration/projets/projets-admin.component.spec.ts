// Test de l'onglet Projets de l'écran Administration (cf. projets-admin.component.ts), généré avec l'assistance
// de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { SqmFormulaireSourceComponent } from '../../../composants/formulaire-source/formulaire-source.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { TypeInstance } from '../../../services/sansetat/commandes/types-facade';
import { DomTestUtils } from '../../../testing/dom-test.utils';
import { SqmProjetsAdminComponent } from './projets-admin.component';

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
  let fixture: ComponentFixture<SqmProjetsAdminComponent>;
  let composant: SqmProjetsAdminComponent;
  let groupeId: string;

  beforeEach(async () => {
    invokeSimule.mockReset();
    isTauriSimule.mockReturnValue(true);
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
    fixture = TestBed.createComponent(SqmProjetsAdminComponent);
    composant = fixture.componentInstance;
  });

  it('agrège les projets de tous les groupes tant qu’aucun filtre Groupe n’est sélectionné', () => {
    const autreGroupeId = donneesApplication.creerGroupe({
      nom: 'Socle Technique',
      description: '',
      instances: [],
    });
    donneesApplication.creerProjet(groupeId, { nom: 'API Facturation', description: '' });
    donneesApplication.creerProjet(autreGroupeId, { nom: 'API Paiement', description: '' });

    const lignes = composant.lignesProjets();

    expect(lignes).toHaveLength(2);
    expect(lignes.find((l) => l.projet.nom === 'API Facturation')?.groupeId).toBe(groupeId);
    expect(lignes.find((l) => l.projet.nom === 'API Facturation')?.groupeNom).toBe(
      'Socle Comptable',
    );
    expect(lignes.find((l) => l.projet.nom === 'API Paiement')?.groupeId).toBe(autreGroupeId);
  });

  it('affiche les projets du groupe sélectionné', () => {
    donneesApplication.creerProjet(groupeId, { nom: 'API Facturation', description: '' });

    composant.selectionnerGroupe(groupeId);

    expect(composant.lignesProjets()).toHaveLength(1);
  });

  it('refuse la création sans nom', () => {
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.nom = '  ';

    composant.enregistrer();

    expect(composant.messageErreur).toBe('Le nom du projet est obligatoire.');
    expect(composant.lignesProjets()).toEqual([]);
  });

  it('crée un projet avec la politique IA interdite par défaut (RG-014, US-038 : notification de succès)', () => {
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.nom = 'API Facturation';

    composant.enregistrer();

    expect(composant.lignesProjets()[0].projet.iaAutorisee).toBe(false);
    expect(composant.formulaireVisible).toBe(false);
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'Le projet a été créé.' }),
    ]);
  });

  it('modifie un projet existant (US-038 : notification de succès)', () => {
    donneesApplication.creerProjet(groupeId, { nom: 'API Facturation', description: '' });
    composant.selectionnerGroupe(groupeId);

    composant.ouvrirEdition(composant.lignesProjets()[0]);
    composant.nom = 'Nouveau nom';
    composant.enregistrer();

    expect(composant.lignesProjets()[0].projet.nom).toBe('Nouveau nom');
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'Le projet a été modifié.' }),
    ]);
  });

  it('modifie un projet à partir de la liste agrégée « Tous les groupes », en utilisant son groupe réel plutôt que le filtre courant (nul ici)', () => {
    const autreGroupeId = donneesApplication.creerGroupe({
      nom: 'Socle Technique',
      description: '',
      instances: [],
    });
    donneesApplication.creerProjet(groupeId, { nom: 'API Facturation', description: '' });
    donneesApplication.creerProjet(autreGroupeId, { nom: 'API Paiement', description: '' });
    const ligne = composant.lignesProjets().find((l) => l.projet.nom === 'API Paiement');
    if (!ligne) {
      throw new Error('ligne attendue pour ce test');
    }

    composant.ouvrirEdition(ligne);
    composant.nom = 'API Paiement v2';
    composant.enregistrer();

    const racine = DonneesDeTest.racineActuelle(donneesApplication);
    const groupeModifie = racine.groupes.find((g) => g.id === autreGroupeId);
    expect(groupeModifie?.projets[0]?.nom).toBe('API Paiement v2');
    const groupeInitial = racine.groupes.find((g) => g.id === groupeId);
    expect(groupeInitial?.projets[0]?.nom).toBe('API Facturation');
  });

  it('duplique un projet avec ses sources (US-038 : notification de succès)', () => {
    donneesApplication.creerProjet(groupeId, { nom: 'API Facturation', description: '' });
    composant.selectionnerGroupe(groupeId);

    composant.dupliquer(composant.lignesProjets()[0]);

    expect(composant.lignesProjets()).toHaveLength(2);
    expect(composant.lignesProjets().some((l) => l.projet.nom === 'API Facturation (copie)')).toBe(
      true,
    );
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'Le projet a été dupliqué.' }),
    ]);
  });

  it('supprime un projet après confirmation (US-038 : notification de succès)', () => {
    donneesApplication.creerProjet(groupeId, { nom: 'API Facturation', description: '' });
    composant.selectionnerGroupe(groupeId);

    composant.demanderSuppression(composant.lignesProjets()[0]);
    composant.confirmerSuppression();

    expect(composant.lignesProjets()).toEqual([]);
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: 'Le projet a été supprimé.' }),
    ]);
  });

  it("n'effectue aucune suppression en cas d'annulation", () => {
    donneesApplication.creerProjet(groupeId, { nom: 'API Facturation', description: '' });
    composant.selectionnerGroupe(groupeId);

    composant.demanderSuppression(composant.lignesProjets()[0]);
    composant.annulerSuppression();

    expect(composant.lignesProjets()).toHaveLength(1);
  });

  it('rend le gabarit sans erreur et marque le bouton de création comme désactivé tant qu’aucun groupe n’est sélectionné', () => {
    fixture.detectChanges();

    const boutonCreer = DomTestUtils.obtenirElementNatif(fixture).querySelector(
      '#projets-admin-bouton-creer',
    );
    if (!(boutonCreer instanceof HTMLButtonElement)) {
      throw new Error('bouton de création introuvable dans le gabarit sous test.');
    }
    expect(boutonCreer.disabled).toBe(true);
  });

  it('n’effectue aucune création tant qu’aucun groupe n’est sélectionné (filet de sécurité du bouton désactivé)', () => {
    composant.ouvrirCreation();
    composant.nom = 'API Facturation';

    composant.enregistrer();

    expect(composant.lignesProjets()).toEqual([]);
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
      const ligne = composant.lignesProjets()[0];

      composant.demanderBasculePolitiqueIA(ligne);

      expect(composant.lignePolitiqueIAEnAttente()).toBe(ligne);
    });

    it('annule la bascule demandée', () => {
      composant.demanderBasculePolitiqueIA(composant.lignesProjets()[0]);

      composant.annulerBasculePolitiqueIA();

      expect(composant.lignePolitiqueIAEnAttente()).toBeNull();
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

      composant.demanderBasculePolitiqueIA(composant.lignesProjets()[0]);
      await composant.confirmerBasculePolitiqueIA('mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('definir_politique_ia', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        groupeId,
        projetId,
        iaAutorisee: true,
        motDePasse: 'mot-de-passe',
      });
      expect(composant.lignesProjets()[0].projet.iaAutorisee).toBe(true);
      expect(composant.lignesProjets()[0].projet.annotations).toHaveLength(1);
      expect(composant.lignePolitiqueIAEnAttente()).toBeNull();
    });

    it('affiche un message d’erreur en cas de mot de passe incorrect', async () => {
      invokeSimule.mockRejectedValue({ type: 'motDePasseOuFichierInvalide' });

      composant.demanderBasculePolitiqueIA(composant.lignesProjets()[0]);
      await composant.confirmerBasculePolitiqueIA('mauvais-mot-de-passe');

      expect(TestBed.inject(NotificationService).liste()).toEqual([
        expect.objectContaining({ type: 'erreur', message: 'Mot de passe incorrect.' }),
      ]);
      expect(composant.lignesProjets()[0].projet.iaAutorisee).toBe(false);
    });
  });

  describe('enchaînement guidé projet → sources (US-007, C11-01)', () => {
    let groupeAvecInstanceId: string;

    beforeEach(() => {
      groupeAvecInstanceId = donneesApplication.creerGroupe({
        nom: 'Socle Technique',
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
      composant.selectionnerGroupe(groupeAvecInstanceId);
    });

    it('« Créer un projet » simple ne déclenche pas le mini-flux', () => {
      composant.ouvrirCreation();
      composant.nom = 'API Facturation';

      composant.enregistrer();

      expect(composant.projetPourSourcesId).toBeNull();
    });

    it('« Créer et ajouter des sources » crée le projet puis ouvre le mini-flux pré-filtré', () => {
      composant.ouvrirCreationAvecSources();
      composant.nom = 'API Facturation';

      composant.enregistrer();

      expect(composant.formulaireVisible).toBe(false);
      expect(composant.lignesProjets()).toHaveLength(1);
      expect(composant.projetPourSourcesId).toBe(composant.lignesProjets()[0].projet.id);
    });

    it('« Ajouter une autre source » enregistre la source puis réinitialise le formulaire sans fermer le mini-flux (US-038 : notification de succès)', () => {
      composant.ouvrirCreationAvecSources();
      composant.nom = 'API Facturation';
      composant.enregistrer();
      fixture.detectChanges();
      const formulaireSource = DomTestUtils.obtenirComposantEnfant(
        fixture,
        SqmFormulaireSourceComponent,
      );
      formulaireSource.instanceId.set('instance-gitlab');
      formulaireSource.idExterne.set('groupe/api-facturation');

      composant.ajouterAutreSource();

      expect(composant.lignesProjets()[0].projet.sources).toHaveLength(1);
      expect(composant.projetPourSourcesId).not.toBeNull();
      expect(formulaireSource.instanceId()).toBe('');
      expect(formulaireSource.idExterne()).toBe('');
      expect(TestBed.inject(NotificationService).liste()).toEqual([
        expect.objectContaining({ type: 'succes', message: 'Le projet a été créé.' }),
        expect.objectContaining({ type: 'succes', message: 'La source a été créée.' }),
      ]);
    });

    it('« Terminer ce projet, projet suivant » enregistre la dernière source puis rouvre un formulaire Projet vierge en mode « avec sources »', () => {
      composant.ouvrirCreationAvecSources();
      composant.nom = 'API Facturation';
      composant.enregistrer();
      fixture.detectChanges();
      const formulaireSource = DomTestUtils.obtenirComposantEnfant(
        fixture,
        SqmFormulaireSourceComponent,
      );
      formulaireSource.instanceId.set('instance-gitlab');
      formulaireSource.idExterne.set('groupe/api-facturation');

      composant.terminerProjetPasserAuSuivant();

      expect(composant.lignesProjets()[0].projet.sources).toHaveLength(1);
      expect(composant.projetPourSourcesId).toBeNull();
      expect(composant.formulaireVisible).toBe(true);
      expect(composant.nom).toBe('');
      expect(composant.creationAvecSourcesDemandee).toBe(true);
      expect(TestBed.inject(NotificationService).liste()).toEqual([
        expect.objectContaining({ type: 'succes', message: 'Le projet a été créé.' }),
        expect.objectContaining({ type: 'succes', message: 'La source a été créée.' }),
      ]);
    });

    it('« Terminer ce projet, projet suivant » avec un formulaire vide ne crée aucune source superflue', () => {
      composant.ouvrirCreationAvecSources();
      composant.nom = 'API Facturation';
      composant.enregistrer();
      fixture.detectChanges();

      composant.terminerProjetPasserAuSuivant();

      expect(composant.lignesProjets()[0].projet.sources).toEqual([]);
      expect(composant.projetPourSourcesId).toBeNull();
      expect(composant.formulaireVisible).toBe(true);
      expect(composant.creationAvecSourcesDemandee).toBe(true);
    });

    it('« Terminer ce projet, projet suivant » reste sur le mini-flux si la saisie en cours est invalide', () => {
      composant.ouvrirCreationAvecSources();
      composant.nom = 'API Facturation';
      composant.enregistrer();
      fixture.detectChanges();
      const formulaireSource = DomTestUtils.obtenirComposantEnfant(
        fixture,
        SqmFormulaireSourceComponent,
      );
      formulaireSource.instanceId.set('instance-gitlab');

      composant.terminerProjetPasserAuSuivant();

      expect(composant.projetPourSourcesId).not.toBeNull();
      expect(formulaireSource.messageErreur).toBe("L'identifiant externe est obligatoire.");
    });

    it('enchaîne sur un second mini-flux sans reclic sur « Créer et ajouter des sources »', () => {
      composant.ouvrirCreationAvecSources();
      composant.nom = 'API Facturation';
      composant.enregistrer();
      fixture.detectChanges();
      composant.terminerProjetPasserAuSuivant();

      composant.nom = 'API Paiement';
      composant.enregistrer();

      expect(composant.lignesProjets()).toHaveLength(2);
      expect(composant.projetPourSourcesId).toBe(
        composant.lignesProjets().find((l) => l.projet.nom === 'API Paiement')?.projet.id,
      );
    });
  });
});
