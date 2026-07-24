// Test de l'écran Brouillon et rapport d'anomalies (cf. brouillon.component.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md. La Façade de commandes est simulée
// via le mock de `invoke`, sur le modèle de `tableau-de-bord.component.spec.ts`.
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';
import { TypeInstance } from '../../../services/sansetat/commandes/types-facade';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import { TypeSource } from '../../../services/avecetat/etat/types-donnees';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { SqmBrouillonComponent } from './brouillon.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

const invokeSimule = jest.mocked(invoke);

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine de test portant un groupe, un projet audité une première fois, une campagne et un
   * brouillon en attente pour ce même projet.
   * @returns La racine de test construite.
   */
  public static racineAvecBrouillonEnAttente(): DonneesRacine {
    return {
      versionSchema: 1,
      meta: {
        creeLe: '2026-07-20T08:00:00Z',
        modifieLe: '2026-07-20T08:00:00Z',
        application: 'Test',
      },
      groupes: [
        {
          id: 'groupe-1',
          nom: 'Socle Comptable',
          description: '',
          instances: [
            {
              id: 'instance-gitlab',
              type: TypeInstance.Gitlab,
              nom: 'GitLab interne',
              urlBase: 'https://gitlab.exemple.test',
            },
          ],
          membresConnus: [],
          annotations: [],
          indicateursDesactives: [],
          projets: [
            {
              id: 'projet-1',
              nom: 'API Facturation',
              description: '',
              iaAutorisee: false,
              sources: [
                {
                  id: 'source-1',
                  instanceId: 'instance-gitlab',
                  type: TypeSource.DepotGitlab,
                  idExterne: '1234',
                },
              ],
              annotations: [],
              audits: [
                {
                  id: 'audit-0',
                  date: '2026-06-01T08:00:00Z',
                  campagneId: 'campagne-0',
                  resultats: [{ type: 'sonar.ncloc', sourceId: 'source-1', ncloc: 10_000 }],
                },
              ],
            },
          ],
        },
      ],
      referentiels: {},
      parametres: {},
      campagnes: [
        {
          id: 'campagne-1',
          date: '2026-07-20T08:00:00Z',
          perimetre: ['projet-1'],
          verdicts: [
            {
              projetId: 'projet-1',
              statut: 'succes',
              anomalies: [
                {
                  indicateur: 'gitlab.membres',
                  sourceId: 'source-1',
                  anomalie: { type: 'droitsInsuffisants', message: 'Statut HTTP 403 reçu' },
                },
              ],
            },
          ],
        },
      ],
      brouillon: {
        campagneId: 'campagne-1',
        creeLe: '2026-07-20T08:00:00Z',
        resultatsParProjet: [
          {
            projetId: 'projet-1',
            statut: 'enAttente',
            audit: {
              id: 'audit-1',
              date: '2026-07-20T08:00:00Z',
              campagneId: 'campagne-1',
              resultats: [{ type: 'sonar.ncloc', sourceId: 'source-1', ncloc: 15_000 }],
            },
            aberrations: [
              { indicateur: 'sonar.ncloc', ancienneValeur: 10_000, nouvelleValeur: 15_000 },
            ],
          },
        ],
      },
      traitementsAlertes: [],
      journal: [],
      vuesEnregistrees: [],
    };
  }
}

