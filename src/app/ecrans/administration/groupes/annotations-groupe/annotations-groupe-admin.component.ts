// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Sous-onglet Annotations de l'onglet Groupes de l'écran Administration (US-019, RG-033, Phase 10 incrément 8,
// C10-04) : création et suppression d'annotations de portée groupe, jusqu'ici seulement possibles pour la portée
// projet (Fiche projet). Solution A retenue par arbitrage humain : troisième sous-onglet de
// `SqmGroupesAdminComponent`, sur le patron exact de `SqmMembresConnusAdminComponent` (sélecteur de groupe, liste,
// formulaire, confirmation puis mot de passe), plutôt qu'un quatrième onglet racine de l'écran Administration —
// cohérent avec le commentaire de code déjà en place dans `groupes-admin.component.ts` rattachant l'annotation de
// groupe à `Groupe`, et évite de dupliquer le sélecteur de groupe déjà présent dans le sous-onglet voisin. Les
// champs du formulaire de création (date, libellé, catégorie, description) reprennent ceux déjà éprouvés par
// `SqmFicheProjetComponent` (portée projet). La commande `creerAnnotation` gérait déjà nativement la portée groupe
// (`projetId` omis) depuis la Phase 8 ; seule la construction de cet écran manquait. La suppression
// (`supprimerAnnotation`) est ajoutée à cette même occasion, décision arbitraire élargie aux deux portées (groupe
// et projet) plutôt qu'à la seule portée groupe nouvellement construite (cf. `SqmFicheProjetComponent`, qui en
// bénéficie donc également).
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
import { SqmConfirmationMotDePasseComponent } from '../../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { SqmConfirmationSuppressionComponent } from '../../../../composants/confirmation-suppression/confirmation-suppression.component';
import type { DonneesAnnotation } from '../../../../services/avecetat/etat/donnees-application.service';
import { DonneesApplicationService } from '../../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../../services/avecetat/etat/notification.service';
import type {
  Annotation,
  ErreurAdministration,
  Groupe,
} from '../../../../services/avecetat/etat/types-donnees';

/**
 * Sous-onglet Annotations : sélection d'un groupe, puis création et suppression de ses annotations de portée
 * groupe (US-019, RG-033), avec ressaisie du mot de passe du fichier à chaque mutation (RG-002).
 */
