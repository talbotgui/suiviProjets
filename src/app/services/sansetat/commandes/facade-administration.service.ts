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
//
// Invocation IPC passée par `InvocationCommandeUtils` (et non `invoke` directement) depuis le 2026-07-28 : point de
// passage unique permettant le bouchon TS des huit commandes ci-dessous hors contexte Tauri (`ng serve`), cf.
// `invocation-commande.utils.ts` et `bouchon/bouchon-administration.utils.ts`. La huitième,
// `calculerMetriquesVolumetrie` (US-055, RG-055, 2026-08-31), est une commande de consultation pure (aucune
// mutation, aucun mot de passe) alimentant l'onglet « Métriques » de l'écran Administration.
import { Injectable } from '@angular/core';
import { InvocationCommandeUtils } from './invocation-commande.utils';

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
  /**
   * Date de départ optionnelle (`AAAA-MM-JJ`, RG-061) : revalidée côté cœur natif (interdite sur un critère
   * `domaineEmail`, non postérieure au jour courant).
   */
  readonly partiLe: string | undefined;
  /** Origine consignée au journal des modifications (RG-023). */
  readonly origine: string;
  /** Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002). */
  readonly motDePasse: string;
}

/**
 * Entrée d'un lot de qualifications de membres connus transmis à la commande native `qualifierMembres` (US-044,
 * RG-041) : mêmes champs qu'un appel unitaire de `qualifierMembre`, sans `membreId` (saisie en masse strictement
 * additive, uniquement des créations).
 */
export interface EntreeQualificationMembreMasse {
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
  /**
   * Date de départ optionnelle (`AAAA-MM-JJ`, RG-061), validée par ligne : une ligne invalide échoue sans bloquer
   * les autres (RG-041).
   */
  readonly partiLe: string | undefined;
}

/**
 * Paramètres transmis à la commande native `qualifierMembres` (US-044, RG-041, ajoutée le 2026-08-24), génériques
 * sur le type concret de la racine échangée (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 * Symétrique plurielle de {@link ParametresQualificationMembre} : `entrees` porte l'ensemble des entrées du lot,
 * enregistrées en une seule opération avec une seule sauvegarde effective du fichier (correction de performance de
 * la saisie en masse de membres connus, qui appelait jusqu'ici `qualifierMembre` une fois par entrée).
 */
