// Test de l'écran Synthèse graphique (cf. synthese-graphique.component.ts, US-016, RG-011, RG-022, RG-023), généré
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { invoke } from '@tauri-apps/api/core';
import { toPng } from 'html-to-image';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import type {
  Annotation,
  Audit,
  DonneesRacine,
  EntreeJournal,
  Groupe,
  Projet,
  Resultat,
  TypeAudit,
} from '../../services/avecetat/etat/types-donnees';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmSyntheseGraphiqueComponent } from './synthese-graphique.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));
jest.mock('html-to-image', () => ({ toPng: jest.fn() }));

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction hors
 * classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit un audit ne portant que les constats consommés par cet écran (couverture, violations, taille du
   * dépôt, MR ouvertes), personnalisable par les options fournies.
   * @param date - Date de l'audit, ISO 8601.
   * @param options - Valeurs personnalisées de l'audit de test.
   * @param options.couverture - Pourcentage de couverture constaté, absent si aucune source Sonar n'est simulée.
   * @param options.violationsBloquant - Nombre de violations bloquantes constaté.
   * @param options.violationsCritique - Nombre de violations critiques constaté.
   * @param options.tailleOctets - Taille du dépôt constatée, en octets.
   * @param options.nombreMrOuvertes - Nombre de demandes de fusion ouvertes constatées.
   * @param options.typeAudit - Catégorie de l'audit (C15-14, RG-046), `'reguliere'` par défaut.
   * @returns L'audit de test.
   */
  public static audit(
    date: string,
    options: {
      readonly couverture?: number;
      readonly violationsBloquant?: number;
      readonly violationsCritique?: number;
      readonly tailleOctets?: number;
      readonly nombreMrOuvertes?: number;
      readonly typeAudit?: TypeAudit;
    } = {},
  ): Audit {
    const resultats: Resultat[] = [];
    if (options.couverture !== undefined) {
      resultats.push({
        type: 'sonar.couverture',
        sourceId: 'source-sonar',
        couverture: options.couverture,
        couvertureNouveauCode: options.couverture,
      });
    }
    if (options.violationsBloquant !== undefined || options.violationsCritique !== undefined) {
      resultats.push({
        type: 'sonar.violations',
        sourceId: 'source-sonar',
        parSeverite: {
          bloquant: options.violationsBloquant ?? 0,
          critique: options.violationsCritique ?? 0,
          majeur: 0,
          mineur: 0,
          info: 0,
        },
        nouvellesViolations: 0,
      });
    }
    if (options.tailleOctets !== undefined) {
      resultats.push({
        type: 'gitlab.taille_depot',
        sourceId: 'source-gitlab',
        refEffective: 'main',
        shaTete: 'abc123',
        tailleOctets: options.tailleOctets,
      });
    }
    if (options.nombreMrOuvertes !== undefined) {
      resultats.push({
        type: 'gitlab.merge_requests',
        sourceId: 'source-gitlab',
        refEffective: 'main',
        shaTete: 'abc123',
        mrOuvertes: Array.from({ length: options.nombreMrOuvertes }, (_valeur, index) => ({
          iid: index,
          titre: `MR ${index}`,
          creeLe: date,
          enConflit: false,
          webUrl: `https://gitlab.exemple.test/groupe/projet/-/merge_requests/${index}`,
        })),
      });
    }
    return {
      id: `audit-${date}`,
      date,
      campagneId: 'campagne-1',
      resultats,
      typeAudit: options.typeAudit ?? 'reguliere',
    };
  }

  /**
   * Construit un projet de test.
   * @param id - Identifiant du projet.
   * @param nom - Nom du projet.
   * @param audits - Historique des audits du projet.
   * @param annotations - Annotations du projet, vide par défaut.
   * @returns Le projet de test.
   */
  public static projet(
    id: string,
    nom: string,
    audits: readonly Audit[],
    annotations: readonly Annotation[] = [],
  ): Projet {
    return {
      id,
      nom,
      description: '',
      iaAutorisee: false,
      sources: [],
      annotations,
      audits,
    };
  }

  /**
   * Construit une racine de test avec les groupes et le journal fournis.
   * @param groupes - Groupes de la racine de test.
   * @param journal - Journal des modifications, vide par défaut.
   * @returns La racine de test.
   */
  public static racine(
    groupes: readonly Groupe[],
    journal: readonly EntreeJournal[] = [],
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
      campagnes: [],
      brouillon: null,
      traitementsAlertes: [],
      journal,
      vuesEnregistrees: [],
    };
  }
}

