// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet « Vues enregistrées » de l'écran Paramétrage (US-054, RG-054, plan_16 incrément 4) : administration
// centralisée de toutes les vues enregistrées, tous écrans confondus, sans avoir à se rendre sur l'écran concerné.
// Quatre actions par ligne : renommer (nom seul, filtres inchangés), dupliquer (copie « … (copie) » non par
// défaut), supprimer, définir ou retirer le statut de vue par défaut (exclusif par écran, garanti côté cœur natif).
//
// La modification des filtres eux-mêmes reste sur l'écran d'origine (elle a besoin de sa barre de filtres) : cet
// onglet ne propose que le nom et le statut par défaut, plus un lien « Ouvrir l'écran concerné » (RG-054, §C.2 du
// plan) vers l'écran de restitution correspondant, où la barre de filtres permet de retoucher puis « Mettre à
// jour » la vue. Chaque mutation réutilise `DonneesApplicationService.definirVue`/`supprimerVue`, sans commande
// native nouvelle (RG-054 : la journalisation de la mutation est portée par les commandes natives
// `definir_vue`/`supprimer_vue` elles-mêmes depuis cet incrément). Chaque mutation sauvegarde effectivement le
// fichier et redemande donc le mot de passe (RG-002), via `SqmConfirmationMotDePasseComponent` (et
// `SqmConfirmationSuppressionComponent` avant une suppression), sur le même modèle que `SqmSelecteurVueComponent`.
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { SqmConfirmationSuppressionComponent } from '../../../composants/confirmation-suppression/confirmation-suppression.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type {
  ResultatMutationAdministration,
  VueEnregistree,
} from '../../../services/avecetat/etat/types-donnees';

/**
 * Métadonnées d'affichage d'un écran porteur de vues enregistrées (les quatre écrans de restitution du périmètre
 * RG-027 amendée) : libellé lisible et chemin de route (`app.routes.ts`) pour le lien « Ouvrir l'écran concerné ».
 */
const ECRANS: Readonly<Record<string, { readonly libelle: string; readonly route: string }>> = {
  syntheseAudits: { libelle: 'Synthèse des audits', route: '/synthese-audits' },
  syntheseGraphique: { libelle: 'Synthèse graphique', route: '/synthese-graphique' },
  obsolescence: { libelle: 'Obsolescence', route: '/obsolescence' },
  listeTravail: { libelle: 'Liste de travail', route: '/liste-travail' },
};

/**
 * Groupe de vues enregistrées d'un même écran, pour l'affichage regroupé du tableau.
 */
interface GroupeVues {
  /** Identifiant stable de l'écran. */
  readonly ecran: string;
  /** Libellé lisible de l'écran (cf. {@link ECRANS}). */
  readonly libelleEcran: string;
  /** Chemin de route de l'écran (`app.routes.ts`), `null` si l'écran n'est pas reconnu. */
  readonly route: string | null;
  /** Vues enregistrées de cet écran, dans l'ordre du fichier. */
  readonly vues: readonly VueEnregistree[];
}

/**
 * Mutation de vue en attente de la ressaisie du mot de passe (RG-002), une fois le formulaire ou la confirmation de
 * suppression préalable validés.
 */
type ActionEnAttente =
  | { readonly type: 'renommer'; readonly vue: VueEnregistree; readonly nouveauNom: string }
  | { readonly type: 'dupliquer'; readonly vue: VueEnregistree }
  | { readonly type: 'supprimer'; readonly vue: VueEnregistree }
  | { readonly type: 'parDefaut'; readonly vue: VueEnregistree; readonly nouveau: boolean };

/**
 * Onglet « Vues enregistrées » de l'écran de Paramétrage (US-054) : liste consolidée de toutes les vues
 * enregistrées, avec renommage, duplication, suppression et bascule du statut de vue par défaut.
 */
