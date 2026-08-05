// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Compteur technique d'appels de commande en cours (Phase 11, R11-04) : seule la désactivation de bouton
// (`xxxEnCours`) signalait jusqu'ici un traitement en cours, insuffisante pour un appel GitLab/Sonar potentiellement
// long (constat de la session de réflexion UX du 2026-08-03). Câblé dans `InvocationCommandeUtils` (point de
// passage unique vers le pont IPC Tauri pour les Façades Commandes/Fichier/Administration, cf. commentaire d'en-tête
// de ce fichier) via {@link IndicateurChargementUtils.envelopper}, et repris explicitement avec ce même point
// d'enveloppe par chaque appel `invoke` des quatre Façades qui continuent de l'appeler directement (Paramétrage,
// Alertes, Vues, Configuration partageable) : ces Façades ne peuvent pas dépendre de `InvocationCommandeUtils` sans
// revenir sur leur propre décision arbitraire déjà actée (appel direct à `invoke`, cf. leurs commentaires d'en-tête
// respectifs), mais rien n'empêche qu'elles enveloppent individuellement chacun de leurs appels avec ce même
// compteur, sans dépendre d'un rappel explicite par écran.
//
// Décision arbitraire de structure (à valider par un humain, cf. rapport de développement de cet incrément) :
// classe à membres statiques uniquement portant un état de module (signal), placée dans `services/sansetat/
// commandes/` plutôt que `services/avecetat/etat/` bien que ce compteur soit mutable : `InvocationCommandeUtils`
// (également dans `services/sansetat/commandes/`) ne doit jamais dépendre de `services/avecetat/` (règle déjà actée,
// cf. .claude/rules/09-normes-developpement.md#structuration-du-code-et-découpage-en-couches, contournement déjà
// constaté et corrigé une fois en Phase 4). Ce compteur ne reflète toutefois aucune donnée du fichier ouvert ni
// aucun état applicatif métier (uniquement le nombre d'appels IPC actuellement en vol) : il reste, par nature,
// distinct de l'« état applicatif » que la convention `sansetat`/`avecetat` vise à distinguer.
import { computed, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';

const compteurAppelsEnCours: WritableSignal<number> = signal(0);

/**
 * Compteur technique du nombre d'appels de commande actuellement en vol, exposé sous forme de signal pour
 * `SqmIndicateurChargementComponent`.
 */
export class IndicateurChargementUtils {
  /**
   * `true` si au moins un appel de commande est actuellement en cours.
   */
  public static readonly actif: Signal<boolean> = computed(() => compteurAppelsEnCours() > 0);

  /**
   * Signale le début d'un appel de commande.
   */
  public static demarrerAppel(): void {
    compteurAppelsEnCours.update((compteur) => compteur + 1);
  }

  /**
   * Signale la fin d'un appel de commande (succès ou échec), sans effet si le compteur est déjà à zéro.
   */
  public static terminerAppel(): void {
    compteurAppelsEnCours.update((compteur) => Math.max(0, compteur - 1));
  }

  /**
   * Enveloppe un appel de commande du décompte {@link demarrerAppel}/{@link terminerAppel}, y compris en cas
   * d'échec (`finally`).
   * @param action - Appel de commande à exécuter (ex. `() => invoke<TReponse>('definir_seuil', parametres)`).
   * @returns Le résultat de `action`.
   */
  public static async envelopper<T>(action: () => Promise<T>): Promise<T> {
    this.demarrerAppel();
    try {
      return await action();
    } finally {
      this.terminerAppel();
    }
  }
}
