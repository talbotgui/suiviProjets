// Test du client typé de la Façade de commandes dédié à la Phase 8 (cf. facade-alertes.service.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { FacadeAlertesService } from './facade-alertes.service';

// `isTauri` toujours vrai ici : ce test exerce le passage réel par `invoke` (cf. `InvocationCommandeUtils`), sur
// le modèle de `facade-administration.service.spec.ts` (Phase 12 : ce service route désormais via
// `InvocationCommandeUtils` plutôt que d'appeler `invoke` directement).
jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);
const isTauriSimule = jest.mocked(isTauri);

describe('FacadeAlertesService', () => {
  let service: FacadeAlertesService;

  beforeEach(() => {
    invokeSimule.mockReset();
    isTauriSimule.mockReturnValue(true);
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

  it('invoque supprimer_annotation avec les paramètres fournis et renvoie la racine native', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    const resultat = await service.supprimerAnnotation({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      groupeId: 'g1',
      projetId: 'p1',
      annotationId: 'a1',
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith('supprimer_annotation', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      groupeId: 'g1',
      projetId: 'p1',
      annotationId: 'a1',
      motDePasse: 'mot-de-passe',
    });
    expect(resultat).toEqual({ versionSchema: 2 });
  });

  it('invoque supprimer_annotation sans projetId pour une annotation de portée groupe', async () => {
    invokeSimule.mockResolvedValue({ versionSchema: 2 });

    await service.supprimerAnnotation({
      chemin: '/tmp/donnees-test.sqm',
      donnees: { versionSchema: 1 },
      groupeId: 'g1',
      projetId: undefined,
      annotationId: 'a1',
      motDePasse: 'mot-de-passe',
    });

    expect(invokeSimule).toHaveBeenCalledWith(
      'supprimer_annotation',
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
