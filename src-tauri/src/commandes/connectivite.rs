// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées aux credentials de session (US-003, US-004, RG-004). Périmètre de la Phase 2 :
//! saisie en mémoire d'un credential par instance et test de connectivité, sans persistance sur disque. Périmètre
//! de la Phase 3 : autocomplétion des branches d'un dépôt GitLab pour la ref auditée d'une source (US-008),
//! réutilisant le credential déjà mémorisé pour l'instance concernée plutôt que de le faire retransiter par
//! l'appelant.
//!
//! Nom de commande non fourni littéralement par la documentation source (décision, cf. rapport de développement de
//! cette phase) : `definirCredentials`/`definir_credentials` n'est nommé nulle part explicitement dans
//! `docs/02_documentation/13_conceptionDetaillee.md` (seul `testerConnectivite` y est nommé) ; retenu par symétrie
//! avec la méthode `EtatSessionService.definirCredentials()` déjà en place côté interface depuis la Phase 1, sur le
//! modèle de la décision similaire déjà prise pour `deverrouillerSession` en Phase 1. `interrogerBranches`, lui,
//! est nommé littéralement par `13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`.

use super::etat_session::EtatSession;
use super::fichier::ErreurFacade;
use crate::connecteurs::commun::{ErreurConnecteur, SourceDisponible, VerdictConnectivite};
use crate::connecteurs::{gitlab, sonar};
use crate::modele::racine::{Instance, TypeInstance};
use std::collections::HashMap;
use tauri::State;

