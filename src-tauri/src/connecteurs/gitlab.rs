// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Connecteur GitLab (US-004, Phase 2 ; US-008, Phase 3 ; US-009, Phase 5). Périmètre de la Phase 5, incrément 1 :
//! cinq des huit opérations d'interrogation des indicateurs listées en conception détaillée
//! (`docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`) —
//! `interrogerVitalite`, `interrogerTailleDepot`, `interrogerContributeurs`, `interrogerMergeRequests`,
//! `interrogerMembres` — chacune ne nécessitant qu'un appel à une API GitLab déterministe, sans heuristique à
//! inventer. `interrogerDependances` (parseur de manifestes multi-écosystèmes) reste hors périmètre, différée à un
//! incrément ultérieur, faute de spécification suffisante dans la documentation source à ce stade.
//! `interrogerMarqueursIa` (US-009, F18, RG-021), différée à la Phase 5, incrément 1, est livrée depuis l'incrément
//! 7 : détection des marqueurs d'outils IA dans l'arborescence complète de la ref auditée, par correspondance avec
//! le référentiel `Referentiels.reglesMarqueursIA` transmis en paramètre (jamais lu depuis le fichier de données
//! par le Connecteur lui-même).
//!
//! Décision arbitraire (cf. rapport de développement de cette phase) : le délai de requête reste le délai fixe
//! partagé de `commun.rs` (`client_http()`) plutôt que le délai configurable envisagé par
//! `parametres.audit` en conception détaillée — aucun appelant ne fait encore varier cette valeur, l'Orchestrateur
//! de campagne (seul consommateur prévu de ce réglage) n'existant pas encore.

use super::commun::{ErreurConnecteur, VerdictConnectivite, erreur_depuis_reqwest};
use crate::modele::racine::{
    Contributeur, Marqueur, MembreGitlab, MergeRequestOuverte, ResultatGitlabContributeurs,
    ResultatGitlabMarqueursIa, ResultatGitlabMembres, ResultatGitlabMergeRequests,
    ResultatGitlabTailleDepot, ResultatGitlabVitalite,
};
use regex::Regex;
use serde::Deserialize;
use std::collections::HashSet;

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

    let corps = reponse.json::<ReponseTokenSelf>().await.map_err(|erreur| {
        ErreurConnecteur::ReponseInattendue {
            message: erreur.to_string(),
        }
    })?;
    let portee_excessive = corps.scopes.iter().any(|scope| scope != PORTEE_MINIMALE);
    Ok(VerdictConnectivite { portee_excessive })
}

/// Nombre maximal de branches retournées par un appel d'autocomplétion (US-008), suffisant pour un menu déroulant
/// sans pagination supplémentaire : l'utilisateur affine sa saisie (`recherche`) pour réduire la liste au besoin.
const TAILLE_PAGE_BRANCHES: &str = "20";

/// Réponse d'un élément de la liste des branches de l'API GitLab, réduite au seul champ exploité par
/// l'autocomplétion (US-008).
#[derive(Debug, Deserialize)]
struct ReponseBranche {
    name: String,
}

/// Interroge les branches d'un dépôt GitLab pour l'autocomplétion de la ref auditée d'une source (US-008,
/// Phase 3) ; fonction minimale, réutilisable telle quelle par le Moteur d'audit de la Phase 5, qui y ajoutera les
/// autres opérations d'interrogation listées en conception détaillée
/// (`docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`).
///
/// # Erreurs
///
/// Voir [`ErreurConnecteur`] : authentification refusée, droits insuffisants, instance injoignable, délai
/// dépassé, ou réponse inattendue (y compris un identifiant de projet inconnu, signalé par un statut 404).
pub(crate) async fn interroger_branches(
    url_base: &str,
    credential: &str,
    id_externe: &str,
    recherche: Option<&str>,
    client: &reqwest::Client,
) -> Result<Vec<String>, ErreurConnecteur> {
    let url = format!(
        "{}/api/v4/projects/{}/repository/branches",
        url_base.trim_end_matches('/'),
        id_externe
    );
    let mut parametres = vec![("per_page", TAILLE_PAGE_BRANCHES)];
    if let Some(terme) = recherche {
        parametres.push(("search", terme));
    }

    let reponse = client
        .get(url)
        .header("PRIVATE-TOKEN", credential)
        .query(&parametres)
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

    let corps = reponse
        .json::<Vec<ReponseBranche>>()
        .await
        .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
            message: erreur.to_string(),
        })?;
    Ok(corps.into_iter().map(|branche| branche.name).collect())
}

/// Nombre d'éléments par page pour les appels paginés du Moteur d'audit (listes de commits, de demandes de
/// fusion, de membres), aligné sur le maximum autorisé par l'API GitLab elle-même.
const TAILLE_PAGE_AUDIT: &str = "100";

/// Nombre maximal de pages parcourues lors de la liste des commits d'une fenêtre glissante
/// (`interrogerContributeurs`) : borne de sécurité arbitraire (cf. rapport de développement de cette phase),
/// aucune valeur n'étant fixée par la documentation source pour ce point précis ; au-delà, un dépôt à très fort
/// volume de commits verrait son nombre de contributeurs sous-estimé plutôt que de générer un nombre d'appels
/// illimité.
const MAX_PAGES_CONTRIBUTEURS: u32 = 20;

/// Fenêtre, en jours, de calcul des contributeurs récents (`gitlab.contributeurs`) : valeur reprise de l'exemple
/// de référence `docs/01_besoin/exemple-donnees.json` (`fenetreJours: 90`) en l'absence de
/// `parametres.audit.fenetreContributeursJours` explicite, aucune règle de gestion consultée ne fixant cette
/// valeur (décision arbitraire, cf. rapport de développement de cette phase).
const FENETRE_CONTRIBUTEURS_JOURS: u32 = 90;

