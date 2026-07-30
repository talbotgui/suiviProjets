// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Shell applicatif (Phase 6, incrément 3) : sidebar persistante (232px, cf. maquette de référence
// `docs/01_besoin/Suivi Qualimetrie.dc.html`) et barre supérieure, conformément à
// `docs/02_documentation/08_arborescenceNavigation.md#règles-de-navigation`. Héberge désormais tous les écrans du
// shell via un `<router-outlet>` enfant (`app.routes.ts`), résorbant la dette signalée jusqu'ici en tête de ce
// dernier fichier (écrans routés seuls, sans shell, faute d'écran d'Accueil construit).
//
// Décisions arbitraires (à valider par un humain, cf. rapport de développement de cet incrément) :
// - La sidebar reprend l'ordre exact des sept entrées énuméré par `08_arborescenceNavigation.md#règles-de-
//   navigation` (Accueil, Synthèse des audits, Synthèse graphique, Liste de travail, Audits, Administration,
//   Paramétrage). Toutes les entrées portent désormais une navigation active depuis la Phase 8 (`SqmListeTravailComponent`,
//   US-020) : jusqu'à cette phase, l'entrée « Liste de travail » était rendue non interactive (`aria-disabled`, sur
//   le modèle de la section « À VENIR » de la maquette de référence), son écran n'existant pas encore.
// - L'entrée « Audits » applique la règle de routage intelligent documentée par `08_arborescenceNavigation.md`
//   (« ouvre par défaut Constitution de campagne ; ouvre le Tableau de bord d'exécution si une campagne est en
//   cours ; ouvre l'écran de Brouillon si un brouillon reste à traiter ») : sa cible n'étant pas statique, elle est
//   un bouton (navigation programmatique) plutôt qu'un lien `routerLink`, seul moyen de recalculer sa destination à
//   chaque activation à partir de `EtatSessionService.progressionCampagne`/`DonneesApplicationService.racine()?.
//   brouillon`, déjà exposés par les Stores existants (Phase 5).
// - La gestion des credentials, documentée comme action de la barre supérieure par `08_arborescenceNavigation.md#
//   règles-de-navigation`, ouvre désormais l'écran dédié `SqmCredentialsComponent` (Phase 9, incrément 3, US-003,
//   US-004, US-031) par navigation programmatique (`ouvrirCredentials`), sur le même modèle que le bouton
//   « Audits » ci-dessous (bouton plutôt que `routerLink`, seule différence : cette cible est statique, la
//   navigation programmatique n'est retenue ici que pour conserver l'apparence de bouton déjà en place dans la
//   barre supérieure plutôt que de la reconstruire avec un lien).
// - La recherche transversale (US-021, Phase 7 incrément 5) est désormais active : `SqmRechercheTransversaleComponent`
//   n'est monté par ce Shell que lorsqu'il doit être visible (aucun état de visibilité interne, cf. commentaire
//   d'en-tête de ce composant), ouvert par le bouton de la barre supérieure ou par le raccourci clavier Ctrl+K/Cmd+K
//   (`gererRaccourciClavier`, lié sur la racine du Shell pour rester actif depuis n'importe quel écran routé, cf.
//   `08_arborescenceNavigation.md#règles-de-navigation` : « accessible depuis tout écran du shell »). Choix du
//   raccourci arbitraire (à valider par un humain, cf. rapport de développement de cet incrément), faute de
//   convention imposée par la documentation.
//
// Verrouillage manuel, sauvegarde et verrouillage automatique par inactivité (US-026, RG-001 à RG-005, RNF-014),
// câblés par la tâche de comblement du trou de chargement de fichier côté Angular (cf. rapport de diagnostic ayant
// motivé cette tâche) :
// - Le bouton 🔒, jusqu'ici désactivé, invoque désormais `DonneesApplicationService.verrouillerSession`. La
//   superposition `SqmVerrouillageComponent` n'est montée par ce Shell que lorsque `EtatSessionService.etatFichier()`
//   vaut `Verrouille`, sur le même modèle que `SqmRechercheTransversaleComponent` (aucun état de visibilité interne
//   dupliqué ici, source unique de vérité).
// - Un nouveau bouton 💾 « Sauvegarder » réutilise `SqmConfirmationMotDePasseComponent` (RG-002 : ressaisie à
//   chaque sauvegarde), déjà utilisé ailleurs pour ce même besoin (Phase 4).
// - Verrouillage automatique par inactivité (RNF-014, défaut 15 minutes en l'absence de fichier chargé, valeur
//   ensuite reprise de `parametres.verrouillage.delaiInactiviteMinutes`) : un minuteur, armé par un effet réactif
//   sur `etatFichier()` (arme à l'ouverture/au déverrouillage, désarme sinon) et réinitialisé à chaque interaction
//   utilisateur (clavier ou clic, mêmes événements globaux que `gererRaccourciClavier`), sur le modèle de mise en
//   place/nettoyage de minuteur déjà retenu par `SqmGraphiqueEvolutionComponent` (`effect()` + `DestroyRef.onDestroy`
//   plutôt qu'une implémentation de `OnDestroy`).
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SqmConfirmationMotDePasseComponent } from '../confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { SqmRechercheTransversaleComponent } from '../recherche-transversale/recherche-transversale.component';
import { SqmVerrouillageComponent } from '../verrouillage/verrouillage.component';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatFichier, EtatSessionService } from '../../services/avecetat/etat/etat-session.service';
import { HorodatageUtils } from '../../services/sansetat/jugement/horodatage.utils';

