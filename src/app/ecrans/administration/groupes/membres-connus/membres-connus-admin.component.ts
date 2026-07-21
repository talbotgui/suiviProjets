// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Sous-onglet Membres connus de l'onglet Groupes de l'écran Administration (US-022, US-023, Phase 4) : CRUD des
// règles d'identification des membres d'un groupe sélectionné (RG-006 à RG-008, RG-012). À la différence des
// autres CRUD de l'écran Administration (Phase 3, en mémoire uniquement), chaque mutation invoque ici directement
// une commande native qui sauvegarde effectivement le fichier (RG-002 : le mot de passe est donc redemandé à
// chaque enregistrement ou suppression, cf. `SqmConfirmationMotDePasseComponent`).
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationMotDePasseComponent } from '../../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { SqmConfirmationSuppressionComponent } from '../../../../composants/confirmation-suppression/confirmation-suppression.component';
import type { DonneesMembreConnu } from '../../../../services/avecetat/etat/donnees-application.service';
import { DonneesApplicationService } from '../../../../services/avecetat/etat/donnees-application.service';
import type {
  ErreurAdministration,
  Groupe,
  MembreConnu,
} from '../../../../services/avecetat/etat/types-donnees';
import { StatutMembre, TypeCritereMembre } from '../../../../services/avecetat/etat/types-donnees';

/**
 * Origine consignée au journal des modifications (RG-023) pour toute mutation issue de ce sous-onglet.
 */
const ORIGINE_ADMINISTRATION = 'Administration';

/**
 * Sous-onglet Membres connus : sélection d'un groupe, puis CRUD complet de ses règles de membres connus (US-022,
 * US-023), avec ressaisie du mot de passe du fichier à chaque enregistrement ou suppression (RG-002) et
 * signalement non bloquant des conflits de règles (RG-008).
 */
