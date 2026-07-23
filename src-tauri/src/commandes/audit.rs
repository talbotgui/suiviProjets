// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées au Moteur d'audit (US-009, US-014 ; Phase 5).
//!
//! Périmètre de l'incrément 1 : dix opérations d'interrogation des indicateurs GitLab/Sonar déterministes, sans
//! heuristique à inventer, cf.
//! `docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`.
//! `interrogerDependances`, `interrogerBranches` (usage F05, distinct de l'autocomplétion `interrogerBranches` de
//! `connectivite.rs`, US-008) et `interrogerMarqueursIa` restent différées à un incrément ultérieur.
//!
//! Chaque commande d'interrogation reçoit `sourceId` en paramètre explicite plutôt que de le déduire d'un contexte
//! de fichier chargé (à la différence des commandes de `administration.rs`, qui reçoivent la racine complète du
//! fichier) : une opération d'interrogation d'indicateur n'a besoin de connaître ni de muter le fichier de
//! données, seulement de savoir pour quelle source persister le résultat retourné — c'est l'Orchestrateur de
//! campagne (UI, Phase 5, incrément ultérieur), seul appelant prévu de ces commandes, qui connaît déjà ce triplet
//! (`instance`, `sourceId`, `idExterne`) via le Store d'état applicatif, sans qu'il soit nécessaire de retransiter
//! la racine complète du fichier pour une simple lecture d'indicateur ne modifiant rien sur le disque (décision
//! arbitraire, cf. rapport de développement de cette phase).
//!
//! Le credential utilisé est celui déjà mémorisé en mémoire pour l'instance concernée (US-003), sur le modèle déjà
//! établi par `interrogerBranches` dans `connectivite.rs`.
//!
//! Périmètre de l'incrément 2 (US-014, RG-019) : `enregistrerBrouillon`, `integrerBrouillon`, `rejeterBrouillon`,
//! sur le gabarit exact de `qualifierMembre`/`definirPolitiqueIA` de `administration.rs` (chemin, données
//! complètes, champs métier, mot de passe, sauvegarde effective, racine mise à jour renvoyée), chacune déléguant
//! l'intégralité de sa logique de mutation à `persistance::audit`, déjà couvert par ses propres tests unitaires.
//!
//! Périmètre de l'incrément 3 : `interrogerDerniereAnalyse`, donnée intermédiaire (date de dernière analyse
//! Sonar) consommée par le Connecteur croisé (UI, `calculerFraicheurSonar`), n'appartenant à aucune variante du
//! catalogue figé des résultats d'audit et donc jamais persistée seule — signature allégée sans `sourceId` par
//! rapport aux dix commandes d'interrogation de l'incrément 1.

use super::etat_session::EtatSession;
use super::fichier::ErreurFacade;
use crate::connecteurs::commun::{ErreurConnecteur, client_http};
use crate::connecteurs::{gitlab, sonar};
use crate::modele::racine::{
    DonneesRacine, Instance, ResultatBrouillonProjet, ResultatGitlabContributeurs,
    ResultatGitlabMembres, ResultatGitlabMergeRequests, ResultatGitlabTailleDepot,
    ResultatGitlabVitalite, ResultatSonarCouverture, ResultatSonarDette, ResultatSonarNcloc,
    ResultatSonarNotes, ResultatSonarViolations, TypeInstance, Verdict,
};
use crate::persistance::audit;
use crate::persistance::moteur;
use std::path::{Path, PathBuf};
use tauri::State;

/// Résout le credential mémorisé pour l'instance demandée, ou [`ErreurConnecteur::CredentialAbsent`] à défaut
/// (US-003), factorisé pour les dix commandes de ce module.
fn credential_instance(
    instance: &Instance,
    etat: &EtatSession,
) -> Result<String, ErreurConnecteur> {
    etat.credential(&instance.id)
        .ok_or(ErreurConnecteur::CredentialAbsent)
}

