// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Connecteur GitLab (US-004, Phase 2 ; US-008, Phase 3 ; US-009, Phase 5). Périmètre de la Phase 5, incrément 1 :
//! cinq des huit opérations d'interrogation des indicateurs listées en conception détaillée
//! (`docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`) —
//! `interrogerVitalite`, `interrogerTailleDepot`, `interrogerContributeurs`, `interrogerMergeRequests`,
//! `interrogerMembres` — chacune ne nécessitant qu'un appel à une API GitLab déterministe, sans heuristique à
//! inventer. `interrogerMarqueursIa` (US-009, F18, RG-021), différée à la Phase 5, incrément 1, est livrée depuis
//! l'incrément 7 : détection des marqueurs d'outils IA dans l'arborescence complète de la ref auditée, par
//! correspondance avec le référentiel `Referentiels.reglesMarqueursIA` transmis en paramètre (jamais lu depuis le
//! fichier de données par le Connecteur lui-même).
//!
//! `interrogerDependances` et le second `interrogerBranches` (production complète pour le catalogue d'audit,
//! distincte de l'autocomplétion US-008 ci-dessous) sont livrés à l'incrément de rattrapage de la Phase 5, précédant
//! la Phase 6 : cf. `interroger_dependances` et `interroger_branches_completes` plus bas.
//!
//! Décision arbitraire (cf. rapport de développement de cette phase) : le délai de requête reste le délai fixe
//! partagé de `commun.rs` (`DELAI_REQUETE`, appliqué par `client_http_avec_proxy()` depuis la Phase 10, incrément 8
//! — auparavant `client_http()`, supprimée à cette occasion) plutôt que le délai configurable envisagé par
//! `parametres.audit` en conception détaillée — aucun appelant ne fait encore varier cette valeur, l'Orchestrateur
//! de campagne (seul consommateur prévu de ce réglage) n'existant pas encore.

use super::commun::{
    ErreurConnecteur, SourceDisponible, VerdictConnectivite, erreur_depuis_reqwest,
};
use crate::modele::racine::{
    Branche, Contributeur, Dependance, Marqueur, MembreGitlab, MergeRequestOuverte,
    ResultatGitlabBranches, ResultatGitlabContributeurs, ResultatGitlabDependances,
    ResultatGitlabMarqueursIa, ResultatGitlabMembres, ResultatGitlabMergeRequests,
    ResultatGitlabTailleDepot, ResultatGitlabVitalite,
};
use regex::Regex;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};

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

/// Nombre maximal de pages parcourues lors de la recherche des dépôts accessibles avec le credential courant
/// (`lister_projets`, US-008, RG-036, ajouté le 2026-08-02) : borne de sécurité arbitraire (cf. rapport de
/// développement de cette évolution), sur le même principe que [`MAX_PAGES_CONTRIBUTEURS`] plus bas.
const MAX_PAGES_PROJETS: u32 = 20;

/// Nombre d'éléments par page de la recherche des dépôts accessibles (RG-036), aligné sur le maximum autorisé par
/// l'API GitLab, sur le même principe que [`TAILLE_PAGE_AUDIT`] plus bas.
const TAILLE_PAGE_PROJETS: &str = "100";

/// Réponse d'un élément de la liste des projets accessibles de l'API GitLab (`GET /projects`), réduite aux champs
/// exploités par [`lister_projets`] (RG-036).
#[derive(Debug, Deserialize)]
struct ReponseProjetDisponible {
    id: u64,
    path_with_namespace: String,
}