/// Nombre maximal de pages parcourues lors de la récupération de l'arborescence complète d'un dépôt
/// (`interrogerMarqueursIa`) : borne de sécurité arbitraire (cf. rapport de développement de cette phase), sur le
/// même principe que [`MAX_PAGES_CONTRIBUTEURS`] ; au-delà, un dépôt à très fort volume de fichiers verrait sa
/// détection de marqueurs IA limitée aux premières entrées plutôt que de générer un nombre d'appels illimité.
const MAX_PAGES_ARBORESCENCE: u32 = 50;

/// Type de correspondance d'une règle de détection de marqueur IA (`Referentiels.reglesMarqueursIA`), cf.
/// `docs/01_besoin/Specification.md#518-f18--politique-ia`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum TypeCorrespondanceMarqueur {
    /// Égalité stricte (sensible à la casse) entre le basename de l'entrée et le motif de la règle.
    Exact,
    /// Motif de type glob simple où `*` est le seul caractère spécial.
    Motif,
}

/// Portée d'une règle de détection de marqueur IA : profondeur de l'arborescence à laquelle elle s'applique.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum PorteeMarqueur {
    /// La règle ne s'applique qu'aux entrées directement à la racine du dépôt (aucun `/` dans leur chemin).
    Racine,
    /// La règle s'applique à toute profondeur de l'arborescence.
    Partout,
}

/// Nature d'une entrée de l'arborescence GitLab à laquelle s'applique une règle de détection de marqueur IA, ainsi
/// que du [`Marqueur`] produit en sortie (`type: "blob"` = fichier, `type: "tree"` = répertoire).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum NatureMarqueur {
    /// Entrée de type `blob` (fichier) de l'API GitLab.
    Fichier,
    /// Entrée de type `tree` (répertoire) de l'API GitLab.
    Repertoire,
}

impl NatureMarqueur {
    /// Traduit le discriminant `type` (`"blob"` | `"tree"`) d'une entrée d'arborescence GitLab en [`NatureMarqueur`],
    /// `None` pour toute autre valeur (ex. `"commit"`, sous-module Git), ignorée par l'algorithme de correspondance.
    fn depuis_type_gitlab(type_entree: &str) -> Option<Self> {
        match type_entree {
            "blob" => Some(Self::Fichier),
            "tree" => Some(Self::Repertoire),
            _ => None,
        }
    }

    /// Représentation `String` attendue par [`Marqueur::nature`] (schéma déjà figé, `docs/01_besoin/exemple-donnees.json`).
    fn as_str(self) -> &'static str {
        match self {
            Self::Fichier => "fichier",
            Self::Repertoire => "repertoire",
        }
    }
}

/// Règle de détection d'un marqueur d'outil IA (`Referentiels.reglesMarqueursIA`), reçue en paramètre de
/// `interroger_marqueurs_ia` : jamais persistée telle quelle par le cœur natif (la persistance du référentiel
/// reste `Vec<serde_json::Value>` dans `crate::modele::racine::Referentiels`, cf. Phase 7, hors périmètre), donc
/// `Deserialize` uniquement.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RegleMarqueurIA {
    /// Motif à comparer au basename de l'entrée (dernier segment du chemin, séparateur `/`).
    pub(crate) motif: String,
    /// Type de correspondance appliqué au `motif` ci-dessus.
    pub(crate) type_correspondance: TypeCorrespondanceMarqueur,
    /// Profondeur de l'arborescence à laquelle la règle s'applique.
    pub(crate) portee: PorteeMarqueur,
    /// Nature (fichier/répertoire) des entrées auxquelles la règle s'applique.
    pub(crate) nature: NatureMarqueur,
    /// Outil IA signalé par cette règle lorsqu'elle correspond (ex. `"claude"`, `"aider"`).
    pub(crate) outil: String,
}

/// Entrée de l'arborescence d'un dépôt GitLab (`GET .../repository/tree`), réduite aux champs exploités par
/// `interroger_marqueurs_ia`.
#[derive(Debug, Deserialize)]
struct ReponseEntreeArborescence {
    /// Chemin complet de l'entrée, relatif à la racine du dépôt (jamais de `/` en tête).
    path: String,
    /// Discriminant `"blob"` (fichier) ou `"tree"` (répertoire) de l'API GitLab.
    #[serde(rename = "type")]
    type_entree: String,
}

/// Basename d'un chemin d'arborescence (dernier segment, séparateur `/`), tel qu'exigé par l'algorithme de
/// correspondance de `interroger_marqueurs_ia` (cf. en-tête de module).
fn basename(chemin: &str) -> &str {
    chemin.rsplit('/').next().unwrap_or(chemin)
}

/// Construit une expression régulière à partir d'un motif de type glob simple où `*` est le seul caractère
/// spécial : chaque segment séparé par `*` est échappé littéralement (`regex::escape`), les segments sont
/// rejoints par `.*`, puis le tout est ancré (`^...$`), sensible à la casse — algorithme figé (cf. compte-rendu de
/// développement de cette phase), à ne pas réinterpréter.
fn regex_depuis_motif_glob(motif: &str) -> Result<Regex, ErreurConnecteur> {
    let motif_regex: String = motif
        .split('*')
        .map(regex::escape)
        .collect::<Vec<_>>()
        .join(".*");
    Regex::new(&format!("^{motif_regex}$")).map_err(|erreur| ErreurConnecteur::ReponseInattendue {
        message: format!("Motif de marqueur IA invalide (« {motif} ») : {erreur}"),
    })
}

