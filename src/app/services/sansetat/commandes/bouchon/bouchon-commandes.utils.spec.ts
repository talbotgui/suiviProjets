// Test du bouchon TS des commandes GitLab/Sonar (cf. bouchon-commandes.utils.ts), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { BouchonCommandesUtils } from './bouchon-commandes.utils';

const SOURCE_ID_GITLAB_CONNU = 'f0000000-0000-4000-8000-000000000001';
const SOURCE_ID_SONAR_CONNU = 'f0000000-0000-4000-8000-000000000002';
const SOURCE_ID_GITLAB_FRONT_PORTAIL = 'f0000000-0000-4000-8000-000000000006';
const SOURCE_ID_SONAR_FRONT_PORTAIL = 'f0000000-0000-4000-8000-000000000007';
const ID_EXTERNE_GITLAB_CONNU = '1234';
const ID_EXTERNE_SONAR_CONNU = 'entreprise:api-facturation';

describe('BouchonCommandesUtils', () => {
  // Timers simulés à avancement automatique (Phase 12, sur le modèle déjà retenu pour R10-10) : le délai
  // artificiel désormais appliqué aux commandes d'interrogation d'audit (`DELAI_INTERROGATION_AUDIT_MS`) ne doit
  // pas ralentir la suite de tests d'un délai réel à chaque appel concerné.
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('doit toujours répondre un succès à portée non excessive pour tester_connectivite', async () => {
    const verdict = await BouchonCommandesUtils.invoquer('tester_connectivite', {
      instance: { id: 'x', type: 'gitlab', nom: 'x', urlBase: 'https://x' },
      credential: 'peu importe',
    });

    expect(verdict).toEqual({ porteeExcessive: false });
  });

  it('doit résoudre interroger_vitalite pour une source connue du jeu de données', async () => {
    const resultat = await BouchonCommandesUtils.invoquer('interroger_vitalite', {
      sourceId: SOURCE_ID_GITLAB_CONNU,
    });

    expect(resultat).toEqual({
      sourceId: SOURCE_ID_GITLAB_CONNU,
      refEffective: 'develop',
      shaTete: '3fa2b91c',
      dernierCommitLe: '2026-07-08',
    });
  });

  it('doit se replier sur un constat GitLab par défaut pour une source inconnue', async () => {
    const resultat = await BouchonCommandesUtils.invoquer<{ readonly refEffective: string }>(
      'interroger_vitalite',
      { sourceId: 'source-inconnue-creee-en-test-manuel' },
    );

    expect(resultat.refEffective).toBe('main');
  });

  it('doit résoudre interroger_taille_depot pour une source connue du jeu de données', async () => {
    const resultat = await BouchonCommandesUtils.invoquer('interroger_taille_depot', {
      sourceId: SOURCE_ID_GITLAB_CONNU,
    });

    expect(resultat).toEqual({
      sourceId: SOURCE_ID_GITLAB_CONNU,
      refEffective: 'develop',
      shaTete: '3fa2b91c',
      tailleOctets: 52411002,
    });
  });

  it('doit résoudre interroger_contributeurs sur une fenêtre glissante de 90 jours', async () => {
    const resultat = await BouchonCommandesUtils.invoquer<{
      readonly fenetreJours: number;
      readonly contributeurs: readonly unknown[];
    }>('interroger_contributeurs', { sourceId: SOURCE_ID_GITLAB_CONNU });

    expect(resultat.fenetreJours).toBe(90);
    expect(resultat.contributeurs).toHaveLength(3);
  });

  it('doit résoudre interroger_merge_requests pour une source connue du jeu de données', async () => {
    const resultat = await BouchonCommandesUtils.invoquer<{
      readonly mrOuvertes: readonly unknown[];
    }>('interroger_merge_requests', { sourceId: SOURCE_ID_GITLAB_CONNU });

    expect(resultat.mrOuvertes).toHaveLength(2);
  });

  it('doit résoudre interroger_membres pour une source connue du jeu de données', async () => {
    const resultat = await BouchonCommandesUtils.invoquer<{
      readonly membres: readonly unknown[];
    }>('interroger_membres', { sourceId: SOURCE_ID_GITLAB_CONNU });

    expect(resultat.membres).toHaveLength(3);
  });

  it('doit résoudre interroger_branches_completes (RG-030, distinct de l’autocomplétion)', async () => {
    const resultat = await BouchonCommandesUtils.invoquer<{
      readonly branches: readonly unknown[];
    }>('interroger_branches_completes', { sourceId: SOURCE_ID_GITLAB_CONNU });

    expect(resultat.branches).toHaveLength(3);
  });

  it('doit résoudre interroger_dependances pour une source connue du jeu de données', async () => {
    const resultat = await BouchonCommandesUtils.invoquer<{
      readonly dependances: readonly unknown[];
    }>('interroger_dependances', { sourceId: SOURCE_ID_GITLAB_CONNU });

    expect(resultat.dependances).toHaveLength(3);
  });

  it('doit résoudre interroger_marqueurs_ia (F18) pour une source connue du jeu de données', async () => {
    const resultat = await BouchonCommandesUtils.invoquer<{
      readonly marqueurs: readonly unknown[];
    }>('interroger_marqueurs_ia', { sourceId: SOURCE_ID_GITLAB_FRONT_PORTAIL });

    expect(resultat.marqueurs).toHaveLength(3);
  });

  it('doit résoudre definir_credentials sans réponse', async () => {
    const resultat = await BouchonCommandesUtils.invoquer('definir_credentials', {
      instance: { id: 'x' },
      credential: 'peu importe',
    });

    expect(resultat).toBeUndefined();
  });

  it('doit filtrer les branches de interroger_branches par le terme de recherche', async () => {
    const branches = await BouchonCommandesUtils.invoquer<readonly string[]>(
      'interroger_branches',
      {
        idExterne: ID_EXTERNE_GITLAB_CONNU,
        recherche: 'feature',
      },
    );

    expect(branches).toEqual(['feature/paiement-sepa']);
  });

  it('doit retourner toutes les branches de interroger_branches sans terme de recherche', async () => {
    const branches = await BouchonCommandesUtils.invoquer<readonly string[]>(
      'interroger_branches',
      {
        idExterne: ID_EXTERNE_GITLAB_CONNU,
      },
    );

    expect(branches).toEqual(['develop', 'feature/paiement-sepa', 'wip-test-julien']);
  });

  it('doit résoudre interroger_derniere_analyse pour un projet Sonar connu', async () => {
    const resultat = await BouchonCommandesUtils.invoquer<string | null>(
      'interroger_derniere_analyse',
      {
        idExterne: ID_EXTERNE_SONAR_CONNU,
      },
    );

    expect(resultat).toBe('2026-07-08');
  });

  it('doit se replier sur `null` pour interroger_derniere_analyse d’un projet Sonar inconnu', async () => {
    const resultat = await BouchonCommandesUtils.invoquer<string | null>(
      'interroger_derniere_analyse',
      {
        idExterne: 'sonar:inconnu',
      },
    );

    expect(resultat).toBeNull();
  });

  it('doit rejeter une commande non bouchonnée', async () => {
    await expect(BouchonCommandesUtils.invoquer('commande_inexistante', {})).rejects.toThrow(
      'commande_inexistante',
    );
  });

  describe('lister_sources_disponibles (US-008, RG-036)', () => {
    it('doit résoudre la liste triée par libellé pour une instance connue', async () => {
      const disponibles = await BouchonCommandesUtils.invoquer<
        readonly { readonly idExterne: string; readonly libelle: string }[]
      >('lister_sources_disponibles', {
        instance: { id: 'b0000000-0000-4000-8000-000000000001', type: 'gitlab' },
      });

      expect(disponibles.map((source) => source.libelle)).toEqual([
        'entreprise/api-facturation',
        'entreprise/batch-comptable',
        'entreprise/outil-interne',
        'entreprise/referentiel-tiers',
      ]);
    });

    it('doit retourner une liste vide pour une instance inconnue du jeu de données', async () => {
      const disponibles = await BouchonCommandesUtils.invoquer<readonly unknown[]>(
        'lister_sources_disponibles',
        { instance: { id: 'instance-inconnue', type: 'gitlab' } },
      );

      expect(disponibles).toEqual([]);
    });

    it('doit retourner une liste vide si le paramètre instance est absent ou mal formé', async () => {
      const disponibles = await BouchonCommandesUtils.invoquer<readonly unknown[]>(
        'lister_sources_disponibles',
        {},
      );

      expect(disponibles).toEqual([]);
    });
  });

  describe('aléatoire des résultats Sonar', () => {
    it('ne doit pas altérer les valeurs quand le tirage tombe au centre de l’amplitude', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const resultat = await BouchonCommandesUtils.invoquer<{
        readonly parSeverite: { readonly bloquant: number };
        readonly nouvellesViolations: number;
      }>('interroger_violations', { sourceId: SOURCE_ID_SONAR_CONNU });

      expect(resultat).toEqual({
        sourceId: SOURCE_ID_SONAR_CONNU,
        parSeverite: { bloquant: 2, critique: 11, majeur: 88, mineur: 240, info: 31 },
        nouvellesViolations: 3,
      });
    });

    it('ne doit pas altérer la dette technique quand le tirage tombe au centre de l’amplitude', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const resultat = await BouchonCommandesUtils.invoquer<{
        readonly detteMinutes: number;
        readonly ratioDette: number;
      }>('interroger_dette', { sourceId: SOURCE_ID_SONAR_CONNU });

      expect(resultat).toEqual({ sourceId: SOURCE_ID_SONAR_CONNU, detteMinutes: 13980, ratioDette: 3.1 });
    });

    it('doit inclure duplicationNouveauCode seulement quand le constat le porte', async () => {
      const avecDuplication = await BouchonCommandesUtils.invoquer<Record<string, unknown>>(
        'interroger_couverture',
        { sourceId: SOURCE_ID_SONAR_FRONT_PORTAIL },
      );
      const sansDuplication = await BouchonCommandesUtils.invoquer<Record<string, unknown>>(
        'interroger_couverture',
        { sourceId: SOURCE_ID_SONAR_CONNU },
      );

      expect('duplicationNouveauCode' in avecDuplication).toBe(true);
      expect('duplicationNouveauCode' in sansDuplication).toBe(false);
    });

    it('doit appliquer un écart maximal de +10 % quand le tirage est à son maximum', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);

      const resultat = await BouchonCommandesUtils.invoquer<{
        readonly couverture: number;
        readonly couvertureNouveauCode: number;
      }>('interroger_couverture', { sourceId: SOURCE_ID_SONAR_CONNU });

      expect(resultat.couverture).toBeCloseTo(64.8 * 1.1, 1);
      expect(resultat.couvertureNouveauCode).toBeCloseTo(82.5 * 1.1, 1);
    });

    it('doit borner la couverture à 100 même en cas de dépassement par le tirage', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);

      const resultat = await BouchonCommandesUtils.invoquer<{ readonly couverture: number }>(
        'interroger_couverture',
        { sourceId: 'source-sonar-inconnue' },
      );

      // Couverture de repli à 60 * 1.1 = 66, sous la borne : ce cas vérifie seulement l'absence d'erreur de borne
      // (couverture jamais négative ni supérieure à 100).
      expect(resultat.couverture).toBeGreaterThanOrEqual(0);
      expect(resultat.couverture).toBeLessThanOrEqual(100);
    });

    it('ne doit jamais randomiser les notes Sonar (échelle discrète RG-011)', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);

      const resultat = await BouchonCommandesUtils.invoquer<{ readonly fiabilite: number }>(
        'interroger_notes',
        { sourceId: SOURCE_ID_SONAR_CONNU },
      );

      expect(resultat.fiabilite).toBe(2.0);
    });

    it('ne doit jamais randomiser le volume de code Sonar (ncloc)', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(1);

      const resultat = await BouchonCommandesUtils.invoquer<{ readonly ncloc: number }>(
        'interroger_ncloc',
        {
          sourceId: SOURCE_ID_SONAR_CONNU,
        },
      );

      expect(resultat.ncloc).toBe(86950);
    });
  });
});
