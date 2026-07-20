// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Structures de la racine du document JSON en clair, telle que décrite en
//! `docs/01_besoin/Specification.md#61-vue-densemble` et `docs/02_documentation/12_modeleDonnees.md#entités-attributs-et-relations`.
//!
//! Décision de modélisation (Phase 1, à valider par un humain, cf. compte-rendu de développement) : les branches
//! dont le contenu détaillé relève d'une phase ultérieure du plan (catalogue figé des résultats d'audit typés,
//! grilles de seuils du Moteur de jugement, référentiels de dépendances/marqueurs IA) sont représentées par une
//! valeur JSON générique ([`serde_json::Value`]) plutôt que par un type Rust exhaustif, afin de préserver un
//! round-trip fidèle sans anticiper la logique métier de gestion de ces branches (hors périmètre de la Phase 1).
//! Les branches directement mobilisées par le Moteur de persistance et la session (verrouillage, sauvegarde) sont
//! en revanche typées explicitement.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Version de schéma courante de l'application, incrémentée à chaque évolution structurelle du modèle de données.
/// La migration d'un fichier plus ancien se fonde exclusivement sur `versionSchema`, jamais sur une horloge
/// (cf. `docs/02_documentation/13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique`).
pub(crate) const VERSION_SCHEMA_COURANTE: u32 = 1;

/// Nombre par défaut de sauvegardes de sécurité conservées avant rotation, en l'absence de valeur explicite dans
/// `parametres.sauvegarde.nombreSauvegardesSecurite` (RG-003, valeur par défaut déduite de
/// `docs/01_besoin/exemple-donnees.json` et confirmée par `docs/02_documentation/12_modeleDonnees.md#stratégie-de-sauvegarde-et-de-restauration`).
pub(crate) const NOMBRE_SAUVEGARDES_SECURITE_PAR_DEFAUT: u32 = 5;

/// Délai d'inactivité par défaut, en minutes, avant verrouillage automatique de la session (RNF-014).
pub(crate) const DELAI_INACTIVITE_MINUTES_PAR_DEFAUT: u32 = 15;

/// Nombre d'échecs consécutifs de déverrouillage par défaut avant fermeture du fichier (US-026), en l'absence de
/// valeur explicite dans `parametres.verrouillage.echecsAvantFermeture` ; valeur reprise de l'exemple de référence
/// `docs/01_besoin/exemple-donnees.json`, aucun texte normatif ne fixant de valeur chiffrée par défaut.
pub(crate) const ECHECS_AVANT_FERMETURE_PAR_DEFAUT: u32 = 5;

/// Concurrence par défaut des appels d'audit (RNF-004), non utilisée par la Phase 1 mais portée ici pour la
/// complétude du modèle de paramètres.
pub(crate) const CONCURRENCE_AUDIT_PAR_DEFAUT: u32 = 4;

/// Racine du document JSON en clair, avant compression puis chiffrement (cf. `Specification.md#61-vue-densemble`).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DonneesRacine {
    /// Version du schéma de données, fondement exclusif de la migration à la volée.
    pub(crate) version_schema: u32,
    /// Métadonnées de suivi du fichier (dates de création/modification, application).
    pub(crate) meta: Meta,
    /// Grappe principale de groupes ; vide à la création d'un nouveau fichier (US-001).
    #[serde(default)]
    pub(crate) groupes: Vec<Groupe>,
    /// Grilles de lecture partageables (règles de dépendances et de marqueurs IA), export en clair.
    #[serde(default)]
    pub(crate) referentiels: Referentiels,
    /// Seuils et réglages applicatifs.
    #[serde(default)]
    pub(crate) parametres: Parametres,
    /// Traces d'exécution des campagnes d'audit.
    #[serde(default)]
    pub(crate) campagnes: Vec<Campagne>,
    /// Zone de validation courante, au plus une occurrence (nullable).
    #[serde(default)]
    pub(crate) brouillon: Option<Brouillon>,
    /// Statuts vu/traité par clé d'alerte stable.
    #[serde(default)]
    pub(crate) traitements_alertes: Vec<TraitementAlerte>,
    /// Journal append-only des modifications de paramétrage.
    #[serde(default)]
    pub(crate) journal: Vec<EntreeJournal>,
    /// Modèles de filtres nommés, propres à l'utilisateur.
    #[serde(default)]
    pub(crate) vues_enregistrees: Vec<VueEnregistree>,
}

