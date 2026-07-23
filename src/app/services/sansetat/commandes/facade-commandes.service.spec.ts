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

const INSTANCE_SONAR: Instance = {
  id: 'instance-2',
  type: TypeInstance.Sonar,
  nom: 'Sonar interne',
  urlBase: 'https://sonar.exemple.test',
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

  describe('opérations d’interrogation d’indicateurs GitLab (Phase 5)', () => {
    it.each([
      ['interrogerVitalite', 'interroger_vitalite'],
      ['interrogerTailleDepot', 'interroger_taille_depot'],
      ['interrogerContributeurs', 'interroger_contributeurs'],
      ['interrogerMergeRequests', 'interroger_merge_requests'],
      ['interrogerMembres', 'interroger_membres'],
    ] as const)(
      '%s doit invoquer %s avec l’instance, la source, l’identifiant externe et la ref auditée',
      async (methode, commande) => {
        invokeSimule.mockResolvedValue({ sourceId: 'source-1' });

        const resultat = await service[methode](INSTANCE_GITLAB, 'source-1', '1234', 'develop');

        expect(invokeSimule).toHaveBeenCalledWith(commande, {
          instance: INSTANCE_GITLAB,
          sourceId: 'source-1',
          idExterne: '1234',
          refAuditee: 'develop',
        });
        expect(resultat).toEqual({ type: 'succes', resultat: { sourceId: 'source-1' } });
      },
    );

    it.each([
      'interrogerVitalite',
      'interrogerTailleDepot',
      'interrogerContributeurs',
      'interrogerMergeRequests',
      'interrogerMembres',
    ] as const)(
      '%s doit convertir un rejet « refIntrouvable » en Résultat « echec »',
      async (methode) => {
        invokeSimule.mockRejectedValue({ type: 'refIntrouvable' });

        const resultat = await service[methode](INSTANCE_GITLAB, 'source-1', '1234');

        expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'refIntrouvable' } });
      },
    );
  });

  describe('opérations d’interrogation d’indicateurs Sonar (Phase 5)', () => {
    it.each([
      ['interrogerViolations', 'interroger_violations'],
      ['interrogerDette', 'interroger_dette'],
      ['interrogerCouverture', 'interroger_couverture'],
      ['interrogerNotes', 'interroger_notes'],
      ['interrogerNcloc', 'interroger_ncloc'],
    ] as const)(
      '%s doit invoquer %s avec l’instance, la source et l’identifiant externe',
      async (methode, commande) => {
        invokeSimule.mockResolvedValue({ sourceId: 'source-2' });

        const resultat = await service[methode](INSTANCE_SONAR, 'source-2', 'proj-key');

        expect(invokeSimule).toHaveBeenCalledWith(commande, {
          instance: INSTANCE_SONAR,
          sourceId: 'source-2',
          idExterne: 'proj-key',
        });
        expect(resultat).toEqual({ type: 'succes', resultat: { sourceId: 'source-2' } });
      },
    );

    it.each([
      'interrogerViolations',
      'interrogerDette',
      'interrogerCouverture',
      'interrogerNotes',
      'interrogerNcloc',
    ] as const)(
      '%s doit convertir un rejet non structuré en anomalie « reponseInattendue »',
      async (methode) => {
        invokeSimule.mockRejectedValue('erreur non structurée');

        const resultat = await service[methode](INSTANCE_SONAR, 'source-2', 'proj-key');

        expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'reponseInattendue' } });
      },
    );
  });

  describe('interrogerDerniereAnalyse (Phase 5, incrément 3)', () => {
    it('doit invoquer interroger_derniere_analyse avec l’instance et l’identifiant externe', async () => {
      invokeSimule.mockResolvedValue('2026-07-08T10:15:00+0000');

      const resultat = await service.interrogerDerniereAnalyse(INSTANCE_SONAR, 'proj-key');

      expect(invokeSimule).toHaveBeenCalledWith('interroger_derniere_analyse', {
        instance: INSTANCE_SONAR,
        idExterne: 'proj-key',
      });
      expect(resultat).toEqual({ type: 'succes', resultat: '2026-07-08T10:15:00+0000' });
    });

    it('doit remonter `null` pour un projet jamais analysé', async () => {
      invokeSimule.mockResolvedValue(null);

      const resultat = await service.interrogerDerniereAnalyse(INSTANCE_SONAR, 'proj-key');

      expect(resultat).toEqual({ type: 'succes', resultat: null });
    });

    it('doit convertir un rejet typé « droitsInsuffisants » en Résultat « echec »', async () => {
      invokeSimule.mockRejectedValue({ type: 'droitsInsuffisants' });

      const resultat = await service.interrogerDerniereAnalyse(INSTANCE_SONAR, 'proj-key');

      expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'droitsInsuffisants' } });
    });
  });
});