/// Applique l'algorithme de correspondance de `interroger_marqueurs_ia` (US-009, F18, RG-021) à une arborescence
/// déjà récupérée : pour chaque entrée et chaque règle, filtre par nature puis par portée, compare le basename de
/// l'entrée au motif de la règle selon son type de correspondance, et produit un [`Marqueur`] par couple
/// entrée/règle correspondante — pas de déduplication supplémentaire (algorithme figé, cf. en-tête de module).
fn detecter_marqueurs(
    entrees: &[ReponseEntreeArborescence],
    regles: &[RegleMarqueurIA],
) -> Result<Vec<Marqueur>, ErreurConnecteur> {
    // Motifs de type "motif" (glob) précompilés une seule fois, alignés par index sur `regles`, plutôt que
    // recompilés à chaque entrée de l'arborescence.
    let motifs_compiles: Vec<Option<Regex>> = regles
        .iter()
        .map(|regle| match regle.type_correspondance {
            TypeCorrespondanceMarqueur::Motif => regex_depuis_motif_glob(&regle.motif).map(Some),
            TypeCorrespondanceMarqueur::Exact => Ok(None),
        })
        .collect::<Result<Vec<_>, _>>()?;

    let mut marqueurs = Vec::new();
    for entree in entrees {
        let Some(nature_entree) = NatureMarqueur::depuis_type_gitlab(&entree.type_entree) else {
            continue;
        };
        let nom = basename(&entree.path);

        for (regle, motif_compile) in regles.iter().zip(&motifs_compiles) {
            if regle.nature != nature_entree {
                continue;
            }
            if regle.portee == PorteeMarqueur::Racine && entree.path.contains('/') {
                continue;
            }
            let correspond = match motif_compile {
                Some(regex) => regex.is_match(nom),
                None => nom == regle.motif,
            };
            if correspond {
                marqueurs.push(Marqueur {
                    chemin: entree.path.clone(),
                    nature: nature_entree.as_str().to_string(),
                    outil: regle.outil.clone(),
                });
            }
        }
    }
    Ok(marqueurs)
}

/// Interroge les marqueurs d'outils IA détectés dans l'arborescence complète de la ref auditée d'un dépôt GitLab
/// (US-009, F18, RG-021), par correspondance avec le référentiel `regles` (`Referentiels.reglesMarqueursIA`)
/// transmis par l'appelant : récupère l'arborescence complète, paginée (`recursive=true`), jusqu'à épuisement ou
/// [`MAX_PAGES_ARBORESCENCE`], puis applique [`detecter_marqueurs`].
///
/// # Erreurs
///
/// Voir [`resoudre_ref_effective`] ; les mêmes catégories s'appliquent aux appels de pagination de l'arborescence.
/// [`ErreurConnecteur::ReponseInattendue`] également si une règle `motif` porte un motif glob invalide (cas
/// resté théorique : tout motif littéral échappé produit une expression régulière valide).
pub(crate) async fn interroger_marqueurs_ia(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    ref_auditee: Option<&str>,
    regles: &[RegleMarqueurIA],
    client: &reqwest::Client,
) -> Result<ResultatGitlabMarqueursIa, ErreurConnecteur> {
    let resolue =
        resoudre_ref_effective(url_base, credential, id_externe, ref_auditee, client).await?;

    let mut entrees = Vec::new();
    for page in 1..=MAX_PAGES_ARBORESCENCE {
        let url = format!(
            "{}/api/v4/projects/{}/repository/tree",
            url_base.trim_end_matches('/'),
            id_externe
        );
        let reponse = client
            .get(url)
            .header("PRIVATE-TOKEN", credential)
            .query(&[
                ("ref", resolue.ref_effective.as_str()),
                ("recursive", "true"),
                ("per_page", TAILLE_PAGE_AUDIT),
                ("page", page.to_string().as_str()),
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
        let page_entrees = reponse
            .json::<Vec<ReponseEntreeArborescence>>()
            .await
            .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                message: erreur.to_string(),
            })?;
        if page_entrees.is_empty() {
            break;
        }
        entrees.extend(page_entrees);
    }

    let marqueurs = detecter_marqueurs(&entrees, regles)?;

    Ok(ResultatGitlabMarqueursIa {
        source_id: source_id.to_string(),
        ref_effective: resolue.ref_effective,
        sha_tete: resolue.sha_tete,
        marqueurs,
    })
}

/// Ref effectivement auditée et SHA du commit de tête associé, résolus une fois par appel d'indicateur GitLab
/// (traçabilité et reproductibilité, cf. `docs/01_besoin/Specification.md#55-f05--audits-et-catalogue-des-indicateurs`
/// : « Chaque résultat GitLab porte la ref effectivement auditée et le SHA du commit de tête »).
struct RefResolue {
    ref_effective: String,
    sha_tete: String,
    date_commit: String,
}

/// Réponse de `GET /projects/{id}`, réduite aux champs exploités par la résolution de la ref par défaut et par
/// `interroger_taille_depot`.
#[derive(Debug, Deserialize)]
struct ReponseProjet {
    #[serde(default)]
    default_branch: Option<String>,
    #[serde(default)]
    statistics: Option<ReponseStatistiques>,
}

/// Statistiques du dépôt, réduites au seul champ exploité par `interroger_taille_depot`.
#[derive(Debug, Deserialize)]
struct ReponseStatistiques {
    repository_size: u64,
}

/// Réponse d'un commit de l'API GitLab, réduite aux champs exploités par la résolution de ref et par
/// `interroger_contributeurs`.
#[derive(Debug, Deserialize)]
struct ReponseCommit {
    id: String,
    committed_date: String,
    #[serde(default)]
    author_email: Option<String>,
    #[serde(default)]
    author_name: Option<String>,
}