impl DonneesRacine {
    /// Construit une racine vide, telle que produite par la création d'un nouveau fichier de données (US-001).
    pub(crate) fn nouvelle(
        application: impl Into<String>,
        horodatage_iso8601: impl Into<String>,
    ) -> Self {
        let horodatage: String = horodatage_iso8601.into();
        Self {
            version_schema: VERSION_SCHEMA_COURANTE,
            meta: Meta {
                cree_le: horodatage.clone(),
                modifie_le: horodatage,
                application: application.into(),
            },
            groupes: Vec::new(),
            referentiels: Referentiels::default(),
            parametres: Parametres::default(),
            campagnes: Vec::new(),
            brouillon: None,
            traitements_alertes: Vec::new(),
            journal: Vec::new(),
            vues_enregistrees: Vec::new(),
        }
    }
}

/// Métadonnées de suivi de la racine du document.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Meta {
    /// Date de création du fichier (ISO 8601).
    pub(crate) cree_le: String,
    /// Date de dernière modification du fichier (ISO 8601).
    pub(crate) modifie_le: String,
    /// Identifiant de l'application et de sa version ayant produit le fichier.
    pub(crate) application: String,
}

/// Type d'instance externe déclarée par un groupe.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum TypeInstance {
    /// Instance GitLab.
    Gitlab,
    /// Instance SonarQube.
    Sonar,
}

/// Instance GitLab ou Sonar déclarée au niveau d'un groupe.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Instance {
    /// Identifiant UUID v4 de l'instance.
    pub(crate) id: String,
    /// Type de l'instance (`gitlab` ou `sonar`).
    #[serde(rename = "type")]
    pub(crate) type_instance: TypeInstance,
    /// Nom usuel de l'instance.
    pub(crate) nom: String,
    /// URL de base de l'instance.
    pub(crate) url_base: String,
}

/// Type de critère d'identification d'un membre connu.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum TypeCritere {
    /// Identifiant de connexion (login) sur l'instance.
    Username,
    /// Adresse électronique complète.
    Email,
    /// Domaine d'adresse électronique.
    DomaineEmail,
}

/// Statut de rattachement d'un membre connu.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum StatutMembre {
    /// Membre interne à l'organisation.
    Interne,
    /// Membre représentant un client.
    Client,
    /// Membre représentant un partenaire/prestataire.
    Partenaire,
}

/// Règle d'identification d'un collaborateur, donnée du groupe jamais exportée en clair
/// (RG-006 à RG-008, hors périmètre de la Phase 1).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MembreConnu {
    /// Identifiant UUID v4 du membre connu.
    pub(crate) id: String,
    /// Motif de reconnaissance (login, email ou domaine selon `type_critere`).
    pub(crate) critere: String,
    /// Type du critère de reconnaissance.
    pub(crate) type_critere: TypeCritere,
    /// Statut associé (interne, client, partenaire).
    pub(crate) statut: StatutMembre,
    /// Libellé lisible optionnel.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) libelle: Option<String>,
    /// Alias courriel optionnel.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) alias_email: Option<String>,
}

/// Événement daté de portée groupe ou projet, affiché en repère sur les graphiques d'évolution.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Annotation {
    /// Identifiant UUID v4 de l'annotation.
    pub(crate) id: String,
    /// Date de l'événement.
    pub(crate) date: String,
    /// Libellé court de l'événement.
    pub(crate) libelle: String,
    /// Catégorie de l'événement.
    pub(crate) categorie: String,
    /// Description longue optionnelle.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) description: Option<String>,
    /// Indique une annotation générée automatiquement par le système plutôt que saisie manuellement.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) systeme: Option<bool>,
}

