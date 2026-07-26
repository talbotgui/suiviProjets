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
//   Paramétrage). Seules les entrées dont l'écran existe déjà (Accueil, Synthèse des audits depuis la Phase 6
//   incrément 4, Synthèse graphique depuis la Phase 6 incrément 7, Audits, Administration) portent une navigation
//   active ; les deux entrées restantes, dont l'écran n'est pas encore construit (Liste de travail et Paramétrage,
//   hors Phase 6), sont rendues non interactives (`aria-disabled`, sur le modèle de la section « À VENIR » de la
//   maquette de référence) plutôt que de pointer vers une route inexistante : ce choix respecte le critère de
//   sortie de chaque incrément (« navigation shell fonctionnelle entre tous les écrans EXISTANTS »).
// - L'entrée « Audits » applique la règle de routage intelligent documentée par `08_arborescenceNavigation.md`
//   (« ouvre par défaut Constitution de campagne ; ouvre le Tableau de bord d'exécution si une campagne est en
//   cours ; ouvre l'écran de Brouillon si un brouillon reste à traiter ») : sa cible n'étant pas statique, elle est
//   un bouton (navigation programmatique) plutôt qu'un lien `routerLink`, seul moyen de recalculer sa destination à
//   chaque activation à partir de `EtatSessionService.progressionCampagne`/`DonneesApplicationService.racine()?.
//   brouillon`, déjà exposés par les Stores existants (Phase 5).
// - La recherche transversale, la gestion des credentials et le verrouillage manuel, documentés comme actions de la
//   barre supérieure (et non de la sidebar) par `08_arborescenceNavigation.md#règles-de-navigation`, sont rendus en
//   boutons désactivés (« à venir », aucun de ces trois écrans n'existant avant les phases suivantes du plan),
//   plutôt qu'omis silencieusement : l'emplacement prévu par la charte de navigation reste ainsi visible.
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../services/avecetat/etat/etat-session.service';

/**
 * Shell applicatif : sidebar de navigation persistante et barre supérieure, communs à tous les écrans du shell
 * (`app.routes.ts`), avec zone de contenu portée par un `<router-outlet>` enfant.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class SqmShellComponent {
  private readonly router: Router = inject(Router);
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly etatSession: EtatSessionService = inject(EtatSessionService);

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
    return `sauvegardé ${this.formaterHorodatage(racine.meta.modifieLe)}`;
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
   * Met en forme un horodatage ISO 8601 en un libellé court `JJ/MM HH:mm`, sur le modèle de la maquette de
   * référence (`docs/01_besoin/Suivi Qualimetrie.dc.html`, barre supérieure : « sauvegardé 08/07 17:45 »).
   * @param horodatageIso - Horodatage ISO 8601 à mettre en forme.
   * @returns Le libellé court correspondant.
   */
  private formaterHorodatage(horodatageIso: string): string {
    const date = new Date(horodatageIso);
    const deuxChiffres = (valeur: number): string => valeur.toString().padStart(2, '0');
    return `${deuxChiffres(date.getDate())}/${deuxChiffres(date.getMonth() + 1)} ${deuxChiffres(date.getHours())}:${deuxChiffres(date.getMinutes())}`;
  }
}
