// Test de l'écran Synthèse des audits (cf. synthese-audits.component.ts, US-015, RG-009, RG-011, RG-013, RG-022),
// généré avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';
import { toPng } from 'html-to-image';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import { StatutMembre, TypeCritereMembre } from '../../services/avecetat/etat/types-donnees';
import type {
  Audit,
  DonneesRacine,
  Groupe,
  MembreConnu,
  Projet,
  TypeAudit,
} from '../../services/avecetat/etat/types-donnees';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmSyntheseAuditsComponent } from './synthese-audits.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));
jest.mock('html-to-image', () => ({ toPng: jest.fn() }));

/**
 * Composant factice utilisé comme cible de route de test (cf. `SqmShellComponent`, même motif) : seul son
 * enregistrement importe pour vérifier la navigation déclenchée par `activerLigne`, jamais son rendu.
 */
@Component({ selector: 'app-composant-factice', template: '' })
class ComposantFactice {}

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
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
   * Construit un audit complet, couvrant les 8 types de résultats consommés par cet écran, personnalisable par les
   * options fournies.
   * @param options - Valeurs personnalisées de l'audit de test.
   * @param options.date - Date de l'audit, ISO 8601.
   * @param options.dernierCommitLe - Date du dernier commit constaté (`gitlab.vitalite`/`croise.fraicheur_sonar`).
   * @param options.derniereAnalyseLe - Date de la dernière analyse Sonar (`croise.fraicheur_sonar`).
   * @param options.aucuneAnalyse - `true` si le projet n'a jamais été analysé par Sonar.
   * @param options.usernamesMembres - Identifiants des membres du dépôt constatés lors de cet audit.
   * @param options.mrOuvertes - Demandes de fusion ouvertes constatées.
   * @param options.marqueurs - Marqueurs d'outils IA détectés.
   * @param options.typeAudit - Catégorie de l'audit (C15-14, RG-046), `'reguliere'` par défaut.
   * @returns L'audit de test.
   */
  public static auditComplet(options: {
    readonly date?: string;
    readonly dernierCommitLe?: string;
    readonly derniereAnalyseLe?: string;
    readonly aucuneAnalyse?: boolean;
    readonly usernamesMembres?: readonly string[];
    readonly mrOuvertes?: readonly {
      readonly iid: number;
      readonly titre: string;
      readonly creeLe: string;
      readonly enConflit: boolean;
      readonly webUrl: string;
    }[];
    readonly marqueurs?: readonly {
      readonly chemin: string;
      readonly nature: string;
      readonly outil: string;
    }[];
    readonly typeAudit?: TypeAudit;
  }): Audit {
    const dernierCommitLe = options.dernierCommitLe ?? DonneesDeTest.ilYA(-5);
    return {
      id: `audit-${options.date ?? 'defaut'}`,
      date: options.date ?? DonneesDeTest.ilYA(0),
      campagneId: 'campagne-1',
      typeAudit: options.typeAudit ?? 'reguliere',
      resultats: [
        {
          type: 'gitlab.vitalite',
          sourceId: 'source-gitlab',
          refEffective: 'main',
          shaTete: 'abc123',
          dernierCommitLe,
        },
        {
          type: 'gitlab.taille_depot',
          sourceId: 'source-gitlab',
          refEffective: 'main',
          shaTete: 'abc123',
          tailleOctets: 1_000_000,
        },
        {
          type: 'gitlab.merge_requests',
          sourceId: 'source-gitlab',
          refEffective: 'main',
          shaTete: 'abc123',
          mrOuvertes: options.mrOuvertes ?? [],
        },
        {
          type: 'gitlab.membres',
          sourceId: 'source-gitlab',
          refEffective: 'main',
          shaTete: 'abc123',
          membres: (options.usernamesMembres ?? ['jdupont']).map((username) => ({
            username,
            nom: username,
            niveauAcces: 30,
            direct: true,
            groupesInvites: [],
          })),
        },
        {
          type: 'gitlab.marqueurs_ia',
          sourceId: 'source-gitlab',
          refEffective: 'main',
          shaTete: 'abc123',
          marqueurs: options.marqueurs ?? [],
        },
        {
          type: 'sonar.couverture',
          sourceId: 'source-sonar',
          couverture: 80,
          couvertureNouveauCode: 90,
        },
        {
          type: 'sonar.notes',
          sourceId: 'source-sonar',
          fiabilite: 1,
          securite: 1,
          maintenabilite: 1,
          revueSecurite: 1,
        },
        {
          type: 'sonar.violations',
          sourceId: 'source-sonar',
          parSeverite: { bloquant: 0, critique: 0, majeur: 0, mineur: 0, info: 0 },
          nouvellesViolations: 0,
        },
        {
          type: 'croise.fraicheur_sonar',
          dernierCommitLe,
          derniereAnalyseLe:
            options.aucuneAnalyse === true
              ? undefined
              : (options.derniereAnalyseLe ?? dernierCommitLe),
          aucuneAnalyse: options.aucuneAnalyse ?? false,
        },
      ],
    };
  }

  /**
   * Construit un projet de test.
   * @param id - Identifiant du projet.
   * @param nom - Nom du projet.
   * @param audits - Historique des audits du projet.
   * @param iaAutorisee - Politique d'autorisation de l'IA du projet (RG-014, faux par défaut).
   * @returns Le projet de test.
   */
  public static projet(
    id: string,
    nom: string,
    audits: readonly Audit[],
    iaAutorisee = false,
  ): Projet {
    return {
      id,
      nom,
      description: '',
      iaAutorisee,
      sources: [],
      annotations: [],
      audits,
    };
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
   * Construit une racine de test avec les groupes fournis.
   * @param groupes - Groupes de la racine de test.
   * @param campagnes - Traces d'exécution des campagnes, vide par défaut.
   * @returns La racine de test.
   */
  public static racine(
    groupes: readonly Groupe[],
    campagnes: DonneesRacine['campagnes'] = [],
  ): DonneesRacine {
    return {
      versionSchema: 1,
      meta: {
        creeLe: '2026-07-20T08:00:00Z',
        modifieLe: '2026-07-20T08:00:00Z',
        application: 'Test',
      },
      groupes,
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
      campagnes,
      brouillon: null,
      traitementsAlertes: [],
      journal: [],
      vuesEnregistrees: [],
    };
  }

  /**
   * Construit un jeu de données de référence pour cet écran : un groupe A (« Groupe A ») avec un projet sain et un
   * projet SONAR_KO comportant un membre inconnu, et un groupe B (« Groupe B ») avec un projet jamais audité.
   * @returns La racine de test.
   */
  public static racineDeBase(): DonneesRacine {
    const projetSain = DonneesDeTest.projet('projet-sain', 'Projet Sain', [
      DonneesDeTest.auditComplet({ usernamesMembres: ['jdupont'] }),
    ]);
    const projetSonarKo = DonneesDeTest.projet('projet-sonar-ko', 'Projet SonarKO', [
      DonneesDeTest.auditComplet({
        dernierCommitLe: DonneesDeTest.ilYA(0),
        derniereAnalyseLe: DonneesDeTest.ilYA(-60),
        usernamesMembres: ['inconnu1'],
      }),
    ]);
    const groupeA: Groupe = {
      id: 'groupe-a',
      nom: 'Groupe A',
      description: '',
      instances: [],
      membresConnus: [DonneesDeTest.membreConnu('jdupont')],
      annotations: [],
      indicateursDesactives: [],
      projets: [projetSain, projetSonarKo],
    };
    const projetJamaisAudite = DonneesDeTest.projet('projet-jamais', 'Jamais Audité', []);
    const groupeB: Groupe = {
      id: 'groupe-b',
      nom: 'Groupe B',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [projetJamaisAudite],
    };
    return DonneesDeTest.racine([groupeA, groupeB]);
  }

  /**
   * Construit un second jeu de données couvrant les cas de calcul avancés non exercés par {@link racineDeBase} :
   * badge AUDIT ANCIEN, icône de campagne en échec, vitalité au rouge (« Mort »), MR ouvertes avec conflit (âge
   * orange, taux de conflit rouge, la couleur la plus grave l'emportant), IA en violation, vitalité au orange
   * (« Mourant ») et IA autorisée avec marqueurs détectés.
   * @returns La racine de test.
   */
  public static racineCasAvances(): DonneesRacine {
    const projetAncienEnEchec = DonneesDeTest.projet(
      'projet-ancien-echec',
      'Projet Ancien Échec',
      [
        DonneesDeTest.auditComplet({
          date: DonneesDeTest.ilYA(-40),
          dernierCommitLe: DonneesDeTest.ilYA(-400),
          marqueurs: [{ chemin: '.cursorrules', nature: 'fichier', outil: 'cursor' }],
        }),
      ],
      false,
    );
    const projetVitaliteOrangeMr = DonneesDeTest.projet(
      'projet-vitalite-orange',
      'Projet Vitalité Orange',
      [
        DonneesDeTest.auditComplet({
          dernierCommitLe: DonneesDeTest.ilYA(-200),
          mrOuvertes: [
            {
              iid: 1,
              titre: 'A',
              creeLe: DonneesDeTest.ilYA(-40),
              enConflit: true,
              webUrl: 'https://gitlab.exemple.test/groupe/projet/-/merge_requests/1',
            },
            {
              iid: 2,
              titre: 'B',
              creeLe: DonneesDeTest.ilYA(-5),
              enConflit: false,
              webUrl: 'https://gitlab.exemple.test/groupe/projet/-/merge_requests/2',
            },
          ],
          marqueurs: [{ chemin: 'CLAUDE.md', nature: 'fichier', outil: 'claude' }],
        }),
      ],
      true,
    );
    const groupe: Groupe = {
      id: 'groupe-avance',
      nom: 'Groupe Avancé',
      description: '',
      instances: [],
      membresConnus: [DonneesDeTest.membreConnu('jdupont')],
      annotations: [],
      indicateursDesactives: [],
      projets: [projetAncienEnEchec, projetVitaliteOrangeMr],
    };
    const campagnes: DonneesRacine['campagnes'] = [
      {
        id: 'campagne-1',
        date: DonneesDeTest.ilYA(-1),
        perimetre: ['projet-ancien-echec'],
        verdicts: [{ projetId: 'projet-ancien-echec', statut: 'echec' }],
      },
    ];
    return DonneesDeTest.racine([groupe], campagnes);
  }
}

