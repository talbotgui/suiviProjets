// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant partagé « icône de mode d'authentification » (US-067, RG-067, plan_22) : restitue le mode
// d'authentification détecté d'une application (OIDC, SAML, CAS) ou la mention neutre « aucune authentification
// détectée », réutilisé par la Fiche projet et par l'écran Obsolescence. Rend un `<img>` référençant un pictogramme
// SVG maison local sous `public/authentification/` (aucune ressource externe, aucun `[innerHTML]`, cf.
// .claude/rules/10-normes-securite.md), sur le patron de `SqmIconeLangageComponent` : tout échec de chargement
// bascule sur une puce textuelle de repli, jamais une absence silencieuse.
import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import type { InputSignal, Signal, WritableSignal } from '@angular/core';
import type { ModeAuthentification } from '../../services/sansetat/jugement/parametres-jugement.utils';

/**
 * Taille d'affichage de l'icône : `md` sur la Fiche projet, `sm` sur les tuiles de l'écran Obsolescence.
 */
export type TailleIconeAuthentification = 'md' | 'sm';

/**
 * Variante restituée : un mode détecté, ou `aucun` pour la mention neutre « aucune authentification détectée »
 * (RG-067 : jamais la preuve d'une absence d'authentification).
 */
export type VarianteIconeAuthentification = ModeAuthentification | 'aucun';

/**
 * Entrée de la table de correspondance interne : nom de fichier SVG (sans extension) et libellé du mode.
 */
interface EntreeCorrespondanceAuthentification {
  /** Nom de base du fichier `public/authentification/<fichier>.svg`. */
  readonly fichier: string;
  /** Libellé du mode, porté par `alt`/`title`. */
  readonly libelle: string;
  /** Texte court de la puce de repli. */
  readonly repli: string;
}

/**
 * Icône du mode d'authentification d'une application (RG-067). Reçoit une variante, les références de dépendances
 * déclenchantes (restituées en infobulle) et une taille.
 */
@Component({
  selector: 'app-icone-authentification',
  templateUrl: './icone-authentification.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './icone-authentification.component.scss',
})
export class SqmIconeAuthentificationComponent {
  /** Mode d'authentification détecté, ou `aucun`. */
  public readonly variante: InputSignal<VarianteIconeAuthentification> =
    input.required<VarianteIconeAuthentification>();

  /** Références des dépendances ayant déclenché la détection, listées dans l'infobulle. */
  public readonly references: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /** Taille d'affichage souhaitée ; `md` par défaut. */
  public readonly taille: InputSignal<TailleIconeAuthentification> =
    input<TailleIconeAuthentification>('md');

  /** Table de correspondance variante → pictogramme local et libellés (RG-067), exhaustive sur la liste fermée. */
  private static readonly CORRESPONDANCE: Readonly<
    Record<VarianteIconeAuthentification, EntreeCorrespondanceAuthentification>
  > = {
    OIDC: { fichier: 'oidc', libelle: 'Authentification OIDC', repli: 'OIDC' },
    SAML: { fichier: 'saml', libelle: 'Authentification SAML', repli: 'SAML' },
    CAS: { fichier: 'cas', libelle: 'Authentification CAS', repli: 'CAS' },
    aucun: { fichier: 'aucun', libelle: 'Aucune authentification détectée', repli: '—' },
  };

  /** Entrée de correspondance de la variante courante. */
  protected readonly entree: Signal<EntreeCorrespondanceAuthentification> = computed(
    () => SqmIconeAuthentificationComponent.CORRESPONDANCE[this.variante()],
  );

  /** Libellé accessible (`alt`/`aria-label`) : libellé du mode, sans la liste des dépendances. */
  protected readonly libelle: Signal<string> = computed(() => this.entree().libelle);

  /**
   * Infobulle : libellé du mode complété des dépendances déclenchantes, ou de la précision sur la portée de la
   * détection pour la variante `aucun`.
   */
  protected readonly infobulle: Signal<string> = computed(() => {
    if (this.variante() === 'aucun') {
      return `${this.libelle()} parmi les dépendances déclarées`;
    }
    const references = this.references();
    return references.length === 0
      ? `${this.libelle()} détectée`
      : `${this.libelle()} détectée via : ${references.join(', ')}`;
  });

  /**
   * `true` si le chargement du fichier SVG a échoué : bascule alors sur le repli textuel. Se réinitialise à chaque
   * changement de variante, via {@link linkedSignal}.
   */
  private readonly imageEnEchec: WritableSignal<boolean> = linkedSignal<
    VarianteIconeAuthentification,
    boolean
  >({
    source: () => this.variante(),
    computation: () => false,
  });

  /** Chemin relatif du pictogramme, ou `null` si son chargement a échoué (repli textuel). */
  protected readonly source: Signal<string | null> = computed(() =>
    this.imageEnEchec() ? null : `authentification/${this.entree().fichier}.svg`,
  );

  /** Signale l'échec de chargement du pictogramme : bascule sur le repli textuel. */
  protected onErreurImage(): void {
    this.imageEnEchec.set(true);
  }
}
