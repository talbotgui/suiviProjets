// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Purge des audits anciens (US-025, Phase 7, incrément 4 ; RG-024, RG-025) : purge par densité (audits rapprochés
//! de moins de sept jours) et purge par âge (au-delà de six mois, au choix suppression ou agrégation mensuelle).
//! Toujours proposée avec prévisualisation du volume libéré, jamais automatique (F19) ; le premier et le dernier
//! audit de chaque projet sont systématiquement conservés, quel que soit le mode.
//!
//! Décision d'architecture (à valider par un humain, cf. rapport de développement de cet incrément) : la sélection
//! des audits à supprimer ([`identifiants_a_supprimer_densite`]/[`identifiants_a_supprimer_age`]) n'est calculée
//! qu'à un seul endroit, aussi bien pour la prévisualisation (commande de consultation, sur une copie jetable de la
//! racine) que pour l'exécution effective (commande de mutation, sauvegardée) : le cœur natif ne fait jamais
//! confiance à une liste d'identifiants choisie côté interface pour une opération destructrice et irréversible (cf.
//! `docs/02_documentation/15_normesSecurite.md#contrôle-des-entrées-et-sorties`), et dupliquer cet algorithme de
//! sélection côté TypeScript risquerait une divergence entre l'aperçu montré à l'utilisateur et ce qui est
//! réellement supprimé.
//!
//! Une exécution effective (jamais une prévisualisation, consultation pure) qui supprime au moins un audit consigne
//! une entrée récapitulative au journal des modifications (RG-023 étendue, Phase 10, R10-17) : un arbitrage humain
//! antérieur avait initialement exclu la purge de ce périmètre au motif qu'elle ne touche aucune donnée « de
//! jugement » au sens strict de RG-023 (seuil, référentiel, qualification de membre, politique IA, ref auditée),
//! mais la disparition irréversible d'audits est en pratique la modification la plus significative que le journal
//! puisse tracer ; ce point a été révisé lors de la session d'arbitrage précédant la Phase 10 (cf.
//! `docs/03_plan/plan_13_developpement.md#phase-10--rattrapage--bugs`, R10-17).

use crate::modele::racine::{Audit, DonneesRacine, EntreeJournal};
use chrono::{Datelike, Months, NaiveDate};
use serde::Serialize;
use serde_json::{Value, json};
use std::collections::{HashMap, HashSet};
use thiserror::Error;

/// Anomalie de validation métier levée avant toute purge par âge (mode inconnu).
#[derive(Debug, Error, PartialEq, Eq)]
pub(crate) enum ErreurPurge {
    /// Le mode de purge par âge désigné n'est ni `"suppression"` ni `"agregationMensuelle"`.
    #[error("le mode de purge par âge désigné est inconnu")]
    ModePurgeAgeInconnu,
}

/// Mode de purge par âge (RG-025), choisi par l'utilisateur avant exécution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ModePurgeAge {
    /// Suppression pure des audits antérieurs à la limite d'âge.
    Suppression,
    /// Conservation du seul dernier audit de chaque mois antérieur à la limite d'âge (tendance longue préservée).
    AgregationMensuelle,
}

impl ModePurgeAge {
    /// Interprète le mode transmis par la commande de la Façade.
    fn depuis_str(mode: &str) -> Result<Self, ErreurPurge> {
        match mode {
            "suppression" => Ok(Self::Suppression),
            "agregationMensuelle" => Ok(Self::AgregationMensuelle),
            _ => Err(ErreurPurge::ModePurgeAgeInconnu),
        }
    }
}

/// Résumé d'une prévisualisation ou d'une exécution de purge (F19), restitué à l'utilisateur avant toute
/// confirmation (RG-024, RG-025) : nombre d'audits et de projets concernés, taille compressée de la racine avant
/// et après (même sérialisation/compression que `persistance::moteur::sauvegarder_fichier`, pour un aperçu fidèle
/// du volume réellement libéré sur le fichier de données).
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PrevisualisationPurge {
    pub(crate) nb_audits_supprimes: u32,
    pub(crate) nb_projets_concernes: u32,
    pub(crate) octets_avant: u64,
    pub(crate) octets_apres: u64,
}