/// Construit l'URL d'un appel `GET /projects/{id}/repository/commits/{ref}`, en encodant le segment de ref via le
/// crate `url` plutôt qu'un simple `format!` : un nom de branche peut contenir `/` (ex. `feature/paiement-sepa`),
/// qui doit être percent-encodé pour rester un unique segment de chemin plutôt que d'introduire un sous-chemin.
fn url_commit_ref(
    url_base: &str,
    id_externe: &str,
    ref_effective: &str,
) -> Result<url::Url, ErreurConnecteur> {
    let mut url = url::Url::parse(&format!(
        "{}/api/v4/projects/{}/repository/commits",
        url_base.trim_end_matches('/'),
        id_externe
    ))
    .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
        message: erreur.to_string(),
    })?;
    url.path_segments_mut()
        .map_err(|_| ErreurConnecteur::ReponseInattendue {
            message: "URL de base non segmentable (schéma opaque)".to_string(),
        })?
        .push(ref_effective);
    Ok(url)
}

/// Résout la ref effectivement auditée (branche par défaut du dépôt si `ref_auditee` est absente, cf.
/// `Source.refAuditee`) ainsi que le SHA et la date du commit de tête correspondant, communs à toutes les
/// opérations d'interrogation GitLab de cette phase.
///
/// # Erreurs
///
/// [`ErreurConnecteur::RefIntrouvable`] si la ref résolue n'existe pas sur le dépôt (statut 404 sur l'appel de
/// résolution du commit de tête) ; les autres catégories de [`ErreurConnecteur`] selon le statut ou la forme de la
/// réponse, y compris pour l'appel préalable de résolution de la branche par défaut lorsque `ref_auditee` est
/// absente.
async fn resoudre_ref_effective(
    url_base: &str,
    credential: &str,
    id_externe: &str,
    ref_auditee: Option<&str>,
    client: &reqwest::Client,
) -> Result<RefResolue, ErreurConnecteur> {
    let ref_effective = match ref_auditee {
        Some(ref_auditee) => ref_auditee.to_string(),
        None => {
            let url = format!(
                "{}/api/v4/projects/{}",
                url_base.trim_end_matches('/'),
                id_externe
            );
            let reponse = client
                .get(url)
                .header("PRIVATE-TOKEN", credential)
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
            reponse
                .json::<ReponseProjet>()
                .await
                .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                    message: erreur.to_string(),
                })?
                .default_branch
                .ok_or_else(|| ErreurConnecteur::ReponseInattendue {
                    message: "Champ default_branch absent de la réponse".to_string(),
                })?
        }
    };

    let url = url_commit_ref(url_base, id_externe, &ref_effective)?;
    let reponse = client
        .get(url)
        .header("PRIVATE-TOKEN", credential)
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
    if statut.as_u16() == 404 {
        return Err(ErreurConnecteur::RefIntrouvable {
            message: format!("Statut HTTP {} reçu", statut.as_u16()),
        });
    }
    if !statut.is_success() {
        return Err(ErreurConnecteur::ReponseInattendue {
            message: format!("Statut HTTP {} reçu", statut.as_u16()),
        });
    }
    let commit = reponse.json::<ReponseCommit>().await.map_err(|erreur| {
        ErreurConnecteur::ReponseInattendue {
            message: erreur.to_string(),
        }
    })?;

    Ok(RefResolue {
        ref_effective,
        sha_tete: commit.id,
        date_commit: commit.committed_date,
    })
}

/// Interroge la vitalité d'un dépôt GitLab, c'est-à-dire la date du dernier commit sur la ref auditée (US-009,
/// `gitlab.vitalite`) : se limite à la résolution de la ref effective, qui fournit déjà cette date.
///
/// # Erreurs
///
/// Voir [`resoudre_ref_effective`].
pub(crate) async fn interroger_vitalite(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    ref_auditee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatGitlabVitalite, ErreurConnecteur> {
    let resolue =
        resoudre_ref_effective(url_base, credential, id_externe, ref_auditee, client).await?;
    Ok(ResultatGitlabVitalite {
        source_id: source_id.to_string(),
        ref_effective: resolue.ref_effective,
        sha_tete: resolue.sha_tete,
        dernier_commit_le: resolue.date_commit,
    })
}

/// Interroge la taille d'un dépôt GitLab en octets (US-009, `gitlab.taille_depot`).
///
/// # Erreurs
///
/// Voir [`resoudre_ref_effective`] ; la seconde requête (statistiques du projet) suit le même mapping de statuts.
pub(crate) async fn interroger_taille_depot(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    ref_auditee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatGitlabTailleDepot, ErreurConnecteur> {
    let resolue =
        resoudre_ref_effective(url_base, credential, id_externe, ref_auditee, client).await?;

    let url = format!(
        "{}/api/v4/projects/{}?statistics=true",
        url_base.trim_end_matches('/'),
        id_externe
    );
    let reponse = client
        .get(url)
        .header("PRIVATE-TOKEN", credential)
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
    let taille_octets = reponse
        .json::<ReponseProjet>()
        .await
        .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
            message: erreur.to_string(),
        })?
        .statistics
        .ok_or_else(|| ErreurConnecteur::ReponseInattendue {
            message: "Champ statistics absent de la réponse".to_string(),
        })?
        .repository_size;

    Ok(ResultatGitlabTailleDepot {
        source_id: source_id.to_string(),
        ref_effective: resolue.ref_effective,
        sha_tete: resolue.sha_tete,
        taille_octets,
    })
}

