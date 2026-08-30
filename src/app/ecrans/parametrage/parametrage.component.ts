// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Paramétrage (Phase 7, incréments 2 à 4 ; Phase 9, incrément 3 ; plan_16, incrément 4), à onglets
// conformément à `docs/02_documentation/08_arborescenceNavigation.md` (une seule ligne de la matrice écrans/US pour
// cet écran) : Seuils et référentiels (US-033), Journal des modifications (US-027), Purge des audits (US-025),
// Export/Import de configuration (US-029, US-030, RG-028, RG-029), Sécurité (US-041) et, depuis le plan_16,
// Vues enregistrées (US-054, RG-054) — administration centralisée des vues enregistrées de tous les écrans.
// Coquille à onglets sur le patron exact de `SqmAdministrationComponent` (Phase 3).
//
// Paramètres de requête `motifDependance`/`versionDependance` (`withComponentInputBinding()`, `app.config.ts`)
// ajoutés pour le seul besoin du lien « Créer une règle » de la Fiche projet (`fiche-projet.component.ts`), sur les
// dépendances « non référencées » : relayés tels quels vers `SqmReferentielsParametrageComponent`, qui porte la
// pré-ouverture du formulaire de création. Paramètre de requête `onglet` (même mécanisme) : préselectionne un
// onglet à l'arrivée, utilisé par le lien « Gérer les vues… » de `SqmSelecteurVueComponent` (plan_16 incrément 4).
import { Component, ChangeDetectionStrategy, effect, input, signal } from '@angular/core';
import type { InputSignal, WritableSignal } from '@angular/core';
import { SqmExportImportParametrageComponent } from './export-import/export-import-parametrage.component';
import { SqmJournalParametrageComponent } from './journal/journal-parametrage.component';
import { SqmPurgeParametrageComponent } from './purge/purge-parametrage.component';
import { SqmReferentielsParametrageComponent } from './referentiels/referentiels-parametrage.component';
import { SqmReglagesApplicatifsParametrageComponent } from './reglages-applicatifs/reglages-applicatifs-parametrage.component';
import { SqmSecuriteParametrageComponent } from './securite/securite-parametrage.component';
import { SqmSeuilsParametrageComponent } from './seuils/seuils-parametrage.component';
import { SqmVuesEnregistreesParametrageComponent } from './vues-enregistrees/vues-enregistrees-parametrage.component';

/**
 * Identifiant d'un onglet de l'écran Paramétrage.
 */
type OngletParametrage =
  'seuilsReferentiels' | 'journal' | 'purge' | 'exportImport' | 'securite' | 'vuesEnregistrees';

/**
 * Onglets valides, pour valider sans assertion de type la valeur brute d'un paramètre de requête `onglet`.
 */
const ONGLETS: readonly OngletParametrage[] = [
  'seuilsReferentiels',
  'journal',
  'purge',
  'exportImport',
  'securite',
  'vuesEnregistrees',
];

/**
 * Écran Paramétrage : coquille à onglets (US-033, US-027, US-025, US-028 à US-030, US-041, US-054).
 */
@Component({
  selector: 'app-parametrage',
  imports: [
    SqmSeuilsParametrageComponent,
    SqmReferentielsParametrageComponent,
    SqmReglagesApplicatifsParametrageComponent,
    SqmJournalParametrageComponent,
    SqmPurgeParametrageComponent,
    SqmExportImportParametrageComponent,
    SqmSecuriteParametrageComponent,
    SqmVuesEnregistreesParametrageComponent,
  ],
  templateUrl: './parametrage.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './parametrage.component.scss',
})
export class SqmParametrageComponent {
  /**
   * Motif à présélectionner dans le formulaire de création d'une règle de dépendances, lié au paramètre de requête
   * homonyme (cf. commentaire d'en-tête). Absent hors navigation depuis la Fiche projet.
   */
  public readonly motifDependance: InputSignal<string | undefined> = input<string>();

  /**
   * Version à présélectionner dans le formulaire de création d'une règle de dépendances, lié au paramètre de
   * requête homonyme. Cf. {@link motifDependance}.
   */
  public readonly versionDependance: InputSignal<string | undefined> = input<string>();

  /**
   * Onglet demandé par le paramètre de requête `onglet` (cf. commentaire d'en-tête). Absent hors navigation
   * ciblée : l'onglet par défaut s'applique alors.
   */
  public readonly onglet: InputSignal<string | undefined> = input<string>();

  /**
   * Onglet actuellement affiché.
   */
  public readonly ongletActif: WritableSignal<OngletParametrage> =
    signal<OngletParametrage>('seuilsReferentiels');

  public constructor() {
    // Applique une seule fois l'onglet demandé par le paramètre de requête, s'il est valide (cf. commentaire
    // d'en-tête) ; une sélection ultérieure de l'utilisateur (`selectionnerOnglet`) prime.
    effect(() => {
      const demande = this.onglet();
      const trouve = ONGLETS.find((onglet) => onglet === demande);
      if (trouve !== undefined) {
        this.ongletActif.set(trouve);
      }
    });
  }

  /**
   * Sélectionne l'onglet à afficher.
   * @param onglet - Onglet à activer.
   */
  public selectionnerOnglet(onglet: OngletParametrage): void {
    this.ongletActif.set(onglet);
  }
}
