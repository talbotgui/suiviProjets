// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées aux vues enregistrées (Phase 9, incrément 1, US-028 ; RG-027).
//!
//! Aucun nom de commande ni séquence fonctionnelle détaillée n'est fourni littéralement par
//! `docs/02_documentation/13_conceptionDetaillee.md` pour cette fonctionnalité (décision arbitraire, cf.
//! compte-rendu de développement de cet incrément) : ces deux commandes suivent le même gabarit que
//! `definirSeuil`/`definirReferentiel` (Phase 7) — chemin, données complètes, paramètres métier et mot de passe en
//! entrée (RG-002), racine mise à jour renvoyée à l'UI. Chaque commande délègue l'intégralité de sa logique de
//! mutation à `persistance::vues`, déjà couverte par ses propres tests unitaires : conformément à la convention du
//! projet, la Façade de commandes n'est jamais testée isolément.

use super::etat_session::EtatSession;
use super::fichier::ErreurFacade;
use crate::modele::racine::DonneesRacine;
use crate::persistance::moteur;
use crate::persistance::vues;
use serde_json::Value;
use std::path::{Path, PathBuf};
use tauri::State;

/// Ajoute ou met à jour une vue enregistrée, sauvegarde le fichier (US-028, RG-027, RG-002). Aucune entrée de
/// journal n'est consignée (cf. commentaire d'en-tête de [`crate::persistance::vues`]).
///
/// # Erreurs
///
/// Voir [`vues::definir_vue`] pour le détail de l'anomalie de validation métier (identifiant de mise à jour
/// introuvable) ; les anomalies de sauvegarde héritées de [`crate::persistance::erreurs::ErreurPersistance`]
/// sinon.
#[allow(
    clippy::too_many_arguments,
    reason = "gabarit `definirSeuil`/`definirReferentiel` (chemin, données, mot de passe, état) augmenté des seuls champs métier d'une VueEnregistree, cf. commentaire d'en-tête du module"
)]
#[tauri::command]
pub(crate) fn definir_vue(
    chemin: String,
    donnees: DonneesRacine,
    id: Option<String>,
    nom: String,
    ecran: String,
    version_filtres: u32,
    par_defaut: bool,
    filtres: Value,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
    let mut donnees = donnees;
    vues::definir_vue(
        &mut donnees,
        id,
        nom,
        ecran,
        version_filtres,
        par_defaut,
        filtres,
    )?;

    let cle =
        moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe, "definirVue")?;
    etat.definir(PathBuf::from(chemin), cle);

    Ok(donnees)
}

/// Supprime une vue enregistrée par identifiant, sauvegarde le fichier (US-028).
///
/// # Erreurs
///
/// Voir [`vues::supprimer_vue`] pour le détail de l'anomalie de validation métier (identifiant introuvable) ; les
/// anomalies de sauvegarde héritées de [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn supprimer_vue(
    chemin: String,
    donnees: DonneesRacine,
    id: String,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
    let mut donnees = donnees;
    vues::supprimer_vue(&mut donnees, &id)?;

    let cle =
        moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe, "supprimerVue")?;
    etat.definir(PathBuf::from(chemin), cle);

    Ok(donnees)
}
