// Fichier de configuration Jest généré avec l'assistance de l'IA (Claude Code) lors du bootstrap du poste de
// développement (Phase 0), conformément à la mention d'origine requise par .claude/rules/01-usage-ia-et-conventions.md.
// L'application ne dépend pas de zone.js (Angular 21, application « zoneless » par défaut, cf. package.json) :
// c'est donc l'environnement de test zoneless de jest-preset-angular qui est initialisé ici.
import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

// Ajout Phase 6, incrément 7 : jsdom n'implémente pas le rendu 2D du Canvas (`HTMLCanvasElement.getContext`),
// requis par `chart.js` (composant de graphique d'évolution, US-016). `jest-canvas-mock` fournit un contexte 2D
// simulé complet, seule façon réaliste de tester la construction effective d'un graphique sous Jest/jsdom sans
// dépendre d'un environnement de rendu réel (cf. rapport de développement de cet incrément).
import 'jest-canvas-mock';

/**
 * Réplique minimale de `ResizeObserver`, absent de jsdom (non implémenté par ce dernier), requis par `chart.js`
 * (`responsive: true`) pour se lier au conteneur du canevas dès sa construction. N'observe rien réellement (aucun
 * redimensionnement n'est simulé sous Jest/jsdom) : suffisant pour permettre la construction effective d'une
 * instance `chart.js` dans les tests de composant, sans faire échouer la construction faute de cette API globale
 * (Phase 6, incrément 7, composant de graphique d'évolution, US-016).
 */
class ResizeObserverSimule implements ResizeObserver {
  /** N'observe rien réellement (cf. commentaire de la classe). */
  public observe(): void {
    // Volontairement vide.
  }

  /** N'observe rien réellement (cf. commentaire de la classe). */
  public unobserve(): void {
    // Volontairement vide.
  }

  /** N'observe rien réellement (cf. commentaire de la classe). */
  public disconnect(): void {
    // Volontairement vide.
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverSimule;
}

setupZonelessTestEnv();
