// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées à l'export et à l'import de la configuration partageable (Phase 9, incrément 3,
//! US-029, US-030 ; RG-028, RG-029).
//!
//! Noms de commande non fournis littéralement par `docs/02_documentation/13_conceptionDetaillee.md` (décision
//! arbitraire, cf. rapport de développement de cet incrément) : choisis par symétrie avec `previsualiserPurgeAge`/
//! `executerPurgeAge` (Phase 7, incrément 4) — une commande de consultation pure (`previsualiserImportConfiguration`,
//! sans mot de passe) et une commande de mutation (`importerConfiguration`, RG-002). `exporterConfiguration` ne
//! sauvegarde jamais le fichier de données lui-même (aucune mutation de `DonneesRacine`) : classée « Consultation »
//! par US-029, elle ne redemande donc pas le mot de passe du fichier (RG-002 ne s'applique qu'à une sauvegarde
//! réelle du fichier de données).
//!
//! Chaque commande délègue l'intégralité de sa logique métier à `persistance::configuration_partageable`, déjà
//! couverte par ses propres tests unitaires (chemin de fichier de configuration mis à part, propre à la commande) :
//! conformément à la convention du projet, la Façade de commandes n'est jamais testée isolément.

use super::etat_session::EtatSession;
use super::fichier::ErreurFacade;
use crate::modele::racine::DonneesRacine;
use crate::persistance::configuration_partageable::{
    self, ConfigurationPartageable, DifferentielImportConfiguration,
};
use crate::persistance::moteur;
use chrono::{SecondsFormat, Utc};
use std::path::{Path, PathBuf};
use tauri::State;

/// Exporte la configuration partageable courante (seuils et référentiels, RG-028) en un fichier JSON en clair au
/// chemin désigné (US-029). Ne mute ni ne sauvegarde le fichier de données.
///
/// # Erreurs
///
/// [`ErreurFacade::ErreurInterne`] si l'écriture du fichier échoue (droits insuffisants, chemin invalide).
#[tauri::command]
pub(crate) fn exporter_configuration(
    chemin: String,
    donnees: DonneesRacine,
) -> Result<(), ErreurFacade> {
    crate::journalisation::consigner_debut_commande("exporterConfiguration");
    #[allow(
        clippy::redundant_closure_call,
        reason = "closure immédiatement invoquée pour permettre l'opérateur ? localement, motif reconnu"
    )]
    let resultat = (|| -> Result<(), ErreurFacade> {
        let configuration: ConfigurationPartageable =
            configuration_partageable::exporter_configuration(&donnees);
        configuration_partageable::ecrire_configuration(Path::new(&chemin), &configuration)
            .map_err(|_| ErreurFacade::ErreurInterne)
    })();
    crate::journalisation::consigner_fin_commande("exporterConfiguration");
    resultat
}

/// Prévisualise l'import d'un fichier de configuration partageable désigné par `chemin` (US-030) : aucune
/// modification ni sauvegarde.
///
/// # Erreurs
///
/// [`ErreurFacade::FichierConfigurationIllisible`], [`ErreurFacade::FormatConfigurationNonReconnu`] ou
/// [`ErreurFacade::VersionSchemaConfigurationSuperieure`], cf.
/// [`configuration_partageable::previsualiser_import_configuration`] pour le détail.
#[tauri::command]
pub(crate) fn previsualiser_import_configuration(
    chemin: String,
    donnees: DonneesRacine,
) -> Result<DifferentielImportConfiguration, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("previsualiserImportConfiguration");
    let resultat = (|| -> Result<DifferentielImportConfiguration, ErreurFacade> {
        Ok(
            configuration_partageable::previsualiser_import_configuration(
                &donnees,
                Path::new(&chemin),
            )?,
        )
    })();
    crate::journalisation::consigner_fin_commande("previsualiserImportConfiguration");
    resultat
}

/// Importe un fichier de configuration partageable (US-030, RG-029) : n'applique que les lignes de différentiel
/// désignées par `chemins_acceptes`, sauvegarde le fichier de données et consigne une entrée de journal par ligne
/// réellement appliquée.
///
/// # Erreurs
///
/// Voir [`configuration_partageable::importer_configuration`] pour le détail des anomalies de validation métier
/// (fichier illisible, format non reconnu, version de schéma supérieure, ligne acceptée obsolète) ; les anomalies
/// de sauvegarde héritées de [`crate::persistance::erreurs::ErreurPersistance`] sinon.
#[tauri::command]
pub(crate) fn importer_configuration(
    chemin: String,
    donnees: DonneesRacine,
    chemin_configuration: String,
    chemins_acceptes: Vec<String>,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("importerConfiguration");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        super::fichier::verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let mut donnees = donnees;
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        configuration_partageable::importer_configuration(
            &mut donnees,
            Path::new(&chemin_configuration),
            &chemins_acceptes,
            horodatage,
        )?;

        let cle_session = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "importerConfiguration",
        )?;
        etat.definir(PathBuf::from(chemin), cle_session);

        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("importerConfiguration");
    resultat
}
