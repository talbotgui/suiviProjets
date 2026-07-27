// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet « Journal des modifications » de l'écran Paramétrage (US-027, Phase 7, incrément 3 ; RG-023) :
// consultation, en lecture seule, de l'intégralité du journal des modifications de paramétrage (`DonneesRacine.
// journal`, déjà chargé en mémoire par le Store — aucune nouvelle commande de la Façade n'est nécessaire à cet
// incrément, à la différence des incréments 1 et 2 de cette phase). Le périmètre par projet de ce même journal est
// déjà restitué, filtré, par `FicheProjetComponent` (Phase 6) ; cet onglet en restitue ici la vue transversale,
// toutes origines confondues (seuil, référentiel, qualification de membre, politique IA, ref auditée d'une
// source…).
import { Component, inject } from '@angular/core';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type { EntreeJournal } from '../../../services/avecetat/etat/types-donnees';

/**
 * Onglet « Journal des modifications » : restitution transversale, en lecture seule, du journal des modifications
 * de paramétrage (US-027, RG-023).
 */
@Component({
  selector: 'app-journal-parametrage',
  templateUrl: './journal-parametrage.component.html',
  styleUrl: './journal-parametrage.component.scss',
})
export class SqmJournalParametrageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);

  /**
   * Entrées du journal des modifications (RG-023) actuellement chargées, triées de la plus récente à la plus
   * ancienne (même convention de tri que le journal filtré par projet, `FicheProjetComponent`).
   * @returns Les entrées du journal, triées de la plus récente à la plus ancienne.
   */
  public entrees(): readonly EntreeJournal[] {
    const journal = this.donneesApplication.racine()?.journal ?? [];
    return [...journal].sort((a, b) => (a.horodatage < b.horodatage ? 1 : -1));
  }

  /**
   * Met en forme une valeur `unknown` du journal (`EntreeJournal.avant`/`apres`) en texte affichable, sans accès
   * non sûr à cette valeur.
   * @param valeur - Valeur à mettre en forme.
   * @returns Le texte affichable.
   */
  public formaterValeur(valeur: unknown): string {
    if (valeur === undefined) {
      return '—';
    }
    return JSON.stringify(valeur) ?? 'indéfini';
  }
}
