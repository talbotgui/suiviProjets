// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Connecteur Sonar (US-004, Phase 2 ; US-009, Phase 5). Périmètre de la Phase 5, incrément 1 : les cinq
//! opérations d'interrogation des indicateurs listées en conception détaillée
//! (`docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`),
//! toutes construites sur le même point d'API multi-métriques `measures/component` (cf.
//! `docs/01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs` : « les métriques Sonar sont
//! obtenues en un appel `measures/component` multi-métriques »), à la différence du Connecteur GitLab qui
//! mobilise plusieurs points d'API distincts par indicateur.
//!
//! À la différence de GitLab, aucune de ces cinq opérations ne prend de ref auditée en paramètre : Sonar analyse
//! une branche fixe (généralement gérée côté CI, hors périmètre de cette application), sans équivalent du
//! `refAuditee` d'une source GitLab dans la conception détaillée.

use super::commun::{ErreurConnecteur, VerdictConnectivite, erreur_depuis_reqwest};
use crate::modele::racine::{
    ParSeverite, ResultatSonarCouverture, ResultatSonarDette, ResultatSonarNcloc,
    ResultatSonarNotes, ResultatSonarViolations,
};
use serde::Deserialize;
use std::collections::HashMap;

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

/// Mesure individuelle du point d'API `measures/component` de Sonar.
#[derive(Debug, Deserialize)]
struct Mesure {
    metric: String,
    #[serde(default)]
    value: Option<String>,
}

/// Composant Sonar interrogé, réduit à ses mesures.
#[derive(Debug, Deserialize)]
struct Composant {
    #[serde(default)]
    measures: Vec<Mesure>,
}

/// Réponse du point d'API `measures/component` de Sonar.
#[derive(Debug, Deserialize)]
struct ReponseMeasuresComponent {
    component: Composant,
}

/// Interroge un jeu de métriques Sonar en un seul appel `measures/component` (cf. en-tête de module).
///
/// # Erreurs
///
/// [`ErreurConnecteur::AuthentificationRefusee`] (401), [`ErreurConnecteur::DroitsInsuffisants`] (403),
/// [`ErreurConnecteur::ReponseInattendue`] pour tout autre statut ou composant Sonar inconnu (404, à la
/// différence de la ref GitLab, aucune ref n'étant en jeu côté Sonar), délai/injoignabilité selon
/// [`erreur_depuis_reqwest`].
async fn recuperer_mesures(
    url_base: &str,
    credential: &str,
    id_externe: &str,
    metric_keys: &str,
    client: &reqwest::Client,
) -> Result<Vec<Mesure>, ErreurConnecteur> {
    let url = format!("{}/api/measures/component", url_base.trim_end_matches('/'));
    let reponse = client
        .get(url)
        .bearer_auth(credential)
        .query(&[("component", id_externe), ("metricKeys", metric_keys)])
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

    Ok(reponse
        .json::<ReponseMeasuresComponent>()
        .await
        .map_err(|_| ErreurConnecteur::ReponseInattendue)?
        .component
        .measures)
}

/// Valeur brute (chaîne) d'une métrique, si présente dans le jeu de mesures interrogé.
fn valeur<'a>(mesures: &'a [Mesure], cle: &str) -> Option<&'a str> {
    mesures
        .iter()
        .find(|mesure| mesure.metric == cle)
        .and_then(|mesure| mesure.value.as_deref())
}

/// Valeur d'une métrique numérique requise pour former le résultat : son absence ou son format non numérique
/// traduit une réponse Sonar ne correspondant pas au format attendu.
fn valeur_numerique_requise(mesures: &[Mesure], cle: &str) -> Result<f64, ErreurConnecteur> {
    valeur(mesures, cle)
        .and_then(|valeur| valeur.parse().ok())
        .ok_or(ErreurConnecteur::ReponseInattendue)
}

/// Valeur d'une métrique de comptage, `0` par défaut si la métrique est absente (aucune violation détectée dans
/// la catégorie, par exemple, n'apparaît pas nécessairement dans la réponse Sonar).
fn valeur_comptage(mesures: &[Mesure], cle: &str) -> u32 {
    valeur(mesures, cle)
        .and_then(|valeur| valeur.parse().ok())
        .unwrap_or(0)
}

