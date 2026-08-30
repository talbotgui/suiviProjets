// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant transverse de filtrage par groupe et par projet (plan_16, incrément 2 — RG-053, US-053), monté sur les
// écrans de restitution (Synthèse des audits comme écran pilote, puis Synthèse graphique, Obsolescence, Liste de
// travail). Porte les seuls filtres de groupe et de projet : un sélecteur de groupe et un sélecteur multi-projets
// dont la liste est restreinte au groupe sélectionné. Règle de couplage : tout changement de groupe vide la
// sélection de projets.
//
// Reste volontairement agnostique de l'écran appelant et n'importe RIEN de `services/avecetat/` (frontière de
// couches, cf. docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches) : les
// types `Groupe`/`Projet` de `services/avecetat/etat/types-donnees.ts` ne sont pas importés ici ; {@link
// GroupeFiltrable} et {@link ProjetFiltrable} en reprennent la forme structurelle utile, sur le modèle déjà retenu
// par `SqmSelecteurVueComponent` (`VueSelectionnable`). L'écran appelant lit son état initial dans
// `ContexteConsultationService` et traduit l'événement {@link selectionChangee} en appel à ce même service.
//
// Le montage de `SqmSelecteurVueComponent` et des filtres complémentaires propres à l'écran (indicateur, date,
// bornes par catégorie) se fait par projection de contenu (`<ng-content>`), pour former une barre de filtres
// homogène sans que ce composant ait à connaître ni typer ces filtres.
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { InputSignal, OutputEmitterRef, Signal } from '@angular/core';

/**
 * Groupe proposé au sélecteur de groupe (miroir partiel de `Groupe`, cf. commentaire d'en-tête de ce fichier).
 */
export interface GroupeFiltrable {
  /** Identifiant UUID v4 du groupe. */
  readonly id: string;
  /** Nom du groupe. */
  readonly nom: string;
}

/**
 * Projet proposé au sélecteur multi-projets (miroir partiel de `Projet`, cf. commentaire d'en-tête de ce fichier).
 */
export interface ProjetFiltrable {
  /** Identifiant UUID v4 du projet. */
  readonly id: string;
  /** Nom du projet. */
  readonly nom: string;
  /** Identifiant du groupe de rattachement, utilisé pour restreindre la liste au groupe sélectionné. */
  readonly groupeId: string;
}

/**
 * Sélection de groupe et de projets émise par ce composant à chaque changement (RG-053). `null` signifie « aucune
 * restriction » : `groupeId` à `null` = tous les groupes, `projetIds` à `null` = tous les projets.
 */
export interface SelectionGroupeProjet {
  /** Identifiant du groupe sélectionné, `null` = tous les groupes. */
  readonly groupeId: string | null;
  /** Identifiants des projets sélectionnés, `null` = aucune restriction de projet. */
  readonly projetIds: readonly string[] | null;
}

/**
 * Composant de filtrage groupe/projet mutualisé (RG-053). N'applique jamais lui-même un filtre : émet la sélection
 * courante, à charge de l'écran appelant de la reporter dans `ContexteConsultationService` et de filtrer ses
 * propres lignes.
 */
@Component({
  selector: 'app-filtre-groupe-projet',
  imports: [],
  templateUrl: './filtre-groupe-projet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './filtre-groupe-projet.component.scss',
})
export class SqmFiltreGroupeProjetComponent {
  /**
   * Groupes proposés au sélecteur de groupe, dans l'ordre d'affichage souhaité par l'écran appelant.
   */
  public readonly groupes: InputSignal<readonly GroupeFiltrable[]> =
    input.required<readonly GroupeFiltrable[]>();

  /**
   * Ensemble complet des projets (tous groupes confondus), dans l'ordre d'affichage souhaité par l'écran appelant.
   * La liste réellement proposée est restreinte au groupe sélectionné (cf. {@link projetsProposes}).
   */
  public readonly projets: InputSignal<readonly ProjetFiltrable[]> =
    input.required<readonly ProjetFiltrable[]>();

  /**
   * Identifiant du groupe actuellement sélectionné (état porté par l'écran appelant), `null` = tous les groupes.
   */
  public readonly groupeId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Identifiants des projets actuellement sélectionnés (état porté par l'écran appelant), `null` = aucune
   * restriction.
   */
  public readonly projetIds: InputSignal<readonly string[] | null> = input<
    readonly string[] | null
  >(null);

  /**
   * Émis à chaque changement de la sélection de groupe ou de projets, avec la sélection complète résultante.
   */
  public readonly selectionChangee: OutputEmitterRef<SelectionGroupeProjet> =
    output<SelectionGroupeProjet>();

  /**
   * Projets réellement proposés au sélecteur multi-projets : tous les projets si aucun groupe n'est sélectionné,
   * sinon les seuls projets du groupe sélectionné.
   */
  public readonly projetsProposes: Signal<readonly ProjetFiltrable[]> = computed(() => {
    const groupeId = this.groupeId();
    if (groupeId === null) {
      return this.projets();
    }
    return this.projets().filter((projet) => projet.groupeId === groupeId);
  });

  /**
   * Indique si un projet donné fait partie de la sélection courante (pilote l'attribut `selected` de son option).
   * @param id - Identifiant du projet.
   * @returns `true` si le projet est sélectionné.
   */
  public estProjetSelectionne(id: string): boolean {
    return this.projetIds()?.includes(id) ?? false;
  }

  /**
   * Traite un changement du sélecteur de groupe : vide la sélection de projets (règle de couplage RG-053) et émet
   * la nouvelle sélection.
   * @param valeur - Valeur brute de l'option choisie, chaîne vide = tous les groupes.
   */
  public onChangerGroupe(valeur: string): void {
    this.selectionChangee.emit({
      groupeId: valeur.length === 0 ? null : valeur,
      projetIds: null,
    });
  }

  /**
   * Traite un changement du sélecteur multi-projets : émet la nouvelle sélection de projets, en conservant le
   * groupe courant.
   * @param select - Élément `<select multiple>` d'où lire les options sélectionnées.
   */
  public onChangerProjets(select: HTMLSelectElement): void {
    const ids = Array.from(select.selectedOptions, (option) => option.value);
    this.selectionChangee.emit({
      groupeId: this.groupeId(),
      projetIds: ids.length === 0 ? null : ids,
    });
  }
}
