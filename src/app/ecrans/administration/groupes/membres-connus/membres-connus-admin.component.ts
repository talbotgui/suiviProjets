// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Sous-onglet Membres connus de l'onglet Groupes de l'écran Administration (US-022, US-023, Phase 4) : CRUD des
// règles d'identification des membres d'un groupe sélectionné (RG-006 à RG-008, RG-012). À la différence des
// autres CRUD de l'écran Administration (Phase 3, en mémoire uniquement), chaque mutation invoque ici directement
// une commande native qui sauvegarde effectivement le fichier (RG-002 : le mot de passe est donc redemandé à
// chaque enregistrement ou suppression, cf. `SqmConfirmationMotDePasseComponent`).
//
// Entrées `groupeIdPreselectionne`/`critere`/`typeCritere`/`partiLe`, relayées depuis `SqmGroupesAdminComponent`
// (liens « Qualifier ce membre » et « Marquer comme parti » de la Fiche projet, cf. `fiche-projet.component.ts`) :
// un effet (constructeur) présélectionne une fois pour toutes le groupe visé puis, si `critere`/`typeCritere` sont
// tous deux présents et reconnus, recherche une règle déjà existante du groupe portant exactement ce critère et ce
// type. Si elle existe (« Marquer comme parti », RG-061, §8.5 du plan `plan_18`), le formulaire de modification de
// cette règle s'ouvre, avec `partiLe` pré-rempli à la valeur transmise si la règle n'en porte pas déjà une (jamais
// d'écrasement silencieux d'une date déjà enregistrée). Sinon (« Qualifier ce membre », membre `inconnu`), le
// formulaire de création s'ouvre pré-rempli avec `critere`/`typeCritere`. Si `critere`/`typeCritere` sont tous deux
// absents (membre en `conflit`), le groupe est simplement présélectionné et sa liste de règles existantes reste
// affichée sans ouvrir de formulaire.
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
  ChangeDetectionStrategy,
  input,
} from '@angular/core';
import type { InputSignal, Signal, WritableSignal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationMotDePasseComponent } from '../../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { SqmConfirmationSuppressionComponent } from '../../../../composants/confirmation-suppression/confirmation-suppression.component';
import type { DonneesMembreConnu } from '../../../../services/avecetat/etat/donnees-application.service';
import { DonneesApplicationService } from '../../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../../services/avecetat/etat/notification.service';
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
 * US-023), avec ressaisie du mot de passe du fichier à chaque enregistrement ou suppression (RG-002). Un conflit
 * de règles courriel/domaine créé par la règle soumise est désormais bloqué à la saisie (Phase 10, R10-07,
 * symétrique du doublon de username) ; un conflit résiduel préexistant, non lié à la saisie courante, reste
 * seulement signalé (RG-008).
 */
