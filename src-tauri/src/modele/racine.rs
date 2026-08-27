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
///
/// Passage de `2` à `3` (Phase 6, incrément 1) : ajout du champ `motifNommageBranches` sur [`Referentiels`]
/// (RG-030, `docs/02_documentation/05_reglesGestion.md`), reprenant sa valeur par défaut représentant la
/// convention Gitflow (`#[serde(default = "...")]`, cf. [`MOTIF_NOMMAGE_BRANCHES_PAR_DEFAUT`]) ; voir la seconde
/// étape réelle enregistrée dans `crate::persistance::migration::ETAPES_MIGRATION_REELLES`
/// (`migration_2_vers_3`), sur le modèle de la précédente (bump de version seul, aucune transformation de donnée
/// nécessaire).
///
/// Passage de `3` à `4` (Phase 10, incrément 8) : ajout du champ `seuilAvertissementTailleOctets` sur
/// [`Parametres`] (US-035, RG-031, RG-032), reprenant sa valeur par défaut
/// ([`SEUIL_AVERTISSEMENT_TAILLE_OCTETS_PAR_DEFAUT`], `#[serde(default = "...")]`) ; voir la troisième étape
/// réelle enregistrée dans `crate::persistance::migration::ETAPES_MIGRATION_REELLES` (`migration_3_vers_4`), sur
/// le même modèle que les deux précédentes.
///
/// Passage de `4` à `5` (C15-14, audit historique à date passée) : ajout des champs `typeAudit` et `dateExecution`
/// sur [`Audit`], tous deux additifs à valeur de repli (`#[serde(default)]`) — même palier systématique appliqué à
/// chaque champ additif du modèle, y compris purement `#[serde(default)]` sans aucune transformation de donnée
/// (cf. `migration_1_vers_2`/`migration_2_vers_3`/`migration_3_vers_4` ci-dessus) ; voir la quatrième étape réelle
/// enregistrée dans `crate::persistance::migration::ETAPES_MIGRATION_REELLES` (`migration_4_vers_5`), sur le même
/// modèle que les trois précédentes.
///
/// Passage de `5` à `6` (US-048 catégorisation des dépendances, US-050 version de Java) : ajout du champ
/// `categoriesDependances` sur [`Referentiels`], reprenant sa liste par défaut ([`CATEGORIES_DEPENDANCES_PAR_DEFAUT`],
/// `#[serde(default = "...")]` sur le modèle de `motifNommageBranches`) ; voir la cinquième étape réelle
/// enregistrée dans `crate::persistance::migration::ETAPES_MIGRATION_REELLES` (`migration_5_vers_6`). À la
/// différence des paliers précédents, cette étape **mute** le document : elle insère la règle de dépendances par
/// défaut couvrant la version de Java ([`regle_java_par_defaut`], US-050) si aucune règle de motif `java` n'existe
/// déjà — pour que le suivi de Java fonctionne sans configuration sur un fichier antérieur.
///
/// Passage de `6` à `7` (Phase 16, amendement de RG-043) : normalisation de la casse du champ `statut` des bornes
/// de version de `referentiels.reglesDependances` — une valeur correspondant, casse mise à part, à l'un des quatre
/// statuts canoniques ([`STATUTS_OBSOLESCENCE_CANONIQUES`]) est réécrite dans sa forme canonique, toute autre
/// valeur restant inchangée (champ libre, RG-022). Voir la sixième étape réelle enregistrée dans
/// `crate::persistance::migration::ETAPES_MIGRATION_REELLES` (`migration_6_vers_7`) ; comme `migration_5_vers_6`,
/// cette étape **mute** le document.
pub(crate) const VERSION_SCHEMA_COURANTE: u32 = 7;

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

/// Seuil de taille par défaut, en octets, déclenchant l'avertissement contextuel de purge à la sauvegarde (US-035,
/// RG-031, RG-032, Phase 10 incrément 8).
///
/// Décision arbitraire (à valider par un humain, cf. rapport de développement de cet incrément), faute de valeur
/// chiffrée dans `docs/01_besoin/exemple-donnees.json` ou dans tout texte normatif : dix mébioctets, jugée
/// suffisamment élevée pour ne pas alerter prématurément un fichier de données récent, tout en restant sous la
/// taille à laquelle la dérivation de clé (Argon2id, RNF-002) ou le rendu de la synthèse (RNF-001) commenceraient
/// à se dégrader perceptiblement.
pub(crate) const SEUIL_AVERTISSEMENT_TAILLE_OCTETS_PAR_DEFAUT: u64 = 10 * 1024 * 1024;

