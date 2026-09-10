// Test de CommitsMembresService (cf. commits-membres.service.ts, US-060, RG-060, plan_17 chapitre 4), Store
// d'orchestration de l'écran « Commits des membres », généré avec l'assistance de l'IA (Claude Code),
// conformément à .claude/rules/01-usage-ia-et-conventions.md. La Façade est simulée via le mock de `invoke`, le
// Store d'état applicatif et les notifications via des mocks directs (cf. 16_normesTests.md#tests-unitaires).
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import type { InvokeArgs } from '@tauri-apps/api/core';
import { TypeInstance } from '../../sansetat/commandes/types-facade';
import type { EvenementPoussee, Instance } from '../../sansetat/commandes/types-facade';
import { StatutMembre, TypeCritereMembre } from '../etat/types-donnees';
import type { CadenceCommits, Groupe } from '../etat/types-donnees';
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

const ROSTER = {
  membres: [
    { id: 9001, username: 'alice', nom: 'Alice', courriel: 'alice@interne.test' },
    { id: 9002, username: 'bob', nom: 'Bob', courriel: null },
  ],
  projets: [{ id: 1, chemin: 'demo/api' }],
};

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
   * Lit `utilisateurId` dans les arguments d'un appel `invoke`, sans assertion de type.
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
   * Événements d'un membre : `alice` régulière, tout autre membre silencieux.
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
   * Construit un groupe applicatif de test.
   * @param instances - Instances déclarées par le groupe.
   * @returns Le groupe.
   */
  public static groupe(instances: readonly Instance[]): Groupe {
    return {
      id: 'g-1',
      nom: 'Groupe démo',
      description: '',
      instances,
      membresConnus: [
        {
          id: 'm-1',
          critere: 'interne.test',
          typeCritere: TypeCritereMembre.DomaineEmail,
          statut: StatutMembre.Interne,
        },
      ],
      annotations: [],
      indicateursDesactives: [],
      projets: [],
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
      if (commande === 'preparer_analyse_commits_membres') {
        return Promise.resolve(ROSTER);
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

  it('prépare le roster puis interroge chaque membre une fois, et alimente les lignes', async () => {
    await service.analyser('g-1', 'demo/groupe-gitlab');

    expect(invokeSimule).toHaveBeenCalledWith(
      'preparer_analyse_commits_membres',
      expect.objectContaining({ groupeGitlab: 'demo/groupe-gitlab' }),
    );
    const appelsMembres = invokeSimule.mock.calls.filter(
      (appel) => appel[0] === 'lister_evenements_poussees_membre',
    );
    expect(appelsMembres).toHaveLength(2);
    expect(
      service
        .lignes()
        .map((ligne) => ligne.username)
        .sort(),
    ).toEqual(['alice', 'bob']);
    expect(service.instantAnalyse()).not.toBeNull();
    expect(service.enCours()).toBe(false);
  });

  it('recalcule les lignes sur changement de seuil sans nouvel appel réseau', async () => {
    await service.analyser('g-1', 'demo/groupe-gitlab');
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

  it('consigne une erreur sur un membre sans interrompre la boucle', async () => {
    invokeSimule.mockImplementation((commande, args) => {
      if (commande === 'preparer_analyse_commits_membres') {
        return Promise.resolve(ROSTER);
      }
      if (Fixtures.lireUtilisateurId(args) === 9002) {
        return Promise.reject(Fixtures.anomalie('droitsInsuffisants'));
      }
      return Promise.resolve(Fixtures.evenements(9001));
    });

    await service.analyser('g-1', 'demo/groupe-gitlab');

    expect(notification.erreur).toHaveBeenCalledTimes(1);
    expect(service.lignes()).toHaveLength(2);
  });

  it('interrompt l’analyse et n’appelle rien si le groupe ne déclare aucune instance GitLab', async () => {
    groupesSignal.set([Fixtures.groupe([])]);

    await service.analyser('g-1', 'demo/groupe-gitlab');

    expect(invokeSimule).not.toHaveBeenCalled();
    expect(notification.erreur).toHaveBeenCalledTimes(1);
    expect(service.lignes()).toEqual([]);
  });

  it('signale la présence de plusieurs instances GitLab (seule la première interrogée)', async () => {
    groupesSignal.set([Fixtures.groupe([INSTANCE_GITLAB, INSTANCE_GITLAB_SECONDAIRE])]);

    await service.analyser('g-1', 'demo/groupe-gitlab');

    expect(service.plusieursInstancesGitlab()).toBe(true);
    expect(service.premiereInstanceGitlabNom()).toBe('GitLab interne');
    expect(invokeSimule).toHaveBeenCalledWith(
      'preparer_analyse_commits_membres',
      expect.objectContaining({ instance: INSTANCE_GITLAB }),
    );
  });

  it('réinitialise l’état', async () => {
    await service.analyser('g-1', 'demo/groupe-gitlab');
    service.reinitialiser();

    expect(service.activiteBrute()).toBeNull();
    expect(service.instantAnalyse()).toBeNull();
    expect(service.lignes()).toEqual([]);
  });
});