/// Attribut immuable recalculable identifiant la date du premier commit interne d'un projet.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PremierCommitInterne {
    /// Date du premier commit interne détecté.
    pub(crate) date: String,
    /// SHA (éventuellement abrégé) du commit.
    pub(crate) sha: String,
    /// Adresse courriel de l'auteur du commit.
    pub(crate) email_auteur: String,
    /// Date à laquelle ce calcul a été effectué.
    pub(crate) calcule_le: String,
    /// Empreinte du référentiel de membres connus utilisé au moment du calcul.
    pub(crate) empreinte_referentiel: String,
    /// Statut du calcul (ex. `determine`).
    pub(crate) statut: String,
}

/// Type de source rattachée à un projet.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum TypeSource {
    /// Dépôt GitLab.
    DepotGitlab,
    /// Projet SonarQube.
    ProjetSonar,
}

/// Source (dépôt GitLab ou projet Sonar) rattachée à un projet.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Source {
    /// Identifiant UUID v4 de la source.
    pub(crate) id: String,
    /// Identifiant de l'instance de rattachement.
    pub(crate) instance_id: String,
    /// Type de la source.
    #[serde(rename = "type")]
    pub(crate) type_source: TypeSource,
    /// Identifiant externe (identifiant de projet côté instance).
    pub(crate) id_externe: String,
    /// Ref auditée (branche, tag ou SHA) ; absente = branche par défaut du dépôt, résolue à chaque audit.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) ref_auditee: Option<String>,
}

/// Résultat typé d'un audit, dont le catalogue figé (`origine.nature`) est défini en
/// `docs/01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs` et relève du Moteur d'audit
/// (Phase 5, hors périmètre de la Phase 1) : représenté ici par une valeur JSON générique afin de préserver un
/// round-trip fidèle sans dupliquer ce catalogue par anticipation. Aucun verdict calculé n'y figure jamais
/// (RG-011).
pub(crate) type Resultat = Value;

/// Historique d'audit d'un projet : un ensemble de constats bruts obtenus à une date donnée.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Audit {
    /// Identifiant UUID v4 de l'audit.
    pub(crate) id: String,
    /// Date de réalisation de l'audit.
    pub(crate) date: String,
    /// Identifiant de la campagne qui a produit cet audit.
    pub(crate) campagne_id: String,
    /// Résultats typés obtenus (catalogue figé, cf. commentaire de [`Resultat`]).
    #[serde(default)]
    pub(crate) resultats: Vec<Resultat>,
}

/// Projet suivi au sein d'un groupe.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Projet {
    /// Identifiant UUID v4 du projet.
    pub(crate) id: String,
    /// Nom du projet.
    pub(crate) nom: String,
    /// Description du projet.
    pub(crate) description: String,
    /// Autorisation d'usage de l'IA sur ce projet, faux par défaut (RG-014).
    #[serde(default)]
    pub(crate) ia_autorisee: bool,
    /// Date d'autorisation de l'IA, renseignée uniquement si `ia_autorisee` est ou a été vraie (RG-015).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) ia_autorisee_depuis: Option<String>,
    /// Date du premier commit interne, une fois calculée.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) premier_commit_interne: Option<PremierCommitInterne>,
    /// Sources rattachées au projet.
    #[serde(default)]
    pub(crate) sources: Vec<Source>,
    /// Annotations de portée projet.
    #[serde(default)]
    pub(crate) annotations: Vec<Annotation>,
    /// Historique des audits du projet.
    #[serde(default)]
    pub(crate) audits: Vec<Audit>,
}

/// Groupe, racine de la grappe principale (organisation, client, ou tout autre périmètre de regroupement).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Groupe {
    /// Identifiant UUID v4 du groupe.
    pub(crate) id: String,
    /// Nom du groupe.
    pub(crate) nom: String,
    /// Description du groupe.
    pub(crate) description: String,
    /// Instances GitLab/Sonar déclarées pour ce groupe.
    #[serde(default)]
    pub(crate) instances: Vec<Instance>,
    /// Membres connus du groupe (donnée jamais exportée en clair).
    #[serde(default)]
    pub(crate) membres_connus: Vec<MembreConnu>,
    /// Annotations de portée groupe.
    #[serde(default)]
    pub(crate) annotations: Vec<Annotation>,
    /// Types d'indicateurs désactivés pour ce groupe.
    #[serde(default)]
    pub(crate) indicateurs_desactives: Vec<String>,
    /// Projets rattachés au groupe.
    #[serde(default)]
    pub(crate) projets: Vec<Projet>,
}

