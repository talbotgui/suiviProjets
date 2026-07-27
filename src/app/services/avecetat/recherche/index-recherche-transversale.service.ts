// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Store de l'Index de recherche transversale (US-021, F16, Phase 7 incrément 5), seul point d'entrée consommé par
// `SqmRechercheTransversaleComponent` et par la barre supérieure du Shell (`08_arborescenceNavigation.md`). Porte
// l'état interne conservé entre deux appels annoncé par le README de ce dossier : l'index construit par
// `IndexRechercheUtils.construireIndex` (`index-recherche.utils.ts`) est mémoïsé par un signal `computed`, reconstruit
// automatiquement — et seulement — lorsque `DonneesApplicationService.groupes()` change, c'est-à-dire à l'ouverture
// d'un fichier et à l'intégration d'un brouillon (`DonneesApplicationService.chargerRacine`/`integrerBrouillon`),
// jamais à chaque frappe dans le champ de recherche (`rechercher` ne fait que filtrer cet index déjà construit,
// cf. RNF-005).
import { Injectable, Signal, computed, inject } from '@angular/core';
import { DonneesApplicationService } from '../etat/donnees-application.service';
import type {
  IndexRechercheTransversale,
  OptionsRechercheTransversale,
  ResultatsRechercheTransversale,
} from './index-recherche.utils';
import { IndexRechercheUtils } from './index-recherche.utils';

/**
 * Store de l'Index de recherche transversale (US-021, F16) : maintient l'index construit à partir des données
 * actuellement chargées et expose la recherche par terme et options.
 */
@Injectable({ providedIn: 'root' })
export class IndexRechercheTransversaleService {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);

  private readonly index: Signal<IndexRechercheTransversale> = computed(() =>
    IndexRechercheUtils.construireIndex(this.donneesApplication.groupes()),
  );

  /**
   * Indique si la recherche transversale est disponible. Repli pragmatique retenu pour le cas limite documenté
   * par `docs/02_documentation/13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique`
   * (« recherche invoquée avant la fin de la construction de l'index ») : l'index de ce Store, construit par
   * transformation synchrone d'un état déjà entièrement chargé en mémoire (aucun accès disque ni réseau, à la
   * différence du module envisagé par la conception détaillée), est toujours disponible dès qu'un fichier est
   * ouvert — seule l'absence de fichier ouvert rend la recherche indisponible ici.
   * @returns `true` si un fichier de données est actuellement chargé.
   */
  public pret(): boolean {
    return this.donneesApplication.racine() !== null;
  }

  /**
   * Interroge l'index de recherche transversale par terme et options (US-021, F16).
   * @param terme - Terme recherché, saisi par l'utilisateur.
   * @param options - Options de recherche (extension à l'historique).
   * @returns Les résultats groupés par nature, plafonnés par nature.
   */
  public rechercher(
    terme: string,
    options: OptionsRechercheTransversale,
  ): ResultatsRechercheTransversale {
    return IndexRechercheUtils.rechercher(this.index(), terme, options);
  }
}
