// Test du point de passage unique vers `invoke`/le bouchon TS (cf. invocation-commande.utils.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { invoke, isTauri } from '@tauri-apps/api/core';
import { InvocationCommandeUtils } from './invocation-commande.utils';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn() }));

const invokeSimule = jest.mocked(invoke);
const isTauriSimule = jest.mocked(isTauri);

describe('InvocationCommandeUtils', () => {
  beforeEach(() => {
    invokeSimule.mockReset();
    isTauriSimule.mockReset();
  });

  it('doit déléguer à `invoke` en contexte Tauri', async () => {
    isTauriSimule.mockReturnValue(true);
    invokeSimule.mockResolvedValue({ porteeExcessive: false });

    const resultat = await InvocationCommandeUtils.invoquer('tester_connectivite', {
      instance: 'peu importe',
    });

    expect(invokeSimule).toHaveBeenCalledWith('tester_connectivite', { instance: 'peu importe' });
    expect(resultat).toEqual({ porteeExcessive: false });
  });

  it('ne doit jamais appeler `invoke` hors contexte Tauri, et déléguer au bouchon des commandes GitLab/Sonar', async () => {
    isTauriSimule.mockReturnValue(false);

    const resultat = await InvocationCommandeUtils.invoquer('tester_connectivite', {
      instance: 'peu importe',
      credential: 'peu importe',
    });

    expect(invokeSimule).not.toHaveBeenCalled();
    expect(resultat).toEqual({ porteeExcessive: false });
  });

  it('ne doit jamais appeler `invoke` hors contexte Tauri, et déléguer au bouchon du fichier pour ses commandes', async () => {
    isTauriSimule.mockReturnValue(false);

    const resultat = await InvocationCommandeUtils.invoquer<{
      readonly groupes: readonly unknown[];
    }>('creer_fichier', { chemin: '/peu/importe.sqm', motDePasse: 'peu importe' });

    expect(invokeSimule).not.toHaveBeenCalled();
    expect(resultat.groupes).toEqual([]);
  });

  it('ne doit jamais appeler `invoke` hors contexte Tauri, et déléguer au bouchon d’administration pour ses commandes', async () => {
    isTauriSimule.mockReturnValue(false);

    const resultat = await InvocationCommandeUtils.invoquer<{
      readonly donnees: { readonly meta: { readonly modifieLe?: string } };
      readonly membresEnConflit: readonly string[];
    }>('qualifier_membre', {
      donnees: { groupes: [{ id: 'g1', membresConnus: [] }] },
      groupeId: 'g1',
      critere: 'jdupont',
      typeCritere: 'username',
      statut: 'interne',
    });

    expect(invokeSimule).not.toHaveBeenCalled();
    expect(resultat.membresEnConflit).toEqual([]);
    expect(resultat.donnees.meta.modifieLe).toBeDefined();
  });

  it('ne doit jamais appeler `invoke` hors contexte Tauri, et déléguer au bouchon de paramétrage pour ses commandes', async () => {
    isTauriSimule.mockReturnValue(false);

    const resultat = await InvocationCommandeUtils.invoquer<{
      readonly parametres: { readonly seuils: { readonly vitalite: { readonly mortJours: number } } };
    }>('definir_seuil', { donnees: {}, cle: 'vitalite.mortJours', valeur: 400 });

    expect(invokeSimule).not.toHaveBeenCalled();
    expect(resultat.parametres.seuils.vitalite.mortJours).toBe(400);
  });

  it('ne doit jamais appeler `invoke` hors contexte Tauri, et déléguer au bouchon des alertes pour ses commandes', async () => {
    isTauriSimule.mockReturnValue(false);

    const resultat = await InvocationCommandeUtils.invoquer<{
      readonly groupes: readonly { readonly annotations: readonly unknown[] }[];
    }>('creer_annotation', {
      donnees: { groupes: [{ id: 'g1', annotations: [] }] },
      groupeId: 'g1',
      date: '2026-08-09',
      libelle: 'Annotation de test',
      categorie: 'autre',
    });

    expect(invokeSimule).not.toHaveBeenCalled();
    expect(resultat.groupes[0]?.annotations).toHaveLength(1);
  });

  it('ne doit jamais appeler `invoke` hors contexte Tauri, et déléguer au bouchon des vues pour ses commandes', async () => {
    isTauriSimule.mockReturnValue(false);

    const resultat = await InvocationCommandeUtils.invoquer<{
      readonly vuesEnregistrees: readonly unknown[];
    }>('definir_vue', {
      donnees: {},
      nom: 'Ma vue',
      ecran: 'listeTravail',
      parDefaut: false,
      filtres: {},
    });

    expect(invokeSimule).not.toHaveBeenCalled();
    expect(resultat.vuesEnregistrees).toHaveLength(1);
  });

  it.each([
    'qualifier_membre',
    'definir_seuil',
    'creer_annotation',
    'definir_vue',
    'tester_connectivite',
  ])(
    'doit tolérer l’absence de paramètres hors contexte Tauri pour %s (transmet un objet vide au bouchon)',
    async (commande) => {
      isTauriSimule.mockReturnValue(false);

      await InvocationCommandeUtils.invoquer(commande).catch(() => undefined);

      expect(invokeSimule).not.toHaveBeenCalled();
    },
  );
});
