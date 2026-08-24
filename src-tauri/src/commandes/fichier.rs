// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées au fichier de données chiffré et au verrouillage de session (US-001, US-002,
//! US-026, US-040). Chaque commande délègue au Moteur de persistance et met à jour l'état de session en
//! conséquence ; voir
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
    /// Le groupe désigné n'existe pas dans les données courantes (Phase 4, `qualifierMembre`/`definirPolitiqueIA` ;
    /// Phase 8, `creerAnnotation`).
    GroupeIntrouvable,
    /// Le projet désigné n'existe pas dans les données courantes (Phase 4, `definirPolitiqueIA` ; Phase 8,
    /// `creerAnnotation`).
    ProjetIntrouvable,
    /// La règle de membre connu désignée par son identifiant n'existe pas dans le groupe (Phase 4,
    /// `qualifierMembre`).
    MembreIntrouvable,
    /// La règle soumise porte un doublon de username déjà utilisé par une autre règle du groupe (Phase 4, RG-008).
    DoublonUsernameMembreConnu,
    /// La règle soumise, de type email/domaineEmail, entre en conflit avec une autre règle du groupe portant le
    /// même critère et un statut différent (Phase 4, Phase 10 R10-07, RG-008).
    ConflitReglesMembreConnu,
    /// Un brouillon existe déjà et doit être traité avant d'en enregistrer un nouveau (Phase 5, incrément 2,
    /// `enregistrerBrouillon`, RG-019).
    BrouillonDejaExistant,
    /// Aucun brouillon n'est actuellement en attente de traitement (Phase 5, incrément 2, `integrerBrouillon`/
    /// `rejeterBrouillon`).
    AucunBrouillonCourant,
    /// Le projet désigné ne fait pas partie du brouillon courant (Phase 5, incrément 2, `integrerBrouillon`/
    /// `rejeterBrouillon`).
    ProjetAbsentDuBrouillon,
    /// La clé de seuil désignée ne correspond à aucune feuille existante de `parametres.seuils` (Phase 7,
    /// incrément 1, `definirSeuil`).
    CleSeuilIntrouvable,
    /// Le type de référentiel désigné n'est reconnu par aucune des branches gérées par `definirReferentiel`
    /// (Phase 7, incrément 1).
    TypeReferentielInconnu,
    /// L'entrée soumise pour un référentiel-liste ne porte pas les champs requis sous la forme attendue (Phase 7,
    /// incrément 1, `definirReferentiel`).
    EntreeReferentielInvalide,
    /// Le motif de nommage de branche soumis est vide ou syntaxiquement invalide (Phase 7, incrément 1, RG-030).
    MotifNommageBranchesInvalide,
    /// Un réglage applicatif soumis ne respecte pas sa borne de validité minimale (Phase 10, incrément 8, US-034,
    /// US-035, `definirVerrouillage`/`definirConcurrenceAudit`/`definirProxy`/
    /// `definirNombreSauvegardesSecurite`/`definirSeuilAvertissementTaille`).
    ReglageApplicatifInvalide,
    /// L'entrée de référentiel désignée par son identifiant n'existe pas (Phase 10, incrément 8, US-033,
    /// `supprimerRegleDependance`/`supprimerRegleMarqueurIA`).
    EntreeReferentielIntrouvable,
    /// Le motif soumis à `definirReferentiel` pour une règle de dépendances correspond déjà au motif d'une autre
    /// entrée existante du référentiel (Phase 15, C15-10, RG-042) : rejet strict, jamais de fusion implicite.
    MotifDependanceDejaExistant,
    /// L'annotation désignée n'existe pas dans la portée demandée (Phase 10, incrément 8, US-019,
    /// `supprimerAnnotation`).
    AnnotationIntrouvable,
    /// L'annotation désignée est une annotation système, jamais supprimable (Phase 10, incrément 8, US-019, RG-015,
    /// RG-033, `supprimerAnnotation`).
    AnnotationSystemeNonSupprimable,
    /// Le mode de purge par âge désigné n'est ni `"suppression"` ni `"agregationMensuelle"` (Phase 7, incrément 4,
    /// `previsualiserPurgeAge`/`executerPurgeAge`, RG-025).
    ModePurgeAgeInconnu,
    /// La vue enregistrée désignée par son identifiant n'existe pas (Phase 9, incrément 1, `definirVue`/
    /// `supprimerVue`).
    VueIntrouvable,
    /// Le fichier de configuration désigné est illisible ou introuvable (Phase 9, incrément 3,
    /// `previsualiserImportConfiguration`/`importerConfiguration`, US-030).
    FichierConfigurationIllisible,
    /// Le contenu du fichier de configuration n'est pas reconnu comme une configuration partageable valide
    /// (Phase 9, incrément 3, US-030).
    FormatConfigurationNonReconnu,
    /// Le fichier de configuration a été produit par une version de schéma plus récente que celle de
    /// l'application (Phase 9, incrément 3, US-030, F23).
    VersionSchemaConfigurationSuperieure,
    /// Une ligne acceptée de l'import de configuration ne correspond à aucune ligne du différentiel recalculé,
    /// état obsolète (Phase 9, incrément 3, `importerConfiguration`, US-030, RG-029).
    LigneDifferentielInconnue,
    /// La session est verrouillée (aucune clé dérivée détenue) : une commande de mutation a été invoquée sans
    /// déverrouillage préalable (Phase 10, R10-01, RG-002).
    SessionVerrouillee,
    /// Le mot de passe fourni à une commande de mutation ne correspond pas à la clé dérivée déjà authentifiée par
    /// la session courante (Phase 10, R10-01, RG-002) : empêche un changement silencieux du mot de passe du
    /// fichier.
    MotDePasseSessionDivergent,
    /// Le nouveau mot de passe soumis à `changerMotDePasseFichier` est vide (Phase 15, C15-03, US-040, RG-038) :
    /// revalidation côté cœur natif de la validation déjà effectuée côté interface.
    NouveauMotDePasseInvalide,
    /// Anomalie interne non destinée à être détaillée à l'utilisateur.
    ErreurInterne,
}

