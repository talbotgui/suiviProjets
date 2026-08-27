// Test de l'écran Synthèse graphique (cf. synthese-graphique.component.ts, US-016, RG-011, RG-022, RG-023), généré
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
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
        pointsHistoriques: [],
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
    'exclut les audits historiques (typeAudit "historique") de la ligne de tendance et les restitue ' +
      'séparément comme points de forme distincte de la même série (C15-14, US-046, RG-046)',
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
        { date: '2026-06-05', valeur: 61.2 },
        { date: '2026-07-08', valeur: 64.8 },
      ]);
      expect(series[0]?.pointsHistoriques).toEqual([{ date: '2026-04-01', valeur: 55.0 }]);
      expect(fixture.componentInstance.lignesVerticales()).toEqual([]);
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

  it('bascule la sélection d’un projet sans affecter les points de l’autre projet (pas de recalcul erroné)', () => {
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

    composant.basculerProjet('projet-a');
    fixture.detectChanges();

    expect(composant.projetRetenu('projet-a')).toBe(false);
    expect(composant.projetRetenu('projet-b')).toBe(true);
    const series = composant.series();
    expect(series).toHaveLength(1);
    expect(series[0]?.id).toBe('projet-b');
    expect(series[0]?.points).toEqual([{ date: '2026-06-05', valeur: 38.4 }]);

    composant.toutSelectionner();
    fixture.detectChanges();
    expect(composant.series()).toHaveLength(2);

    composant.toutDeselectionner();
    fixture.detectChanges();
    expect(composant.series()).toHaveLength(0);
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
    const lignes = fixture.componentInstance.lignesVerticales();
    expect(lignes).toHaveLength(1);
    expect(lignes[0]?.date).toBe('2026-05-15T09:30:00Z');
    expect(lignes[0]?.categorie).toBe('changementSeuil');
    expect(lignes[0]?.libelle).toBe('couverture.seuilRouge : 30 → 40');
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

    const lignesAvant = composant.lignesVerticales();
    expect(lignesAvant.map((ligne) => ligne.id).sort()).toEqual(['a1', 'a2']);

    composant.basculerProjet('projet-b');
    fixture.detectChanges();

    const lignesApres = composant.lignesVerticales();
    expect(lignesApres.map((ligne) => ligne.id)).toEqual(['a1']);
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
    expect(fixture.componentInstance.groupesDisponibles()).toEqual([]);
  });

  it('filtre les projets disponibles par groupe et réinitialise la sélection de projet', () => {
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

    composant.basculerProjet('projet-a');
    expect(composant.projetRetenu('projet-a')).toBe(false);

    composant.onChangerGroupe('groupe-b');
    fixture.detectChanges();

    expect(composant.projetsDisponibles().map((projet) => projet.id)).toEqual(['projet-b']);
    // Le filtre de projet a été réinitialisé par le changement de groupe (décision arbitraire documentée).
    expect(composant.projetRetenu('projet-b')).toBe(true);
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

    it('applique le filtre de groupe, d’indicateur et de projets portés par une vue choisie', () => {
      const fixture = creerFixture(racineAvecDeuxProjets());
      const composant = fixture.componentInstance;

      composant.appliquerVue({
        id: 'v1',
        nom: 'Ma vue',
        parDefaut: false,
        filtres: { groupeId: 'groupe-1', indicateur: 'tailleDepot', projetIds: ['projet-a'] },
      });

      expect(composant.filtreGroupeId()).toBe('groupe-1');
      expect(composant.filtreIndicateur()).toBe('tailleDepot');
      expect(composant.projetRetenu('projet-a')).toBe(true);
      expect(composant.projetRetenu('projet-b')).toBe(false);
    });

    it('applique une vue dont le filtre de projets vaut `null` (tous les projets)', () => {
      const fixture = creerFixture(racineAvecDeuxProjets());
      const composant = fixture.componentInstance;
      composant.basculerProjet('projet-a');
      expect(composant.projetRetenu('projet-a')).toBe(false);

      composant.appliquerVue({
        id: 'v1',
        nom: 'Ma vue',
        parDefaut: false,
        filtres: { groupeId: null, indicateur: 'couverture', projetIds: null },
      });

      expect(composant.projetRetenu('projet-a')).toBe(true);
      expect(composant.projetRetenu('projet-b')).toBe(true);
    });

    it('ignore silencieusement une vue dont les filtres ne correspondent pas à la forme attendue', () => {
      const fixture = creerFixture(racineAvecDeuxProjets());
      const composant = fixture.componentInstance;
      composant.onChangerGroupe('groupe-1');

      composant.appliquerVue({ id: 'v1', nom: 'Vue invalide', parDefaut: false, filtres: 'texte' });
      composant.appliquerVue({
        id: 'v2',
        nom: 'Indicateur invalide',
        parDefaut: false,
        filtres: { groupeId: 'groupe-1', indicateur: 'inexistant', projetIds: null },
      });
      composant.appliquerVue({
        id: 'v3',
        nom: 'Projets invalides',
        parDefaut: false,
        filtres: { groupeId: 'groupe-1', indicateur: 'couverture', projetIds: [42] },
      });
      composant.appliquerVue({
        id: 'v4',
        nom: 'Groupe de type invalide',
        parDefaut: false,
        filtres: { groupeId: 42, indicateur: 'couverture', projetIds: null },
      });

      expect(composant.filtreGroupeId()).toBe('groupe-1');
      expect(composant.filtreIndicateur()).toBe('couverture');
    });

    it('enregistre une vue avec les filtres courants (dont le filtre de projets sérialisé) et met à jour la racine (US-028)', async () => {
      const racineInitiale = racineAvecDeuxProjets();
      const racineMiseAJour = { ...racineInitiale, versionSchema: 2 };
      jest.mocked(invoke).mockResolvedValue(racineMiseAJour);
      const fixture = creerFixture(racineInitiale);
      TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
      const composant = fixture.componentInstance;
      composant.onChangerGroupe('groupe-1');
      composant.onChangerIndicateur('mrOuvertes');
      composant.basculerProjet('projet-b');

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
          filtres: { groupeId: 'groupe-1', indicateur: 'mrOuvertes', projetIds: ['projet-a'] },
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
            filtres: { groupeId: 'groupe-1', indicateur: 'tailleDepot', projetIds: ['projet-a'] },
          },
        ],
      };

      const fixture = creerFixture(racineAvecVueParDefaut);
      const composant = fixture.componentInstance;

      expect(composant.filtreGroupeId()).toBe('groupe-1');
      expect(composant.filtreIndicateur()).toBe('tailleDepot');
      expect(composant.projetRetenu('projet-a')).toBe(true);
      expect(composant.projetRetenu('projet-b')).toBe(false);
    });

    it("n'applique la vue par défaut qu'une seule fois, sans écraser un choix ultérieur de l'utilisateur", () => {
      const racineAvecVueParDefaut: DonneesRacine = {
        ...racineAvecDeuxProjets(),
        vuesEnregistrees: [
          {
            id: 'v1',
            nom: 'Vue par défaut',
            ecran: 'syntheseGraphique',
            versionFiltres: 1,
            parDefaut: true,
            filtres: { groupeId: 'groupe-1', indicateur: 'tailleDepot', projetIds: null },
          },
        ],
      };
      const fixture = creerFixture(racineAvecVueParDefaut);
      const composant = fixture.componentInstance;
      expect(composant.filtreGroupeId()).toBe('groupe-1');

      composant.onChangerGroupe('');
      TestBed.inject(DonneesApplicationService).chargerRacine({
        ...racineAvecVueParDefaut,
        versionSchema: 2,
      });
      fixture.detectChanges();

      expect(composant.filtreGroupeId()).toBeNull();
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
});
