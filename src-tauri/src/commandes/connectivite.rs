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
use crate::connecteurs::commun::{ErreurConnecteur, VerdictConnectivite, client_http};
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
) -> Result<VerdictConnectivite, ErreurConnecteur> {
    let client = client_http();
    match instance.type_instance {
        TypeInstance::Gitlab => {
            gitlab::tester_connectivite(&instance.url_base, &credential, client).await
        }
        TypeInstance::Sonar => {
            sonar::tester_connectivite(&instance.url_base, &credential, client).await
        }
    }
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
    if etat.definir_credentials(credentials) {
        Ok(())
    } else {
        Err(ErreurFacade::CredentialInvalide)
    }
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
    let credential =
        etat.credential(&instance.id)
            .ok_or_else(|| ErreurConnecteur::CredentialAbsent {
                message: "Aucun credential en mémoire pour cette instance".to_string(),
            })?;
    match instance.type_instance {
        TypeInstance::Gitlab => {
            gitlab::interroger_branches(
                &instance.url_base,
                &credential,
                &id_externe,
                recherche.as_deref(),
                client_http(),
            )
            .await
        }
        // Défense en profondeur : une source `projetSonar` n'a pas de branches, l'UI ne devrait jamais invoquer
        // cette commande pour une instance Sonar.
        TypeInstance::Sonar => Err(ErreurConnecteur::ReponseInattendue {
            message: "Type de source incompatible avec cette opération".to_string(),
        }),
    }
}
