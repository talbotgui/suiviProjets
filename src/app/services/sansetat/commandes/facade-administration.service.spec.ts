// Test du client typé de la Façade de commandes dédié à la Phase 4 (cf. facade-administration.service.ts), généré
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { FacadeAdministrationService } from './facade-administration.service';

// `isTauri` toujours vrai ici : ce test exerce le passage réel par `invoke` (cf. `InvocationCommandeUtils`), sur
// le modèle de `facade-commandes.service.spec.ts`.
jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);
const isTauriSimule = jest.mocked(isTauri);

describe('FacadeAdministrationService', () => {
  let service: FacadeAdministrationService;

  beforeEach(() => {
    invokeSimule.mockReset();
    isTauriSimule.mockReturnValue(true);
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
      partiLe: undefined,
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
      partiLe: undefined,
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

  it('invoque calculer_metriques_volumetrie avec chemin + donnees et renvoie les métriques natives (US-055)', async () => {
    const metriques = {
      tailleDisqueOctets: 2_400_000,
      tailleJsonClairOctets: 1_000_000,
      ventilation: {
        parametrageOctets: 300_000,
        journalOctets: 100_000,
        administrationOctets: 250_000,
        auditsOctets: 200_000,
        autreOctets: 150_000,
      },
    };
    invokeSimule.mockResolvedValue(metriques);

    const resultat = await service.calculerMetriquesVolumetrie({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 10 },
    });

    expect(invokeSimule).toHaveBeenCalledWith('calculer_metriques_volumetrie', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 10 },
    });
    expect(resultat).toEqual(metriques);
  });

  it('transmet chemin: null à calculer_metriques_volumetrie pour un fichier jamais sauvegardé', async () => {
    invokeSimule.mockResolvedValue({
      tailleDisqueOctets: null,
      tailleJsonClairOctets: 42,
      ventilation: {
        parametrageOctets: 0,
        journalOctets: 0,
        administrationOctets: 0,
        auditsOctets: 0,
        autreOctets: 42,
      },
    });

    await service.calculerMetriquesVolumetrie({ chemin: null, donnees: { versionSchema: 10 } });

    expect(invokeSimule).toHaveBeenCalledWith('calculer_metriques_volumetrie', {
      chemin: null,
      donnees: { versionSchema: 10 },
    });
  });

  it('invoque calculer_prise_en_charge_projet avec projetId + donnees et renvoie la structure native (US-058)', async () => {
    const premierCommit = {
      statut: 'determine',
      date: '2021-03-15',
      sha: 'a1b2c3d4',
      emailAuteur: 'julien.petit@entreprise.fr',
      calculeLe: '2026-09-03',
      empreinteReferentiel: 'sha256:4fd19ab0',
    };
    invokeSimule.mockResolvedValue(premierCommit);

    const resultat = await service.calculerPriseEnChargeProjet({
      projetId: 'projet-1',
      donnees: { versionSchema: 11 },
    });

    expect(invokeSimule).toHaveBeenCalledWith('calculer_prise_en_charge_projet', {
      projetId: 'projet-1',
      donnees: { versionSchema: 11 },
    });
    expect(resultat).toEqual(premierCommit);
  });

  it('invoque empreinte_referentiel_interne avec groupeId + donnees et renvoie le condensé natif (US-058)', async () => {
    invokeSimule.mockResolvedValue('sha256:4fd19ab0');

    const resultat = await service.empreinteReferentielInterne({
      groupeId: 'groupe-1',
      donnees: { versionSchema: 11 },
    });

    expect(invokeSimule).toHaveBeenCalledWith('empreinte_referentiel_interne', {
      groupeId: 'groupe-1',
      donnees: { versionSchema: 11 },
    });
    expect(resultat).toBe('sha256:4fd19ab0');
  });
});
