// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant transverse « Bouton de copie rapide » de la charte d'ergonomie (cf.
// docs/02_documentation/10_charteErgonomie.md#composants-dinterface-réutilisables, US-042, besoin identifié en
// Phase 15, absent de `Specification.md`, cf. plan de développement C15-06) : copie un identifiant technique dans
// le presse-papiers via `navigator.clipboard.writeText()`, avec confirmation visuelle explicite du succès de la
// copie. Mécanisme de copie repris de `SqmCredentialsComponent.copierCredentialsJson` (Phase 9, incrément 3) :
// appel direct à l'API Web standard `navigator.clipboard` plutôt qu'un greffon Tauri dédié (décision arbitraire
// déjà validée à cet incrément précédent, aucun impact CSP identifié, aucune ressource externe requise). Ne
// reprend délibérément PAS le mécanisme d'expiration automatique du presse-papiers de ce précédent : celui-ci est
// une mesure de sécurité propre aux secrets/credentials (RG-004), sans objet pour un simple identifiant technique
// affiché publiquement (ex. référence de dépendance). Seul l'état visuel du bouton revient à son état initial
// après un court délai ; le contenu du presse-papiers lui-même n'est jamais effacé par ce composant.
//
// Consommé pour la première fois par la colonne « Référence » du tableau des dépendances de l'écran Fiche projet
// (US-017, fiche-projet.component.html), documenté ici comme gabarit destiné à être réutilisé tel quel pour tout
// futur identifiant technique affiché ailleurs dans l'application (ex. motif d'une règle de dépendance), sans que
// cette réutilisation ne soit réalisée par ce développement (périmètre strictement limité à la Fiche projet).
//
// Généralisé ensuite (US-043) au-delà du seul identifiant technique : le texte visible du bouton ({@link
// SqmBoutonCopieComponent.libelle}) et une infobulle survolable facultative ({@link
// SqmBoutonCopieComponent.infobulle}) sont désormais paramétrables, pour servir aussi de bouton d'aide « copier un
// exemple de prompt » dans la modale de saisie en masse de règles de dépendances. Le mécanisme (copie
// `navigator.clipboard` + confirmation visuelle inline) reste strictement identique.
import {
  Component,
  DestroyRef,
  inject,
  input,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { InputSignal, WritableSignal } from '@angular/core';

/** État d'affichage courant du bouton de copie rapide. */
type EtatCopie = 'inactif' | 'copie' | 'echec';

/**
 * Durée, en millisecondes, pendant laquelle la confirmation visuelle de succès (ou le message d'échec) reste
 * affichée avant que le bouton ne revienne à son état initial. Décision arbitraire de ce développement (aucune
 * valeur normative disponible dans `04_casUsage.md` ni `10_charteErgonomie.md` pour ce composant), à valider par un
 * humain, sur le même modèle que `NotificationService.DUREE_AUTO_DISPARITION_SUCCES_MS` (autre choix d'ergonomie
 * déjà laissé à l'appréciation du Codeur faute de convention imposée).
 */
const DUREE_CONFIRMATION_MS = 2_000;

/**
 * Bouton de copie rapide, transverse et réutilisable (US-042) : copie {@link SqmBoutonCopieComponent.valeur} dans
 * le presse-papiers au clic, avec confirmation visuelle explicite du succès (ou, à défaut, un message d'échec
 * explicite), toutes deux affichées sur le modèle déjà retenu par `credentials.component.html` (texte visible,
 * `role="status"`, `aria-live="polite"`), puis effacées automatiquement après {@link DUREE_CONFIRMATION_MS}.
 * Composant sans état externe ni dépendance à un service applicatif (aucune injection de service requise), pour
 * rester réutilisable tel quel par tout écran de l'application sans configuration supplémentaire.
 */
@Component({
  selector: 'app-bouton-copie',
  templateUrl: './bouton-copie.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SqmBoutonCopieComponent {
  private minuteurRetourInactif: ReturnType<typeof setTimeout> | undefined;

  /**
   * Valeur exacte copiée dans le presse-papiers au clic, fournie obligatoirement par le composant appelant.
   */
  public readonly valeur: InputSignal<string> = input.required<string>();

  /**
   * Libellé accessible du bouton (`aria-label`), décrivant précisément ce qui est copié (ex. « Copier la référence
   * lodash »). Obligatoire plutôt qu'à valeur par défaut générique : un tableau affichant plusieurs boutons de
   * copie rapide côte à côte (ex. une colonne « Référence » entière) exposerait sinon plusieurs éléments
   * interactifs au nom accessible strictement identique (« Copier »), impossibles à distinguer au clavier ou au
   * lecteur d'écran (RNF-020, WCAG 2.1 AA).
   */
  public readonly libelleAccessible: InputSignal<string> = input.required<string>();

  /**
   * Texte visible du bouton. Valeur par défaut « Copier » (usage historique : copie d'un identifiant technique) ;
   * un appelant peut le remplacer par un libellé plus explicite lorsque la valeur copiée n'est pas un simple
   * identifiant (ex. « Copier un exemple de prompt IA » dans la modale de saisie en masse, US-043).
   */
  public readonly libelle: InputSignal<string> = input<string>('Copier');

  /**
   * Infobulle survolable facultative (`title`), affichée au survol du bouton. Absente par défaut (aucun attribut
   * `title` rendu) : n'a d'intérêt que lorsque le libellé visible ne suffit pas à lui seul à expliquer l'action
   * (ex. bouton d'aide de la modale de saisie en masse, US-043).
   */
  public readonly infobulle: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * État d'affichage courant du bouton (`inactif` par défaut, temporairement `copie` ou `echec` après un clic).
   */
  public readonly etat: WritableSignal<EtatCopie> = signal<EtatCopie>('inactif');

  /**
   * Désarme le minuteur de retour à l'état initial à la destruction du composant, pour éviter toute écriture de
   * signal orpheline après démontage (même précaution que `SqmCredentialsComponent` pour son propre minuteur
   * d'expiration du presse-papiers).
   */
  public constructor() {
    inject(DestroyRef).onDestroy(() => this.arreterMinuteur());
  }

  /**
   * Copie {@link valeur} dans le presse-papiers via l'API Web standard `navigator.clipboard` et affiche la
   * confirmation visuelle correspondante (succès ou échec) pendant {@link DUREE_CONFIRMATION_MS}.
   */
  public async copier(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.valeur());
      this.afficherEtatTemporaire('copie');
    } catch {
      this.afficherEtatTemporaire('echec');
    }
  }

  /**
   * Affiche temporairement un état de confirmation ou d'échec, puis revient à `inactif` après
   * {@link DUREE_CONFIRMATION_MS} (réarme le délai si un état temporaire était déjà affiché).
   * @param etat - État temporaire à afficher (`copie` ou `echec`).
   */
  private afficherEtatTemporaire(etat: EtatCopie): void {
    this.arreterMinuteur();
    this.etat.set(etat);
    this.minuteurRetourInactif = setTimeout(() => {
      this.etat.set('inactif');
    }, DUREE_CONFIRMATION_MS);
  }

  /**
   * Désarme le minuteur de retour à l'état initial, sans modifier l'état actuellement affiché.
   */
  private arreterMinuteur(): void {
    clearTimeout(this.minuteurRetourInactif);
    this.minuteurRetourInactif = undefined;
  }
}
