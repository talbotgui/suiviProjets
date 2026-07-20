// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Anomalies typées du Moteur de persistance, en lieu et place de toute panique (`clippy::unwrap_used`/
//! `clippy::expect_used` interdits, cf.
//! `docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--rust`).
//!
//! Un mot de passe incorrect et un fichier altéré partagent volontairement la même variante d'anomalie
//! ([`ErreurPersistance::MotDePasseOuFichierInvalide`]) : l'échec d'authentification AES-256-GCM ne permet de
//! toute façon pas de distinguer les deux cas, et les confondre évite d'exposer une information technique
//! exploitable à l'utilisateur (US-002 : « signalé sans exposer d'information technique sensible »).

use std::path::PathBuf;
use thiserror::Error;

/// Anomalie pouvant survenir lors d'une opération du Moteur de persistance.
#[derive(Debug, Error)]
pub(crate) enum ErreurPersistance {
    /// Le fichier de données désigné n'existe pas.
    #[error("le fichier de données est introuvable")]
    FichierIntrouvable(PathBuf),

    /// Le mot de passe fourni ne permet pas de déchiffrer le fichier, ou son contenu est altéré : l'échec
    /// d'authentification AES-256-GCM ne permet pas de distinguer ces deux cas (US-002).
    #[error("mot de passe incorrect ou fichier de données altéré")]
    MotDePasseOuFichierInvalide,

    /// L'enveloppe binaire ne porte pas la signature attendue ou une version d'enveloppe non reconnue.
    #[error("format d'enveloppe non reconnu par cette version de l'application")]
    EnveloppeNonReconnue,

    /// La version de schéma du fichier est postérieure à la version courante de l'application : un fichier créé
    /// par une version plus récente est refusé explicitement plutôt que migré de façon hasardeuse (US-002,
    /// `docs/02_documentation/12_modeleDonnees.md#stratégie-de-migration-des-données`).
    #[error(
        "le fichier a été créé par une version plus récente de l'application (schéma {version_fichier}, version courante {version_courante})"
    )]
    VersionSchemaSuperieure {
        /// Version de schéma portée par le fichier.
        version_fichier: u32,
        /// Version de schéma courante de l'application.
        version_courante: u32,
    },

    /// Le fichier cible est verrouillé par un autre processus au moment de la sauvegarde (cf.
    /// `docs/02_documentation/13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique`).
    #[error("le fichier de données est verrouillé par un autre processus")]
    FichierVerrouille,

    /// Erreur d'entrée/sortie sur le système de fichiers.
    #[error("erreur d'entrée/sortie sur le fichier de données")]
    ErreurEntreeSortie(#[from] std::io::Error),

    /// Erreur de sérialisation ou de désérialisation JSON.
    #[error("erreur de (dé)sérialisation du contenu du fichier de données")]
    ErreurSerialisation(#[from] serde_json::Error),

    /// Erreur de compression ou de décompression zstd.
    #[error("erreur de compression du contenu du fichier de données")]
    ErreurCompression,

    /// Erreur de chiffrement ou de déchiffrement AES-256-GCM ne relevant pas d'un mot de passe incorrect (ex.
    /// paramètres de chiffrement invalides).
    #[error("erreur de chiffrement du contenu du fichier de données")]
    ErreurChiffrement,

    /// Aucune fonction de migration connue ne permet de faire progresser un fichier depuis cette version de
    /// schéma vers la version courante de l'application.
    #[error("aucune migration connue depuis la version de schéma {version_source}")]
    EtapeMigrationManquante {
        /// Version de schéma à partir de laquelle aucune étape de migration n'est enregistrée.
        version_source: u32,
    },
}
