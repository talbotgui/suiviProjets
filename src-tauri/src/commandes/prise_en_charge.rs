// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées au calcul, à la demande, de la date de prise en charge d'un projet (US-058,
//! RG-058, achèvement de F17 « premier commit interne », `docs/03_plan/plan_18_datePriseEnCharge.md`).
//!
//! Deux commandes, cohérentes avec le module de coordination `crate::persistance::prise_en_charge` :
//!
//! - `calculerPriseEnChargeProjet` : recherche le premier commit interne sur les sources GitLab d'un projet et
//!   retourne la structure calculée **sans rien persister** — l'écriture chiffrée conditionnelle (uniquement si le
//!   résultat diffère de la valeur stockée, décision 6 du plan) est déclenchée par l'interface via
//!   `sauvegarderFichier`. Les credentials proviennent exclusivement de la mémoire volatile de session
//!   (`EtatSession`), jamais d'un paramètre ;
//! - `empreinteReferentielInterne` : retourne le condensé du sous-ensemble `interne` des membres connus d'un
//!   groupe (décision 15 du plan : **seule** implémentation de cette empreinte, l'interface la compare sans jamais
//!   la recalculer).
//!
//! Nom des deux commandes retenu par symétrie avec le module de persistance homonyme (décision 19 du plan) ; elles
//! ne figurent pas littéralement dans `docs/02_documentation/13_conceptionDetaillee.md` avant l'intégration de ce
//! plan. Journalisation de début et de fin systématique (norme 09) ; le courriel d'auteur d'un commit n'est jamais
//! journalisé (SHA et date seulement, via `consigner_resultat_connecteur` qui ne trace que la catégorie d'anomalie
//! en cas d'échec).

use super::etat_session::EtatSession;
use super::fichier::ErreurFacade;
use crate::connecteurs::commun::ErreurConnecteur;
use crate::connecteurs::gitlab::{self, CorrespondanceInterne};
use crate::modele::racine::{DonneesRacine, Groupe, PremierCommitInterne, Projet, Source};
use crate::persistance::prise_en_charge as coordination;
use chrono::Utc;
use tauri::State;

/// Borne de pages de recherche du premier commit interne appliquée en l'absence de réglage explicite
/// (`parametres.audit.borneRecherchePremierCommitPages`). Valeur de repli reprise de
/// `docs/01_besoin/exemple-donnees.json` (`borneRecherchePremierCommitPages: 50`), aucune valeur n'étant fixée par
/// une règle de gestion ou une exigence non fonctionnelle : **décision arbitraire à valider par un humain** (cf.
/// rapport de développement de cet incrément).
const BORNE_RECHERCHE_PREMIER_COMMIT_PAGES_PAR_DEFAUT: u32 = 50;

/// Trouve le groupe et le projet désignés par cet identifiant de projet, quel que soit le groupe de rattachement.
fn trouver_groupe_et_projet<'a>(
    donnees: &'a DonneesRacine,
    projet_id: &str,
) -> Option<(&'a Groupe, &'a Projet)> {
    donnees.groupes.iter().find_map(|groupe| {
        groupe
            .projets
            .iter()
            .find(|projet| projet.id == projet_id)
            .map(|projet| (groupe, projet))
    })
}

