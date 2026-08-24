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
//
// Invocation IPC passée par `InvocationCommandeUtils` (et non `invoke` directement) depuis la Phase 12 : point de
// passage unique permettant le bouchon TS des commandes ci-dessous hors contexte Tauri (`ng serve`), sur le modèle
// déjà appliqué à `FacadeAdministrationService`/`FacadeCommandesService`/`FacadeFichierService` (cf.
// `invocation-commande.utils.ts` et `bouchon/bouchon-parametrage.utils.ts`) — corrige un écart constaté à cette
// phase : ce service appelait `invoke` directement jusqu'ici, en échec systématique hors contexte Tauri.
import { Injectable } from '@angular/core';
import { InvocationCommandeUtils } from './invocation-commande.utils';

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
 * Paramètres transmis à la commande native `definirReferentiels` (US-043, RG-040, ajoutée le 2026-08-24), génériques
 * sur le type concret de la racine échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 * Symétrique plurielle de {@link ParametresDefinitionReferentiel} : `entrees` porte l'ensemble des entrées du lot,
 * enregistrées en une seule opération avec une seule sauvegarde effective du fichier (correction de performance de
 * la saisie en masse de règles de dépendances, qui appelait jusqu'ici `definirReferentiel` une fois par entrée).
 */
export interface ParametresDefinitionReferentiels<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Branche de référentiel concernée (`reglesDependances`, seule utilisée à ce jour). */
  readonly typeReferentiel: string;
  /** Entrées à ajouter ou mettre à jour, dans l'ordre où le tableau `reussites` de la réponse sera renvoyé. */
  readonly entrees: readonly unknown[];
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
 * Paramètres transmis aux commandes natives `supprimerRegleDependance`/`supprimerRegleMarqueurIA` (US-033, RG-035,
 * Phase 10 incrément 8), génériques sur le type concret de la racine échangée (`TDonnees`).
 */
export interface ParametresSuppressionEntreeReferentiel<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Identifiant de l'entrée de référentiel à supprimer. */
  readonly id: string;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `definirVerrouillage` (US-034, RG-031, Phase 10 incrément 8), générique
 * sur le type concret de la racine échangée (`TDonnees`).
 */
export interface ParametresDefinitionVerrouillage<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Délai d'inactivité, en minutes, avant verrouillage automatique. */
  readonly delaiInactiviteMinutes: number;
  /** Nombre d'échecs consécutifs de déverrouillage avant fermeture du fichier. */
  readonly echecsAvantFermeture: number;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `definirConcurrenceAudit` (US-034, RG-031, Phase 10 incrément 8).
 */
export interface ParametresDefinitionConcurrenceAudit<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Concurrence par défaut d'une campagne d'audit (RNF-004). */
  readonly concurrence: number;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `definirProxy` (US-034, RG-031, Phase 10 incrément 8).
 */
export interface ParametresDefinitionProxy<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** URL du proxy, absente ou vide pour l'effacer. */
  readonly url?: string;
  /** Chemin vers un fascicule de certificats d'autorité supplémentaire, absent ou vide pour l'effacer. */
  readonly cheminBundleCa?: string;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `definirNombreSauvegardesSecurite` (US-034, RG-003, RG-031, Phase 10
 * incrément 8).
 */
export interface ParametresDefinitionNombreSauvegardesSecurite<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Nombre de sauvegardes de sécurité horodatées conservées avant rotation. */
  readonly nombre: number;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `definirSeuilAvertissementTaille` (US-035, RG-031, RG-032, Phase 10
 * incrément 8).
 */
export interface ParametresDefinitionSeuilAvertissementTaille<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Seuil de taille, en octets, déclenchant l'avertissement contextuel de purge à la sauvegarde. */
  readonly seuilOctets: number;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `previsualiserPurgeJournal` (US-036, RG-034, Phase 10 incrément 8).
 */
export interface ParametresPrevisualisationPurgeJournal<TDonnees> {
  /** Racine des données courante. */
  readonly donnees: TDonnees;
}

/**
 * Paramètres transmis à la commande native `executerPurgeJournal` (US-036, RG-034, Phase 10 incrément 8).
 */
export interface ParametresExecutionPurgeJournal<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Client typé de la Façade de commandes pour le paramétrage des seuils et référentiels (US-033) et la purge des
 * audits anciens (US-025, Phase 7, incrément 4). Cf. commentaire d'en-tête de ce fichier pour la justification de
 * son existence distincte de `FacadeCommandesService`/`FacadeAdministrationService`. Étendu à la Phase 10,
 * incrément 8 : suppression d'une entrée de référentiel (US-033, RG-035, C10-05), réglages applicatifs (US-034,
 * RG-031, C10-01), seuil d'avertissement de taille (US-035, RG-032, C10-02) et purge du journal des modifications
 * (US-036, RG-034, C10-03). Complétée le 2026-08-24 : définition en masse d'entrées de référentiel
 * (`definirReferentiels`, US-043, RG-040), correction de performance de la saisie en masse de règles de dépendances.
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
    return InvocationCommandeUtils.invoquer<TReponse>('definir_seuil', { ...parametres });
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
    return InvocationCommandeUtils.invoquer<TReponse>('definir_referentiel', { ...parametres });
  }

  /**
   * Ajoute ou met à jour plusieurs entrées d'un même référentiel en une seule opération, sauvegarde le fichier une
   * seule fois et consigne une entrée de journal par entrée effectivement enregistrée (US-043, RG-023, RG-040).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresDefinitionReferentiels}.
   * @returns L'enveloppe `{ donnees, reussites }` de la réponse native, typée par l'appelant via `TReponse`.
   */
  public async definirReferentiels<TDonnees, TReponse>(
    parametres: ParametresDefinitionReferentiels<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('definir_referentiels', { ...parametres });
  }

  /**
   * Prévisualise une purge par densité (US-025, RG-024), sans aucune modification ni sauvegarde.
   * @param parametres - Paramètres de la commande, cf. {@link ParametresPrevisualisationPurgeDensite}.
   * @returns Le résumé de la purge qui serait effectuée, typé par l'appelant via `TReponse`.
   */
  public async previsualiserPurgeDensite<TDonnees, TReponse>(
    parametres: ParametresPrevisualisationPurgeDensite<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('previsualiser_purge_densite', {
      ...parametres,
    });
  }

  /**
   * Exécute une purge par densité, sauvegarde le fichier (US-025, RG-024).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresExecutionPurgeDensite}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async executerPurgeDensite<TDonnees, TReponse>(
    parametres: ParametresExecutionPurgeDensite<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('executer_purge_densite', { ...parametres });
  }

  /**
   * Prévisualise une purge par âge pour le mode désigné (US-025, RG-025), sans aucune modification ni sauvegarde.
   * @param parametres - Paramètres de la commande, cf. {@link ParametresPrevisualisationPurgeAge}.
   * @returns Le résumé de la purge qui serait effectuée, typé par l'appelant via `TReponse`.
   */
  public async previsualiserPurgeAge<TDonnees, TReponse>(
    parametres: ParametresPrevisualisationPurgeAge<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('previsualiser_purge_age', { ...parametres });
  }

  /**
   * Exécute une purge par âge pour le mode désigné, sauvegarde le fichier (US-025, RG-025).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresExecutionPurgeAge}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async executerPurgeAge<TDonnees, TReponse>(
    parametres: ParametresExecutionPurgeAge<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('executer_purge_age', { ...parametres });
  }

  /**
   * Supprime une entrée du référentiel des règles de dépendances, sauvegarde le fichier et consigne la
   * suppression au journal (US-033, RG-035, Phase 10 incrément 8).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresSuppressionEntreeReferentiel}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async supprimerRegleDependance<TDonnees, TReponse>(
    parametres: ParametresSuppressionEntreeReferentiel<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('supprimer_regle_dependance', {
      ...parametres,
    });
  }

  /**
   * Supprime une entrée du référentiel des règles de marqueurs IA, sauvegarde le fichier et consigne la
   * suppression au journal (US-033, RG-035, Phase 10 incrément 8).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresSuppressionEntreeReferentiel}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async supprimerRegleMarqueurIA<TDonnees, TReponse>(
    parametres: ParametresSuppressionEntreeReferentiel<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('supprimer_regle_marqueur_ia', {
      ...parametres,
    });
  }

  /**
   * Modifie les réglages de verrouillage de session, sauvegarde le fichier et consigne la modification au
   * journal (US-034, RG-031, Phase 10 incrément 8).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresDefinitionVerrouillage}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async definirVerrouillage<TDonnees, TReponse>(
    parametres: ParametresDefinitionVerrouillage<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('definir_verrouillage', { ...parametres });
  }

  /**
   * Modifie la concurrence par défaut d'une campagne d'audit, sauvegarde le fichier et consigne la modification
   * au journal (US-034, RG-031, Phase 10 incrément 8).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresDefinitionConcurrenceAudit}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async definirConcurrenceAudit<TDonnees, TReponse>(
    parametres: ParametresDefinitionConcurrenceAudit<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('definir_concurrence_audit', {
      ...parametres,
    });
  }

  /**
   * Modifie le réglage de proxy sortant, sauvegarde le fichier et consigne la modification au journal (US-034,
   * RG-031, Phase 10 incrément 8).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresDefinitionProxy}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async definirProxy<TDonnees, TReponse>(
    parametres: ParametresDefinitionProxy<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('definir_proxy', { ...parametres });
  }

  /**
   * Modifie le nombre de sauvegardes de sécurité conservées avant rotation, sauvegarde le fichier et consigne la
   * modification au journal (US-034, RG-003, RG-031, Phase 10 incrément 8).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresDefinitionNombreSauvegardesSecurite}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async definirNombreSauvegardesSecurite<TDonnees, TReponse>(
    parametres: ParametresDefinitionNombreSauvegardesSecurite<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('definir_nombre_sauvegardes_securite', {
      ...parametres,
    });
  }

  /**
   * Modifie le seuil de taille déclenchant l'avertissement contextuel de purge à la sauvegarde, sauvegarde le
   * fichier et consigne la modification au journal (US-035, RG-031, RG-032, Phase 10 incrément 8).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresDefinitionSeuilAvertissementTaille}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async definirSeuilAvertissementTaille<TDonnees, TReponse>(
    parametres: ParametresDefinitionSeuilAvertissementTaille<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('definir_seuil_avertissement_taille', {
      ...parametres,
    });
  }

  /**
   * Prévisualise une purge du journal des modifications lui-même (US-036, RG-034, Phase 10 incrément 8), limite
   * fixe de deux ans, sans aucune modification ni sauvegarde.
   * @param parametres - Paramètres de la commande, cf. {@link ParametresPrevisualisationPurgeJournal}.
   * @returns Le résumé de la purge qui serait effectuée, typé par l'appelant via `TReponse`.
   */
  public async previsualiserPurgeJournal<TDonnees, TReponse>(
    parametres: ParametresPrevisualisationPurgeJournal<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('previsualiser_purge_journal', {
      ...parametres,
    });
  }

  /**
   * Exécute une purge du journal des modifications lui-même, sauvegarde le fichier (US-036, RG-034, Phase 10
   * incrément 8).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresExecutionPurgeJournal}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async executerPurgeJournal<TDonnees, TReponse>(
    parametres: ParametresExecutionPurgeJournal<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('executer_purge_journal', { ...parametres });
  }
}
