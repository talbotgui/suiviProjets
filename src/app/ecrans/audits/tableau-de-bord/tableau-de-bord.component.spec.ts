// Test de l'écran Tableau de bord d'exécution (cf. tableau-de-bord.component.ts), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { SqmTableauDeBordComponent } from './tableau-de-bord.component';

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
}

describe('SqmTableauDeBordComponent', () => {
  let etatSession: EtatSessionService;
  let composant: SqmTableauDeBordComponent;
  let projetId: string;

  beforeEach(async () => {
    invokeSimule.mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmTableauDeBordComponent],
    }).compileComponents();
    const donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    const groupeId = donneesApplication.creerGroupe({
      nom: 'Socle Comptable',
      description: '',
      instances: [],
    });
    projetId = donneesApplication.creerProjet(groupeId, {
      nom: 'API Facturation',
      description: '',
    });
    etatSession = TestBed.inject(EtatSessionService);
    composant = TestBed.createComponent(SqmTableauDeBordComponent).componentInstance;
  });

  it("doit indiquer l'absence de campagne en cours au départ", () => {
    expect(composant.progression()).toBeNull();
    expect(composant.pourcentage()).toBe(0);
    expect(composant.tempsRestantEstimeMs()).toBeNull();
  });

  it('doit résoudre le nom du projet à partir de son identifiant', () => {
    expect(composant.nomProjet(projetId)).toBe('API Facturation');
  });

  it("doit retourner l'identifiant tel quel si le projet n'est plus trouvé", () => {
    expect(composant.nomProjet('projet-inconnu')).toBe('projet-inconnu');
  });

  it('doit calculer le pourcentage et le compteur de projets traités', () => {
    etatSession.demarrerProgressionCampagne([projetId, 'projet-2', 'projet-3']);
    etatSession.mettreAJourProgressionProjet(projetId, { statut: 'termine', dureeMs: 1_000 });
    etatSession.mettreAJourProgressionProjet('projet-2', { statut: 'echoue', dureeMs: 500 });

    expect(composant.nombreProjetsTraites()).toBe(2);
    expect(composant.pourcentage()).toBe(67);
  });

  it("ne doit compter aucun projet traité tant que rien n'a de statut terminal", () => {
    etatSession.demarrerProgressionCampagne([projetId]);

    expect(composant.nombreProjetsTraites()).toBe(0);
    expect(composant.pourcentage()).toBe(0);
  });

  it('doit estimer le temps restant à partir de la moyenne des durées déjà connues', () => {
    etatSession.demarrerProgressionCampagne([projetId, 'projet-2', 'projet-3', 'projet-4']);
    etatSession.mettreAJourProgressionProjet(projetId, { statut: 'termine', dureeMs: 1_000 });
    etatSession.mettreAJourProgressionProjet('projet-2', { statut: 'termine', dureeMs: 3_000 });

    // Moyenne des deux durées connues (2000 ms) × 2 projets restants (projet-3, projet-4) = 4000 ms.
    expect(composant.tempsRestantEstimeMs()).toBe(4_000);
  });

  it('doit retourner zéro pour le temps restant une fois tous les projets traités', () => {
    etatSession.demarrerProgressionCampagne([projetId]);
    etatSession.mettreAJourProgressionProjet(projetId, { statut: 'termine', dureeMs: 1_000 });

    expect(composant.tempsRestantEstimeMs()).toBe(0);
  });

  it('doit formater une durée en secondes avec une décimale', () => {
    expect(composant.formaterDuree(1_234)).toBe('1,2 s');
  });

  it.each([
    ['enAttente', 'En attente'],
    ['enCours', 'En cours'],
    ['termine', 'Terminé'],
    ['echoue', 'Échoué'],
    ['ignore', 'Ignoré'],
  ] as const)('doit libeller le statut « %s »', (statut, libelleAttendu) => {
    expect(composant.libelleStatut(statut)).toBe(libelleAttendu);
  });

  describe('detailColonne (F06 : connecteur actif / nombre de résultats / motif court)', () => {
    it('doit afficher le connecteur actif pour un projet en cours', () => {
      expect(composant.detailColonne({ statut: 'enCours', connecteurActif: 'gitlab' })).toBe(
        'GitLab',
      );
      expect(composant.detailColonne({ statut: 'enCours', connecteurActif: 'sonar' })).toBe(
        'Sonar',
      );
    });

    it('doit afficher le nombre de résultats pour un projet terminé', () => {
      expect(composant.detailColonne({ statut: 'termine', nombreResultats: 7 })).toBe(
        '7 résultat(s)',
      );
    });

    it('doit afficher le motif court pour un projet échoué', () => {
      expect(
        composant.detailColonne({
          statut: 'echoue',
          motifEchec: 'gitlab.vitalite : instanceInjoignable',
        }),
      ).toBe('gitlab.vitalite : instanceInjoignable');
    });

    it('doit rester vide pour un projet en attente ou ignoré', () => {
      expect(composant.detailColonne({ statut: 'enAttente' })).toBe('');
      expect(composant.detailColonne({ statut: 'ignore' })).toBe('');
    });
  });

  it('doit demander l’annulation de la campagne en cours (RG-018)', () => {
    etatSession.demarrerProgressionCampagne([projetId]);
    etatSession.mettreAJourProgressionProjet(projetId, {
      statut: 'enCours',
      connecteurActif: 'gitlab',
    });

    composant.annuler();

    // L'annulation est un drapeau interne à l'Orchestrateur : ce test vérifie seulement que l'appel ne lève
    // aucune erreur et n'affecte pas immédiatement la progression déjà acquise (aucune campagne n'étant
    // effectivement en vol dans ce test unitaire, cf. `orchestrateur-campagne.service.spec.ts` pour le
    // comportement d'annulation complet).
    expect(etatSession.progressionCampagne()?.projets[projetId]?.statut).toBe('enCours');
  });
});