/// Motif d'expression régulière de nommage de branche par défaut (RG-030,
/// `docs/02_documentation/05_reglesGestion.md`), appliqué en l'absence de valeur explicite dans
/// `referentiels.motifNommageBranches` : représente la convention Gitflow canonique (`main`/`master`, `develop`,
/// `feature/*`, `release/*`, `hotfix/*`), sans le segment `bugfix/*` (R10-11 : extension non strictement
/// canonique de Gitflow, retirée par arbitrage). Champ absent de tout document antérieur à la Phase 6,
/// incrément 1, y compris `docs/01_besoin/exemple-donnees.json` (jamais modifié, cf.
/// `.claude/rules/09-normes-developpement.md`) : sans ce repli, une valeur saisie par l'utilisateur serait
/// silencieusement perdue à chaque sauvegarde d'un document créé avant ce champ.
pub(crate) const MOTIF_NOMMAGE_BRANCHES_PAR_DEFAUT: &str =
    r"^(main|master|develop|feature/.+|release/.+|hotfix/.+)$";

/// Fonction de repli pour `#[serde(default = "...")]` sur [`Referentiels::motif_nommage_branches`] : seule forme
/// acceptée par `serde` pour une valeur par défaut non triviale (une constante `&str` ne se convertit pas
/// implicitement en `String` via cet attribut).
fn motif_nommage_branches_par_defaut() -> String {
    MOTIF_NOMMAGE_BRANCHES_PAR_DEFAUT.to_string()
}

/// Catégories de dépendance par défaut (US-048), appliquées en l'absence de valeur explicite dans
/// `referentiels.categoriesDependances` : `exec`, `os`, `fmkBack`, `fmkFront`, valeurs reprises telles quelles de la
/// demande fonctionnelle (aucune valeur chiffrée ou libellé imposé par un texte normatif — décision arbitraire à
/// valider par un humain, cf. rapport de développement de cet incrément). Chaque entrée porte un `id` (UUID stable),
/// un `libelle` (affiché dans l'administration et les infobulles) et un `sigle` de trois lettres (colonne compacte
/// de l'écran Obsolescence, US-051). Champ absent de tout document antérieur à US-048, y compris
/// `docs/01_besoin/exemple-donnees.json` (jamais modifié, cf. `.claude/rules/09-normes-developpement.md`) : sans ce
/// repli, la liste serait silencieusement vidée à chaque sauvegarde d'un document créé avant ce champ.
pub(crate) const CATEGORIES_DEPENDANCES_PAR_DEFAUT: &[(&str, &str, &str)] = &[
    ("40000000-0000-4000-8000-000000000001", "exec", "EXE"),
    ("40000000-0000-4000-8000-000000000002", "os", "OS"),
    ("40000000-0000-4000-8000-000000000003", "fmkBack", "FMB"),
    ("40000000-0000-4000-8000-000000000004", "fmkFront", "FMF"),
];

/// Fonction de repli pour `#[serde(default = "...")]` sur [`Referentiels::categories_dependances`], sur le modèle de
/// [`motif_nommage_branches_par_defaut`] : reconstruit la liste par défaut ([`CATEGORIES_DEPENDANCES_PAR_DEFAUT`])
/// sous la même forme JSON générique que les entrées saisies (`{ id, libelle, sigle }`).
fn categories_dependances_par_defaut() -> Vec<Value> {
    CATEGORIES_DEPENDANCES_PAR_DEFAUT
        .iter()
        .map(|(id, libelle, sigle)| {
            serde_json::json!({ "id": id, "libelle": libelle, "sigle": sigle })
        })
        .collect()
}

/// Identifiant stable de la règle de dépendances par défaut couvrant la version de Java (US-050) : le Connecteur
/// GitLab émet la version de Java des `pom.xml` comme une dépendance de référence `java`
/// ([`crate::connecteurs::gitlab`]), et cette règle la rattache par défaut à la catégorie `exec` pour qu'elle
/// alimente l'écran Obsolescence sans configuration préalable.
pub(crate) const REGLE_JAVA_ID: &str = "20000000-0000-4000-8000-000000000010";

