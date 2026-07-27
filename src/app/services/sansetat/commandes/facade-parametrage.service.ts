// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Client typé de la Façade de commandes, dédié à la Phase 7, incrément 1 (US-033 ; RG-022, RG-023, RG-030) :
// modification d'un seuil de couleur (`definirSeuil`) et ajout/modification/remplacement d'une entrée de
// référentiel (`definirReferentiel`) ; étendu à l'incrément 4 (US-025 ; RG-024, RG-025) : prévisualisation et
// exécution d'une purge d'audits anciens par densité (`previsualiserPurgeDensite`/`executerPurgeDensite`) ou par
// âge (`previsualiserPurgeAge`/`executerPurgeAge`). Troisième client de la Façade, classé comme
// `FacadeParametrageService` sous `services/sansetat/commandes/` (aucun état interne conservé entre deux appels),
// qui reprend le même rôle de frontière unique vers `invoke` que `FacadeAdministrationService`, dont il suit
// exactement le même patron : chaque commande qu'il porte échange la racine complète du fichier de données
// (`DonneesRacine`, typée dans `services/avecetat/etat/types-donnees.ts`) ou un résumé dérivé de celle-ci
// (`PrevisualisationPurge`), ce service restant néanmoins générique sur le type concret de cette racine
// (paramètres de type `TDonnees`/`TReponse` ci-dessous) plutôt que de l'importer directement — une dépendance de
// `services/sansetat/` vers `services/avecetat/` inverserait le sens de dépendance entre les deux catégories de
// services autorisé par ce projet (`avecetat` → `sansetat`, jamais l'inverse), cf.
// docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches et le commentaire
// d'en-tête de `facade-administration.service.ts`. `DonneesApplicationService` (Store, `services/avecetat/etat/`)
// instancie ces paramètres de type avec ses propres types concrets à chaque appel, sans jamais invoquer `invoke`
// lui-même : ce service en est la seule frontière pour ces commandes.
import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

/**
 * Paramètres transmis à la commande native `definirSeuil` (US-033), génériques sur le type concret de la racine
 * échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 */
export interface ParametresDefinitionSeuil<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /**
   * Chemin pointé de la clé à modifier au sein de `parametres.seuils` (segments séparés par `.`, ex.
   * `vitalite.mortJours`) : convention arbitraire faute de précision documentaire sur la forme exacte de la `clé`
   * de `definirSeuil(clé, valeur)`, cf. rapport de développement de cet incrément.
   */
  readonly cle: string;
  /** Nouvelle valeur du seuil désigné. */
  readonly valeur: unknown;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `definirReferentiel` (US-033), génériques sur le type concret de la
 * racine échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 */
export interface ParametresDefinitionReferentiel<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /**
   * Branche de référentiel concernée : `reglesDependances`, `reglesMarqueursIA` (ajout/mise à jour d'une entrée
   * par `id`) ou `motifNommageBranches` (remplacement scalaire, RG-030).
   */
  readonly typeReferentiel: string;
  /**
   * Entrée à ajouter ou mettre à jour (objet portant au moins `id` pour les deux référentiels-listes) ou nouvelle
   * valeur scalaire (chaîne pour `motifNommageBranches`).
   */
  readonly entree: unknown;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `previsualiserPurgeDensite` (US-025, Phase 7, incrément 4), générique
 * sur le type concret de la racine échangée (`TDonnees`).
 */
export interface ParametresPrevisualisationPurgeDensite<TDonnees> {
  /** Racine des données courante. */
  readonly donnees: TDonnees;
}

/**
 * Paramètres transmis à la commande native `executerPurgeDensite` (US-025, Phase 7, incrément 4), génériques sur
 * le type concret de la racine échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/
 * etat/`.
 */
export interface ParametresExecutionPurgeDensite<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `previsualiserPurgeAge` (US-025, RG-025), génériques sur le type
 * concret de la racine échangée (`TDonnees`).
 */
