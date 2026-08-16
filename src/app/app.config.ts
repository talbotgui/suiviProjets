// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md : sortie brute du générateur Angular (`ng new`) adaptée depuis la
// Phase 6, incrément 5 (`withComponentInputBinding()`, ci-dessous), ce qui lui retire l'exemption de mention
// réservée aux fichiers reproduisant tel quel, sans adaptation, la sortie d'un générateur officiel.
import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';

import { ErrorHandlerGlobal } from './app.error-handler';
import { routes } from './app.routes';

// `withComponentInputBinding()` : lie automatiquement les paramètres de route (ex. `projetId` de
// `fiche-projet/:projetId`) aux `input()` du composant routé portant le même nom, plutôt que d'injecter
// `ActivatedRoute` et de lire `paramMap` manuellement — cohérent avec l'usage systématique de `input()`/signaux déjà
// retenu par tous les composants du projet (Phase 6, incrément 5, premier écran de ce projet paramétré par un
// segment de route).
//
// `withHashLocation()` : la webview Tauri ne sait pas résoudre un chemin profond (`PathLocationStrategy` par
// défaut) lors d'un rafraîchissement (F5) hors de la route racine — corrige R15-01 (Phase 15, recette du
// 2026-08-16), sans impact identifié sur le test de bout en bout Playwright (Phase 12, contre `ng serve`, qui ne
// dépend pas de la forme de l'URL) ni sur une éventuelle persistance d'URL (aucune dans l'application).
//
// `provideBrowserGlobalErrorListeners()` active les écouteurs globaux `window.onerror`/`unhandledrejection`, qui
// remontent au `ErrorHandler` configuré ci-dessous (`ErrorHandlerGlobal`, substitué au défaut d'Angular) au même
// titre que les exceptions non interceptées par la zone Angular (cf. `app.error-handler.ts`).
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: ErrorHandlerGlobal },
    provideRouter(routes, withComponentInputBinding(), withHashLocation()),
  ],
};