/// Interroge les contributeurs distincts ayant commité sur la ref auditée dans la fenêtre glissante de
/// [`FENETRE_CONTRIBUTEURS_JOURS`] jours (US-009, `gitlab.contributeurs`), en agrégeant par email le nombre de
/// commits sur les pages de résultats successives, jusqu'à épuisement ou [`MAX_PAGES_CONTRIBUTEURS`].
///
/// # Erreurs
///
/// Voir [`resoudre_ref_effective`] ; les mêmes catégories s'appliquent aux appels de pagination.
pub(crate) async fn interroger_contributeurs(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    ref_auditee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatGitlabContributeurs, ErreurConnecteur> {
    let resolue =
        resoudre_ref_effective(url_base, credential, id_externe, ref_auditee, client).await?;
    let depuis =
        chrono::Utc::now() - chrono::Duration::days(i64::from(FENETRE_CONTRIBUTEURS_JOURS));

    let mut commits_par_email: std::collections::HashMap<String, (String, u32)> =
        std::collections::HashMap::new();
    for page in 1..=MAX_PAGES_CONTRIBUTEURS {
        let url = format!(
            "{}/api/v4/projects/{}/repository/commits",
            url_base.trim_end_matches('/'),
            id_externe
        );
        let reponse = client
            .get(url)
            .header("PRIVATE-TOKEN", credential)
            .query(&[
                ("ref_name", resolue.ref_effective.as_str()),
                ("since", depuis.to_rfc3339().as_str()),
                ("per_page", TAILLE_PAGE_AUDIT),
                ("page", page.to_string().as_str()),
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
        let commits = reponse
            .json::<Vec<ReponseCommit>>()
            .await
            .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                message: erreur.to_string(),
            })?;
        if commits.is_empty() {
            break;
        }
        for commit in commits {
            let (Some(email), Some(nom)) = (commit.author_email, commit.author_name) else {
                continue;
            };
            let entree = commits_par_email.entry(email).or_insert_with(|| (nom, 0));
            entree.1 += 1;
        }
    }

    let mut contributeurs: Vec<Contributeur> = commits_par_email
        .into_iter()
        .map(|(email, (nom, nombre_commits))| Contributeur {
            email,
            nom,
            nombre_commits,
        })
        .collect();
    contributeurs.sort_by(|a, b| a.email.cmp(&b.email));

    Ok(ResultatGitlabContributeurs {
        source_id: source_id.to_string(),
        ref_effective: resolue.ref_effective,
        sha_tete: resolue.sha_tete,
        fenetre_jours: FENETRE_CONTRIBUTEURS_JOURS,
        contributeurs,
    })
}

/// Réponse d'une demande de fusion ouverte de l'API GitLab, réduite aux champs exploités ici.
#[derive(Debug, Deserialize)]
struct ReponseMergeRequest {
    iid: u64,
    title: String,
    created_at: String,
    #[serde(default)]
    has_conflicts: bool,
}

/// Interroge les demandes de fusion ouvertes d'un dépôt GitLab (US-009, `gitlab.merge_requests`).
///
/// # Erreurs
///
/// Voir [`resoudre_ref_effective`] ; la seconde requête (liste des demandes de fusion) suit le même mapping.
pub(crate) async fn interroger_merge_requests(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    ref_auditee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatGitlabMergeRequests, ErreurConnecteur> {
    let resolue =
        resoudre_ref_effective(url_base, credential, id_externe, ref_auditee, client).await?;

    let url = format!(
        "{}/api/v4/projects/{}/merge_requests",
        url_base.trim_end_matches('/'),
        id_externe
    );
    let reponse = client
        .get(url)
        .header("PRIVATE-TOKEN", credential)
        .query(&[("state", "opened"), ("per_page", TAILLE_PAGE_AUDIT)])
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
    let mr_ouvertes = reponse
        .json::<Vec<ReponseMergeRequest>>()
        .await
        .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
            message: erreur.to_string(),
        })?
        .into_iter()
        .map(|mr| MergeRequestOuverte {
            iid: mr.iid,
            titre: mr.title,
            cree_le: mr.created_at,
            en_conflit: mr.has_conflicts,
        })
        .collect();

    Ok(ResultatGitlabMergeRequests {
        source_id: source_id.to_string(),
        ref_effective: resolue.ref_effective,
        sha_tete: resolue.sha_tete,
        mr_ouvertes,
    })
}

/// Réponse d'un membre de l'API GitLab (`/members` ou `/members/all`), réduite aux champs exploités ici.
#[derive(Debug, Deserialize)]
struct ReponseMembre {
    username: String,
    name: String,
    access_level: u32,
}

