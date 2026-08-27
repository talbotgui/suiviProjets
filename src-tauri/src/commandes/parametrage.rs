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
    crate::journalisation::consigner_debut_commande("definirSeuil");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        parametrage::definir_seuil(&mut donnees, &cle, valeur, horodatage)?;

        let cle_session = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "definirSeuil",
        )?;
        etat.definir(PathBuf::from(chemin), cle_session);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("definirSeuil");
    resultat
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
    crate::journalisation::consigner_debut_commande("definirReferentiel");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        parametrage::definir_referentiel(&mut donnees, &type_referentiel, entree, horodatage)?;

        let cle_session = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "definirReferentiel",
        )?;
        etat.definir(PathBuf::from(chemin), cle_session);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("definirReferentiel");
    resultat
}

/// Ajoute ou met à jour plusieurs entrées d'un même référentiel en une seule opération, sauvegarde le fichier une
/// seule fois (uniquement si au moins une entrée a réussi) et consigne au journal une entrée par entrée
/// effectivement enregistrée (US-043, RG-023, RG-040).
///
/// Nommée par symétrie plurielle avec `definirReferentiel` (décision arbitraire, cf. convention documentée en tête
/// de ce module et `.claude/rules/09-normes-developpement.md`) : non citée littéralement par
/// `13_conceptionDetaillee.md`, qui ne décrit que la commande unitaire ; introduite pour corriger un défaut de
/// performance de la saisie en masse de règles de dépendances (US-043), qui appelait jusqu'ici `definirReferentiel`
/// une fois par groupe créé — un coût (dérivation Argon2id, rotation des sauvegardes de sécurité RG-003, écriture
/// chiffrée complète) proportionnel au nombre de groupes saisis.
///
/// # Erreurs
///
/// Ne propage jamais l'échec de validation d'une entrée individuelle (reflété par `reussites`, cf.
/// [`parametrage::definir_referentiels`]) ; les anomalies de sauvegarde héritées de
/// [`crate::persistance::erreurs::ErreurPersistance`] en cas d'échec de l'écriture disque (déclenchée uniquement si
/// au moins une entrée a réussi).
#[tauri::command]
pub(crate) fn definir_referentiels(
    chemin: String,
    donnees: DonneesRacine,
    type_referentiel: String,
    entrees: Vec<Value>,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<super::fichier::ReponseMutationMasse, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("definirReferentiels");
    let resultat = (|| -> Result<super::fichier::ReponseMutationMasse, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        let reussites =
            parametrage::definir_referentiels(&mut donnees, &type_referentiel, entrees, horodatage);

        if reussites.iter().any(|reussite| *reussite) {
            let cle_session = moteur::sauvegarder_fichier(
                Path::new(&chemin),
                &donnees,
                &mot_de_passe,
                "definirReferentiels",
            )?;
            etat.definir(PathBuf::from(chemin), cle_session);
        }

        Ok(super::fichier::ReponseMutationMasse { donnees, reussites })
    })();
    crate::journalisation::consigner_fin_commande("definirReferentiels");
    resultat
}

/// Supprime une entrée du référentiel des règles de dépendances, sauvegarde le fichier et consigne la suppression
/// au journal (US-033, RG-035, Phase 10 incrément 8).
///
/// # Erreurs
///
/// [`parametrage::ErreurParametrage::EntreeReferentielIntrouvable`] si `id` ne désigne aucune entrée existante ;
/// les anomalies de sauvegarde héritées de [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn supprimer_regle_dependance(
    chemin: String,
    donnees: DonneesRacine,
    id: String,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("supprimerRegleDependance");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        parametrage::supprimer_regle_dependance(&mut donnees, &id, horodatage)?;

        let cle_session = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "supprimerRegleDependance",
        )?;
        etat.definir(PathBuf::from(chemin), cle_session);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("supprimerRegleDependance");
    resultat
}

/// Supprime une entrée du référentiel des règles de marqueurs IA, sauvegarde le fichier et consigne la suppression
/// au journal (US-033, RG-035, Phase 10 incrément 8).
///
/// # Erreurs
///
/// Voir [`supprimer_regle_dependance`].
#[tauri::command]
pub(crate) fn supprimer_regle_marqueur_ia(
    chemin: String,
    donnees: DonneesRacine,
    id: String,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("supprimerRegleMarqueurIa");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        parametrage::supprimer_regle_marqueur_ia(&mut donnees, &id, horodatage)?;

        let cle_session = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "supprimerRegleMarqueurIA",
        )?;
        etat.definir(PathBuf::from(chemin), cle_session);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("supprimerRegleMarqueurIa");
    resultat
}

/// Supprime une entrée du référentiel des catégories de dépendance, sauvegarde le fichier et consigne la
/// suppression au journal (US-048, RG-035).
///
/// # Erreurs
///
/// Voir [`supprimer_regle_dependance`].
#[tauri::command]
pub(crate) fn supprimer_categorie_dependance(
    chemin: String,
    donnees: DonneesRacine,
    id: String,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("supprimerCategorieDependance");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        parametrage::supprimer_categorie_dependance(&mut donnees, &id, horodatage)?;

        let cle_session = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "supprimerCategorieDependance",
        )?;
        etat.definir(PathBuf::from(chemin), cle_session);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("supprimerCategorieDependance");
    resultat
}

