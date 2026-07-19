// Fichier de référence exemplaire (gabarit) pour tout futur service Angular du projet, conforme aux règles de
// rigueur de typage et de documentation (cf. docs/02_documentation/14_normesDeveloppement.md). Ce service illustre
// le pattern du Store d'état applicatif (état réactif local via Signals). Il n'est injecté par aucun composant
// réel : il sert uniquement de modèle à reproduire. Généré avec l'assistance de l'IA (Claude Code), conformément
// à la mention d'origine requise par .claude/rules/01-usage-ia-et-conventions.md.
import { Injectable, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';

/**
 * Service de référence illustrant les conventions attendues pour tout service Angular du projet : état réactif
 * exposé en lecture seule via un Signal, mutation exclusivement par des méthodes dédiées, visibilité explicite et
 * documentation JSDoc systématique.
 * Ce service est un gabarit : il n'est injecté par aucun composant réel de l'application.
 */
@Injectable({ providedIn: 'root' })
export class ExempleReferenceService {
  private readonly compteurInterne: WritableSignal<number> = signal(0);

  /**
   * Valeur courante du compteur, exposée en lecture seule aux composants consommateurs.
   */
  public readonly compteur: Signal<number> = this.compteurInterne.asReadonly();

  /**
   * Incrémente le compteur d'une unité.
   */
  public incrementer(): void {
    this.compteurInterne.update((valeur: number) => valeur + 1);
  }

  /**
   * Réinitialise le compteur à zéro.
   */
  public reinitialiser(): void {
    this.compteurInterne.set(0);
  }
}
