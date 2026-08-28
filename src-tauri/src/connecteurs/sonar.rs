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
//!
//! Métriques « nouveau code » (`new_coverage`, `new_violations`, `new_duplicated_lines_density`…) :
//! `api/measures/component` ne renseigne jamais leur champ `value` de mesure, mais place la valeur dans un objet
//! `period` (SonarQube 8.1+, dont EE v2026.1.5) ou un tableau `periods` (versions antérieures). [`valeur`]
//! normalise ces trois formes. Une telle métrique peut par ailleurs être totalement absente de la réponse quand
//! le projet n'a aucune ligne de nouveau code sur la fenêtre de référence : ce n'est jamais une anomalie
//! « réponse inattendue » (repli `0` pour un comptage, `None` pour une valeur numérique optionnelle).
//!
//! C15-14 (audit historique à date passée) : les cinq opérations ci-dessus ainsi que `interroger_derniere_analyse`
//! reçoivent un paramètre additionnel `date_ciblee`. Le paramètre serveur `from`/`to` du point d'API
//! `measures/search_history` n'a pas pu être vérifié contre une instance réelle au moment de ce développement (cf.
//! rapport de développement, Étape 15 incrément 11) : par prudence, [`recuperer_historique_mesures`] récupère l'historique complet
//! disponible (paginé, sans filtre de date serveur) et [`selectionner_point_le_plus_proche`] choisit, entièrement
//! côté client, le point le plus proche de la date cible — c'est ce mécanisme qui réalise le repli automatique sur
//! la date Sonar disponible la plus proche en cas d'absence à la date demandée exactement (arbitrage humain du
//! 2026-08-18). Une métrique absente de l'historique retourné (ex. `sonar.notes` si l'instance ne l'historise pas)
//! ne fait jamais échouer l'opération : dégradation gracieuse par une valeur de repli documentée au plus près de
//! chaque champ concerné (décision arbitraire, cf. rapport de développement de cette évolution), le typage existant
//! de `ResultatSonar*` (`f64`/`u64` non optionnels) étant conservé à l'identique plutôt que d'introduire des
//! variantes optionnelles pour ce seul mode.

use super::commun::{
    ErreurConnecteur, SourceDisponible, VerdictConnectivite, erreur_depuis_reqwest,
};
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
        return Err(ErreurConnecteur::AuthentificationRefusee {
            message: format!("Statut HTTP {} reçu", statut.as_u16()),
        });
    }
    if !statut.is_success() {
        return Err(ErreurConnecteur::ReponseInattendue {
            message: format!("Statut HTTP {} reçu", statut.as_u16()),
        });
    }

    let corps = reponse
        .json::<ReponseValidation>()
        .await
        .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
            message: erreur.to_string(),
        })?;

    if corps.valid {
        Ok(VerdictConnectivite {
            portee_excessive: false,
        })
    } else {
        Err(ErreurConnecteur::AuthentificationRefusee {
            message: "Jeton invalide (authentication/validate)".to_string(),
        })
    }
}

/// Valeur d'une mesure Sonar rapportée à la période de « nouveau code » (fenêtre de référence courante) plutôt
/// qu'au code global : `api/measures/component` place la valeur des métriques `new_*` ici, jamais dans le champ
/// `value` de la mesure. Forme `period` (objet unique) depuis SonarQube 8.1 (dont EE v2026.1.5) ; forme `periods`
/// (tableau) sur les versions antérieures et sur `api/measures/component_tree`.
#[derive(Debug, Deserialize)]
struct Periode {
    #[serde(default)]
    value: Option<String>,
}

/// Mesure individuelle du point d'API `measures/component` de Sonar.
///
/// Les métriques absolues (`coverage`, `ncloc`…) renseignent `value` ; les métriques de nouveau code
/// (`new_coverage`, `new_violations`, `new_duplicated_lines_density`…) laissent `value` vide et portent leur
/// valeur dans `period` (SonarQube 8.1+) ou `periods` (versions antérieures). [`valeur`] normalise ces trois
/// formes en un unique accès à la valeur brute.
#[derive(Debug, Deserialize)]
struct Mesure {
    metric: String,
    #[serde(default)]
    value: Option<String>,
    #[serde(default)]
    period: Option<Periode>,
    #[serde(default)]
    periods: Vec<Periode>,
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
        return Err(ErreurConnecteur::AuthentificationRefusee {
            message: format!("Statut HTTP {} reçu", statut.as_u16()),
        });
    }
    if statut.as_u16() == 403 {
        return Err(ErreurConnecteur::DroitsInsuffisants {
            message: format!("Statut HTTP {} reçu", statut.as_u16()),
        });
    }
    if !statut.is_success() {
        return Err(ErreurConnecteur::ReponseInattendue {
            message: format!("Statut HTTP {} reçu", statut.as_u16()),
        });
    }

    Ok(reponse
        .json::<ReponseMeasuresComponent>()
        .await
        .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
            message: erreur.to_string(),
        })?
        .component
        .measures)
}

/// Valeur brute (chaîne) d'une mesure Sonar, quelle que soit la forme sous laquelle `api/measures/component` la
/// rapporte : champ `value` (métrique absolue), puis objet `period` (métrique de nouveau code, SonarQube 8.1+),
/// puis premier élément du tableau `periods` (métrique de nouveau code, versions antérieures).
fn premiere_valeur_disponible(mesure: &Mesure) -> Option<&str> {
    mesure
        .value
        .as_deref()
        .or_else(|| {
            mesure
                .period
                .as_ref()
                .and_then(|periode| periode.value.as_deref())
        })
        .or_else(|| {
            mesure
                .periods
                .first()
                .and_then(|periode| periode.value.as_deref())
        })
}

/// Valeur brute (chaîne) d'une métrique, si présente dans le jeu de mesures interrogé.
fn valeur<'a>(mesures: &'a [Mesure], cle: &str) -> Option<&'a str> {
    mesures
        .iter()
        .find(|mesure| mesure.metric == cle)
        .and_then(premiere_valeur_disponible)
}

/// Valeur d'une métrique numérique requise pour former le résultat : son absence ou son format non numérique
/// traduit une réponse Sonar ne correspondant pas au format attendu.
fn valeur_numerique_requise(mesures: &[Mesure], cle: &str) -> Result<f64, ErreurConnecteur> {
    valeur(mesures, cle)
        .and_then(|valeur| valeur.parse().ok())
        .ok_or_else(|| ErreurConnecteur::ReponseInattendue {
            message: format!("Métrique Sonar « {cle} » absente ou non numérique"),
        })
}

/// Valeur d'une métrique de comptage, `0` par défaut si la métrique est absente (aucune violation détectée dans
/// la catégorie, par exemple, n'apparaît pas nécessairement dans la réponse Sonar).
fn valeur_comptage(mesures: &[Mesure], cle: &str) -> u32 {
    valeur(mesures, cle)
        .and_then(|valeur| valeur.parse().ok())
        .unwrap_or(0)
}

