// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran « Commits des membres » (US-060, RG-060, plan_17 chapitre 4) : vérifie que les développeurs d'un groupe
// poussent leur code régulièrement sur GitLab, et repère une inactivité prolongée annonçant un risque de perte de
// travail non partagé. L'orchestration (préparation du roster, boucle sur les membres à concurrence limitée) est
// portée par `CommitsMembresService` ; le calcul des indicateurs par la fonction pure `CadencePousseesUtils`. Cet
// écran ne fait que présenter, trier et filtrer les lignes — le tri, le filtrage et tout changement de seuil ne
// déclenchent jamais de nouvel appel réseau.
//
// Dimension RH assumée (arbitrage humain du 2026-09-02) : les indicateurs sont nominatifs ; un bandeau permanent
// non masquable rappelle que leur exploitation relève de la responsabilité RH et d'information du personnel de
// l'organisation utilisatrice (cf. `docs/02_documentation/15_normesSecurite.md`).
import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommitsMembresService } from '../../services/avecetat/commits-membres/commits-membres.service';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { HorodatageUtils } from '../../services/sansetat/jugement/horodatage.utils';
import { TypeInstance } from '../../services/sansetat/commandes/types-facade';
import type { Groupe } from '../../services/avecetat/etat/types-donnees';
import type {
  AlerteCadence,
  LigneCadencePoussees,
  StatutDeveloppeur,
} from '../../services/sansetat/jugement/cadence-poussees.utils';

/** Colonne de tri du tableau. */
type ColonneTri =
  | 'developpeur'
  | 'statut'
  | 'dernierePoussee'
  | 'joursOuvres'
  | 'poussees'
  | 'cadence'
  | 'ecart'
  | 'soiree'
  | 'score';

/** Filtre de statut du tableau (`tous` par défaut, RG-060 / décision d'architecture n° 5). */
type FiltreStatut = 'tous' | 'interne' | 'client' | 'partenaire' | 'inconnu';

/**
 * Écran « Commits des membres » (US-060, RG-060).
 */