/// Motif de la règle de dépendances par défaut couvrant la version de Java (cf. [`REGLE_JAVA_ID`]).
pub(crate) const REGLE_JAVA_MOTIF: &str = "java";

/// Règle de dépendances par défaut rattachant la version de Java (`reference: "java"`, US-050) à la catégorie
/// `exec`. Bornes de version (première ligne = version majeure la plus récente connue, cf. RG-050) : décision
/// arbitraire à valider par un humain, faute de valeur fixée par un texte normatif — révisable comme toute règle
/// de dépendances depuis l'écran de Paramétrage. `pub(crate)` : réutilisée par `migration_5_vers_6`, qui insère
/// cette règle dans un document antérieur à US-050 dépourvu de toute règle de motif `java`.
pub(crate) fn regle_java_par_defaut() -> Value {
    serde_json::json!({
        "id": REGLE_JAVA_ID,
        "motif": REGLE_JAVA_MOTIF,
        "categorie": CATEGORIES_DEPENDANCES_PAR_DEFAUT[0].0,
        "versions": [
            { "motifVersion": "21.*", "statut": "maintenu" },
            { "motifVersion": "17.*", "statut": "aJourM1" },
            { "motifVersion": "11.*", "statut": "aJourM3" },
            { "motifVersion": "8.*", "statut": "obsolete" },
            { "motifVersion": "*", "statut": "obsolete" }
        ]
    })
}

/// Statuts d'obsolescence bénéficiant d'un traitement dédié à l'affichage (libellé + couleur) sur les écrans de
/// restitution de l'interface, dans leur casse canonique. Miroir de
/// `StatutObsolescenceUtils.STATUTS_CANONIQUES` (`src/app/services/sansetat/jugement/statut-obsolescence.utils.ts`).
/// Le champ `statut` d'une borne de version reste une chaîne libre (RG-022) : toute autre valeur est acceptée.
pub(crate) const STATUTS_OBSOLESCENCE_CANONIQUES: [&str; 4] =
    ["obsolete", "maintenu", "aJourM1", "aJourM3"];

/// Renvoie la forme canonique d'un statut d'obsolescence correspondant, casse mise à part, à l'un des quatre
/// statuts de [`STATUTS_OBSOLESCENCE_CANONIQUES`] (`MAINTENU`/`Maintenu` → `maintenu`, `AJOURM1` → `aJourM1`, ...),
/// ou `None` si aucune correspondance (l'appelant conserve alors la valeur d'origine : `statut` demeure un champ
/// libre, RG-022, et un simple passage en minuscules casserait `aJourM1`/`aJourM3`). Amendement de RG-043
/// (Phase 16).
pub(crate) fn canoniser_casse_statut_obsolescence(statut: &str) -> Option<&'static str> {
    STATUTS_OBSOLESCENCE_CANONIQUES
        .into_iter()
        .find(|canonique| canonique.eq_ignore_ascii_case(statut))
}

