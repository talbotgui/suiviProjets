// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Paramétrage (Phase 7, incréments 2 à 4 ; Phase 9, incrément 3), à quatre onglets conformément à
// `docs/02_documentation/08_arborescenceNavigation.md` (une seule ligne de la matrice écrans/US pour cet écran) :
// Seuils et référentiels (US-033), Journal des modifications (US-027), Purge des audits (US-025) et Export/Import
// de configuration (US-029, US-030, RG-028, RG-029, Phase 9). Les quatre onglets portent désormais un contenu réel
// depuis la Phase 9, incrément 3 (le dernier affichait jusque-là un contenu de repli, sur le même principe que les
// entrées de sidebar « à venir » du shell). Coquille à onglets sur le patron exact de `SqmAdministrationComponent`
// (Phase 3).
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SqmExportImportParametrageComponent } from './export-import/export-import-parametrage.component';
import { SqmJournalParametrageComponent } from './journal/journal-parametrage.component';
import { SqmPurgeParametrageComponent } from './purge/purge-parametrage.component';
import { SqmReferentielsParametrageComponent } from './referentiels/referentiels-parametrage.component';
import { SqmReglagesApplicatifsParametrageComponent } from './reglages-applicatifs/reglages-applicatifs-parametrage.component';
import { SqmSeuilsParametrageComponent } from './seuils/seuils-parametrage.component';

/**
 * Identifiant d'un onglet de l'écran Paramétrage.
 */
type OngletParametrage = 'seuilsReferentiels' | 'journal' | 'purge' | 'exportImport';

/**
 * Écran Paramétrage : coquille à quatre onglets (US-033, US-027, US-025, US-028 à US-030), tous construits depuis
 * la Phase 9, incrément 3.
 */
@Component({
  selector: 'app-parametrage',
  imports: [
    SqmSeuilsParametrageComponent,
    SqmReferentielsParametrageComponent,
    SqmReglagesApplicatifsParametrageComponent,
    SqmJournalParametrageComponent,
    SqmPurgeParametrageComponent,
    SqmExportImportParametrageComponent,
  ],
  templateUrl: './parametrage.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
