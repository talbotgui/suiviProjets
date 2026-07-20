// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! État de session détenu côté cœur natif par la Façade de commandes (US-026, RG-002, RG-004, RG-005) : chemin du
//! fichier actuellement ouvert et clé dérivée courante. Le mot de passe lui-même n'est jamais conservé, seule la
//! clé dérivée l'est, pour la durée de la session (RG-002). Le verrouillage efface la clé dérivée sans oublier le
//! chemin du fichier, afin de permettre un déverrouillage ultérieur par nouvelle vérification du mot de passe sans
//! ressaisie du chemin (cf. `docs/02_documentation/13_conceptionDetaillee.md#séquences-des-scénarios-fonctionnels-principaux`,
//! séquence « Verrouiller et déverrouiller la session »).
//!
//! Géré par Tauri comme état managé ([`tauri::Manager::manage`]), partagé entre toutes les commandes de la
//! session applicative.

use crate::persistance::kdf::TAILLE_CLE;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard, PoisonError};
use zeroize::Zeroize;

/// Clé dérivée détenue en mémoire, effacée explicitement (mise à zéro) à sa destruction plutôt que laissée dans
/// une zone mémoire réutilisable en clair (RG-002, RG-005, RNF-013).
struct CleSession([u8; TAILLE_CLE]);

impl Drop for CleSession {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}

/// Contenu protégé par le verrou interne de [`EtatSession`].
#[derive(Default)]
struct EtatSessionInterieur {
    /// Chemin du fichier de données actuellement ouvert, conservé y compris pendant un verrouillage temporaire.
    chemin_fichier: Option<PathBuf>,
    /// Clé dérivée courante, absente lorsque la session est verrouillée ou qu'aucun fichier n'est ouvert.
    cle_derivee: Option<CleSession>,
}

/// État de session de la Façade de commandes, partagé entre les commandes via l'état managé de Tauri.
#[derive(Default)]
pub(crate) struct EtatSession {
    interieur: Mutex<EtatSessionInterieur>,
}

/// Accède au contenu protégé, en récupérant les données même si le verrou a été empoisonné par une panique
/// antérieure : aucune commande de ce module ne recourt à `.unwrap()`/`.expect()`, un empoisonnement ne devrait
/// donc jamais survenir en pratique, mais la récupération explicite évite qu'une telle panique, si elle survenait
/// malgré tout, ne rende la session définitivement inutilisable.
fn deverrouiller_mutex<'a>(
    resultat: Result<
        MutexGuard<'a, EtatSessionInterieur>,
        PoisonError<MutexGuard<'a, EtatSessionInterieur>>,
    >,
) -> MutexGuard<'a, EtatSessionInterieur> {
    match resultat {
        Ok(garde) => garde,
        Err(empoisonne) => empoisonne.into_inner(),
    }
}

impl EtatSession {
    /// Construit un état de session vide (aucun fichier ouvert).
    pub(crate) fn nouveau() -> Self {
        Self::default()
    }

    /// Enregistre le fichier ouvert et sa clé dérivée courante, remplaçant tout état précédent.
    pub(crate) fn definir(&self, chemin_fichier: PathBuf, cle_derivee: [u8; TAILLE_CLE]) {
        let mut interieur = deverrouiller_mutex(self.interieur.lock());
        interieur.chemin_fichier = Some(chemin_fichier);
        interieur.cle_derivee = Some(CleSession(cle_derivee));
    }

    /// Chemin du fichier actuellement ouvert, y compris lorsque la session est verrouillée.
    pub(crate) fn chemin_fichier(&self) -> Option<PathBuf> {
        deverrouiller_mutex(self.interieur.lock())
            .chemin_fichier
            .clone()
    }

    /// Efface la clé dérivée et l'ensemble des credentials détenus (aucun credential en Phase 1), sans oublier le
    /// chemin du fichier ouvert (RG-005). Utilisé par la commande de verrouillage de session.
    pub(crate) fn purger(&self) {
        deverrouiller_mutex(self.interieur.lock()).cle_derivee = None;
    }

    /// Indique si une clé dérivée est actuellement détenue (session déverrouillée avec un fichier ouvert).
    #[allow(
        dead_code,
        reason = "aucune commande de la Façade n'a encore besoin d'interroger cet état à ce stade (Phase 1) ; exercé par les tests ci-dessous, prêt pour les commandes ultérieures"
    )]
    pub(crate) fn est_deverrouillee(&self) -> bool {
        deverrouiller_mutex(self.interieur.lock())
            .cle_derivee
            .is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn etat_initial_ne_porte_aucun_fichier_ni_aucune_cle() {
        let etat = EtatSession::nouveau();

        assert_eq!(etat.chemin_fichier(), None);
        assert!(!etat.est_deverrouillee());
    }

    #[test]
    fn definir_puis_purger_efface_la_cle_mais_conserve_le_chemin() {
        let etat = EtatSession::nouveau();
        let chemin = PathBuf::from("/tmp/donnees-test.sqm");

        etat.definir(chemin.clone(), [1u8; TAILLE_CLE]);
        assert!(etat.est_deverrouillee());
        assert_eq!(etat.chemin_fichier(), Some(chemin.clone()));

        etat.purger();

        assert!(!etat.est_deverrouillee());
        assert_eq!(etat.chemin_fichier(), Some(chemin));
    }
}
