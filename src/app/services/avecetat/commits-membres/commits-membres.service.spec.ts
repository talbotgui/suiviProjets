// Test de CommitsMembresService (cf. commits-membres.service.ts, US-060, RG-060, plan_17 chapitre 4, amendé par
// plan_21 le 2026-09-16), Store d'orchestration de l'écran « Commits des membres », généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md. La Façade est simulée via le
// mock de `invoke`, le Store d'état applicatif et les notifications via des mocks directs
// (cf. 16_normesTests.md#tests-unitaires).
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import type { InvokeArgs } from '@tauri-apps/api/core';
import { TypeInstance } from '../../sansetat/commandes/types-facade';
import type {
  EvenementPoussee,
  Instance,
  MembreGroupeGitlab,
} from '../../sansetat/commandes/types-facade';
import { StatutMembre, TypeCritereMembre, TypeSource } from '../etat/types-donnees';
import type { CadenceCommits, Groupe, MembreConnu, Projet } from '../etat/types-donnees';
import { DonneesApplicationService } from '../etat/donnees-application.service';
import { NotificationService } from '../etat/notification.service';
import { CommitsMembresService } from './commits-membres.service';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);

/** Racine minimale lue par le Store (seuls `parametres.cadenceCommits` et `parametres.audit.concurrence` sont lus). */
interface RacineMinimale {
  readonly versionSchema: number;
  readonly parametres: {
    readonly audit: { readonly concurrence: number };
    readonly cadenceCommits: CadenceCommits;
  };
}

const INSTANCE_GITLAB: Instance = {
  id: 'i-gitlab',
  type: TypeInstance.Gitlab,
  nom: 'GitLab interne',
  urlBase: 'https://gitlab.test',
};
const INSTANCE_GITLAB_SECONDAIRE: Instance = {
  id: 'i-gitlab-2',
  type: TypeInstance.Gitlab,
  nom: 'GitLab bis',
  urlBase: 'https://gitlab-bis.test',
};

/** Compte GitLab résolu pour `alice`, réutilisé par plusieurs tests. */
const COMPTE_ALICE: MembreGroupeGitlab = {
  id: 9001,
  username: 'alice',
  nom: 'Alice',
  courriel: 'alice@interne.test',
};

/** Comptes GitLab résolus par username, comme le ferait `GET /users?username=`. */
const COMPTES_PAR_USERNAME: ReadonlyMap<string, MembreGroupeGitlab> = new Map([
  ['alice', COMPTE_ALICE],
  ['bob', { id: 9002, username: 'bob', nom: 'Bob', courriel: null }],
]);

const CADENCE_DEFAUT: CadenceCommits = {
  fenetreJours: 28,
  seuilJoursOuvresSansPoussee: 3,
  multiplicateurEcartCadence: 2,
  ponderationInactivite: 0.5,
  ponderationEcartCadence: 0.3,
  ponderationSoiree: 0.2,
  heureDebutSoiree: 19,
  heureFinSoiree: 7,
  fuseauHoraire: 'UTC',
  comptesExclus: [],
};

