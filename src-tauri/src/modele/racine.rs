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
use std::collections::HashMap;

/// Version de schéma courante de l'application, incrémentée à chaque évolution structurelle du modèle de données.
/// La migration d'un fichier plus ancien se fonde exclusivement sur `versionSchema`, jamais sur une horloge
/// (cf. `docs/02_documentation/13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique`).
///
/// Passage de `1` à `2` (Phase 5, incrément 7) : ajout du champ optionnel `duplicationNouveauCode` sur
/// [`ResultatSonarCouverture`] (`sonar.couverture`) ; voir la première étape réelle enregistrée dans
/// `crate::persistance::migration::ETAPES_MIGRATION_REELLES`.
pub(crate) const VERSION_SCHEMA_COURANTE: u32 = 2;

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

/// Résultat typé d'un audit, catalogue figé défini en
/// `docs/01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs` (Phase 5, Moteur d'audit) : une
/// variante par type de résultat (discriminant JSON `type`, valeurs à point telles que `gitlab.dependances`,
/// nécessitant un `#[serde(rename = "...")]` explicite par variante plutôt qu'un `rename_all` global). Chaque
/// charge utile ne porte que des constats bruts, jamais un verdict calculé (RG-011) : la classification (statut
/// d'obsolescence, badge, etc.) relève exclusivement du Moteur de jugement (UI), à partir des seuils et
/// référentiels courants.
///
/// `GitlabDependances` (Phase 5, incrément 1) : forme figée d'après l'exemple de référence
/// `docs/01_besoin/exemple-donnees.json`, conservée dès maintenant pour la fidélité de round-trip, mais aucune
/// fonction du Connecteur GitLab ne produit encore cette variante à ce stade (parseur de manifestes de
/// dépendances multi-écosystèmes, non spécifié par la documentation source). `GitlabMarqueursIa`, en revanche, est
/// produite depuis la Phase 5, incrément 7 par `interroger_marqueurs_ia` (cf. `crate::connecteurs::gitlab`).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub(crate) enum Resultat {
    /// Constat brut des dépendances déclarées par les manifestes du dépôt (production différée, cf. commentaire
    /// ci-dessus).
    #[serde(rename = "gitlab.dependances")]
    GitlabDependances(ResultatGitlabDependances),
    /// Constat brut de l'état des branches du dépôt (production différée : critère de nommage conforme et
    /// détection de rebase non spécifiés par la documentation source).
    #[serde(rename = "gitlab.branches")]
    GitlabBranches(ResultatGitlabBranches),
    /// Constat brut de la vitalité du dépôt (date du dernier commit sur la ref auditée).
    #[serde(rename = "gitlab.vitalite")]
    GitlabVitalite(ResultatGitlabVitalite),
    /// Constat brut des contributeurs distincts sur la fenêtre glissante.
    #[serde(rename = "gitlab.contributeurs")]
    GitlabContributeurs(ResultatGitlabContributeurs),
    /// Constat brut de la taille du dépôt.
    #[serde(rename = "gitlab.taille_depot")]
    GitlabTailleDepot(ResultatGitlabTailleDepot),
    /// Constat brut des demandes de fusion ouvertes.
    #[serde(rename = "gitlab.merge_requests")]
    GitlabMergeRequests(ResultatGitlabMergeRequests),
    /// Constat brut des marqueurs d'outils IA détectés dans l'arborescence.
    #[serde(rename = "gitlab.marqueurs_ia")]
    GitlabMarqueursIa(ResultatGitlabMarqueursIa),
    /// Constat brut des membres du dépôt.
    #[serde(rename = "gitlab.membres")]
    GitlabMembres(ResultatGitlabMembres),
    /// Constat brut des violations Sonar par sévérité.
    #[serde(rename = "sonar.violations")]
    SonarViolations(ResultatSonarViolations),
    /// Constat brut de la dette technique Sonar.
    #[serde(rename = "sonar.dette")]
    SonarDette(ResultatSonarDette),
    /// Constat brut de la couverture de tests Sonar.
    #[serde(rename = "sonar.couverture")]
    SonarCouverture(ResultatSonarCouverture),
    /// Constat brut des notes Sonar par axe.
    #[serde(rename = "sonar.notes")]
    SonarNotes(ResultatSonarNotes),
    /// Constat brut du volume de code Sonar.
    #[serde(rename = "sonar.ncloc")]
    SonarNcloc(ResultatSonarNcloc),
    /// Résultat croisé de fraîcheur Sonar (calculé côté UI, Connecteur croisé).
    #[serde(rename = "croise.fraicheur_sonar")]
    CroiseFraicheurSonar(ResultatCroiseFraicheurSonar),
    /// Résultat croisé d'activité sans qualité (calculé côté UI, Connecteur croisé).
    #[serde(rename = "croise.activite_sans_qualite")]
    CroiseActiviteSansQualite(ResultatCroiseActiviteSansQualite),
    /// Résultat croisé d'IA sur le nouveau code (calculé côté UI, Connecteur croisé).
    #[serde(rename = "croise.ia_nouveau_code")]
    CroiseIaNouveauCode(ResultatCroiseIaNouveauCode),
}

