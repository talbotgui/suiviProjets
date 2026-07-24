// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Tests d'intégration hors CI, exécutés contre de vraies instances GitLab/Sonar (cf.
//! `docs/02_documentation/16_normesTests.md#tests-dintégration-hors-intégration-continue-contre-des-instances-réelles`).
//! Tous marqués `#[ignore]` : ne s'exécutent jamais via un simple `cargo test` ni en CI, déclenchement manuel
//! uniquement (`cargo test -- --ignored`), une fois les variables d'environnement suivantes définies dans la
//! session locale (jamais en dur dans le code, jamais committées, cf.
//! `docs/02_documentation/17_posteDeveloppeur.md#variables-denvironnement`) :
//!
//! - `SQM_TEST_GITLAB_URL` / `SQM_TEST_GITLAB_TOKEN` : URL de base et jeton d'accès personnel d'une instance
//!   GitLab réelle, déjà documentées par `docs/02_documentation/17_posteDeveloppeur.md`.
//! - `SQM_TEST_GITLAB_PROJET_ID` : identifiant d'un projet GitLab réel accessible avec ce jeton, interrogé par les
//!   tests d'opération d'indicateur (variable introduite par ce module, Phase 5, incrément 7).
//! - `SQM_TEST_SONAR_URL` / `SQM_TEST_SONAR_TOKEN` : URL de base et jeton d'une instance Sonar réelle, déjà
//!   documentées par `docs/02_documentation/17_posteDeveloppeur.md`.
//! - `SQM_TEST_SONAR_PROJET_CLE` : clé d'un projet Sonar réel accessible avec ce jeton (variable introduite par ce
//!   module, Phase 5, incrément 7).
//!
//! `.expect()` est ici le seul endroit du projet où son usage est toléré (`clippy::expect_used` normalement
//! interdit partout ailleurs, cf.
//! `docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--rust`) :
//! ces tests ne tournent jamais en CI (`#[ignore]`), et une variable d'environnement absente doit interrompre
//! immédiatement et lisiblement le test déclenché manuellement, plutôt que de propager une anomalie ambiguë.

use super::commun::client_http;
use super::{gitlab, sonar};

/// Lit une variable d'environnement requise pour un test d'intégration hors CI, ou panique avec `message` si elle
/// est absente. `message` est reçu déjà construit par l'appelant (plutôt qu'assemblé ici via `format!` à
/// l'intérieur de l'appel à `.expect()`) pour ne pas déclencher `clippy::expect_fun_call`, qui recommande de
/// précalculer le message plutôt que de l'évaluer paresseusement dans le seul cas d'échec.
///
/// Seule fonction du projet où `.expect()` est employé (cf. en-tête de module) : ces tests ne tournent jamais en
/// CI, un panic y est le comportement explicitement voulu en cas de credential manquant.
#[allow(
    clippy::expect_used,
    reason = "seul endroit toléré du projet (cf. en-tête de module) : test #[ignore], jamais exécuté en CI, une \
              variable d'environnement absente doit interrompre immédiatement et lisiblement le test déclenché \
              manuellement"
)]
fn variable_env_requise(nom: &str, message: &str) -> String {
    std::env::var(nom).expect(message)
}

#[tokio::test]
#[ignore = "test d'intégration hors CI : nécessite une vraie instance GitLab, déclenchement manuel uniquement"]
async fn tester_connectivite_reussit_contre_une_vraie_instance_gitlab() {
    let url = variable_env_requise(
        "SQM_TEST_GITLAB_URL",
        "SQM_TEST_GITLAB_URL doit être définie pour ce test d'intégration",
    );
    let jeton = variable_env_requise(
        "SQM_TEST_GITLAB_TOKEN",
        "SQM_TEST_GITLAB_TOKEN doit être définie pour ce test d'intégration",
    );

    let verdict = gitlab::tester_connectivite(&url, &jeton, client_http()).await;

    assert!(
        verdict.is_ok(),
        "connectivité GitLab attendue en succès avec des credentials valides : {verdict:?}"
    );
}

