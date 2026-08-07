// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet Projets de l'écran Administration (US-007, Phase 3 ; US-024, Phase 4) : sélection d'un groupe, puis
// liste, création, modification, duplication et suppression de ses projets, ainsi que le contrôle de la politique
// IA de chaque projet (RG-014 à RG-016). Tout projet créé ou dupliqué porte toujours l'interdiction par défaut
// (RG-014) ; le contrôle Politique IA permet ensuite de l'autoriser explicitement, avec ressaisie du mot de passe
// du fichier à chaque bascule (RG-002), la commande native invoquée sauvegardant effectivement le fichier.
//
// Depuis C11-01 (Phase 11) : enchaînement guidé projet → sources (US-007). Le bouton « Créer et ajouter des
// sources » enregistre l'intention (`creationAvecSourcesDemandee`), la soumission normale du formulaire
// (`enregistrer`, seul point d'écriture de `creerProjet`) ouvre alors le mini-flux Sources plutôt que de
// simplement fermer le formulaire. Le mini-flux réutilise `SqmFormulaireSourceComponent` (`actionsVisibles` à
// `false`), déjà extrait de l'onglet Sources pour cet usage : les boutons « Ajouter une autre source »/« Terminer
// ce projet, projet suivant » l'invoquent via la variable de référence de gabarit `#formulaireSource`.
import { Component, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { SqmConfirmationSuppressionComponent } from '../../../composants/confirmation-suppression/confirmation-suppression.component';
import { SqmFormulaireSourceComponent } from '../../../composants/formulaire-source/formulaire-source.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type { DonneesProjet } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { Groupe, Projet } from '../../../services/avecetat/etat/types-donnees';

/**
 * Onglet Projets de l'écran Administration : sélection d'un groupe puis CRUD complet de ses projets, avec
 * duplication (US-007), contrôle de la politique IA (US-024) et enchaînement guidé vers l'ajout de sources
 * (US-007, C11-01). L'origine consignée au journal (RG-023) pour la bascule de politique IA est fixée côté cœur
 * natif (`Administration`), cette commande ne l'exposant pas en paramètre à la différence de `qualifierMembre`.
 */
@Component({
  selector: 'app-projets-admin',
  imports: [
    FormsModule,
    SqmConfirmationSuppressionComponent,
    SqmConfirmationMotDePasseComponent,
    SqmFormulaireSourceComponent,
  ],
  templateUrl: './projets-admin.component.html',
})
export class SqmProjetsAdminComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

  /**
   * Référence au formulaire de source du mini-flux guidé (C11-01), `undefined` tant qu'il n'est pas affiché
   * ({@link projetPourSourcesId} à `null`).
   */
  private readonly formulaireSource = viewChild<SqmFormulaireSourceComponent>('formulaireSource');

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
   * Identifiant du projet dont la bascule de politique IA attend la ressaisie du mot de passe du fichier
   * (RG-002), `null` si aucune bascule n'est en cours.
   */
  public projetPolitiqueIAEnAttenteId: string | null = null;

  /**
   * Indique qu'une bascule de politique IA est en cours, pour désactiver les actions concurrentes.
   */
  public politiqueIAEnCours = false;

  /**
   * Indique que la soumission en cours du formulaire de création doit, une fois le projet créé, ouvrir le
   * mini-flux guidé d'ajout de sources (C11-01), plutôt que simplement fermer le formulaire. Consommé et remis à
   * `false` par {@link enregistrer} dès la création effectuée.
   */
  public creationAvecSourcesDemandee = false;

  /**
   * Identifiant du projet pour lequel le mini-flux guidé d'ajout de sources (C11-01) est actuellement affiché,
   * `null` si aucun mini-flux n'est en cours.
   */
  public projetPourSourcesId: string | null = null;

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
    this.projetPourSourcesId = null;
  }

  /**
   * Projets du groupe actuellement sélectionné, tableau vide si aucun groupe n'est sélectionné.
   * @returns Le tableau des projets du groupe sélectionné.
   */
  public projets(): readonly Projet[] {
    return this.groupes().find((groupe) => groupe.id === this.groupeSelectionneId)?.projets ?? [];
  }

  /**
   * Ouvre le formulaire pour la création d'un nouveau projet au sein du groupe sélectionné. Referme, le cas
   * échéant, le mini-flux guidé d'ajout de sources en cours (C11-01).
   */
  public ouvrirCreation(): void {
    this.projetEnEditionId = null;
    this.nom = '';
    this.description = '';
    this.messageErreur = null;
    this.creationAvecSourcesDemandee = false;
    this.projetPourSourcesId = null;
    this.formulaireVisible = true;
  }

  /**
   * Ouvre le formulaire pour la création d'un nouveau projet, en enchaînant, une fois créé, sur le mini-flux
   * guidé d'ajout de sources (US-007, C11-01).
   */
  public ouvrirCreationAvecSources(): void {
    this.ouvrirCreation();
    this.creationAvecSourcesDemandee = true;
  }

  /**
   * Ouvre le formulaire pré-rempli pour la modification d'un projet existant. Referme, le cas échéant, le
   * mini-flux guidé d'ajout de sources en cours (C11-01).
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
    this.creationAvecSourcesDemandee = false;
    this.projetPourSourcesId = null;
    this.formulaireVisible = true;
  }

  /**
   * Referme le formulaire sans enregistrer.
   */
  public fermerFormulaire(): void {
    this.formulaireVisible = false;
  }

  /**
   * Valide puis enregistre le formulaire (création ou modification selon le contexte). En création, si
   * {@link ouvrirCreationAvecSources} a été utilisé pour ouvrir ce formulaire, ouvre le mini-flux guidé d'ajout de
   * sources (US-007, C11-01) plutôt que de simplement fermer le formulaire.
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
      this.formulaireVisible = false;
      return;
    }

    const projetId = this.donneesApplication.creerProjet(this.groupeSelectionneId, donnees);
    this.formulaireVisible = false;
    if (this.creationAvecSourcesDemandee) {
      this.creationAvecSourcesDemandee = false;
      this.projetPourSourcesId = projetId;
    }
  }

  /**
   * Invoque l'enregistrement de la source en cours de saisie dans le mini-flux guidé (C11-01) : la valeur émise
   * par la sortie `enregistree` du composant enfant déclenche {@link reinitialiserApresAjoutSource} pour permettre
   * la saisie de la source suivante, sans fermer le mini-flux.
   */
  public ajouterAutreSource(): void {
    this.formulaireSource()?.soumettre();
  }

  /**
   * Réinitialise le formulaire du mini-flux guidé après l'ajout réussi d'une source (C11-01), pour permettre la
   * saisie de la source suivante sans fermer le mini-flux. Invoqué par la sortie `enregistree` du composant
   * enfant.
   */
  public reinitialiserApresAjoutSource(): void {
    this.formulaireSource()?.reinitialiser();
  }

  /**
   * Termine le mini-flux guidé (C11-01) : enregistre la dernière source en cours de saisie si elle n'est pas
   * restée vide, puis rouvre directement le formulaire de création d'un nouveau projet en mode « avec sources »
   * (comme si {@link ouvrirCreationAvecSources} avait été recliqué), sans repasser par la liste des projets — pour
   * qu'un enchaînement de plusieurs dizaines de projets n'exige de recliquer « Créer et ajouter des sources »
   * qu'une seule fois (décision arbitraire confirmée explicitement par l'utilisateur lors de la relecture de
   * C11-01, préférée au réarmement en simple mode « Créer un projet »). Reste sur le mini-flux si une saisie en
   * cours est invalide (message d'erreur affiché par le composant enfant).
   */
  public terminerProjetPasserAuSuivant(): void {
    const formulaire = this.formulaireSource();
    if (!formulaire) {
      return;
    }
    if (!formulaire.estVide()) {
      const id = formulaire.enregistrer();
      if (id === null) {
        return;
      }
    }
    this.projetPourSourcesId = null;
    this.ouvrirCreationAvecSources();
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

  /**
   * Ouvre la ressaisie du mot de passe du fichier avant de basculer la politique IA d'un projet (US-024, RG-002).
   * @param projetId - Identifiant du projet concerné.
   */
  public demanderBasculePolitiqueIA(projetId: string): void {
    this.projetPolitiqueIAEnAttenteId = projetId;
  }

  /**
   * Annule la bascule de politique IA demandée.
   */
  public annulerBasculePolitiqueIA(): void {
    this.projetPolitiqueIAEnAttenteId = null;
  }

  /**
   * Bascule la politique IA du projet désigné par {@link demanderBasculePolitiqueIA}, après confirmation du mot
   * de passe (US-024, RG-014 à RG-016, RG-023).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerBasculePolitiqueIA(motDePasse: string): Promise<void> {
    const projetId = this.projetPolitiqueIAEnAttenteId;
    if (!this.groupeSelectionneId || !projetId) {
      this.projetPolitiqueIAEnAttenteId = null;
      return;
    }
    const projet = this.projets().find((candidat) => candidat.id === projetId);
    if (!projet) {
      this.projetPolitiqueIAEnAttenteId = null;
      return;
    }

    this.politiqueIAEnCours = true;
    const resultat = await this.donneesApplication.definirPolitiqueIA(
      this.groupeSelectionneId,
      projetId,
      !projet.iaAutorisee,
      motDePasse,
    );
    this.politiqueIAEnCours = false;
    this.projetPolitiqueIAEnAttenteId = null;

    if (resultat.type === 'echec') {
      this.notification.erreur(
        resultat.anomalie.type === 'motDePasseOuFichierInvalide'
          ? 'Mot de passe incorrect.'
          : 'Une erreur inattendue est survenue lors de la bascule de la politique IA.',
      );
    }
  }
}
