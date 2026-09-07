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
//! - `SQM_TEST_GITLAB_DOMAINE_INTERNE` / `SQM_TEST_GITLAB_PROJET_GROS_ID` : **optionnelles**, propres au test
//!   `rechercher_premier_commit_interne_contre_une_vraie_instance_gitlab` (plan_18, US-058/RG-058) — domaine d'un
//!   auteur de commit interne du projet testé, et identifiant d'un dépôt de plus de ~10 000 commits pour éprouver
//!   le repli en parcours avant (en-tête `x-total-pages` omis par l'API).
//!
//! `.expect()` est ici le seul endroit du projet où son usage est toléré (`clippy::expect_used` normalement
//! interdit partout ailleurs, cf.
//! `docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--rust`) :
//! ces tests ne tournent jamais en CI (`#[ignore]`), et une variable d'environnement absente doit interrompre
//! immédiatement et lisiblement le test déclenché manuellement, plutôt que de propager une anomalie ambiguë.

use super::commun::client_http_avec_proxy;
use super::gitlab::{CorrespondanceInterne, ResultatPremierCommitInterne};
use super::{gitlab, sonar};

/// Client HTTP sans réglage de proxy applicatif, pour ces tests d'intégration hors CI (cf.
/// [`client_http_avec_proxy`]) : reproduit le comportement du client par défaut d'avant la Phase 10 (proxy système
/// seul).
fn client_http() -> reqwest::Client {
    client_http_avec_proxy(None)
}

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

    let verdict = gitlab::tester_connectivite(&url, &jeton, &client_http()).await;

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

    let verdict = sonar::tester_connectivite(&url, &jeton, &client_http()).await;

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
        None,
        &client_http(),
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
        None,
        &client_http(),
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
        None,
        &client_http(),
    )
    .await;

    assert!(
        resultat.is_ok(),
        "interrogation des marqueurs IA GitLab attendue en succès : {resultat:?}"
    );
}

/// C15-14 (audit historique à date passée) : point non vérifié contre une instance réelle au moment de ce
/// développement (cf. rapport de développement, Étape 15 incrément 11) — le comportement combiné des paramètres `since`/`until`
/// de `GET .../repository/commits` (un bug forum GitLab signale que `until` serait silencieusement ignoré en
/// présence de `since` sur certaines versions). `interroger_contributeurs` ne peut par construction jamais échouer
/// à cause de ce point précis (aucune dégradation gracieuse à vérifier ici, juste l'exactitude de la fenêtre
/// retournée) : la vérification utile est humaine, à mener avec `cargo test -- --ignored --nocapture`, en
/// comparant la fenêtre `[date_cible − 90j ; date_cible]` affichée aux commits réellement attendus sur le dépôt
/// testé.
#[tokio::test]
#[ignore = "test d'intégration hors CI : nécessite une vraie instance GitLab, déclenchement manuel uniquement — \
            confirme le comportement combiné since/until de repository/commits en mode historique (C15-14)"]
async fn interroger_contributeurs_en_mode_historique_contre_une_vraie_instance_gitlab() {
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

    // Date cible à adapter manuellement à une date pour laquelle le dépôt testé possède déjà des commits dans la
    // fenêtre glissante de 90 jours précédente, afin qu'une vérification humaine du résultat affiché soit
    // possible.
    let date_cible = "2026-01-01";

    let resultat = gitlab::interroger_contributeurs(
        &url,
        &jeton,
        "source-integration-reelle",
        &projet_id,
        None,
        Some(date_cible),
        &client_http(),
    )
    .await;

    assert!(
        resultat.is_ok(),
        "interrogation historique des contributeurs GitLab attendue en succès : {resultat:?}"
    );
    eprintln!(
        "contributeurs (mode historique, fenêtre since/until combinée) = {resultat:?}\n\
         vérification humaine attendue : les commits comptabilisés doivent relever de la fenêtre \
         [{date_cible} − 90j ; {date_cible}], jamais de la fenêtre [maintenant − 90j ; maintenant]"
    );
}

/// C15-14 (audit historique à date passée) : point non vérifié contre une instance réelle au moment de ce
/// développement (cf. rapport de développement, Étape 15 incrément 11) — l'historisation réelle de `sonar.notes`
/// (`reliability_rating`/`security_rating`/`sqale_rating`/`security_review_rating`) et de `sonar.ncloc` par
/// `GET /api/measures/search_history`. `interroger_notes`/`interroger_ncloc` ne peuvent par construction jamais
/// échouer en mode historique (dégradation gracieuse par valeur de repli, cf. leur documentation respective dans
/// `sonar.rs`) : la vérification utile est humaine, à mener avec `cargo test -- --ignored --nocapture`, en
/// confirmant que les valeurs affichées ci-dessous diffèrent bien de leur valeur de repli documentée (`5.0` pour
/// chaque note, `0` pour `ncloc`) sur une date où l'instance testée dispose réellement d'une analyse.
#[tokio::test]
#[ignore = "test d'intégration hors CI : nécessite une vraie instance Sonar, déclenchement manuel uniquement — \
            confirme l'historisation réelle de sonar.notes/sonar.ncloc en mode historique (C15-14)"]