/// Calcule la date de prise en charge d'un projet (premier commit interne, RG-058) : pour chaque source GitLab du
/// projet, recherche le premier commit dont l'auteur correspond à une règle de membre connu `interne` du groupe, et
/// retient la plus ancienne date obtenue. Ne persiste rien : retourne la structure calculée, à comparer côté
/// interface à la valeur stockée avant toute sauvegarde (décision 6 du plan).
///
/// `donnees` transporte la racine complète (résolution du groupe et du projet, lecture de la borne de pages) ; les
/// credentials GitLab sont lus dans `etat` (mémoire de session, US-003).
///
/// # Erreurs
///
/// [`ErreurConnecteur::CredentialAbsent`] si aucun credential n'est mémorisé pour une instance concernée ;
/// [`ErreurConnecteur::ReponseInattendue`] si le projet désigné est introuvable dans `donnees` ou si une source
/// référence une instance inexistante ; les autres catégories de [`ErreurConnecteur`] en cas d'échec réseau, de
/// ref introuvable ou de droits insuffisants. `DepotVide` et « trop de commits » ne sont pas des erreurs : ils se
/// reflètent dans le `statut` du résultat.
#[tauri::command]
pub(crate) async fn calculer_prise_en_charge_projet(
    projet_id: String,
    donnees: DonneesRacine,
    etat: State<'_, EtatSession>,
) -> Result<PremierCommitInterne, ErreurConnecteur> {
    crate::journalisation::consigner_debut_commande("calculerPriseEnChargeProjet");
    let resultat = async {
        let (groupe, projet) = trouver_groupe_et_projet(&donnees, &projet_id).ok_or_else(|| {
            ErreurConnecteur::ReponseInattendue {
                message: "Projet introuvable dans les données courantes".to_string(),
            }
        })?;
        let borne_pages = donnees
            .parametres
            .audit
            .borne_recherche_premier_commit_pages
            .unwrap_or(BORNE_RECHERCHE_PREMIER_COMMIT_PAGES_PAR_DEFAUT);
        let calcule_le = Utc::now().date_naive().format("%Y-%m-%d").to_string();
        let client = etat.client_http();
        let etat_ref: &EtatSession = &etat;

        let interroger = move |source: Source,
                               correspondance: CorrespondanceInterne|
              -> coordination::FutureResultatCommit<'_> {
            let client = client.clone();
            Box::pin(async move {
                let instance = groupe
                    .instances
                    .iter()
                    .find(|instance| instance.id == source.instance_id)
                    .ok_or_else(|| ErreurConnecteur::ReponseInattendue {
                        message: "Instance de rattachement de la source introuvable".to_string(),
                    })?;
                let credential = etat_ref.credential(&instance.id).ok_or_else(|| {
                    ErreurConnecteur::CredentialAbsent {
                        message: "Aucun credential en mémoire pour cette instance".to_string(),
                    }
                })?;
                crate::journalisation::consigner_appel_connecteur(
                    "calculerPriseEnChargeProjet",
                    &instance.nom,
                    &source.id_externe,
                );
                let issue = gitlab::rechercher_premier_commit_interne(
                    &instance.url_base,
                    &credential,
                    &source.id_externe,
                    source.ref_auditee.as_deref(),
                    &correspondance,
                    borne_pages,
                    &client,
                )
                .await;
                crate::journalisation::consigner_resultat_connecteur(
                    "calculerPriseEnChargeProjet",
                    &instance.nom,
                    &source.id_externe,
                    issue,
                )
            })
        };

        coordination::calculer_prise_en_charge(groupe, projet, calcule_le, interroger).await
    }
    .await;
    crate::journalisation::consigner_fin_commande("calculerPriseEnChargeProjet");
    resultat
}

/// Retourne l'empreinte (condensé SHA-256 préfixé `sha256:`) du sous-ensemble `interne` des membres connus du
/// groupe désigné (RG-058, décision 15 du plan). L'interface l'utilise pour décider d'un recalcul (pré-filtre de
/// campagne) et pour signaler une empreinte périmée sur la Fiche projet, sans jamais recalculer le condensé
/// elle-même.
///
/// # Erreurs
///
/// [`ErreurFacade::GroupeIntrouvable`] si aucun groupe ne porte cet identifiant.
#[tauri::command]
pub(crate) fn empreinte_referentiel_interne(
    groupe_id: String,
    donnees: DonneesRacine,
) -> Result<String, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("empreinteReferentielInterne");
    let resultat = (|| -> Result<String, ErreurFacade> {
        let groupe = donnees
            .groupes
            .iter()
            .find(|groupe| groupe.id == groupe_id)
            .ok_or(ErreurFacade::GroupeIntrouvable)?;
        Ok(coordination::empreinte_referentiel_interne(groupe))
    })();
    crate::journalisation::consigner_fin_commande("empreinteReferentielInterne");
    resultat
}
