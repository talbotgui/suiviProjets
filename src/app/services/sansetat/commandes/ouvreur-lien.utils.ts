// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Point de passage unique vers `openUrl()` de `@tauri-apps/plugin-opener` (R12-05, Phase 12) : la webview Tauri
// n'ouvre jamais elle-même une navigation externe (`<a target="_blank">` silencieusement sans effet), à la
// différence d'un navigateur classique (`ng serve`), qui gère déjà nativement ce cas sans le moindre code
// applicatif. Seul appelant à ce jour : la mention d'attribution du pied de page de `SqmShellComponent` (lien vers
// le dépôt GitHub du projet). Sur le même modèle que `SelecteurFichierUtils` (frontière IPC sous-jacente vers un
// greffon Tauri, distincte de la Façade de commandes proprement dite) : hors contexte Tauri, aucun appel n'est émis
// et la navigation native du navigateur suit son cours normalement.
import { isTauri } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

/**
 * Point de passage unique vers `openUrl()` de `@tauri-apps/plugin-opener`, sans effet hors contexte Tauri (la
 * navigation native du navigateur suffit alors).
 */
export class OuvreurLienUtils {
  /**
   * Ouvre une URL externe dans le navigateur système par défaut lorsque l'application s'exécute dans la webview
   * Tauri (R12-05) ; ne fait rien hors contexte Tauri, la navigation native du navigateur (`ng serve`) suffisant
   * déjà à ouvrir un nouvel onglet pour un lien `target="_blank"`.
   * @param url - URL externe à ouvrir.
   */
  public static async ouvrir(url: string): Promise<void> {
    if (isTauri()) {
      await openUrl(url);
    }
  }
}