/// Recherche, parmi les dépôts GitLab accessibles avec le credential courant (`membership=true`), ceux dont le nom
/// correspond au terme recherché, pour l'autocomplétion de l'identifiant externe d'une source (US-008, RG-036).
/// Un appel (paginé jusqu'à épuisement ou [`MAX_PAGES_PROJETS`]) par terme recherché, débouncé côté appelant.
/// Résultat trié par ordre alphabétique du libellé (`path_with_namespace`), insensible à la casse (RG-036).
///
/// `recherche` vide ou absent ne déclenche aucun appel réseau et retourne une liste vide (RG-036, évolution du
/// 2026-08-25) : jusque-là, la sélection d'une instance chargeait en un seul appel non filtré (`membership=true`
/// sans `search`) l'intégralité des dépôts accessibles, avant toute saisie de l'utilisateur — un appel coûteux côté
/// GitLab (énumération de l'appartenance à tous les groupes/sous-groupes), à l'origine d'un `ReponseInattendue`
/// (« Statut HTTP 502 reçu ») constaté contre une instance GitLab Community Edition 18.11.11 dont le proxy interne
/// (Workhorse) dépassait son propre délai avant que la réponse ne soit prête, indépendamment du délai du client
/// HTTP (cf. rapport de développement de cette évolution).
///
/// # Erreurs
///
/// Voir [`interroger_branches`] : authentification refusée, droits insuffisants, instance injoignable, délai
/// dépassé, ou réponse inattendue.
pub(crate) async fn lister_projets(
    url_base: &str,
    credential: &str,
    recherche: Option<&str>,
    client: &reqwest::Client,
) -> Result<Vec<SourceDisponible>, ErreurConnecteur> {
    let Some(terme) = recherche.map(str::trim).filter(|terme| !terme.is_empty()) else {
        return Ok(Vec::new());
    };
    let mut projets = Vec::new();
    for page in 1..=MAX_PAGES_PROJETS {
        let url = format!("{}/api/v4/projects", url_base.trim_end_matches('/'));
        let reponse = client
            .get(url)
            .header("PRIVATE-TOKEN", credential)
            .query(&[
                ("membership", "true"),
                ("simple", "true"),
                ("search", terme),
                ("per_page", TAILLE_PAGE_PROJETS),
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
        let page_projets = reponse
            .json::<Vec<ReponseProjetDisponible>>()
            .await
            .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                message: erreur.to_string(),
            })?;
        if page_projets.is_empty() {
            break;
        }
        projets.extend(page_projets);
    }

    let mut disponibles: Vec<SourceDisponible> = projets
        .into_iter()
        .map(|projet| SourceDisponible {
            id_externe: projet.id.to_string(),
            libelle: projet.path_with_namespace,
        })
        .collect();
    disponibles.sort_by_key(|projet| projet.libelle.to_lowercase());
    Ok(disponibles)
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
#[allow(
    clippy::too_many_arguments,
    reason = "huit paramètres factuellement distincts (connexion, identification de la source, ref auditée, référentiel de règles transmis par l'appelant, C15-14 : date cible du mode historique) ; les regrouper en structure dédiée n'apporterait pas de clarté supplémentaire pour ce seul point d'appel, sur le même principe que les autres commandes de la Façade déjà couvertes par cette même exception (cf. commandes/audit.rs, commandes/administration.rs)"
)]
pub(crate) async fn interroger_marqueurs_ia(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    ref_auditee: Option<&str>,
    regles: &[RegleMarqueurIA],
    date_ciblee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatGitlabMarqueursIa, ErreurConnecteur> {
    let resolue = resoudre_ref(
        url_base,
        credential,
        id_externe,
        ref_auditee,
        date_ciblee,
        client,
    )
    .await?;

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
    /// `true` lorsque le dépôt ne contient encore aucun commit : GitLab n'expose alors pas de `default_branch`,
    /// ce qui distingue un dépôt vide (état légitime, `ErreurConnecteur::DepotVide`) d'une réponse malformée.
    #[serde(default)]
    empty_repo: Option<bool>,
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

/// Résout la branche par défaut du dépôt (`GET /projects/{id}`), factorisé entre [`resoudre_ref_effective`] et
/// [`resoudre_ref_effective_a_date`] (C15-14) : les deux résolvent la même branche par défaut lorsque `ref_auditee`
/// est absente, seule la résolution du commit correspondant diffère ensuite (commit de tête pour la première,
/// commit le plus récent à une date donnée pour la seconde).
///
/// # Erreurs
///
/// Voir [`resoudre_ref_effective`] ; [`ErreurConnecteur::DepotVide`] si le dépôt ne contient aucun commit
/// (`empty_repo`), [`ErreurConnecteur::ReponseInattendue`] si le champ `default_branch` est absent de la réponse
/// sans que le dépôt soit signalé vide.
async fn resoudre_branche_par_defaut(
    url_base: &str,
    credential: &str,
    id_externe: &str,
    client: &reqwest::Client,
) -> Result<String, ErreurConnecteur> {
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
    let projet = reponse.json::<ReponseProjet>().await.map_err(|erreur| {
        ErreurConnecteur::ReponseInattendue {
            message: erreur.to_string(),
        }
    })?;
    match projet.default_branch {
        Some(branche) => Ok(branche),
        // Dépôt sans aucun commit : GitLab n'expose pas de `default_branch`. État légitime, traité en dégradation
        // par source par l'orchestrateur de campagne (RG-021 « dépôt vide », modèle RG-046), jamais comme un
        // dysfonctionnement d'instance.
        None if matches!(projet.empty_repo, Some(true)) => Err(ErreurConnecteur::DepotVide {
            message: "Dépôt sans commit (empty_repo)".to_string(),
        }),
        None => Err(ErreurConnecteur::ReponseInattendue {
            message: "Champ default_branch absent de la réponse alors que le dépôt n'est pas signalé vide"
                .to_string(),
        }),
    }
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
        None => resoudre_branche_par_defaut(url_base, credential, id_externe, client).await?,
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

/// Résout la ref effectivement auditée « à une date donnée » (C15-14, audit historique) : même résolution de
/// branche par défaut que [`resoudre_ref_effective`] si `ref_auditee` est absente, mais recherche ensuite, via
/// `GET /repository/commits?ref_name=<ref>&until=<date_cible>&per_page=1`, le commit le plus récent antérieur ou
/// égal à `date_cible` sur cette ref — au lieu du commit de tête courant de [`resoudre_ref_effective`]. Ce mode de
/// résolution (paramètre serveur `until`, documenté par l'API GitLab pour ce point d'entrée) est distinct de celui
/// utilisé côté Sonar (`recuperer_historique_mesures` + `selectionner_point_le_plus_proche`, entièrement côté
/// client) : contrairement au paramètre `search_history` de l'API Sonar, non vérifié contre une instance réelle
/// (cf. en-tête de module de `sonar.rs`), le comportement de `until` sur `repository/commits` est documenté de
/// façon stable par l'API GitLab, ce qui justifie de s'y appuyer directement ici plutôt que de retraiter côté
/// client une page de commits non filtrée.
///
/// # Erreurs
///
/// [`ErreurConnecteur::RefIntrouvable`] si la ref n'existe pas sur le dépôt, ou si aucun commit n'existe sur cette
/// ref avant `date_cible` (liste vide en réponse) ; les autres catégories de [`ErreurConnecteur`] selon le statut
/// ou la forme de la réponse, y compris pour l'appel préalable de résolution de la branche par défaut lorsque
/// `ref_auditee` est absente.
async fn resoudre_ref_effective_a_date(
    url_base: &str,
    credential: &str,
    id_externe: &str,
    ref_auditee: Option<&str>,
    date_cible: &str,
    client: &reqwest::Client,
) -> Result<RefResolue, ErreurConnecteur> {
    let ref_effective = match ref_auditee {
        Some(ref_auditee) => ref_auditee.to_string(),
        None => resoudre_branche_par_defaut(url_base, credential, id_externe, client).await?,
    };

    let url = format!(
        "{}/api/v4/projects/{}/repository/commits",
        url_base.trim_end_matches('/'),
        id_externe
    );
    let reponse = client
        .get(url)
        .header("PRIVATE-TOKEN", credential)
        .query(&[
            ("ref_name", ref_effective.as_str()),
            ("until", date_cible),
            ("per_page", "1"),
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
    let commits = reponse
        .json::<Vec<ReponseCommit>>()
        .await
        .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
            message: erreur.to_string(),
        })?;
    let commit = commits
        .into_iter()
        .next()
        .ok_or_else(|| ErreurConnecteur::RefIntrouvable {
            message: format!(
                "Aucun commit trouvé sur la ref « {ref_effective} » avant la date « {date_cible} »"
            ),
        })?;

    Ok(RefResolue {
        ref_effective,
        sha_tete: commit.id,
        date_commit: commit.committed_date,
    })
}

/// Point d'entrée unique de résolution de ref pour les six opérations d'interrogation historisables (C15-14) :
/// bascule vers [`resoudre_ref_effective_a_date`] quand `date_ciblee` est renseigné, sinon comportement inchangé
/// via [`resoudre_ref_effective`] — un seul point de branchement, plutôt que de dupliquer ce `match` dans chacune
/// des six opérations.
async fn resoudre_ref(
    url_base: &str,
    credential: &str,
    id_externe: &str,
    ref_auditee: Option<&str>,
    date_ciblee: Option<&str>,
    client: &reqwest::Client,
) -> Result<RefResolue, ErreurConnecteur> {
    match date_ciblee {
        Some(date_cible) => {
            resoudre_ref_effective_a_date(
                url_base,
                credential,
                id_externe,
                ref_auditee,
                date_cible,
                client,
            )
            .await
        }
        None => resoudre_ref_effective(url_base, credential, id_externe, ref_auditee, client).await,
    }
}

/// Interprète une date cible d'audit historique (C15-14), reçue de l'Angular via `<input type="date">`
/// (`AAAA-MM-JJ`) ou, plus robustement, au format ISO 8601 complet (`AAAA-MM-JJTHH:MM:SSZ`), comme la borne de fin
/// de journée en UTC : une date sans heure (`AAAA-MM-JJ`) est interprétée comme `23:59:59` ce jour-là plutôt que
/// minuit, pour inclure les commits/mesures survenus au cours de la journée ciblée plutôt que de les exclure par un
/// arrondi vers le bas — décision arbitraire (cf. rapport de développement), aucune règle de gestion ne précisant
/// ce point.
///
/// # Erreurs
///
/// [`ErreurConnecteur::ReponseInattendue`] si `date_cible` n'est ni un horodatage RFC 3339 valide, ni une date
/// `AAAA-MM-JJ` valide.
fn interpreter_date_cible_fin_de_journee(
    date_cible: &str,
) -> Result<chrono::DateTime<chrono::Utc>, ErreurConnecteur> {
    if let Ok(horodatage) = chrono::DateTime::parse_from_rfc3339(date_cible) {
        return Ok(horodatage.with_timezone(&chrono::Utc));
    }
    let date = chrono::NaiveDate::parse_from_str(date_cible, "%Y-%m-%d").map_err(|erreur| {
        ErreurConnecteur::ReponseInattendue {
            message: format!("Date cible « {date_cible} » invalide : {erreur}"),
        }
    })?;
    let fin_de_journee =
        date.and_hms_opt(23, 59, 59)
            .ok_or_else(|| ErreurConnecteur::ReponseInattendue {
                message: format!("Date cible « {date_cible} » invalide"),
            })?;
    Ok(chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(
        fin_de_journee,
        chrono::Utc,
    ))
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
    date_ciblee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatGitlabVitalite, ErreurConnecteur> {
    let resolue = resoudre_ref(
        url_base,
        credential,
        id_externe,
        ref_auditee,
        date_ciblee,
        client,
    )
    .await?;
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
    date_ciblee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatGitlabContributeurs, ErreurConnecteur> {
    let resolue = resoudre_ref(
        url_base,
        credential,
        id_externe,
        ref_auditee,
        date_ciblee,
        client,
    )
    .await?;
    // Fenêtre glissante décalée en mode historique (C15-14) : [date_cible − FENETRE_CONTRIBUTEURS_JOURS ;
    // date_cible] au lieu de [maintenant − FENETRE_CONTRIBUTEURS_JOURS ; maintenant]. `jusqua` n'est transmis en
    // paramètre `until` que si `date_ciblee` est renseigné : en mode régulier, l'absence de `until` (comportement
    // historique inchangé) laisse l'API GitLab par défaut à l'instant présent.
    let jusqua = match date_ciblee {
        Some(date_cible) => interpreter_date_cible_fin_de_journee(date_cible)?,
        None => chrono::Utc::now(),
    };
    let depuis = jusqua - chrono::Duration::days(i64::from(FENETRE_CONTRIBUTEURS_JOURS));

    let mut commits_par_email: std::collections::HashMap<String, (String, u32)> =
        std::collections::HashMap::new();
    for page in 1..=MAX_PAGES_CONTRIBUTEURS {
        let url = format!(
            "{}/api/v4/projects/{}/repository/commits",
            url_base.trim_end_matches('/'),
            id_externe
        );
        let mut parametres = vec![
            ("ref_name", resolue.ref_effective.clone()),
            ("since", depuis.to_rfc3339()),
            ("per_page", TAILLE_PAGE_AUDIT.to_string()),
            ("page", page.to_string()),
        ];
        if date_ciblee.is_some() {
            parametres.push(("until", jusqua.to_rfc3339()));
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

/// Réponse d'une demande de fusion de l'API GitLab, réduite aux champs exploités ici. `merged_at`/`closed_at`
/// (C15-14) ne sont exploités qu'en mode historique, pour reconstituer côté client l'état « ouverte à la date
/// cible » d'une demande de fusion depuis un listing `state=all` (cf. `interroger_merge_requests`) : absents ou
/// `null` pour une demande de fusion encore ouverte, sur le modèle de l'API GitLab elle-même.
#[derive(Debug, Deserialize)]
struct ReponseMergeRequest {
    iid: u64,
    title: String,
    created_at: String,
    #[serde(default)]
    has_conflicts: bool,
    web_url: String,
    #[serde(default)]
    merged_at: Option<String>,
    #[serde(default)]
    closed_at: Option<String>,
}

/// Nombre maximal de pages parcourues lors de la reconstitution complète des demandes de fusion en mode historique
/// (`interroger_merge_requests`, C15-14, `state=all` paginé faute de filtre serveur par date) : même valeur que
/// [`MAX_PAGES_BRANCHES_COMPLETES`], sur le même principe de borne de sécurité arbitraire.
const MAX_PAGES_MERGE_REQUESTS_HISTORIQUE: u32 = MAX_PAGES_BRANCHES_COMPLETES;

/// Interroge les demandes de fusion d'un dépôt GitLab (US-009, `gitlab.merge_requests`) : en mode régulier
/// (`date_ciblee` absent), comportement inchangé (`state=opened`, une seule page). En mode historique (C15-14),
/// aucun filtre serveur par date n'existant sur ce point d'API : listing complet paginé `state=all` (jusqu'à
/// épuisement ou [`MAX_PAGES_MERGE_REQUESTS_HISTORIQUE`]), puis filtrage côté client des demandes de fusion
/// « ouvertes à la date cible » — `created_at ≤ date_cible` et (`merged_at`/`closed_at` absent ou `> date_cible`) ;
/// comparaison lexicographique directe des chaînes ISO 8601, valide pour ce format (cf.
/// `selectionner_point_le_plus_proche` de `sonar.rs` pour le même principe).
///
/// # Erreurs
///
/// Voir [`resoudre_ref_effective`] ; la seconde requête (liste des demandes de fusion, paginée en mode historique)
/// suit le même mapping.
pub(crate) async fn interroger_merge_requests(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    ref_auditee: Option<&str>,
    date_ciblee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatGitlabMergeRequests, ErreurConnecteur> {
    let resolue = resoudre_ref(
        url_base,
        credential,
        id_externe,
        ref_auditee,
        date_ciblee,
        client,
    )
    .await?;

    let mut mr_brutes = Vec::new();
    if let Some(date_cible) = date_ciblee {
        for page in 1..=MAX_PAGES_MERGE_REQUESTS_HISTORIQUE {
            let url = format!(
                "{}/api/v4/projects/{}/merge_requests",
                url_base.trim_end_matches('/'),
                id_externe
            );
            let reponse = client
                .get(url)
                .header("PRIVATE-TOKEN", credential)
                .query(&[
                    ("state", "all"),
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
            let page_mrs = reponse
                .json::<Vec<ReponseMergeRequest>>()
                .await
                .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                    message: erreur.to_string(),
                })?;
            if page_mrs.is_empty() {
                break;
            }
            mr_brutes.extend(page_mrs);
        }
        // Normalisation en fin de journée (C15-14) avant comparaison lexicographique, sur le même principe que
        // [`interroger_contributeurs`] : `date_cible` telle que reçue de l'écran (`AAAA-MM-JJ`, dix caractères) est
        // toujours lexicographiquement inférieure à tout horodatage complet GitLab (`AAAA-MM-JJThh:mm:ssZ`) portant
        // la même date, du seul fait d'être un préfixe plus court — une demande de fusion créée, fusionnée ou
        // fermée le jour exact de la date ciblée était donc jusqu'ici incorrectement exclue/incluse selon le cas.
        // Correction relevée en relecture isolée de cet incrément (cf. rapport de développement).
        let date_cible_normalisee = interpreter_date_cible_fin_de_journee(date_cible)?.to_rfc3339();
        mr_brutes.retain(|mr| {
            let creee_avant_ou_a_la_date = mr.created_at.as_str() <= date_cible_normalisee.as_str();
            let toujours_ouverte_a_la_date = match (&mr.merged_at, &mr.closed_at) {
                (None, None) => true,
                (Some(cloture), None) | (None, Some(cloture)) => {
                    cloture.as_str() > date_cible_normalisee.as_str()
                }
                (Some(fusion), Some(fermeture)) => {
                    fusion.as_str() > date_cible_normalisee.as_str()
                        && fermeture.as_str() > date_cible_normalisee.as_str()
                }
            };
            creee_avant_ou_a_la_date && toujours_ouverte_a_la_date
        });
    } else {
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
        mr_brutes = reponse
            .json::<Vec<ReponseMergeRequest>>()
            .await
            .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                message: erreur.to_string(),
            })?;
    }

    let mr_ouvertes = mr_brutes
        .into_iter()
        .map(|mr| MergeRequestOuverte {
            iid: mr.iid,
            titre: mr.title,
            cree_le: mr.created_at,
            en_conflit: mr.has_conflicts,
            web_url: mr.web_url,
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
/// directs (`/members`), un second la totalité y compris hérités (`/members/all`). L'API GitLab n'exposant pas
/// l'email public d'un membre arbitraire à ce point d'entrée, `emailPublic` reste toujours absent.
///
/// US-017 (ventilation des membres sur la Fiche projet) : chaque membre porte `direct` (présent dans `/members`)
/// et `groupes_invites` (chemins complets des groupes invités au projet — `shared_with_groups` de
/// `GET /projects/{id}` — dont il est membre direct, cf. [`recuperer_membres_groupes_invites`]). Le groupe ancêtre
/// précis d'un membre hérité n'est **pas** recherché (décision fonctionnelle validée par un humain, pour limiter
/// les appels et les problèmes de droits) : un membre ni `direct` ni rattaché à un groupe invité relève, par
/// déduction, de l'arborescence du projet. Toute anomalie sur les appels propres à cette ventilation est absorbée
/// silencieusement (les membres concernés retombent alors en « hérités »), sans faire échouer l'interrogation.
///
/// Chacun des deux appels de liste de membres du dépôt pagine sur les pages de résultats successives, jusqu'à
/// épuisement ou [`MAX_PAGES_CONTRIBUTEURS`] (R10-02 : un dépôt de plus de cent membres voyait jusqu'ici sa liste
/// silencieusement tronquée par un unique appel non paginé), sur le même principe que [`interroger_contributeurs`].
///
/// # Erreurs
///
/// Voir [`resoudre_ref_effective`] ; les mêmes catégories s'appliquent aux deux appels paginés de liste de membres
/// du dépôt (jamais aux appels de la ventilation US-017, dont les anomalies sont absorbées).
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
            let mut membres = Vec::new();
            for page in 1..=MAX_PAGES_CONTRIBUTEURS {
                let reponse = client
                    .get(url.as_str())
                    .header("PRIVATE-TOKEN", &credential)
                    .query(&[
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
                let page_membres =
                    reponse
                        .json::<Vec<ReponseMembre>>()
                        .await
                        .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                            message: erreur.to_string(),
                        })?;
                if page_membres.is_empty() {
                    break;
                }
                membres.extend(page_membres);
            }
            Ok(membres)
        }
    };

    let membres_directs = recuperer_membres("").await?;
    let membres_tous = recuperer_membres("/all").await?;
    let usernames_directs: HashSet<String> = membres_directs
        .into_iter()
        .map(|membre| membre.username)
        .collect();

    // US-017 : `(chemin_complet_du_groupe_invité, usernames_de_ses_membres_directs)`, dégradation silencieuse en
    // liste vide en cas d'anomalie (les membres concernés seront alors classés « hérités »).
    let groupes_invites =
        recuperer_membres_groupes_invites(url_base, credential, id_externe, client).await;

    let membres = membres_tous
        .into_iter()
        .map(|membre| {
            let mut chemins_groupes: Vec<String> = groupes_invites
                .iter()
                .filter(|(_, usernames)| usernames.contains(&membre.username))
                .map(|(chemin, _)| chemin.clone())
                .collect();
            // Tri du plus précis (le plus de segments de chemin) vers la racine ; départage alphabétique pour un
            // rendu stable entre deux interrogations.
            chemins_groupes.sort_by(|a, b| {
                b.split('/')
                    .count()
                    .cmp(&a.split('/').count())
                    .then_with(|| a.cmp(b))
            });
            MembreGitlab {
                direct: usernames_directs.contains(&membre.username),
                groupes_invites: chemins_groupes,
                username: membre.username,
                nom: membre.name,
                niveau_acces: membre.access_level,
                email_public: None,
            }
        })
        .collect();

    Ok(ResultatGitlabMembres {
        source_id: source_id.to_string(),
        ref_effective: resolue.ref_effective,
        sha_tete: resolue.sha_tete,
        membres,
    })
}

/// Groupe invité au projet (`shared_with_groups` de `GET /projects/{id}`), réduit aux seuls champs exploités par la
/// ventilation des membres de la Fiche projet (US-017).
#[derive(Debug, Deserialize)]
struct ReponseGroupePartage {
    group_id: u64,
    group_full_path: String,
}

/// Réponse de `GET /projects/{id}` réduite à la seule liste des groupes invités (US-017), distincte de
/// [`ReponseProjet`] (résolution de branche par défaut et statistiques) pour ne pas coupler les deux usages.
#[derive(Debug, Deserialize)]
struct ReponseProjetPartages {
    #[serde(default)]
    shared_with_groups: Vec<ReponseGroupePartage>,
}

/// Récupère, pour chaque groupe invité au projet (`shared_with_groups`), l'ensemble des noms d'utilisateur de ses
/// membres directs (`GET /groups/{id}/members`, paginé), pour la ventilation des membres du dépôt sur la Fiche
/// projet (US-017).
///
/// Dégradation silencieuse (décision fonctionnelle validée par un humain, cf. [`interroger_membres`]) : une anomalie
/// sur `GET /projects/{id}` rend la liste entièrement vide ; une anomalie sur un groupe invité donné ignore ce seul
/// groupe. Les membres non rattachés à un groupe invité résolu seront classés « hérités de l'arborescence ».
///
/// Chaque entrée retournée est `(group_full_path, usernames)` ; l'ordre de `shared_with_groups` est préservé (le
/// tri du plus précis vers la racine relève de l'affichage, cf. [`interroger_membres`]).
async fn recuperer_membres_groupes_invites(
    url_base: &str,
    credential: &str,
    id_externe: &str,
    client: &reqwest::Client,
) -> Vec<(String, HashSet<String>)> {
    let Ok(groupes) = recuperer_groupes_invites(url_base, credential, id_externe, client).await
    else {
        return Vec::new();
    };
    let mut resultat = Vec::new();
    for groupe in groupes {
        if let Ok(usernames) =
            recuperer_usernames_membres_groupe(url_base, credential, groupe.group_id, client).await
        {
            resultat.push((groupe.group_full_path, usernames));
        }
        // Groupe invité inaccessible : silencieusement ignoré, ses membres retomberont en « hérités » (US-017).
    }
    resultat
}

/// Liste les groupes invités au projet via `GET /projects/{id}` (US-017).
///
/// # Erreurs
///
/// [`ErreurConnecteur::ReponseInattendue`] pour tout statut non 2xx ou toute réponse non désérialisable — les
/// catégories précises importent peu, l'appelant absorbant l'erreur (cf. [`recuperer_membres_groupes_invites`]).
async fn recuperer_groupes_invites(
    url_base: &str,
    credential: &str,
    id_externe: &str,
    client: &reqwest::Client,
) -> Result<Vec<ReponseGroupePartage>, ErreurConnecteur> {
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
    if !reponse.status().is_success() {
        return Err(ErreurConnecteur::ReponseInattendue {
            message: format!("Statut HTTP {} reçu", reponse.status().as_u16()),
        });
    }
    let projet = reponse
        .json::<ReponseProjetPartages>()
        .await
        .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
            message: erreur.to_string(),
        })?;
    Ok(projet.shared_with_groups)
}

/// Récupère les noms d'utilisateur des membres directs d'un groupe (`GET /groups/{id}/members`, paginé jusqu'à
/// épuisement ou [`MAX_PAGES_CONTRIBUTEURS`], sur le modèle de [`interroger_membres`]), pour la ventilation US-017.
///
/// # Erreurs
///
/// [`ErreurConnecteur::ReponseInattendue`] pour tout statut non 2xx ou toute page non désérialisable ; l'erreur
/// réseau brute est mappée par [`erreur_depuis_reqwest`]. L'appelant absorbe l'erreur (cf.
/// [`recuperer_membres_groupes_invites`]).
async fn recuperer_usernames_membres_groupe(
    url_base: &str,
    credential: &str,
    group_id: u64,
    client: &reqwest::Client,
) -> Result<HashSet<String>, ErreurConnecteur> {
    let url = format!(
        "{}/api/v4/groups/{}/members",
        url_base.trim_end_matches('/'),
        group_id
    );
    let mut usernames = HashSet::new();
    for page in 1..=MAX_PAGES_CONTRIBUTEURS {
        let reponse = client
            .get(url.as_str())
            .header("PRIVATE-TOKEN", credential)
            .query(&[
                ("per_page", TAILLE_PAGE_AUDIT),
                ("page", page.to_string().as_str()),
            ])
            .send()
            .await
            .map_err(|erreur| erreur_depuis_reqwest(&erreur))?;
        if !reponse.status().is_success() {
            return Err(ErreurConnecteur::ReponseInattendue {
                message: format!("Statut HTTP {} reçu", reponse.status().as_u16()),
            });
        }
        let page_membres = reponse
            .json::<Vec<ReponseMembre>>()
            .await
            .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                message: erreur.to_string(),
            })?;
        if page_membres.is_empty() {
            break;
        }
        usernames.extend(page_membres.into_iter().map(|membre| membre.username));
    }
    Ok(usernames)
}

/// Nombre maximal de pages parcourues lors de la liste complète des branches ou des demandes de fusion ouvertes
/// d'un dépôt (`interroger_branches_completes`) : borne de sécurité arbitraire (cf. rapport de développement de
/// cette phase), sur le même principe que [`MAX_PAGES_CONTRIBUTEURS`].
const MAX_PAGES_BRANCHES_COMPLETES: u32 = 20;

/// Commit de tête d'une branche, tel que retourné par `GET .../repository/branches` (réduit au seul champ
/// exploité par `interroger_branches_completes`).
#[derive(Debug, Deserialize)]
struct ReponseCommitBranche {
    committed_date: String,
}

/// Réponse d'un élément de la liste complète des branches de l'API GitLab (à la différence de [`ReponseBranche`],
/// exploitée par l'autocomplétion US-008), réduite aux champs exploités par `interroger_branches_completes`.
#[derive(Debug, Deserialize)]
struct ReponseBrancheComplete {
    name: String,
    commit: ReponseCommitBranche,
}

/// Réponse d'une demande de fusion ouverte, réduite à sa branche source (seul champ exploité par
/// `interroger_branches_completes` pour déterminer `avecMR`).
#[derive(Debug, Deserialize)]
struct ReponseMergeRequestBrancheSource {
    source_branch: String,
}

/// Interroge la liste complète des branches d'un dépôt GitLab pour le catalogue figé des résultats d'audit
/// (`gitlab.branches`, RG-030), distincte de [`interroger_branches`] ci-dessus (autocomplétion US-008, limitée à
/// [`TAILLE_PAGE_BRANCHES`] éléments) : nom de fonction retenu par symétrie avec les autres opérations
/// d'interrogation de ce module (`interroger_membres`, `interroger_dependances`), faute de nom distinct proposé par
/// `docs/02_documentation/13_conceptionDetaillee.md`, qui nomme `interrogerBranches` les deux opérations sans
/// distinction — décision arbitraire signalée dans le rapport de développement de cette phase.
///
/// Chaque branche est enrichie de `avecMR` (présence d'au moins une demande de fusion ouverte dont elle est la
/// branche source, RG-030) et de la date du commit de tête de la branche elle-même (`dernierCommitLe`, distincte du
/// commit de tête de la ref auditée porté par `ResultatGitlabBranches.shaTete`). Ne porte ni `rebasee` ni
/// `nommageConforme` (cf. commentaire de [`Branche`]).
///
/// # Erreurs
///
/// Voir [`resoudre_ref_effective`] ; les mêmes catégories s'appliquent aux appels de pagination des branches et des
/// demandes de fusion ouvertes.
pub(crate) async fn interroger_branches_completes(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    ref_auditee: Option<&str>,
    date_ciblee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatGitlabBranches, ErreurConnecteur> {
    let resolue = resoudre_ref(
        url_base,
        credential,
        id_externe,
        ref_auditee,
        date_ciblee,
        client,
    )
    .await?;

    let mut branches_brutes = Vec::new();
    for page in 1..=MAX_PAGES_BRANCHES_COMPLETES {
        let url = format!(
            "{}/api/v4/projects/{}/repository/branches",
            url_base.trim_end_matches('/'),
            id_externe
        );
        let reponse = client
            .get(url)
            .header("PRIVATE-TOKEN", credential)
            .query(&[
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
        let page_branches = reponse
            .json::<Vec<ReponseBrancheComplete>>()
            .await
            .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                message: erreur.to_string(),
            })?;
        if page_branches.is_empty() {
            break;
        }
        branches_brutes.extend(page_branches);
    }

    let mut noms_branches_avec_mr = HashSet::new();
    for page in 1..=MAX_PAGES_BRANCHES_COMPLETES {
        let url = format!(
            "{}/api/v4/projects/{}/merge_requests",
            url_base.trim_end_matches('/'),
            id_externe
        );
        let reponse = client
            .get(url)
            .header("PRIVATE-TOKEN", credential)
            .query(&[
                ("state", "opened"),
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
        let page_mrs = reponse
            .json::<Vec<ReponseMergeRequestBrancheSource>>()
            .await
            .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                message: erreur.to_string(),
            })?;
        if page_mrs.is_empty() {
            break;
        }
        for mr in page_mrs {
            noms_branches_avec_mr.insert(mr.source_branch);
        }
    }

    let branches: Vec<Branche> = branches_brutes
        .into_iter()
        .map(|branche| Branche {
            avec_mr: noms_branches_avec_mr.contains(&branche.name),
            nom: branche.name,
            dernier_commit_le: branche.commit.committed_date,
        })
        .collect();

    Ok(ResultatGitlabBranches {
        source_id: source_id.to_string(),
        ref_effective: resolue.ref_effective,
        sha_tete: resolue.sha_tete,
        branches,
    })
}

/// Noms de fichiers manifestes reconnus par `interroger_dependances` (périmètre V1, cf. en-tête de module) :
/// comparaison sur le seul basename de l'entrée d'arborescence, insensible au sous-répertoire (ex.
/// `module-a/pom.xml` reconnu comme `pom.xml`). Point d'extension pour un futur écosystème : ajouter le nom de
/// fichier ici, puis une branche dans le `match` de `interroger_dependances` déléguant au parseur dédié.
const NOMS_MANIFESTES_RECONNUS: [&str; 3] = ["pom.xml", "package.json", "build.gradle"];

/// Construit l'URL de lecture du contenu brut d'un fichier du dépôt (`GET .../repository/files/{chemin}/raw`), en
/// encodant le chemin via le crate `url` plutôt qu'un simple `format!`, sur le même principe que
/// [`url_commit_ref`] : un chemin de manifeste peut contenir `/` (ex. `module-a/pom.xml`), qui doit être
/// percent-encodé pour rester un unique segment de chemin plutôt que d'introduire un sous-chemin.
fn url_fichier_manifeste(
    url_base: &str,
    id_externe: &str,
    chemin_manifeste: &str,
) -> Result<url::Url, ErreurConnecteur> {
    let mut url = url::Url::parse(&format!(
        "{}/api/v4/projects/{}/repository/files",
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
        .push(chemin_manifeste)
        .push("raw");
    Ok(url)
}

/// Récupère le contenu brut d'un manifeste déjà localisé dans l'arborescence, `None` si celui-ci a disparu entre le
/// listage de l'arborescence et cette lecture (course rare, jamais une anomalie : cf. `interroger_dependances`,
/// « absence de manifeste ≠ anomalie »).
///
/// # Erreurs
///
/// Les mêmes catégories que [`resoudre_ref_effective`], hormis le statut 404 (traité comme une absence, cf.
/// ci-dessus plutôt que comme [`ErreurConnecteur::ReponseInattendue`]).
async fn recuperer_contenu_manifeste(
    url_base: &str,
    credential: &str,
    id_externe: &str,
    chemin_manifeste: &str,
    ref_effective: &str,
    client: &reqwest::Client,
) -> Result<Option<String>, ErreurConnecteur> {
    let mut url = url_fichier_manifeste(url_base, id_externe, chemin_manifeste)?;
    url.query_pairs_mut().append_pair("ref", ref_effective);

    let reponse = client
        .get(url)
        .header("PRIVATE-TOKEN", credential)
        .send()
        .await
        .map_err(|erreur| erreur_depuis_reqwest(&erreur))?;
    let statut = reponse.status();
    if statut.as_u16() == 404 {
        return Ok(None);
    }
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
    let contenu = reponse
        .text()
        .await
        .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
            message: erreur.to_string(),
        })?;
    Ok(Some(contenu))
}

/// Décode le nom qualifié (sans espace de noms) d'un élément XML `quick_xml` en `String`, sans assertion `as`/
/// panique possible sur un contenu non UTF-8 (`String::from_utf8_lossy`, best-effort assumé pour ce parseur, cf.
/// en-tête de module).
fn nom_element_xml(nom_qualifie: &[u8]) -> String {
    String::from_utf8_lossy(nom_qualifie).into_owned()
}

/// Représentation brute (non résolue) d'un manifeste `pom.xml`, obtenue par [`parser_pom_xml_brut`] avant toute
/// résolution de la chaîne de parents ou des properties Maven (cf. [`resoudre_dependances_pom`]). Distincte de
/// [`Dependance`] (type de sortie final, inchangé par cette résolution).
#[derive(Debug, Clone, Default)]
struct PomBrut {
    /// `<project><groupId>` déclaré directement dans ce pom (jamais hérité en soi ; `None` si absent, auquel cas
    /// hérité du `<parent>` le cas échéant, cf. [`fusionner_properties`]).
    group_id: Option<String>,
    /// `<project><artifactId>`. Jamais hérité en Maven, `Option` uniquement par robustesse best-effort.
    artifact_id: Option<String>,
    /// `<project><version>` déclarée directement dans ce pom (`None` si absente, auquel cas héritée du `<parent>`
    /// le cas échéant).
    version: Option<String>,
    /// `<project><parent>`, `None` si absent.
    parent: Option<ParentBrut>,
    /// `<project><properties>` déclarées localement, clé -> valeur littérale non résolue.
    properties: HashMap<String, String>,
    /// `<project><dependencyManagement><dependencies><dependency>` déclarées localement (versions potentiellement
    /// encore des tokens `${...}` non substitués à ce stade).
    gestion_dependances: Vec<DependanceBrute>,
    /// `<project><dependencies><dependency>` déclarées localement, hors `dependencyManagement`.
    dependances: Vec<DependanceBrute>,
}

/// Coordonnées et localisation du `<parent>` d'un [`PomBrut`].
#[derive(Debug, Clone, Default)]
struct ParentBrut {
    group_id: String,
    artifact_id: String,
    version: String,
    /// Texte littéral de `<relativePath>` si l'élément est présent (peut être une chaîne vide) ; `None` si
    /// l'élément est totalement absent — dans ce cas la valeur par défaut Maven `../pom.xml` est appliquée au
    /// moment de la résolution ([`construire_chaine_parents`]), pas ici.
    chemin_relatif: Option<String>,
}

/// Une `<dependency>` (directe ou gérée) telle qu'écrite dans le XML, avant résolution de sa version.
#[derive(Debug, Clone, Default)]
struct DependanceBrute {
    group_id: Option<String>,
    artifact_id: Option<String>,
    /// Version littérale, potentiellement un token `${...}` ; `None` si l'élément `<version>` est absent.
    version: Option<String>,
}

/// Cible d'une `<dependency>` capturée lors du parsing, déterminée à l'ouverture de l'élément selon la profondeur
/// de `<dependencyManagement>` courante : directement déclarée sous `<dependencies>`, ou gérée sous
/// `<dependencyManagement><dependencies>` (capturée mais jamais traitée comme une dépendance effective, cf.
/// [`resoudre_dependances_pom`]).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CibleDependance {
    Directe,
    Geree,
}

/// Champ scalaire actuellement capturé (texte de l'élément XML en cours) par [`parser_pom_xml_brut`], en dehors du
/// cas particulier d'une property (dont la clé est le nom de balise lui-même).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ChampActif {
    ProjetGroupId,
    ProjetArtifactId,
    ProjetVersion,
    ParentGroupId,
    ParentArtifactId,
    ParentVersion,
    ParentCheminRelatif,
    DependanceGroupId,
    DependanceArtifactId,
    DependanceVersion,
}

/// Parseur best-effort d'un manifeste `pom.xml` (Maven) : extrait la structure brute non résolue du pom (identité
/// du projet, `<parent>`, `<properties>`, `<dependencyManagement>` et `<dependencies>`), sans tenter aucune
/// résolution de property ni de chaîne de parents — cette résolution est faite séparément par
/// [`resoudre_dependances_pom`], qui a besoin de connaître les autres pom.xml du dépôt (cf.
/// [`interroger_dependances`]). Un XML malformé ne fait jamais échouer l'audit : l'analyse s'arrête et retourne la
/// structure déjà remplie avant le point de rupture (algorithme figé, cf. rapport de développement de cette
/// phase). Limite assumée, inchangée par rapport au parseur précédent : un `<properties>`/`<dependencies>` niché
/// ailleurs que directement sous `<project>`/`<parent>` (ex. dans un `<profile>`) est capturé de la même façon peu
/// discriminante qu'un bloc de premier niveau.
fn parser_pom_xml_brut(contenu: &str) -> PomBrut {
    use quick_xml::events::Event;
    use quick_xml::reader::Reader;

    let mut lecteur = Reader::from_str(contenu);
    lecteur.config_mut().trim_text(true);

    let mut pile: Vec<String> = Vec::new();
    let mut profondeur_gestion_dependances = 0u32;
    let mut pom = PomBrut::default();
    let mut parent_courant: Option<ParentBrut> = None;
    let mut dependance_courante: Option<DependanceBrute> = None;
    let mut cible_dependance_courante: Option<CibleDependance> = None;
    let mut champ_actif: Option<ChampActif> = None;
    let mut property_active: Option<String> = None;
    let mut texte_courant = String::new();

    loop {
        match lecteur.read_event() {
            Ok(Event::Start(element)) => {
                let nom = nom_element_xml(element.name().as_ref());
                let parent = pile.last().map(String::as_str);

                if nom == "dependencyManagement" {
                    profondeur_gestion_dependances += 1;
                }

                if nom == "dependency" && parent == Some("dependencies") {
                    dependance_courante = Some(DependanceBrute::default());
                    cible_dependance_courante = Some(if profondeur_gestion_dependances > 0 {
                        CibleDependance::Geree
                    } else {
                        CibleDependance::Directe
                    });
                }

                if nom == "parent" && parent == Some("project") {
                    parent_courant = Some(ParentBrut::default());
                }

                champ_actif = if parent == Some("project") {
                    match nom.as_str() {
                        "groupId" => Some(ChampActif::ProjetGroupId),
                        "artifactId" => Some(ChampActif::ProjetArtifactId),
                        "version" => Some(ChampActif::ProjetVersion),
                        _ => None,
                    }
                } else if parent == Some("parent") {
                    match nom.as_str() {
                        "groupId" => Some(ChampActif::ParentGroupId),
                        "artifactId" => Some(ChampActif::ParentArtifactId),
                        "version" => Some(ChampActif::ParentVersion),
                        "relativePath" => Some(ChampActif::ParentCheminRelatif),
                        _ => None,
                    }
                } else if parent == Some("dependency") {
                    match nom.as_str() {
                        "groupId" => Some(ChampActif::DependanceGroupId),
                        "artifactId" => Some(ChampActif::DependanceArtifactId),
                        "version" => Some(ChampActif::DependanceVersion),
                        _ => None,
                    }
                } else {
                    None
                };

                property_active = if parent == Some("properties") {
                    Some(nom.clone())
                } else {
                    None
                };

                pile.push(nom);
                texte_courant.clear();
            }
            Ok(Event::Text(texte)) => {
                if let Ok(valeur) = texte.decode() {
                    texte_courant.push_str(&valeur);
                }
            }
            Ok(Event::End(element)) => {
                let nom = nom_element_xml(element.name().as_ref());
                let valeur = texte_courant.trim().to_string();

                if let Some(champ) = champ_actif {
                    match champ {
                        ChampActif::ProjetGroupId => pom.group_id = Some(valeur.clone()),
                        ChampActif::ProjetArtifactId => pom.artifact_id = Some(valeur.clone()),
                        ChampActif::ProjetVersion => pom.version = Some(valeur.clone()),
                        ChampActif::ParentGroupId => {
                            if let Some(p) = parent_courant.as_mut() {
                                p.group_id = valeur.clone();
                            }
                        }
                        ChampActif::ParentArtifactId => {
                            if let Some(p) = parent_courant.as_mut() {
                                p.artifact_id = valeur.clone();
                            }
                        }
                        ChampActif::ParentVersion => {
                            if let Some(p) = parent_courant.as_mut() {
                                p.version = valeur.clone();
                            }
                        }
                        ChampActif::ParentCheminRelatif => {
                            if let Some(p) = parent_courant.as_mut() {
                                p.chemin_relatif = Some(valeur.clone());
                            }
                        }
                        ChampActif::DependanceGroupId => {
                            if let Some(d) = dependance_courante.as_mut() {
                                d.group_id = Some(valeur.clone());
                            }
                        }
                        ChampActif::DependanceArtifactId => {
                            if let Some(d) = dependance_courante.as_mut() {
                                d.artifact_id = Some(valeur.clone());
                            }
                        }
                        ChampActif::DependanceVersion => {
                            if let Some(d) = dependance_courante.as_mut() {
                                d.version = Some(valeur.clone());
                            }
                        }
                    }
                } else if let Some(cle) = property_active.as_ref() {
                    pom.properties.insert(cle.clone(), valeur);
                }

                if nom == "dependency"
                    && let (Some(d), Some(cible)) =
                        (dependance_courante.take(), cible_dependance_courante.take())
                {
                    match cible {
                        CibleDependance::Directe => pom.dependances.push(d),
                        CibleDependance::Geree => pom.gestion_dependances.push(d),
                    }
                }

                if nom == "parent"
                    && let Some(p) = parent_courant.take()
                    && !p.group_id.is_empty()
                    && !p.artifact_id.is_empty()
                    && !p.version.is_empty()
                {
                    pom.parent = Some(p);
                }

                if nom == "dependencyManagement" && profondeur_gestion_dependances > 0 {
                    profondeur_gestion_dependances -= 1;
                }

                pile.pop();
                champ_actif = None;
                property_active = None;
                texte_courant.clear();
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
    }

    pom
}

/// Résout un `<relativePath>` de `<parent>` (littéral, non vide) en un chemin de dépôt normalisé, relatif à la
/// racine, par pure manipulation de chaînes (le répertoire du pom.xml courant est déjà connu via son chemin dans
/// l'arborescence déjà récupérée ; aucun accès disque). Si le dernier composant résolu se termine par `.xml`, il
/// désigne directement un fichier pom ; sinon `pom.xml` lui est implicitement ajouté (comportement réel de Maven
/// pour `relativePath`).
fn resoudre_chemin_parent(chemin_pom_courant: &str, chemin_relatif: &str) -> String {
    let mut segments: Vec<&str> = chemin_pom_courant.split('/').collect();
    segments.pop();

    for composant in chemin_relatif.split('/') {
        match composant {
            "" | "." => {}
            ".." => {
                segments.pop();
            }
            autre => segments.push(autre),
        }
    }

    if segments
        .last()
        .is_some_and(|dernier| dernier.ends_with(".xml"))
    {
        segments.join("/")
    } else {
        segments.push("pom.xml");
        segments.join("/")
    }
}

/// Profondeur maximale suivie lors de la résolution d'une chaîne de `<parent>` (garde anti-cycle et anti-
/// dénormalisation) : au-delà, la résolution s'arrête silencieusement, jamais en erreur d'audit.
const PROFONDEUR_MAX_CHAINE_PARENTS: usize = 10;

/// Index `(groupId, artifactId) -> chemin de dépôt` des `pom.xml` parsés déclarant une identité complète
/// (`<groupId>` et `<artifactId>` explicitement présents dans le pom lui-même). Permet de rattacher un `<parent>`
/// à son `pom.xml` du dépôt par ses **coordonnées** plutôt que par `<parent><relativePath>` — plus robuste en
/// multi-modules où les modules ne sont pas tous exactement un cran sous la racine, ou déclarent un
/// `<relativePath>` inexact, ou n'en déclarent pas (le défaut Maven `../pom.xml` ne menant alors nulle part). En
/// cas de doublon de coordonnées (rare : deux `pom.xml` de même `groupId:artifactId`), la première occurrence dans
/// l'ordre de découverte de l'arborescence est conservée.
fn indexer_poms_par_coordonnees(
    poms_bruts_ordonnes: &[(String, PomBrut)],
) -> HashMap<(String, String), String> {
    let mut index = HashMap::new();
    for (chemin, pom) in poms_bruts_ordonnes {
        if let (Some(groupe), Some(artefact)) = (pom.group_id.as_ref(), pom.artifact_id.as_ref()) {
            index
                .entry((groupe.clone(), artefact.clone()))
                .or_insert_with(|| chemin.clone());
        }
    }
    index
}

/// Reconstitue la chaîne des ancêtres disponibles d'un pom.xml du dépôt, du plus proche au plus lointain. Le pom
/// parent est cherché d'abord par les **coordonnées `<parent>`** (`groupId` + `artifactId`) dans
/// `index_coordonnees` ([`indexer_poms_par_coordonnees`]), puis, en repli seulement, par le chemin résolu depuis
/// `<parent><relativePath>` (ou son défaut Maven `../pom.xml`) via [`resoudre_chemin_parent`]. S'arrête dès que :
/// le pom courant ne déclare pas de `<parent>` ; ni les coordonnées ni un `<relativePath>` non vide ne désignent
/// un `pom.xml` connu (parent hors du dépôt audité, jamais une anomalie) ; le chemin résolu a déjà été visité
/// (cycle) ; ou [`PROFONDEUR_MAX_CHAINE_PARENTS`] est atteinte.
fn construire_chaine_parents<'a>(
    chemin_pom: &str,
    poms_bruts: &'a HashMap<String, PomBrut>,
    index_coordonnees: &HashMap<(String, String), String>,
) -> Vec<&'a PomBrut> {
    let mut chaine = Vec::new();
    let mut visites: HashSet<String> = HashSet::new();
    visites.insert(chemin_pom.to_string());
    let mut chemin_courant = chemin_pom.to_string();

    while chaine.len() < PROFONDEUR_MAX_CHAINE_PARENTS {
        let Some(pom_courant) = poms_bruts.get(&chemin_courant) else {
            break;
        };
        let Some(parent) = pom_courant.parent.as_ref() else {
            break;
        };
        let Some(chemin_parent) = index_coordonnees
            .get(&(parent.group_id.clone(), parent.artifact_id.clone()))
            .cloned()
            .or_else(|| {
                let relatif = parent.chemin_relatif.as_deref().unwrap_or("../pom.xml");
                (!relatif.is_empty()).then(|| resoudre_chemin_parent(&chemin_courant, relatif))
            })
        else {
            break;
        };
        if visites.contains(&chemin_parent) {
            break;
        }
        let Some(pom_parent) = poms_bruts.get(&chemin_parent) else {
            break;
        };
        chaine.push(pom_parent);
        visites.insert(chemin_parent.clone());
        chemin_courant = chemin_parent;
    }

    chaine
}

/// Fusionne les `<properties>` d'un pom.xml avec celles de sa chaîne d'ancêtres disponible (résultat de
/// [`construire_chaine_parents`], du plus proche au plus lointain) — l'enfant l'emporte sur le parent, et un
/// parent plus proche l'emporte sur un parent plus lointain en cas de clé en conflit — puis complète avec les
/// properties implicites Maven `project.groupId`/`project.artifactId`/`project.version`, calculées pour ce pom
/// (héritage de `groupId`/`version` depuis le premier ancêtre de la chaîne qui les déclare, si absents du pom
/// courant ; `artifactId` n'est en revanche jamais hérité en Maven). Limite assumée : ces properties implicites
/// sont celles du pom en cours de résolution, jamais recalculées pour chaque ancêtre individuellement lors de la
/// résolution de son propre `dependencyManagement` — écart mineur face à la sémantique Maven réelle par module,
/// accepté pour ce périmètre.
fn fusionner_properties(pom: &PomBrut, chaine_parents: &[&PomBrut]) -> HashMap<String, String> {
    let mut properties = HashMap::new();
    for ancetre in chaine_parents.iter().rev() {
        properties.extend(ancetre.properties.clone());
    }
    properties.extend(pom.properties.clone());

    let group_id_effectif = pom.group_id.clone().or_else(|| {
        chaine_parents
            .iter()
            .find_map(|ancetre| ancetre.group_id.clone())
    });
    let version_effective = pom.version.clone().or_else(|| {
        chaine_parents
            .iter()
            .find_map(|ancetre| ancetre.version.clone())
    });

    if let Some(groupe) = group_id_effectif {
        properties.insert("project.groupId".to_string(), groupe);
    }
    if let Some(version) = version_effective {
        properties.insert("project.version".to_string(), version);
    }
    if let Some(artefact) = pom.artifact_id.clone() {
        properties.insert("project.artifactId".to_string(), artefact);
    }

    properties
}

/// Substitue chaque token `${clé}` d'un texte de version par la valeur correspondante trouvée dans `properties`
/// (correspondance exacte de la clé). Un token dont la clé n'est trouvée dans aucune property de la chaîne de
/// parents disponible est laissé tel quel, littéralement (décision produit : property non résolue conservée dans
/// le résultat plutôt que d'exclure la dépendance). Analyse manuelle du texte (recherche de paires `${` / `}`),
/// sans dépendance regex supplémentaire ; aucune re-substitution récursive de la valeur substituée (pas de
/// résolution en chaîne de properties imbriquées, hors périmètre).
fn substituer_properties(texte: &str, properties: &HashMap<String, String>) -> String {
    let mut resultat = String::with_capacity(texte.len());
    let mut reste = texte;

    while let Some(debut) = reste.find("${") {
        resultat.push_str(&reste[..debut]);
        let apres_ouverture = &reste[debut + 2..];
        match apres_ouverture.find('}') {
            Some(fin) => {
                let cle = &apres_ouverture[..fin];
                match properties.get(cle) {
                    Some(valeur) => resultat.push_str(valeur),
                    None => {
                        resultat.push_str("${");
                        resultat.push_str(cle);
                        resultat.push('}');
                    }
                }
                reste = &apres_ouverture[fin + 1..];
            }
            None => {
                resultat.push_str(&reste[debut..]);
                return resultat;
            }
        }
    }
    resultat.push_str(reste);

    resultat
}

/// Insère dans `gestion` chaque entrée complète (`groupId`/`artifactId`/`version` tous présents) de `entrees`, une
/// insertion plus tardive écrasant une précédente pour une même coordonnée `(groupId, artifactId)`.
fn inserer_gestion_dependances(
    gestion: &mut HashMap<(String, String), String>,
    entrees: &[DependanceBrute],
) {
    for entree in entrees {
        if let (Some(groupe), Some(artefact), Some(version)) =
            (&entree.group_id, &entree.artifact_id, &entree.version)
        {
            gestion.insert((groupe.clone(), artefact.clone()), version.clone());
        }
    }
}

/// Fusionne le `<dependencyManagement>` d'un pom.xml avec celui de sa chaîne d'ancêtres disponible — l'enfant
/// l'emporte sur le parent pour une même coordonnée `(groupId, artifactId)` en conflit — puis substitue les tokens
/// `${...}` de chaque version gérée retenue via les `properties` déjà fusionnées ([`fusionner_properties`]). Une
/// entrée sans `groupId`/`artifactId`/`version` complets est silencieusement ignorée (best-effort, symétrique à
/// l'exclusion actuelle d'une dépendance sans version).
fn fusionner_gestion_dependances(
    pom: &PomBrut,
    chaine_parents: &[&PomBrut],
    properties: &HashMap<String, String>,
) -> HashMap<(String, String), String> {
    let mut gestion: HashMap<(String, String), String> = HashMap::new();

    for ancetre in chaine_parents.iter().rev() {
        inserer_gestion_dependances(&mut gestion, &ancetre.gestion_dependances);
    }
    inserer_gestion_dependances(&mut gestion, &pom.gestion_dependances);

    gestion
        .into_iter()
        .map(|(cle, version)| (cle, substituer_properties(&version, properties)))
        .collect()
}

/// Produit les [`Dependance`] finales d'un pom.xml à partir de sa forme brute et de la chaîne de ses ancêtres
/// disponibles déjà résolue ([`construire_chaine_parents`], éventuellement vide pour un pom sans parent ou dont le
/// parent n'est pas dans le dépôt audité). Pour chaque `<dependency>` directement déclarée du pom (jamais celles
/// de `dependencyManagement` lui-même, portée V1 préservée) : ignore silencieusement toute entrée sans
/// `groupId`/`artifactId` ; retient la version littérale si déclarée, sinon celle du `dependencyManagement`
/// fusionné pour la même coordonnée, sinon exclut silencieusement la dépendance (aucune version déterminable,
/// comportement V1 préservé) ; substitue enfin les tokens `${...}` de la version retenue (token non résolu laissé
/// littéral, cf. [`substituer_properties`]).
///
/// `chemin_manifeste` est le chemin réel du `pom.xml` dans le dépôt (ex. `module-a/pom.xml`), reporté tel quel
/// dans [`Dependance::manifeste`] : il distingue les modules d'un même dépôt en aval (notamment la déduplication
/// de la fiche projet), là où l'ancien littéral `"pom.xml"` les confondait.
fn resoudre_dependances_pom(
    pom: &PomBrut,
    chaine_parents: &[&PomBrut],
    chemin_manifeste: &str,
) -> Vec<Dependance> {
    let properties = fusionner_properties(pom, chaine_parents);
    let gestion = fusionner_gestion_dependances(pom, chaine_parents, &properties);

    pom.dependances
        .iter()
        .filter_map(|dependance| {
            let (Some(groupe), Some(artefact)) = (
                dependance.group_id.as_ref(),
                dependance.artifact_id.as_ref(),
            ) else {
                return None;
            };
            let version_brute = dependance
                .version
                .clone()
                .or_else(|| gestion.get(&(groupe.clone(), artefact.clone())).cloned())?;
            Some(Dependance {
                reference: format!("{groupe}:{artefact}"),
                version: substituer_properties(&version_brute, &properties),
                manifeste: chemin_manifeste.to_string(),
            })
        })
        .collect()
}

/// Propriétés Maven consultées, dans cet ordre, pour déterminer la version de Java d'un `pom.xml` (US-050) : la
/// première présente l'emporte au sein d'un pom donné.
const PROPRIETES_VERSION_JAVA: [&str; 3] = [
    "maven.compiler.source",
    "maven.compiler.target",
    "maven.compiler.release",
];

/// Référence de la dépendance synthétique portant la version de Java (US-050), alignée sur
/// [`crate::modele::racine::REGLE_JAVA_MOTIF`].
const REFERENCE_JAVA: &str = "java";

/// Normalise une version de Java telle qu'écrite dans un `pom.xml` : les formes historiques `1.5` à `1.8` (Java 5
/// à 8, JEP 223) sont ramenées à leur seul numéro majeur (`1.8` -> `8`), les formes modernes (`11`, `17`, `21`,
/// `17.0.2`…) sont conservées telles quelles. Renvoie `None` pour une chaîne vide ou un token `${...}` non résolu.
fn normaliser_version_java(brut: &str) -> Option<String> {
    let brut = brut.trim();
    if brut.is_empty() || brut.starts_with("${") {
        return None;
    }
    if let Some(reste) = brut.strip_prefix("1.")
        && reste.chars().next().is_some_and(|c| c.is_ascii_digit())
    {
        return Some(reste.to_string());
    }
    Some(brut.to_string())
}

/// Numéro majeur en tête d'une version normalisée (`"17.0.2"` -> `17`), `0` si non analysable — utilisé uniquement
/// pour départager plusieurs `pom.xml` d'un même dépôt déclarant des versions de Java différentes
/// ([`extraire_version_java`]).
fn majeur_version_java(version: &str) -> u32 {
    version
        .split(['.', '-', '_'])
        .next()
        .and_then(|tete| tete.parse().ok())
        .unwrap_or(0)
}

/// Détermine la version de Java du dépôt à partir de tous ses `pom.xml` (US-050) et la renvoie comme une
/// [`Dependance`] synthétique de référence `java` (`manifeste: "pom.xml"`), ou `None` si aucun `pom.xml` ne déclare
/// l'une des [`PROPRIETES_VERSION_JAVA`]. Pour chaque pom, les properties sont fusionnées avec sa chaîne de parents
/// disponible (comme pour la résolution des dépendances) ; en présence de valeurs divergentes entre modules, la
/// version majeure la plus élevée est retenue (départage stable par ordre de découverte).
///
/// **Décision arbitraire à valider par un humain** (cf. rapport de développement de cet incrément) : retenir le
/// majeur le plus élevé revient à supposer que la version de Java d'un dépôt est celle du module le plus à jour ;
/// le compromis inverse (retenir le module le moins maintenu) serait défendable pour un indicateur d'*obsolescence*.
/// L'ordre de consultation des propriétés (`source` puis `target` puis `release` au sein d'un pom) est lui aussi un
/// choix arbitraire, repris de la demande fonctionnelle.
fn extraire_version_java(
    poms_bruts_ordonnes: &[(String, PomBrut)],
    poms_bruts: &HashMap<String, PomBrut>,
    index_coordonnees: &HashMap<(String, String), String>,
) -> Option<Dependance> {
    let mut meilleure: Option<String> = None;
    for (chemin, pom) in poms_bruts_ordonnes {
        let chaine_parents = construire_chaine_parents(chemin, poms_bruts, index_coordonnees);
        let properties = fusionner_properties(pom, &chaine_parents);
        let version = PROPRIETES_VERSION_JAVA
            .iter()
            .find_map(|cle| properties.get(*cle))
            .map(|valeur| substituer_properties(valeur, &properties))
            .and_then(|valeur| normaliser_version_java(&valeur));
        if let Some(version) = version
            && meilleure.as_deref().is_none_or(|actuelle| {
                majeur_version_java(&version) > majeur_version_java(actuelle)
            })
        {
            meilleure = Some(version);
        }
    }
    meilleure.map(|version| Dependance {
        reference: REFERENCE_JAVA.to_string(),
        version,
        manifeste: "pom.xml".to_string(),
    })
}

/// Parseur d'un manifeste `package.json` (npm, périmètre V1 cf. en-tête de module) : extrait les dépendances de
/// production déclarées sous la clé `dependencies` (`devDependencies` volontairement exclu, décision arbitraire
/// signalée dans le rapport de développement de cette phase, sur le même principe que `<dependencyManagement>` du
/// parseur `pom.xml` — une dépendance de développement n'est pas une dépendance effectivement embarquée). Un JSON
/// malformé ou sans clé `dependencies` ne fait jamais échouer l'audit : retourne simplement une liste vide.
///
/// `chemin_manifeste` est le chemin réel du fichier dans le dépôt, reporté dans [`Dependance::manifeste`] (cf.
/// [`resoudre_dependances_pom`]).
fn parser_package_json(contenu: &str, chemin_manifeste: &str) -> Vec<Dependance> {
    let Ok(valeur) = serde_json::from_str::<serde_json::Value>(contenu) else {
        return Vec::new();
    };
    let Some(dependances_declarees) = valeur.get("dependencies").and_then(|v| v.as_object()) else {
        return Vec::new();
    };
    dependances_declarees
        .iter()
        .filter_map(|(reference, version)| {
            let version = version.as_str()?;
            Some(Dependance {
                reference: reference.clone(),
                version: version.to_string(),
                manifeste: chemin_manifeste.to_string(),
            })
        })
        .collect()
}

/// Expression régulière figée d'extraction des dépendances d'un manifeste `build.gradle` (Groovy DSL), cf.
/// [`parser_build_gradle`] : jamais recompilée dynamiquement à partir d'une donnée externe (à la différence de
/// [`regex_depuis_motif_glob`]), la validité de ce motif littéral à la compilation est donc garantie par les tests
/// de ce module plutôt que gérée comme un cas d'erreur à l'exécution.
const MOTIF_DEPENDANCE_GRADLE: &str = r#"(?m)^\s*(?:implementation|api|compile|testImplementation|androidTestImplementation|runtimeOnly|compileOnly)\s*\(?\s*['"]([^:'"]+):([^:'"]+):([^'"]+)['"]"#;

/// Parseur best-effort d'un manifeste `build.gradle` (Gradle, périmètre V1 cf. en-tête de module) : extraction par
/// expression régulière des déclarations de dépendance au format court `'groupe:artefact:version'` des
/// configurations usuelles (`implementation`, `api`, `compile`, `testImplementation`,
/// `androidTestImplementation`, `runtimeOnly`, `compileOnly`), avec ou sans parenthèses. Limite assumée (Groovy/
/// Kotlin DSL n'étant pas parsé syntaxiquement) : le format nommé (`implementation group: '...', name: '...',
/// version: '...'`) et toute déclaration résultant d'une variable ou d'une résolution de version dynamique
/// (catalogue de versions, `libs.versions.toml`) ne sont pas reconnus, silencieusement ignorés plutôt que de faire
/// échouer l'audit.
///
/// `chemin_manifeste` est le chemin réel du fichier dans le dépôt, reporté dans [`Dependance::manifeste`] (cf.
/// [`resoudre_dependances_pom`]).
fn parser_build_gradle(contenu: &str, chemin_manifeste: &str) -> Vec<Dependance> {
    let Ok(motif) = Regex::new(MOTIF_DEPENDANCE_GRADLE) else {
        return Vec::new();
    };
    motif
        .captures_iter(contenu)
        .map(|captures| Dependance {
            reference: format!("{}:{}", &captures[1], &captures[2]),
            version: captures[3].to_string(),
            manifeste: chemin_manifeste.to_string(),
        })
        .collect()
}

/// Interroge les dépendances déclarées par les manifestes du dépôt (`gitlab.dependances`), tous écosystèmes
/// reconnus confondus (périmètre V1, cf. [`NOMS_MANIFESTES_RECONNUS`]) : récupère l'arborescence complète de la ref
/// auditée (même algorithme paginé que [`interroger_marqueurs_ia`]), retient les fichiers dont le basename
/// correspond à un manifeste reconnu, lit leur contenu brut puis les parse avec le module dédié à leur écosystème.
/// L'absence de tout manifeste dans le dépôt n'est jamais une anomalie : `dependances` est alors simplement vide.
///
/// Pour l'écosystème Maven, le traitement se fait en deux passes : tous les `pom.xml` du dépôt sont d'abord parsés
/// en forme brute non résolue ([`parser_pom_xml_brut`]) et indexés par leurs coordonnées
/// ([`indexer_poms_par_coordonnees`]), puis chacun est résolu ([`resoudre_dependances_pom`]) en tenant compte de sa
/// chaîne de `<parent>` disponible parmi les autres `pom.xml` déjà parsés ([`construire_chaine_parents`], qui
/// rattache un parent par ses coordonnées d'abord, `<relativePath>` seulement en repli) — nécessaire pour résoudre
/// les properties Maven et le `dependencyManagement` hérités (cf. leur documentation respective).
/// `package.json`/`build.gradle` restent traités à la volée, fichier par fichier, sans changement. Chaque
/// [`Dependance`] porte dans `manifeste` le chemin réel de son fichier d'origine dans le dépôt (ex.
/// `module-a/pom.xml`), pas un simple nom d'écosystème. Conséquence observable : dans `dependances`, les
/// dépendances Maven apparaissent regroupées après celles des autres écosystèmes plutôt qu'entrelacées selon
/// l'ordre de découverte des fichiers dans l'arborescence — aucun consommateur connu ne dépend de cet ordre.
///
/// US-050 : si au moins un `pom.xml` du dépôt déclare l'une des [`PROPRIETES_VERSION_JAVA`], une dépendance
/// synthétique de référence `java` portant la version de Java du dépôt ([`extraire_version_java`]) est ajoutée en
/// fin de `dependances`.
///
/// # Erreurs
///
/// Voir [`resoudre_ref_effective`] ; les mêmes catégories s'appliquent aux appels de pagination de l'arborescence
/// et à la lecture du contenu de chaque manifeste (hormis un statut 404 sur cette dernière, cf.
/// [`recuperer_contenu_manifeste`]).
pub(crate) async fn interroger_dependances(
    url_base: &str,
    credential: &str,
    source_id: &str,
    id_externe: &str,
    ref_auditee: Option<&str>,
    date_ciblee: Option<&str>,
    client: &reqwest::Client,
) -> Result<ResultatGitlabDependances, ErreurConnecteur> {
    let resolue = resoudre_ref(
        url_base,
        credential,
        id_externe,
        ref_auditee,
        date_ciblee,
        client,
    )
    .await?;

    let mut chemins_manifestes = Vec::new();
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
        for entree in &page_entrees {
            if entree.type_entree == "blob"
                && NOMS_MANIFESTES_RECONNUS.contains(&basename(&entree.path))
            {
                chemins_manifestes.push(entree.path.clone());
            }
        }
    }

    let mut dependances = Vec::new();
    let mut poms_bruts_ordonnes: Vec<(String, PomBrut)> = Vec::new();
    for chemin in chemins_manifestes {
        let Some(contenu) = recuperer_contenu_manifeste(
            url_base,
            credential,
            id_externe,
            &chemin,
            &resolue.ref_effective,
            client,
        )
        .await?
        else {
            continue;
        };
        match basename(&chemin) {
            "pom.xml" => poms_bruts_ordonnes.push((chemin.clone(), parser_pom_xml_brut(&contenu))),
            "package.json" => dependances.extend(parser_package_json(&contenu, &chemin)),
            "build.gradle" => dependances.extend(parser_build_gradle(&contenu, &chemin)),
            _ => {}
        }
    }

    let poms_bruts: HashMap<String, PomBrut> = poms_bruts_ordonnes.iter().cloned().collect();
    let index_coordonnees = indexer_poms_par_coordonnees(&poms_bruts_ordonnes);
    for (chemin, pom_brut) in &poms_bruts_ordonnes {
        let chaine_parents = construire_chaine_parents(chemin, &poms_bruts, &index_coordonnees);
        dependances.extend(resoudre_dependances_pom(pom_brut, &chaine_parents, chemin));
    }
    // US-050 : la version de Java du dépôt, relevée dans les `<properties>` des `pom.xml`, est ajoutée comme une
    // dépendance synthétique de référence `java` — traitée ensuite comme n'importe quelle dépendance (règle de
    // dépendances, catégorie, retard d'obsolescence).
    if let Some(dependance_java) =
        extraire_version_java(&poms_bruts_ordonnes, &poms_bruts, &index_coordonnees)
    {
        dependances.push(dependance_java);
    }

    Ok(ResultatGitlabDependances {
        source_id: source_id.to_string(),
        ref_effective: resolue.ref_effective,
        sha_tete: resolue.sha_tete,
        dependances,
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
    async fn lister_projets_trie_par_libelle_insensible_a_la_casse() -> Result<(), ErreurConnecteur>
    {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects"))
            .and(header("PRIVATE-TOKEN", "jeton-valide"))
            .and(wiremock::matchers::query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "id": 91, "path_with_namespace": "nova/api-portail" },
                { "id": 1234, "path_with_namespace": "Entreprise/api-facturation" },
                { "id": 88, "path_with_namespace": "nova/Front-Portail" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects"))
            .and(wiremock::matchers::query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;

        let disponibles = lister_projets(
            &serveur.uri(),
            "jeton-valide",
            Some("nova"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(
            disponibles
                .iter()
                .map(|projet| projet.libelle.as_str())
                .collect::<Vec<_>>(),
            vec![
                "Entreprise/api-facturation",
                "nova/api-portail",
                "nova/Front-Portail"
            ]
        );
        assert_eq!(disponibles[0].id_externe, "1234");
        Ok(())
    }

    #[tokio::test]
    async fn lister_projets_pagine_jusqua_epuisement() -> Result<(), ErreurConnecteur> {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects"))
            .and(wiremock::matchers::query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "id": 1, "path_with_namespace": "groupe/un" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects"))
            .and(wiremock::matchers::query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;

        let disponibles = lister_projets(
            &serveur.uri(),
            "jeton-valide",
            Some("groupe"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(disponibles.len(), 1);
        assert_eq!(disponibles[0].libelle, "groupe/un");
        Ok(())
    }

    #[tokio::test]
    async fn lister_projets_transmet_le_terme_de_recherche() {
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects"))
            .and(query_param("search", "api"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "id": 1234, "path_with_namespace": "entreprise/api-facturation" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;

        let disponibles = lister_projets(
            &serveur.uri(),
            "jeton-valide",
            Some("api"),
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(
            disponibles.map(|projets| projets.len()).unwrap_or_default(),
            1
        );
    }

    #[tokio::test]
    async fn lister_projets_ne_fait_aucun_appel_reseau_sans_terme_recherche() {
        // Aucun `Mock` monté : un appel HTTP réel provoquerait un 404 non géré, faisant échouer les assertions
        // ci-dessous si le court-circuit décrit par la doc de `lister_projets` (RG-036, évolution du 2026-08-25)
        // venait à disparaître.
        let serveur = MockServer::start().await;

        let sans_terme = lister_projets(
            &serveur.uri(),
            "jeton-valide",
            None,
            &client_test_delai_court(),
        )
        .await;
        let terme_vide = lister_projets(
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
    async fn lister_projets_signale_authentification_refusee() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&serveur)
            .await;

        let resultat = lister_projets(
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
    async fn lister_projets_signale_des_droits_insuffisants() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects"))
            .respond_with(ResponseTemplate::new(403))
            .mount(&serveur)
            .await;

        let resultat = lister_projets(
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
            None, // date_ciblee
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
    async fn interroger_vitalite_encode_correctement_une_ref_porteuse_dun_slash() {
        // R10-08 : une ref telle que `feature/paiement-sepa` doit rester un unique segment de chemin
        // percent-encodé (`%2F`) dans l'appel HTTP, plutôt que d'introduire un sous-chemin à trois segments ; le
        // round-trip (ref transmise telle quelle en entrée, retrouvée telle quelle dans `ref_effective` en sortie)
        // vérifie à la fois l'encodage à l'aller et l'absence de décodage/altération au retour.
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path(
                "/api/v4/projects/1234/repository/commits/feature%2Fpaiement-sepa",
            ))
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
            Some("feature/paiement-sepa"),
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert_eq!(
            resultat,
            Ok(crate::modele::racine::ResultatGitlabVitalite {
                source_id: "f0000000-0000-4000-8000-000000000001".to_string(),
                ref_effective: "feature/paiement-sepa".to_string(),
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
            None, // date_ciblee
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
    async fn interroger_vitalite_signale_une_branche_par_defaut_absente_hors_depot_vide_en_reponse_inattendue()
     {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(serde_json::json!({ "empty_repo": false })),
            )
            .mount(&serveur)
            .await;

        let resultat = interroger_vitalite(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            None,
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
    async fn interroger_vitalite_signale_un_depot_vide() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({ "empty_repo": true })),
            )
            .mount(&serveur)
            .await;

        let resultat = interroger_vitalite(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            None,
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(resultat, Err(ErreurConnecteur::DepotVide { .. })));
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
            None, // date_ciblee
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
    async fn interroger_vitalite_resout_via_date_cible_le_commit_le_plus_recent_avant_cette_date()
    -> Result<(), ErreurConnecteur> {
        // C15-14 : `resoudre_ref_effective_a_date` interroge `GET .../repository/commits?ref_name=...&until=...`
        // au lieu de `GET .../repository/commits/{ref}` dès que `date_ciblee` est renseigné.
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits"))
            .and(query_param("ref_name", "develop"))
            .and(query_param("until", "2026-03-15"))
            .and(query_param("per_page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "id": "commit-avant-la-date", "committed_date": "2026-03-14T10:00:00Z" }
            ])))
            .mount(&serveur)
            .await;

        let resultat = interroger_vitalite(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            Some("2026-03-15"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.ref_effective, "develop");
        assert_eq!(resultat.sha_tete, "commit-avant-la-date");
        assert_eq!(resultat.dernier_commit_le, "2026-03-14T10:00:00Z");
        Ok(())
    }

    #[tokio::test]
    async fn interroger_vitalite_signale_ref_introuvable_si_aucun_commit_avant_la_date_cible() {
        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;

        let resultat = interroger_vitalite(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            Some("2020-01-01"),
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::RefIntrouvable { .. })
        ));
    }

    #[tokio::test]
    async fn interroger_vitalite_resout_la_branche_par_defaut_en_mode_historique_si_ref_absente()
    -> Result<(), ErreurConnecteur> {
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
            .and(path("/api/v4/projects/1234/repository/commits"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "id": "abc123", "committed_date": "2026-03-14T00:00:00Z" }
            ])))
            .mount(&serveur)
            .await;

        let resultat = interroger_vitalite(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            None,
            Some("2026-03-15"),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.ref_effective, "main");
        Ok(())
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
            None, // date_ciblee
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
    async fn interroger_contributeurs_decale_la_fenetre_vers_la_date_cible_en_mode_historique()
    -> Result<(), ErreurConnecteur> {
        // C15-14 : en mode historique, la fenêtre glissante devient [date_cible − 90j ; date_cible] au lieu de
        // [maintenant − 90j ; maintenant], et `until` est explicitement transmis (absent en mode régulier).
        use wiremock::matchers::query_param;

        let date_cible = "2026-02-01";
        let jusqua = interpreter_date_cible_fin_de_journee(date_cible)?;
        let depuis = jusqua - chrono::Duration::days(i64::from(FENETRE_CONTRIBUTEURS_JOURS));

        let serveur = MockServer::start().await;
        // Résolution de la ref à la date cible (`resoudre_ref_effective_a_date`) : `until` brut, distinct de la
        // fenêtre since/until ci-dessous, et `per_page=1`.
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits"))
            .and(query_param("ref_name", "develop"))
            .and(query_param("until", date_cible))
            .and(query_param("per_page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "id": "8c1d0e44", "committed_date": "2026-02-01T09:00:00Z" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits"))
            .and(query_param("page", "1"))
            .and(query_param("since", depuis.to_rfc3339()))
            .and(query_param("until", jusqua.to_rfc3339()))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "id": "c1", "committed_date": "2026-01-20T00:00:00Z", "author_email": "marie@entreprise.fr", "author_name": "Marie" }
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
            Some(date_cible),
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.contributeurs.len(), 1);
        assert_eq!(resultat.contributeurs[0].email, "marie@entreprise.fr");
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
                { "iid": 214, "title": "Paiement SEPA", "created_at": "2026-06-20T00:00:00Z", "has_conflicts": false, "web_url": "https://gitlab.example.com/groupe/projet/-/merge_requests/214" },
                { "iid": 209, "title": "Refonte mapping tiers", "created_at": "2026-04-02T00:00:00Z", "web_url": "https://gitlab.example.com/groupe/projet/-/merge_requests/209" }
            ])))
            .mount(&serveur)
            .await;

        let resultat = interroger_merge_requests(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.mr_ouvertes.len(), 2);
        assert!(!resultat.mr_ouvertes[0].en_conflit);
        assert!(!resultat.mr_ouvertes[1].en_conflit);
        Ok(())
    }

    #[tokio::test]
    async fn interroger_merge_requests_historique_filtre_les_mr_ouvertes_a_la_date_cible()
    -> Result<(), ErreurConnecteur> {
        // C15-14 : en mode historique, `state=all` paginé (au lieu de `state=opened`) puis filtrage côté client
        // (`created_at <= date_cible` et `merged_at`/`closed_at` absent ou postérieur à `date_cible`).
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        // Résolution de la ref à la date cible (`resoudre_ref_effective_a_date`, C15-14) : `GET .../commits` avec
        // `until`/`per_page=1`, distinct de la résolution régulière (`GET .../commits/{ref}`).
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits"))
            .and(query_param("ref_name", "develop"))
            .and(query_param("per_page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "id": "8c1d0e44", "committed_date": "2026-01-31T10:00:00Z" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/merge_requests"))
            .and(query_param("state", "all"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                {
                    "iid": 100, "title": "Encore ouverte à la date cible", "created_at": "2026-01-01T00:00:00Z",
                    "web_url": "https://gitlab.example.com/groupe/projet/-/merge_requests/100"
                },
                {
                    "iid": 101, "title": "Fusionnée après la date cible", "created_at": "2026-01-02T00:00:00Z",
                    "merged_at": "2026-02-10T00:00:00Z",
                    "web_url": "https://gitlab.example.com/groupe/projet/-/merge_requests/101"
                },
                {
                    "iid": 102, "title": "Fusionnée avant la date cible", "created_at": "2026-01-03T00:00:00Z",
                    "merged_at": "2026-01-10T00:00:00Z",
                    "web_url": "https://gitlab.example.com/groupe/projet/-/merge_requests/102"
                },
                {
                    "iid": 103, "title": "Créée après la date cible", "created_at": "2026-03-01T00:00:00Z",
                    "web_url": "https://gitlab.example.com/groupe/projet/-/merge_requests/103"
                },
                {
                    "iid": 104, "title": "Fermée après la date cible", "created_at": "2026-01-04T00:00:00Z",
                    "closed_at": "2026-02-15T00:00:00Z",
                    "web_url": "https://gitlab.example.com/groupe/projet/-/merge_requests/104"
                }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/merge_requests"))
            .and(query_param("state", "all"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;

        let resultat = interroger_merge_requests(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            Some("2026-02-01"),
            &client_test_delai_court(),
        )
        .await?;

        let iids: Vec<u64> = resultat.mr_ouvertes.iter().map(|mr| mr.iid).collect();
        assert_eq!(iids, vec![100, 101, 104]);
        Ok(())
    }

    #[tokio::test]
    async fn interroger_merge_requests_historique_normalise_la_date_cible_en_fin_de_journee()
    -> Result<(), ErreurConnecteur> {
        // Non-régression (relevée en relecture isolée de C15-14) : `date_cible` telle que reçue de l'écran
        // (`AAAA-MM-JJ`, dix caractères) est toujours lexicographiquement inférieure à tout horodatage complet
        // GitLab portant la même date (préfixe plus court) — une demande de fusion créée le jour exact de la date
        // ciblée était donc jusqu'ici incorrectement exclue par une comparaison brute, sans normalisation en fin de
        // journée. Vérifie ici que ce cas limite (création, fusion et fermeture le jour exact de la date ciblée)
        // est désormais traité correctement.
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/commits"))
            .and(query_param("ref_name", "develop"))
            .and(query_param("per_page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "id": "8c1d0e44", "committed_date": "2026-01-31T10:00:00Z" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/merge_requests"))
            .and(query_param("state", "all"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                {
                    "iid": 200, "title": "Créée tôt le jour même de la date cible, encore ouverte",
                    "created_at": "2026-02-01T08:00:00Z",
                    "web_url": "https://gitlab.example.com/groupe/projet/-/merge_requests/200"
                },
                {
                    "iid": 201, "title": "Créée tard le jour même de la date cible, encore ouverte",
                    "created_at": "2026-02-01T23:00:00Z",
                    "web_url": "https://gitlab.example.com/groupe/projet/-/merge_requests/201"
                },
                {
                    "iid": 202, "title": "Fusionnée le jour même de la date cible",
                    "created_at": "2026-01-15T00:00:00Z", "merged_at": "2026-02-01T10:00:00Z",
                    "web_url": "https://gitlab.example.com/groupe/projet/-/merge_requests/202"
                },
                {
                    "iid": 203, "title": "Fermée le jour même de la date cible",
                    "created_at": "2026-02-01T05:00:00Z", "closed_at": "2026-02-01T20:00:00Z",
                    "web_url": "https://gitlab.example.com/groupe/projet/-/merge_requests/203"
                }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/merge_requests"))
            .and(query_param("state", "all"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;

        let resultat = interroger_merge_requests(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            Some("2026-02-01"),
            &client_test_delai_court(),
        )
        .await?;

        let iids: Vec<u64> = resultat.mr_ouvertes.iter().map(|mr| mr.iid).collect();
        assert_eq!(iids, vec![200, 201]);
        Ok(())
    }

    #[tokio::test]
    async fn interroger_membres_marque_non_direct_les_membres_absents_des_membres_directs()
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
            .and(path("/api/v4/projects/1234/members"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "username": "mdurand", "name": "Marie Durand", "access_level": 40 }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/members"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/members/all"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "username": "mdurand", "name": "Marie Durand", "access_level": 40 },
                { "username": "alopez-ext", "name": "Ana Lopez", "access_level": 30 }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/members/all"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
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
                .any(|membre| membre.username == "mdurand"
                    && membre.direct
                    && membre.groupes_invites.is_empty())
        );
        assert!(
            resultat
                .membres
                .iter()
                .any(|membre| membre.username == "alopez-ext"
                    && !membre.direct
                    && membre.groupes_invites.is_empty()
                    && membre.email_public.is_none())
        );
        Ok(())
    }

    #[tokio::test]
    async fn interroger_membres_ventile_les_membres_des_groupes_invites_du_plus_precis_a_la_racine()
    -> Result<(), ErreurConnecteur> {
        use wiremock::matchers::query_param;

        // US-017 : `mdurand` est membre direct du dépôt ; `bnoms` relève de deux groupes invités (le chemin le plus
        // profond en premier) ; `cherite` n'est ni direct ni dans un groupe invité résolu → hérité de
        // l'arborescence.
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
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "username": "mdurand", "name": "Marie Durand", "access_level": 40 }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/members"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/members/all"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "username": "mdurand", "name": "Marie Durand", "access_level": 40 },
                { "username": "bnoms", "name": "Bernard Noms", "access_level": 30 },
                { "username": "cherite", "name": "Chloé Hérité", "access_level": 20 }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/members/all"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "default_branch": "develop",
                "shared_with_groups": [
                    { "group_id": 10, "group_full_path": "org/equipe" },
                    { "group_id": 11, "group_full_path": "org/equipe/paiements" }
                ]
            })))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/groups/10/members"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "username": "bnoms", "name": "Bernard Noms", "access_level": 30 }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/groups/10/members"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/groups/11/members"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "username": "bnoms", "name": "Bernard Noms", "access_level": 30 }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/groups/11/members"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
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

        let mdurand = resultat
            .membres
            .iter()
            .find(|membre| membre.username == "mdurand")
            .ok_or(ErreurConnecteur::ReponseInattendue {
                message: "mdurand attendu".to_string(),
            })?;
        assert!(mdurand.direct);
        assert!(mdurand.groupes_invites.is_empty());

        let bnoms = resultat
            .membres
            .iter()
            .find(|membre| membre.username == "bnoms")
            .ok_or(ErreurConnecteur::ReponseInattendue {
                message: "bnoms attendu".to_string(),
            })?;
        assert!(!bnoms.direct);
        assert_eq!(
            bnoms.groupes_invites,
            vec!["org/equipe/paiements".to_string(), "org/equipe".to_string()]
        );

        let cherite = resultat
            .membres
            .iter()
            .find(|membre| membre.username == "cherite")
            .ok_or(ErreurConnecteur::ReponseInattendue {
                message: "cherite attendu".to_string(),
            })?;
        assert!(!cherite.direct);
        assert!(cherite.groupes_invites.is_empty());
        Ok(())
    }

    #[tokio::test]
    async fn interroger_membres_absorbe_silencieusement_une_anomalie_de_ventilation_us017()
    -> Result<(), ErreurConnecteur> {
        use wiremock::matchers::query_param;

        // US-017 : `GET /projects/1234` renvoie 403 (droits insuffisants sur le détail du projet) — l'interrogation
        // des membres du dépôt aboutit malgré tout, tous les membres non directs retombant en « hérités ».
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
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/members/all"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "username": "bnoms", "name": "Bernard Noms", "access_level": 30 }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/members/all"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234"))
            .respond_with(ResponseTemplate::new(403).set_body_json(serde_json::json!({
                "message": "403 Forbidden"
            })))
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

        let bnoms = resultat
            .membres
            .iter()
            .find(|membre| membre.username == "bnoms")
            .ok_or(ErreurConnecteur::ReponseInattendue {
                message: "bnoms attendu".to_string(),
            })?;
        assert!(!bnoms.direct);
        assert!(bnoms.groupes_invites.is_empty());
        Ok(())
    }

    #[tokio::test]
    async fn interroger_membres_pagine_au_dela_de_cent_membres() -> Result<(), ErreurConnecteur> {
        // R10-02 : au-delà de cent membres, la liste (`/members/all`, qui porte le résultat final) ne doit plus
        // être silencieusement tronquée par un unique appel non paginé (round-trip sur deux pages, la troisième
        // vide, sur le modèle de `interroger_contributeurs_agrege_par_email_sur_plusieurs_pages`).
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
            .and(path("/api/v4/projects/1234/members"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/members/all"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "username": "page1", "name": "Page Un", "access_level": 40 }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/members/all"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "username": "page2", "name": "Page Deux", "access_level": 40 }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/members/all"))
            .and(query_param("page", "3"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
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

        // Les membres des deux pages ("page1", "page2") apparaissent tous deux dans le résultat final : preuve que
        // la seconde page n'a pas été tronquée par le premier appel.
        assert!(resultat.membres.iter().any(|m| m.username == "page1"));
        assert!(resultat.membres.iter().any(|m| m.username == "page2"));
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
            None, // date_ciblee
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
            None, // date_ciblee
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
            None, // date_ciblee
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
            None, // date_ciblee
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
            None, // date_ciblee
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
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::DelaiDepasse { .. })
        ));
    }

    // -- interroger_branches_completes ------------------------------------------------------------------------

    #[tokio::test]
    async fn interroger_branches_completes_marque_avec_mr_la_branche_source_dune_mr_ouverte()
    -> Result<(), ErreurConnecteur> {
        use wiremock::matchers::query_param;

        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/branches"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "name": "develop", "commit": { "committed_date": "2026-07-08T00:00:00Z" } },
                { "name": "feature/paiement-sepa", "commit": { "committed_date": "2026-07-07T00:00:00Z" } }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/branches"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/merge_requests"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                { "source_branch": "feature/paiement-sepa" }
            ])))
            .mount(&serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/merge_requests"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&serveur)
            .await;

        let resultat = interroger_branches_completes(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.branches.len(), 2);
        let Some(develop) = resultat
            .branches
            .iter()
            .find(|branche| branche.nom == "develop")
        else {
            panic!("branche develop attendue dans le résultat");
        };
        assert!(!develop.avec_mr);
        assert_eq!(develop.dernier_commit_le, "2026-07-08T00:00:00Z");
        let Some(feature) = resultat
            .branches
            .iter()
            .find(|branche| branche.nom == "feature/paiement-sepa")
        else {
            panic!("branche feature/paiement-sepa attendue dans le résultat");
        };
        assert!(feature.avec_mr);
        Ok(())
    }

    #[tokio::test]
    async fn interroger_branches_completes_signale_authentification_refusee() {
        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/branches"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&serveur)
            .await;

        let resultat = interroger_branches_completes(
            &serveur.uri(),
            "jeton-invalide",
            "source-1",
            "1234",
            Some("develop"),
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::AuthentificationRefusee { .. })
        ));
    }

    // -- interroger_dependances --------------------------------------------------------------------------------

    /// Monte les mocks de résolution de ref et d'arborescence communs aux tests de `interroger_dependances`
    /// (un seul appel de pagination de l'arborescence, page suivante vide).
    async fn monter_mock_arborescence(serveur: &MockServer, entrees: serde_json::Value) {
        use wiremock::matchers::query_param;

        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .and(query_param("page", "1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(entrees))
            .mount(serveur)
            .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/tree"))
            .and(query_param("page", "2"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(serveur)
            .await;
    }

    #[tokio::test]
    async fn interroger_dependances_agrege_les_trois_ecosystemes_reconnus()
    -> Result<(), ErreurConnecteur> {
        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        monter_mock_arborescence(
            &serveur,
            serde_json::json!([
                { "path": "pom.xml", "type": "blob" },
                { "path": "package.json", "type": "blob" },
                { "path": "build.gradle", "type": "blob" },
                { "path": "README.md", "type": "blob" }
            ]),
        )
        .await;

        let pom = r#"<project>
            <dependencyManagement>
                <dependencies>
                    <dependency>
                        <groupId>com.example</groupId>
                        <artifactId>ignoree-geree</artifactId>
                        <version>9.9.9</version>
                    </dependency>
                </dependencies>
            </dependencyManagement>
            <dependencies>
                <dependency>
                    <groupId>org.springframework</groupId>
                    <artifactId>spring-core</artifactId>
                    <version>5.3.12</version>
                </dependency>
                <dependency>
                    <groupId>org.example</groupId>
                    <artifactId>sans-version</artifactId>
                </dependency>
            </dependencies>
        </project>"#;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/files/pom.xml/raw"))
            .respond_with(ResponseTemplate::new(200).set_body_string(pom))
            .mount(&serveur)
            .await;

        let package_json = r#"{
            "dependencies": { "@angular/core": "18.2.1", "rxjs": "7.8.1" },
            "devDependencies": { "jest": "29.0.0" }
        }"#;
        Mock::given(method("GET"))
            .and(path(
                "/api/v4/projects/1234/repository/files/package.json/raw",
            ))
            .respond_with(ResponseTemplate::new(200).set_body_string(package_json))
            .mount(&serveur)
            .await;

        let build_gradle = "dependencies {\n    implementation 'com.squareup.retrofit2:retrofit:2.11.0'\n    testImplementation(\"junit:junit:4.13.2\")\n}\n";
        Mock::given(method("GET"))
            .and(path(
                "/api/v4/projects/1234/repository/files/build.gradle/raw",
            ))
            .respond_with(ResponseTemplate::new(200).set_body_string(build_gradle))
            .mount(&serveur)
            .await;

        let resultat = interroger_dependances(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await?;

        assert_eq!(resultat.dependances.len(), 5);
        assert!(
            resultat
                .dependances
                .iter()
                .any(|d| d.reference == "org.springframework:spring-core"
                    && d.version == "5.3.12"
                    && d.manifeste == "pom.xml")
        );
        assert!(
            !resultat
                .dependances
                .iter()
                .any(|d| d.reference.contains("ignoree-geree")
                    || d.reference.contains("sans-version"))
        );
        assert!(
            resultat
                .dependances
                .iter()
                .any(|d| d.reference == "@angular/core" && d.manifeste == "package.json")
        );
        assert!(!resultat.dependances.iter().any(|d| d.reference == "jest"));
        assert!(
            resultat
                .dependances
                .iter()
                .any(|d| d.reference == "com.squareup.retrofit2:retrofit"
                    && d.version == "2.11.0"
                    && d.manifeste == "build.gradle")
        );
        Ok(())
    }

    #[tokio::test]
    async fn interroger_dependances_porte_le_chemin_reel_du_module_et_resout_via_le_parent_racine()
    -> Result<(), ErreurConnecteur> {
        use wiremock::matchers::path_regex;

        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        monter_mock_arborescence(
            &serveur,
            serde_json::json!([
                { "path": "pom.xml", "type": "blob" },
                { "path": "back/service-a/pom.xml", "type": "blob" }
            ]),
        )
        .await;

        // Racine à la racine du dépôt : porte la property et le `<dependencyManagement>`.
        let racine = r#"<project>
            <groupId>com.example</groupId>
            <artifactId>racine</artifactId>
            <version>1.0.0</version>
            <properties><guava.version>33.0.0-jre</guava.version></properties>
        </project>"#;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/files/pom.xml/raw"))
            .respond_with(ResponseTemplate::new(200).set_body_string(racine))
            .mount(&serveur)
            .await;

        // Module deux niveaux plus bas, sans `<relativePath>` : rattaché à la racine par coordonnées.
        let module = r#"<project>
            <parent>
                <groupId>com.example</groupId>
                <artifactId>racine</artifactId>
                <version>1.0.0</version>
            </parent>
            <artifactId>service-a</artifactId>
            <dependencies>
                <dependency>
                    <groupId>com.google.guava</groupId>
                    <artifactId>guava</artifactId>
                    <version>${guava.version}</version>
                </dependency>
            </dependencies>
        </project>"#;
        Mock::given(method("GET"))
            .and(path_regex(
                r"/api/v4/projects/1234/repository/files/back.*service-a.*pom\.xml/raw",
            ))
            .respond_with(ResponseTemplate::new(200).set_body_string(module))
            .mount(&serveur)
            .await;

        let resultat = interroger_dependances(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await?;

        // Property de la racine substituée malgré l'absence de `<relativePath>` et la profondeur du module ;
        // `manifeste` porte le chemin réel du module, pas le littéral « pom.xml ».
        assert!(
            resultat
                .dependances
                .iter()
                .any(|d| d.reference == "com.google.guava:guava"
                    && d.version == "33.0.0-jre"
                    && d.manifeste == "back/service-a/pom.xml"),
            "guava du module doit remonter résolue et avec son chemin réel : {:?}",
            resultat.dependances
        );
        Ok(())
    }

    #[tokio::test]
    async fn interroger_dependances_sans_manifeste_nest_pas_une_anomalie()
    -> Result<(), ErreurConnecteur> {
        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        monter_mock_arborescence(
            &serveur,
            serde_json::json!([{ "path": "README.md", "type": "blob" }]),
        )
        .await;

        let resultat = interroger_dependances(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await?;

        assert!(resultat.dependances.is_empty());
        Ok(())
    }

    #[tokio::test]
    async fn interroger_dependances_ignore_un_manifeste_disparu_entre_larborescence_et_la_lecture()
    -> Result<(), ErreurConnecteur> {
        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        monter_mock_arborescence(
            &serveur,
            serde_json::json!([{ "path": "pom.xml", "type": "blob" }]),
        )
        .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/files/pom.xml/raw"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&serveur)
            .await;

        let resultat = interroger_dependances(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await?;

        assert!(resultat.dependances.is_empty());
        Ok(())
    }

    #[tokio::test]
    async fn interroger_dependances_signale_des_droits_insuffisants_sur_la_lecture_du_manifeste() {
        let serveur = MockServer::start().await;
        monter_mock_resolution_ref(&serveur).await;
        monter_mock_arborescence(
            &serveur,
            serde_json::json!([{ "path": "pom.xml", "type": "blob" }]),
        )
        .await;
        Mock::given(method("GET"))
            .and(path("/api/v4/projects/1234/repository/files/pom.xml/raw"))
            .respond_with(ResponseTemplate::new(403))
            .mount(&serveur)
            .await;

        let resultat = interroger_dependances(
            &serveur.uri(),
            "jeton-valide",
            "source-1",
            "1234",
            Some("develop"),
            None, // date_ciblee
            &client_test_delai_court(),
        )
        .await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::DroitsInsuffisants { .. })
        ));
    }

    // -- parser_pom_xml_brut, résolution Maven, parser_package_json, parser_build_gradle (parseurs purs) --------

    #[test]
    fn resoudre_dependances_pom_utilise_la_gestion_de_dependances_geree_pour_une_coordonnee_non_declaree_et_exclut_les_versions_non_resolues()
     {
        // La coordonnée `com.example:geree` du dependencyManagement ne correspond à aucune dépendance déclarée de
        // ce pom : elle ne sert donc à rien ici (cf. test dédié à la résolution effective plus bas), et
        // `org.example:sans-version` reste exclue faute de coordonnée correspondante dans le dependencyManagement.
        let pom = r#"<project>
            <dependencyManagement>
                <dependencies>
                    <dependency>
                        <groupId>com.example</groupId>
                        <artifactId>geree</artifactId>
                        <version>1.0.0</version>
                    </dependency>
                </dependencies>
            </dependencyManagement>
            <dependencies>
                <dependency>
                    <groupId>org.apache.logging.log4j</groupId>
                    <artifactId>log4j-core</artifactId>
                    <version>2.17.1</version>
                    <scope>compile</scope>
                </dependency>
                <dependency>
                    <groupId>org.example</groupId>
                    <artifactId>sans-version</artifactId>
                </dependency>
            </dependencies>
        </project>"#;

        let brut = parser_pom_xml_brut(pom);
        let dependances = resoudre_dependances_pom(&brut, &[], "pom.xml");

        assert_eq!(dependances.len(), 1);
        assert_eq!(
            dependances[0].reference,
            "org.apache.logging.log4j:log4j-core"
        );
        assert_eq!(dependances[0].version, "2.17.1");
        assert_eq!(dependances[0].manifeste, "pom.xml");
    }

    #[test]
    fn parser_pom_xml_brut_malforme_retourne_les_dependances_deja_extraites() {
        // XML jamais fermé après la première dépendance complète : l'analyse s'arrête au point de rupture plutôt
        // que de faire échouer l'audit (algorithme best-effort, cf. commentaire de `parser_pom_xml_brut`).
        let pom = r#"<project><dependencies><dependency><groupId>a</groupId><artifactId>b</artifactId><version>1</version></dependency><dependency><groupId>c</groupId>"#;

        let brut = parser_pom_xml_brut(pom);
        let dependances = resoudre_dependances_pom(&brut, &[], "pom.xml");

        assert_eq!(dependances.len(), 1);
        assert_eq!(dependances[0].reference, "a:b");
    }

    #[test]
    fn resoudre_dependances_pom_resout_une_property_declaree_localement() {
        let pom = r#"<project>
            <properties>
                <spring.version>5.3.12</spring.version>
            </properties>
            <dependencies>
                <dependency>
                    <groupId>org.springframework</groupId>
                    <artifactId>spring-core</artifactId>
                    <version>${spring.version}</version>
                </dependency>
            </dependencies>
        </project>"#;

        let brut = parser_pom_xml_brut(pom);
        let dependances = resoudre_dependances_pom(&brut, &[], "pom.xml");

        assert_eq!(dependances.len(), 1);
        assert_eq!(dependances[0].version, "5.3.12");
    }

    #[test]
    fn resoudre_dependances_pom_resout_une_property_heritee_dun_parent_du_meme_depot() {
        let parent = r#"<project>
            <groupId>com.example</groupId>
            <artifactId>parent</artifactId>
            <version>1.0.0</version>
            <properties>
                <spring.version>5.3.12</spring.version>
            </properties>
        </project>"#;
        let enfant = r#"<project>
            <parent>
                <groupId>com.example</groupId>
                <artifactId>parent</artifactId>
                <version>1.0.0</version>
            </parent>
            <artifactId>module-a</artifactId>
            <dependencies>
                <dependency>
                    <groupId>org.springframework</groupId>
                    <artifactId>spring-core</artifactId>
                    <version>${spring.version}</version>
                </dependency>
            </dependencies>
        </project>"#;

        let enfant_brut = parser_pom_xml_brut(enfant);
        let mut poms_bruts = HashMap::new();
        poms_bruts.insert("pom.xml".to_string(), parser_pom_xml_brut(parent));
        poms_bruts.insert("module-a/pom.xml".to_string(), enfant_brut.clone());

        let chaine = chaine_parents_de("module-a/pom.xml", &poms_bruts);
        let dependances = resoudre_dependances_pom(&enfant_brut, &chaine, "module-a/pom.xml");

        assert_eq!(dependances.len(), 1);
        assert_eq!(dependances[0].version, "5.3.12");
    }

    #[test]
    fn resoudre_dependances_pom_conserve_le_token_litteral_quand_le_parent_est_absent_du_depot() {
        let enfant = r#"<project>
            <parent>
                <groupId>com.example</groupId>
                <artifactId>parent</artifactId>
                <version>1.0.0</version>
            </parent>
            <dependencies>
                <dependency>
                    <groupId>org.springframework</groupId>
                    <artifactId>spring-core</artifactId>
                    <version>${spring.version}</version>
                </dependency>
            </dependencies>
        </project>"#;

        let enfant_brut = parser_pom_xml_brut(enfant);
        let mut poms_bruts = HashMap::new();
        poms_bruts.insert("module-a/pom.xml".to_string(), enfant_brut.clone());

        let chaine = chaine_parents_de("module-a/pom.xml", &poms_bruts);
        assert!(chaine.is_empty());
        let dependances = resoudre_dependances_pom(&enfant_brut, &chaine, "module-a/pom.xml");

        assert_eq!(dependances.len(), 1);
        assert_eq!(dependances[0].version, "${spring.version}");
    }

    #[test]
    fn normaliser_version_java_ramene_les_formes_historiques_au_majeur_seul() {
        assert_eq!(normaliser_version_java("1.8").as_deref(), Some("8"));
        assert_eq!(normaliser_version_java(" 1.5 ").as_deref(), Some("5"));
        assert_eq!(normaliser_version_java("17").as_deref(), Some("17"));
        assert_eq!(normaliser_version_java("21").as_deref(), Some("21"));
        assert_eq!(normaliser_version_java("17.0.2").as_deref(), Some("17.0.2"));
        assert_eq!(normaliser_version_java(""), None);
        assert_eq!(normaliser_version_java("${java.version}"), None);
    }

    /// Aide de test : passe un ensemble de `pom.xml` (`chemin`, contenu) à [`extraire_version_java`].
    fn version_java_de(poms: &[(&str, &str)]) -> Option<Dependance> {
        let ordonnes: Vec<(String, PomBrut)> = poms
            .iter()
            .map(|(chemin, contenu)| ((*chemin).to_string(), parser_pom_xml_brut(contenu)))
            .collect();
        let map: HashMap<String, PomBrut> = ordonnes.iter().cloned().collect();
        let index = indexer_poms_par_coordonnees(&ordonnes);
        extraire_version_java(&ordonnes, &map, &index)
    }

    /// Aide de test : chaîne de parents d'un `pom.xml`, l'index de coordonnées étant dérivé de `poms_bruts`
    /// (l'ordre n'importe pas pour ces tests).
    fn chaine_parents_de<'a>(
        chemin: &str,
        poms_bruts: &'a HashMap<String, PomBrut>,
    ) -> Vec<&'a PomBrut> {
        let ordonnes: Vec<(String, PomBrut)> = poms_bruts
            .iter()
            .map(|(chemin, pom)| (chemin.clone(), pom.clone()))
            .collect();
        let index = indexer_poms_par_coordonnees(&ordonnes);
        construire_chaine_parents(chemin, poms_bruts, &index)
    }

    #[test]
    fn extraire_version_java_prend_la_premiere_propriete_presente_dans_lordre_source_target_release()
     {
        let pom = r#"<project><properties>
            <maven.compiler.target>17</maven.compiler.target>
            <maven.compiler.release>21</maven.compiler.release>
        </properties></project>"#;

        let dependance = version_java_de(&[("pom.xml", pom)]);
        assert_eq!(
            dependance.as_ref().map(|d| d.reference.as_str()),
            Some("java")
        );
        assert_eq!(
            dependance.as_ref().map(|d| d.manifeste.as_str()),
            Some("pom.xml")
        );
        // `maven.compiler.source` absent -> `maven.compiler.target` (17) l'emporte sur `release` (21).
        assert_eq!(dependance.map(|d| d.version), Some("17".to_string()));
    }

    #[test]
    fn extraire_version_java_resout_un_token_property_et_normalise() {
        let pom = r#"<project><properties>
            <java.version>1.8</java.version>
            <maven.compiler.source>${java.version}</maven.compiler.source>
        </properties></project>"#;

        assert_eq!(
            version_java_de(&[("pom.xml", pom)]).map(|d| d.version),
            Some("8".to_string())
        );
    }

    #[test]
    fn extraire_version_java_herite_de_la_propriete_du_parent_du_meme_depot() {
        let parent = r#"<project><groupId>com.example</groupId><artifactId>parent</artifactId><version>1</version>
            <properties><maven.compiler.release>17</maven.compiler.release></properties></project>"#;
        let enfant = r#"<project><parent><groupId>com.example</groupId><artifactId>parent</artifactId><version>1</version></parent>
            <artifactId>module-a</artifactId></project>"#;

        assert_eq!(
            version_java_de(&[("pom.xml", parent), ("module-a/pom.xml", enfant)])
                .map(|d| d.version),
            Some("17".to_string())
        );
    }

    #[test]
    fn extraire_version_java_retient_le_majeur_le_plus_eleve_entre_modules_divergents() {
        let module_a = r#"<project><properties><maven.compiler.release>11</maven.compiler.release></properties></project>"#;
        let module_b = r#"<project><properties><maven.compiler.release>21</maven.compiler.release></properties></project>"#;

        assert_eq!(
            version_java_de(&[("a/pom.xml", module_a), ("b/pom.xml", module_b)]).map(|d| d.version),
            Some("21".to_string())
        );
    }

    #[test]
    fn extraire_version_java_absente_quand_aucun_pom_ne_declare_de_propriete() {
        let pom = r#"<project><dependencies><dependency><groupId>a</groupId><artifactId>b</artifactId><version>1</version></dependency></dependencies></project>"#;
        assert_eq!(version_java_de(&[("pom.xml", pom)]), None);
    }

    #[test]
    fn resoudre_dependances_pom_utilise_la_gestion_de_dependances_heritee_pour_completer_une_version_absente()
     {
        let parent = r#"<project>
            <groupId>com.example</groupId>
            <artifactId>parent</artifactId>
            <version>1.0.0</version>
            <dependencyManagement>
                <dependencies>
                    <dependency>
                        <groupId>org.springframework</groupId>
                        <artifactId>spring-core</artifactId>
                        <version>5.3.12</version>
                    </dependency>
                </dependencies>
            </dependencyManagement>
        </project>"#;
        let enfant = r#"<project>
            <parent>
                <groupId>com.example</groupId>
                <artifactId>parent</artifactId>
                <version>1.0.0</version>
            </parent>
            <dependencies>
                <dependency>
                    <groupId>org.springframework</groupId>
                    <artifactId>spring-core</artifactId>
                </dependency>
            </dependencies>
        </project>"#;

        let enfant_brut = parser_pom_xml_brut(enfant);
        let mut poms_bruts = HashMap::new();
        poms_bruts.insert("pom.xml".to_string(), parser_pom_xml_brut(parent));
        poms_bruts.insert("module-a/pom.xml".to_string(), enfant_brut.clone());

        let chaine = chaine_parents_de("module-a/pom.xml", &poms_bruts);
        let dependances = resoudre_dependances_pom(&enfant_brut, &chaine, "module-a/pom.xml");

        assert_eq!(dependances.len(), 1);
        assert_eq!(dependances[0].version, "5.3.12");
    }

    #[test]
    fn fusionner_gestion_dependances_l_enfant_prime_sur_le_parent() {
        let parent = r#"<project>
            <dependencyManagement>
                <dependencies>
                    <dependency>
                        <groupId>org.springframework</groupId>
                        <artifactId>spring-core</artifactId>
                        <version>5.3.12</version>
                    </dependency>
                </dependencies>
            </dependencyManagement>
        </project>"#;
        let enfant_brut = r#"<project>
            <dependencyManagement>
                <dependencies>
                    <dependency>
                        <groupId>org.springframework</groupId>
                        <artifactId>spring-core</artifactId>
                        <version>5.3.20</version>
                    </dependency>
                </dependencies>
            </dependencyManagement>
            <dependencies>
                <dependency>
                    <groupId>org.springframework</groupId>
                    <artifactId>spring-core</artifactId>
                </dependency>
            </dependencies>
        </project>"#;

        let parent_brut = parser_pom_xml_brut(parent);
        let enfant = parser_pom_xml_brut(enfant_brut);
        let dependances = resoudre_dependances_pom(&enfant, &[&parent_brut], "module-a/pom.xml");

        assert_eq!(dependances.len(), 1);
        assert_eq!(dependances[0].version, "5.3.20");
    }

    #[test]
    fn construire_chaine_parents_detecte_un_cycle() {
        let pom_a = r#"<project>
            <parent>
                <groupId>com.example</groupId>
                <artifactId>b</artifactId>
                <version>1.0.0</version>
                <relativePath>../b/pom.xml</relativePath>
            </parent>
        </project>"#;
        let pom_b = r#"<project>
            <parent>
                <groupId>com.example</groupId>
                <artifactId>a</artifactId>
                <version>1.0.0</version>
                <relativePath>../a/pom.xml</relativePath>
            </parent>
        </project>"#;

        let mut poms_bruts = HashMap::new();
        poms_bruts.insert("a/pom.xml".to_string(), parser_pom_xml_brut(pom_a));
        poms_bruts.insert("b/pom.xml".to_string(), parser_pom_xml_brut(pom_b));

        let chaine = chaine_parents_de("a/pom.xml", &poms_bruts);

        assert_eq!(chaine.len(), 1);
    }

    #[test]
    fn construire_chaine_parents_respecte_la_profondeur_maximale() {
        let mut poms_bruts = HashMap::new();
        for niveau in 0..(PROFONDEUR_MAX_CHAINE_PARENTS + 5) {
            let chemin = format!("niveau-{niveau}/pom.xml");
            let contenu = if niveau == 0 {
                "<project></project>".to_string()
            } else {
                format!(
                    r#"<project>
                        <parent>
                            <groupId>com.example</groupId>
                            <artifactId>niveau-{}</artifactId>
                            <version>1.0.0</version>
                            <relativePath>../niveau-{}/pom.xml</relativePath>
                        </parent>
                    </project>"#,
                    niveau - 1,
                    niveau - 1
                )
            };
            poms_bruts.insert(chemin, parser_pom_xml_brut(&contenu));
        }

        let chemin_depart = format!("niveau-{}/pom.xml", PROFONDEUR_MAX_CHAINE_PARENTS + 4);
        let chaine = chaine_parents_de(&chemin_depart, &poms_bruts);

        assert_eq!(chaine.len(), PROFONDEUR_MAX_CHAINE_PARENTS);
    }

    #[test]
    fn resoudre_dependances_pom_multi_module_plusieurs_enfants_partagent_un_parent() {
        let parent = r#"<project>
            <properties>
                <spring.version>5.3.12</spring.version>
            </properties>
        </project>"#;
        let module_a = r#"<project>
            <parent>
                <groupId>com.example</groupId>
                <artifactId>parent</artifactId>
                <version>1.0.0</version>
            </parent>
            <dependencies>
                <dependency>
                    <groupId>org.springframework</groupId>
                    <artifactId>spring-core</artifactId>
                    <version>${spring.version}</version>
                </dependency>
            </dependencies>
        </project>"#;
        let module_b = r#"<project>
            <parent>
                <groupId>com.example</groupId>
                <artifactId>parent</artifactId>
                <version>1.0.0</version>
            </parent>
            <dependencies>
                <dependency>
                    <groupId>org.springframework</groupId>
                    <artifactId>spring-web</artifactId>
                    <version>${spring.version}</version>
                </dependency>
            </dependencies>
        </project>"#;

        let module_a_brut = parser_pom_xml_brut(module_a);
        let module_b_brut = parser_pom_xml_brut(module_b);
        let mut poms_bruts = HashMap::new();
        poms_bruts.insert("pom.xml".to_string(), parser_pom_xml_brut(parent));
        poms_bruts.insert("module-a/pom.xml".to_string(), module_a_brut.clone());
        poms_bruts.insert("module-b/pom.xml".to_string(), module_b_brut.clone());

        let chaine_a = chaine_parents_de("module-a/pom.xml", &poms_bruts);
        let dependances_a = resoudre_dependances_pom(&module_a_brut, &chaine_a, "module-a/pom.xml");
        let chaine_b = chaine_parents_de("module-b/pom.xml", &poms_bruts);
        let dependances_b = resoudre_dependances_pom(&module_b_brut, &chaine_b, "module-b/pom.xml");

        assert_eq!(dependances_a.len(), 1);
        assert_eq!(dependances_a[0].version, "5.3.12");
        assert_eq!(dependances_b.len(), 1);
        assert_eq!(dependances_b[0].version, "5.3.12");
    }

    #[test]
    fn construire_chaine_parents_rattache_par_coordonnees_quand_le_relative_path_par_defaut_ne_mene_nulle_part()
     {
        // Module deux niveaux sous la racine, sans `<relativePath>` : le défaut Maven `../pom.xml` résout vers
        // `apps/pom.xml`, absent du dépôt. Le rattachement par coordonnées `<parent>` retrouve quand même la racine,
        // ce que la résolution purement par chemin ne faisait pas.
        let racine = r#"<project>
            <groupId>com.example</groupId>
            <artifactId>racine</artifactId>
            <version>1.0.0</version>
            <properties><spring.version>6.1.0</spring.version></properties>
            <dependencyManagement>
                <dependencies>
                    <dependency>
                        <groupId>org.springframework</groupId>
                        <artifactId>spring-tx</artifactId>
                        <version>${spring.version}</version>
                    </dependency>
                </dependencies>
            </dependencyManagement>
        </project>"#;
        let module = r#"<project>
            <parent>
                <groupId>com.example</groupId>
                <artifactId>racine</artifactId>
                <version>1.0.0</version>
            </parent>
            <artifactId>service-a</artifactId>
            <dependencies>
                <dependency>
                    <groupId>org.springframework</groupId>
                    <artifactId>spring-core</artifactId>
                    <version>${spring.version}</version>
                </dependency>
                <dependency>
                    <groupId>org.springframework</groupId>
                    <artifactId>spring-tx</artifactId>
                </dependency>
            </dependencies>
        </project>"#;

        let module_brut = parser_pom_xml_brut(module);
        let mut poms_bruts = HashMap::new();
        poms_bruts.insert("pom.xml".to_string(), parser_pom_xml_brut(racine));
        poms_bruts.insert("apps/service-a/pom.xml".to_string(), module_brut.clone());

        let chaine = chaine_parents_de("apps/service-a/pom.xml", &poms_bruts);
        assert_eq!(chaine.len(), 1);
        let dependances = resoudre_dependances_pom(&module_brut, &chaine, "apps/service-a/pom.xml");

        // `${spring.version}` substituée depuis les properties de la racine...
        assert!(
            dependances
                .iter()
                .any(|d| d.reference == "org.springframework:spring-core" && d.version == "6.1.0")
        );
        // ...et version héritée du `<dependencyManagement>` de la racine pour la dépendance sans `<version>`.
        assert!(
            dependances
                .iter()
                .any(|d| d.reference == "org.springframework:spring-tx" && d.version == "6.1.0")
        );
        // Chemin réel du module porté par `manifeste`.
        assert!(
            dependances
                .iter()
                .all(|d| d.manifeste == "apps/service-a/pom.xml")
        );
    }

    #[test]
    fn construire_chaine_parents_retombe_sur_le_relative_path_quand_les_coordonnees_sont_inconnues()
    {
        // Parent sans identité explicite (agrégateur minimal) : absent de l'index de coordonnées, il reste
        // atteignable par le `<relativePath>` par défaut — le repli est conservé.
        let parent = r#"<project>
            <properties><lib.version>2.0</lib.version></properties>
        </project>"#;
        let enfant = r#"<project>
            <parent>
                <groupId>com.example</groupId>
                <artifactId>parent</artifactId>
                <version>1.0.0</version>
            </parent>
            <dependencies>
                <dependency>
                    <groupId>com.acme</groupId>
                    <artifactId>lib</artifactId>
                    <version>${lib.version}</version>
                </dependency>
            </dependencies>
        </project>"#;

        let enfant_brut = parser_pom_xml_brut(enfant);
        let mut poms_bruts = HashMap::new();
        poms_bruts.insert("pom.xml".to_string(), parser_pom_xml_brut(parent));
        poms_bruts.insert("module-a/pom.xml".to_string(), enfant_brut.clone());

        let chaine = chaine_parents_de("module-a/pom.xml", &poms_bruts);
        assert_eq!(chaine.len(), 1);
        let dependances = resoudre_dependances_pom(&enfant_brut, &chaine, "module-a/pom.xml");
        assert_eq!(dependances[0].version, "2.0");
    }

    #[test]
    fn resoudre_dependances_pom_resout_la_property_implicite_project_version_heritee_du_parent() {
        let parent = r#"<project>
            <groupId>com.example</groupId>
            <artifactId>parent</artifactId>
            <version>3.2.1</version>
        </project>"#;
        let enfant = r#"<project>
            <parent>
                <groupId>com.example</groupId>
                <artifactId>parent</artifactId>
                <version>3.2.1</version>
            </parent>
            <artifactId>module-a</artifactId>
            <dependencies>
                <dependency>
                    <groupId>com.example</groupId>
                    <artifactId>module-b</artifactId>
                    <version>${project.version}</version>
                </dependency>
            </dependencies>
        </project>"#;

        let enfant_brut = parser_pom_xml_brut(enfant);
        let mut poms_bruts = HashMap::new();
        poms_bruts.insert("pom.xml".to_string(), parser_pom_xml_brut(parent));
        poms_bruts.insert("module-a/pom.xml".to_string(), enfant_brut.clone());

        let chaine = chaine_parents_de("module-a/pom.xml", &poms_bruts);
        let dependances = resoudre_dependances_pom(&enfant_brut, &chaine, "module-a/pom.xml");

        assert_eq!(dependances.len(), 1);
        assert_eq!(dependances[0].version, "3.2.1");
    }

    #[test]
    fn resoudre_chemin_parent_applique_le_defaut_maven_depuis_un_sous_repertoire() {
        assert_eq!(
            resoudre_chemin_parent("module-a/pom.xml", "../pom.xml"),
            "pom.xml"
        );
        assert_eq!(
            resoudre_chemin_parent("module-a/sub/pom.xml", "../pom.xml"),
            "module-a/pom.xml"
        );
    }

    #[test]
    fn resoudre_chemin_parent_ajoute_pom_xml_quand_le_chemin_relatif_designe_un_repertoire() {
        assert_eq!(
            resoudre_chemin_parent("module-a/pom.xml", "../parent"),
            "parent/pom.xml"
        );
    }

    #[test]
    fn resoudre_chemin_parent_respecte_un_fichier_explicite() {
        assert_eq!(
            resoudre_chemin_parent("module-a/pom.xml", "../parent/pom.xml"),
            "parent/pom.xml"
        );
    }

    #[test]
    fn parser_package_json_exclut_les_dependances_de_developpement() {
        let contenu = r#"{
            "dependencies": { "@angular/core": "18.2.1", "rxjs": "7.8.1" },
            "devDependencies": { "jest": "29.0.0" }
        }"#;

        let dependances = parser_package_json(contenu, "package.json");

        assert_eq!(dependances.len(), 2);
        assert!(
            dependances
                .iter()
                .any(|d| d.reference == "@angular/core" && d.version == "18.2.1")
        );
        assert!(!dependances.iter().any(|d| d.reference == "jest"));
    }

    #[test]
    fn parser_package_json_malforme_retourne_une_liste_vide() {
        assert!(parser_package_json("pas du json", "package.json").is_empty());
    }

    #[test]
    fn parser_package_json_sans_cle_dependencies_retourne_une_liste_vide() {
        assert!(parser_package_json(r#"{ "name": "app" }"#, "package.json").is_empty());
    }

    #[test]
    fn parser_build_gradle_reconnait_les_formes_courtes_avec_et_sans_parentheses() {
        let contenu = "dependencies {\n    implementation 'com.squareup.retrofit2:retrofit:2.11.0'\n    testImplementation(\"junit:junit:4.13.2\")\n    implementation group: 'org.other', name: 'thing', version: '1.0'\n}\n";

        let dependances = parser_build_gradle(contenu, "build.gradle");

        assert_eq!(dependances.len(), 2);
        assert!(
            dependances
                .iter()
                .any(|d| d.reference == "com.squareup.retrofit2:retrofit" && d.version == "2.11.0")
        );
        assert!(dependances.iter().any(|d| d.reference == "junit:junit"));
        assert!(
            !dependances
                .iter()
                .any(|d| d.reference.contains("org.other"))
        );
    }

    #[test]
    fn parser_build_gradle_sans_declaration_reconnue_retourne_une_liste_vide() {
        assert!(parser_build_gradle("// rien à voir ici\n", "build.gradle").is_empty());
    }
}
