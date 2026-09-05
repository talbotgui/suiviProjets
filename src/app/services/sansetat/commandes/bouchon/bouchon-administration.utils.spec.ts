// Test du bouchon TS des commandes d'administration (cf. bouchon-administration.utils.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { BouchonAdministrationUtils } from './bouchon-administration.utils';

const GROUPE_VIDE = {
  id: 'groupe-1',
  membresConnus: [],
  projets: [{ id: 'projet-1', iaAutorisee: false, annotations: [], audits: [] }],
};

const RACINE_VIDE = { groupes: [GROUPE_VIDE], brouillon: null, campagnes: [], meta: {} };

interface DonneesTest {
  readonly groupes: readonly {
    readonly id: string;
    readonly membresConnus: readonly Record<string, unknown>[];
    readonly projets: readonly Record<string, unknown>[];
  }[];
  readonly brouillon: Record<string, unknown> | null;
  readonly campagnes: readonly Record<string, unknown>[];
  readonly meta: { readonly modifieLe?: string };
}

describe('BouchonAdministrationUtils', () => {
  it('doit exposer les dix commandes de FacadeAdministrationService dans COMMANDES', () => {
    expect([...BouchonAdministrationUtils.COMMANDES]).toEqual([
      'qualifier_membre',
      'qualifier_membres',
      'definir_politique_ia',
      'supprimer_membre_connu',
      'enregistrer_brouillon',
      'integrer_brouillon',
      'rejeter_brouillon',
      'calculer_metriques_volumetrie',
      'calculer_prise_en_charge_projet',
      'empreinte_referentiel_interne',
    ]);
  });

  describe('calculer_metriques_volumetrie (US-055, RG-055)', () => {
    it('doit renvoyer une ventilation dont la somme des cinq postes vaut exactement le poids du JSON en clair', async () => {
      const donnees = {
        versionSchema: 10,
        meta: { modifieLe: '2026-08-31T08:00:00Z' },
        groupes: [GROUPE_VIDE],
        referentiels: { reglesDependances: [{ id: 'd1' }] },
        parametres: { seuils: {} },
        campagnes: [],
        brouillon: null,
        journal: [{ id: 'j1' }],
        vuesEnregistrees: [],
      };

      const resultat = await BouchonAdministrationUtils.invoquer<{
        tailleDisqueOctets: number | null;
        tailleJsonClairOctets: number;
        ventilation: Record<string, number>;
      }>('calculer_metriques_volumetrie', {
        chemin: '/tmp/fichier.sqm',
        donnees,
      });

      const v = resultat.ventilation;
      expect(
        v['parametrageOctets'] +
          v['journalOctets'] +
          v['administrationOctets'] +
          v['auditsOctets'] +
          v['autreOctets'],
      ).toBe(resultat.tailleJsonClairOctets);
      expect(resultat.tailleJsonClairOctets).toBe(JSON.stringify(donnees).length);
      expect(resultat.tailleDisqueOctets).not.toBeNull();
    });

    it('doit renvoyer tailleDisqueOctets à null quand aucun chemin n’est fourni', async () => {
      const resultat = await BouchonAdministrationUtils.invoquer<{
        tailleDisqueOctets: number | null;
      }>('calculer_metriques_volumetrie', {
        chemin: null,
        donnees: RACINE_VIDE,
      });

      expect(resultat.tailleDisqueOctets).toBeNull();
    });
  });

  it('doit rejeter une commande non bouchonnée', async () => {
    await expect(BouchonAdministrationUtils.invoquer('commande_inexistante', {})).rejects.toThrow(
      'commande_inexistante',
    );
  });

  describe('qualifier_membre', () => {
    it('doit ajouter une nouvelle règle et horodater la racine', async () => {
      const resultat = await BouchonAdministrationUtils.invoquer<{
        readonly donnees: DonneesTest;
        readonly membresEnConflit: readonly string[];
      }>('qualifier_membre', {
        donnees: RACINE_VIDE,
        groupeId: 'groupe-1',
        membreId: undefined,
        critere: 'jdupont',
        typeCritere: 'username',
        statut: 'interne',
        libelle: 'Jean Dupont',
        aliasEmail: undefined,
      });

      expect(resultat.membresEnConflit).toEqual([]);
      expect(resultat.donnees.groupes[0]?.membresConnus).toHaveLength(1);
      expect(resultat.donnees.groupes[0]?.membresConnus[0]).toMatchObject({
        critere: 'jdupont',
        typeCritere: 'username',
        statut: 'interne',
        libelle: 'Jean Dupont',
      });
      expect(resultat.donnees.meta.modifieLe).toBeDefined();
    });

    it('doit rejeter un doublon de username (RG-006/RG-007)', async () => {
      const racineAvecMembre = {
        ...RACINE_VIDE,
        groupes: [
          {
            ...GROUPE_VIDE,
            membresConnus: [{ id: 'm1', critere: 'jdupont', typeCritere: 'username' }],
          },
        ],
      };

      await expect(
        BouchonAdministrationUtils.invoquer('qualifier_membre', {
          donnees: racineAvecMembre,
          groupeId: 'groupe-1',
          membreId: undefined,
          critere: 'jdupont',
          typeCritere: 'username',
          statut: 'interne',
        }),
      ).rejects.toMatchObject({ type: 'doublonUsernameMembreConnu' });
    });

    it('doit rejeter un groupe introuvable', async () => {
      await expect(
        BouchonAdministrationUtils.invoquer('qualifier_membre', {
          donnees: RACINE_VIDE,
          groupeId: 'groupe-inconnu',
          critere: 'x',
          typeCritere: 'username',
          statut: 'interne',
        }),
      ).rejects.toMatchObject({ type: 'groupeIntrouvable' });
    });

    it('doit rejeter un groupe introuvable quand la racine ne porte aucun groupe', async () => {
      await expect(
        BouchonAdministrationUtils.invoquer('qualifier_membre', {
          donnees: {},
          groupeId: 'groupe-1',
          critere: 'x',
          typeCritere: 'username',
          statut: 'interne',
        }),
      ).rejects.toMatchObject({ type: 'groupeIntrouvable' });
    });

    it('doit rejeter un paramètre « donnees » absent', async () => {
      await expect(
        BouchonAdministrationUtils.invoquer('qualifier_membre', {
          groupeId: 'groupe-1',
          critere: 'x',
          typeCritere: 'username',
          statut: 'interne',
        }),
      ).rejects.toThrow('donnees');
    });

    it('doit mettre à jour une règle existante plutôt que d’en créer une nouvelle (membreId fourni)', async () => {
      const racineAvecMembre = {
        ...RACINE_VIDE,
        groupes: [
          {
            ...GROUPE_VIDE,
            membresConnus: [
              { id: 'm1', critere: 'ancien', typeCritere: 'username', statut: 'interne' },
            ],
          },
        ],
      };

      const resultat = await BouchonAdministrationUtils.invoquer<{
        readonly donnees: DonneesTest;
      }>('qualifier_membre', {
        donnees: racineAvecMembre,
        groupeId: 'groupe-1',
        membreId: 'm1',
        critere: 'jdupont',
        typeCritere: 'username',
        statut: 'externe',
        libelle: 'Jean Dupont',
      });

      expect(resultat.donnees.groupes[0]?.membresConnus).toHaveLength(1);
      expect(resultat.donnees.groupes[0]?.membresConnus[0]).toMatchObject({
        id: 'm1',
        critere: 'jdupont',
        statut: 'externe',
      });
    });
  });

  describe('qualifier_membres', () => {
    it('doit ajouter plusieurs règles en une seule fois et renvoyer une réussite par entrée (US-044, RG-041)', async () => {
      const resultat = await BouchonAdministrationUtils.invoquer<{
        readonly donnees: DonneesTest;
        readonly reussites: readonly boolean[];
      }>('qualifier_membres', {
        donnees: RACINE_VIDE,
        groupeId: 'groupe-1',
        entrees: [
          { critere: 'jdupont', typeCritere: 'username', statut: 'interne' },
          { critere: 'bdurand', typeCritere: 'username', statut: 'client' },
        ],
        origine: 'Saisie en masse (Fiche projet)',
      });

      expect(resultat.reussites).toEqual([true, true]);
      expect(resultat.donnees.groupes[0]?.membresConnus).toHaveLength(2);
    });

    it('doit simuler un échec partiel sur un doublon de username sans interrompre le lot (RG-006/RG-007, RG-041 point 5)', async () => {
      const racineAvecMembre = {
        ...RACINE_VIDE,
        groupes: [
          {
            ...GROUPE_VIDE,
            membresConnus: [{ id: 'm1', critere: 'jdupont', typeCritere: 'username' }],
          },
        ],
      };

      const resultat = await BouchonAdministrationUtils.invoquer<{
        readonly donnees: DonneesTest;
        readonly reussites: readonly boolean[];
      }>('qualifier_membres', {
        donnees: racineAvecMembre,
        groupeId: 'groupe-1',
        entrees: [
          { critere: 'bdurand', typeCritere: 'username', statut: 'client' },
          { critere: 'jdupont', typeCritere: 'username', statut: 'interne' },
          { critere: 'ccharpentier', typeCritere: 'username', statut: 'interne' },
        ],
        origine: 'Saisie en masse (Fiche projet)',
      });

      expect(resultat.reussites).toEqual([true, false, true]);
      expect(resultat.donnees.groupes[0]?.membresConnus).toHaveLength(3);
    });

    it('un lot vide ne modifie pas les membres connus', async () => {
      const resultat = await BouchonAdministrationUtils.invoquer<{
        readonly donnees: DonneesTest;
        readonly reussites: readonly boolean[];
      }>('qualifier_membres', {
        donnees: RACINE_VIDE,
        groupeId: 'groupe-1',
        entrees: [],
        origine: 'Saisie en masse (Fiche projet)',
      });

      expect(resultat.reussites).toEqual([]);
      expect(resultat.donnees.groupes[0]?.membresConnus).toHaveLength(0);
    });
  });

  describe('definir_politique_ia', () => {
    it("doit autoriser l'IA et ajouter l'annotation système (RG-014 à RG-016)", async () => {
      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>(
        'definir_politique_ia',
        {
          donnees: RACINE_VIDE,
          groupeId: 'groupe-1',
          projetId: 'projet-1',
          iaAutorisee: true,
        },
      );

      const projet = donnees.groupes[0]?.projets[0];
      expect(projet?.['iaAutorisee']).toBe(true);
      expect(projet?.['iaAutoriseeDepuis']).toBeDefined();
      expect(projet?.['annotations']).toHaveLength(1);
    });

    it('doit rejeter un projet introuvable', async () => {
      await expect(
        BouchonAdministrationUtils.invoquer('definir_politique_ia', {
          donnees: RACINE_VIDE,
          groupeId: 'groupe-1',
          projetId: 'projet-inconnu',
          iaAutorisee: true,
        }),
      ).rejects.toMatchObject({ type: 'projetIntrouvable' });
    });

    it('ne doit rien modifier si la politique demandée est déjà en vigueur', async () => {
      const racineIaDejaAutorisee = {
        ...RACINE_VIDE,
        groupes: [
          {
            ...GROUPE_VIDE,
            projets: [
              {
                id: 'projet-1',
                iaAutorisee: true,
                iaAutoriseeDepuis: '2026-01-01',
                annotations: [],
                audits: [],
              },
            ],
          },
        ],
      };

      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>(
        'definir_politique_ia',
        {
          donnees: racineIaDejaAutorisee,
          groupeId: 'groupe-1',
          projetId: 'projet-1',
          iaAutorisee: true,
        },
      );

      const projet = donnees.groupes[0]?.projets[0];
      expect(projet?.['annotations']).toEqual([]);
      expect(projet?.['iaAutoriseeDepuis']).toBe('2026-01-01');
    });

    it("doit désactiver l'IA sans ajouter d'annotation ni toucher iaAutoriseeDepuis", async () => {
      const racineIaAutorisee = {
        ...RACINE_VIDE,
        groupes: [
          {
            ...GROUPE_VIDE,
            projets: [
              {
                id: 'projet-1',
                iaAutorisee: true,
                iaAutoriseeDepuis: '2026-01-01',
                annotations: [],
                audits: [],
              },
            ],
          },
        ],
      };

      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>(
        'definir_politique_ia',
        {
          donnees: racineIaAutorisee,
          groupeId: 'groupe-1',
          projetId: 'projet-1',
          iaAutorisee: false,
        },
      );

      const projet = donnees.groupes[0]?.projets[0];
      expect(projet?.['iaAutorisee']).toBe(false);
      expect(projet?.['annotations']).toEqual([]);
      expect(projet?.['iaAutoriseeDepuis']).toBe('2026-01-01');
    });

    it('doit conserver iaAutoriseeDepuis déjà renseigné plutôt que de le réécrire', async () => {
      const racineAvecDateAnterieure = {
        ...RACINE_VIDE,
        groupes: [
          {
            ...GROUPE_VIDE,
            projets: [
              {
                id: 'projet-1',
                iaAutorisee: false,
                iaAutoriseeDepuis: '2020-05-05',
                annotations: [],
                audits: [],
              },
            ],
          },
        ],
      };

      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>(
        'definir_politique_ia',
        {
          donnees: racineAvecDateAnterieure,
          groupeId: 'groupe-1',
          projetId: 'projet-1',
          iaAutorisee: true,
        },
      );

      const projet = donnees.groupes[0]?.projets[0];
      expect(projet?.['iaAutoriseeDepuis']).toBe('2020-05-05');
      expect(projet?.['annotations']).toHaveLength(1);
    });
  });

  describe('supprimer_membre_connu', () => {
    it('doit supprimer la règle désignée', async () => {
      const racineAvecMembre = {
        ...RACINE_VIDE,
        groupes: [{ ...GROUPE_VIDE, membresConnus: [{ id: 'm1', critere: 'jdupont' }] }],
      };

      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>(
        'supprimer_membre_connu',
        {
          donnees: racineAvecMembre,
          groupeId: 'groupe-1',
          membreId: 'm1',
        },
      );

      expect(donnees.groupes[0]?.membresConnus).toEqual([]);
    });

    it('doit rejeter un membre introuvable', async () => {
      await expect(
        BouchonAdministrationUtils.invoquer('supprimer_membre_connu', {
          donnees: RACINE_VIDE,
          groupeId: 'groupe-1',
          membreId: 'inconnu',
        }),
      ).rejects.toMatchObject({ type: 'membreIntrouvable' });
    });
  });

  describe('enregistrer_brouillon', () => {
    it('doit créer le brouillon et la campagne (RG-019)', async () => {
      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>(
        'enregistrer_brouillon',
        {
          donnees: RACINE_VIDE,
          campagneId: 'campagne-1',
          date: '2026-07-28',
          perimetre: ['projet-1'],
          verdicts: [{ projetId: 'projet-1', statut: 'succes' }],
          resultatsParProjet: [
            { projetId: 'projet-1', audit: { id: 'audit-1' }, statut: 'brouillon' },
          ],
        },
      );

      expect(donnees.campagnes).toHaveLength(1);
      expect(donnees.brouillon).not.toBeNull();
      expect(donnees.brouillon?.['resultatsParProjet']).toEqual([
        { projetId: 'projet-1', audit: { id: 'audit-1' }, statut: 'enAttente' },
      ]);
    });

    it('doit refuser un brouillon déjà existant (RG-019)', async () => {
      const racineAvecBrouillon = {
        ...RACINE_VIDE,
        brouillon: { campagneId: 'x', resultatsParProjet: [] },
      };

      await expect(
        BouchonAdministrationUtils.invoquer('enregistrer_brouillon', {
          donnees: racineAvecBrouillon,
          campagneId: 'campagne-2',
          date: '2026-07-28',
          perimetre: [],
          verdicts: [],
          resultatsParProjet: [],
        }),
      ).rejects.toMatchObject({ type: 'brouillonDejaExistant' });
    });

    it('doit reporter prisesEnCharge sur le brouillon quand elle contient au moins une entrée (US-058, RG-058, plan_18)', async () => {
      const premierCommitInterne = { statut: 'determine', date: '2020-01-15' };

      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>(
        'enregistrer_brouillon',
        {
          donnees: RACINE_VIDE,
          campagneId: 'campagne-1',
          date: '2026-07-28',
          perimetre: ['projet-1'],
          verdicts: [{ projetId: 'projet-1', statut: 'succes' }],
          resultatsParProjet: [
            { projetId: 'projet-1', audit: { id: 'audit-1' }, statut: 'brouillon' },
          ],
          prisesEnCharge: { 'projet-1': premierCommitInterne },
        },
      );

      expect(donnees.brouillon?.['prisesEnCharge']).toEqual({ 'projet-1': premierCommitInterne });
    });

    it('ne doit pas créer de clé prisesEnCharge sur le brouillon quand elle est absente ou vide', async () => {
      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>(
        'enregistrer_brouillon',
        {
          donnees: RACINE_VIDE,
          campagneId: 'campagne-1',
          date: '2026-07-28',
          perimetre: ['projet-1'],
          verdicts: [{ projetId: 'projet-1', statut: 'succes' }],
          resultatsParProjet: [
            { projetId: 'projet-1', audit: { id: 'audit-1' }, statut: 'brouillon' },
          ],
          prisesEnCharge: {},
        },
      );

      expect(donnees.brouillon?.['prisesEnCharge']).toBeUndefined();
    });
  });

  describe('integrer_brouillon / rejeter_brouillon', () => {
    const racineAvecBrouillon = {
      ...RACINE_VIDE,
      brouillon: {
        campagneId: 'campagne-1',
        resultatsParProjet: [
          { projetId: 'projet-1', audit: { id: 'audit-1' }, statut: 'enAttente' },
        ],
      },
    };

    it('doit intégrer une entrée dans l’historique du projet et effacer le brouillon résolu', async () => {
      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>('integrer_brouillon', {
        donnees: racineAvecBrouillon,
      });

      expect(donnees.brouillon).toBeNull();
      expect(donnees.groupes[0]?.projets[0]?.['audits']).toEqual([{ id: 'audit-1' }]);
    });

    it('doit rejeter une entrée sans jamais l’ajouter à l’historique du projet', async () => {
      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>('rejeter_brouillon', {
        donnees: racineAvecBrouillon,
        motif: 'Anomalie détectée',
      });

      expect(donnees.brouillon).toBeNull();
      expect(donnees.groupes[0]?.projets[0]?.['audits']).toEqual([]);
    });

    it('doit rejeter si aucun brouillon courant', async () => {
      await expect(
        BouchonAdministrationUtils.invoquer('integrer_brouillon', { donnees: RACINE_VIDE }),
      ).rejects.toMatchObject({ type: 'aucunBrouillonCourant' });
    });

    it('doit rejeter une sélection portant un projet absent du brouillon', async () => {
      await expect(
        BouchonAdministrationUtils.invoquer('integrer_brouillon', {
          donnees: racineAvecBrouillon,
          selection: ['projet-inconnu'],
        }),
      ).rejects.toMatchObject({ type: 'projetAbsentDuBrouillon' });
    });

    it('doit intégrer uniquement les entrées sélectionnées et laisser le brouillon ouvert pour le reste', async () => {
      const groupeDeuxProjets = {
        id: 'groupe-1',
        membresConnus: [],
        projets: [
          { id: 'projet-1', iaAutorisee: false, annotations: [], audits: [] },
          { id: 'projet-2', iaAutorisee: false, annotations: [], audits: [] },
        ],
      };
      const racineDeuxEntreesEnAttente = {
        groupes: [groupeDeuxProjets],
        brouillon: {
          campagneId: 'campagne-1',
          resultatsParProjet: [
            { projetId: 'projet-1', audit: { id: 'audit-1' }, statut: 'enAttente' },
            { projetId: 'projet-2', audit: { id: 'audit-2' }, statut: 'enAttente' },
          ],
        },
        campagnes: [],
        meta: {},
      };

      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>('integrer_brouillon', {
        donnees: racineDeuxEntreesEnAttente,
        selection: ['projet-1'],
      });

      expect(donnees.brouillon).not.toBeNull();
      expect(donnees.brouillon?.['resultatsParProjet']).toEqual([
        { projetId: 'projet-1', audit: { id: 'audit-1' }, statut: 'integre' },
        { projetId: 'projet-2', audit: { id: 'audit-2' }, statut: 'enAttente' },
      ]);
      expect(donnees.groupes[0]?.projets[0]?.['audits']).toEqual([{ id: 'audit-1' }]);
    });

    it('doit rejeter une entrée dont le projet est introuvable dans les groupes', async () => {
      const racineAvecEntreeOrpheline = {
        ...RACINE_VIDE,
        brouillon: {
          campagneId: 'campagne-1',
          resultatsParProjet: [
            { projetId: 'projet-orphelin', audit: { id: 'audit-1' }, statut: 'enAttente' },
          ],
        },
      };

      await expect(
        BouchonAdministrationUtils.invoquer('integrer_brouillon', {
          donnees: racineAvecEntreeOrpheline,
        }),
      ).rejects.toMatchObject({ type: 'projetIntrouvable' });
    });

    it('doit appliquer prisesEnCharge au projet correspondant lors de l’intégration (US-058, RG-058, plan_18)', async () => {
      const premierCommitInterne = { statut: 'determine', date: '2020-01-15' };
      const racineAvecPriseEnCharge = {
        ...racineAvecBrouillon,
        brouillon: {
          ...racineAvecBrouillon.brouillon,
          prisesEnCharge: { 'projet-1': premierCommitInterne },
        },
      };

      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>('integrer_brouillon', {
        donnees: racineAvecPriseEnCharge,
      });

      expect(donnees.groupes[0]?.projets[0]?.['premierCommitInterne']).toEqual(
        premierCommitInterne,
      );
      expect(donnees.brouillon).toBeNull();
    });

    it('ne doit jamais appliquer prisesEnCharge lors d’un rejet (§5.4 : aucune application partielle)', async () => {
      const premierCommitInterne = { statut: 'determine', date: '2020-01-15' };
      const racineAvecPriseEnCharge = {
        ...racineAvecBrouillon,
        brouillon: {
          ...racineAvecBrouillon.brouillon,
          prisesEnCharge: { 'projet-1': premierCommitInterne },
        },
      };

      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>('rejeter_brouillon', {
        donnees: racineAvecPriseEnCharge,
      });

      expect(donnees.groupes[0]?.projets[0]?.['premierCommitInterne']).toBeUndefined();
      expect(donnees.brouillon).toBeNull();
    });

    it('ne doit appliquer que la prise en charge ciblée par la sélection, en laissant l’autre en attente', async () => {
      const groupeDeuxProjets = {
        id: 'groupe-1',
        membresConnus: [],
        projets: [
          { id: 'projet-1', iaAutorisee: false, annotations: [], audits: [] },
          { id: 'projet-2', iaAutorisee: false, annotations: [], audits: [] },
        ],
      };
      const premierCommitInterne1 = { statut: 'determine', date: '2020-01-15' };
      const premierCommitInterne2 = { statut: 'determine', date: '2021-06-01' };
      const racineDeuxEntrees = {
        groupes: [groupeDeuxProjets],
        brouillon: {
          campagneId: 'campagne-1',
          resultatsParProjet: [
            { projetId: 'projet-1', audit: { id: 'audit-1' }, statut: 'enAttente' },
            { projetId: 'projet-2', audit: { id: 'audit-2' }, statut: 'enAttente' },
          ],
          prisesEnCharge: {
            'projet-1': premierCommitInterne1,
            'projet-2': premierCommitInterne2,
          },
        },
        campagnes: [],
        meta: {},
      };

      const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>('integrer_brouillon', {
        donnees: racineDeuxEntrees,
        selection: ['projet-1'],
      });

      expect(donnees.groupes[0]?.projets[0]?.['premierCommitInterne']).toEqual(
        premierCommitInterne1,
      );
      expect(donnees.groupes[0]?.projets[1]?.['premierCommitInterne']).toBeUndefined();
      expect(donnees.brouillon?.['prisesEnCharge']).toEqual({ 'projet-2': premierCommitInterne2 });
    });

    it(
      'ne doit pas purger le brouillon tant qu’une prise en charge orpheline (sans entrée resultatsParProjet) ' +
        'reste en attente (corrigé en relecture)',
      async () => {
        const groupeDeuxProjets = {
          id: 'groupe-1',
          membresConnus: [],
          projets: [
            { id: 'projet-1', iaAutorisee: false, annotations: [], audits: [] },
            { id: 'projet-2', iaAutorisee: false, annotations: [], audits: [] },
          ],
        };
        const premierCommitInterne2 = { statut: 'determine', date: '2020-01-15' };
        const racineAvecOrphelin = {
          groupes: [groupeDeuxProjets],
          brouillon: {
            campagneId: 'campagne-1',
            resultatsParProjet: [
              { projetId: 'projet-1', audit: { id: 'audit-1' }, statut: 'enAttente' },
            ],
            prisesEnCharge: { 'projet-2': premierCommitInterne2 },
          },
          campagnes: [],
          meta: {},
        };

        const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>(
          'integrer_brouillon',
          { donnees: racineAvecOrphelin, selection: ['projet-1'] },
        );

        expect(donnees.brouillon).not.toBeNull();
        expect(donnees.brouillon?.['prisesEnCharge']).toEqual({
          'projet-2': premierCommitInterne2,
        });
        expect(donnees.groupes[0]?.projets[1]?.['premierCommitInterne']).toBeUndefined();
      },
    );

    it(
      'doit accepter une sélection ciblant un projet présent uniquement dans prisesEnCharge (corrigé en ' +
        'relecture, sur le modèle du cœur natif)',
      async () => {
        const groupeDeuxProjets = {
          id: 'groupe-1',
          membresConnus: [],
          projets: [
            { id: 'projet-1', iaAutorisee: false, annotations: [], audits: [] },
            { id: 'projet-2', iaAutorisee: false, annotations: [], audits: [] },
          ],
        };
        const premierCommitInterne2 = { statut: 'determine', date: '2020-01-15' };
        const racineAvecOrphelin = {
          groupes: [groupeDeuxProjets],
          brouillon: {
            campagneId: 'campagne-1',
            resultatsParProjet: [
              { projetId: 'projet-1', audit: { id: 'audit-1' }, statut: 'enAttente' },
            ],
            prisesEnCharge: { 'projet-2': premierCommitInterne2 },
          },
          campagnes: [],
          meta: {},
        };

        const donnees = await BouchonAdministrationUtils.invoquer<DonneesTest>(
          'integrer_brouillon',
          { donnees: racineAvecOrphelin, selection: ['projet-2'] },
        );

        expect(donnees.groupes[0]?.projets[1]?.['premierCommitInterne']).toEqual(
          premierCommitInterne2,
        );
        // projet-1 reste en attente : le brouillon reste ouvert pour lui.
        expect(donnees.brouillon?.['resultatsParProjet']).toEqual([
          { projetId: 'projet-1', audit: { id: 'audit-1' }, statut: 'enAttente' },
        ]);
      },
    );

    it('doit rejeter toujours un identifiant totalement inconnu (ni resultatsParProjet ni prisesEnCharge)', async () => {
      await expect(
        BouchonAdministrationUtils.invoquer('integrer_brouillon', {
          donnees: racineAvecBrouillon,
          selection: ['projet-totalement-inconnu'],
        }),
      ).rejects.toMatchObject({ type: 'projetAbsentDuBrouillon' });
    });
  });

  describe('empreinte_referentiel_interne (US-058, RG-058, plan_18)', () => {
    const groupeAvecInternes = {
      id: 'groupe-1',
      membresConnus: [
        { id: 'm1', critere: '*@entreprise.fr', typeCritere: 'domaineEmail', statut: 'interne' },
        { id: 'm2', critere: 'mdurand', typeCritere: 'username', statut: 'interne' },
        { id: 'm3', critere: 'a.lopez@presta.io', typeCritere: 'email', statut: 'partenaire' },
      ],
      projets: [],
    };

    it('doit renvoyer un condensé de forme sha256:… stable pour un même ensemble de règles interne', async () => {
      const racine = { groupes: [groupeAvecInternes], brouillon: null, campagnes: [], meta: {} };
      const premier = await BouchonAdministrationUtils.invoquer<string>(
        'empreinte_referentiel_interne',
        { groupeId: 'groupe-1', donnees: racine },
      );
      const second = await BouchonAdministrationUtils.invoquer<string>(
        'empreinte_referentiel_interne',
        { groupeId: 'groupe-1', donnees: racine },
      );

      expect(premier).toMatch(/^sha256:[0-9a-f]{8}$/);
      expect(second).toBe(premier);
    });

    it('doit changer de condensé quand une règle interne est ajoutée, pas quand une règle non interne l’est', async () => {
      const base = await BouchonAdministrationUtils.invoquer<string>(
        'empreinte_referentiel_interne',
        {
          groupeId: 'groupe-1',
          donnees: { groupes: [groupeAvecInternes], brouillon: null, campagnes: [], meta: {} },
        },
      );

      const avecRegleNonInterne = await BouchonAdministrationUtils.invoquer<string>(
        'empreinte_referentiel_interne',
        {
          groupeId: 'groupe-1',
          donnees: {
            groupes: [
              {
                ...groupeAvecInternes,
                membresConnus: [
                  ...groupeAvecInternes.membresConnus,
                  { id: 'm4', critere: 'client.fr', typeCritere: 'domaineEmail', statut: 'client' },
                ],
              },
            ],
            brouillon: null,
            campagnes: [],
            meta: {},
          },
        },
      );
      expect(avecRegleNonInterne).toBe(base);

      const avecRegleInterne = await BouchonAdministrationUtils.invoquer<string>(
        'empreinte_referentiel_interne',
        {
          groupeId: 'groupe-1',
          donnees: {
            groupes: [
              {
                ...groupeAvecInternes,
                membresConnus: [
                  ...groupeAvecInternes.membresConnus,
                  { id: 'm5', critere: 'jpetit', typeCritere: 'username', statut: 'interne' },
                ],
              },
            ],
            brouillon: null,
            campagnes: [],
            meta: {},
          },
        },
      );
      expect(avecRegleInterne).not.toBe(base);
    });

    it('doit rejeter un groupe introuvable', async () => {
      await expect(
        BouchonAdministrationUtils.invoquer('empreinte_referentiel_interne', {
          groupeId: 'groupe-inconnu',
          donnees: RACINE_VIDE,
        }),
      ).rejects.toMatchObject({ type: 'groupeIntrouvable' });
    });
  });

  describe('calculer_prise_en_charge_projet (US-058, RG-058, plan_18)', () => {
    beforeEach(() => {
      jest.useFakeTimers({ advanceTimers: true });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const groupeComplet = {
      id: 'groupe-1',
      membresConnus: [
        { id: 'm1', critere: '*@entreprise.fr', typeCritere: 'domaineEmail', statut: 'interne' },
      ],
      projets: [
        {
          id: 'projet-1',
          sources: [{ id: 's1', type: 'depotGitlab', idExterne: '1234' }],
          audits: [],
        },
      ],
    };
    const racineComplete = {
      groupes: [groupeComplet],
      brouillon: null,
      campagnes: [],
      meta: {},
    };

    it('doit renvoyer « aucune_regle_interne » quand le groupe n’a aucune règle interne', async () => {
      const resultat = await BouchonAdministrationUtils.invoquer<Record<string, unknown>>(
        'calculer_prise_en_charge_projet',
        {
          projetId: 'projet-1',
          donnees: {
            groupes: [{ ...groupeComplet, membresConnus: [] }],
            brouillon: null,
            campagnes: [],
            meta: {},
          },
        },
      );

      expect(resultat['statut']).toBe('aucune_regle_interne');
      expect(resultat['empreinteReferentiel']).toMatch(/^sha256:/);
      expect(resultat['calculeLe']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('doit renvoyer « non_applicable » quand le projet n’a aucune source GitLab', async () => {
      const resultat = await BouchonAdministrationUtils.invoquer<Record<string, unknown>>(
        'calculer_prise_en_charge_projet',
        {
          projetId: 'projet-1',
          donnees: {
            groupes: [
              {
                ...groupeComplet,
                projets: [
                  { id: 'projet-1', sources: [{ id: 's1', type: 'projetSonar' }], audits: [] },
                ],
              },
            ],
            brouillon: null,
            campagnes: [],
            meta: {},
          },
        },
      );

      expect(resultat['statut']).toBe('non_applicable');
    });

    it('doit renvoyer « determine » et rester rejouable (même date à empreinte inchangée)', async () => {
      const premier = await BouchonAdministrationUtils.invoquer<Record<string, unknown>>(
        'calculer_prise_en_charge_projet',
        { projetId: 'projet-1', donnees: racineComplete },
      );
      expect(premier['statut']).toBe('determine');

      const racineAvecResultat = {
        ...racineComplete,
        groupes: [
          {
            ...groupeComplet,
            projets: [{ ...groupeComplet.projets[0], premierCommitInterne: premier }],
          },
        ],
      };
      const second = await BouchonAdministrationUtils.invoquer<Record<string, unknown>>(
        'calculer_prise_en_charge_projet',
        { projetId: 'projet-1', donnees: racineAvecResultat },
      );

      expect(second['date']).toBe(premier['date']);
      expect(second['statut']).toBe('determine');
    });

    it('doit rejeter un projet introuvable', async () => {
      await expect(
        BouchonAdministrationUtils.invoquer('calculer_prise_en_charge_projet', {
          projetId: 'projet-inconnu',
          donnees: racineComplete,
        }),
      ).rejects.toMatchObject({ type: 'projetIntrouvable' });
    });
  });
});