/// Interroge la vitalité d'un dépôt GitLab, c'est-à-dire la date du dernier commit sur la ref auditée (US-009,
/// `gitlab.vitalite`).
///
/// # Erreurs
///
/// [`ErreurConnecteur::CredentialAbsent`] si aucun credential n'a été saisi pour cette instance ; les autres
/// catégories de [`ErreurConnecteur`] en cas d'échec de l'appel réseau ou de ref introuvable.
#[tauri::command]
pub(crate) async fn interroger_vitalite(
    instance: Instance,
    source_id: String,
    id_externe: String,
    ref_auditee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatGitlabVitalite, ErreurConnecteur> {
    let credential = credential_instance(&instance, &etat)?;
    match instance.type_instance {
        TypeInstance::Gitlab => {
            gitlab::interroger_vitalite(
                &instance.url_base,
                &credential,
                &source_id,
                &id_externe,
                ref_auditee.as_deref(),
                client_http(),
            )
            .await
        }
        // Défense en profondeur : cette commande n'a de sens que pour une instance GitLab.
        TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue),
    }
}

/// Interroge la taille d'un dépôt GitLab en octets (US-009, `gitlab.taille_depot`).
///
/// # Erreurs
///
/// Voir [`interroger_vitalite`].
#[tauri::command]
pub(crate) async fn interroger_taille_depot(
    instance: Instance,
    source_id: String,
    id_externe: String,
    ref_auditee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatGitlabTailleDepot, ErreurConnecteur> {
    let credential = credential_instance(&instance, &etat)?;
    match instance.type_instance {
        TypeInstance::Gitlab => {
            gitlab::interroger_taille_depot(
                &instance.url_base,
                &credential,
                &source_id,
                &id_externe,
                ref_auditee.as_deref(),
                client_http(),
            )
            .await
        }
        TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue),
    }
}

/// Interroge les contributeurs distincts sur la fenêtre glissante d'un dépôt GitLab (US-009,
/// `gitlab.contributeurs`).
///
/// # Erreurs
///
/// Voir [`interroger_vitalite`].
#[tauri::command]
pub(crate) async fn interroger_contributeurs(
    instance: Instance,
    source_id: String,
    id_externe: String,
    ref_auditee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatGitlabContributeurs, ErreurConnecteur> {
    let credential = credential_instance(&instance, &etat)?;
    match instance.type_instance {
        TypeInstance::Gitlab => {
            gitlab::interroger_contributeurs(
                &instance.url_base,
                &credential,
                &source_id,
                &id_externe,
                ref_auditee.as_deref(),
                client_http(),
            )
            .await
        }
        TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue),
    }
}

/// Interroge les demandes de fusion ouvertes d'un dépôt GitLab (US-009, `gitlab.merge_requests`).
///
/// # Erreurs
///
/// Voir [`interroger_vitalite`].
#[tauri::command]
pub(crate) async fn interroger_merge_requests(
    instance: Instance,
    source_id: String,
    id_externe: String,
    ref_auditee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatGitlabMergeRequests, ErreurConnecteur> {
    let credential = credential_instance(&instance, &etat)?;
    match instance.type_instance {
        TypeInstance::Gitlab => {
            gitlab::interroger_merge_requests(
                &instance.url_base,
                &credential,
                &source_id,
                &id_externe,
                ref_auditee.as_deref(),
                client_http(),
            )
            .await
        }
        TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue),
    }
}

/// Interroge les membres d'un dépôt GitLab (US-009, `gitlab.membres`).
///
/// # Erreurs
///
/// Voir [`interroger_vitalite`].
#[tauri::command]
pub(crate) async fn interroger_membres(
    instance: Instance,
    source_id: String,
    id_externe: String,
    ref_auditee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatGitlabMembres, ErreurConnecteur> {
    let credential = credential_instance(&instance, &etat)?;
    match instance.type_instance {
        TypeInstance::Gitlab => {
            gitlab::interroger_membres(
                &instance.url_base,
                &credential,
                &source_id,
                &id_externe,
                ref_auditee.as_deref(),
                client_http(),
            )
            .await
        }
        TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue),
    }
}

/// Interroge les violations Sonar par sévérité (US-009, `sonar.violations`).
///
/// # Erreurs
///
/// [`ErreurConnecteur::CredentialAbsent`] si aucun credential n'a été saisi pour cette instance ; les autres
/// catégories de [`ErreurConnecteur`] en cas d'échec de l'appel réseau.
#[tauri::command]
pub(crate) async fn interroger_violations(
    instance: Instance,
    source_id: String,
    id_externe: String,
    etat: State<'_, EtatSession>,
) -> Result<ResultatSonarViolations, ErreurConnecteur> {
    let credential = credential_instance(&instance, &etat)?;
    match instance.type_instance {
        TypeInstance::Sonar => {
            sonar::interroger_violations(
                &instance.url_base,
                &credential,
                &source_id,
                &id_externe,
                client_http(),
            )
            .await
        }
        // Défense en profondeur : cette commande n'a de sens que pour une instance Sonar.
        TypeInstance::Gitlab => Err(ErreurConnecteur::ReponseInattendue),
    }
}

