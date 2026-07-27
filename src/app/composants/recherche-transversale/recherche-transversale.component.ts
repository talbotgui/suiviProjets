// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Recherche transversale (US-021, F16, Phase 7 incrément 5) : superposition modale accessible depuis tout écran du
// shell, conformément à `docs/02_documentation/08_arborescenceNavigation.md#règles-de-navigation` (« s'ouvre en
// superposition modale depuis n'importe quel écran du shell — raccourci clavier — et se ferme par la touche Échap
// ou par sélection d'un résultat, qui navigue alors vers la fiche concernée »). N'est montée par le Shell
// (`composants/shell/`) que lorsqu'elle doit être visible (aucun état de visibilité interne), sur le modèle de
// `SqmConfirmationSuppressionComponent` : le raccourci clavier d'ouverture et le bouton de la barre supérieure
// relèvent donc du Shell, pas de ce composant.
//
// Décision arbitraire (à valider par un humain, cf. rapport de développement de cet incrément) : sur les quatre
// natures de résultats (F16), seule la nature « entités » couvre un groupe sans écran de restitution dédié
// (aucune « fiche groupe » n'existe à ce jour, seule l'Administration permet le CRUD des groupes) ; la sélection
// d'un résultat de cette nature navigue donc vers l'Administration plutôt que de rester sans action, faute de
// cible plus précise (même pragmatisme que la Phase 5 incrément 5 : « choix pragmatiques imposés par l'absence
// d'écran cible »).
import {
  Component,
  ElementRef,
  Signal,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { AfterViewInit, OutputEmitterRef, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { IndexRechercheTransversaleService } from '../../services/avecetat/recherche/index-recherche-transversale.service';
import type {
  EntiteIndexee,
  OccurrenceDependanceIndexee,
  OccurrenceMembreIndexee,
  OccurrenceOutilIaIndexee,
  ResultatsRechercheTransversale,
} from '../../services/avecetat/recherche/index-recherche.utils';

/**
 * Recherche transversale (US-021, F16) : superposition modale interrogeant dépendances, membres et contributeurs,
 * outils IA détectés et entités structurelles, résultats groupés par nature, chaque ligne menant à la fiche
 * concernée.
 */
@Component({
  selector: 'app-recherche-transversale',
  templateUrl: './recherche-transversale.component.html',
  styleUrl: './recherche-transversale.component.scss',
})
export class SqmRechercheTransversaleComponent implements AfterViewInit {
  private readonly index: IndexRechercheTransversaleService = inject(
    IndexRechercheTransversaleService,
  );
  private readonly router: Router = inject(Router);
  private readonly champRecherche: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('champRecherche');

  /**
   * Terme actuellement saisi par l'utilisateur.
   */
  public readonly terme: WritableSignal<string> = signal('');

  /**
   * Option « inclure l'historique » (F16), décochée par défaut (recherche limitée au dernier audit intégré).
   */
  public readonly inclureHistorique: WritableSignal<boolean> = signal(false);

  /**
   * `true` si la recherche transversale est disponible (RNF-005, cf. `IndexRechercheTransversaleService.pret`).
   */
  public readonly pret: Signal<boolean> = computed(() => this.index.pret());

  /**
   * Résultats courants, groupés par nature et plafonnés par nature.
   */
  public readonly resultats: Signal<ResultatsRechercheTransversale> = computed(() =>
    this.index.rechercher(this.terme(), { inclureHistorique: this.inclureHistorique() }),
  );

  /**
   * Émis lorsque la superposition doit être démontée par le Shell appelant (fermeture explicite ou navigation).
   */
  public readonly fermee: OutputEmitterRef<void> = output<void>();

  /**
   * Place le focus dans le champ de recherche dès l'ouverture de la superposition, sans attendre une interaction
   * de la souris.
   */
  public ngAfterViewInit(): void {
    this.champRecherche()?.nativeElement.focus();
  }

  /**
   * Gère la saisie du terme recherché depuis l'événement natif du champ de recherche, sans accès non sûr à sa
   * cible (garde `instanceof`, sur le modèle de `DomTestUtils.obtenirElementNatif`).
   * @param evenement - Événement d'entrée du champ de recherche.
   */
  public gererSaisieTerme(evenement: Event): void {
    if (evenement.target instanceof HTMLInputElement) {
      this.terme.set(evenement.target.value);
    }
  }

  /**
   * Bascule l'option « inclure l'historique » (F16).
   */
  public basculerInclureHistorique(): void {
    this.inclureHistorique.update((valeurCourante) => !valeurCourante);
  }

  /**
   * Ferme la superposition sans naviguer, sur activation explicite (bouton de fermeture, touche Échap ou clic sur
   * l'arrière-plan).
   */
  public fermer(): void {
    this.fermee.emit();
  }

  /**
   * Ferme la superposition sur la touche Échap (`08_arborescenceNavigation.md` : « se ferme par la touche Échap »).
   * @param evenement - Événement clavier reçu par la superposition.
   */
  public gererTouche(evenement: KeyboardEvent): void {
    if (evenement.key === 'Escape') {
      this.fermer();
    }
  }

  /**
   * Navigue vers la Fiche projet d'une occurrence de dépendance, membre/contributeur ou outil IA, puis ferme la
   * superposition (`08_arborescenceNavigation.md` : « sélection d'un résultat, qui navigue alors vers la fiche
   * concernée »).
   * @param occurrence - Occurrence sélectionnée.
   */
  public naviguerVersOccurrence(
    occurrence: OccurrenceDependanceIndexee | OccurrenceMembreIndexee | OccurrenceOutilIaIndexee,
  ): void {
    this.naviguer(`/fiche-projet/${occurrence.projetId}`);
  }

  /**
   * Navigue vers la fiche concernée par une entité sélectionnée (Fiche projet pour un projet ou une source, faute
   * d'écran dédié à une source ; Administration pour un groupe, cf. commentaire d'en-tête), puis ferme la
   * superposition.
   * @param entite - Entité sélectionnée.
   */
  public naviguerVersEntite(entite: EntiteIndexee): void {
    if (entite.projetId !== undefined) {
      this.naviguer(`/fiche-projet/${entite.projetId}`);
      return;
    }
    this.naviguer('/administration');
  }

  /**
   * Met en forme un horodatage ISO 8601 en une date courte `JJ/MM/AAAA`, affichée en regard de chaque occurrence
   * historique.
   * @param dateIso - Horodatage ISO 8601 à mettre en forme.
   * @returns La date courte correspondante.
   */
  public formaterDate(dateIso: string): string {
    const date = new Date(dateIso);
    const deuxChiffres = (valeur: number): string => valeur.toString().padStart(2, '0');
    return `${deuxChiffres(date.getDate())}/${deuxChiffres(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  /**
   * Navigue vers une route absolue puis ferme la superposition.
   * @param route - Route absolue cible.
   */
  private naviguer(route: string): void {
    void this.router.navigateByUrl(route);
    this.fermer();
  }
}
