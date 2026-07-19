// Fichier de référence exemplaire (gabarit) pour tout futur module Rust de connecteur de ce projet, généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
//! Module de référence illustrant les conventions attendues pour tout module Rust de connecteur du projet :
//! visibilité la plus restrictive possible, documentation Rustdoc systématique, anomalies typées plutôt qu'une
//! panique (`clippy::unwrap_used`/`clippy::expect_used` interdits, cf.
//! `docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--rust`).
//!
//! Ce module est un gabarit : il n'est invoqué par aucun appel réseau réel de l'application à ce stade (Phase 0 —
//! bootstrap) ; seuls ses tests l'exercent, d'où l'autorisation explicite de code mort ci-dessous en dehors des
//! tests.

/// Catégorie d'anomalie pouvant survenir lors d'un appel réalisé par un connecteur, à titre d'exemple du typage
/// strict des anomalies attendu par les normes de tests du projet (cf. RG-021).
#[derive(Debug, PartialEq, Eq)]
pub(crate) enum ErreurExempleReference {
    /// L'instance distante n'a pas répondu dans le délai imparti.
    DelaiDepasse,
}

/// Interroge, à titre d'exemple, une instance distante et retourne un résultat typé plutôt que de recourir à une
/// panique en cas d'anomalie.
///
/// # Erreurs
///
/// Retourne [`ErreurExempleReference::DelaiDepasse`] si l'instance ne répond pas dans le délai imparti.
#[allow(
    dead_code,
    reason = "gabarit de référence non invoqué par une logique applicative réelle à ce stade (Phase 0) ; exercé uniquement par les tests ci-dessous"
)]
pub(crate) fn interroger_exemple(instance_disponible: bool) -> Result<u32, ErreurExempleReference> {
    if instance_disponible {
        Ok(0)
    } else {
        Err(ErreurExempleReference::DelaiDepasse)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn interroger_exemple_reussit_si_instance_disponible() {
        assert_eq!(interroger_exemple(true), Ok(0));
    }

    #[test]
    fn interroger_exemple_signale_le_delai_depasse_si_instance_indisponible() {
        assert_eq!(
            interroger_exemple(false),
            Err(ErreurExempleReference::DelaiDepasse)
        );
    }
}
