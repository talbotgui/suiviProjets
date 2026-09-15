// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant transverse « Pastille en stase » (US-064, RG-064, plan_20 Partie E) : élément de présentation gris
// neutre dédié à la qualification « en stase » d'un projet, réutilisé à l'identique par la Synthèse des audits
// (via `SqmTableauDenseComponent`) et la Fiche projet. Volontairement distinct de `SqmBadgeComponent`, dont les
// couleurs sont des `Couleur` sémantiques calculées par le Moteur de jugement (vert/orange/rouge/bleu) — « en
// stase » n'est ni un jugement calculé, ni l'une de ces couleurs, mais une qualification purement organisationnelle
// saisie par l'utilisateur.
import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * Pastille grise neutre doublée du libellé explicite « en stase », réutilisée par tous les écrans restituant la
 * qualification `Projet.enStase` (RG-064). N'accepte aucune entrée : le libellé et l'apparence sont fixes.
 */
@Component({
  selector: 'app-pastille-en-stase',
  templateUrl: './pastille-en-stase.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './pastille-en-stase.component.scss',
})
export class SqmPastilleEnStaseComponent {}
