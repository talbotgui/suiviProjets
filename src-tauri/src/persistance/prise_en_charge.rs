// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Module de coordination du calcul de la date de prise en charge d'un projet (US-058, RG-058, achèvement de
//! F17 « premier commit interne », `docs/03_plan/plan_18_datePriseEnCharge.md`).
//!
//! Rôle : à partir d'un groupe et d'un projet déjà chargés en mémoire, construire l'empreinte du sous-ensemble
//! `interne` des membres connus, dériver la table de correspondance des courriels d'auteur de commit, boucler sur
//! les sources GitLab du projet (via un connecteur injecté, jamais appelé directement ici — la couche
//! `persistance` ne dépend pas du réseau) et retenir la **plus ancienne** date de premier commit interne. Ce
//! module **n'écrit jamais sur le disque** : il retourne la structure calculée, la persistance conditionnelle
//! (décision 6 du plan : aucune écriture si le résultat est inchangé) restant à la charge du flux appelant.
//!
//! Limite connue de la table de correspondance (à trancher en relecture, cf. rapport de développement) : la
//! précédence [RG-007](../../../docs/02_documentation/05_reglesGestion.md) est appliquée **au sein d'un même
//! canal** (un courriel exact ou un domaine également porté par une règle non `interne` de même canal est retiré),
//! mais le masquage **inter-canaux** (un courriel exact `client` masquant une règle de domaine `interne` qui le
//! couvrirait) n'est pas reproduit ici : la résolution fine du statut d'affichage reste celle du Moteur de
//! jugement (interface), non modifiée par ce plan (décision 20).

use crate::connecteurs::commun::ErreurConnecteur;
use crate::connecteurs::gitlab::{CorrespondanceInterne, ResultatPremierCommitInterne};
use crate::modele::racine::{
    Groupe, PremierCommitInterne, Projet, Source, StatutMembre, StatutPremierCommit, TypeCritere,
    TypeSource,
};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::future::Future;
use std::pin::Pin;

/// Future retournée par le connecteur injecté à [`calculer_prise_en_charge`] : résout le premier commit interne
/// d'une source GitLab, ou une anomalie de connecteur (propagée telle quelle, décision : le flux appelant unitaire
/// notifie l'erreur, l'orchestrateur de campagne l'absorbe par projet).
pub(crate) type FutureResultatCommit<'a> = Pin<
    Box<dyn Future<Output = Result<ResultatPremierCommitInterne, ErreurConnecteur>> + Send + 'a>,
>;

/// Condensé SHA-256 (préfixé `sha256:`) du sous-ensemble `interne` des membres connus du groupe (RG-058,
/// décision 15 du plan : **seule** implémentation de cette empreinte, exposée à l'interface par la commande
/// `empreinteReferentielInterne`).
///
/// Sont projetés, pour chaque règle de statut [`StatutMembre::Interne`], le triplet
/// `(critere, typeCritere, aliasEmail)` — **jamais `partiLe`** (décision 11 : marquer un interne comme parti ne
/// périme pas le calcul de prise en charge). Les triplets sont triés puis sérialisés en JSON (tableau de tableaux,
/// forme stable indépendante de l'ordre des champs d'une structure) avant condensation.
pub(crate) fn empreinte_referentiel_interne(groupe: &Groupe) -> String {
    let mut triplets: Vec<(&str, &'static str, &str)> = groupe
        .membres_connus
        .iter()
        .filter(|membre| membre.statut == StatutMembre::Interne)
        .map(|membre| {
            (
                membre.critere.as_str(),
                libelle_type_critere(membre.type_critere),
                membre.alias_email.as_deref().unwrap_or(""),
            )
        })
        .collect();
    triplets.sort_unstable();

    // `serde_json::to_vec` d'un `Vec` de tuples de chaînes ne peut pas échouer ; `unwrap_or_default` évite malgré
    // tout `.unwrap()` (interdit par les normes) et produirait au pire une empreinte d'entrée vide, jamais un
    // panic.
    let serialise = serde_json::to_vec(&triplets).unwrap_or_default();
    let mut hacheur = Sha256::new();
    hacheur.update(&serialise);
    format!("sha256:{:x}", hacheur.finalize())
}

/// Libellé `camelCase` stable d'un type de critère, utilisé pour l'empreinte (aligné sur la sérialisation serde de
/// [`TypeCritere`]).
fn libelle_type_critere(type_critere: TypeCritere) -> &'static str {
    match type_critere {
        TypeCritere::Username => "username",
        TypeCritere::Email => "email",
        TypeCritere::DomaineEmail => "domaineEmail",
    }
}

