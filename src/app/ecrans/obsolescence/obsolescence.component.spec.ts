// Test de l'écran Obsolescence (cf. obsolescence.component.ts), généré avec l'assistance de l'IA (Claude Code),
// conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';
import { toPng } from 'html-to-image';
import { ContexteConsultationService } from '../../services/avecetat/etat/contexte-consultation.service';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import type {
  Audit,
  DonneesRacine,
  Groupe,
  Resultat,
} from '../../services/avecetat/etat/types-donnees';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmObsolescenceComponent } from './obsolescence.component';

jest.mock('html-to-image', () => ({ toPng: jest.fn() }));
jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

interface DependanceTest {
  readonly reference: string;
  readonly version: string;
  readonly manifeste: string;
}

/** Fabriques de données de test (classe à membres statiques uniquement). */
class DonneesDeTest {
  /**
   * Construit un audit régulier portant un résultat `gitlab.dependances` et, si une ventilation est fournie, un
   * résultat `sonar.ncloc` (RG-057).
   * @param date - Date de l'audit (`AAAA-MM-JJ`).
   * @param dependances - Dépendances constatées.
   * @param parLangage - Ventilation Sonar par langage ; omise pour simuler un audit sans `sonar.ncloc`.
   * @returns L'audit de test.
   */
  public static audit(
    date: string,
    dependances: readonly DependanceTest[],
    parLangage?: Readonly<Record<string, number>>,
  ): Audit {
    const resultats: Resultat[] = [
      {
        type: 'gitlab.dependances',
        sourceId: 'source-1',
        refEffective: 'main',
        shaTete: 'abc',
        dependances: dependances.map((dependance) => ({ ...dependance })),
      },
    ];
    if (parLangage !== undefined) {
      resultats.push({
        type: 'sonar.ncloc',
        sourceId: 'source-1',
        ncloc: Object.values(parLangage).reduce((somme, lignes) => somme + lignes, 0),
        parLangage,
      });
    }
    return {
      id: `audit-${date}`,
      date,
      campagneId: 'campagne-1',
      typeAudit: 'reguliere',
      resultats,
    };
  }

  /**
   * Construit un groupe avec un projet et ses audits.
   * @param groupeId - Identifiant du groupe.
   * @param nomGroupe - Nom du groupe.
   * @param projetId - Identifiant du projet.
   * @param nomProjet - Nom du projet.
   * @param audits - Audits du projet.
   * @returns Le groupe de test.
   */
  public static groupe(
    groupeId: string,
    nomGroupe: string,
    projetId: string,
    nomProjet: string,
    audits: readonly Audit[],
  ): Groupe {
    return {
      id: groupeId,
      nom: nomGroupe,
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [
        {
          id: projetId,
          nom: nomProjet,
          description: '',
          iaAutorisee: false,
          sources: [],
          annotations: [],
          audits,
        },
      ],
    };
  }