describe('SqmSyntheseAuditsComponent', () => {
  beforeEach(async () => {
    jest.mocked(invoke).mockReset();
    jest.mocked(toPng).mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmSyntheseAuditsComponent],
      providers: [provideRouter([{ path: '**', component: ComposantFactice }])],
    }).compileComponents();
  });

  /**
   * Crée et initialise un fixture du composant, avec la racine fournie chargée dans le Store.
   * @param racine - Racine à charger avant le rendu, `undefined` pour ne charger aucun fichier.
   * @returns Le fixture prêt à l'emploi.
   */
  function creerFixture(racine?: DonneesRacine): ComponentFixture<SqmSyntheseAuditsComponent> {
    const donneesApplication = TestBed.inject(DonneesApplicationService);
    if (racine !== undefined) {
      donneesApplication.chargerRacine(racine);
    }
    const fixture = TestBed.createComponent(SqmSyntheseAuditsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('affiche les 12 colonnes de la maquette de référence, plus la colonne Dépendances (Phase 15)', () => {
    const fixture = creerFixture(DonneesDeTest.racineDeBase());

    expect(fixture.componentInstance.colonnes()).toHaveLength(13);
    const libelles = fixture.componentInstance.colonnes().map((colonne) => colonne.libelle);
    expect(libelles).toEqual([
      'Projet',
      'Groupe',
      'Dernier audit',
      'Vitalité',
      'Taille',
      'Couverture',
      'Notes Sonar',
      'Violations',
      'MR ouvertes',
      'Membres',
      'IA',
      'Sonar',
      'Dépendances',
    ]);

    const entetes = Array.from(
      DomTestUtils.obtenirElementNatif(fixture).querySelectorAll('thead tr:first-child th'),
    ).map((entete) => entete.textContent?.trim());
    for (const libelle of libelles) {
      expect(entetes.some((texte) => texte?.includes(libelle))).toBe(true);
    }
  });

  it(
    'trie les lignes par défaut par nom de projet (ordre alphabétique insensible à la casse), avant tout tri ' +
      'utilisateur des en-têtes, quel que soit l’ordre brut des groupes/projets dans le fichier de données',
    () => {
      const fixture = creerFixture(DonneesDeTest.racineDeBase());

      expect(fixture.componentInstance.toutesLesLignes().map((ligne) => ligne.nomProjet)).toEqual([
        'Jamais Audité',
        'Projet Sain',
        'Projet SonarKO',
      ]);

      const premiereColonneParLigne = Array.from(
        DomTestUtils.obtenirElementNatif(fixture).querySelectorAll('tbody tr'),
      ).map((ligne) => ligne.querySelector('td')?.textContent?.trim());
      expect(premiereColonneParLigne[0]).toContain('Jamais Audité');
      expect(premiereColonneParLigne[1]).toContain('Projet Sain');
      expect(premiereColonneParLigne[2]).toContain('Projet SonarKO');
    },
  );

  it(
    'compte les dépendances par statut (inconnue/obsolète/maintenue, RG-011), fusionnées entre plusieurs ' +
      'sources GitLab du même projet plutôt que de ne retenir que la première (R15-06)',
    () => {
      const audit: Audit = {
        ...DonneesDeTest.auditComplet({}),
        resultats: [
          ...DonneesDeTest.auditComplet({}).resultats,
          {
            type: 'gitlab.dependances',
            sourceId: 'source-back',
            refEffective: 'main',
            shaTete: 'abc123',
            dependances: [
              {
                reference: 'org.springframework:spring-core',
                version: '4.3.0',
                manifeste: 'pom.xml',
              },
              { reference: 'moment', version: '2.29.0', manifeste: 'package.json' },
            ],
          },
          {
            type: 'gitlab.dependances',
            sourceId: 'source-front',
            refEffective: 'main',
            shaTete: 'def456',
            dependances: [
              {
                reference: 'org.springframework:spring-core',
                version: '6.1.0',
                manifeste: 'build.gradle',
              },
              { reference: 'paquet-inconnu', version: '1.0.0', manifeste: 'package.json' },
            ],
          },
        ],
      };
      const projet = DonneesDeTest.projet('projet-1', 'Projet Multi-sources', [audit]);
      const groupe: Groupe = {
        id: 'groupe-1',
        nom: 'Groupe',
        description: '',
        instances: [],
        membresConnus: [DonneesDeTest.membreConnu('jdupont')],
        annotations: [],
        indicateursDesactives: [],
        projets: [projet],
      };
      const racine = DonneesDeTest.racine([groupe]);
      const racineAvecReferentiel: DonneesRacine = {
        ...racine,
        referentiels: {
          ...racine.referentiels,
          reglesDependances: [
            {
              id: 'regle-spring',
              motif: 'org.springframework:*',
              versions: [
                { motifVersion: '4.*', statut: 'obsolete' },
                { motifVersion: '6.*', statut: 'aJourM1' },
              ],
            },
            {
              id: 'regle-moment',
              motif: 'moment',
              versions: [{ motifVersion: '*', statut: 'obsolete' }],
            },
          ],
        },
      };

      const fixture = creerFixture(racineAvecReferentiel);
      const ligne = fixture.componentInstance.toutesLesLignes()[0];

      // spring-core : une occurrence obsolète (4.3.0, source back) et une maintenue (6.1.0, source front) —
      // les DEUX occurrences sont comptées (jamais fusionnées en une seule ligne comme dans la Fiche projet, cette
      // synthèse ne portant pas de tableau détaillé par dépendance). moment : obsolète. paquet-inconnu : inconnue.
      expect(ligne.dependances).toEqual({ inconnues: 1, obsoletes: 2, maintenues: 1 });

      const colonneDependances = fixture.componentInstance
        .colonnes()
        .find((colonne) => colonne.cle === 'dependances');
      expect(colonneDependances?.extraireTexteBrut(ligne)).toBe(
        '1 inconnue(s), 2 obsolète(s), 1 maintenue(s)',
      );
    },
  );

  it(
    'trie la colonne Couverture sur la valeur numérique du pourcentage, jamais sur son libellé formaté ' +
      '(`extraireValeurTri` : « 100.0 % » précédait « 5.0 % » en tri alphabétique avant correction)',
    () => {
      const fixture = creerFixture(DonneesDeTest.racineDeBase());
      const composant = fixture.componentInstance;
      const colonneCouverture = composant
        .colonnes()
        .find((colonne) => colonne.cle === 'couverture');
      const ligneProjetSain = composant
        .toutesLesLignes()
        .find((ligne) => ligne.nomProjet === 'Projet Sain');
      if (ligneProjetSain === undefined) {
        throw new Error('Ligne « Projet Sain » introuvable.');
      }

      expect(ligneProjetSain.couverture?.label).toBe('80.0 %');
      expect(colonneCouverture?.extraireValeurTri?.(ligneProjetSain)).toBe(80);
    },
  );

  it(
    'trie la colonne MR ouvertes sur le décompte numérique brut, jamais sur son libellé formaté ' +
      '(`extraireValeurTri`), 0 en l’absence de demande de fusion ouverte',
    () => {
      const fixture = creerFixture(DonneesDeTest.racineCasAvances());
      const composant = fixture.componentInstance;
      const colonneMr = composant.colonnes().find((colonne) => colonne.cle === 'mrOuvertes');
      const ligneSansMr = composant
        .toutesLesLignes()
        .find((ligne) => ligne.nomProjet === 'Projet Ancien Échec');
      const ligneDeuxMr = composant
        .toutesLesLignes()
        .find((ligne) => ligne.nomProjet === 'Projet Vitalité Orange');
      if (ligneSansMr === undefined || ligneDeuxMr === undefined) {
        throw new Error('Lignes de test introuvables.');
      }

      expect(ligneSansMr.mr?.label).toBe('Aucune');
      expect(colonneMr?.extraireValeurTri?.(ligneSansMr)).toBe(0);
      expect(ligneDeuxMr.mr?.label).toBe('2 · 1 conflit');
      expect(colonneMr?.extraireValeurTri?.(ligneDeuxMr)).toBe(2);
    },
  );

  it(
    'compte les MR ouvertes fusionnées entre plusieurs sources GitLab du même projet, jamais seulement celles ' +
      'de la première (même classe d’anomalie que R15-06, corrigée le 2026-08-24 pour cette colonne)',
    () => {
      const audit: Audit = {
        ...DonneesDeTest.auditComplet({}),
        resultats: [
          ...DonneesDeTest.auditComplet({}).resultats,
          {
            type: 'gitlab.merge_requests',
            sourceId: 'source-front',
            refEffective: 'main',
            shaTete: 'def456',
            mrOuvertes: [
              {
                iid: 5,
                titre: 'Ajout composant',
                creeLe: DonneesDeTest.ilYA(-3),
                enConflit: false,
                webUrl: 'https://gitlab.exemple.test/groupe/projet-front/-/merge_requests/5',
              },
            ],
          },
        ],
      };
      const projet = DonneesDeTest.projet('projet-1', 'Projet Multi-sources MR', [audit]);
      const groupe: Groupe = {
        id: 'groupe-1',
        nom: 'Groupe',
        description: '',
        instances: [],
        membresConnus: [],
        annotations: [],
        indicateursDesactives: [],
        projets: [projet],
      };

      const fixture = creerFixture(DonneesDeTest.racine([groupe]));
      const ligne = fixture.componentInstance.toutesLesLignes()[0];

      // La première source (`gitlab.merge_requests` par défaut de `auditComplet`) ne porte aucune MR ouverte :
      // sans agrégation multi-sources, la colonne afficherait à tort « Aucune » malgré la MR de la seconde source.
      expect(ligne.mr?.label).toBe('1 · ok');
    },
  );

  it('grise la ligne « jamais audité » sans lui appliquer aucun seuil de couleur (état particulier)', () => {
    const fixture = creerFixture(DonneesDeTest.racineDeBase());
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const lignes = Array.from(element.querySelectorAll('tbody tr'));
    const ligneJamaisAuditee = lignes.find((ligne) => ligne.textContent?.includes('Jamais Audité'));
    expect(ligneJamaisAuditee).not.toBeUndefined();
    expect(ligneJamaisAuditee?.classList.contains('tableau-dense__ligne--grisee')).toBe(true);
    expect(ligneJamaisAuditee?.textContent).toContain('jamais audité');
    // Aucun seuil de couleur applicable : ni badge ni texte coloré dans cette ligne.
    expect(ligneJamaisAuditee?.querySelectorAll('.badge').length).toBe(0);
    expect(ligneJamaisAuditee?.querySelectorAll('.tableau-dense__texte-couleur').length).toBe(0);
  });

  it(
    'restitue les données du dernier audit **régulier**, jamais d’un audit historique plus récent ' +
      '(C15-14, RG-046) : un audit historique ne collectant jamais gitlab.taille_depot, une sélection naïve du ' +
      'dernier audit produit ferait disparaître la colonne Taille alors qu’une valeur régulière existe',
    () => {
      /**
       * Réplique locale de `SqmSyntheseAuditsComponent.formaterDate` (méthode privée, non testable directement) :
       * permet de comparer le libellé affiché sans dépendre d'un format de date écrit en dur, insensible au fuseau
       * horaire d'exécution du test (même méthode `new Date(...)` que le composant, dans le même processus ;
       * même réplique déjà utilisée dans `fiche-projet.component.spec.ts` pour le même besoin RG-046).
       * @param dateIso - Date ISO 8601 à mettre en forme.
       * @returns Le libellé court correspondant.
       */
      function formaterDate(dateIso: string): string {
        const date = new Date(dateIso);
        const deuxChiffres = (valeur: number): string => valeur.toString().padStart(2, '0');
        return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
      }

      const auditRegulier = DonneesDeTest.auditComplet({ date: DonneesDeTest.ilYA(-10) });
      const auditHistorique = DonneesDeTest.auditComplet({
        date: DonneesDeTest.ilYA(-1),
        typeAudit: 'historique',
      });
      // L'audit historique est intégré APRÈS l'audit régulier (dernier de `Projet.audits`) : un `.at(-1)` naïf
      // le sélectionnerait à tort comme « dernier audit » de la ligne de synthèse.
      const projet = DonneesDeTest.projet('projet-historique', 'Projet Historique', [
        auditRegulier,
        auditHistorique,
      ]);
      const groupe: Groupe = {
        id: 'groupe-historique',
        nom: 'Groupe Historique',
        description: '',
        instances: [],
        membresConnus: [],
        annotations: [],
        indicateursDesactives: [],
        projets: [projet],
      };

      const fixture = creerFixture(DonneesDeTest.racine([groupe]));
      const ligne = fixture.componentInstance.toutesLesLignes()[0];

      expect(ligne.jamaisAudite).toBe(false);
      expect(ligne.dateAuditLabel).toBe(formaterDate(auditRegulier.date));
      expect(ligne.dateAuditLabel).not.toBe(formaterDate(auditHistorique.date));
      const colonneTaille = fixture.componentInstance
        .colonnes()
        .find((colonne) => colonne.cle === 'taille');
      expect(colonneTaille?.extraireTexteBrut(ligne)).not.toBe('—');
    },
  );

  it('grise les seules cellules Sonar (Couverture, Notes, Violations) d’une ligne SONAR_KO (RG-013), jamais les autres', () => {
    const fixture = creerFixture(DonneesDeTest.racineDeBase());
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const lignes = Array.from(element.querySelectorAll('tbody tr'));
    const ligneSonarKo = lignes.find((ligne) => ligne.textContent?.includes('Projet SonarKO'));
    expect(ligneSonarKo).not.toBeUndefined();
    if (ligneSonarKo === undefined) {
      throw new Error('Ligne SONAR_KO introuvable.');
    }
    expect(ligneSonarKo.textContent).toContain('SONAR_KO');

    const cellules = Array.from(ligneSonarKo.querySelectorAll('td'));
    // Ordre des colonnes : Projet(0) Groupe(1) DernierAudit(2) Vitalité(3) Taille(4) Couverture(5) Notes(6)
    // Violations(7) MR(8) Membres(9) IA(10) Sonar(11).
    expect(cellules[5].classList.contains('tableau-dense__cellule--grisee')).toBe(true);
    expect(cellules[6].classList.contains('tableau-dense__cellule--grisee')).toBe(true);
    expect(cellules[7].classList.contains('tableau-dense__cellule--grisee')).toBe(true);
    expect(cellules[3].classList.contains('tableau-dense__cellule--grisee')).toBe(false);
    expect(cellules[8].classList.contains('tableau-dense__cellule--grisee')).toBe(false);
    expect(cellules[9].classList.contains('tableau-dense__cellule--grisee')).toBe(false);
    expect(cellules[11].classList.contains('tableau-dense__cellule--grisee')).toBe(false);
  });

  it('affiche le bandeau membre inconnu (RG-009) quand un membre inconnu existe sur un projet', () => {
    const fixture = creerFixture(DonneesDeTest.racineDeBase());
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(fixture.componentInstance.membreInconnuDetecteGlobalement()).toBe(true);
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(element.textContent).toContain('membre au statut inconnu');
  });

  it('ne masque jamais l’alerte membre inconnu (RG-009), quelle que soit la combinaison de filtres appliquée', () => {
    const fixture = creerFixture(DonneesDeTest.racineDeBase());
    const composant = fixture.componentInstance;
    const element = DomTestUtils.obtenirElementNatif(fixture);

    // Combinaison 1 : filtre de groupe excluant le groupe du projet à membre inconnu (« Groupe A »).
    composant.onSelectionGroupeProjet({ groupeId: 'groupe-b', projetIds: null });
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr').length).toBe(1);
    expect(
      Array.from(element.querySelectorAll('tbody tr')).some((l) =>
        l.textContent?.includes('SonarKO'),
      ),
    ).toBe(false);
    expect(composant.membreInconnuDetecteGlobalement()).toBe(true);
    expect(element.querySelector('[role="alert"]')).not.toBeNull();

    // Combinaison 2 : recherche texte ne correspondant à aucun projet (tableau dense vide, RG-009 par ailleurs).
    composant.onSelectionGroupeProjet({ groupeId: null, projetIds: null });
    composant.onChangerRecherche('zzz-introuvable');
    fixture.detectChanges();
    expect(composant.compteurProjets()).toBe(0);
    expect(composant.membreInconnuDetecteGlobalement()).toBe(true);
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(element.textContent).toContain('membre au statut inconnu');

    // Combinaison 3 : filtre par indicateur n'ayant aucun rapport avec le membre inconnu.
    composant.onChangerRecherche('');
    composant.onChangerIndicateur('mrOuvertes');
    fixture.detectChanges();
    expect(composant.membreInconnuDetecteGlobalement()).toBe(true);
    expect(element.querySelector('[role="alert"]')).not.toBeNull();

    // Combinaison 4 : tri interne du tableau dense (ne masque jamais de ligne, seulement les réordonne).
    composant.onChangerIndicateur('tous');
    fixture.detectChanges();
    const boutonTriProjet = element.querySelector<HTMLButtonElement>('.tableau-dense__bouton-tri');
    boutonTriProjet?.click();
    fixture.detectChanges();
    expect(composant.membreInconnuDetecteGlobalement()).toBe(true);
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('filtre les lignes par groupe, par indicateur en alerte et par recherche texte', () => {
    const fixture = creerFixture(DonneesDeTest.racineDeBase());
    const composant = fixture.componentInstance;
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(composant.compteurProjets()).toBe(3);

    composant.onSelectionGroupeProjet({ groupeId: 'groupe-a', projetIds: null });
    fixture.detectChanges();
    expect(composant.compteurProjets()).toBe(2);

    composant.onSelectionGroupeProjet({ groupeId: null, projetIds: null });
    composant.onChangerIndicateur('sonarKo');
    fixture.detectChanges();
    expect(composant.compteurProjets()).toBe(1);
    // Assertions portées sur le corps du tableau : le sélecteur multi-projets de la barre de filtres commune
    // affiche par ailleurs tous les noms de projets, indépendamment du filtre appliqué au tableau.
    expect(element.querySelector('tbody')?.textContent).toContain('Projet SonarKO');
    expect(element.querySelector('tbody')?.textContent).not.toContain('Projet Sain');

    composant.onChangerIndicateur('tous');
    composant.onChangerRecherche('sain');
    fixture.detectChanges();
    expect(composant.compteurProjets()).toBe(1);
    expect(element.querySelector('tbody')?.textContent).toContain('Projet Sain');
  });

  it('affiche des valeurs neutres en l’absence de tout fichier chargé', () => {
    const fixture = creerFixture();

    expect(fixture.componentInstance.toutesLesLignes()).toEqual([]);
    expect(fixture.componentInstance.membreInconnuDetecteGlobalement()).toBe(false);
    expect(fixture.componentInstance.compteurProjets()).toBe(0);
  });

  it(
    'déclenche l’export PNG au clic sur le bouton dédié, nomme le fichier téléchargé ' +
      'synthese-audits-<horodatage complet>.png (sans nom de projet, écran multi-projets, C15-15/RG-047) et ' +
      "confirme l'export",
    async () => {
      const toPngSimule = jest.mocked(toPng);
      toPngSimule.mockResolvedValue('data:image/png;base64,xxx');
      let nomFichierTelecharge = '';
      const clicAncre = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          nomFichierTelecharge = this.download;
        });

      const fixture = creerFixture(DonneesDeTest.racineDeBase());
      const bouton = DomTestUtils.obtenirElementNatif(fixture).querySelector<HTMLButtonElement>(
        '.synthese-audits__export',
      );
      expect(bouton).not.toBeNull();
      bouton?.click();
      await fixture.whenStable();

      expect(toPngSimule).toHaveBeenCalledTimes(1);
      const [elementExporte] = toPngSimule.mock.calls[0];
      expect(elementExporte.classList.contains('synthese-audits')).toBe(true);
      expect(clicAncre).toHaveBeenCalledTimes(1);
      expect(nomFichierTelecharge).toMatch(
        /^synthese-audits-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.png$/,
      );
      const notifications = TestBed.inject(NotificationService).liste();
      expect(notifications.length).toBe(1);
      expect(notifications[0]?.type).toBe('succes');
      expect(notifications[0]?.message).toContain(nomFichierTelecharge);

      clicAncre.mockRestore();
    },
  );

  it('calcule correctement les cas avancés : AUDIT ANCIEN, campagne en échec, vitalité rouge, IA en violation', () => {
    const fixture = creerFixture(DonneesDeTest.racineCasAvances());
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const lignes = Array.from(element.querySelectorAll('tbody tr'));
    const ligne = lignes.find((candidate) =>
      candidate.textContent?.includes('Projet Ancien Échec'),
    );
    expect(ligne).not.toBeUndefined();
    if (ligne === undefined) {
      throw new Error('Ligne introuvable.');
    }

    expect(ligne.textContent).toContain('AUDIT ANCIEN');
    expect(ligne.querySelector('[title="Dernière campagne en échec"]')).not.toBeNull();
    expect(ligne.textContent).toContain('Mort ·');
    expect(ligne.textContent).toContain('interdite — violation (cursor)');
    const badgeIa = Array.from(ligne.querySelectorAll('.badge')).find((badge) =>
      badge.textContent?.includes('violation'),
    );
    expect(badgeIa?.classList.contains('badge--rouge')).toBe(true);
  });

  it('calcule correctement les cas avancés : vitalité orange, MR ouvertes en conflit (couleur la plus grave retenue), IA autorisée avec marqueurs', () => {
    const fixture = creerFixture(DonneesDeTest.racineCasAvances());
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const lignes = Array.from(element.querySelectorAll('tbody tr'));
    const ligne = lignes.find((candidate) =>
      candidate.textContent?.includes('Projet Vitalité Orange'),
    );
    expect(ligne).not.toBeUndefined();
    if (ligne === undefined) {
      throw new Error('Ligne introuvable.');
    }

    expect(ligne.textContent).toContain('Mourant ·');
    expect(ligne.textContent).toContain('2 · 1 conflit');
    const badgeMr = Array.from(ligne.querySelectorAll('.badge')).find((badge) =>
      badge.textContent?.includes('conflit'),
    );
    // Âge (orange) et taux de conflit (rouge) combinés : la couleur la plus grave (rouge) l'emporte.
    expect(badgeMr?.classList.contains('badge--rouge')).toBe(true);
    expect(ligne.textContent).toContain('autorisée · claude');
  });

  it('distingue par une couleur dédiée (bleu) le statut IA « interdite — ok sous réserve » du statut « autorisée » (R10-03)', () => {
    const fixture = creerFixture(DonneesDeTest.racineDeBase());
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const lignes = Array.from(element.querySelectorAll('tbody tr'));
    const ligne = lignes.find((candidate) => candidate.textContent?.includes('Projet Sain'));
    expect(ligne).not.toBeUndefined();
    if (ligne === undefined) {
      throw new Error('Ligne introuvable.');
    }

    expect(ligne.textContent).toContain('interdite — ok');
    const badgeIa = Array.from(ligne.querySelectorAll('.badge')).find((badge) =>
      badge.textContent?.includes('interdite — ok'),
    );
    expect(badgeIa?.classList.contains('badge--bleu')).toBe(true);
    expect(badgeIa?.classList.contains('badge--vert')).toBe(false);
  });

  it('trie correctement selon chacune des colonnes triables (couvre chaque fonction d’extraction de texte brut)', () => {
    const fixture = creerFixture(DonneesDeTest.racineDeBase());
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const boutonsTri = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.tableau-dense__bouton-tri'),
    );
    // Colonnes triables dans l'ordre : Projet, Groupe, Dernier audit, Vitalité, Taille, Couverture, MR ouvertes,
    // Membres, IA (Notes Sonar, Violations et Sonar ne sont pas triables).
    expect(boutonsTri.length).toBe(9);
    for (const bouton of boutonsTri) {
      bouton.click();
      fixture.detectChanges();
    }
    // Aucune exception levée et le tableau reste peuplé : chaque fonction d'extraction de texte brut a été exercée
    // sans erreur.
    expect(element.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
  });

  it('filtre selon chacune des clés de l’indicateur sélectionné', () => {
    const fixture = creerFixture(DonneesDeTest.racineCasAvances());
    const composant = fixture.componentInstance;

    for (const cle of [
      'vitalite',
      'couverture',
      'violations',
      'mrOuvertes',
      'membresInconnus',
      'ia',
    ] as const) {
      composant.onChangerIndicateur(cle);
      fixture.detectChanges();
      // Ne doit jamais lever d'exception ; le compteur reste un nombre valide (0 à N).
      expect(composant.compteurProjets()).toBeGreaterThanOrEqual(0);
    }

    // Valeur inconnue transmise par le sélecteur : repli sur 'tous' plutôt qu'une exception.
    composant.onChangerIndicateur('valeur-invalide');
    fixture.detectChanges();
    expect(composant.compteurProjets()).toBe(2);
  });

  it('affiche un déclencheur d’explication du calcul uniquement sur les colonnes reposant sur un seuil ou un référentiel', () => {
    const fixture = creerFixture(DonneesDeTest.racineDeBase());
    const entetes = Array.from(
      DomTestUtils.obtenirElementNatif(fixture).querySelectorAll('thead tr:first-child th'),
    );
    // Ordre des colonnes : Projet(0) Groupe(1) DernierAudit(2) Vitalité(3) Taille(4) Couverture(5) Notes(6)
    // Violations(7) MR(8) Membres(9) IA(10) Sonar(11) Dépendances(12).
    const colonnesAvecExplication = new Set([3, 5, 7, 8, 10, 12]);
    entetes.forEach((entete, index) => {
      const declencheur = entete.querySelector('app-explication-jugement');
      if (colonnesAvecExplication.has(index)) {
        expect(declencheur).not.toBeNull();
      } else {
        expect(declencheur).toBeNull();
      }
    });
  });

  it('l’explication de la colonne Vitalité restitue le seuil réellement appliqué (parametres.seuils.vitalite)', () => {
    const fixture = creerFixture(DonneesDeTest.racineDeBase());
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const enteteVitalite = element.querySelectorAll('thead tr:first-child th')[3];

    const bouton = enteteVitalite.querySelector<HTMLButtonElement>(
      '.explication-jugement__declencheur',
    );
    expect(bouton).not.toBeNull();
    bouton?.click();
    fixture.detectChanges();

    const popover = enteteVitalite.querySelector('[role="tooltip"]');
    expect(popover?.textContent).toContain('180 j');
    expect(popover?.textContent).toContain('365 j');
  });

  it('l’explication de la colonne Couverture restitue le seuil réellement appliqué (parametres.seuils.couverture)', () => {
    const fixture = creerFixture(DonneesDeTest.racineDeBase());
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const enteteCouverture = element.querySelectorAll('thead tr:first-child th')[5];

    enteteCouverture
      .querySelector<HTMLButtonElement>('.explication-jugement__declencheur')
      ?.click();
    fixture.detectChanges();

    const popover = enteteCouverture.querySelector('[role="tooltip"]');
    expect(popover?.textContent).toContain('40 %');
    expect(popover?.textContent).toContain('60 %');
  });

  it('l’explication de la colonne IA restitue le référentiel des marqueurs IA réellement appliqué', () => {
    const racine = DonneesDeTest.racineDeBase();
    const racineAvecReglesIa: DonneesRacine = {
      ...racine,
      referentiels: {
        ...racine.referentiels,
        reglesMarqueursIA: [
          {
            id: 'regle-marqueur-ia-1',
            motif: '.cursorrules',
            typeCorrespondance: 'exact',
            portee: 'racine',
            nature: 'fichier',
            outil: 'cursor',
          },
        ],
      },
    };
    const fixture = creerFixture(racineAvecReglesIa);
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const enteteIa = element.querySelectorAll('thead tr:first-child th')[10];

    enteteIa.querySelector<HTMLButtonElement>('.explication-jugement__declencheur')?.click();
    fixture.detectChanges();

    const popover = enteteIa.querySelector('[role="tooltip"]');
    expect(popover?.textContent).toContain('cursor');
    expect(popover?.textContent).toContain('.cursorrules');
  });

  it('l’explication de la colonne IA signale explicitement l’absence de règle quand le référentiel est vide', () => {
    const fixture = creerFixture(DonneesDeTest.racineDeBase());
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const enteteIa = element.querySelectorAll('thead tr:first-child th')[10];

    enteteIa.querySelector<HTMLButtonElement>('.explication-jugement__declencheur')?.click();
    fixture.detectChanges();

    const popover = enteteIa.querySelector('[role="tooltip"]');
    expect(popover?.textContent).toContain('Aucune règle de détection de marqueurs IA définie');
  });

  it('activerLigne navigue vers la Fiche projet (US-017) du projet concerné', async () => {
    const fixture = creerFixture(DonneesDeTest.racineDeBase());
    const router = TestBed.inject(Router);

    fixture.componentInstance.activerLigne(fixture.componentInstance.toutesLesLignes()[0]);
    await fixture.whenStable();

    expect(router.url).toBe(
      `/fiche-projet/${fixture.componentInstance.toutesLesLignes()[0].projetId}`,
    );
  });

  describe('vues enregistrées (US-028, RG-027, Phase 9 incrément 2)', () => {
    it('applique la sélection groupe/projet portée par une vue choisie (RG-027 amendée)', () => {
      const fixture = creerFixture(DonneesDeTest.racine([]));
      const composant = fixture.componentInstance;

      composant.appliquerVue({
        id: 'v1',
        nom: 'Mon groupe et deux projets',
        parDefaut: false,
        filtres: { groupeId: 'groupe-1', projetIds: ['p1', 'p2'] },
      });

      expect(composant.filtreGroupeId()).toBe('groupe-1');
      expect(composant.filtreProjetIds()).toEqual(['p1', 'p2']);
      expect(composant.contexte.filtreModifieParUtilisateur()).toBe(true);
    });

    it('ignore silencieusement une vue dont les filtres ne correspondent pas à la forme attendue', () => {
      const fixture = creerFixture(DonneesDeTest.racine([]));
      const composant = fixture.componentInstance;
      composant.onSelectionGroupeProjet({ groupeId: 'groupe-1', projetIds: null });

      composant.appliquerVue({ id: 'v1', nom: 'Vue invalide', parDefaut: false, filtres: 'texte' });
      composant.appliquerVue({
        id: 'v2',
        nom: 'projetIds invalide',
        parDefaut: false,
        filtres: { groupeId: 'groupe-1', projetIds: 'pas-un-tableau' },
      });
      composant.appliquerVue({
        id: 'v3',
        nom: 'Groupe de type invalide',
        parDefaut: false,
        filtres: { groupeId: 42, projetIds: null },
      });

      expect(composant.filtreGroupeId()).toBe('groupe-1');
      expect(composant.filtreProjetIds()).toBeNull();
    });

    it('enregistre une vue avec les filtres courants et met à jour la racine (US-028)', async () => {
      const racineInitiale = DonneesDeTest.racine([]);
      const racineMiseAJour = { ...racineInitiale, versionSchema: 2 };
      jest.mocked(invoke).mockResolvedValue(racineMiseAJour);
      const fixture = creerFixture(racineInitiale);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      const composant = fixture.componentInstance;
      composant.onSelectionGroupeProjet({ groupeId: 'groupe-1', projetIds: ['p1'] });
      composant.onChangerIndicateur('couverture');

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
          ecran: 'syntheseAudits',
          versionFiltres: 1,
          parDefaut: true,
          filtres: { groupeId: 'groupe-1', projetIds: ['p1'] },
          motDePasse: 'mot-de-passe',
        }),
      );
      expect(TestBed.inject(NotificationService).liste()).toEqual([
        expect.objectContaining({ type: 'succes' }),
      ]);
      expect(TestBed.inject(DonneesApplicationService).racine()).toBe(racineMiseAJour);
    });

    it("affiche un message d'erreur lorsque l'enregistrement d'une vue échoue", async () => {
      jest.mocked(invoke).mockRejectedValue({ type: 'erreurInterne' });
      const fixture = creerFixture(DonneesDeTest.racine([]));
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      const composant = fixture.componentInstance;

      await composant.enregistrerVue({
        id: undefined,
        nom: 'Ma vue',
        parDefaut: false,
        motDePasse: 'mot-de-passe',
      });

      expect(TestBed.inject(NotificationService).liste()).toEqual([
        expect.objectContaining({ type: 'erreur' }),
      ]);
    });

    it('supprime une vue et met à jour la racine (US-028)', async () => {
      const racineInitiale = DonneesDeTest.racine([]);
      const racineMiseAJour = { ...racineInitiale, versionSchema: 2 };
      jest.mocked(invoke).mockResolvedValue(racineMiseAJour);
      const fixture = creerFixture(racineInitiale);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      const composant = fixture.componentInstance;

      await composant.supprimerVue({ id: 'v1', motDePasse: 'mot-de-passe' });

      expect(invoke).toHaveBeenCalledWith(
        'supprimer_vue',
        expect.objectContaining({ id: 'v1', motDePasse: 'mot-de-passe' }),
      );
      expect(TestBed.inject(NotificationService).liste()).toEqual([]);
      expect(TestBed.inject(DonneesApplicationService).racine()).toBe(racineMiseAJour);
    });

    it("affiche un message d'erreur lorsque la suppression d'une vue échoue", async () => {
      jest.mocked(invoke).mockRejectedValue({ type: 'vueIntrouvable' });
      const fixture = creerFixture(DonneesDeTest.racine([]));
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      const composant = fixture.componentInstance;

      await composant.supprimerVue({ id: 'id-inconnu', motDePasse: 'mot-de-passe' });

      expect(TestBed.inject(NotificationService).liste()).toEqual([
        expect.objectContaining({ type: 'erreur' }),
      ]);
    });

    it('amorce le filtre partagé avec la sélection de la vue par défaut de cet écran à l’ouverture', () => {
      const racine = DonneesDeTest.racine([]);
      const racineAvecVueParDefaut: DonneesRacine = {
        ...racine,
        vuesEnregistrees: [
          {
            id: 'v1',
            nom: 'Vue par défaut',
            ecran: 'syntheseAudits',
            versionFiltres: 1,
            parDefaut: true,
            filtres: { groupeId: 'groupe-1', projetIds: null },
          },
        ],
      };

      const fixture = creerFixture(racineAvecVueParDefaut);

      expect(fixture.componentInstance.filtreGroupeId()).toBe('groupe-1');
      expect(fixture.componentInstance.filtreProjetIds()).toBeNull();
      // Amorçage par la vue par défaut : le filtre n'est pas encore réputé « modifié par l'utilisateur » (RG-053).
      expect(fixture.componentInstance.contexte.filtreModifieParUtilisateur()).toBe(false);
    });

    it("n'écrase jamais un choix de filtre de l'utilisateur par la vue par défaut de l'écran", () => {
      const racine = DonneesDeTest.racine([]);
      const racineAvecVueParDefaut: DonneesRacine = {
        ...racine,
        vuesEnregistrees: [
          {
            id: 'v1',
            nom: 'Vue par défaut',
            ecran: 'syntheseAudits',
            versionFiltres: 1,
            parDefaut: true,
            filtres: { groupeId: 'groupe-1', projetIds: null },
          },
        ],
      };
      const fixture = creerFixture(racineAvecVueParDefaut);
      const composant = fixture.componentInstance;
      expect(composant.filtreGroupeId()).toBe('groupe-1');

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
            ecran: 'syntheseAudits',
            versionFiltres: 0,
            parDefaut: false,
            filtres: { groupeId: 'groupe-1', projetIds: null },
          },
        ],
      };

      const fixture = creerFixture(racineAvecVueObsolete);

      expect(fixture.componentInstance.vuesApplicables()).toHaveLength(0);
      expect(fixture.componentInstance.nombreVuesIgnorees()).toBe(1);
    });
  });
});
