// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Gardes de routage (US-001, US-002, US-026), premier précédent de garde dans ce dépôt : aucun gabarit existant ne
// documente ce pattern (cf. rapport de développement de cette tâche). Décision arbitraire à valider par un humain :
// plutôt que l'idiome Angular usuel `CanActivateFn` (constante-fonction exportée), retenu ici sous forme de
// méthodes statiques d'une classe à membres statiques uniquement, seule forme compatible avec la règle ESLint
// personnalisée « aucune fonction ni constante-fonction hors classe » de ce projet (`eslint.config.js`,
// `no-restricted-syntax`) — une référence directe à une méthode statique (`AppRoutesGuards.xxx`, sans enveloppe
// fléchée) n'est visée par aucun des sélecteurs de cette règle, à la différence d'une constante exportée
// `export const xxx: CanActivateFn = () => {...}`. Angular accepte nativement une référence de fonction à ce point
// d'extension (`Route.canActivate`), appelée dans le contexte d'injection du routeur : `inject()` y est donc
// utilisable normalement au sein de chaque méthode, malgré l'absence d'instance de classe. Chaque méthode est
// annotée `this: void` (aucun accès à `this`) pour satisfaire `@typescript-eslint/unbound-method`, qui signalerait
// autrement la référence non liée transmise telle quelle à `canActivate`.
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { UrlTree } from '@angular/router';
import { EtatFichier, EtatSessionService } from './services/avecetat/etat/etat-session.service';

/**
 * Gardes de routage du fichier de données (US-001, US-002, US-026) : empêchent l'accès au Shell applicatif tant
 * qu'aucun fichier n'est ouvert, et empêchent symétriquement l'accès à l'écran de Démarrage une fois un fichier
 * déjà ouvert (verrouillé ou non).
 */
export class AppRoutesGuards {
  /**
   * Garde de la route racine du Shell applicatif (`app.routes.ts`) : un fichier verrouillé reste autorisé (la
   * superposition de Verrouillage se charge de masquer les données, `08_arborescenceNavigation.md` : « sans le
   * démonter »), seul l'état fermé redirige vers l'écran de Démarrage.
   * @returns `true` si l'accès est autorisé, ou l'arborescence d'URL de redirection vers `/demarrage` sinon.
   */
  public static fichierOuvertGuard(this: void): boolean | UrlTree {
    const etatSession = inject(EtatSessionService);
    if (etatSession.etatFichier() === EtatFichier.Ferme) {
      return inject(Router).createUrlTree(['/demarrage']);
    }
    return true;
  }

  /**
   * Garde de la route de l'écran de Démarrage : évite de re-proposer la création/le chargement d'un fichier une
   * fois qu'un fichier est déjà ouvert (verrouillé ou non), par exemple après une navigation arrière du
   * navigateur.
   * @returns `true` si l'accès est autorisé, ou l'arborescence d'URL de redirection vers `/accueil` sinon.
   */
  public static demarrageIndisponibleSiOuvertGuard(this: void): boolean | UrlTree {
    const etatSession = inject(EtatSessionService);
    if (etatSession.etatFichier() !== EtatFichier.Ferme) {
      return inject(Router).createUrlTree(['/accueil']);
    }
    return true;
  }
}
