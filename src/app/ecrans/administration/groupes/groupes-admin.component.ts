// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet Groupes de l'écran Administration (US-006, Phase 3 ; US-022, US-023, Phase 4) : sous-onglet Groupes
// (liste, création, modification et suppression des groupes, avec gestion inline de leurs instances GitLab/Sonar),
// sous-onglet Membres connus (`SqmMembresConnusAdminComponent`, CRUD des règles d'identification des membres d'un
// groupe, RG-006 à RG-008) et sous-onglet Annotations (`SqmAnnotationsGroupeAdminComponent`, US-019, RG-033,
// Phase 10 incrément 8, C10-04 : création et suppression des annotations de portée groupe, également porté par
// `Groupe`), construit sur le même patron que le sous-onglet Membres connus.
//
// Entrées `groupeIdPreselectionne`/`critere`/`typeCritere`, relayées telles quelles depuis `SqmAdministrationComponent`
// (paramètres de requête portés par le lien « Qualifier ce membre » de la Fiche projet) : un simple effet
// (constructeur) bascule une fois pour toutes sur le sous-onglet Membres connus dès que `groupeIdPreselectionne`
// est renseigné, sur le modèle de `vueParDefautDejaAppliquee` (`SqmListeTravailComponent`).
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  viewChild,
  viewChildren,
  ChangeDetectionStrategy,
  input,
} from '@angular/core';
import type { InputSignal, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationSuppressionComponent } from '../../../composants/confirmation-suppression/confirmation-suppression.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type { DonneesGroupe } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import { TypeInstance } from '../../../services/sansetat/commandes/types-facade';
import type { Instance } from '../../../services/sansetat/commandes/types-facade';
import type { Groupe } from '../../../services/avecetat/etat/types-donnees';
import { SqmAnnotationsGroupeAdminComponent } from './annotations-groupe/annotations-groupe-admin.component';
import { SqmMembresConnusAdminComponent } from './membres-connus/membres-connus-admin.component';

/**
 * Instance en cours d'édition au sein du formulaire de groupe, dotée d'un identifiant local stable (généré à
 * l'ajout) permettant de l'associer à sa ligne de formulaire indépendamment de son identifiant définitif. Les
 * champs sont volontairement modifiables ici, à la différence d'`Instance`, pour permettre leur liaison directe
 * (`[(ngModel)]`) aux champs de saisie du formulaire.
 */
interface InstanceEnEdition extends Omit<Instance, 'type' | 'nom' | 'urlBase'> {
  type: TypeInstance;
  nom: string;
  urlBase: string;
}

/**
 * Identifiant d'un sous-onglet de l'onglet Groupes (cf. `docs/02_documentation/08_arborescenceNavigation.md`).
 */
type SousOngletGroupes = 'groupes' | 'membresConnus' | 'annotations';

/**
 * Onglet Groupes de l'écran Administration : trois sous-onglets, CRUD complet des groupes (US-006), CRUD des
 * membres connus du groupe sélectionné (US-022, US-023) et création/suppression des annotations de portée groupe
 * (US-019, RG-033, Phase 10 incrément 8).
 */
@Component({
  selector: 'app-groupes-admin',
  imports: [
    FormsModule,
    SqmConfirmationSuppressionComponent,
    SqmMembresConnusAdminComponent,
    SqmAnnotationsGroupeAdminComponent,
  ],
  templateUrl: './groupes-admin.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './groupes-admin.component.scss',
})
export class SqmGroupesAdminComponent {
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
   * Premier champ (Type) de chaque ligne d'instance actuellement affichée, dans l'ordre du `@for` (C15-02) :
   * permet de poser le focus sur celui de la dernière ligne ajoutée par {@link ajouterInstance}.
   */
  private readonly champsTypeInstance: Signal<readonly ElementRef<HTMLSelectElement>[]> =
    viewChildren<ElementRef<HTMLSelectElement>>('champTypeInstance');

  /**
   * Identifiant du groupe à présélectionner dans le sous-onglet Membres connus (cf. commentaire d'en-tête).
   */
  public readonly groupeIdPreselectionne: InputSignal<string | undefined> = input<string>();

  /**
   * Critère à pré-remplir dans le formulaire de création d'une règle de membre connu (cf. commentaire d'en-tête).
   */
  public readonly critere: InputSignal<string | undefined> = input<string>();

  /**
   * Type du critère à pré-remplir (cf. {@link critere}).
   */
  public readonly typeCritere: InputSignal<string | undefined> = input<string>();

  /**
   * Indique que la présélection du sous-onglet Membres connus a déjà été appliquée une fois pour cette instance
   * (cf. commentaire d'en-tête, même patron que `SqmListeTravailComponent.vueParDefautDejaAppliquee`).
   */
  private preselectionDejaAppliquee = false;

  public constructor() {
    effect(() => {
      if (this.preselectionDejaAppliquee || this.groupeIdPreselectionne() === undefined) {
        return;
      }
      this.preselectionDejaAppliquee = true;
      this.sousOngletActif = 'membresConnus';
    });
  }

  /**
   * Sous-onglet actuellement affiché.
   */
  public sousOngletActif: SousOngletGroupes = 'groupes';

  /**
   * Sélectionne le sous-onglet à afficher.
   * @param sousOnglet - Sous-onglet à activer.
   */
  public selectionnerSousOnglet(sousOnglet: SousOngletGroupes): void {
    this.sousOngletActif = sousOnglet;
  }

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
    this.focusPremierChampApresRendu();
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
   * Ajoute une instance vide à la liste en cours d'édition, et pose le focus sur son premier champ (Type, C15-02)
   * dès son rendu effectif.
   */
  public ajouterInstance(): void {
    this.instances = [
      ...this.instances,
      { id: crypto.randomUUID(), type: TypeInstance.Gitlab, nom: '', urlBase: '' },
    ];
    afterNextRender(() => this.focusDerniereInstance(), { injector: this.injector });
  }

  /**
   * Pose le focus sur le champ Type de la dernière ligne d'instance affichée (celle ajoutée par
   * {@link ajouterInstance}). Sans effet si aucune instance n'est affichée.
   */
  private focusDerniereInstance(): void {
    const champs = this.champsTypeInstance();
    champs[champs.length - 1]?.nativeElement.focus();
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
      this.notification.succes('Le groupe a été modifié.');
    } else {
      this.donneesApplication.creerGroupe(donnees);
      this.notification.succes('Le groupe a été créé.');
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
      this.notification.succes('Le groupe a été supprimé.');
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