/// Taille compressée (zstd, niveau par défaut) de la sérialisation JSON de `donnees`, identique à l'étape de
/// compression effectuée avant chiffrement par `persistance::moteur::sauvegarder_fichier`. `0` si la sérialisation
/// ou la compression échouent, cas non atteignable en pratique pour une `DonneesRacine` valide.
fn taille_compressee(donnees: &DonneesRacine) -> u64 {
    serde_json::to_vec(donnees)
        .ok()
        .and_then(|json| zstd::stream::encode_all(json.as_slice(), 0).ok())
        .map(|compresse| compresse.len() as u64)
        .unwrap_or(0)
}

/// Interprète `Audit.date` (format `AAAA-MM-JJ`, cf. `docs/01_besoin/exemple-donnees.json`) ; `None` si la valeur
/// n'est pas une date syntaxiquement valide (aucun audit connu n'est dans ce cas, garde défensive uniquement).
fn date_audit(audit: &Audit) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(&audit.date, "%Y-%m-%d").ok()
}

/// Identifiants des audits à supprimer par purge de densité (RG-024) au sein de l'historique d'un projet : balayage
/// chronologique avec ancre — le premier audit est conservé comme première ancre, puis seuls les audits situés à
/// au moins sept jours de la dernière ancre conservée restent ; le dernier audit du projet est systématiquement
/// conservé, y compris s'il est plus rapproché que sept jours de la dernière ancre. Un audit dont la date n'est
/// pas interprétable est conservé par prudence plutôt que supprimé.
fn identifiants_a_supprimer_densite(audits: &[Audit]) -> HashSet<String> {
    let mut supprimes = HashSet::new();
    if audits.len() < 3 {
        return supprimes;
    }

    let mut tries: Vec<&Audit> = audits.iter().collect();
    tries.sort_by(|a, b| a.date.cmp(&b.date));
    let Some(dernier) = tries.last() else {
        return supprimes;
    };
    let dernier_id = dernier.id.clone();

    let mut derniere_ancre: Option<NaiveDate> = None;
    for audit in &tries {
        let date_courante = date_audit(audit);
        let conserve = match (derniere_ancre, date_courante) {
            (None, _) | (Some(_), None) => true,
            (Some(ancre), Some(date)) => (date - ancre).num_days() >= 7,
        };
        if conserve {
            if let Some(date) = date_courante {
                derniere_ancre = Some(date);
            }
        } else if audit.id != dernier_id {
            supprimes.insert(audit.id.clone());
        }
    }
    supprimes
}

/// Date limite de la purge par âge (RG-025) : six mois avant `aujourdhui`, ou `aujourdhui` elle-même si ce calcul
/// échoue (cas non atteignable en pratique, garde défensive), pour ne jamais supprimer un audit par excès de
/// prudence.
fn limite_purge_age(aujourdhui: NaiveDate) -> NaiveDate {
    aujourdhui
        .checked_sub_months(Months::new(6))
        .unwrap_or(aujourdhui)
}

/// Identifiants des audits à supprimer par purge par âge (RG-025) au sein de l'historique d'un projet : parmi les
/// audits antérieurs à `limite` (hors premier et dernier audit du projet, toujours conservés), soit tous supprimés
/// (`ModePurgeAge::Suppression`), soit tous supprimés à l'exception du dernier audit de chaque mois calendaire
/// (`ModePurgeAge::AgregationMensuelle`, préservant la tendance longue). Un audit dont la date n'est pas
/// interprétable est conservé par prudence plutôt que supprimé.
fn identifiants_a_supprimer_age(
    audits: &[Audit],
    limite: NaiveDate,
    mode: ModePurgeAge,
) -> HashSet<String> {
    let mut supprimes = HashSet::new();
    if audits.len() < 3 {
        return supprimes;
    }

    let mut tries: Vec<&Audit> = audits.iter().collect();
    tries.sort_by(|a, b| a.date.cmp(&b.date));
    let Some(premier) = tries.first() else {
        return supprimes;
    };
    let Some(dernier) = tries.last() else {
        return supprimes;
    };
    let premier_id = premier.id.clone();
    let dernier_id = dernier.id.clone();

    let candidats: Vec<(&Audit, NaiveDate)> = tries
        .iter()
        .filter(|audit| audit.id != premier_id && audit.id != dernier_id)
        .filter_map(|audit| date_audit(audit).map(|date| (*audit, date)))
        .filter(|(_, date)| *date < limite)
        .collect();

    match mode {
        ModePurgeAge::Suppression => {
            for (audit, _) in &candidats {
                supprimes.insert(audit.id.clone());
            }
        }
        ModePurgeAge::AgregationMensuelle => {
            let mut dernier_par_mois: HashMap<(i32, u32), (&Audit, NaiveDate)> = HashMap::new();
            for (audit, date) in &candidats {
                let cle = (date.year(), date.month());
                let remplace = dernier_par_mois
                    .get(&cle)
                    .is_none_or(|(_, date_existante)| date > date_existante);
                if remplace {
                    dernier_par_mois.insert(cle, (audit, *date));
                }
            }
            let conserves: HashSet<&str> = dernier_par_mois
                .values()
                .map(|(audit, _)| audit.id.as_str())
                .collect();
            for (audit, _) in &candidats {
                if !conserves.contains(audit.id.as_str()) {
                    supprimes.insert(audit.id.clone());
                }
            }
        }
    }
    supprimes
}

