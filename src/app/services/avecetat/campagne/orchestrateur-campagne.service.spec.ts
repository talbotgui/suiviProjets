// Test de OrchestrateurCampagneService (cf. orchestrateur-campagne.service.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md. La Façade de commandes est simulée
// via le mock de `invoke` (comme `facade-commandes.service.spec.ts`), le Store d'état applicatif via un mock
// direct de `DonneesApplicationService` (cf. `docs/02_documentation/16_normesTests.md#tests-unitaires`).
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { TypeInstance } from '../../sansetat/commandes/types-facade';
import type { Instance } from '../../sansetat/commandes/types-facade';
import { DonneesApplicationService } from '../etat/donnees-application.service';
import { EtatSessionService } from '../etat/etat-session.service';
import { TypeSource } from '../etat/types-donnees';
import type {
  Audit,
  Groupe,
  Projet,
  ResultatBrouillonProjet,
  ResultatMutationAdministration,
  Source,
  Verdict,
} from '../etat/types-donnees';
import { OrchestrateurCampagneService } from './orchestrateur-campagne.service';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

const invokeSimule = jest.mocked(invoke);

const INSTANCE_GITLAB: Instance = {
  id: 'instance-gitlab',
  type: TypeInstance.Gitlab,
  nom: 'GitLab interne',
  urlBase: 'https://gitlab.exemple.test',
};

const INSTANCE_SONAR: Instance = {
  id: 'instance-sonar',
  type: TypeInstance.Sonar,
  nom: 'Sonar interne',
  urlBase: 'https://sonar.exemple.test',
};

/**
 * Utilitaires de test, classe à membres statiques uniquement conformément à la règle « aucune fonction hors
 * classe » des normes de développement du projet.
 */
class UtilitairesTest {
  /**
   * Construit une anomalie de connectivité de test, sous forme d'une véritable instance `Error` porteuse d'un
   * champ `type` (plutôt qu'un objet littéral), conformément à `@typescript-eslint/prefer-promise-reject-errors` :
   * reste néanmoins reconnue par `FacadeCommandesService.estErreurConnecteur` (`'type' in valeur`), qui ne
   * présuppose rien de plus que la présence de ce champ.
   * @param type - Catégorie d'anomalie (`CategorieErreurConnecteur`).
   * @returns L'anomalie construite.
   */
  public static erreurConnecteur(type: string): Error & { readonly type: string } {
    return Object.assign(new Error(type), { type });
  }

  /**
   * Vérifie qu'un résultat d'audit (`Audit.resultats`, typé `unknown` côté interface) porte le tag `Resultat`
   * donné, sans recourir à une assertion `as` non justifiée.
   * @param resultat - Entrée de `Audit.resultats`.
   * @param type - Tag `Resultat` recherché.
   * @returns `true` si `resultat` porte ce tag.
   */
  public static estResultatDeType(resultat: unknown, type: string): boolean {
    return (
      typeof resultat === 'object' &&
      resultat !== null &&
      'type' in resultat &&
      resultat.type === type
    );
  }
}

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une source GitLab de test.
   * @param id - Identifiant de la source.
   * @returns La source construite.
   */
  public static sourceGitlab(id: string): Source {
    return {
      id,
      instanceId: INSTANCE_GITLAB.id,
      type: TypeSource.DepotGitlab,
      idExterne: `${id}-externe`,
    };
  }

  /**
   * Construit une source Sonar de test.
   * @param id - Identifiant de la source.
   * @returns La source construite.
   */
  public static sourceSonar(id: string): Source {
    return {
      id,
      instanceId: INSTANCE_SONAR.id,
      type: TypeSource.ProjetSonar,
      idExterne: `${id}-externe`,
    };
  }

  /**
   * Construit un projet de test, sans audit préalable.
   * @param id - Identifiant du projet.
   * @param sources - Sources rattachées au projet.
   * @param audits - Historique d'audits intégrés du projet, vide par défaut.
   * @returns Le projet construit.
   */
  public static projet(
    id: string,
    sources: readonly Source[],
    audits: readonly Audit[] = [],
  ): Projet {
    return {
      id,
      nom: id,
      description: '',
      iaAutorisee: false,
      sources,
      annotations: [],
      audits,
    };
  }

  /**
   * Construit un groupe de test portant un unique projet.
   * @param projets - Projets rattachés au groupe.
   * @param indicateursDesactives - Indicateurs désactivés pour ce groupe, aucun par défaut.
   * @returns Le groupe construit.
   */
  public static groupe(
    projets: readonly Projet[],
    indicateursDesactives: readonly string[] = [],
  ): Groupe {
    return {
      id: 'groupe-1',
      nom: 'Groupe de test',
      description: '',
      instances: [INSTANCE_GITLAB, INSTANCE_SONAR],
      membresConnus: [],
      annotations: [],
      indicateursDesactives,
      projets,
    };
  }
}

