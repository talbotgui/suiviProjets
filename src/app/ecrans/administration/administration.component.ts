// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Administration (Phase 3 du plan de développement, US-006, US-007, US-008 ; Phase 4, US-022 à US-024 ;
// évolution du 2026-08-31, US-055), à quatre onglets conformément à
// `docs/02_documentation/08_arborescenceNavigation.md`. Le quatrième onglet « Métriques » (US-055, RG-055) est
// porté par `SqmMetriquesAdminComponent` : volumétrie du fichier de données ouvert, en lecture seule. Le
// sous-onglet « Membres connus » (sous Groupes, US-022, US-023) est porté
// par `SqmGroupesAdminComponent` ; le contrôle « Politique IA » (sous Projets, US-024) est porté par
// `SqmProjetsAdminComponent`. Le sous-onglet « Annotations de groupe », également prévu par l'arborescence de
// navigation, est construit depuis la Phase 10, incrément 8 (C10-04, US-019 mis à jour) : porté par
// `SqmAnnotationsGroupeAdminComponent`, lui-même troisième sous-onglet de `SqmGroupesAdminComponent` (aux côtés de
// Groupes et Membres connus), et non par cet écran directement.
//
// Paramètres de requête `groupeId`/`critere`/`typeCritere`/`partiLe` (`withComponentInputBinding()`,
// `app.config.ts`) ajoutés pour le seul besoin des liens « Qualifier ce membre » et « Marquer comme parti »
// (RG-061, §8.5 du plan `plan_18`) de la Fiche projet (`fiche-projet.component.ts`) : relayés tels quels vers
// `SqmGroupesAdminComponent`, qui porte la présélection du groupe et du sous-onglet Membres connus. Aucun effet
// local ici : l'onglet par défaut de cet écran est déjà « groupes ».
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import type { InputSignal } from '@angular/core';
import { SqmGroupesAdminComponent } from './groupes/groupes-admin.component';
import { SqmMetriquesAdminComponent } from './metriques/metriques-admin.component';
import { SqmProjetsAdminComponent } from './projets/projets-admin.component';
import { SqmSourcesAdminComponent } from './sources/sources-admin.component';

/**
 * Identifiant d'un onglet de l'écran Administration.
 */
type OngletAdministration = 'groupes' | 'projets' | 'sources' | 'metriques';

/**
 * Écran Administration : coquille à quatre onglets (Groupes, Projets, Sources, Métriques), chacun porté par son
 * propre composant (US-006, US-007, US-008, US-055).
 */
@Component({
  selector: 'app-administration',
  imports: [
    SqmGroupesAdminComponent,
    SqmMetriquesAdminComponent,
    SqmProjetsAdminComponent,
    SqmSourcesAdminComponent,
  ],
  templateUrl: './administration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './administration.component.scss',
})
export class SqmAdministrationComponent {
  /**
   * Identifiant du groupe à présélectionner dans le sous-onglet Membres connus, lié au paramètre de requête
   * homonyme (cf. commentaire d'en-tête). Absent hors navigation depuis la Fiche projet.
   */
  public readonly groupeId: InputSignal<string | undefined> = input<string>();

  /**
   * Critère à pré-remplir dans le formulaire de création d'une règle de membre connu, lié au paramètre de requête
   * homonyme. Absent si aucun pré-remplissage n'est demandé (cf. commentaire d'en-tête).
   */
  public readonly critere: InputSignal<string | undefined> = input<string>();

  /**
   * Type du critère à pré-remplir, lié au paramètre de requête homonyme. Cf. {@link critere}.
   */
  public readonly typeCritere: InputSignal<string | undefined> = input<string>();

  /**
   * Date de départ à pré-remplir (lien « Marquer comme parti », RG-061), liée au paramètre de requête homonyme. Cf.
   * commentaire d'en-tête.
   */
  public readonly partiLe: InputSignal<string | undefined> = input<string>();

  /**
   * Onglet actuellement affiché.
   */
  public ongletActif: OngletAdministration = 'groupes';

  /**
   * Sélectionne l'onglet à afficher.
   * @param onglet - Onglet à activer.
   */
  public selectionnerOnglet(onglet: OngletAdministration): void {
    this.ongletActif = onglet;
  }
}
