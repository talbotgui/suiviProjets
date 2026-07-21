// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées à la qualification des membres connus d'un groupe et à la politique
//! d'autorisation de l'IA d'un projet (Phase 4, US-022 à US-024 ; RG-006 à RG-008, RG-012, RG-014 à RG-016,
//! RG-023).
//!
//! Point d'architecture décisif (décision, cf. compte-rendu de développement de cette phase) : à la différence de
//! la Phase 3 (CRUD groupes/projets/sources, sans commande native, mutations tenues entièrement côté interface),
//! `qualifierMembre` et `definirPolitiqueIA` sont explicitement nommées par
//! `docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces` parmi les
//! commandes de la Façade, et la séquence « Qualifier un membre inconnu depuis une alerte » de ce même document
//! décrit précisément une délégation au Moteur de persistance suivie d'une sauvegarde effective du fichier. Ces
//! deux commandes suivent donc le même gabarit que `sauvegarderFichier` (Phase 1) : chemin, données complètes,
//! paramètres métier et mot de passe en entrée (RG-002 : le mot de passe est réellement redemandé à chaque
//! sauvegarde, jamais réutilisé silencieusement), racine mise à jour renvoyée à l'UI. Chaque commande délègue
//! l'intégralité de sa logique de mutation à `persistance::administration`, déjà couverte par ses propres tests
//! unitaires : conformément à la convention du projet, la Façade de commandes n'est jamais testée isolément.

use super::etat_session::EtatSession;
use super::fichier::ErreurFacade;
use crate::modele::racine::{DonneesRacine, StatutMembre, TypeCritere};
use crate::persistance::administration;
use crate::persistance::moteur;
use chrono::{SecondsFormat, Utc};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::State;

/// Réponse de la commande `qualifierMembre` : la racine mise à jour et les identifiants des règles de membres
/// connus actuellement en conflit au sein du groupe concerné (RG-008). Cette détection ne bloque jamais la saisie
/// (seul le doublon de username l'est) : elle est uniquement signalée à l'UI pour affichage, cf.
/// `persistance::administration::qualifier_membre`.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReponseQualificationMembre {
    /// Racine des données mises à jour, à substituer intégralement à l'état courant de l'UI.
    pub(crate) donnees: DonneesRacine,
    /// Identifiants des règles de membres connus du groupe concerné actuellement en conflit (RG-008).
    pub(crate) membres_en_conflit: Vec<String>,
}

/// Qualifie un membre connu d'un groupe : ajoute une nouvelle règle ou met à jour une règle existante, sauvegarde
/// le fichier et consigne la modification au journal (US-022, US-023, RG-006 à RG-008, RG-012, RG-023).
///
/// Nommée littéralement `qualifierMembre` par `13_conceptionDetaillee.md`, mais avec une signature étendue par
/// rapport à celle citée par sa séquence (`qualifierMembre(groupeId, critère, typeCritère, statut)`) : décision
/// arbitraire documentée dans le compte-rendu de développement de cette phase. `membreId` permet à l'écran
/// d'Administration (US-023) de désigner sans ambiguïté la règle à modifier même si son critère change ;
/// `libelle`/`aliasEmail` complètent le modèle `MembreConnu` ; `origine` distingue une saisie directe en
/// administration (US-023, valeur `Administration` envoyée par l'écran) d'une future qualification déclenchée
/// depuis une alerte (US-022, Phase 8, hors périmètre, qui enverrait `qualificationDepuisAlerte`) ; `chemin`/
/// `donnees`/`motDePasse` sont nécessaires à la sauvegarde effective décrite par cette même séquence, sur le
/// modèle déjà établi par `sauvegarderFichier` (Phase 1).
///
/// # Erreurs
///
/// Voir [`persistance::administration::qualifier_membre`] pour le détail des anomalies de validation métier
/// (groupe/membre introuvable, doublon de username) ; les anomalies de sauvegarde héritées de
/// [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[allow(
    clippy::too_many_arguments,
    reason = "gabarit `sauvegarderFichier` (chemin, données, mot de passe, état) augmenté des seuls champs métier strictement nécessaires à cette commande, cf. commentaire d'en-tête du module"
)]
#[tauri::command]
pub(crate) fn qualifier_membre(
    chemin: String,
    donnees: DonneesRacine,
    groupe_id: String,
    membre_id: Option<String>,
    critere: String,
    type_critere: TypeCritere,
    statut: StatutMembre,
    libelle: Option<String>,
    alias_email: Option<String>,
    origine: String,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<ReponseQualificationMembre, ErreurFacade> {
    let mut donnees = donnees;
    let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    let membres_en_conflit = administration::qualifier_membre(
        &mut donnees,
        &groupe_id,
        membre_id,
        critere,
        type_critere,
        statut,
        libelle,
        alias_email,
        origine,
        horodatage,
    )?;

    let cle = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle);

    Ok(ReponseQualificationMembre {
        donnees,
        membres_en_conflit,
    })
}

/// Définit la politique d'autorisation de l'IA d'un projet, sauvegarde le fichier et consigne la modification au
/// journal si elle a réellement eu lieu (US-024, RG-014 à RG-016, RG-023).
///
/// Nommée littéralement `definirPolitiqueIA` par `13_conceptionDetaillee.md`, sans séquence dédiée détaillant sa
/// signature exacte (contrairement à `qualifierMembre`) : `chemin`/`donnees`/`motDePasse` reprennent le même
/// précédent. Un appel redondant (valeur soumise identique à la valeur courante) n'écrit rien sur le disque, cf.
/// [`persistance::administration::definir_politique_ia`] pour le détail de cette décision (évite de dupliquer
/// l'horodatage et l'annotation système d'une autorisation déjà en vigueur, RG-015).
///
/// # Erreurs
///
/// Voir [`persistance::administration::definir_politique_ia`] pour le détail des anomalies de validation métier
/// (groupe/projet introuvable) ; les anomalies de sauvegarde héritées de
/// [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn definir_politique_ia(
    chemin: String,
    donnees: DonneesRacine,
    groupe_id: String,
    projet_id: String,
    ia_autorisee: bool,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    let mut donnees = donnees;
    let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    let a_change = administration::definir_politique_ia(
        &mut donnees,
        &groupe_id,
        &projet_id,
        ia_autorisee,
        horodatage,
    )?;

    if a_change {
        let cle = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
        etat.definir(PathBuf::from(chemin), cle);
    }

    Ok(donnees)
}

/// Supprime une règle de membre connu d'un groupe, sauvegarde le fichier et consigne la suppression au journal
/// (US-023, RG-023).
///
/// Nom de commande non fourni littéralement par la documentation source (décision, cf. compte-rendu de
/// développement de cette phase) : retenu par symétrie avec `qualifierMembre`, cf.
/// [`persistance::administration::supprimer_membre_connu`].
///
/// # Erreurs
///
/// Voir [`persistance::administration::supprimer_membre_connu`] pour le détail des anomalies de validation
/// métier (groupe/membre introuvable) ; les anomalies de sauvegarde héritées de
/// [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn supprimer_membre_connu(
    chemin: String,
    donnees: DonneesRacine,
    groupe_id: String,
    membre_id: String,
    origine: String,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    let mut donnees = donnees;
    let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    administration::supprimer_membre_connu(
        &mut donnees,
        &groupe_id,
        &membre_id,
        origine,
        horodatage,
    )?;

    let cle = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle);

    Ok(donnees)
}