/// Applique une purge (densité ou âge) à `racine`, en place, en retirant de chaque projet les audits désignés par
/// `selectionner`, puis renvoie le résumé de l'opération (nombre d'audits/projets concernés, taille compressée
/// avant/après).
fn purger(
    racine: &mut DonneesRacine,
    selectionner: impl Fn(&[Audit]) -> HashSet<String>,
) -> PrevisualisationPurge {
    let octets_avant = taille_compressee(racine);
    let mut nb_audits_supprimes = 0u32;
    let mut nb_projets_concernes = 0u32;
    for groupe in &mut racine.groupes {
        for projet in &mut groupe.projets {
            let a_supprimer = selectionner(&projet.audits);
            if a_supprimer.is_empty() {
                continue;
            }
            nb_projets_concernes += 1;
            nb_audits_supprimes += a_supprimer.len() as u32;
            projet
                .audits
                .retain(|audit| !a_supprimer.contains(&audit.id));
        }
    }
    let octets_apres = taille_compressee(racine);
    PrevisualisationPurge {
        nb_audits_supprimes,
        nb_projets_concernes,
        octets_avant,
        octets_apres,
    }
}

/// Prévisualise une purge par densité (RG-024) : calcule le résumé de l'opération sur une copie jetable de
/// `racine`, sans aucune modification ni sauvegarde effective.
pub(crate) fn previsualiser_purge_densite(racine: &DonneesRacine) -> PrevisualisationPurge {
    let mut copie = racine.clone();
    purger(&mut copie, identifiants_a_supprimer_densite)
}

/// Consigne une entrée récapitulative au journal des modifications (RG-023, R10-17) pour une exécution effective de
/// purge ayant réellement supprimé au moins un audit ; sans effet si `resume.nb_audits_supprimes` est nul (cohérent
/// avec RG-023 : une entrée de journal représente une modification réelle, jamais un no-op).
fn consigner_purge(
    donnees: &mut DonneesRacine,
    resume: &PrevisualisationPurge,
    mode: &str,
    horodatage: String,
) {
    if resume.nb_audits_supprimes == 0 {
        return;
    }
    donnees.journal.push(EntreeJournal {
        id: uuid::Uuid::new_v4().to_string(),
        horodatage,
        objet: "audits".to_string(),
        avant: Value::Null,
        apres: json!({
            "nbAuditsSupprimes": resume.nb_audits_supprimes,
            "nbProjetsConcernes": resume.nb_projets_concernes,
        }),
        origine: "Purge".to_string(),
        detail_origine: Some(mode.to_string()),
    });
}

/// Exécute une purge par densité (RG-024) : retire de `racine`, en place, les audits désignés par
/// [`identifiants_a_supprimer_densite`], puis consigne une entrée de journal si au moins un audit a été supprimé
/// (RG-023, R10-17) ; la sauvegarde effective reste de la responsabilité de la commande de la Façade appelante
/// (`commandes::purge`).
pub(crate) fn executer_purge_densite(
    racine: &mut DonneesRacine,
    horodatage: String,
) -> PrevisualisationPurge {
    let resume = purger(racine, identifiants_a_supprimer_densite);
    consigner_purge(racine, &resume, "densité", horodatage);
    resume
}

/// Prévisualise une purge par âge (RG-025) : calcule le résumé de l'opération, pour le mode désigné, sur une copie
/// jetable de `racine`, sans aucune modification ni sauvegarde effective.
///
/// # Erreurs
///
/// [`ErreurPurge::ModePurgeAgeInconnu`] si `mode` n'est ni `"suppression"` ni `"agregationMensuelle"`.
pub(crate) fn previsualiser_purge_age(
    racine: &DonneesRacine,
    aujourdhui: NaiveDate,
    mode: &str,
) -> Result<PrevisualisationPurge, ErreurPurge> {
    let mode = ModePurgeAge::depuis_str(mode)?;
    let limite = limite_purge_age(aujourdhui);
    let mut copie = racine.clone();
    Ok(purger(&mut copie, |audits| {
        identifiants_a_supprimer_age(audits, limite, mode)
    }))
}

