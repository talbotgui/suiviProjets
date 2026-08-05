// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Client typé de la Façade de commandes, dédié à la Phase 8 (US-019, US-020 ; RG-026) : création d'une annotation
// de portée groupe ou projet (`creerAnnotation`) et qualification d'une alerte, statut vu/traité (`qualifierAlerte`).
// Quatrième client de la Façade, classé comme `FacadeAlertesService` sous `services/sansetat/commandes/` (aucun état
// interne conservé entre deux appels), qui reprend le même rôle de frontière unique vers `invoke` que
// `FacadeAdministrationService`/`FacadeParametrageService`, dont il suit exactement le même patron : chaque commande
// qu'il porte échange la racine complète du fichier de données (`DonneesRacine`, typée dans
// `services/avecetat/etat/types-donnees.ts`), ce service restant néanmoins générique sur le type concret de cette
// racine (paramètres de type `TDonnees`/`TReponse` ci-dessous) plutôt que de l'importer directement — une
// dépendance de `services/sansetat/` vers `services/avecetat/` inverserait le sens de dépendance entre les deux
// catégories de services autorisé par ce projet (`avecetat` → `sansetat`, jamais l'inverse), cf.
// docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches et le commentaire
// d'en-tête de `facade-administration.service.ts`. `DonneesApplicationService` (Store, `services/avecetat/etat/`)
// instancie ces paramètres de type avec ses propres types concrets à chaque appel, sans jamais invoquer `invoke`
// lui-même : ce service en est la seule frontière pour ces deux commandes.
import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { IndicateurChargementUtils } from './indicateur-chargement.utils';

/**
 * Paramètres transmis à la commande native `creerAnnotation` (US-019), génériques sur le type concret de la racine
 * échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 */
export interface ParametresCreationAnnotation<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Identifiant du groupe de rattachement de l'annotation. */
  readonly groupeId: string;
  /** Identifiant du projet de rattachement, absent pour une annotation de portée groupe. */
  readonly projetId: string | undefined;
  /** Date de l'événement annoté. */
  readonly date: string;
  /** Libellé court de l'événement. */
  readonly libelle: string;
  /** Catégorie de l'événement. */
  readonly categorie: string;
  /** Description longue optionnelle. */
  readonly description: string | undefined;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `supprimerAnnotation` (US-019, RG-033, Phase 10 incrément 8),
 * génériques sur le type concret de la racine échangée (`TDonnees`) pour ne jamais importer ce type depuis
 * `services/avecetat/etat/`.
 */
export interface ParametresSuppressionAnnotation<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Identifiant du groupe de rattachement de l'annotation. */
  readonly groupeId: string;
  /** Identifiant du projet de rattachement, absent pour une annotation de portée groupe. */
  readonly projetId: string | undefined;
  /** Identifiant de l'annotation à supprimer. */
  readonly annotationId: string;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `qualifierAlerte` (US-020), génériques sur le type concret de la racine
 * échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 */
export interface ParametresQualificationAlerte<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Clé stable de l'alerte qualifiée (RG-026). */
  readonly cleAlerte: string;
  /** Nouveau statut de traitement (générique sur `TStatut` pour ne pas importer `StatutTraitementAlerte`). */
  readonly statut: string;
  /** Commentaire libre optionnel. */
  readonly commentaire: string | undefined;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Client typé de la Façade de commandes pour les alertes et les annotations (US-019, US-020, Phase 8). Cf.
 * commentaire d'en-tête de ce fichier pour la justification de son existence distincte de
 * `FacadeCommandesService`/`FacadeAdministrationService`/`FacadeParametrageService`.
 */
@Injectable({ providedIn: 'root' })
export class FacadeAlertesService {
  /**
   * Crée une annotation de portée groupe ou projet, sauvegarde le fichier et consigne la création au journal
   * (US-019, RG-023).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresCreationAnnotation}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async creerAnnotation<TDonnees, TReponse>(
    parametres: ParametresCreationAnnotation<TDonnees>,
  ): Promise<TReponse> {
    return IndicateurChargementUtils.envelopper(() => invoke<TReponse>('creer_annotation', { ...parametres }));
  }

  /**
   * Supprime une annotation de portée groupe ou projet, sauvegarde le fichier et consigne la suppression au
   * journal (US-019, RG-023, RG-033, Phase 10 incrément 8).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresSuppressionAnnotation}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async supprimerAnnotation<TDonnees, TReponse>(
    parametres: ParametresSuppressionAnnotation<TDonnees>,
  ): Promise<TReponse> {
    return IndicateurChargementUtils.envelopper(() => invoke<TReponse>('supprimer_annotation', { ...parametres }));
  }

  /**
   * Qualifie une alerte (statut vu/traité, commentaire optionnel), sauvegarde le fichier (US-020, RG-026).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresQualificationAlerte}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async qualifierAlerte<TDonnees, TReponse>(
    parametres: ParametresQualificationAlerte<TDonnees>,
  ): Promise<TReponse> {
    return IndicateurChargementUtils.envelopper(() => invoke<TReponse>('qualifier_alerte', { ...parametres }));
  }
}