/// Teste la connectivité d'un credential pour une instance donnée et contrôle sa portée quand l'instance le
/// permet (US-004). Le credential n'est jamais conservé par cette commande : il n'est utilisé que le temps de
/// l'appel, transmis uniquement en en-tête HTTP à l'instance concernée (RG-004).
#[tauri::command]
pub(crate) async fn tester_connectivite(
    instance: Instance,
    credential: String,
    etat: State<'_, EtatSession>,
) -> Result<VerdictConnectivite, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("testerConnectivite");
    let resultat = async {
        crate::journalisation::consigner_appel_connecteur(
            "testerConnectivite",
            &instance.nom,
            "test de connectivité",
        );
        let client = etat.client_http();
        let client = &client;
        let resultat = match instance.type_instance {
            TypeInstance::Gitlab => {
                gitlab::tester_connectivite(&instance.url_base, &credential, client).await
            }
            TypeInstance::Sonar => {
                sonar::tester_connectivite(&instance.url_base, &credential, client).await
            }
        };
        crate::journalisation::consigner_resultat_connecteur(
            "testerConnectivite",
            &instance.nom,
            "test de connectivité",
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("testerConnectivite");
    resultat
}

/// Enregistre les credentials de la session courante en mémoire côté cœur natif (US-003), en miroir du Store
/// d'état applicatif de l'interface, afin qu'un unique verrouillage de session les efface des deux côtés (RG-004,
/// RG-005). Cette commande délègue intégralement la revalidation (aucune valeur vide, cf.
/// `docs/02_documentation/15_normesSecurite.md#contrôle-des-entrées-et-sorties`) à [`EtatSession::definir_credentials`],
/// déjà couverte par ses propres tests unitaires : conformément à la convention du projet, la Façade de commandes
/// n'est jamais testée isolément.
///
/// # Erreurs
///
/// Retourne [`ErreurFacade::CredentialInvalide`] si l'un des credentials fournis est une chaîne vide ; aucun
/// credential n'est alors mémorisé, y compris ceux qui étaient valides dans le même appel.
#[tauri::command]
pub(crate) fn definir_credentials(
    credentials: HashMap<String, String>,
    etat: State<'_, EtatSession>,
) -> Result<(), ErreurFacade> {
    crate::journalisation::consigner_debut_commande("definirCredentials");
    let resultat = (|| -> Result<(), ErreurFacade> {
        if etat.definir_credentials(credentials) {
            Ok(())
        } else {
            Err(ErreurFacade::CredentialInvalide)
        }
    })();
    crate::journalisation::consigner_fin_commande("definirCredentials");
    resultat
}

/// Interroge les branches d'un dépôt GitLab pour l'autocomplétion de la ref auditée d'une source (US-008,
/// Phase 3). Le credential utilisé est celui déjà mémorisé en mémoire pour l'instance concernée (US-003) : il
/// n'est jamais retransmis en clair par l'appelant pour cette commande.
///
/// # Erreurs
///
/// [`ErreurConnecteur::CredentialAbsent`] si aucun credential n'a été saisi pour cette instance ; les autres
/// catégories de [`ErreurConnecteur`] en cas d'échec de l'appel réseau.
#[tauri::command]
pub(crate) async fn interroger_branches(
    instance: Instance,
    id_externe: String,
    recherche: Option<String>,
    etat: State<'_, EtatSession>,
) -> Result<Vec<String>, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("interrogerBranches");
    let resultat = async {
        let credential =
            etat.credential(&instance.id)
                .ok_or_else(|| ErreurConnecteur::CredentialAbsent {
                    message: "Aucun credential en mémoire pour cette instance".to_string(),
                })?;
        crate::journalisation::consigner_appel_connecteur(
            "interrogerBranches",
            &instance.nom,
            &id_externe,
        );
        let client = etat.client_http();
        let resultat = match instance.type_instance {
            TypeInstance::Gitlab => {
                gitlab::interroger_branches(
                    &instance.url_base,
                    &credential,
                    &id_externe,
                    recherche.as_deref(),
                    &client,
                )
                .await
            }
            // Défense en profondeur : une source `projetSonar` n'a pas de branches, l'UI ne devrait jamais invoquer
            // cette commande pour une instance Sonar.
            TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue {
                message: "Type de source incompatible avec cette opération".to_string(),
            }),
        };
        crate::journalisation::consigner_resultat_connecteur(
            "interrogerBranches",
            &instance.nom,
            &id_externe,
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("interrogerBranches");
    resultat
}

/// Liste les dépôts GitLab ou les projets Sonar accessibles avec le credential courant d'une Instance, pour
/// l'autocomplétion de l'identifiant externe d'une source (US-008, RG-036, ajouté le 2026-08-02). Le credential
/// utilisé est celui déjà mémorisé en mémoire pour l'instance concernée (US-003), sur le même principe que
/// [`interroger_branches`] : il n'est jamais retransmis en clair par l'appelant. Nom de commande choisi par
/// symétrie avec `interrogerBranches`/`testerConnectivite`, faute de nom fourni littéralement par
/// `docs/02_documentation/13_conceptionDetaillee.md` (décision, cf. rapport de développement de cette évolution).
///
/// # Erreurs
///
/// [`ErreurConnecteur::CredentialAbsent`] si aucun credential n'a été saisi pour cette instance ; les autres
/// catégories de [`ErreurConnecteur`] en cas d'échec de l'appel réseau.
#[tauri::command]
pub(crate) async fn lister_sources_disponibles(
    instance: Instance,
    etat: State<'_, EtatSession>,
) -> Result<Vec<SourceDisponible>, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("listerSourcesDisponibles");
    let resultat = async {
        let credential =
            etat.credential(&instance.id)
                .ok_or_else(|| ErreurConnecteur::CredentialAbsent {
                    message: "Aucun credential en mémoire pour cette instance".to_string(),
                })?;
        crate::journalisation::consigner_appel_connecteur(
            "listerSourcesDisponibles",
            &instance.nom,
            "toutes les sources accessibles",
        );
        let client = etat.client_http();
        let resultat = match instance.type_instance {
            TypeInstance::Gitlab => {
                gitlab::lister_projets(&instance.url_base, &credential, &client).await
            }
            TypeInstance::Sonar => {
                sonar::rechercher_projets(&instance.url_base, &credential, &client).await
            }
        };
        crate::journalisation::consigner_resultat_connecteur(
            "listerSourcesDisponibles",
            &instance.nom,
            "toutes les sources accessibles",
            resultat,
        )
    }
    .await;
    crate::journalisation::consigner_fin_commande("listerSourcesDisponibles");
    resultat
}