/// Modifie les réglages de verrouillage de session, sauvegarde le fichier et consigne la modification au journal
/// (US-034, RG-031, Phase 10 incrément 8).
///
/// # Erreurs
///
/// [`parametrage::ErreurParametrage::ReglageApplicatifInvalide`] si un des deux champs est nul ; les anomalies de
/// sauvegarde héritées de [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn definir_verrouillage(
    chemin: String,
    donnees: DonneesRacine,
    delai_inactivite_minutes: u32,
    echecs_avant_fermeture: u32,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("definirVerrouillage");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        parametrage::definir_verrouillage(
            &mut donnees,
            delai_inactivite_minutes,
            echecs_avant_fermeture,
            horodatage,
        )?;

        let cle_session = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "definirVerrouillage",
        )?;
        etat.definir(PathBuf::from(chemin), cle_session);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("definirVerrouillage");
    resultat
}

/// Modifie la concurrence par défaut d'une campagne d'audit, sauvegarde le fichier et consigne la modification au
/// journal (US-034, RG-031, Phase 10 incrément 8).
///
/// # Erreurs
///
/// [`parametrage::ErreurParametrage::ReglageApplicatifInvalide`] si `concurrence` est nulle ; les anomalies de
/// sauvegarde héritées de [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn definir_concurrence_audit(
    chemin: String,
    donnees: DonneesRacine,
    concurrence: u32,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("definirConcurrenceAudit");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        parametrage::definir_concurrence_audit(&mut donnees, concurrence, horodatage)?;

        let cle_session = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "definirConcurrenceAudit",
        )?;
        etat.definir(PathBuf::from(chemin), cle_session);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("definirConcurrenceAudit");
    resultat
}

/// Modifie le réglage de proxy sortant, sauvegarde le fichier, consigne la modification au journal et met à jour
/// le proxy en cache de la session courante (US-034, RG-031, Phase 10 incrément 8) : les commandes d'interrogation
/// d'indicateurs (`audit.rs`, `connectivite.rs`), qui ne reçoivent jamais la racine complète du fichier, lisent ce
/// réglage exclusivement via `EtatSession::client_http`.
///
/// # Erreurs
///
/// [`parametrage::ErreurParametrage::ReglageApplicatifInvalide`] si `url` est non vide mais syntaxiquement
/// invalide ; les anomalies de sauvegarde héritées de [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn definir_proxy(
    chemin: String,
    donnees: DonneesRacine,
    url: Option<String>,
    chemin_bundle_ca: Option<String>,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("definirProxy");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        parametrage::definir_proxy(&mut donnees, url, chemin_bundle_ca, horodatage)?;

        let cle_session = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "definirProxy",
        )?;
        etat.definir(PathBuf::from(chemin), cle_session);
        etat.definir_proxy(donnees.parametres.proxy.clone());

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("definirProxy");
    resultat
}

/// Modifie le nombre de sauvegardes de sécurité conservées avant rotation, sauvegarde le fichier et consigne la
/// modification au journal (US-034, RG-003, RG-031, Phase 10 incrément 8).
///
/// # Erreurs
///
/// [`parametrage::ErreurParametrage::ReglageApplicatifInvalide`] si `nombre` est nul ; les anomalies de
/// sauvegarde héritées de [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn definir_nombre_sauvegardes_securite(
    chemin: String,
    donnees: DonneesRacine,
    nombre: u32,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("definirNombreSauvegardesSecurite");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        parametrage::definir_nombre_sauvegardes_securite(&mut donnees, nombre, horodatage)?;

        let cle_session = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "definirNombreSauvegardesSecurite",
        )?;
        etat.definir(PathBuf::from(chemin), cle_session);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("definirNombreSauvegardesSecurite");
    resultat
}

/// Modifie le seuil de taille déclenchant l'avertissement contextuel de purge à la sauvegarde, sauvegarde le
/// fichier et consigne la modification au journal (US-035, RG-031, RG-032, Phase 10 incrément 8).
///
/// # Erreurs
///
/// [`parametrage::ErreurParametrage::ReglageApplicatifInvalide`] si `seuil_octets` est nul ; les anomalies de
/// sauvegarde héritées de [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn definir_seuil_avertissement_taille(
    chemin: String,
    donnees: DonneesRacine,
    seuil_octets: u64,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("definirSeuilAvertissementTaille");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        parametrage::definir_seuil_avertissement_taille(&mut donnees, seuil_octets, horodatage)?;

        let cle_session = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "definirSeuilAvertissementTaille",
        )?;
        etat.definir(PathBuf::from(chemin), cle_session);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("definirSeuilAvertissementTaille");
    resultat
}
