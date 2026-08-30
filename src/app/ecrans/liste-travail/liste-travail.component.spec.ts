// Test de l'écran Liste de travail (cf. liste-travail.component.ts, US-020, RG-009, RG-010, RG-026), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import {
  StatutMembre,
  StatutTraitementAlerte,
  TypeCritereMembre,
} from '../../services/avecetat/etat/types-donnees';
import type {
  Audit,
  DonneesRacine,
  Groupe,
  MembreConnu,
  Projet,
} from '../../services/avecetat/etat/types-donnees';
import type { MembreGitlab } from '../../services/sansetat/commandes/types-facade';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmListeTravailComponent } from './liste-travail.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

/**
 * Composant factice utilisé comme cible des routes de test : seul son enregistrement importe, jamais son rendu
 * (même patron que `shell.component.spec.ts`).
 */
@Component({ selector: 'app-composant-factice', template: '' })
class ComposantFactice {}

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit un audit minimal ne portant que le constat `gitlab.membres`.
   * @param membres - Membres du dépôt constatés lors de cet audit.
   * @param typeAudit - Catégorie de l'audit, `reguliere` par défaut.
   * @returns L'audit de test.
   */
  public static auditAvecMembres(
    membres: readonly MembreGitlab[],
    typeAudit: Audit['typeAudit'] = 'reguliere',
  ): Audit {
    return {
      id: `audit-${typeAudit}`,
      date: '2026-07-20T00:00:00Z',
      campagneId: 'campagne-1',
      typeAudit,
      resultats: [
        {
          type: 'gitlab.membres',
          sourceId: 'source-1',
          refEffective: 'main',
          shaTete: 'abc123',
          membres,
        },
      ],
    };
  }

  /**
   * Construit un membre GitLab de test.
   * @param username - Identifiant de connexion.
   * @param niveauAcces - Niveau d'accès GitLab (RG-010).
   * @returns Le membre de test.
   */
  public static membreGitlab(username: string, niveauAcces: number): MembreGitlab {
    return { username, nom: username, niveauAcces, direct: true, groupesInvites: [] };
  }

  /**
   * Construit une règle de membre connu de type `username`.
   * @param critere - Identifiant de connexion reconnu.
   * @returns La règle de test.
   */
  public static membreConnu(critere: string): MembreConnu {
    return {
      id: `membre-${critere}`,
      critere,
      typeCritere: TypeCritereMembre.Username,
      statut: StatutMembre.Interne,
    };
  }

  /**
   * Construit un projet de test.
   * @param id - Identifiant du projet.
   * @param nom - Nom du projet.
   * @param audits - Historique des audits du projet.
   * @returns Le projet de test.
   */
  public static projet(id: string, nom: string, audits: readonly Audit[]): Projet {
    return {
      id,
      nom,
      description: '',
      iaAutorisee: false,
      sources: [],
      annotations: [],
      audits,
    };
  }

  /**
   * Construit une racine de test avec un unique groupe et les projets fournis.
   * @param projets - Projets du groupe unique de cette racine.
   * @param membresConnus - Règles de membres connus du groupe.
   * @param traitementsAlertes - Historique de traitement des alertes (RG-026).
   * @returns La racine de test.
   */
  public static racine(
    projets: readonly Projet[],
    membresConnus: readonly MembreConnu[] = [],
    traitementsAlertes: DonneesRacine['traitementsAlertes'] = [],
  ): DonneesRacine {
    const groupe: Groupe = {
      id: 'groupe-1',
      nom: 'Socle Comptable',
      description: '',
      instances: [],
      membresConnus,
      annotations: [],
      indicateursDesactives: [],
      projets,
    };
    return {
      versionSchema: 1,
      meta: {
        creeLe: '2026-07-20T08:00:00Z',
        modifieLe: '2026-07-20T08:00:00Z',
        application: 'Test',
      },
      groupes: [groupe],
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
      traitementsAlertes,
      journal: [],
      vuesEnregistrees: [],
    };
  }

  /**
   * Racine avec deux membres inconnus sur un même projet : `a-traiter` jamais traité, `deja-traite` marqué vu puis
   * traité (US-020, RG-026 : jeu commun aux tests des deux onglets).
   * @returns La racine de test.
   */
  public static racineUnTraiteUnATraiter(): DonneesRacine {
    const audit = DonneesDeTest.auditAvecMembres([
      DonneesDeTest.membreGitlab('a-traiter', 30),
      DonneesDeTest.membreGitlab('deja-traite', 30),
    ]);
    const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
    return DonneesDeTest.racine(
      [projet],
      [],
      [
        {
          id: 't1',
          cleAlerte: 'membreInconnu|projet-1|deja-traite',
          statut: StatutTraitementAlerte.Vue,
          horodatage: '2026-07-01T09:00:00Z',
        },
        {
          id: 't2',
          cleAlerte: 'membreInconnu|projet-1|deja-traite',
          statut: StatutTraitementAlerte.Traitee,
          commentaire: 'Qualifié comme partenaire',
          horodatage: '2026-07-05T09:00:00Z',
        },
      ],
    );
  }
}