/// Dépendance déclarée par un manifeste (référence unique + version), sans jugement d'obsolescence (RG-011).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Dependance {
    /// Référence unique de la dépendance (ex. coordonnées Maven, nom de paquet npm).
    pub(crate) reference: String,
    /// Version déclarée.
    pub(crate) version: String,
    /// Chemin du manifeste d'où provient cette dépendance.
    pub(crate) manifeste: String,
}

/// Constat brut de `gitlab.dependances` (production différée, cf. [`Resultat::GitlabDependances`]).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatGitlabDependances {
    pub(crate) source_id: String,
    pub(crate) ref_effective: String,
    pub(crate) sha_tete: String,
    #[serde(default)]
    pub(crate) dependances: Vec<Dependance>,
}

/// État d'une branche du dépôt.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Branche {
    pub(crate) nom: String,
    /// `#[serde(rename = "avecMR")]` explicite : la conversion `camelCase` par défaut de `avec_mr` produirait
    /// `avecMr` (une seule lettre capitalisée), alors que l'exemple de référence `docs/01_besoin/exemple-donnees.json`
    /// porte `avecMR` (sigle « MR » de « Merge Request » entièrement capitalisé) ; divergence détectée en relecture
    /// de la Phase 5, incrément 1, avant toute production réelle de cette variante par le Connecteur GitLab.
    #[serde(rename = "avecMR")]
    pub(crate) avec_mr: bool,
    pub(crate) rebasee: bool,
    pub(crate) nommage_conforme: bool,
    pub(crate) dernier_commit_le: String,
}

/// Constat brut de `gitlab.branches` (production différée, cf. [`Resultat::GitlabBranches`]).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatGitlabBranches {
    pub(crate) source_id: String,
    pub(crate) ref_effective: String,
    pub(crate) sha_tete: String,
    #[serde(default)]
    pub(crate) branches: Vec<Branche>,
}

/// Constat brut de `gitlab.vitalite`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatGitlabVitalite {
    pub(crate) source_id: String,
    pub(crate) ref_effective: String,
    pub(crate) sha_tete: String,
    pub(crate) dernier_commit_le: String,
}

/// Contributeur distinct détecté sur la fenêtre glissante.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Contributeur {
    pub(crate) email: String,
    pub(crate) nom: String,
    pub(crate) nombre_commits: u32,
}

/// Constat brut de `gitlab.contributeurs`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatGitlabContributeurs {
    pub(crate) source_id: String,
    pub(crate) ref_effective: String,
    pub(crate) sha_tete: String,
    pub(crate) fenetre_jours: u32,
    #[serde(default)]
    pub(crate) contributeurs: Vec<Contributeur>,
}

/// Constat brut de `gitlab.taille_depot`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatGitlabTailleDepot {
    pub(crate) source_id: String,
    pub(crate) ref_effective: String,
    pub(crate) sha_tete: String,
    pub(crate) taille_octets: u64,
}

/// Demande de fusion ouverte.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MergeRequestOuverte {
    pub(crate) iid: u64,
    pub(crate) titre: String,
    pub(crate) cree_le: String,
    pub(crate) en_conflit: bool,
}

/// Constat brut de `gitlab.merge_requests`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatGitlabMergeRequests {
    pub(crate) source_id: String,
    pub(crate) ref_effective: String,
    pub(crate) sha_tete: String,
    #[serde(default)]
    pub(crate) mr_ouvertes: Vec<MergeRequestOuverte>,
}

