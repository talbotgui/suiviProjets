// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet Sources de l'écran Administration (US-008, Phase 3) : sélection d'un groupe puis d'un projet, ensuite
// liste, création, modification et suppression de ses sources, avec autocomplétion des branches pour la ref
// auditée d'une source GitLab (`FacadeCommandesService.interrogerBranches`, débouncée). L'absence de ref auditée
// est affichée explicitement comme « branche par défaut du dépôt », sans tenter de résoudre la valeur effective
// (nécessite un audit réel, hors périmètre de cette phase, cf. `docs/02_documentation/12_modeleDonnees.md#invariants-et-règles-de-cohérence`).
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, from, of } from 'rxjs';
import type { Observable } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { SqmConfirmationSuppressionComponent } from '../../../composants/confirmation-suppression/confirmation-suppression.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type { DonneesSource } from '../../../services/avecetat/etat/donnees-application.service';
import type { Groupe, Projet, Source } from '../../../services/avecetat/etat/types-donnees';
import { TypeSource } from '../../../services/avecetat/etat/types-donnees';
import { FacadeCommandesService } from '../../../services/sansetat/commandes/facade-commandes.service';
import { TypeInstance } from '../../../services/sansetat/commandes/types-facade';
import type {
  Instance,
  ResultatInterrogationBranches,
} from '../../../services/sansetat/commandes/types-facade';

/**
 * Délai de silence, en millisecondes, avant qu'une saisie dans le champ de ref auditée ne déclenche
 * l'interrogation des branches (US-008), pour éviter un appel réseau à chaque frappe.
 */
const DELAI_DEBOUNCE_RECHERCHE_MS = 300;

/**
 * Onglet Sources de l'écran Administration : sélection d'un groupe puis d'un projet, et CRUD complet de ses
 * sources avec autocomplétion des branches (US-008).
 */
