// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet Projets de l'écran Administration (US-007, Phase 3) : sélection d'un groupe, puis liste, création,
// modification, duplication et suppression de ses projets. La politique IA (également portée par `Projet`) est
// différée à la Phase 4 (US-024) : tout projet créé ou dupliqué ici porte l'interdiction par défaut (RG-014),
// non modifiable depuis cet onglet.
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationSuppressionComponent } from '../../../composants/confirmation-suppression/confirmation-suppression.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type { DonneesProjet } from '../../../services/avecetat/etat/donnees-application.service';
import type { Groupe, Projet } from '../../../services/avecetat/etat/types-donnees';

/**
 * Onglet Projets de l'écran Administration : sélection d'un groupe puis CRUD complet de ses projets, avec
 * duplication (US-007).
 */
@Component({
  selector: 'app-projets-admin',
  imports: [FormsModule, SqmConfirmationSuppressionComponent],
  templateUrl: './projets-admin.component.html',
  styleUrl: './projets-admin.component.scss',
})
export class SqmProjetsAdminComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);

  /**
   * Identifiant du groupe actuellement sélectionné, `null` si aucun groupe n'existe encore.
   */
  public groupeSelectionneId: string | null = null;

  /**
   * Indique si le formulaire de création/modification est actuellement affiché.
   */
  public formulaireVisible = false;

  /**
   * Identifiant du projet en cours de modification, `null` en création.
   */
  public projetEnEditionId: string | null = null;

  /**
   * Nom saisi dans le formulaire.
   */
  public nom = '';

  /**
   * Description saisie dans le formulaire.
   */
  public description = '';

  /**
   * Message d'erreur de validation du formulaire, `null` si aucune erreur en cours.
   */
  public messageErreur: string | null = null;

  /**
   * Identifiant du projet dont la suppression est en cours de confirmation, `null` si aucune n'est en cours.
   */
  public projetASupprimerId: string | null = null;

  /**
   * Groupes disponibles pour la sélection.
   * @returns Le tableau des groupes de la racine courante.
   */
  public groupes(): readonly Groupe[] {
    return this.donneesApplication.groupes();
  }

  /**
   * Sélectionne le groupe dont les projets sont affichés et administrés.
   * @param groupeId - Identifiant du groupe à sélectionner.
   */
  public selectionnerGroupe(groupeId: string): void {
    this.groupeSelectionneId = groupeId;
    this.formulaireVisible = false;
  }

  /**
   * Projets du groupe actuellement sélectionné, tableau vide si aucun groupe n'est sélectionné.
   * @returns Le tableau des projets du groupe sélectionné.
   */
  public projets(): readonly Projet[] {
    return this.groupes().find((groupe) => groupe.id === this.groupeSelectionneId)?.projets ?? [];
  }

  /**
   * Ouvre le formulaire pour la création d'un nouveau projet au sein du groupe sélectionné.
   */
  public ouvrirCreation(): void {
    this.projetEnEditionId = null;
    this.nom = '';
    this.description = '';
    this.messageErreur = null;
    this.formulaireVisible = true;
  }

  /**
   * Ouvre le formulaire pré-rempli pour la modification d'un projet existant.
   * @param projetId - Identifiant du projet à modifier.
   */
  public ouvrirEdition(projetId: string): void {
    const projet = this.projets().find((candidat) => candidat.id === projetId);
    if (!projet) {
      return;
    }
    this.projetEnEditionId = projet.id;
    this.nom = projet.nom;
    this.description = projet.description;
    this.messageErreur = null;
    this.formulaireVisible = true;
  }

  /**
   * Referme le formulaire sans enregistrer.
   */
  public fermerFormulaire(): void {
    this.formulaireVisible = false;
  }

  /**
   * Valide puis enregistre le formulaire (création ou modification selon le contexte).
   */
  public enregistrer(): void {
    if (!this.groupeSelectionneId) {
      return;
    }
    if (this.nom.trim().length === 0) {
      this.messageErreur = 'Le nom du projet est obligatoire.';
      return;
    }

    const donnees: DonneesProjet = { nom: this.nom.trim(), description: this.description.trim() };

    if (this.projetEnEditionId) {
      this.donneesApplication.modifierProjet(
        this.groupeSelectionneId,
        this.projetEnEditionId,
        donnees,
      );
    } else {
      this.donneesApplication.creerProjet(this.groupeSelectionneId, donnees);
    }
    this.formulaireVisible = false;
  }

  /**
   * Duplique un projet existant au sein du même groupe (US-007).
   * @param projetId - Identifiant du projet à dupliquer.
   */
  public dupliquer(projetId: string): void {
    if (!this.groupeSelectionneId) {
      return;
    }
    this.donneesApplication.dupliquerProjet(this.groupeSelectionneId, projetId);
  }

  /**
   * Demande la confirmation de suppression d'un projet (US-007 : suppression confirmée).
   * @param projetId - Identifiant du projet à supprimer.
   */
  public demanderSuppression(projetId: string): void {
    this.projetASupprimerId = projetId;
  }

  /**
   * Confirme la suppression du projet désigné par {@link demanderSuppression}.
   */
  public confirmerSuppression(): void {
    if (this.groupeSelectionneId && this.projetASupprimerId) {
      this.donneesApplication.supprimerProjet(this.groupeSelectionneId, this.projetASupprimerId);
    }
    this.projetASupprimerId = null;
  }

  /**
   * Annule la suppression demandée.
   */
  public annulerSuppression(): void {
    this.projetASupprimerId = null;
  }
}
