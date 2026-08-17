// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet « Export / Import » de l'écran Paramétrage (US-029, US-030, Phase 9, incrément 3 ; RG-028, RG-029) :
// export en clair de la configuration partageable (seuils et référentiels) et import avec différentiel explicite
// (ajouts, modifications, identiques), acceptation globale ou ligne à ligne, application transactionnelle. Sur le
// même patron que `SqmPurgeParametrageComponent` (prévisualisation avant confirmation du mot de passe, RG-002),
// dont l'action d'import reprend le principe : ce composant ne recalcule jamais lui-même le différentiel ni ne
// transmet à la commande de mutation les valeurs `avant`/`apres` affichées, seulement les chemins des lignes
// acceptées — la commande native recalcule elle-même ce différentiel à partir du fichier de configuration relu, et
// rejette l'import entier si un chemin accepté ne s'y retrouve plus (état obsolète, cf. commentaire d'en-tête de
// `persistance::configuration_partageable` côté cœur natif).
//
// Sélection de fichier exclusivement via la boîte de dialogue native de l'OS (`SelecteurFichierUtils`), jamais une
// saisie libre de chemin (`docs/02_documentation/15_normesSecurite.md#contrôle-des-entrées-et-sorties`), sur le
// même modèle que `SqmDemarrageComponent` (US-001, US-002).
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type {
  CategorieLigneDifferentiel,
  DifferentielImportConfiguration,
  ErreurAdministration,
} from '../../../services/avecetat/etat/types-donnees';
import { SelecteurFichierUtils } from '../../../services/sansetat/commandes/selecteur-fichier.utils';

/** Filtre de la boîte de dialogue native, restreint au JSON de configuration partageable (F23). */
const FILTRE_FICHIER_CONFIGURATION = [
  { name: 'Configuration partageable Qualimétrie', extensions: ['json'] },
];

/** Nom de fichier proposé par défaut à l'export (US-029). */
const NOM_FICHIER_EXPORT_PAR_DEFAUT = 'configuration-qualimetrie.json';

/**
 * Onglet « Export / Import » : export de la configuration partageable (US-029) et import avec différentiel
 * explicite (US-030, RG-029).
 */
