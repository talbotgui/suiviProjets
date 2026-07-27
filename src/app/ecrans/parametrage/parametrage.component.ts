// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Paramétrage (Phase 7, incréments 2 à 4), à quatre onglets conformément à
// `docs/02_documentation/08_arborescenceNavigation.md` (une seule ligne de la matrice écrans/US pour cet écran) :
// Seuils et référentiels (US-033), Journal des modifications (US-027), Purge des audits (US-025) et Export/Import
// de configuration (US-028 à US-030, Phase 9). Les trois premiers onglets portent un contenu réel ; le dernier
// affiche un contenu de repli, sur le même principe que les entrées de sidebar « à venir » déjà en place ailleurs
// dans le shell (`shell.component.html`). Coquille à onglets sur le patron exact de `SqmAdministrationComponent`
// (Phase 3).
import { Component } from '@angular/core';
import { SqmJournalParametrageComponent } from './journal/journal-parametrage.component';
import { SqmPurgeParametrageComponent } from './purge/purge-parametrage.component';
import { SqmReferentielsParametrageComponent } from './referentiels/referentiels-parametrage.component';
import { SqmSeuilsParametrageComponent } from './seuils/seuils-parametrage.component';

/**
 * Identifiant d'un onglet de l'écran Paramétrage.
 */
type OngletParametrage = 'seuilsReferentiels' | 'journal' | 'purge' | 'exportImport';

/**
 * Écran Paramétrage : coquille à quatre onglets (US-033, US-027, US-025, US-028 à US-030), dont les trois premiers
 * sont construits à ce stade (incréments 2 à 4).
 */
@Component({
  selector: 'app-parametrage',
  imports: [
    SqmSeuilsParametrageComponent,
    SqmReferentielsParametrageComponent,
    SqmJournalParametrageComponent,
    SqmPurgeParametrageComponent,
  ],
  templateUrl: './parametrage.component.html',
  styleUrl: './parametrage.component.scss',
})
export class SqmParametrageComponent {
  /**
   * Onglet actuellement affiché.
   */
  public ongletActif: OngletParametrage = 'seuilsReferentiels';

  /**
   * Sélectionne l'onglet à afficher.
   * @param onglet - Onglet à activer.
   */
  public selectionnerOnglet(onglet: OngletParametrage): void {
    this.ongletActif = onglet;
  }
}