@Component({
  selector: 'app-sources-admin',
  imports: [FormsModule, SqmConfirmationSuppressionComponent],
  templateUrl: './sources-admin.component.html',
  styleUrl: './sources-admin.component.scss',
})
export class SqmSourcesAdminComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly facadeCommandes: FacadeCommandesService = inject(FacadeCommandesService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly rechercheBranche$: Subject<string> = new Subject<string>();

  /**
   * Types de source proposés au formulaire (dépôt GitLab, projet Sonar).
   */
  public readonly typesSource: readonly TypeSource[] = [
    TypeSource.DepotGitlab,
    TypeSource.ProjetSonar,
  ];

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
   * Identifiant de la source en cours de modification, `null` en création.
   */
  public sourceEnEditionId: string | null = null;

  /**
   * Identifiant d'instance saisi dans le formulaire.
   */
  public instanceId = '';

  /**
   * Type de source saisi dans le formulaire.
   */
  public type: TypeSource = TypeSource.DepotGitlab;

  /**
   * Identifiant externe (identifiant de projet côté instance) saisi dans le formulaire.
   */
  public idExterne = '';

  /**
   * Ref auditée saisie dans le formulaire, chaîne vide si absente (branche par défaut du dépôt).
   */
  public refAuditee = '';

  /**
   * Message d'erreur de validation du formulaire, `null` si aucune erreur en cours.
   */
  public messageErreur: string | null = null;

  /**
   * Suggestions de branches actuellement proposées par l'autocomplétion (US-008).
   */
  public suggestionsBranches: readonly string[] = [];

  /**
   * Indique qu'aucun credential n'est actuellement mémorisé pour l'instance sélectionnée : l'autocomplétion des
   * branches n'est pas disponible, l'utilisateur doit d'abord saisir un credential (Gestion des credentials).
   */
  public credentialAbsent = false;

  /**
   * Identifiant de la source dont la suppression est en cours de confirmation, `null` si aucune n'est en cours.
   */
  public sourceASupprimerId: string | null = null;

  public constructor() {
    this.rechercheBranche$
      .pipe(
        debounceTime(DELAI_DEBOUNCE_RECHERCHE_MS),
        distinctUntilChanged(),
        switchMap((terme) => this.interrogerBranchesPourInstance(terme)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultat) => {
        this.appliquerResultatBranches(resultat);
      });
  }

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
   * Instances du groupe sélectionné compatibles avec le type de source actuellement saisi dans le formulaire
   * (une source GitLab ne peut référencer qu'une instance GitLab, une source Sonar qu'une instance Sonar).
   * @returns Le tableau des instances compatibles.
   */
  public instancesCompatibles(): readonly Instance[] {
    const groupe = this.groupes().find((candidat) => candidat.id === this.groupeSelectionneId);
    if (!groupe) {
      return [];
    }
    const typeInstanceAttendu =
      this.type === TypeSource.DepotGitlab ? TypeInstance.Gitlab : TypeInstance.Sonar;
    return groupe.instances.filter((instance) => instance.type === typeInstanceAttendu);
  }

  /**
   * Ouvre le formulaire pour la création d'une nouvelle source au sein du projet sélectionné.
   */
  public ouvrirCreation(): void {
    this.sourceEnEditionId = null;
    this.instanceId = '';
    this.type = TypeSource.DepotGitlab;
    this.idExterne = '';
    this.refAuditee = '';
    this.messageErreur = null;
    this.suggestionsBranches = [];
    this.credentialAbsent = false;
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
    this.sourceEnEditionId = source.id;
    this.instanceId = source.instanceId;
    this.type = source.type;
    this.idExterne = source.idExterne;
    this.refAuditee = source.refAuditee ?? '';
    this.messageErreur = null;
    this.suggestionsBranches = [];
    this.credentialAbsent = false;
    this.formulaireVisible = true;
  }

  /**
   * Referme le formulaire sans enregistrer.
   */
  public fermerFormulaire(): void {
    this.formulaireVisible = false;
  }

  /**
   * Change le type de source saisi dans le formulaire, en réinitialisant l'instance sélectionnée (une instance
   * compatible avec l'ancien type peut ne plus l'être avec le nouveau).
   * @param nouveauType - Type de source désormais sélectionné.
   */
  public changerType(nouveauType: TypeSource): void {
    this.type = nouveauType;
    this.instanceId = '';
    this.suggestionsBranches = [];
  }

  /**
   * Déclenche (de façon débouncée) l'autocomplétion des branches pour le terme actuellement saisi dans le champ
   * de ref auditée (US-008). Sans effet pour une source Sonar, qui n'a pas de branches.
   */
  public rechercherBranches(): void {
    if (this.type === TypeSource.ProjetSonar) {
      return;
    }
    this.rechercheBranche$.next(this.refAuditee);
  }

  /**
   * Valide puis enregistre le formulaire (création ou modification selon le contexte).
   */
  public enregistrer(): void {
    if (!this.projetSelectionneId || !this.groupeSelectionneId) {
      return;
    }
    if (this.instanceId.length === 0) {
      this.messageErreur = 'Une instance doit être sélectionnée.';
      return;
    }
    if (this.idExterne.trim().length === 0) {
      this.messageErreur = "L'identifiant externe est obligatoire.";
      return;
    }

    const donnees: DonneesSource = {
      instanceId: this.instanceId,
      type: this.type,
      idExterne: this.idExterne.trim(),
      refAuditee: this.refAuditee.trim().length > 0 ? this.refAuditee.trim() : undefined,
    };

    if (this.sourceEnEditionId) {
      this.donneesApplication.modifierSource(
        this.groupeSelectionneId,
        this.projetSelectionneId,
        this.sourceEnEditionId,
        donnees,
      );
    } else {
      this.donneesApplication.creerSource(
        this.groupeSelectionneId,
        this.projetSelectionneId,
        donnees,
      );
    }
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

  /**
   * Interroge les branches de l'instance actuellement sélectionnée dans le formulaire pour le terme donné.
   * @param terme - Terme de recherche saisi par l'utilisateur.
   * @returns Un flux résolvant le résultat de l'interrogation, ou `null` si aucune instance n'est sélectionnée.
   */
  private interrogerBranchesPourInstance(
    terme: string,
  ): Observable<ResultatInterrogationBranches | null> {
    const instance = this.instancesCompatibles().find(
      (candidat) => candidat.id === this.instanceId,
    );
    if (!instance || this.idExterne.trim().length === 0) {
      return of(null);
    }
    return from(
      this.facadeCommandes.interrogerBranches(instance, this.idExterne.trim(), terme),
    ).pipe(catchError(() => of(null)));
  }

  /**
   * Applique le résultat d'une interrogation de branches à l'état du formulaire.
   * @param resultat - Résultat de l'interrogation, `null` si elle n'a pas pu être lancée.
   */
  private appliquerResultatBranches(resultat: ResultatInterrogationBranches | null): void {
    if (!resultat) {
      this.suggestionsBranches = [];
      return;
    }
    if (resultat.type === 'succes') {
      this.suggestionsBranches = resultat.branches;
      this.credentialAbsent = false;
      return;
    }
    this.suggestionsBranches = [];
    this.credentialAbsent = resultat.anomalie.type === 'credentialAbsent';
  }
}
