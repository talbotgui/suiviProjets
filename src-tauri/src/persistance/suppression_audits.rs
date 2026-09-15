// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Suppression ciblée d'audits, transverse à tous les projets de tous les groupes (US-063, RG-063,
//! `docs/03_plan/plan_20_triMembresConnusEtDatesCalendaires.md`, Partie D).
//!
//! Objectif initial : retirer en masse les audits produits par des versions antérieures de l'application,
//! repérés par leur date de réalisation / création. Contrairement à la purge par densité ou par âge
//! (`persistance::purge`, RG-024/RG-025), cette suppression ne protège jamais le premier ou le dernier audit d'un
//! projet — elle peut vider entièrement son historique — et porte sur une sélection explicite d'identifiants
//! d'audit transmise par l'interface, jamais sur un critère implicite recalculé côté cœur natif.
//!
//! Sécurité (décision : le cœur natif ne fait jamais confiance à une liste d'identifiants choisie côté interface
//! pour une opération destructrice et irréversible, cf.
//! `docs/02_documentation/15_normesSecurite.md#contrôle-des-entrées-et-sorties`, même principe que
//! `persistance::purge`) : [`supprimer`] revalide que chaque identifiant soumis correspond réellement à un audit
//! existant de la racine avant toute suppression ; un seul identifiant absent rejette l'opération dans son
//! ensemble, sans suppression partielle.
//!
//! Réutilise `persistance::purge::purger` (le sélecteur transmis filtre chaque tranche d'audits d'un projet contre
//! l'ensemble global d'identifiants soumis, plutôt que contre une règle de densité ou d'âge), `taille_compressee`
//! et `consigner_purge` (mode `"suppression ciblée"`, sur le même patron que `"densité"`/`"âge"`) : une seule
//! entrée de journal récapitulative par exécution effective (RG-023), jamais si aucun audit n'a réellement été
//! supprimé.

use crate::modele::racine::DonneesRacine;
use crate::persistance::purge::{self, PrevisualisationPurge};
use serde::Serialize;
use std::collections::HashSet;
use thiserror::Error;

/// Anomalie de validation levée avant toute suppression effective d'audits.
#[derive(Debug, Error, PartialEq, Eq)]
pub(crate) enum ErreurSuppressionAudits {
    /// Au moins un identifiant d'audit soumis ne correspond à aucun audit existant de la racine courante.
    #[error("l'audit désigné est introuvable : {0}")]
    AuditIntrouvable(String),
}

/// Projet qui se retrouverait sans aucun audit si la suppression demandée était appliquée (décision 12 du plan).
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjetVide {
    pub(crate) projet_id: String,
    pub(crate) nom_projet: String,
}

/// Résumé d'une prévisualisation ou d'une exécution de suppression ciblée d'audits, restitué à l'utilisateur avant
/// toute confirmation (RG-063).
#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PrevisualisationSuppressionAudits {
    pub(crate) nb_audits: u32,
    pub(crate) nb_projets_concernes: u32,
    pub(crate) octets_avant: u64,
    pub(crate) octets_apres: u64,
    pub(crate) projets_vides: Vec<ProjetVide>,
}

/// Premier identifiant de `audit_ids` ne correspondant à aucun audit existant de `racine`, `None` si tous existent.
fn premier_identifiant_inconnu<'a>(
    racine: &DonneesRacine,
    audit_ids: &'a HashSet<String>,
) -> Option<&'a String> {
    let existants: HashSet<&str> = racine
        .groupes
        .iter()
        .flat_map(|groupe| groupe.projets.iter())
        .flat_map(|projet| projet.audits.iter())
        .map(|audit| audit.id.as_str())
        .collect();
    audit_ids.iter().find(|id| !existants.contains(id.as_str()))
}

/// Projets dont la totalité des audits actuels figure dans `audit_ids` (donc se retrouveraient sans aucun audit),
/// à l'exclusion d'un projet déjà sans aucun audit (rien à vider).
fn calculer_projets_vides(racine: &DonneesRacine, audit_ids: &HashSet<String>) -> Vec<ProjetVide> {
    racine
        .groupes
        .iter()
        .flat_map(|groupe| groupe.projets.iter())
        .filter(|projet| {
            !projet.audits.is_empty()
                && projet
                    .audits
                    .iter()
                    .all(|audit| audit_ids.contains(&audit.id))
        })
        .map(|projet| ProjetVide {
            projet_id: projet.id.clone(),
            nom_projet: projet.nom.clone(),
        })
        .collect()
}

