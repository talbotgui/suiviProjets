// Test du client typé de la Façade de commandes dédié à la Phase 9, incrément 1 (cf. facade-vues.service.ts),
// généré avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { FacadeVuesService } from './facade-vues.service';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

const invokeSimule = jest.mocked(invoke);

describe('FacadeVuesService', () => {
  let service: FacadeVuesService;

  beforeEach(() => {
    invokeSimule.mockReset();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacadeVuesService);
  });

  it('invoque definir_vue avec les paramètres fournis et renvoie la racine native', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    const resultat = await service.definirVue({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      id: undefined,
      nom: 'Ma vue',
      ecran: 'listeTravail',
      versionFiltres: 1,
      parDefaut: false,
      filtres: { groupeId: 'g1' },
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith('definir_vue', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      id: undefined,
      nom: 'Ma vue',
      ecran: 'listeTravail',
      versionFiltres: 1,
      parDefaut: false,
      filtres: { groupeId: 'g1' },
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ versionSchema: 2 });
  });

  it('invoque definir_vue avec un identifiant pour une mise à jour', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    await service.definirVue({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      id: 'vue-1',
      nom: 'Ma vue renommée',
      ecran: 'listeTravail',
      versionFiltres: 1,
      parDefaut: true,
      filtres: { groupeId: 'g2' },
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_vue',
      expect.objectContaining({ id: 'vue-1', parDefaut: true }),
    );
  });

  it('invoque supprimer_vue avec les paramètres fournis et renvoie la racine native', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    const resultat = await service.supprimerVue({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      id: 'vue-1',
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith('supprimer_vue', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      id: 'vue-1',
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ versionSchema: 2 });
  });
});
