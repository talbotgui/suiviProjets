// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées au Moteur d'audit (US-009, US-014 ; Phase 5).
//!
//! Périmètre de l'incrément 1 : dix opérations d'interrogation des indicateurs GitLab/Sonar déterministes, sans
//! heuristique à inventer, cf.
//! `docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`.
//! `interrogerDependances` et `interrogerBranchesCompletes` (usage F05, cette dernière distincte de
//! l'autocomplétion `interrogerBranches` de `connectivite.rs`, US-008) restaient différées à un incrément
//! ultérieur ; `interrogerMarqueursIa`, elle aussi différée à l'incrément 1, est livrée depuis l'incrément 7
//! (US-009, F18, RG-021).
//!
//! Périmètre de l'incrément de rattrapage de la Phase 5 (précédant la Phase 6) : `interrogerDependances` et
//! `interrogerBranchesCompletes` sont livrées, complétant le catalogue figé des résultats d'audit. Nom de commande
//! `interrogerBranchesCompletes` retenu par symétrie (cf. commentaire de
//! `crate::connecteurs::gitlab::interroger_branches_completes`), faute de nom distinct de l'autocomplétion proposé
//! par la conception détaillée.
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
use crate::connecteurs::commun::ErreurConnecteur;
use crate::connecteurs::gitlab::RegleMarqueurIA;
use crate::connecteurs::{gitlab, sonar};
use crate::modele::racine::{
    DonneesRacine, Instance, ResultatBrouillonProjet, ResultatGitlabBranches,
    ResultatGitlabContributeurs, ResultatGitlabDependances, ResultatGitlabMarqueursIa,
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
        .ok_or_else(|| ErreurConnecteur::CredentialAbsent {
            message: "Aucun credential en mémoire pour cette instance".to_string(),
        })
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
    date_ciblee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatGitlabVitalite, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerVitalite");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerVitalite",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Gitlab => {
                gitlab::interroger_vitalite(
                    &instance.url_base,
                    &credential,
                    &source_id,
                    &id_externe,
                    ref_auditee.as_deref(),
                    date_ciblee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            // Défense en profondeur : cette commande n'a de sens que pour une instance GitLab.
            TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerVitalite",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerVitalite");
    resultat
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
    crate::journalisation::consigner_debut_commande("interrogerTailleDepot");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerTailleDepot",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Gitlab => {
                gitlab::interroger_taille_depot(
                    &instance.url_base,
                    &credential,
                    &source_id,
                    &id_externe,
                    ref_auditee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerTailleDepot",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerTailleDepot");
    resultat
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
    date_ciblee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatGitlabContributeurs, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerContributeurs");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerContributeurs",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Gitlab => {
                gitlab::interroger_contributeurs(
                    &instance.url_base,
                    &credential,
                    &source_id,
                    &id_externe,
                    ref_auditee.as_deref(),
                    date_ciblee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerContributeurs",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerContributeurs");
    resultat
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
    date_ciblee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatGitlabMergeRequests, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerMergeRequests");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerMergeRequests",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Gitlab => {
                gitlab::interroger_merge_requests(
                    &instance.url_base,
                    &credential,
                    &source_id,
                    &id_externe,
                    ref_auditee.as_deref(),
                    date_ciblee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerMergeRequests",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerMergeRequests");
    resultat
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
    crate::journalisation::consigner_debut_commande("interrogerMembres");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerMembres",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Gitlab => {
                gitlab::interroger_membres(
                    &instance.url_base,
                    &credential,
                    &source_id,
                    &id_externe,
                    ref_auditee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerMembres",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerMembres");
    resultat
}

/// Interroge la liste complète des branches d'un dépôt GitLab pour le catalogue figé des résultats d'audit
/// (`gitlab.branches`, RG-030), distincte de la commande `interroger_branches` de `connectivite.rs`
/// (autocomplétion US-008) : cf. `crate::connecteurs::gitlab::interroger_branches_completes` pour le détail de
/// l'algorithme et la justification du nom de fonction retenu.
///
/// # Erreurs
///
/// Voir [`interroger_vitalite`].
#[tauri::command]
pub(crate) async fn interroger_branches_completes(
    instance: Instance,
    source_id: String,
    id_externe: String,
    ref_auditee: Option<String>,
    date_ciblee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatGitlabBranches, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerBranchesCompletes");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerBranchesCompletes",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Gitlab => {
                gitlab::interroger_branches_completes(
                    &instance.url_base,
                    &credential,
                    &source_id,
                    &id_externe,
                    ref_auditee.as_deref(),
                    date_ciblee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerBranchesCompletes",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerBranchesCompletes");
    resultat
}

/// Interroge les dépendances déclarées par les manifestes du dépôt GitLab (US-009, `gitlab.dependances`), tous
/// écosystèmes reconnus confondus (périmètre V1, cf. `crate::connecteurs::gitlab::NOMS_MANIFESTES_RECONNUS` et
/// l'en-tête de ce module Connecteur pour le détail des limites assumées).
///
/// # Erreurs
///
/// Voir [`interroger_vitalite`].
#[tauri::command]
pub(crate) async fn interroger_dependances(
    instance: Instance,
    source_id: String,
    id_externe: String,
    ref_auditee: Option<String>,
    date_ciblee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatGitlabDependances, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerDependances");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerDependances",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Gitlab => {
                gitlab::interroger_dependances(
                    &instance.url_base,
                    &credential,
                    &source_id,
                    &id_externe,
                    ref_auditee.as_deref(),
                    date_ciblee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerDependances",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerDependances");
    resultat
}

/// Interroge les marqueurs d'outils IA détectés dans l'arborescence complète de la ref auditée d'un dépôt GitLab
/// (US-009, F18, RG-021), par correspondance avec le référentiel `reglesMarqueursIA` transmis explicitement par
/// l'appelant plutôt que lu depuis le fichier de données par cette commande elle-même : c'est l'Orchestrateur de
/// campagne (UI), seul appelant prévu, qui connaît déjà `Referentiels.reglesMarqueursIA` via le Store d'état
/// applicatif, sur le même principe que `sourceId`/`idExterne` pour les neuf autres commandes d'interrogation de
/// ce module (cf. en-tête de module).
///
/// # Erreurs
///
/// Voir [`interroger_vitalite`].
#[tauri::command]
pub(crate) async fn interroger_marqueurs_ia(
    instance: Instance,
    source_id: String,
    id_externe: String,
    ref_auditee: Option<String>,
    regles_marqueurs_ia: Vec<RegleMarqueurIA>,
    date_ciblee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatGitlabMarqueursIa, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerMarqueursIa");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerMarqueursIa",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Gitlab => {
                gitlab::interroger_marqueurs_ia(
                    &instance.url_base,
                    &credential,
                    &source_id,
                    &id_externe,
                    ref_auditee.as_deref(),
                    &regles_marqueurs_ia,
                    date_ciblee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerMarqueursIa",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerMarqueursIa");
    resultat
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
    date_ciblee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatSonarViolations, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerViolations");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerViolations",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Sonar => {
                sonar::interroger_violations(
                    &instance.url_base,
                    &credential,
                    &source_id,
                    &id_externe,
                    date_ciblee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            // Défense en profondeur : cette commande n'a de sens que pour une instance Sonar.
            TypeInstance::Gitlab => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerViolations",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerViolations");
    resultat
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
    date_ciblee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatSonarDette, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerDette");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerDette",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Sonar => {
                sonar::interroger_dette(
                    &instance.url_base,
                    &credential,
                    &source_id,
                    &id_externe,
                    date_ciblee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            TypeInstance::Gitlab => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerDette",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerDette");
    resultat
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
    date_ciblee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatSonarCouverture, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerCouverture");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerCouverture",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Sonar => {
                sonar::interroger_couverture(
                    &instance.url_base,
                    &credential,
                    &source_id,
                    &id_externe,
                    date_ciblee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            TypeInstance::Gitlab => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerCouverture",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerCouverture");
    resultat
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
    date_ciblee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatSonarNotes, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerNotes");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerNotes",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Sonar => {
                sonar::interroger_notes(
                    &instance.url_base,
                    &credential,
                    &source_id,
                    &id_externe,
                    date_ciblee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            TypeInstance::Gitlab => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerNotes",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerNotes");
    resultat
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
    date_ciblee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<ResultatSonarNcloc, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerNcloc");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerNcloc",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Sonar => {
                sonar::interroger_ncloc(
                    &instance.url_base,
                    &credential,
                    &source_id,
                    &id_externe,
                    date_ciblee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            TypeInstance::Gitlab => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerNcloc",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerNcloc");
    resultat
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
    date_ciblee: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<Option<String>, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerDerniereAnalyse");
    let resultat = async {
        let credential = credential_instance(&instance, &etat)?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerDerniereAnalyse",
            &instance.nom,
            &id_externe,
        );
        let resultat = match instance.type_instance {
            TypeInstance::Sonar => {
                sonar::interroger_derniere_analyse(
                    &instance.url_base,
                    &credential,
                    &id_externe,
                    date_ciblee.as_deref(),
                    &etat.client_http(),
                )
                .await
            }
            TypeInstance::Gitlab => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerDerniereAnalyse",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerDerniereAnalyse");
    resultat
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
    crate::journalisation::consigner_debut_commande("enregistrerBrouillon");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
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

        let cle = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "enregistrerBrouillon",
        )?;
        etat.definir(PathBuf::from(chemin), cle);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("enregistrerBrouillon");
    resultat
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
    crate::journalisation::consigner_debut_commande("integrerBrouillon");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        audit::integrer_brouillon(&mut donnees, selection.as_deref())?;

        let cle = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "integrerBrouillon",
        )?;
        etat.definir(PathBuf::from(chemin), cle);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("integrerBrouillon");
    resultat
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
    crate::journalisation::consigner_debut_commande("rejeterBrouillon");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        audit::rejeter_brouillon(&mut donnees, selection.as_deref(), motif)?;

        let cle = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "rejeterBrouillon",
        )?;
        etat.definir(PathBuf::from(chemin), cle);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("rejeterBrouillon");
    resultat
}
