// Test du bouchon TS des commandes de cycle de vie du fichier (cf. bouchon-fichier.utils.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { BouchonFichierUtils } from './bouchon-fichier.utils';
import { RACINE_BOUCHON_CHARGEMENT } from './donnees-racine-bouchon';

describe('BouchonFichierUtils', () => {
  it('doit renvoyer une racine vide et fraîchement horodatée pour creer_fichier', async () => {
    const avant = new Date().toISOString();

    const racine = await BouchonFichierUtils.invoquer<{
      readonly versionSchema: number;
      readonly groupes: readonly unknown[];
      readonly meta: { readonly creeLe: string; readonly modifieLe: string };
    }>('creer_fichier');

    expect(racine.versionSchema).toBe(3);
    expect(racine.groupes).toEqual([]);
    expect(racine.meta.creeLe).toBe(racine.meta.modifieLe);
    expect(racine.meta.creeLe >= avant).toBe(true);
  });

  it('doit renvoyer la racine bouchonnée complète pour charger_fichier', async () => {
    const racine = await BouchonFichierUtils.invoquer('charger_fichier');

    expect(racine).toBe(RACINE_BOUCHON_CHARGEMENT);
  });

  it.each(['sauvegarder_fichier', 'verrouiller_session', 'deverrouiller_session'])(
    'doit résoudre %s sans valeur',
    async (commande) => {
      const resultat = await BouchonFichierUtils.invoquer(commande);

      expect(resultat).toBeUndefined();
    },
  );

  it('doit rejeter une commande non bouchonnée', async () => {
    await expect(BouchonFichierUtils.invoquer('commande_inexistante')).rejects.toThrow(
      'commande_inexistante',
    );
  });

  it('doit exposer les six commandes de FacadeFichierService dans COMMANDES', () => {
    expect([...BouchonFichierUtils.COMMANDES]).toEqual([
      'creer_fichier',
      'charger_fichier',
      'sauvegarder_fichier',
      'changer_mot_de_passe_fichier',
      'verrouiller_session',
      'deverrouiller_session',
    ]);
  });

  describe('changer_mot_de_passe_fichier', () => {
    it("doit ajouter une entrée de journal à la racine transmise, sans exposer l'un ou l'autre mot de passe", async () => {
      const donnees = { groupes: [], journal: [{ id: 'entree-existante' }] };

      const resultat = await BouchonFichierUtils.invoquer<{
        readonly groupes: readonly unknown[];
        readonly journal: readonly Record<string, unknown>[];
      }>('changer_mot_de_passe_fichier', {
        chemin: '/tmp/donnees-test.sqm',
        donnees,
        ancienMotDePasse: 'ancien-mot-de-passe',
        nouveauMotDePasse: 'nouveau-mot-de-passe',
      });

      expect(resultat.groupes).toEqual([]);
      expect(resultat.journal).toHaveLength(2);
      const nouvelleEntree = resultat.journal[1];
      expect(nouvelleEntree?.['objet']).toBe('securite.motDePasseFichier');
      expect(JSON.stringify(resultat)).not.toContain('mot-de-passe');
    });

    it('doit fonctionner même sans racine transmise', async () => {
      const resultat = await BouchonFichierUtils.invoquer<{
        readonly journal: readonly unknown[];
      }>('changer_mot_de_passe_fichier', {});

      expect(resultat.journal).toHaveLength(1);
    });
  });
});