/// Réponse commune aux commandes batch qui mutent puis sauvegardent plusieurs entrées en une seule opération
/// (`definirReferentiels`, `qualifierMembres`, ajoutées le 2026-08-24 en correction de performance de la saisie en
/// masse, RG-040/RG-041) : la racine mise à jour et un indicateur de succès par entrée soumise, dans le même ordre.
/// Partagée entre les deux commandes plutôt que dupliquée, sur le modèle déjà
/// pratiqué pour [`ErreurFacade`] ci-dessus. Un échec sur une entrée n'est jamais propagé (reflété par `reussites`
/// à `false` pour l'entrée concernée) : la boucle continue avec les entrées suivantes, sans jamais annuler celles
/// déjà réussies du même lot.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReponseMutationMasse {
    /// Racine des données mises à jour, à substituer intégralement à l'état courant de l'UI.
    pub(crate) donnees: DonneesRacine,
    /// Indicateur de succès par entrée soumise, dans le même ordre que les entrées transmises à la commande.
    pub(crate) reussites: Vec<bool>,
}

/// Revérifie, avant toute réécriture du fichier de données par une commande de mutation, que le mot de passe fourni
/// correspond bien à la clé dérivée déjà authentifiée par la session courante (Phase 10, R10-01, RG-002) : empêche
/// qu'une commande qui ne redemande le mot de passe qu'en apparence ne change silencieusement le mot de passe du
/// fichier. Rejette la sauvegarde si la session est verrouillée (aucune clé en mémoire, décision actée avec
/// l'utilisateur) plutôt que de l'accepter sans vérification possible. Si le fichier n'existe pas encore sur disque
/// (cas rare : supprimé de l'extérieur entre deux opérations), aucune comparaison n'est possible : la vérification
/// est alors sans effet, laissée à la charge de l'écriture elle-même.
///
/// Fonction ordinaire (pas une commande Tauri) : testable directement, conformément à la convention du projet
/// selon laquelle la Façade de commandes n'est testée qu'à travers les modules qu'elle route.
///
/// # Erreurs
///
/// [`ErreurFacade::SessionVerrouillee`] si aucune clé n'est détenue par la session ; [`ErreurFacade::MotDePasseSessionDivergent`]
/// si le mot de passe fourni ne correspond pas à la clé de session.
pub(crate) fn verifier_avant_ecriture(
    chemin: &Path,
    mot_de_passe: &str,
    etat: &EtatSession,
) -> Result<(), ErreurFacade> {
    if !etat.est_deverrouillee() {
        return Err(ErreurFacade::SessionVerrouillee);
    }
    if chemin.exists() {
        let cle_candidate = moteur::deriver_cle_disque(chemin, mot_de_passe)?;
        if !etat.correspond_a(&cle_candidate) {
            return Err(ErreurFacade::MotDePasseSessionDivergent);
        }
    }
    Ok(())
}

