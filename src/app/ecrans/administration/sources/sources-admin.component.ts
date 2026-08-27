// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet Sources de l'écran Administration (US-008, Phase 3) : sélection d'un groupe puis d'un projet, ensuite
// liste et suppression de ses sources. La saisie (création/modification, cascade Type→Instance, autocomplétions)
// est déléguée à `SqmFormulaireSourceComponent` (`composants/formulaire-source/`) depuis C11-01 (Phase 11),
// extrait de ce composant pour être également consommé par le mini-flux guidé de `SqmProjetsAdminComponent` sans
// dupliquer cette logique.
import {
  Component,
  Injector,
  afterNextRender,
  inject,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationSuppressionComponent } from '../../../composants/confirmation-suppression/confirmation-suppression.component';
import { SqmFormulaireSourceComponent } from '../../../composants/formulaire-source/formulaire-source.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import { TypeSource } from '../../../services/avecetat/etat/types-donnees';
import type { Groupe, Projet, Source } from '../../../services/avecetat/etat/types-donnees';
import { LienExterneSourceUtils } from '../../../services/sansetat/jugement/lien-externe-source.utils';
import { TriAlphabetiqueUtils } from '../../../services/sansetat/jugement/tri-alphabetique.utils';

/**
 * Ligne agrégée de la liste des sources : porte la source ainsi que les identifiants et noms de son groupe et de
 * son projet de rattachement réels, indépendamment des filtres Groupe/Projet actuellement sélectionnés (ces
 * filtres restreignent l'affichage sans être un préalable obligatoire).
 */
export interface LigneSource {
  readonly groupeId: string;
  readonly groupeNom: string;
  readonly projetId: string;
  readonly projetNom: string;
  readonly source: Source;
  /**
   * Lien direct vers l'instance GitLab/Sonar réellement interrogée par cette source (US-008, RG-045, C15-13),
   * `undefined` si l'instance de rattachement est introuvable (donnée mal formée).
   */
  readonly urlLien: string | undefined;
  /**
   * Indice au survol du lien direct (RG-045), présent uniquement pour une source GitLab (lien non contractuel, cf.
   * `SqmFicheProjetComponent`).
   */
  readonly titreLien: string | undefined;
}

/**
 * Onglet Sources de l'écran Administration : sélection d'un groupe puis d'un projet, liste et suppression de ses
 * sources ; création/modification déléguée à `SqmFormulaireSourceComponent` (US-008).
 */
