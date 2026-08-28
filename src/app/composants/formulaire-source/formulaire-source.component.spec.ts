// Test du formulaire réutilisable de source (cf. formulaire-source.component.ts), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
//
// Cas déjà couverts par `sources-admin.component.spec.ts` avant l'extraction du composant (C11-01), migrés ici à
// l'identique, plus les nouveaux cas propres au composant partagé (`estVide`, `reinitialiser`, `sourceAModifier`,
// `actionsVisibles`).
import { TestBed } from '@angular/core/testing';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import type { DonneesRacine } from '../../services/avecetat/etat/types-donnees';
import { TypeSource } from '../../services/avecetat/etat/types-donnees';
import { FacadeCommandesService } from '../../services/sansetat/commandes/facade-commandes.service';
import { TypeInstance } from '../../services/sansetat/commandes/types-facade';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmFormulaireSourceComponent } from './formulaire-source.component';

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
      referentiels: {
        reglesDependances: [],
        reglesMarqueursIA: [],
        motifNommageBranches: '',
        categoriesDependances: [],
      },
      parametres: {
        seuils: {
          vitalite: { mourantJours: 180, mortJours: 365 },
          tailleDepot: { borneS: 20_000_000, borneL: 100_000_000, borneXL: 500_000_000 },
          couverture: { seuilRouge: 40, seuilOrange: 60 },
          fraicheurSonar: { toleranceJours: 7 },
          activiteSansQualite: { minCommits: 20, minNouvellesViolations: 10 },
          fraicheurAudit: { ancienJours: 30 },
          mrOuvertes: { ageOrangeJours: 30, ageRougeJours: 90, pourcentageConflitRouge: 50 },
          couleursViolations: {
            bloquant: { seuilOrange: 1, seuilRouge: 3 },
            critique: { seuilOrange: 10, seuilRouge: 25 },
          },
          materialiteBrouillon: { variationRelative: 0.1 },
        },
        verrouillage: { delaiInactiviteMinutes: 15, echecsAvantFermeture: 5 },
        audit: { concurrence: 4 },
        proxy: {},
        sauvegarde: { nombreSauvegardesSecurite: 5 },
        seuilAvertissementTailleOctets: 10_485_760,
      },
      campagnes: [],
      brouillon: null,
      traitementsAlertes: [],
      journal: [],
      vuesEnregistrees: [],
    };
  }
}

