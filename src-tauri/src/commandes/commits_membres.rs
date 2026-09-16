// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées à l'écran « Commits des membres » (US-060 / RG-060, plan_17 chapitre 4, amendé
//! par plan_21 le 2026-09-16) : régularité des poussées de code des membres connus `interne` d'un groupe.
//!
//! Ces commandes sont des **consultations pures** : elles n'écrivent rien sur le disque, ne demandent pas le mot de
//! passe du fichier et ne consignent aucune entrée de journal métier. Elles se limitent à la récupération réseau
//! via le Connecteur GitLab ; aucun indicateur n'est calculé côté cœur natif (le calcul est une fonction pure du
//! Moteur de jugement, côté interface). L'orchestration multi-appels (une boucle sur les membres connus retenus, à
//! concurrence limitée) est portée par un Store d'état applicatif dédié côté interface, qui appelle
//! `interrogerMembreGitlabParUsername` puis `listerEvenementsPousseesMembre` en boucle pour chaque membre.
//!
//! Le résultat vit en mémoire de session uniquement : aucune donnée d'activité nominative n'est persistée
//! (`docs/02_documentation/15_normesSecurite.md`). Les paramètres `cible` passés à la journalisation d'appel de
//! connecteur ne portent que des données non nominatives (identifiant numérique d'utilisateur GitLab, marqueur de
//! catégorie fixe pour la recherche par username), jamais une adresse électronique ni un nom d'utilisateur.

use super::commun::credential_instance;
use super::etat_session::EtatSession;
use crate::connecteurs::commun::ErreurConnecteur;
use crate::connecteurs::gitlab::{self, EvenementPoussee, MembreGroupeGitlab};
use crate::modele::racine::{Instance, TypeInstance};
use tauri::State;

/// Marqueur de catégorie fixe, non nominatif, journalisé comme `cible` de
/// [`interroger_membre_gitlab_par_username`] : le `username` recherché est une donnée nominative et ne doit jamais
/// être journalisé (point relevé en revue de code lors de la conception, plan_21 §5 — réduction assumée de la
/// précision du diagnostic technique en cas d'échec isolé de résolution, sans impact fonctionnel).
const CIBLE_RECHERCHE_USERNAME: &str = "recherche-username";

/// Rejette une instance qui n'est pas de type GitLab (défense en profondeur, comme les commandes d'audit GitLab de
/// `commandes/audit.rs`).
fn exiger_instance_gitlab(instance: &Instance) -> Result<(), ErreurConnecteur> {
    match instance.type_instance {
        TypeInstance::Gitlab => Ok(()),
        TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue {
            message: "Type d'instance incompatible avec cette opération".to_string(),
        }),
    }
}

/// Résout un membre connu par nom d'utilisateur GitLab exact (US-060 / RG-060, plan_21) : commande fine, appelée en
/// boucle par le Store d'orchestration à concurrence limitée pour chaque membre connu `interne`/`username` actif
/// retenu par l'écran. `Ok(None)` si aucun compte GitLab actif ne correspond au `username` (cas métier, pas une
/// anomalie).
///
/// # Erreurs
///
/// [`ErreurConnecteur::ReponseInattendue`] si l'instance n'est pas de type GitLab ;
/// [`ErreurConnecteur::CredentialAbsent`] si aucun credential n'est mémorisé pour l'instance ; les autres
/// catégories de [`ErreurConnecteur`] (RG-021) en cas d'échec d'un appel réseau.
#[tauri::command]
pub(crate) async fn interroger_membre_gitlab_par_username(
    instance: Instance,
    username: String,
    etat: State<'_, EtatSession>,
) -> Result<Option<MembreGroupeGitlab>, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerMembreGitlabParUsername");
    let resultat = async {
        exiger_instance_gitlab(&instance)?;
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerMembreGitlabParUsername",
            &instance.nom,
            CIBLE_RECHERCHE_USERNAME,
        );
        let resultat = gitlab::interroger_membre_par_username(
            &instance.url_base,
            &credential,
            &username,
            &etat.client_http(),
        )
        .await;
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerMembreGitlabParUsername",
            &instance.nom,
            CIBLE_RECHERCHE_USERNAME,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerMembreGitlabParUsername");
    resultat
}

/// Récupère les événements de poussée d'un membre sur une fenêtre glissante (`apres_date` au format `AAAA-MM-JJ`,
/// cf. `crate::connecteurs::gitlab::lister_evenements_poussees`). Commande volontairement fine, appelée en boucle
/// par le Store d'orchestration à concurrence limitée pour une progression réactive et une journalisation par
/// membre (US-060 / RG-060).
///
/// # Erreurs
///
/// Voir [`interroger_membre_gitlab_par_username`].
#[tauri::command]
pub(crate) async fn lister_evenements_poussees_membre(
    instance: Instance,
    utilisateur_id: u64,
    apres_date: String,
    etat: State<'_, EtatSession>,
) -> Result<Vec<EvenementPoussee>, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("listerEvenementsPousseesMembre");
    let cible = utilisateur_id.to_string();
    let resultat = async {
        exiger_instance_gitlab(&instance)?;
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "listerEvenementsPousseesMembre",
            &instance.nom,
            &cible,
        );
        let resultat = gitlab::lister_evenements_poussees(
            &instance.url_base,
            &credential,
            utilisateur_id,
            &apres_date,
            &etat.client_http(),
        )
        .await;
        crate::journalisation::consigner_resultat_connecteur(
            "listerEvenementsPousseesMembre",
            &instance.nom,
            &cible,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("listerEvenementsPousseesMembre");
    resultat
}
