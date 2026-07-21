// Test du client typé de la Façade de commandes dédié à la Phase 4 (cf. facade-administration.service.ts), généré
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { FacadeAdministrationService } from './facade-administration.service';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

const invokeSimule = jest.mocked(invoke);

describe('FacadeAdministrationService', () => {
  let service: FacadeAdministrationService;

  beforeEach(() => {
    invokeSimule.mockReset();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacadeAdministrationService);
  });

  it('invoque qualifier_membre avec les paramètres fournis et renvoie la réponse native', async () => {
    invokeSimule.mockResolvedValue({ donnees: { versionSchema: 1 }, membresEnConflit: ['m1'] });

    const resultat = await service.qualifierMembre({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      groupeId: 'g1',
      membreId: undefined,
      critere: 'alice',
      typeCritere: 'username',
      statut: 'interne',
      libelle: undefined,
      aliasEmail: undefined,
      origine: 'Administration',
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith('qualifier_membre', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      groupeId: 'g1',
      membreId: undefined,
      critere: 'alice',
      typeCritere: 'username',
      statut: 'interne',
      libelle: undefined,
      aliasEmail: undefined,
      origine: 'Administration',
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ donnees: { versionSchema: 1 }, membresEnConflit: ['m1'] });
  });

  it('invoque definir_politique_ia avec les paramètres fournis et renvoie la racine native', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    const resultat = await service.definirPolitiqueIA({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      groupeId: 'g1',
      projetId: 'p1',
      iaAutorisee: true,
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith('definir_politique_ia', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      groupeId: 'g1',
      projetId: 'p1',
      iaAutorisee: true,
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ versionSchema: 2 });
  });

  it('invoque supprimer_membre_connu avec les paramètres fournis et renvoie la racine native', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 3 });

    const resultat = await service.supprimerMembreConnu({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      groupeId: 'g1',
      membreId: 'm1',
      origine: 'Administration',
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith('supprimer_membre_connu', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      groupeId: 'g1',
      membreId: 'm1',
      origine: 'Administration',
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ versionSchema: 3 });
  });
});