/// Normalise en place la casse du champ `statut` de chaque borne de version d'une entrée de
/// `referentiels.reglesDependances` (`regle["versions"][*]["statut"]`), via
/// [`canoniser_casse_statut_obsolescence`]. Best-effort : toute forme inattendue (`versions` absent ou non tableau,
/// borne sans `statut` chaîne) est ignorée sans erreur. Point commun à la migration `6 → 7`
/// (`crate::persistance::migration`), à `crate::persistance::parametrage::definir_referentiel` et à
/// `crate::persistance::configuration_partageable::appliquer_ligne` (amendement de RG-043, Phase 16).
pub(crate) fn canoniser_casse_statuts_regle_dependance(regle: &mut Value) {
    let Some(versions) = regle.get_mut("versions").and_then(Value::as_array_mut) else {
        return;
    };
    for version in versions {
        let Some(objet) = version.as_object_mut() else {
            continue;
        };
        let Some(statut) = objet.get("statut").and_then(Value::as_str) else {
            continue;
        };
        let Some(canonique) = canoniser_casse_statut_obsolescence(statut) else {
            continue;
        };
        if canonique != statut {
            objet.insert("statut".to_string(), Value::from(canonique));
        }
    }
}

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
/// `GitlabDependances` est produite depuis l'incrément de rattrapage de la Phase 5 par
/// `interroger_dependances` (cf. `crate::connecteurs::gitlab`) : parseur best-effort de manifestes de dépendances,
/// limité en V1 aux trois écosystèmes illustrés par `docs/01_besoin/exemple-donnees.json` (`pom.xml` Maven,
/// `package.json` npm, `build.gradle` Gradle). `GitlabMarqueursIa` est produite depuis la Phase 5, incrément 7 par
/// `interroger_marqueurs_ia` (cf. `crate::connecteurs::gitlab`).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub(crate) enum Resultat {
    /// Constat brut des dépendances déclarées par les manifestes du dépôt (production différée, cf. commentaire
    /// ci-dessus).
    #[serde(rename = "gitlab.dependances")]
    GitlabDependances(ResultatGitlabDependances),
    /// Constat brut de l'état des branches du dépôt (produit depuis l'incrément de rattrapage de la Phase 5 par
    /// `interroger_branches_completes`, cf. `crate::connecteurs::gitlab`). Ne porte plus, depuis ce même
    /// incrément, ni `nommageConforme` (RG-030 : recalculé à l'affichage par le Moteur de jugement depuis
    /// `referentiels.motifNommageBranches`, jamais stocké en constat) ni `rebasee` (abandonné entièrement : aucune
    /// définition opérationnelle abordable sans un appel de comparaison GitLab par branche, coût réseau jugé
    /// disproportionné, cf. `docs/02_documentation/02_glossaire.md#journal-des-décisions`).
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
///
/// Ne porte ni `rebasee` ni `nommageConforme` : décision actée en amont de la Phase 6 (incrément de rattrapage de
/// la Phase 5), cf. commentaire de [`Resultat::GitlabBranches`] et
/// `docs/02_documentation/02_glossaire.md#journal-des-décisions`. Un document historique produit avant cette
/// décision porte encore ces deux clés dans son JSON : `serde` les ignore silencieusement à la désérialisation
/// (comportement par défaut, aucune clé inconnue déclarée), sans que ce soit une anomalie.
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
    /// URL de la merge request sur l'instance GitLab ; champ optionnel à la désérialisation pour
    /// compatibilité avec les fichiers de données plus anciens, créés avant l'ajout de ce champ
    /// (Phase 14, incrément 7). Absent des fichiers antérieurs, la valeur par défaut est une
    /// chaîne vide.
    #[serde(default)]
    pub(crate) web_url: String,
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

/// Nature d'un [`Audit`] (C15-14, audit historique à date passée) : `Reguliere` pour un audit produit à la date du
/// jour de la campagne (comportement historique, seule variante possible avant cette évolution), `Historique` pour
/// un audit portant sur une date passée demandée explicitement, à périmètre d'indicateurs réduit (arbitrage humain
/// du 2026-08-18, cf. [RG-046](../../../docs/02_documentation/05_reglesGestion.md#audits-et-campagnes)).
///
/// `#[default]` sur la variante `Reguliere` (idiome standard, stable depuis Rust 1.62, `derive(Default)` sur enum) :
/// tout fichier de données antérieur à cette évolution, dépourvu du champ `typeAudit`, désérialise donc chacun de
/// ses audits existants comme `Reguliere` (`#[serde(default)]` sur [`Audit::type_audit`]) — rétrocompatibilité
/// totale, aucune migration de donnée nécessaire au-delà du bump de version de schéma (cf.
/// [`crate::modele::racine::VERSION_SCHEMA_COURANTE`]).
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) enum TypeAudit {
    /// Audit produit à la date du jour de la campagne qui l'a réalisé (comportement historique).
    #[default]
    Reguliere,
    /// Audit portant sur une date passée demandée explicitement (C15-14), à périmètre d'indicateurs réduit.
    Historique,
}

