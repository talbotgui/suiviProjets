// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées au fichier de données chiffré et au verrouillage de session (US-001, US-002,
//! US-026). Chaque commande délègue au Moteur de persistance et met à jour l'état de session en conséquence ; voir
//! `docs/02_documentation/13_conceptionDetaillee.md#séquences-des-scénarios-fonctionnels-principaux`.
//!
//! Nom de commande non fourni littéralement par la documentation source (décision, cf. compte-rendu de
//! développement de la Phase 1) : le déverrouillage de session (`deverrouillerSession`/`deverrouiller_session`)
//! n'est nommé nulle part explicitement dans `docs/02_documentation/13_conceptionDetaillee.md`, alors que son
//! existence est requise par la description du cas d'usage US-026 et confirmée par le périmètre de la Phase 1
//! (« créer/charger/sauvegarder le fichier, verrouiller/déverrouiller »).

use super::etat_session::EtatSession;
use crate::modele::racine::DonneesRacine;
use crate::persistance::erreurs::ErreurPersistance;
use crate::persistance::moteur;
use chrono::{SecondsFormat, Utc};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::State;

/// Nom de l'application inscrit dans les métadonnées d'un nouveau fichier de données.
const NOM_APPLICATION: &str = "SuiviQualimetrie";

/// Anomalie remontée par la Façade de commandes à l'interface, sans détail technique sensible (US-002 : « signalé
/// sans exposer d'information technique sensible »).
#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub(crate) enum ErreurFacade {
    /// Le fichier de données désigné n'existe pas.
    FichierIntrouvable,
    /// Mot de passe incorrect ou fichier altéré (volontairement indifférenciés, cf. `ErreurPersistance`).
    MotDePasseOuFichierInvalide,
    /// Le format du fichier n'est pas reconnu par cette version de l'application.
    FormatNonReconnu,
    /// Le fichier a été créé par une version plus récente de l'application.
    VersionSchemaSuperieure,
    /// Le fichier est verrouillé par un autre processus.
    FichierVerrouille,
    /// Aucun fichier n'est actuellement ouvert dans la session.
    AucunFichierOuvert,
    /// Un credential fourni est vide (RG-004) : revalidation côté cœur natif de la validation déjà effectuée côté
    /// interface, cf. `docs/02_documentation/15_normesSecurite.md#contrôle-des-entrées-et-sorties` (« aucune
    /// confiance aveugle dans une donnée reçue via une commande »).
    CredentialInvalide,
    /// Le groupe désigné n'existe pas dans les données courantes (Phase 4, `qualifierMembre`/`definirPolitiqueIA`).
    GroupeIntrouvable,
    /// Le projet désigné n'existe pas dans les données courantes (Phase 4, `definirPolitiqueIA`).
    ProjetIntrouvable,
    /// La règle de membre connu désignée par son identifiant n'existe pas dans le groupe (Phase 4,
    /// `qualifierMembre`).
    MembreIntrouvable,
    /// La règle soumise porte un doublon de username déjà utilisé par une autre règle du groupe (Phase 4, RG-008).
    DoublonUsernameMembreConnu,
    /// Anomalie interne non destinée à être détaillée à l'utilisateur.
    ErreurInterne,
}

impl From<crate::persistance::administration::ErreurAdministration> for ErreurFacade {
    fn from(erreur: crate::persistance::administration::ErreurAdministration) -> Self {
        use crate::persistance::administration::ErreurAdministration;
        match erreur {
            ErreurAdministration::GroupeIntrouvable => Self::GroupeIntrouvable,
            ErreurAdministration::ProjetIntrouvable => Self::ProjetIntrouvable,
            ErreurAdministration::MembreIntrouvable => Self::MembreIntrouvable,
            ErreurAdministration::DoublonUsernameMembreConnu => Self::DoublonUsernameMembreConnu,
        }
    }
}

impl From<ErreurPersistance> for ErreurFacade {
    fn from(erreur: ErreurPersistance) -> Self {
        match erreur {
            ErreurPersistance::FichierIntrouvable(_) => Self::FichierIntrouvable,
            ErreurPersistance::MotDePasseOuFichierInvalide => Self::MotDePasseOuFichierInvalide,
            ErreurPersistance::EnveloppeNonReconnue => Self::FormatNonReconnu,
            ErreurPersistance::VersionSchemaSuperieure { .. } => Self::VersionSchemaSuperieure,
            ErreurPersistance::FichierVerrouille => Self::FichierVerrouille,
            ErreurPersistance::ErreurEntreeSortie(_)
            | ErreurPersistance::ErreurSerialisation(_)
            | ErreurPersistance::ErreurCompression
            | ErreurPersistance::ErreurChiffrement
            | ErreurPersistance::EtapeMigrationManquante { .. } => Self::ErreurInterne,
        }
    }
}

/// Crée un nouveau fichier de données chiffré, vide (US-001).
#[tauri::command]
pub(crate) fn creer_fichier(
    chemin: String,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
    let (racine, cle) = moteur::creer_fichier(
        Path::new(&chemin),
        &mot_de_passe,
        &horodatage,
        NOM_APPLICATION,
    )?;
    etat.definir(PathBuf::from(chemin), cle);
    Ok(racine)
}

/// Charge un fichier de données existant (US-002).
#[tauri::command]
pub(crate) fn charger_fichier(
    chemin: String,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    let (racine, cle) = moteur::charger_fichier(Path::new(&chemin), &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle);
    Ok(racine)
}

/// Sauvegarde le fichier de données actuellement ouvert.
#[tauri::command]
pub(crate) fn sauvegarder_fichier(
    chemin: String,
    donnees: DonneesRacine,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<(), ErreurFacade> {
    let cle = moteur::sauvegarder_fichier(Path::new(&chemin), &donnees, &mot_de_passe)?;
    etat.definir(PathBuf::from(chemin), cle);
    Ok(())
}

/// Verrouille la session courante : efface la clé dérivée détenue côté cœur natif (US-026, RG-004, RG-005).
#[tauri::command]
pub(crate) fn verrouiller_session(etat: State<'_, EtatSession>) -> Result<(), ErreurFacade> {
    etat.purger();
    Ok(())
}

/// Déverrouille la session courante : revérifie le mot de passe par nouvelle dérivation de clé contre le fichier
/// actuellement ouvert (US-026). Ne referme pas le fichier après un échec : le comptage des échecs consécutifs et
/// la décision de fermeture relèvent du Store d'état applicatif côté interface, qui connaît déjà le nombre
/// paramétré d'échecs tolérés (`parametres.verrouillage.echecsAvantFermeture`) sur les données déjà chargées.
#[tauri::command]
pub(crate) fn deverrouiller_session(
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<(), ErreurFacade> {
    let chemin = etat
        .chemin_fichier()
        .ok_or(ErreurFacade::AucunFichierOuvert)?;
    let (_racine, cle) = moteur::charger_fichier(&chemin, &mot_de_passe)?;
    etat.definir(chemin, cle);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn erreur_facade_ne_distingue_pas_mot_de_passe_incorrect_de_fichier_altere() {
        assert_eq!(
            ErreurFacade::from(ErreurPersistance::MotDePasseOuFichierInvalide),
            ErreurFacade::MotDePasseOuFichierInvalide
        );
    }

    #[test]
    fn erreur_facade_signale_la_version_schema_superieure() {
        assert_eq!(
            ErreurFacade::from(ErreurPersistance::VersionSchemaSuperieure {
                version_fichier: 2,
                version_courante: 1
            }),
            ErreurFacade::VersionSchemaSuperieure
        );
    }
}
