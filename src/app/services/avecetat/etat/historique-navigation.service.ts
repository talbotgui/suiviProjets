// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Store d'état applicatif de l'historique de navigation interne (plan_16, incrément 5 — RG-052, US-052). Tient une
// pile ordonnée d'URLs applicatives et un index courant, alimentés par les évènements de fin de navigation du
// routeur, et pilote les boutons Reculer/Avancer de la barre supérieure du shell (`shell.component.ts`).
//
// Ce service ne s'appuie volontairement pas sur `Location.back()`/`Location.forward()` de `@angular/common` : le
// navigateur n'expose pas si une navigation « avant » reste possible (le bouton Avancer ne pourrait donc pas être
// désactivé correctement) et son historique inclut des entrées hors application. La pile est ici strictement
// interne à l'application.
//
// Cycle de vie de portée session (RG-052), calqué sur celui du filtre groupe/projet partagé
// (`ContexteConsultationService`) : l'historique est conservé au verrouillage et restauré au déverrouillage (ce
// service n'observe pas `EtatSessionService`), et purgé lors d'un changement de fichier de données (chargement
// d'un autre fichier, création, fermeture), sur le même déclencheur que la purge des credentials —
// `DonneesApplicationService.chargerRacine`/`reinitialiser` invoquent `reinitialiser()`.
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Clé de l'état de navigation (`NavigationExtras.state`) marquant un déplacement piloté par l'historique
 * (Reculer/Avancer), à ne pas ré-empiler comme une navigation normale.
 */
export const ETAT_DEPLACEMENT_HISTORIQUE = 'deplacementHistorique';

/**
 * Store d'état applicatif de l'historique de navigation interne (RG-052). Expose la possibilité de reculer ou
 * d'avancer et les deux déplacements correspondants, consommés par la barre supérieure du shell.
 */
@Injectable({ providedIn: 'root' })
export class HistoriqueNavigationService {
  private readonly router: Router = inject(Router);

  /** Pile ordonnée d'URLs applicatives visitées, de la plus ancienne à la plus récente. */
  private readonly pileInterne: WritableSignal<readonly string[]> = signal<readonly string[]>([]);

  /** Index de l'URL courante dans {@link pileInterne} ; `-1` tant que la pile est vide. */
  private readonly indexInterne: WritableSignal<number> = signal(-1);

  /**
   * Indique qu'une entrée d'historique antérieure existe (le bouton Reculer est actif).
   */
  public readonly peutReculer: Signal<boolean> = computed(() => this.indexInterne() > 0);

  /**
   * Indique qu'une entrée d'historique postérieure existe (le bouton Avancer est actif).
   */
  public readonly peutAvancer: Signal<boolean> = computed(
    () => this.indexInterne() < this.pileInterne().length - 1,
  );

  /**
   * Amorce la pile avec l'URL courante puis s'abonne aux fins de navigation du routeur pour la tenir à jour.
   */
  public constructor() {
    this.enregistrerNavigation(this.router.url, false);
    this.router.events
      .pipe(
        filter((evenement): evenement is NavigationEnd => evenement instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((evenement) =>
        this.enregistrerNavigation(evenement.urlAfterRedirects, this.estDeplacementHistorique()),
      );
  }

  /**
   * Indique si la navigation qui vient de s'achever a été déclenchée par {@link reculer} ou {@link avancer} (état
   * `deplacementHistorique` posé par {@link deplacerVers}), et ne doit donc pas être ré-empilée.
   * @returns `true` s'il s'agit d'un déplacement d'historique.
   */
  private estDeplacementHistorique(): boolean {
    const etat: unknown =
      this.router.getCurrentNavigation()?.extras.state?.[ETAT_DEPLACEMENT_HISTORIQUE];
    return etat === true;
  }

  /**
   * Recule d'une entrée dans l'historique, sans empiler de nouvelle entrée. Sans effet si aucune entrée antérieure
   * n'existe ({@link peutReculer} vaut `false`).
   */
  public reculer(): void {
    if (!this.peutReculer()) {
      return;
    }
    this.deplacerVers(this.indexInterne() - 1);
  }

  /**
   * Avance d'une entrée dans l'historique, sans empiler de nouvelle entrée. Sans effet si aucune entrée postérieure
   * n'existe ({@link peutAvancer} vaut `false`).
   */
  public avancer(): void {
    if (!this.peutAvancer()) {
      return;
    }
    this.deplacerVers(this.indexInterne() + 1);
  }

  /**
   * Purge intégralement l'historique (RG-052). Invoqué par `DonneesApplicationService` au changement de fichier de
   * données (chargement d'un autre fichier, création, fermeture) ; jamais au verrouillage.
   */
  public reinitialiser(): void {
    this.pileInterne.set([]);
    this.indexInterne.set(-1);
  }

  /**
   * Navigue vers l'URL de la pile désignée par `index`, en marquant la navigation comme un déplacement d'historique
   * (état `deplacementHistorique`) pour que {@link enregistrerNavigation} ne la ré-empile pas. L'index est
   * positionné immédiatement sur la cible exacte connue (une même URL peut figurer plusieurs fois dans la pile, de
   * façon non consécutive) puis restauré si la navigation échoue ou est annulée.
   * @param index - Index cible dans {@link pileInterne}.
   */
  private deplacerVers(index: number): void {
    const indexPrecedent = this.indexInterne();
    this.indexInterne.set(index);
    void this.router
      .navigateByUrl(this.pileInterne()[index], {
        state: { [ETAT_DEPLACEMENT_HISTORIQUE]: true },
      })
      .then((succes) => {
        if (!succes) {
          this.indexInterne.set(indexPrecedent);
        }
      });
  }

  /**
   * Prend en compte une fin de navigation : ignore les déplacements d'historique (index déjà positionné par
   * {@link deplacerVers}) et les navigations vers l'URL déjà courante, tronque la branche « avant » si l'index
   * n'était pas en fin de pile, puis empile la nouvelle URL et positionne l'index dessus.
   * @param url - URL applicative désormais affichée (après redirections).
   * @param estDeplacementHistorique - `true` si la navigation provient de {@link reculer}/{@link avancer}.
   */
  private enregistrerNavigation(url: string, estDeplacementHistorique: boolean): void {
    if (estDeplacementHistorique) {
      return;
    }
    const pile = this.pileInterne();
    const index = this.indexInterne();
    if (index >= 0 && pile[index] === url) {
      return;
    }
    const nouvellePile = [...pile.slice(0, index + 1), url];
    this.pileInterne.set(nouvellePile);
    this.indexInterne.set(nouvellePile.length - 1);
  }
}