/// Historique d'audit d'un projet : un ensemble de constats bruts obtenus à une date donnée.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Audit {
    /// Identifiant UUID v4 de l'audit.
    pub(crate) id: String,
    /// Date effectivement analysée par cet audit (C15-14) : pour un audit régulier, date d'exécution de la
    /// campagne (comportement historique inchangé) ; pour un audit historique, la date ciblée demandée — résolue/
    /// repliée sur la date Sonar disponible la plus proche pour les indicateurs Sonar concernés, cf.
    /// `crate::connecteurs::sonar::selectionner_point_le_plus_proche`. C'est ce choix qui permet de positionner
    /// correctement un audit historique sur l'axe temporel de la Synthèse graphique sans aucun changement de la
    /// mécanique de tri/affichage existante, `date` restant la seule donnée temporelle qu'elle consulte. Décision
    /// arbitraire (cf. rapport de développement de cette évolution), non couverte explicitement par l'arbitrage du
    /// 2026-08-18.
    pub(crate) date: String,
    /// Identifiant de la campagne qui a produit cet audit.
    pub(crate) campagne_id: String,
    /// Résultats typés obtenus (catalogue figé, cf. commentaire de [`Resultat`]).
    #[serde(default)]
    pub(crate) resultats: Vec<Resultat>,
    /// Nature de cet audit (C15-14) : `Reguliere` par défaut pour la rétrocompatibilité des fichiers de données
    /// antérieurs à cette évolution (cf. [`TypeAudit`]).
    #[serde(default)]
    pub(crate) type_audit: TypeAudit,
    /// Horodatage réel de la campagne qui a produit cet audit (C15-14) : renseigné uniquement pour un audit
    /// historique (`type_audit == TypeAudit::Historique`), où il se distingue de `date` (date ciblée demandée,
    /// potentiellement très antérieure à l'exécution réelle de la campagne) ; toujours absent pour un audit
    /// régulier, où il serait redondant avec `date` (décision arbitraire, cf. rapport de développement de cette
    /// évolution).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) date_execution: Option<String>,
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
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
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
    /// Motif d'expression régulière de nommage de branche, paramétrable (RG-030) : consommé exclusivement par le
    /// Moteur de jugement (Phase 6) pour recalculer à l'affichage la conformité de nommage d'une branche
    /// (`Resultat::GitlabBranches`), jamais stocké comme un constat. `#[serde(default = "...")]` plutôt que
    /// `#[derive(Default)]` seul sur la structure (retiré ci-dessus) : la valeur par défaut de `String` serait la
    /// chaîne vide, alors que RG-030 exige un repli représentant effectivement la convention Gitflow (cf.
    /// [`Referentiels::default`] ci-dessous, qui applique le même repli qu'à la désérialisation).
    #[serde(default = "motif_nommage_branches_par_defaut")]
    pub(crate) motif_nommage_branches: String,
    /// Catégories de dépendance administrables (US-048), consommées par le Moteur de jugement (RG-049, RG-050) et
    /// l'écran Obsolescence (US-051) : chaque règle de dépendance peut porter l'`id` d'une de ces catégories.
    /// Représentées en `Value` générique, comme [`Self::regles_dependances`], le cœur natif n'effectuant qu'un
    /// round-trip fidèle et une validation de forme minimale (cf.
    /// `crate::persistance::parametrage::valider_entree_categorie_dependance`). `#[serde(default = "...")]` plutôt
    /// que `#[serde(default)]` seul : un document antérieur à US-048 doit récupérer la liste par défaut
    /// ([`CATEGORIES_DEPENDANCES_PAR_DEFAUT`]) et non une liste vide (même choix que `motif_nommage_branches`).
    #[serde(default = "categories_dependances_par_defaut")]
    pub(crate) categories_dependances: Vec<Value>,
}

impl Default for Referentiels {
    fn default() -> Self {
        Self {
            regles_dependances: vec![regle_java_par_defaut()],
            regles_marqueurs_ia: Vec::new(),
            motif_nommage_branches: motif_nommage_branches_par_defaut(),
            categories_dependances: categories_dependances_par_defaut(),
        }
    }
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

/// Valeur par défaut de [`Parametres::seuil_avertissement_taille_octets`], utilisée par `#[serde(default = "...")]`
/// (une fonction est requise ici, `#[derive(Default)]` seul appliquerait `0` plutôt que
/// [`SEUIL_AVERTISSEMENT_TAILLE_OCTETS_PAR_DEFAUT`]).
fn seuil_avertissement_taille_octets_par_defaut() -> u64 {
    SEUIL_AVERTISSEMENT_TAILLE_OCTETS_PAR_DEFAUT
}

/// Seuils et réglages applicatifs (racine `parametres`).
///
/// Décision de modélisation (cf. commentaire d'en-tête du fichier) : `seuils` reste une valeur JSON générique, le
/// détail des grilles de seuils relevant du Moteur de jugement (Phase 6, hors périmètre de la Phase 1) et la règle
/// « aucune valeur de seuil codée en dur » imposant de ne jamais figer ici une liste de seuils par anticipation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
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
    /// Seuil de taille, en octets, déclenchant l'avertissement contextuel de purge à la sauvegarde (US-035,
    /// RG-031, RG-032).
    #[serde(default = "seuil_avertissement_taille_octets_par_defaut")]
    pub(crate) seuil_avertissement_taille_octets: u64,
}

