// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Administration (Phase 3 du plan de développement, US-006, US-007, US-008), à trois onglets conformément à
// `docs/02_documentation/08_arborescenceNavigation.md` (une seule ligne de la matrice écrans/US pour cet écran).
// Les sous-onglets « Membres connus » (sous Groupes) et « Politique IA » (sous Projets), également prévus par
// l'arborescence de navigation, sont différés à la Phase 4 (US-023, US-024) et n'apparaissent pas ici.
import { Component } from '@angular/core';
import { SqmGroupesAdminComponent } from './groupes/groupes-admin.component';
import { SqmProjetsAdminComponent } from './projets/projets-admin.component';
import { SqmSourcesAdminComponent } from './sources/sources-admin.component';

/**
 * Identifiant d'un onglet de l'écran Administration.
 */
type OngletAdministration = 'groupes' | 'projets' | 'sources';

/**
 * Écran Administration : coquille à trois onglets (Groupes, Projets, Sources), chacun porté par son propre
 * composant (US-006, US-007, US-008).
 */
@Component({
  selector: 'app-administration',
  imports: [SqmGroupesAdminComponent, SqmProjetsAdminComponent, SqmSourcesAdminComponent],
  templateUrl: './administration.component.html',
  styleUrl: './administration.component.scss',
})
export class SqmAdministrationComponent {
  /**
   * Onglet actuellement affiché.
   */
  public ongletActif: OngletAdministration = 'groupes';

  /**
   * Sélectionne l'onglet à afficher.
   * @param onglet - Onglet à activer.
   */
  public selectionnerOnglet(onglet: OngletAdministration): void {
    this.ongletActif = onglet;
  }
}