/**
 * Délai d'inactivité par défaut, en minutes, avant verrouillage automatique de la session (RNF-014), utilisé tant
 * qu'aucun fichier n'est chargé (le minuteur n'est de toute façon armé qu'à l'état `Ouvert`, cf. constructeur) ;
 * valeur reprise de `docs/01_besoin/exemple-donnees.json`, à l'identique de la constante Rust homonyme
 * (`src-tauri/src/modele/racine.rs`), aucun texte normatif ne fixant de valeur chiffrée par défaut.
 */
const DELAI_INACTIVITE_MINUTES_PAR_DEFAUT = 15;

/**
 * Shell applicatif : sidebar de navigation persistante et barre supérieure, communs à tous les écrans du shell
 * (`app.routes.ts`), avec zone de contenu portée par un `<router-outlet>` enfant.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    SqmConfirmationMotDePasseComponent,
    SqmRechercheTransversaleComponent,
    SqmVerrouillageComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class SqmShellComponent {
  private readonly router: Router = inject(Router);
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly etatSession: EtatSessionService = inject(EtatSessionService);
  private minuteurInactivite: ReturnType<typeof setTimeout> | undefined;

  /**
   * Indique si la superposition de recherche transversale est actuellement affichée (US-021).
   */
  public readonly rechercheOuverte: WritableSignal<boolean> = signal(false);

  /**
   * Indique si le panneau de confirmation du mot de passe de sauvegarde est actuellement affiché.
   */
  public readonly sauvegardeOuverte: WritableSignal<boolean> = signal(false);

  /**
   * Message d'erreur de la dernière sauvegarde tentée, `null` si aucune erreur.
   */
  public messageErreurSauvegarde: string | null = null;

  /**
   * Indique si l'avertissement de taille du fichier de données est actuellement affiché (US-035, RG-032, Phase 10
   * incrément 8) : calculé côté interface (solution B retenue par arbitrage humain, sans nouvelle commande
   * native) à partir d'une estimation de la taille sérialisée JSON de la racine, comparée au seuil paramétrable
   * `parametres.seuilAvertissementTailleOctets`. Cette estimation est volontairement approximative, à plusieurs
   * titres : elle ne reflète ni la compression (zstd) ni le chiffrement (AES-256-GCM) réellement appliqués par le
   * cœur natif à la sauvegarde (seule la taille exacte sur disque, cf. `PrevisualisationPurge.octetsAvant` de
   * l'onglet Purge, le refléterait fidèlement), ni même la taille JSON exacte en octets UTF-8 : `String.length`
   * compte des unités UTF-16, systématiquement inférieures ou égales au nombre d'octets UTF-8 réel dès qu'un
   * caractère accentué apparaît (2 octets UTF-8 pour 1 unité UTF-16) — l'estimation est donc structurellement
   * optimiste, sans conséquence pratique compte tenu de la marge laissée par le seuil par défaut (10 Mio).
   */
  public readonly avertissementTailleActif: WritableSignal<boolean> = signal(false);

  /**
   * Construit le Shell : met en place l'effet réactif qui arme ou désarme le minuteur de verrouillage automatique
   * par inactivité (RNF-014) selon l'état courant du fichier, et le désarme à la destruction du composant (cf.
   * commentaire d'en-tête de ce fichier).
   */
  public constructor() {
    effect(() => {
      if (this.etatSession.etatFichier() === EtatFichier.Ouvert) {
        this.armerMinuteurInactivite();
      } else {
        this.desarmerMinuteurInactivite();
      }
    });
    inject(DestroyRef).onDestroy(() => this.desarmerMinuteurInactivite());
  }

  /**
   * Ouvre la superposition de recherche transversale (bouton de la barre supérieure ou raccourci clavier).
   */
  public ouvrirRecherche(): void {
    this.rechercheOuverte.set(true);
  }

  /**
   * Referme la superposition de recherche transversale (fermeture explicite ou navigation vers un résultat).
   */
  public fermerRecherche(): void {
    this.rechercheOuverte.set(false);
  }

  /**
   * Ouvre la recherche transversale sur Ctrl+K/Cmd+K, réinitialise le minuteur d'inactivité (RNF-014) sur toute
   * autre frappe, quel que soit l'écran routé actuellement affiché (lié sur la racine du Shell, cf. commentaire
   * d'en-tête).
   * @param evenement - Événement clavier reçu par la racine du Shell.
   */
  public gererRaccourciClavier(evenement: KeyboardEvent): void {
    if ((evenement.ctrlKey || evenement.metaKey) && evenement.key.toLowerCase() === 'k') {
      evenement.preventDefault();
      this.ouvrirRecherche();
    }
    this.reinitialiserMinuteurInactiviteSiOuvert();
  }

  /**
   * Réinitialise le minuteur de verrouillage automatique par inactivité (RNF-014) sur tout clic reçu par la racine
   * du Shell, quel que soit l'écran routé actuellement affiché.
   */
  public gererActivitePointeur(): void {
    this.reinitialiserMinuteurInactiviteSiOuvert();
  }

  /**
   * Verrouille manuellement la session courante (US-026), sur activation du bouton 🔒 de la barre supérieure.
   */
  public async verrouillerManuellement(): Promise<void> {
    await this.donneesApplication.verrouillerSession();
  }

  /**
   * Ouvre l'écran de Gestion des credentials (bouton 🔑 de la barre supérieure, US-003, US-004, US-031).
   */
  public ouvrirCredentials(): void {
    void this.router.navigateByUrl('/credentials');
  }

  /**
   * Ouvre le panneau de confirmation du mot de passe avant sauvegarde (bouton 💾 de la barre supérieure, RG-002).
   */
  public ouvrirSauvegarde(): void {
    this.messageErreurSauvegarde = null;
    this.sauvegardeOuverte.set(true);
  }

  /**
   * Referme le panneau de confirmation du mot de passe sans sauvegarder.
   */
  public annulerSauvegarde(): void {
    this.sauvegardeOuverte.set(false);
  }

  /**
   * Sauvegarde le fichier avec le mot de passe confirmé (RG-001 à RG-003) : referme le panneau en cas de succès,
   * affiche un message d'erreur bref sinon.
   * @param motDePasse - Mot de passe confirmé par l'utilisateur.
   */
  public async confirmerSauvegarde(motDePasse: string): Promise<void> {
    const resultat = await this.donneesApplication.sauvegarderFichier(motDePasse);
    if (resultat.type === 'succes') {
      this.messageErreurSauvegarde = null;
      this.sauvegardeOuverte.set(false);
      this.avertissementTailleActif.set(this.tailleEstimeeDepasseLeSeuil());
      return;
    }
    this.messageErreurSauvegarde = 'La sauvegarde a échoué. Réessayez.';
  }

  /**
   * Estime si la taille du fichier de données dépasse le seuil d'avertissement paramétrable (US-035, RG-032),
   * d'après une sérialisation JSON approximative de la racine courante (cf. commentaire de
   * {@link avertissementTailleActif} pour les limites de cette estimation).
   * @returns `true` si l'estimation dépasse le seuil courant, `false` sinon ou si aucun fichier n'est chargé.
   */
  private tailleEstimeeDepasseLeSeuil(): boolean {
    const racine = this.donneesApplication.racine();
    if (!racine) {
      return false;
    }
    const tailleEstimeeOctets = JSON.stringify(racine).length;
    return tailleEstimeeOctets >= racine.parametres.seuilAvertissementTailleOctets;
  }

  /**
   * Referme l'avertissement de taille du fichier de données sans naviguer (US-035).
   */
  public fermerAvertissementTaille(): void {
    this.avertissementTailleActif.set(false);
  }

  /**
   * Referme l'avertissement de taille et ouvre l'écran de Paramétrage, onglets Purge des audits/Journal des
   * modifications (US-035, RG-032).
   */
  public ouvrirParametragePurge(): void {
    this.avertissementTailleActif.set(false);
    void this.router.navigateByUrl('/parametrage');
  }

  /**
   * Nom du fichier actuellement ouvert, affiché dans la barre supérieure (`08_arborescenceNavigation.md`).
   * @returns Le nom du fichier (dernier segment du chemin), ou un libellé de repli si aucun fichier n'est ouvert.
   */
  public nomFichier(): string {
    const chemin = this.etatSession.cheminFichier();
    if (chemin === null) {
      return 'Aucun fichier ouvert';
    }
    const segments = chemin.split(/[/\\]/);
    return segments.at(-1) ?? chemin;
  }

  /**
   * Statut de sauvegarde affiché dans la barre supérieure, à partir de `DonneesRacine.meta.modifieLe`.
   * @returns Un libellé de statut de sauvegarde, ou un libellé de repli si aucun fichier n'est chargé.
   */
  public statutSauvegarde(): string {
    const racine = this.donneesApplication.racine();
    if (racine === null) {
      return '—';
    }
    return `sauvegardé ${HorodatageUtils.formaterHorodatageCourt(racine.meta.modifieLe)}`;
  }

  /**
   * Indique si la session courante est verrouillée, pour monter la superposition de Verrouillage
   * (`EtatSessionService` restant privé, non exposé tel quel au template).
   * @returns `true` si la session est verrouillée.
   */
  public verrouillageActif(): boolean {
    return this.etatSession.etatFichier() === EtatFichier.Verrouille;
  }

  /**
   * Détermine si l'entrée « Audits » de la sidebar doit être matérialisée comme active, sur la base du chemin
   * actuellement affiché (bouton de navigation programmatique, non couvert par `routerLinkActive`, cf. commentaire
   * d'en-tête).
   * @returns `true` si l'écran actif appartient au périmètre Audits.
   */
  public auditsActif(): boolean {
    return this.router.url.startsWith('/audits');
  }

  /**
   * Navigue vers l'écran d'Audits pertinent, selon la règle de routage intelligent documentée par
   * `08_arborescenceNavigation.md#règles-de-navigation` : Tableau de bord d'exécution si une campagne est en cours,
   * sinon Brouillon si un brouillon reste à traiter, sinon Constitution de campagne par défaut.
   */
  public ouvrirAudits(): void {
    void this.router.navigateByUrl(this.cibleAudits());
  }

  /**
   * Calcule la cible de navigation de l'entrée « Audits » (cf. {@link ouvrirAudits}).
   * @returns Le chemin absolu de l'écran d'Audits pertinent.
   */
  private cibleAudits(): string {
    if (this.etatSession.progressionCampagne() !== null) {
      return '/audits/tableau-de-bord';
    }
    if (this.donneesApplication.racine()?.brouillon != null) {
      return '/audits/brouillon';
    }
    return '/audits/constitution-campagne';
  }

  /**
   * Réinitialise le minuteur de verrouillage automatique par inactivité (RNF-014), sans effet si le fichier n'est
   * pas actuellement à l'état `Ouvert` (rien à repousser si aucun fichier n'est ouvert ou déjà verrouillé).
   */
  private reinitialiserMinuteurInactiviteSiOuvert(): void {
    if (this.etatSession.etatFichier() === EtatFichier.Ouvert) {
      this.armerMinuteurInactivite();
    }
  }

  /**
   * Arme le minuteur de verrouillage automatique par inactivité (RNF-014), en repoussant toute échéance déjà
   * programmée.
   */
  private armerMinuteurInactivite(): void {
    this.desarmerMinuteurInactivite();
    const minutes =
      this.donneesApplication.racine()?.parametres.verrouillage.delaiInactiviteMinutes ??
      DELAI_INACTIVITE_MINUTES_PAR_DEFAUT;
    this.minuteurInactivite = setTimeout(() => {
      void this.verrouillerManuellement();
    }, minutes * 60_000);
  }

  /**
   * Désarme le minuteur de verrouillage automatique par inactivité (RNF-014), sans effet si aucune échéance n'est
   * programmée.
   */
  private desarmerMinuteurInactivite(): void {
    clearTimeout(this.minuteurInactivite);
    this.minuteurInactivite = undefined;
  }
}
