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
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { SqmConfirmationSuppressionComponent } from '../../../composants/confirmation-suppression/confirmation-suppression.component';
import { SqmFormulaireSourceComponent } from '../../../composants/formulaire-source/formulaire-source.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type { DonneesProjet } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { Groupe, Projet } from '../../../services/avecetat/etat/types-donnees';

/**
 * Ligne agrégée de la liste des projets : porte le projet ainsi que l'identifiant et le nom de son groupe de
 * rattachement réel, indépendamment du filtre Groupe actuellement sélectionné (le filtre Groupe restreint
 * l'affichage sans être un préalable obligatoire).
 */
export interface LigneProjet {
  readonly groupeId: string;
  readonly groupeNom: string;
  readonly projet: Projet;
}

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projets-admin.component.html',
})
export class SqmProjetsAdminComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);
  private readonly injector: Injector = inject(Injector);

  /**
   * Référence au formulaire de source du mini-flux guidé (C11-01), `undefined` tant qu'il n'est pas affiché
   * ({@link projetPourSourcesId} à `null`).
   */
  private readonly formulaireSource = viewChild<SqmFormulaireSourceComponent>('formulaireSource');

  /**
   * Premier champ du formulaire de création/modification, résolu une fois ce champ effectivement rendu dans le DOM
   * (cf. {@link ouvrirCreation}, {@link ouvrirEdition}, C15-02).
   */
  private readonly premierChampFormulaire: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('premierChampFormulaire');

  /**
   * Identifiant du groupe actuellement sélectionné, `null` si aucun groupe n'existe encore.
   */
  public groupeSelectionneId: string | null = null;

  /**
   * Indique si le formulaire de création/modification est actuellement affiché.
   */
  public formulaireVisible = false;

  /**
   * Ligne du projet en cours de modification, `null` en création. Porte le `groupeId` réel du projet, indépendant
   * du filtre Groupe actuellement sélectionné.
   */
  public ligneEnEdition: LigneProjet | null = null;

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
   * Ligne du projet dont la suppression est en cours de confirmation, `null` si aucune n'est en cours. Porte le
   * `groupeId` réel du projet, indépendant du filtre Groupe actuellement sélectionné.
   */
  public ligneASupprimer: LigneProjet | null = null;

  /**
   * Ligne du projet dont la bascule de politique IA attend la ressaisie du mot de passe du fichier (RG-002),
   * `null` si aucune bascule n'est en cours. Porte le `groupeId` réel du projet, indépendant du filtre Groupe
   * actuellement sélectionné. Porté par un signal (plutôt qu'une simple propriété) car mis à jour depuis la
   * continuation asynchrone de {@link confirmerBasculePolitiqueIA}, cf. `cheminCreation` de
   * `demarrage.component.ts`.
   */
  public readonly lignePolitiqueIAEnAttente: WritableSignal<LigneProjet | null> =
    signal<LigneProjet | null>(null);

  /**
   * Indique qu'une bascule de politique IA est en cours, pour désactiver les actions concurrentes. Signal pour le
   * même motif que {@link lignePolitiqueIAEnAttente}.
   */
  public readonly politiqueIAEnCours: WritableSignal<boolean> = signal(false);

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
   * Sélectionne le groupe filtrant la liste des projets affichés, `null` pour ne filtrer sur aucun groupe (tous
   * les groupes confondus).
   * @param groupeId - Identifiant du groupe à sélectionner, `null` pour « Tous les groupes ».
   */
  public selectionnerGroupe(groupeId: string | null): void {
    this.groupeSelectionneId = groupeId;
    this.formulaireVisible = false;
    this.projetPourSourcesId = null;
  }

  /**
   * Projets à afficher compte tenu du filtre Groupe actuellement sélectionné, chacun accompagné de l'identifiant
   * et du nom de son groupe de rattachement réel. Sans filtre, agrège les projets de tous les groupes.
   * @returns Le tableau des lignes de projets à afficher.
   */
  public lignesProjets(): readonly LigneProjet[] {
    return this.groupes()
      .filter(
        (groupe) => this.groupeSelectionneId === null || groupe.id === this.groupeSelectionneId,
      )
      .flatMap((groupe) =>
        groupe.projets.map((projet) => ({ groupeId: groupe.id, groupeNom: groupe.nom, projet })),
      );
  }

  /**
   * Ouvre le formulaire pour la création d'un nouveau projet au sein du groupe sélectionné. Referme, le cas
   * échéant, le mini-flux guidé d'ajout de sources en cours (C11-01).
   */
  public ouvrirCreation(): void {
    this.ligneEnEdition = null;
    this.nom = '';
    this.description = '';
    this.messageErreur = null;
    this.creationAvecSourcesDemandee = false;
    this.projetPourSourcesId = null;
    this.formulaireVisible = true;
    this.focusPremierChampApresRendu();
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
   * @param ligne - Ligne du projet à modifier, portant son groupe de rattachement réel.
   */
  public ouvrirEdition(ligne: LigneProjet): void {
    this.ligneEnEdition = ligne;
    this.nom = ligne.projet.nom;
    this.description = ligne.projet.description;
    this.messageErreur = null;
    this.creationAvecSourcesDemandee = false;
    this.projetPourSourcesId = null;
    this.formulaireVisible = true;
    this.focusPremierChampApresRendu();
  }

  /**
   * Referme le formulaire sans enregistrer.
   */
  public fermerFormulaire(): void {
    this.formulaireVisible = false;
  }

  /**
   * Pose le focus sur le premier champ du formulaire dès son rendu effectif (C15-02) : un appel direct à `.focus()`
   * échouerait ici, le champ n'existant pas encore dans le DOM au moment de l'appel (`@if` conditionnel pas encore
   * réévalué) ; `afterNextRender` diffère l'appel après le rendu réel du DOM (cf. `exemple-reference.component.ts`).
   */
  private focusPremierChampApresRendu(): void {
    afterNextRender(() => this.premierChampFormulaire()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  /**
   * Valide puis enregistre le formulaire (création ou modification selon le contexte). En création, si
   * {@link ouvrirCreationAvecSources} a été utilisé pour ouvrir ce formulaire, ouvre le mini-flux guidé d'ajout de
   * sources (US-007, C11-01) plutôt que de simplement fermer le formulaire.
   */
  public enregistrer(): void {
    if (this.nom.trim().length === 0) {
      this.messageErreur = 'Le nom du projet est obligatoire.';
      return;
    }

    const donnees: DonneesProjet = { nom: this.nom.trim(), description: this.description.trim() };

    if (this.ligneEnEdition) {
      this.donneesApplication.modifierProjet(
        this.ligneEnEdition.groupeId,
        this.ligneEnEdition.projet.id,
        donnees,
      );
      this.formulaireVisible = false;
      this.notification.succes('Le projet a été modifié.');
      return;
    }

    if (!this.groupeSelectionneId) {
      return;
    }
    const projetId = this.donneesApplication.creerProjet(this.groupeSelectionneId, donnees);
    this.formulaireVisible = false;
    this.notification.succes('Le projet a été créé.');
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
    this.notification.succes('La source a été créée.');
    this.formulaireSource()?.reinitialiser();
    afterNextRender(() => this.formulaireSource()?.focusPremierChamp(), {
      injector: this.injector,
    });
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
      this.notification.succes('La source a été créée.');
    }
    this.projetPourSourcesId = null;
    this.ouvrirCreationAvecSources();
  }

  /**
   * Duplique un projet existant au sein de son groupe de rattachement (US-007).
   * @param ligne - Ligne du projet à dupliquer, portant son groupe de rattachement réel.
   */
  public dupliquer(ligne: LigneProjet): void {
    this.donneesApplication.dupliquerProjet(ligne.groupeId, ligne.projet.id);
    this.notification.succes('Le projet a été dupliqué.');
  }

  /**
   * Demande la confirmation de suppression d'un projet (US-007 : suppression confirmée).
   * @param ligne - Ligne du projet à supprimer, portant son groupe de rattachement réel.
   */
  public demanderSuppression(ligne: LigneProjet): void {
    this.ligneASupprimer = ligne;
  }

  /**
   * Confirme la suppression du projet désigné par {@link demanderSuppression}.
   */
  public confirmerSuppression(): void {
    if (this.ligneASupprimer) {
      this.donneesApplication.supprimerProjet(
        this.ligneASupprimer.groupeId,
        this.ligneASupprimer.projet.id,
      );
      this.notification.succes('Le projet a été supprimé.');
    }
    this.ligneASupprimer = null;
  }

  /**
   * Annule la suppression demandée.
   */
  public annulerSuppression(): void {
    this.ligneASupprimer = null;
  }

  /**
   * Ouvre la ressaisie du mot de passe du fichier avant de basculer la politique IA d'un projet (US-024, RG-002).
   * @param ligne - Ligne du projet concerné, portant son groupe de rattachement réel.
   */
  public demanderBasculePolitiqueIA(ligne: LigneProjet): void {
    this.lignePolitiqueIAEnAttente.set(ligne);
  }

  /**
   * Annule la bascule de politique IA demandée.
   */
  public annulerBasculePolitiqueIA(): void {
    this.lignePolitiqueIAEnAttente.set(null);
  }

  /**
   * Bascule la politique IA du projet désigné par {@link demanderBasculePolitiqueIA}, après confirmation du mot
   * de passe (US-024, RG-014 à RG-016, RG-023).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerBasculePolitiqueIA(motDePasse: string): Promise<void> {
    const ligne = this.lignePolitiqueIAEnAttente();
    if (!ligne) {
      return;
    }

    this.politiqueIAEnCours.set(true);
    const resultat = await this.donneesApplication.definirPolitiqueIA(
      ligne.groupeId,
      ligne.projet.id,
      !ligne.projet.iaAutorisee,
      motDePasse,
    );
    this.politiqueIAEnCours.set(false);
    this.lignePolitiqueIAEnAttente.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur(
        resultat.anomalie.type === 'motDePasseOuFichierInvalide'
          ? 'Mot de passe incorrect.'
          : 'Une erreur inattendue est survenue lors de la bascule de la politique IA.',
      );
    }
  }
}
