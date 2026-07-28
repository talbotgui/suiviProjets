// Test du client typé de la Façade de commandes dédié à la Phase 8 (cf. facade-alertes.service.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { FacadeAlertesService } from './facade-alertes.service';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

const invokeSimule = jest.mocked(invoke);

describe('FacadeAlertesService', () => {
  let service: FacadeAlertesService;

  beforeEach(() => {
    invokeSimule.mockReset();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FacadeAlertesService);
  });

  it('invoque creer_annotation avec les paramètres fournis et renvoie la racine native', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    const resultat = await service.creerAnnotation({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      groupeId: 'g1',
      projetId: 'p1',
      date: '2026-07-27',
      libelle: 'Migration majeure',
      categorie: 'technique',
      description: 'Détail de la migration',
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith('creer_annotation', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      groupeId: 'g1',
      projetId: 'p1',
      date: '2026-07-27',
      libelle: 'Migration majeure',
      categorie: 'technique',
      description: 'Détail de la migration',
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ versionSchema: 2 });
  });

  it('invoque creer_annotation sans projetId pour une annotation de portée groupe', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    await service.creerAnnotation({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      groupeId: 'g1',
      projetId: undefined,
      date: '2026-07-27',
      libelle: 'Rupture de charge',
      categorie: 'incident',
      description: undefined,
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith(
      'creer_annotation',
      expect.objectContaining({ groupeId: 'g1', projetId: undefined }),
    );
  });

  it('invoque qualifier_alerte avec les paramètres fournis et renvoie la racine native', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    const resultat = await service.qualifierAlerte({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      cleAlerte: 'membreInconnu|p1|alice',
      statut: 'traitee',
      commentaire: 'Qualifié comme partenaire',
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith('qualifier_alerte', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      cleAlerte: 'membreInconnu|p1|alice',
      statut: 'traitee',
      commentaire: 'Qualifié comme partenaire',
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ versionSchema: 2 });
  });
});
