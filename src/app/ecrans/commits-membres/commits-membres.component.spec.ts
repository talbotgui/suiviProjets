// Test de SqmCommitsMembresComponent (cf. commits-membres.component.ts, US-060, RG-060, plan_17 chapitre 4),
// généré avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
// Composant de présentation : suivi du nombre de méthodes jamais appelées (16_normesTests.md), plus les
// assertions ci-dessous sur l'absence d'appel réseau au tri / filtrage / changement de seuil.
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';
import type { InvokeArgs } from '@tauri-apps/api/core';
import { TypeInstance } from '../../services/sansetat/commandes/types-facade';
import type { EvenementPoussee, Instance } from '../../services/sansetat/commandes/types-facade';
import { StatutMembre, TypeCritereMembre } from '../../services/avecetat/etat/types-donnees';
import type { CadenceCommits, Groupe } from '../../services/avecetat/etat/types-donnees';
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

const ROSTER = {
  membres: [
    { id: 9001, username: 'alice', nom: 'Alice', courriel: null },
    { id: 9002, username: 'bob', nom: 'Bob', courriel: null },
  ],
  projets: [{ id: 1, chemin: 'demo/api' }],
};

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
   * Événements d'un membre (`alice` régulière, autre membre silencieux).
   * @param utilisateurId - Identifiant du membre.
   * @returns Ses événements.
   */
  public static evenements(utilisateurId: number): readonly EvenementPoussee[] {
    const jour = 24 * 60 * 60 * 1000;
    const iso = (n: number): string => new Date(Date.now() - n * jour).toISOString();
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
   * Groupe applicatif de test.
   * @param instances - Instances déclarées.
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
          critere: 'alice',
          typeCritere: TypeCritereMembre.Username,
          statut: StatutMembre.Interne,
        },
      ],
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
      if (commande === 'preparer_analyse_commits_membres') {
        return Promise.resolve(ROSTER);
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

  it('désactive le bouton « Analyser » tant que groupe ou référence GitLab manquent', () => {
    const fixture = TestBed.createComponent(SqmCommitsMembresComponent);
    fixture.detectChanges();
    const bouton =
      DomTestUtils.obtenirElementNatif(fixture).querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );
    expect(bouton?.disabled).toBe(true);

    fixture.componentInstance.groupeSelectionneId.set('g-1');
    fixture.componentInstance.referenceGroupeGitlab.set('demo/groupe');
    fixture.detectChanges();
    expect(bouton?.disabled).toBe(false);
  });

  it('trie et filtre sans nouvel appel réseau ; filtre de statut par défaut « tous »', async () => {
    const fixture = TestBed.createComponent(SqmCommitsMembresComponent);
    const composant = fixture.componentInstance;
    composant.groupeSelectionneId.set('g-1');
    composant.referenceGroupeGitlab.set('demo/groupe');
    await composant.lancerAnalyse();
    fixture.detectChanges();

    expect(composant.filtreStatut()).toBe('tous');
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
    composant.referenceGroupeGitlab.set('demo/groupe');
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
    composant.referenceGroupeGitlab.set('demo/groupe');
    await composant.lancerAnalyse();

    expect(composant.messagePlusieursInstances()).toContain('seule la première (GitLab interne)');
  });
});