/// Marqueur d'outil IA détecté dans l'arborescence.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Marqueur {
    pub(crate) chemin: String,
    pub(crate) nature: String,
    pub(crate) outil: String,
}

/// Constat brut de `gitlab.marqueurs_ia` (produit par `crate::connecteurs::gitlab::interroger_marqueurs_ia`,
/// Phase 5, incrément 7 ; cf. [`Resultat::GitlabMarqueursIa`]).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatGitlabMarqueursIa {
    pub(crate) source_id: String,
    pub(crate) ref_effective: String,
    pub(crate) sha_tete: String,
    #[serde(default)]
    pub(crate) marqueurs: Vec<Marqueur>,
}

/// Membre du dépôt (droits d'accès GitLab, distinct des membres connus RG-006 à RG-008).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MembreGitlab {
    pub(crate) username: String,
    pub(crate) nom: String,
    pub(crate) niveau_acces: u32,
    pub(crate) herite: bool,
    #[serde(default)]
    pub(crate) email_public: Option<String>,
}

/// Constat brut de `gitlab.membres`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatGitlabMembres {
    pub(crate) source_id: String,
    pub(crate) ref_effective: String,
    pub(crate) sha_tete: String,
    #[serde(default)]
    pub(crate) membres: Vec<MembreGitlab>,
}

/// Répartition des violations Sonar par sévérité.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ParSeverite {
    pub(crate) bloquant: u32,
    pub(crate) critique: u32,
    pub(crate) majeur: u32,
    pub(crate) mineur: u32,
    pub(crate) info: u32,
}

/// Constat brut de `sonar.violations`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatSonarViolations {
    pub(crate) source_id: String,
    pub(crate) par_severite: ParSeverite,
    pub(crate) nouvelles_violations: u32,
}

/// Constat brut de `sonar.dette`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatSonarDette {
    pub(crate) source_id: String,
    pub(crate) dette_minutes: u64,
    pub(crate) ratio_dette: f64,
}

/// Constat brut de `sonar.couverture`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatSonarCouverture {
    pub(crate) source_id: String,
    pub(crate) couverture: f64,
    pub(crate) couverture_nouveau_code: f64,
    /// Densité de duplication du nouveau code (métrique Sonar `new_duplicated_lines_density`), l'une des données
    /// combinées par `croise.ia_nouveau_code` (Phase 5, incrément 7, cf.
    /// `docs/01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs`). Optionnelle : `None` si
    /// Sonar ne retourne pas cette métrique (ex. aucune nouvelle ligne de code depuis la période de référence),
    /// sur le modèle des autres champs optionnels déjà présents dans ce fichier
    /// (ex. [`ResultatCroiseFraicheurSonar::derniere_analyse_le`]) ; son absence n'est jamais une anomalie
    /// « réponse inattendue ».
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) duplication_nouveau_code: Option<f64>,
}

/// Constat brut de `sonar.notes` (notes A–E des quatre axes, stockées ici en valeur numérique 1.0–5.0 ; la
/// conversion en lettre colorée relève du Moteur de jugement, RG-011).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatSonarNotes {
    pub(crate) source_id: String,
    pub(crate) fiabilite: f64,
    pub(crate) securite: f64,
    pub(crate) maintenabilite: f64,
    pub(crate) revue_securite: f64,
}

/// Constat brut de `sonar.ncloc`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatSonarNcloc {
    pub(crate) source_id: String,
    pub(crate) ncloc: u64,
    #[serde(default)]
    pub(crate) par_langage: HashMap<String, u64>,
}

/// Constat brut de `croise.fraicheur_sonar` (calculé côté UI, Connecteur croisé, à partir des résultats GitLab et
/// Sonar déjà obtenus pour le même audit).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatCroiseFraicheurSonar {
    #[serde(default)]
    pub(crate) dernier_commit_le: Option<String>,
    #[serde(default)]
    pub(crate) derniere_analyse_le: Option<String>,
    pub(crate) aucune_analyse: bool,
}

