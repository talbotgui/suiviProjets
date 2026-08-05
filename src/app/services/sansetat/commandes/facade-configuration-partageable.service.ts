// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Client typé de la Façade de commandes, dédié à la Phase 9, incrément 3 (US-029, US-030 ; RG-028, RG-029) :
// export (`exporterConfiguration`), prévisualisation d'import (`previsualiserImportConfiguration`) et import
// (`importerConfiguration`) de la configuration partageable. Sixième client de la Façade, classé comme
// `FacadeConfigurationPartageableService` sous `services/sansetat/commandes/`, sur le même patron que
// `FacadeParametrageService`/`FacadeVuesService` (chemin, données complètes, paramètres métier et mot de passe en
// entrée le cas échéant, générique sur le type concret de la racine échangée plutôt que de l'importer directement
// depuis `services/avecetat/etat/`, cf. commentaire d'en-tête de `facade-vues.service.ts`).
//
// Appelle `invoke` directement plutôt que `InvocationCommandeUtils` (décision arbitraire de cet incrément, à
// valider par un humain, cf. rapport de développement) : au 2026-07-28, seules les Façades ayant réellement bloqué
// le test manuel en `ng serve` (fichier, administration, interrogations/connectivité) ont été bouchonnées via ce
// point de passage (cf. commentaire d'en-tête de `invocation-commande.utils.ts`, qui liste explicitement
// « paramétrage, alertes, vues » comme continuant d'appeler `invoke` directement) ; cette Façade, sœur de
// `FacadeParametrageService`/`FacadeVuesService` (même écran Paramétrage, même forme de commandes), suit le même
// choix plutôt que d'introduire une bouchon dédiée pour une fonctionnalité intrinsèquement liée à un vrai fichier
// du disque (export/import), peu représentative une fois simulée.
import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { IndicateurChargementUtils } from './indicateur-chargement.utils';

/**
 * Paramètres transmis à la commande native `exporterConfiguration` (US-029), générique sur le type concret de la
 * racine échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 */
export interface ParametresExportConfiguration<TDonnees> {
  /** Chemin du fichier de configuration à écrire, choisi par l'utilisateur via la boîte de dialogue native. */
  readonly chemin: string;
  /** Racine des données courante, dont seuls `referentiels` et `parametres.seuils` sont effectivement exportés. */
  readonly donnees: TDonnees;
}

/**
 * Paramètres transmis à la commande native `previsualiserImportConfiguration` (US-030), générique sur le type
 * concret de la racine échangée (`TDonnees`).
 */
export interface ParametresPrevisualisationImportConfiguration<TDonnees> {
  /** Chemin du fichier de configuration à prévisualiser, choisi par l'utilisateur via la boîte de dialogue native. */
  readonly chemin: string;
  /** Racine des données courante, base de comparaison du différentiel. */
  readonly donnees: TDonnees;
}

/**
 * Paramètres transmis à la commande native `importerConfiguration` (US-030, RG-029), génériques sur le type
 * concret de la racine échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 */
export interface ParametresImportConfiguration<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /**
   * Chemin du fichier de configuration importé, relu par le cœur natif (jamais une confiance aveugle dans le
   * différentiel prévisualisé).
   */
  readonly cheminConfiguration: string;
  /** Chemins des lignes de différentiel acceptées par l'utilisateur (globalement ou ligne à ligne, RG-029). */
  readonly cheminsAcceptes: readonly string[];
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Client typé de la Façade de commandes pour l'export et l'import de la configuration partageable (US-029,
 * US-030, Phase 9, incrément 3). Cf. commentaire d'en-tête de ce fichier pour la justification de son existence
 * distincte de `FacadeParametrageService`/`FacadeVuesService`.
 */
@Injectable({ providedIn: 'root' })
export class FacadeConfigurationPartageableService {
  /**
   * Exporte la configuration partageable courante (seuils et référentiels, RG-028) en un fichier JSON en clair au
   * chemin désigné (US-029). Ne mute ni ne sauvegarde le fichier de données.
   * @param parametres - Paramètres de la commande, cf. {@link ParametresExportConfiguration}.
   */
  public async exporterConfiguration<TDonnees>(
    parametres: ParametresExportConfiguration<TDonnees>,
  ): Promise<void> {
    await IndicateurChargementUtils.envelopper(() => invoke<void>('exporter_configuration', { ...parametres }));
  }

  /**
   * Prévisualise l'import d'un fichier de configuration partageable (US-030), sans aucune modification ni
   * sauvegarde.
   * @param parametres - Paramètres de la commande, cf. {@link ParametresPrevisualisationImportConfiguration}.
   * @returns Le différentiel calculé, typé par l'appelant via `TReponse`.
   */
  public async previsualiserImportConfiguration<TDonnees, TReponse>(
    parametres: ParametresPrevisualisationImportConfiguration<TDonnees>,
  ): Promise<TReponse> {
    return IndicateurChargementUtils.envelopper(() => invoke<TReponse>('previsualiser_import_configuration', { ...parametres }));
  }

  /**
   * Importe un fichier de configuration partageable (US-030, RG-029) : n'applique que les lignes de différentiel
   * acceptées, sauvegarde le fichier et consigne une entrée de journal par ligne réellement appliquée.
   * @param parametres - Paramètres de la commande, cf. {@link ParametresImportConfiguration}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async importerConfiguration<TDonnees, TReponse>(
    parametres: ParametresImportConfiguration<TDonnees>,
  ): Promise<TReponse> {
    return IndicateurChargementUtils.envelopper(() => invoke<TReponse>('importer_configuration', { ...parametres }));
  }
}