/// Interroge la dette technique Sonar (US-009, `sonar.dette`).
///
/// # Erreurs
///
/// Voir [`interroger_violations`].
#[tauri::command]
pub(crate) async fn interroger_dette(
    instance: Instance,
    source_id: String,
    id_externe: String,
    etat: State<'_, EtatSession>,
) -> Result<ResultatSonarDette, ErreurConnecteur> {
    let credential = credential_instance(&instance, &etat)?;
    match instance.type_instance {
        TypeInstance::Sonar => {
            sonar::interroger_dette(
                &instance.url_base,
                &credential,
                &source_id,
                &id_externe,
                client_http(),
            )
            .await
        }
        TypeInstance::Gitlab => Err(ErreurConnecteur::ReponseInattendue),
    }
}

/// Interroge la couverture de tests Sonar (US-009, `sonar.couverture`).
///
/// # Erreurs
///
/// Voir [`interroger_violations`].
#[tauri::command]
pub(crate) async fn interroger_couverture(
    instance: Instance,
    source_id: String,
    id_externe: String,
    etat: State<'_, EtatSession>,
) -> Result<ResultatSonarCouverture, ErreurConnecteur> {
    let credential = credential_instance(&instance, &etat)?;
    match instance.type_instance {
        TypeInstance::Sonar => {
            sonar::interroger_couverture(
                &instance.url_base,
                &credential,
                &source_id,
                &id_externe,
                client_http(),
            )
            .await
        }
        TypeInstance::Gitlab => Err(ErreurConnecteur::ReponseInattendue),
    }
}

/// Interroge les notes Sonar des quatre axes (US-009, `sonar.notes`).
///
/// # Erreurs
///
/// Voir [`interroger_violations`].
#[tauri::command]
pub(crate) async fn interroger_notes(
    instance: Instance,
    source_id: String,
    id_externe: String,
    etat: State<'_, EtatSession>,
) -> Result<ResultatSonarNotes, ErreurConnecteur> {
    let credential = credential_instance(&instance, &etat)?;
    match instance.type_instance {
        TypeInstance::Sonar => {
            sonar::interroger_notes(
                &instance.url_base,
                &credential,
                &source_id,
                &id_externe,
                client_http(),
            )
            .await
        }
        TypeInstance::Gitlab => Err(ErreurConnecteur::ReponseInattendue),
    }
}

/// Interroge le volume de code Sonar (US-009, `sonar.ncloc`).
///
/// # Erreurs
///
/// Voir [`interroger_violations`].
#[tauri::command]
pub(crate) async fn interroger_ncloc(
    instance: Instance,
    source_id: String,
    id_externe: String,
    etat: State<'_, EtatSession>,
) -> Result<ResultatSonarNcloc, ErreurConnecteur> {
    let credential = credential_instance(&instance, &etat)?;
    match instance.type_instance {
        TypeInstance::Sonar => {
            sonar::interroger_ncloc(
                &instance.url_base,
                &credential,
                &source_id,
                &id_externe,
                client_http(),
            )
            .await
        }
        TypeInstance::Gitlab => Err(ErreurConnecteur::ReponseInattendue),
    }
}

/// Interroge la date de la dernière analyse Sonar d'un projet (Phase 5, incrément 3), donnée intermédiaire
/// consommée par `calculerFraicheurSonar` (Connecteur croisé, UI). À la différence des dix opérations
/// d'interrogation précédentes, ne reçoit pas `sourceId` : cette donnée n'appartient à aucune variante du
/// catalogue figé des résultats d'audit et n'est donc jamais destinée à être persistée seule (cf.
/// `src-tauri/src/connecteurs/sonar.rs`, module `interroger_derniere_analyse`).
///
/// # Erreurs
///
/// [`ErreurConnecteur::CredentialAbsent`] si aucun credential n'a été saisi pour cette instance ; les autres
/// catégories de [`ErreurConnecteur`] en cas d'échec de l'appel réseau. Un projet jamais analysé n'est pas une
/// erreur : `Ok(None)`.
#[tauri::command]
pub(crate) async fn interroger_derniere_analyse(
    instance: Instance,
    id_externe: String,
    etat: State<'_, EtatSession>,
) -> Result<Option<String>, ErreurConnecteur> {
    let credential = credential_instance(&instance, &etat)?;
    match instance.type_instance {
        TypeInstance::Sonar => {
            sonar::interroger_derniere_analyse(
                &instance.url_base,
                &credential,
                &id_externe,
                client_http(),
            )
            .await
        }
        TypeInstance::Gitlab => Err(ErreurConnecteur::ReponseInattendue),
    }
}

