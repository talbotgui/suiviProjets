// Test de SqmCommitsMembresComponent (cf. commits-membres.component.ts, US-060, RG-060, plan_17 chapitre 4, amendé
// par plan_21 le 2026-09-16), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md. Composant de présentation : suivi du nombre de méthodes jamais
// appelées (16_normesTests.md), plus les assertions ci-dessous sur l'absence d'appel réseau au tri / filtrage /
// changement de seuil.
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';
import type { InvokeArgs } from '@tauri-apps/api/core';
import { TypeInstance } from '../../services/sansetat/commandes/types-facade';
import type {
  EvenementPoussee,
  Instance,
  MembreGroupeGitlab,
} from '../../services/sansetat/commandes/types-facade';
import { StatutMembre, TypeCritereMembre } from '../../services/avecetat/etat/types-donnees';
import type {
  CadenceCommits,
  Groupe,
  MembreConnu,
} from '../../services/avecetat/etat/types-donnees';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmCommitsMembresComponent } from './commits-membres.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);

const INSTANCE_GITLAB: Instance = {
  id: 'i-gitlab',
  type: TypeInstance.Gitlab,
  nom: 'GitLab interne',
  urlBase: 'https://gitlab.test',
};

const CADENCE: CadenceCommits = {
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

/** Comptes GitLab résolus par username, comme le ferait `GET /users?username=`. */
const COMPTES_PAR_USERNAME: ReadonlyMap<string, MembreGroupeGitlab> = new Map([
  ['alice', { id: 9001, username: 'alice', nom: 'Alice', courriel: null }],
  ['bob', { id: 9002, username: 'bob', nom: 'Bob', courriel: null }],
]);

interface RacineMinimale {
  readonly parametres: {
    readonly audit: { readonly concurrence: number };
    readonly cadenceCommits: CadenceCommits;
  };
}

/**
 * Fabriques de test, classe à membres statiques uniquement (règle « aucune fonction hors classe »).
 */
class Fixtures {
  /**
   * Lit `username` dans les arguments d'un appel `invoke` à `interroger_membre_gitlab_par_username`.
   * @param args - Arguments transmis à `invoke`.
   * @returns Le nom d'utilisateur, ou chaîne vide.
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
   * Lit `utilisateurId` dans les arguments d'un appel `invoke`, sans assertion de type.
   * @param args - Arguments transmis à `invoke`.
   * @returns L'identifiant numérique, ou 0.
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
   * Événements d'un membre (`alice` régulière, autre membre silencieux). Horodatés à heure UTC fixe (12 h, hors de
   * la plage « soirée » `19 h–7 h` de {@link CADENCE}) : sans cette heure fixe, `n` jours avant `Date.now()`
   * hériterait de l'heure réelle d'exécution du test, faisant basculer les cinq poussées d'`alice` en soirée (donc
   * une alerte `soiree` inattendue sur une régulière) selon le moment de la journée où la suite tourne.
   * @param utilisateurId - Identifiant du membre.
   * @returns Ses événements.
   */
  public static evenements(utilisateurId: number): readonly EvenementPoussee[] {
    const jour = 24 * 60 * 60 * 1000;
    const heureUtcFixe = 12;
    const iso = (n: number): string => {
      const date = new Date(Date.now() - n * jour);
      date.setUTCHours(heureUtcFixe, 0, 0, 0);
      return date.toISOString();
    };
    if (utilisateurId === 9001) {
      return [1, 2, 3, 4, 5].map((n) => ({
        horodatage: iso(n),
        projetId: 1,
        refPoussee: 'r',
        nombreCommits: 1,
      }));
    }
    return [
      { horodatage: iso(15), projetId: 1, refPoussee: 'r', nombreCommits: 1 },
      { horodatage: iso(18), projetId: 1, refPoussee: 'r', nombreCommits: 1 },
    ];
  }

  /**
   * Groupe applicatif de test. `membresConnus` retient par défaut deux membres `interne`/`username` actifs
   * (`alice`, `bob`) et une règle `interne`/`email` non analysable, pour exercer le signalement (plan_21).
   * @param instances - Instances déclarées.
   * @param membresConnus - Membres connus du groupe (défaut ci-dessus).
   * @returns Le groupe.
   */
  public static groupe(
    instances: readonly Instance[],
    membresConnus: readonly MembreConnu[] = [
      {
        id: 'm-1',
        critere: 'alice',
        typeCritere: TypeCritereMembre.Username,
        statut: StatutMembre.Interne,
      },
      {
        id: 'm-2',
        critere: 'bob',
        typeCritere: TypeCritereMembre.Username,
        statut: StatutMembre.Interne,
      },
      {
        id: 'm-3',
        critere: 'x@interne.test',
        typeCritere: TypeCritereMembre.Email,
        statut: StatutMembre.Interne,
      },
    ],
  ): Groupe {
    return {
      id: 'g-1',
      nom: 'Groupe démo',
      description: '',
      instances,
      membresConnus,
      annotations: [],
      indicateursDesactives: [],
      projets: [],
    };
  }
}

describe('SqmCommitsMembresComponent', () => {
  const racineSignal: WritableSignal<RacineMinimale | null> = signal<RacineMinimale | null>(null);
  const groupesSignal: WritableSignal<readonly Groupe[]> = signal<readonly Groupe[]>([]);

  beforeEach(async () => {
    invokeSimule.mockReset();
    invokeSimule.mockImplementation((commande, args) => {
      if (commande === 'interroger_membre_gitlab_par_username') {
        return Promise.resolve(COMPTES_PAR_USERNAME.get(Fixtures.lireUsername(args)) ?? null);
      }
      if (commande === 'lister_evenements_poussees_membre') {
        return Promise.resolve(Fixtures.evenements(Fixtures.lireUtilisateurId(args)));
      }
      return Promise.reject(Object.assign(new Error('inattendu'), { type: 'reponseInattendue' }));
    });
    racineSignal.set({ parametres: { audit: { concurrence: 2 }, cadenceCommits: CADENCE } });
    groupesSignal.set([Fixtures.groupe([INSTANCE_GITLAB])]);

    await TestBed.configureTestingModule({
      imports: [SqmCommitsMembresComponent],
      providers: [
        provideRouter([]),
        {
          provide: DonneesApplicationService,
          useValue: { racine: racineSignal, groupes: groupesSignal },
        },
        { provide: NotificationService, useValue: { erreur: jest.fn(), succes: jest.fn() } },
      ],
    }).compileComponents();
  });

  it('affiche le bandeau permanent de dimension RH et l’état initial', () => {
    const fixture = TestBed.createComponent(SqmCommitsMembresComponent);
    fixture.detectChanges();
    const texte = DomTestUtils.obtenirElementNatif(fixture).textContent ?? '';

    expect(texte).toContain('indicateurs nominatifs de rythme de travail');
    expect(texte).toContain('Sélectionnez un groupe');
    // Aucun bouton ne masque le bandeau.
    expect(
      DomTestUtils.obtenirElementNatif(fixture).querySelector(
        '.commits-membres__bandeau-rh button',
      ),
    ).toBeNull();
  });

  it('désactive le bouton « Analyser » tant qu’aucun groupe n’est sélectionné', () => {
    const fixture = TestBed.createComponent(SqmCommitsMembresComponent);
    fixture.detectChanges();
    const bouton =
      DomTestUtils.obtenirElementNatif(fixture).querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );
    expect(bouton?.disabled).toBe(true);

    fixture.componentInstance.groupeSelectionneId.set('g-1');
    fixture.detectChanges();
    expect(bouton?.disabled).toBe(false);
  });

  it('trie et filtre sans nouvel appel réseau', async () => {
    const fixture = TestBed.createComponent(SqmCommitsMembresComponent);
    const composant = fixture.componentInstance;
    composant.groupeSelectionneId.set('g-1');
    await composant.lancerAnalyse();
    fixture.detectChanges();

    expect(composant.lignesAffichees()).toHaveLength(2);
    const appelsAvant = invokeSimule.mock.calls.length;

    composant.trierPar('developpeur');
    composant.filtreTexte.set('alice');
    expect(composant.lignesAffichees().map((ligne) => ligne.username)).toEqual(['alice']);

    composant.reinitialiserFiltres();
    composant.seulementAlertes.set(true);
    // « bob » est silencieux -> en alerte ; « alice » régulière -> aucune alerte.
    expect(composant.lignesAffichees().map((ligne) => ligne.username)).toEqual(['bob']);

    expect(invokeSimule.mock.calls.length).toBe(appelsAvant);
  });

  it('réordonne le tableau sur changement de seuil sans nouvel appel réseau', async () => {
    const fixture = TestBed.createComponent(SqmCommitsMembresComponent);
    const composant = fixture.componentInstance;
    composant.groupeSelectionneId.set('g-1');
    await composant.lancerAnalyse();
    const appelsAvant = invokeSimule.mock.calls.length;

    racineSignal.set({
      parametres: {
        audit: { concurrence: 2 },
        cadenceCommits: { ...CADENCE, comptesExclus: ['bob'] },
      },
    });

    expect(composant.lignesAffichees().map((ligne) => ligne.username)).toEqual(['alice']);
    expect(invokeSimule.mock.calls.length).toBe(appelsAvant);
  });

  it('affiche le message « plusieurs instances GitLab » quand le groupe en déclare plusieurs', async () => {
    groupesSignal.set([
      Fixtures.groupe([INSTANCE_GITLAB, { ...INSTANCE_GITLAB, id: 'i-2', nom: 'GitLab bis' }]),
    ]);
    const fixture = TestBed.createComponent(SqmCommitsMembresComponent);
    const composant = fixture.componentInstance;
    composant.groupeSelectionneId.set('g-1');
    await composant.lancerAnalyse();

    expect(composant.messagePlusieursInstances()).toContain('seule la première (GitLab interne)');
  });

  it('signale le nombre de règles interne non analysables (plan_21), jamais une exclusion silencieuse', async () => {
    const fixture = TestBed.createComponent(SqmCommitsMembresComponent);
    const composant = fixture.componentInstance;
    composant.groupeSelectionneId.set('g-1');
    await composant.lancerAnalyse();
    fixture.detectChanges();

    // Une règle `interne`/`email` (`m-3`) n'est pas analysable.
    expect(composant.messageReglesNonAnalysables()).toContain('1 règle');
    const texte = DomTestUtils.obtenirElementNatif(fixture).textContent ?? '';
    expect(texte).toContain('1 règle');
  });

  it('ne signale rien quand toutes les règles interne sont analysables', async () => {
    groupesSignal.set([
      Fixtures.groupe(
        [INSTANCE_GITLAB],
        [
          {
            id: 'm-1',
            critere: 'alice',
            typeCritere: TypeCritereMembre.Username,
            statut: StatutMembre.Interne,
          },
        ],
      ),
    ]);
    const fixture = TestBed.createComponent(SqmCommitsMembresComponent);
    const composant = fixture.componentInstance;
    composant.groupeSelectionneId.set('g-1');
    await composant.lancerAnalyse();

    expect(composant.messageReglesNonAnalysables()).toBe('');
  });
});
