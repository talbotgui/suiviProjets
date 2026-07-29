// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées au paramétrage des seuils de couleur et des référentiels (Phase 7, incrément 1,
//! US-033 ; RG-022, RG-023, RG-030).
//!
//! Nommées littéralement `definirSeuil(clé, valeur)`/`definirReferentiel(type, entrée)` par
//! `docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`, sur le
//! même gabarit que `qualifierMembre`/`definirPolitiqueIA` (Phase 4) : chemin, données complètes, paramètres
//! métier et mot de passe en entrée (RG-002), racine mise à jour renvoyée à l'UI. Chaque commande délègue
//! l'intégralité de sa logique de mutation à `persistance::parametrage`, déjà couverte par ses propres tests
//! unitaires : conformément à la convention du projet, la Façade de commandes n'est jamais testée isolément.

use super::etat_session::EtatSession;
use super::fichier::ErreurFacade;
use crate::modele::racine::DonneesRacine;
use crate::persistance::moteur;
use crate::persistance::parametrage;
use chrono::{SecondsFormat, Utc};
use serde_json::Value;
use std::path::{Path, PathBuf};
use tauri::State;

/// Modifie un seuil de couleur (`parametres.seuils`), sauvegarde le fichier et consigne la modification au
/// journal (US-033, RG-022, RG-023).
///
/// # Erreurs
///
/// Voir [`parametrage::definir_seuil`] pour le détail des anomalies de validation métier (clé introuvable) ; les
/// anomalies de sauvegarde héritées de [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn definir_seuil(
    chemin: String,
    donnees: DonneesRacine,
    cle: String,
    valeur: Value,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
    let mut donnees = donnees;
    let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    parametrage::definir_seuil(&mut donnees, &cle, valeur, horodatage)?;

    let cle_session = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle_session);

    Ok(donnees)
}

/// Ajoute ou met à jour une entrée d'un référentiel, ou remplace le motif de nommage de branche, sauvegarde le
/// fichier et consigne la modification au journal (US-033, RG-023, RG-030).
///
/// # Erreurs
///
/// Voir [`parametrage::definir_referentiel`] pour le détail des anomalies de validation métier (type de
/// référentiel inconnu, entrée invalide, motif de nommage invalide) ; les anomalies de sauvegarde héritées de
/// [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn definir_referentiel(
    chemin: String,
    donnees: DonneesRacine,
    type_referentiel: String,
    entree: Value,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
    let mut donnees = donnees;
    let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    parametrage::definir_referentiel(&mut donnees, &type_referentiel, entree, horodatage)?;

    let cle_session = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle_session);

    Ok(donnees)
}