const REPONSES_PAR_DEFAUT: Readonly<Record<string, unknown>> = {
  interroger_vitalite: {
    sourceId: 'src',
    refEffective: 'main',
    shaTete: 'abc',
    dernierCommitLe: '2026-07-20',
  },
  interroger_taille_depot: {
    sourceId: 'src',
    refEffective: 'main',
    shaTete: 'abc',
    tailleOctets: 1_000_000,
  },
  interroger_contributeurs: {
    sourceId: 'src',
    refEffective: 'main',
    shaTete: 'abc',
    fenetreJours: 90,
    contributeurs: [{ email: 'a@b.fr', nom: 'A', nombreCommits: 5 }],
  },
  interroger_merge_requests: {
    sourceId: 'src',
    refEffective: 'main',
    shaTete: 'abc',
    mrOuvertes: [],
  },
  interroger_membres: { sourceId: 'src', refEffective: 'main', shaTete: 'abc', membres: [] },
  interroger_violations: {
    sourceId: 'src',
    parSeverite: { bloquant: 0, critique: 0, majeur: 0, mineur: 0, info: 0 },
    nouvellesViolations: 2,
  },
  interroger_dette: { sourceId: 'src', detteMinutes: 10, ratioDette: 0.01 },
  interroger_couverture: { sourceId: 'src', couverture: 80, couvertureNouveauCode: 90 },
  interroger_notes: {
    sourceId: 'src',
    fiabilite: 1,
    securite: 1,
    maintenabilite: 1,
    revueSecurite: 1,
  },
  interroger_ncloc: { sourceId: 'src', ncloc: 10_000, parLangage: {} },
  interroger_derniere_analyse: '2026-07-19',
};

type MockEnregistrerBrouillon = jest.Mock<
  Promise<ResultatMutationAdministration>,
  [
    string,
    string,
    readonly string[],
    readonly Verdict[],
    readonly ResultatBrouillonProjet[],
    string,
  ]
>;

