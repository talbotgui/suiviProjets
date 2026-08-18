// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant transverse « Modale de saisie en masse » de la charte d'ergonomie (cf.
// docs/02_documentation/10_charteErgonomie.md#composants-dinterface-réutilisables, US-043, besoin identifié en
// Phase 15, absent de `Specification.md`, cf. plan de développement C15-07) : squelette commun (zone de texte
// collé, une ligne par entrée, boutons Annuler/Valider, affichage des erreurs ligne par ligne sans bloquer la
// validation des lignes correctes) partagé entre plusieurs entités (règles de dépendances — ce développement — et,
// à terme, membres connus, cf. C15-08). Aucune logique de parsing, de validation, de regroupement ni
// d'enregistrement propre à une entité n'est codée en dur ici : le composant appelant l'injecte intégralement via
// {@link SqmModaleSaisieMasseComponent.traiter} (stratégie de traitement, cf. {@link StrategieTraitementSaisieMasse}
// ci-dessous), ce composant restant volontairement neutre (nom, sélecteur, API ne mentionnant ni dépendances ni
// membres).
//
// Décisions arbitraires de ce développement (à valider par un humain, cf. rapport de développement) :
// - La stratégie injectée couvre non seulement le parsing/la validation/le regroupement mais aussi
//   l'enregistrement effectif (boucle d'appels à la commande native propre à l'entité) : ce composant transverse
//   ne connaît donc aucune commande de la Façade, aucun type d'entité métier, ni même la notion de mot de passe du
//   fichier autrement que comme un simple champ de saisie transmis tel quel à la stratégie. Ce choix évite
//   d'empiler un second panneau de confirmation de mot de passe (`SqmConfirmationMotDePasseComponent`) par-dessus
//   cette modale : une seule ressaisie du mot de passe couvre l'ensemble du lot soumis en une fois (RG-002), plutôt
//   qu'une ressaisie par ligne/règle enregistrée, ce qui viderait de son sens l'objectif de saisie rapide en masse
//   (US-043). Le mot de passe saisi n'est jamais conservé au-delà de l'appel à {@link traiter} (effacé
//   immédiatement après, comme `SqmConfirmationMotDePasseComponent`).
// - Le texte d'aide décrivant la grammaire de saisie attendue (propre à chaque entité) est fourni par projection de
//   contenu (`<ng-content select="[slotAide]">`) plutôt qu'une chaîne de caractères en entrée : ce texte peut ainsi
//   inclure du balisage réel (ex. `<code>`) sans jamais recourir à une liaison `[innerHTML]` sur une valeur fournie
//   par l'appelant (proscrite par les normes de sécurité de ce projet, cf.
//   docs/02_documentation/15_normesSecurite.md#contrôle-des-entrées-et-sorties).
import {
  Component,
  ElementRef,
  Signal,
  effect,
  input,
  output,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { AfterViewInit, InputSignal, OutputEmitterRef, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Erreur associée à une ligne précise d'une soumission de la modale de saisie en masse (échec de validation ou
 * d'enregistrement natif), affichée sans bloquer la validation des autres lignes correctes.
 */
export interface ErreurLigneSaisieMasse {
  /** Texte exact de la ligne fautive, tel que saisi par l'utilisateur. */
  readonly ligne: string;
  /** Message explicite sur la correction attendue. */
  readonly message: string;
}

/**
 * Résultat d'une tentative de traitement (parsing, validation, regroupement puis enregistrement) d'une soumission
 * de la modale de saisie en masse, renvoyé par la {@link StrategieTraitementSaisieMasse} injectée par l'appelant.
 */
export interface ResultatTraitementSaisieMasse {
  /**
   * Texte à laisser dans la zone de saisie après ce traitement : uniquement les lignes non enregistrées avec
   * succès (invalides ou en échec d'enregistrement), pour correction ou nouvelle tentative ; chaîne vide si
   * l'intégralité de la soumission a été enregistrée avec succès.
   */
  readonly texteRestant: string;
  /** Erreurs à afficher, une par ligne en échec, dans l'ordre d'apparition. */
  readonly erreurs: readonly ErreurLigneSaisieMasse[];
  /** Nombre d'entrées effectivement enregistrées avec succès par ce traitement. */
  readonly nombreReussies: number;
}

/**
 * Stratégie de traitement d'une soumission de la modale de saisie en masse, injectée par le composant appelant :
 * parsing, validation et regroupement des lignes propres à l'entité concernée, rejet des lignes en conflit avec
 * une entrée déjà existante, puis enregistrement de chaque entrée résultante par un appel indépendant à la
 * commande native propre à cette entité. Reçoit le texte collé courant et le mot de passe du fichier ressaisi par
 * l'utilisateur pour cette soumission (RG-002).
 * @param texte - Texte actuellement présent dans la zone de saisie.
 * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur pour cette soumission.
 * @returns Le résultat du traitement, consommé par la modale pour mettre à jour son affichage.
 */
export type StrategieTraitementSaisieMasse = (
  texte: string,
  motDePasse: string,
) => Promise<ResultatTraitementSaisieMasse>;

/**
 * Modale transverse de saisie en masse (US-043) : zone de texte collé (une ligne par entrée), boutons
 * Annuler/Valider, affichage des erreurs ligne par ligne sans bloquer la validation des lignes correctes. La
 * logique de parsing/validation/regroupement/enregistrement est intégralement fournie par l'appelant via
 * {@link traiter}. N'est affichée que si le composant appelant la rend visible (aucun état de visibilité interne,
 * même patron que `SqmConfirmationSuppressionComponent`/`SqmConfirmationMotDePasseComponent`).
 */
@Component({
  selector: 'app-modale-saisie-masse',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modale-saisie-masse.component.html',
})
export class SqmModaleSaisieMasseComponent implements AfterViewInit {
  private readonly champTexte: Signal<ElementRef<HTMLTextAreaElement> | undefined> =
    viewChild<ElementRef<HTMLTextAreaElement>>('champTexte');

  /**
   * Titre affiché en tête de la modale, propre au contexte appelant (ex. « Créer des règles de dépendances en
   * masse »).
   */
  public readonly titre: InputSignal<string> = input.required<string>();

  /**
   * Texte pré-rempli dans la zone de saisie à l'ouverture de la modale (ex. dépendances non référencées déjà
   * constatées). Appliqué une seule fois, à la création de cette instance (cf. commentaire de
   * {@link texteInitialAppliqueUneFois}) : ce composant étant recréé à chaque ouverture (rendu conditionnel côté
   * appelant), aucune réapplication ultérieure n'est nécessaire ni souhaitable pendant que l'utilisateur édite le
   * texte.
   */
  public readonly texteInitial: InputSignal<string> = input<string>('');

  /**
   * Stratégie de traitement d'une soumission, propre à l'entité concernée (cf. {@link StrategieTraitementSaisieMasse}).
   */
  public readonly traiter: InputSignal<StrategieTraitementSaisieMasse> =
    input.required<StrategieTraitementSaisieMasse>();

  /**
   * Émis après chaque tentative de traitement d'une soumission (succès total, partiel ou échec total), avec le
   * résultat complet renvoyé par {@link traiter}. Le composant appelant décide, à réception, de refermer la
   * modale (succès total, aucune erreur restante) ou de la laisser ouverte (erreurs restantes, déjà reflétées par
   * l'affichage interne de cette modale).
   */
  public readonly resultatTraite: OutputEmitterRef<ResultatTraitementSaisieMasse> =
    output<ResultatTraitementSaisieMasse>();

  /**
   * Émis lorsque l'utilisateur annule la saisie sans la soumettre (bouton Annuler).
   */
  public readonly annulee: OutputEmitterRef<void> = output<void>();

  /**
   * Texte actuellement présent dans la zone de saisie.
   */
  public readonly texte: WritableSignal<string> = signal('');

  /**
   * Mot de passe du fichier actuellement saisi, jamais conservé au-delà de l'appel à {@link traiter} (RG-002).
   */
  public readonly motDePasse: WritableSignal<string> = signal('');

  /**
   * Erreurs de la dernière tentative de traitement, une par ligne en échec.
   */
  public readonly erreurs: WritableSignal<readonly ErreurLigneSaisieMasse[]> = signal([]);

  /**
   * Message d'erreur global de validation locale (zone de texte ou mot de passe vide), distinct des erreurs par
   * ligne de {@link erreurs} (celles-ci proviennent du traitement d'une soumission déjà transmise à la stratégie).
   */
  public readonly erreurGlobale: WritableSignal<string | null> = signal(null);

  /**
   * `true` pendant l'exécution de {@link traiter} (champ et boutons désactivés), même patron que
   * `SqmConfirmationMotDePasseComponent.enCours`.
   */
  public readonly enCours: WritableSignal<boolean> = signal(false);

  /**
   * `true` dès que {@link texteInitial} a été appliqué une première fois à {@link texte}, pour ne jamais l'écraser
   * de nouveau si l'entrée venait à changer de valeur (même patron que
   * `SqmReferentielsParametrageComponent.preselectionDejaAppliquee`).
   */
  private texteInitialAppliqueUneFois = false;

  public constructor() {
    effect(() => {
      const initial = this.texteInitial();
      if (this.texteInitialAppliqueUneFois) {
        return;
      }
      this.texteInitialAppliqueUneFois = true;
      this.texte.set(initial);
    });
  }

  /**
   * Place le focus dans la zone de texte dès l'affichage de la modale (même motif que
   * `SqmConfirmationMotDePasseComponent`, hors du périmètre du rollout C15-02 qui ne concerne que les écrans
   * liste+formulaire d'administration, pas les superpositions modales).
   */
  public ngAfterViewInit(): void {
    this.champTexte()?.nativeElement.focus();
  }

  /**
   * Soumet le texte actuellement saisi à la {@link traiter} injectée, puis met à jour l'affichage (texte restant,
   * erreurs) à partir du résultat obtenu. Sans effet si un traitement est déjà en cours, si la zone de texte est
   * vide ou si le mot de passe n'a pas été saisi.
   */
  public async valider(): Promise<void> {
    if (this.enCours()) {
      return;
    }
    if (this.texte().trim().length === 0) {
      this.erreurGlobale.set('La zone de texte est vide.');
      return;
    }
    if (this.motDePasse().trim().length === 0) {
      this.erreurGlobale.set('Le mot de passe du fichier est obligatoire.');
      return;
    }
    this.erreurGlobale.set(null);
    this.enCours.set(true);
    const resultat = await this.traiter()(this.texte(), this.motDePasse());
    this.motDePasse.set('');
    this.texte.set(resultat.texteRestant);
    this.erreurs.set(resultat.erreurs);
    this.enCours.set(false);
    this.resultatTraite.emit(resultat);
  }

  /**
   * Gère l'annulation de la saisie par l'utilisateur. Sans effet pendant le traitement d'une soumission (boutons
   * désactivés à ce moment-là, cf. gabarit).
   */
  public annuler(): void {
    if (this.enCours()) {
      return;
    }
    this.annulee.emit();
  }
}