impl Default for Parametres {
    fn default() -> Self {
        Self {
            seuils: Value::default(),
            verrouillage: Verrouillage::default(),
            audit: ParametresAudit::default(),
            proxy: None,
            sauvegarde: Sauvegarde::default(),
            seuil_avertissement_taille_octets: SEUIL_AVERTISSEMENT_TAILLE_OCTETS_PAR_DEFAUT,
        }
    }
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
    use regex::Regex;

    #[test]
    fn canoniser_casse_statut_obsolescence_remappe_les_quatre_valeurs_et_ignore_le_reste() {
        assert_eq!(
            canoniser_casse_statut_obsolescence("MAINTENU"),
            Some("maintenu")
        );
        assert_eq!(
            canoniser_casse_statut_obsolescence("Maintenu"),
            Some("maintenu")
        );
        assert_eq!(
            canoniser_casse_statut_obsolescence("ajourm1"),
            Some("aJourM1")
        );
        assert_eq!(
            canoniser_casse_statut_obsolescence("obsolete"),
            Some("obsolete")
        );
        assert_eq!(canoniser_casse_statut_obsolescence("aSurveiller"), None);
        assert_eq!(canoniser_casse_statut_obsolescence(""), None);
    }

    #[test]
    fn canoniser_casse_statuts_regle_dependance_reecrit_uniquement_les_statuts_connus() {
        let mut regle = serde_json::json!({
            "id": "d1",
            "motif": "lodash",
            "versions": [
                { "motifVersion": "5.*", "statut": "MAINTENU" },
                { "motifVersion": "3.*", "statut": "libreInconnu" },
                { "motifVersion": "1.*" }
            ]
        });

        canoniser_casse_statuts_regle_dependance(&mut regle);

        assert_eq!(regle["versions"][0]["statut"], Value::from("maintenu"));
        assert_eq!(regle["versions"][1]["statut"], Value::from("libreInconnu"));
        assert_eq!(regle["versions"][2]["motifVersion"], Value::from("1.*"));
    }

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
                    type_audit: TypeAudit::Reguliere,
                    date_execution: None,
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
        // Extrait de docs/01_besoin/exemple-donnees.json (résultat gitlab.branches, document historique antérieur
        // à l'incrément de rattrapage de la Phase 5) : `rebasee` et `nommageConforme` sont volontairement conservés
        // dans la charge JSON source pour vérifier que ces clés désormais inconnues de `Branche` sont ignorées
        // silencieusement par `serde` (comportement par défaut) plutôt que de faire échouer la désérialisation ;
        // aucune assertion ne porte plus sur ces deux champs, retirés du modèle (cf. commentaire de [`Branche`]).
        // Vérifie par ailleurs que le champ `avecMR` (sigle « MR » entièrement capitalisé) est bien reconnu, à la
        // différence de la conversion `camelCase` par défaut de `avec_mr`, qui produirait `avecMr` (une seule
        // lettre capitalisée).
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
        assert_eq!(resultat.branches[0].dernier_commit_le, "2026-06-05");