/// Exécute une purge par âge (RG-025) : retire de `racine`, en place, les audits désignés par
/// [`identifiants_a_supprimer_age`] pour le mode désigné, puis consigne une entrée de journal si au moins un audit
/// a été supprimé (RG-023, R10-17) ; la sauvegarde effective reste de la responsabilité de la commande de la Façade
/// appelante (`commandes::purge`).
///
/// # Erreurs
///
/// [`ErreurPurge::ModePurgeAgeInconnu`] si `mode` n'est ni `"suppression"` ni `"agregationMensuelle"`.
pub(crate) fn executer_purge_age(
    racine: &mut DonneesRacine,
    aujourdhui: NaiveDate,
    mode: &str,
    horodatage: String,
) -> Result<PrevisualisationPurge, ErreurPurge> {
    let mode_libelle = mode.to_string();
    let mode = ModePurgeAge::depuis_str(mode)?;
    let limite = limite_purge_age(aujourdhui);
    let resume = purger(racine, |audits| {
        identifiants_a_supprimer_age(audits, limite, mode)
    });
    consigner_purge(racine, &resume, &mode_libelle, horodatage);
    Ok(resume)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modele::racine::{Groupe, Projet};

    fn audit_de_test(id: &str, date: &str) -> Audit {
        Audit {
            id: id.to_string(),
            date: date.to_string(),
            campagne_id: "campagne-1".to_string(),
            resultats: Vec::new(),
        }
    }

    fn racine_avec_audits(audits: Vec<Audit>) -> DonneesRacine {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-27T08:00:00Z");
        racine.groupes.push(Groupe {
            id: "groupe-1".to_string(),
            nom: "Groupe".to_string(),
            description: String::new(),
            instances: Vec::new(),
            membres_connus: Vec::new(),
            annotations: Vec::new(),
            indicateurs_desactives: Vec::new(),
            projets: vec![Projet {
                id: "projet-1".to_string(),
                nom: "Projet".to_string(),
                description: String::new(),
                ia_autorisee: false,
                ia_autorisee_depuis: None,
                premier_commit_interne: None,
                sources: Vec::new(),
                annotations: Vec::new(),
                audits,
            }],
        });
        racine
    }

    #[test]
    fn densite_conserve_tout_avec_moins_de_trois_audits() {
        let racine = racine_avec_audits(vec![
            audit_de_test("a1", "2026-01-01"),
            audit_de_test("a2", "2026-01-02"),
        ]);

        let resume = previsualiser_purge_densite(&racine);

        assert_eq!(resume.nb_audits_supprimes, 0);
        assert_eq!(resume.nb_projets_concernes, 0);
    }

    #[test]
    fn densite_supprime_les_audits_rapproches_conserve_premier_et_dernier() {
        let racine = racine_avec_audits(vec![
            audit_de_test("a1", "2026-01-01"),
            audit_de_test("a2", "2026-01-02"),
            audit_de_test("a3", "2026-01-03"),
            audit_de_test("a4", "2026-01-10"),
            audit_de_test("a5", "2026-01-11"),
        ]);

        let resume = previsualiser_purge_densite(&racine);

        assert_eq!(resume.nb_audits_supprimes, 2);
        assert_eq!(resume.nb_projets_concernes, 1);
    }

    #[test]
    fn executer_purge_densite_retire_effectivement_les_audits() {
        let mut racine = racine_avec_audits(vec![
            audit_de_test("a1", "2026-01-01"),
            audit_de_test("a2", "2026-01-02"),
            audit_de_test("a3", "2026-01-15"),
        ]);

        let resume = executer_purge_densite(&mut racine, "2026-07-29T08:00:00Z".to_string());

        assert_eq!(resume.nb_audits_supprimes, 1);
        let ids_restants: Vec<&str> = racine.groupes[0].projets[0]
            .audits
            .iter()
            .map(|audit| audit.id.as_str())
            .collect();
        assert_eq!(ids_restants, vec!["a1", "a3"]);
    }

    #[test]
    fn executer_purge_densite_consigne_une_entree_de_journal_si_des_audits_sont_supprimes() {
        let mut racine = racine_avec_audits(vec![
            audit_de_test("a1", "2026-01-01"),
            audit_de_test("a2", "2026-01-02"),
            audit_de_test("a3", "2026-01-15"),
        ]);

        executer_purge_densite(&mut racine, "2026-07-29T08:00:00Z".to_string());

        assert_eq!(racine.journal.len(), 1);
        let entree = &racine.journal[0];
        assert_eq!(entree.objet, "audits");
        assert_eq!(entree.origine, "Purge");
        assert_eq!(entree.detail_origine.as_deref(), Some("densité"));
        assert_eq!(entree.apres["nbAuditsSupprimes"], json!(1));
    }

    #[test]
    fn executer_purge_densite_ne_consigne_rien_si_aucun_audit_nest_supprime() {
        let mut racine = racine_avec_audits(vec![
            audit_de_test("a1", "2026-01-01"),
            audit_de_test("a2", "2026-01-02"),
        ]);

        executer_purge_densite(&mut racine, "2026-07-29T08:00:00Z".to_string());

        assert!(racine.journal.is_empty());
    }

    #[test]
    fn age_suppression_retire_les_audits_anterieurs_a_six_mois() {
        let racine = racine_avec_audits(vec![
            audit_de_test("a1", "2024-01-01"),
            audit_de_test("a2", "2024-06-01"),
            audit_de_test("a3", "2024-09-01"),
            audit_de_test("a4", "2026-07-01"),
        ]);
        let aujourdhui = NaiveDate::from_ymd_opt(2026, 7, 27).unwrap_or_default();

        let resultat = previsualiser_purge_age(&racine, aujourdhui, "suppression");

        let resume = resultat.unwrap_or(PrevisualisationPurge {
            nb_audits_supprimes: 0,
            nb_projets_concernes: 0,
            octets_avant: 0,
            octets_apres: 0,
        });
        assert_eq!(resume.nb_audits_supprimes, 2);
        assert_eq!(resume.nb_projets_concernes, 1);
    }

    #[test]
    fn age_agregation_mensuelle_conserve_le_dernier_audit_de_chaque_mois() {
        let mut racine = racine_avec_audits(vec![
            audit_de_test("a1", "2024-01-01"),
            audit_de_test("a2", "2024-01-10"),
            audit_de_test("a3", "2024-01-20"),
            audit_de_test("a4", "2024-02-05"),
            audit_de_test("a5", "2026-07-01"),
        ]);

        let aujourdhui = NaiveDate::from_ymd_opt(2026, 7, 27).unwrap_or_default();
        let resultat = executer_purge_age(
            &mut racine,
            aujourdhui,
            "agregationMensuelle",
            "2026-07-29T08:00:00Z".to_string(),
        );

        assert!(resultat.is_ok());
        let ids_restants: Vec<&str> = racine.groupes[0].projets[0]
            .audits
            .iter()
            .map(|audit| audit.id.as_str())
            .collect();
        assert_eq!(ids_restants, vec!["a1", "a3", "a4", "a5"]);
    }

    #[test]
    fn executer_purge_age_consigne_une_entree_de_journal_avec_le_mode_en_detail() {
        let mut racine = racine_avec_audits(vec![
            audit_de_test("a1", "2024-01-01"),
            audit_de_test("a2", "2024-06-01"),
            audit_de_test("a3", "2026-07-01"),
        ]);
        let aujourdhui = NaiveDate::from_ymd_opt(2026, 7, 27).unwrap_or_default();

        let resultat = executer_purge_age(
            &mut racine,
            aujourdhui,
            "suppression",
            "2026-07-29T08:00:00Z".to_string(),
        );

        assert!(resultat.is_ok());
        assert_eq!(racine.journal.len(), 1);
        assert_eq!(
            racine.journal[0].detail_origine.as_deref(),
            Some("suppression")
        );
    }

    #[test]
    fn age_mode_inconnu_est_rejete() {
        let racine = racine_avec_audits(vec![
            audit_de_test("a1", "2024-01-01"),
            audit_de_test("a2", "2024-06-01"),
            audit_de_test("a3", "2026-07-01"),
        ]);
        let aujourdhui = NaiveDate::from_ymd_opt(2026, 7, 27).unwrap_or_default();

        let resultat = previsualiser_purge_age(&racine, aujourdhui, "modeInconnu");

        assert_eq!(resultat, Err(ErreurPurge::ModePurgeAgeInconnu));
    }
}
