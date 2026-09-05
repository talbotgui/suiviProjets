// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Cycle de vie du brouillon d'une campagne d'audit (US-014, Phase 5, incrément 2) : enregistrement des résultats
//! d'une campagne dans la zone de brouillon (RG-019), puis intégration ou rejet de ces résultats, tout ou projet
//! par projet (`docs/01_besoin/Specification.md#59-f09--brouillon-daudit-et-validation-avant-intégration`).
//!
//! Comme `persistance::administration`, ce module ne touche jamais le disque ni l'état de session : il opère
//! uniquement sur une [`DonneesRacine`] déjà chargée en mémoire. La sauvegarde effective reste de la
//! responsabilité des commandes de la Façade qui l'invoquent (`commandes::audit`).
//!
//! `enregistrer_brouillon` et `rejeter_brouillon` ne consignent aucune entrée au journal des modifications : RG-023
//! énumère explicitement les données de jugement consignées (seuils, référentiels de dépendances/marqueurs IA,
//! qualification d'un membre, politique IA d'un projet, ref auditée d'une source) et n'y inclut ni les campagnes ni
//! le brouillon lui-même. `integrer_brouillon` fait exception depuis le plan_18 (incrément 6, US-058, RG-058) pour
//! la seule application de `Brouillon.prises_en_charge` : chaque entrée appliquée au `Projet` correspondant
//! consigne une entrée de journal (décision 7 du plan), l'audit intégré lui-même restant hors RG-023 comme avant.

use crate::modele::racine::{
    Brouillon, Campagne, DonneesRacine, EntreeJournal, PremierCommitInterne, Projet,
    ResultatBrouillonProjet, StatutResultatBrouillon, StatutVerdict, Verdict,
};
use serde_json::Value;
use std::collections::HashMap;
use thiserror::Error;

/// Origine consignée au journal des modifications (RG-023) pour une entrée de prise en charge appliquée à
/// l'intégration d'un brouillon de campagne (US-058, RG-058, plan_18 incrément 6).
const ORIGINE_CAMPAGNE: &str = "Campagne";

/// Anomalie de validation métier levée avant toute tentative de sauvegarde par le cycle de vie du brouillon.
#[derive(Debug, Error, PartialEq, Eq)]
pub(crate) enum ErreurAudit {
    /// Une nouvelle campagne ne peut être enregistrée tant qu'un brouillon existant n'a pas été intégralement
    /// traité (RG-019).
    #[error("un brouillon existe déjà et doit être traité avant d'en enregistrer un nouveau")]
    BrouillonDejaExistant,
    /// Aucun brouillon n'est actuellement en attente de traitement.
    #[error("aucun brouillon n'est actuellement en attente de traitement")]
    AucunBrouillonCourant,
    /// Un identifiant de projet fourni ne désigne aucune entrée en attente du brouillon courant.
    #[error("le projet désigné ne fait pas partie du brouillon courant")]
    ProjetAbsentDuBrouillon,
    /// Le projet désigné par une entrée du brouillon n'existe plus dans les données courantes.
    #[error("le projet désigné par cette entrée du brouillon est introuvable")]
    ProjetIntrouvable,
}

/// Enregistre les résultats d'une campagne dans la zone de brouillon (US-009, US-014), en amont de leur validation
/// par l'utilisateur.
///
/// Signature volontairement plus riche que celle citée par
/// `docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`
/// (`enregistrerBrouillon(campagneId, resultatsParProjet)`) : décision arbitraire documentée dans le
/// compte-rendu de développement de cette phase, sur le même principe que l'extension déjà pratiquée pour
/// `qualifierMembre` en Phase 4. `perimetre` et `verdicts` couvrent l'intégralité du périmètre demandé, y compris
/// les projets échoués ou ignorés (RG-018), qui ne portent aucune entrée dans `resultats_par_projet` faute de
/// résultat exploitable.
///
/// Le statut de chaque [`ResultatBrouillonProjet`] fourni est forcé à [`StatutResultatBrouillon::EnAttente`],
/// indépendamment de la valeur soumise par l'appelant : cette fonction est le seul point d'entrée qui crée un
/// brouillon, sa cohérence interne ne doit jamais dépendre d'une valeur externe non maîtrisée.
///
/// Si `resultats_par_projet` est vide (campagne en échec total), aucun brouillon n'est créé : `donnees.brouillon`
/// reste inchangé, pour que le verrou RG-019 ne bloque pas le lancement d'une nouvelle campagne derrière un
/// brouillon sans aucune entrée à traiter. La campagne elle-même (avec ses verdicts d'échec) est toujours
/// consignée dans `donnees.campagnes`.
///
/// # Erreurs
///
/// [`ErreurAudit::BrouillonDejaExistant`] si `donnees.brouillon` est déjà renseigné (RG-019, revalidée ici
/// côté cœur natif en complément du contrôle déjà attendu côté interface).
#[allow(
    clippy::too_many_arguments,
    reason = "gabarit déjà augmenté des champs métier strictement nécessaires (cf. commande de la Façade correspondante) ; `prises_en_charge` complète ce même lot plutôt que d'ouvrir une structure dédiée pour un seul point d'appel"
)]
pub(crate) fn enregistrer_brouillon(
    donnees: &mut DonneesRacine,
    campagne_id: String,
    date: String,
    perimetre: Vec<String>,
    verdicts: Vec<Verdict>,
    resultats_par_projet: Vec<ResultatBrouillonProjet>,
    prises_en_charge: Option<HashMap<String, PremierCommitInterne>>,
    horodatage: String,
) -> Result<(), ErreurAudit> {
    if donnees.brouillon.is_some() {
        return Err(ErreurAudit::BrouillonDejaExistant);
    }

    donnees.campagnes.push(Campagne {
        id: campagne_id.clone(),
        date,
        perimetre,
        verdicts,
    });

    // `statut`, `motif_rejet` et `aberrations` sont tous les trois forcés à leur valeur initiale, indépendamment
    // de ce que l'appelant aurait soumis pour ces champs : cette fonction est le seul point d'entrée qui crée un
    // brouillon, aucune valeur externe non maîtrisée ne doit pouvoir y introduire un rejet ou une aberration déjà
    // « résolus » avant même la première résolution par l'utilisateur (constat de relecture, cf. rapport de
    // développement de cette phase).
    let resultats_par_projet: Vec<ResultatBrouillonProjet> = resultats_par_projet
        .into_iter()
        .map(|resultat| ResultatBrouillonProjet {
            statut: StatutResultatBrouillon::EnAttente,
            motif_rejet: None,
            aberrations: None,
            ..resultat
        })
        .collect();

    // Une campagne en échec total (aucun projet n'a produit de résultat exploitable, RG-018) ne porte aucune
    // entrée à traiter : ne pas créer de brouillon dans ce cas, pour ne pas bloquer indéfiniment le lancement
    // d'une nouvelle campagne derrière un brouillon vide qu'aucune action de l'écran Brouillon ne permet de
    // distinguer d'un brouillon réellement traité (RG-019, constat de relecture).
    if !resultats_par_projet.is_empty() {
        // Une campagne en échec total ne crée aucun brouillon (cf. commentaire ci-dessus) : les éventuelles entrées
        // de `prises_en_charge` calculées pour des projets dont l'audit a par ailleurs totalement échoué sont alors
        // perdues, sur le même principe que les résultats d'audit eux-mêmes dans ce cas — décision arbitraire
        // documentée dans le rapport de développement de cette phase.
        let prises_en_charge = match prises_en_charge {
            Some(map) if !map.is_empty() => Some(map),
            _ => None,
        };
        donnees.brouillon = Some(Brouillon {
            campagne_id,
            cree_le: horodatage,
            resultats_par_projet,
            prises_en_charge,
        });
    }

    Ok(())
}