  /**
   * Construit une racine de test avec les groupes fournis et le référentiel standard (catégories `exec`/`fmkBack`,
   * règles `java` -> exec et `org.springframework:*` -> fmkBack).
   * @param groupes - Groupes de la racine.
   * @returns La racine de test.
   */
  public static racine(groupes: readonly Groupe[]): DonneesRacine {
    return {
      versionSchema: 6,
      meta: {
        creeLe: '2026-01-01T00:00:00Z',
        modifieLe: '2026-01-01T00:00:00Z',
        application: 'Test',
      },
      groupes,
      referentiels: {
        reglesDependances: [
          {
            id: 'r-java',
            motif: 'java',
            categorie: 'cat-exec',
            versions: [
              { motifVersion: '21.*', statut: 'maintenu' },
              { motifVersion: '*', statut: 'obsolete' },
            ],
          },
          {
            id: 'r-spring',
            motif: 'org.springframework:*',
            categorie: 'cat-back',
            versions: [
              { motifVersion: '6.*', statut: 'maintenu' },
              { motifVersion: '*', statut: 'obsolete' },
            ],
          },
        ],
        reglesMarqueursIA: [],
        motifNommageBranches: '',
        categoriesDependances: [
          { id: 'cat-exec', libelle: 'exec', sigle: 'EXE' },
          { id: 'cat-back', libelle: 'fmkBack', sigle: 'FMB' },
        ],
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

/**
 * Composant factice cible des routes de test (`/obsolescence` et repli) : seul son enregistrement importe, jamais
 * son rendu ; le composant réellement sous test est instancié directement par `TestBed.createComponent`.
 */
@Component({ selector: 'app-composant-factice', template: '' })
class ComposantFactice {}

describe('SqmObsolescenceComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let notification: NotificationService;
  // Stub mutable d'`ActivatedRoute` : le constructeur du composant lit `snapshot.queryParamMap` pour amorcer le
  // filtre partagé depuis un lien contextuel pré-filtrant (plan_16 groupe 1.1). Repositionné à vide avant chaque
  // test, renseigné ponctuellement par les tests qui exercent ce pré-filtrage.
  let routeStub: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };

  beforeEach(async () => {
    jest.mocked(toPng).mockReset();
    jest.mocked(invoke).mockReset();
    routeStub = { snapshot: { queryParamMap: convertToParamMap({}) } };
    await TestBed.configureTestingModule({
      imports: [SqmObsolescenceComponent],
      providers: [
        provideRouter([
          { path: 'obsolescence', component: ComposantFactice },
          { path: '**', component: ComposantFactice },
        ]),
        { provide: ActivatedRoute, useValue: routeStub },
      ],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    notification = TestBed.inject(NotificationService);
  });

  /**
   * Crée un fixture avec la racine fournie chargée dans le Store.
   * @param racine - Racine à charger, `undefined` pour ne charger aucun fichier.
   * @returns Le fixture rendu.
   */
  function creer(racine?: DonneesRacine): ComponentFixture<SqmObsolescenceComponent> {
    if (racine !== undefined) {
      donneesApplication.chargerRacine(racine);
    }
    const fixture = TestBed.createComponent(SqmObsolescenceComponent);
    fixture.detectChanges();
    return fixture;
  }

  /**
   * Simule l'ouverture de la modale de détail par le paramètre de requête `projet` de la route (US-052, RG-052) :
   * depuis le plan_16 incrément 5, `ouvrirDetail` navigue et c'est `withComponentInputBinding()` qui alimente en
   * retour l'`input` `projet` ; ce raccourci pose directement cet `input` là où seul le contenu de la modale est
   * sous test, sans dérouler un cycle de navigation complet.
   * @param fixture - Fixture du composant.
   * @param projetId - Identifiant de projet à porter dans le paramètre de requête, `undefined` pour refermer.
   */
  function poserParametreProjet(
    fixture: ComponentFixture<SqmObsolescenceComponent>,
    projetId: string | undefined,
  ): void {
    fixture.componentRef.setInput('projet', projetId);
    fixture.detectChanges();
  }

  it('affiche le titre et le paragraphe d’introduction', () => {
    const element = DomTestUtils.obtenirElementNatif(creer());
    expect(element.querySelector('h1')?.textContent).toContain('Obsolescence');
    expect(element.textContent).toContain('retard maximal');
  });

  it('calcule le retard maximal par catégorie pour chaque projet', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'Groupe 1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
          { reference: 'org.springframework:spring-core', version: '5.0.0', manifeste: 'pom.xml' },
        ]),
      ]),
    ]);
    const composant = creer(racine).componentInstance;

