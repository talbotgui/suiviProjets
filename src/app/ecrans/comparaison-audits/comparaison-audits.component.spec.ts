// Test de l'écran Comparaison entre deux audits (cf. comparaison-audits.component.ts, US-018, RG-011), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';
import { toPng } from 'html-to-image';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import {
  StatutMembre,
  TypeCritereMembre,
  TypeSource,
} from '../../services/avecetat/etat/types-donnees';
import type {
  Audit,
  DonneesRacine,
  Groupe,
  Projet,
} from '../../services/avecetat/etat/types-donnees';
import { TypeInstance } from '../../services/sansetat/commandes/types-facade';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmComparaisonAuditsComponent } from './comparaison-audits.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn() }));

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Composant factice utilisé comme cible des routes de test (même motif que `SqmFicheProjetComponent.spec.ts`).
 */
@Component({ selector: 'app-composant-factice', template: '' })
class ComposantFactice {}

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction hors
 * classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Formate une date de référence décalée d'un nombre de jours (négatif = dans le passé) en ISO 8601.
   * @param decalageJours - Décalage en jours par rapport à maintenant (négatif = passé).
   * @returns La date ISO 8601 correspondante.
   */
  public static ilYA(decalageJours: number): string {
    return new Date(Date.now() + decalageJours * JOUR_MS).toISOString();
  }

  /**
   * Construit un audit minimal, portant uniquement un constat de couverture Sonar distinctif (utile pour
   * identifier, dans les assertions, quel audit a été sélectionné par un raccourci).
   * @param id - Identifiant de l'audit.
   * @param decalageJours - Décalage en jours par rapport à maintenant (négatif = passé).
   * @param couverture - Valeur de couverture Sonar distinctive de cet audit.
   * @returns L'audit de test.
   */
  public static auditMinimal(id: string, decalageJours: number, couverture: number): Audit {
    return {
      id,
      date: DonneesDeTest.ilYA(decalageJours),
      campagneId: 'campagne-1',
      resultats: [
        {
          type: 'sonar.couverture',
          sourceId: 'source-sonar',
          couverture,
          couvertureNouveauCode: couverture,
        },
      ],
    };
  }

  /**
   * Construit un audit complet, avec dépendances, membres et marqueurs IA personnalisables, pour les tests
   * d'exactitude du différentiel.
   * @param options - Valeurs personnalisées de l'audit.
   * @param options.id - Identifiant de l'audit.
   * @param options.decalageJours - Décalage en jours par rapport à maintenant.
   * @param options.couverture - Valeur de couverture Sonar.
   * @param options.violationsBloquant - Nombre de violations Sonar de sévérité bloquante.
   * @param options.violationsCritique - Nombre de violations Sonar de sévérité critique.
   * @param options.tailleOctets - Taille du dépôt, en octets.
   * @param options.note - Valeur des quatre notes Sonar (fiabilité, sécurité, maintenabilité, revue de sécurité).
   * @param options.dependances - Dépendances constatées.
   * @param options.membres - Membres constatés.
   * @param options.marqueurs - Marqueurs IA constatés.
   * @returns L'audit de test.
   */
  public static auditComplet(options: {
    readonly id: string;
    readonly decalageJours: number;
    readonly couverture: number;
    readonly violationsBloquant: number;
    readonly violationsCritique: number;
    readonly tailleOctets: number;
    readonly note: number;
    readonly dependances: readonly { reference: string; version: string; manifeste: string }[];
    readonly membres: readonly {
      username: string;
      nom: string;
      niveauAcces: number;
      emailPublic?: string;
    }[];
    readonly marqueurs: readonly { chemin: string; nature: string; outil: string }[];
  }): Audit {
    return {
      id: options.id,
      date: DonneesDeTest.ilYA(options.decalageJours),
      campagneId: 'campagne-1',
      resultats: [
        {
          type: 'sonar.couverture',
          sourceId: 'source-sonar',
          couverture: options.couverture,
          couvertureNouveauCode: options.couverture,
        },
        {
          type: 'sonar.violations',
          sourceId: 'source-sonar',
          parSeverite: {
            bloquant: options.violationsBloquant,
            critique: options.violationsCritique,
            majeur: 0,
            mineur: 0,
            info: 0,
          },
          nouvellesViolations: 0,
        },
        {
          type: 'sonar.notes',
          sourceId: 'source-sonar',
          fiabilite: options.note,
          securite: options.note,
          maintenabilite: options.note,
          revueSecurite: options.note,
        },
        {
          type: 'gitlab.taille_depot',
          sourceId: 'source-gitlab',
          refEffective: 'develop',
          shaTete: 'abc',
          tailleOctets: options.tailleOctets,
        },
        {
          type: 'gitlab.dependances',
          sourceId: 'source-gitlab',
          refEffective: 'develop',
          shaTete: 'abc',
          dependances: options.dependances,
        },
        {
          type: 'gitlab.membres',
          sourceId: 'source-gitlab',
          refEffective: 'develop',
          shaTete: 'abc',
          membres: options.membres.map((m) => ({ ...m, herite: false })),
        },
        {
          type: 'gitlab.marqueurs_ia',
          sourceId: 'source-gitlab',
          refEffective: 'develop',
          shaTete: 'abc',
          marqueurs: options.marqueurs,
        },
      ],
    };
  }

  /**
   * Construit un projet de test.
   * @param id - Identifiant du projet.
   * @param audits - Historique des audits du projet.
   * @param annotations - Annotations du projet, vide par défaut.
   * @param iaAutorisee - Politique d'autorisation de l'IA du projet, `false` (interdite) par défaut.
   * @returns Le projet de test.
   */
  public static projet(
    id: string,
    audits: readonly Audit[],
    annotations: Projet['annotations'] = [],
    iaAutorisee = false,
  ): Projet {
    return {
      id,
      nom: 'Projet Test',
      description: '',
      iaAutorisee,
      sources: [
        {
          id: 'source-gitlab',
          instanceId: 'instance-gitlab',
          type: TypeSource.DepotGitlab,
          idExterne: '1234',
          refAuditee: 'develop',
        },
      ],
      annotations,
      audits,
    };
  }

  /**
   * Construit une racine de test avec un groupe et un projet uniques, avec les référentiels de dépendances requis
   * pour exercer `StatutObsolescenceUtils`.
   * @param projet - Projet de test à insérer dans le groupe.
   * @param membresConnusSupplementaires - Règles de membres connus supplémentaires, vide par défaut (utilisé pour
   * exercer une résolution par domaine courriel, en plus de la règle `jdupont` par défaut).
   * @returns La racine de test.
   */
  public static racine(
    projet: Projet,
    membresConnusSupplementaires: Groupe['membresConnus'] = [],
  ): DonneesRacine {
    const groupe: Groupe = {
      id: 'groupe-1',
      nom: 'Groupe Test',
      description: '',
      instances: [{ id: 'instance-gitlab', type: TypeInstance.Gitlab, nom: 'GitLab', urlBase: '' }],
      membresConnus: [
        {
          id: 'membre-connu-1',
          critere: 'jdupont',
          typeCritere: TypeCritereMembre.Username,
          statut: StatutMembre.Interne,
        },
        ...membresConnusSupplementaires,
      ],
      annotations: [],
      indicateursDesactives: [],
      projets: [projet],
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
        reglesDependances: [
          {
            id: 'regle-dependance-1',
            motif: 'org.springframework:*',
            versions: [
              { motifVersion: '4.*', statut: 'obsolete' },
              { motifVersion: '5.3.*', statut: 'maintenu' },
            ],
          },
          {
            id: 'regle-dependance-2',
            motif: 'moment',
            versions: [{ motifVersion: '*', statut: 'obsolete' }],
          },
        ],
        reglesMarqueursIA: [],
        motifNommageBranches: '',
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
            critique: { seuilOrange: 1, seuilRouge: 5 },
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

describe('SqmComparaisonAuditsComponent', () => {
  beforeEach(async () => {
    jest.mocked(invoke).mockReset();
    jest.mocked(toPng).mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmComparaisonAuditsComponent],
      providers: [provideRouter([{ path: '**', component: ComposantFactice }])],
    }).compileComponents();
  });

  /**
   * Crée et initialise un fixture du composant, avec la racine fournie chargée dans le Store.
   * @param projetId - Identifiant du projet à afficher.
   * @param racine - Racine à charger avant le rendu, `undefined` pour ne charger aucun fichier.
   * @returns Le fixture prêt à l'emploi.
   */
  function creerFixture(
    projetId: string,
    racine?: DonneesRacine,
  ): ComponentFixture<SqmComparaisonAuditsComponent> {
    const donneesApplication = TestBed.inject(DonneesApplicationService);
    if (racine !== undefined) {
      donneesApplication.chargerRacine(racine);
    }
    const fixture = TestBed.createComponent(SqmComparaisonAuditsComponent);
    fixture.componentRef.setInput('projetId', projetId);
    fixture.detectChanges();
    return fixture;
  }

  it("affiche un message explicite quand aucun fichier n'est chargé", () => {
    const fixture = creerFixture('projet-1');
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain("Aucun fichier n'est actuellement chargé");
  });

  it('affiche un message explicite quand le projet est introuvable, avec un lien de retour', () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditMinimal('a1', -1, 50)]);
    const fixture = creerFixture('projet-inexistant', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('Projet introuvable');
    expect(element.querySelector('a[href="/synthese-audits"]')).not.toBeNull();
  });

  it('affiche un message explicite quand le projet ne compte aucun audit (jamais un écran vide silencieux)', () => {
    const projet = DonneesDeTest.projet('projet-1', []);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('ne compte pas encore deux audits intégrés');
  });

  it('affiche un message explicite quand le projet ne compte qu’un seul audit', () => {
    const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditMinimal('a1', -1, 50)]);
    const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('ne compte pas encore deux audits intégrés');
  });

  describe('sélection par défaut et raccourcis', () => {
    /**
     * Construit un projet à quatre audits dont les écarts de date sont choisis pour que les trois raccourcis
     * (« dernier vs précédent », « un mois », « trois mois ») résolvent chacun un audit « avant » différent :
     * a0 (-90 j, couverture 10), a1 (-31 j, couverture 20), a2 (-5 j, couverture 30), a3 (-1 j, couverture 40,
     * le plus récent).
     * @returns Le projet de test.
     */
    function projetQuatreAudits(): Projet {
      return DonneesDeTest.projet('projet-1', [
        DonneesDeTest.auditMinimal('a0', -90, 10),
        DonneesDeTest.auditMinimal('a1', -31, 20),
        DonneesDeTest.auditMinimal('a2', -5, 30),
        DonneesDeTest.auditMinimal('a3', -1, 40),
      ]);
    }

    it('sélectionne par défaut le dernier audit et l’avant-dernier', () => {
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projetQuatreAudits()));
      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.textContent).toContain('30.0 %'); // a2 -> avant-dernier retenu par défaut
      expect(element.textContent).toContain('40.0 %'); // a3 -> après (dernier)
    });

    it('le raccourci « dernier vs précédent » sélectionne les deux derniers audits', () => {
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projetQuatreAudits()));
      fixture.componentInstance.appliquerRaccourci('dernierPrecedent');
      fixture.detectChanges();
      const donnees = fixture.componentInstance.etat();
      if (donnees.type !== 'pret') {
        throw new Error('État "pret" attendu.');
      }
      expect(donnees.donnees.idAvant).toBe('a2');
      expect(donnees.donnees.idApres).toBe('a3');
    });

    it('le raccourci « un mois » sélectionne l’audit le plus proche de l’échéance parmi ceux disponibles', () => {
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projetQuatreAudits()));
      fixture.componentInstance.appliquerRaccourci('unMois');
      fixture.detectChanges();
      const etatValue = fixture.componentInstance.etat();
      if (etatValue.type !== 'pret') {
        throw new Error('État "pret" attendu.');
      }
      expect(etatValue.donnees.idAvant).toBe('a1');
      expect(etatValue.donnees.idApres).toBe('a3');
    });

    it('le raccourci « trois mois » sélectionne l’audit le plus proche de l’échéance parmi ceux disponibles', () => {
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projetQuatreAudits()));
      fixture.componentInstance.appliquerRaccourci('troisMois');
      fixture.detectChanges();
      const etatValue = fixture.componentInstance.etat();
      if (etatValue.type !== 'pret') {
        throw new Error('État "pret" attendu.');
      }
      expect(etatValue.donnees.idAvant).toBe('a0');
      expect(etatValue.donnees.idApres).toBe('a3');
    });

    it("un raccourci n'a aucun effet (ni erreur) quand aucun fichier n'est chargé", () => {
      const fixture = creerFixture('projet-1');
      fixture.componentInstance.appliquerRaccourci('unMois');
      fixture.detectChanges();
      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.textContent).toContain("Aucun fichier n'est actuellement chargé");
    });

    it("un raccourci n'a aucun effet (ni erreur) quand le projet est introuvable", () => {
      const fixture = creerFixture('projet-inexistant', DonneesDeTest.racine(projetQuatreAudits()));
      fixture.componentInstance.appliquerRaccourci('unMois');
      fixture.detectChanges();
      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.textContent).toContain('Projet introuvable');
    });

    it('un raccourci sans effet quand le projet ne compte pas au moins deux audits', () => {
      const projet = DonneesDeTest.projet('projet-1', [DonneesDeTest.auditMinimal('a1', -1, 50)]);
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      fixture.componentInstance.appliquerRaccourci('unMois');
      fixture.detectChanges();
      const etatValue = fixture.componentInstance.etat();
      expect(etatValue.type).toBe('auditInsuffisant');
    });

    it('permet de sélectionner explicitement les deux audits comparés via les sélecteurs', () => {
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projetQuatreAudits()));
      fixture.componentInstance.definirIdAvant('a0');
      fixture.componentInstance.definirIdApres('a1');
      fixture.detectChanges();
      const etatValue = fixture.componentInstance.etat();
      if (etatValue.type !== 'pret') {
        throw new Error('État "pret" attendu.');
      }
      expect(etatValue.donnees.idAvant).toBe('a0');
      expect(etatValue.donnees.idApres).toBe('a1');
    });

    it('évite de comparer un audit à lui-même quand la sélection explicite désigne deux fois le même audit', () => {
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projetQuatreAudits()));
      // Sélectionne "a3" comme audit "avant" alors qu'il est déjà l'audit "après" résolu par défaut.
      fixture.componentInstance.definirIdAvant('a3');
      fixture.detectChanges();
      const etatValue = fixture.componentInstance.etat();
      if (etatValue.type !== 'pret') {
        throw new Error('État "pret" attendu.');
      }
      expect(etatValue.donnees.idAvant).not.toBe(etatValue.donnees.idApres);
    });

    it('affiche un message explicite (R10-15) plutôt que de replier silencieusement la sélection quand les deux dates désignent le même audit', () => {
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projetQuatreAudits()));
      fixture.componentInstance.definirIdAvant('a3');
      fixture.detectChanges();
      const etatValue = fixture.componentInstance.etat();
      if (etatValue.type !== 'pret') {
        throw new Error('État "pret" attendu.');
      }
      expect(etatValue.donnees.messageSelectionRepliee).toBeDefined();
      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.textContent).toContain('désignaient le même audit');
    });

    it('ne restitue aucun message de repli quand la sélection ne le nécessite pas', () => {
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projetQuatreAudits()));
      const etatValue = fixture.componentInstance.etat();
      if (etatValue.type !== 'pret') {
        throw new Error('État "pret" attendu.');
      }
      expect(etatValue.donnees.messageSelectionRepliee).toBeUndefined();
    });

    it('ignore une sélection explicite qui n’appartient plus aux audits du projet courant (repli automatique)', () => {
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projetQuatreAudits()));
      fixture.componentInstance.definirIdAvant('id-inexistant');
      fixture.componentInstance.definirIdApres('id-inexistant-aussi');
      fixture.detectChanges();
      const etatValue = fixture.componentInstance.etat();
      if (etatValue.type !== 'pret') {
        throw new Error('État "pret" attendu.');
      }
      expect(etatValue.donnees.idApres).toBe('a3');
      expect(etatValue.donnees.idAvant).toBe('a2');
    });
  });

  describe('exactitude du différentiel sur une paire d’audits connue', () => {
    /**
     * Construit une racine de test à deux audits connus, avec des évolutions de dépendances, de membres et de
     * marqueurs IA couvrant les trois catégories du différentiel (ajout, retrait, changement de statut).
     * @returns La racine de test.
     */
    function racineDeuxAudits(): DonneesRacine {
      const auditAvant = DonneesDeTest.auditComplet({
        id: 'audit-avant',
        decalageJours: -30,
        couverture: 40,
        violationsBloquant: 1,
        violationsCritique: 5,
        tailleOctets: 1_000_000,
        note: 1,
        dependances: [
          { reference: 'moment', version: '2.0.0', manifeste: 'package.json' },
          {
            reference: 'org.springframework:spring-core',
            version: '4.3.0',
            manifeste: 'pom.xml',
          },
          { reference: 'requestjs', version: '1.0.0', manifeste: 'package.json' },
        ],
        membres: [
          { username: 'jdupont', nom: 'Jean Dupont', niveauAcces: 30 },
          { username: 'ancienmembre', nom: 'Ancien Membre', niveauAcces: 20 },
        ],
        marqueurs: [],
      });
      const auditApres = DonneesDeTest.auditComplet({
        id: 'audit-apres',
        decalageJours: -1,
        couverture: 70,
        violationsBloquant: 3,
        violationsCritique: 2,
        tailleOctets: 2_500_000,
        note: 4,
        dependances: [
          { reference: 'moment', version: '2.0.0', manifeste: 'package.json' },
          {
            reference: 'org.springframework:spring-core',
            version: '5.3.30',
            manifeste: 'pom.xml',
          },
          { reference: 'lodash', version: '4.17.21', manifeste: 'package.json' },
        ],
        membres: [
          { username: 'jdupont', nom: 'Jean Dupont', niveauAcces: 30 },
          { username: 'inconnu1', nom: 'Personne Inconnue', niveauAcces: 40 },
        ],
        marqueurs: [{ chemin: '.copilot', nature: 'repertoire', outil: 'Copilot' }],
      });
      const projet = DonneesDeTest.projet(
        'projet-1',
        [auditAvant, auditApres],
        [
          {
            id: 'annotation-dans',
            date: DonneesDeTest.ilYA(-15),
            libelle: 'Jalon dans',
            categorie: 'jalon',
          },
          {
            id: 'annotation-hors',
            date: DonneesDeTest.ilYA(-200),
            libelle: 'Jalon hors intervalle',
            categorie: 'jalon',
          },
        ],
      );
      return DonneesDeTest.racine(projet);
    }

    it('affiche le delta de couverture, des violations, de la taille et des notes calculés entre les deux audits', () => {
      const fixture = creerFixture('projet-1', racineDeuxAudits());
      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.textContent).toContain('+30.0'); // couverture 40 -> 70
      expect(element.textContent).toContain('+2'); // violations bloquantes 1 -> 3 (delta positif)
      expect(element.textContent).toContain('-3'); // violations critiques 5 -> 2 (delta négatif)
      expect(element.textContent).toContain('+1.5 Mo'); // taille 1 000 000 -> 2 500 000 octets
    });

    it('affiche les ajouts, retraits et changements de statut d’obsolescence des dépendances', () => {
      const fixture = creerFixture('projet-1', racineDeuxAudits());
      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.textContent).toContain('lodash'); // ajout
      expect(element.textContent).toContain('requestjs'); // retrait
      expect(element.textContent).toContain('org.springframework:spring-core'); // modification
      expect(element.textContent).toContain('obsolète');
      expect(element.textContent).toContain('maintenu');
    });

    it('affiche les ajouts et retraits de membres, avec leur statut de rattachement recalculé', () => {
      const fixture = creerFixture('projet-1', racineDeuxAudits());
      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.textContent).toContain('inconnu1'); // ajout, statut inconnu
      expect(element.textContent).toContain('ancienmembre'); // retrait
    });

    it('affiche le marqueur IA ajouté et le statut IA global recalculé aux deux bords', () => {
      const fixture = creerFixture('projet-1', racineDeuxAudits());
      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.textContent).toContain('.copilot');
      expect(element.textContent).toContain('Avant : IA interdite');
      expect(element.textContent).toContain('Après : IA interdite · violation');
    });

    it('rappelle uniquement les annotations dont la date tombe dans l’intervalle comparé', () => {
      const fixture = creerFixture('projet-1', racineDeuxAudits());
      const element = DomTestUtils.obtenirElementNatif(fixture);
      expect(element.textContent).toContain('Jalon dans');
      expect(element.textContent).not.toContain('Jalon hors intervalle');
    });

    it(
      'déclenche l’export PNG au clic sur le bouton dédié (conteneur complet), nomme le fichier téléchargé ' +
        'comparaison-audits-<nomProjet normalisé>-<horodatage complet>.png (sans nom de groupe, C15-15/RG-047) ' +
        "et confirme l'export",
      async () => {
        const toPngSimule = jest.mocked(toPng);
        toPngSimule.mockResolvedValue('data:image/png;base64,xxx');
        let nomFichierTelecharge = '';
        const clicAncre = jest
          .spyOn(HTMLAnchorElement.prototype, 'click')
          .mockImplementation(function (this: HTMLAnchorElement) {
            nomFichierTelecharge = this.download;
          });

        const fixture = creerFixture('projet-1', racineDeuxAudits());
        const bouton = DomTestUtils.obtenirElementNatif(fixture).querySelector<HTMLButtonElement>(
          '.comparaison-audits__export',
        );
        expect(bouton).not.toBeNull();
        bouton?.click();
        await fixture.whenStable();

        expect(toPngSimule).toHaveBeenCalledTimes(1);
        const [elementExporte] = toPngSimule.mock.calls[0];
        expect(elementExporte.classList.contains('comparaison-audits')).toBe(true);
        expect(nomFichierTelecharge).toMatch(
          /^comparaison-audits-Projet-Test-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.png$/,
        );
        const notifications = TestBed.inject(NotificationService).liste();
        expect(notifications.length).toBe(1);
        expect(notifications[0]?.type).toBe('succes');
        expect(notifications[0]?.message).toContain(nomFichierTelecharge);
        clicAncre.mockRestore();
      },
    );

    it(
      'affiche, dans la catégorie « changement de statut », un membre présent aux deux bords dont la ' +
        'résolution recalculée diffère (ici, une résolution par domaine courriel disponible seulement côté audit ' +
        'le plus récent)',
      () => {
        const auditAvant = DonneesDeTest.auditComplet({
          id: 'audit-avant',
          decalageJours: -30,
          couverture: 40,
          violationsBloquant: 1,
          violationsCritique: 5,
          tailleOctets: 1_000_000,
          note: 1,
          dependances: [],
          membres: [{ username: 'csimon', nom: 'Camille Simon', niveauAcces: 20 }],
          marqueurs: [],
        });
        const auditApres = DonneesDeTest.auditComplet({
          id: 'audit-apres',
          decalageJours: -1,
          couverture: 70,
          violationsBloquant: 0,
          violationsCritique: 0,
          tailleOctets: 1_000_000,
          note: 4,
          dependances: [],
          membres: [
            {
              username: 'csimon',
              nom: 'Camille Simon',
              niveauAcces: 20,
              emailPublic: 'camille.simon@partenaire.fr',
            },
          ],
          marqueurs: [],
        });
        const projet = DonneesDeTest.projet('projet-1', [auditAvant, auditApres]);
        const racine = DonneesDeTest.racine(projet, [
          {
            id: 'membre-connu-2',
            critere: '*@partenaire.fr',
            typeCritere: TypeCritereMembre.DomaineEmail,
            statut: StatutMembre.Partenaire,
          },
        ]);

        const fixture = creerFixture('projet-1', racine);
        const etatValue = fixture.componentInstance.etat();
        if (etatValue.type !== 'pret') {
          throw new Error('État "pret" attendu.');
        }
        expect(etatValue.donnees.membres.modifications).toHaveLength(1);
        expect(etatValue.donnees.membres.modifications[0].username).toBe('csimon');

        const element = DomTestUtils.obtenirElementNatif(fixture);
        expect(element.textContent).toContain('csimon');
        expect(element.textContent).toContain('Changement de statut');
        expect(element.textContent).toContain('inconnu');
        expect(element.textContent).toContain('partenaire');
      },
    );

    it(
      'restitue le statut IA « autorisée » aux deux bords quand la politique IA courante du projet ' +
        'autorise l’usage (RG-011 : politique courante, jamais celle de l’époque de chaque audit)',
      () => {
        const auditAvant = DonneesDeTest.auditComplet({
          id: 'audit-avant',
          decalageJours: -30,
          couverture: 40,
          violationsBloquant: 0,
          violationsCritique: 0,
          tailleOctets: 1_000_000,
          note: 3,
          dependances: [],
          membres: [],
          marqueurs: [{ chemin: '.copilot', nature: 'repertoire', outil: 'Copilot' }],
        });
        const auditApres = DonneesDeTest.auditComplet({
          id: 'audit-apres',
          decalageJours: -1,
          couverture: 60,
          violationsBloquant: 0,
          violationsCritique: 0,
          tailleOctets: 1_000_000,
          note: 3,
          dependances: [],
          membres: [],
          marqueurs: [{ chemin: '.copilot', nature: 'repertoire', outil: 'Copilot' }],
        });
        const projet = DonneesDeTest.projet('projet-1', [auditAvant, auditApres], [], true);
        const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
        const element = DomTestUtils.obtenirElementNatif(fixture);
        expect(element.textContent).toContain('Avant : IA autorisée');
        expect(element.textContent).toContain('Après : IA autorisée');
      },
    );

    it('rappelle plusieurs annotations de l’intervalle triées de la plus récente à la plus ancienne', () => {
      const auditAvant = DonneesDeTest.auditComplet({
        id: 'audit-avant',
        decalageJours: -30,
        couverture: 40,
        violationsBloquant: 0,
        violationsCritique: 0,
        tailleOctets: 1_000_000,
        note: 3,
        dependances: [],
        membres: [],
        marqueurs: [],
      });
      const auditApres = DonneesDeTest.auditComplet({
        id: 'audit-apres',
        decalageJours: -1,
        couverture: 60,
        violationsBloquant: 0,
        violationsCritique: 0,
        tailleOctets: 1_000_000,
        note: 3,
        dependances: [],
        membres: [],
        marqueurs: [],
      });
      const projet = DonneesDeTest.projet(
        'projet-1',
        [auditAvant, auditApres],
        [
          {
            id: 'annotation-ancienne',
            date: DonneesDeTest.ilYA(-20),
            libelle: 'Jalon ancien',
            categorie: 'jalon',
          },
          {
            id: 'annotation-recente',
            date: DonneesDeTest.ilYA(-10),
            libelle: 'Jalon récent',
            categorie: 'jalon',
          },
        ],
      );
      const fixture = creerFixture('projet-1', DonneesDeTest.racine(projet));
      const etatValue = fixture.componentInstance.etat();
      if (etatValue.type !== 'pret') {
        throw new Error('État "pret" attendu.');
      }
      expect(etatValue.donnees.annotationsIntervalle.map((a) => a.id)).toEqual([
        'annotation-recente',
        'annotation-ancienne',
      ]);
    });
  });
});