@Component({
  selector: 'app-membres-connus-admin',
  imports: [
    DatePipe,
    FormsModule,
    SqmConfirmationSuppressionComponent,
    SqmConfirmationMotDePasseComponent,
  ],
  templateUrl: './membres-connus-admin.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './membres-connus-admin.component.scss',
})
export class SqmMembresConnusAdminComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);
  private readonly injector: Injector = inject(Injector);

  /**
   * Premier champ du formulaire de création/modification, résolu une fois ce champ effectivement rendu dans le DOM
   * (cf. {@link ouvrirCreation}, {@link ouvrirEdition}, C15-02).
   */
  private readonly premierChampFormulaire: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('premierChampFormulaire');

  /**
   * Identifiant du groupe à présélectionner (cf. commentaire d'en-tête).
   */
  public readonly groupeIdPreselectionne: InputSignal<string | undefined> = input<string>();

  /**
   * Critère à pré-remplir dans le formulaire de création (cf. commentaire d'en-tête). Nommé distinctement du champ
   * de formulaire {@link critere} (même nom que le paramètre de requête d'origine, RG-006 à RG-008), qu'il ne fait
   * qu'initialiser une fois.
   */
  public readonly critereInitial: InputSignal<string | undefined> = input<string>();

  /**
   * Type du critère à pré-remplir (cf. {@link critereInitial} et {@link typeCritere}).
   */
  public readonly typeCritereInitial: InputSignal<string | undefined> = input<string>();

  /**
   * Date de départ à pré-remplir (lien « Marquer comme parti », cf. commentaire d'en-tête), appliquée uniquement
   * quand {@link critereInitial}/{@link typeCritereInitial} désignent une règle déjà existante du groupe (bascule
   * alors en modification plutôt qu'en création) et que celle-ci ne porte pas déjà de date de départ.
   */
  public readonly partiLeInitial: InputSignal<string | undefined> = input<string>();

  /**
   * Indique que la présélection depuis {@link groupeIdPreselectionne} a déjà été appliquée une fois pour cette
   * instance (cf. commentaire d'en-tête, même patron que `SqmListeTravailComponent.vueParDefautDejaAppliquee`).
   */
  private preselectionDejaAppliquee = false;

  public constructor() {
    effect(() => {
      const groupeCible = this.groupeIdPreselectionne();
      if (this.preselectionDejaAppliquee || groupeCible === undefined) {
        return;
      }
      this.preselectionDejaAppliquee = true;
      this.selectionnerGroupe(groupeCible);
      const typeCritereCible = this.analyserTypeCritere(this.typeCritereInitial());
      const critereCible = this.critereInitial();
      if (typeCritereCible === undefined || critereCible === undefined || critereCible.length === 0) {
        return;
      }
      const regleExistante = this.membresConnus().find(
        (regle) => regle.typeCritere === typeCritereCible && regle.critere === critereCible,
      );
      if (regleExistante !== undefined) {
        this.ouvrirEdition(regleExistante.id);
        const partiLeCible = this.partiLeInitial();
        if (partiLeCible !== undefined && this.partiLe.length === 0) {
          this.partiLe = partiLeCible;
        }
        return;
      }
      this.ouvrirCreation();
      this.typeCritere = typeCritereCible;
      this.critere = critereCible;
    });
  }

  /**
   * Valide qu'une valeur de paramètre de requête correspond bien à un type de critère reconnu, sans accès non sûr
   * à cette valeur d'origine externe (URL).
   * @param valeur - Valeur brute du paramètre de requête `typeCritere`.
   * @returns Le type de critère reconnu, `undefined` si la valeur ne correspond à aucun type connu.
   */
  private analyserTypeCritere(valeur: string | undefined): TypeCritereMembre | undefined {
    return this.typesCritere.find((type) => type === valeur);
  }

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
   * Indique si le formulaire de création/modification est actuellement affiché. Signal car muté depuis la
   * continuation asynchrone de {@link confirmerEnregistrement}, hors de toute planification automatique de
   * détection de changement en application zoneless (cf. `cheminCreation` dans `demarrage.component.ts`).
   */
  public readonly formulaireVisible: WritableSignal<boolean> = signal(false);

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
   * Date de départ (`partiLe`, RG-061) saisie dans le formulaire, chaîne vide = non renseignée. Sans objet pour un
   * critère de type domaine : le champ est alors désactivé et vidé (cf. {@link surChangementTypeCritere}).
   */
  public partiLe = '';

  /**
   * Date du jour au format `AAAA-MM-JJ`, plafond du champ « Parti le » : une date de départ future est refusée
   * (RG-061), aussi bien par ce plafond côté interface que par la revalidation côté cœur natif.
   * @returns La date du jour, formatée pour l'attribut `max` d'un champ `type="date"`.
   */
  public get dateAujourdhui(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Message d'erreur de validation ou de rejet par le cœur natif, `null` si aucune erreur en cours.
   */
  public messageErreur: string | null = null;

  /**
   * Identifiant de la règle dont la suppression est en cours de confirmation, `null` si aucune n'est en cours.
   * Signal car muté depuis la continuation asynchrone de {@link confirmerSuppressionMotDePasse} (cf.
   * {@link formulaireVisible}).
   */
  public readonly membreASupprimerId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Action en attente de ressaisie du mot de passe (RG-002), `null` si aucune boîte de ressaisie n'est affichée.
   * Signal car muté depuis la continuation asynchrone de {@link confirmerEnregistrement} et
   * {@link confirmerSuppressionMotDePasse} (cf. {@link formulaireVisible}).
   */
  public readonly actionEnAttenteMotDePasse: WritableSignal<
    'enregistrement' | 'suppression' | null
  > = signal<'enregistrement' | 'suppression' | null>(null);

  /**
   * Identifiants des règles de membres connus du groupe sélectionné encore en conflit (RG-008) après le dernier
   * enregistrement réussi : depuis R10-07, un conflit créé par la règle soumise est bloqué avant enregistrement
   * (cf. `libelleAnomalie`) ; ce tableau ne signale donc plus qu'un conflit résiduel préexistant, non lié à la
   * saisie courante.
   */
  public readonly membresEnConflitIds: WritableSignal<readonly string[]> = signal<
    readonly string[]
  >([]);

  /**
   * Indique qu'un appel à une commande native est en cours, pour désactiver les actions concurrentes. Signal car
   * muté depuis la continuation asynchrone de {@link confirmerEnregistrement} et
   * {@link confirmerSuppressionMotDePasse} (cf. {@link formulaireVisible}).
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
   * Sélectionne le groupe dont les membres connus sont affichés et administrés.
   * @param groupeId - Identifiant du groupe à sélectionner.
   */
  public selectionnerGroupe(groupeId: string): void {
    this.groupeSelectionneId = groupeId;
    this.formulaireVisible.set(false);
    this.membresEnConflitIds.set([]);
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
    return this.membresEnConflitIds().includes(membreId);
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
    this.partiLe = '';
    this.messageErreur = null;
    this.formulaireVisible.set(true);
    this.focusPremierChampApresRendu();
  }

  /**
   * Réagit à un changement de type de critère : une règle de type domaine ne peut porter de date de départ
   * (RG-061), le champ « Parti le » est donc vidé lorsque l'utilisateur bascule sur ce type.
   */
  public surChangementTypeCritere(): void {
    if (this.typeCritere === TypeCritereMembre.DomaineEmail) {
      this.partiLe = '';
    }
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
    this.partiLe = regle.partiLe ?? '';
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
   * Valide le formulaire puis, si valide, ouvre la ressaisie du mot de passe avant l'enregistrement effectif
   * (RG-002).
   */
  public demanderEnregistrement(): void {
    if (this.critere.trim().length === 0) {
      this.messageErreur = 'Le critère est obligatoire.';
      return;
    }
    const erreurPartiLe = this.validerPartiLe();
    if (erreurPartiLe !== null) {
      this.messageErreur = erreurPartiLe;
      return;
    }
    this.messageErreur = null;
    this.actionEnAttenteMotDePasse.set('enregistrement');
  }

  /**
   * Valide la date de départ saisie (RG-061), en complément de la revalidation côté cœur natif : interdite sur un
   * critère de type domaine, doit être une date valide et non postérieure au jour courant.
   * @returns Le message d'erreur à afficher, ou `null` si la date est absente ou valide.
   */
  private validerPartiLe(): string | null {
    const partiLe = this.partiLe.trim();
    if (partiLe.length === 0) {
      return null;
    }
    if (this.typeCritere === TypeCritereMembre.DomaineEmail) {
      return 'Une règle de type domaine ne peut pas porter de date de départ.';
    }
    const horodatage = Date.parse(`${partiLe}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(partiLe) || Number.isNaN(horodatage)) {
      return 'La date de départ est invalide.';
    }
    if (partiLe > this.dateAujourdhui) {
      return 'La date de départ ne peut pas être dans le futur.';
    }
    return null;
  }

  /**
   * Enregistre la règle après confirmation du mot de passe (US-022, US-023, RG-002).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrement(motDePasse: string): Promise<void> {
    if (!this.groupeSelectionneId) {
      this.actionEnAttenteMotDePasse.set(null);
      return;
    }
    const donnees: DonneesMembreConnu = {
      membreId: this.membreEnEditionId ?? undefined,
      critere: this.critere.trim(),
      typeCritere: this.typeCritere,
      statut: this.statut,
      libelle: this.libelle.trim().length > 0 ? this.libelle.trim() : undefined,
      aliasEmail: this.aliasEmail.trim().length > 0 ? this.aliasEmail.trim() : undefined,
      partiLe: this.partiLe.trim().length > 0 ? this.partiLe.trim() : undefined,
    };

    this.enCours.set(true);
    const resultat = await this.donneesApplication.qualifierMembre(
      this.groupeSelectionneId,
      donnees,
      ORIGINE_ADMINISTRATION,
      motDePasse,
    );
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);

    switch (resultat.type) {
      case 'succes':
        this.membresEnConflitIds.set(resultat.membresEnConflit);
        this.formulaireVisible.set(false);
        this.notification.succes(
          this.membreEnEditionId
            ? 'La règle de membre a été modifiée.'
            : 'Le membre a été qualifié.',
        );
        break;
      case 'echec':
        this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
        break;
    }
  }

  /**
   * Demande la confirmation de suppression d'une règle.
   * @param membreId - Identifiant de la règle à supprimer.
   */
  public demanderSuppression(membreId: string): void {
    this.membreASupprimerId.set(membreId);
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
    this.membreASupprimerId.set(null);
  }

  /**
   * Supprime la règle après confirmation du mot de passe (US-023, RG-002).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerSuppressionMotDePasse(motDePasse: string): Promise<void> {
    const membreASupprimerId = this.membreASupprimerId();
    if (!this.groupeSelectionneId || !membreASupprimerId) {
      this.actionEnAttenteMotDePasse.set(null);
      return;
    }

    this.enCours.set(true);
    const resultat = await this.donneesApplication.supprimerMembreConnu(
      this.groupeSelectionneId,
      membreASupprimerId,
      ORIGINE_ADMINISTRATION,
      motDePasse,
    );
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);
    this.membreASupprimerId.set(null);

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
      case 'doublonUsernameMembreConnu':
        return 'Ce username est déjà utilisé par une autre règle de ce groupe.';
      case 'conflitReglesMembreConnu':
        return 'Cette règle entre en conflit avec une autre règle de ce groupe portant le même critère et un statut différent.';
      case 'dateDepartInvalide':
        return 'La date de départ est invalide : elle ne peut pas être dans le futur ni figurer sur une règle de type domaine.';
      case 'groupeIntrouvable':
        return 'Le groupe sélectionné est introuvable.';
      case 'membreIntrouvable':
        return 'Cette règle est introuvable : elle a peut-être déjà été supprimée.';
      case 'fichierVerrouille':
        return 'Le fichier de données est verrouillé par un autre processus.';
      case 'motDePasseOuFichierInvalide':
        return 'Mot de passe incorrect.';
      case 'sessionVerrouillee':
        return 'La session est verrouillée : déverrouillez-la avant de sauvegarder.';
      case 'motDePasseSessionDivergent':
        return 'Le mot de passe saisi ne correspond pas à celui de la session en cours.';
      case 'projetIntrouvable':
      case 'brouillonDejaExistant':
      case 'aucunBrouillonCourant':
      case 'projetAbsentDuBrouillon':
      case 'cleSeuilIntrouvable':
      case 'typeReferentielInconnu':
      case 'motifDependanceDejaExistant':
      case 'libelleCategorieDependanceDejaExistant':
      case 'entreeReferentielInvalide':
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
      case 'entreeReferentielIntrouvable':
      case 'annotationIntrouvable':
      case 'annotationSystemeNonSupprimable':
      case 'nouveauMotDePasseInvalide':
      case 'erreurInterne':
        return "Une erreur inattendue est survenue lors de l'enregistrement.";
    }
  }
}