/// Revalide côté cœur natif que le nouveau mot de passe soumis à `changerMotDePasseFichier` n'est pas vide
/// (US-040, RG-038), en complément de la validation déjà effectuée côté interface. Fonction ordinaire (pas une
/// commande Tauri), testable directement, sur le même principe que [`verifier_avant_ecriture`].
///
/// # Erreurs
///
/// [`ErreurFacade::NouveauMotDePasseInvalide`] si `nouveau_mot_de_passe` est vide ou ne contient que des espaces.
pub(crate) fn valider_nouveau_mot_de_passe(nouveau_mot_de_passe: &str) -> Result<(), ErreurFacade> {
    if nouveau_mot_de_passe.trim().is_empty() {
        return Err(ErreurFacade::NouveauMotDePasseInvalide);
    }
    Ok(())
}

impl From<crate::persistance::administration::ErreurAdministration> for ErreurFacade {
    fn from(erreur: crate::persistance::administration::ErreurAdministration) -> Self {
        use crate::persistance::administration::ErreurAdministration;
        match erreur {
            ErreurAdministration::GroupeIntrouvable => Self::GroupeIntrouvable,
            ErreurAdministration::ProjetIntrouvable => Self::ProjetIntrouvable,
            ErreurAdministration::MembreIntrouvable => Self::MembreIntrouvable,
            ErreurAdministration::DoublonUsernameMembreConnu => Self::DoublonUsernameMembreConnu,
            ErreurAdministration::ConflitReglesMembreConnu => Self::ConflitReglesMembreConnu,
        }
    }
}

impl From<crate::persistance::alertes::ErreurAlertes> for ErreurFacade {
    fn from(erreur: crate::persistance::alertes::ErreurAlertes) -> Self {
        use crate::persistance::alertes::ErreurAlertes;
        match erreur {
            ErreurAlertes::GroupeIntrouvable => Self::GroupeIntrouvable,
            ErreurAlertes::ProjetIntrouvable => Self::ProjetIntrouvable,
            ErreurAlertes::AnnotationIntrouvable => Self::AnnotationIntrouvable,
            ErreurAlertes::AnnotationSystemeNonSupprimable => Self::AnnotationSystemeNonSupprimable,
        }
    }
}

impl From<crate::persistance::parametrage::ErreurParametrage> for ErreurFacade {
    fn from(erreur: crate::persistance::parametrage::ErreurParametrage) -> Self {
        use crate::persistance::parametrage::ErreurParametrage;
        match erreur {
            ErreurParametrage::CleSeuilIntrouvable => Self::CleSeuilIntrouvable,
            ErreurParametrage::TypeReferentielInconnu => Self::TypeReferentielInconnu,
            ErreurParametrage::EntreeReferentielInvalide => Self::EntreeReferentielInvalide,
            ErreurParametrage::MotifNommageBranchesInvalide => Self::MotifNommageBranchesInvalide,
            ErreurParametrage::ReglageApplicatifInvalide => Self::ReglageApplicatifInvalide,
            ErreurParametrage::EntreeReferentielIntrouvable => Self::EntreeReferentielIntrouvable,
            ErreurParametrage::MotifDependanceDejaExistant => Self::MotifDependanceDejaExistant,
        }
    }
}

impl From<crate::persistance::purge::ErreurPurge> for ErreurFacade {
    fn from(erreur: crate::persistance::purge::ErreurPurge) -> Self {
        use crate::persistance::purge::ErreurPurge;
        match erreur {
            ErreurPurge::ModePurgeAgeInconnu => Self::ModePurgeAgeInconnu,
        }
    }
}

