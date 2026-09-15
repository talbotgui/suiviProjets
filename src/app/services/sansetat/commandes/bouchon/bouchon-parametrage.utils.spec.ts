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
    cadenceCommits: {
      fenetreJours: 28,
      seuilJoursOuvresSansPoussee: 3,
      multiplicateurEcartCadence: 2,
      ponderationInactivite: 0.5,
      ponderationEcartCadence: 0.3,
      ponderationSoiree: 0.2,
      heureDebutSoiree: 19,
      heureFinSoiree: 7,
      fuseauHoraire: 'Europe/Paris',
      comptesExclus: [],
    },
  },
  referentiels: {
    reglesDependances: [{ id: 'd1', motif: 'org.exemple:*', versions: [] }],
    reglesMarqueursIA: [{ id: 'm1', motif: '*.env', outil: 'copilot' }],
    motifNommageBranches: 'main|master',
    categoriesDependances: [],
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

  it('ajoute plusieurs entrées de référentiel en une seule fois et renvoie une réussite par entrée (US-043, RG-040)', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly donnees: {
        readonly referentiels: {
          readonly reglesDependances: readonly { readonly motif: string }[];
        };
      };
      readonly reussites: readonly boolean[];
    }>('definir_referentiels', {
      donnees: DONNEES_DE_BASE,
      typeReferentiel: 'reglesDependances',
      entrees: [
        { motif: 'log4j:log4j', versions: [] },
        { motif: 'moment', versions: [] },
      ],
    });

    expect(resultat.donnees.referentiels.reglesDependances).toHaveLength(3);
    expect(resultat.reussites).toEqual([true, true]);
  });

  it('un lot vide ne modifie pas le référentiel (definir_referentiels)', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly donnees: {
        readonly referentiels: { readonly reglesDependances: readonly unknown[] };
      };
      readonly reussites: readonly boolean[];
    }>('definir_referentiels', {
      donnees: DONNEES_DE_BASE,
      typeReferentiel: 'reglesDependances',
      entrees: [],
    });

    expect(resultat.donnees.referentiels.reglesDependances).toHaveLength(1);
    expect(resultat.reussites).toEqual([]);
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

  it('remplace le motif de nommage des branches par une chaîne vide si la valeur reçue n’est pas une chaîne', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly referentiels: { readonly motifNommageBranches: string };
    }>('definir_referentiel', {
      donnees: DONNEES_DE_BASE,
      typeReferentiel: 'motifNommageBranches',
      entree: 42,
    });

    expect(resultat.referentiels.motifNommageBranches).toBe('');
  });

  it('rejette une entrée de référentiel absente ou mal formée', async () => {
    await expect(
      BouchonParametrageUtils.invoquer('definir_referentiel', {
        donnees: DONNEES_DE_BASE,
        typeReferentiel: 'reglesDependances',
        entree: 'pas-un-objet',
      }),
    ).rejects.toThrow('entree');
  });

  it('crée une catégorie de seuils absente jusque-là (chemin pointé et racine parametres inconnus)', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly parametres: {
        readonly seuils: { readonly nouvelleCategorie: { readonly champ: number } };
      };
    }>('definir_seuil', { donnees: {}, cle: 'nouvelleCategorie.champ', valeur: 42 });

    expect(resultat.parametres.seuils.nouvelleCategorie.champ).toBe(42);
  });

  it('supprime une entrée du référentiel des règles de dépendances par identifiant', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly referentiels: { readonly reglesDependances: readonly unknown[] };
    }>('supprimer_regle_dependance', { donnees: DONNEES_DE_BASE, id: 'd1' });

    expect(resultat.referentiels.reglesDependances).toHaveLength(0);
  });

  it('supprime une entrée du référentiel des règles de marqueurs IA par identifiant', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly referentiels: { readonly reglesMarqueursIA: readonly unknown[] };
    }>('supprimer_regle_marqueur_ia', { donnees: DONNEES_DE_BASE, id: 'm1' });

    expect(resultat.referentiels.reglesMarqueursIA).toHaveLength(0);
  });

  it('gère sans erreur un référentiel-liste absent de la racine reçue', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly referentiels: { readonly reglesMarqueursIA: readonly unknown[] };
    }>('supprimer_regle_marqueur_ia', { donnees: { referentiels: {} }, id: 'm1' });

    expect(resultat.referentiels.reglesMarqueursIA).toEqual([]);
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

  it('modifie le réglage de proxy sortant avec un chemin de bundle CA renseigné', async () => {
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly parametres: { readonly proxy: { readonly cheminBundleCA: string } };
    }>('definir_proxy', {
      donnees: DONNEES_DE_BASE,
      url: 'http://proxy.exemple.local:3128',
      cheminBundleCa: '/etc/ssl/ca-bundle.pem',
    });

    expect(resultat.parametres.proxy.cheminBundleCA).toBe('/etc/ssl/ca-bundle.pem');
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

  it('remplace les seuils « Commits des membres »', async () => {
    const cadence = {
      fenetreJours: 14,
      seuilJoursOuvresSansPoussee: 2,
      multiplicateurEcartCadence: 3,
      ponderationInactivite: 0.6,
      ponderationEcartCadence: 0.2,
      ponderationSoiree: 0.2,
      heureDebutSoiree: 20,
      heureFinSoiree: 6,
      fuseauHoraire: 'UTC',
      comptesExclus: ['robot-ci'],
    };
    const resultat = await BouchonParametrageUtils.invoquer<{
      readonly parametres: { readonly cadenceCommits: typeof cadence };
    }>('definir_parametres_cadence_commits', { donnees: DONNEES_DE_BASE, parametres: cadence });

    expect(resultat.parametres.cadenceCommits).toEqual(cadence);
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

  describe('suppression ciblée d’audits (US-063, RG-063, plan_20 Partie D)', () => {
    const DONNEES_AVEC_AUDITS = {
      ...DONNEES_DE_BASE,
      groupes: [
        {
          id: 'groupe-1',
          nom: 'Groupe',
          projets: [
            {
              id: 'projet-1',
              nom: 'Projet un',
              audits: [{ id: 'a1' }, { id: 'a2' }],
            },
            {
              id: 'projet-2',
              nom: 'Projet deux',
              audits: [{ id: 'a3' }],
            },
          ],
        },
      ],
    };

    it('previsualiser_suppression_audits : compte les audits et projets concernés sans muter la racine', async () => {
      const resultat = await BouchonParametrageUtils.invoquer<{
        readonly nbAudits: number;
        readonly nbProjetsConcernes: number;
        readonly projetsVides: readonly { readonly projetId: string; readonly nomProjet: string }[];
      }>('previsualiser_suppression_audits', {
        donnees: DONNEES_AVEC_AUDITS,
        auditIds: ['a1', 'a3'],
      });

      expect(resultat.nbAudits).toBe(2);
      expect(resultat.nbProjetsConcernes).toBe(2);
      expect(resultat.projetsVides).toEqual([{ projetId: 'projet-2', nomProjet: 'Projet deux' }]);
      expect(DONNEES_AVEC_AUDITS.groupes[0]?.projets[0]?.audits).toHaveLength(2);
    });

    it('supprimer_audits : retire les audits ciblés, quel que soit leur projet, et horodate la racine', async () => {
      const resultat = await BouchonParametrageUtils.invoquer<{
        readonly groupes: readonly {
          readonly projets: readonly { readonly audits: readonly { readonly id: string }[] }[];
        }[];
        readonly meta: { readonly modifieLe: string };
      }>('supprimer_audits', {
        donnees: DONNEES_AVEC_AUDITS,
        auditIds: ['a1', 'a3'],
        motDePasse: 'mot-de-passe',
      });

      expect(resultat.groupes[0]?.projets[0]?.audits.map((audit) => audit.id)).toEqual(['a2']);
      expect(resultat.groupes[0]?.projets[1]?.audits).toEqual([]);
      expect(resultat.meta.modifieLe).toBeDefined();
    });

    it('supprimer_audits : consigne une unique entrée de journal récapitulative (RG-023)', async () => {
      const resultat = await BouchonParametrageUtils.invoquer<{
        readonly journal: readonly {
          readonly objet: string;
          readonly origine: string;
          readonly detailOrigine?: string;
          readonly apres: {
            readonly nbAuditsSupprimes: number;
            readonly nbProjetsConcernes: number;
          };
        }[];
      }>('supprimer_audits', {
        donnees: DONNEES_AVEC_AUDITS,
        auditIds: ['a1', 'a3'],
        motDePasse: 'mot-de-passe',
      });

      expect(resultat.journal).toHaveLength(1);
      expect(resultat.journal[0]).toEqual(
        expect.objectContaining({
          objet: 'audits',
          origine: 'Purge',
          detailOrigine: 'suppression ciblée',
          apres: { nbAuditsSupprimes: 2, nbProjetsConcernes: 2 },
        }),
      );
    });

    it("supprimer_audits : ne consigne aucune entrée de journal si aucun audit n'a réellement été supprimé", async () => {
      const resultat = await BouchonParametrageUtils.invoquer<{
        readonly journal: readonly unknown[];
      }>('supprimer_audits', {
        donnees: DONNEES_AVEC_AUDITS,
        auditIds: ['id-inexistant'],
        motDePasse: 'mot-de-passe',
      });

      expect(resultat.journal).toEqual([]);
    });
  });
});