        let json = serde_json::to_string(&resultat)?;
        assert!(json.contains("\"avecMR\":true"));
        assert!(!json.contains("rebasee"));
        assert!(!json.contains("nommageConforme"));
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
    fn referentiels_motif_nommage_branches_survit_a_un_aller_retour_json()
    -> Result<(), Box<dyn std::error::Error>> {
        let referentiels = Referentiels {
            regles_dependances: vec![],
            regles_marqueurs_ia: vec![],
            motif_nommage_branches: r"^feature/.+$".to_string(),
            categories_dependances: categories_dependances_par_defaut(),
        };

        let json = serde_json::to_string(&referentiels)?;
        let relu: Referentiels = serde_json::from_str(&json)?;

        assert_eq!(referentiels, relu);
        assert_eq!(relu.motif_nommage_branches, r"^feature/.+$");
        assert!(json.contains("\"motifNommageBranches\":\"^feature/.+$\""));
        Ok(())
    }

    #[test]
    fn referentiels_categories_dependances_par_defaut_porte_les_quatre_valeurs_de_la_demande() {
        // US-048 : un fichier neuf démarre avec les catégories `exec`, `os`, `fmkBack`, `fmkFront` (à la
        // différence de `reglesDependances`/`reglesMarqueursIA`, listes vides à la création). Chaque entrée porte
        // `id`, `libelle` et `sigle`.
        let referentiels = Referentiels::default();
        let libelles: Vec<&str> = referentiels
            .categories_dependances
            .iter()
            .filter_map(|entree| entree.get("libelle").and_then(Value::as_str))
            .collect();
        assert_eq!(libelles, vec!["exec", "os", "fmkBack", "fmkFront"]);
        for entree in &referentiels.categories_dependances {
            assert!(entree.get("id").and_then(Value::as_str).is_some());
            assert!(entree.get("sigle").and_then(Value::as_str).is_some());
        }
    }

    #[test]
    fn referentiels_document_historique_sans_categories_dependances_se_desserialise_a_la_liste_par_defaut()
    -> Result<(), Box<dyn std::error::Error>> {
        // Non-régression (US-048), sur le modèle du test de non-régression de `motifNommageBranches` : le champ
        // absent du JSON doit se désérialiser à la liste par défaut (`#[serde(default = "...")]`) plutôt que d'être
        // silencieusement vidé.
        let referentiels: Referentiels = serde_json::from_str(
            r#"{
                "reglesDependances": [],
                "reglesMarqueursIA": [],
                "motifNommageBranches": "^feature/.+$"
            }"#,
        )?;