/// Interprète une date cible d'audit historique (C15-14) comme une borne comparable lexicographiquement aux dates
/// ISO 8601 retournées par Sonar (`AAAA-MM-JJTHH:MM:SS+ZZZZ`) : une date sans heure (`AAAA-MM-JJ`, saisie via
/// `<input type="date">` côté Angular) est complétée en fin de journée (`T23:59:59Z`) plutôt que minuit, pour
/// inclure les mesures survenues au cours de la journée ciblée dans le point « le plus proche antérieur ou égal » —
/// même décision arbitraire que côté GitLab (cf. `gitlab::interpreter_date_cible_fin_de_journee`). Un horodatage déjà
/// complet est conservé tel quel.
fn date_cible_comparable(date_cible: &str) -> String {
    if date_cible.contains('T') {
        date_cible.to_string()
    } else {
        format!("{date_cible}T23:59:59Z")
    }
}

/// Sélectionne, parmi un historique de points datés `(date, valeur)` (non nécessairement trié), le point le plus
/// pertinent pour une date cible donnée (C15-14) : priorité au point le plus récent antérieur ou égal à la date
/// cible (repli « en arrière » naturel d'un audit historique) ; à défaut (aucun point avant la date cible), le
/// point disponible le plus proche tout court (le plus ancien de l'historique, forcément postérieur à la date
/// cible dans ce cas) — c'est ce mécanisme, entièrement côté client, qui réalise le « repli automatique sur la
/// date disponible la plus proche » arbitré le 2026-08-18, sans dépendre des paramètres serveur `from`/`to` de
/// `measures/search_history`, non vérifiés contre une instance réelle (cf. en-tête de module).
///
/// Comparaison lexicographique directe des dates (`str::cmp`), valide pour des chaînes ISO 8601 de même précision
/// (décision arbitraire assumée, cf. en-tête de module) : ne gère pas la comparaison exacte entre deux fuseaux
/// horaires distincts, cas resté théorique (une instance Sonar donnée horodate ses analyses de façon homogène).
fn selectionner_point_le_plus_proche(
    historique: &[(String, f64)],
    date_cible: &str,
) -> Option<(String, f64)> {
    historique
        .iter()
        .filter(|(date, _)| date.as_str() <= date_cible)
        .max_by(|a, b| a.0.cmp(&b.0))
        .or_else(|| historique.iter().min_by(|a, b| a.0.cmp(&b.0)))
        .cloned()
}

/// Point d'un historique de mesure Sonar (`GET /api/measures/search_history`), réduit aux champs exploités par
/// [`recuperer_historique_mesures`] : `value` est absent pour une date où la métrique n'a pas pu être calculée
/// (ex. langage non détecté ce jour-là), ce qui n'est jamais une anomalie, seulement un point ignoré.
#[derive(Debug, Deserialize)]
struct PointHistorique {
    date: String,
    #[serde(default)]
    value: Option<String>,
}

/// Historique d'une métrique (`GET /api/measures/search_history`), réduit aux champs exploités ici.
#[derive(Debug, Deserialize)]
struct MesureHistorique {
    metric: String,
    #[serde(default)]
    history: Vec<PointHistorique>,
}

/// Réponse du point d'API `measures/search_history` de Sonar, réduite au seul champ exploité ici (la pagination
/// (`paging`) n'est pas exploitée : la détection de fin de pagination se fait par page vide, sur le même principe
/// que les appels paginés du Connecteur GitLab).
#[derive(Debug, Deserialize)]
struct ReponseSearchHistory {
    #[serde(default)]
    measures: Vec<MesureHistorique>,
}

/// Nombre d'éléments par page de l'historique de mesures Sonar (C15-14, `measures/search_history`), maximum
/// autorisé par l'API Sonar pour ce point d'entrée.
const TAILLE_PAGE_HISTORIQUE_MESURES: &str = "1000";

/// Nombre maximal de pages parcourues lors de la récupération de l'historique complet de mesures (C15-14) : borne
/// de sécurité arbitraire, sur le même principe que [`MAX_PAGES_PROJETS`] ; au-delà, l'historique le plus ancien
/// resterait hors de portée de la sélection du point le plus proche plutôt que de générer un nombre d'appels
/// illimité.
const MAX_PAGES_HISTORIQUE_MESURES: u32 = 20;

/// Récupère l'historique complet disponible (paginé, sans filtre `from`/`to` serveur, cf. en-tête de module) d'un
/// jeu de métriques Sonar (`GET /api/measures/search_history`), regroupé par clé de métrique (C15-14, audit
/// historique).
///
/// # Erreurs
///
/// Voir [`recuperer_mesures`].
async fn recuperer_historique_mesures(
    url_base: &str,
    credential: &str,
    id_externe: &str,
    metric_keys: &str,
    client: &reqwest::Client,
) -> Result<HashMap<String, Vec<(String, f64)>>, ErreurConnecteur> {
    let mut historique: HashMap<String, Vec<(String, f64)>> = HashMap::new();
    for page in 1..=MAX_PAGES_HISTORIQUE_MESURES {
        let url = format!(
            "{}/api/measures/search_history",
            url_base.trim_end_matches('/')
        );
        let reponse = client
            .get(url)
            .bearer_auth(credential)
            .query(&[
                ("component", id_externe),
                ("metrics", metric_keys),
                ("ps", TAILLE_PAGE_HISTORIQUE_MESURES),
                ("p", page.to_string().as_str()),
            ])
            .send()
            .await
            .map_err(|erreur| erreur_depuis_reqwest(&erreur))?;

        let statut = reponse.status();
        if statut.as_u16() == 401 {
            return Err(ErreurConnecteur::AuthentificationRefusee {
                message: format!("Statut HTTP {} reçu", statut.as_u16()),
            });
        }
        if statut.as_u16() == 403 {
            return Err(ErreurConnecteur::DroitsInsuffisants {
                message: format!("Statut HTTP {} reçu", statut.as_u16()),
            });
        }
        if !statut.is_success() {
            return Err(ErreurConnecteur::ReponseInattendue {
                message: format!("Statut HTTP {} reçu", statut.as_u16()),
            });
        }

        let page_reponse = reponse
            .json::<ReponseSearchHistory>()
            .await
            .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                message: erreur.to_string(),
            })?;
        let page_vide = page_reponse
            .measures
            .iter()
            .all(|mesure| mesure.history.is_empty());
        for mesure in page_reponse.measures {
            let entree = historique.entry(mesure.metric).or_default();
            for point in mesure.history {
                if let Some(valeur) = point.value.and_then(|texte| texte.parse::<f64>().ok()) {
                    entree.push((point.date, valeur));
                }
            }
        }
        if page_vide {
            break;
        }
    }
    Ok(historique)
}

/// Valeur d'une métrique numérique en mode historique (C15-14) : sélectionne le point le plus proche de
/// `date_cible` via [`selectionner_point_le_plus_proche`] dans l'historique déjà récupéré, `None` si la métrique
/// est totalement absente de l'historique retourné par Sonar (dégradation gracieuse, cf. en-tête de module) — à la
/// différence de [`valeur_numerique_requise`], jamais une anomalie « réponse inattendue ».
fn valeur_historique(
    historique: &HashMap<String, Vec<(String, f64)>>,
    cle: &str,
    date_cible: &str,
) -> Option<f64> {
    historique
        .get(cle)
        .and_then(|points| selectionner_point_le_plus_proche(points, date_cible))
        .map(|(_, valeur)| valeur)
}

