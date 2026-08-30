// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant transverse réutilisable de sélection/enregistrement d'une vue de filtres (US-028, RG-027, Phase 9
// incrément 1), destiné aux trois écrans à filtres visés par RG-027 (Synthèse des audits, Synthèse graphique,
// Liste de travail — seule Liste de travail le monte à cet incrément). Reste volontairement agnostique de la
// structure concrète des filtres (`filtres: unknown`) : c'est à l'écran appelant, seul à connaître la forme de ses
// propres filtres, de fournir les vues déjà filtrées pour son écran et sa version de schéma courante (via
// `VuesEnregistreesUtils.filtrerPourEcran`, `services/sansetat/jugement/`) et de traduire les événements émis ici
// en appels à `DonneesApplicationService.definirVue`/`supprimerVue` avec ses propres filtres courants. Ce composant
// ne connaît donc ni `DonneesApplicationService` ni `VueEnregistree` (frontière `composants/` → `services/avecetat/`
// jamais franchie, cf. docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-
// couches) : {@link VueSelectionnable} en reprend la forme structurelle utile, sur le modèle déjà retenu par
// `AlertesAccueilUtils`/`VuesEnregistreesUtils` côté `sansetat`.
//
// Réutilise les deux composants de confirmation déjà établis (`SqmConfirmationMotDePasseComponent`,
// `SqmConfirmationSuppressionComponent`) : toute mutation (création, mise à jour, suppression d'une vue) sauvegarde
// effectivement le fichier côté cœur natif et redemande donc le mot de passe (RG-002), qu'elle porte ou non par
// ailleurs une confirmation de suppression préalable.
import { Component, computed, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import type { InputSignal, OutputEmitterRef, Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SqmConfirmationMotDePasseComponent } from '../confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { SqmConfirmationSuppressionComponent } from '../confirmation-suppression/confirmation-suppression.component';

/**
 * Forme structurelle d'une vue enregistrée consommée par ce composant (mirroir partiel de `VueEnregistree`, cf.
 * commentaire d'en-tête de ce fichier).
 */
export interface VueSelectionnable {
  /** Identifiant UUID v4 de la vue enregistrée. */
  readonly id: string;
  /** Nom donné par l'utilisateur. */
  readonly nom: string;
  /** Indique si cette vue est la vue par défaut de son écran. */
  readonly parDefaut: boolean;
  /** Filtres de la vue, structure propre à l'écran appelant. */
  readonly filtres: unknown;
}

/**
 * Action en attente de confirmation du mot de passe (RG-002), une fois le formulaire ou la confirmation de
 * suppression préalable validés par l'utilisateur.
 */
type ActionEnAttente =
  | {
      readonly type: 'enregistrer';
      readonly id: string | undefined;
      readonly nom: string;
      readonly parDefaut: boolean;
    }
  | { readonly type: 'supprimer'; readonly id: string };

/**
 * Demande de création ou de mise à jour d'une vue enregistrée, émise une fois le mot de passe confirmé (US-028).
 */
export interface DemandeEnregistrementVue {
  /** Identifiant de la vue à mettre à jour, `undefined` pour une création (« enregistrer sous »). */
  readonly id: string | undefined;
  /** Nom de la vue. */
  readonly nom: string;
  /** Indique si cette vue doit devenir la vue par défaut de son écran. */
  readonly parDefaut: boolean;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Demande de suppression d'une vue enregistrée, émise une fois le mot de passe confirmé (US-028).
 */
export interface DemandeSuppressionVue {
  /** Identifiant de la vue à supprimer. */
  readonly id: string;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Sélecteur transverse de vues enregistrées (US-028, RG-027) : choix d'une vue existante, enregistrement des
 * filtres courants sous un nouveau nom, mise à jour de la vue sélectionnée avec les filtres courants, et
 * suppression. N'applique jamais lui-même un filtre : se contente d'émettre la vue choisie, à charge de l'écran
 * appelant de traduire `filtres` (`unknown`) vers sa propre structure de filtres.
 */
@Component({
  selector: 'app-selecteur-vue',
  imports: [
    FormsModule,
    RouterLink,
    SqmConfirmationMotDePasseComponent,
    SqmConfirmationSuppressionComponent,
  ],
  templateUrl: './selecteur-vue.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './selecteur-vue.component.scss',
})
export class SqmSelecteurVueComponent {
  /**
   * Vues déjà restreintes par l'écran appelant à son propre identifiant d'écran et à sa version de filtres
   * courante (cf. `VuesEnregistreesUtils.filtrerPourEcran`).
   */
  public readonly vues: InputSignal<readonly VueSelectionnable[]> =
    input.required<readonly VueSelectionnable[]>();

  /**
   * Émis lorsque l'utilisateur choisit une vue dans le sélecteur, avec la vue choisie complète.
   */
  public readonly vueAppliquee: OutputEmitterRef<VueSelectionnable> = output<VueSelectionnable>();

  /**
   * Émis lorsqu'une création ou une mise à jour de vue a été confirmée (nom, vue par défaut et mot de passe déjà
   * saisis) : à charge de l'écran appelant d'invoquer `DonneesApplicationService.definirVue` avec ses propres
   * filtres courants.
   */
  public readonly enregistrementDemande: OutputEmitterRef<DemandeEnregistrementVue> =
    output<DemandeEnregistrementVue>();

  /**
   * Émis lorsqu'une suppression a été confirmée (mot de passe déjà saisi) : à charge de l'écran appelant d'invoquer
   * `DonneesApplicationService.supprimerVue`.
   */
  public readonly suppressionDemandee: OutputEmitterRef<DemandeSuppressionVue> =
    output<DemandeSuppressionVue>();

  /**
   * Identifiant de la vue actuellement sélectionnée dans le menu déroulant, `''` = aucune vue sélectionnée.
   */
  public readonly idSelectionne: WritableSignal<string> = signal('');

  /**
   * Vue actuellement sélectionnée, dérivée de {@link idSelectionne} et de {@link vues}.
   */
  public readonly vueSelectionnee: Signal<VueSelectionnable | undefined> = computed(() =>
    this.vues().find((vue) => vue.id === this.idSelectionne()),
  );

  /**
   * Indique si le formulaire « Enregistrer les filtres actuels sous... » est actuellement ouvert.
   */
  public readonly formulaireEnregistrementOuvert: WritableSignal<boolean> = signal(false);

  /**
   * Nom saisi dans le formulaire d'enregistrement.
   */
  public readonly nomSaisi: WritableSignal<string> = signal('');

  /**
   * Case « vue par défaut » cochée dans le formulaire d'enregistrement.
   */
  public readonly parDefautSaisi: WritableSignal<boolean> = signal(false);

  /**
   * Indique si la confirmation de suppression (avant le mot de passe) est actuellement affichée.
   */
  public readonly confirmationSuppressionVisible: WritableSignal<boolean> = signal(false);

  /**
   * Action dont le mot de passe reste à confirmer, `null` si aucune confirmation n'est en attente.
   */
  private readonly actionEnAttente: WritableSignal<ActionEnAttente | null> = signal(null);

  /**
   * Indique si la boîte de ressaisie du mot de passe (RG-002) doit être affichée.
   */
  public readonly confirmationMotDePasseVisible: Signal<boolean> = computed(
    () => this.actionEnAttente() !== null,
  );

  /**
   * Message affiché par la boîte de ressaisie du mot de passe, propre à l'action en attente.
   */
  public readonly messageConfirmationMotDePasse: Signal<string> = computed(() => {
    const action = this.actionEnAttente();
    if (action?.type === 'supprimer') {
      return 'Confirmez votre mot de passe pour supprimer cette vue enregistrée.';
    }
    return 'Confirmez votre mot de passe pour enregistrer cette vue.';
  });

  /**
   * Sélectionne une vue par identifiant et émet {@link vueAppliquee} avec la vue complète.
   * @param id - Identifiant de la vue choisie, `''` pour aucune sélection.
   */
  public selectionner(id: string): void {
    this.idSelectionne.set(id);
    const vue = this.vueSelectionnee();
    if (vue !== undefined) {
      this.vueAppliquee.emit(vue);
    }
  }

  /**
   * Ouvre le formulaire « Enregistrer les filtres actuels sous... », champs réinitialisés.
   */
  public ouvrirFormulaireEnregistrement(): void {
    this.nomSaisi.set('');
    this.parDefautSaisi.set(false);
    this.formulaireEnregistrementOuvert.set(true);
  }

  /**
   * Referme le formulaire d'enregistrement sans rien enregistrer.
   */
  public annulerFormulaireEnregistrement(): void {
    this.formulaireEnregistrementOuvert.set(false);
  }

  /**
   * Valide le formulaire « Enregistrer sous » (nom non vide requis) et ouvre la confirmation du mot de passe.
   */
  public validerFormulaireEnregistrement(): void {
    const nom = this.nomSaisi().trim();
    if (nom.length === 0) {
      return;
    }
    this.formulaireEnregistrementOuvert.set(false);
    this.actionEnAttente.set({
      type: 'enregistrer',
      id: undefined,
      nom,
      parDefaut: this.parDefautSaisi(),
    });
  }

  /**
   * Met à jour la vue actuellement sélectionnée avec les filtres courants (nom et statut par défaut inchangés) :
   * ouvre directement la confirmation du mot de passe, sans nouveau formulaire de nom.
   */
  public mettreAJourVueSelectionnee(): void {
    const vue = this.vueSelectionnee();
    if (vue === undefined) {
      return;
    }
    this.actionEnAttente.set({
      type: 'enregistrer',
      id: vue.id,
      nom: vue.nom,
      parDefaut: vue.parDefaut,
    });
  }

  /**
   * Ouvre la confirmation de suppression de la vue actuellement sélectionnée.
   */
  public demanderSuppression(): void {
    if (this.vueSelectionnee() === undefined) {
      return;
    }
    this.confirmationSuppressionVisible.set(true);
  }

  /**
   * Gère la confirmation de suppression (avant le mot de passe) : ouvre la confirmation du mot de passe.
   */
  public confirmerSuppression(): void {
    this.confirmationSuppressionVisible.set(false);
    const vue = this.vueSelectionnee();
    if (vue === undefined) {
      return;
    }
    this.actionEnAttente.set({ type: 'supprimer', id: vue.id });
  }

  /**
   * Gère l'annulation de la confirmation de suppression.
   */
  public annulerSuppression(): void {
    this.confirmationSuppressionVisible.set(false);
  }

  /**
   * Gère la confirmation du mot de passe (RG-002) : émet {@link enregistrementDemande} ou
   * {@link suppressionDemandee} selon l'action en attente, puis réinitialise l'état.
   * @param motDePasse - Mot de passe saisi par l'utilisateur.
   */
  public confirmerMotDePasse(motDePasse: string): void {
    const action = this.actionEnAttente();
    this.actionEnAttente.set(null);
    if (action === null) {
      return;
    }
    if (action.type === 'enregistrer') {
      this.enregistrementDemande.emit({
        id: action.id,
        nom: action.nom,
        parDefaut: action.parDefaut,
        motDePasse,
      });
    } else {
      this.suppressionDemandee.emit({ id: action.id, motDePasse });
    }
  }

  /**
   * Gère l'annulation de la ressaisie du mot de passe : referme la confirmation sans rien émettre.
   */
  public annulerMotDePasse(): void {
    this.actionEnAttente.set(null);
  }
}