describe('SqmFormulaireSourceComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let groupeId: string;
  let projetId: string;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmFormulaireSourceComponent],
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

  it('propose uniquement les instances compatibles avec le type de source sélectionné', () => {
    const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
    fixture.componentRef.setInput('groupeId', groupeId);
    fixture.componentRef.setInput('projetId', projetId);
    const composant = fixture.componentInstance;

    expect(composant.instancesCompatibles()).toHaveLength(1);

    composant.changerType(TypeSource.ProjetSonar);

    expect(composant.instancesCompatibles()).toEqual([]);
    expect(composant.instanceId()).toBe('');
  });

  it('refuse la création sans instance sélectionnée', () => {
    const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
    fixture.componentRef.setInput('groupeId', groupeId);
    fixture.componentRef.setInput('projetId', projetId);
    const composant = fixture.componentInstance;
    composant.idExterne.set('1234');

    const id = composant.enregistrer();

    expect(id).toBeNull();
    expect(composant.messageErreur).toBe('Une instance doit être sélectionnée.');
    expect(donneesApplication.racine()?.groupes[0]?.projets[0]?.sources).toEqual([]);
  });

  it('crée une source avec ref auditée', () => {
    const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
    fixture.componentRef.setInput('groupeId', groupeId);
    fixture.componentRef.setInput('projetId', projetId);
    const composant = fixture.componentInstance;
    composant.instanceId.set('instance-gitlab');
    composant.idExterne.set('1234');
    composant.refAuditee.set('develop');

    const id = composant.enregistrer();

    const sources = donneesApplication.racine()?.groupes[0]?.projets[0]?.sources ?? [];
    expect(sources).toHaveLength(1);
    expect(sources[0]?.refAuditee).toBe('develop');
    expect(id).toBe(sources[0]?.id);
  });

  it('crée une source sans ref auditée (branche par défaut du dépôt)', () => {
    const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
    fixture.componentRef.setInput('groupeId', groupeId);
    fixture.componentRef.setInput('projetId', projetId);
    const composant = fixture.componentInstance;
    composant.instanceId.set('instance-gitlab');
    composant.idExterne.set('1234');

    composant.enregistrer();

    const sources = donneesApplication.racine()?.groupes[0]?.projets[0]?.sources ?? [];
    expect(sources[0]?.refAuditee).toBeUndefined();
  });

  it('modifie une source existante et journalise le changement de ref auditée (RG-023)', () => {
    const sourceId = donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: 'develop',
    });
    const sourceExistante = donneesApplication
      .racine()
      ?.groupes[0]?.projets[0]?.sources.find((candidate) => candidate.id === sourceId);
    if (!sourceExistante) {
      throw new Error('Source de test introuvable.');
    }

    const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
    fixture.componentRef.setInput('groupeId', groupeId);
    fixture.componentRef.setInput('projetId', projetId);
    fixture.componentRef.setInput('sourceAModifier', sourceExistante);
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    composant.refAuditee.set('main');

    const id = composant.enregistrer();

    expect(id).toBe(sourceId);
    const sources = donneesApplication.racine()?.groupes[0]?.projets[0]?.sources ?? [];
    expect(sources[0]?.refAuditee).toBe('main');
    expect(donneesApplication.racine()?.journal).toHaveLength(1);
  });

  it('précharge le formulaire depuis sourceAModifier (mode édition)', () => {
    const sourceId = donneesApplication.creerSource(groupeId, projetId, {
      instanceId: 'instance-gitlab',
      type: TypeSource.DepotGitlab,
      idExterne: '1234',
      refAuditee: 'develop',
    });
    const sourceExistante = donneesApplication
      .racine()
      ?.groupes[0]?.projets[0]?.sources.find((candidate) => candidate.id === sourceId);
    if (!sourceExistante) {
      throw new Error('Source de test introuvable.');
    }

    const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
    fixture.componentRef.setInput('groupeId', groupeId);
    fixture.componentRef.setInput('projetId', projetId);
    fixture.componentRef.setInput('sourceAModifier', sourceExistante);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    expect(composant.instanceId()).toBe('instance-gitlab');
    expect(composant.idExterne()).toBe('1234');
    expect(composant.refAuditee()).toBe('develop');
  });

  it('propose des branches après un court silence de saisie (US-008)', async () => {
    jest.useFakeTimers();
    const facade = TestBed.inject(FacadeCommandesService);
    const interroger = jest
      .spyOn(facade, 'interrogerBranches')
      .mockResolvedValue({ type: 'succes', branches: ['main', 'develop'] });

    const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
    fixture.componentRef.setInput('groupeId', groupeId);
    fixture.componentRef.setInput('projetId', projetId);
    const composant = fixture.componentInstance;
    composant.instanceId.set('instance-gitlab');
    composant.idExterne.set('1234');
    composant.refAuditee.set('dev');

    composant.rechercherBranches();
    jest.advanceTimersByTime(300);
    await Promise.resolve();
    await Promise.resolve();

    expect(interroger).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'instance-gitlab' }),
      '1234',
      'dev',
    );
    expect(composant.suggestionsBranches()).toEqual(['main', 'develop']);
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

    const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
    fixture.componentRef.setInput('groupeId', groupeId);
    fixture.componentRef.setInput('projetId', projetId);
    const composant = fixture.componentInstance;
    composant.instanceId.set('instance-gitlab');
    composant.idExterne.set('1234');

    composant.rechercherBranches();
    jest.advanceTimersByTime(300);
    await Promise.resolve();
    await Promise.resolve();

    expect(composant.credentialAbsent()).toBe(true);
    expect(composant.suggestionsBranches()).toEqual([]);
    jest.useRealTimers();
  });

  it("n'interroge pas les branches pour une source Sonar", () => {
    const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
    fixture.componentRef.setInput('groupeId', groupeId);
    fixture.componentRef.setInput('projetId', projetId);
    const composant = fixture.componentInstance;
    const facade = TestBed.inject(FacadeCommandesService);
    const interroger = jest.spyOn(facade, 'interrogerBranches');
    composant.changerType(TypeSource.ProjetSonar);

    composant.rechercherBranches();

    expect(interroger).not.toHaveBeenCalled();
  });

  describe('estVide / reinitialiser (mini-flux guidé, C11-01)', () => {
    it('estVide est vrai tant qu’aucune instance ni identifiant externe ne sont saisis', () => {
      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;

      expect(composant.estVide()).toBe(true);

      composant.instanceId.set('instance-gitlab');

      expect(composant.estVide()).toBe(false);
    });

    it('reinitialiser remet Type/Instance/Identifiant/Ref à blanc sans modifier groupeId/projetId', () => {
      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;
      composant.instanceId.set('instance-gitlab');
      composant.type.set(TypeSource.ProjetSonar);
      composant.idExterne.set('1234');
      composant.refAuditee.set('develop');
      composant.messageErreur = 'une erreur';

      composant.reinitialiser();

      expect(composant.instanceId()).toBe('');
      expect(composant.type()).toBe(TypeSource.DepotGitlab);
      expect(composant.idExterne()).toBe('');
      expect(composant.refAuditee()).toBe('');
      expect(composant.messageErreur).toBeNull();
      expect(composant.groupeId()).toBe(groupeId);
      expect(composant.projetId()).toBe(projetId);
    });
  });

  describe('actionsVisibles / soumettre / annuler', () => {
    it('émet enregistree avec l’id après une soumission réussie', () => {
      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;
      const enregistree = jest.fn();
      composant.enregistree.subscribe(enregistree);
      composant.instanceId.set('instance-gitlab');
      composant.idExterne.set('1234');

      composant.soumettre();

      expect(enregistree).toHaveBeenCalledTimes(1);
    });

    it("n'émet pas enregistree si la validation échoue", () => {
      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;
      const enregistree = jest.fn();
      composant.enregistree.subscribe(enregistree);

      composant.soumettre();

      expect(enregistree).not.toHaveBeenCalled();
    });

    it('émet annulee via le bouton Annuler du pied de formulaire interne', () => {
      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;
      const annulee = jest.fn();
      composant.annulee.subscribe(annulee);

      composant.annuler();

      expect(annulee).toHaveBeenCalledTimes(1);
    });

    it('masque le pied de formulaire interne quand actionsVisibles vaut false', () => {
      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      fixture.componentRef.setInput('actionsVisibles', false);
      fixture.detectChanges();

      const elementNatif = DomTestUtils.obtenirElementNatif(fixture);
      expect(elementNatif.querySelector('.formulaire-source__actions')).toBeNull();
    });

    it('affiche le pied de formulaire interne par défaut (actionsVisibles à true)', () => {
      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      fixture.detectChanges();

      const elementNatif = DomTestUtils.obtenirElementNatif(fixture);
      expect(elementNatif.querySelector('.formulaire-source__actions')).not.toBeNull();
    });
  });

  describe('autocomplétion de l’identifiant externe (US-008, RG-036, C11-02)', () => {
    it('n’invoque aucun appel réseau à la seule sélection de l’instance (RG-036, évolution du 2026-08-25)', () => {
      const facade = TestBed.inject(FacadeCommandesService);
      const lister = jest.spyOn(facade, 'listerSourcesDisponibles');

      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;
      fixture.detectChanges();

      composant.selectionnerInstance('instance-gitlab');

      expect(lister).not.toHaveBeenCalled();
      expect(composant.sourcesDisponibles()).toEqual([]);

      const elementNatif = DomTestUtils.obtenirElementNatif(fixture);
      const champRecherche = elementNatif.querySelector('app-champ-recherche-riche');
      expect(champRecherche).not.toBeNull();
      expect(champRecherche?.querySelector('#formulaire-source-champ-id-externe')).not.toBeNull();
    });

    it('recherche les sources disponibles après un court silence de saisie (US-008)', async () => {
      jest.useFakeTimers();
      const facade = TestBed.inject(FacadeCommandesService);
      const lister = jest.spyOn(facade, 'listerSourcesDisponibles').mockResolvedValue({
        type: 'succes',
        sourcesDisponibles: [
          { idExterne: '1234', libelle: 'entreprise/api-facturation' },
          { idExterne: '1567', libelle: 'entreprise/batch-comptable' },
        ],
      });

      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;
      composant.selectionnerInstance('instance-gitlab');

      composant.modifierIdExterne('entreprise');
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();

      expect(lister).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'instance-gitlab' }),
        'entreprise',
      );
      expect(composant.instanceId()).toBe('instance-gitlab');
      expect(composant.optionsRecherche()).toEqual([
        { valeur: '1234', libelle: 'entreprise/api-facturation' },
        { valeur: '1567', libelle: 'entreprise/batch-comptable' },
      ]);
      jest.useRealTimers();
    });

    it('collapse une rafale de frappe en un seul appel réseau pour le dernier terme (debounce + switchMap)', async () => {
      jest.useFakeTimers();
      const facade = TestBed.inject(FacadeCommandesService);
      const lister = jest.spyOn(facade, 'listerSourcesDisponibles').mockResolvedValue({
        type: 'succes',
        sourcesDisponibles: [{ idExterne: '1234', libelle: 'entreprise/api-facturation' }],
      });

      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;
      composant.selectionnerInstance('instance-gitlab');

      composant.modifierIdExterne('e');
      composant.modifierIdExterne('ent');
      composant.modifierIdExterne('entreprise');
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();

      expect(lister).toHaveBeenCalledTimes(1);
      expect(lister).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'instance-gitlab' }),
        'entreprise',
      );
      expect(composant.sourcesDisponibles()).toEqual([
        { idExterne: '1234', libelle: 'entreprise/api-facturation' },
      ]);
      jest.useRealTimers();
    });

    it('relance une recherche quand la saisie revient à un terme déjà recherché (pas de distinctUntilChanged)', async () => {
      jest.useFakeTimers();
      const facade = TestBed.inject(FacadeCommandesService);
      const lister = jest.spyOn(facade, 'listerSourcesDisponibles').mockResolvedValue({
        type: 'succes',
        sourcesDisponibles: [{ idExterne: '1234', libelle: 'entreprise/api-facturation' }],
      });

      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;
      composant.selectionnerInstance('instance-gitlab');

      composant.modifierIdExterne('entreprise');
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();

      composant.modifierIdExterne('entreprise-api');
      composant.modifierIdExterne('entreprise');
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();

      expect(lister).toHaveBeenCalledTimes(2);
      expect(composant.etatRechercheSource()).toBe('inactif');
      expect(composant.sourcesDisponibles()).toEqual([
        { idExterne: '1234', libelle: 'entreprise/api-facturation' },
      ]);
      jest.useRealTimers();
    });

    it("signale l'absence de credential plutôt que de proposer des sources disponibles", async () => {
      jest.useFakeTimers();
      const facade = TestBed.inject(FacadeCommandesService);
      jest.spyOn(facade, 'listerSourcesDisponibles').mockResolvedValue({
        type: 'echec',
        anomalie: {
          type: 'credentialAbsent',
          message: 'Aucun credential en mémoire pour cette instance',
        },
      });

      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;
      composant.selectionnerInstance('instance-gitlab');

      composant.modifierIdExterne('entreprise');
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();

      expect(composant.credentialAbsent()).toBe(true);
      expect(composant.sourcesDisponibles()).toEqual([]);
      expect(composant.etatRechercheSource()).toBe('inactif');
      jest.useRealTimers();
    });

    it('passe à « recherche en cours » dès la frappe puis revient à « inactif » au succès', async () => {
      jest.useFakeTimers();
      const facade = TestBed.inject(FacadeCommandesService);
      jest.spyOn(facade, 'listerSourcesDisponibles').mockResolvedValue({
        type: 'succes',
        sourcesDisponibles: [{ idExterne: '1234', libelle: 'entreprise/api-facturation' }],
      });

      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;
      composant.selectionnerInstance('instance-gitlab');

      composant.modifierIdExterne('entreprise');
      expect(composant.etatRechercheSource()).toBe('enCours');
      expect(composant.sourcesDisponibles()).toEqual([]);

      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();

      expect(composant.etatRechercheSource()).toBe('inactif');
      jest.useRealTimers();
    });

    it('bascule en « erreur » quand l’appel de recherche échoue (rejet de la promesse)', async () => {
      jest.useFakeTimers();
      const facade = TestBed.inject(FacadeCommandesService);
      jest
        .spyOn(facade, 'listerSourcesDisponibles')
        .mockRejectedValue(new Error('instance injoignable'));

      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;
      composant.selectionnerInstance('instance-gitlab');

      composant.modifierIdExterne('entreprise');
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();

      expect(composant.etatRechercheSource()).toBe('erreur');
      expect(composant.sourcesDisponibles()).toEqual([]);
      jest.useRealTimers();
    });

    it('bascule en « erreur » sur un échec typé autre que credentialAbsent (droits insuffisants)', async () => {
      jest.useFakeTimers();
      const facade = TestBed.inject(FacadeCommandesService);
      jest.spyOn(facade, 'listerSourcesDisponibles').mockResolvedValue({
        type: 'echec',
        anomalie: { type: 'droitsInsuffisants', message: 'HTTP 403' },
      });

      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;
      composant.selectionnerInstance('instance-gitlab');

      composant.modifierIdExterne('entreprise');
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();

      expect(composant.etatRechercheSource()).toBe('erreur');
      expect(composant.credentialAbsent()).toBe(false);
      jest.useRealTimers();
    });

    it('reste « inactif » tant qu’aucune instance n’est sélectionnée', () => {
      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      const composant = fixture.componentInstance;

      composant.modifierIdExterne('entreprise');

      expect(composant.etatRechercheSource()).toBe('inactif');
    });

    it('ne précharge plus la liste des sources disponibles à l’instanciation en mode édition (RG-036, évolution du 2026-08-25)', () => {
      const facade = TestBed.inject(FacadeCommandesService);
      const lister = jest.spyOn(facade, 'listerSourcesDisponibles');
      const sourceId = donneesApplication.creerSource(groupeId, projetId, {
        instanceId: 'instance-gitlab',
        type: TypeSource.DepotGitlab,
        idExterne: '1234',
        refAuditee: undefined,
      });
      const sourceExistante = donneesApplication
        .racine()
        ?.groupes[0]?.projets[0]?.sources.find((candidate) => candidate.id === sourceId);
      if (!sourceExistante) {
        throw new Error('Source de test introuvable.');
      }

      const fixture = TestBed.createComponent(SqmFormulaireSourceComponent);
      fixture.componentRef.setInput('groupeId', groupeId);
      fixture.componentRef.setInput('projetId', projetId);
      fixture.componentRef.setInput('sourceAModifier', sourceExistante);
      fixture.detectChanges();

      expect(lister).not.toHaveBeenCalled();
      expect(fixture.componentInstance.idExterne()).toBe('1234');
      expect(fixture.componentInstance.sourcesDisponibles()).toEqual([]);
    });
  });
});