/// Grilles de lecture partageables (référentiels), export en clair.
///
/// Le contenu détaillé des règles (motifs, versions, statuts d'obsolescence) relève du Paramétrage
/// (Phase 7, hors périmètre de la Phase 1) : représenté ici par des valeurs JSON génériques afin de préserver un
/// round-trip fidèle sans anticiper cette logique métier.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Referentiels {
    /// Règles de dépendances (motif, versions, statuts d'obsolescence).
    #[serde(default)]
    pub(crate) regles_dependances: Vec<Value>,
    /// Règles de détection des marqueurs d'outils IA.
    #[serde(default)]
    pub(crate) regles_marqueurs_ia: Vec<Value>,
}

/// Réglages de verrouillage de session (US-026, RG-004, RG-005, RNF-014).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Verrouillage {
    /// Délai d'inactivité, en minutes, avant verrouillage automatique.
    pub(crate) delai_inactivite_minutes: u32,
    /// Nombre d'échecs consécutifs de déverrouillage avant fermeture du fichier.
    pub(crate) echecs_avant_fermeture: u32,
}

impl Default for Verrouillage {
    fn default() -> Self {
        Self {
            delai_inactivite_minutes: DELAI_INACTIVITE_MINUTES_PAR_DEFAUT,
            echecs_avant_fermeture: ECHECS_AVANT_FERMETURE_PAR_DEFAUT,
        }
    }
}

/// Réglages relatifs à l'exécution des campagnes d'audit (hors périmètre fonctionnel de la Phase 1, portés ici
/// uniquement pour la complétude du modèle de paramètres).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ParametresAudit {
    /// Concurrence par défaut des appels d'audit (RNF-004).
    pub(crate) concurrence: u32,
    /// Fenêtre en jours de calcul des contributeurs récents, si déjà fixée.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) fenetre_contributeurs_jours: Option<u32>,
    /// Borne de pages de recherche du premier commit interne, si déjà fixée.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) borne_recherche_premier_commit_pages: Option<u32>,
}

impl Default for ParametresAudit {
    fn default() -> Self {
        Self {
            concurrence: CONCURRENCE_AUDIT_PAR_DEFAUT,
            fenetre_contributeurs_jours: None,
            borne_recherche_premier_commit_pages: None,
        }
    }
}

/// Réglages de proxy sortant, optionnels.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Proxy {
    /// URL du proxy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) url: Option<String>,
    /// Chemin vers un fascicule de certificats d'autorité supplémentaire.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) chemin_bundle_ca: Option<String>,
}

/// Réglages de sauvegarde de sécurité (RG-003).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Sauvegarde {
    /// Nombre de sauvegardes de sécurité horodatées conservées avant rotation.
    pub(crate) nombre_sauvegardes_securite: u32,
}

impl Default for Sauvegarde {
    fn default() -> Self {
        Self {
            nombre_sauvegardes_securite: NOMBRE_SAUVEGARDES_SECURITE_PAR_DEFAUT,
        }
    }
}

/// Seuils et réglages applicatifs (racine `parametres`).
///
/// Décision de modélisation (cf. commentaire d'en-tête du fichier) : `seuils` reste une valeur JSON générique, le
/// détail des grilles de seuils relevant du Moteur de jugement (Phase 6, hors périmètre de la Phase 1) et la règle
/// « aucune valeur de seuil codée en dur » imposant de ne jamais figer ici une liste de seuils par anticipation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Parametres {
    /// Grille de seuils du Moteur de jugement (structure détaillée hors périmètre de la Phase 1).
    #[serde(default)]
    pub(crate) seuils: Value,
    /// Réglages de verrouillage de session.
    #[serde(default)]
    pub(crate) verrouillage: Verrouillage,
    /// Réglages d'exécution des campagnes d'audit.
    #[serde(default)]
    pub(crate) audit: ParametresAudit,
    /// Réglages de proxy sortant, absents si non configurés.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) proxy: Option<Proxy>,
    /// Réglages de sauvegarde de sécurité.
    #[serde(default)]
    pub(crate) sauvegarde: Sauvegarde,
}