/// Constat brut de `croise.activite_sans_qualite` (calculé côté UI, Connecteur croisé).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatCroiseActiviteSansQualite {
    pub(crate) nombre_commits: u32,
    pub(crate) nouvelles_violations: u32,
    pub(crate) evaluable: bool,
}

/// Constat brut de `croise.ia_nouveau_code` (calculé côté UI, Connecteur croisé ; aucun verdict automatique,
/// simple juxtaposition des séries, cf. `docs/01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs`).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResultatCroiseIaNouveauCode {
    pub(crate) marqueurs_presents: bool,
    #[serde(default)]
    pub(crate) outils_detectes: Vec<String>,
    #[serde(default)]
    pub(crate) couverture_nouveau_code: Option<f64>,
    #[serde(default)]
    pub(crate) nouvelles_violations: Option<u32>,
    #[serde(default)]
    pub(crate) duplication_nouveau_code: Option<f64>,
}

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
    ///
    /// `#[serde(rename = "reglesMarqueursIA")]` explicite : la conversion `camelCase` par défaut de
    /// `regles_marqueurs_ia` produirait `reglesMarqueursIa` (seule la première lettre de chaque segment
    /// capitalisée), alors que `docs/01_besoin/exemple-donnees.json` porte `reglesMarqueursIA` (sigle « IA »
    /// entièrement capitalisé) ; même défaut que celui déjà corrigé sur `Branche.avec_mr` (Phase 5, incrément 1),
    /// détecté ici en préparant `interroger_marqueurs_ia` (Phase 5, incrément 7).
    #[serde(default, rename = "reglesMarqueursIA")]
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
    /// Statut d'exécution.
    pub(crate) statut: StatutVerdict,
    /// Durée d'exécution en millisecondes, si le projet a été traité.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) duree_ms: Option<u64>,
    /// Anomalies rencontrées, si le traitement a échoué (catalogue RG-021, hors périmètre de la Phase 1).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) anomalies: Option<Vec<Value>>,
    /// Motif de rejet, si le projet a été rejeté depuis le brouillon (Phase 5, incrément 2). Répercuté ici depuis
    /// `ResultatBrouillonProjet.motifRejet` au moment du rejet plutôt qu'au moment de la purge du brouillon, pour
    /// que le motif reste consultable même après la disparition de ce dernier
    /// (`docs/01_besoin/Specification.md#59-f09--brouillon-daudit-et-validation-avant-intégration` : « rejette...
    /// motif optionnel consigné »).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) motif_rejet: Option<String>,
}

/// Statut d'exécution d'un projet au sein d'une campagne (catalogue figé,
/// `docs/01_besoin/Specification.md#57-f07--audit-partiel-et-reprise-sur-échec` : « verdict par projet (succès /
/// échec / ignoré / rejeté) »). `Rejete` n'est atteint qu'après traitement du brouillon (Phase 5, incrément 2),
/// jamais à l'enregistrement initial de la campagne.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum StatutVerdict {
    /// Le projet a été audité avec succès.
    Succes,
    /// L'audit du projet a échoué (anomalie technique, cf. `anomalies`).
    Echec,
    /// Le projet n'a pas été traité (campagne annulée avant son tour, RG-018).
    Ignore,
    /// Le résultat produit pour ce projet a été rejeté depuis le brouillon plutôt qu'intégré à l'historique.
    Rejete,
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
    /// Statut du résultat au sein du brouillon.
    pub(crate) statut: StatutResultatBrouillon,
    /// Motif de rejet, si le résultat a été écarté.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) motif_rejet: Option<String>,
    /// Variations aberrantes détectées par rapport au dernier audit intégré (RG-020, détection différée à un
    /// incrément ultérieur de la Phase 5, faute de seuil de matérialité chiffré dans la documentation source, cf.
    /// commentaire du champ `seuils` de `Parametres`) : toujours vide dans cet incrément.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) aberrations: Option<Vec<Value>>,
}