/// Enregistre les résultats d'une campagne dans la zone de brouillon, sauvegarde le fichier (US-009, US-014,
/// RG-019).
///
/// Nommée littéralement `enregistrerBrouillon` par `13_conceptionDetaillee.md`, mais avec une signature étendue
/// par rapport à celle citée par sa séquence (`enregistrerBrouillon(campagneId, resultatsParProjet)`) : décision
/// arbitraire documentée dans le compte-rendu de développement de cette phase, sur le même principe que
/// l'extension déjà pratiquée pour `qualifierMembre` en Phase 4 — cf. `persistance::audit::enregistrer_brouillon`
/// pour le détail des champs ajoutés.
///
/// # Erreurs
///
/// Voir [`persistance::audit::enregistrer_brouillon`] pour le détail des anomalies de validation métier (brouillon
/// déjà existant, RG-019) ; les anomalies de sauvegarde héritées de
/// [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[allow(
    clippy::too_many_arguments,
    reason = "gabarit sauvegarderFichier (chemin, données, mot de passe, état) augmenté des seuls champs métier strictement nécessaires à cette commande, cf. commentaire d'en-tête du module"
)]
#[tauri::command]
pub(crate) fn enregistrer_brouillon(
    chemin: String,
    donnees: DonneesRacine,
    campagne_id: String,
    date: String,
    perimetre: Vec<String>,
    verdicts: Vec<Verdict>,
    resultats_par_projet: Vec<ResultatBrouillonProjet>,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    let mut donnees = donnees;
    let horodatage = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    audit::enregistrer_brouillon(
        &mut donnees,
        campagne_id,
        date,
        perimetre,
        verdicts,
        resultats_par_projet,
        horodatage,
    )?;

    let cle = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle);

    Ok(donnees)
}

/// Intègre à l'historique des projets concernés tout ou partie des résultats en attente du brouillon courant,
/// sauvegarde le fichier (US-014).
///
/// Nom de commande non fourni littéralement par `docs/02_documentation/13_conceptionDetaillee.md` (seule
/// `enregistrerBrouillon` y est nommée) : décision arbitraire documentée dans le compte-rendu de développement de
/// cette phase, retenue par symétrie avec `enregistrerBrouillon`/`rejeterBrouillon`.
///
/// # Erreurs
///
/// Voir [`persistance::audit::integrer_brouillon`] pour le détail des anomalies de validation métier (aucun
/// brouillon courant, projet absent de la sélection ou introuvable) ; les anomalies de sauvegarde héritées de
/// [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn integrer_brouillon(
    chemin: String,
    donnees: DonneesRacine,
    selection: Option<Vec<String>>,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    let mut donnees = donnees;
    audit::integrer_brouillon(&mut donnees, selection.as_deref())?;

    let cle = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle);

    Ok(donnees)
}

/// Rejette tout ou partie des résultats en attente du brouillon courant, sans jamais les ajouter à l'historique du
/// projet concerné, sauvegarde le fichier (US-014).
///
/// Nom de commande non fourni littéralement par `docs/02_documentation/13_conceptionDetaillee.md` : même décision
/// que pour `integrerBrouillon` ci-dessus.
///
/// # Erreurs
///
/// Voir [`persistance::audit::rejeter_brouillon`] pour le détail des anomalies de validation métier ; les
/// anomalies de sauvegarde héritées de [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn rejeter_brouillon(
    chemin: String,
    donnees: DonneesRacine,
    selection: Option<Vec<String>>,
    motif: Option<String>,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    let mut donnees = donnees;
    audit::rejeter_brouillon(&mut donnees, selection.as_deref(), motif)?;

    let cle = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle);

    Ok(donnees)
}