/// Retire de `racine` les audits dont l'`id` figure dans `audit_ids`, quel que soit leur projet de rattachement,
/// puis renvoie le résumé (nombre d'audits/projets concernés, taille compressée avant/après).
fn supprimer_selon_ids(
    racine: &mut DonneesRacine,
    audit_ids: &HashSet<String>,
) -> PrevisualisationPurge {
    purge::purger(racine, |audits| {
        audits
            .iter()
            .filter(|audit| audit_ids.contains(&audit.id))
            .map(|audit| audit.id.clone())
            .collect()
    })
}

/// Prévisualise une suppression ciblée d'audits : calcule le résumé de l'opération, et la liste des projets qui se
/// retrouveraient sans aucun audit, sur une copie jetable de `racine`, sans aucune modification ni sauvegarde
/// effective. Ne revalide pas l'existence de `audit_ids` (consultation pure, sans effet si un identifiant est déjà
/// obsolète : ce n'est qu'à l'exécution effective, [`supprimer`], que l'absence d'un identifiant est bloquante).
pub(crate) fn previsualiser(
    racine: &DonneesRacine,
    audit_ids: &HashSet<String>,
) -> PrevisualisationSuppressionAudits {
    let projets_vides = calculer_projets_vides(racine, audit_ids);
    let mut copie = racine.clone();
    let resume = supprimer_selon_ids(&mut copie, audit_ids);
    PrevisualisationSuppressionAudits {
        nb_audits: resume.nb_audits_supprimes,
        nb_projets_concernes: resume.nb_projets_concernes,
        octets_avant: resume.octets_avant,
        octets_apres: resume.octets_apres,
        projets_vides,
    }
}

