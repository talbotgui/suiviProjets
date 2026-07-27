// Test du client typé de la Façade de commandes dédié à la Phase 7, incréments 1 et 4 (cf.
// facade-parametrage.service.ts), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { FacadeParametrageService } from './facade-parametrage.service';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

const invokeSimule = jest.mocked(invoke);

describe('FacadeParametrageService', () => {
  let service: FacadeParametrageService;

  beforeEach(() => {
    invokeSimule.mockReset();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacadeParametrageService);
  });

  it('invoque definir_seuil avec les paramètres fournis et renvoie la racine native', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    const resultat = await service.definirSeuil({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      cle: 'vitalite.mortJours',
      valeur: 400,
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith('definir_seuil', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      cle: 'vitalite.mortJours',
      valeur: 400,
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ versionSchema: 2 });
  });

  it('invoque definir_referentiel avec les paramètres fournis et renvoie la racine native', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    const resultat = await service.definirReferentiel({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      typeReferentiel: 'reglesDependances',
      entree: { id: 'd1', motif: 'moment', versions: [] },
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith('definir_referentiel', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      typeReferentiel: 'reglesDependances',
      entree: { id: 'd1', motif: 'moment', versions: [] },
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ versionSchema: 2 });
  });

  it('invoque previsualiser_purge_densite avec les paramètres fournis et renvoie le résumé natif', async () => {
    invokeSimule.mockResolvedValue({ nbAuditsSupprimes: 3, nbProjetsConcernes: 1 });

    const resultat = await service.previsualiserPurgeDensite({ donnees: { versionSchema: 1 } });

    expect(invokeSimule).toHaveBeenCalledWith('previsualiser_purge_densite', {
      donnees: { versionSchema: 1 },
    });
    expect(resultat).toEqual({ nbAuditsSupprimes: 3, nbProjetsConcernes: 1 });
  });

  it('invoque executer_purge_densite avec les paramètres fournis et renvoie la racine native', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    const resultat = await service.executerPurgeDensite({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith('executer_purge_densite', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ versionSchema: 2 });
  });

  it('invoque previsualiser_purge_age avec les paramètres fournis et renvoie le résumé natif', async () => {
    invokeSimule.mockResolvedValue({ nbAuditsSupprimes: 5, nbProjetsConcernes: 2 });

    const resultat = await service.previsualiserPurgeAge({
      donnees: { versionSchema: 1 },
      mode: 'agregationMensuelle',
    });

    expect(invokeSimule).toHaveBeenCalledWith('previsualiser_purge_age', {
      donnees: { versionSchema: 1 },
      mode: 'agregationMensuelle',
    });
    expect(resultat).toEqual({ nbAuditsSupprimes: 5, nbProjetsConcernes: 2 });
  });

  it('invoque executer_purge_age avec les paramètres fournis et renvoie la racine native', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    const resultat = await service.executerPurgeAge({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      mode: 'suppression',
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith('executer_purge_age', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      mode: 'suppression',
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ versionSchema: 2 });
  });
});
