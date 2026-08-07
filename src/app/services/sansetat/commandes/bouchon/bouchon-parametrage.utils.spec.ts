// Test du bouchon TS de FacadeParametrageService (cf. bouchon-parametrage.utils.ts), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { BouchonParametrageUtils } from './bouchon-parametrage.utils';

const DONNEES_DE_BASE = {
  versionSchema: 2,
  parametres: {
    seuils: { vitalite: { mortJours: 365 } },
    verrouillage: { delaiInactiviteMinutes: 15, echecsAvantFermeture: 5 },
    audit: { concurrence: 4 },
    proxy: { url: '', cheminBundleCA: '' },
    sauvegarde: { nombreSauvegardesSecurite: 5 },
    seuilAvertissementTailleOctets: 10_485_760,
  },
  referentiels: {
    reglesDependances: [{ id: 'd1', motif: 'org.exemple:*', versions: [] }],
    reglesMarqueursIA: [{ id: 'm1', motif: '*.env', outil: 'copilot' }],
    motifNommageBranches: 'main|master',
  },
};

describe('BouchonParametrageUtils', () => {
  it('rejette une commande non bouchonnée', async () => {
    await expect(
      BouchonParametrageUtils.invoquer('commande_inexistante', { donnees: DONNEES_DE_BASE }),
    ).rejects.toThrow('commande_inexistante');
  });

  it('modifie un seuil désigné par un chemin pointé', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly parametres: {
        readonly seuils: { readonly vitalite: { readonly mortJours: number } };
      };
    }>('definir_seuil', { donnees: DONNEES_DE_BASE, cle: 'vitalite.mortJours', valeur: 400 });

    expect(resultat.parametres.seuils.vitalite.mortJours).toBe(400);
  });

  it('ajoute une nouvelle entrée de référentiel de dépendances', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly referentiels: { readonly reglesDependances: readonly { readonly motif: string }[] };
    }>('definir_referentiel', {
      donnees: DONNEES_DE_BASE,
      typeReferentiel: 'reglesDependances',
      entree: { motif: 'log4j:log4j', versions: [{ motifVersion: '*', statut: 'obsolete' }] },
    });

    expect(resultat.referentiels.reglesDependances).toHaveLength(2);
    expect(resultat.referentiels.reglesDependances[1]).toEqual(
      expect.objectContaining({ motif: 'log4j:log4j' }),
    );
  });

  it('met à jour une entrée existante de référentiel plutôt que d’en ajouter une nouvelle', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly referentiels: { readonly reglesDependances: readonly { readonly id: string }[] };
    }>('definir_referentiel', {
      donnees: DONNEES_DE_BASE,
      typeReferentiel: 'reglesDependances',
      entree: {
        id: 'd1',
        motif: 'org.exemple:*',
        versions: [{ motifVersion: '1.*', statut: 'maintenu' }],
      },
    });

    expect(resultat.referentiels.reglesDependances).toHaveLength(1);
  });

  it('remplace le motif de nommage des branches (scalaire)', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly referentiels: { readonly motifNommageBranches: string };
    }>('definir_referentiel', {
      donnees: DONNEES_DE_BASE,
      typeReferentiel: 'motifNommageBranches',
      entree: 'main|master|develop',
    });

    expect(resultat.referentiels.motifNommageBranches).toBe('main|master|develop');
  });

  it('supprime une entrée du référentiel des règles de dépendances par identifiant', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly referentiels: { readonly reglesDependances: readonly unknown[] };
    }>('supprimer_regle_dependance', { donnees: DONNEES_DE_BASE, id: 'd1' });

    expect(resultat.referentiels.reglesDependances).toHaveLength(0);
  });

  it('modifie les réglages de verrouillage de session', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly parametres: { readonly verrouillage: { readonly delaiInactiviteMinutes: number } };
    }>('definir_verrouillage', {
      donnees: DONNEES_DE_BASE,
      delaiInactiviteMinutes: 30,
      echecsAvantFermeture: 3,
    });

    expect(resultat.parametres.verrouillage.delaiInactiviteMinutes).toBe(30);
  });

  it('modifie la concurrence d’audit par défaut', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly parametres: { readonly audit: { readonly concurrence: number } };
    }>('definir_concurrence_audit', { donnees: DONNEES_DE_BASE, concurrence: 8 });

    expect(resultat.parametres.audit.concurrence).toBe(8);
  });

  it('modifie le réglage de proxy sortant', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly parametres: { readonly proxy: { readonly url: string } };
    }>('definir_proxy', {
      donnees: DONNEES_DE_BASE,
      url: 'http://proxy.exemple.local:3128',
      cheminBundleCa: undefined,
    });

    expect(resultat.parametres.proxy.url).toBe('http://proxy.exemple.local:3128');
  });

  it('modifie le nombre de sauvegardes de sécurité', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly parametres: { readonly sauvegarde: { readonly nombreSauvegardesSecurite: number } };
    }>('definir_nombre_sauvegardes_securite', { donnees: DONNEES_DE_BASE, nombre: 10 });

    expect(resultat.parametres.sauvegarde.nombreSauvegardesSecurite).toBe(10);
  });

  it('modifie le seuil d’avertissement de taille', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly parametres: { readonly seuilAvertissementTailleOctets: number };
    }>('definir_seuil_avertissement_taille', { donnees: DONNEES_DE_BASE, seuilOctets: 5_000_000 });

    expect(resultat.parametres.seuilAvertissementTailleOctets).toBe(5_000_000);
  });

  // Régression du test de bout en bout (Phase 12) : la forme renvoyée par les commandes de prévisualisation de
  // purge doit correspondre exactement aux champs lus par les composants consommateurs, jamais un nom générique.
  it.each([
    [
      'previsualiser_purge_densite',
      { nbAuditsSupprimes: 0, nbProjetsConcernes: 0, octetsAvant: 0, octetsApres: 0 },
    ],
    [
      'previsualiser_purge_age',
      { nbAuditsSupprimes: 0, nbProjetsConcernes: 0, octetsAvant: 0, octetsApres: 0 },
    ],
    ['previsualiser_purge_journal', { nbEntreesSupprimees: 0 }],
  ])('renvoie la forme attendue par l’écran consommateur pour %s', async (commande, forme) => {
    const resultat = await BouchonParametrageUtils.invoquer(commande, { donnees: DONNEES_DE_BASE });

    expect(resultat).toEqual(forme);
  });

  it.each(['executer_purge_densite', 'executer_purge_age', 'executer_purge_journal'])(
    'renvoie la racine inchangée pour %s',
    async (commande) => {
      const resultat = await BouchonParametrageUtils.invoquer<{ readonly versionSchema: number }>(
        commande,
        { donnees: DONNEES_DE_BASE, motDePasse: 'mot-de-passe' },
      );

      expect(resultat.versionSchema).toBe(2);
    },
  );

  it('horodate `meta.modifieLe` à chaque mutation', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly meta: { readonly modifieLe: string };
    }>('definir_concurrence_audit', {
      donnees: { ...DONNEES_DE_BASE, meta: { modifieLe: '2020-01-01T00:00:00.000Z' } },
      concurrence: 2,
    });

    expect(resultat.meta.modifieLe).not.toBe('2020-01-01T00:00:00.000Z');
  });

  it('rejette un paramètre « donnees » absent ou mal formé', async () => {
    await expect(
      BouchonParametrageUtils.invoquer('definir_seuil', { cle: 'x', valeur: 1 }),
    ).rejects.toThrow('donnees');
  });
});
