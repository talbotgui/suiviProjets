// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Utilitaires partagés par plusieurs modules de commandes de la Façade, extraits pour éviter toute duplication
//! entre `commandes/audit.rs` (dix opérations d'interrogation d'indicateurs, US-009) et
//! `commandes/commits_membres.rs` (roster et événements de poussée de l'écran « Commits des membres », US-060 /
//! RG-060). Ces deux ensembles de commandes partagent la même façon de résoudre le credential mémorisé en session
//! pour l'instance concernée (US-003).

use super::etat_session::EtatSession;
use crate::connecteurs::commun::ErreurConnecteur;
use crate::modele::racine::Instance;

/// Résout le credential mémorisé en session pour l'instance demandée, ou [`ErreurConnecteur::CredentialAbsent`] à
/// défaut (US-003).
///
/// Factorisé ici depuis `commandes/audit.rs` (où il servait déjà les dix commandes d'interrogation d'indicateurs)
/// pour être réutilisé à l'identique par les commandes de `commandes/commits_membres.rs`.
///
/// # Erreurs
///
/// [`ErreurConnecteur::CredentialAbsent`] si aucun credential n'a été saisi pour cette instance dans la session
/// courante.
pub(super) fn credential_instance(
    instance: &Instance,
    etat: &EtatSession,
) -> Result<String, ErreurConnecteur> {
    etat.credential(&instance.id)
        .ok_or_else(|| ErreurConnecteur::CredentialAbsent {
            message: "Aucun credential en mémoire pour cette instance".to_string(),
        })
}