@Component({
  selector: 'app-commits-membres',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './commits-membres.component.html',
  styleUrl: './commits-membres.component.scss',
})
export class SqmCommitsMembresComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  /** Store d'orchestration, exposé au template pour ses signaux (`enCours`, `progression`, `instantAnalyse`, …). */
  public readonly store: CommitsMembresService = inject(CommitsMembresService);

  /** Groupe applicatif sélectionné pour l'analyse. */
  public readonly groupeSelectionneId: WritableSignal<string | null> = signal<string | null>(null);
  /** Référence (chemin ou identifiant) du groupe GitLab, obligatoire pour lancer une analyse. */
  public readonly referenceGroupeGitlab: WritableSignal<string> = signal('');

  /** Colonne de tri courante (défaut : score de risque). */
  public readonly colonneTri: WritableSignal<ColonneTri> = signal<ColonneTri>('score');
  /** Sens de tri courant (`true` = décroissant, défaut). */
  public readonly triDecroissant: WritableSignal<boolean> = signal(true);
  /** Filtre de statut (défaut « tous »). */
  public readonly filtreStatut: WritableSignal<FiltreStatut> = signal<FiltreStatut>('tous');
  /** Filtre plein texte sur le développeur. */
  public readonly filtreTexte: WritableSignal<string> = signal('');
  /** Restreint aux lignes portant au moins une alerte. */
  public readonly seulementAlertes: WritableSignal<boolean> = signal(false);

  /**
   * Groupes du fichier possédant au moins une instance de type GitLab (seuls analysables).
   * @returns Les groupes analysables, dans l'ordre du fichier.
   */
  public readonly groupesAnalysables: Signal<readonly Groupe[]> = computed(() =>
    this.donneesApplication
      .groupes()
      .filter((groupe) =>
        groupe.instances.some((instance) => instance.type === TypeInstance.Gitlab),
      ),
  );

  /**
   * Lignes du tableau après filtrage et tri (aucun appel réseau : dérivé de `store.lignes()`).
   * @returns Les lignes à afficher.
   */
  public readonly lignesAffichees: Signal<readonly LigneCadencePoussees[]> = computed(() => {
    const texte = this.filtreTexte().trim().toLowerCase();
    const statut = this.filtreStatut();
    const seulementAlertes = this.seulementAlertes();
    const filtrees = this.store.lignes().filter((ligne) => {
      if (statut !== 'tous' && ligne.statut !== statut) {
        return false;
      }
      if (seulementAlertes && ligne.alertes.length === 0) {
        return false;
      }
      if (texte.length > 0) {
        return (
          ligne.username.toLowerCase().includes(texte) || ligne.nom.toLowerCase().includes(texte)
        );
      }
      return true;
    });
    return [...filtrees].sort((a, b) => this.comparer(a, b));
  });

  /**
   * Message signalant que le groupe sélectionné déclare plusieurs instances GitLab (seule la première interrogée).
   * @returns Le message, ou chaîne vide.
   */
  public readonly messagePlusieursInstances: Signal<string> = computed(() => {
    if (!this.store.plusieursInstancesGitlab()) {
      return '';
    }
    const nom = this.store.premiereInstanceGitlabNom();
    return `Le groupe déclare plusieurs instances GitLab ; seule la première${
      nom !== null ? ` (${nom})` : ''
    } est interrogée.`;
  });

  /**
   * Nombre de développeurs du tableau (avant filtrage).
   * @returns Le décompte.
   */
  public readonly nombreDeveloppeurs: Signal<number> = computed(() => this.store.lignes().length);

  /**
   * Nombre de développeurs portant au moins une alerte (avant filtrage).
   * @returns Le décompte.
   */
  public readonly nombreEnAlerte: Signal<number> = computed(
    () => this.store.lignes().filter((ligne) => ligne.alertes.length > 0).length,
  );

  /**
   * Lance une analyse si un groupe est sélectionné et la référence GitLab renseignée.
   */
  public async lancerAnalyse(): Promise<void> {
    const groupeId = this.groupeSelectionneId();
    const reference = this.referenceGroupeGitlab().trim();
    if (groupeId === null || reference.length === 0) {
      return;
    }
    await this.store.analyser(groupeId, reference);
  }

  /**
   * Change la colonne de tri (ou inverse le sens si la colonne est déjà active).
   * @param colonne - Colonne cliquée.
   */
  public trierPar(colonne: ColonneTri): void {
    if (this.colonneTri() === colonne) {
      this.triDecroissant.update((decroissant) => !decroissant);
      return;
    }
    this.colonneTri.set(colonne);
    this.triDecroissant.set(true);
  }

  /**
   * Réinitialise filtres et tri à leurs valeurs par défaut.
   */
  public reinitialiserFiltres(): void {
    this.filtreStatut.set('tous');
    this.filtreTexte.set('');
    this.seulementAlertes.set(false);
    this.colonneTri.set('score');
    this.triDecroissant.set(true);
  }

  /**
   * Libellé lisible d'un statut de développeur (switch exhaustif).
   * @param statut - Statut résolu.
   * @returns Le libellé.
   */
  public libelleStatut(statut: StatutDeveloppeur): string {
    switch (statut) {
      case 'interne':
        return 'Interne';
      case 'client':
        return 'Client';
      case 'partenaire':
        return 'Partenaire';
      case 'inconnu':
        return 'Inconnu';
    }
  }

  /**
   * Libellé court d'une alerte (switch exhaustif).
   * @param alerte - Type d'alerte.
   * @returns Le libellé.
   */
  public libelleAlerte(alerte: AlerteCadence): string {
    switch (alerte) {
      case 'inactivite':
        return 'Inactivité';
      case 'ecartCadence':
        return 'Écart à la cadence';
      case 'soiree':
        return 'Poussées en soirée';
    }
  }

  /**
   * Met en forme un horodatage de poussée (`JJ/MM HH:mm`), `—` si absent.
   * @param iso - Horodatage ISO 8601, `null` si aucune poussée.
   * @returns Le libellé.
   */
  public formaterHorodatage(iso: string | null): string {
    return iso === null ? '—' : HorodatageUtils.formaterHorodatageCourt(iso);
  }

  /**
   * Met en forme une durée en heures (une décimale, virgule française), `—` si absente.
   * @param heures - Durée en heures, `null` si non calculable.
   * @returns Le libellé.
   */
  public formaterHeures(heures: number | null): string {
    return heures === null ? '—' : `${heures.toFixed(1).replace('.', ',')} h`;
  }

  /**
   * Met en forme un ratio d'écart à la cadence (`×N,N`), `—` si absent.
   * @param ecart - Ratio, `null` si non calculable.
   * @returns Le libellé.
   */
  public formaterEcart(ecart: number | null): string {
    return ecart === null ? '—' : `×${ecart.toFixed(1).replace('.', ',')}`;
  }

  /**
   * Met en forme une proportion `0..1` en pourcentage entier, `—` si absente.
   * @param proportion - Proportion, `null` si non calculable.
   * @returns Le libellé.
   */
  public formaterPourcentage(proportion: number | null): string {
    return proportion === null ? '—' : `${Math.round(proportion * 100)} %`;
  }

  /**
   * Compare deux lignes selon la colonne et le sens de tri courants. Une valeur `null` (indicateur non calculable)
   * est **toujours reléguée en fin de liste**, quel que soit le sens de tri : le sens n'est appliqué qu'à la
   * comparaison des valeurs présentes.
   * @param a - Première ligne.
   * @param b - Seconde ligne.
   * @returns Un entier de comparaison.
   */
  private comparer(a: LigneCadencePoussees, b: LigneCadencePoussees): number {
    const signe = this.triDecroissant() ? -1 : 1;
    switch (this.colonneTri()) {
      case 'developpeur':
        return signe * a.username.localeCompare(b.username);
      case 'statut':
        return signe * a.statut.localeCompare(b.statut);
      case 'poussees':
        return signe * (a.nombrePoussees - b.nombrePoussees);
      case 'score':
        return signe * (a.scoreRisque - b.scoreRisque);
      case 'dernierePoussee':
        return SqmCommitsMembresComponent.comparerNullable(
          a.dernierePousseeIso,
          b.dernierePousseeIso,
          signe,
          (x, y) => x.localeCompare(y),
        );
      case 'joursOuvres':
        return SqmCommitsMembresComponent.comparerNullable(
          a.joursOuvresDepuisDernierePoussee,
          b.joursOuvresDepuisDernierePoussee,
          signe,
          (x, y) => x - y,
        );
      case 'cadence':
        return SqmCommitsMembresComponent.comparerNullable(
          a.cadenceMedianeHeures,
          b.cadenceMedianeHeures,
          signe,
          (x, y) => x - y,
        );
      case 'ecart':
        return SqmCommitsMembresComponent.comparerNullable(
          a.ecartCadence,
          b.ecartCadence,
          signe,
          (x, y) => x - y,
        );
      case 'soiree':
        return SqmCommitsMembresComponent.comparerNullable(
          a.partSoiree,
          b.partSoiree,
          signe,
          (x, y) => x - y,
        );
    }
  }

  /**
   * Compare deux valeurs nullables. Un `null` est toujours classé après une valeur présente, **indépendamment**
   * du sens de tri (`signe`) qui n'est appliqué qu'à la comparaison de deux valeurs présentes.
   * @param a - Première valeur.
   * @param b - Seconde valeur.
   * @param signe - `-1` pour un tri décroissant, `1` pour un tri croissant.
   * @param comparer - Comparateur des valeurs présentes (croissant).
   * @returns Un entier de comparaison.
   */
  private static comparerNullable<T>(
    a: T | null,
    b: T | null,
    signe: number,
    comparer: (x: T, y: T) => number,
  ): number {
    if (a === null && b === null) {
      return 0;
    }
    if (a === null) {
      return 1;
    }
    if (b === null) {
      return -1;
    }
    return signe * comparer(a, b);
  }
}