#[tokio::test]
#[ignore = "test d'intégration hors CI : nécessite une vraie instance Sonar, déclenchement manuel uniquement"]
async fn tester_connectivite_reussit_contre_une_vraie_instance_sonar() {
    let url = variable_env_requise(
        "SQM_TEST_SONAR_URL",
        "SQM_TEST_SONAR_URL doit être définie pour ce test d'intégration",
    );
    let jeton = variable_env_requise(
        "SQM_TEST_SONAR_TOKEN",
        "SQM_TEST_SONAR_TOKEN doit être définie pour ce test d'intégration",
    );

    let verdict = sonar::tester_connectivite(&url, &jeton, client_http()).await;

    assert!(
        verdict.is_ok(),
        "connectivité Sonar attendue en succès avec des credentials valides : {verdict:?}"
    );
}

#[tokio::test]
#[ignore = "test d'intégration hors CI : nécessite une vraie instance GitLab, déclenchement manuel uniquement"]
async fn interroger_vitalite_reussit_contre_une_vraie_instance_gitlab() {
    let url = variable_env_requise(
        "SQM_TEST_GITLAB_URL",
        "SQM_TEST_GITLAB_URL doit être définie pour ce test d'intégration",
    );
    let jeton = variable_env_requise(
        "SQM_TEST_GITLAB_TOKEN",
        "SQM_TEST_GITLAB_TOKEN doit être définie pour ce test d'intégration",
    );
    let projet_id = variable_env_requise(
        "SQM_TEST_GITLAB_PROJET_ID",
        "SQM_TEST_GITLAB_PROJET_ID doit être définie pour ce test d'intégration",
    );

    let resultat = gitlab::interroger_vitalite(
        &url,
        &jeton,
        "source-integration-reelle",
        &projet_id,
        None,
        client_http(),
    )
    .await;

    assert!(
        resultat.is_ok(),
        "interrogation de la vitalité GitLab attendue en succès : {resultat:?}"
    );
}

#[tokio::test]
#[ignore = "test d'intégration hors CI : nécessite une vraie instance Sonar, déclenchement manuel uniquement"]
async fn interroger_violations_reussit_contre_une_vraie_instance_sonar() {
    let url = variable_env_requise(
        "SQM_TEST_SONAR_URL",
        "SQM_TEST_SONAR_URL doit être définie pour ce test d'intégration",
    );
    let jeton = variable_env_requise(
        "SQM_TEST_SONAR_TOKEN",
        "SQM_TEST_SONAR_TOKEN doit être définie pour ce test d'intégration",
    );
    let projet_cle = variable_env_requise(
        "SQM_TEST_SONAR_PROJET_CLE",
        "SQM_TEST_SONAR_PROJET_CLE doit être définie pour ce test d'intégration",
    );

    let resultat = sonar::interroger_violations(
        &url,
        &jeton,
        "source-integration-reelle",
        &projet_cle,
        client_http(),
    )
    .await;

    assert!(
        resultat.is_ok(),
        "interrogation des violations Sonar attendue en succès : {resultat:?}"
    );
}

#[tokio::test]
#[ignore = "test d'intégration hors CI : nécessite une vraie instance GitLab, déclenchement manuel uniquement"]
async fn interroger_marqueurs_ia_reussit_contre_une_vraie_instance_gitlab() {
    let url = variable_env_requise(
        "SQM_TEST_GITLAB_URL",
        "SQM_TEST_GITLAB_URL doit être définie pour ce test d'intégration",
    );
    let jeton = variable_env_requise(
        "SQM_TEST_GITLAB_TOKEN",
        "SQM_TEST_GITLAB_TOKEN doit être définie pour ce test d'intégration",
    );
    let projet_id = variable_env_requise(
        "SQM_TEST_GITLAB_PROJET_ID",
        "SQM_TEST_GITLAB_PROJET_ID doit être définie pour ce test d'intégration",
    );

    // Référentiel de test minimal (une seule règle), sur le modèle de l'exemple de référence
    // `docs/01_besoin/exemple-donnees.json` (`reglesMarqueursIA`).
    let regles = vec![gitlab::RegleMarqueurIA {
        motif: "CLAUDE.md".to_string(),
        type_correspondance: gitlab::TypeCorrespondanceMarqueur::Exact,
        portee: gitlab::PorteeMarqueur::Partout,
        nature: gitlab::NatureMarqueur::Fichier,
        outil: "claude".to_string(),
    }];

    let resultat = gitlab::interroger_marqueurs_ia(
        &url,
        &jeton,
        "source-integration-reelle",
        &projet_id,
        None,
        &regles,
        client_http(),
    )
    .await;

    assert!(
        resultat.is_ok(),
        "interrogation des marqueurs IA GitLab attendue en succès : {resultat:?}"
    );
}
