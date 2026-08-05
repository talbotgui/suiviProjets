// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Service de notification transverse (Phase 11, R11-03) : jusqu'ici, chaque écran gérait son propre couple de
// propriétés `messageErreur`/`messageSucces` local, dupliqué à l'identique dans une dizaine de composants (constat
// de la session de réflexion UX du 2026-08-03, cf. docs/03_plan/plan_13_developpement.md#phase-11). Ce service
// centralise l'affichage des confirmations de succès et des anomalies techniques d'une action déjà tentée
// (résultat typé `echec` d'une commande, modale de confirmation du mot de passe déjà refermée), empilables,
// affichées par `SqmNotificationComponent` (monté une seule fois par le Shell).
//
// Portée volontairement plus étroite que « tout messageErreur existant » (décision arbitraire de cet incrément, à
// valider par un humain, cf. rapport de développement) : une erreur de saisie ou de validation métier détectée
// avant tout appel de commande (ex. « Le nom du groupe est obligatoire. », mot de passe incorrect ressaisi dans une
// superposition encore visible) reste signalée au plus près du champ concerné, conformément à
// docs/02_documentation/10_charteErgonomie.md#messages-utilisateurs (« une erreur de saisie ... est signalée au
// plus près du champ concerné », distincte d'une anomalie technique) ; seules les confirmations de succès et les
// anomalies techniques d'une action déjà tentée (la superposition de confirmation ayant déjà été refermée avant que
// le résultat ne soit connu) rejoignent ce service.
import { Injectable, computed, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';

/** Nature d'une notification affichée (couleur et rôle ARIA associés, cf. `SqmNotificationComponent`). */
export type TypeNotification = 'succes' | 'erreur';

/** Notification affichée par le service, empilable avec les autres. */
export interface NotificationAffichee {
  /** Identifiant technique, unique pour la durée de la session (compteur incrémental). */
  readonly id: number;
  /** Nature de la notification, détermine sa couleur et son rôle ARIA. */
  readonly type: TypeNotification;
  /** Message affiché, déjà mis en forme (langage clair, cf. charte d'ergonomie). */
  readonly message: string;
}

/**
 * Délai d'auto-disparition d'une notification de succès, en millisecondes : décision arbitraire de cet incrément
 * (aucune valeur normative disponible), à valider par un humain, sur le modèle des autres choix d'ergonomie laissés
 * à l'appréciation du Codeur faute de convention imposée (ex. raccourci Ctrl+K de la recherche transversale, cf.
 * `shell.component.ts`).
 */
const DUREE_AUTO_DISPARITION_SUCCES_MS = 5_000;

/**
 * Délai d'auto-disparition d'une notification d'erreur, en millisecondes : plus long que
 * {@link DUREE_AUTO_DISPARITION_SUCCES_MS} pour laisser le temps de lire un message technique plus dense (même
 * décision arbitraire).
 */
const DUREE_AUTO_DISPARITION_ERREUR_MS = 8_000;

/**
 * Service de notification transverse (« toaster ») : empile des confirmations de succès et des anomalies
 * techniques d'action déjà tentée, à auto-disparition, affichées par `SqmNotificationComponent`.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notifications: WritableSignal<readonly NotificationAffichee[]> = signal([]);
  private prochainId = 0;
  private readonly minuteurs = new Map<number, ReturnType<typeof setTimeout>>();

  /**
   * Notifications actuellement affichées, empilées dans leur ordre d'apparition.
   */
  public readonly liste: Signal<readonly NotificationAffichee[]> = computed(() =>
    this.notifications(),
  );

  /**
   * Affiche une confirmation de succès, discrète et auto-disparaissante (charte d'ergonomie : « une confirmation de
   * succès reste discrète et n'interrompt jamais le flux de travail »).
   * @param message - Message de confirmation, en langage clair.
   */
  public succes(message: string): void {
    this.empiler('succes', message, DUREE_AUTO_DISPARITION_SUCCES_MS);
  }

  /**
   * Affiche une anomalie technique d'une action déjà tentée (résultat `echec` d'une commande, superposition de
   * confirmation déjà refermée).
   * @param message - Message d'anomalie, en langage clair.
   */
  public erreur(message: string): void {
    this.empiler('erreur', message, DUREE_AUTO_DISPARITION_ERREUR_MS);
  }

  /**
   * Referme une notification avant son auto-disparition (bouton de fermeture explicite de
   * `SqmNotificationComponent`).
   * @param id - Identifiant de la notification à refermer.
   */
  public fermer(id: number): void {
    const minuteur = this.minuteurs.get(id);
    if (minuteur !== undefined) {
      clearTimeout(minuteur);
      this.minuteurs.delete(id);
    }
    this.notifications.update((courantes) => courantes.filter((n) => n.id !== id));
  }

  /**
   * Empile une nouvelle notification et programme son auto-disparition.
   * @param type - Nature de la notification.
   * @param message - Message affiché.
   * @param dureeMs - Délai avant auto-disparition, en millisecondes.
   */
  private empiler(type: TypeNotification, message: string, dureeMs: number): void {
    const id = this.prochainId++;
    this.notifications.update((courantes) => [...courantes, { id, type, message }]);
    this.minuteurs.set(
      id,
      setTimeout(() => this.fermer(id), dureeMs),
    );
  }
}