/// Trouve le projet désigné par cet identifiant, quel que soit son groupe de rattachement. Bâtie sur
/// [`trouver_projet_avec_groupe_mut`] (corrigé en relecture : les deux fonctions réimplémentaient
/// indépendamment le même parcours) pour n'avoir qu'un seul parcours à maintenir.
fn trouver_projet_mut<'a>(
    donnees: &'a mut DonneesRacine,
    projet_id: &str,
) -> Option<&'a mut Projet> {
    trouver_projet_avec_groupe_mut(donnees, projet_id).map(|(_, projet)| projet)
}

/// Sélectionne, au sein du brouillon courant, les entrées en attente ciblées par `selection` (`None` désigne
/// l'intégralité des entrées encore en attente, cf. F09 : « intègre tout » / « intègre projet par projet »).
///
/// Un identifiant de `selection` porté uniquement par `Brouillon.prises_en_charge` (projet dont l'audit a
/// totalement échoué, sans entrée dans `resultats_par_projet`, mais dont le calcul de prise en charge a réussi,
/// US-058, plan_18 incrément 6, corrigé en relecture) est accepté par la validation ci-dessous sans lever
/// [`ErreurAudit::ProjetAbsentDuBrouillon`] : il ne produit simplement aucune entrée dans le vecteur retourné,
/// laissant à l'appelant ([`integrer_brouillon`]/[`rejeter_brouillon`]) le soin de traiter sa prise en charge via
/// [`extraire_prises_en_charge_ciblees`]. Sans cet assouplissement, une sélection projet par projet ne pourrait
/// jamais atteindre une telle entrée orpheline, contrairement à ce que documente
/// [`extraire_prises_en_charge_ciblees`].
///
/// # Erreurs
///
/// [`ErreurAudit::AucunBrouillonCourant`] si aucun brouillon n'est en attente ; [`ErreurAudit::ProjetAbsentDuBrouillon`]
/// si un identifiant de `selection` ne désigne aucune entrée en attente du brouillon courant **ni** aucune entrée
/// de `prises_en_charge`.
fn entrees_ciblees<'a>(
    brouillon: &'a mut Brouillon,
    selection: Option<&[String]>,
) -> Result<Vec<&'a mut ResultatBrouillonProjet>, ErreurAudit> {
    match selection {
        None => Ok(brouillon
            .resultats_par_projet
            .iter_mut()
            .filter(|resultat| resultat.statut == StatutResultatBrouillon::EnAttente)
            .collect()),
        Some(projet_ids) => {
            for projet_id in projet_ids {
                let dans_resultats_par_projet =
                    brouillon.resultats_par_projet.iter().any(|resultat| {
                        &resultat.projet_id == projet_id
                            && resultat.statut == StatutResultatBrouillon::EnAttente
                    });
                let dans_prises_en_charge = brouillon
                    .prises_en_charge
                    .as_ref()
                    .is_some_and(|prises_en_charge| prises_en_charge.contains_key(projet_id));
                if !dans_resultats_par_projet && !dans_prises_en_charge {
                    return Err(ErreurAudit::ProjetAbsentDuBrouillon);
                }
            }
            Ok(brouillon
                .resultats_par_projet
                .iter_mut()
                .filter(|resultat| {
                    resultat.statut == StatutResultatBrouillon::EnAttente
                        && projet_ids.contains(&resultat.projet_id)
                })
                .collect())
        }
    }
}

