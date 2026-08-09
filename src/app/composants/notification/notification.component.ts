// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Affichage transverse des notifications empilées par `NotificationService` (Phase 11, R11-03) : monté une seule
// fois par le Shell (`shell.component.html`), sur le même modèle que `SqmVerrouillageComponent`/
// `SqmRechercheTransversaleComponent` (aucun état de visibilité interne, source unique de vérité dans le service).
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import type { Signal } from '@angular/core';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import type { NotificationAffichee } from '../../services/avecetat/etat/notification.service';

/**
 * Empile visuellement, en bas à droite de l'écran, les notifications de succès et d'erreur du
 * {@link NotificationService}.
 */
@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './notification.component.scss',
})
export class SqmNotificationComponent {
  private readonly notification: NotificationService = inject(NotificationService);

  /**
   * Notifications actuellement empilées.
   */
  public readonly liste: Signal<readonly NotificationAffichee[]> = this.notification.liste;

  /**
   * Referme une notification avant son auto-disparition.
   * @param id - Identifiant de la notification à refermer.
   */
  public fermer(id: number): void {
    this.notification.fermer(id);
  }
}
