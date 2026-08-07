// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Utilitaire de test partagé, décision arbitraire de structure prise lors de cet incrément (à valider par un
// humain) : `ComponentFixture.nativeElement` (Angular) est typé `any` par le framework lui-même, ce qui interdirait
// toute inspection du DOM rendu dans un test de composant sans assertion de type `as` (interdite par
// `@typescript-eslint/consistent-type-assertions` de ce projet) ou accès non sûr à une valeur `any` (interdit par
// `@typescript-eslint/no-unsafe-*`). Cette classe centralise l'unique conversion défensive nécessaire (garde
// `instanceof` puis retour direct, sans affectation intermédiaire d'une valeur `any` à une variable typée) plutôt
// que de la dupliquer dans chaque fichier de test de composant. Placée hors de `services/` (n'est pas du code
// applicatif) et hors de `composants/` (n'est pas un composant réutilisable), dans un dossier `testing/` dédié aux
// seuls fichiers de test partagés, non couvert par un seuil de couverture Jest (absent de `jest.config.js`).
//
// `obtenirComposantEnfant` ajoutée à l'occasion de C11-01 (Phase 11) : `DebugElement.componentInstance` est, de la
// même façon, typé `any` par Angular ; même garde défensive que `obtenirElementNatif` pour accéder à l'instance
// d'un composant enfant (mini-flux guidé de `SqmProjetsAdminComponent`, piloté via une variable de référence de
// gabarit non exposée publiquement par le composant hôte).
import type { Type } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

/**
 *
 */
export class DomTestUtils {
  /**
   * Restitue l'élément DOM racine rendu par un composant sous test, avec une garantie de typage réelle (vérifiée à
   * l'exécution) plutôt qu'une assertion de type non vérifiée.
   * @param fixture - Fixture de test Angular du composant dont l'élément racine est demandé.
   * @returns L'élément DOM racine rendu.
   */
  public static obtenirElementNatif<T>(fixture: ComponentFixture<T>): HTMLElement {
    if (!(fixture.nativeElement instanceof HTMLElement)) {
      throw new Error('nativeElement du fixture de test inattendu (HTMLElement attendu).');
    }
    return fixture.nativeElement;
  }

  /**
   * Restitue l'instance d'un composant enfant rendu dans le gabarit d'un composant sous test, avec une garantie de
   * typage réelle (vérifiée à l'exécution) plutôt qu'une assertion de type non vérifiée.
   * @param fixture - Fixture de test Angular du composant hôte.
   * @param type - Classe du composant enfant recherché.
   * @returns L'instance du composant enfant rendu.
   */
  public static obtenirComposantEnfant<THote, TEnfant>(
    fixture: ComponentFixture<THote>,
    type: Type<TEnfant>,
  ): TEnfant {
    const instance: unknown = fixture.debugElement.query(By.directive(type))?.componentInstance;
    if (!(instance instanceof type)) {
      throw new Error(`Composant enfant ${type.name} introuvable dans le gabarit sous test.`);
    }
    return instance;
  }
}