/// Verdict d'exécution d'un projet au sein d'une campagne.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Verdict {
    /// Identifiant du projet concerné.
    pub(crate) projet_id: String,
    /// Statut d'exécution (catalogue détaillé hors périmètre de la Phase 1, cf. RG-017 à RG-021).
    pub(crate) statut: String,
    /// Durée d'exécution en millisecondes, si le projet a été traité.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) duree_ms: Option<u64>,
    /// Anomalies rencontrées, si le traitement a échoué (catalogue RG-021, hors périmètre de la Phase 1).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) anomalies: Option<Vec<Value>>,
}

/// Trace d'exécution d'une campagne d'audit.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Campagne {
    /// Identifiant UUID v4 de la campagne.
    pub(crate) id: String,
    /// Date de lancement de la campagne.
    pub(crate) date: String,
    /// Identifiants des projets du périmètre de la campagne.
    #[serde(default)]
    pub(crate) perimetre: Vec<String>,
    /// Verdicts d'exécution par projet.
    #[serde(default)]
    pub(crate) verdicts: Vec<Verdict>,
}

/// Résultat en attente de validation pour un projet, au sein du brouillon courant.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatBrouillonProjet {
    /// Identifiant du projet concerné.
    pub(crate) projet_id: String,
    /// Audit produit, en attente d'intégration à l'historique du projet.
    pub(crate) audit: Audit,
    /// Statut du résultat au sein du brouillon (catalogue hors périmètre de la Phase 1, cf. RG-019, RG-020).
    pub(crate) statut: String,
    /// Motif de rejet, si le résultat a été écarté.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) motif_rejet: Option<String>,
    /// Variations aberrantes détectées par rapport au dernier audit intégré (RG-020).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) aberrations: Option<Vec<Value>>,
}

/// Zone de validation courante des résultats d'une campagne, au plus une occurrence (nullable) à la racine.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Brouillon {
    /// Identifiant de la campagne dont ce brouillon est issu.
    pub(crate) campagne_id: String,
    /// Date de création du brouillon.
    pub(crate) cree_le: String,
    /// Résultats en attente de validation, par projet.
    #[serde(default)]
    pub(crate) resultats_par_projet: Vec<ResultatBrouillonProjet>,
}

/// Statut de traitement d'une alerte (RG-026).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum StatutTraitementAlerte {
    /// Alerte vue mais non encore traitée.
    Vue,
    /// Alerte traitée.
    Traitee,
}

/// Statut vu/traité associé à une clé d'alerte stable (RG-026).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TraitementAlerte {
    /// Identifiant UUID v4 de l'entrée.
    pub(crate) id: String,
    /// Clé stable de l'alerte (`type_alerte|projetId|discriminant`).
    pub(crate) cle_alerte: String,
    /// Statut courant du traitement.
    pub(crate) statut: StatutTraitementAlerte,
    /// Commentaire libre optionnel.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) commentaire: Option<String>,
    /// Horodatage de la dernière mise à jour du statut.
    pub(crate) horodatage: String,
}

/// Entrée append-only du journal des modifications de paramétrage (F21).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct EntreeJournal {
    /// Identifiant UUID v4 de l'entrée.
    pub(crate) id: String,
    /// Horodatage de la modification.
    pub(crate) horodatage: String,
    /// Chemin de l'objet modifié.
    pub(crate) objet: String,
    /// Valeur avant modification.
    pub(crate) avant: Value,
    /// Valeur après modification.
    pub(crate) apres: Value,
    /// Origine de la modification (saisie manuelle, import de configuration, qualification depuis une alerte…).
    pub(crate) origine: String,
    /// Détail complémentaire sur l'origine, optionnel.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) detail_origine: Option<String>,
}