@Component({
  selector: 'app-vues-enregistrees-parametrage',
  imports: [
    FormsModule,
    RouterLink,
    SqmConfirmationMotDePasseComponent,
    SqmConfirmationSuppressionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vues-enregistrees-parametrage.component.html',
})
export class SqmVuesEnregistreesParametrageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

  /**
   * Vues enregistrées regroupées par écran, écrans triés par libellé lisible.
   */
  public readonly groupes: Signal<readonly GroupeVues[]> = computed(() => {
    const vues = this.donneesApplication.racine()?.vuesEnregistrees ?? [];
    const parEcran = new Map<string, VueEnregistree[]>();
    for (const vue of vues) {
      const liste = parEcran.get(vue.ecran) ?? [];
      liste.push(vue);
      parEcran.set(vue.ecran, liste);
    }
    return Array.from(parEcran.entries())
      .map(([ecran, vuesEcran]) => ({
        ecran,
        libelleEcran: ECRANS[ecran]?.libelle ?? ecran,
        route: ECRANS[ecran]?.route ?? null,
        vues: vuesEcran,
      }))
      .sort((a, b) => a.libelleEcran.localeCompare(b.libelleEcran));
  });

  /**
   * Indique qu'aucune vue n'est enregistrée (état particulier : message explicite, jamais un tableau vide muet).
   */
  public readonly aucuneVue: Signal<boolean> = computed(() => this.groupes().length === 0);

  /**
   * Identifiant de la vue actuellement en cours de renommage, `null` si aucun champ de renommage n'est ouvert.
   */
  public readonly idEnRenommage: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Nom saisi dans le champ de renommage courant.
   */
  public readonly nomEnRenommage: WritableSignal<string> = signal('');

  /**
   * Vue dont la confirmation de suppression (avant le mot de passe) est affichée, `null` si aucune.
   */
  public readonly vueEnSuppression: WritableSignal<VueEnregistree | null> =
    signal<VueEnregistree | null>(null);

  /**
   * Mutation en attente de ressaisie du mot de passe (RG-002), `null` si aucune.
   */
  public readonly actionEnAttente: WritableSignal<ActionEnAttente | null> =
    signal<ActionEnAttente | null>(null);

  /**
   * Indique qu'un appel à une commande native est en cours, pour désactiver les actions concurrentes.
   */
  public readonly enCours: WritableSignal<boolean> = signal(false);

  /**
   * Message de la boîte de ressaisie du mot de passe, propre à l'action en attente.
   */
  public readonly messageMotDePasse: Signal<string> = computed(() => {
    const action = this.actionEnAttente();
    switch (action?.type) {
      case 'renommer':
        return 'Confirmez votre mot de passe pour renommer cette vue enregistrée.';
      case 'dupliquer':
        return 'Confirmez votre mot de passe pour dupliquer cette vue enregistrée.';
      case 'supprimer':
        return 'Confirmez votre mot de passe pour supprimer cette vue enregistrée.';
      case 'parDefaut':
        return action.nouveau
          ? 'Confirmez votre mot de passe pour définir cette vue comme vue par défaut de son écran.'
          : 'Confirmez votre mot de passe pour retirer le statut de vue par défaut.';
      case undefined:
        return '';
    }
  });

  /**
   * Ouvre le champ de renommage d'une vue, pré-rempli avec son nom courant.
   * @param vue - Vue à renommer.
   */
  public ouvrirRenommage(vue: VueEnregistree): void {
    this.idEnRenommage.set(vue.id);
    this.nomEnRenommage.set(vue.nom);
  }

  /**
   * Referme le champ de renommage sans rien enregistrer.
   */
  public annulerRenommage(): void {
    this.idEnRenommage.set(null);
  }

  /**
   * Valide le renommage (nom non vide et réellement changé requis) et ouvre la confirmation du mot de passe.
   * @param vue - Vue concernée.
   */
  public validerRenommage(vue: VueEnregistree): void {
    const nouveauNom = this.nomEnRenommage().trim();
    if (nouveauNom.length === 0 || nouveauNom === vue.nom) {
      this.idEnRenommage.set(null);
      return;
    }
    this.idEnRenommage.set(null);
    this.actionEnAttente.set({ type: 'renommer', vue, nouveauNom });
  }

  /**
   * Ouvre la confirmation du mot de passe pour dupliquer une vue.
   * @param vue - Vue à dupliquer.
   */
  public demanderDuplication(vue: VueEnregistree): void {
    this.actionEnAttente.set({ type: 'dupliquer', vue });
  }

  /**
   * Ouvre la confirmation de suppression (avant le mot de passe) d'une vue.
   * @param vue - Vue à supprimer.
   */
  public demanderSuppression(vue: VueEnregistree): void {
    this.vueEnSuppression.set(vue);
  }

  /**
   * Gère la confirmation de suppression préalable : ouvre la confirmation du mot de passe.
   */
  public confirmerSuppression(): void {
    const vue = this.vueEnSuppression();
    this.vueEnSuppression.set(null);
    if (vue === null) {
      return;
    }
    this.actionEnAttente.set({ type: 'supprimer', vue });
  }

  /**
   * Gère l'annulation de la confirmation de suppression préalable.
   */
  public annulerSuppression(): void {
    this.vueEnSuppression.set(null);
  }

  /**
   * Ouvre la confirmation du mot de passe pour définir ou retirer le statut de vue par défaut.
   * @param vue - Vue concernée.
   */
  public demanderBasculeParDefaut(vue: VueEnregistree): void {
    this.actionEnAttente.set({ type: 'parDefaut', vue, nouveau: !vue.parDefaut });
  }

  /**
   * Annule la ressaisie du mot de passe en cours, quelle que soit l'action qui l'avait demandée.
   */
  public annulerMotDePasse(): void {
    this.actionEnAttente.set(null);
  }

  /**
   * Exécute la mutation en attente après confirmation du mot de passe (RG-002, RG-054).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerMotDePasse(motDePasse: string): Promise<void> {
    const action = this.actionEnAttente();
    this.actionEnAttente.set(null);
    if (action === null) {
      return;
    }
    this.enCours.set(true);
    try {
      const resultat = await this.executer(action, motDePasse);
      if (resultat.type === 'echec') {
        this.notification.erreur(
          "Une erreur inattendue est survenue lors de l'opération sur la vue.",
        );
        return;
      }
      this.notification.succes(this.messageSucces(action));
    } catch {
      // `DonneesApplicationService.definirVue`/`supprimerVue` peut lever si le fichier est fermé ou verrouillé
      // pendant que la modale de mot de passe est ouverte (lecture de la racine/du chemin hors de leur `try`).
      this.notification.erreur(
        "Une erreur inattendue est survenue lors de l'opération sur la vue.",
      );
    } finally {
      this.enCours.set(false);
    }
  }

  /**
   * Route une action confirmée vers l'appel de service correspondant.
   * @param action - Action confirmée.
   * @param motDePasse - Mot de passe ressaisi.
   * @returns Le Résultat typé de la mutation.
   */
  private executer(
    action: ActionEnAttente,
    motDePasse: string,
  ): Promise<ResultatMutationAdministration> {
    const { vue } = action;
    switch (action.type) {
      case 'renommer':
        return this.donneesApplication.definirVue(
          vue.id,
          action.nouveauNom,
          vue.ecran,
          vue.versionFiltres,
          vue.parDefaut,
          vue.filtres,
          motDePasse,
        );
      case 'dupliquer':
        return this.donneesApplication.definirVue(
          undefined,
          `${vue.nom} (copie)`,
          vue.ecran,
          vue.versionFiltres,
          false,
          vue.filtres,
          motDePasse,
        );
      case 'parDefaut':
        return this.donneesApplication.definirVue(
          vue.id,
          vue.nom,
          vue.ecran,
          vue.versionFiltres,
          action.nouveau,
          vue.filtres,
          motDePasse,
        );
      case 'supprimer':
        return this.donneesApplication.supprimerVue(vue.id, motDePasse);
    }
  }

  /**
   * Message de succès propre à l'action réalisée.
   * @param action - Action confirmée.
   * @returns Le message à notifier.
   */
  private messageSucces(action: ActionEnAttente): string {
    switch (action.type) {
      case 'renommer':
        return 'La vue a été renommée.';
      case 'dupliquer':
        return 'La vue a été dupliquée.';
      case 'supprimer':
        return 'La vue a été supprimée.';
      case 'parDefaut':
        return action.nouveau
          ? 'La vue est désormais la vue par défaut de son écran.'
          : 'Le statut de vue par défaut a été retiré.';
    }
  }
}
