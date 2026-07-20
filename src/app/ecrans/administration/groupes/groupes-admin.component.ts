// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet Groupes de l'écran Administration (US-006, Phase 3) : liste, création, modification et suppression des
// groupes, avec gestion inline de leurs instances GitLab/Sonar. La gestion des membres connus et des annotations
// de groupe (également portées par `Groupe`) est différée à la Phase 4 (US-023) et n'est pas traitée ici.
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationSuppressionComponent } from '../../../composants/confirmation-suppression/confirmation-suppression.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type { DonneesGroupe } from '../../../services/avecetat/etat/donnees-application.service';
import { TypeInstance } from '../../../services/sansetat/commandes/types-facade';
import type { Instance } from '../../../services/sansetat/commandes/types-facade';
import type { Groupe } from '../../../services/avecetat/etat/types-donnees';

/**
 * Instance en cours d'édition au sein du formulaire de groupe, dotée d'un identifiant local stable (généré à
 * l'ajout) permettant de l'associer à sa ligne de formulaire indépendamment de son identifiant définitif.
 */
interface InstanceEnEdition extends Instance {
  readonly id: string;
}

/**
 * Onglet Groupes de l'écran Administration : CRUD complet des groupes, y compris leurs instances GitLab/Sonar
 * (US-006).
 */
@Component({
  selector: 'app-groupes-admin',
  imports: [FormsModule, SqmConfirmationSuppressionComponent],
  templateUrl: './groupes-admin.component.html',
  styleUrl: './groupes-admin.component.scss',
})
export class SqmGroupesAdminComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);

  /**
   * Types d'instance proposés au formulaire (GitLab, Sonar).
   */
  public readonly typesInstance: readonly TypeInstance[] = [
    TypeInstance.Gitlab,
    TypeInstance.Sonar,
  ];

  /**
   * Indique si le formulaire de création/modification est actuellement affiché.
   */
  public formulaireVisible = false;

  /**
   * Identifiant du groupe en cours de modification, `null` en création.
   */
  public groupeEnEditionId: string | null = null;

  /**
   * Nom saisi dans le formulaire.
   */
  public nom = '';

  /**
   * Description saisie dans le formulaire.
   */
  public description = '';

  /**
   * Instances actuellement saisies dans le formulaire.
   */
  public instances: InstanceEnEdition[] = [];

  /**
   * Message d'erreur de validation du formulaire, `null` si aucune erreur en cours.
   */
  public messageErreur: string | null = null;

  /**
   * Identifiant du groupe dont la suppression est en cours de confirmation, `null` si aucune n'est en cours.
   */
  public groupeASupprimerId: string | null = null;

  /**
   * Groupes actuellement chargés (US-006).
   * @returns Le tableau des groupes de la racine courante.
   */
  public groupes(): readonly Groupe[] {
    return this.donneesApplication.groupes();
  }

  /**
   * Ouvre le formulaire pour la création d'un nouveau groupe.
   */
  public ouvrirCreation(): void {
    this.groupeEnEditionId = null;
    this.nom = '';
    this.description = '';
    this.instances = [];
    this.messageErreur = null;
    this.formulaireVisible = true;
  }

  /**
   * Ouvre le formulaire pré-rempli pour la modification d'un groupe existant.
   * @param groupeId - Identifiant du groupe à modifier.
   */
  public ouvrirEdition(groupeId: string): void {
    const groupe = this.groupes().find((candidat) => candidat.id === groupeId);
    if (!groupe) {
      return;
    }
    this.groupeEnEditionId = groupe.id;
    this.nom = groupe.nom;
    this.description = groupe.description;
    this.instances = groupe.instances.map((instance) => ({ ...instance }));
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
   * Ajoute une instance vide à la liste en cours d'édition.
   */
  public ajouterInstance(): void {
    this.instances = [
      ...this.instances,
      { id: crypto.randomUUID(), type: TypeInstance.Gitlab, nom: '', urlBase: '' },
    ];
  }

  /**
   * Retire une instance de la liste en cours d'édition.
   * @param instanceId - Identifiant local de l'instance à retirer.
   */
  public supprimerInstance(instanceId: string): void {
    this.instances = this.instances.filter((instance) => instance.id !== instanceId);
  }

  /**
   * Valide puis enregistre le formulaire (création ou modification selon le contexte).
   */
  public enregistrer(): void {
    if (this.nom.trim().length === 0) {
      this.messageErreur = 'Le nom du groupe est obligatoire.';
      return;
    }
    if (
      this.instances.some(
        (instance) => instance.nom.trim().length === 0 || instance.urlBase.trim().length === 0,
      )
    ) {
      this.messageErreur = 'Chaque instance doit porter un nom et une URL.';
      return;
    }

    const donnees: DonneesGroupe = {
      nom: this.nom.trim(),
      description: this.description.trim(),
      instances: this.instances.map(({ type, nom, urlBase, id }) => ({ type, nom, urlBase, id })),
    };

    if (this.groupeEnEditionId) {
      this.donneesApplication.modifierGroupe(this.groupeEnEditionId, donnees);
    } else {
      this.donneesApplication.creerGroupe(donnees);
    }
    this.formulaireVisible = false;
  }

  /**
   * Demande la confirmation de suppression d'un groupe (US-006 : rappel de la perte de l'historique d'audits
   * associé, porté par {@link SqmConfirmationSuppressionComponent}).
   * @param groupeId - Identifiant du groupe à supprimer.
   */
  public demanderSuppression(groupeId: string): void {
    this.groupeASupprimerId = groupeId;
  }

  /**
   * Confirme la suppression du groupe désigné par {@link demanderSuppression}.
   */
  public confirmerSuppression(): void {
    if (this.groupeASupprimerId) {
      this.donneesApplication.supprimerGroupe(this.groupeASupprimerId);
    }
    this.groupeASupprimerId = null;
  }

  /**
   * Annule la suppression demandée.
   */
  public annulerSuppression(): void {
    this.groupeASupprimerId = null;
  }
}
