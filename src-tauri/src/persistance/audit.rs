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
//! Aucune de ces trois fonctions ne consigne d'entrée au journal des modifications : RG-023 énumère explicitement
//! les données de jugement consignées (seuils, référentiels de dépendances/marqueurs IA, qualification d'un
//! membre, politique IA d'un projet, ref auditée d'une source) et n'y inclut ni les campagnes ni le brouillon.

use crate::modele::racine::{
    Brouillon, Campagne, DonneesRacine, Projet, ResultatBrouillonProjet, StatutResultatBrouillon,
    StatutVerdict, Verdict,
};
use thiserror::Error;

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
/// # Erreurs
///
/// [`ErreurAudit::BrouillonDejaExistant`] si `donnees.brouillon` est déjà renseigné (RG-019, revalidée ici
/// côté cœur natif en complément du contrôle déjà attendu côté interface).
pub(crate) fn enregistrer_brouillon(
    donnees: &mut DonneesRacine,
    campagne_id: String,
    date: String,
    perimetre: Vec<String>,
    verdicts: Vec<Verdict>,
    resultats_par_projet: Vec<ResultatBrouillonProjet>,
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
    let resultats_par_projet = resultats_par_projet
        .into_iter()
        .map(|resultat| ResultatBrouillonProjet {
            statut: StatutResultatBrouillon::EnAttente,
            motif_rejet: None,
            aberrations: None,
            ..resultat
        })
        .collect();

    donnees.brouillon = Some(Brouillon {
        campagne_id,
        cree_le: horodatage,
        resultats_par_projet,
    });

    Ok(())
}

/// Trouve le projet désigné par cet identifiant, quel que soit son groupe de rattachement.
fn trouver_projet_mut<'a>(
    donnees: &'a mut DonneesRacine,
    projet_id: &str,
) -> Option<&'a mut Projet> {
    donnees
        .groupes
        .iter_mut()
        .flat_map(|groupe| groupe.projets.iter_mut())
        .find(|projet| projet.id == projet_id)
}

/// Sélectionne, au sein du brouillon courant, les entrées en attente ciblées par `selection` (`None` désigne
/// l'intégralité des entrées encore en attente, cf. F09 : « intègre tout » / « intègre projet par projet »).
///
/// # Erreurs
///
/// [`ErreurAudit::AucunBrouillonCourant`] si aucun brouillon n'est en attente ; [`ErreurAudit::ProjetAbsentDuBrouillon`]
/// si un identifiant de `selection` ne désigne aucune entrée en attente du brouillon courant.
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
                if !brouillon.resultats_par_projet.iter().any(|resultat| {
                    &resultat.projet_id == projet_id
                        && resultat.statut == StatutResultatBrouillon::EnAttente
                }) {
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

/// Referme le brouillon courant si plus aucune de ses entrées n'est en attente (RG-019 : le verrou de nouvelle
/// campagne se lève une fois le brouillon intégralement traité).
fn purger_brouillon_si_resolu(donnees: &mut DonneesRacine) {
    let resolu = donnees.brouillon.as_ref().is_some_and(|brouillon| {
        brouillon
            .resultats_par_projet
            .iter()
            .all(|resultat| resultat.statut != StatutResultatBrouillon::EnAttente)
    });
    if resolu {
        donnees.brouillon = None;
    }
}

/// Intègre à l'historique des projets concernés tout ou partie des résultats en attente du brouillon courant
/// (US-014, F09 : « intègre tout, intègre projet par projet »).
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

    for (projet_id, audit) in projets_a_integrer {
        let projet =
            trouver_projet_mut(donnees, &projet_id).ok_or(ErreurAudit::ProjetIntrouvable)?;
        projet.audits.push(audit);
    }

    purger_brouillon_si_resolu(donnees);
    Ok(())
}

/// Rejette tout ou partie des résultats en attente du brouillon courant (US-014, F09 : « rejette (motif optionnel
/// consigné) »), sans jamais les ajouter à l'historique du projet concerné.
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
    fn enregistrer_brouillon_refuse_un_brouillon_deja_existant() {
        let mut racine = racine_avec_un_projet("projet-1");
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-0".to_string(),
            cree_le: "2026-07-22T08:00:00Z".to_string(),
            resultats_par_projet: vec![],
        });

        let resultat = enregistrer_brouillon(
            &mut racine,
            "campagne-1".to_string(),
            "2026-07-23".to_string(),
            vec!["projet-1".to_string()],
            vec![],
            vec![],
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
        });

        let resultat = integrer_brouillon(&mut racine, None);

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
        });

        let resultat = integrer_brouillon(&mut racine, Some(&["projet-1".to_string()]));

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

        let resultat = integrer_brouillon(&mut racine, None);

        assert_eq!(resultat, Err(ErreurAudit::AucunBrouillonCourant));
    }

    #[test]
    fn integrer_brouillon_signale_un_projet_absent_de_la_selection() {
        let mut racine = racine_avec_un_projet("projet-1");
        racine.brouillon = Some(Brouillon {
            campagne_id: "campagne-1".to_string(),
            cree_le: "2026-07-23T08:30:00Z".to_string(),
            resultats_par_projet: vec![resultat_en_attente("projet-1")],
        });

        let resultat = integrer_brouillon(&mut racine, Some(&["projet-inconnu".to_string()]));

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
        });
        let premiere_integration = integrer_brouillon(&mut racine, Some(&["projet-1".to_string()]));
        assert_eq!(premiere_integration, Ok(()));

        // Un second appel ciblant le même projet, déjà résolu (Intégré) par l'appel précédent, doit être rejeté au
        // même titre qu'un identifiant totalement absent du brouillon plutôt que d'être silencieusement ignoré ou
        // ré-accepté.
        let resultat = integrer_brouillon(&mut racine, Some(&["projet-1".to_string()]));

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
}
