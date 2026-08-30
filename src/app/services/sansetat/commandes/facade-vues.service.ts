// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Client typé de la Façade de commandes, dédié à la Phase 9, incrément 1 (US-028 ; RG-027) : ajout/mise à jour
// (`definirVue`) et suppression (`supprimerVue`) d'une vue enregistrée. Cinquième client de la Façade, classé comme
// `FacadeVuesService` sous `services/sansetat/commandes/` (aucun état interne conservé entre deux appels), qui
// reprend le même rôle de frontière unique vers `invoke` que `FacadeParametrageService`/`FacadeAlertesService`, dont
// il suit exactement le même patron : chaque commande qu'il porte échange la racine complète du fichier de données
// (`DonneesRacine`, typée dans `services/avecetat/etat/types-donnees.ts`), ce service restant néanmoins générique
// sur le type concret de cette racine (paramètres de type `TDonnees`/`TReponse` ci-dessous) plutôt que de
// l'importer directement — une dépendance de `services/sansetat/` vers `services/avecetat/` inverserait le sens de
// dépendance entre les deux catégories de services autorisé par ce projet (`avecetat` → `sansetat`, jamais
// l'inverse), cf. docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches et
// le commentaire d'en-tête de `facade-administration.service.ts`. `DonneesApplicationService` (Store,
// `services/avecetat/etat/`) instancie ces paramètres de type avec ses propres types concrets à chaque appel, sans
// jamais invoquer `invoke` lui-même : ce service en est la seule frontière pour ces deux commandes.
//
// Invocation IPC passée par `InvocationCommandeUtils` (et non `invoke` directement) depuis la Phase 12 : point de
// passage unique permettant le bouchon TS des commandes ci-dessous hors contexte Tauri (`ng serve`), sur le modèle
// déjà appliqué à `FacadeAdministrationService`/`FacadeParametrageService`/`FacadeAlertesService` (cf.
// `invocation-commande.utils.ts` et `bouchon/bouchon-vues.utils.ts`) — corrige un écart constaté à cette phase : ce
// service appelait `invoke` directement jusqu'ici, en échec systématique hors contexte Tauri.
import { Injectable } from '@angular/core';
import { InvocationCommandeUtils } from './invocation-commande.utils';

/**
 * Paramètres transmis à la commande native `definirVue` (US-028), génériques sur le type concret de la racine
 * échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 */
export interface ParametresDefinitionVue<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Identifiant de la vue à mettre à jour, absent pour une création. */
  readonly id: string | undefined;
  /** Nom donné par l'utilisateur à la vue. */
  readonly nom: string;
  /** Identifiant stable de l'écran auquel s'applique la vue. */
  readonly ecran: string;
  /** Version du schéma de filtres, propre à l'écran concerné. */
  readonly versionFiltres: number;
  /** Indique si cette vue doit devenir la vue par défaut de son écran. */
  readonly parDefaut: boolean;
  /** Filtres, structure propre à l'écran concerné. */
  readonly filtres: unknown;
  /** Libellé d'origine consigné au journal des modifications pour cette mutation de vue (RG-054). */
  readonly origine: string;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `supprimerVue` (US-028), génériques sur le type concret de la racine
 * échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 */
export interface ParametresSuppressionVue<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Identifiant de la vue à supprimer. */
  readonly id: string;
  /** Libellé d'origine consigné au journal des modifications pour cette suppression de vue (RG-054). */
  readonly origine: string;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Client typé de la Façade de commandes pour les vues enregistrées (US-028, Phase 9, incrément 1). Cf. commentaire
 * d'en-tête de ce fichier pour la justification de son existence distincte de
 * `FacadeCommandesService`/`FacadeParametrageService`/`FacadeAlertesService`.
 */
@Injectable({ providedIn: 'root' })
export class FacadeVuesService {
  /**
   * Ajoute ou met à jour une vue enregistrée, sauvegarde le fichier (US-028, RG-027).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresDefinitionVue}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async definirVue<TDonnees, TReponse>(
    parametres: ParametresDefinitionVue<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('definir_vue', { ...parametres });
  }

  /**
   * Supprime une vue enregistrée par identifiant, sauvegarde le fichier (US-028).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresSuppressionVue}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async supprimerVue<TDonnees, TReponse>(
    parametres: ParametresSuppressionVue<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('supprimer_vue', { ...parametres });
  }
}
