// Fichier généré avec l'assistance de l'IA (Claude Code) lors du bootstrap du poste de développement (Phase 0),
// conformément à la mention d'origine requise par .claude/rules/01-usage-ia-et-conventions.md.

//! Regroupe les connecteurs Rust (Connecteur GitLab, Connecteur Sonar), cf.
//! `docs/02_documentation/11_architectureTechnique.md#découpage-en-composantsmodules-et-responsabilités`.
//!
//! Depuis la Phase 2 (US-004), `gitlab` et `sonar` exposent chacun un test de connectivité de credential ;
//! `commun` regroupe les types d'anomalie et le client HTTP partagés par les deux. Les opérations d'interrogation
//! des indicateurs (dépendances, violations, etc.) relèvent du Moteur d'audit (Phase 5).

pub(crate) mod commun;
pub(crate) mod exemple_reference;
pub(crate) mod gitlab;
pub(crate) mod sonar;

#[cfg(test)]
mod tests_integration_reelle;