    const ligne = composant.projetsAffiches()[0];
    expect(ligne.valeurParCategorie.get('cat-exec')).toBe(4); // 21 - 17
    expect(ligne.valeurParCategorie.get('cat-back')).toBe(1); // 6 - 5
    expect(composant.total()).toBe(1);
  });

  it('n’affiche que le sigle pour une catégorie sans dépendance concernée sur la tuile (repérage des catégories manquantes)', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'Groupe 1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]),
      ]),
    ]);
    const tuile = DomTestUtils.obtenirElementNatif(creer(racine)).querySelector(
      '.obsolescence__tuile',
    );

    expect(tuile?.textContent).toContain('EXE');
    expect(tuile?.textContent).toContain('FMB');
    // cat-exec porte une valeur (java) -> une seule barre ; cat-back n'a aucune dépendance -> sigle seul.
    expect(tuile?.querySelectorAll('.barre-mesure__rail')).toHaveLength(1);
    expect(tuile?.querySelectorAll('app-barre-mesure')).toHaveLength(2);
  });

  it('borne le maximum de chaque catégorie sur tous les projets, filtres ignorés', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'Groupe 1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]),
      ]),
      DonneesDeTest.groupe('g2', 'Groupe 2', 'p2', 'Projet 2', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '8', manifeste: 'pom.xml' },
        ]),
      ]),
    ]);
    const composant = creer(racine).componentInstance;
    expect(composant.maxParCategorie().get('cat-exec')).toBe(13); // 21 - 8
  });

  it('filtre par groupe via le filtre groupe/projet mutualisé (RG-053)', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'Groupe 1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]),
      ]),
      DonneesDeTest.groupe('g2', 'Groupe 2', 'p2', 'Projet 2', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '8', manifeste: 'pom.xml' },
        ]),
      ]),
    ]);
    const composant = creer(racine).componentInstance;

    composant.onSelectionGroupeProjet({ groupeId: 'g2', projetIds: null });
    expect(composant.projetsAffiches().map((ligne) => ligne.projetId)).toEqual(['p2']);
    composant.onSelectionGroupeProjet({ groupeId: null, projetIds: null });
    expect(composant.projetsAffiches()).toHaveLength(2);
  });

  it('filtre par projets via le filtre groupe/projet mutualisé (RG-053)', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'Groupe 1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]),
      ]),
      DonneesDeTest.groupe('g2', 'Groupe 2', 'p2', 'Projet 2', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '8', manifeste: 'pom.xml' },
        ]),
      ]),
    ]);
    const composant = creer(racine).componentInstance;
    expect(composant.projetsAffiches()).toHaveLength(2);

    composant.onSelectionGroupeProjet({ groupeId: null, projetIds: ['p1'] });
    expect(composant.projetsAffiches().map((ligne) => ligne.projetId)).toEqual(['p1']);

    composant.onSelectionGroupeProjet({ groupeId: null, projetIds: null });
    expect(composant.projetsAffiches()).toHaveLength(2);
  });

  it('exclut un projet hors des bornes min/max resserrées d’une catégorie', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'Groupe 1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]), // retard 4
      ]),
      DonneesDeTest.groupe('g2', 'Groupe 2', 'p2', 'Projet 2', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '8', manifeste: 'pom.xml' },
        ]), // retard 13
      ]),
    ]);
    const composant = creer(racine).componentInstance;

    composant.onChangerBorne('cat-exec', 'max', '10');
    expect(composant.projetsAffiches().map((ligne) => ligne.projetId)).toEqual(['p1']);
  });

  it('retient le dernier audit régulier antérieur ou égal à la date du filtre', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'Groupe 1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-01-01', [
          { reference: 'java', version: '8', manifeste: 'pom.xml' },
        ]),
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]),
      ]),
    ]);
    const composant = creer(racine).componentInstance;

    composant.onChangerDate('2026-03-01');
    expect(composant.projetsAffiches()[0].valeurParCategorie.get('cat-exec')).toBe(13); // audit de janvier
  });

  it('calcule la médiane par catégorie sur les projets affichés', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'G1', 'p1', 'P1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]), // 4
      ]),
      DonneesDeTest.groupe('g2', 'G2', 'p2', 'P2', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '11', manifeste: 'pom.xml' },
        ]), // 10
      ]),
      DonneesDeTest.groupe('g3', 'G3', 'p3', 'P3', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '8', manifeste: 'pom.xml' },
        ]), // 13
      ]),
    ]);
    const composant = creer(racine).componentInstance;
    expect(composant.medianeParCategorie().get('cat-exec')).toBe(10);
  });

  it('restitue le détail du dernier audit quand le paramètre de requête `projet` désigne un projet connu, dépendances triées par référence', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'org.springframework:spring-core', version: '5.0.0', manifeste: 'pom.xml' },
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]),
      ]),
    ]);
    const fixture = creer(racine);

    poserParametreProjet(fixture, 'p1');
    const detail = fixture.componentInstance.detailProjetSelectionne();
    expect(detail?.nomProjet).toBe('Projet 1');
    expect(detail?.lignes.map((ligne) => ligne.reference)).toEqual([
      'java',
      'org.springframework:spring-core',
    ]);
    expect(detail?.lignes[0]).toMatchObject({ categorie: 'exec', retard: '4', estJava: true });

    poserParametreProjet(fixture, undefined);
    expect(fixture.componentInstance.detailProjetSelectionne()).toBeNull();
  });

  it('ouvre la modale via `ouvrirDetail` puis la referme en reculant dans l’historique de navigation (US-052, RG-052)', async () => {
    const router = TestBed.inject(Router);
    const fixture = creer(
      DonneesDeTest.racine([
        DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
          DonneesDeTest.audit('2026-06-01', [
            { reference: 'java', version: '17', manifeste: 'pom.xml' },
          ]),
        ]),
      ]),
    );

    await router.navigateByUrl('/obsolescence');
    fixture.componentInstance.ouvrirDetail('p1');
    await fixture.whenStable();
    // `withComponentInputBinding()` alimenterait l'`input` `projet` sur un composant routé ; simulé ici (composant
    // instancié directement) pour que la garde de `fermerDetail` voie la modale ouverte.
    poserParametreProjet(fixture, 'p1');
    expect(router.url).toContain('projet=p1');

    fixture.componentInstance.fermerDetail();
    await fixture.whenStable();
    expect(router.url).toBe('/obsolescence');
  });

  it('ignore sans erreur un paramètre de requête `projet` désignant un projet inconnu, modale close (RG-052)', () => {
    const fixture = creer(DonneesDeTest.racine([]));
    poserParametreProjet(fixture, 'inexistant');
    expect(fixture.componentInstance.detailProjetSelectionne()).toBeNull();
  });

  it('affiche dans le pied de la modale un lien « Ouvrir la fiche projet » ciblant la Fiche projet, libellé rappelant la date de l’audit retenu (plan_16 groupe 1.1, US-052)', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]),
      ]),
    ]);
    const fixture = creer(racine);
    poserParametreProjet(fixture, 'p1');

    const lien = DomTestUtils.obtenirElementNatif(fixture).querySelector<HTMLAnchorElement>(
      '#obsolescence-detail-fiche-projet',
    );
    expect(lien?.getAttribute('href')).toBe('/fiche-projet/p1');
    expect(lien?.textContent).toContain('2026-06-01');
  });

  it('amorce le filtre partagé depuis le paramètre de requête `groupeId` d’un lien contextuel pré-filtrant (plan_16 groupe 1.1, RG-053 [B.4])', () => {
    routeStub.snapshot.queryParamMap = convertToParamMap({ groupeId: 'g2' });
    const contexte = TestBed.inject(ContexteConsultationService);
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', []),
      DonneesDeTest.groupe('g2', 'G2', 'p2', 'Projet 2', []),
    ]);
    creer(racine);

    expect(contexte.etat().groupeId).toBe('g2');
    expect(contexte.filtreModifieParUtilisateur()).toBe(true);
  });

  it('distingue une même dépendance déclarée dans deux manifestes, sans plantage de rendu (B1)', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'com.google.guava:guava', version: '31.0', manifeste: 'pom.xml' },
          { reference: 'com.google.guava:guava', version: '30.0', manifeste: 'build.gradle' },
        ]),
      ]),
    ]);
    const fixture = creer(racine);
    poserParametreProjet(fixture, 'p1');

    const lignes = fixture.componentInstance.detailProjetSelectionne()?.lignes ?? [];
    expect(lignes).toHaveLength(2);
    expect(lignes.map((ligne) => ligne.manifeste)).toEqual(['build.gradle', 'pom.xml']);
    expect(
      DomTestUtils.obtenirElementNatif(fixture).querySelectorAll(
        '.obsolescence-detail__tableau tbody tr',
      ),
    ).toHaveLength(2);
  });

  it('restaure le focus sur l’élément déclencheur à la fermeture de la modale (N7, RNF-019)', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]),
      ]),
    ]);
    const fixture = creer(racine);
    const declencheur =
      DomTestUtils.obtenirElementNatif(fixture).querySelector<HTMLButtonElement>(
        '.obsolescence__tuile',
      );
    declencheur?.focus();
    expect(document.activeElement).toBe(declencheur);

    // `ouvrirDetail` mémorise l'élément déclencheur puis navigue ; `withComponentInputBinding()` alimenterait en
    // retour l'`input` `projet`, simulé ici par `poserParametreProjet`. Idem au retour pour la fermeture.
    fixture.componentInstance.ouvrirDetail('p1');
    poserParametreProjet(fixture, 'p1');
    fixture.componentInstance.fermerDetail();
    poserParametreProjet(fixture, undefined);

    expect(document.activeElement).toBe(declencheur);
    expect(fixture.componentInstance.detailProjetSelectionne()).toBeNull();
  });

  it('piège le focus dans le panneau de la modale (N7)', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]),
      ]),
    ]);
    const fixture = creer(racine);
    poserParametreProjet(fixture, 'p1');
    const panneau =
      DomTestUtils.obtenirElementNatif(fixture).querySelector<HTMLElement>('.obsolescence-detail');
    // Sous-ensemble du sélecteur de `piegerFocus` (sans `input`/`[tabindex]`, absents de cette modale), suffisant
    // ici : le pied de la modale porte désormais un lien `<a>` (« Ouvrir la fiche projet », plan_16 groupe 1.1)
    // en plus du bouton « Fermer », d'où le premier/dernier focusable qui ne sont plus tous deux des `button`.
    const focusables =
      panneau?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [];
    const dernier = focusables[focusables.length - 1];
    dernier.focus();

    const evenement = new KeyboardEvent('keydown', { key: 'Tab' });
    const preventDefault = jest.spyOn(evenement, 'preventDefault');
    fixture.componentInstance.piegerFocus(evenement);

    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(focusables[0]);
  });

  it('indique « jamais audité » dans la modale d’un projet sans audit retenu', () => {
    const racine = DonneesDeTest.racine([DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [])]);
    const fixture = creer(racine);
    poserParametreProjet(fixture, 'p1');
    expect(fixture.componentInstance.detailProjetSelectionne()).toMatchObject({
      nomProjet: 'Projet 1',
      dateAudit: 'jamais audité',
      lignes: [],
    });
  });

  it('n’applique pas un filtre de catégorie ramené à sa pleine amplitude', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]),
      ]),
      DonneesDeTest.groupe('g2', 'G2', 'p2', 'Projet 2', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '8', manifeste: 'pom.xml' },
        ]),
      ]),
    ]);
    const composant = creer(racine).componentInstance;

    composant.onChangerBorne('cat-exec', 'max', '5');
    expect(composant.projetsAffiches()).toHaveLength(1);
    composant.onChangerBorne('cat-exec', 'max', '999');
    expect(composant.projetsAffiches()).toHaveLength(2);
  });

  it('restitue « — » dans la modale pour une dépendance hors référentiel', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'paquet-inconnu', version: '1.2.3', manifeste: 'package.json' },
        ]),
      ]),
    ]);
    const fixture = creer(racine);

    poserParametreProjet(fixture, 'p1');
    expect(fixture.componentInstance.detailProjetSelectionne()?.lignes[0]).toMatchObject({
      reference: 'paquet-inconnu',
      categorie: '—',
      retard: '—',
      estJava: false,
    });
  });

  it('construit l’infobulle d’un projet, catégorie sans dépendance incluse', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]),
      ]),
    ]);
    const composant = creer(racine).componentInstance;
    const infobulle = composant.projetsAffiches()[0].infobulle;
    expect(infobulle).toContain('exec : 4 version(s) majeure(s) de retard');
    expect(infobulle).toContain('fmkBack : aucune dépendance');
  });

  describe('langages principaux (US-057)', () => {
    it('affiche une icône par langage principal en fin de ligne du nom sur la tuile quand deux langages dépassent 10 %', () => {
      const racine = DonneesDeTest.racine([
        DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
          DonneesDeTest.audit(
            '2026-06-01',
            [{ reference: 'java', version: '17', manifeste: 'pom.xml' }],
            {
              java: 7000,
              ts: 3000,
            },
          ),
        ]),
      ]);
      const tuile = DomTestUtils.obtenirElementNatif(creer(racine)).querySelector(
        '.obsolescence__tuile',
      );
      const langages = tuile?.querySelector('.obsolescence__langages');
      expect(langages).not.toBeNull();
      expect(langages?.querySelectorAll('app-icone-langage')).toHaveLength(2);
    });

    it('n’affiche aucune zone de langages quand l’audit retenu ne porte pas de ventilation par langage', () => {
      const racine = DonneesDeTest.racine([
        DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
          DonneesDeTest.audit('2026-06-01', [
            { reference: 'java', version: '17', manifeste: 'pom.xml' },
          ]),
        ]),
      ]);
      const tuile = DomTestUtils.obtenirElementNatif(creer(racine)).querySelector(
        '.obsolescence__tuile',
      );
      expect(tuile?.querySelector('.obsolescence__langages')).toBeNull();
    });

    it('n’affiche aucune zone de langages pour un projet jamais audité', () => {
      const racine = DonneesDeTest.racine([DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [])]);
      const tuile = DomTestUtils.obtenirElementNatif(creer(racine)).querySelector(
        '.obsolescence__tuile',
      );
      expect(tuile).not.toBeNull();
      expect(tuile?.querySelector('.obsolescence__langages')).toBeNull();
    });

    it('n’affiche qu’une icône quand le second langage pèse moins de 10 %', () => {
      const racine = DonneesDeTest.racine([
        DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
          DonneesDeTest.audit(
            '2026-06-01',
            [{ reference: 'java', version: '17', manifeste: 'pom.xml' }],
            {
              java: 9500,
              ts: 500,
            },
          ),
        ]),
      ]);
      const tuile = DomTestUtils.obtenirElementNatif(creer(racine)).querySelector(
        '.obsolescence__tuile',
      );
      expect(tuile?.querySelectorAll('.obsolescence__langages app-icone-langage')).toHaveLength(1);
    });

    it('enrichit l’infobulle d’une ligne « Langages : … » quand la liste est non vide', () => {
      const racine = DonneesDeTest.racine([
        DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
          DonneesDeTest.audit(
            '2026-06-01',
            [{ reference: 'java', version: '17', manifeste: 'pom.xml' }],
            {
              java: 7000,
              ts: 3000,
            },
          ),
        ]),
      ]);
      const infobulle = creer(racine).componentInstance.projetsAffiches()[0].infobulle;
      expect(infobulle).toContain('Langages : java, ts');
    });
  });

  it('exclut un projet sous la borne min resserrée d’une catégorie', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '21', manifeste: 'pom.xml' }, // retard 0
        ]),
      ]),
      DonneesDeTest.groupe('g2', 'G2', 'p2', 'Projet 2', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'java', version: '8', manifeste: 'pom.xml' }, // retard 13
        ]),
      ]),
    ]);
    const composant = creer(racine).componentInstance;

    composant.onChangerBorne('cat-exec', 'min', '5');
    expect(composant.projetsAffiches().map((ligne) => ligne.projetId)).toEqual(['p2']);
  });

  it('affiche un message quand aucune catégorie n’est définie', () => {
    const racine = DonneesDeTest.racine([]);
    const racineSansCategorie: DonneesRacine = {
      ...racine,
      referentiels: { ...racine.referentiels, categoriesDependances: [] },
    };
    const element = DomTestUtils.obtenirElementNatif(creer(racineSansCategorie));
    expect(element.textContent).toContain("Aucune catégorie de dépendance n'est définie");
  });

  it('associe une teinte distincte à chaque catégorie et cycle la palette au-delà de 6', () => {
    const racine = DonneesDeTest.racine([]);
    const septCategories = Array.from({ length: 7 }, (_valeur, index) => ({
      id: `c${index}`,
      libelle: `Cat ${index}`,
      sigle: 'CAT',
    }));
    const composant = creer({
      ...racine,
      referentiels: { ...racine.referentiels, categoriesDependances: septCategories },
    }).componentInstance;

    const couleurs = composant.couleurParCategorie();
    expect(couleurs.get('c0')).not.toBe(couleurs.get('c1'));
    expect(couleurs.get('c6')).toBe(couleurs.get('c0')); // 7e catégorie -> retour au début de la palette
    expect(couleurs.get('inconnue')).toBeUndefined();
  });

  it('exporte la grille en PNG et notifie du nom de fichier', async () => {
    jest.mocked(toPng).mockResolvedValue('data:image/png;base64,AAA');
    const succes = jest.spyOn(notification, 'succes');
    const composant = creer(DonneesDeTest.racine([])).componentInstance;

    await composant.exporterPng();

    expect(toPng).toHaveBeenCalledTimes(1);
    expect(succes).toHaveBeenCalledWith(expect.stringContaining('obsolescence-'));
  });

  describe('vues enregistrées (US-028, RG-027 amendée, plan_16 incrément 3)', () => {
    it('applique la sélection groupe/projet portée par une vue choisie', () => {
      const composant = creer(DonneesDeTest.racine([])).componentInstance;

      composant.appliquerVue({
        id: 'v1',
        nom: 'Mon périmètre',
        parDefaut: false,
        filtres: { groupeId: 'g1', projetIds: ['p1'] },
      });

      expect(composant.filtreGroupeId()).toBe('g1');
      expect(composant.filtreProjetIds()).toEqual(['p1']);
    });

    it('ignore silencieusement une vue dont les filtres ne correspondent pas à la forme attendue', () => {
      const composant = creer(DonneesDeTest.racine([])).componentInstance;
      composant.onSelectionGroupeProjet({ groupeId: 'g1', projetIds: null });

      composant.appliquerVue({ id: 'v1', nom: 'Invalide', parDefaut: false, filtres: 'texte' });
      composant.appliquerVue({
        id: 'v2',
        nom: 'Projets invalides',
        parDefaut: false,
        filtres: { groupeId: 'g1', projetIds: [42] },
      });

      expect(composant.filtreGroupeId()).toBe('g1');
    });

    it('enregistre une vue avec la sélection groupe/projet courante et met à jour la racine (US-028)', async () => {
      const racineInitiale = DonneesDeTest.racine([]);
      donneesApplication.chargerRacine(racineInitiale);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      const racineMiseAJour = { ...racineInitiale, versionSchema: 11 };
      jest.mocked(invoke).mockResolvedValue(racineMiseAJour);

      const composant = TestBed.createComponent(SqmObsolescenceComponent).componentInstance;
      composant.onSelectionGroupeProjet({ groupeId: 'g1', projetIds: null });

      await composant.enregistrerVue({
        id: undefined,
        nom: 'Ma vue',
        parDefaut: true,
        motDePasse: 'mot-de-passe',
      });

      expect(invoke).toHaveBeenCalledWith(
        'definir_vue',
        expect.objectContaining({
          ecran: 'obsolescence',
          versionFiltres: 1,
          parDefaut: true,
          filtres: { groupeId: 'g1', projetIds: null },
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

      const composant = TestBed.createComponent(SqmObsolescenceComponent).componentInstance;
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
      const racineMiseAJour = { ...racineInitiale, versionSchema: 11 };
      jest.mocked(invoke).mockResolvedValue(racineMiseAJour);

      const composant = TestBed.createComponent(SqmObsolescenceComponent).componentInstance;
      await composant.supprimerVue({ id: 'v1', motDePasse: 'mot-de-passe' });

      expect(invoke).toHaveBeenCalledWith(
        'supprimer_vue',
        expect.objectContaining({ id: 'v1', motDePasse: 'mot-de-passe' }),
      );
      expect(donneesApplication.racine()).toBe(racineMiseAJour);
    });

    it('amorce le filtre partagé avec la vue par défaut de cet écran à l’ouverture (RG-053)', () => {
      const racine = DonneesDeTest.racine([]);
      const racineAvecVueParDefaut: DonneesRacine = {
        ...racine,
        vuesEnregistrees: [
          {
            id: 'v1',
            nom: 'Vue par défaut',
            ecran: 'obsolescence',
            versionFiltres: 1,
            parDefaut: true,
            filtres: { groupeId: 'g1', projetIds: null },
          },
        ],
      };
      const composant = creer(racineAvecVueParDefaut).componentInstance;

      expect(composant.filtreGroupeId()).toBe('g1');
      expect(composant.contexte.filtreModifieParUtilisateur()).toBe(false);
    });

    it('fait primer le paramètre de requête `groupeId` sur la vue par défaut de l’écran (RG-053 [B.4] n°1)', () => {
      routeStub.snapshot.queryParamMap = convertToParamMap({ groupeId: 'g2' });
      const racine = DonneesDeTest.racine([]);
      const racineAvecVueParDefaut: DonneesRacine = {
        ...racine,
        vuesEnregistrees: [
          {
            id: 'v1',
            nom: 'Vue par défaut',
            ecran: 'obsolescence',
            versionFiltres: 1,
            parDefaut: true,
            filtres: { groupeId: 'g1', projetIds: null },
          },
        ],
      };
      const composant = creer(racineAvecVueParDefaut).componentInstance;

      expect(composant.filtreGroupeId()).toBe('g2');
      expect(composant.contexte.filtreModifieParUtilisateur()).toBe(true);
    });

    it('ignore une vue dont la version de filtres est obsolète et avertit l’utilisateur', () => {
      const racine = DonneesDeTest.racine([]);
      const racineAvecVueObsolete: DonneesRacine = {
        ...racine,
        vuesEnregistrees: [
          {
            id: 'v1',
            nom: 'Ancienne vue',
            ecran: 'obsolescence',
            versionFiltres: 0,
            parDefaut: false,
            filtres: { groupeId: 'g1', projetIds: null },
          },
        ],
      };
      const composant = creer(racineAvecVueObsolete).componentInstance;

      expect(composant.vuesApplicables()).toHaveLength(0);
      expect(composant.nombreVuesIgnorees()).toBe(1);
    });
  });
});
