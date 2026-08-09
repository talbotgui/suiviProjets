// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet « Journal des modifications » de l'écran Paramétrage (US-027, Phase 7, incrément 3 ; RG-023) :
// consultation, en lecture seule, de l'intégralité du journal des modifications de paramétrage (`DonneesRacine.
// journal`, déjà chargé en mémoire par le Store — aucune nouvelle commande de la Façade n'est nécessaire à cet
// incrément, à la différence des incréments 1 et 2 de cette phase). Le périmètre par projet de ce même journal est
// déjà restitué, filtré, par `FicheProjetComponent` (Phase 6) ; cet onglet en restitue ici la vue transversale,
// toutes origines confondues (seuil, référentiel, qualification de membre, politique IA, ref auditée d'une
// source…).
//
// Ajout Phase 10, incrément 6 (R10-16) : filtre par origine et par intervalle de dates, pagination. Décision
// arbitraire (à valider par un humain, cf. rapport de développement de cet incrément) : `origine` (`EntreeJournal.
// origine`) est une chaîne libre côté cœur natif (aucun type énuméré, cf. `src-tauri/src/modele/racine.rs`), les
// valeurs proposées par le filtre sont donc calculées dynamiquement à partir des entrées effectivement présentes
// (`origines`) plutôt que codées en dur, pour rester valides même si de nouvelles origines apparaissent. Filtre de
// date appliqué sur la seule partie `AAAA-MM-JJ` de l'horodatage ISO 8601 (comparaison de préfixe, lexicographique-
// ment fiable pour ce format), au moyen de deux champs natifs `<input type="date">`. Pagination locale au composant,
// faute de composant transverse de pagination existant dans le projet à ce jour (`SqmTableauDenseComponent` porte
// déjà tri/filtre par colonne mais aucune pagination) ; taille de page fixée arbitrairement à 20 (aucune valeur
// normative), toute modification de filtre réinitialise la page courante à 1.
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type {
  EntreeJournal,
  ErreurAdministration,
  PrevisualisationPurgeJournal,
} from '../../../services/avecetat/etat/types-donnees';

/**
 * Onglet « Journal des modifications » : restitution transversale, en lecture seule, du journal des modifications
 * de paramétrage (US-027, RG-023), avec filtre par origine et par intervalle de dates et pagination (R10-16).
 * Étendu à la Phase 10, incrément 8 (US-036, RG-034, C10-03) d'une purge du journal lui-même, limite fixe de deux
 * ans (solution A retenue par arbitrage humain, symétrique de la purge des audits par âge de
 * `SqmPurgeParametrageComponent` : prévisualisation obligatoire puis exécution après ressaisie du mot de passe).
 */
