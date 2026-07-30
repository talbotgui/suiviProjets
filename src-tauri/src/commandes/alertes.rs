// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées aux alertes et aux annotations (Phase 8, US-019, US-020 ; RG-026).
//!
//! Nommées littéralement `creerAnnotation` et `qualifierAlerte` par
//! `docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`, mais sans
//! séquence fonctionnelle détaillée décrivant leur signature exacte (à la différence de `qualifierMembre`) :
//! décision arbitraire documentée dans le compte-rendu de développement de cette phase, ces deux commandes suivent
//! donc le même gabarit que `qualifierMembre`/`definirPolitiqueIA` (Phase 4) — chemin, données complètes, paramètres
//! métier et mot de passe en entrée (RG-002), racine mise à jour renvoyée à l'UI. Chaque commande délègue
//! l'intégralité de sa logique de mutation à `persistance::alertes`, déjà couverte par ses propres tests unitaires :
//! conformément à la convention du projet, la Façade de commandes n'est jamais testée isolément.

use super::etat_session::EtatSession;
use super::fichier::ErreurFacade;
use crate::modele::racine::{DonneesRacine, StatutTraitementAlerte};
use crate::persistance::alertes;
use crate::persistance::moteur;
use chrono::{SecondsFormat, Utc};
use std::path::{Path, PathBuf};
use tauri::State;

/// Crée une annotation de portée groupe ou projet, sauvegarde le fichier et consigne la création au journal
/// (US-019, RG-023). `projet_id` distingue la portée : présent, l'annotation est ajoutée aux annotations du projet
/// désigné ; absent, elle est ajoutée aux annotations du groupe lui-même (cf.
/// [`persistance::alertes::creer_annotation`]).
///
/// # Erreurs
///
/// Voir [`persistance::alertes::creer_annotation`] pour le détail des anomalies de validation métier (groupe/projet
/// introuvable) ; les anomalies de sauvegarde héritées de [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[allow(
    clippy::too_many_arguments,
    reason = "gabarit `qualifierMembre` (chemin, données, mot de passe, état) augmenté des seuls champs métier strictement nécessaires à cette commande, cf. commentaire d'en-tête du module"
)]
#[tauri::command]
pub(crate) fn creer_annotation(
    chemin: String,
    donnees: DonneesRacine,
    groupe_id: String,
    projet_id: Option<String>,
    date: String,
    libelle: String,
    categorie: String,
    description: Option<String>,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
    let mut donnees = donnees;
    let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    alertes::creer_annotation(
        &mut donnees,
        &groupe_id,
        projet_id.as_deref(),
        date,
        libelle,
        categorie,
        description,
        horodatage,
    )?;

    let cle = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle);

    Ok(donnees)
}

/// Supprime une annotation de portée groupe ou projet, sauvegarde le fichier et consigne la suppression au journal
/// (US-019, RG-023, RG-033, Phase 10 incrément 8). `projet_id` distingue la portée exactement comme pour
/// [`creer_annotation`] (cf. [`persistance::alertes::supprimer_annotation`]).
///
/// # Erreurs
///
/// Voir [`persistance::alertes::supprimer_annotation`] pour le détail des anomalies de validation métier
/// (groupe/projet/annotation introuvable, annotation système) ; les anomalies de sauvegarde héritées de
/// [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn supprimer_annotation(
    chemin: String,
    donnees: DonneesRacine,
    groupe_id: String,
    projet_id: Option<String>,
    annotation_id: String,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
    let mut donnees = donnees;
    let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    alertes::supprimer_annotation(
        &mut donnees,
        &groupe_id,
        projet_id.as_deref(),
        &annotation_id,
        horodatage,
    )?;

    let cle = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle);

    Ok(donnees)
}

/// Qualifie une alerte (statut vu/traité, commentaire optionnel), sauvegarde le fichier (US-020, RG-002, RG-026).
/// Ajoute toujours une nouvelle entrée à l'historique `traitementsAlertes` plutôt que de muter une entrée existante
/// (cf. [`persistance::alertes::qualifier_alerte`]) ; aucune entrée de journal n'est consignée, `TraitementAlerte`
/// étant une donnée de travail personnelle jamais exportée.
///
/// # Erreurs
///
/// Les anomalies de sauvegarde héritées de [`crate::persistance::erreurs::ErreurPersistance`] uniquement : cette
/// commande ne porte aucune anomalie de validation métier propre (cf.
/// [`persistance::alertes::qualifier_alerte`]).
#[tauri::command]
pub(crate) fn qualifier_alerte(
    chemin: String,
    donnees: DonneesRacine,
    cle_alerte: String,
    statut: StatutTraitementAlerte,
    commentaire: Option<String>,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
    let mut donnees = donnees;
    let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    alertes::qualifier_alerte(&mut donnees, cle_alerte, statut, commentaire, horodatage);

    let cle = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle);

    Ok(donnees)
}