/// Exécute une suppression ciblée d'audits (RG-063) : revalide d'abord que chaque identifiant de `audit_ids`
/// correspond réellement à un audit existant de `racine` (aucune suppression partielle sinon), retire ces audits
/// de `racine` en place, puis consigne une entrée de journal récapitulative si au moins un audit a été supprimé
/// (RG-023) ; la sauvegarde effective reste de la responsabilité de la commande de la Façade appelante
/// (`commandes::suppression_audits`).
///
/// # Erreurs
///
/// [`ErreurSuppressionAudits::AuditIntrouvable`] si au moins un identifiant de `audit_ids` ne correspond à aucun
/// audit existant de `racine`.
pub(crate) fn supprimer(
    racine: &mut DonneesRacine,
    audit_ids: &HashSet<String>,
    horodatage: String,
) -> Result<PrevisualisationSuppressionAudits, ErreurSuppressionAudits> {
    if let Some(id_inconnu) = premier_identifiant_inconnu(racine, audit_ids) {
        return Err(ErreurSuppressionAudits::AuditIntrouvable(
            id_inconnu.clone(),
        ));
    }
    let projets_vides = calculer_projets_vides(racine, audit_ids);
    let resume = supprimer_selon_ids(racine, audit_ids);
    purge::consigner_purge(racine, &resume, "suppression ciblée", horodatage);
    Ok(PrevisualisationSuppressionAudits {
        nb_audits: resume.nb_audits_supprimes,
        nb_projets_concernes: resume.nb_projets_concernes,
        octets_avant: resume.octets_avant,
        octets_apres: resume.octets_apres,
        projets_vides,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modele::racine::{Audit, Groupe, Projet, TypeAudit};

    fn audit(id: &str, date: &str) -> Audit {
        Audit {
            id: id.to_string(),
            date: date.to_string(),
            campagne_id: "campagne-1".to_string(),
            resultats: Vec::new(),
            type_audit: TypeAudit::Reguliere,
            date_execution: None,
        }
    }

    fn racine_avec(projets: Vec<Projet>) -> DonneesRacine {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-09-15T08:00:00Z");
        racine.groupes.push(Groupe {
            id: "groupe-1".to_string(),
            nom: "Groupe".to_string(),
            description: String::new(),
            instances: Vec::new(),
            membres_connus: Vec::new(),
            annotations: Vec::new(),
            indicateurs_desactives: Vec::new(),
            projets,
        });
        racine
    }

    fn projet(id: &str, audits: Vec<Audit>) -> Projet {
        Projet {
            id: id.to_string(),
            nom: format!("Projet {id}"),
            description: String::new(),
            ia_autorisee: false,
            ia_autorisee_depuis: None,
            premier_commit_interne: None,
            sources: Vec::new(),
            annotations: Vec::new(),
            audits,
        }
    }

    #[test]
    fn supprime_exactement_les_ids_fournis_tous_projets_confondus() {
        let mut racine = racine_avec(vec![
            projet(
                "p1",
                vec![audit("a1", "2026-01-01"), audit("a2", "2026-02-01")],
            ),
            projet("p2", vec![audit("a3", "2026-03-01")]),
        ]);
        let ids: HashSet<String> = ["a1".to_string(), "a3".to_string()].into_iter().collect();

        let resultat =
            supprimer(&mut racine, &ids, "2026-09-15T10:00:00Z".to_string()).unwrap_or_default();

        assert_eq!(resultat.nb_audits, 2);
        assert_eq!(resultat.nb_projets_concernes, 2);
        let audits_p1: Vec<&str> = racine.groupes[0].projets[0]
            .audits
            .iter()
            .map(|a| a.id.as_str())
            .collect();
        assert_eq!(audits_p1, vec!["a2"]);
        assert!(racine.groupes[0].projets[1].audits.is_empty());
    }

    #[test]
    fn rejette_sans_suppression_partielle_si_un_id_est_introuvable() {
        let mut racine = racine_avec(vec![projet(
            "p1",
            vec![audit("a1", "2026-01-01"), audit("a2", "2026-02-01")],
        )]);
        let ids: HashSet<String> = ["a1".to_string(), "id-inexistant".to_string()]
            .into_iter()
            .collect();

        let resultat = supprimer(&mut racine, &ids, "2026-09-15T10:00:00Z".to_string());

        assert_eq!(
            resultat,
            Err(ErreurSuppressionAudits::AuditIntrouvable(
                "id-inexistant".to_string()
            ))
        );
        assert_eq!(racine.groupes[0].projets[0].audits.len(), 2);
    }

    #[test]
    fn autorise_et_signale_un_projet_entierement_vide() {
        let mut racine = racine_avec(vec![projet("p1", vec![audit("a1", "2026-01-01")])]);
        let ids: HashSet<String> = ["a1".to_string()].into_iter().collect();

        let resultat =
            supprimer(&mut racine, &ids, "2026-09-15T10:00:00Z".to_string()).unwrap_or_default();

        assert!(racine.groupes[0].projets[0].audits.is_empty());
        assert_eq!(
            resultat.projets_vides,
            vec![ProjetVide {
                projet_id: "p1".to_string(),
                nom_projet: "Projet p1".to_string(),
            }]
        );
    }

    #[test]
    fn consigne_une_unique_entree_de_journal_recapitulative() {
        let mut racine = racine_avec(vec![projet(
            "p1",
            vec![audit("a1", "2026-01-01"), audit("a2", "2026-02-01")],
        )]);
        let ids: HashSet<String> = ["a1".to_string(), "a2".to_string()].into_iter().collect();

        supprimer(&mut racine, &ids, "2026-09-15T10:00:00Z".to_string()).unwrap_or_default();

        assert_eq!(racine.journal.len(), 1);
        assert_eq!(racine.journal[0].objet, "audits");
        assert_eq!(
            racine.journal[0].detail_origine.as_deref(),
            Some("suppression ciblée")
        );
    }

    #[test]
    fn ne_journalise_rien_si_aucun_audit_reellement_supprime() {
        let mut racine = racine_avec(vec![projet("p1", vec![audit("a1", "2026-01-01")])]);
        let ids: HashSet<String> = HashSet::new();

        supprimer(&mut racine, &ids, "2026-09-15T10:00:00Z".to_string()).unwrap_or_default();

        assert!(racine.journal.is_empty());
    }

    #[test]
    fn previsualisation_ne_modifie_jamais_la_racine() {
        let racine = racine_avec(vec![projet(
            "p1",
            vec![audit("a1", "2026-01-01"), audit("a2", "2026-02-01")],
        )]);
        let ids: HashSet<String> = ["a1".to_string()].into_iter().collect();

        let resultat = previsualiser(&racine, &ids);

        assert_eq!(resultat.nb_audits, 1);
        assert_eq!(resultat.nb_projets_concernes, 1);
        assert_eq!(racine.groupes[0].projets[0].audits.len(), 2);
    }

    #[test]
    fn previsualisation_accepte_un_id_inconnu_sans_echouer() {
        let racine = racine_avec(vec![projet("p1", vec![audit("a1", "2026-01-01")])]);
        let ids: HashSet<String> = ["id-inexistant".to_string()].into_iter().collect();

        let resultat = previsualiser(&racine, &ids);

        assert_eq!(resultat.nb_audits, 0);
    }
}
