// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées à la suppression ciblée d'audits, transverse à tous les projets de tous les
//! groupes (plan_20 Partie D, US-063, RG-063).
//!
//! Noms de commande non fournis littéralement par `docs/02_documentation/13_conceptionDetaillee.md` avant ce plan :
//! choisis par symétrie avec `previsualiserPurgeDensite`/`executerPurgeDensite` (Phase 7, incrément 4), décision
//! arbitraire à valider par un humain, cf. rapport de développement de cet incrément. Une commande de consultation
//! (`previsualiserSuppressionAudits`, sans mot de passe ni sauvegarde) et une commande de mutation
//! (`supprimerAudits`, RG-002) ; les deux délèguent à `persistance::suppression_audits`, qui revalide
//! systématiquement les identifiants d'audit reçus avant toute suppression effective (cf. commentaire d'en-tête de
//! ce module).

use super::etat_session::EtatSession;
use super::fichier::ErreurFacade;
use crate::modele::racine::DonneesRacine;
use crate::persistance::moteur;
use crate::persistance::suppression_audits::{self, PrevisualisationSuppressionAudits};
use chrono::{SecondsFormat, Utc};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use tauri::State;

/// Prévisualise une suppression ciblée d'audits (US-063, RG-063), sans aucune modification ni sauvegarde.
#[tauri::command]
pub(crate) fn previsualiser_suppression_audits(
    donnees: DonneesRacine,
    audit_ids: Vec<String>,
) -> Result<PrevisualisationSuppressionAudits, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("previsualiserSuppressionAudits");
    let ids: HashSet<String> = audit_ids.into_iter().collect();
    let resultat = suppression_audits::previsualiser(&donnees, &ids);
    crate::journalisation::consigner_fin_commande("previsualiserSuppressionAudits");
    Ok(resultat)
}

/// Exécute une suppression ciblée d'audits, sauvegarde le fichier (US-063, RG-063).
///
/// # Erreurs
///
/// [`ErreurFacade::AuditIntrouvable`] si au moins un identifiant de `audit_ids` ne correspond à aucun audit
/// existant de `donnees`, auquel cas aucune suppression n'est appliquée.
#[tauri::command]
pub(crate) fn supprimer_audits(
    chemin: String,
    donnees: DonneesRacine,
    audit_ids: Vec<String>,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("supprimerAudits");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        let ids: HashSet<String> = audit_ids.into_iter().collect();
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        suppression_audits::supprimer(&mut donnees, &ids, horodatage)?;

        let cle_session = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "supprimerAudits",
        )?;
        etat.definir(PathBuf::from(chemin), cle_session);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("supprimerAudits");
    resultat
}
