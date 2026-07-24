// Test de ErreurConnecteurUtils (cf. erreur-connecteur.utils.ts), généré avec l'assistance de l'IA (Claude Code),
// conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { ErreurConnecteurUtils } from './erreur-connecteur.utils';
import type { CategorieErreurConnecteur } from './types-facade';

const CATEGORIES: readonly CategorieErreurConnecteur[] = [
  'authentificationRefusee',
  'refIntrouvable',
  'instanceInjoignable',
  'delaiDepasse',
  'reponseInattendue',
  'droitsInsuffisants',
  'credentialAbsent',
];

describe('ErreurConnecteurUtils', () => {
  it.each(CATEGORIES)('doit fournir un libellé non vide pour « %s »', (categorie) => {
    expect(ErreurConnecteurUtils.libelleCategorie(categorie).length).toBeGreaterThan(0);
  });

  it.each(CATEGORIES)('doit fournir une action suggérée non vide pour « %s »', (categorie) => {
    expect(ErreurConnecteurUtils.actionSuggeree(categorie).length).toBeGreaterThan(0);
  });

  it('doit fournir un libellé distinct par catégorie (pas de doublon)', () => {
    const libelles = CATEGORIES.map((categorie) =>
      ErreurConnecteurUtils.libelleCategorie(categorie),
    );
    expect(new Set(libelles).size).toBe(CATEGORIES.length);
  });
});