describe('OrchestrateurCampagneService', () => {
  let service: OrchestrateurCampagneService;
  let donneesApplicationMock: {
    groupes: jest.Mock<readonly Groupe[], []>;
    racine: jest.Mock<{ readonly parametres: unknown }, []>;
    enregistrerBrouillon: MockEnregistrerBrouillon;
  };

  beforeEach(() => {
    invokeSimule.mockReset();
    invokeSimule.mockImplementation((commande: string) =>
      Promise.resolve(REPONSES_PAR_DEFAUT[commande]),
    );
    const enregistrerBrouillon: MockEnregistrerBrouillon = jest.fn<
      Promise<ResultatMutationAdministration>,
      [
        string,
        string,
        readonly string[],
        readonly Verdict[],
        readonly ResultatBrouillonProjet[],
        string,
      ]
    >();
    enregistrerBrouillon.mockResolvedValue({ type: 'succes' });
    donneesApplicationMock = {
      groupes: jest.fn(() => []),
      racine: jest.fn(() => ({ parametres: {} })),
      enregistrerBrouillon,
    };
    TestBed.configureTestingModule({
      providers: [
        EtatSessionService,
        { provide: DonneesApplicationService, useValue: donneesApplicationMock },
      ],
    });
    service = TestBed.inject(OrchestrateurCampagneService);
  });

  describe('constituerCampagne', () => {
    it('doit compter les projets et les instances distinctes, et lister les credentials manquants', () => {
      const projet1 = DonneesDeTest.projet('projet-1', [DonneesDeTest.sourceGitlab('source-1')]);
      const projet2 = DonneesDeTest.projet('projet-2', [DonneesDeTest.sourceSonar('source-2')]);
      donneesApplicationMock.groupes.mockReturnValue([DonneesDeTest.groupe([projet1, projet2])]);

      const resultat = service.constituerCampagne(['projet-1', 'projet-2']);

      expect(resultat.nombreProjets).toBe(2);
      expect(resultat.nombreInstances).toBe(2);
      expect(resultat.credentialsManquants).toEqual(
        expect.arrayContaining([INSTANCE_GITLAB.id, INSTANCE_SONAR.id]),
      );
    });

    it('ne doit pas lister une instance dont le credential est en mémoire', () => {
      const etatSession = TestBed.inject(EtatSessionService);
      etatSession.definirCredentials({ [INSTANCE_GITLAB.id]: 'jeton' });
      const projet1 = DonneesDeTest.projet('projet-1', [DonneesDeTest.sourceGitlab('source-1')]);
      donneesApplicationMock.groupes.mockReturnValue([DonneesDeTest.groupe([projet1])]);

      const resultat = service.constituerCampagne(['projet-1']);

      expect(resultat.credentialsManquants).toEqual([]);
    });
  });

  describe('lancerCampagne', () => {
    it('doit produire un verdict « succès » et alimenter le brouillon pour un projet entièrement réussi', async () => {
      const projet = DonneesDeTest.projet('projet-1', [
        DonneesDeTest.sourceGitlab('source-1'),
        DonneesDeTest.sourceSonar('source-2'),
      ]);
      donneesApplicationMock.groupes.mockReturnValue([DonneesDeTest.groupe([projet])]);

      const resultat = await service.lancerCampagne(['projet-1'], 'mot-de-passe');

      expect(resultat).toEqual({ type: 'succes' });
      expect(donneesApplicationMock.enregistrerBrouillon).toHaveBeenCalledTimes(1);
      const [, , perimetre, verdicts, resultatsParProjet, motDePasse] =
        donneesApplicationMock.enregistrerBrouillon.mock.calls[0];
      expect(perimetre).toEqual(['projet-1']);
      expect(motDePasse).toBe('mot-de-passe');
      expect(verdicts).toEqual([{ projetId: 'projet-1', statut: 'succes', anomalies: undefined }]);
      expect(resultatsParProjet).toHaveLength(1);
      const resultats: readonly unknown[] = resultatsParProjet[0].audit.resultats;
      expect(resultats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'gitlab.vitalite' }),
          expect.objectContaining({ type: 'sonar.couverture' }),
          expect.objectContaining({ type: 'croise.fraicheur_sonar' }),
          expect.objectContaining({ type: 'croise.activite_sans_qualite' }),
        ]),
      );
    });

    it('doit renseigner la progression du Store (connecteur actif observé puis durée finale) pour un projet réussi', async () => {
      const projet = DonneesDeTest.projet('projet-1', [
        DonneesDeTest.sourceGitlab('source-1'),
        DonneesDeTest.sourceSonar('source-2'),
      ]);
      donneesApplicationMock.groupes.mockReturnValue([DonneesDeTest.groupe([projet])]);
      const connecteursObserves: ('gitlab' | 'sonar' | undefined)[] = [];
      const etatSession = TestBed.inject(EtatSessionService);
      invokeSimule.mockImplementation((commande: string) => {
        connecteursObserves.push(
          etatSession.progressionCampagne()?.projets['projet-1']?.connecteurActif,
        );
        return Promise.resolve(REPONSES_PAR_DEFAUT[commande]);
      });

      await service.lancerCampagne(['projet-1'], 'mot-de-passe');

      expect(connecteursObserves).toEqual(expect.arrayContaining(['gitlab', 'sonar']));
      const progressionFinale = etatSession.progressionCampagne()?.projets['projet-1'];
      expect(progressionFinale?.statut).toBe('termine');
      expect(progressionFinale?.dureeMs).toBeGreaterThanOrEqual(0);
    });

    it(
      'doit considérer une confirmation Sonar « jamais analysé » comme un résultat exploitable à elle seule ' +
        '(décision arbitraire de relecture, cf. rapport de développement)',
      async () => {
        const indicateursDesactives = [
          'sonar.violations',
          'sonar.dette',
          'sonar.couverture',
          'sonar.notes',
          'sonar.ncloc',
          'croise.activite_sans_qualite',
        ];
        const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.sourceSonar('source-2')]);
        donneesApplicationMock.groupes.mockReturnValue([
          DonneesDeTest.groupe([projet], indicateursDesactives),
        ]);
        invokeSimule.mockImplementation((commande: string) =>
          commande === 'interroger_derniere_analyse'
            ? Promise.resolve(null)
            : Promise.resolve(REPONSES_PAR_DEFAUT[commande]),
        );

        await service.lancerCampagne(['projet-1'], 'mot-de-passe');

        const [, , , verdicts, resultatsParProjet] =
          donneesApplicationMock.enregistrerBrouillon.mock.calls[0];
        expect(verdicts[0].statut).toBe('succes');
        const resultats: readonly unknown[] = resultatsParProjet[0].audit.resultats;
        expect(resultats).toEqual([
          { type: 'croise.fraicheur_sonar', dernierCommitLe: undefined, aucuneAnalyse: true },
        ]);
      },
    );

    it('doit conserver les résultats partiels et consigner les anomalies quand une source échoue entièrement', async () => {
      const projet = DonneesDeTest.projet('projet-1', [
        DonneesDeTest.sourceGitlab('source-1'),
        DonneesDeTest.sourceSonar('source-2'),
      ]);
      donneesApplicationMock.groupes.mockReturnValue([DonneesDeTest.groupe([projet])]);
      const commandesEnEchec = new Set([
        'interroger_violations',
        'interroger_dette',
        'interroger_couverture',
        'interroger_notes',
        'interroger_ncloc',
        'interroger_derniere_analyse',
      ]);
      invokeSimule.mockImplementation((commande: string) =>
        commandesEnEchec.has(commande)
          ? Promise.reject(UtilitairesTest.erreurConnecteur('instanceInjoignable'))
          : Promise.resolve(REPONSES_PAR_DEFAUT[commande]),
      );

      await service.lancerCampagne(['projet-1'], 'mot-de-passe');

      const [, , , verdicts, resultatsParProjet] =
        donneesApplicationMock.enregistrerBrouillon.mock.calls[0];
      const verdict: Verdict = verdicts[0];
      expect(verdict.statut).toBe('succes');
      expect(verdict.anomalies).toHaveLength(6);
      const resultats: readonly unknown[] = resultatsParProjet[0].audit.resultats;
      expect(resultats).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'gitlab.vitalite' })]),
      );
      expect(
        resultats.some((resultat) =>
          UtilitairesTest.estResultatDeType(resultat, 'sonar.couverture'),
        ),
      ).toBe(false);
    });

    it('doit produire un verdict « échec » sans entrée de brouillon quand aucun résultat n’est exploitable', async () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.sourceGitlab('source-1')]);
      donneesApplicationMock.groupes.mockReturnValue([DonneesDeTest.groupe([projet])]);
      invokeSimule.mockImplementation(() =>
        Promise.reject(UtilitairesTest.erreurConnecteur('instanceInjoignable')),
      );

      const etatSession = TestBed.inject(EtatSessionService);

      await service.lancerCampagne(['projet-1'], 'mot-de-passe');

      const [, , , verdicts, resultatsParProjet] =
        donneesApplicationMock.enregistrerBrouillon.mock.calls[0];
      expect(verdicts[0].statut).toBe('echec');
      expect(resultatsParProjet).toEqual([]);
      const progressionProjet = etatSession.progressionCampagne()?.projets['projet-1'];
      expect(progressionProjet?.statut).toBe('echoue');
      expect(progressionProjet?.dureeMs).toBeGreaterThanOrEqual(0);
      expect(progressionProjet?.motifEchec).toBe('gitlab.membres : instanceInjoignable');
    });

    it('ne doit pas interroger un indicateur désactivé pour le groupe et ne pas le proposer au brouillon', async () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.sourceGitlab('source-1')]);
      donneesApplicationMock.groupes.mockReturnValue([
        DonneesDeTest.groupe([projet], ['gitlab.membres']),
      ]);

      await service.lancerCampagne(['projet-1'], 'mot-de-passe');

      expect(invokeSimule).not.toHaveBeenCalledWith('interroger_membres', expect.anything());
      const [, , , , resultatsParProjet] =
        donneesApplicationMock.enregistrerBrouillon.mock.calls[0];
      const resultats: readonly unknown[] = resultatsParProjet[0].audit.resultats;
      expect(
        resultats.some((resultat) => UtilitairesTest.estResultatDeType(resultat, 'gitlab.membres')),
      ).toBe(false);
    });

    it('doit détecter une aberration RG-020 par comparaison avec le dernier audit intégré', async () => {
      const dernierAuditIntegre: Audit = {
        id: 'audit-0',
        date: '2026-06-01T00:00:00Z',
        campagneId: 'campagne-0',
        resultats: [
          { type: 'gitlab.taille_depot', sourceId: 'source-1', tailleOctets: 1_000_000 },
          { type: 'sonar.couverture', sourceId: 'source-2', couverture: 60 },
          { type: 'sonar.ncloc', sourceId: 'source-2', ncloc: 10_000 },
        ],
      };
      const projet = DonneesDeTest.projet(
        'projet-1',
        [DonneesDeTest.sourceGitlab('source-1'), DonneesDeTest.sourceSonar('source-2')],
        [dernierAuditIntegre],
      );
      donneesApplicationMock.groupes.mockReturnValue([DonneesDeTest.groupe([projet])]);
      donneesApplicationMock.racine.mockReturnValue({
        parametres: { seuils: { materialiteBrouillon: { variationRelative: 0.1 } } },
      });
      invokeSimule.mockImplementation((commande: string) => {
        if (commande === 'interroger_taille_depot') {
          return Promise.resolve({
            sourceId: 'source-1',
            refEffective: 'main',
            shaTete: 'abc',
            tailleOctets: 20_000_000,
          });
        }
        if (commande === 'interroger_couverture') {
          return Promise.resolve({ sourceId: 'source-2', couverture: 0, couvertureNouveauCode: 0 });
        }
        if (commande === 'interroger_ncloc') {
          return Promise.resolve({ sourceId: 'source-2', ncloc: 5_000, parLangage: {} });
        }
        return Promise.resolve(REPONSES_PAR_DEFAUT[commande]);
      });

      await service.lancerCampagne(['projet-1'], 'mot-de-passe');

      const [, , , , resultatsParProjet] =
        donneesApplicationMock.enregistrerBrouillon.mock.calls[0];
      expect(resultatsParProjet[0].aberrations).toEqual(
        expect.arrayContaining([
          {
            indicateur: 'gitlab.taille_depot',
            ancienneValeur: 1_000_000,
            nouvelleValeur: 20_000_000,
          },
          { indicateur: 'sonar.ncloc', ancienneValeur: 10_000, nouvelleValeur: 5_000 },
          { indicateur: 'sonar.couverture', ancienneValeur: 60, nouvelleValeur: 0 },
        ]),
      );
    });

    it('doit respecter la concurrence configurée (RG-017)', async () => {
      let enCours = 0;
      let maxSimultane = 0;
      invokeSimule.mockImplementation(async (commande: string) => {
        enCours += 1;
        maxSimultane = Math.max(maxSimultane, enCours);
        await new Promise((resolve) => setTimeout(resolve, 15));
        enCours -= 1;
        return REPONSES_PAR_DEFAUT[commande];
      });
      const projets = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((id) =>
        DonneesDeTest.projet(id, [DonneesDeTest.sourceGitlab(`${id}-source`)]),
      );
      donneesApplicationMock.groupes.mockReturnValue([DonneesDeTest.groupe(projets)]);
      donneesApplicationMock.racine.mockReturnValue({ parametres: { audit: { concurrence: 2 } } });

      await service.lancerCampagne(
        projets.map((projet) => projet.id),
        'mot-de-passe',
      );

      expect(maxSimultane).toBeLessThanOrEqual(2);
      expect(maxSimultane).toBeGreaterThan(1);
    }, 10_000);

    it('doit annuler proprement une campagne en cours : le projet en vol va à son terme, les suivants sont ignorés (RG-018)', async () => {
      invokeSimule.mockImplementation(async (commande: string) => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        return REPONSES_PAR_DEFAUT[commande];
      });
      const projets = ['p1', 'p2', 'p3'].map((id) =>
        DonneesDeTest.projet(id, [DonneesDeTest.sourceGitlab(`${id}-source`)]),
      );
      donneesApplicationMock.groupes.mockReturnValue([DonneesDeTest.groupe(projets)]);
      donneesApplicationMock.racine.mockReturnValue({ parametres: { audit: { concurrence: 1 } } });
      const etatSession = TestBed.inject(EtatSessionService);

      const promesse = service.lancerCampagne(
        projets.map((projet) => projet.id),
        'mot-de-passe',
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      service.annulerCampagne();
      await promesse;

      const [, , , verdicts] = donneesApplicationMock.enregistrerBrouillon.mock.calls[0];
      const statuts: readonly string[] = verdicts.map((verdict: Verdict) => verdict.statut);
      expect(statuts[0]).toBe('succes');
      expect(statuts.slice(1)).toEqual(['ignore', 'ignore']);
      const progressionCampagne = etatSession.progressionCampagne();
      expect(progressionCampagne?.projets['p1']?.statut).toBe('termine');
      expect(progressionCampagne?.projets['p2']?.statut).toBe('ignore');
      expect(progressionCampagne?.projets['p3']?.statut).toBe('ignore');
    }, 10_000);
  });
});
