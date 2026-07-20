// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Moteur de persistance : sérialisation, compression, chiffrement/déchiffrement, migration de version de schéma
//! et sauvegardes de sécurité horodatées du fichier de données (cf.
//! `docs/02_documentation/11_architectureTechnique.md#découpage-en-composantsmodules-et-responsabilités`,
//! `docs/02_documentation/12_modeleDonnees.md#stratégie-de-persistance`).
//!
//! Périmètre de la Phase 1 (US-001, US-002, US-026 ; RG-001 à RG-005) : création, chargement et sauvegarde d'un
//! fichier chiffré, migration de schéma, repli de dérivation de clé, sauvegardes de sécurité, détection de fichier
//! verrouillé et nettoyage d'un fichier temporaire orphelin. Aucune logique de gestion (CRUD groupes/projets/
//! sources, catalogue d'audit, moteur de jugement) n'est implémentée ici.

pub(crate) mod enveloppe;
pub(crate) mod erreurs;
pub(crate) mod kdf;
pub(crate) mod migration;
pub(crate) mod moteur;