impl From<crate::persistance::vues::ErreurVues> for ErreurFacade {
    fn from(erreur: crate::persistance::vues::ErreurVues) -> Self {
        use crate::persistance::vues::ErreurVues;
        match erreur {
            ErreurVues::VueIntrouvable => Self::VueIntrouvable,
        }
    }
}

impl From<crate::persistance::configuration_partageable::ErreurConfigurationPartageable>
    for ErreurFacade
{
    fn from(
        erreur: crate::persistance::configuration_partageable::ErreurConfigurationPartageable,
    ) -> Self {
        use crate::persistance::configuration_partageable::ErreurConfigurationPartageable;
        match erreur {
            ErreurConfigurationPartageable::FichierIllisible => Self::FichierConfigurationIllisible,
            ErreurConfigurationPartageable::FormatNonReconnu => Self::FormatConfigurationNonReconnu,
            ErreurConfigurationPartageable::VersionSchemaSuperieure => {
                Self::VersionSchemaConfigurationSuperieure
            }
            ErreurConfigurationPartageable::LigneDifferentielInconnue => {
                Self::LigneDifferentielInconnue
            }
        }
    }
}

impl From<crate::persistance::audit::ErreurAudit> for ErreurFacade {
    fn from(erreur: crate::persistance::audit::ErreurAudit) -> Self {
        use crate::persistance::audit::ErreurAudit;
        match erreur {
            ErreurAudit::BrouillonDejaExistant => Self::BrouillonDejaExistant,
            ErreurAudit::AucunBrouillonCourant => Self::AucunBrouillonCourant,
            ErreurAudit::ProjetAbsentDuBrouillon => Self::ProjetAbsentDuBrouillon,
            ErreurAudit::ProjetIntrouvable => Self::ProjetIntrouvable,
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
    crate::journalisation::consigner_debut_commande("creerFichier");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        let horodatage = Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true);
        let (racine, cle) = moteur::creer_fichier(
            Path::new(&chemin),
            &mot_de_passe,
            &horodatage,
            NOM_APPLICATION,
        )?;
        etat.definir(PathBuf::from(chemin), cle);
        etat.definir_proxy(racine.parametres.proxy.clone());
        Ok(racine)
    })();
    crate::journalisation::consigner_fin_commande("creerFichier");
    resultat
}

/// Charge un fichier de données existant (US-002).
#[tauri::command]
pub(crate) fn charger_fichier(
    chemin: String,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("chargerFichier");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        let (racine, cle) = moteur::charger_fichier(Path::new(&chemin), &mot_de_passe)?;
        etat.definir(PathBuf::from(chemin), cle);
        etat.definir_proxy(racine.parametres.proxy.clone());
        Ok(racine)
    })();
    crate::journalisation::consigner_fin_commande("chargerFichier");
    resultat
}