/// Interroge les violations Sonar par sévérité (US-009, `sonar.violations`).
///
/// # Erreurs
///
/// Voir [`recuperer_mesures`].
pub(crate) async fn interroger_violations(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    client: &reqwest::Client,
) -> Result<ResultatSonarViolations, ErreurConnecteur> {
    let mesures = recuperer_mesures(
        url_base,
        credential,
        id_externe,
        "blocker_violations,critical_violations,major_violations,minor_violations,info_violations,new_violations",
        client,
    )
    .await?;

    Ok(ResultatSonarViolations {
        source_id: source_id.to_string(),
        par_severite: ParSeverite {
            bloquant: valeur_comptage(&mesures, "blocker_violations"),
            critique: valeur_comptage(&mesures, "critical_violations"),
            majeur: valeur_comptage(&mesures, "major_violations"),
            mineur: valeur_comptage(&mesures, "minor_violations"),
            info: valeur_comptage(&mesures, "info_violations"),
        },
        nouvelles_violations: valeur_comptage(&mesures, "new_violations"),
    })
}

/// Interroge la dette technique Sonar (US-009, `sonar.dette`).
///
/// # Erreurs
///
/// Voir [`recuperer_mesures`].
pub(crate) async fn interroger_dette(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    client: &reqwest::Client,
) -> Result<ResultatSonarDette, ErreurConnecteur> {
    let mesures = recuperer_mesures(
        url_base,
        credential,
        id_externe,
        "sqale_index,sqale_debt_ratio",
        client,
    )
    .await?;

    Ok(ResultatSonarDette {
        source_id: source_id.to_string(),
        dette_minutes: valeur_numerique_requise(&mesures, "sqale_index")? as u64,
        ratio_dette: valeur_numerique_requise(&mesures, "sqale_debt_ratio")?,
    })
}

/// Interroge la couverture de tests Sonar (US-009, `sonar.couverture`).
///
/// # Erreurs
///
/// Voir [`recuperer_mesures`].
pub(crate) async fn interroger_couverture(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    client: &reqwest::Client,
) -> Result<ResultatSonarCouverture, ErreurConnecteur> {
    let mesures = recuperer_mesures(
        url_base,
        credential,
        id_externe,
        "coverage,new_coverage",
        client,
    )
    .await?;

    Ok(ResultatSonarCouverture {
        source_id: source_id.to_string(),
        couverture: valeur_numerique_requise(&mesures, "coverage")?,
        couverture_nouveau_code: valeur_numerique_requise(&mesures, "new_coverage")?,
    })
}

/// Interroge les notes Sonar des quatre axes (US-009, `sonar.notes`), stockées en valeur numérique 1.0–5.0 : la
/// conversion en lettre colorée A–E relève du Moteur de jugement (RG-011).
///
/// # Erreurs
///
/// Voir [`recuperer_mesures`].
pub(crate) async fn interroger_notes(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    client: &reqwest::Client,
) -> Result<ResultatSonarNotes, ErreurConnecteur> {
    let mesures = recuperer_mesures(
        url_base,
        credential,
        id_externe,
        "reliability_rating,security_rating,sqale_rating,security_review_rating",
        client,
    )
    .await?;

    Ok(ResultatSonarNotes {
        source_id: source_id.to_string(),
        fiabilite: valeur_numerique_requise(&mesures, "reliability_rating")?,
        securite: valeur_numerique_requise(&mesures, "security_rating")?,
        maintenabilite: valeur_numerique_requise(&mesures, "sqale_rating")?,
        revue_securite: valeur_numerique_requise(&mesures, "security_review_rating")?,
    })
}

/// Répartit la chaîne `ncloc_language_distribution` de Sonar (ex. `"java=79800;xml=4410"`) en une table par
/// langage ; une entrée non conforme au format `langage=valeur` est ignorée plutôt que de faire échouer
/// l'ensemble de l'indicateur, cette répartition restant secondaire par rapport au total `ncloc` lui-même.
fn parser_repartition_langages(valeur: Option<&str>) -> HashMap<String, u64> {
    valeur
        .unwrap_or_default()
        .split(';')
        .filter_map(|paire| {
            let (langage, quantite) = paire.split_once('=')?;
            Some((langage.to_string(), quantite.parse().ok()?))
        })
        .collect()
}

