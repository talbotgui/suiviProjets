// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant transverse « Graphique d'évolution » de la charte d'ergonomie (cf.
// docs/02_documentation/10_charteErgonomie.md#composants-dinterface-réutilisables : « Zoom temporel, séries
// activables/désactivables individuellement, annotations et changements de seuils affichés en lignes verticales
// étiquetées »), consommé par l'écran Synthèse graphique (US-016, Phase 6 incrément 7) et réutilisable par toute
// autre restitution future de l'évolution d'un indicateur dans le temps.
//
// Choix de bibliothèque de graphique (décision arbitraire à valider par un humain, cf. rapport de développement de
// cet incrément, sur le même principe de justification que `html-to-image` à l'incrément 4) : `chart.js` (licence
// MIT, zéro dépendance runtime propre), complété de `chartjs-plugin-zoom` (licence MIT, zoom/pan temporel, dépend
// de `hammerjs`) et `chartjs-plugin-annotation` (licence MIT, lignes verticales étiquetées), plutôt qu'une
// bibliothèque unique couvrant nativement les trois besoins (zoom, séries superposables, annotations) : `apexcharts`
// couvrait ces trois besoins nativement dans une unique dépendance, mais a été écartée après vérification de sa
// licence réelle (`SEE LICENSE IN LICENSE`, modèle double licence excluant tout usage commercial au-delà de 2M$ de
// revenu annuel et toute réutilisation dans un produit de graphique concurrent, incompatible avec l'exigence
// implicite d'une licence permissive déjà retenue pour `html-to-image`) ; `ngx-charts` (Swimlane) a été écartée
// faute de zoom temporel natif ; `d3` a été écartée comme disproportionnée pour cet incrément (nécessiterait de
// réécrire soi-même la logique de zoom/brush et d'annotation, aujourd'hui livrée telle quelle par les deux plugins
// retenus). Taille installée mesurée (`du -sb` sur le répertoire `node_modules` du seul paquet, méthode identique à
// celle déjà appliquée à `html-to-image`) : `chart.js` 6 178 899 octets, `chartjs-plugin-zoom` 94 267 octets (plus
// sa dépendance transitive `hammerjs`, 910 559 octets), `chartjs-plugin-annotation` 220 659 octets — total inférieur
// à `apexcharts` seul (14 793 475 octets), malgré un nombre de paquets plus élevé. Les trois paquets sont épinglés
// en version exacte plutôt qu'en plage `^` (même convention que `html-to-image`, cf. rapport de développement de
// l'incrément 4), tenue pour une dépendance de rendu visuel nouvellement introduite.
//
// Décision d'ergonomie (à valider par un humain) : la légende native de `chart.js` (survol/clic à la souris
// uniquement, non focalisable au clavier) ne satisferait pas l'exigence de la charte d'ergonomie selon laquelle
// « l'ensemble de l'application est utilisable au clavier, sans dépendre de la souris »
// (docs/02_documentation/10_charteErgonomie.md#principes-dinteraction-communs). Elle est donc désactivée
// (`plugins.legend.display: false`) et remplacée par une rangée de boutons HTML natifs (un par série), focalisables
// et actionnables au clavier, qui pilotent la visibilité de chaque jeu de données. De même, le zoom par molette/
// glissement (mode souris uniquement) est complété par trois boutons explicites (zoom avant, zoom arrière,
// réinitialiser), également focalisables au clavier.
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { InputSignal, Signal, WritableSignal } from '@angular/core';
import type { ChartConfiguration, ChartDataset, ScatterDataPoint, TooltipItem } from 'chart.js';
import {
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';

/**
 * Point d'une série du graphique d'évolution.
 */
export interface PointSerieGraphique {
  /** Date du point (ISO 8601), position sur l'axe temporel. */
  readonly date: string;
  /** Valeur numérique du point. */
  readonly valeur: number;
}

/**
 * Série activable/désactivable individuellement du graphique d'évolution (charte d'ergonomie). La couleur associée
 * est fournie telle quelle par le composant appelant (identité catégorielle, ex. un projet), jamais recalculée ici :
 * ce composant restitue des séries déjà déterminées, il ne porte aucun jugement (RG-011, RG-022).
 */
export interface SerieGraphiqueEvolution {
  /** Identifiant stable de la série, utilisé pour la bascule d'activation et la restitution du bouton associé. */
  readonly id: string;
  /** Libellé affiché (bouton de bascule, infobulle). */
  readonly libelle: string;
  /** Couleur CSS de la série (ex. `#1a56db`). */
  readonly couleur: string;
  /** Points de la série, triés par date croissante. */
  readonly points: readonly PointSerieGraphique[];
  /**
   * Points d'audits historiques (C15-14, US-046, RG-046) de cette série, jamais intégrés à `points` ni reliés par
   * la ligne de tendance (cf. `SqmSyntheseGraphiqueComponent.construireSerie`, qui les exclut de `points` pour ne
   * pas distordre le calcul de tendance existant), restitués séparément sous une forme de point distincte (croix)
   * partageant la couleur de la série. Absent ou vide si cette série ne porte aucun audit historique.
   */
  readonly pointsHistoriques?: readonly PointSerieGraphique[];
}

/**
 * Catégorie d'une ligne verticale étiquetée du graphique d'évolution : une annotation (US-019, Phase 8, créée
 * ailleurs — `SqmFicheProjetComponent` — et seulement lue et affichée ici, en lecture seule), ou un changement de
 * seuil (RG-023, `ChangementSeuilUtils`).
 */
export type CategorieLigneVerticale = 'annotation' | 'changementSeuil';

/**
 * Ligne verticale étiquetée du graphique d'évolution (charte d'ergonomie).
 */
export interface LigneVerticaleGraphique {
  /** Identifiant stable de la ligne verticale. */
  readonly id: string;
  /** Date représentée (ISO 8601), position de la ligne verticale sur l'axe temporel. */
  readonly date: string;
  /** Libellé affiché sur la ligne verticale. */
  readonly libelle: string;
  /** Catégorie de la ligne verticale, pilote son style visuel (cf. {@link STYLE_LIGNE_VERTICALE}). */
  readonly categorie: CategorieLigneVerticale;
}

/**
 * Style visuel d'une catégorie de ligne verticale (couleur et tirets), décision arbitraire d'ergonomie (à valider
 * par un humain, cf. rapport de développement de cet incrément) faute de maquette haute-fidélité pour cet écran :
 * trait plein gris pour une annotation, trait tireté ambre pour un changement de seuil : ces lignes verticales ne
 * portent elles-mêmes aucun jugement de seuil, d'où l'absence des couleurs sémantiques vert/orange/rouge du Moteur
 * de jugement (RG-022).
 */
const STYLE_LIGNE_VERTICALE: Readonly<
  Record<CategorieLigneVerticale, { readonly couleur: string; readonly tirets: readonly number[] }>
> = {
  annotation: { couleur: '#6b7280', tirets: [] },
  changementSeuil: { couleur: '#d97706', tirets: [6, 4] },
};

/**
 * Style visuel des points d'audits historiques (C15-14, US-046, RG-046) : croix (`crossRot`) plutôt que le rond
 * plein des points réguliers, seule façon de rester distinguable sans recourir à une couleur sémantique
 * supplémentaire (ces points partagent la couleur de leur série, identité catégorielle du projet, cf.
 * `PALETTE_SERIES` de `SqmSyntheseGraphiqueComponent`). Rayon et épaisseur de trait légèrement supérieurs au point
 * régulier (`pointRadius: 3` dans {@link SqmGraphiqueEvolutionComponent.construireConfiguration}) pour rester
 * lisible malgré une forme plus fine visuellement que le disque plein. Choix arbitraire (à valider par un humain,
 * cf. rapport de développement de cet incrément) entre une croix et un rond vide, les deux formes proposées par la
 * demande utilisateur à l'origine de ce point.
 */
const STYLE_POINT_HISTORIQUE: Readonly<{
  readonly pointStyle: 'crossRot';
  readonly pointRadius: number;
}> = {
  pointStyle: 'crossRot',
  pointRadius: 5,
};

/**
 * Composant de graphique d'évolution réutilisable (US-016) : zoom temporel, séries activables/désactivables
 * individuellement, lignes verticales étiquetées pour les annotations et les changements de seuil, message
 * explicite si aucune donnée n'est disponible (`docs/02_documentation/09_maquettes.md#états-particuliers`).
 * Construit et pilote directement une instance `chart.js` (aucune abstraction Angular supplémentaire), sur le même
 * principe que l'appel direct à `html-to-image` déjà retenu par les écrans de restitution de cette phase.
 */
@Component({
  selector: 'app-graphique-evolution',
  templateUrl: './graphique-evolution.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './graphique-evolution.component.scss',
})
export class SqmGraphiqueEvolutionComponent {
  /** Garde d'enregistrement unique des composants `chart.js`/plugins auprès du registre global de la bibliothèque. */
  private static enregistre = false;

  /**
   * Enregistre une seule fois, tous composants confondus, les éléments `chart.js` et les deux plugins requis par ce
   * composant (idempotent par construction, mais la garde évite un travail redondant à chaque instanciation).
   */
  private static enregistrerChartJs(): void {
    if (SqmGraphiqueEvolutionComponent.enregistre) {
      return;
    }
    Chart.register(
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      Tooltip,
      Legend,
      zoomPlugin,
      annotationPlugin,
    );
    SqmGraphiqueEvolutionComponent.enregistre = true;
  }

  /**
   * Met en forme un instant (millisecondes UNIX) en libellé court `AAAA-MM-JJ` (convention déjà retenue par les
   * écrans de restitution de cette phase, ex. `SqmFicheProjetComponent.formaterDateCourte`).
   * @param epochMs - Instant à mettre en forme, en millisecondes UNIX.
   * @returns Le libellé court correspondant.
   */
  private static formaterDateCourte(epochMs: number): string {
    const date = new Date(epochMs);
    const deuxChiffres = (valeur: number): string => valeur.toString().padStart(2, '0');
    return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
  }

  /**
   * Séries activables/désactivables du graphique, triées par date croissante par le composant appelant.
   */
  public readonly series: InputSignal<readonly SerieGraphiqueEvolution[]> =
    input.required<readonly SerieGraphiqueEvolution[]>();

  /**
   * Lignes verticales étiquetées à représenter (annotations et changements de seuil confondus), tableau vide par
   * défaut.
   */
  public readonly lignesVerticales: InputSignal<readonly LigneVerticaleGraphique[]> = input<
    readonly LigneVerticaleGraphique[]
  >([]);

  /**
   * Message affiché à la place du graphique si aucune série ne porte le moindre point (état particulier, cf.
   * `docs/02_documentation/09_maquettes.md#états-particuliers` : « message explicite invitant à élargir le
   * filtre »).
   */
  public readonly messageAucuneDonnee: InputSignal<string> = input<string>(
    'Aucune donnée disponible sur la période ou le filtre sélectionné. Élargissez la période, le groupe ou le ' +
      'projet choisi.',
  );

  /**
   * Élément canvas du graphique, absent tant que l'état « aucune donnée » est affiché (cf. gabarit).
   */
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  /**
   * Identifiants des séries actuellement masquées par l'utilisateur (bascule individuelle, charte d'ergonomie).
   * Une série absente de cet ensemble est active (comportement par défaut : toutes les séries visibles).
   */
  private readonly seriesMasquees: WritableSignal<ReadonlySet<string>> = signal(new Set<string>());

  /**
   * Instance `chart.js` actuellement construite, `undefined` tant qu'aucune série ne porte de donnée ou avant la
   * première initialisation de la vue.
   */
  private instance: Chart<'line', ScatterDataPoint[]> | undefined;

  /**
   * `true` si aucune série fournie ne porte le moindre point (état particulier, message explicite plutôt qu'un
   * graphique vide silencieux).
   */
  public readonly aucuneDonnee: Signal<boolean> = computed(() =>
    this.series().every(
      (serie) => serie.points.length === 0 && (serie.pointsHistoriques?.length ?? 0) === 0,
    ),
  );

  /**
   * `true` si au moins une série porte un point d'audit historique (C15-14, US-046, RG-046), pour n'afficher la
   * légende expliquant la forme distincte de ces points (cf. gabarit) que lorsqu'elle est pertinente.
   */
  public readonly auMoinsUnPointHistorique: Signal<boolean> = computed(() =>
    this.series().some((serie) => (serie.pointsHistoriques?.length ?? 0) > 0),
  );

  /**
   * Construit le composant : enregistre une seule fois les composants `chart.js` requis, puis met en place l'effet
   * réactif qui construit ou met à jour l'instance `chart.js` à chaque changement des séries, des lignes verticales
   * ou de l'ensemble des séries masquées, et détruit l'instance à la destruction du composant.
   */
  public constructor() {
    SqmGraphiqueEvolutionComponent.enregistrerChartJs();
    effect(() => {
      this.actualiserGraphique();
    });
    inject(DestroyRef).onDestroy(() => {
      this.instance?.destroy();
      this.instance = undefined;
    });
  }

  /**
   * Indique si une série est actuellement active (visible), pilote l'état du bouton de bascule associé
   * (`aria-pressed`).
   * @param serieId - Identifiant de la série concernée.
   * @returns `true` si la série est active.
   */
  public serieActive(serieId: string): boolean {
    return !this.seriesMasquees().has(serieId);
  }

  /**
   * Bascule l'activation d'une série (charte d'ergonomie : « séries activables/désactivables individuellement »).
   * @param serieId - Identifiant de la série à basculer.
   */
  public basculerSerie(serieId: string): void {
    const ensemble = new Set(this.seriesMasquees());
    if (ensemble.has(serieId)) {
      ensemble.delete(serieId);
    } else {
      ensemble.add(serieId);
    }
    this.seriesMasquees.set(ensemble);
  }

  /**
   * Zoome le graphique d'un cran (alternative accessible au clavier au zoom par molette, mode souris uniquement).
   */
  public zoomerAvant(): void {
    this.instance?.zoom(1.2);
  }

  /**
   * Dézoome le graphique d'un cran (alternative accessible au clavier au zoom par molette).
   */
  public zoomerArriere(): void {
    this.instance?.zoom(0.8);
  }

  /**
   * Réinitialise le zoom temporel à son étendue complète (alternative accessible au clavier au glissement souris).
   */
  public reinitialiserZoom(): void {
    this.instance?.resetZoom();
  }

  /**
   * Construit ou met à jour l'instance `chart.js`, appelée par l'effet réactif du constructeur. Détruit l'instance
   * existante si l'état « aucune donnée » est actif ou si le canevas n'est pas (ou plus) présent dans le gabarit
   * (cf. commentaire d'en-tête de {@link canvasRef}) ; sinon, construit l'instance une seule fois puis la met à jour
   * en place pour les changements suivants (préserve l'état de zoom courant de l'utilisateur, plutôt que de le
   * réinitialiser à chaque bascule de série).
   */
  private actualiserGraphique(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (this.aucuneDonnee() || canvas === undefined) {
      this.instance?.destroy();
      this.instance = undefined;
      return;
    }

    const configuration = this.construireConfiguration();
    if (this.instance === undefined) {
      this.instance = new Chart(canvas, configuration);
      return;
    }
    this.instance.data = configuration.data;
    this.instance.options = configuration.options ?? {};
    this.instance.update();
  }

  /**
   * Construit la configuration complète `chart.js` (jeux de données, axes, infobulle, zoom, lignes verticales)
   * correspondant à l'état courant des entrées et de la bascule de séries.
   * @returns La configuration `chart.js` à appliquer.
   */
  private construireConfiguration(): ChartConfiguration<'line', ScatterDataPoint[]> {
    const seriesMasquees = this.seriesMasquees();
    const datasets: ChartDataset<'line', ScatterDataPoint[]>[] = this.series().flatMap((serie) => {
      const datasetSerie: ChartDataset<'line', ScatterDataPoint[]> = {
        label: serie.libelle,
        data: serie.points.map((point) => ({ x: new Date(point.date).getTime(), y: point.valeur })),
        borderColor: serie.couleur,
        backgroundColor: serie.couleur,
        hidden: seriesMasquees.has(serie.id),
        spanGaps: true,
        tension: 0.15,
        pointRadius: 3,
      };
      if ((serie.pointsHistoriques?.length ?? 0) === 0) {
        return [datasetSerie];
      }
      const datasetHistorique: ChartDataset<'line', ScatterDataPoint[]> = {
        label: `${serie.libelle} (audit historique)`,
        data: (serie.pointsHistoriques ?? []).map((point) => ({
          x: new Date(point.date).getTime(),
          y: point.valeur,
        })),
        borderColor: serie.couleur,
        backgroundColor: serie.couleur,
        hidden: seriesMasquees.has(serie.id),
        showLine: false,
        pointStyle: STYLE_POINT_HISTORIQUE.pointStyle,
        pointRadius: STYLE_POINT_HISTORIQUE.pointRadius,
        pointBorderWidth: 2,
      };
      return [datasetSerie, datasetHistorique];
    });

    const annotations: AnnotationOptions[] = this.lignesVerticales().map((ligne) =>
      this.construireAnnotation(ligne),
    );

    return {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: 'linear',
            ticks: {
              callback: (valeur: number | string): string =>
                SqmGraphiqueEvolutionComponent.formaterDateCourte(
                  typeof valeur === 'number' ? valeur : Number(valeur),
                ),
            },
          },
          y: { type: 'linear' },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items: readonly TooltipItem<'line'>[]): string =>
                items.length > 0
                  ? SqmGraphiqueEvolutionComponent.formaterDateCourte(Number(items[0]?.parsed.x))
                  : '',
            },
          },
          zoom: {
            pan: { enabled: true, mode: 'x' },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: 'x',
            },
          },
          annotation: { annotations },
        },
      },
    };
  }

  /**
   * Construit l'annotation `chart.js` (ligne verticale étiquetée) correspondant à une ligne verticale du graphique.
   * @param ligne - Ligne verticale à représenter.
   * @returns L'annotation `chart.js` construite.
   */
  private construireAnnotation(ligne: LigneVerticaleGraphique): AnnotationOptions {
    const style = STYLE_LIGNE_VERTICALE[ligne.categorie];
    const position = new Date(ligne.date).getTime();
    return {
      type: 'line',
      xMin: position,
      xMax: position,
      borderColor: style.couleur,
      borderWidth: 2,
      borderDash: [...style.tirets],
      label: {
        display: true,
        content: ligne.libelle,
        position: 'start',
        rotation: 90,
        backgroundColor: style.couleur,
        color: '#ffffff',
        font: { size: 10 },
      },
    };
  }
}
