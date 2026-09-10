// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées à l'écran « Commits des membres » (US-060 / RG-060, plan_17 chapitre 4) :
//! régularité des poussées de code des développeurs d'un groupe.
//!
//! Ces commandes sont des **consultations pures** : elles n'écrivent rien sur le disque, ne demandent pas le mot de
//! passe du fichier et ne consignent aucune entrée de journal métier. Elles se limitent à la récupération réseau
//! via le Connecteur GitLab ; aucun indicateur n'est calculé côté cœur natif (le calcul est une fonction pure du
//! Moteur de jugement, côté interface). L'orchestration multi-appels (une passe de préparation, puis une boucle sur
//! les membres à concurrence limitée) est portée par un Store d'état applicatif dédié côté interface, qui appelle
//! `lister_evenements_poussees_membre` en boucle.
//!
//! Le résultat vit en mémoire de session uniquement : aucune donnée d'activité nominative n'est persistée
//! (`docs/02_documentation/15_normesSecurite.md`). Les paramètres `cible` passés à la journalisation d'appel de
//! connecteur ne portent que des données non nominatives (identifiant numérique d'utilisateur GitLab, référence de
//! groupe), jamais une adresse électronique.

use super::commun::credential_instance;
use super::etat_session::EtatSession;
use crate::connecteurs::commun::ErreurConnecteur;
use crate::connecteurs::gitlab::{self, EvenementPoussee, MembreGroupeGitlab, ProjetGroupeGitlab};
use crate::modele::racine::{Instance, TypeInstance};
use serde::Serialize;
use tauri::State;

/// Résultat de la passe de préparation d'une analyse « Commits des membres » : le roster du groupe GitLab et ses
/// dépôts (pour afficher un nom de dépôt lisible). Structure de transfert calculée, jamais persistée.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PreparationAnalyseCommitsMembres {
    /// Membres `active` du groupe GitLab désigné.
    pub(crate) membres: Vec<MembreGroupeGitlab>,
    /// Dépôts du groupe GitLab, sous-groupes compris.
    pub(crate) projets: Vec<ProjetGroupeGitlab>,
}

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

/// Passe de préparation d'une analyse « Commits des membres » : résout le credential mémorisé de l'instance, liste
/// les membres `active` du groupe GitLab (`groupe_gitlab`, obligatoire — chemin ou identifiant numérique) puis ses
/// dépôts (US-060 / RG-060).
///
/// # Erreurs
///
/// [`ErreurConnecteur::ReponseInattendue`] si l'instance n'est pas de type GitLab ;
/// [`ErreurConnecteur::CredentialAbsent`] si aucun credential n'est mémorisé pour l'instance ; les autres
/// catégories de [`ErreurConnecteur`] (RG-021) en cas d'échec d'un appel réseau.
#[tauri::command]
pub(crate) async fn preparer_analyse_commits_membres(
    instance: Instance,
    groupe_gitlab: String,
    etat: State<'_, EtatSession>,
) -> Result<PreparationAnalyseCommitsMembres, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("preparerAnalyseCommitsMembres");
    let resultat = async {
        exiger_instance_gitlab(&instance)?;
        let credential = credential_instance(&instance, &etat)?;
        let client = etat.client_http();
        crate::journalisation::consigner_appel_connecteur(
            "preparerAnalyseCommitsMembres",
            &instance.nom,
            &groupe_gitlab,
        );
        let resultat = async {
            let membres = gitlab::lister_membres_groupe(
                &instance.url_base,
                &credential,
                &groupe_gitlab,
                &client,
            )
            .await?;
            let projets = gitlab::lister_projets_groupe(
                &instance.url_base,
                &credential,
                &groupe_gitlab,
                &client,
            )
            .await?;
            Ok(PreparationAnalyseCommitsMembres { membres, projets })
        }
        .await;
        crate::journalisation::consigner_resultat_connecteur(
            "preparerAnalyseCommitsMembres",
            &instance.nom,
            &groupe_gitlab,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("preparerAnalyseCommitsMembres");
    resultat
}

/// Récupère les événements de poussée d'un membre du roster sur une fenêtre glissante (`apres_date` au format
/// `AAAA-MM-JJ`, cf. `crate::connecteurs::gitlab::lister_evenements_poussees`). Commande volontairement fine,
/// appelée en boucle par le Store d'orchestration à concurrence limitée pour une progression réactive et une
/// journalisation par membre (US-060 / RG-060).
///
/// # Erreurs
///
/// Voir [`preparer_analyse_commits_membres`].
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
