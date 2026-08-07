// Test du bouchon TS de FacadeAlertesService (cf. bouchon-alertes.utils.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { BouchonAlertesUtils } from './bouchon-alertes.utils';

interface RacineDeTest {
  readonly versionSchema: number;
  readonly groupes: readonly {
    readonly id: string;
    readonly annotations: readonly {
      readonly id: string;
      readonly libelle: string;
      readonly systeme: boolean;
    }[];
    readonly projets: readonly { readonly id: string; readonly annotations: readonly unknown[] }[];
  }[];
  readonly traitementsAlertes: readonly unknown[];
}

const DONNEES_DE_BASE: RacineDeTest = {
  versionSchema: 2,
  groupes: [
    {
      id: 'g1',
      annotations: [{ id: 'a1', libelle: 'Existante', systeme: false }],
      projets: [{ id: 'p1', annotations: [] }],
    },
  ],
  traitementsAlertes: [],
};

describe('BouchonAlertesUtils', () => {
  it('rejette une commande non bouchonnée', async () => {
    await expect(
      BouchonAlertesUtils.invoquer('commande_inexistante', { donnees: DONNEES_DE_BASE }),
    ).rejects.toThrow('commande_inexistante');
  });

  it('crée une annotation de portée groupe', async () => {
    const resultat = await BouchonAlertesUtils.invoquer<{
      readonly groupes: readonly {
        readonly annotations: readonly { readonly libelle: string }[];
      }[];
    }>('creer_annotation', {
      donnees: DONNEES_DE_BASE,
      groupeId: 'g1',
      date: '2026-08-07',
      libelle: 'Nouvelle annotation',
      categorie: 'note',
    });

    expect(resultat.groupes[0]?.annotations).toHaveLength(2);
    expect(resultat.groupes[0]?.annotations[1]).toEqual(
      expect.objectContaining({ libelle: 'Nouvelle annotation' }),
    );
  });

  it('crée une annotation de portée projet sans affecter les annotations du groupe', async () => {
    const resultat = await BouchonAlertesUtils.invoquer<{
      readonly groupes: readonly {
        readonly annotations: readonly unknown[];
        readonly projets: readonly { readonly annotations: readonly unknown[] }[];
      }[];
    }>('creer_annotation', {
      donnees: DONNEES_DE_BASE,
      groupeId: 'g1',
      projetId: 'p1',
      date: '2026-08-07',
      libelle: 'Annotation projet',
      categorie: 'note',
    });

    expect(resultat.groupes[0]?.annotations).toHaveLength(1);
    expect(resultat.groupes[0]?.projets[0]?.annotations).toHaveLength(1);
  });

  it('rejette la création d’une annotation pour un groupe introuvable', async () => {
    await expect(
      BouchonAlertesUtils.invoquer('creer_annotation', {
        donnees: DONNEES_DE_BASE,
        groupeId: 'groupe-inconnu',
        date: '2026-08-07',
        libelle: 'x',
        categorie: 'note',
      }),
    ).rejects.toThrow('groupeIntrouvable');
  });

  it('supprime une annotation de portée groupe par identifiant', async () => {
    const resultat = await BouchonAlertesUtils.invoquer<{
      readonly groupes: readonly { readonly annotations: readonly unknown[] }[];
    }>('supprimer_annotation', { donnees: DONNEES_DE_BASE, groupeId: 'g1', annotationId: 'a1' });

    expect(resultat.groupes[0]?.annotations).toHaveLength(0);
  });

  it('crée une nouvelle entrée de traitement d’alerte par clé d’alerte', async () => {
    const resultat = await BouchonAlertesUtils.invoquer<{
      readonly traitementsAlertes: readonly {
        readonly statut: string;
        readonly cleAlerte: string;
      }[];
    }>('qualifier_alerte', {
      donnees: DONNEES_DE_BASE,
      cleAlerte: 'membre_inconnu|g1|kbenali-e2e',
      statut: 'vue',
      commentaire: 'Signalé',
    });

    expect(resultat.traitementsAlertes).toHaveLength(1);
    expect(resultat.traitementsAlertes[0]).toEqual(
      expect.objectContaining({ cleAlerte: 'membre_inconnu|g1|kbenali-e2e', statut: 'vue' }),
    );
  });

  it('met à jour une entrée de traitement d’alerte existante plutôt que d’en ajouter une nouvelle', async () => {
    const donneesAvecTraitement = {
      ...DONNEES_DE_BASE,
      traitementsAlertes: [
        {
          id: 't1',
          cleAlerte: 'membre_inconnu|g1|kbenali-e2e',
          statut: 'vue',
          commentaire: undefined,
        },
      ],
    };

    const resultat = await BouchonAlertesUtils.invoquer<{
      readonly traitementsAlertes: readonly { readonly statut: string; readonly id: string }[];
    }>('qualifier_alerte', {
      donnees: donneesAvecTraitement,
      cleAlerte: 'membre_inconnu|g1|kbenali-e2e',
      statut: 'traitee',
    });

    expect(resultat.traitementsAlertes).toHaveLength(1);
    expect(resultat.traitementsAlertes[0]).toEqual(
      expect.objectContaining({ id: 't1', statut: 'traitee' }),
    );
  });

  it('horodate `meta.modifieLe` à chaque mutation', async () => {
    const resultat = await BouchonAlertesUtils.invoquer<{
      readonly meta: { readonly modifieLe: string };
    }>('qualifier_alerte', {
      donnees: { ...DONNEES_DE_BASE, meta: { modifieLe: '2020-01-01T00:00:00.000Z' } },
      cleAlerte: 'x',
      statut: 'vue',
    });

    expect(resultat.meta.modifieLe).not.toBe('2020-01-01T00:00:00.000Z');
  });
});
