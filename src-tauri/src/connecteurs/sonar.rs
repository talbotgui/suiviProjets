// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Connecteur Sonar (US-004) : limité, en Phase 2, au test de connectivité d'un credential. Les opérations
//! d'interrogation des indicateurs (violations, dette, couverture, etc., cf.
//! `docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`) relèvent
//! du Moteur d'audit (Phase 5), hors périmètre de ce module à ce stade.

use super::commun::{ErreurConnecteur, VerdictConnectivite, erreur_depuis_reqwest};
use serde::Deserialize;

/// Réponse du point d'API `authentication/validate` de Sonar.
#[derive(Debug, Deserialize)]
struct ReponseValidation {
    valid: bool,
}

/// Teste la connectivité d'un credential Sonar via le point d'API anodin `authentication/validate`.
///
/// Ce point d'entrée ne renvoie aucune information de portée du token : `portee_excessive` vaut donc toujours
/// `false` côté Sonar (limite assumée, cf. rapport de développement de cette phase), contrairement au Connecteur
/// GitLab qui peut contrôler la portée réelle du token en un seul appel.
///
/// # Erreurs
///
/// Retourne une [`ErreurConnecteur`] typée selon RG-021 : authentification refusée (jeton explicitement invalide,
/// ou statut 401), instance injoignable, délai dépassé, ou réponse inattendue (statut ou JSON non conforme).
pub(crate) async fn tester_connectivite(
    url_base: &str,
    credential: &str,
    client: &reqwest::Client,
) -> Result<VerdictConnectivite, ErreurConnecteur> {
    let url = format!(
        "{}/api/authentication/validate",
        url_base.trim_end_matches('/')
    );
    let reponse = client
        .get(url)
        .bearer_auth(credential)
        .send()
        .await
        .map_err(|erreur| erreur_depuis_reqwest(&erreur))?;

    let statut = reponse.status();
    if statut.as_u16() == 401 {
        return Err(ErreurConnecteur::AuthentificationRefusee);
    }
    if !statut.is_success() {
        return Err(ErreurConnecteur::ReponseInattendue);
    }

    let corps = reponse
        .json::<ReponseValidation>()
        .await
        .map_err(|_| ErreurConnecteur::ReponseInattendue)?;

    if corps.valid {
        Ok(VerdictConnectivite {
            portee_excessive: false,
        })
    } else {
        Err(ErreurConnecteur::AuthentificationRefusee)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    /// Client à délai très court, dédié aux tests, pour exercer le cas « délai dépassé » sans ralentir la suite
    /// (le client partagé de production, lui, applique un délai de 10 secondes).
    fn client_test_delai_court() -> reqwest::Client {
        reqwest::Client::builder()
            .timeout(Duration::from_millis(200))
            .build()
            .unwrap_or_default()
    }

    #[tokio::test]
    async fn tester_connectivite_reussit_si_le_jeton_est_valide() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/authentication/validate"))
            .and(header("Authorization", "Bearer jeton-valide"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({ "valid": true })),
            )
            .mount(&serveur)
            .await;

        let verdict =
            tester_connectivite(&serveur.uri(), "jeton-valide", &client_test_delai_court()).await;

        assert_eq!(
            verdict,
            Ok(VerdictConnectivite {
                portee_excessive: false
            })
        );
    }

    #[tokio::test]
    async fn tester_connectivite_signale_authentification_refusee_si_jeton_invalide() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/authentication/validate"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({ "valid": false })),
            )
            .mount(&serveur)
            .await;

        let verdict =
            tester_connectivite(&serveur.uri(), "jeton-invalide", &client_test_delai_court()).await;

        assert_eq!(verdict, Err(ErreurConnecteur::AuthentificationRefusee));
    }

    #[tokio::test]
    async fn tester_connectivite_signale_authentification_refusee_sur_statut_401() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/authentication/validate"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&serveur)
            .await;

        let verdict =
            tester_connectivite(&serveur.uri(), "jeton", &client_test_delai_court()).await;

        assert_eq!(verdict, Err(ErreurConnecteur::AuthentificationRefusee));
    }

    #[tokio::test]
    async fn tester_connectivite_signale_une_reponse_inattendue() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/authentication/validate"))
            .respond_with(ResponseTemplate::new(200).set_body_string("pas du json"))
            .mount(&serveur)
            .await;

        let verdict =
            tester_connectivite(&serveur.uri(), "jeton", &client_test_delai_court()).await;

        assert_eq!(verdict, Err(ErreurConnecteur::ReponseInattendue));
    }

    #[tokio::test]
    async fn tester_connectivite_signale_un_delai_depasse() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/authentication/validate"))
            .respond_with(ResponseTemplate::new(200).set_delay(Duration::from_millis(500)))
            .mount(&serveur)
            .await;

        let verdict =
            tester_connectivite(&serveur.uri(), "jeton", &client_test_delai_court()).await;

        assert_eq!(verdict, Err(ErreurConnecteur::DelaiDepasse));
    }

    #[tokio::test]
    async fn tester_connectivite_signale_une_instance_injoignable() {
        // Aucun serveur n'écoute sur ce port : la connexion doit échouer avant même le délai de requête.
        let verdict =
            tester_connectivite("http://127.0.0.1:1", "jeton", &client_test_delai_court()).await;

        assert_eq!(verdict, Err(ErreurConnecteur::InstanceInjoignable));
    }
}
