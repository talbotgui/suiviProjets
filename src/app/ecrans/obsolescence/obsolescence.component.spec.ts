// Test de l'écran Obsolescence (cf. obsolescence.component.ts), généré avec l'assistance de l'IA (Claude Code),
// conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';
import { toPng } from 'html-to-image';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import type { Audit, DonneesRacine, Groupe } from '../../services/avecetat/etat/types-donnees';
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
   * Construit un audit régulier portant un unique résultat `gitlab.dependances`.
   * @param date - Date de l'audit (`AAAA-MM-JJ`).
   * @param dependances - Dépendances constatées.
   * @returns L'audit de test.
   */
  public static audit(date: string, dependances: readonly DependanceTest[]): Audit {
    return {
      id: `audit-${date}`,
      date,
      campagneId: 'campagne-1',
      typeAudit: 'reguliere',
      resultats: [
        {
          type: 'gitlab.dependances',
          sourceId: 'source-1',
          refEffective: 'main',
          shaTete: 'abc',
          dependances: dependances.map((dependance) => ({ ...dependance })),
        },
      ],
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

describe('SqmObsolescenceComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let notification: NotificationService;

  beforeEach(async () => {
    jest.mocked(toPng).mockReset();
    jest.mocked(invoke).mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmObsolescenceComponent],
      providers: [provideRouter([])],
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

  it('ouvre puis ferme la modale de détail, dépendances triées par référence', () => {
    const racine = DonneesDeTest.racine([
      DonneesDeTest.groupe('g1', 'G1', 'p1', 'Projet 1', [
        DonneesDeTest.audit('2026-06-01', [
          { reference: 'org.springframework:spring-core', version: '5.0.0', manifeste: 'pom.xml' },
          { reference: 'java', version: '17', manifeste: 'pom.xml' },
        ]),
      ]),
    ]);
    const composant = creer(racine).componentInstance;

    composant.ouvrirDetail('p1');
    const detail = composant.detailProjetSelectionne();
    expect(detail?.nomProjet).toBe('Projet 1');
    expect(detail?.lignes.map((ligne) => ligne.reference)).toEqual([
      'java',
      'org.springframework:spring-core',
    ]);
    expect(detail?.lignes[0]).toMatchObject({ categorie: 'exec', retard: '4', estJava: true });

    composant.fermerDetail();
    expect(composant.detailProjetSelectionne()).toBeNull();
  });

  it('ne restitue aucun détail pour un projet inexistant', () => {
    const composant = creer(DonneesDeTest.racine([])).componentInstance;
    composant.ouvrirDetail('inexistant');
    expect(composant.detailProjetSelectionne()).toBeNull();
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
    fixture.componentInstance.ouvrirDetail('p1');
    fixture.detectChanges();

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

    fixture.componentInstance.ouvrirDetail('p1');
    fixture.detectChanges();
    fixture.componentInstance.fermerDetail();

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
    fixture.componentInstance.ouvrirDetail('p1');
    fixture.detectChanges();
    const panneau =
      DomTestUtils.obtenirElementNatif(fixture).querySelector<HTMLElement>('.obsolescence-detail');
    const focusables = panneau?.querySelectorAll<HTMLElement>('button') ?? [];
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
    const composant = creer(racine).componentInstance;
    composant.ouvrirDetail('p1');
    expect(composant.detailProjetSelectionne()).toMatchObject({
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
    const composant = creer(racine).componentInstance;

    composant.ouvrirDetail('p1');
    expect(composant.detailProjetSelectionne()?.lignes[0]).toMatchObject({
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
