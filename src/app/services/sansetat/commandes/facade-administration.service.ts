// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Client typé de la Façade de commandes, dédié à la Phase 4 (US-022 à US-024 ; RG-006 à RG-008, RG-012,
// RG-014 à RG-016, RG-023) : qualification d'un membre connu (`qualifierMembre`), suppression d'une règle de
// membre connu (`supprimerMembreConnu`) et définition de la politique d'autorisation de l'IA d'un projet
// (`definirPolitiqueIA`). Second client de la Façade, classé comme `FacadeCommandesService` sous
// `services/sansetat/commandes/` (aucun état interne conservé entre deux appels), dont il reprend le même rôle de
// frontière unique vers `invoke` (cf. commentaire d'en-tête de `facade-commandes.service.ts`).
//
// Séparé de `FacadeCommandesService` plutôt que d'y être ajouté : les commandes qu'il porte échangent la racine
// complète du fichier de données (`DonneesRacine`, typée dans `services/avecetat/etat/types-donnees.ts`), alors
// que `FacadeCommandesService` échange des types de connectivité qui lui sont propres (`types-facade.ts`). Ce
// service reste néanmoins générique sur le type concret de cette racine (paramètres de type `TDonnees`/`TReponse`
// ci-dessous) plutôt que d'importer `DonneesRacine` directement : une dépendance de `services/sansetat/` vers
// `services/avecetat/` inverserait le sens de dépendance entre les deux catégories de services autorisé par ce
// projet (`avecetat` → `sansetat`, jamais l'inverse), cf.
// docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches et le commentaire
// d'en-tête de `services/avecetat/etat/types-donnees.ts`. `DonneesApplicationService` (Store, `services/avecetat/
// etat/`) instancie ces paramètres de type avec ses propres types concrets à chaque appel, sans jamais invoquer
// `invoke` lui-même : ce service en est désormais la seule frontière pour ces trois commandes (correction de
// revue, cf. rapport de développement de cette phase — la première version de ce Store invoquait `invoke`
// directement, rompant la frontière unique documentée en en-tête de `FacadeCommandesService`).
import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

/**
 * Paramètres transmis à la commande native `qualifierMembre` (US-022, US-023), génériques sur le type concret de
 * la racine échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 */
export interface ParametresQualificationMembre<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Identifiant du groupe de rattachement de la règle qualifiée. */
  readonly groupeId: string;
  /** Identifiant de la règle à mettre à jour, absent pour une création. */
  readonly membreId: string | undefined;
  /** Motif de reconnaissance (login, email ou domaine selon `typeCritere`). */
  readonly critere: string;
  /** Type du critère de reconnaissance. */
  readonly typeCritere: string;
  /** Statut associé (interne, client, partenaire). */
  readonly statut: string;
  /** Libellé lisible optionnel. */
  readonly libelle: string | undefined;
  /** Alias courriel optionnel. */
  readonly aliasEmail: string | undefined;
  /** Origine consignée au journal des modifications (RG-023). */
  readonly origine: string;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `definirPolitiqueIA` (US-024), génériques sur le type concret de la
 * racine échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 */
export interface ParametresDefinitionPolitiqueIA<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde si la politique change réellement. */
  readonly donnees: TDonnees;
  /** Identifiant du groupe de rattachement du projet concerné. */
  readonly groupeId: string;
  /** Identifiant du projet concerné. */
  readonly projetId: string;
  /** Nouvelle valeur de la politique d'autorisation de l'IA du projet. */
  readonly iaAutorisee: boolean;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `supprimerMembreConnu` (US-023), génériques sur le type concret de la
 * racine échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 */
export interface ParametresSuppressionMembreConnu<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Identifiant du groupe de rattachement de la règle supprimée. */
  readonly groupeId: string;
  /** Identifiant de la règle à supprimer. */
  readonly membreId: string;
  /** Origine consignée au journal des modifications (RG-023). */
  readonly origine: string;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis à la commande native `enregistrerBrouillon` (US-009, US-014, Phase 5 incrément 2),
 * génériques sur le type concret de la racine échangée et des deux structures propres au brouillon (`TVerdict`,
 * `TResultatBrouillonProjet`), pour ne jamais importer ces types depuis `services/avecetat/etat/`.
 */
