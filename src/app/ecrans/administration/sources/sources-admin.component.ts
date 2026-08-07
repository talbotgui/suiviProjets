// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet Sources de l'écran Administration (US-008, Phase 3) : sélection d'un groupe puis d'un projet, ensuite
// liste et suppression de ses sources. La saisie (création/modification, cascade Type→Instance, autocomplétions)
// est déléguée à `SqmFormulaireSourceComponent` (`composants/formulaire-source/`) depuis C11-01 (Phase 11),
// extrait de ce composant pour être également consommé par le mini-flux guidé de `SqmProjetsAdminComponent` sans
// dupliquer cette logique.
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationSuppressionComponent } from '../../../composants/confirmation-suppression/confirmation-suppression.component';
import { SqmFormulaireSourceComponent } from '../../../composants/formulaire-source/formulaire-source.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type { Groupe, Projet, Source } from '../../../services/avecetat/etat/types-donnees';

/**
 * Onglet Sources de l'écran Administration : sélection d'un groupe puis d'un projet, liste et suppression de ses
 * sources ; création/modification déléguée à `SqmFormulaireSourceComponent` (US-008).
 */
@Component({
  selector: 'app-sources-admin',
  imports: [FormsModule, SqmConfirmationSuppressionComponent, SqmFormulaireSourceComponent],
  templateUrl: './sources-admin.component.html',
})
export class SqmSourcesAdminComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);

  /**
   * Identifiant du groupe actuellement sélectionné, `null` si aucun groupe n'existe encore.
   */
  public groupeSelectionneId: string | null = null;

  /**
   * Identifiant du projet actuellement sélectionné, `null` si aucun projet n'est sélectionné.
   */
  public projetSelectionneId: string | null = null;

  /**
   * Indique si le formulaire de création/modification est actuellement affiché.
   */
  public formulaireVisible = false;

  /**
   * Source en cours de modification, `null` en création.
   */
  public sourceEnEdition: Source | null = null;

  /**
   * Identifiant de la source dont la suppression est en cours de confirmation, `null` si aucune n'est en cours.
   */
  public sourceASupprimerId: string | null = null;

  /**
   * Groupes disponibles pour la sélection.
   * @returns Le tableau des groupes de la racine courante.
   */
  public groupes(): readonly Groupe[] {
    return this.donneesApplication.groupes();
  }

  /**
   * Sélectionne le groupe dont les projets sont proposés.
   * @param groupeId - Identifiant du groupe à sélectionner.
   */
  public selectionnerGroupe(groupeId: string): void {
    this.groupeSelectionneId = groupeId;
    this.projetSelectionneId = null;
    this.formulaireVisible = false;
  }

  /**
   * Projets du groupe actuellement sélectionné.
   * @returns Le tableau des projets du groupe sélectionné.
   */
  public projets(): readonly Projet[] {
    return this.groupes().find((groupe) => groupe.id === this.groupeSelectionneId)?.projets ?? [];
  }

  /**
   * Sélectionne le projet dont les sources sont affichées et administrées.
   * @param projetId - Identifiant du projet à sélectionner.
   */
  public selectionnerProjet(projetId: string): void {
    this.projetSelectionneId = projetId;
    this.formulaireVisible = false;
  }

  /**
   * Sources du projet actuellement sélectionné.
   * @returns Le tableau des sources du projet sélectionné.
   */
  public sources(): readonly Source[] {
    return this.projets().find((projet) => projet.id === this.projetSelectionneId)?.sources ?? [];
  }

  /**
   * Ouvre le formulaire pour la création d'une nouvelle source au sein du projet sélectionné.
   */
  public ouvrirCreation(): void {
    this.sourceEnEdition = null;
    this.formulaireVisible = true;
  }

  /**
   * Ouvre le formulaire pré-rempli pour la modification d'une source existante.
   * @param sourceId - Identifiant de la source à modifier.
   */
  public ouvrirEdition(sourceId: string): void {
    const source = this.sources().find((candidat) => candidat.id === sourceId);
    if (!source) {
      return;
    }
    this.sourceEnEdition = source;
    this.formulaireVisible = true;
  }

  /**
   * Referme le formulaire sans enregistrer.
   */
  public fermerFormulaire(): void {
    this.formulaireVisible = false;
  }

  /**
   * Demande la confirmation de suppression d'une source (US-008).
   * @param sourceId - Identifiant de la source à supprimer.
   */
  public demanderSuppression(sourceId: string): void {
    this.sourceASupprimerId = sourceId;
  }

  /**
   * Confirme la suppression de la source désignée par {@link demanderSuppression}.
   */
  public confirmerSuppression(): void {
    if (this.groupeSelectionneId && this.projetSelectionneId && this.sourceASupprimerId) {
      this.donneesApplication.supprimerSource(
        this.groupeSelectionneId,
        this.projetSelectionneId,
        this.sourceASupprimerId,
      );
    }
    this.sourceASupprimerId = null;
  }

  /**
   * Annule la suppression demandée.
   */
  public annulerSuppression(): void {
    this.sourceASupprimerId = null;
  }
}
