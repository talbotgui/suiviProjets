// Test du client typé de la Façade de commandes dédié au cycle de vie du fichier (cf. facade-fichier.service.ts),
// généré avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { FacadeFichierService } from './facade-fichier.service';

// `isTauri` toujours vrai ici : ce test exerce le passage réel par `invoke` (cf. `InvocationCommandeUtils`), le
// bouchon TS activé hors contexte Tauri étant couvert par `bouchon-fichier.utils.spec.ts`.
jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);
const isTauriSimule = jest.mocked(isTauri);

describe('FacadeFichierService', () => {
  let service: FacadeFichierService;

  beforeEach(() => {
    invokeSimule.mockReset();
    isTauriSimule.mockReturnValue(true);
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacadeFichierService);
  });

  it('invoque creer_fichier avec le chemin et le mot de passe fournis et renvoie la racine native', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 1 });

    const resultat = await service.creerFichier('/tmp/donnees-test.sqm', 'mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith('creer_fichier', {
      chemin: '/tmp/donnees-test.sqm',
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ versionSchema: 1 });
  });

  it('invoque charger_fichier avec le chemin et le mot de passe fournis et renvoie la racine native', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    const resultat = await service.chargerFichier('/tmp/donnees-test.sqm', 'mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith('charger_fichier', {
      chemin: '/tmp/donnees-test.sqm',
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ versionSchema: 2 });
  });

  it('invoque sauvegarder_fichier avec le chemin, les données et le mot de passe fournis', async () => {
    invokeSimule.mockResolvedValue(undefined);

    await service.sauvegarderFichier('/tmp/donnees-test.sqm', { versionSchema: 1 }, 'mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith('sauvegarder_fichier', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      motDePasse: 'mot-de-passe',
    });
  });

  it('invoque verrouiller_session sans paramètre', async () => {
    invokeSimule.mockResolvedValue(undefined);

    await service.verrouillerSession();

    expect(invokeSimule).toHaveBeenCalledWith('verrouiller_session', {});
  });

  it('invoque deverrouiller_session avec le mot de passe fourni', async () => {
    invokeSimule.mockResolvedValue(undefined);

    await service.deverrouillerSession('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith('deverrouiller_session', {
      motDePasse: 'mot-de-passe',
    });
  });
});
