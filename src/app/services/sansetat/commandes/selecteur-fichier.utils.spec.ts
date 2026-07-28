// Test du point de passage unique vers save()/open() (cf. selecteur-fichier.utils.ts), généré avec l'assistance
// de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { SelecteurFichierUtils } from './selecteur-fichier.utils';

jest.mock('@tauri-apps/api/core', () => ({ isTauri: jest.fn() }));
jest.mock('@tauri-apps/plugin-dialog', () => ({ open: jest.fn(), save: jest.fn() }));

const isTauriSimule = jest.mocked(isTauri);
const saveSimule = jest.mocked(save);
const openSimule = jest.mocked(open);

describe('SelecteurFichierUtils', () => {
  beforeEach(() => {
    isTauriSimule.mockReset();
    saveSimule.mockReset();
    openSimule.mockReset();
  });

  it('doit déléguer à save() en contexte Tauri', async () => {
    isTauriSimule.mockReturnValue(true);
    saveSimule.mockResolvedValue('/chemin/choisi.sqm');

    const resultat = await SelecteurFichierUtils.choisirEmplacementCreation({
      defaultPath: 'defaut.sqm',
    });

    expect(saveSimule).toHaveBeenCalledWith({ defaultPath: 'defaut.sqm' });
    expect(resultat).toBe('/chemin/choisi.sqm');
  });

  it('ne doit jamais appeler save() hors contexte Tauri, et renvoyer un chemin fictif', async () => {
    isTauriSimule.mockReturnValue(false);

    const resultat = await SelecteurFichierUtils.choisirEmplacementCreation({
      defaultPath: 'defaut.sqm',
    });

    expect(saveSimule).not.toHaveBeenCalled();
    expect(resultat).toBe('/bouchon/donnees-test.sqm');
  });

  it('doit déléguer à open() en contexte Tauri', async () => {
    isTauriSimule.mockReturnValue(true);
    openSimule.mockResolvedValue('/chemin/existant.sqm');

    const resultat = await SelecteurFichierUtils.choisirFichierChargement({ multiple: false });

    expect(openSimule).toHaveBeenCalledWith({ multiple: false });
    expect(resultat).toBe('/chemin/existant.sqm');
  });

  it('ne doit jamais appeler open() hors contexte Tauri, et renvoyer un chemin fictif', async () => {
    isTauriSimule.mockReturnValue(false);

    const resultat = await SelecteurFichierUtils.choisirFichierChargement({ multiple: false });

    expect(openSimule).not.toHaveBeenCalled();
    expect(resultat).toBe('/bouchon/donnees-test.sqm');
  });
});
