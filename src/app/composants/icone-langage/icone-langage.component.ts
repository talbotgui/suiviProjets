// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant partagé « icône de langage » (RG-057, plan_17 chapitre 3) : restitue une icône de langage à partir de
// la clé Sonar renvoyée par `ncloc_language_distribution` (`java`, `ts`, `web`…), réutilisé par la Fiche projet et
// par l'écran Obsolescence. Rend un `<img>` référençant un fichier SVG Devicon local sous `public/langages/`
// (servi depuis la racine du bundle, `img-src 'self'` déjà autorisé — aucune ressource externe, aucun
// `[innerHTML]`, aucune injection HTML dynamique, cf. .claude/rules/10-normes-securite.md). Toute clé Sonar non
// reconnue produit un repli textuel (petite puce portant le libellé), jamais une absence silencieuse. La
// correspondance clé Sonar → fichier SVG est une table statique interne, chaque entrée relevant de RG-057.
import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import type { InputSignal, Signal, WritableSignal } from '@angular/core';

/**
 * Taille d'affichage de l'icône : `md` sur la Fiche projet, `sm` sur les tuiles de l'écran Obsolescence.
 */
export type TailleIconeLangage = 'md' | 'sm';

/**
 * Entrée de la table de correspondance interne : nom de fichier SVG (sans extension) sous `public/langages/` et
 * libellé affiché du langage.
 */
interface EntreeCorrespondanceLangage {
  /** Nom de base du fichier `public/langages/<fichier>.svg` (sous-ensemble Devicon versionné localement). */
  readonly fichier: string;
  /** Libellé complet du langage, porté par `alt`/`title` (jamais d'information portée par la seule image). */
  readonly libelle: string;
}

/**
 * Icône d'un langage principal d'un projet (RG-057). Reçoit une clé de langage Sonar et une taille ; rend l'icône
 * Devicon locale correspondante ou, à défaut de correspondance, une puce textuelle de repli.
 */
@Component({
  selector: 'app-icone-langage',
  templateUrl: './icone-langage.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './icone-langage.component.scss',
})
export class SqmIconeLangageComponent {
  /**
   * Clé de langage telle que renvoyée par Sonar (`ncloc_language_distribution`), par exemple `java`, `ts`, `web`.
   * La casse est ignorée.
   */
  public readonly cleSonar: InputSignal<string> = input.required<string>();

  /**
   * Taille d'affichage souhaitée ; `md` par défaut.
   */
  public readonly taille: InputSignal<TailleIconeLangage> = input<TailleIconeLangage>('md');

  /**
   * Table de correspondance clé Sonar (minuscule) → fichier SVG local et libellé (RG-057). Sous-ensemble Devicon
   * versionné sous `public/langages/`. Une clé absente de cette table relève du repli textuel. Décision
   * arbitraire à valider par un humain : périmètre exact des langages couverts (cf. rapport de développement).
   */
  private static readonly CORRESPONDANCE: Readonly<Record<string, EntreeCorrespondanceLangage>> = {
    java: { fichier: 'java', libelle: 'Java' },
    kotlin: { fichier: 'kotlin', libelle: 'Kotlin' },
    scala: { fichier: 'scala', libelle: 'Scala' },
    groovy: { fichier: 'groovy', libelle: 'Groovy' },
    js: { fichier: 'javascript', libelle: 'JavaScript' },
    ts: { fichier: 'typescript', libelle: 'TypeScript' },
    // Sonar nomme `web` l'analyseur des fichiers HTML (et `html` est parfois vu selon la version) ; les deux
    // pointent vers l'icône HTML.
    web: { fichier: 'html5', libelle: 'HTML' },
    html: { fichier: 'html5', libelle: 'HTML' },
    css: { fichier: 'css3', libelle: 'CSS' },
    scss: { fichier: 'sass', libelle: 'SCSS' },
    py: { fichier: 'python', libelle: 'Python' },
    cs: { fichier: 'csharp', libelle: 'C#' },
    c: { fichier: 'c', libelle: 'C' },
    cpp: { fichier: 'cplusplus', libelle: 'C++' },
    objc: { fichier: 'objectivec', libelle: 'Objective-C' },
    go: { fichier: 'go', libelle: 'Go' },
    rust: { fichier: 'rust', libelle: 'Rust' },
    php: { fichier: 'php', libelle: 'PHP' },
    ruby: { fichier: 'ruby', libelle: 'Ruby' },
    swift: { fichier: 'swift', libelle: 'Swift' },
    py3: { fichier: 'python', libelle: 'Python' },
    terraform: { fichier: 'terraform', libelle: 'Terraform' },
    docker: { fichier: 'docker', libelle: 'Docker' },
  };

  /**
   * Entrée de correspondance de la clé Sonar courante, ou `null` si la clé n'est pas reconnue.
   */
  // `noUncheckedIndexedAccess` étant désactivé, le compilateur type l'accès indexé comme non nul ; le `?? null`
  // reste le garde-fou réel à l'exécution pour toute clé Sonar absente de la table (ne pas le supprimer).
  protected readonly entree: Signal<EntreeCorrespondanceLangage | null> = computed(
    () => SqmIconeLangageComponent.CORRESPONDANCE[this.cleSonar().toLowerCase()] ?? null,
  );

  /**
   * Libellé affiché du langage : celui de la table si la clé est connue, sinon la clé Sonar telle quelle.
   */
  protected readonly libelle: Signal<string> = computed(
    () => this.entree()?.libelle ?? this.cleSonar(),
  );

  /**
   * `true` si le chargement du fichier SVG a échoué (fichier manquant ou illisible) : bascule alors sur le repli
   * textuel plutôt que d'afficher une image cassée. Se réinitialise à `false` à chaque changement de clé Sonar
   * (donc de fichier ciblé), via {@link linkedSignal}.
   */
  private readonly imageEnEchec: WritableSignal<boolean> = linkedSignal<string, boolean>({
    source: () => this.cleSonar(),
    computation: () => false,
  });

  /**
   * Chemin relatif du fichier SVG à afficher (servi depuis la racine du bundle), ou `null` si la clé n'est pas
   * reconnue ou si son fichier n'a pas pu être chargé (repli textuel dans les deux cas).
   */
  protected readonly source: Signal<string | null> = computed(() => {
    const entree: EntreeCorrespondanceLangage | null = this.entree();
    if (entree === null || this.imageEnEchec()) {
      return null;
    }
    return `langages/${entree.fichier}.svg`;
  });

  /**
   * Texte de la puce de repli, affichée quand la clé Sonar n'est pas reconnue : libellé tronqué en majuscules.
   */
  protected readonly repli: Signal<string> = computed(() =>
    this.libelle().slice(0, 4).toUpperCase(),
  );

  /**
   * Signale l'échec de chargement du fichier SVG (fichier manquant ou illisible) : bascule sur le repli textuel.
   */
  protected onErreurImage(): void {
    this.imageEnEchec.set(true);
  }
}