/// Retire du brouillon courant, et retourne, les entrées de `prises_en_charge` ciblées par `selection` (même
/// sémantique que [`entrees_ciblees`] : `None` désigne l'intégralité des entrées encore présentes). Utilisée aussi
/// bien par [`integrer_brouillon`] (les entrées retournées sont ensuite appliquées) que par [`rejeter_brouillon`]
/// (les entrées retournées sont simplement abandonnées, décision 10/§5.4 du plan_18 : « aucune application
/// partielle »). Indépendante de [`entrees_ciblees`] : un identifiant de `selection` qui ne désigne aucune entrée
/// de `resultats_par_projet` (projet dont l'audit a échoué mais dont la prise en charge a été calculée) reste
/// traité normalement ici tant qu'il figure dans `prises_en_charge`.
fn extraire_prises_en_charge_ciblees(
    brouillon: &mut Brouillon,
    selection: Option<&[String]>,
) -> Vec<(String, PremierCommitInterne)> {
    let Some(prises_en_charge) = brouillon.prises_en_charge.as_mut() else {
        return Vec::new();
    };
    let ids_a_extraire: Vec<String> = match selection {
        None => prises_en_charge.keys().cloned().collect(),
        Some(projet_ids) => projet_ids
            .iter()
            .filter(|projet_id| prises_en_charge.contains_key(projet_id.as_str()))
            .cloned()
            .collect(),
    };
    let extraites = ids_a_extraire
        .into_iter()
        .filter_map(|projet_id| {
            prises_en_charge
                .remove(&projet_id)
                .map(|valeur| (projet_id, valeur))
        })
        .collect();
    if prises_en_charge.is_empty() {
        brouillon.prises_en_charge = None;
    }
    extraites
}

/// Trouve le projet désigné par cet identifiant et l'identifiant de son groupe de rattachement, quel que soit ce
/// dernier. Seule implémentation du parcours groupes/projets par identifiant du module : [`trouver_projet_mut`]
/// se bâtit dessus plutôt que de le réimplémenter. Le groupe est nécessaire ici pour construire le chemin d'objet
/// (`groupes/{groupeId}/projets/{projetId}/premierCommitInterne`) d'une entrée de journal RG-023.
fn trouver_projet_avec_groupe_mut<'a>(
    donnees: &'a mut DonneesRacine,
    projet_id: &str,
) -> Option<(String, &'a mut Projet)> {
    for groupe in &mut donnees.groupes {
        if let Some(projet) = groupe
            .projets
            .iter_mut()
            .find(|projet| projet.id == projet_id)
        {
            return Some((groupe.id.clone(), projet));
        }
    }
    None
}

/// Referme le brouillon courant si plus aucune de ses entrées n'est en attente (RG-019 : le verrou de nouvelle
/// campagne se lève une fois le brouillon intégralement traité) **et** si `prises_en_charge` est vide (US-058,
/// RG-058, plan_18 incrément 6, corrigé en relecture) : une entrée de `prises_en_charge` orpheline (projet dont
/// l'audit a totalement échoué, sans entrée dans `resultats_par_projet`, mais dont le calcul de prise en charge a
/// réussi) ne doit jamais être perdue silencieusement par la fermeture du brouillon déclenchée par la seule
/// résolution des entrées d'audit — elle reste ouverte tant qu'une prise en charge en attente subsiste, quelle que
/// soit l'issue des résultats d'audit.
fn purger_brouillon_si_resolu(donnees: &mut DonneesRacine) {
    let resolu = donnees.brouillon.as_ref().is_some_and(|brouillon| {
        brouillon
            .resultats_par_projet
            .iter()
            .all(|resultat| resultat.statut != StatutResultatBrouillon::EnAttente)
            && brouillon
                .prises_en_charge
                .as_ref()
                .is_none_or(|prises_en_charge| prises_en_charge.is_empty())
    });
    if resolu {
        donnees.brouillon = None;
    }
}

/// Intègre à l'historique des projets concernés tout ou partie des résultats en attente du brouillon courant
/// (US-014, F09 : « intègre tout, intègre projet par projet »), et applique dans la même sauvegarde toute entrée
/// de `Brouillon.prises_en_charge` ciblée (US-058, RG-058, plan_18 incrément 6, §5.4 du plan) : chaque entrée
/// appliquée remplace `Projet.premier_commit_interne` et consigne une entrée de journal (RG-023, décision 7 du
/// plan) ; une entrée dont le projet n'existe plus est silencieusement abandonnée (projet supprimé entre le
/// lancement de la campagne et l'intégration du brouillon), sans faire échouer l'intégration des audits.
///
/// `Campagne.verdicts` n'est pas modifié par cette fonction : un projet intégré reste au statut d'exécution déjà
/// enregistré lors de l'enregistrement du brouillon ([`StatutVerdict::Succes`]).
///
/// # Erreurs
///
/// [`ErreurAudit::AucunBrouillonCourant`], [`ErreurAudit::ProjetAbsentDuBrouillon`] (cf. [`entrees_ciblees`]) ;
/// [`ErreurAudit::ProjetIntrouvable`] si le projet désigné par une entrée ciblée n'existe plus dans les données
/// courantes.
pub(crate) fn integrer_brouillon(
    donnees: &mut DonneesRacine,
    selection: Option<&[String]>,
    horodatage: String,
) -> Result<(), ErreurAudit> {
    let brouillon = donnees
        .brouillon
        .as_mut()
        .ok_or(ErreurAudit::AucunBrouillonCourant)?;
    let projets_a_integrer: Vec<(String, crate::modele::racine::Audit)> =
        entrees_ciblees(brouillon, selection)?
            .into_iter()
            .map(|resultat| {
                resultat.statut = StatutResultatBrouillon::Integre;
                (resultat.projet_id.clone(), resultat.audit.clone())
            })
            .collect();
    let prises_en_charge_a_appliquer = extraire_prises_en_charge_ciblees(brouillon, selection);

    for (projet_id, audit) in projets_a_integrer {
        let projet =
            trouver_projet_mut(donnees, &projet_id).ok_or(ErreurAudit::ProjetIntrouvable)?;
        projet.audits.push(audit);
    }

    for (projet_id, premier_commit_interne) in prises_en_charge_a_appliquer {
        let Some((groupe_id, projet)) = trouver_projet_avec_groupe_mut(donnees, &projet_id) else {
            continue;
        };
        let avant = serde_json::to_value(&projet.premier_commit_interne).unwrap_or(Value::Null);
        let apres = serde_json::to_value(&premier_commit_interne).unwrap_or(Value::Null);
        projet.premier_commit_interne = Some(premier_commit_interne);
        donnees.journal.push(EntreeJournal {
            id: uuid::Uuid::new_v4().to_string(),
            horodatage: horodatage.clone(),
            objet: format!("groupes/{groupe_id}/projets/{projet_id}/premierCommitInterne"),
            avant,
            apres,
            origine: ORIGINE_CAMPAGNE.to_string(),
            detail_origine: None,
        });
    }

    purger_brouillon_si_resolu(donnees);
    Ok(())
}

