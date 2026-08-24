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
  it('doit exposer les sept commandes de FacadeAdministrationService dans COMMANDES', () => {
    expect([...BouchonAdministrationUtils.COMMANDES]).toEqual([
      'qualifier_membre',
      'qualifier_membres',
      'definir_politique_ia',
      'supprimer_membre_connu',
      'enregistrer_brouillon',
      'integrer_brouillon',
      'rejeter_brouillon',
    ]);
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
  });
});