/// Interroge le volume de code Sonar (US-009, `sonar.ncloc`).
///
/// # Erreurs
///
/// Voir [`recuperer_mesures`].
pub(crate) async fn interroger_ncloc(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    client: &reqwest::Client,
) -> Result<ResultatSonarNcloc, ErreurConnecteur> {
    let mesures = recuperer_mesures(
        url_base,
        credential,
        id_externe,
        "ncloc,ncloc_language_distribution",
        client,
    )
    .await?;

    Ok(ResultatSonarNcloc {
        source_id: source_id.to_string(),
        ncloc: valeur_numerique_requise(&mesures, "ncloc")? as u64,
        par_langage: parser_repartition_langages(valeur(&mesures, "ncloc_language_distribution")),
    })
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

    #[tokio::test]
    async fn interroger_violations_reussit() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "component": {
                    "measures": [
                        { "metric": "blocker_violations", "value": "4" },
                        { "metric": "critical_violations", "value": "15" },
                        { "metric": "major_violations", "value": "88" },
                        { "metric": "minor_violations", "value": "240" },
                        { "metric": "info_violations", "value": "31" },
                        { "metric": "new_violations", "value": "9" }
                    ]
                }
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_violations(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(
            resultat,
            Ok(crate::modele::racine::ResultatSonarViolations {
                source_id: "source-2".to_string(),
                par_severite: crate::modele::racine::ParSeverite {
                    bloquant: 4,
                    critique: 15,
                    majeur: 88,
                    mineur: 240,
                    info: 31,
                },
                nouvelles_violations: 9,
            })
        );
    }

    #[tokio::test]
    async fn interroger_violations_traite_une_categorie_absente_comme_nulle()
    -> Result<(), ErreurConnecteur> {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "component": { "measures": [] }
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_violations(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.par_severite.bloquant, 0);
        assert_eq!(resultat.nouvelles_violations, 0);
        Ok(())
    }

    #[tokio::test]
    async fn interroger_dette_reussit() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "component": {
                    "measures": [
                        { "metric": "sqale_index", "value": "14520" },
                        { "metric": "sqale_debt_ratio", "value": "3.4" }
                    ]
                }
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_dette(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(
            resultat,
            Ok(crate::modele::racine::ResultatSonarDette {
                source_id: "source-2".to_string(),
                dette_minutes: 14520,
                ratio_dette: 3.4,
            })
        );
    }

    #[tokio::test]
    async fn interroger_dette_signale_authentification_refusee() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&serveur)
            .await;

        let resultat = interroger_dette(
            &serveur.uri(),
            "jeton-invalide",
            "source-2",
            "proj-key",
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(resultat, Err(ErreurConnecteur::AuthentificationRefusee));
    }

    #[tokio::test]
    async fn interroger_couverture_reussit() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "component": {
                    "measures": [
                        { "metric": "coverage", "value": "61.2" },
                        { "metric": "new_coverage", "value": "71.0" }
                    ]
                }
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_couverture(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(
            resultat,
            Ok(crate::modele::racine::ResultatSonarCouverture {
                source_id: "source-2".to_string(),
                couverture: 61.2,
                couverture_nouveau_code: 71.0,
            })
        );
    }

    #[tokio::test]
    async fn interroger_couverture_signale_une_valeur_manquante_en_reponse_inattendue() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "component": { "measures": [{ "metric": "coverage", "value": "61.2" }] }
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_couverture(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(resultat, Err(ErreurConnecteur::ReponseInattendue));
    }

    #[tokio::test]
    async fn interroger_notes_reussit() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "component": {
                    "measures": [
                        { "metric": "reliability_rating", "value": "2.0" },
                        { "metric": "security_rating", "value": "3.0" },
                        { "metric": "sqale_rating", "value": "2.0" },
                        { "metric": "security_review_rating", "value": "2.0" }
                    ]
                }
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_notes(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(
            resultat,
            Ok(crate::modele::racine::ResultatSonarNotes {
                source_id: "source-2".to_string(),
                fiabilite: 2.0,
                securite: 3.0,
                maintenabilite: 2.0,
                revue_securite: 2.0,
            })
        );
    }

    #[tokio::test]
    async fn interroger_ncloc_reussit_avec_repartition_par_langage() -> Result<(), ErreurConnecteur>
    {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "component": {
                    "measures": [
                        { "metric": "ncloc", "value": "84210" },
                        { "metric": "ncloc_language_distribution", "value": "java=79800;xml=4410;js=0" }
                    ]
                }
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_ncloc(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.ncloc, 84210);
        assert_eq!(resultat.par_langage.get("java"), Some(&79800));
        assert_eq!(resultat.par_langage.get("xml"), Some(&4410));
        assert_eq!(resultat.par_langage.get("js"), Some(&0));
        Ok(())
    }

    #[tokio::test]
    async fn interroger_ncloc_reussit_sans_repartition_par_langage() -> Result<(), ErreurConnecteur>
    {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "component": { "measures": [{ "metric": "ncloc", "value": "84210" }] }
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_ncloc(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.ncloc, 84210);
        assert!(resultat.par_langage.is_empty());
        Ok(())
    }
}