export interface ParametresPrevisualisationPurgeAge<TDonnees> {
  /** Racine des données courante. */
  readonly donnees: TDonnees;
  /** Mode de purge par âge (`suppression` ou `agregationMensuelle`, RG-025). */
  readonly mode: string;
}

/**
 * Paramètres transmis à la commande native `executerPurgeAge` (US-025, RG-025), génériques sur le type concret de
 * la racine échangée (`TDonnees`).
 */
export interface ParametresExecutionPurgeAge<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Mode de purge par âge (`suppression` ou `agregationMensuelle`, RG-025). */
  readonly mode: string;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Client typé de la Façade de commandes pour le paramétrage des seuils et référentiels (US-033) et la purge des
 * audits anciens (US-025, Phase 7, incrément 4). Cf. commentaire d'en-tête de ce fichier pour la justification de
 * son existence distincte de `FacadeCommandesService`/`FacadeAdministrationService`.
 */
@Injectable({ providedIn: 'root' })
export class FacadeParametrageService {
  /**
   * Modifie un seuil de couleur, sauvegarde le fichier et consigne la modification au journal (US-033, RG-022,
   * RG-023).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresDefinitionSeuil}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async definirSeuil<TDonnees, TReponse>(
    parametres: ParametresDefinitionSeuil<TDonnees>,
  ): Promise<TReponse> {
    return invoke<TReponse>('definir_seuil', { ...parametres });
  }

  /**
   * Ajoute ou met à jour une entrée d'un référentiel, ou remplace le motif de nommage de branche, sauvegarde le
   * fichier et consigne la modification au journal (US-033, RG-023, RG-030).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresDefinitionReferentiel}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async definirReferentiel<TDonnees, TReponse>(
    parametres: ParametresDefinitionReferentiel<TDonnees>,
  ): Promise<TReponse> {
    return invoke<TReponse>('definir_referentiel', { ...parametres });
  }

  /**
   * Prévisualise une purge par densité (US-025, RG-024), sans aucune modification ni sauvegarde.
   * @param parametres - Paramètres de la commande, cf. {@link ParametresPrevisualisationPurgeDensite}.
   * @returns Le résumé de la purge qui serait effectuée, typé par l'appelant via `TReponse`.
   */
  public async previsualiserPurgeDensite<TDonnees, TReponse>(
    parametres: ParametresPrevisualisationPurgeDensite<TDonnees>,
  ): Promise<TReponse> {
    return invoke<TReponse>('previsualiser_purge_densite', { ...parametres });
  }

  /**
   * Exécute une purge par densité, sauvegarde le fichier (US-025, RG-024).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresExecutionPurgeDensite}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async executerPurgeDensite<TDonnees, TReponse>(
    parametres: ParametresExecutionPurgeDensite<TDonnees>,
  ): Promise<TReponse> {
    return invoke<TReponse>('executer_purge_densite', { ...parametres });
  }

  /**
   * Prévisualise une purge par âge pour le mode désigné (US-025, RG-025), sans aucune modification ni sauvegarde.
   * @param parametres - Paramètres de la commande, cf. {@link ParametresPrevisualisationPurgeAge}.
   * @returns Le résumé de la purge qui serait effectuée, typé par l'appelant via `TReponse`.
   */
  public async previsualiserPurgeAge<TDonnees, TReponse>(
    parametres: ParametresPrevisualisationPurgeAge<TDonnees>,
  ): Promise<TReponse> {
    return invoke<TReponse>('previsualiser_purge_age', { ...parametres });
  }

  /**
   * Exécute une purge par âge pour le mode désigné, sauvegarde le fichier (US-025, RG-025).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresExecutionPurgeAge}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async executerPurgeAge<TDonnees, TReponse>(
    parametres: ParametresExecutionPurgeAge<TDonnees>,
  ): Promise<TReponse> {
    return invoke<TReponse>('executer_purge_age', { ...parametres });
  }
}
