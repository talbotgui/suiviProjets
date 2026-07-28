// Test de VuesEnregistreesUtils (cf. vues-enregistrees.utils.ts, US-028, RG-027), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { VuesEnregistreesUtils } from './vues-enregistrees.utils';
import type { VueEnregistreeConnue } from './vues-enregistrees.utils';

/**
 * Fabrique de vues de test (regroupée en classe à membres statiques uniquement, cf.
 * .claude/rules/09-normes-developpement.md#rigueur-typescript).
 */
class VueDeTest {
  /**
   * Construit une {@link VueEnregistreeConnue} de test, complétée de valeurs par défaut raisonnables.
   * @param partiel - Champs à surcharger, `id` obligatoire.
   * @returns La vue de test construite.
   */
  public static creer(
    partiel: Partial<VueEnregistreeConnue> & Pick<VueEnregistreeConnue, 'id'>,
  ): VueEnregistreeConnue {
    return {
      nom: 'Vue de test',
      ecran: 'listeTravail',
      versionFiltres: 1,
      parDefaut: false,
      filtres: {},
      ...partiel,
    };
  }
}

describe('VuesEnregistreesUtils.filtrerPourEcran', () => {
  it('ne restitue aucune vue en l’absence de toute vue enregistrée', () => {
    const resultat = VuesEnregistreesUtils.filtrerPourEcran([], 'listeTravail', 1);

    expect(resultat).toEqual({ applicables: [], nombreIgnorees: 0 });
  });

  it('ignore les vues des autres écrans sans les compter comme obsolètes', () => {
    const vues: readonly VueEnregistreeConnue[] = [
      VueDeTest.creer({ id: 'v1', ecran: 'syntheseAudits' }),
    ];

    const resultat = VuesEnregistreesUtils.filtrerPourEcran(vues, 'listeTravail', 1);

    expect(resultat).toEqual({ applicables: [], nombreIgnorees: 0 });
  });

  it('restitue une vue du bon écran dont la version de filtres correspond au schéma courant', () => {
    const vues: readonly VueEnregistreeConnue[] = [
      VueDeTest.creer({ id: 'v1', ecran: 'listeTravail', versionFiltres: 1 }),
    ];

    const resultat = VuesEnregistreesUtils.filtrerPourEcran(vues, 'listeTravail', 1);

    expect(resultat.applicables).toEqual(vues);
    expect(resultat.nombreIgnorees).toBe(0);
  });

  it('ignore avec avertissement une vue dont la version de filtres est obsolète, sans bloquer les autres', () => {
    const vues: readonly VueEnregistreeConnue[] = [
      VueDeTest.creer({ id: 'v1', ecran: 'listeTravail', versionFiltres: 1 }),
      VueDeTest.creer({ id: 'v2', ecran: 'listeTravail', versionFiltres: 0 }),
    ];

    const resultat = VuesEnregistreesUtils.filtrerPourEcran(vues, 'listeTravail', 1);

    expect(resultat.applicables.map((v) => v.id)).toEqual(['v1']);
    expect(resultat.nombreIgnorees).toBe(1);
  });
});

describe('VuesEnregistreesUtils.trouverVueParDefaut', () => {
  it('renvoie undefined si aucune vue ne porte parDefaut', () => {
    const vues: readonly VueEnregistreeConnue[] = [VueDeTest.creer({ id: 'v1' })];

    expect(VuesEnregistreesUtils.trouverVueParDefaut(vues)).toBeUndefined();
  });

  it('renvoie la vue marquée par défaut', () => {
    const vues: readonly VueEnregistreeConnue[] = [
      VueDeTest.creer({ id: 'v1' }),
      VueDeTest.creer({ id: 'v2', parDefaut: true }),
    ];

    expect(VuesEnregistreesUtils.trouverVueParDefaut(vues)?.id).toBe('v2');
  });
});