/// Sauvegarde le fichier de données actuellement ouvert.
#[tauri::command]
pub(crate) fn sauvegarder_fichier(
    chemin: String,
    donnees: DonneesRacine,
    mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<(), ErreurFacade> {
    crate::journalisation::consigner_debut_commande("sauvegarderFichier");
    let resultat = (|| -> Result<(), ErreurFacade> {
        verifier_avant_ecriture(Path::new(&chemin), &mot_de_passe, &etat)?;
        let cle = moteur::sauvegarder_fichier(
            Path::new(&chemin),
            &donnees,
            &mot_de_passe,
            "sauvegarderFichier",
        )?;
        etat.definir(PathBuf::from(chemin), cle);
        Ok(())
    })();
    crate::journalisation::consigner_fin_commande("sauvegarderFichier");
    resultat
}

/// Change le mot de passe du fichier de données actuellement ouvert (US-040, RG-038) : revérifie l'ancien mot de
/// passe contre la clé de session déjà authentifiée, selon la même garde que toute commande de mutation
/// (`verifier_avant_ecriture`, R10-01/RG-002), puis réécrit immédiatement le fichier avec le nouveau mot de passe
/// et supprime l'ensemble des sauvegardes de sécurité déjà présentes sur disque (chiffrées avec l'ancien mot de
/// passe, donc rendues obsolètes, RG-038). Consigne l'événement au journal des modifications sans jamais y exposer
/// l'un ou l'autre mot de passe, conformément à
/// `docs/02_documentation/15_normesSecurite.md#journalisation-des-événements-sensibles`.
///
/// # Erreurs
///
/// [`ErreurFacade::SessionVerrouillee`]/[`ErreurFacade::MotDePasseSessionDivergent`] si l'ancien mot de passe fourni
/// ne correspond pas à la session courante ; [`ErreurFacade::NouveauMotDePasseInvalide`] si le nouveau mot de passe
/// soumis est vide.
#[tauri::command]
pub(crate) fn changer_mot_de_passe_fichier(
    chemin: String,
    donnees: DonneesRacine,
    ancien_mot_de_passe: String,
    nouveau_mot_de_passe: String,
    etat: State<'_, EtatSession>,
) -> Result<DonneesRacine, ErreurFacade> {
    crate::journalisation::consigner_debut_commande("changerMotDePasseFichier");
    let resultat = (|| -> Result<DonneesRacine, ErreurFacade> {
        verifier_avant_ecriture(Path::new(&chemin), &ancien_mot_de_passe, &etat)?;
        valider_nouveau_mot_de_passe(&nouveau_mot_de_passe)?;

        let mut donnees = donnees;
        donnees.journal.push(crate::modele::racine::EntreeJournal {
            id: uuid::Uuid::new_v4().to_string(),
            horodatage: Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true),
            objet: "securite.motDePasseFichier".to_string(),
            avant: serde_json::Value::Null,
            apres: serde_json::Value::Null,
            origine: "Paramétrage".to_string(),
            detail_origine: Some("Changement du mot de passe du fichier".to_string()),
        });

        let cle = moteur::changer_mot_de_passe(
            Path::new(&chemin),
            &donnees,
            &nouveau_mot_de_passe,
            "changerMotDePasseFichier",
        )?;
        etat.definir(PathBuf::from(chemin), cle);
        Ok(donnees)
    })();
    crate::journalisation::consigner_fin_commande("changerMotDePasseFichier");
    resultat
}

