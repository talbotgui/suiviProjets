// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Gestionnaire d'erreurs global, ajouté à la suite du diagnostic d'un blocage de campagne d'audit resté invisible
// du journal technique local (cf. rapport de développement) : remplace le `ErrorHandler` par défaut d'Angular
// (simple `console.error`) pour que toute exception non interceptée par ailleurs — qu'elle remonte via la zone
// Angular ou via les écouteurs globaux `window.onerror`/`unhandledrejection` déjà activés par
// `provideBrowserGlobalErrorListeners()` (`app.config.ts`) — soit à la fois consignée dans le journal technique
// local du cœur natif (`FacadeCommandesService.consignerErreurUi`) et signalée visiblement à l'utilisateur
// (`NotificationService`), plutôt que de rester invisible en dehors des DevTools.
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { NotificationService } from './services/avecetat/etat/notification.service';
import { FacadeCommandesService } from './services/sansetat/commandes/facade-commandes.service';

/**
 * Message générique affiché à l'utilisateur pour toute erreur inattendue non interceptée par ailleurs : ne reprend
 * jamais le détail technique de l'erreur, potentiellement peu compréhensible, qui reste réservé au journal
 * technique local consultable séparément.
 */
const MESSAGE_UTILISATEUR =
  'Une erreur inattendue est survenue. Consultez le journal technique si besoin.';

/** Nom d'erreur générique attribué lorsque la valeur interceptée n'est pas une instance de `Error`. */
const NOM_ERREUR_INCONNUE = 'ErreurInconnue';

/** Décomposition d'une erreur de forme non garantie en ses trois champs transmis au journal technique local. */
interface DecompositionErreur {
  /** Nom de l'erreur (`Error.name`, ou {@link NOM_ERREUR_INCONNUE} si la valeur interceptée n'est pas une `Error`). */
  readonly nom: string;
  /** Message de l'erreur (`Error.message`, ou représentation textuelle de la valeur interceptée sinon). */
  readonly message: string;
  /** Pile d'appel de l'erreur (`Error.stack`), absente si indisponible ou si la valeur n'est pas une `Error`. */
  readonly pile?: string;
}

/**
 * Gestionnaire d'erreurs global de l'application, substitué au `ErrorHandler` par défaut d'Angular (cf. en-tête de
 * ce fichier).
 */
@Injectable()
export class ErrorHandlerGlobal implements ErrorHandler {
  private readonly facadeCommandes = inject(FacadeCommandesService);
  private readonly notification = inject(NotificationService);

  /**
   * Traite une erreur non interceptée par ailleurs : consignation console (comportement par défaut d'Angular,
   * conservé pour les DevTools), consignation best-effort dans le journal technique local
   * (`FacadeCommandesService.consignerErreurUi`) et signalement visible à l'utilisateur.
   * @param error - Erreur non interceptée, de forme non garantie (`unknown` en pratique malgré la signature de
   * l'interface `ErrorHandler`, non typée par Angular).
   */
  public handleError(error: unknown): void {
    console.error(error);
    const { nom, message, pile } = this.decomposer(error);
    void this.facadeCommandes.consignerErreurUi(nom, message, pile);
    this.notification.erreur(MESSAGE_UTILISATEUR);
  }

  /**
   * Décompose une erreur de forme non garantie en ses trois champs transmis au journal technique local.
   * @param error - Erreur à décomposer.
   * @returns Le nom, le message et la pile d'appel extraits.
   */
  private decomposer(error: unknown): DecompositionErreur {
    if (error instanceof Error) {
      return { nom: error.name, message: error.message, pile: error.stack };
    }
    return { nom: NOM_ERREUR_INCONNUE, message: String(error) };
  }
}