/// Rejette tout ou partie des résultats en attente du brouillon courant (US-014, F09 : « rejette (motif optionnel
/// consigné) »), sans jamais les ajouter à l'historique du projet concerné. Abandonne dans le même mouvement toute
/// entrée de `Brouillon.prises_en_charge` ciblée par `selection`, sans jamais l'appliquer à un `Projet` ni la
/// consigner au journal (US-058, RG-058, plan_18 incrément 6, §5.4 du plan : « le rejet du brouillon abandonne
/// aussi les prisesEnCharge, aucune application partielle »).
///
/// Le motif de rejet est répercuté immédiatement sur la trace durable de la campagne (`Campagne.verdicts`),
/// plutôt qu'au moment de la purge du brouillon, pour rester consultable même après la disparition de ce dernier
/// (cf. commentaire de [`crate::modele::racine::Verdict::motif_rejet`]).
///
/// # Erreurs
///
/// [`ErreurAudit::AucunBrouillonCourant`], [`ErreurAudit::ProjetAbsentDuBrouillon`] (cf. [`entrees_ciblees`]).
pub(crate) fn rejeter_brouillon(
    donnees: &mut DonneesRacine,
    selection: Option<&[String]>,
    motif: Option<String>,
) -> Result<(), ErreurAudit> {
    let brouillon = donnees
        .brouillon
        .as_mut()
        .ok_or(ErreurAudit::AucunBrouillonCourant)?;
    let campagne_id = brouillon.campagne_id.clone();
    let projets_rejetes: Vec<String> = entrees_ciblees(brouillon, selection)?
        .into_iter()
        .map(|resultat| {
            resultat.statut = StatutResultatBrouillon::Rejete;
            resultat.motif_rejet = motif.clone();
            resultat.projet_id.clone()
        })
        .collect();
    // Entrées abandonnées sans jamais être appliquées ni journalisées (cf. commentaire de la fonction).
    let _ = extraire_prises_en_charge_ciblees(brouillon, selection);

    if let Some(campagne) = donnees
        .campagnes
        .iter_mut()
        .find(|campagne| campagne.id == campagne_id)
    {
        for verdict in campagne
            .verdicts
            .iter_mut()
            .filter(|verdict| projets_rejetes.contains(&verdict.projet_id))
        {
            verdict.statut = StatutVerdict::Rejete;
            verdict.motif_rejet = motif.clone();
        }
    }

    purger_brouillon_si_resolu(donnees);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modele::racine::{Audit, DonneesRacine, Groupe, Instance, TypeInstance};

    fn racine_avec_un_projet(projet_id: &str) -> DonneesRacine {
        let mut racine = DonneesRacine::nouvelle("test", "2026-07-23T08:00:00Z");
        racine.groupes.push(Groupe {
            id: "groupe-1".to_string(),
            nom: "Groupe".to_string(),
            description: String::new(),
            instances: vec![Instance {
                id: "instance-1".to_string(),
                type_instance: TypeInstance::Gitlab,
                nom: "GitLab".to_string(),
                url_base: "https://gitlab.exemple.test".to_string(),
            }],
            membres_connus: vec![],
            annotations: vec![],
            indicateurs_desactives: vec![],
            projets: vec![Projet {
                id: projet_id.to_string(),
                nom: "Projet".to_string(),
                description: String::new(),
                ia_autorisee: false,
                ia_autorisee_depuis: None,
                premier_commit_interne: None,
                sources: vec![],
                annotations: vec![],
                audits: vec![],
            }],
        });
        racine
    }

    fn resultat_en_attente(projet_id: &str) -> ResultatBrouillonProjet {
        ResultatBrouillonProjet {
            projet_id: projet_id.to_string(),
            audit: Audit {
                id: "audit-1".to_string(),
                date: "2026-07-23".to_string(),
                campagne_id: "campagne-1".to_string(),
                resultats: vec![],
                type_audit: crate::modele::racine::TypeAudit::Reguliere,
                date_execution: None,
            },
            statut: StatutResultatBrouillon::EnAttente,
            motif_rejet: None,
            aberrations: None,
        }
    }

    fn verdict_succes(projet_id: &str) -> Verdict {
        Verdict {
            projet_id: projet_id.to_string(),
            statut: StatutVerdict::Succes,
            duree_ms: Some(1200),
            anomalies: None,
            motif_rejet: None,
        }
    }

    #[test]
    fn enregistrer_brouillon_installe_la_campagne_et_le_brouillon()
    -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = racine_avec_un_projet("projet-1");

        let resultat = enregistrer_brouillon(
            &mut racine,
            "campagne-1".to_string(),
            "2026-07-23".to_string(),
            vec!["projet-1".to_string()],
            vec![verdict_succes("projet-1")],
            vec![resultat_en_attente("projet-1")],
            None,
            "2026-07-23T08:30:00Z".to_string(),
        );

        assert_eq!(resultat, Ok(()));
        assert_eq!(racine.campagnes.len(), 1);
        let brouillon = racine.brouillon.as_ref().ok_or("brouillon attendu")?;
        assert_eq!(brouillon.campagne_id, "campagne-1");
        assert_eq!(
            brouillon.resultats_par_projet[0].statut,
            StatutResultatBrouillon::EnAttente
        );
        Ok(())
    }

    #[test]
    fn enregistrer_brouillon_ne_cree_pas_de_brouillon_pour_une_campagne_en_echec_total()
    -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = racine_avec_un_projet("projet-1");

        let resultat = enregistrer_brouillon(
            &mut racine,
            "campagne-1".to_string(),
            "2026-07-23".to_string(),
            vec!["projet-1".to_string()],
            vec![Verdict {
                projet_id: "projet-1".to_string(),
                statut: StatutVerdict::Echec,
                duree_ms: None,
                anomalies: Some(vec![serde_json::json!("instance injoignable")]),
                motif_rejet: None,
            }],
            vec![],
            None,
            "2026-07-23T08:30:00Z".to_string(),
        );

        assert_eq!(resultat, Ok(()));
        assert_eq!(
            racine.campagnes.len(),
            1,
            "la campagne doit rester tracée malgré l'échec total"
        );
        assert!(
            racine.brouillon.is_none(),
            "aucun brouillon ne doit bloquer le lancement d'une nouvelle campagne"
        );
        Ok(())
    }

    #[test]
    fn enregistrer_brouillon_refuse_un_brouillon_deja_existant() {
        let mut racine = racine_avec_un_projet("projet-1");
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-0".to_string(),
            cree_le: "2026-07-22T08:00:00Z".to_string(),
            resultats_par_projet: vec![],
            prises_en_charge: None,
        });

        let resultat = enregistrer_brouillon(
            &mut racine,
            "campagne-1".to_string(),
            "2026-07-23".to_string(),
            vec!["projet-1".to_string()],
            vec![],
            vec![],
            None,
            "2026-07-23T08:30:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurAudit::BrouillonDejaExistant));
    }

    #[test]
    fn enregistrer_brouillon_force_le_statut_en_attente_meme_si_soumis_differemment()
    -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = racine_avec_un_projet("projet-1");
        let mut resultat_incoherent = resultat_en_attente("projet-1");
        resultat_incoherent.statut = StatutResultatBrouillon::Integre;
        resultat_incoherent.motif_rejet = Some("motif prématuré".to_string());
        resultat_incoherent.aberrations = Some(vec![serde_json::json!({ "indicateur": "taille" })]);

        enregistrer_brouillon(
            &mut racine,
            "campagne-1".to_string(),
            "2026-07-23".to_string(),
            vec!["projet-1".to_string()],
            vec![],
            vec![resultat_incoherent],
            None,
            "2026-07-23T08:30:00Z".to_string(),
        )?;

        let entree = &racine
            .brouillon
            .ok_or("brouillon attendu")?
            .resultats_par_projet[0];
        assert_eq!(entree.statut, StatutResultatBrouillon::EnAttente);
        assert_eq!(entree.motif_rejet, None);
        assert_eq!(entree.aberrations, None);
        Ok(())
    }

    #[test]
    fn integrer_brouillon_ajoute_laudit_a_lhistorique_et_purge_le_brouillon_une_fois_resolu()
    -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = racine_avec_un_projet("projet-1");
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![resultat_en_attente("projet-1")],
            prises_en_charge: None,
        });

        let resultat = integrer_brouillon(&mut racine, None, "2026-07-24T09:00:00Z".to_string());

        assert_eq!(resultat, Ok(()));
        let projet = trouver_projet_mut(&mut racine, "projet-1").ok_or("projet attendu")?;
        assert_eq!(projet.audits.len(), 1);
        assert!(racine.brouillon.is_none());
        Ok(())
    }

    #[test]
    fn integrer_brouillon_projet_par_projet_laisse_les_autres_entrees_en_attente()
    -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = racine_avec_un_projet("projet-1");
        racine.groupes[0].projets.push(Projet {
            id: "projet-2".to_string(),
            nom: "Projet 2".to_string(),
            description: String::new(),
            ia_autorisee: false,
            ia_autorisee_depuis: None,
            premier_commit_interne: None,
            sources: vec![],
            annotations: vec![],
            audits: vec![],
        });
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![
                resultat_en_attente("projet-1"),
                resultat_en_attente("projet-2"),
            ],
            prises_en_charge: None,
        });

        let resultat = integrer_brouillon(
            &mut racine,
            Some(&["projet-1".to_string()]),
            "2026-07-24T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Ok(()));
        let brouillon = racine
            .brouillon
            .as_ref()
            .ok_or("brouillon toujours présent")?;
        assert_eq!(brouillon.resultats_par_projet.len(), 2);
        assert_eq!(
            brouillon.resultats_par_projet[0].statut,
            StatutResultatBrouillon::Integre
        );
        assert_eq!(
            brouillon.resultats_par_projet[1].statut,
            StatutResultatBrouillon::EnAttente
        );
        Ok(())
    }

    #[test]
    fn integrer_brouillon_signale_labsence_de_brouillon() {
        let mut racine = racine_avec_un_projet("projet-1");

        let resultat = integrer_brouillon(&mut racine, None, "2026-07-24T09:00:00Z".to_string());

        assert_eq!(resultat, Err(ErreurAudit::AucunBrouillonCourant));
    }

    #[test]
    fn integrer_brouillon_signale_un_projet_absent_de_la_selection() {
        let mut racine = racine_avec_un_projet("projet-1");
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![resultat_en_attente("projet-1")],
            prises_en_charge: None,
        });

        let resultat = integrer_brouillon(
            &mut racine,
            Some(&["projet-inconnu".to_string()]),
            "2026-07-24T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurAudit::ProjetAbsentDuBrouillon));
    }

    #[test]
    fn integrer_brouillon_signale_un_projet_deja_resolu_par_un_appel_precedent() {
        let mut racine = racine_avec_un_projet("projet-1");
        racine.groupes[0].projets.push(Projet {
            id: "projet-2".to_string(),
            nom: "Projet 2".to_string(),
            description: String::new(),
            ia_autorisee: false,
            ia_autorisee_depuis: None,
            premier_commit_interne: None,
            sources: vec![],
            annotations: vec![],
            audits: vec![],
        });
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![
                resultat_en_attente("projet-1"),
                resultat_en_attente("projet-2"),
            ],
            prises_en_charge: None,
        });
        let premiere_integration = integrer_brouillon(
            &mut racine,
            Some(&["projet-1".to_string()]),
            "2026-07-24T09:00:00Z".to_string(),
        );
        assert_eq!(premiere_integration, Ok(()));

        // Un second appel ciblant le même projet, déjà résolu (Intégré) par l'appel précédent, doit être rejeté au
        // même titre qu'un identifiant totalement absent du brouillon plutôt que d'être silencieusement ignoré ou
        // ré-accepté.
        let resultat = integrer_brouillon(
            &mut racine,
            Some(&["projet-1".to_string()]),
            "2026-07-24T09:05:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurAudit::ProjetAbsentDuBrouillon));
    }

    #[test]
    fn rejeter_brouillon_marque_le_verdict_rejete_avec_motif_et_purge_le_brouillon()
    -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = racine_avec_un_projet("projet-1");
        racine.campagnes.push(Campagne {
            id: "campagne-1".to_string(),
            date: "2026-07-23".to_string(),
            perimetre: vec!["projet-1".to_string()],
            verdicts: vec![verdict_succes("projet-1")],
        });
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![resultat_en_attente("projet-1")],
            prises_en_charge: None,
        });

        let resultat = rejeter_brouillon(
            &mut racine,
            None,
            Some("Mauvaise ref auditée, projet Sonar réassigné".to_string()),
        );

        assert_eq!(resultat, Ok(()));
        assert!(racine.brouillon.is_none());
        let projet = trouver_projet_mut(&mut racine, "projet-1").ok_or("projet attendu")?;
        assert!(projet.audits.is_empty());
        let verdict = &racine.campagnes[0].verdicts[0];
        assert_eq!(verdict.statut, StatutVerdict::Rejete);
        assert_eq!(
            verdict.motif_rejet.as_deref(),
            Some("Mauvaise ref auditée, projet Sonar réassigné")
        );
        Ok(())
    }

    #[test]
    fn rejeter_brouillon_sans_motif_laisse_le_motif_absent()
    -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = racine_avec_un_projet("projet-1");
        racine.campagnes.push(Campagne {
            id: "campagne-1".to_string(),
            date: "2026-07-23".to_string(),
            perimetre: vec!["projet-1".to_string()],
            verdicts: vec![verdict_succes("projet-1")],
        });
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![resultat_en_attente("projet-1")],
            prises_en_charge: None,
        });

        rejeter_brouillon(&mut racine, None, None)?;

        assert_eq!(racine.campagnes[0].verdicts[0].motif_rejet, None);
        Ok(())
    }

    #[test]
    fn rejeter_brouillon_signale_labsence_de_brouillon() {
        let mut racine = racine_avec_un_projet("projet-1");

        let resultat = rejeter_brouillon(&mut racine, None, None);

        assert_eq!(resultat, Err(ErreurAudit::AucunBrouillonCourant));
    }

    /// Résultat de prise en charge `determine` minimal, pour les tests de `prises_en_charge` (plan_18, incrément
    /// 6, US-058, RG-058).
    fn prise_en_charge_determinee(date: &str) -> PremierCommitInterne {
        PremierCommitInterne {
            statut: crate::modele::racine::StatutPremierCommit::Determine {
                date: date.to_string(),
                sha: "abc123".to_string(),
                email_auteur: "interne@exemple.test".to_string(),
            },
            calcule_le: "2026-07-23".to_string(),
            empreinte_referentiel: "sha256:abc".to_string(),
        }
    }

    #[test]
    fn enregistrer_brouillon_conserve_les_prises_en_charge_soumises()
    -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = racine_avec_un_projet("projet-1");
        let mut prises_en_charge = HashMap::new();
        prises_en_charge.insert(
            "projet-1".to_string(),
            prise_en_charge_determinee("2020-01-15"),
        );

        enregistrer_brouillon(
            &mut racine,
            "campagne-1".to_string(),
            "2026-07-23".to_string(),
            vec!["projet-1".to_string()],
            vec![verdict_succes("projet-1")],
            vec![resultat_en_attente("projet-1")],
            Some(prises_en_charge),
            "2026-07-23T08:30:00Z".to_string(),
        )?;

        let brouillon = racine.brouillon.as_ref().ok_or("brouillon attendu")?;
        let prises_en_charge = brouillon
            .prises_en_charge
            .as_ref()
            .ok_or("prises_en_charge attendues")?;
        assert_eq!(prises_en_charge.len(), 1);
        assert!(prises_en_charge.contains_key("projet-1"));
        Ok(())
    }

    #[test]
    fn enregistrer_brouillon_pour_une_campagne_en_echec_total_perd_les_prises_en_charge_calculees()
    -> Result<(), Box<dyn std::error::Error>> {
        // Décision arbitraire documentée en commentaire d'`enregistrer_brouillon` : sur le même principe qu'une
        // campagne en échec total ne crée aucun brouillon, une prise en charge calculée pour un projet dont
        // l'audit a par ailleurs totalement échoué est alors perdue, plutôt que de créer un brouillon exclusivement
        // porteur de cette seule donnée.
        let mut racine = racine_avec_un_projet("projet-1");
        let mut prises_en_charge = HashMap::new();
        prises_en_charge.insert(
            "projet-1".to_string(),
            prise_en_charge_determinee("2020-01-15"),
        );

        enregistrer_brouillon(
            &mut racine,
            "campagne-1".to_string(),
            "2026-07-23".to_string(),
            vec!["projet-1".to_string()],
            vec![Verdict {
                projet_id: "projet-1".to_string(),
                statut: StatutVerdict::Echec,
                duree_ms: None,
                anomalies: None,
                motif_rejet: None,
            }],
            vec![],
            Some(prises_en_charge),
            "2026-07-23T08:30:00Z".to_string(),
        )?;

        assert!(racine.brouillon.is_none());
        Ok(())
    }

    #[test]
    fn integrer_brouillon_applique_les_prises_en_charge_et_consigne_le_journal()
    -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = racine_avec_un_projet("projet-1");
        let mut prises_en_charge = HashMap::new();
        prises_en_charge.insert(
            "projet-1".to_string(),
            prise_en_charge_determinee("2020-01-15"),
        );
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![resultat_en_attente("projet-1")],
            prises_en_charge: Some(prises_en_charge),
        });

        let resultat = integrer_brouillon(&mut racine, None, "2026-07-24T09:00:00Z".to_string());

        assert_eq!(resultat, Ok(()));
        let projet = trouver_projet_mut(&mut racine, "projet-1").ok_or("projet attendu")?;
        let premier_commit_interne = projet
            .premier_commit_interne
            .as_ref()
            .ok_or("premier_commit_interne attendu")?;
        assert_eq!(
            premier_commit_interne.statut,
            crate::modele::racine::StatutPremierCommit::Determine {
                date: "2020-01-15".to_string(),
                sha: "abc123".to_string(),
                email_auteur: "interne@exemple.test".to_string(),
            }
        );
        assert_eq!(racine.journal.len(), 1);
        let entree = &racine.journal[0];
        assert_eq!(
            entree.objet,
            "groupes/groupe-1/projets/projet-1/premierCommitInterne"
        );
        assert_eq!(entree.origine, "Campagne");
        assert!(racine.brouillon.is_none());
        Ok(())
    }

    #[test]
    fn integrer_brouillon_projet_par_projet_napplique_que_les_prises_en_charge_ciblees()
    -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = racine_avec_un_projet("projet-1");
        racine.groupes[0].projets.push(Projet {
            id: "projet-2".to_string(),
            nom: "Projet 2".to_string(),
            description: String::new(),
            ia_autorisee: false,
            ia_autorisee_depuis: None,
            premier_commit_interne: None,
            sources: vec![],
            annotations: vec![],
            audits: vec![],
        });
        let mut prises_en_charge = HashMap::new();
        prises_en_charge.insert(
            "projet-1".to_string(),
            prise_en_charge_determinee("2020-01-15"),
        );
        prises_en_charge.insert(
            "projet-2".to_string(),
            prise_en_charge_determinee("2021-06-01"),
        );
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![
                resultat_en_attente("projet-1"),
                resultat_en_attente("projet-2"),
            ],
            prises_en_charge: Some(prises_en_charge),
        });

        let resultat = integrer_brouillon(
            &mut racine,
            Some(&["projet-1".to_string()]),
            "2026-07-24T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Ok(()));
        assert_eq!(
            racine.journal.len(),
            1,
            "une seule entrée appliquée doit être journalisée"
        );
        let projet_1 = trouver_projet_mut(&mut racine, "projet-1").ok_or("projet-1 attendu")?;
        assert!(projet_1.premier_commit_interne.is_some());
        let projet_2 = trouver_projet_mut(&mut racine, "projet-2").ok_or("projet-2 attendu")?;
        assert!(
            projet_2.premier_commit_interne.is_none(),
            "la prise en charge non ciblée par la sélection ne doit pas être appliquée"
        );
        let brouillon = racine
            .brouillon
            .as_ref()
            .ok_or("brouillon toujours présent (projet-2 encore en attente)")?;
        let prises_en_charge_restantes = brouillon
            .prises_en_charge
            .as_ref()
            .ok_or("l'entrée non ciblée doit rester dans le brouillon")?;
        assert!(prises_en_charge_restantes.contains_key("projet-2"));
        Ok(())
    }

    #[test]
    fn integrer_brouillon_ignore_silencieusement_une_prise_en_charge_dont_le_projet_a_disparu()
    -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = racine_avec_un_projet("projet-1");
        let mut prises_en_charge = HashMap::new();
        prises_en_charge.insert(
            "projet-supprime".to_string(),
            prise_en_charge_determinee("2020-01-15"),
        );
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![resultat_en_attente("projet-1")],
            prises_en_charge: Some(prises_en_charge),
        });

        let resultat = integrer_brouillon(&mut racine, None, "2026-07-24T09:00:00Z".to_string());

        assert_eq!(resultat, Ok(()));
        assert!(racine.journal.is_empty());
        Ok(())
    }

    #[test]
    fn rejeter_brouillon_abandonne_les_prises_en_charge_sans_les_appliquer_ni_les_journaliser()
    -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = racine_avec_un_projet("projet-1");
        racine.campagnes.push(Campagne {
            id: "campagne-1".to_string(),
            date: "2026-07-23".to_string(),
            perimetre: vec!["projet-1".to_string()],
            verdicts: vec![verdict_succes("projet-1")],
        });
        let mut prises_en_charge = HashMap::new();
        prises_en_charge.insert(
            "projet-1".to_string(),
            prise_en_charge_determinee("2020-01-15"),
        );
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![resultat_en_attente("projet-1")],
            prises_en_charge: Some(prises_en_charge),
        });

        rejeter_brouillon(&mut racine, None, None)?;

        assert!(racine.journal.is_empty());
        let projet = trouver_projet_mut(&mut racine, "projet-1").ok_or("projet attendu")?;
        assert!(projet.premier_commit_interne.is_none());
        assert!(racine.brouillon.is_none());
        Ok(())
    }

    /// Racine à deux projets, pour les tests de relecture ci-dessous portant sur une entrée `prises_en_charge`
    /// orpheline (projet-2 : audit totalement échoué, sans entrée `resultats_par_projet`, mais dont le calcul de
    /// prise en charge a réussi).
    fn racine_avec_deux_projets(premier_id: &str, second_id: &str) -> DonneesRacine {
        let mut racine = racine_avec_un_projet(premier_id);
        racine.groupes[0].projets.push(Projet {
            id: second_id.to_string(),
            nom: "Projet 2".to_string(),
            description: String::new(),
            ia_autorisee: false,
            ia_autorisee_depuis: None,
            premier_commit_interne: None,
            sources: vec![],
            annotations: vec![],
            audits: vec![],
        });
        racine
    }

    #[test]
    fn integrer_brouillon_ne_purge_pas_le_brouillon_tant_quune_prise_en_charge_orpheline_subsiste()
    -> Result<(), Box<dyn std::error::Error>> {
        // Corrigé en relecture : projet-2 n'a aucune entrée resultats_par_projet (audit totalement échoué), mais
        // porte une entrée prises_en_charge (calcul de prise en charge réussi) — un cas explicitement prévu par
        // le modèle. Une intégration « projet par projet » ciblant uniquement projet-1 résout entièrement
        // resultats_par_projet, mais ne doit ni perdre ni fermer le brouillon tant que la prise en charge de
        // projet-2, non ciblée, reste en attente.
        let mut racine = racine_avec_deux_projets("projet-1", "projet-2");
        let mut prises_en_charge = HashMap::new();
        prises_en_charge.insert(
            "projet-2".to_string(),
            prise_en_charge_determinee("2020-01-15"),
        );
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![resultat_en_attente("projet-1")],
            prises_en_charge: Some(prises_en_charge),
        });

        let resultat = integrer_brouillon(
            &mut racine,
            Some(&["projet-1".to_string()]),
            "2026-07-24T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Ok(()));
        let brouillon = racine
            .brouillon
            .as_ref()
            .ok_or("le brouillon doit rester ouvert : la prise en charge de projet-2 est encore en attente")?;
        let prises_en_charge_restantes = brouillon
            .prises_en_charge
            .as_ref()
            .ok_or("l'entrée de projet-2 doit rester dans le brouillon")?;
        assert!(prises_en_charge_restantes.contains_key("projet-2"));
        let projet_2 = trouver_projet_mut(&mut racine, "projet-2").ok_or("projet-2 attendu")?;
        assert!(
            projet_2.premier_commit_interne.is_none(),
            "non ciblée, la prise en charge de projet-2 ne doit pas être appliquée"
        );
        Ok(())
    }

    #[test]
    fn integrer_brouillon_cible_un_projet_present_uniquement_dans_prises_en_charge()
    -> Result<(), Box<dyn std::error::Error>> {
        // Corrigé en relecture : une sélection projet par projet ciblant un projet absent de resultats_par_projet
        // mais présent dans prises_en_charge ne doit jamais échouer avec ProjetAbsentDuBrouillon.
        let mut racine = racine_avec_deux_projets("projet-1", "projet-2");
        let mut prises_en_charge = HashMap::new();
        prises_en_charge.insert(
            "projet-2".to_string(),
            prise_en_charge_determinee("2020-01-15"),
        );
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![resultat_en_attente("projet-1")],
            prises_en_charge: Some(prises_en_charge),
        });

        let resultat = integrer_brouillon(
            &mut racine,
            Some(&["projet-2".to_string()]),
            "2026-07-24T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Ok(()));
        let projet_2 = trouver_projet_mut(&mut racine, "projet-2").ok_or("projet-2 attendu")?;
        assert!(projet_2.premier_commit_interne.is_some());
        // projet-1 reste en attente (non ciblé) : le brouillon reste ouvert pour lui.
        let brouillon = racine
            .brouillon
            .as_ref()
            .ok_or("brouillon toujours présent")?;
        assert_eq!(
            brouillon.resultats_par_projet[0].statut,
            StatutResultatBrouillon::EnAttente
        );
        Ok(())
    }

    #[test]
    fn rejeter_brouillon_cible_un_projet_present_uniquement_dans_prises_en_charge()
    -> Result<(), Box<dyn std::error::Error>> {
        let mut racine = racine_avec_deux_projets("projet-1", "projet-2");
        let mut prises_en_charge = HashMap::new();
        prises_en_charge.insert(
            "projet-2".to_string(),
            prise_en_charge_determinee("2020-01-15"),
        );
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![resultat_en_attente("projet-1")],
            prises_en_charge: Some(prises_en_charge),
        });

        let resultat = rejeter_brouillon(&mut racine, Some(&["projet-2".to_string()]), None);

        assert_eq!(resultat, Ok(()));
        let projet_2 = trouver_projet_mut(&mut racine, "projet-2").ok_or("projet-2 attendu")?;
        assert!(projet_2.premier_commit_interne.is_none());
        let brouillon = racine
            .brouillon
            .as_ref()
            .ok_or("brouillon toujours présent")?;
        assert!(brouillon.prises_en_charge.is_none());
        Ok(())
    }

    #[test]
    fn integrer_brouillon_signale_toujours_un_identifiant_totalement_inconnu() {
        // Non-régression de l'assouplissement ci-dessus : un identifiant qui ne désigne rien du tout (ni
        // resultats_par_projet, ni prises_en_charge) doit continuer à être rejeté.
        let mut racine = racine_avec_un_projet("projet-1");
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![resultat_en_attente("projet-1")],
            prises_en_charge: None,
        });

        let resultat = integrer_brouillon(
            &mut racine,
            Some(&["projet-totalement-inconnu".to_string()]),
            "2026-07-24T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurAudit::ProjetAbsentDuBrouillon));
    }
}