/// Interroge les membres d'un dépôt GitLab (US-009, `gitlab.membres`) : un premier appel liste les membres
/// directs (`/members`), un second la totalité y compris hérités (`/members/all`) ; un membre présent dans le
/// second ensemble sans figurer dans le premier est marqué hérité. L'API GitLab n'exposant pas l'email public d'un
/// membre arbitraire à ce point d'entrée, `emailPublic` reste toujours absent.
///
/// # Erreurs
///
/// Voir [`resoudre_ref_effective`] ; les mêmes catégories s'appliquent aux deux appels de liste de membres.
pub(crate) async fn interroger_membres(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    ref_auditee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatGitlabMembres, ErreurConnecteur> {
    let resolue =
        resoudre_ref_effective(url_base, credential, id_externe, ref_auditee, client).await?;

    let recuperer_membres = |segment: &'static str| {
        let url = format!(
            "{}/api/v4/projects/{}/members{}",
            url_base.trim_end_matches('/'),
            id_externe,
            segment
        );
        let client = client.clone();
        let credential = credential.to_string();
        async move {
            let reponse = client
                .get(url)
                .header("PRIVATE-TOKEN", &credential)
                .query(&[("per_page", TAILLE_PAGE_AUDIT)])
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
            reponse
                .json::<Vec<ReponseMembre>>()
                .await
                .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                    message: erreur.to_string(),
                })
        }
    };

    let membres_directs = recuperer_membres("").await?;
    let membres_tous = recuperer_membres("/all").await?;
    let usernames_directs: HashSet<String> = membres_directs
        .into_iter()
        .map(|membre| membre.username)
        .collect();

    let membres = membres_tous
        .into_iter()
        .map(|membre| MembreGitlab {
            herite: !usernames_directs.contains(&membre.username),
            username: membre.username,
            nom: membre.name,
            niveau_acces: membre.access_level,
            email_public: None,
        })
        .collect();

    Ok(ResultatGitlabMembres {
        source_id: source_id.to_string(),
        ref_effective: resolue.ref_effective,
        sha_tete: resolue.sha_tete,
        membres,
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

        assert!(matches!(
            verdict,
            Err(ErreurConnecteur::AuthentificationRefusee { .. })
        ));
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

        assert!(matches!(
            verdict,
            Err(ErreurConnecteur::DroitsInsuffisants { .. })
        ));
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

        assert!(matches!(
            verdict,
            Err(ErreurConnecteur::ReponseInattendue { .. })
        ));
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

        assert!(matches!(
            verdict,
            Err(ErreurConnecteur::ReponseInattendue { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_branches_retourne_les_noms_de_branches() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/branches"))
            .and(header("PRIVATE-TOKEN", "jeton-valide"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "name": "main" },
                { "name": "develop" }
            ])))
            .mount(&serveur)
            .await;

        let branches = interroger_branches(
            &serveur.uri(),
            "jeton-valide",
            "1234",
            None,
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(
            branches,
            Ok(vec!["main".to_string(), "develop".to_string()])
        );
    }

    #[tokio::test]
    async fn interroger_branches_transmet_le_terme_de_recherche() {
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/branches"))
            .and(query_param("search", "dev"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "name": "develop" }
            ])))
            .mount(&serveur)
            .await;

        let branches = interroger_branches(
            &serveur.uri(),
            "jeton-valide",
            "1234",
            Some("dev"),
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(branches, Ok(vec!["develop".to_string()]));
    }

    #[tokio::test]
    async fn interroger_branches_signale_un_projet_introuvable_en_reponse_inattendue() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/9999/repository/branches"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&serveur)
            .await;

        let branches = interroger_branches(
            &serveur.uri(),
            "jeton-valide",
            "9999",
            None,
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            branches,
            Err(ErreurConnecteur::ReponseInattendue { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_branches_signale_authentification_refusee() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/branches"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&serveur)
            .await;

        let branches = interroger_branches(
            &serveur.uri(),
            "jeton-invalide",
            "1234",
            None,
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            branches,
            Err(ErreurConnecteur::AuthentificationRefusee { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_branches_signale_des_droits_insuffisants() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/branches"))
            .respond_with(ResponseTemplate::new(403))
            .mount(&serveur)
            .await;

        let branches = interroger_branches(
            &serveur.uri(),
            "jeton-limite",
            "1234",
            None,
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            branches,
            Err(ErreurConnecteur::DroitsInsuffisants { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_vitalite_resout_la_ref_explicite() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits/develop"))
            .and(header("PRIVATE-TOKEN", "jeton-valide"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": "8c1d0e44",
                "committed_date": "2026-06-05T10:00:00Z"
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_vitalite(
            &serveur.uri(),
            "jeton-valide",
            "f0000000-0000-4000-8000-000000000001",
            "1234",
            Some("develop"),
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(
            resultat,
            Ok(crate::modele::racine::ResultatGitlabVitalite {
                source_id: "f0000000-0000-4000-8000-000000000001".to_string(),
                ref_effective: "develop".to_string(),
                sha_tete: "8c1d0e44".to_string(),
                dernier_commit_le: "2026-06-05T10:00:00Z".to_string(),
            })
        );
    }

    #[tokio::test]
    async fn interroger_vitalite_resout_la_branche_par_defaut_si_ref_absente() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(serde_json::json!({ "default_branch": "main" })),
            )
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits/main"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": "abc123",
                "committed_date": "2026-06-01T00:00:00Z"
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_vitalite(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            None,
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(resultat.map(|r| r.ref_effective), Ok("main".to_string()));
    }

    #[tokio::test]
    async fn interroger_vitalite_signale_une_branche_par_defaut_absente_en_reponse_inattendue() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({})))
            .mount(&serveur)
            .await;

        let resultat = interroger_vitalite(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            None,
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::ReponseInattendue { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_vitalite_signale_ref_introuvable() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path(
                "/api/v4/projects/1234/repository/commits/branche-absente",
            ))
            .respond_with(ResponseTemplate::new(404))
            .mount(&serveur)
            .await;

        let resultat = interroger_vitalite(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("branche-absente"),
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::RefIntrouvable { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_vitalite_signale_authentification_refusee() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits/develop"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&serveur)
            .await;

        let resultat = interroger_vitalite(
            &serveur.uri(),
            "jeton-invalide",
            "source-1",
            "1234",
            Some("develop"),
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::AuthentificationRefusee { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_vitalite_signale_des_droits_insuffisants() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits/develop"))
            .respond_with(ResponseTemplate::new(403))
            .mount(&serveur)
            .await;

        let resultat = interroger_vitalite(
            &serveur.uri(),
            "jeton-limite",
            "source-1",
            "1234",
            Some("develop"),
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::DroitsInsuffisants { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_vitalite_signale_une_reponse_inattendue_sur_json_invalide() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits/develop"))
            .respond_with(ResponseTemplate::new(200).set_body_string("pas du json"))
            .mount(&serveur)
            .await;

        let resultat = interroger_vitalite(
            &serveur.uri(),
            "jeton",
            "source-1",
            "1234",
            Some("develop"),
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::ReponseInattendue { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_taille_depot_reussit() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits/develop"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": "8c1d0e44",
                "committed_date": "2026-06-05T10:00:00Z"
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "statistics": { "repository_size": 48234567u64 }
            })))
            .mount(&serveur)
            .await;

        let resultat = interroger_taille_depot(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(
            resultat,
            Ok(crate::modele::racine::ResultatGitlabTailleDepot {
                source_id: "source-1".to_string(),
                ref_effective: "develop".to_string(),
                sha_tete: "8c1d0e44".to_string(),
                taille_octets: 48234567,
            })
        );
    }

    #[tokio::test]
    async fn interroger_taille_depot_propage_une_erreur_de_droits_sur_les_statistiques() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits/develop"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": "8c1d0e44",
                "committed_date": "2026-06-05T10:00:00Z"
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234"))
            .respond_with(ResponseTemplate::new(403))
            .mount(&serveur)
            .await;

        let resultat = interroger_taille_depot(
            &serveur.uri(),
            "jeton-limite",
            "source-1",
            "1234",
            Some("develop"),
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::DroitsInsuffisants { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_contributeurs_agrege_par_email_sur_plusieurs_pages()
    -> Result<(), ErreurConnecteur> {
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits/develop"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": "8c1d0e44",
                "committed_date": "2026-06-05T10:00:00Z"
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "id": "c1", "committed_date": "2026-06-05T00:00:00Z", "author_email": "marie@entreprise.fr", "author_name": "Marie" },
                { "id": "c2", "committed_date": "2026-06-04T00:00:00Z", "author_email": "marie@entreprise.fr", "author_name": "Marie" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;

        let resultat = interroger_contributeurs(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.fenetre_jours, FENETRE_CONTRIBUTEURS_JOURS);
        assert_eq!(resultat.contributeurs.len(), 1);
        assert_eq!(resultat.contributeurs[0].email, "marie@entreprise.fr");
        assert_eq!(resultat.contributeurs[0].nombre_commits, 2);
        Ok(())
    }

    #[tokio::test]
    async fn interroger_merge_requests_reussit_avec_conflit_par_defaut_a_faux()
    -> Result<(), ErreurConnecteur> {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits/develop"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": "8c1d0e44",
                "committed_date": "2026-06-05T10:00:00Z"
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/merge_requests"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "iid": 214, "title": "Paiement SEPA", "created_at": "2026-06-20T00:00:00Z", "has_conflicts": false },
                { "iid": 209, "title": "Refonte mapping tiers", "created_at": "2026-04-02T00:00:00Z" }
            ])))
            .mount(&serveur)
            .await;

        let resultat = interroger_merge_requests(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.mr_ouvertes.len(), 2);
        assert!(!resultat.mr_ouvertes[0].en_conflit);
        assert!(!resultat.mr_ouvertes[1].en_conflit);
        Ok(())
    }

    #[tokio::test]
    async fn interroger_membres_marque_herite_les_membres_absents_des_membres_directs()
    -> Result<(), ErreurConnecteur> {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits/develop"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": "8c1d0e44",
                "committed_date": "2026-06-05T10:00:00Z"
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/members"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "username": "mdurand", "name": "Marie Durand", "access_level": 40 }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/members/all"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "username": "mdurand", "name": "Marie Durand", "access_level": 40 },
                { "username": "alopez-ext", "name": "Ana Lopez", "access_level": 30 }
            ])))
            .mount(&serveur)
            .await;

        let resultat = interroger_membres(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            &client_test_delai_court(),
        )
        .await?;

        assert!(
            resultat
                .membres
                .iter()
                .any(|membre| membre.username == "mdurand" && !membre.herite)
        );
        assert!(
            resultat
                .membres
                .iter()
                .any(|membre| membre.username == "alopez-ext"
                    && membre.herite
                    && membre.email_public.is_none())
        );
        Ok(())
    }

    #[tokio::test]
    async fn tester_connectivite_porte_un_message_technique_non_vide_sur_authentification_refusee()
    {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/personal_access_tokens/self"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&serveur)
            .await;

        let verdict =
            tester_connectivite(&serveur.uri(), "jeton-invalide", &client_test_delai_court()).await;

        match verdict {
            Err(ErreurConnecteur::AuthentificationRefusee { message }) => {
                assert!(!message.is_empty());
                assert!(message.contains("401"));
            }
            _ => panic!("attendu une anomalie AuthentificationRefusee avec message"),
        }
    }

    /// Construit une règle de détection de marqueur IA pour les tests, sans passer par la désérialisation JSON.
    fn regle(
        motif: &str,
        type_correspondance: TypeCorrespondanceMarqueur,
        portee: PorteeMarqueur,
        nature: NatureMarqueur,
        outil: &str,
    ) -> RegleMarqueurIA {
        RegleMarqueurIA {
            motif: motif.to_string(),
            type_correspondance,
            portee,
            nature,
            outil: outil.to_string(),
        }
    }

    /// Monte le mock de résolution de ref commun à tous les tests de `interroger_marqueurs_ia` (résolution de la
    /// ref explicite `develop` sur le projet `1234`).
    async fn monter_mock_resolution_ref(serveur: &MockServer) {
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits/develop"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": "8c1d0e44",
                "committed_date": "2026-06-05T10:00:00Z"
            })))
            .mount(serveur)
            .await;
    }

    #[tokio::test]
    async fn interroger_marqueurs_ia_detecte_un_fichier_exact_partout_en_sous_dossier()
    -> Result<(), ErreurConnecteur> {
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "path": "sous-dossier/CLAUDE.md", "type": "blob" },
                { "path": "README.md", "type": "blob" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;

        let regles = vec![regle(
            "CLAUDE.md",
            TypeCorrespondanceMarqueur::Exact,
            PorteeMarqueur::Partout,
            NatureMarqueur::Fichier,
            "claude",
        )];

        let resultat = interroger_marqueurs_ia(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            &regles,
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.marqueurs.len(), 1);
        assert_eq!(resultat.marqueurs[0].chemin, "sous-dossier/CLAUDE.md");
        assert_eq!(resultat.marqueurs[0].nature, "fichier");
        assert_eq!(resultat.marqueurs[0].outil, "claude");
        Ok(())
    }

    #[tokio::test]
    async fn interroger_marqueurs_ia_ignore_un_repertoire_exact_racine_hors_racine()
    -> Result<(), ErreurConnecteur> {
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "path": ".claude", "type": "tree" },
                { "path": "sous-dossier/.claude", "type": "tree" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;

        let regles = vec![regle(
            ".claude",
            TypeCorrespondanceMarqueur::Exact,
            PorteeMarqueur::Racine,
            NatureMarqueur::Repertoire,
            "claude",
        )];

        let resultat = interroger_marqueurs_ia(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            &regles,
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.marqueurs.len(), 1);
        assert_eq!(resultat.marqueurs[0].chemin, ".claude");
        assert_eq!(resultat.marqueurs[0].nature, "repertoire");
        Ok(())
    }

    #[tokio::test]
    async fn interroger_marqueurs_ia_detecte_un_motif_glob_avec_etoile()
    -> Result<(), ErreurConnecteur> {
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "path": ".aider.conf.yml", "type": "blob" },
                { "path": "autre.yml", "type": "blob" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;

        let regles = vec![regle(
            ".aider*",
            TypeCorrespondanceMarqueur::Motif,
            PorteeMarqueur::Racine,
            NatureMarqueur::Fichier,
            "aider",
        )];

        let resultat = interroger_marqueurs_ia(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            &regles,
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.marqueurs.len(), 1);
        assert_eq!(resultat.marqueurs[0].chemin, ".aider.conf.yml");
        assert_eq!(resultat.marqueurs[0].outil, "aider");
        Ok(())
    }

    #[tokio::test]
    async fn interroger_marqueurs_ia_ne_detecte_rien_sans_correspondance()
    -> Result<(), ErreurConnecteur> {
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "path": "src/main.rs", "type": "blob" },
                { "path": "src", "type": "tree" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;

        let regles = vec![regle(
            "CLAUDE.md",
            TypeCorrespondanceMarqueur::Exact,
            PorteeMarqueur::Partout,
            NatureMarqueur::Fichier,
            "claude",
        )];

        let resultat = interroger_marqueurs_ia(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            &regles,
            &client_test_delai_court(),
        )
        .await?;

        assert!(resultat.marqueurs.is_empty());
        Ok(())
    }

    #[tokio::test]
    async fn interroger_marqueurs_ia_agrege_plusieurs_pages_avant_la_page_vide()
    -> Result<(), ErreurConnecteur> {
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "path": "CLAUDE.md", "type": "blob" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "path": "sous-dossier/CLAUDE.md", "type": "blob" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .and(query_param("page", "3"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;

        let regles = vec![regle(
            "CLAUDE.md",
            TypeCorrespondanceMarqueur::Exact,
            PorteeMarqueur::Partout,
            NatureMarqueur::Fichier,
            "claude",
        )];

        let resultat = interroger_marqueurs_ia(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            &regles,
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.marqueurs.len(), 2);
        Ok(())
    }

    #[tokio::test]
    async fn interroger_marqueurs_ia_signale_authentification_refusee_sur_larborescence() {
        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&serveur)
            .await;

        let regles = vec![regle(
            "CLAUDE.md",
            TypeCorrespondanceMarqueur::Exact,
            PorteeMarqueur::Partout,
            NatureMarqueur::Fichier,
            "claude",
        )];

        let resultat = interroger_marqueurs_ia(
            &serveur.uri(),
            "jeton-invalide",
            "source-1",
            "1234",
            Some("develop"),
            &regles,
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::AuthentificationRefusee { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_marqueurs_ia_signale_des_droits_insuffisants_sur_larborescence() {
        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .respond_with(ResponseTemplate::new(403))
            .mount(&serveur)
            .await;

        let regles = vec![regle(
            "CLAUDE.md",
            TypeCorrespondanceMarqueur::Exact,
            PorteeMarqueur::Partout,
            NatureMarqueur::Fichier,
            "claude",
        )];

        let resultat = interroger_marqueurs_ia(
            &serveur.uri(),
            "jeton-limite",
            "source-1",
            "1234",
            Some("develop"),
            &regles,
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::DroitsInsuffisants { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_marqueurs_ia_signale_un_delai_depasse_sur_larborescence() {
        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .respond_with(ResponseTemplate::new(200).set_delay(Duration::from_millis(500)))
            .mount(&serveur)
            .await;

        let regles = vec![regle(
            "CLAUDE.md",
            TypeCorrespondanceMarqueur::Exact,
            PorteeMarqueur::Partout,
            NatureMarqueur::Fichier,
            "claude",
        )];

        let resultat = interroger_marqueurs_ia(
            &serveur.uri(),
            "jeton",
            "source-1",
            "1234",
            Some("develop"),
            &regles,
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::DelaiDepasse { .. })
        ));
    }
}
