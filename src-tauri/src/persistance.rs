// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Moteur de persistance : sérialisation, compression, chiffrement/déchiffrement, migration de version de schéma
//! et sauvegardes de sécurité horodatées du fichier de données (cf.
//! `docs/02_documentation/11_architectureTechnique.md#découpage-en-composantsmodules-et-responsabilités`,
//! `docs/02_documentation/12_modeleDonnees.md#stratégie-de-persistance`).
//!
//! Périmètre de la Phase 1 (US-001, US-002, US-026 ; RG-001 à RG-005) : création, chargement et sauvegarde d'un
//! fichier chiffré, migration de schéma, repli de dérivation de clé, sauvegardes de sécurité, détection de fichier
//! verrouillé et nettoyage d'un fichier temporaire orphelin. Périmètre de la Phase 4 (US-022 à US-024 ; RG-006 à
//! RG-008, RG-012, RG-014 à RG-016, RG-023) : qualification d'un membre connu d'un groupe et définition de la
//! politique d'autorisation de l'IA d'un projet (`administration`). Périmètre de la Phase 5, incrément 2
//! (US-014 ; RG-019) : cycle de vie du brouillon d'une campagne (`audit`). Périmètre de la Phase 7, incrément 1
//! (US-033 ; RG-022, RG-023, RG-030) : modification d'un seuil de couleur et ajout/modification/remplacement d'un
//! référentiel (`parametrage`). Périmètre de la Phase 7, incrément 4 (US-025 ; RG-024, RG-025) : purge des audits
//! anciens par densité ou par âge, avec prévisualisation systématique (`purge`). Périmètre de la Phase 8
//! (US-019, US-020 ; RG-026) : création d'une annotation de portée groupe ou projet et qualification d'une alerte
//! (statut vu/traité, `alertes`). Périmètre de la Phase 9, incrément 1 (US-028 ; RG-027) : création, mise à jour et
//! suppression d'une vue enregistrée (`vues`). Ces modules opèrent tous en mémoire sur une
//! [`crate::modele::racine::DonneesRacine`] déjà chargée, sans toucher elles-mêmes le disque.

pub(crate) mod administration;
pub(crate) mod alertes;
pub(crate) mod audit;
pub(crate) mod configuration_partageable;
pub(crate) mod enveloppe;
pub(crate) mod erreurs;
pub(crate) mod kdf;
pub(crate) mod migration;
pub(crate) mod moteur;
pub(crate) mod parametrage;
pub(crate) mod purge;
pub(crate) mod vues;