/// Interroge les violations Sonar par sévérité (US-009, `sonar.violations`). En mode historique (C15-14,
/// `date_ciblee` renseigné), seuls les compteurs par sévérité sont résolus via l'historique
/// ([`recuperer_historique_mesures`]) : `new_violations` n'est pas une métrique historisable (relative à une
/// période glissante se terminant « maintenant », sans portée à une date passée) et reste toujours à `0`, comme
/// pour tout compteur absent (cf. [`valeur_comptage`], comportement déjà en place, réutilisé tel quel).
///
/// # Erreurs
///
/// Voir [`recuperer_mesures`] (mode régulier) ou [`recuperer_historique_mesures`] (mode historique).
pub(crate) async fn interroger_violations(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    date_ciblee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatSonarViolations, ErreurConnecteur> {
    let par_severite = if let Some(date_cible) = date_ciblee {
        let date_cible = date_cible_comparable(date_cible);
        let historique = recuperer_historique_mesures(
            url_base,
            credential,
            id_externe,
            "blocker_violations,critical_violations,major_violations,minor_violations,info_violations",
            client,
        )
        .await?;
        ParSeverite {
            bloquant: valeur_historique(&historique, "blocker_violations", &date_cible)
                .map(|v| v as u32)
                .unwrap_or(0),
            critique: valeur_historique(&historique, "critical_violations", &date_cible)
                .map(|v| v as u32)
                .unwrap_or(0),
            majeur: valeur_historique(&historique, "major_violations", &date_cible)
                .map(|v| v as u32)
                .unwrap_or(0),
            mineur: valeur_historique(&historique, "minor_violations", &date_cible)
                .map(|v| v as u32)
                .unwrap_or(0),
            info: valeur_historique(&historique, "info_violations", &date_cible)
                .map(|v| v as u32)
                .unwrap_or(0),
        }
    } else {
        let mesures = recuperer_mesures(
            url_base,
            credential,
            id_externe,
            "blocker_violations,critical_violations,major_violations,minor_violations,info_violations,new_violations",
            client,
        )
        .await?;
        return Ok(ResultatSonarViolations {
            source_id: source_id.to_string(),
            par_severite: ParSeverite {
                bloquant: valeur_comptage(&mesures, "blocker_violations"),
                critique: valeur_comptage(&mesures, "critical_violations"),
                majeur: valeur_comptage(&mesures, "major_violations"),
                mineur: valeur_comptage(&mesures, "minor_violations"),
                info: valeur_comptage(&mesures, "info_violations"),
            },
            nouvelles_violations: valeur_comptage(&mesures, "new_violations"),
        });
    };

    Ok(ResultatSonarViolations {
        source_id: source_id.to_string(),
        par_severite,
        // `new_violations` n'est jamais historisable (cf. Rustdoc ci-dessus) : `0` par convention en mode
        // historique, jamais une anomalie.
        nouvelles_violations: 0,
    })
}

/// Interroge la dette technique Sonar (US-009, `sonar.dette`). En mode historique (C15-14, `date_ciblee`
/// renseigné), résout `sqale_index`/`sqale_debt_ratio` via l'historique ([`recuperer_historique_mesures`]) plutôt
/// que d'exiger leur présence ([`valeur_numerique_requise`]) : une métrique absente de l'historique retourné par
/// Sonar (dégradation gracieuse, cf. en-tête de module) se traduit par la valeur de repli `0` (aucune dette
/// connue), décision arbitraire à valider par un humain, plutôt que de faire échouer l'opération.
///
/// # Erreurs
///
/// Voir [`recuperer_mesures`] (mode régulier) ou [`recuperer_historique_mesures`] (mode historique).
pub(crate) async fn interroger_dette(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    date_ciblee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatSonarDette, ErreurConnecteur> {
    if let Some(date_cible) = date_ciblee {
        let date_cible = date_cible_comparable(date_cible);
        let historique = recuperer_historique_mesures(
            url_base,
            credential,
            id_externe,
            "sqale_index,sqale_debt_ratio",
            client,
        )
        .await?;
        return Ok(ResultatSonarDette {
            source_id: source_id.to_string(),
            dette_minutes: valeur_historique(&historique, "sqale_index", &date_cible)
                .map(|v| v as u64)
                .unwrap_or(0),
            ratio_dette: valeur_historique(&historique, "sqale_debt_ratio", &date_cible)
                .unwrap_or(0.0),
        });
    }

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

/// Interroge la couverture de tests Sonar (US-009, `sonar.couverture`), la couverture du nouveau code
/// (`new_coverage`) ainsi que la densité de duplication du nouveau code (`new_duplicated_lines_density`,
/// Phase 5, incrément 7), ces deux dernières étant des données combinées par `croise.ia_nouveau_code`
/// (cf. `docs/01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs`).
/// `new_coverage` et `new_duplicated_lines_density` restent optionnelles : leur absence de la réponse Sonar
/// (ex. aucune nouvelle ligne de code sur la fenêtre de référence) se traduit par `None`, jamais par une anomalie
/// « réponse inattendue ». Seule `coverage` (métrique absolue) est requise.
///
/// En mode historique (C15-14, `date_ciblee` renseigné) : seule `coverage` est historisable au sens de cette
/// évolution (`new_coverage`/`new_duplicated_lines_density` sont relatives à une période glissante se terminant
/// « maintenant », sans portée à une date passée, cf. `croise.ia_nouveau_code` omis de l'audit historique côté
/// Orchestrateur de campagne) ; `couverture` est résolue via l'historique
/// ([`recuperer_historique_mesures`]/[`valeur_historique`]), avec repli à `0` (aucune couverture connue, décision
/// arbitraire à valider par un humain) si absente de l'historique retourné ; `couverture_nouveau_code` et
/// `duplication_nouveau_code` valent alors toujours `None`, par convention documentée ici (jamais interprétés
/// côté UI en mode historique).
///
/// # Erreurs
///
/// Voir [`recuperer_mesures`] (mode régulier) ou [`recuperer_historique_mesures`] (mode historique).
pub(crate) async fn interroger_couverture(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    date_ciblee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatSonarCouverture, ErreurConnecteur> {
    if let Some(date_cible) = date_ciblee {
        let date_cible = date_cible_comparable(date_cible);
        let historique =
            recuperer_historique_mesures(url_base, credential, id_externe, "coverage", client)
                .await?;
        return Ok(ResultatSonarCouverture {
            source_id: source_id.to_string(),
            couverture: valeur_historique(&historique, "coverage", &date_cible).unwrap_or(0.0),
            couverture_nouveau_code: None,
            duplication_nouveau_code: None,
        });
    }

    let mesures = recuperer_mesures(
        url_base,
        credential,
        id_externe,
        "coverage,new_coverage,new_duplicated_lines_density",
        client,
    )
    .await?;

    Ok(ResultatSonarCouverture {
        source_id: source_id.to_string(),
        couverture: valeur_numerique_requise(&mesures, "coverage")?,
        couverture_nouveau_code: valeur(&mesures, "new_coverage")
            .and_then(|valeur| valeur.parse().ok()),
        duplication_nouveau_code: valeur(&mesures, "new_duplicated_lines_density")
            .and_then(|valeur| valeur.parse().ok()),
    })
}

/// Note Sonar la plus défavorable de l'échelle 1.0 (A) – 5.0 (E) : valeur de repli utilisée par
/// [`interroger_notes`] en mode historique (C15-14) pour un axe absent de l'historique retourné par Sonar
/// (`sonar.notes`, dégradation gracieuse par indicateur non confirmée pour cet axe précis contre une instance
/// réelle, cf. en-tête de module) — décision arbitraire à valider par un humain : une note E (pire cas) plutôt
/// qu'un `0.0` hors échelle, pour rester une valeur exploitable telle quelle par le Moteur de jugement (RG-011).
const NOTE_SONAR_LA_PLUS_DEFAVORABLE: f64 = 5.0;

/// Interroge les notes Sonar des quatre axes (US-009, `sonar.notes`), stockées en valeur numérique 1.0–5.0 : la
/// conversion en lettre colorée A–E relève du Moteur de jugement (RG-011).
///
/// En mode historique (C15-14, `date_ciblee` renseigné), chaque note est résolue via l'historique
/// ([`recuperer_historique_mesures`]/[`valeur_historique`]), avec repli à [`NOTE_SONAR_LA_PLUS_DEFAVORABLE`] si
/// l'axe correspondant est absent de l'historique retourné — l'historisation réelle de `sonar.notes` par
/// `measures/search_history` n'a pas pu être vérifiée contre une instance Sonar réelle au moment de ce
/// développement (test d'intégration `#[ignore]` ajouté pour confirmation ultérieure, cf.
/// `connecteurs::tests_integration_reelle`).
///
/// # Erreurs
///
/// Voir [`recuperer_mesures`] (mode régulier) ou [`recuperer_historique_mesures`] (mode historique).
pub(crate) async fn interroger_notes(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    date_ciblee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatSonarNotes, ErreurConnecteur> {
    if let Some(date_cible) = date_ciblee {
        let date_cible = date_cible_comparable(date_cible);
        let historique = recuperer_historique_mesures(
            url_base,
            credential,
            id_externe,
            "reliability_rating,security_rating,sqale_rating,security_review_rating",
            client,
        )
        .await?;
        return Ok(ResultatSonarNotes {
            source_id: source_id.to_string(),
            fiabilite: valeur_historique(&historique, "reliability_rating", &date_cible)
                .unwrap_or(NOTE_SONAR_LA_PLUS_DEFAVORABLE),
            securite: valeur_historique(&historique, "security_rating", &date_cible)
                .unwrap_or(NOTE_SONAR_LA_PLUS_DEFAVORABLE),
            maintenabilite: valeur_historique(&historique, "sqale_rating", &date_cible)
                .unwrap_or(NOTE_SONAR_LA_PLUS_DEFAVORABLE),
            revue_securite: valeur_historique(&historique, "security_review_rating", &date_cible)
                .unwrap_or(NOTE_SONAR_LA_PLUS_DEFAVORABLE),
        });
    }

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

/// Interroge le volume de code Sonar (US-009, `sonar.ncloc`). En mode historique (C15-14, `date_ciblee`
/// renseigné), seul `ncloc` est historisable au sens de cette évolution ; `ncloc_language_distribution` n'est pas
/// interrogée (répartition par langage jamais garantie stable dans l'historique) et `par_langage` reste alors
/// toujours vide, par convention. `ncloc` absent de l'historique retourné par Sonar se replie sur `0`, décision
/// arbitraire à valider par un humain, plutôt que de faire échouer l'opération.
///
/// # Erreurs
///
/// Voir [`recuperer_mesures`] (mode régulier) ou [`recuperer_historique_mesures`] (mode historique).
pub(crate) async fn interroger_ncloc(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    date_ciblee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatSonarNcloc, ErreurConnecteur> {
    if let Some(date_cible) = date_ciblee {
        let date_cible = date_cible_comparable(date_cible);
        let historique =
            recuperer_historique_mesures(url_base, credential, id_externe, "ncloc", client).await?;
        return Ok(ResultatSonarNcloc {
            source_id: source_id.to_string(),
            ncloc: valeur_historique(&historique, "ncloc", &date_cible)
                .map(|v| v as u64)
                .unwrap_or(0),
            par_langage: HashMap::new(),
        });
    }

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

/// Une analyse Sonar, réduite au seul champ exploité par `interroger_derniere_analyse`.
#[derive(Debug, Deserialize)]
struct Analyse {
    date: String,
}

/// Réponse du point d'API `project_analyses/search` de Sonar.
#[derive(Debug, Deserialize)]
struct ReponseAnalyses {
    #[serde(default)]
    analyses: Vec<Analyse>,
}

/// Nombre d'éléments par page du listing complet des analyses Sonar en mode historique
/// (`interroger_derniere_analyse`, C15-14), maximum autorisé par l'API Sonar pour ce point d'entrée.
const TAILLE_PAGE_ANALYSES_HISTORIQUE: &str = "500";

/// Nombre maximal de pages parcourues lors de ce même listing complet : borne de sécurité arbitraire, sur le même
/// principe que [`MAX_PAGES_HISTORIQUE_MESURES`].
const MAX_PAGES_ANALYSES_HISTORIQUE: u32 = 20;

/// Interroge la date de la dernière analyse Sonar d'un projet (Phase 5, incrément 3), donnée intermédiaire
/// consommée par `calculerFraicheurSonar` (Connecteur croisé, UI) : n'appartient à aucune variante du catalogue
/// figé des résultats d'audit (`docs/01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs`),
/// à la différence des cinq opérations Sonar précédentes, et n'est donc jamais persistée seule.
///
/// Utilise `project_analyses/search` plutôt que `measures/component` (déjà mobilisé par les cinq opérations
/// précédentes) : ce point d'API est spécifiquement dédié à l'historique des analyses d'un projet, plus approprié
/// pour cette seule donnée qu'un détournement du point d'API de mesures.
///
/// En mode historique (C15-14, `date_ciblee` renseigné) : ce même point d'API est reparcouru intégralement, paginé
/// (`ps`/`p`, jusqu'à épuisement ou [`MAX_PAGES_ANALYSES_HISTORIQUE`], faute de paramètre `from`/`to` serveur
/// vérifié contre une instance réelle, cf. en-tête de module), puis l'analyse la plus proche de la date cible est
/// choisie côté client via [`selectionner_point_le_plus_proche`] (réutilisé avec une valeur numérique factice,
/// seule la date important ici).
///
/// # Erreurs
///
/// [`ErreurConnecteur::AuthentificationRefusee`] (401), [`ErreurConnecteur::DroitsInsuffisants`] (403),
/// [`ErreurConnecteur::ReponseInattendue`] pour tout autre statut ou composant Sonar inconnu ; délai/injoignabilité
/// selon [`erreur_depuis_reqwest`]. Un tableau d'analyses vide (projet jamais analysé) n'est pas une erreur : elle
/// se traduit par un retour `Ok(None)`.
pub(crate) async fn interroger_derniere_analyse(
    url_base: &str,
    credential: &str,
    id_externe: &str,
    date_ciblee: Option<&str>,
    client: &reqwest::Client,
) -> Result<Option<String>, ErreurConnecteur> {
    if let Some(date_cible) = date_ciblee {
        let date_cible = date_cible_comparable(date_cible);
        let mut analyses = Vec::new();
        for page in 1..=MAX_PAGES_ANALYSES_HISTORIQUE {
            let url = format!(
                "{}/api/project_analyses/search",
                url_base.trim_end_matches('/')
            );
            let reponse = client
                .get(url)
                .bearer_auth(credential)
                .query(&[
                    ("project", id_externe),
                    ("ps", TAILLE_PAGE_ANALYSES_HISTORIQUE),
                    ("p", page.to_string().as_str()),
                ])
                .send()
                .await
                .map_err(|erreur| erreur_depuis_reqwest(&erreur))?;

            let statut = reponse.status();
            if statut.as_u16() == 401 {
                return Err(ErreurConnecteur::AuthentificationRefusee {
                    message: format!("Statut HTTP {} reçu", statut.as_u16()),
                });
            }
            if statut.as_u16() == 403 {
                return Err(ErreurConnecteur::DroitsInsuffisants {
                    message: format!("Statut HTTP {} reçu", statut.as_u16()),
                });
            }
            if !statut.is_success() {
                return Err(ErreurConnecteur::ReponseInattendue {
                    message: format!("Statut HTTP {} reçu", statut.as_u16()),
                });
            }

            let page_reponse = reponse.json::<ReponseAnalyses>().await.map_err(|erreur| {
                ErreurConnecteur::ReponseInattendue {
                    message: erreur.to_string(),
                }
            })?;
            if page_reponse.analyses.is_empty() {
                break;
            }
            analyses.extend(page_reponse.analyses);
        }

        let paires: Vec<(String, f64)> = analyses
            .into_iter()
            .map(|analyse| (analyse.date, 0.0))
            .collect();
        return Ok(selectionner_point_le_plus_proche(&paires, &date_cible).map(|(date, _)| date));
    }

    let url = format!(
        "{}/api/project_analyses/search",
        url_base.trim_end_matches('/')
    );
    let reponse = client
        .get(url)
        .bearer_auth(credential)
        .query(&[("project", id_externe), ("ps", "1")])
        .send()
        .await
        .map_err(|erreur| erreur_depuis_reqwest(&erreur))?;

    let statut = reponse.status();
    if statut.as_u16() == 401 {
        return Err(ErreurConnecteur::AuthentificationRefusee {
            message: format!("Statut HTTP {} reçu", statut.as_u16()),
        });
    }
    if statut.as_u16() == 403 {
        return Err(ErreurConnecteur::DroitsInsuffisants {
            message: format!("Statut HTTP {} reçu", statut.as_u16()),
        });
    }
    if !statut.is_success() {
        return Err(ErreurConnecteur::ReponseInattendue {
            message: format!("Statut HTTP {} reçu", statut.as_u16()),
        });
    }

    let reponse = reponse.json::<ReponseAnalyses>().await.map_err(|erreur| {
        ErreurConnecteur::ReponseInattendue {
            message: erreur.to_string(),
        }
    })?;

    Ok(reponse
        .analyses
        .into_iter()
        .next()
        .map(|analyse| analyse.date))
}

/// Nombre maximal de pages parcourues lors du listing des projets Sonar accessibles avec le credential courant
/// (`rechercher_projets`, US-008, RG-036, ajouté le 2026-08-02) : borne de sécurité arbitraire (cf. rapport de
/// développement de cette évolution), sur le même principe que côté GitLab (`gitlab::MAX_PAGES_PROJETS`).
const MAX_PAGES_PROJETS: u32 = 20;

/// Nombre d'éléments par page du listing des projets Sonar accessibles (RG-036), maximum autorisé par l'API Sonar
/// pour ce point d'entrée.
const TAILLE_PAGE_PROJETS: &str = "500";

/// Élément de la liste des projets de l'API Sonar (`GET /api/components/search`), réduit aux champs exploités par
/// [`rechercher_projets`] (RG-036).
#[derive(Debug, Deserialize)]
struct ComposantDisponible {
    key: String,
    name: String,
}

/// Réponse du point d'API `components/search` de Sonar.
#[derive(Debug, Deserialize)]
struct ReponseComponentsSearch {
    #[serde(default)]
    components: Vec<ComposantDisponible>,
}

/// Recherche, parmi les projets Sonar accessibles avec le credential courant (`qualifiers=TRK`, seuls les
/// projets, jamais les autres types de composants Sonar), ceux dont le nom correspond au terme recherché, pour
/// l'autocomplétion de l'identifiant externe d'une source (US-008, RG-036). Un appel (paginé jusqu'à épuisement ou
/// [`MAX_PAGES_PROJETS`]) par terme recherché, débouncé côté appelant. Résultat trié par ordre alphabétique du
/// libellé (`name`), insensible à la casse (RG-036).
///
/// `recherche` vide ou absent ne déclenche aucun appel réseau et retourne une liste vide, sur le même principe que
/// côté GitLab (`gitlab::lister_projets`, RG-036, évolution du 2026-08-25, cf. rapport de développement de cette
/// évolution).
///
/// # Erreurs
///
/// [`ErreurConnecteur::AuthentificationRefusee`] (401), [`ErreurConnecteur::DroitsInsuffisants`] (403),
/// [`ErreurConnecteur::ReponseInattendue`] pour tout autre statut ou JSON non conforme ; délai/injoignabilité selon
/// [`erreur_depuis_reqwest`].
pub(crate) async fn rechercher_projets(
    url_base: &str,
    credential: &str,
    recherche: Option<&str>,
    client: &reqwest::Client,
) -> Result<Vec<SourceDisponible>, ErreurConnecteur> {
    let Some(terme) = recherche.map(str::trim).filter(|terme| !terme.is_empty()) else {
        return Ok(Vec::new());
    };
    let mut composants = Vec::new();
    for page in 1..=MAX_PAGES_PROJETS {
        let url = format!("{}/api/components/search", url_base.trim_end_matches('/'));
        let reponse = client
            .get(url)
            .bearer_auth(credential)
            .query(&[
                ("qualifiers", "TRK"),
                ("q", terme),
                ("ps", TAILLE_PAGE_PROJETS),
                ("p", page.to_string().as_str()),
            ])
            .send()
            .await
            .map_err(|erreur| erreur_depuis_reqwest(&erreur))?;

        let statut = reponse.status();
        if statut.as_u16() == 401 {
            return Err(ErreurConnecteur::AuthentificationRefusee {
                message: format!("Statut HTTP {} reçu", statut.as_u16()),
            });
        }
        if statut.as_u16() == 403 {
            return Err(ErreurConnecteur::DroitsInsuffisants {
                message: format!("Statut HTTP {} reçu", statut.as_u16()),
            });
        }
        if !statut.is_success() {
            return Err(ErreurConnecteur::ReponseInattendue {
                message: format!("Statut HTTP {} reçu", statut.as_u16()),
            });
        }

        let page_composants = reponse
            .json::<ReponseComponentsSearch>()
            .await
            .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                message: erreur.to_string(),
            })?
            .components;
        if page_composants.is_empty() {
            break;
        }
        composants.extend(page_composants);
    }

    let mut disponibles: Vec<SourceDisponible> = composants
        .into_iter()
        .map(|composant| SourceDisponible {
            id_externe: composant.key,
            libelle: composant.name,
        })
        .collect();
    disponibles.sort_by_key(|projet| projet.libelle.to_lowercase());
    Ok(disponibles)
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

        assert!(matches!(
            verdict,
            Err(ErreurConnecteur::AuthentificationRefusee { .. })
        ));
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

        assert!(matches!(
            verdict,
            Err(ErreurConnecteur::AuthentificationRefusee { .. })
        ));
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

        assert!(matches!(
            verdict,
            Err(ErreurConnecteur::ReponseInattendue { .. })
        ));
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

        assert!(matches!(
            verdict,
            Err(ErreurConnecteur::DelaiDepasse { .. })
        ));
    }

    #[tokio::test]
    async fn tester_connectivite_signale_une_instance_injoignable() {
        // Aucun serveur n'écoute sur ce port : la connexion doit échouer avant même le délai de requête.
        let verdict =
            tester_connectivite("http://127.0.0.1:1", "jeton", &client_test_delai_court()).await;

        assert!(matches!(
            verdict,
            Err(ErreurConnecteur::InstanceInjoignable { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_violations_reussit() {
        // Forme réelle de `api/measures/component` : les compteurs absolus portent `value`, `new_violations`
        // (métrique de nouveau code) porte sa valeur dans un objet `period`, jamais dans `value`.
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
                        { "metric": "new_violations", "period": { "index": 1, "value": "9" } }
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
            None, // date_ciblee
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
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.par_severite.bloquant, 0);
        assert_eq!(resultat.nouvelles_violations, 0);
        Ok(())
    }

    #[tokio::test]
    async fn interroger_violations_historique_resout_les_severites_via_lhistorique_et_ignore_new_violations()
    -> Result<(), ErreurConnecteur> {
        // C15-14 : en mode historique, `measures/search_history` est interrogé sans `new_violations` (métrique non
        // historisable) ; les compteurs par sévérité sont résolus via l'historique retourné.
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": [
                    { "metric": "blocker_violations", "history": [
                        { "date": "2026-01-01T00:00:00+0000", "value": "2" },
                        { "date": "2026-03-01T00:00:00+0000", "value": "9" }
                    ]},
                    { "metric": "critical_violations", "history": [
                        { "date": "2026-01-01T00:00:00+0000", "value": "5" }
                    ]}
                ]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": []
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_violations(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            Some("2026-02-01"),
            &client_test_delai_court(),
        )
        .await?;

        // Repli sur le point antérieur le plus proche (2026-01-01), pas le point le plus récent dans l'absolu.
        assert_eq!(resultat.par_severite.bloquant, 2);
        assert_eq!(resultat.par_severite.critique, 5);
        // Métriques totalement absentes de l'historique (jamais interrogées, dont `new_violations`) : `0`.
        assert_eq!(resultat.par_severite.majeur, 0);
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
            None, // date_ciblee
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
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::AuthentificationRefusee { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_dette_historique_se_replie_a_zero_si_absente_de_lhistorique()
    -> Result<(), ErreurConnecteur> {
        // C15-14 : dégradation gracieuse — une métrique totalement absente de l'historique retourné par Sonar ne
        // fait jamais échouer l'opération, contrairement au mode régulier (`valeur_numerique_requise`).
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": [
                    { "metric": "sqale_index", "history": [] },
                    { "metric": "sqale_debt_ratio", "history": [] }
                ]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": []
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_dette(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            Some("2026-02-01"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.dette_minutes, 0);
        assert_eq!(resultat.ratio_dette, 0.0);
        Ok(())
    }

    #[tokio::test]
    async fn interroger_couverture_reussit() {
        // Forme réelle de `api/measures/component` : `coverage` (métrique absolue) porte `value`, les métriques de
        // nouveau code portent leur valeur dans un objet `period` (SonarQube 8.1+, dont EE v2026.1.5), jamais dans
        // `value`.
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "component": {
                    "measures": [
                        { "metric": "coverage", "value": "61.2" },
                        { "metric": "new_coverage", "period": { "index": 1, "value": "71.0" } },
                        { "metric": "new_duplicated_lines_density", "period": { "index": 1, "value": "4.5" } }
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
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(
            resultat,
            Ok(crate::modele::racine::ResultatSonarCouverture {
                source_id: "source-2".to_string(),
                couverture: 61.2,
                couverture_nouveau_code: Some(71.0),
                duplication_nouveau_code: Some(4.5),
            })
        );
    }

    #[tokio::test]
    async fn interroger_couverture_lit_la_forme_periods_tableau() {
        // Versions de SonarQube antérieures à 8.1 (et `api/measures/component_tree`) : les métriques de nouveau
        // code portent leur valeur dans un tableau `periods` plutôt qu'un objet `period`.
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "component": {
                    "measures": [
                        { "metric": "coverage", "value": "61.2" },
                        { "metric": "new_coverage", "periods": [{ "index": 1, "value": "71.0" }] }
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
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(
            resultat,
            Ok(crate::modele::racine::ResultatSonarCouverture {
                source_id: "source-2".to_string(),
                couverture: 61.2,
                couverture_nouveau_code: Some(71.0),
                duplication_nouveau_code: None,
            })
        );
    }

    #[tokio::test]
    async fn interroger_couverture_peuple_duplication_nouveau_code_absente_a_none()
    -> Result<(), ErreurConnecteur> {
        // La métrique `new_duplicated_lines_density` est optionnelle (Phase 5, incrément 7) : son absence de la
        // réponse Sonar simulée ne doit provoquer aucune anomalie « réponse inattendue », seulement un `None`.
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "component": {
                    "measures": [
                        { "metric": "coverage", "value": "61.2" },
                        { "metric": "new_coverage", "period": { "index": 1, "value": "71.0" } }
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
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.couverture_nouveau_code, Some(71.0));
        assert_eq!(resultat.duplication_nouveau_code, None);
        Ok(())
    }

    #[tokio::test]
    async fn interroger_couverture_tolere_new_coverage_absente_a_none()
    -> Result<(), ErreurConnecteur> {
        // La métrique `new_coverage` est optionnelle (correction du bug 2026-08-27) : Sonar peut l'omettre quand
        // le projet n'a aucune ligne de nouveau code sur la fenêtre de référence. Son absence ne doit provoquer
        // aucune anomalie « réponse inattendue », seulement un `None` — seule `coverage` reste requise.
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
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(
            resultat,
            crate::modele::racine::ResultatSonarCouverture {
                source_id: "source-2".to_string(),
                couverture: 61.2,
                couverture_nouveau_code: None,
                duplication_nouveau_code: None,
            }
        );
        Ok(())
    }

    #[tokio::test]
    async fn interroger_couverture_signale_une_valeur_manquante_en_reponse_inattendue() {
        // `coverage` (métrique absolue) reste requise : son absence de la réponse traduit un format inattendu
        // (ex. après une montée de version d'instance Sonar), à la différence des métriques de nouveau code.
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/component"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "component": {
                    "measures": [
                        { "metric": "new_coverage", "period": { "index": 1, "value": "71.0" } }
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
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::ReponseInattendue { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_couverture_historique_selectionne_le_point_le_plus_proche_avant_la_date_cible()
    -> Result<(), ErreurConnecteur> {
        // C15-14 : priorité au point le plus récent antérieur ou égal à la date cible ; `couverture_nouveau_code`
        // et `duplication_nouveau_code` ne sont jamais interrogées en mode historique (métriques `new_*`).
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": [
                    { "metric": "coverage", "history": [
                        { "date": "2026-01-01T00:00:00+0000", "value": "50.0" },
                        { "date": "2026-01-15T00:00:00+0000", "value": "55.0" },
                        { "date": "2026-03-01T00:00:00+0000", "value": "70.0" }
                    ]}
                ]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": []
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_couverture(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            Some("2026-02-01"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.couverture, 55.0);
        assert_eq!(resultat.couverture_nouveau_code, None);
        assert_eq!(resultat.duplication_nouveau_code, None);
        Ok(())
    }

    #[tokio::test]
    async fn interroger_couverture_historique_se_replie_sur_le_point_disponible_le_plus_proche_si_aucun_avant()
    -> Result<(), ErreurConnecteur> {
        // C15-14 : si aucun point n'existe avant/à la date cible, repli sur le point disponible le plus proche
        // tout court (ici, le seul point existant, postérieur à la date cible).
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": [
                    { "metric": "coverage", "history": [
                        { "date": "2026-05-01T00:00:00+0000", "value": "80.0" }
                    ]}
                ]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": []
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_couverture(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            Some("2026-02-01"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.couverture, 80.0);
        Ok(())
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
            None, // date_ciblee
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
    async fn interroger_notes_historique_se_replie_sur_la_note_la_plus_defavorable_si_absente()
    -> Result<(), ErreurConnecteur> {
        // C15-14 : dégradation gracieuse pour `sonar.notes`, historisation non confirmée contre une instance
        // réelle (cf. en-tête de module) — un axe absent de l'historique se replie sur la note E (5.0), jamais une
        // anomalie ; un axe présent est résolu normalement via l'historique.
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": [
                    { "metric": "reliability_rating", "history": [
                        { "date": "2026-01-01T00:00:00+0000", "value": "1.0" }
                    ]}
                ]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": []
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_notes(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            Some("2026-02-01"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.fiabilite, 1.0);
        assert_eq!(resultat.securite, NOTE_SONAR_LA_PLUS_DEFAVORABLE);
        assert_eq!(resultat.maintenabilite, NOTE_SONAR_LA_PLUS_DEFAVORABLE);
        assert_eq!(resultat.revue_securite, NOTE_SONAR_LA_PLUS_DEFAVORABLE);
        Ok(())
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
            None, // date_ciblee
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
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.ncloc, 84210);
        assert!(resultat.par_langage.is_empty());
        Ok(())
    }

    #[tokio::test]
    async fn interroger_ncloc_historique_resout_via_lhistorique_sans_repartition_par_langage()
    -> Result<(), ErreurConnecteur> {
        // C15-14 : `ncloc_language_distribution` n'est jamais interrogée en mode historique, `par_langage` reste
        // toujours vide par convention.
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": [
                    { "metric": "ncloc", "history": [
                        { "date": "2026-01-15T00:00:00+0000", "value": "70000" }
                    ]}
                ]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": []
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_ncloc(
            &serveur.uri(),
            "jeton-valide",
            "source-2",
            "proj-key",
            Some("2026-02-01"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.ncloc, 70000);
        assert!(resultat.par_langage.is_empty());
        Ok(())
    }

    #[tokio::test]
    async fn interroger_derniere_analyse_reussit_avec_une_analyse() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/project_analyses/search"))
            .and(header("Authorization", "Bearer jeton-valide"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "analyses": [{ "date": "2026-07-08T10:15:00+0000" }]
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_derniere_analyse(
            &serveur.uri(),
            "jeton-valide",
            "proj-key",
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(resultat, Ok(Some("2026-07-08T10:15:00+0000".to_string())));
    }

    #[tokio::test]
    async fn interroger_derniere_analyse_retourne_absent_si_jamais_analyse() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/project_analyses/search"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({ "analyses": [] })),
            )
            .mount(&serveur)
            .await;

        let resultat = interroger_derniere_analyse(
            &serveur.uri(),
            "jeton-valide",
            "proj-key",
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(resultat, Ok(None));
    }

    #[tokio::test]
    async fn interroger_derniere_analyse_signale_authentification_refusee() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/project_analyses/search"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&serveur)
            .await;

        let resultat = interroger_derniere_analyse(
            &serveur.uri(),
            "jeton-invalide",
            "proj-key",
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::AuthentificationRefusee { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_derniere_analyse_signale_des_droits_insuffisants() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/project_analyses/search"))
            .respond_with(ResponseTemplate::new(403))
            .mount(&serveur)
            .await;

        let resultat = interroger_derniere_analyse(
            &serveur.uri(),
            "jeton-limite",
            "proj-key",
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::DroitsInsuffisants { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_derniere_analyse_signale_une_reponse_inattendue() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/project_analyses/search"))
            .respond_with(ResponseTemplate::new(200).set_body_string("pas du json"))
            .mount(&serveur)
            .await;

        let resultat = interroger_derniere_analyse(
            &serveur.uri(),
            "jeton",
            "proj-key",
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::ReponseInattendue { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_derniere_analyse_historique_choisit_lanalyse_la_plus_proche_sur_plusieurs_pages()
    -> Result<(), ErreurConnecteur> {
        // C15-14 : en mode historique, `project_analyses/search` est reparcouru intégralement, paginé, puis
        // l'analyse la plus proche de la date cible (priorité au point antérieur ou égal) est choisie côté client.
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/project_analyses/search"))
            .and(query_param("p", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "analyses": [
                    { "date": "2026-01-01T10:00:00+0000" },
                    { "date": "2026-01-15T10:00:00+0000" }
                ]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/project_analyses/search"))
            .and(query_param("p", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "analyses": [
                    { "date": "2026-03-01T10:00:00+0000" }
                ]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/project_analyses/search"))
            .and(query_param("p", "3"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({ "analyses": [] })),
            )
            .mount(&serveur)
            .await;

        let resultat = interroger_derniere_analyse(
            &serveur.uri(),
            "jeton-valide",
            "proj-key",
            Some("2026-02-01"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat, Some("2026-01-15T10:00:00+0000".to_string()));
        Ok(())
    }

    #[tokio::test]
    async fn interroger_derniere_analyse_historique_retourne_absent_sans_aucune_analyse()
    -> Result<(), ErreurConnecteur> {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/project_analyses/search"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({ "analyses": [] })),
            )
            .mount(&serveur)
            .await;

        let resultat = interroger_derniere_analyse(
            &serveur.uri(),
            "jeton-valide",
            "proj-key",
            Some("2026-02-01"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat, None);
        Ok(())
    }

    #[test]
    fn selectionner_point_le_plus_proche_priorise_le_point_antecedent_le_plus_recent() {
        let historique = vec![
            ("2026-01-01".to_string(), 1.0),
            ("2026-01-15".to_string(), 2.0),
            ("2026-03-01".to_string(), 3.0),
        ];

        let choisi = selectionner_point_le_plus_proche(&historique, "2026-02-01");

        assert_eq!(choisi, Some(("2026-01-15".to_string(), 2.0)));
    }

    #[test]
    fn selectionner_point_le_plus_proche_se_replie_sur_le_plus_proche_disponible_si_aucun_avant() {
        let historique = vec![
            ("2026-03-01".to_string(), 3.0),
            ("2026-05-01".to_string(), 5.0),
        ];

        let choisi = selectionner_point_le_plus_proche(&historique, "2026-01-01");

        assert_eq!(choisi, Some(("2026-03-01".to_string(), 3.0)));
    }

    #[test]
    fn selectionner_point_le_plus_proche_retient_le_point_exactement_a_la_date_cible() {
        let historique = vec![
            ("2026-01-01".to_string(), 1.0),
            ("2026-02-01".to_string(), 2.0),
            ("2026-03-01".to_string(), 3.0),
        ];

        let choisi = selectionner_point_le_plus_proche(&historique, "2026-02-01");

        assert_eq!(choisi, Some(("2026-02-01".to_string(), 2.0)));
    }

    #[test]
    fn selectionner_point_le_plus_proche_retourne_none_sur_historique_vide() {
        assert_eq!(selectionner_point_le_plus_proche(&[], "2026-02-01"), None);
    }

    #[tokio::test]
    async fn recuperer_historique_mesures_pagine_jusqua_epuisement() -> Result<(), ErreurConnecteur>
    {
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": [
                    { "metric": "coverage", "history": [
                        { "date": "2026-01-01T00:00:00+0000", "value": "50.0" }
                    ]}
                ]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": [
                    { "metric": "coverage", "history": [
                        { "date": "2026-02-01T00:00:00+0000", "value": "60.0" }
                    ]}
                ]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "3"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": [{ "metric": "coverage", "history": [] }]
            })))
            .mount(&serveur)
            .await;

        let historique = recuperer_historique_mesures(
            &serveur.uri(),
            "jeton-valide",
            "proj-key",
            "coverage",
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(
            historique.get("coverage"),
            Some(&vec![
                ("2026-01-01T00:00:00+0000".to_string(), 50.0),
                ("2026-02-01T00:00:00+0000".to_string(), 60.0),
            ])
        );
        Ok(())
    }

    #[tokio::test]
    async fn recuperer_historique_mesures_ignore_un_point_sans_valeur()
    -> Result<(), ErreurConnecteur> {
        // Un point d'historique sans `value` (métrique non calculable à cette date) est ignoré plutôt que de faire
        // échouer la récupération de l'historique.
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": [
                    { "metric": "coverage", "history": [
                        { "date": "2026-01-01T00:00:00+0000" },
                        { "date": "2026-01-02T00:00:00+0000", "value": "60.0" }
                    ]}
                ]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/measures/search_history"))
            .and(query_param("p", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "measures": [{ "metric": "coverage", "history": [] }]
            })))
            .mount(&serveur)
            .await;

        let historique = recuperer_historique_mesures(
            &serveur.uri(),
            "jeton-valide",
            "proj-key",
            "coverage",
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(
            historique.get("coverage"),
            Some(&vec![("2026-01-02T00:00:00+0000".to_string(), 60.0)])
        );
        Ok(())
    }

    #[tokio::test]
    async fn rechercher_projets_trie_par_libelle_insensible_a_la_casse()
    -> Result<(), ErreurConnecteur> {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(header("Authorization", "Bearer jeton-valide"))
            .and(wiremock::matchers::query_param("p", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "components": [
                    { "key": "nova:api-portail", "name": "API Portail" },
                    { "key": "entreprise:api-facturation", "name": "api Facturation" },
                    { "key": "nova:front-portail", "name": "Front Portail" }
                ]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(wiremock::matchers::query_param("p", "2"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({ "components": [] })),
            )
            .mount(&serveur)
            .await;

        let disponibles = rechercher_projets(
            &serveur.uri(),
            "jeton-valide",
            Some("portail"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(
            disponibles
                .iter()
                .map(|projet| projet.libelle.as_str())
                .collect::<Vec<_>>(),
            vec!["api Facturation", "API Portail", "Front Portail"]
        );
        assert_eq!(disponibles[0].id_externe, "entreprise:api-facturation");
        Ok(())
    }

    #[tokio::test]
    async fn rechercher_projets_pagine_jusqua_epuisement() -> Result<(), ErreurConnecteur> {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(wiremock::matchers::query_param("p", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "components": [{ "key": "groupe:un", "name": "Un" }]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(wiremock::matchers::query_param("p", "2"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({ "components": [] })),
            )
            .mount(&serveur)
            .await;

        let disponibles = rechercher_projets(
            &serveur.uri(),
            "jeton-valide",
            Some("groupe"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(disponibles.len(), 1);
        assert_eq!(disponibles[0].libelle, "Un");
        Ok(())
    }

    #[tokio::test]
    async fn rechercher_projets_transmet_le_terme_de_recherche() {
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(query_param("q", "portail"))
            .and(query_param("p", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "components": [{ "key": "nova:front-portail", "name": "Front Portail" }]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .and(query_param("p", "2"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({ "components": [] })),
            )
            .mount(&serveur)
            .await;

        let disponibles = rechercher_projets(
            &serveur.uri(),
            "jeton-valide",
            Some("portail"),
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(
            disponibles.map(|projets| projets.len()).unwrap_or_default(),
            1
        );
    }

    #[tokio::test]
    async fn rechercher_projets_ne_fait_aucun_appel_reseau_sans_terme_recherche() {
        // Aucun `Mock` monté : cf. commentaire de `lister_projets_ne_fait_aucun_appel_reseau_sans_terme_recherche`
        // côté GitLab (`gitlab.rs`), même principe (RG-036, évolution du 2026-08-25).
        let serveur = MockServer::start().await;

        let sans_terme = rechercher_projets(
            &serveur.uri(),
            "jeton-valide",
            None,
            &client_test_delai_court(),
        )
        .await;
        let terme_vide = rechercher_projets(
            &serveur.uri(),
            "jeton-valide",
            Some("   "),
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(sans_terme, Ok(Vec::new()));
        assert_eq!(terme_vide, Ok(Vec::new()));
    }

    #[tokio::test]
    async fn rechercher_projets_signale_authentification_refusee() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&serveur)
            .await;

        let resultat = rechercher_projets(
            &serveur.uri(),
            "jeton-invalide",
            Some("api"),
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::AuthentificationRefusee { .. })
        ));
    }

    #[tokio::test]
    async fn rechercher_projets_signale_des_droits_insuffisants() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/components/search"))
            .respond_with(ResponseTemplate::new(403))
            .mount(&serveur)
            .await;

        let resultat = rechercher_projets(
            &serveur.uri(),
            "jeton-limite",
            Some("api"),
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::DroitsInsuffisants { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_dette_porte_un_message_technique_non_vide_sur_authentification_refusee() {
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
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        match resultat {
            Err(ErreurConnecteur::AuthentificationRefusee { message }) => {
                assert!(!message.is_empty());
                assert!(message.contains("401"));
            }
            _ => panic!("attendu une anomalie AuthentificationRefusee avec message"),
        }
    }
}