describe('SqmBrouillonComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let routerMock: { navigateByUrl: jest.Mock };
  let composant: SqmBrouillonComponent;

  beforeEach(async () => {
    invokeSimule.mockReset();
    routerMock = { navigateByUrl: jest.fn().mockResolvedValue(true) };
    await TestBed.configureTestingModule({
      imports: [SqmBrouillonComponent],
      providers: [{ provide: Router, useValue: routerMock }],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racineAvecBrouillonEnAttente());
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    composant = TestBed.createComponent(SqmBrouillonComponent).componentInstance;
  });

  it('doit indiquer la présence du brouillon et exposer son unique entrée en attente', () => {
    expect(composant.brouillonPresent()).toBe(true);
    expect(composant.entrees()).toHaveLength(1);
    expect(composant.entrees()[0].projetId).toBe('projet-1');
  });

  it("ne doit pas confondre l'absence de fichier chargé avec la présence d'un brouillon", () => {
    donneesApplication.reinitialiser();

    expect(donneesApplication.racine()).toBeNull();
    expect(composant.brouillonPresent()).toBe(false);
    expect(composant.entrees()).toEqual([]);
  });

  it('doit résoudre le nom du projet à partir de son identifiant', () => {
    expect(composant.nomProjet('projet-1')).toBe('API Facturation');
    expect(composant.nomProjet('projet-inconnu')).toBe('projet-inconnu');
  });

  it("doit calculer l'écart matériel de l'indicateur sonar.ncloc (seuil de matérialité dépassé)", () => {
    const [entree] = composant.entrees();

    expect(composant.ecarts(entree)).toEqual([
      {
        indicateur: 'sonar.ncloc',
        libelle: 'Volume de code (ncloc)',
        ancienneValeur: 10_000,
        nouvelleValeur: 15_000,
      },
    ]);
  });

  it("doit exposer l'aberration RG-020 déjà calculée pour cette entrée", () => {
    const [entree] = composant.entrees();

    expect(composant.aberrations(entree)).toEqual([
      { indicateur: 'sonar.ncloc', ancienneValeur: 10_000, nouvelleValeur: 15_000 },
    ]);
  });

  it('doit regrouper le rapport d’anomalies de la campagne à l’origine du brouillon', () => {
    const groupes = composant.anomalies();

    expect(groupes).toHaveLength(1);
    expect(groupes[0]).toEqual(
      expect.objectContaining({
        categorie: 'droitsInsuffisants',
        instanceId: 'instance-gitlab',
      }),
    );
    expect(groupes[0].projets).toEqual([{ projetId: 'projet-1', projetNom: 'API Facturation' }]);
  });

  it('doit gérer la sélection individuelle et globale des entrées en attente', () => {
    expect(composant.estSelectionne('projet-1')).toBe(false);

    composant.basculerSelection('projet-1');
    expect(composant.estSelectionne('projet-1')).toBe(true);
    expect(composant.estToutSelectionne()).toBe(true);

    composant.basculerTout();
    expect(composant.estSelectionne('projet-1')).toBe(false);
  });

  it('doit demander une intégration ou un rejet de la sélection courante', () => {
    composant.basculerSelection('projet-1');

    composant.demanderIntegrerSelection();
    expect(composant.actionEnAttente).toEqual({ type: 'integrer', selection: ['projet-1'] });

    composant.demanderRejeterSelection();
    expect(composant.actionEnAttente).toEqual({ type: 'rejeter', selection: ['projet-1'] });
  });

  it('doit annuler une action en attente', () => {
    composant.demanderIntegrerTout();
    expect(composant.actionEnAttente).not.toBeNull();

    composant.annulerAction();
    expect(composant.actionEnAttente).toBeNull();
  });

  it.each([
    ['aucunBrouillonCourant', 'Ce brouillon a déjà été traité (peut-être depuis un autre onglet).'],
    [
      'projetAbsentDuBrouillon',
      "Un des projets sélectionnés n'est plus présent dans ce brouillon.",
    ],
    ['fichierVerrouille', 'Le fichier de données est verrouillé par un autre processus.'],
    ['erreurInterne', "Une erreur inattendue est survenue lors de l'enregistrement."],
  ] as const)(
    'doit afficher le message correspondant à l’anomalie « %s »',
    async (type, message) => {
      invokeSimule.mockRejectedValue({ type });

      composant.demanderIntegrerTout();
      await composant.confirmerAction('mot-de-passe');

      expect(composant.messageErreur).toBe(message);
    },
  );

  it('doit intégrer le brouillon après confirmation du mot de passe et naviguer si le brouillon est résolu', async () => {
    invokeSimule.mockResolvedValue({
      ...DonneesDeTest.racineAvecBrouillonEnAttente(),
      brouillon: null,
    });

    composant.demanderIntegrerTout();
    expect(composant.actionEnAttente).not.toBeNull();

    await composant.confirmerAction('mot-de-passe-correct');

    expect(invokeSimule).toHaveBeenCalledWith(
      'integrer_brouillon',
      expect.objectContaining({ selection: undefined, motDePasse: 'mot-de-passe-correct' }),
    );
    expect(composant.actionEnAttente).toBeNull();
    expect(composant.messageErreur).toBeNull();
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/audits/constitution-campagne');
  });

  it('doit rejeter la sélection avec le motif saisi', async () => {
    invokeSimule.mockResolvedValue({
      ...DonneesDeTest.racineAvecBrouillonEnAttente(),
      brouillon: null,
    });
    composant.motifRejet = '  Mauvaise ref  ';

    composant.demanderRejeterUnique('projet-1');
    await composant.confirmerAction('mot-de-passe-correct');

    expect(invokeSimule).toHaveBeenCalledWith(
      'rejeter_brouillon',
      expect.objectContaining({
        selection: ['projet-1'],
        motif: 'Mauvaise ref',
        motDePasse: 'mot-de-passe-correct',
      }),
    );
  });

  it('doit afficher un message et ne pas naviguer en cas de mot de passe incorrect', async () => {
    invokeSimule.mockRejectedValue({ type: 'motDePasseOuFichierInvalide' });

    composant.demanderIntegrerTout();
    await composant.confirmerAction('mauvais-mot-de-passe');

    expect(composant.messageErreur).toBe('Mot de passe incorrect.');
    expect(composant.actionEnAttente).toBeNull();
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
    expect(composant.brouillonPresent()).toBe(true);
  });

  it('ne doit rien faire si aucune action n’est en attente lors de la confirmation', async () => {
    await composant.confirmerAction('mot-de-passe');

    expect(invokeSimule).not.toHaveBeenCalled();
  });
});