@Component({
  selector: 'app-sources-admin',
  imports: [FormsModule, SqmConfirmationSuppressionComponent, SqmFormulaireSourceComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sources-admin.component.html',
})
export class SqmSourcesAdminComponent {
  /**
   * Indice au survol du lien direct vers un dépôt GitLab (RG-045, C15-13), identique à celui de
   * `SqmFicheProjetComponent` : ce lien repose sur un comportement de redirection de l'application web GitLab à
   * partir du seul identifiant numérique de projet, non contractualisé au même titre que l'API REST v4 utilisée par
   * ailleurs par les connecteurs.
   */
  private static readonly INDICE_LIEN_GITLAB_NON_CONTRACTUEL =
    "Lien déduit de l'identifiant du dépôt GitLab (redirection de l'application web GitLab) : ce mécanisme n'est pas garanti dans le temps au même titre qu'un appel d'API.";

  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);
  private readonly injector: Injector = inject(Injector);

  /**
   * Référence au formulaire de source affiché, `undefined` tant qu'il n'est pas ouvert.
   */
  private readonly formulaireSource = viewChild<SqmFormulaireSourceComponent>('formulaireSource');

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
   * Ligne de la source en cours de modification, `null` en création. Porte les `groupeId`/`projetId` réels de la
   * source, indépendants des filtres Groupe/Projet actuellement sélectionnés.
   */
  public ligneEnEdition: LigneSource | null = null;

  /**
   * Ligne de la source dont la suppression est en cours de confirmation, `null` si aucune n'est en cours. Porte
   * les `groupeId`/`projetId` réels de la source, indépendants des filtres Groupe/Projet actuellement
   * sélectionnés.
   */
  public ligneASupprimer: LigneSource | null = null;

  /**
   * Identifiant du groupe transmis au formulaire de création/modification (`SqmFormulaireSourceComponent`),
   * `null` tant que le formulaire n'est pas ouvert. Calculé une fois à l'ouverture ({@link ouvrirCreation}/
   * {@link ouvrirEdition}) à partir du filtre courant ou de la ligne éditée, car l'input `groupeId` du composant
   * enfant est obligatoire (`input.required`) et ne peut donc pas être lié directement aux filtres, qui peuvent
   * valoir `null`.
   */
  public groupeIdFormulaire: string | null = null;

  /**
   * Identifiant du projet transmis au formulaire de création/modification, même principe que
   * {@link groupeIdFormulaire}.
   */
  public projetIdFormulaire: string | null = null;

  /**
   * Groupes disponibles pour la sélection.
   * @returns Le tableau des groupes de la racine courante.
   */
  public groupes(): readonly Groupe[] {
    return this.donneesApplication.groupes();
  }

  /**
   * Sélectionne le groupe filtrant les projets proposés et les sources affichées, `null` pour ne filtrer sur
   * aucun groupe (tous les groupes confondus).
   * @param groupeId - Identifiant du groupe à sélectionner, `null` pour « Tous les groupes ».
   */
  public selectionnerGroupe(groupeId: string | null): void {
    this.groupeSelectionneId = groupeId;
    this.projetSelectionneId = null;
    this.formulaireVisible = false;
  }

  /**
   * Projets à proposer dans le filtre Projet compte tenu du filtre Groupe actuellement sélectionné. Sans filtre
   * Groupe, agrège les projets de tous les groupes.
   * @returns Le tableau des projets proposés.
   */
  public projets(): readonly Projet[] {
    return TriAlphabetiqueUtils.trierParNom(
      this.groupes()
        .filter(
          (groupe) => this.groupeSelectionneId === null || groupe.id === this.groupeSelectionneId,
        )
        .flatMap((groupe) => groupe.projets),
    );
  }

  /**
   * Recherche le groupe de rattachement réel d'un projet, quel que soit le filtre Groupe actuellement sélectionné.
   * @param projetId - Identifiant du projet recherché.
   * @returns L'identifiant du groupe de rattachement, `null` si aucun groupe ne contient ce projet.
   */
  private trouverGroupeDuProjet(projetId: string): string | null {
    return (
      this.groupes().find((groupe) => groupe.projets.some((projet) => projet.id === projetId))
        ?.id ?? null
    );
  }

  /**
   * Sélectionne le projet filtrant les sources affichées, `null` pour ne filtrer sur aucun projet (tous les
   * projets du filtre Groupe confondus). Choisir un projet aligne automatiquement le filtre Groupe sur le groupe
   * de rattachement réel de ce projet, pour permettre de sélectionner un projet directement sans avoir au
   * préalable choisi son groupe.
   * @param projetId - Identifiant du projet à sélectionner, `null` pour « Tous les projets ».
   */
  public selectionnerProjet(projetId: string | null): void {
    this.projetSelectionneId = projetId;
    if (projetId) {
      const groupeDuProjet = this.trouverGroupeDuProjet(projetId);
      if (groupeDuProjet) {
        this.groupeSelectionneId = groupeDuProjet;
      }
    }
    this.formulaireVisible = false;
  }

  /**
   * Sources à afficher compte tenu des filtres Groupe/Projet actuellement sélectionnés, chacune accompagnée des
   * identifiants et noms de son groupe et de son projet de rattachement réels. Sans filtre, agrège les sources de
   * tous les groupes et projets.
   * @returns Le tableau des lignes de sources à afficher.
   */
  public lignesSources(): readonly LigneSource[] {
    return this.groupes()
      .filter(
        (groupe) => this.groupeSelectionneId === null || groupe.id === this.groupeSelectionneId,
      )
      .flatMap((groupe) =>
        groupe.projets
          .filter(
            (projet) => this.projetSelectionneId === null || projet.id === this.projetSelectionneId,
          )
          .flatMap((projet) =>
            projet.sources.map((source) => {
              const urlLien = this.construireUrlLien(source, groupe.instances);
              return {
                groupeId: groupe.id,
                groupeNom: groupe.nom,
                projetId: projet.id,
                projetNom: projet.nom,
                source,
                urlLien,
                titreLien:
                  urlLien !== undefined && source.type === TypeSource.DepotGitlab
                    ? SqmSourcesAdminComponent.INDICE_LIEN_GITLAB_NON_CONTRACTUEL
                    : undefined,
              };
            }),
          ),
      );
  }

  /**
   * Construit le lien direct vers l'instance GitLab/Sonar réellement interrogée par une source (US-008, RG-045,
   * C15-13), à partir des seuls champs déjà chargés en mémoire (`Instance.urlBase`, `Source.idExterne`).
   * @param source - Source dont le lien est construit.
   * @param instances - Instances déclarées par le groupe de rattachement de la source.
   * @returns Le lien direct construit, `undefined` si l'instance de rattachement est introuvable.
   */
  private construireUrlLien(source: Source, instances: Groupe['instances']): string | undefined {
    const instance = instances.find((candidate) => candidate.id === source.instanceId);
    if (instance === undefined) {
      return undefined;
    }
    return source.type === TypeSource.DepotGitlab
      ? LienExterneSourceUtils.construireLienGitlab(instance.urlBase, source.idExterne)
      : LienExterneSourceUtils.construireLienSonar(instance.urlBase, source.idExterne);
  }

  /**
   * Ouvre le formulaire pour la création d'une nouvelle source au sein des filtres Groupe/Projet actuellement
   * sélectionnés.
   */
  public ouvrirCreation(): void {
    this.ligneEnEdition = null;
    this.groupeIdFormulaire = this.groupeSelectionneId;
    this.projetIdFormulaire = this.projetSelectionneId;
    this.formulaireVisible = true;
    this.focusPremierChampApresRendu();
  }

  /**
   * Ouvre le formulaire pré-rempli pour la modification d'une source existante.
   * @param ligne - Ligne de la source à modifier, portant ses groupe et projet de rattachement réels.
   */
  public ouvrirEdition(ligne: LigneSource): void {
    this.ligneEnEdition = ligne;
    this.groupeIdFormulaire = ligne.groupeId;
    this.projetIdFormulaire = ligne.projetId;
    this.formulaireVisible = true;
    this.focusPremierChampApresRendu();
  }

  /**
   * Pose le focus sur le premier champ de `SqmFormulaireSourceComponent` dès son rendu effectif (C15-02). Réinvoqué
   * explicitement ici plutôt que de dépendre uniquement du `ngAfterViewInit` interne du composant enfant : la liste
   * des sources reste cliquable pendant que le formulaire est ouvert, si bien qu'une bascule directe d'une édition
   * à une autre (sans fermeture préalable) ne fait pas transiter le `@if` englobant de `false` à `true` et ne
   * recrée donc pas ce composant enfant (anomalie n°2 relevée en relecture de l'Étape 15 incrément 2).
   */
  private focusPremierChampApresRendu(): void {
    afterNextRender(() => this.formulaireSource()?.focusPremierChamp(), {
      injector: this.injector,
    });
  }

  /**
   * Referme le formulaire sans enregistrer.
   */
  public fermerFormulaire(): void {
    this.formulaireVisible = false;
  }

  /**
   * Referme le formulaire après un enregistrement réussi (création ou modification) et notifie le succès
   * (US-038).
   */
  public onSourceEnregistree(): void {
    this.notification.succes(
      this.ligneEnEdition ? 'La source a été modifiée.' : 'La source a été créée.',
    );
    this.fermerFormulaire();
  }

  /**
   * Demande la confirmation de suppression d'une source (US-008).
   * @param ligne - Ligne de la source à supprimer, portant ses groupe et projet de rattachement réels.
   */
  public demanderSuppression(ligne: LigneSource): void {
    this.ligneASupprimer = ligne;
  }

  /**
   * Confirme la suppression de la source désignée par {@link demanderSuppression}.
   */
  public confirmerSuppression(): void {
    if (this.ligneASupprimer) {
      this.donneesApplication.supprimerSource(
        this.ligneASupprimer.groupeId,
        this.ligneASupprimer.projetId,
        this.ligneASupprimer.source.id,
      );
      this.notification.succes('La source a été supprimée.');
    }
    this.ligneASupprimer = null;
  }

  /**
   * Annule la suppression demandée.
   */
  public annulerSuppression(): void {
    this.ligneASupprimer = null;
  }
}