export interface ParametresQualificationMembres<TDonnees> {
  /** Chemin du fichier de données ouvert, nécessaire à la sauvegarde effective déclenchée par cette commande. */
  readonly chemin: string;
  /** Racine des données courante, réécrite intégralement par la sauvegarde. */
  readonly donnees: TDonnees;
  /** Identifiant du groupe de rattachement des règles qualifiées. */
  readonly groupeId: string;
  /** Entrées à qualifier, dans l'ordre où le tableau `reussites` de la réponse sera renvoyé. */
  readonly entrees: readonly EntreeQualificationMembreMasse[];
  /** Origine consignée au journal des modifications (RG-023), partagée par toutes les entrées du lot. */
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
 * génériques sur le type concret de la racine échangée et des trois structures propres au brouillon (`TVerdict`,
 * `TResultatBrouillonProjet`, `TPremierCommitInterne`), pour ne jamais importer ces types depuis
 * `services/avecetat/etat/`.
 */
export interface ParametresEnregistrementBrouillon<
  TDonnees,
  TVerdict,
  TResultatBrouillonProjet,
  TPremierCommitInterne,
> {
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
  /**
   * Résultats de calcul de la date de prise en charge à appliquer aux projets correspondants lors d'une future
   * intégration du brouillon (US-058, RG-058, plan_18 incrément 6), par identifiant de projet ; absent ou vide,
   * comportement strictement inchangé. Déjà filtré côté appelant (Orchestrateur de campagne) aux seuls projets
   * dont le résultat diffère de la valeur stockée (décision 6 du plan).
   */
  readonly prisesEnCharge?: Readonly<Record<string, TPremierCommitInterne>>;
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
 * Paramètres transmis à la commande native `calculerMetriquesVolumetrie` (US-055, RG-055, ajoutée le 2026-08-31),
 * génériques sur le type concret de la racine échangée (`TDonnees`) pour ne jamais importer ce type depuis
 * `services/avecetat/etat/`. Commande de consultation pure : ni mot de passe, ni sauvegarde.
 */
export interface ParametresCalculMetriquesVolumetrie<TDonnees> {
  /** Chemin du fichier de données ouvert, ou `null` si aucun fichier n'est ouvert (jamais sauvegardé). */
  readonly chemin: string | null;
  /** Racine des données courante, sérialisée pour le calcul du poids du JSON en clair et de sa ventilation. */
  readonly donnees: TDonnees;
}

/**
 * Paramètres transmis à la commande native `calculerPriseEnChargeProjet` (US-058, RG-058, plan_18), génériques
 * sur le type concret de la racine (`TDonnees`) pour ne jamais importer ce type depuis `services/avecetat/etat/`.
 * Recherche à la demande du premier commit interne : ne persiste rien, retourne la structure calculée (l'écriture
 * chiffrée conditionnelle, décision 6 du plan, reste à la charge de l'appelant via `sauvegarderFichier`).
 */
export interface ParametresCalculPriseEnCharge<TDonnees> {
  /** Identifiant du projet dont on calcule la date de prise en charge. */
  readonly projetId: string;
  /** Racine des données courante (résolution du groupe et du projet, lecture de la borne de pages). */
  readonly donnees: TDonnees;
}

/**
 * Paramètres transmis à la commande native `empreinteReferentielInterne` (US-058, RG-058, plan_18, décision 15 :
 * seule implémentation du condensé, jamais recalculé côté interface), génériques sur le type concret de la racine.
 */
export interface ParametresEmpreinteReferentielInterne<TDonnees> {
  /** Identifiant du groupe dont on veut l'empreinte du sous-ensemble `interne` des membres connus. */
  readonly groupeId: string;
  /** Racine des données courante. */
  readonly donnees: TDonnees;
}

/**
 * Client typé de la Façade de commandes, dédié en Phase 4 à la qualification des membres connus d'un groupe et à
 * la politique d'autorisation de l'IA d'un projet (US-022 à US-024), et en Phase 5 (incrément 2) au cycle de vie
 * du brouillon d'une campagne (US-014). Complétée le 2026-08-24 par la qualification en masse de membres connus
 * (US-044, RG-041), le 2026-08-31 par la volumétrie du fichier (US-055), et par le plan_18 par le calcul à la
 * demande de la date de prise en charge d'un projet et l'empreinte du référentiel `interne` (US-058, RG-058).
 * Chaque méthode invoque une commande Tauri identique côté cœur natif (`qualifier_membre`, `qualifier_membres`,
 * `definir_politique_ia`, `supprimer_membre_connu`, `enregistrer_brouillon`, `integrer_brouillon`,
 * `rejeter_brouillon`, `calculer_metriques_volumetrie`, `calculer_prise_en_charge_projet`,
 * `empreinte_referentiel_interne`) et reste générique sur le type concret de la racine échangée (cf. commentaire
 * d'en-tête de ce fichier) : c'est l'appelant (`DonneesApplicationService`) qui porte la connaissance du type
 * `DonneesRacine`.
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
    return InvocationCommandeUtils.invoquer<TReponse>('qualifier_membre', { ...parametres });
  }

  /**
   * Qualifie plusieurs membres connus d'un même groupe en une seule opération, sauvegarde le fichier une seule fois
   * et consigne une entrée de journal par entrée effectivement enregistrée (US-044, RG-023, RG-041).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresQualificationMembres}.
   * @returns L'enveloppe `{ donnees, reussites }` de la réponse native, typée par l'appelant via `TReponse`.
   */
  public async qualifierMembres<TDonnees, TReponse>(
    parametres: ParametresQualificationMembres<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('qualifier_membres', { ...parametres });
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
    return InvocationCommandeUtils.invoquer<TReponse>('definir_politique_ia', { ...parametres });
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
    return InvocationCommandeUtils.invoquer<TReponse>('supprimer_membre_connu', { ...parametres });
  }

  /**
   * Calcule la volumétrie du fichier de données ouvert pour l'onglet « Métriques » de l'écran Administration
   * (US-055, RG-055) : poids du fichier chiffré sur disque, poids du JSON en clair de la racine et ventilation en
   * cinq postes. Consultation pure : n'écrit rien, ne redemande jamais le mot de passe.
   * @param parametres - Paramètres de la commande, cf. {@link ParametresCalculMetriquesVolumetrie}.
   * @returns Les métriques calculées, typées par l'appelant via `TReponse`.
   */
  public async calculerMetriquesVolumetrie<TDonnees, TReponse>(
    parametres: ParametresCalculMetriquesVolumetrie<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('calculer_metriques_volumetrie', {
      ...parametres,
    });
  }

  /**
   * Calcule à la demande la date de prise en charge d'un projet (premier commit interne, US-058, RG-058) : pour
   * chaque source GitLab du projet, recherche le premier commit dont l'auteur correspond à une règle de membre
   * connu `interne` du groupe, et retient la plus ancienne date obtenue. Ne persiste rien : l'appelant compare le
   * résultat à la valeur stockée (cf. `PriseEnChargeUtils.identique`) et ne sauvegarde qu'en cas de changement
   * (décision 6 du plan_18).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresCalculPriseEnCharge}.
   * @returns La structure `PremierCommitInterne` calculée, typée par l'appelant via `TReponse`.
   */
  public async calculerPriseEnChargeProjet<TDonnees, TReponse>(
    parametres: ParametresCalculPriseEnCharge<TDonnees>,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('calculer_prise_en_charge_projet', {
      ...parametres,
    });
  }

  /**
   * Retourne l'empreinte (`sha256:…`) du sous-ensemble `interne` des membres connus d'un groupe (US-058, RG-058,
   * décision 15 du plan_18 : seule implémentation du condensé). L'interface la compare telle quelle
   * (`PriseEnChargeUtils.recalculNecessaire`, suggestion de la Fiche projet) sans jamais recalculer de SHA-256.
   * @param parametres - Paramètres de la commande, cf. {@link ParametresEmpreinteReferentielInterne}.
   * @returns Le condensé, sous la forme d'une chaîne préfixée `sha256:`.
   */
  public async empreinteReferentielInterne<TDonnees>(
    parametres: ParametresEmpreinteReferentielInterne<TDonnees>,
  ): Promise<string> {
    return InvocationCommandeUtils.invoquer<string>('empreinte_referentiel_interne', {
      ...parametres,
    });
  }

  /**
   * Enregistre les résultats d'une campagne dans la zone de brouillon, sauvegarde le fichier (US-009, US-014,
   * RG-019).
   * @param parametres - Paramètres de la commande, cf. {@link ParametresEnregistrementBrouillon}.
   * @returns La racine mise à jour, typée par l'appelant via `TReponse`.
   */
  public async enregistrerBrouillon<
    TDonnees,
    TVerdict,
    TResultatBrouillonProjet,
    TPremierCommitInterne,
    TReponse,
  >(
    parametres: ParametresEnregistrementBrouillon<
      TDonnees,
      TVerdict,
      TResultatBrouillonProjet,
      TPremierCommitInterne
    >,
  ): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('enregistrer_brouillon', { ...parametres });
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
    return InvocationCommandeUtils.invoquer<TReponse>('integrer_brouillon', { ...parametres });
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
    return InvocationCommandeUtils.invoquer<TReponse>('rejeter_brouillon', { ...parametres });
  }
}
