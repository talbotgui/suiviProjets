// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Connecteur GitLab (US-004) : limité, en Phase 2, au test de connectivité d'un credential. Les opérations
//! d'interrogation des indicateurs (dépendances, branches, vitalité, etc., cf.
//! `docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`) relèvent
//! du Moteur d'audit (Phase 5), hors périmètre de ce module à ce stade.

use super::commun::{ErreurConnecteur, VerdictConnectivite, erreur_depuis_reqwest};
use serde::Deserialize;

/// Portée minimale en lecture seule recommandée par l'assistant de création de token
/// (`docs/01_besoin/Specification.md#52-f02--gestion-des-credentials-et-assistant-de-création`, à titre indicatif) :
/// tout scope supplémentaire déclenche l'avertissement de portée excessive (US-004).
const PORTEE_MINIMALE: &str = "read_api";

/// Réponse du point d'API `personal_access_tokens/self` de GitLab, réduite aux champs exploités ici.
#[derive(Debug, Deserialize)]
struct ReponseTokenSelf {
    scopes: Vec<String>,
}

/// Teste la connectivité d'un credential GitLab et contrôle sa portée (US-004) en un seul appel à un point
/// d'API anodin (`personal_access_tokens/self`), qui renvoie à la fois la validité du token et ses scopes,
/// évitant un second appel dédié au seul contrôle de portée.
///
/// # Erreurs
///
/// Retourne une [`ErreurConnecteur`] typée selon RG-021 : authentification refusée (401), droits insuffisants
/// (403), instance injoignable, délai dépassé, ou réponse inattendue (statut ou JSON non conforme).
pub(crate) async fn tester_connectivite(
    url_base: &str,
    credential: &str,
    client: &reqwest::Client,
) -> Result<VerdictConnectivite, ErreurConnecteur> {
    let url = format!(
        "{}/api/v4/personal_access_tokens/self",
        url_base.trim_end_matches('/')
    );
    let reponse = client
        .get(url)
        .header("PRIVATE-TOKEN", credential)
        .send()
        .await
        .map_err(|erreur| erreur_depuis_reqwest(&erreur))?;

    let statut = reponse.status();
    if statut.as_u16() == 401 {
        return Err(ErreurConnecteur::AuthentificationRefusee);
    }
    if statut.as_u16() == 403 {
        return Err(ErreurConnecteur::DroitsInsuffisants);
    }
    if !statut.is_success() {
        return Err(ErreurConnecteur::ReponseInattendue);
    }

    let corps = reponse
        .json::<ReponseTokenSelf>()
        .await
        .map_err(|_| ErreurConnecteur::ReponseInattendue)?;
    let portee_excessive = corps.scopes.iter().any(|scope| scope != PORTEE_MINIMALE);
    Ok(VerdictConnectivite { portee_excessive })
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
    async fn tester_connectivite_reussit_avec_portee_minimale() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/personal_access_tokens/self"))
            .and(header("PRIVATE-TOKEN", "jeton-valide"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "scopes": ["read_api"]
            })))
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
    async fn tester_connectivite_signale_une_portee_excessive() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/personal_access_tokens/self"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "scopes": ["api"]
            })))
            .mount(&serveur)
            .await;

        let verdict =
            tester_connectivite(&serveur.uri(), "jeton-large", &client_test_delai_court()).await;

        assert_eq!(
            verdict,
            Ok(VerdictConnectivite {
                portee_excessive: true
            })
        );
    }

    #[tokio::test]
    async fn tester_connectivite_signale_authentification_refusee() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/personal_access_tokens/self"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&serveur)
            .await;

        let verdict =
            tester_connectivite(&serveur.uri(), "jeton-invalide", &client_test_delai_court()).await;

        assert_eq!(verdict, Err(ErreurConnecteur::AuthentificationRefusee));
    }

    #[tokio::test]
    async fn tester_connectivite_signale_des_droits_insuffisants() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/personal_access_tokens/self"))
            .respond_with(ResponseTemplate::new(403))
            .mount(&serveur)
            .await;

        let verdict =
            tester_connectivite(&serveur.uri(), "jeton-limite", &client_test_delai_court()).await;

        assert_eq!(verdict, Err(ErreurConnecteur::DroitsInsuffisants));
    }

    #[tokio::test]
    async fn tester_connectivite_signale_une_reponse_inattendue() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/personal_access_tokens/self"))
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
            .and(path("/api/v4/personal_access_tokens/self"))
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

    #[tokio::test]
    async fn tester_connectivite_signale_une_reponse_inattendue_sur_boucle_de_redirection() {
        // Exerce la branche de repli de `erreur_depuis_reqwest` (ni délai dépassé, ni connexion refusée) : une
        // boucle de redirection HTTP produit une erreur `reqwest` de nature distincte, réellement provoquée ici
        // plutôt que simulée artificiellement.
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/personal_access_tokens/self"))
            .respond_with(ResponseTemplate::new(301).insert_header("Location", serveur.uri()))
            .mount(&serveur)
            .await;

        let verdict =
            tester_connectivite(&serveur.uri(), "jeton", &client_test_delai_court()).await;

        assert_eq!(verdict, Err(ErreurConnecteur::ReponseInattendue));
    }
}
