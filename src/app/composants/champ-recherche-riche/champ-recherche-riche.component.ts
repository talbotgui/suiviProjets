// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Champ de recherche riche transverse (C11-02, RG-036) : remplace le couple `<input>`+`<datalist>` HTML natif
// (champ texte libre sans surlignage, sans message explicite d'absence de correspondance, cf. constat C11-02) par
// une superposition de suggestions filtrées, avec surlignage du texte recherché, message explicite en l'absence de
// correspondance et navigation complète au clavier (flèches, Entrée, Échap), sur le modèle du motif ARIA
// « combobox » et du pattern déjà en place dans `composants/recherche-transversale/`. Premier usage :
// `composants/formulaire-source/` (identifiant externe d'une source), conçu pour rester réutilisable au-delà.
//
// État porté par des signals plutôt que des propriétés simples (R11-07, application zoneless) : toute mutation doit
// déclencher un nouveau rendu, y compris depuis un gestionnaire clavier ou souris.
import {
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { InputSignal, OutputEmitterRef, Signal, WritableSignal } from '@angular/core';
import { IndexRechercheUtils } from '../../services/avecetat/recherche/index-recherche.utils';

/**
 * Option proposée par le champ de recherche riche : une valeur techniquement retenue à la sélection, et un libellé
 * affiché (potentiellement plus explicite que la seule valeur, ex. nom lisible d'un dépôt).
 */
export interface OptionRechercheRiche {
  /** Valeur retenue à la sélection de cette option. */
  readonly valeur: string;
  /** Libellé affiché dans la liste de suggestions. */
  readonly libelle: string;
}

/**
 * Segmentation du libellé d'une suggestion autour de la portion correspondant au terme recherché, pour un
 * surlignage explicite dans le template (`@let`).
 */
interface SegmentLibelle {
  /** Portion du libellé précédant la correspondance. */
  readonly avant: string;
  /** Portion du libellé correspondant au terme recherché (surlignée), chaîne vide si aucune correspondance. */
  readonly correspondance: string;
  /** Portion du libellé suivant la correspondance. */
  readonly apres: string;
}

/**
 * Champ de recherche riche réutilisable (C11-02) : saisie libre avec suggestions filtrées, surlignage du terme
 * recherché, message explicite en l'absence de correspondance, navigation complète au clavier. Contrôlé par le
 * composant appelant ({@link valeur}/{@link valeurChange}), sur le même modèle qu'un champ `ngModel` classique.
 */
@Component({
  selector: 'app-champ-recherche-riche',
  templateUrl: './champ-recherche-riche.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './champ-recherche-riche.component.scss',
})
export class SqmChampRechercheRicheComponent {
  private readonly champ: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('champ');

  /**
   * Identifiant de base du champ, décliné pour son texte d'aide et sa liste de suggestions (accessibilité,
   * `aria-describedby`/`aria-controls`/`aria-activedescendant`).
   */
  public readonly id: InputSignal<string> = input.required<string>();

  /**
   * Libellé du champ, affiché par le `<label>` associé.
   */
  public readonly libelle: InputSignal<string> = input.required<string>();

  /**
   * Texte d'aide optionnel, affiché sous le champ (`champ__aide`, R11-08).
   */
  public readonly aide: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Suggestions proposées, déjà triées par l'appelant (RG-036 : ordre alphabétique insensible à la casse).
   */
  public readonly options: InputSignal<readonly OptionRechercheRiche[]> = input<
    readonly OptionRechercheRiche[]
  >([]);

  /**
   * Valeur actuellement saisie, contrôlée par le composant appelant.
   */
  public readonly valeur: InputSignal<string> = input.required<string>();

  /**
   * Texte indicatif affiché en l'absence de saisie.
   */
  public readonly placeholder: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /**
   * Rend le champ obligatoire (attribut HTML `required`), `false` par défaut.
   */
  public readonly requis: InputSignal<boolean> = input<boolean>(false);

  /**
   * Émis à chaque modification de la saisie (frappe libre ou sélection d'une suggestion).
   */
  public readonly valeurChange: OutputEmitterRef<string> = output<string>();

  /**
   * Indique si la liste de suggestions est actuellement déployée.
   */
  public readonly ouverte: WritableSignal<boolean> = signal(false);

  /**
   * Index de la suggestion actuellement mise en évidence par la navigation clavier, `-1` si aucune.
   */
  public readonly indexActif: WritableSignal<number> = signal(-1);

  /**
   * Suggestions filtrées par la valeur actuellement saisie (comparaison insensible à la casse et aux accents),
   * l'intégralité de {@link options} restant proposée tant qu'aucun terme n'est saisi (RG-036).
   */
  public readonly optionsFiltrees: Signal<readonly OptionRechercheRiche[]> = computed(() =>
    this.filtrerOptions(this.valeur(), this.options()),
  );

  /**
   * Déploie la liste de suggestions à la prise de focus du champ.
   */
  public ouvrir(): void {
    this.ouverte.set(true);
  }

  /**
   * Referme la liste de suggestions et réinitialise la mise en évidence clavier.
   */
  public fermer(): void {
    this.ouverte.set(false);
    this.indexActif.set(-1);
  }

  /**
   * Referme la liste de suggestions après un court délai, pour laisser le temps à une sélection à la souris de
   * s'exécuter avant que la perte de focus du champ (`blur`) ne démonte la liste (garde défensive multi-navigateurs,
   * en complément de `preventDefault` sur `mousedown`, cf. {@link selectionnerDepuisSouris}).
   */
  public fermerDifferee(): void {
    setTimeout(() => this.fermer(), 150);
  }

  /**
   * Gère la saisie libre dans le champ, sans accès non sûr à sa cible (garde `instanceof`, sur le modèle de
   * `SqmRechercheTransversaleComponent.gererSaisieTerme`).
   * @param evenement - Événement d'entrée du champ.
   */
  public gererSaisie(evenement: Event): void {
    if (evenement.target instanceof HTMLInputElement) {
      this.valeurChange.emit(evenement.target.value);
      this.indexActif.set(-1);
      this.ouverte.set(true);
    }
  }

  /**
   * Sélectionne une suggestion : reporte sa valeur dans le champ, rend le focus au champ puis referme la liste.
   * Ordre impératif : rendre le focus avant de refermer, car ce focus déclenche lui-même {@link ouvrir} (gestionnaire
   * `(focus)` du champ) — le refermer après annule cette réouverture immédiate plutôt que de laisser la liste
   * rouverte juste après la sélection.
   * @param option - Suggestion sélectionnée.
   */
  public selectionner(option: OptionRechercheRiche): void {
    this.valeurChange.emit(option.valeur);
    this.champ()?.nativeElement.focus();
    this.fermer();
  }

  /**
   * Sélectionne une suggestion activée à la souris, en empêchant l'action par défaut de `mousedown` (perte de focus
   * du champ avant que la sélection n'ait pu s'exécuter).
   * @param evenement - Événement souris reçu par la suggestion.
   * @param option - Suggestion sélectionnée.
   */
  public selectionnerDepuisSouris(evenement: MouseEvent, option: OptionRechercheRiche): void {
    evenement.preventDefault();
    this.selectionner(option);
  }

  /**
   * Gère la navigation clavier dans la liste de suggestions (flèches, Entrée, Échap), sur le modèle du motif ARIA
   * « combobox » : une flèche pressée sans mise en évidence courante (`-1`) rejoint la première suggestion
   * (ArrowDown) ou la dernière (ArrowUp), chaque flèche suivante progressant d'un cran sans reboucler au-delà des
   * bornes. Une touche Entrée sans suggestion mise en évidence n'est pas interceptée (aucun `preventDefault`), pour
   * laisser un formulaire englobant se soumettre normalement (R11-06).
   * @param evenement - Événement clavier reçu par le champ.
   */
  public gererTouche(evenement: KeyboardEvent): void {
    const suggestions = this.optionsFiltrees();
    if (evenement.key === 'ArrowDown') {
      evenement.preventDefault();
      this.ouverte.set(true);
      this.indexActif.update((index) => Math.min(index + 1, suggestions.length - 1));
      return;
    }
    if (evenement.key === 'ArrowUp') {
      evenement.preventDefault();
      this.ouverte.set(true);
      this.indexActif.update((index) =>
        index <= 0 ? suggestions.length - 1 : Math.max(index - 1, 0),
      );
      return;
    }
    if (evenement.key === 'Escape') {
      this.fermer();
      return;
    }
    if (evenement.key === 'Enter' && this.ouverte() && this.indexActif() >= 0) {
      evenement.preventDefault();
      const option = suggestions[this.indexActif()];
      if (option) {
        this.selectionner(option);
      }
    }
  }

  /**
   * Segmente le libellé d'une suggestion autour de la portion correspondant au terme actuellement saisi, pour un
   * surlignage explicite dans le template (`@let`). Repose sur l'hypothèse, déjà implicite dans
   * `IndexRechercheUtils.rechercher`, qu'un repliement d'accent ne modifie pas la longueur en unités UTF-16 de la
   * chaîne d'origine (vrai pour tout diacritique simple de l'alphabet latin, seul cas rencontré par ce champ) : les
   * décalages calculés sur la chaîne repliée restent donc directement applicables à la chaîne d'origine.
   * @param option - Suggestion dont le libellé doit être segmenté.
   * @returns Le libellé segmenté en portion avant/correspondance/après.
   */
  public segmenterLibelle(option: OptionRechercheRiche): SegmentLibelle {
    const terme = this.valeur().trim();
    if (terme.length === 0) {
      return { avant: option.libelle, correspondance: '', apres: '' };
    }
    const libelleReplie = IndexRechercheUtils.replierAccents(option.libelle.toLowerCase());
    const termeReplie = IndexRechercheUtils.replierAccents(terme.toLowerCase());
    const indexCorrespondance = libelleReplie.indexOf(termeReplie);
    if (indexCorrespondance === -1) {
      return { avant: option.libelle, correspondance: '', apres: '' };
    }
    return {
      avant: option.libelle.slice(0, indexCorrespondance),
      correspondance: option.libelle.slice(
        indexCorrespondance,
        indexCorrespondance + termeReplie.length,
      ),
      apres: option.libelle.slice(indexCorrespondance + termeReplie.length),
    };
  }

  /**
   * Filtre les suggestions par la valeur actuellement saisie, comparaison insensible à la casse et aux accents sur
   * le libellé comme sur la valeur technique (RG-036).
   * @param valeurSaisie - Valeur actuellement saisie dans le champ.
   * @param options - Suggestions disponibles avant filtrage.
   * @returns Les suggestions correspondant au terme saisi, l'intégralité de {@link options} si la saisie est vide.
   */
  private filtrerOptions(
    valeurSaisie: string,
    options: readonly OptionRechercheRiche[],
  ): readonly OptionRechercheRiche[] {
    const termeReplie = IndexRechercheUtils.replierAccents(valeurSaisie.trim().toLowerCase());
    if (termeReplie.length === 0) {
      return options;
    }
    return options.filter(
      (option) =>
        IndexRechercheUtils.replierAccents(option.libelle.toLowerCase()).includes(termeReplie) ||
        IndexRechercheUtils.replierAccents(option.valeur.toLowerCase()).includes(termeReplie),
    );
  }
}