/// Construit la table de correspondance des courriels d'auteur de commit à partir des règles `interne` du groupe
/// (RG-058), **sans filtrer sur `partiLe`** (décision 10 : un interne parti reste pris en compte, ses anciens
/// commits sont des commits internes légitimes).
///
/// Précédence appliquée : au sein d'un même canal, un `critere` également porté par une règle **non `interne`** du
/// même `typeCritere` est retiré (RG-008 : un conflit de statut sur le même critère ne date pas la prise en
/// charge). Les règles de type `username` n'alimentent que par leur éventuel `aliasEmail` (le login n'est pas
/// exposé par l'API des commits).
pub(crate) fn construire_correspondance_interne(groupe: &Groupe) -> CorrespondanceInterne {
    let courriels_non_internes: HashSet<&str> = groupe
        .membres_connus
        .iter()
        .filter(|membre| {
            membre.statut != StatutMembre::Interne && membre.type_critere == TypeCritere::Email
        })
        .map(|membre| membre.critere.as_str())
        .collect();
    let domaines_non_internes: HashSet<String> = groupe
        .membres_connus
        .iter()
        .filter(|membre| {
            membre.statut != StatutMembre::Interne
                && membre.type_critere == TypeCritere::DomaineEmail
        })
        .map(|membre| membre.critere.trim().trim_start_matches('@').to_lowercase())
        .collect();

    let mut courriels_exacts: Vec<String> = Vec::new();
    let mut alias_courriels: Vec<String> = Vec::new();
    let mut domaines: Vec<String> = Vec::new();
    for membre in &groupe.membres_connus {
        if membre.statut != StatutMembre::Interne {
            continue;
        }
        match membre.type_critere {
            TypeCritere::Email => {
                if !courriels_non_internes.contains(membre.critere.as_str()) {
                    courriels_exacts.push(membre.critere.clone());
                }
            }
            TypeCritere::DomaineEmail => {
                let normalise = membre.critere.trim().trim_start_matches('@').to_lowercase();
                if !domaines_non_internes.contains(&normalise) {
                    domaines.push(membre.critere.clone());
                }
            }
            TypeCritere::Username => {}
        }
        if let Some(alias) = &membre.alias_email {
            alias_courriels.push(alias.clone());
        }
    }
    CorrespondanceInterne::nouvelle(courriels_exacts, alias_courriels, domaines)
}