/// Statut d'un résultat de brouillon au sein de la zone de validation courante (RG-019, RG-020 ; F09 : « intègre
/// tout, intègre projet par projet, ou rejette »).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum StatutResultatBrouillon {
    /// Résultat produit par la campagne, pas encore traité par l'utilisateur.
    EnAttente,
    /// Résultat intégré à l'historique du projet concerné.
    Integre,
    /// Résultat rejeté, jamais ajouté à l'historique du projet concerné.
    Rejete,
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
                    resultats: vec![Resultat::GitlabVitalite(ResultatGitlabVitalite {
                        source_id: "f0000000-0000-4000-8000-000000000001".to_string(),
                        ref_effective: "develop".to_string(),
                        sha_tete: "8c1d0e44".to_string(),
                        dernier_commit_le: "2026-06-05".to_string(),
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
                statut: StatutVerdict::Succes,
                duree_ms: Some(12400),
                anomalies: None,
                motif_rejet: None,
            }],
        });

        let json = serde_json::to_string(&racine)?;
        let relue: DonneesRacine = serde_json::from_str(&json)?;

        assert_eq!(racine, relue);
        Ok(())
    }

    #[test]
    fn resultat_gitlab_branches_desserialise_le_champ_avec_mr_du_jeu_de_reference()
    -> Result<(), Box<dyn std::error::Error>> {
        // Extrait exact de docs/01_besoin/exemple-donnees.json (résultat gitlab.branches) : vérifie que le champ
        // `avecMR` (sigle « MR » entièrement capitalisé) est bien reconnu, à la différence de la conversion
        // `camelCase` par défaut de `avec_mr`, qui produirait `avecMr` (une seule lettre capitalisée).
        let resultat: Resultat = serde_json::from_str(
            r#"{
                "type": "gitlab.branches",
                "sourceId": "f0000000-0000-4000-8000-000000000001",
                "refEffective": "develop",
                "shaTete": "8c1d0e44",
                "branches": [
                    {
                        "nom": "feature/paiement-sepa",
                        "avecMR": true,
                        "rebasee": false,
                        "nommageConforme": true,
                        "dernierCommitLe": "2026-06-05"
                    }
                ]
            }"#,
        )?;

        let Resultat::GitlabBranches(resultat) = resultat else {
            return Err("variante GitlabBranches attendue".into());
        };
        assert!(resultat.branches[0].avec_mr);

        let json = serde_json::to_string(&resultat)?;
        assert!(json.contains("\"avecMR\":true"));
        Ok(())
    }

    #[test]
    fn referentiels_desserialise_et_reserialise_regles_marqueurs_ia_avec_le_sigle_capitalise()
    -> Result<(), Box<dyn std::error::Error>> {
        // Non-régression (détecté en préparant `interroger_marqueurs_ia`, Phase 5, incrément 7) : le champ porte
        // `#[serde(rename = "reglesMarqueursIA")]` explicite, sur le modèle d'`avecMR` ci-dessus. Sans ce rename,
        // la conversion `camelCase` par défaut de `regles_marqueurs_ia` produirait `reglesMarqueursIa` (seule la
        // première lettre de chaque segment capitalisée), incompatible avec la clé
        // `reglesMarqueursIA` de `docs/01_besoin/exemple-donnees.json`.
        let referentiels: Referentiels = serde_json::from_str(
            r#"{
                "reglesMarqueursIA": [
                    { "id": "r1", "motif": "CLAUDE.md", "typeCorrespondance": "exact", "portee": "partout", "nature": "fichier", "outil": "claude" }
                ]
            }"#,
        )?;
        assert_eq!(referentiels.regles_marqueurs_ia.len(), 1);

        let json = serde_json::to_string(&referentiels)?;
        assert!(json.contains("\"reglesMarqueursIA\":"));
        assert!(!json.contains("\"reglesMarqueursIa\":"));
        Ok(())
    }

    #[test]
    fn resultat_sonar_couverture_historique_sans_duplication_nouveau_code_se_desserialise_a_none()
    -> Result<(), Box<dyn std::error::Error>> {
        // Document historique antérieur à la migration 1 -> 2 (Phase 5, incrément 7) : le champ
        // `duplicationNouveauCode` est absent, la désérialisation ne doit ni échouer ni le confondre avec une
        // anomalie, mais produire `None` (cf. `#[serde(default)]`).
        let resultat: ResultatSonarCouverture = serde_json::from_str(
            r#"{
                "sourceId": "source-2",
                "couverture": 61.2,
                "couvertureNouveauCode": 71.0
            }"#,
        )?;

        assert_eq!(resultat.duplication_nouveau_code, None);
        Ok(())
    }
}