async fn interroger_notes_et_ncloc_en_mode_historique_contre_une_vraie_instance_sonar() {
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

    // Date cible à adapter manuellement à une date pour laquelle le projet testé possède déjà une analyse Sonar.
    let date_cible = "2026-01-01";

    let notes = sonar::interroger_notes(
        &url,
        &jeton,
        "source-integration-reelle",
        &projet_cle,
        Some(date_cible),
        &client_http(),
    )
    .await;
    let ncloc = sonar::interroger_ncloc(
        &url,
        &jeton,
        "source-integration-reelle",
        &projet_cle,
        Some(date_cible),
        &client_http(),
    )
    .await;

    assert!(
        notes.is_ok(),
        "interrogation historique des notes Sonar attendue en succès : {notes:?}"
    );
    assert!(
        ncloc.is_ok(),
        "interrogation historique du ncloc Sonar attendue en succès : {ncloc:?}"
    );
    eprintln!(
        "notes (mode historique) = {notes:?}\nncloc (mode historique) = {ncloc:?}\n\
         vérification humaine attendue : ces valeurs doivent différer de la valeur de repli (5.0 par note, 0 pour \
         ncloc) si l'instance testée historise bien ces métriques via measures/search_history"
    );
}

/// Exerce `rechercher_premier_commit_interne` (US-058, RG-058, plan_18) contre une vraie instance GitLab.
///
/// Variables d'environnement (en plus de `SQM_TEST_GITLAB_URL` / `SQM_TEST_GITLAB_TOKEN` /
/// `SQM_TEST_GITLAB_PROJET_ID`), toutes **optionnelles** :
///
/// - `SQM_TEST_GITLAB_DOMAINE_INTERNE` : domaine de courriel d'un auteur de commit interne du projet
///   `SQM_TEST_GITLAB_PROJET_ID` (ex. `exemple.fr`), pour que la recherche ait une chance d'aboutir à `Trouve` ;
///   sans lui, la recherche parcourt bien la pagination mais se conclut par `AucunCommitInterne`/`TropDeCommits` ;
/// - `SQM_TEST_GITLAB_PROJET_GROS_ID` : identifiant d'un dépôt de plus de ~10 000 commits, pour lequel l'API omet
///   l'en-tête `x-total-pages` — la partie du test qui exerce le **repli** en parcours avant est ignorée sans lui.
///
/// Vérification principalement **humaine** (`cargo test -- --ignored --nocapture`) : la date, le SHA et le statut
/// affichés doivent être cohérents avec l'historique réel du dépôt ; la borne par défaut `50` (cf.
/// `parametres.audit.borneRecherchePremierCommitPages`) est éprouvée à cette occasion. Le test échoue seulement sur
/// une anomalie de connecteur inattendue.
#[tokio::test]
#[ignore = "test d'intégration hors CI : nécessite une vraie instance GitLab, déclenchement manuel uniquement — \
            éprouve rechercher_premier_commit_interne (US-058/RG-058, plan_18), dont le repli sans x-total-pages"]
async fn rechercher_premier_commit_interne_contre_une_vraie_instance_gitlab() {
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
    let domaines_internes: Vec<String> = std::env::var("SQM_TEST_GITLAB_DOMAINE_INTERNE")
        .ok()
        .filter(|valeur| !valeur.trim().is_empty())
        .into_iter()
        .collect();

    let correspondance = CorrespondanceInterne::nouvelle(
        std::iter::empty::<String>(),
        std::iter::empty::<String>(),
        domaines_internes,
    );

    let resultat = gitlab::rechercher_premier_commit_interne(
        &url,
        &jeton,
        &projet_id,
        None,
        &correspondance,
        50,
        &client_http(),
    )
    .await;

    assert!(
        resultat.is_ok(),
        "recherche du premier commit interne attendue sans anomalie de connecteur : {resultat:?}"
    );
    eprintln!(
        "rechercher_premier_commit_interne (cas nominal, borne 50) = {resultat:?}\n\
         vérification humaine attendue : date/sha/statut cohérents avec l'historique réel du dépôt"
    );

    // Repli « dépôt volumineux » (en-tête x-total-pages absent) : ignoré si aucun gros dépôt n'est configuré.
    if let Ok(gros_projet_id) = std::env::var("SQM_TEST_GITLAB_PROJET_GROS_ID") {
        let resultat_gros = gitlab::rechercher_premier_commit_interne(
            &url,
            &jeton,
            &gros_projet_id,
            None,
            &correspondance,
            50,
            &client_http(),
        )
        .await;
        assert!(
            resultat_gros.is_ok(),
            "recherche sur un gros dépôt attendue sans anomalie de connecteur : {resultat_gros:?}"
        );
        assert!(
            !matches!(resultat_gros, Ok(ResultatPremierCommitInterne::DepotVide)),
            "un gros dépôt n'est pas vide : {resultat_gros:?}"
        );
        eprintln!(
            "rechercher_premier_commit_interne (repli sans x-total-pages, borne 50) = {resultat_gros:?}\n\
             vérification humaine attendue : `TropDeCommits` si l'auteur interne le plus ancien n'a pas commité \
             récemment (comportement voulu), `Trouve` sinon"
        );
    }
}