/// Calcule la date de prise en charge d'un projet (RG-058). `interroger_source` est le connecteur injecté : il
/// reçoit une source GitLab (clonée) et la table de correspondance (clonée), et résout son premier commit interne.
///
/// Ordre des décisions (RG-058) : aucune règle `interne` → `AucuneRegleInterne` **sans aucun appel** ; aucune
/// source GitLab → `NonApplicable` ; sinon, sur l'ensemble des sources : au moins un `Trouve` → `Determine` avec la
/// **date minimale** ; sinon toutes les sources `DepotVide` → `DepotVide` ; sinon au moins une `TropDeCommits` →
/// `IndetermineTropDeCommits` ; sinon `AucunMembreInterne`. `calcule_le` et `empreinte_referentiel` sont portés par
/// **toutes** les variantes.
///
/// # Erreurs
///
/// Propage la première [`ErreurConnecteur`] rencontrée (anomalie réseau, authentification, droits) : `DepotVide` et
/// `TropDeCommits` ne sont **pas** des erreurs (ce sont des issues de [`ResultatPremierCommitInterne`]).
pub(crate) async fn calculer_prise_en_charge<'a, F>(
    groupe: &Groupe,
    projet: &Projet,
    calcule_le: String,
    interroger_source: F,
) -> Result<PremierCommitInterne, ErreurConnecteur>
where
    F: Fn(Source, CorrespondanceInterne) -> FutureResultatCommit<'a>,
{
    let empreinte_referentiel = empreinte_referentiel_interne(groupe);
    let correspondance = construire_correspondance_interne(groupe);
    let enrober = |statut: StatutPremierCommit| PremierCommitInterne {
        statut,
        calcule_le: calcule_le.clone(),
        empreinte_referentiel: empreinte_referentiel.clone(),
    };

    if correspondance.est_vide() {
        return Ok(enrober(StatutPremierCommit::AucuneRegleInterne));
    }

    let sources_gitlab: Vec<&Source> = projet
        .sources
        .iter()
        .filter(|source| source.type_source == TypeSource::DepotGitlab)
        .collect();
    if sources_gitlab.is_empty() {
        return Ok(enrober(StatutPremierCommit::NonApplicable));
    }

    let mut meilleur: Option<(chrono::NaiveDate, String, String)> = None;
    let mut nombre_depot_vide = 0usize;
    let mut nombre_trop_de_commits = 0usize;
    for source in &sources_gitlab {
        match interroger_source((*source).clone(), correspondance.clone()).await? {
            ResultatPremierCommitInterne::Trouve {
                date,
                sha,
                email_auteur,
            } => {
                let date_calendaire = chrono::NaiveDate::parse_from_str(&date, "%Y-%m-%d")
                    .map_err(|erreur| ErreurConnecteur::ReponseInattendue {
                        message: format!("Date de commit « {date} » invalide : {erreur}"),
                    })?;
                if meilleur
                    .as_ref()
                    .is_none_or(|(minimale, _, _)| date_calendaire < *minimale)
                {
                    meilleur = Some((date_calendaire, sha, email_auteur));
                }
            }
            ResultatPremierCommitInterne::DepotVide => nombre_depot_vide += 1,
            ResultatPremierCommitInterne::TropDeCommits => nombre_trop_de_commits += 1,
            ResultatPremierCommitInterne::AucunCommitInterne => {}
        }
    }

    let statut = match meilleur {
        Some((date, sha, email_auteur)) => StatutPremierCommit::Determine {
            date: date.format("%Y-%m-%d").to_string(),
            sha,
            email_auteur,
        },
        None if nombre_depot_vide == sources_gitlab.len() => StatutPremierCommit::DepotVide,
        None if nombre_trop_de_commits > 0 => StatutPremierCommit::IndetermineTropDeCommits,
        None => StatutPremierCommit::AucunMembreInterne,
    };
    Ok(enrober(statut))
}

