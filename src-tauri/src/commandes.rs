// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Façade de commandes : frontière unique entre l'interface Angular et le cœur natif (cf.
//! `docs/02_documentation/11_architectureTechnique.md#découpage-en-composantsmodules-et-responsabilités`).
//!
//! Périmètre de la Phase 1 : commandes strictement nécessaires à la création, au chargement, à la sauvegarde et au
//! verrouillage/déverrouillage du fichier de données (US-001, US-002, US-026). Périmètre de la Phase 2 : saisie en
//! mémoire des credentials et test de connectivité (US-003, US-004). Périmètre de la Phase 4 : qualification des
//! membres connus d'un groupe et politique d'autorisation de l'IA d'un projet (US-022 à US-024). La Façade n'est
//! jamais testée isolément : chaque commande délègue au module qu'elle route (Moteur de persistance, Connecteur
//! GitLab/Sonar), déjà couvert par ses propres tests unitaires (cf.
//! `docs/02_documentation/16_normesTests.md#tests-unitaires`).

pub(crate) mod administration;
pub(crate) mod connectivite;
pub(crate) mod etat_session;
pub(crate) mod fichier;