/// Verrouille la session courante : efface la clé dérivée détenue côté cœur natif (US-026, RG-004, RG-005).
#[tauri::command]
pub(crate) fn verrouiller_session(etat: State<'_, EtatSession>) -> Result<(), ErreurFacade> {
    crate::journalisation::consigner_debut_commande("verrouillerSession");
    #[allow(
        clippy::redundant_closure_call,
        reason = "closure immédiatement invoquée pour permettre l'opérateur ? localement, motif reconnu"
    )]
    let resultat = (|| -> Result<(), ErreurFacade> {
        etat.purger();
        Ok(())
    })();
    crate::journalisation::consigner_fin_commande("verrouillerSession");
    resultat
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
    crate::journalisation::consigner_debut_commande("deverrouillerSession");
    let resultat = (|| -> Result<(), ErreurFacade> {
        let chemin = etat
            .chemin_fichier()
            .ok_or(ErreurFacade::AucunFichierOuvert)?;
        let (racine, cle) = moteur::charger_fichier(&chemin, &mot_de_passe)?;
        etat.definir(chemin, cle);
        etat.definir_proxy(racine.parametres.proxy);
        Ok(())
    })();
    crate::journalisation::consigner_fin_commande("deverrouillerSession");
    resultat
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

    /// Répertoire temporaire de test, supprimé à la destruction de la valeur (même gabarit que
    /// `persistance::moteur::tests::DossierTemporaire`, non réutilisable telle quelle car privée à son module).
    struct DossierTemporaire {
        chemin: PathBuf,
    }

    impl DossierTemporaire {
        fn nouveau(prefixe: &str) -> Self {
            let mut chemin = std::env::temp_dir();
            let unique = uuid::Uuid::new_v4();
            chemin.push(format!("suiviqualimetrie-test-{prefixe}-{unique}"));
            std::fs::create_dir_all(&chemin).unwrap_or(());
            Self { chemin }
        }

        fn chemin_fichier(&self, nom: &str) -> PathBuf {
            self.chemin.join(nom)
        }
    }

    impl Drop for DossierTemporaire {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.chemin);
        }
    }

    #[test]
    fn verifier_avant_ecriture_rejette_si_session_verrouillee() {
        let dossier = DossierTemporaire::nouveau("verif-verrouille");
        let chemin = dossier.chemin_fichier("donnees.sqm");
        let etat = EtatSession::nouveau();

        let resultat = verifier_avant_ecriture(&chemin, "peu-importe", &etat);

        assert_eq!(resultat, Err(ErreurFacade::SessionVerrouillee));
    }

    #[test]
    fn verifier_avant_ecriture_rejette_un_mot_de_passe_divergent_de_la_session()
    -> Result<(), ErreurPersistance> {
        let dossier = DossierTemporaire::nouveau("verif-divergent");
        let chemin = dossier.chemin_fichier("donnees.sqm");
        let (_racine, cle) = moteur::creer_fichier(
            &chemin,
            "mot-de-passe-correct",
            "2026-07-29T08:00:00Z",
            "Test",
        )?;
        let etat = EtatSession::nouveau();
        etat.definir(chemin.clone(), cle);

        let resultat = verifier_avant_ecriture(&chemin, "mot-de-passe-different", &etat);

        assert_eq!(resultat, Err(ErreurFacade::MotDePasseSessionDivergent));
        Ok(())
    }

    #[test]
    fn verifier_avant_ecriture_accepte_le_mot_de_passe_correct() -> Result<(), ErreurPersistance> {
        let dossier = DossierTemporaire::nouveau("verif-correct");
        let chemin = dossier.chemin_fichier("donnees.sqm");
        let (_racine, cle) = moteur::creer_fichier(
            &chemin,
            "mot-de-passe-correct",
            "2026-07-29T08:00:00Z",
            "Test",
        )?;
        let etat = EtatSession::nouveau();
        etat.definir(chemin.clone(), cle);

        let resultat = verifier_avant_ecriture(&chemin, "mot-de-passe-correct", &etat);

        assert_eq!(resultat, Ok(()));
        Ok(())
    }

    #[test]
    fn verifier_avant_ecriture_accepte_la_toute_premiere_sauvegarde_apres_creation()
    -> Result<(), ErreurPersistance> {
        // La commande `creerFichier` définit déjà la clé de session avec le mot de passe de création (cf.
        // `creer_fichier` ci-dessus) : la toute première sauvegarde qui suit trouve donc naturellement une clé de
        // session à comparer, sans cas particulier à prévoir pour ce moment précis.
        let dossier = DossierTemporaire::nouveau("verif-premiere-sauvegarde");
        let chemin = dossier.chemin_fichier("donnees.sqm");
        let etat = EtatSession::nouveau();
        let (_racine, cle) = moteur::creer_fichier(
            &chemin,
            "mot-de-passe-creation",
            "2026-07-29T08:00:00Z",
            "Test",
        )?;
        etat.definir(chemin.clone(), cle);

        let resultat = verifier_avant_ecriture(&chemin, "mot-de-passe-creation", &etat);

        assert_eq!(resultat, Ok(()));
        Ok(())
    }

    #[test]
    fn valider_nouveau_mot_de_passe_rejette_une_chaine_vide_ou_uniquement_des_espaces() {
        assert_eq!(
            valider_nouveau_mot_de_passe(""),
            Err(ErreurFacade::NouveauMotDePasseInvalide)
        );
        assert_eq!(
            valider_nouveau_mot_de_passe("   "),
            Err(ErreurFacade::NouveauMotDePasseInvalide)
        );
    }

    #[test]
    fn valider_nouveau_mot_de_passe_accepte_une_chaine_non_vide() {
        assert_eq!(valider_nouveau_mot_de_passe("nouveau-mot-de-passe"), Ok(()));
    }

    #[test]
    fn verifier_avant_ecriture_accepte_si_le_fichier_est_absent_du_disque() {
        // Cas rare (fichier supprimé de l'extérieur entre deux opérations) : aucune comparaison n'est possible,
        // laissé sans effet à la charge de l'écriture elle-même (décision arbitraire, cf. rapport de
        // développement).
        let dossier = DossierTemporaire::nouveau("verif-fichier-absent");
        let chemin = dossier.chemin_fichier("inexistant.sqm");
        let etat = EtatSession::nouveau();
        etat.definir(chemin.clone(), [1u8; crate::persistance::kdf::TAILLE_CLE]);

        let resultat = verifier_avant_ecriture(&chemin, "peu-importe", &etat);

        assert_eq!(resultat, Ok(()));
    }
}
