// Test du client typé de la Façade de commandes (cf. facade-commandes.service.ts), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { FacadeCommandesService } from './facade-commandes.service';
import { TypeInstance } from './types-facade';
import type { Instance } from './types-facade';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

const invokeSimule = jest.mocked(invoke);

const INSTANCE_GITLAB: Instance = {
  id: 'instance-1',
  type: TypeInstance.Gitlab,
  nom: 'GitLab interne',
  urlBase: 'https://gitlab.exemple.test',
};

describe('FacadeCommandesService', () => {
  let service: FacadeCommandesService;

  beforeEach(() => {
    invokeSimule.mockReset();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacadeCommandesService);
  });

  it('doit invoquer tester_connectivite avec l’instance et le credential fournis', async () => {
    invokeSimule.mockResolvedValue({ porteeExcessive: false });

    const resultat = await service.testerConnectivite(INSTANCE_GITLAB, 'jeton-secret');

    expect(invokeSimule).toHaveBeenCalledWith('tester_connectivite', {
      instance: INSTANCE_GITLAB,
      credential: 'jeton-secret',
    });
    expect(resultat).toEqual({ type: 'succes', verdict: { porteeExcessive: false } });
  });

  it('doit remonter le verdict de portée excessive', async () => {
    invokeSimule.mockResolvedValue({ porteeExcessive: true });

    const resultat = await service.testerConnectivite(INSTANCE_GITLAB, 'jeton-large');

    expect(resultat).toEqual({ type: 'succes', verdict: { porteeExcessive: true } });
  });

  it('doit convertir un rejet typé en Résultat « echec »', async () => {
    invokeSimule.mockRejectedValue({ type: 'authentificationRefusee' });

    const resultat = await service.testerConnectivite(INSTANCE_GITLAB, 'jeton-invalide');

    expect(resultat).toEqual({
      type: 'echec',
      anomalie: { type: 'authentificationRefusee' },
    });
  });

  it('doit convertir un rejet non-objet en anomalie « reponseInattendue »', async () => {
    invokeSimule.mockRejectedValue('erreur non structurée');

    const resultat = await service.testerConnectivite(INSTANCE_GITLAB, 'jeton');

    expect(resultat).toEqual({
      type: 'echec',
      anomalie: { type: 'reponseInattendue' },
    });
  });

  it('doit convertir un rejet objet sans champ type en anomalie « reponseInattendue »', async () => {
    invokeSimule.mockRejectedValue({ message: 'erreur sans discriminant' });

    const resultat = await service.testerConnectivite(INSTANCE_GITLAB, 'jeton');

    expect(resultat).toEqual({
      type: 'echec',
      anomalie: { type: 'reponseInattendue' },
    });
  });

  it('doit convertir un rejet à catégorie inconnue en anomalie « reponseInattendue »', async () => {
    invokeSimule.mockRejectedValue({ type: 'categorieInconnue' });

    const resultat = await service.testerConnectivite(INSTANCE_GITLAB, 'jeton');

    expect(resultat).toEqual({
      type: 'echec',
      anomalie: { type: 'reponseInattendue' },
    });
  });

  it.each([
    'instanceInjoignable',
    'delaiDepasse',
    'reponseInattendue',
    'droitsInsuffisants',
    'credentialAbsent',
  ] as const)('doit reconnaître la catégorie d’anomalie « %s »', async (categorie) => {
    invokeSimule.mockRejectedValue({ type: categorie });

    const resultat = await service.testerConnectivite(INSTANCE_GITLAB, 'jeton');

    expect(resultat).toEqual({ type: 'echec', anomalie: { type: categorie } });
  });

  it('doit invoquer definir_credentials avec la map de credentials fournie', async () => {
    invokeSimule.mockResolvedValue(undefined);

    await service.definirCredentials({ 'instance-1': 'jeton-1' });

    expect(invokeSimule).toHaveBeenCalledWith('definir_credentials', {
      credentials: { 'instance-1': 'jeton-1' },
    });
  });

  it('doit invoquer interroger_branches avec l’instance, l’identifiant externe et le terme de recherche', async () => {
    invokeSimule.mockResolvedValue(['main', 'develop']);

    const resultat = await service.interrogerBranches(INSTANCE_GITLAB, '1234', 'dev');

    expect(invokeSimule).toHaveBeenCalledWith('interroger_branches', {
      instance: INSTANCE_GITLAB,
      idExterne: '1234',
      recherche: 'dev',
    });
    expect(resultat).toEqual({ type: 'succes', branches: ['main', 'develop'] });
  });

  it('doit convertir un rejet « credentialAbsent » en Résultat « echec » pour interroger_branches', async () => {
    invokeSimule.mockRejectedValue({ type: 'credentialAbsent' });

    const resultat = await service.interrogerBranches(INSTANCE_GITLAB, '1234');

    expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'credentialAbsent' } });
  });

  it('doit convertir un rejet non structuré en anomalie « reponseInattendue » pour interroger_branches', async () => {
    invokeSimule.mockRejectedValue('erreur non structurée');

    const resultat = await service.interrogerBranches(INSTANCE_GITLAB, '1234');

    expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'reponseInattendue' } });
  });
});