@Component({
  selector: 'app-journal-parametrage',
  imports: [FormsModule, SqmConfirmationMotDePasseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-parametrage.component.html',
})
export class SqmJournalParametrageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

  /**
   * Résumé de la dernière prévisualisation de purge du journal, `null` si aucune n'a encore été demandée ou si la
   * racine a changé depuis (purge exécutée, ou par un autre onglet, US-036).
   */
  public previsualisationPurge: PrevisualisationPurgeJournal | null = null;

  /**
   * Indique si la ressaisie du mot de passe est actuellement affichée pour l'exécution de la purge (RG-002).
   */
  public purgeEnAttenteMotDePasse = false;

  /**
   * Indique qu'un appel à une commande native de purge est en cours, pour désactiver les actions concurrentes.
   */
  public purgeEnCours = false;

  /**
   * Prévisualise une purge du journal des modifications lui-même, limite fixe de deux ans (US-036, RG-034).
   */
  public async previsualiserPurge(): Promise<void> {
    this.purgeEnCours = true;
    const resultat = await this.donneesApplication.previsualiserPurgeJournal();
    this.purgeEnCours = false;
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomaliePurge(resultat.anomalie));
      return;
    }
    this.previsualisationPurge = resultat.previsualisation;
  }

  /**
   * Ouvre la ressaisie du mot de passe pour l'exécution de la purge du journal (RG-002), si une prévisualisation
   * concernant au moins une entrée a été demandée au préalable.
   */
  public demanderExecutionPurge(): void {
    if (!this.previsualisationPurge || this.previsualisationPurge.nbEntreesSupprimees === 0) {
      return;
    }
    this.purgeEnAttenteMotDePasse = true;
  }

  /**
   * Annule la ressaisie du mot de passe en cours pour la purge du journal.
   */
  public annulerExecutionPurge(): void {
    this.purgeEnAttenteMotDePasse = false;
  }

  /**
   * Exécute la purge du journal des modifications après confirmation du mot de passe (RG-002, RG-034).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerExecutionPurge(motDePasse: string): Promise<void> {
    this.purgeEnCours = true;
    const resultat = await this.donneesApplication.executerPurgeJournal(motDePasse);
    this.purgeEnCours = false;
    this.purgeEnAttenteMotDePasse = false;
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomaliePurge(resultat.anomalie));
      return;
    }
    this.previsualisationPurge = null;
    this.notification.succes('La purge du journal des modifications a été effectuée.');
  }

  /**
   * Traduit une anomalie typée en message lisible par l'utilisateur, sans détail technique sensible (purge du
   * journal, US-036).
   * @param anomalie - Anomalie remontée par la commande native.
   * @returns Le message à afficher.
   */
  private libelleAnomaliePurge(anomalie: ErreurAdministration): string {
    switch (anomalie.type) {
      case 'fichierVerrouille':
        return 'Le fichier de données est verrouillé par un autre processus.';
      case 'motDePasseOuFichierInvalide':
        return 'Mot de passe incorrect.';
      case 'sessionVerrouillee':
        return 'La session est verrouillée : déverrouillez-la avant de purger.';
      case 'motDePasseSessionDivergent':
        return 'Le mot de passe saisi ne correspond pas à celui de la session en cours.';
      case 'reglageApplicatifInvalide':
      case 'entreeReferentielInvalide':
      case 'entreeReferentielIntrouvable':
      case 'motifNommageBranchesInvalide':
      case 'typeReferentielInconnu':
      case 'cleSeuilIntrouvable':
      case 'groupeIntrouvable':
      case 'projetIntrouvable':
      case 'membreIntrouvable':
      case 'doublonUsernameMembreConnu':
      case 'conflitReglesMembreConnu':
      case 'brouillonDejaExistant':
      case 'aucunBrouillonCourant':
      case 'projetAbsentDuBrouillon':
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
      case 'annotationIntrouvable':
      case 'annotationSystemeNonSupprimable':
      case 'erreurInterne':
        return 'Une erreur inattendue est survenue lors de la purge.';
    }
  }

  /**
   * Nombre d'entrées restituées par page (R10-16), valeur arbitraire faute de seuil normatif (cf. commentaire
   * d'en-tête).
   */
  private static readonly TAILLE_PAGE = 20;

  /**
   * Origine actuellement sélectionnée par le filtre, chaîne vide si aucun filtre d'origine n'est actif (option
   * « Toutes »).
   */
  private readonly filtreOrigine: WritableSignal<string> = signal('');

  /**
   * Borne inférieure (incluse) du filtre de date, au format `AAAA-MM-JJ`, chaîne vide si non renseignée.
   */
  private readonly filtreDateDebut: WritableSignal<string> = signal('');

  /**
   * Borne supérieure (incluse) du filtre de date, au format `AAAA-MM-JJ`, chaîne vide si non renseignée.
   */
  private readonly filtreDateFin: WritableSignal<string> = signal('');

  /**
   * Numéro de la page actuellement demandée (1-indexé), avant écrêtage au nombre de pages réellement disponible
   * (cf. {@link pageAffichee}).
   */
  private readonly pageCourante: WritableSignal<number> = signal(1);

  /**
   * Entrées du journal des modifications (RG-023) actuellement chargées, triées de la plus récente à la plus
   * ancienne (même convention de tri que le journal filtré par projet, `FicheProjetComponent`), avant application
   * des filtres et de la pagination de cet onglet.
   * @returns Les entrées du journal, triées de la plus récente à la plus ancienne.
   */
  public entrees(): readonly EntreeJournal[] {
    const journal = this.donneesApplication.racine()?.journal ?? [];
    return [...journal].sort((a, b) => (a.horodatage < b.horodatage ? 1 : -1));
  }

  /**
   * Origines distinctes présentes parmi les entrées actuellement chargées, triées alphabétiquement, utilisées pour
   * peupler le filtre d'origine (R10-16).
   */
  public readonly origines: Signal<readonly string[]> = computed(() => this.calculerOrigines());

  /**
   * Entrées du journal après application des filtres d'origine et de date courants (R10-16), avant pagination.
   */
  public readonly entreesFiltrees: Signal<readonly EntreeJournal[]> = computed(() =>
    this.calculerEntreesFiltrees(),
  );

  /**
   * Nombre total de pages disponibles pour {@link entreesFiltrees}, toujours au moins 1.
   */
  public readonly nombrePages: Signal<number> = computed(() =>
    Math.max(
      1,
      Math.ceil(this.entreesFiltrees().length / SqmJournalParametrageComponent.TAILLE_PAGE),
    ),
  );

  /**
   * Numéro de la page effectivement affichée, {@link pageCourante} écrêté à {@link nombrePages} (ex. après un
   * filtre réduisant le nombre total de résultats sous la page précédemment consultée).
   */
  public readonly pageAffichee: Signal<number> = computed(() =>
    Math.min(this.pageCourante(), this.nombrePages()),
  );

  /**
   * Entrées de la page actuellement affichée (R10-16).
   */
  public readonly entreesPage: Signal<readonly EntreeJournal[]> = computed(() =>
    this.calculerEntreesPage(),
  );

  /**
   * Valeur actuellement sélectionnée par le filtre d'origine, chaîne vide si aucun filtre n'est actif.
   * @returns L'origine sélectionnée.
   */
  public valeurFiltreOrigine(): string {
    return this.filtreOrigine();
  }

  /**
   * Valeur actuellement saisie dans le filtre de borne de date inférieure.
   * @returns La date saisie, chaîne vide si non renseignée.
   */
  public valeurFiltreDateDebut(): string {
    return this.filtreDateDebut();
  }

  /**
   * Valeur actuellement saisie dans le filtre de borne de date supérieure.
   * @returns La date saisie, chaîne vide si non renseignée.
   */
  public valeurFiltreDateFin(): string {
    return this.filtreDateFin();
  }

  /**
   * Met à jour le filtre d'origine et revient à la première page (R10-16).
   * @param origine - Origine sélectionnée, chaîne vide pour « Toutes ».
   */
  public definirFiltreOrigine(origine: string): void {
    this.filtreOrigine.set(origine);
    this.pageCourante.set(1);
  }

  /**
   * Met à jour la borne inférieure du filtre de date et revient à la première page (R10-16).
   * @param date - Date saisie au format `AAAA-MM-JJ`, chaîne vide pour ne pas borner.
   */
  public definirFiltreDateDebut(date: string): void {
    this.filtreDateDebut.set(date);
    this.pageCourante.set(1);
  }

  /**
   * Met à jour la borne supérieure du filtre de date et revient à la première page (R10-16).
   * @param date - Date saisie au format `AAAA-MM-JJ`, chaîne vide pour ne pas borner.
   */
  public definirFiltreDateFin(date: string): void {
    this.filtreDateFin.set(date);
    this.pageCourante.set(1);
  }

  /**
   * Indique si au moins un filtre (origine ou date) est actuellement actif.
   * @returns `true` si au moins un filtre est actif.
   */
  public auMoinsUnFiltreActif(): boolean {
    return (
      this.filtreOrigine().length > 0 ||
      this.filtreDateDebut().length > 0 ||
      this.filtreDateFin().length > 0
    );
  }

  /**
   * Réinitialise l'ensemble des filtres et revient à la première page.
   */
  public reinitialiserFiltres(): void {
    this.filtreOrigine.set('');
    this.filtreDateDebut.set('');
    this.filtreDateFin.set('');
    this.pageCourante.set(1);
  }

  /**
   * Indique si la page précédente est accessible.
   * @returns `true` si la page actuellement affichée n'est pas la première.
   */
  public pagePrecedenteDisponible(): boolean {
    return this.pageAffichee() > 1;
  }

  /**
   * Indique si la page suivante est accessible.
   * @returns `true` si la page actuellement affichée n'est pas la dernière.
   */
  public pageSuivanteDisponible(): boolean {
    return this.pageAffichee() < this.nombrePages();
  }

  /**
   * Passe à la page précédente, sans effet si la page actuellement affichée est déjà la première.
   */
  public pagePrecedente(): void {
    this.pageCourante.set(Math.max(1, this.pageAffichee() - 1));
  }

  /**
   * Passe à la page suivante, sans effet si la page actuellement affichée est déjà la dernière.
   */
  public pageSuivante(): void {
    this.pageCourante.set(Math.min(this.nombrePages(), this.pageAffichee() + 1));
  }

  /**
   * Met en forme une valeur `unknown` du journal (`EntreeJournal.avant`/`apres`) en texte affichable, sans accès
   * non sûr à cette valeur.
   * @param valeur - Valeur à mettre en forme.
   * @returns Le texte affichable.
   */
  public formaterValeur(valeur: unknown): string {
    if (valeur === undefined) {
      return '—';
    }
    return JSON.stringify(valeur) ?? 'indéfini';
  }

  /**
   * Calcule les origines distinctes des entrées actuellement chargées (cf. {@link origines}).
   * @returns Les origines distinctes, triées alphabétiquement.
   */
  private calculerOrigines(): readonly string[] {
    const valeurs = new Set(this.entrees().map((entree) => entree.origine));
    return Array.from(valeurs).sort((a, b) => a.localeCompare(b, 'fr'));
  }

  /**
   * Applique les filtres d'origine et de date courants aux entrées chargées (cf. {@link entreesFiltrees}).
   * @returns Les entrées filtrées.
   */
  private calculerEntreesFiltrees(): readonly EntreeJournal[] {
    const origine = this.filtreOrigine();
    const dateDebut = this.filtreDateDebut();
    const dateFin = this.filtreDateFin();
    return this.entrees().filter((entree) => {
      if (origine.length > 0 && entree.origine !== origine) {
        return false;
      }
      const dateEntree = entree.horodatage.slice(0, 10);
      if (dateDebut.length > 0 && dateEntree < dateDebut) {
        return false;
      }
      if (dateFin.length > 0 && dateEntree > dateFin) {
        return false;
      }
      return true;
    });
  }

  /**
   * Extrait les entrées de la page actuellement affichée à partir des entrées filtrées (cf. {@link entreesPage}).
   * @returns Les entrées de la page affichée.
   */
  private calculerEntreesPage(): readonly EntreeJournal[] {
    const debut = (this.pageAffichee() - 1) * SqmJournalParametrageComponent.TAILLE_PAGE;
    return this.entreesFiltrees().slice(debut, debut + SqmJournalParametrageComponent.TAILLE_PAGE);
  }
}