@Component({
  selector: 'app-export-import-parametrage',
  imports: [SqmConfirmationMotDePasseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './export-import-parametrage.component.html',
})
export class SqmExportImportParametrageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

  /**
   * Indique qu'un appel à une commande native est en cours, pour désactiver les actions concurrentes. Porté par un
   * signal (plutôt qu'une simple propriété) car mis à jour depuis la continuation asynchrone d'un appel natif, hors
   * de toute planification automatique de détection de changement en application zoneless (cf. `cheminCreation` de
   * `SqmDemarrageComponent`).
   */
  public readonly enCours: WritableSignal<boolean> = signal(false);

  /**
   * Différentiel de la dernière prévisualisation d'import, `null` si aucun fichier n'a encore été prévisualisé ou
   * si l'import vient d'être appliqué (ou annulé). Signal pour le même motif que {@link enCours}.
   */
  public readonly differentiel: WritableSignal<DifferentielImportConfiguration | null> =
    signal<DifferentielImportConfiguration | null>(null);

  /**
   * Chemin du fichier de configuration dont {@link differentiel} est issu, nécessaire à la confirmation de l'import
   * (relu et recalculé côté cœur natif, jamais transmis en confiance depuis la prévisualisation). Jamais lu dans le
   * template : propriété simple conservée telle quelle, sans impact sur le rendu.
   */
  private cheminConfigurationCourant: string | null = null;

  /**
   * Chemins des lignes de {@link differentiel} actuellement acceptées par l'utilisateur (RG-029 : acceptation
   * globale ou ligne à ligne). Signal pour le même motif que {@link enCours}.
   */
  public readonly lignesAcceptees: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(new Set());

  /**
   * Indique si la ressaisie du mot de passe est actuellement affichée pour la confirmation de l'import (RG-002).
   * Signal pour le même motif que {@link enCours}.
   */
  public readonly importEnAttenteMotDePasse: WritableSignal<boolean> = signal(false);

  /**
   * Ouvre la boîte de dialogue native de sélection d'emplacement puis exporte la configuration partageable
   * courante (US-029, RG-028). Aucun mot de passe requis : n'écrit jamais le fichier de données lui-même.
   */
  public async exporter(): Promise<void> {
    const chemin = await SelecteurFichierUtils.choisirEmplacementCreation({
      filters: FILTRE_FICHIER_CONFIGURATION,
      defaultPath: NOM_FICHIER_EXPORT_PAR_DEFAUT,
    });
    if (chemin === null) {
      return;
    }
    this.enCours.set(true);
    const resultat = await this.donneesApplication.exporterConfiguration(chemin);
    this.enCours.set(false);
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.notification.succes('La configuration a été exportée.');
  }

  /**
   * Ouvre la boîte de dialogue native de sélection d'un fichier de configuration existant, puis en prévisualise
   * l'import (US-030) : aucune modification ni sauvegarde à ce stade. Accepte par défaut toutes les lignes
   * d'ajout et de modification (les lignes identiques ne sont jamais sélectionnables, leur application serait un
   * no-op), l'utilisateur pouvant ensuite désélectionner ligne à ligne avant confirmation (RG-029).
   */
  public async choisirEtPrevisualiser(): Promise<void> {
    const chemin = await SelecteurFichierUtils.choisirFichierChargement({
      multiple: false,
      filters: FILTRE_FICHIER_CONFIGURATION,
    });
    if (typeof chemin !== 'string') {
      return;
    }
    this.enCours.set(true);
    const resultat = await this.donneesApplication.previsualiserImportConfiguration(chemin);
    this.enCours.set(false);
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      this.differentiel.set(null);
      this.cheminConfigurationCourant = null;
      return;
    }
    this.differentiel.set(resultat.differentiel);
    this.cheminConfigurationCourant = chemin;
    this.lignesAcceptees.set(
      SqmExportImportParametrageComponent.lignesNonIdentiques(resultat.differentiel),
    );
  }

  /**
   * Bascule l'acceptation d'une ligne du différentiel (RG-029, acceptation ligne à ligne), sans effet pour une
   * ligne identique (jamais sélectionnable).
   * @param chemin - Chemin de la ligne concernée.
   */
  public basculerLigne(chemin: string): void {
    if (!this.estLigneSelectionnable(chemin)) {
      return;
    }
    const copie = new Set(this.lignesAcceptees());
    if (copie.has(chemin)) {
      copie.delete(chemin);
    } else {
      copie.add(chemin);
    }
    this.lignesAcceptees.set(copie);
  }

  /**
   * Accepte globalement toutes les lignes d'ajout et de modification du différentiel courant (RG-029).
   */
  public toutAccepter(): void {
    const differentiel = this.differentiel();
    if (differentiel === null) {
      return;
    }
    this.lignesAcceptees.set(SqmExportImportParametrageComponent.lignesNonIdentiques(differentiel));
  }

  /**
   * Désélectionne globalement toutes les lignes du différentiel courant (RG-029).
   */
  public toutRefuser(): void {
    this.lignesAcceptees.set(new Set());
  }

  /**
   * Indique si une ligne du différentiel courant est actuellement sélectionnable (jamais une ligne identique).
   * @param chemin - Chemin de la ligne concernée.
   * @returns `true` si la ligne est sélectionnable.
   */
  public estLigneSelectionnable(chemin: string): boolean {
    return (
      this.differentiel()?.lignes.find((ligne) => ligne.chemin === chemin)?.categorie !==
      'identique'
    );
  }

  /**
   * Ouvre la ressaisie du mot de passe pour la confirmation de l'import (RG-002), si au moins une ligne est
   * actuellement acceptée.
   */
  public demanderImport(): void {
    if (this.differentiel() === null || this.lignesAcceptees().size === 0) {
      return;
    }
    this.importEnAttenteMotDePasse.set(true);
  }

  /**
   * Annule la ressaisie du mot de passe en cours, sans modifier la prévisualisation affichée.
   */
  public annulerMotDePasse(): void {
    this.importEnAttenteMotDePasse.set(false);
  }

  /**
   * Annule la prévisualisation d'import courante, sans aucune modification (RG-029 : rien n'est appliqué sans
   * confirmation explicite).
   */
  public annulerImport(): void {
    this.differentiel.set(null);
    this.cheminConfigurationCourant = null;
    this.lignesAcceptees.set(new Set());
  }

  /**
   * Importe les lignes acceptées après confirmation du mot de passe (RG-002, RG-029, US-030).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerImport(motDePasse: string): Promise<void> {
    if (this.cheminConfigurationCourant === null) {
      return;
    }
    this.enCours.set(true);
    const resultat = await this.donneesApplication.importerConfiguration(
      this.cheminConfigurationCourant,
      Array.from(this.lignesAcceptees()),
      motDePasse,
    );
    this.enCours.set(false);
    this.importEnAttenteMotDePasse.set(false);
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.differentiel.set(null);
    this.cheminConfigurationCourant = null;
    this.lignesAcceptees.set(new Set());
    this.notification.succes('La configuration importée a été appliquée.');
  }

  /**
   * Traduit une catégorie de ligne de différentiel en libellé lisible (RG-029).
   * @param categorie - Catégorie de la ligne.
   * @returns Le libellé à afficher.
   */
  public libelleCategorie(categorie: CategorieLigneDifferentiel): string {
    switch (categorie) {
      case 'ajout':
        return 'Ajout';
      case 'modification':
        return 'Modification';
      case 'identique':
        return 'Identique';
    }
  }

  /**
   * Met en forme une valeur `avant`/`apres` d'une ligne de différentiel pour l'affichage, sans jamais recourir à
   * une injection HTML dynamique (interpolation Angular systématique côté template,
   * `docs/02_documentation/15_normesSecurite.md`).
   * @param valeur - Valeur à mettre en forme (chaîne, nombre, booléen, objet JSON, ou absente).
   * @returns Le texte affichable.
   */
  public formaterValeur(valeur: unknown): string {
    if (valeur === undefined) {
      return '—';
    }
    if (typeof valeur === 'string' || typeof valeur === 'number' || typeof valeur === 'boolean') {
      return String(valeur);
    }
    return JSON.stringify(valeur);
  }

  /**
   * Calcule l'ensemble des chemins des lignes d'ajout et de modification d'un différentiel (jamais les lignes
   * identiques), utilisé comme sélection par défaut et par « tout accepter ».
   * @param differentiel - Différentiel dont extraire les chemins.
   * @returns L'ensemble des chemins sélectionnables.
   */
  private static lignesNonIdentiques(
    differentiel: DifferentielImportConfiguration,
  ): ReadonlySet<string> {
    return new Set(
      differentiel.lignes
        .filter((ligne) => ligne.categorie !== 'identique')
        .map((ligne) => ligne.chemin),
    );
  }

  /**
   * Traduit une anomalie typée en message lisible par l'utilisateur, sans détail technique sensible.
   * @param anomalie - Anomalie remontée par la commande native.
   * @returns Le message à afficher.
   */
  private libelleAnomalie(anomalie: ErreurAdministration): string {
    switch (anomalie.type) {
      case 'fichierConfigurationIllisible':
        return 'Le fichier de configuration désigné est illisible ou introuvable.';
      case 'formatConfigurationNonReconnu':
        return "Le contenu du fichier n'est pas reconnu comme une configuration partageable valide.";
      case 'versionSchemaConfigurationSuperieure':
        return 'Ce fichier de configuration a été produit par une version plus récente de cette application.';
      case 'ligneDifferentielInconnue':
        return 'Le contenu du fichier a changé depuis la prévisualisation : recommencez.';
      case 'fichierVerrouille':
        return 'Le fichier de données est verrouillé par un autre processus.';
      case 'motDePasseOuFichierInvalide':
        return 'Mot de passe incorrect.';
      case 'sessionVerrouillee':
        return 'La session est verrouillée : déverrouillez-la avant de sauvegarder.';
      case 'motDePasseSessionDivergent':
        return 'Le mot de passe saisi ne correspond pas à celui de la session en cours.';
      case 'cleSeuilIntrouvable':
      case 'typeReferentielInconnu':
      case 'entreeReferentielInvalide':
      case 'motifNommageBranchesInvalide':
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
      case 'vueIntrouvable':
      case 'reglageApplicatifInvalide':
      case 'entreeReferentielIntrouvable':
      case 'annotationIntrouvable':
      case 'annotationSystemeNonSupprimable':
      case 'nouveauMotDePasseInvalide':
      case 'erreurInterne':
        return "Une erreur inattendue est survenue lors de l'opération.";
    }
  }
}
