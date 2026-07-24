// Test de l'onglet Sources de l'écran Administration (cf. sources-admin.component.ts), généré avec l'assistance
// de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { TypeSource } from '../../../services/avecetat/etat/types-donnees';
import { FacadeCommandesService } from '../../../services/sansetat/commandes/facade-commandes.service';
import { TypeInstance } from '../../../services/sansetat/commandes/types-facade';
import { SqmSourcesAdminComponent } from './sources-admin.component';

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine minimale, vide de tout groupe.
   * @returns Une racine de test.
   */
  public static racineVide(): DonneesRacine {
    return {
      versionSchema: 1,
      meta: {
        creeLe: '2026-07-20T08:00:00Z',
        modifieLe: '2026-07-20T08:00:00Z',
        application: 'Test',
      },
      groupes: [],
      referentiels: {},
      parametres: {},
      campagnes: [],
      brouillon: null,
      traitementsAlertes: [],
      journal: [],
      vuesEnregistrees: [],
    };
  }
}

describe('SqmSourcesAdminComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let groupeId: string;
  let projetId: string;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmSourcesAdminComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    groupeId = donneesApplication.creerGroupe({
      nom: 'Socle Comptable',
      description: '',
      instances: [
        {
          id: 'instance-gitlab',
          type: TypeInstance.Gitlab,
          nom: 'gitlab-prod',
          urlBase: 'https://gitlab.test',
        },
      ],
    });
    projetId = donneesApplication.creerProjet(groupeId, {
      nom: 'API Facturation',
      description: '',
    });
  });

  it("n'affiche aucune source tant qu'aucun projet n'est sélectionné", () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;

    expect(composant.sources()).toEqual([]);
  });

  it('propose uniquement les instances compatibles avec le type de source sélectionné', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    composant.ouvrirCreation();

    expect(composant.instancesCompatibles()).toHaveLength(1);

    composant.changerType(TypeSource.ProjetSonar);

    expect(composant.instancesCompatibles()).toEqual([]);
    expect(composant.instanceId).toBe('');
  });

  it('refuse la création sans instance sélectionnée', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    composant.ouvrirCreation();
    composant.idExterne = '1234';

    composant.enregistrer();

    expect(composant.messageErreur).toBe('Une instance doit être sélectionnée.');
    expect(composant.sources()).toEqual([]);
  });

  it('crée une source avec ref auditée', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    composant.ouvrirCreation();
    composant.instanceId = 'instance-gitlab';
    composant.idExterne = '1234';
    composant.refAuditee = 'develop';

    composant.enregistrer();

    expect(composant.sources()).toHaveLength(1);
    expect(composant.sources()[0].refAuditee).toBe('develop');
    expect(composant.formulaireVisible).toBe(false);
  });

  it('crée une source sans ref auditée (branche par défaut du dépôt)', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    composant.ouvrirCreation();
    composant.instanceId = 'instance-gitlab';
    composant.idExterne = '1234';

    composant.enregistrer();

    expect(composant.sources()[0].refAuditee).toBeUndefined();
  });

  it('modifie une source existante et journalise le changement de ref auditée (RG-023)', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    const sourceId = donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: 'develop',
    });

    composant.ouvrirEdition(sourceId);
    composant.refAuditee = 'main';
    composant.enregistrer();

    expect(composant.sources()[0].refAuditee).toBe('main');
    expect(donneesApplication.racine()?.journal).toHaveLength(1);
  });

  it('supprime une source après confirmation', () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    const sourceId = donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: undefined,
    });

    composant.demanderSuppression(sourceId);
    composant.confirmerSuppression();

    expect(composant.sources()).toEqual([]);
  });

  it('propose des branches après un court silence de saisie (US-008)', async () => {
    jest.useFakeTimers();
    const facade = TestBed.inject(FacadeCommandesService);
    const interroger = jest
      .spyOn(facade, 'interrogerBranches')
      .mockResolvedValue({ type: 'succes', branches: ['main', 'develop'] });

    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    composant.ouvrirCreation();
    composant.instanceId = 'instance-gitlab';
    composant.idExterne = '1234';
    composant.refAuditee = 'dev';

    composant.rechercherBranches();
    jest.advanceTimersByTime(300);
    await Promise.resolve();
    await Promise.resolve();

    expect(interroger).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'instance-gitlab' }),
      '1234',
      'dev',
    );
    expect(composant.suggestionsBranches).toEqual(['main', 'develop']);
    jest.useRealTimers();
  });

  it("signale l'absence de credential plutôt que de proposer des branches (US-008)", async () => {
    jest.useFakeTimers();
    const facade = TestBed.inject(FacadeCommandesService);
    jest.spyOn(facade, 'interrogerBranches').mockResolvedValue({
      type: 'echec',
      anomalie: {
        type: 'credentialAbsent',
        message: 'Aucun credential en mémoire pour cette instance',
      },
    });

    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    composant.ouvrirCreation();
    composant.instanceId = 'instance-gitlab';
    composant.idExterne = '1234';

    composant.rechercherBranches();
    jest.advanceTimersByTime(300);
    await Promise.resolve();
    await Promise.resolve();

    expect(composant.credentialAbsent).toBe(true);
    expect(composant.suggestionsBranches).toEqual([]);
    jest.useRealTimers();
  });

  it("n'interroge pas les branches pour une source Sonar", () => {
    const composant = TestBed.createComponent(SqmSourcesAdminComponent).componentInstance;
    const facade = TestBed.inject(FacadeCommandesService);
    const interroger = jest.spyOn(facade, 'interrogerBranches');
    composant.selectionnerGroupe(groupeId);
    composant.selectionnerProjet(projetId);
    composant.ouvrirCreation();
    composant.changerType(TypeSource.ProjetSonar);

    composant.rechercherBranches();

    expect(interroger).not.toHaveBeenCalled();
  });
});
