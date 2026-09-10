// Test du bouchon TS des commandes de l'écran « Commits des membres » (cf. bouchon-commits-membres.utils.ts,
// US-060, RG-060, plan_17 chapitre 4), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { BouchonCommitsMembresUtils } from './bouchon-commits-membres.utils';

describe('BouchonCommitsMembresUtils', () => {
  it('sert un roster de quatre développeurs et trois dépôts', () => {
    const preparation = BouchonCommitsMembresUtils.preparerAnalyse();

    expect(preparation.membres).toHaveLength(4);
    expect(preparation.projets).toHaveLength(3);
    expect(preparation.membres.map((membre) => membre.username)).toEqual([
      'dana.regulier',
      'sam.silencieux',
      'nadia.dusoir',
      'igor.irregulier',
    ]);
  });

  it('produit des horodatages relatifs à Date.now(), donc rejouables', () => {
    const evenements = BouchonCommitsMembresUtils.listerEvenementsPoussees({ utilisateurId: 9001 });
    const maintenant = Date.now();

    expect(evenements.length).toBeGreaterThan(0);
    for (const evenement of evenements) {
      const age = maintenant - Date.parse(evenement.horodatage);
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(30 * 24 * 60 * 60 * 1000);
    }
  });

  it('le développeur « silencieux » n’a poussé que sur du code d’il y a plus d’une semaine', () => {
    const evenements = BouchonCommitsMembresUtils.listerEvenementsPoussees({ utilisateurId: 9002 });

    const plusRecent = Math.max(...evenements.map((evenement) => Date.parse(evenement.horodatage)));
    expect(Date.now() - plusRecent).toBeGreaterThan(7 * 24 * 60 * 60 * 1000);
  });

  it('renvoie une liste vide pour un identifiant de membre inconnu ou absent', () => {
    expect(BouchonCommitsMembresUtils.listerEvenementsPoussees({ utilisateurId: 123456 })).toEqual(
      [],
    );
    expect(BouchonCommitsMembresUtils.listerEvenementsPoussees({})).toEqual([]);
  });
});