describe('SqmSyntheseGraphiqueComponent', () => {
  beforeEach(async () => {
    jest.mocked(invoke).mockReset();
    jest.mocked(toPng).mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmSyntheseGraphiqueComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  /**
   * Crée et initialise un fixture du composant, avec la racine fournie chargée dans le Store.
   * @param racine - Racine à charger avant le rendu, `undefined` pour ne charger aucun fichier.
   * @returns Le fixture prêt à l'emploi.
   */
  function creerFixture(racine?: DonneesRacine): ComponentFixture<SqmSyntheseGraphiqueComponent> {
    const donneesApplication = TestBed.inject(DonneesApplicationService);
    if (racine !== undefined) {
      donneesApplication.chargerRacine(racine);
    }
    const fixture = TestBed.createComponent(SqmSyntheseGraphiqueComponent);
    fixture.detectChanges();
    return fixture;
  }

  /**
   * Reporte une sélection groupe/projet dans le filtre partagé, comme le ferait `SqmFiltreGroupeProjetComponent`
   * (RG-053).
   * @param composant - Composant sous test.
   * @param groupeId - Identifiant du groupe, `null` = tous les groupes.
   * @param projetIds - Identifiants des projets, `null` = aucune restriction de projet.
   */
  function selectionnerFiltre(
    composant: SqmSyntheseGraphiqueComponent,
    groupeId: string | null,
    projetIds: readonly string[] | null,
  ): void {
    composant.onSelectionGroupeProjet({ groupeId, projetIds });
  }

  /**
   * Indique si un projet est retenu par le filtre partagé courant (`null` = tous les projets retenus).
   * @param composant - Composant sous test.
   * @param projetId - Identifiant du projet concerné.
   * @returns `true` si le projet est retenu.
   */
  function projetRetenu(composant: SqmSyntheseGraphiqueComponent, projetId: string): boolean {
    const ids = composant.filtreProjetIds();
    return ids === null || ids.includes(projetId);
  }

  it('affiche un message explicite en l’absence de données (aucun audit sur les projets sélectionnés)', () => {
    const groupe: Groupe = {
      id: 'groupe-1',
      nom: 'Groupe 1',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [DonneesDeTest.projet('projet-1', 'Projet 1', [])],
    };
    const fixture = creerFixture(DonneesDeTest.racine([groupe]));
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(fixture.componentInstance.series()).toEqual([
      {
        id: 'projet-1',
        libelle: 'Projet 1',
        couleur: '#1a56db',
        points: [],
      },
    ]);
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Couverture de tests (%)',
    );
    expect(element.querySelector('canvas')).toBeNull();
  });

  it('construit une série par projet retenu, un point par audit portant le constat de l’indicateur sélectionné', () => {
    const projetA = DonneesDeTest.projet('projet-a', 'Projet A', [
      DonneesDeTest.audit('2026-06-05', { couverture: 61.2 }),
      DonneesDeTest.audit('2026-07-08', { couverture: 64.8 }),
    ]);
    const projetB = DonneesDeTest.projet('projet-b', 'Projet B', [
      DonneesDeTest.audit('2026-06-05', {}), // aucun constat de couverture : point omis, pas de valeur inventée.
    ]);
    const groupe: Groupe = {
      id: 'groupe-1',
      nom: 'Groupe 1',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [projetA, projetB],
    };
    const fixture = creerFixture(DonneesDeTest.racine([groupe]));

    const series = fixture.componentInstance.series();
    expect(series).toHaveLength(2);
    const serieA = series.find((serie) => serie.id === 'projet-a');
    const serieB = series.find((serie) => serie.id === 'projet-b');
    expect(serieA?.points).toEqual([
      { date: '2026-06-05', valeur: 61.2 },
      { date: '2026-07-08', valeur: 64.8 },
    ]);
    expect(serieB?.points).toEqual([]);
  });

  it(
    'fond les audits historiques (typeAudit "historique") dans la même série que les audits réguliers, en une ' +
      'courbe unique triée par date, et repère le premier audit régulier tous projets confondus par une ligne ' +
      'verticale dédiée (C15-14, US-046, RG-046)',
    () => {
      const projet = DonneesDeTest.projet('projet-a', 'Projet A', [
        DonneesDeTest.audit('2026-06-05', { couverture: 61.2 }),
        DonneesDeTest.audit('2026-04-01', { couverture: 55.0, typeAudit: 'historique' }),
        DonneesDeTest.audit('2026-07-08', { couverture: 64.8 }),
      ]);
      const groupe: Groupe = {
        id: 'groupe-1',
        nom: 'Groupe 1',
        description: '',
        instances: [],
        membresConnus: [],
        annotations: [],
        indicateursDesactives: [],
        projets: [projet],
      };
      const fixture = creerFixture(DonneesDeTest.racine([groupe]));

      const series = fixture.componentInstance.series();
      expect(series[0]?.points).toEqual([
        { date: '2026-04-01', valeur: 55.0 },
        { date: '2026-06-05', valeur: 61.2 },
        { date: '2026-07-08', valeur: 64.8 },
      ]);
      expect(series[0]).not.toHaveProperty('pointsHistoriques');

      const lignes = fixture.componentInstance.lignesVerticales();
      const repere = lignes.find((ligne) => ligne.categorie === 'premierAuditRegulier');
      expect(repere?.date).toBe('2026-06-05');
      expect(repere?.libelle).toBe('Début des audits réguliers');
    },
  );

  it(
    'ancre le repère du premier audit régulier sur le plus ancien audit régulier tous projets confondus, sans ' +
      'tenir compte des filtres de groupe/projet en vigueur (C15-14, US-046, RG-046)',
    () => {
      const projetA = DonneesDeTest.projet('projet-a', 'Projet A', [
        DonneesDeTest.audit('2026-05-10', { couverture: 60.0 }),
      ]);
      const projetB = DonneesDeTest.projet('projet-b', 'Projet B', [
        DonneesDeTest.audit('2026-02-01', { couverture: 40.0, typeAudit: 'historique' }),
        DonneesDeTest.audit('2026-03-15', { couverture: 42.0 }),
      ]);
      const groupe: Groupe = {
        id: 'groupe-1',
        nom: 'Groupe 1',
        description: '',
        instances: [],
        membresConnus: [],
        annotations: [],
        indicateursDesactives: [],
        projets: [projetA, projetB],
      };
      const fixture = creerFixture(DonneesDeTest.racine([groupe]));
      const composant = fixture.componentInstance;

      selectionnerFiltre(composant, null, ['projet-b']);
      fixture.detectChanges();

      const repere = composant
        .lignesVerticales()
        .find((ligne) => ligne.categorie === 'premierAuditRegulier');
      expect(repere?.date).toBe('2026-03-15');
    },
  );

  it('convertit la taille du dépôt en mégaoctets pour l’indicateur « Taille du dépôt »', () => {
    const projet = DonneesDeTest.projet('projet-a', 'Projet A', [
      DonneesDeTest.audit('2026-06-05', { tailleOctets: 48_234_567 }),
    ]);
    const groupe: Groupe = {
      id: 'groupe-1',
      nom: 'Groupe 1',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [projet],
    };
    const fixture = creerFixture(DonneesDeTest.racine([groupe]));

    fixture.componentInstance.onChangerIndicateur('tailleDepot');
    fixture.detectChanges();

    expect(fixture.componentInstance.series()[0]?.points).toEqual([
      { date: '2026-06-05', valeur: 48.234567 },
    ]);
  });

  // Ajouté en relecture : les trois indicateurs restants (violations bloquantes, violations critiques, MR
  // ouvertes) n'étaient exercés par aucun test, alors que l'indicateur « couverture » et « taille du dépôt »
  // l'étaient déjà — écart de couverture décelé par la mesure de couverture plutôt que par la seule lecture,
  // sur un calcul d'indicateur (domaine de vigilance renforcée du projet).
  it('extrait la valeur constatée pour chacun des trois indicateurs restants (violations, MR ouvertes)', () => {
    const projet = DonneesDeTest.projet('projet-a', 'Projet A', [
      DonneesDeTest.audit('2026-06-05', {
        violationsBloquant: 2,
        violationsCritique: 5,
        nombreMrOuvertes: 3,
      }),
    ]);
    const groupe: Groupe = {
      id: 'groupe-1',
      nom: 'Groupe 1',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [projet],
    };
    const fixture = creerFixture(DonneesDeTest.racine([groupe]));
    const composant = fixture.componentInstance;

    composant.onChangerIndicateur('violationsBloquant');
    fixture.detectChanges();
    expect(composant.series()[0]?.points).toEqual([{ date: '2026-06-05', valeur: 2 }]);

    composant.onChangerIndicateur('violationsCritique');
    fixture.detectChanges();
    expect(composant.series()[0]?.points).toEqual([{ date: '2026-06-05', valeur: 5 }]);

    composant.onChangerIndicateur('mrOuvertes');
    fixture.detectChanges();
    expect(composant.series()[0]?.points).toEqual([{ date: '2026-06-05', valeur: 3 }]);
  });

  it('restreint les séries à la sélection de projets du filtre partagé sans recalcul erroné (RG-053)', () => {
    const projetA = DonneesDeTest.projet('projet-a', 'Projet A', [
      DonneesDeTest.audit('2026-06-05', { couverture: 61.2 }),
    ]);
    const projetB = DonneesDeTest.projet('projet-b', 'Projet B', [
      DonneesDeTest.audit('2026-06-05', { couverture: 38.4 }),
    ]);
    const groupe: Groupe = {
      id: 'groupe-1',
      nom: 'Groupe 1',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [projetA, projetB],
    };
    const fixture = creerFixture(DonneesDeTest.racine([groupe]));
    const composant = fixture.componentInstance;

    expect(composant.series()).toHaveLength(2);

    selectionnerFiltre(composant, null, ['projet-b']);
    fixture.detectChanges();

    expect(projetRetenu(composant, 'projet-a')).toBe(false);
    expect(projetRetenu(composant, 'projet-b')).toBe(true);
    const series = composant.series();
    expect(series).toHaveLength(1);
    expect(series[0]?.id).toBe('projet-b');
    expect(series[0]?.points).toEqual([{ date: '2026-06-05', valeur: 38.4 }]);

    selectionnerFiltre(composant, null, null);
    fixture.detectChanges();
    expect(composant.series()).toHaveLength(2);
  });

  it('positionne une ligne verticale de changement de seuil à partir d’une entrée connue du journal (RG-023)', () => {
    const projet = DonneesDeTest.projet('projet-a', 'Projet A', [
      DonneesDeTest.audit('2026-06-05', { couverture: 61.2 }),
    ]);
    const groupe: Groupe = {
      id: 'groupe-1',
      nom: 'Groupe 1',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [projet],
    };
    const journal: readonly EntreeJournal[] = [
      {
        id: 'j1',
        horodatage: '2026-05-15T09:30:00Z',
        objet: 'parametres.seuils.couverture.seuilRouge',
        avant: 30,
        apres: 40,
        origine: 'saisieManuelle',
      },
      {
        id: 'j2',
        horodatage: '2026-05-20T14:00:00Z',
        objet: 'parametres.seuils.vitalite.mortJours',
        avant: 300,
        apres: 365,
        origine: 'saisieManuelle',
      },
    ];
    const fixture = creerFixture(DonneesDeTest.racine([groupe], journal));

    // Indicateur par défaut : couverture -> seule l'entrée du journal concernant la couverture est retenue.
    const lignesSeuil = fixture.componentInstance
      .lignesVerticales()
      .filter((ligne) => ligne.categorie === 'changementSeuil');
    expect(lignesSeuil).toHaveLength(1);
    expect(lignesSeuil[0]?.date).toBe('2026-05-15T09:30:00Z');
    expect(lignesSeuil[0]?.libelle).toBe('couverture.seuilRouge : 30 → 40');
  });

  it('rappelle les annotations des seuls projets actuellement retenus, jamais celles d’un projet exclu du filtre', () => {
    const annotationA: Annotation = {
      id: 'a1',
      date: '2026-04-22',
      libelle: 'Passage develop en ref auditée',
      categorie: 'jalon',
    };
    const annotationB: Annotation = {
      id: 'a2',
      date: '2026-03-10',
      libelle: 'Migration GitLab 17',
      categorie: 'migration',
    };
    const projetA = DonneesDeTest.projet(
      'projet-a',
      'Projet A',
      [DonneesDeTest.audit('2026-06-05', { couverture: 61.2 })],
      [annotationA],
    );
    const projetB = DonneesDeTest.projet(
      'projet-b',
      'Projet B',
      [DonneesDeTest.audit('2026-06-05', { couverture: 38.4 })],
      [annotationB],
    );
    const groupe: Groupe = {
      id: 'groupe-1',
      nom: 'Groupe 1',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [projetA, projetB],
    };
    const fixture = creerFixture(DonneesDeTest.racine([groupe]));
    const composant = fixture.componentInstance;

    const idsAnnotationsAvant = composant
      .lignesVerticales()
      .filter((ligne) => ligne.categorie === 'annotation')
      .map((ligne) => ligne.id)
      .sort();
    expect(idsAnnotationsAvant).toEqual(['a1', 'a2']);

    selectionnerFiltre(composant, null, ['projet-a']);
    fixture.detectChanges();

    const idsAnnotationsApres = composant
      .lignesVerticales()
      .filter((ligne) => ligne.categorie === 'annotation')
      .map((ligne) => ligne.id);
    expect(idsAnnotationsApres).toEqual(['a1']);
  });

  it(
    'déclenche l’export PNG au clic sur le bouton dédié (conteneur complet, filtres inclus), nomme le fichier ' +
      'téléchargé synthese-graphique-<horodatage complet>.png (sans nom de projet, écran multi-projets, ' +
      "C15-15/RG-047) et confirme l'export",
    async () => {
      const toPngSimule = jest.mocked(toPng);
      toPngSimule.mockResolvedValue('data:image/png;base64,xxx');
      let nomFichierTelecharge = '';
      const clicAncre = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          nomFichierTelecharge = this.download;
        });

      const fixture = creerFixture(DonneesDeTest.racine([]));
      const bouton = DomTestUtils.obtenirElementNatif(fixture).querySelector<HTMLButtonElement>(
        '.synthese-graphique__export',
      );
      expect(bouton).not.toBeNull();
      bouton?.click();
      await fixture.whenStable();

      expect(toPngSimule).toHaveBeenCalledTimes(1);
      const [elementExporte] = toPngSimule.mock.calls[0];
      expect(elementExporte.classList.contains('synthese-graphique')).toBe(true);
      expect(nomFichierTelecharge).toMatch(
        /^synthese-graphique-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.png$/,
      );
      const notifications = TestBed.inject(NotificationService).liste();
      expect(notifications.length).toBe(1);
      expect(notifications[0]?.type).toBe('succes');
      expect(notifications[0]?.message).toContain(nomFichierTelecharge);
      clicAncre.mockRestore();
    },
  );

  it('affiche des valeurs neutres en l’absence de tout fichier chargé', () => {
    const fixture = creerFixture();

    expect(fixture.componentInstance.series()).toEqual([]);
    expect(fixture.componentInstance.lignesVerticales()).toEqual([]);
    expect(fixture.componentInstance.groupesFiltrables()).toEqual([]);
  });

  it('restreint les séries aux projets du groupe sélectionné dans le filtre partagé (RG-053)', () => {
    const projetA = DonneesDeTest.projet('projet-a', 'Projet A', []);
    const projetB = DonneesDeTest.projet('projet-b', 'Projet B', []);
    const groupeA: Groupe = {
      id: 'groupe-a',
      nom: 'Groupe A',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [projetA],
    };
    const groupeB: Groupe = {
      id: 'groupe-b',
      nom: 'Groupe B',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [projetB],
    };
    const fixture = creerFixture(DonneesDeTest.racine([groupeA, groupeB]));
    const composant = fixture.componentInstance;

    expect(composant.series().map((serie) => serie.id)).toEqual(['projet-a', 'projet-b']);

    selectionnerFiltre(composant, 'groupe-b', null);
    fixture.detectChanges();

    expect(composant.series().map((serie) => serie.id)).toEqual(['projet-b']);
    expect(projetRetenu(composant, 'projet-b')).toBe(true);
  });

  it('se replie sur « couverture » si le sélecteur d’indicateur transmet une valeur inconnue', () => {
    const fixture = creerFixture(DonneesDeTest.racine([]));
    const composant = fixture.componentInstance;

    composant.onChangerIndicateur('tailleDepot');
    composant.onChangerIndicateur('valeur-invalide');
    fixture.detectChanges();

    expect(composant.messageAucuneDonnee()).toContain('Couverture de tests (%)');
  });

  describe('vues enregistrées (US-028, RG-027, Phase 9 incrément 2)', () => {
    /**
     * Construit une racine de test avec un unique groupe et deux projets, pour exercer le filtre de projets.
     * @returns La racine de test.
     */
    function racineAvecDeuxProjets(): DonneesRacine {
      const groupe: Groupe = {
        id: 'groupe-1',
        nom: 'Groupe 1',
        description: '',
        instances: [],
        membresConnus: [],
        annotations: [],
        indicateursDesactives: [],
        projets: [
          DonneesDeTest.projet('projet-a', 'Projet A', []),
          DonneesDeTest.projet('projet-b', 'Projet B', []),
        ],
      };
      return DonneesDeTest.racine([groupe]);
    }

    it('applique la sélection groupe/projet portée par une vue choisie (RG-027 amendée)', () => {
      const fixture = creerFixture(racineAvecDeuxProjets());
      const composant = fixture.componentInstance;

      composant.appliquerVue({
        id: 'v1',
        nom: 'Ma vue',
        parDefaut: false,
        filtres: { groupeId: 'groupe-1', projetIds: ['projet-a'] },
      });

      expect(composant.filtreGroupeId()).toBe('groupe-1');
      expect(projetRetenu(composant, 'projet-a')).toBe(true);
      expect(projetRetenu(composant, 'projet-b')).toBe(false);
    });

    it('applique une vue dont le filtre de projets vaut `null` (tous les projets)', () => {
      const fixture = creerFixture(racineAvecDeuxProjets());
      const composant = fixture.componentInstance;
      selectionnerFiltre(composant, null, ['projet-b']);
      expect(projetRetenu(composant, 'projet-a')).toBe(false);

      composant.appliquerVue({
        id: 'v1',
        nom: 'Ma vue',
        parDefaut: false,
        filtres: { groupeId: null, projetIds: null },
      });

      expect(projetRetenu(composant, 'projet-a')).toBe(true);
      expect(projetRetenu(composant, 'projet-b')).toBe(true);
    });

    it('ignore silencieusement une vue dont les filtres ne correspondent pas à la forme attendue', () => {
      const fixture = creerFixture(racineAvecDeuxProjets());
      const composant = fixture.componentInstance;
      selectionnerFiltre(composant, 'groupe-1', null);

      composant.appliquerVue({ id: 'v1', nom: 'Vue invalide', parDefaut: false, filtres: 'texte' });
      composant.appliquerVue({
        id: 'v3',
        nom: 'Projets invalides',
        parDefaut: false,
        filtres: { groupeId: 'groupe-1', projetIds: [42] },
      });
      composant.appliquerVue({
        id: 'v4',
        nom: 'Groupe de type invalide',
        parDefaut: false,
        filtres: { groupeId: 42, projetIds: null },
      });

      expect(composant.filtreGroupeId()).toBe('groupe-1');
    });

    it('enregistre une vue avec la sélection groupe/projet partagée courante et met à jour la racine (US-028)', async () => {
      const racineInitiale = racineAvecDeuxProjets();
      const racineMiseAJour = { ...racineInitiale, versionSchema: 2 };
      jest.mocked(invoke).mockResolvedValue(racineMiseAJour);
      const fixture = creerFixture(racineInitiale);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      const composant = fixture.componentInstance;
      selectionnerFiltre(composant, 'groupe-1', ['projet-a']);
      composant.onChangerIndicateur('mrOuvertes');

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
          ecran: 'syntheseGraphique',
          versionFiltres: 1,
          parDefaut: true,
          filtres: { groupeId: 'groupe-1', projetIds: ['projet-a'] },
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

    it('applique automatiquement la vue par défaut de cet écran à l’ouverture', () => {
      const racineAvecVueParDefaut: DonneesRacine = {
        ...racineAvecDeuxProjets(),
        vuesEnregistrees: [
          {
            id: 'v1',
            nom: 'Vue par défaut',
            ecran: 'syntheseGraphique',
            versionFiltres: 1,
            parDefaut: true,
            filtres: { groupeId: 'groupe-1', projetIds: ['projet-a'] },
          },
        ],
      };

      const fixture = creerFixture(racineAvecVueParDefaut);
      const composant = fixture.componentInstance;

      expect(composant.filtreGroupeId()).toBe('groupe-1');
      expect(projetRetenu(composant, 'projet-a')).toBe(true);
      expect(projetRetenu(composant, 'projet-b')).toBe(false);
      // Amorçage par la vue par défaut : le filtre n'est pas encore réputé « modifié par l'utilisateur ».
      expect(composant.contexte.filtreModifieParUtilisateur()).toBe(false);
    });

    it("n'écrase jamais un choix de filtre de l'utilisateur par la vue par défaut de l'écran (RG-053)", () => {
      const racineAvecVueParDefaut: DonneesRacine = {
        ...racineAvecDeuxProjets(),
        vuesEnregistrees: [
          {
            id: 'v1',
            nom: 'Vue par défaut',
            ecran: 'syntheseGraphique',
            versionFiltres: 1,
            parDefaut: true,
            filtres: { groupeId: 'groupe-1', projetIds: null },
          },
        ],
      };
      const fixture = creerFixture(racineAvecVueParDefaut);
      const composant = fixture.componentInstance;
      expect(composant.filtreGroupeId()).toBe('groupe-1');

      selectionnerFiltre(composant, null, null);
      fixture.detectChanges();

      expect(composant.filtreGroupeId()).toBeNull();
      expect(composant.contexte.filtreModifieParUtilisateur()).toBe(true);
    });

    it('ignore une vue enregistrée dont la version de filtres est obsolète et avertit l’utilisateur', () => {
      const racineAvecVueObsolete: DonneesRacine = {
        ...racineAvecDeuxProjets(),
        vuesEnregistrees: [
          {
            id: 'v1',
            nom: 'Ancienne vue',
            ecran: 'syntheseGraphique',
            versionFiltres: 0,
            parDefaut: false,
            filtres: { groupeId: 'groupe-1', indicateur: 'couverture', projetIds: null },
          },
        ],
      };

      const fixture = creerFixture(racineAvecVueObsolete);

      expect(fixture.componentInstance.vuesApplicables()).toHaveLength(0);
      expect(fixture.componentInstance.nombreVuesIgnorees()).toBe(1);
    });
  });

  describe('lien contextuel vers la Fiche projet (plan_16 groupe 1.1, US-052)', () => {
    /**
     * Racine à un groupe et un projet doté de deux audits (série non vide, graphique effectivement rendu).
     * @returns La racine de test.
     */
    function racineAvecUnProjetAudite(): DonneesRacine {
      const groupe: Groupe = {
        id: 'groupe-1',
        nom: 'Groupe 1',
        description: '',
        instances: [],
        membresConnus: [],
        annotations: [],
        indicateursDesactives: [],
        projets: [
          DonneesDeTest.projet('projet-a', 'Projet A', [
            DonneesDeTest.audit('2026-06-05', { couverture: 61.2 }),
            DonneesDeTest.audit('2026-07-08', { couverture: 64.8 }),
          ]),
        ],
      };
      return DonneesDeTest.racine([groupe]);
    }

    it('navigue vers `/fiche-projet/:projetId` quand `ouvrirFicheProjet` est appelé', () => {
      const fixture = creerFixture(racineAvecUnProjetAudite());
      const router = TestBed.inject(Router);
      const navigate = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      fixture.componentInstance.ouvrirFicheProjet('projet-a');

      expect(navigate).toHaveBeenCalledWith('/fiche-projet/projet-a');
    });

    it('relaie la sélection d’une série du graphique d’évolution (bouton « Ouvrir » de la légende) vers `ouvrirFicheProjet`', () => {
      const fixture = creerFixture(racineAvecUnProjetAudite());
      const router = TestBed.inject(Router);
      const navigate = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      const boutonOuvrir = DomTestUtils.obtenirElementNatif(
        fixture,
      ).querySelector<HTMLButtonElement>('.graphique-evolution__bouton-ouvrir');
      boutonOuvrir?.click();

      expect(navigate).toHaveBeenCalledWith('/fiche-projet/projet-a');
    });
  });
});