        assert_eq!(
            referentiels.categories_dependances,
            categories_dependances_par_defaut()
        );
        Ok(())
    }

    #[test]
    fn referentiels_categories_dependances_videes_par_ladministrateur_ne_sont_pas_reamorcees()
    -> Result<(), Box<dyn std::error::Error>> {
        // Le repli ne s'applique qu'à un champ absent : une liste explicitement vide (l'administrateur a supprimé
        // toutes les catégories) doit survivre à un aller-retour JSON sans être ré-amorcée aux quatre valeurs.
        let referentiels: Referentiels = serde_json::from_str(
            r#"{
                "reglesDependances": [],
                "reglesMarqueursIA": [],
                "motifNommageBranches": "^feature/.+$",
                "categoriesDependances": []
            }"#,
        )?;

        assert!(referentiels.categories_dependances.is_empty());
        Ok(())
    }

    #[test]
    fn referentiels_motif_nommage_branches_par_defaut_est_non_vide_et_conforme_gitflow()
    -> Result<(), Box<dyn std::error::Error>> {
        // RG-030 : la valeur par défaut doit représenter effectivement la convention Gitflow, pas une chaîne vide
        // (ce que produirait un simple `#[derive(Default)]` sur `String`, cf. commentaire de [`Referentiels`]).
        let referentiels = Referentiels::default();
        assert!(!referentiels.motif_nommage_branches.is_empty());

        let motif = Regex::new(&referentiels.motif_nommage_branches)?;
        for nom_conforme in [
            "main",
            "master",
            "develop",
            "feature/paiement-sepa",
            "release/1.2.0",
            "hotfix/urgent",
        ] {
            assert!(
                motif.is_match(nom_conforme),
                "le nom de branche '{nom_conforme}' devrait être reconnu conforme par le motif Gitflow par défaut"
            );
        }
        assert!(
            !motif.is_match("n-importe-quoi"),
            "un nom de branche hors convention Gitflow ne devrait pas être reconnu conforme"
        );
        // R10-11 : `bugfix/*` est une extension non strictement canonique de Gitflow, retirée du motif par défaut.
        assert!(
            !motif.is_match("bugfix/correction-typo"),
            "'bugfix/*' ne fait plus partie du motif Gitflow par défaut depuis R10-11"
        );
        Ok(())
    }

    #[test]
    fn referentiels_document_historique_sans_motif_nommage_branches_se_desserialise_a_la_valeur_par_defaut()
    -> Result<(), Box<dyn std::error::Error>> {
        // Non-régression (Phase 6, incrément 1) : document historique antérieur à l'ajout de
        // `motifNommageBranches`, sur le modèle des tests de non-régression déjà présents dans ce fichier
        // (`avecMR`, `reglesMarqueursIA`, `duplicationNouveauCode`). Le champ absent du JSON doit se désérialiser
        // au repli Gitflow (`#[serde(default = "...")]`) plutôt que de faire échouer la désérialisation.
        let referentiels: Referentiels = serde_json::from_str(
            r#"{
                "reglesDependances": [],
                "reglesMarqueursIA": []
            }"#,
        )?;

        assert_eq!(
            referentiels.motif_nommage_branches,
            MOTIF_NOMMAGE_BRANCHES_PAR_DEFAUT
        );
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

    #[test]
    fn audit_historique_sans_type_audit_ni_date_execution_se_desserialise_en_audit_regulier()
    -> Result<(), Box<dyn std::error::Error>> {
        // Non-régression (C15-14) : document historique antérieur à l'ajout de `typeAudit`/`dateExecution`, sur le
        // même modèle que les deux tests précédents. Les deux champs absents du JSON doivent se désérialiser à
        // leur repli (`TypeAudit::Reguliere` via `#[default]`, `None`) plutôt que de faire échouer la
        // désérialisation.
        let audit: Audit = serde_json::from_str(
            r#"{
                "id": "10000000-0000-4000-8000-000000000001",
                "date": "2026-06-05",
                "campagneId": "e0000000-0000-4000-8000-000000000001",
                "resultats": []
            }"#,
        )?;

        assert_eq!(audit.type_audit, TypeAudit::Reguliere);
        assert_eq!(audit.date_execution, None);
        Ok(())
    }

    #[test]
    fn audit_historique_survit_a_un_aller_retour_json_avec_date_execution()
    -> Result<(), Box<dyn std::error::Error>> {
        // C15-14 : un audit historique porte `typeAudit: "historique"` et `dateExecution` (horodatage réel de la
        // campagne), distinct de `date` (date ciblée demandée) — round-trip complet pour vérifier la sérialisation
        // camelCase des deux nouveaux champs.
        let audit = Audit {
            id: "10000000-0000-4000-8000-000000000002".to_string(),
            date: "2025-01-15".to_string(),
            campagne_id: "e0000000-0000-4000-8000-000000000001".to_string(),
            resultats: vec![],
            type_audit: TypeAudit::Historique,
            date_execution: Some("2026-06-05T10:00:00Z".to_string()),
        };

        let json = serde_json::to_value(&audit)?;
        assert_eq!(json["typeAudit"], serde_json::json!("historique"));
        assert_eq!(
            json["dateExecution"],
            serde_json::json!("2026-06-05T10:00:00Z")
        );

        let relu: Audit = serde_json::from_value(json)?;
        assert_eq!(relu, audit);
        Ok(())
    }

    #[test]
    fn audit_regulier_omet_date_execution_a_la_serialisation()
    -> Result<(), Box<dyn std::error::Error>> {
        // `skip_serializing_if = "Option::is_none"` sur `dateExecution` (C15-14) : un audit régulier, où ce champ
        // n'a pas de sens (cf. Rustdoc d'`Audit::date_execution`), ne doit pas polluer le JSON produit.
        let audit = Audit {
            id: "10000000-0000-4000-8000-000000000003".to_string(),
            date: "2026-06-05".to_string(),
            campagne_id: "e0000000-0000-4000-8000-000000000001".to_string(),
            resultats: vec![],
            type_audit: TypeAudit::Reguliere,
            date_execution: None,
        };

        let json = serde_json::to_value(&audit)?;
        let objet = json.as_object().ok_or("objet JSON attendu")?;
        assert!(!objet.contains_key("dateExecution"));
        assert_eq!(json["typeAudit"], serde_json::json!("reguliere"));
        Ok(())
    }
}
