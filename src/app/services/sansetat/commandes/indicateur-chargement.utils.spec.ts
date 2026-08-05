// Test du compteur technique d'appels en cours (cf. indicateur-chargement.utils.ts, R11-04), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { IndicateurChargementUtils } from './indicateur-chargement.utils';

describe('IndicateurChargementUtils', () => {
  afterEach(() => {
    // Remise à zéro du compteur de module entre les tests (état partagé, cf. commentaire d'en-tête du fichier).
    while (IndicateurChargementUtils.actif()) {
      IndicateurChargementUtils.terminerAppel();
    }
  });

  it('est inactif tant qu’aucun appel n’a démarré', () => {
    expect(IndicateurChargementUtils.actif()).toBe(false);
  });

  it('devient actif au démarrage d’un appel et inactif à sa fin', () => {
    IndicateurChargementUtils.demarrerAppel();
    expect(IndicateurChargementUtils.actif()).toBe(true);

    IndicateurChargementUtils.terminerAppel();
    expect(IndicateurChargementUtils.actif()).toBe(false);
  });

  it('reste actif tant que tous les appels concurrents ne sont pas terminés', () => {
    IndicateurChargementUtils.demarrerAppel();
    IndicateurChargementUtils.demarrerAppel();
    IndicateurChargementUtils.terminerAppel();
    expect(IndicateurChargementUtils.actif()).toBe(true);

    IndicateurChargementUtils.terminerAppel();
    expect(IndicateurChargementUtils.actif()).toBe(false);
  });

  it('ne devient jamais négatif si terminerAppel est appelé sans appel en cours', () => {
    IndicateurChargementUtils.terminerAppel();
    expect(IndicateurChargementUtils.actif()).toBe(false);
  });

  it('envelopper décompte l’appel même en cas de succès', async () => {
    const resultat = await IndicateurChargementUtils.envelopper(() => Promise.resolve('ok'));

    expect(resultat).toBe('ok');
    expect(IndicateurChargementUtils.actif()).toBe(false);
  });

  it('envelopper décompte l’appel même en cas d’échec', async () => {
    await expect(
      IndicateurChargementUtils.envelopper(() => Promise.reject(new Error('échec'))),
    ).rejects.toThrow('échec');

    expect(IndicateurChargementUtils.actif()).toBe(false);
  });

  it('envelopper reste actif tant que l’action n’est pas résolue', async () => {
    let resoudre: (() => void) | undefined;
    const promesse = IndicateurChargementUtils.envelopper(
      () =>
        new Promise<void>((resolve) => {
          resoudre = resolve;
        }),
    );

    expect(IndicateurChargementUtils.actif()).toBe(true);
    resoudre?.();
    await promesse;
    expect(IndicateurChargementUtils.actif()).toBe(false);
  });
});
