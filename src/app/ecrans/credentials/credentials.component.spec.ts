// Test de l'écran de Gestion des credentials (cf. credentials.component.ts, US-003, US-004, US-031), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import type { DonneesRacine } from '../../services/avecetat/etat/types-donnees';
import { TypeInstance } from '../../services/sansetat/commandes/types-facade';
import { SqmCredentialsComponent } from './credentials.component';

// `FacadeCommandesService` (testerConnectivite, definirCredentials) invoque `InvocationCommandeUtils.invoquer`
// plutôt que `invoke` directement depuis le 2026-07-28 : `isTauri` doit donc être simulé à `true` pour exercer le
// vrai bouchon `invoke` ci-dessous plutôt que le bouchon TS `BouchonCommandesUtils` (hors contexte Tauri), sur le
// même modèle que `demarrage.component.spec.ts`.
jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);
const isTauriSimule = jest.mocked(isTauri);

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine portant deux groupes, chacun avec une instance déclarée.
   * @returns Une racine de test.
   */
  public static racineAvecInstances(): DonneesRacine {
    return {
      versionSchema: 3,
      meta: {
        creeLe: '2026-07-28T08:00:00Z',
        modifieLe: '2026-07-28T08:00:00Z',
        application: 'Test',
      },
      groupes: [
        {
          id: 'g1',
          nom: 'Socle Comptable',
          description: '',
          instances: [
            {
              id: 'i1',
              type: TypeInstance.Gitlab,
              nom: 'gitlab-prod',
              urlBase: 'https://gitlab.exemple.fr',
            },
          ],
          membresConnus: [],
          annotations: [],
          indicateursDesactives: [],
          projets: [],
        },
        {
          id: 'g2',
          nom: 'Nova',
          description: '',
          instances: [
            {
              id: 'i2',
              type: TypeInstance.Sonar,
              nom: 'sonar-nova',
              urlBase: 'https://sonar.exemple.fr',
            },
          ],
          membresConnus: [],
          annotations: [],
          indicateursDesactives: [],
          projets: [],
        },
      ],
      referentiels: {
        reglesDependances: [],
        reglesMarqueursIA: [],
        motifNommageBranches: '^(main|develop)$',
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
        audit: { concurrence: 2 },
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
}

describe('SqmCredentialsComponent', () => {
  let donneesApplication: DonneesApplicationService;

  beforeEach(async () => {
    invokeSimule.mockReset();
    isTauriSimule.mockReset().mockReturnValue(true);
    await TestBed.configureTestingModule({
      imports: [SqmCredentialsComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racineAvecInstances());
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
  });

  it('liste toutes les instances de tous les groupes, complétées du nom du groupe', () => {
    const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;

    const instances = composant.instances();

    expect(instances).toHaveLength(2);
    expect(instances[0]).toEqual({
      instance: {
        id: 'i1',
        type: TypeInstance.Gitlab,
        nom: 'gitlab-prod',
        urlBase: 'https://gitlab.exemple.fr',
      },
      nomGroupe: 'Socle Comptable',
    });
    expect(instances[1].nomGroupe).toBe('Nova');
  });

  it('traduit le type des instances en libellé lisible', () => {
    const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;

    expect(composant.libelleType(TypeInstance.Gitlab)).toBe('GitLab');
    expect(composant.libelleType(TypeInstance.Sonar)).toBe('Sonar');
  });

  it('vide la saisie non enregistrée dès que la session quitte l’état ouvert (verrouillage RNF-014)', () => {
    const fixture = TestBed.createComponent(SqmCredentialsComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    composant.definirSaisie('i1', 'saisie-non-enregistree');
    expect(composant.valeurSaisie('i1')).toBe('saisie-non-enregistree');

    TestBed.inject(EtatSessionService).verrouiller();
    fixture.detectChanges();

    expect(composant.valeurSaisie('i1')).toBe('');
  });

  it('reflète la saisie en cours, avec repli sur le credential déjà en mémoire de session', () => {
    const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;
    TestBed.inject(EtatSessionService).definirCredentials({ i1: 'deja-enregistre' });

    expect(composant.valeurSaisie('i1')).toBe('deja-enregistre');

    composant.definirSaisie('i1', 'nouvelle-saisie');

    expect(composant.valeurSaisie('i1')).toBe('nouvelle-saisie');
    expect(composant.valeurSaisie('i2')).toBe('');
  });

  it('enregistre les credentials saisis, fusionnés avec ceux déjà en mémoire', async () => {
    const etatSession = TestBed.inject(EtatSessionService);
    etatSession.definirCredentials({ i2: 'deja-enregistre' });
    invokeSimule.mockResolvedValue(undefined);
    const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;
    composant.definirSaisie('i1', 'nouveau-jeton');

    await composant.enregistrer();

    expect(invokeSimule).toHaveBeenCalledWith('definir_credentials', {
      credentials: { i1: 'nouveau-jeton', i2: 'deja-enregistre' },
    });
    expect(etatSession.credentials()).toEqual({ i1: 'nouveau-jeton', i2: 'deja-enregistre' });
    expect(composant.valeurSaisie('i1')).toBe('nouveau-jeton');
    const notifications = TestBed.inject(NotificationService).liste();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('succes');
    expect(notifications[0].message).toContain('enregistrés');
  });

  it("n'invoque pas la commande native si aucun credential n'est saisi", async () => {
    const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;

    await composant.enregistrer();

    expect(invokeSimule).not.toHaveBeenCalled();
  });

  it("affiche un message explicite quand l'enregistrement échoue", async () => {
    invokeSimule.mockRejectedValue({ type: 'credentialInvalide' });
    const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;
    composant.definirSaisie('i1', 'nouveau-jeton');

    await composant.enregistrer();

    const notifications = TestBed.inject(NotificationService).liste();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('erreur');
    expect(notifications[0].message).toContain("n'a été enregistré");
  });

  it('teste la connectivité et affiche un verdict de succès avec la latence mesurée', async () => {
    invokeSimule.mockResolvedValue({ porteeExcessive: false });
    const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;
    composant.definirSaisie('i1', 'jeton-valide');

    await composant.tester(composant.instances()[0]);

    expect(invokeSimule).toHaveBeenCalledWith('tester_connectivite', {
      instance: {
        id: 'i1',
        type: TypeInstance.Gitlab,
        nom: 'gitlab-prod',
        urlBase: 'https://gitlab.exemple.fr',
      },
      credential: 'jeton-valide',
    });
    const verdict = composant.verdict('i1');
    expect(verdict?.statut).toBe('succes');
    expect(verdict?.porteeExcessive).toBe(false);
    expect(typeof verdict?.latenceMs).toBe('number');
  });

  it('ne teste pas une instance sans credential saisi', async () => {
    const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;

    await composant.tester(composant.instances()[0]);

    expect(invokeSimule).not.toHaveBeenCalled();
    expect(composant.verdict('i1')).toBeUndefined();
  });

  it('affiche un verdict d’échec avec libellé et action suggérée en cas d’anomalie typée', async () => {
    invokeSimule.mockRejectedValue({
      type: 'authentificationRefusee',
      message: 'HTTP 401',
    });
    const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;
    composant.definirSaisie('i1', 'jeton-invalide');

    await composant.tester(composant.instances()[0]);

    const verdict = composant.verdict('i1');
    expect(verdict?.statut).toBe('echec');
    expect(verdict?.libelleAnomalie).toBe('Authentification refusée');
    expect(verdict?.actionSuggeree).toContain('credential');
  });

  it('teste toutes les instances pour lesquelles un credential est saisi, sans tester les autres (US-031)', async () => {
    invokeSimule.mockResolvedValue({ porteeExcessive: false });
    const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;
    composant.definirSaisie('i1', 'jeton-1');

    await composant.toutTester();

    expect(invokeSimule).toHaveBeenCalledTimes(1);
    expect(invokeSimule).toHaveBeenCalledWith(
      'tester_connectivite',
      expect.objectContaining({ credential: 'jeton-1' }),
    );
    expect(composant.verdict('i1')?.statut).toBe('succes');
    expect(composant.verdict('i2')).toBeUndefined();
    expect(composant.testGlobalEnCours()).toBe(false);
  });

  it("ne fait rien si aucune instance n'a de credential saisi (US-031)", async () => {
    const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;

    await composant.toutTester();

    expect(invokeSimule).not.toHaveBeenCalled();
  });

  describe('collage JSON de credentials (US-003, R11-10)', () => {
    it('pré-remplit les credentials des instances reconnues sans les enregistrer', () => {
      const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;

      composant.onCollage('{"i1": "glpat-xxxx", "i2": "sqp_yyyy"}');

      expect(composant.valeurSaisie('i1')).toBe('glpat-xxxx');
      expect(composant.valeurSaisie('i2')).toBe('sqp_yyyy');
      expect(composant.messageErreurCollage).toBeNull();
      expect(composant.identifiantsNonReconnus).toEqual([]);
      expect(composant.contenuColle).toBe('');
      expect(invokeSimule).not.toHaveBeenCalled();
    });

    it('signale explicitement les identifiants non reconnus, sans bloquer les autres', () => {
      const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;

      composant.onCollage('{"i1": "glpat-xxxx", "instance-inconnue": "zzzz"}');

      expect(composant.valeurSaisie('i1')).toBe('glpat-xxxx');
      expect(composant.identifiantsNonReconnus).toEqual(['instance-inconnue']);
    });

    it('affiche un message explicite si le contenu collé est un JSON invalide, sans vider le champ', () => {
      const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;

      composant.onCollage('{ ceci n’est pas du JSON');

      expect(composant.messageErreurCollage).not.toBeNull();
      expect(composant.identifiantsNonReconnus).toEqual([]);
      expect(composant.contenuColle).toBe('{ ceci n’est pas du JSON');
    });

    it('efface les messages précédents quand le contenu collé est vidé', () => {
      const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;
      composant.onCollage('{ invalide');
      expect(composant.messageErreurCollage).not.toBeNull();

      composant.onCollage('');

      expect(composant.messageErreurCollage).toBeNull();
      expect(composant.contenuColle).toBe('');
    });
  });

  describe('copie des credentials en JSON (opération inverse du collage)', () => {
    let ecrireDansPressePapiers: jest.Mock<Promise<void>, [string]>;

    beforeEach(() => {
      ecrireDansPressePapiers = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: ecrireDansPressePapiers },
        configurable: true,
      });
    });

    it('désactive la copie tant qu’aucun credential n’est enregistré en mémoire', () => {
      const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;

      expect(composant.aucunCredentialEnMemoire()).toBe(true);
    });

    it('copie les credentials enregistrés au format JSON compact sur une seule ligne (compatibilité KeePass) et démarre le compte à rebours de 10 secondes', async () => {
      TestBed.inject(EtatSessionService).definirCredentials({ i1: 'glpat-xxxx' });
      const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;
      expect(composant.aucunCredentialEnMemoire()).toBe(false);

      await composant.copierCredentialsJson();

      expect(ecrireDansPressePapiers).toHaveBeenCalledWith(JSON.stringify({ i1: 'glpat-xxxx' }));
      const jsonCopie = ecrireDansPressePapiers.mock.calls[0][0];
      expect(jsonCopie).not.toContain('\n');
      expect(composant.secondesRestantesCopie()).toBe(10);
      expect(TestBed.inject(NotificationService).liste()).toEqual([]);
    });

    it('décrémente le compte à rebours chaque seconde puis efface le presse-papiers après 10 secondes', async () => {
      jest.useFakeTimers();
      try {
        TestBed.inject(EtatSessionService).definirCredentials({ i1: 'glpat-xxxx' });
        const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;

        await composant.copierCredentialsJson();
        expect(composant.secondesRestantesCopie()).toBe(10);

        jest.advanceTimersByTime(1_000);
        expect(composant.secondesRestantesCopie()).toBe(9);

        jest.advanceTimersByTime(8_000);
        expect(composant.secondesRestantesCopie()).toBe(1);

        jest.advanceTimersByTime(1_000);
        await Promise.resolve();

        expect(composant.secondesRestantesCopie()).toBeNull();
        expect(ecrireDansPressePapiers).toHaveBeenLastCalledWith('');
      } finally {
        jest.useRealTimers();
      }
    });

    it('réarme le compte à rebours à 10 secondes si une nouvelle copie est déclenchée en cours de route', async () => {
      jest.useFakeTimers();
      try {
        TestBed.inject(EtatSessionService).definirCredentials({ i1: 'glpat-xxxx' });
        const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;

        await composant.copierCredentialsJson();
        jest.advanceTimersByTime(4_000);
        expect(composant.secondesRestantesCopie()).toBe(6);

        await composant.copierCredentialsJson();
        expect(composant.secondesRestantesCopie()).toBe(10);

        jest.advanceTimersByTime(6_000);
        expect(composant.secondesRestantesCopie()).toBe(4);
      } finally {
        jest.useRealTimers();
      }
    });

    it('efface immédiatement le presse-papiers si l’écran est quitté avant la fin du compte à rebours', async () => {
      jest.useFakeTimers();
      try {
        TestBed.inject(EtatSessionService).definirCredentials({ i1: 'glpat-xxxx' });
        const fixture = TestBed.createComponent(SqmCredentialsComponent);
        await fixture.componentInstance.copierCredentialsJson();
        jest.advanceTimersByTime(3_000);
        ecrireDansPressePapiers.mockClear();

        fixture.destroy();
        await Promise.resolve();

        expect(ecrireDansPressePapiers).toHaveBeenCalledWith('');
      } finally {
        jest.useRealTimers();
      }
    });

    it('n’exporte jamais une saisie en cours non encore enregistrée', async () => {
      TestBed.inject(EtatSessionService).definirCredentials({ i1: 'glpat-xxxx' });
      const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;
      composant.definirSaisie('i2', 'sqp_en-cours-de-saisie');

      await composant.copierCredentialsJson();

      expect(ecrireDansPressePapiers).toHaveBeenCalledWith(JSON.stringify({ i1: 'glpat-xxxx' }));
    });

    it('affiche un message explicite si la copie dans le presse-papiers échoue', async () => {
      ecrireDansPressePapiers.mockRejectedValue(new Error('Permission refusée'));
      TestBed.inject(EtatSessionService).definirCredentials({ i1: 'glpat-xxxx' });
      const composant = TestBed.createComponent(SqmCredentialsComponent).componentInstance;

      await composant.copierCredentialsJson();

      const notifications = TestBed.inject(NotificationService).liste();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('erreur');
    });
  });
});
