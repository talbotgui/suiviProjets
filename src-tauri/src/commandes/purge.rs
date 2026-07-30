// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées à la purge des audits anciens (Phase 7, incrément 4, US-025 ; RG-024, RG-025).
//!
//! Noms de commande non fournis littéralement par `docs/02_documentation/13_conceptionDetaillee.md` (US-025 n'y
//! est pas détaillée) : choisis par symétrie avec `definirSeuil`/`definirReferentiel` (Phase 7, incrément 1),
//! décision arbitraire à valider par un humain, cf. rapport de développement de cet incrément. Chaque mode de
//! purge (densité, âge) porte une commande de consultation (`previsualiser*`, sans mot de passe ni sauvegarde) et
//! une commande de mutation (`executer*`, RG-002) ; les deux délèguent le calcul de sélection des audits à
//! `persistance::purge`, qui ne fait jamais confiance à l'interface pour désigner les audits à supprimer (cf.
//! commentaire d'en-tête de ce module).

use super::etat_session::EtatSession;
use super::fichier::ErreurFacade;
use crate::modele::racine::DonneesRacine;
use crate::persistance::moteur;
use crate::persistance::purge::{self, PrevisualisationPurge, PrevisualisationPurgeJournal};
use chrono::{SecondsFormat, Utc};
use std::path::{Path, PathBuf};
use tauri::State;

/// Prévisualise une purge par densité (US-025, RG-024), sans aucune modification ni sauvegarde.
#[tauri::command]
pub(crate) fn previsualiser_purge_densite(
    donnees: DonneesRacine,
) -> Result<PrevisualisationPurge, ErreurFacade> {
    Ok(purge::previsualiser_purge_densite(&donnees))
}

/// Exécute une purge par densité, sauvegarde le fichier (US-025, RG-024).
#[tauri::command]
pub(crate) fn executer_purge_densite(
    chemin: String,
    donnees: DonneesRacine,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
    let mut donnees = donnees;
    let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    purge::executer_purge_densite(&mut donnees, horodatage);

    let cle_session = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle_session);

    Ok(donnees)
}

/// Prévisualise une purge du journal des modifications lui-même (US-036, RG-034, Phase 10 incrément 8), limite
/// fixe de deux ans, sans aucune modification ni sauvegarde.
#[tauri::command]
pub(crate) fn previsualiser_purge_journal(
    donnees: DonneesRacine,
) -> Result<PrevisualisationPurgeJournal, ErreurFacade> {
    let aujourdhui = Utc::now().date_naive();
    Ok(purge::previsualiser_purge_journal(&donnees, aujourdhui))
}

/// Exécute une purge du journal des modifications lui-même, sauvegarde le fichier (US-036, RG-034, Phase 10
/// incrément 8).
#[tauri::command]
pub(crate) fn executer_purge_journal(
    chemin: String,
    donnees: DonneesRacine,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
    let mut donnees = donnees;
    let aujourdhui = Utc::now().date_naive();
    let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    purge::executer_purge_journal(&mut donnees, aujourdhui, horodatage);

    let cle_session = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle_session);

    Ok(donnees)
}

/// Prévisualise une purge par âge (US-025, RG-025) pour le mode désigné (`"suppression"` ou
/// `"agregationMensuelle"`), sans aucune modification ni sauvegarde.
///
/// # Erreurs
///
/// [`ErreurFacade::ModePurgeAgeInconnu`] si `mode` n'est reconnu par aucun des deux modes.
#[tauri::command]
pub(crate) fn previsualiser_purge_age(
    donnees: DonneesRacine,
    mode: String,
) -> Result<PrevisualisationPurge, ErreurFacade> {
    let aujourdhui = Utc::now().date_naive();
    let resume = purge::previsualiser_purge_age(&donnees, aujourdhui, &mode)?;
    Ok(resume)
}

/// Exécute une purge par âge pour le mode désigné, sauvegarde le fichier (US-025, RG-025).
///
/// # Erreurs
///
/// [`ErreurFacade::ModePurgeAgeInconnu`] si `mode` n'est reconnu par aucun des deux modes.
#[tauri::command]
pub(crate) fn executer_purge_age(
    chemin: String,
    donnees: DonneesRacine,
    mode: String,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
    let mut donnees = donnees;
    let aujourdhui = Utc::now().date_naive();
    let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    purge::executer_purge_age(&mut donnees, aujourdhui, &mode, horodatage)?;

    let cle_session = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle_session);

    Ok(donnees)
}