@Component({
  selector: 'app-annotations-groupe-admin',
  imports: [FormsModule, SqmConfirmationSuppressionComponent, SqmConfirmationMotDePasseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './annotations-groupe-admin.component.html',
})
export class SqmAnnotationsGroupeAdminComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);
  private readonly injector: Injector = inject(Injector);

  /**
   * Premier champ du formulaire de création, résolu une fois ce champ effectivement rendu dans le DOM (cf.
   * {@link ouvrirCreation}, C15-02).
   */
  private readonly premierChampFormulaire: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('premierChampFormulaire');

  /**
   * Identifiant du groupe actuellement sélectionné, `null` si aucun groupe n'existe encore.
   */
  public groupeSelectionneId: string | null = null;

  /**
   * Indique si le formulaire de création est actuellement affiché. Signal (plutôt qu'une simple propriété) car
   * muté depuis la continuation asynchrone de {@link confirmerCreation}, sur le modèle de
   * `SqmDemarrageComponent.cheminCreation`.
   */
  public readonly formulaireVisible: WritableSignal<boolean> = signal(false);

  /**
   * Date saisie dans le formulaire.
   */
  public date = '';

  /**
   * Libellé saisi dans le formulaire.
   */
  public libelle = '';

  /**
   * Catégorie saisie dans le formulaire.
   */
  public categorie = '';

  /**
   * Description saisie dans le formulaire.
   */
  public description = '';

  /**
   * Message d'erreur de validation ou de rejet par le cœur natif, `null` si aucune erreur en cours.
   */
  public messageErreur: string | null = null;

  /**
   * Identifiant de l'annotation dont la suppression est en cours de confirmation, `null` si aucune n'est en cours.
   * Signal (plutôt qu'une simple propriété) car muté depuis la continuation asynchrone de
   * {@link confirmerSuppressionMotDePasse}, sur le modèle de `SqmDemarrageComponent.cheminCreation`.
   */
  public readonly annotationASupprimerId: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /**
   * Action en attente de ressaisie du mot de passe (RG-002), `null` si aucune boîte de ressaisie n'est affichée.
   * Signal (plutôt qu'une simple propriété) car muté depuis la continuation asynchrone de
   * {@link confirmerCreation}/{@link confirmerSuppressionMotDePasse}, sur le modèle de
   * `SqmDemarrageComponent.cheminCreation`.
   */
  public readonly actionEnAttenteMotDePasse: WritableSignal<'creation' | 'suppression' | null> =
    signal<'creation' | 'suppression' | null>(null);

  /**
   * Indique qu'un appel à une commande native est en cours, pour désactiver les actions concurrentes. Signal
   * (plutôt qu'une simple propriété) car muté depuis la continuation asynchrone de {@link confirmerCreation}/
   * {@link confirmerSuppressionMotDePasse}, sur le modèle de `SqmDemarrageComponent.cheminCreation`.
   */
  public readonly enCours: WritableSignal<boolean> = signal(false);

  /**
   * Groupes disponibles pour la sélection.
   * @returns Le tableau des groupes de la racine courante.
   */
  public groupes(): readonly Groupe[] {
    return this.donneesApplication.groupes();
  }

  /**
   * Sélectionne le groupe dont les annotations sont affichées et administrées.
   * @param groupeId - Identifiant du groupe à sélectionner.
   */
  public selectionnerGroupe(groupeId: string): void {
    this.groupeSelectionneId = groupeId;
    this.formulaireVisible.set(false);
    this.messageErreur = null;
  }

  /**
   * Annotations de portée groupe du groupe actuellement sélectionné, tableau vide si aucun groupe n'est
   * sélectionné.
   * @returns Le tableau des annotations du groupe sélectionné.
   */
  public annotations(): readonly Annotation[] {
    return (
      this.groupes().find((groupe) => groupe.id === this.groupeSelectionneId)?.annotations ?? []
    );
  }

  /**
   * Ouvre le formulaire de création d'une nouvelle annotation, pré-rempli à la date du jour.
   */
  public ouvrirCreation(): void {
    this.date = new Date().toISOString().slice(0, 10);
    this.libelle = '';
    this.categorie = '';
    this.description = '';
    this.messageErreur = null;
    this.formulaireVisible.set(true);
    this.focusPremierChampApresRendu();
  }

  /**
   * Referme le formulaire sans enregistrer.
   */
  public fermerFormulaire(): void {
    this.formulaireVisible.set(false);
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
   * Valide le formulaire puis, si valide, ouvre la ressaisie du mot de passe avant la création effective
   * (RG-002).
   */
  public demanderCreation(): void {
    if (this.date.trim().length === 0 || this.libelle.trim().length === 0) {
      this.messageErreur = 'La date et le libellé sont obligatoires.';
      return;
    }
    this.messageErreur = null;
    this.actionEnAttenteMotDePasse.set('creation');
  }

  /**
   * Crée l'annotation après confirmation du mot de passe (US-019, RG-002, RG-023).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerCreation(motDePasse: string): Promise<void> {
    if (!this.groupeSelectionneId) {
      this.actionEnAttenteMotDePasse.set(null);
      return;
    }
    const donnees: DonneesAnnotation = {
      date: this.date,
      libelle: this.libelle.trim(),
      categorie: this.categorie.trim(),
      description: this.description.trim().length > 0 ? this.description.trim() : undefined,
    };

    this.enCours.set(true);
    const resultat = await this.donneesApplication.creerAnnotation(
      this.groupeSelectionneId,
      undefined,
      donnees,
      motDePasse,
    );
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.formulaireVisible.set(false);
    this.notification.succes("L'annotation a été créée.");
  }

  /**
   * Demande la confirmation de suppression d'une annotation.
   * @param annotationId - Identifiant de l'annotation à supprimer.
   */
  public demanderSuppression(annotationId: string): void {
    this.annotationASupprimerId.set(annotationId);
  }

  /**
   * Confirme la suppression désignée par {@link demanderSuppression} : ouvre la ressaisie du mot de passe avant
   * la suppression effective (RG-002).
   */
  public confirmerSuppression(): void {
    this.actionEnAttenteMotDePasse.set('suppression');
  }

  /**
   * Annule la suppression demandée.
   */
  public annulerSuppression(): void {
    this.annotationASupprimerId.set(null);
  }

  /**
   * Supprime l'annotation après confirmation du mot de passe (US-019, RG-002, RG-033).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerSuppressionMotDePasse(motDePasse: string): Promise<void> {
    const annotationASupprimerId = this.annotationASupprimerId();
    if (!this.groupeSelectionneId || !annotationASupprimerId) {
      this.actionEnAttenteMotDePasse.set(null);
      return;
    }

    this.enCours.set(true);
    const resultat = await this.donneesApplication.supprimerAnnotation(
      this.groupeSelectionneId,
      undefined,
      annotationASupprimerId,
      motDePasse,
    );
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);
    this.annotationASupprimerId.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
    }
  }

  /**
   * Annule la ressaisie du mot de passe en cours, quelle que soit l'action qui l'avait demandée.
   */
  public annulerMotDePasse(): void {
    this.actionEnAttenteMotDePasse.set(null);
  }

  /**
   * Traduit une anomalie typée en message lisible par l'utilisateur, sans détail technique sensible.
   * @param anomalie - Anomalie remontée par la commande native.
   * @returns Le message à afficher.
   */
  private libelleAnomalie(anomalie: ErreurAdministration): string {
    switch (anomalie.type) {
      case 'groupeIntrouvable':
        return 'Le groupe sélectionné est introuvable.';
      case 'annotationIntrouvable':
        return 'Cette annotation est introuvable : elle a peut-être déjà été supprimée.';
      case 'annotationSystemeNonSupprimable':
        return 'Cette annotation système ne peut pas être supprimée.';
      case 'fichierVerrouille':
        return 'Le fichier de données est verrouillé par un autre processus.';
      case 'motDePasseOuFichierInvalide':
        return 'Mot de passe incorrect.';
      case 'sessionVerrouillee':
        return 'La session est verrouillée : déverrouillez-la avant de sauvegarder.';
      case 'motDePasseSessionDivergent':
        return 'Le mot de passe saisi ne correspond pas à celui de la session en cours.';
      case 'projetIntrouvable':
      case 'membreIntrouvable':
      case 'doublonUsernameMembreConnu':
      case 'conflitReglesMembreConnu':
      case 'brouillonDejaExistant':
      case 'aucunBrouillonCourant':
      case 'projetAbsentDuBrouillon':
      case 'cleSeuilIntrouvable':
      case 'typeReferentielInconnu':
      case 'entreeReferentielInvalide':
      case 'entreeReferentielIntrouvable':
      case 'motifNommageBranchesInvalide':
      case 'fichierIntrouvable':
      case 'formatNonReconnu':
      case 'versionSchemaSuperieure':
      case 'aucunFichierOuvert':
      case 'credentialInvalide':
      case 'modePurgeAgeInconnu':
      case 'fichierConfigurationIllisible':
      case 'formatConfigurationNonReconnu':
      case 'versionSchemaConfigurationSuperieure':
      case 'ligneDifferentielInconnue':
      case 'vueIntrouvable':
      case 'reglageApplicatifInvalide':
      case 'erreurInterne':
        return "Une erreur inattendue est survenue lors de l'enregistrement.";
    }
  }
}