describe('SqmListeTravailComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let notification: NotificationService;
  let router: Router;

  beforeEach(async () => {
    jest.mocked(invoke).mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmListeTravailComponent],
      providers: [provideRouter([{ path: '**', component: ComposantFactice }])],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    notification = TestBed.inject(NotificationService);
    router = TestBed.inject(Router);
  });

  it("affiche le message d'état vide lorsqu'aucune alerte n'est active", () => {
    const audit = DonneesDeTest.auditAvecMembres([DonneesDeTest.membreGitlab('jdupont', 30)]);
    const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
    donneesApplication.chargerRacine(
      DonneesDeTest.racine([projet], [DonneesDeTest.membreConnu('jdupont')]),
    );

    const fixture = TestBed.createComponent(SqmListeTravailComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(composant.aucuneAlerte()).toBe(true);
    expect(element.textContent).toContain('Aucune alerte active');
  });

  it('place les membres inconnus de gravité élevée avant ceux de gravité modérée (RG-010, US-020)', () => {
    const auditA = DonneesDeTest.auditAvecMembres([DonneesDeTest.membreGitlab('lecteur', 20)]);
    const auditB = DonneesDeTest.auditAvecMembres([DonneesDeTest.membreGitlab('mainteneur', 40)]);
    const projetA = DonneesDeTest.projet('projet-a', 'Projet A', [auditA]);
    const projetB = DonneesDeTest.projet('projet-b', 'Projet B', [auditB]);
    donneesApplication.chargerRacine(DonneesDeTest.racine([projetA, projetB]));

    const fixture = TestBed.createComponent(SqmListeTravailComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    const alertes = composant.toutesLesAlertes();
    expect(alertes).toHaveLength(2);
    expect(alertes[0].gravite).toBe('elevee');
    expect(alertes[0].libelle).toContain('mainteneur');
    expect(alertes[1].gravite).toBe('moderee');
  });

  it(
    "n'affiche qu'une seule ligne pour un même membre inconnu constaté sur deux sources GitLab du " +
      'même projet, plutôt que de produire une clé de suivi `@for`/`track` dupliquée (NG0955, cf. R15-04/' +
      'R15-06)',
    () => {
      const audit: Audit = {
        id: 'audit-1',
        date: '2026-07-20T00:00:00Z',
        campagneId: 'campagne-1',
        typeAudit: 'reguliere',
        resultats: [
          {
            type: 'gitlab.membres',
            sourceId: 'source-back',
            refEffective: 'main',
            shaTete: 'abc123',
            membres: [DonneesDeTest.membreGitlab('inconnu1', 30)],
          },
          {
            type: 'gitlab.membres',
            sourceId: 'source-front',
            refEffective: 'main',
            shaTete: 'def456',
            membres: [DonneesDeTest.membreGitlab('inconnu1', 30)],
          },
        ],
      };
      const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
      donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));

      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      const alertes = composant.toutesLesAlertes();
      expect(alertes).toHaveLength(1);
      expect(alertes[0].cleAlerte).toBe('membreInconnu|projet-1|inconnu1');
    },
  );

  it(
    'détecte le membre inconnu sur le dernier audit RÉGULIER, en ignorant un audit historique à date passée ' +
      'intégré après coup (C15-14/RG-046 : cohérence avec la Synthèse des audits)',
    () => {
      const auditRegulier = DonneesDeTest.auditAvecMembres([
        DonneesDeTest.membreGitlab('inconnu1', 30),
      ]);
      const auditHistorique = DonneesDeTest.auditAvecMembres([], 'historique');
      const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [
        auditRegulier,
        auditHistorique,
      ]);
      donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));

      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();

      const alertes = fixture.componentInstance.toutesLesAlertes();
      expect(alertes).toHaveLength(1);
      expect(alertes[0].cleAlerte).toBe('membreInconnu|projet-1|inconnu1');
    },
  );

  it('restitue le statut courant (dernière entrée) et le commentaire associé (RG-026)', () => {
    const audit = DonneesDeTest.auditAvecMembres([DonneesDeTest.membreGitlab('jdupont', 30)]);
    const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
    donneesApplication.chargerRacine(
      DonneesDeTest.racine(
        [projet],
        [],
        [
          {
            id: 't1',
            cleAlerte: 'membreInconnu|projet-1|jdupont',
            statut: StatutTraitementAlerte.Vue,
            horodatage: '2026-07-01T09:00:00Z',
          },
          {
            id: 't2',
            cleAlerte: 'membreInconnu|projet-1|jdupont',
            statut: StatutTraitementAlerte.Traitee,
            commentaire: 'Qualifié comme partenaire',
            horodatage: '2026-07-05T09:00:00Z',
          },
        ],
      ),
    );

    const fixture = TestBed.createComponent(SqmListeTravailComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    const alertes = composant.toutesLesAlertes();
    expect(alertes).toHaveLength(1);
    expect(alertes[0].statut).toBe(StatutTraitementAlerte.Traitee);
    expect(alertes[0].commentaire).toBe('Qualifié comme partenaire');
    expect(alertes[0].detecteeDepuis).toBe('2026-07-01T09:00:00Z');
  });

  it('filtre les alertes par groupe et par texte de recherche', () => {
    const audit = DonneesDeTest.auditAvecMembres([DonneesDeTest.membreGitlab('jdupont', 30)]);
    const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
    donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));

    const fixture = TestBed.createComponent(SqmListeTravailComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    composant.onChangerRecherche('facturation');
    expect(composant.alertesFiltrees()).toHaveLength(1);

    composant.onChangerRecherche('inexistant');
    expect(composant.alertesFiltrees()).toHaveLength(0);

    composant.onChangerRecherche('');
    composant.onSelectionGroupeProjet({ groupeId: 'groupe-inconnu', projetIds: null });
    expect(composant.alertesFiltrees()).toHaveLength(0);
  });

  it('ouvre le panneau de traitement à l’activation d’une ligne puis le referme sans qualifier', () => {
    const audit = DonneesDeTest.auditAvecMembres([DonneesDeTest.membreGitlab('jdupont', 30)]);
    const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
    donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));

    const fixture = TestBed.createComponent(SqmListeTravailComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    expect(composant.alerteSelectionnee()).toBeUndefined();
    composant.activerLigne(composant.toutesLesAlertes()[0]);
    expect(composant.alerteSelectionnee()).toBeDefined();

    composant.fermerPanneau();
    expect(composant.alerteSelectionnee()).toBeUndefined();
  });

  it(
    'ramène la vue vers le premier champ de saisie du panneau puis y pose le focus à l’activation ' +
      'd’une ligne (C15-09)',
    async () => {
      const scrollIntoViewSimule = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoViewSimule;
      const audit = DonneesDeTest.auditAvecMembres([DonneesDeTest.membreGitlab('jdupont', 30)]);
      const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
      donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));

      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      composant.activerLigne(composant.toutesLesAlertes()[0]);
      fixture.detectChanges();
      await fixture.whenStable();

      const champCommentaire: HTMLTextAreaElement | null = DomTestUtils.obtenirElementNatif(
        fixture,
      ).querySelector('#liste-travail-champ-commentaire');
      expect(champCommentaire).not.toBeNull();
      expect(scrollIntoViewSimule).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(champCommentaire);
    },
  );

  describe(
    'bouton « Qualifier ce membre » (navigation vers Administration, sur le modèle du lien homonyme de ' +
      'la Fiche projet)',
    () => {
      it(
        'navigue vers Administration avec le groupe et le username en critère par défaut, faute ' +
          'd’email public',
        async () => {
          const audit = DonneesDeTest.auditAvecMembres([DonneesDeTest.membreGitlab('jdupont', 30)]);
          const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
          donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));
          const fixture = TestBed.createComponent(SqmListeTravailComponent);
          fixture.detectChanges();
          const composant = fixture.componentInstance;
          composant.activerLigne(composant.toutesLesAlertes()[0]);
          fixture.detectChanges();

          expect(
            DomTestUtils.obtenirElementNatif(fixture).querySelector(
              '#liste-travail-bouton-qualifier-membre',
            ),
          ).not.toBeNull();
          composant.qualifierMembre();
          await fixture.whenStable();

          const params = new URLSearchParams(router.url.split('?')[1]);
          expect(params.get('groupeId')).toBe('groupe-1');
          expect(params.get('typeCritere')).toBe('username');
          expect(params.get('critere')).toBe('jdupont');
        },
      );

      it('propose le domaine de l’email public en critère par défaut, quand le membre en dispose', async () => {
        const audit = DonneesDeTest.auditAvecMembres([
          { ...DonneesDeTest.membreGitlab('jdupont', 30), emailPublic: 'jdupont@exemple.fr' },
        ]);
        const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
        donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));
        const fixture = TestBed.createComponent(SqmListeTravailComponent);
        fixture.detectChanges();
        const composant = fixture.componentInstance;
        composant.activerLigne(composant.toutesLesAlertes()[0]);

        composant.qualifierMembre();
        await fixture.whenStable();

        const params = new URLSearchParams(router.url.split('?')[1]);
        expect(params.get('typeCritere')).toBe('domaineEmail');
        expect(params.get('critere')).toBe('exemple.fr');
      });

      it(
        'ne transmet que le groupe, sans critère, pour une alerte en conflit de règles (liste des ' +
          'règles existantes plutôt qu’une création)',
        async () => {
          const audit = DonneesDeTest.auditAvecMembres([
            { ...DonneesDeTest.membreGitlab('jdupont', 30), emailPublic: 'jdupont@exemple.fr' },
          ]);
          const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
          donneesApplication.chargerRacine(
            DonneesDeTest.racine(
              [projet],
              [
                {
                  id: 'membre-connu-email',
                  critere: 'jdupont@exemple.fr',
                  typeCritere: TypeCritereMembre.Email,
                  statut: StatutMembre.Interne,
                },
                {
                  id: 'membre-connu-alias',
                  critere: 'quelquun',
                  typeCritere: TypeCritereMembre.Username,
                  statut: StatutMembre.Client,
                  aliasEmail: 'jdupont@exemple.fr',
                },
              ],
            ),
          );
          const fixture = TestBed.createComponent(SqmListeTravailComponent);
          fixture.detectChanges();
          const composant = fixture.componentInstance;
          composant.activerLigne(composant.toutesLesAlertes()[0]);

          composant.qualifierMembre();
          await fixture.whenStable();

          const params = new URLSearchParams(router.url.split('?')[1]);
          expect(params.get('groupeId')).toBe('groupe-1');
          expect(params.has('critere')).toBe(false);
          expect(params.has('typeCritere')).toBe(false);
        },
      );

      it("n'affiche pas le bouton dans le gabarit tant qu'aucune alerte n'est sélectionnée", () => {
        const audit = DonneesDeTest.auditAvecMembres([DonneesDeTest.membreGitlab('jdupont', 30)]);
        const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
        donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));
        const fixture = TestBed.createComponent(SqmListeTravailComponent);
        fixture.detectChanges();

        expect(
          DomTestUtils.obtenirElementNatif(fixture).querySelector(
            '#liste-travail-bouton-qualifier-membre',
          ),
        ).toBeNull();
      });
    },
  );

  it('qualifie une alerte comme traitée après confirmation du mot de passe (US-020)', async () => {
    const audit = DonneesDeTest.auditAvecMembres([DonneesDeTest.membreGitlab('jdupont', 30)]);
    const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
    donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    jest.mocked(invoke).mockResolvedValue(DonneesDeTest.racine([projet]));

    const fixture = TestBed.createComponent(SqmListeTravailComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    composant.activerLigne(composant.toutesLesAlertes()[0]);
    composant.commentaire = 'Qualifié comme partenaire';
    composant.demanderTraiter();
    expect(composant.actionEnAttenteMotDePasse()).toBe('traitement');

    await composant.confirmerQualification('mot-de-passe');

    expect(invoke).toHaveBeenCalledWith(
      'qualifier_alerte',
      expect.objectContaining({
        cleAlerte: 'membreInconnu|projet-1|jdupont',
        statut: StatutTraitementAlerte.Traitee,
        commentaire: 'Qualifié comme partenaire',
        motDePasse: 'mot-de-passe',
      }),
    );
    expect(composant.alerteSelectionnee()).toBeUndefined();
    expect(composant.actionEnAttenteMotDePasse()).toBeNull();
  });

  it("affiche un message d'erreur lorsque la qualification échoue", async () => {
    const audit = DonneesDeTest.auditAvecMembres([DonneesDeTest.membreGitlab('jdupont', 30)]);
    const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
    donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    jest.mocked(invoke).mockRejectedValue({ type: 'fichierVerrouille' });

    const fixture = TestBed.createComponent(SqmListeTravailComponent);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    composant.activerLigne(composant.toutesLesAlertes()[0]);
    composant.demanderMarquerVu();
    await composant.confirmerQualification('mot-de-passe');

    expect(notification.liste()).toEqual([expect.objectContaining({ type: 'erreur' })]);
    expect(composant.alerteSelectionnee()).toBeDefined();
  });

  describe('onglets « À traiter » / « Traités » (US-020, RG-026)', () => {
    it("répartit les alertes entre les deux onglets selon leur statut, l'onglet « À traiter » étant actif par défaut", () => {
      donneesApplication.chargerRacine(DonneesDeTest.racineUnTraiteUnATraiter());
      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      expect(composant.ongletActif()).toBe('aTraiter');
      expect(composant.alertesATraiter().map((ligne) => ligne.cleAlerte)).toEqual([
        'membreInconnu|projet-1|a-traiter',
      ]);
      expect(composant.alertesTraitees().map((ligne) => ligne.cleAlerte)).toEqual([
        'membreInconnu|projet-1|deja-traite',
      ]);
      expect(composant.alertesOngletActif()).toBe(composant.alertesATraiter());
    });

    it("expose l'horodatage du dernier traitement effectif et une colonne « Traitée le » dans l'onglet « Traités »", () => {
      donneesApplication.chargerRacine(DonneesDeTest.racineUnTraiteUnATraiter());
      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      const traitee = composant.alertesTraitees()[0];
      expect(traitee.traiteeLe).toBe('2026-07-05T09:00:00Z');
      expect(composant.colonnes().map((colonne) => colonne.cle)).toContain('detecteeDepuis');

      composant.changerOnglet('traitees');
      expect(composant.ongletActif()).toBe('traitees');
      const cles = composant.colonnes().map((colonne) => colonne.cle);
      expect(cles).toContain('traiteeLe');
      expect(cles).not.toContain('detecteeDepuis');
    });

    it('referme le panneau de traitement ouvert lorsqu’on change d’onglet', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racineUnTraiteUnATraiter());
      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      composant.activerLigne(composant.alertesATraiter()[0]);
      expect(composant.alerteSelectionnee()).toBeDefined();

      composant.changerOnglet('traitees');
      expect(composant.alerteSelectionnee()).toBeUndefined();
    });

    it('affiche le bouton « Réactiver » (et non « Marquer vue »/« Marquer traitée ») pour une alerte traitée', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racineUnTraiteUnATraiter());
      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      composant.changerOnglet('traitees');
      composant.activerLigne(composant.alertesTraitees()[0]);
      fixture.detectChanges();

      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.querySelector('#liste-travail-bouton-reactiver')).not.toBeNull();
      expect(element.querySelector('#liste-travail-bouton-marquer-vue')).toBeNull();
      expect(element.querySelector('#liste-travail-bouton-marquer-traitee')).toBeNull();
    });

    it('réactive une alerte traitée en la repassant au statut « vue » après confirmation du mot de passe', async () => {
      const racine = DonneesDeTest.racineUnTraiteUnATraiter();
      donneesApplication.chargerRacine(racine);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      jest.mocked(invoke).mockResolvedValue(racine);

      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      composant.changerOnglet('traitees');
      composant.activerLigne(composant.alertesTraitees()[0]);
      composant.demanderReactiver();
      expect(composant.actionEnAttenteMotDePasse()).toBe('reactivation');

      await composant.confirmerQualification('mot-de-passe');

      expect(invoke).toHaveBeenCalledWith(
        'qualifier_alerte',
        expect.objectContaining({
          cleAlerte: 'membreInconnu|projet-1|deja-traite',
          statut: StatutTraitementAlerte.Vue,
          motDePasse: 'mot-de-passe',
        }),
      );
      expect(composant.alerteSelectionnee()).toBeUndefined();
      expect(composant.actionEnAttenteMotDePasse()).toBeNull();
    });

    it('affiche un état vide dédié dans l’onglet « Traités » tant qu’aucune alerte n’est traitée', () => {
      const audit = DonneesDeTest.auditAvecMembres([DonneesDeTest.membreGitlab('a-traiter', 30)]);
      const projet = DonneesDeTest.projet('projet-1', 'API Facturation', [audit]);
      donneesApplication.chargerRacine(DonneesDeTest.racine([projet]));
      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      composant.changerOnglet('traitees');
      fixture.detectChanges();

      expect(composant.alertesTraitees()).toHaveLength(0);
      expect(DomTestUtils.obtenirElementNatif(fixture).textContent).toContain(
        'Aucun élément traité pour le moment.',
      );
    });
  });

  describe('vues enregistrées (US-028, RG-027, Phase 9 incrément 1)', () => {
    it('applique le filtre de groupe porté par une vue choisie', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine([]));
      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      composant.appliquerVue({
        id: 'v1',
        nom: 'Mon groupe',
        parDefaut: false,
        filtres: { groupeId: 'groupe-1' },
      });

      expect(composant.filtreGroupeId()).toBe('groupe-1');
    });

    it('ignore silencieusement une vue dont les filtres ne correspondent pas à la forme attendue', () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine([]));
      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;
      composant.contexte.definirParUtilisateur({ groupeId: 'groupe-1', projetIds: null });

      composant.appliquerVue({ id: 'v1', nom: 'Vue invalide', parDefaut: false, filtres: 'texte' });

      expect(composant.filtreGroupeId()).toBe('groupe-1');
    });

    it('enregistre une vue avec les filtres courants et met à jour la racine (US-028)', async () => {
      const racineInitiale = DonneesDeTest.racine([]);
      donneesApplication.chargerRacine(racineInitiale);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      const racineMiseAJour = { ...racineInitiale, versionSchema: 2 };
      jest.mocked(invoke).mockResolvedValue(racineMiseAJour);

      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;
      composant.contexte.definirParUtilisateur({ groupeId: 'groupe-1', projetIds: null });

      await composant.enregistrerVue({
        id: undefined,
        nom: 'Ma vue',
        parDefaut: true,
        motDePasse: 'mot-de-passe',
      });

      expect(invoke).toHaveBeenCalledWith(
        'definir_vue',
        expect.objectContaining({
          id: undefined,
          nom: 'Ma vue',
          ecran: 'listeTravail',
          versionFiltres: 1,
          parDefaut: true,
          filtres: { groupeId: 'groupe-1', projetIds: null },
          motDePasse: 'mot-de-passe',
        }),
      );
      expect(notification.liste()).toEqual([expect.objectContaining({ type: 'succes' })]);
      expect(donneesApplication.racine()).toBe(racineMiseAJour);
    });

    it("affiche un message d'erreur lorsque l'enregistrement d'une vue échoue", async () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine([]));
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      jest.mocked(invoke).mockRejectedValue({ type: 'erreurInterne' });

      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      await composant.enregistrerVue({
        id: undefined,
        nom: 'Ma vue',
        parDefaut: false,
        motDePasse: 'mot-de-passe',
      });

      expect(notification.liste()).toEqual([expect.objectContaining({ type: 'erreur' })]);
    });

    it('supprime une vue et met à jour la racine (US-028)', async () => {
      const racineInitiale = DonneesDeTest.racine([]);
      donneesApplication.chargerRacine(racineInitiale);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      const racineMiseAJour = { ...racineInitiale, versionSchema: 2 };
      jest.mocked(invoke).mockResolvedValue(racineMiseAJour);

      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      await composant.supprimerVue({ id: 'v1', motDePasse: 'mot-de-passe' });

      expect(invoke).toHaveBeenCalledWith(
        'supprimer_vue',
        expect.objectContaining({ id: 'v1', motDePasse: 'mot-de-passe' }),
      );
      expect(notification.liste()).toEqual([]);
      expect(donneesApplication.racine()).toBe(racineMiseAJour);
    });

    it("affiche un message d'erreur lorsque la suppression d'une vue échoue", async () => {
      donneesApplication.chargerRacine(DonneesDeTest.racine([]));
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      jest.mocked(invoke).mockRejectedValue({ type: 'vueIntrouvable' });

      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      await composant.supprimerVue({ id: 'id-inconnu', motDePasse: 'mot-de-passe' });

      expect(notification.liste()).toEqual([expect.objectContaining({ type: 'erreur' })]);
    });

    it('applique automatiquement la vue par défaut de cet écran à l’ouverture', () => {
      const racine = DonneesDeTest.racine([]);
      const racineAvecVueParDefaut: DonneesRacine = {
        ...racine,
        vuesEnregistrees: [
          {
            id: 'v1',
            nom: 'Vue par défaut',
            ecran: 'listeTravail',
            versionFiltres: 1,
            parDefaut: true,
            filtres: { groupeId: 'groupe-1' },
          },
        ],
      };
      donneesApplication.chargerRacine(racineAvecVueParDefaut);

      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      expect(composant.filtreGroupeId()).toBe('groupe-1');
    });

    it("n'écrase jamais un choix de filtre de l'utilisateur par la vue par défaut de l'écran (RG-053)", () => {
      const racine = DonneesDeTest.racine([]);
      const racineAvecVueParDefaut: DonneesRacine = {
        ...racine,
        vuesEnregistrees: [
          {
            id: 'v1',
            nom: 'Vue par défaut',
            ecran: 'listeTravail',
            versionFiltres: 1,
            parDefaut: true,
            filtres: { groupeId: 'groupe-1', projetIds: null },
          },
        ],
      };
      donneesApplication.chargerRacine(racineAvecVueParDefaut);

      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;
      expect(composant.filtreGroupeId()).toBe('groupe-1');
      // Amorçage par la vue par défaut : le filtre n'est pas encore réputé « modifié par l'utilisateur ».
      expect(composant.contexte.filtreModifieParUtilisateur()).toBe(false);

      composant.onSelectionGroupeProjet({ groupeId: 'groupe-2', projetIds: null });
      fixture.detectChanges();

      expect(composant.filtreGroupeId()).toBe('groupe-2');
      expect(composant.contexte.filtreModifieParUtilisateur()).toBe(true);
    });

    it('ignore une vue enregistrée dont la version de filtres est obsolète et avertit l’utilisateur', () => {
      const racine = DonneesDeTest.racine([]);
      const racineAvecVueObsolete: DonneesRacine = {
        ...racine,
        vuesEnregistrees: [
          {
            id: 'v1',
            nom: 'Ancienne vue',
            ecran: 'listeTravail',
            versionFiltres: 0,
            parDefaut: false,
            filtres: { groupeId: 'groupe-1' },
          },
        ],
      };
      donneesApplication.chargerRacine(racineAvecVueObsolete);

      const fixture = TestBed.createComponent(SqmListeTravailComponent);
      fixture.detectChanges();
      const composant = fixture.componentInstance;

      expect(composant.vuesApplicables()).toHaveLength(0);
      expect(composant.nombreVuesIgnorees()).toBe(1);
    });
  });
});
