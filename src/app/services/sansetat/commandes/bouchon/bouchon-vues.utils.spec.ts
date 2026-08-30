// Test du bouchon TS de FacadeVuesService (cf. bouchon-vues.utils.ts), généré avec l'assistance de l'IA (Claude
// Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { BouchonVuesUtils } from './bouchon-vues.utils';

const DONNEES_DE_BASE = {
  versionSchema: 2,
  vuesEnregistrees: [
    {
      id: 'v1',
      nom: 'Vue existante',
      ecran: 'syntheseAudits',
      versionFiltres: 1,
      parDefaut: true,
      filtres: null,
    },
  ],
};

describe('BouchonVuesUtils', () => {
  it('rejette une commande non bouchonnée', async () => {
    await expect(
      BouchonVuesUtils.invoquer('commande_inexistante', { donnees: DONNEES_DE_BASE }),
    ).rejects.toThrow('commande_inexistante');
  });

  it('ajoute une nouvelle vue enregistrée', async () => {
    const resultat = await BouchonVuesUtils.invoquer<{
      readonly vuesEnregistrees: readonly { readonly nom: string }[];
    }>('definir_vue', {
      donnees: DONNEES_DE_BASE,
      nom: 'Vue E2E',
      ecran: 'syntheseAudits',
      versionFiltres: 1,
      parDefaut: false,
      filtres: { groupeId: null },
    });

    expect(resultat.vuesEnregistrees).toHaveLength(2);
    expect(resultat.vuesEnregistrees[1]).toEqual(expect.objectContaining({ nom: 'Vue E2E' }));
  });

  it('met à jour une vue existante désignée par identifiant plutôt que d’en ajouter une nouvelle', async () => {
    const resultat = await BouchonVuesUtils.invoquer<{
      readonly vuesEnregistrees: readonly { readonly nom: string }[];
    }>('definir_vue', {
      donnees: DONNEES_DE_BASE,
      id: 'v1',
      nom: 'Vue renommée',
      ecran: 'syntheseAudits',
      versionFiltres: 1,
      parDefaut: true,
      filtres: null,
    });

    expect(resultat.vuesEnregistrees).toHaveLength(1);
    expect(resultat.vuesEnregistrees[0]?.nom).toBe('Vue renommée');
  });

  it('retire le statut par défaut des autres vues du même écran lors de la mise à jour', async () => {
    const donneesDeuxVues = {
      ...DONNEES_DE_BASE,
      vuesEnregistrees: [
        {
          id: 'v1',
          nom: 'A',
          ecran: 'syntheseAudits',
          versionFiltres: 1,
          parDefaut: true,
          filtres: null,
        },
        {
          id: 'v2',
          nom: 'B',
          ecran: 'syntheseAudits',
          versionFiltres: 1,
          parDefaut: false,
          filtres: null,
        },
      ],
    };

    const resultat = await BouchonVuesUtils.invoquer<{
      readonly vuesEnregistrees: readonly { readonly id: string; readonly parDefaut: boolean }[];
    }>('definir_vue', {
      donnees: donneesDeuxVues,
      id: 'v2',
      nom: 'B',
      ecran: 'syntheseAudits',
      versionFiltres: 1,
      parDefaut: true,
      filtres: null,
    });

    expect(resultat.vuesEnregistrees.find((vue) => vue.id === 'v1')?.parDefaut).toBe(false);
    expect(resultat.vuesEnregistrees.find((vue) => vue.id === 'v2')?.parDefaut).toBe(true);
  });

  it('supprime une vue enregistrée par identifiant', async () => {
    const resultat = await BouchonVuesUtils.invoquer<{
      readonly vuesEnregistrees: readonly unknown[];
    }>('supprimer_vue', { donnees: DONNEES_DE_BASE, id: 'v1' });

    expect(resultat.vuesEnregistrees).toHaveLength(0);
  });

  it('horodate `meta.modifieLe` à chaque mutation', async () => {
    const resultat = await BouchonVuesUtils.invoquer<{
      readonly meta: { readonly modifieLe: string };
    }>('supprimer_vue', {
      donnees: { ...DONNEES_DE_BASE, meta: { modifieLe: '2020-01-01T00:00:00.000Z' } },
      id: 'v1',
    });

    expect(resultat.meta.modifieLe).not.toBe('2020-01-01T00:00:00.000Z');
  });

  it('consigne une entrée de journal résumée pour chaque mutation de vue (RG-054)', async () => {
    const creation = await BouchonVuesUtils.invoquer<{
      readonly journal: readonly {
        readonly objet: string;
        readonly avant: unknown;
        readonly apres: unknown;
        readonly origine: string;
      }[];
    }>('definir_vue', {
      donnees: { ...DONNEES_DE_BASE, journal: [] },
      nom: 'Vue E2E',
      ecran: 'obsolescence',
      versionFiltres: 1,
      parDefaut: false,
      filtres: { groupeId: 'g1' },
      origine: 'Vues enregistrées',
    });

    expect(creation.journal).toHaveLength(1);
    expect(creation.journal[0].objet).toMatch(/^vuesEnregistrees\//);
    expect(creation.journal[0].avant).toBeNull();
    expect(creation.journal[0].apres).toEqual({
      nom: 'Vue E2E',
      ecran: 'obsolescence',
      parDefaut: false,
    });
    expect(creation.journal[0].origine).toBe('Vues enregistrées');

    const suppression = await BouchonVuesUtils.invoquer<{
      readonly journal: readonly { readonly avant: unknown; readonly apres: unknown }[];
    }>('supprimer_vue', {
      donnees: { ...DONNEES_DE_BASE, journal: [] },
      id: 'v1',
      origine: 'Vues enregistrées',
    });

    expect(suppression.journal).toHaveLength(1);
    expect(suppression.journal[0].avant).toEqual({
      nom: 'Vue existante',
      ecran: 'syntheseAudits',
      parDefaut: true,
    });
    expect(suppression.journal[0].apres).toBeNull();
  });
});