/**
 * Fabriques et lecteurs de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class Fixtures {
  /**
   * Lit `username` dans les arguments d'un appel `invoke` à `interroger_membre_gitlab_par_username`.
   * @param args - Arguments transmis à `invoke`.
   * @returns Le nom d'utilisateur, ou chaîne vide si absent.
   */
  public static lireUsername(args: InvokeArgs | undefined): string {
    if (
      args !== undefined &&
      !Array.isArray(args) &&
      !(args instanceof ArrayBuffer) &&
      !(args instanceof Uint8Array) &&
      'username' in args
    ) {
      return String(args['username']);
    }
    return '';
  }

  /**
   * Lit `utilisateurId` dans les arguments d'un appel `invoke` à `lister_evenements_poussees_membre`.
   * @param args - Arguments transmis à `invoke`.
   * @returns L'identifiant numérique, ou 0 si absent.
   */
  public static lireUtilisateurId(args: InvokeArgs | undefined): number {
    if (
      args !== undefined &&
      !Array.isArray(args) &&
      !(args instanceof ArrayBuffer) &&
      !(args instanceof Uint8Array) &&
      'utilisateurId' in args
    ) {
      return Number(args['utilisateurId']);
    }
    return 0;
  }

  /**
   * Événements d'un membre : `alice` (9001) régulière, tout autre membre silencieux.
   * @param utilisateurId - Identifiant du membre.
   * @returns Ses événements de poussée.
   */
  public static evenements(utilisateurId: number): readonly EvenementPoussee[] {
    const jour = 24 * 60 * 60 * 1000;
    const iso = (joursAvant: number): string =>
      new Date(Date.now() - joursAvant * jour).toISOString();
    if (utilisateurId === 9001) {
      return [1, 2, 3, 4, 5].map((joursAvant) => ({
        horodatage: iso(joursAvant),
        projetId: 1,
        refPoussee: 'refs/heads/main',
        nombreCommits: 2,
      }));
    }
    return [
      { horodatage: iso(15), projetId: 1, refPoussee: 'refs/heads/main', nombreCommits: 1 },
      { horodatage: iso(18), projetId: 1, refPoussee: 'refs/heads/main', nombreCommits: 1 },
    ];
  }

  /**
   * Membre connu `interne`/`username` actif (analysable).
   * @param id - Identifiant UUID du membre connu.
   * @param critere - Nom d'utilisateur exact.
   * @returns Le membre connu.
   */
  public static membreInterneUsername(id: string, critere: string): MembreConnu {
    return { id, critere, typeCritere: TypeCritereMembre.Username, statut: StatutMembre.Interne };
  }

  /**
   * Construit un projet minimal portant une source dépôt GitLab, pour la dérivation de `cheminsDepotsParId`.
   * @param id - Identifiant UUID du projet.
   * @param nom - Nom du projet.
   * @param idExterneGitlab - Identifiant externe (numérique) de la source dépôt GitLab.
   * @returns Le projet.
   */
  public static projetAvecDepot(id: string, nom: string, idExterneGitlab: string): Projet {
    return {
      id,
      nom,
      description: '',
      iaAutorisee: false,
      enStase: false,
      sources: [
        {
          id: `${id}-source`,
          instanceId: INSTANCE_GITLAB.id,
          type: TypeSource.DepotGitlab,
          idExterne: idExterneGitlab,
        },
      ],
      annotations: [],
      audits: [],
    };
  }

  /**
   * Construit un groupe applicatif de test. `membresConnus` couvre par défaut les quatre combinaisons
   * statut/type de critère retenues par RG-060 (interne/username actif ×2, interne/email, interne/domaineEmail,
   * client/username, interne/username parti), pour vérifier la dérivation locale des membres analysables.
   * @param instances - Instances déclarées par le groupe.
   * @param membresConnus - Membres connus du groupe (défaut : le jeu de quatre combinaisons ci-dessus).
   * @param projets - Projets du groupe (défaut : un projet portant le dépôt `1`).
   * @returns Le groupe.
   */
  public static groupe(
    instances: readonly Instance[],
    membresConnus: readonly MembreConnu[] = [
      Fixtures.membreInterneUsername('m-1', 'alice'),
      Fixtures.membreInterneUsername('m-2', 'bob'),
      {
        id: 'm-3',
        critere: '*.interne.test',
        typeCritere: TypeCritereMembre.Email,
        statut: StatutMembre.Interne,
      },
      {
        id: 'm-4',
        critere: '*.interne.test',
        typeCritere: TypeCritereMembre.DomaineEmail,
        statut: StatutMembre.Interne,
      },
      {
        id: 'm-5',
        critere: 'client-ext',
        typeCritere: TypeCritereMembre.Username,
        statut: StatutMembre.Client,
      },
      { ...Fixtures.membreInterneUsername('m-6', 'partie'), partiLe: '2026-01-01' },
    ],
    projets: readonly Projet[] = [Fixtures.projetAvecDepot('p-1', 'API', '1')],
  ): Groupe {
    return {
      id: 'g-1',
      nom: 'Groupe démo',
      description: '',
      instances,
      membresConnus,
      annotations: [],
      indicateursDesactives: [],
      projets,
    };
  }

  /**
   * Construit une erreur de connecteur à rejeter par le mock d'`invoke` (Error porteuse d'un discriminant `type`,
   * reconnue par `ErreurConnecteurUtils.correspondAUneErreurConnecteur`).
   * @param type - Discriminant de l'anomalie (RG-021).
   * @returns L'erreur à rejeter.
   */
  public static anomalie(type: string): Error {
    return Object.assign(new Error('anomalie simulée'), { type });
  }
}

