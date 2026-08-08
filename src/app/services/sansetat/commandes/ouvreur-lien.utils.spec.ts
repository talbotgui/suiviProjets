// Test du point de passage unique vers openUrl() (cf. ouvreur-lien.utils.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { isTauri } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { OuvreurLienUtils } from './ouvreur-lien.utils';

jest.mock('@tauri-apps/api/core', () => ({ isTauri: jest.fn() }));
jest.mock('@tauri-apps/plugin-opener', () => ({ openUrl: jest.fn() }));

const isTauriSimule = jest.mocked(isTauri);
const openUrlSimule = jest.mocked(openUrl);

describe('OuvreurLienUtils', () => {
  beforeEach(() => {
    isTauriSimule.mockReset();
    openUrlSimule.mockReset();
  });

  it('doit déléguer à openUrl() en contexte Tauri', async () => {
    isTauriSimule.mockReturnValue(true);

    await OuvreurLienUtils.ouvrir('https://github.com/talbotgui/suiviProjets');

    expect(openUrlSimule).toHaveBeenCalledWith('https://github.com/talbotgui/suiviProjets');
  });

  it('ne doit jamais appeler openUrl() hors contexte Tauri', async () => {
    isTauriSimule.mockReturnValue(false);

    await OuvreurLienUtils.ouvrir('https://github.com/talbotgui/suiviProjets');

    expect(openUrlSimule).not.toHaveBeenCalled();
  });
});