// Les helpers `recalcul_necessaire` (pré-filtre de campagne) et `identique` (garde « pas d'écriture si inchangé »,
// décision 6) que le §4.2 du plan rattache à ce module sont réalisés là où ils sont réellement consommés :
// `recalcul_necessaire` côté interface (décision explicite du §5.3 : « logique triviale de comparaison, sans hash
// côté interface »), à l'incrément 4 ; `identique` au plus près du flux d'intégration du brouillon, à l'incrément
// 6. Ils ne sont pas introduits ici pour ne pas laisser de code mort sous le garde-fou CI `-D warnings` (même
// arbitrage que la fusion des incréments 1 et 3).

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modele::racine::{Instance, MembreConnu, TypeInstance};

    fn membre_interne(critere: &str, type_critere: TypeCritere) -> MembreConnu {
        MembreConnu {
            id: format!("membre-{critere}"),
            critere: critere.to_string(),
            type_critere,
            statut: StatutMembre::Interne,
            libelle: None,
            alias_email: None,
            parti_le: None,
        }
    }

    fn groupe_avec(membres: Vec<MembreConnu>) -> Groupe {
        Groupe {
            id: "groupe-1".to_string(),
            nom: "Groupe".to_string(),
            description: String::new(),
            instances: vec![Instance {
                id: "instance-1".to_string(),
                type_instance: TypeInstance::Gitlab,
                nom: "GitLab".to_string(),
                url_base: "https://gitlab.example.test".to_string(),
            }],
            membres_connus: membres,
            annotations: Vec::new(),
            indicateurs_desactives: Vec::new(),
            projets: Vec::new(),
        }
    }

    fn source_gitlab(id: &str) -> Source {
        Source {
            id: id.to_string(),
            instance_id: "instance-1".to_string(),
            type_source: TypeSource::DepotGitlab,
            id_externe: format!("ext-{id}"),
            ref_auditee: None,
        }
    }

    fn projet_avec(sources: Vec<Source>) -> Projet {
        Projet {
            id: "projet-1".to_string(),
            nom: "Projet".to_string(),
            description: String::new(),
            ia_autorisee: false,
            ia_autorisee_depuis: None,
            premier_commit_interne: None,
            sources,
            annotations: Vec::new(),
            audits: Vec::new(),
        }
    }

    /// Connecteur simulé : associe à chaque `id` de source le résultat à renvoyer.
    fn connecteur_fige(
        reponses: std::collections::HashMap<String, ResultatPremierCommitInterne>,
    ) -> impl Fn(Source, CorrespondanceInterne) -> FutureResultatCommit<'static> {
        move |source, _correspondance| {
            let reponse = reponses.get(&source.id).cloned();
            Box::pin(async move {
                reponse.ok_or_else(|| ErreurConnecteur::ReponseInattendue {
                    message: format!("aucune réponse simulée pour la source {}", source.id),
                })
            })
        }
    }

    #[tokio::test]
    async fn aucune_regle_interne_sans_appel_reseau() -> Result<(), ErreurConnecteur> {
        let groupe = groupe_avec(vec![MembreConnu {
            statut: StatutMembre::Client,
            ..membre_interne("client.test", TypeCritere::DomaineEmail)
        }]);
        let projet = projet_avec(vec![source_gitlab("s1")]);
        // Le connecteur panique s'il est appelé : la branche « aucune règle interne » ne doit rien interroger.
        let connecteur =
            |_source: Source, _c: CorrespondanceInterne| -> FutureResultatCommit<'static> {
                Box::pin(async {
                    panic!("aucun appel réseau attendu quand aucune règle interne n'existe")
                })
            };

        let resultat =
            calculer_prise_en_charge(&groupe, &projet, "2026-09-03".to_string(), connecteur)
                .await?;

        assert_eq!(resultat.statut, StatutPremierCommit::AucuneRegleInterne);
        assert_eq!(resultat.calcule_le, "2026-09-03");
        assert!(resultat.empreinte_referentiel.starts_with("sha256:"));
        Ok(())
    }

    #[tokio::test]
    async fn non_applicable_sans_source_gitlab() -> Result<(), ErreurConnecteur> {
        let groupe = groupe_avec(vec![membre_interne("corp.test", TypeCritere::DomaineEmail)]);
        let projet = projet_avec(vec![Source {
            type_source: TypeSource::ProjetSonar,
            ..source_gitlab("s1")
        }]);

        let resultat = calculer_prise_en_charge(
            &groupe,
            &projet,
            "2026-09-03".to_string(),
            connecteur_fige(std::collections::HashMap::new()),
        )
        .await?;

        assert_eq!(resultat.statut, StatutPremierCommit::NonApplicable);
        Ok(())
    }

    #[tokio::test]
    async fn retient_la_date_minimale_parmi_deux_sources() -> Result<(), ErreurConnecteur> {
        let groupe = groupe_avec(vec![membre_interne("corp.test", TypeCritere::DomaineEmail)]);
        let projet = projet_avec(vec![source_gitlab("s1"), source_gitlab("s2")]);
        let mut reponses = std::collections::HashMap::new();
        reponses.insert(
            "s1".to_string(),
            ResultatPremierCommitInterne::Trouve {
                date: "2021-05-10".to_string(),
                sha: "sha-s1".to_string(),
                email_auteur: "a@corp.test".to_string(),
            },
        );
        reponses.insert(
            "s2".to_string(),
            ResultatPremierCommitInterne::Trouve {
                date: "2019-02-01".to_string(),
                sha: "sha-s2".to_string(),
                email_auteur: "b@corp.test".to_string(),
            },
        );

        let resultat = calculer_prise_en_charge(
            &groupe,
            &projet,
            "2026-09-03".to_string(),
            connecteur_fige(reponses),
        )
        .await?;

        assert_eq!(
            resultat.statut,
            StatutPremierCommit::Determine {
                date: "2019-02-01".to_string(),
                sha: "sha-s2".to_string(),
                email_auteur: "b@corp.test".to_string(),
            }
        );
        Ok(())
    }

    #[tokio::test]
    async fn depot_vide_si_toutes_les_sources_sont_vides() -> Result<(), ErreurConnecteur> {
        let groupe = groupe_avec(vec![membre_interne("corp.test", TypeCritere::DomaineEmail)]);
        let projet = projet_avec(vec![source_gitlab("s1"), source_gitlab("s2")]);
        let mut reponses = std::collections::HashMap::new();
        reponses.insert("s1".to_string(), ResultatPremierCommitInterne::DepotVide);
        reponses.insert("s2".to_string(), ResultatPremierCommitInterne::DepotVide);

        let resultat = calculer_prise_en_charge(
            &groupe,
            &projet,
            "2026-09-03".to_string(),
            connecteur_fige(reponses),
        )
        .await?;

        assert_eq!(resultat.statut, StatutPremierCommit::DepotVide);
        Ok(())
    }

    #[tokio::test]
    async fn indetermine_si_une_source_tronquee_sans_candidat() -> Result<(), ErreurConnecteur> {
        let groupe = groupe_avec(vec![membre_interne("corp.test", TypeCritere::DomaineEmail)]);
        let projet = projet_avec(vec![source_gitlab("s1"), source_gitlab("s2")]);
        let mut reponses = std::collections::HashMap::new();
        reponses.insert(
            "s1".to_string(),
            ResultatPremierCommitInterne::AucunCommitInterne,
        );
        reponses.insert(
            "s2".to_string(),
            ResultatPremierCommitInterne::TropDeCommits,
        );

        let resultat = calculer_prise_en_charge(
            &groupe,
            &projet,
            "2026-09-03".to_string(),
            connecteur_fige(reponses),
        )
        .await?;

        assert_eq!(
            resultat.statut,
            StatutPremierCommit::IndetermineTropDeCommits
        );
        Ok(())
    }

    #[tokio::test]
    async fn un_interne_parti_date_toujours_la_prise_en_charge() -> Result<(), ErreurConnecteur> {
        // Règle `interne` portant une date de départ : la personne est partie, mais son ancien commit reste un
        // commit interne légitime (décision 10 du plan).
        let groupe = groupe_avec(vec![MembreConnu {
            parti_le: Some("2022-01-01".to_string()),
            ..membre_interne("ancien@corp.test", TypeCritere::Email)
        }]);
        let projet = projet_avec(vec![source_gitlab("s1")]);
        let mut reponses = std::collections::HashMap::new();
        reponses.insert(
            "s1".to_string(),
            ResultatPremierCommitInterne::Trouve {
                date: "2020-03-15".to_string(),
                sha: "sha-ancien".to_string(),
                email_auteur: "ancien@corp.test".to_string(),
            },
        );

        let resultat = calculer_prise_en_charge(
            &groupe,
            &projet,
            "2026-09-03".to_string(),
            connecteur_fige(reponses),
        )
        .await?;

        assert!(matches!(
            resultat.statut,
            StatutPremierCommit::Determine { .. }
        ));
        // La table de correspondance inclut bien la personne partie.
        assert!(construire_correspondance_interne(&groupe).correspond("ancien@corp.test"));
        Ok(())
    }

    #[tokio::test]
    async fn propage_une_anomalie_de_connecteur() {
        let groupe = groupe_avec(vec![membre_interne("corp.test", TypeCritere::DomaineEmail)]);
        let projet = projet_avec(vec![source_gitlab("s1")]);
        let connecteur =
            |_source: Source, _c: CorrespondanceInterne| -> FutureResultatCommit<'static> {
                Box::pin(async {
                    Err(ErreurConnecteur::AuthentificationRefusee {
                        message: "401".to_string(),
                    })
                })
            };

        let resultat =
            calculer_prise_en_charge(&groupe, &projet, "2026-09-03".to_string(), connecteur).await;

        assert!(matches!(
            resultat,
            Err(ErreurConnecteur::AuthentificationRefusee { .. })
        ));
    }

    #[test]
    fn empreinte_stable_independamment_de_lordre_des_regles() {
        let groupe_a = groupe_avec(vec![
            membre_interne("a@corp.test", TypeCritere::Email),
            membre_interne("corp.test", TypeCritere::DomaineEmail),
        ]);
        let groupe_b = groupe_avec(vec![
            membre_interne("corp.test", TypeCritere::DomaineEmail),
            membre_interne("a@corp.test", TypeCritere::Email),
        ]);
        assert_eq!(
            empreinte_referentiel_interne(&groupe_a),
            empreinte_referentiel_interne(&groupe_b)
        );
    }

    #[test]
    fn empreinte_sensible_a_lajout_dune_regle_interne() {
        let groupe = groupe_avec(vec![membre_interne("corp.test", TypeCritere::DomaineEmail)]);
        let groupe_augmente = groupe_avec(vec![
            membre_interne("corp.test", TypeCritere::DomaineEmail),
            membre_interne("autre@corp.test", TypeCritere::Email),
        ]);
        assert_ne!(
            empreinte_referentiel_interne(&groupe),
            empreinte_referentiel_interne(&groupe_augmente)
        );
    }

    #[test]
    fn empreinte_invariante_vis_a_vis_de_parti_le_et_des_regles_non_internes() {
        let base = groupe_avec(vec![membre_interne("corp.test", TypeCritere::DomaineEmail)]);
        let variante = groupe_avec(vec![
            MembreConnu {
                parti_le: Some("2020-01-01".to_string()),
                libelle: Some("Ancien".to_string()),
                ..membre_interne("corp.test", TypeCritere::DomaineEmail)
            },
            MembreConnu {
                statut: StatutMembre::Client,
                ..membre_interne("client.test", TypeCritere::DomaineEmail)
            },
        ]);
        assert_eq!(
            empreinte_referentiel_interne(&base),
            empreinte_referentiel_interne(&variante)
        );
    }

    #[test]
    fn correspondance_exclut_un_courriel_egalement_porte_par_une_regle_non_interne() {
        let groupe = groupe_avec(vec![
            membre_interne("partage@corp.test", TypeCritere::Email),
            MembreConnu {
                statut: StatutMembre::Client,
                ..membre_interne("partage@corp.test", TypeCritere::Email)
            },
        ]);
        assert!(!construire_correspondance_interne(&groupe).correspond("partage@corp.test"));
    }
}
