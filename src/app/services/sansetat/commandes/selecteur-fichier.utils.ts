// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Point de passage unique vers la boîte de dialogue native de l'OS (`@tauri-apps/plugin-dialog`), introduit le
// 2026-07-28 : `save()`/`open()` de ce plugin appellent en interne `window.__TAURI_INTERNALS__.invoke` sans jamais
// tester `isTauri()` elles-mêmes, d'où un plantage sec (`Cannot read properties of undefined (reading 'invoke')`)
// plutôt qu'un rejet propre lorsqu'elles sont appelées hors contexte Tauri (`ng serve`) — frontière distincte de
// celle de la Façade de commandes (`invocation-commande.utils.ts`), mais relevant du même besoin. Seul appelant à
// ce jour : `SqmDemarrageComponent` (US-001, US-002), qui reste ainsi conforme à la règle imposant la boîte de
// dialogue native pour toute sélection de fichier (`docs/02_documentation/15_normesSecurite.md#contrôle-des-
// entrées-et-sorties`) : cette classe ne réimplémente jamais elle-même une saisie de chemin, elle bouchonne
// uniquement la frontière IPC sous-jacente hors contexte Tauri.
import { isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { OpenDialogOptions, OpenDialogReturn } from '@tauri-apps/plugin-dialog';

/** Chemin fictif renvoyé par le bouchon, hors contexte Tauri, à la place d'un véritable chemin choisi par l'OS. */
const CHEMIN_FICHIER_BOUCHON = '/bouchon/donnees-test.sqm';

/**
 * Point de passage unique vers `save()`/`open()` de `@tauri-apps/plugin-dialog`, permettant de substituer un
 * chemin fictif à la boîte de dialogue native hors contexte Tauri (`ng serve`).
 */
export class SelecteurFichierUtils {
  /**
   * Ouvre la boîte de dialogue native de sélection d'emplacement (création), ou renvoie un chemin fictif hors
   * contexte Tauri.
   * @param options - Options transmises telles quelles à `save()` (filtres, chemin par défaut).
   * @returns Le chemin choisi, ou `null` si l'utilisateur a annulé (jamais `null` hors contexte Tauri).
   */
  public static async choisirEmplacementCreation(
    options: Parameters<typeof save>[0],
  ): ReturnType<typeof save> {
    if (isTauri()) {
      return save(options);
    }
    return CHEMIN_FICHIER_BOUCHON;
  }

  /**
   * Ouvre la boîte de dialogue native de sélection d'un fichier existant (chargement), ou renvoie un chemin
   * fictif hors contexte Tauri.
   * @param options - Options transmises telles quelles à `open()` (filtres, sélection multiple).
   * @returns Le chemin choisi (ou la liste de chemins, ou `null` selon `options.multiple`), jamais `null` hors
   * contexte Tauri.
   */
  public static async choisirFichierChargement<TOptions extends OpenDialogOptions>(
    options?: TOptions,
  ): Promise<OpenDialogReturn<TOptions>>;
  public static async choisirFichierChargement(
    options?: OpenDialogOptions,
  ): Promise<OpenDialogReturn<OpenDialogOptions>> {
    if (isTauri()) {
      return open(options);
    }
    return CHEMIN_FICHIER_BOUCHON;
  }
}
