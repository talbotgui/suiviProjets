// Test de l'écran Constitution de campagne (cf. constitution-campagne.component.ts), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { Router } from '@angular/router';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import { OrchestrateurCampagneService } from '../../../services/avecetat/campagne/orchestrateur-campagne.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { SqmConstitutionCampagneComponent } from './constitution-campagne.component';

// `isTauri` toujours vrai (R10-06) : nécessaire au passage réel par `invoke` (`InvocationCommandeUtils`) désormais
// exercé par les tests qui attendent l'issue de `confirmerLancement`, sur le modèle de
// `orchestrateur-campagne.service.spec.ts`.
jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

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

describe('SqmConstitutionCampagneComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let composant: SqmConstitutionCampagneComponent;
  let routerMock: { navigateByUrl: jest.Mock };
  let groupeId: string;
  let projetId: string;

  beforeEach(async () => {
    invokeSimule.mockReset();
    invokeSimule.mockResolvedValue(DonneesDeTest.racineVide());
    routerMock = { navigateByUrl: jest.fn().mockResolvedValue(true) };
    await TestBed.configureTestingModule({
      imports: [SqmConstitutionCampagneComponent],
      providers: [{ provide: Router, useValue: routerMock }],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    groupeId = donneesApplication.creerGroupe({
      nom: 'Socle Comptable',
      description: '',
      instances: [],
    });
    projetId = donneesApplication.creerProjet(groupeId, {
      nom: 'API Facturation',
      description: '',
    });
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    composant = TestBed.createComponent(SqmConstitutionCampagneComponent).componentInstance;
  });

  it('ne doit sélectionner aucun projet au départ', () => {
    expect(composant.selectionProjetIds.size).toBe(0);
    expect(composant.estToutSelectionne()).toBe(false);
  });

  it('doit basculer la sélection d’un projet', () => {
    composant.basculerProjet(projetId);
    expect(composant.estProjetSelectionne(projetId)).toBe(true);

    composant.basculerProjet(projetId);
    expect(composant.estProjetSelectionne(projetId)).toBe(false);
  });

  it('doit sélectionner/désélectionner tous les projets d’un groupe via sa case', () => {
    const groupe = composant.groupes()[0];

    composant.basculerGroupe(groupe);
    expect(composant.estProjetSelectionne(projetId)).toBe(true);
    expect(composant.estGroupeIntegralementSelectionne(groupe)).toBe(true);

    composant.basculerGroupe(groupe);
    expect(composant.estProjetSelectionne(projetId)).toBe(false);
  });

  it('doit sélectionner/désélectionner tous les projets via « tout »', () => {
    composant.basculerTout();
    expect(composant.estToutSelectionne()).toBe(true);
    expect(composant.estProjetSelectionne(projetId)).toBe(true);

    composant.basculerTout();
    expect(composant.estToutSelectionne()).toBe(false);
  });

  it('doit appliquer le raccourci « rejouer les échecs de la dernière campagne »', () => {
    const autreProjetId = donneesApplication.creerProjet(groupeId, {
      nom: 'Autre',
      description: '',
    });
    const racineAvecCampagne: DonneesRacine = {
      ...DonneesDeTest.racineActuelle(donneesApplication),
      campagnes: [
        {
          id: 'campagne-1',
          date: '2026-07-01T00:00:00Z',
          perimetre: [projetId, autreProjetId],
          verdicts: [
            { projetId, statut: 'echec' },
            { projetId: autreProjetId, statut: 'succes' },
          ],
        },
      ],
    };
    donneesApplication.chargerRacine(racineAvecCampagne);

    composant.appliquerRaccourciEchecs();

    expect(Array.from(composant.selectionProjetIds)).toEqual([projetId]);
  });

  it('doit appliquer le raccourci « non audités depuis longtemps » avec le repli par défaut', () => {
    composant.appliquerRaccourciNonAudites();

    expect(Array.from(composant.selectionProjetIds)).toEqual([projetId]);
  });

  it('doit bloquer et afficher un bandeau si un brouillon existant reste à traiter (RG-019)', () => {
    const racineAvecBrouillon: DonneesRacine = {
      ...DonneesDeTest.racineActuelle(donneesApplication),
      brouillon: {
        campagneId: 'campagne-1',
        creeLe: '2026-07-01T00:00:00Z',
        resultatsParProjet: [],
      },
    };
    donneesApplication.chargerRacine(racineAvecBrouillon);

    expect(composant.brouillonEnAttente()).toBe(true);
  });

  it('ne doit rien bloquer sans brouillon en attente', () => {
    expect(composant.brouillonEnAttente()).toBe(false);
  });

  it('doit calculer le récapitulatif de la sélection courante', () => {
    composant.basculerProjet(projetId);

    const recapitulatif = composant.recapitulatif();

    expect(recapitulatif.nombreProjets).toBe(1);
  });

  it('doit lancer la campagne et naviguer immédiatement vers le Tableau de bord sans attendre sa fin', () => {
    composant.basculerProjet(projetId);

    composant.confirmerLancement('mot-de-passe');

    expect(composant.confirmationMotDePasseVisible).toBe(false);
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/audits/tableau-de-bord');
  });

  it("doit retenir l'échec de la sauvegarde finale du brouillon dans le Store, connu seulement après la navigation vers le Tableau de bord (R10-06)", async () => {
    invokeSimule.mockImplementation((commande: string) =>
      commande === 'enregistrer_brouillon'
        ? Promise.reject(
            Object.assign(new Error('motDePasseOuFichierInvalide'), {
              type: 'motDePasseOuFichierInvalide',
            }),
          )
        : Promise.resolve(DonneesDeTest.racineVide()),
    );
    const etatSession = TestBed.inject(EtatSessionService);
    composant.basculerProjet(projetId);

    composant.confirmerLancement('mauvais-mot-de-passe');
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(etatSession.echecEnregistrementBrouillon()).toEqual({
      type: 'motDePasseOuFichierInvalide',
    });
  });

  it('ne doit rien retenir dans le Store quand la sauvegarde finale du brouillon réussit', async () => {
    const etatSession = TestBed.inject(EtatSessionService);
    composant.basculerProjet(projetId);

    composant.confirmerLancement('mot-de-passe');
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(etatSession.echecEnregistrementBrouillon()).toBeNull();
  });

  it('doit ouvrir puis annuler la ressaisie du mot de passe sans lancer la campagne', () => {
    composant.demanderLancement();
    expect(composant.confirmationMotDePasseVisible).toBe(true);

    composant.annulerLancement();

    expect(composant.confirmationMotDePasseVisible).toBe(false);
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });

  describe('date d’analyse et audit historique (C15-14, US-046, RG-046)', () => {
    it('ne doit pas activer le mode historique tant qu’aucune date n’est saisie', () => {
      expect(composant.dateCiblee()).toBe('');
      expect(composant.modeHistoriqueActif()).toBe(false);
    });

    it('doit activer le mode historique dès qu’une date est saisie, et le désactiver si elle est effacée', () => {
      composant.definirDateCiblee('2026-05-01');
      expect(composant.modeHistoriqueActif()).toBe(true);

      composant.definirDateCiblee('');
      expect(composant.modeHistoriqueActif()).toBe(false);
    });

    it('doit propager la date ciblée saisie à OrchestrateurCampagneService.lancerCampagne', () => {
      const orchestrateurCampagne = TestBed.inject(OrchestrateurCampagneService);
      const lancerCampagneSimule = jest
        .spyOn(orchestrateurCampagne, 'lancerCampagne')
        .mockResolvedValue({ type: 'succes' });
      composant.basculerProjet(projetId);
      composant.definirDateCiblee('2026-05-01');

      composant.confirmerLancement('mot-de-passe');

      expect(lancerCampagneSimule).toHaveBeenCalledWith([projetId], 'mot-de-passe', '2026-05-01');
    });

    it('ne doit transmettre aucune date ciblée à OrchestrateurCampagneService.lancerCampagne quand le champ est vide (comportement inchangé)', () => {
      const orchestrateurCampagne = TestBed.inject(OrchestrateurCampagneService);
      const lancerCampagneSimule = jest
        .spyOn(orchestrateurCampagne, 'lancerCampagne')
        .mockResolvedValue({ type: 'succes' });
      composant.basculerProjet(projetId);

      composant.confirmerLancement('mot-de-passe');

      expect(lancerCampagneSimule).toHaveBeenCalledWith([projetId], 'mot-de-passe', undefined);
    });
  });
});