describe('CommitsMembresService', () => {
  let service: CommitsMembresService;
  let notification: { erreur: jest.Mock; succes: jest.Mock };
  const racineSignal: WritableSignal<RacineMinimale | null> = signal<RacineMinimale | null>(null);
  const groupesSignal: WritableSignal<readonly Groupe[]> = signal<readonly Groupe[]>([]);

  beforeEach(() => {
    invokeSimule.mockReset();
    invokeSimule.mockImplementation((commande, args) => {
      if (commande === 'interroger_membre_gitlab_par_username') {
        return Promise.resolve(COMPTES_PAR_USERNAME.get(Fixtures.lireUsername(args)) ?? null);
      }
      if (commande === 'lister_evenements_poussees_membre') {
        return Promise.resolve(Fixtures.evenements(Fixtures.lireUtilisateurId(args)));
      }
      return Promise.reject(Fixtures.anomalie('reponseInattendue'));
    });
    notification = { erreur: jest.fn(), succes: jest.fn() };
    racineSignal.set({
      versionSchema: 12,
      parametres: { audit: { concurrence: 2 }, cadenceCommits: CADENCE_DEFAUT },
    });
    groupesSignal.set([Fixtures.groupe([INSTANCE_GITLAB])]);

    TestBed.configureTestingModule({
      providers: [
        CommitsMembresService,
        {
          provide: DonneesApplicationService,
          useValue: { racine: racineSignal, groupes: groupesSignal },
        },
        { provide: NotificationService, useValue: notification },
      ],
    });
    service = TestBed.inject(CommitsMembresService);
  });

  it('résout chaque membre interne/username actif une fois, sans aucun appel de listing de roster, et alimente les lignes', async () => {
    await service.analyser('g-1');

    const appelsResolution = invokeSimule.mock.calls.filter(
      (appel) => appel[0] === 'interroger_membre_gitlab_par_username',
    );
    expect(appelsResolution).toHaveLength(2);
    expect(appelsResolution.map((appel) => Fixtures.lireUsername(appel[1])).sort()).toEqual([
      'alice',
      'bob',
    ]);
    expect(
      invokeSimule.mock.calls.some((appel) => appel[0] === 'preparer_analyse_commits_membres'),
    ).toBe(false);
    const appelsEvenements = invokeSimule.mock.calls.filter(
      (appel) => appel[0] === 'lister_evenements_poussees_membre',
    );
    expect(appelsEvenements).toHaveLength(2);
    expect(
      service
        .lignes()
        .map((ligne) => ligne.username)
        .sort(),
    ).toEqual(['alice', 'bob']);
    expect(service.instantAnalyse()).not.toBeNull();
    expect(service.enCours()).toBe(false);
  });

  it('signale le nombre de règles interne non analysables (email et domaineEmail), hors partenaires et partis', async () => {
    await service.analyser('g-1');

    // Deux règles `interne` non analysables (`m-3` email, `m-4` domaineEmail) ; `client-ext` (client) et `partie`
    // (interne/username mais `partiLe` renseigné) ne comptent pas dans ce signalement.
    expect(service.reglesNonAnalysables()).toBe(2);
  });

  it('dérive cheminsDepotsParId depuis Projet.sources, sans appel réseau', async () => {
    groupesSignal.set([
      Fixtures.groupe(
        [INSTANCE_GITLAB],
        [Fixtures.membreInterneUsername('m-1', 'alice')],
        [Fixtures.projetAvecDepot('p-1', 'API Facturation', '1')],
      ),
    ]);

    await service.analyser('g-1');

    expect(service.lignes()[0]?.depotDernierePoussee).toBe('API Facturation');
  });

  it('limite la concurrence de la boucle à parametres.audit.concurrence et fait avancer la progression', async () => {
    const membresConnus = [1, 2, 3, 4, 5].map((id) =>
      Fixtures.membreInterneUsername(`m-${id}`, `dev-${id}`),
    );
    groupesSignal.set([Fixtures.groupe([INSTANCE_GITLAB], membresConnus)]);
    let enVol = 0;
    let maxEnVol = 0;
    const traitesObserves: number[] = [];
    invokeSimule.mockImplementation((commande, args) => {
      if (commande === 'interroger_membre_gitlab_par_username') {
        // Chaque appel enregistre l'état de la progression au moment de son lancement (les `concurrence` premiers
        // voient `traites: 0`, les suivants voient un compteur qui progresse au fil des résolutions).
        traitesObserves.push(service.progression()?.traites ?? -1);
        enVol += 1;
        maxEnVol = Math.max(maxEnVol, enVol);
        const username = Fixtures.lireUsername(args);
        return new Promise<MembreGroupeGitlab>((resolve) => {
          setTimeout(() => {
            enVol -= 1;
            resolve({
              id: 9100 + Number(username.split('-')[1]),
              username,
              nom: username,
              courriel: null,
            });
          }, 5);
        });
      }
      return Promise.resolve([]);
    });

    await service.analyser('g-1');

    // Concurrence bornée : jamais plus de 2 appels en vol simultanément (parametres.audit.concurrence).
    expect(maxEnVol).toBe(2);
    // Progression observée : les deux premiers lancements voient 0, puis le compteur avance jusqu'à 4.
    expect(traitesObserves).toEqual([0, 0, 1, 2, 3]);
    expect(service.activiteBrute()).toHaveLength(5);
  });

  it('recalcule les lignes sur changement de seuil sans nouvel appel réseau', async () => {
    await service.analyser('g-1');
    const appelsAvant = invokeSimule.mock.calls.length;
    expect(service.lignes()).toHaveLength(2);

    racineSignal.set({
      versionSchema: 12,
      parametres: {
        audit: { concurrence: 2 },
        cadenceCommits: { ...CADENCE_DEFAUT, comptesExclus: ['bob'] },
      },
    });

    expect(invokeSimule.mock.calls.length).toBe(appelsAvant);
    expect(service.lignes().map((ligne) => ligne.username)).toEqual(['alice']);
  });

  it('absorbe un membre sans compte GitLab actif correspondant, sans interrompre la boucle', async () => {
    invokeSimule.mockImplementation((commande, args) => {
      if (commande === 'interroger_membre_gitlab_par_username') {
        // `bob` ne correspond à aucun compte GitLab actif (cas métier, pas une anomalie).
        return Promise.resolve(Fixtures.lireUsername(args) === 'bob' ? null : COMPTE_ALICE);
      }
      return Promise.resolve(Fixtures.evenements(9001));
    });

    await service.analyser('g-1');

    expect(notification.erreur).toHaveBeenCalledTimes(1);
    expect(service.lignes()).toHaveLength(1);
    expect(service.lignes()[0]?.username).toBe('alice');
  });

  it('consigne une erreur de résolution sur un membre sans interrompre la boucle', async () => {
    invokeSimule.mockImplementation((commande, args) => {
      if (commande === 'interroger_membre_gitlab_par_username') {
        if (Fixtures.lireUsername(args) === 'bob') {
          return Promise.reject(Fixtures.anomalie('droitsInsuffisants'));
        }
        return Promise.resolve(COMPTE_ALICE);
      }
      return Promise.resolve(Fixtures.evenements(9001));
    });

    await service.analyser('g-1');

    expect(notification.erreur).toHaveBeenCalledTimes(1);
    expect(service.lignes()).toHaveLength(1);
  });

  it('consigne une erreur de récupération des événements d’un membre sans interrompre la boucle', async () => {
    invokeSimule.mockImplementation((commande, args) => {
      if (commande === 'interroger_membre_gitlab_par_username') {
        return Promise.resolve(COMPTES_PAR_USERNAME.get(Fixtures.lireUsername(args)) ?? null);
      }
      if (Fixtures.lireUtilisateurId(args) === 9002) {
        return Promise.reject(Fixtures.anomalie('droitsInsuffisants'));
      }
      return Promise.resolve(Fixtures.evenements(9001));
    });

    await service.analyser('g-1');

    expect(notification.erreur).toHaveBeenCalledTimes(1);
    // `bob` reste présent (résolu), sans activité (repli sur liste vide).
    expect(service.lignes()).toHaveLength(2);
  });

  it('interrompt l’analyse et n’appelle rien si le groupe ne déclare aucune instance GitLab', async () => {
    groupesSignal.set([Fixtures.groupe([])]);

    await service.analyser('g-1');

    expect(invokeSimule).not.toHaveBeenCalled();
    expect(notification.erreur).toHaveBeenCalledTimes(1);
    expect(service.lignes()).toEqual([]);
  });

  it('signale la présence de plusieurs instances GitLab (seule la première interrogée)', async () => {
    groupesSignal.set([Fixtures.groupe([INSTANCE_GITLAB, INSTANCE_GITLAB_SECONDAIRE])]);

    await service.analyser('g-1');

    expect(service.plusieursInstancesGitlab()).toBe(true);
    expect(service.premiereInstanceGitlabNom()).toBe('GitLab interne');
    expect(invokeSimule).toHaveBeenCalledWith(
      'interroger_membre_gitlab_par_username',
      expect.objectContaining({ instance: INSTANCE_GITLAB }),
    );
  });

  it('réinitialise l’état', async () => {
    await service.analyser('g-1');
    service.reinitialiser();

    expect(service.activiteBrute()).toBeNull();
    expect(service.instantAnalyse()).toBeNull();
    expect(service.lignes()).toEqual([]);
    expect(service.reglesNonAnalysables()).toBe(0);
  });
});