export interface ParametresEnregistrementBrouillon<TDonnees, TVerdict, TResultatBrouillonProjet> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Identifiant de la campagne dont ce brouillon est issu. */
  readonly campagneId: string;
  /** Date de lancement de la campagne. */
  readonly date: string;
  /** Identifiants des projets du périmètre de la campagne. */
  readonly perimetre: readonly string[];
  /** Verdicts d'exécution par projet, y compris les projets échoués ou ignorés (RG-018). */
  readonly verdicts: readonly TVerdict[];
  /** Résultats en attente de validation, par projet. */
  readonly resultatsParProjet: readonly TResultatBrouillonProjet[];
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Paramètres transmis aux commandes natives `integrerBrouillon`/`rejeterBrouillon` (US-014, Phase 5 incrément 2),
 * génériques sur le type concret de la racine échangée (`TDonnees`).
 */
export interface ParametresResolutionBrouillon<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Identifiants des projets ciblés ; absent = l'intégralité des entrées encore en attente du brouillon. */
  readonly selection?: readonly string[];
  /** Motif de rejet optionnel (ignoré par `integrerBrouillon`). */
  readonly motif?: string;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Client typé de la Façade de commandes, dédié en Phase 4 à la qualification des membres connus d'un groupe et à
 * la politique d'autorisation de l'IA d'un projet (US-022 à US-024), et en Phase 5 (incrément 2) au cycle de vie
 * du brouillon d'une campagne (US-014). Chaque méthode invoque une commande Tauri identique côté cœur natif
 * (`qualifier_membre`, `definir_politique_ia`, `supprimer_membre_connu`, `enregistrer_brouillon`,
 * `integrer_brouillon`, `rejeter_brouillon`) et reste générique sur le type concret de la racine échangée (cf.
 * commentaire d'en-tête de ce fichier) : c'est l'appelant (`DonneesApplicationService`) qui porte la connaissance
 * du type `DonneesRacine`.
 */
@Injectable({ providedIn: 'root' })
export class FacadeAdministrationService {
  /**
   * Qualifie un membre connu d'un groupe : ajoute une nouvelle règle ou met à jour une règle existante, sauvegarde
   * le fichier et consigne la modification au journal (US-022, US-023, RG-006 à RG-008, RG-012, RG-023).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresQualificationMembre}.
   * @returns La réponse de la commande native, typée par l'appelant via `TReponse`.
   */
  public async qualifierMembre<TDonnees, TReponse>(
    parametres: ParametresQualificationMembre<TDonnees>,
  ): Promise<TReponse> {
    return invoke<TReponse>('qualifier_membre', { ...parametres });
  }

  /**
   * Définit la politique d'autorisation de l'IA d'un projet, sauvegarde le fichier si elle change réellement et
   * consigne la modification au journal (US-024, RG-014 à RG-016, RG-023).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresDefinitionPolitiqueIA}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async definirPolitiqueIA<TDonnees, TReponse>(
    parametres: ParametresDefinitionPolitiqueIA<TDonnees>,
  ): Promise<TReponse> {
    return invoke<TReponse>('definir_politique_ia', { ...parametres });
  }

  /**
   * Supprime une règle de membre connu d'un groupe, sauvegarde le fichier et consigne la suppression au journal
   * (US-023, RG-023).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresSuppressionMembreConnu}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async supprimerMembreConnu<TDonnees, TReponse>(
    parametres: ParametresSuppressionMembreConnu<TDonnees>,
  ): Promise<TReponse> {
    return invoke<TReponse>('supprimer_membre_connu', { ...parametres });
  }

  /**
   * Enregistre les résultats d'une campagne dans la zone de brouillon, sauvegarde le fichier (US-009, US-014,
   * RG-019).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresEnregistrementBrouillon}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async enregistrerBrouillon<TDonnees, TVerdict, TResultatBrouillonProjet, TReponse>(
    parametres: ParametresEnregistrementBrouillon<TDonnees, TVerdict, TResultatBrouillonProjet>,
  ): Promise<TReponse> {
    return invoke<TReponse>('enregistrer_brouillon', { ...parametres });
  }

  /**
   * Intègre à l'historique des projets concernés tout ou partie des résultats en attente du brouillon courant,
   * sauvegarde le fichier (US-014).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresResolutionBrouillon}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async integrerBrouillon<TDonnees, TReponse>(
    parametres: Omit<ParametresResolutionBrouillon<TDonnees>, 'motif'>,
  ): Promise<TReponse> {
    return invoke<TReponse>('integrer_brouillon', { ...parametres });
  }

  /**
   * Rejette tout ou partie des résultats en attente du brouillon courant, sans jamais les ajouter à l'historique
   * du projet concerné, sauvegarde le fichier (US-014).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresResolutionBrouillon}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async rejeterBrouillon<TDonnees, TReponse>(
    parametres: ParametresResolutionBrouillon<TDonnees>,
  ): Promise<TReponse> {
    return invoke<TReponse>('rejeter_brouillon', { ...parametres });
  }
}