@Component({
  selector: 'app-membres-connus-admin',
  imports: [FormsModule, SqmConfirmationSuppressionComponent, SqmConfirmationMotDePasseComponent],
  templateUrl: './membres-connus-admin.component.html',
  styleUrl: './membres-connus-admin.component.scss',
})
export class SqmMembresConnusAdminComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);

  /**
   * Types de critère proposés au formulaire.
   */
  public readonly typesCritere: readonly TypeCritereMembre[] = [
    TypeCritereMembre.Username,
    TypeCritereMembre.Email,
    TypeCritereMembre.DomaineEmail,
  ];

  /**
   * Statuts proposés au formulaire.
   */
  public readonly statuts: readonly StatutMembre[] = [
    StatutMembre.Interne,
    StatutMembre.Client,
    StatutMembre.Partenaire,
  ];

  /**
   * Identifiant du groupe actuellement sélectionné, `null` si aucun groupe n'existe encore.
   */
  public groupeSelectionneId: string | null = null;

  /**
   * Indique si le formulaire de création/modification est actuellement affiché.
   */
  public formulaireVisible = false;

  /**
   * Identifiant de la règle en cours de modification, `null` en création.
   */
  public membreEnEditionId: string | null = null;

  /**
   * Critère saisi dans le formulaire.
   */
  public critere = '';

  /**
   * Type de critère saisi dans le formulaire.
   */
  public typeCritere: TypeCritereMembre = TypeCritereMembre.Username;

  /**
   * Statut saisi dans le formulaire.
   */
  public statut: StatutMembre = StatutMembre.Interne;

  /**
   * Libellé saisi dans le formulaire.
   */
  public libelle = '';

  /**
   * Alias courriel saisi dans le formulaire.
   */
  public aliasEmail = '';

  /**
   * Message d'erreur de validation ou de rejet par le cœur natif, `null` si aucune erreur en cours.
   */
  public messageErreur: string | null = null;

  /**
   * Identifiant de la règle dont la suppression est en cours de confirmation, `null` si aucune n'est en cours.
   */
  public membreASupprimerId: string | null = null;

  /**
   * Action en attente de ressaisie du mot de passe (RG-002), `null` si aucune boîte de ressaisie n'est affichée.
   */
  public actionEnAttenteMotDePasse: 'enregistrement' | 'suppression' | null = null;

  /**
   * Identifiants des règles de membres connus du groupe sélectionné actuellement en conflit (RG-008), signalement
   * non bloquant recalculé après chaque enregistrement réussi.
   */
  public membresEnConflitIds: readonly string[] = [];

  /**
   * Indique qu'un appel à une commande native est en cours, pour désactiver les actions concurrentes.
   */
  public enCours = false;

  /**
   * Groupes disponibles pour la sélection.
   * @returns Le tableau des groupes de la racine courante.
   */
  public groupes(): readonly Groupe[] {
    return this.donneesApplication.groupes();
  }

  /**
   * Sélectionne le groupe dont les membres connus sont affichés et administrés.
   * @param groupeId - Identifiant du groupe à sélectionner.
   */
  public selectionnerGroupe(groupeId: string): void {
    this.groupeSelectionneId = groupeId;
    this.formulaireVisible = false;
    this.membresEnConflitIds = [];
  }

  /**
   * Règles de membres connus du groupe actuellement sélectionné, tableau vide si aucun groupe n'est sélectionné.
   * @returns Le tableau des règles du groupe sélectionné.
   */
  public membresConnus(): readonly MembreConnu[] {
    return (
      this.groupes().find((groupe) => groupe.id === this.groupeSelectionneId)?.membresConnus ?? []
    );
  }

  /**
   * Indique si la règle désignée fait actuellement partie d'un conflit détecté (RG-008).
   * @param membreId - Identifiant de la règle à vérifier.
   * @returns `true` si cette règle est en conflit avec une autre règle du même groupe.
   */
  public estEnConflit(membreId: string): boolean {
    return this.membresEnConflitIds.includes(membreId);
  }

  /**
   * Ouvre le formulaire pour la création d'une nouvelle règle au sein du groupe sélectionné.
   */
  public ouvrirCreation(): void {
    this.membreEnEditionId = null;
    this.critere = '';
    this.typeCritere = TypeCritereMembre.Username;
    this.statut = StatutMembre.Interne;
    this.libelle = '';
    this.aliasEmail = '';
    this.messageErreur = null;
    this.formulaireVisible = true;
  }

  /**
   * Ouvre le formulaire pré-rempli pour la modification d'une règle existante.
   * @param membreId - Identifiant de la règle à modifier.
   */
  public ouvrirEdition(membreId: string): void {
    const regle = this.membresConnus().find((candidate) => candidate.id === membreId);
    if (!regle) {
      return;
    }
    this.membreEnEditionId = regle.id;
    this.critere = regle.critere;
    this.typeCritere = regle.typeCritere;
    this.statut = regle.statut;
    this.libelle = regle.libelle ?? '';
    this.aliasEmail = regle.aliasEmail ?? '';
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
   * Valide le formulaire puis, si valide, ouvre la ressaisie du mot de passe avant l'enregistrement effectif
   * (RG-002).
   */
  public demanderEnregistrement(): void {
    if (this.critere.trim().length === 0) {
      this.messageErreur = 'Le critère est obligatoire.';
      return;
    }
    this.messageErreur = null;
    this.actionEnAttenteMotDePasse = 'enregistrement';
  }

  /**
   * Enregistre la règle après confirmation du mot de passe (US-022, US-023, RG-002).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrement(motDePasse: string): Promise<void> {
    if (!this.groupeSelectionneId) {
      this.actionEnAttenteMotDePasse = null;
      return;
    }
    const donnees: DonneesMembreConnu = {
      membreId: this.membreEnEditionId ?? undefined,
      critere: this.critere.trim(),
      typeCritere: this.typeCritere,
      statut: this.statut,
      libelle: this.libelle.trim().length > 0 ? this.libelle.trim() : undefined,
      aliasEmail: this.aliasEmail.trim().length > 0 ? this.aliasEmail.trim() : undefined,
    };

    this.enCours = true;
    const resultat = await this.donneesApplication.qualifierMembre(
      this.groupeSelectionneId,
      donnees,
      ORIGINE_ADMINISTRATION,
      motDePasse,
    );
    this.enCours = false;
    this.actionEnAttenteMotDePasse = null;

    switch (resultat.type) {
      case 'succes':
        this.membresEnConflitIds = resultat.membresEnConflit;
        this.formulaireVisible = false;
        break;
      case 'echec':
        this.messageErreur = this.libelleAnomalie(resultat.anomalie);
        break;
    }
  }

  /**
   * Demande la confirmation de suppression d'une règle.
   * @param membreId - Identifiant de la règle à supprimer.
   */
  public demanderSuppression(membreId: string): void {
    this.membreASupprimerId = membreId;
  }

  /**
   * Confirme la suppression désignée par {@link demanderSuppression} : ouvre la ressaisie du mot de passe avant
   * la suppression effective (RG-002).
   */
  public confirmerSuppression(): void {
    this.actionEnAttenteMotDePasse = 'suppression';
  }

  /**
   * Annule la suppression demandée.
   */
  public annulerSuppression(): void {
    this.membreASupprimerId = null;
  }

  /**
   * Supprime la règle après confirmation du mot de passe (US-023, RG-002).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerSuppressionMotDePasse(motDePasse: string): Promise<void> {
    if (!this.groupeSelectionneId || !this.membreASupprimerId) {
      this.actionEnAttenteMotDePasse = null;
      return;
    }

    this.enCours = true;
    const resultat = await this.donneesApplication.supprimerMembreConnu(
      this.groupeSelectionneId,
      this.membreASupprimerId,
      ORIGINE_ADMINISTRATION,
      motDePasse,
    );
    this.enCours = false;
    this.actionEnAttenteMotDePasse = null;
    this.membreASupprimerId = null;

    if (resultat.type === 'echec') {
      this.messageErreur = this.libelleAnomalie(resultat.anomalie);
    }
  }

  /**
   * Annule la ressaisie du mot de passe en cours, quelle que soit l'action qui l'avait demandée.
   */
  public annulerMotDePasse(): void {
    this.actionEnAttenteMotDePasse = null;
  }

  /**
   * Traduit une anomalie typée en message lisible par l'utilisateur, sans détail technique sensible.
   * @param anomalie - Anomalie remontée par la commande native.
   * @returns Le message à afficher.
   */
  private libelleAnomalie(anomalie: ErreurAdministration): string {
    switch (anomalie.type) {
      case 'doublonUsernameMembreConnu':
        return 'Ce username est déjà utilisé par une autre règle de ce groupe.';
      case 'groupeIntrouvable':
        return 'Le groupe sélectionné est introuvable.';
      case 'membreIntrouvable':
        return 'Cette règle est introuvable : elle a peut-être déjà été supprimée.';
      case 'fichierVerrouille':
        return 'Le fichier de données est verrouillé par un autre processus.';
      case 'motDePasseOuFichierInvalide':
        return 'Mot de passe incorrect.';
      case 'projetIntrouvable':
      case 'fichierIntrouvable':
      case 'formatNonReconnu':
      case 'versionSchemaSuperieure':
      case 'aucunFichierOuvert':
      case 'credentialInvalide':
      case 'erreurInterne':
        return "Une erreur inattendue est survenue lors de l'enregistrement.";
    }
  }
}
