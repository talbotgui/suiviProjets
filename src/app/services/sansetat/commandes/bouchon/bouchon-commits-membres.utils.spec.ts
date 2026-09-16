// Test du bouchon TS des commandes de l'écran « Commits des membres » (cf. bouchon-commits-membres.utils.ts,
// US-060, RG-060, plan_17 chapitre 4, amendé par plan_21 le 2026-09-16), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { BouchonCommitsMembresUtils } from './bouchon-commits-membres.utils';

describe('BouchonCommitsMembresUtils', () => {
  it('résout un compte GitLab par nom d’utilisateur exact', () => {
    const membre = BouchonCommitsMembresUtils.rechercherMembreParUsername({ username: 'mdurand' });

    expect(membre).toEqual({
      id: 9001,
      username: 'mdurand',
      nom: 'Marie Durand',
      courriel: 'marie.durand@entreprise.fr',
    });
  });

  it('renvoie null pour un nom d’utilisateur inconnu ou absent', () => {
    expect(
      BouchonCommitsMembresUtils.rechercherMembreParUsername({ username: 'inconnu' }),
    ).toBeNull();
    expect(BouchonCommitsMembresUtils.rechercherMembreParUsername({})).toBeNull();
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