/// Modèle de filtres nommé, propre à l'utilisateur, non exporté (F22).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct VueEnregistree {
    /// Identifiant UUID v4 de la vue enregistrée.
    pub(crate) id: String,
    /// Nom donné par l'utilisateur.
    pub(crate) nom: String,
    /// Écran auquel s'applique la vue.
    pub(crate) ecran: String,
    /// Version du schéma de filtres, propre à l'écran concerné.
    pub(crate) version_filtres: u32,
    /// Indique si cette vue est la vue par défaut de son écran.
    #[serde(default)]
    pub(crate) par_defaut: bool,
    /// Filtres, structure propre à l'écran concerné.
    pub(crate) filtres: Value,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nouvelle_racine_est_vide_et_porte_la_version_courante() {
        let racine = DonneesRacine::nouvelle("SuiviQualimetrie 0.1.0", "2026-07-20T08:00:00Z");

        assert_eq!(racine.version_schema, VERSION_SCHEMA_COURANTE);
        assert_eq!(racine.meta.cree_le, "2026-07-20T08:00:00Z");
        assert_eq!(racine.meta.modifie_le, "2026-07-20T08:00:00Z");
        assert!(racine.groupes.is_empty());
        assert!(racine.brouillon.is_none());
        assert_eq!(
            racine.parametres.sauvegarde.nombre_sauvegardes_securite,
            NOMBRE_SAUVEGARDES_SECURITE_PAR_DEFAUT
        );
        assert_eq!(
            racine.parametres.verrouillage.delai_inactivite_minutes,
            DELAI_INACTIVITE_MINUTES_PAR_DEFAUT
        );
    }

    #[test]
    fn racine_complete_survit_a_un_aller_retour_json() -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = DonneesRacine::nouvelle("SuiviQualimetrie 0.1.0", "2026-07-20T08:00:00Z");
        racine.groupes.push(Groupe {
            id: "a0000000-0000-4000-8000-000000000001".to_string(),
            nom: "Socle Comptable".to_string(),
            description: "Applications du socle comptable".to_string(),
            instances: vec![Instance {
                id: "b0000000-0000-4000-8000-000000000001".to_string(),
                type_instance: TypeInstance::Gitlab,
                nom: "gitlab-prod".to_string(),
                url_base: "https://gitlab.entreprise.fr".to_string(),
            }],
            membres_connus: vec![MembreConnu {
                id: "c0000000-0000-4000-8000-000000000001".to_string(),
                critere: "*@entreprise.fr".to_string(),
                type_critere: TypeCritere::DomaineEmail,
                statut: StatutMembre::Interne,
                libelle: None,
                alias_email: None,
            }],
            annotations: vec![],
            indicateurs_desactives: vec![],
            projets: vec![Projet {
                id: "d0000000-0000-4000-8000-000000000001".to_string(),
                nom: "API Facturation".to_string(),
                description: "API centrale de facturation".to_string(),
                ia_autorisee: false,
                ia_autorisee_depuis: None,
                premier_commit_interne: None,
                sources: vec![Source {
                    id: "f0000000-0000-4000-8000-000000000001".to_string(),
                    instance_id: "b0000000-0000-4000-8000-000000000001".to_string(),
                    type_source: TypeSource::DepotGitlab,
                    id_externe: "1234".to_string(),
                    ref_auditee: Some("develop".to_string()),
                }],
                annotations: vec![],
                audits: vec![Audit {
                    id: "10000000-0000-4000-8000-000000000001".to_string(),
                    date: "2026-06-05".to_string(),
                    campagne_id: "e0000000-0000-4000-8000-000000000001".to_string(),
                    resultats: vec![serde_json::json!({
                        "type": "gitlab.vitalite",
                        "sourceId": "f0000000-0000-4000-8000-000000000001",
                        "refEffective": "develop",
                        "shaTete": "8c1d0e44",
                        "dernierCommitLe": "2026-06-05"
                    })],
                }],
            }],
        });
        racine.campagnes.push(Campagne {
            id: "e0000000-0000-4000-8000-000000000001".to_string(),
            date: "2026-06-05T08:30:00Z".to_string(),
            perimetre: vec!["d0000000-0000-4000-8000-000000000001".to_string()],
            verdicts: vec![Verdict {
                projet_id: "d0000000-0000-4000-8000-000000000001".to_string(),
                statut: "succes".to_string(),
                duree_ms: Some(12400),
                anomalies: None,
            }],
        });

        let json = serde_json::to_string(&racine)?;
        let relue: DonneesRacine = serde_json::from_str(&json)?;

        assert_eq!(racine, relue);
        Ok(())
    }
}
