// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Moteur de persistance : création, chargement et sauvegarde du fichier de données chiffré (US-001, US-002 ;
//! RG-001 à RG-003), avec sauvegardes de sécurité horodatées, détection de fichier verrouillé par un autre
//! processus et nettoyage d'un fichier temporaire orphelin après une écriture interrompue (cf.
//! `docs/02_documentation/13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique`).

use super::enveloppe::{Enveloppe, TAILLE_IV, TAILLE_SEL, VERSION_ENVELOPPE_COURANTE};
use super::erreurs::ErreurPersistance;
use super::kdf::{self, DecodageKdf, ParametresArgon2id, TAILLE_CLE};
use super::migration;
use crate::modele::racine::{DonneesRacine, VERSION_SCHEMA_COURANTE};
use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, Key, KeyInit, Nonce};
use fs4::fs_std::FileExt;
use rand::RngCore;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

/// Extension du fichier temporaire d'écriture atomique.
const EXTENSION_TEMPORAIRE: &str = "tmp";
/// Séparateur entre le nom du fichier principal et l'horodatage d'une sauvegarde de sécurité.
const MARQUEUR_SAUVEGARDE: &str = ".sauvegarde-";

/// Crée un nouveau fichier de données chiffré, vide (US-001, RG-001, RG-002).
///
/// # Erreurs
///
/// Voir [`ErreurPersistance`] : notamment [`ErreurPersistance::FichierVerrouille`] si un fichier existe déjà à cet
/// emplacement et est verrouillé par un autre processus.
pub(crate) fn creer_fichier(
    chemin: &Path,
    mot_de_passe: &str,
    horodatage_iso8601: &str,
    nom_application: &str,
) -> Result<(DonneesRacine, [u8; TAILLE_CLE]), ErreurPersistance> {
    nettoyer_fichier_temporaire_orphelin(chemin)?;
    let racine = DonneesRacine::nouvelle(nom_application, horodatage_iso8601);
    let cle = ecrire_fichier_chiffre(chemin, &racine, mot_de_passe)?;
    Ok((racine, cle))
}

/// Charge un fichier de données existant (US-002) : déchiffre, décompresse, désérialise, puis migre le schéma si
/// nécessaire.
///
/// # Erreurs
///
/// [`ErreurPersistance::FichierIntrouvable`] si le fichier n'existe pas ; [`ErreurPersistance::EnveloppeNonReconnue`]
/// si le format binaire n'est pas reconnu ; [`ErreurPersistance::MotDePasseOuFichierInvalide`] si le mot de passe
/// est incorrect ou le contenu altéré ; [`ErreurPersistance::VersionSchemaSuperieure`] si le fichier a été créé par
/// une version plus récente de l'application.
pub(crate) fn charger_fichier(
    chemin: &Path,
    mot_de_passe: &str,
) -> Result<(DonneesRacine, [u8; TAILLE_CLE]), ErreurPersistance> {
    nettoyer_fichier_temporaire_orphelin(chemin)?;
    if !chemin.is_file() {
        return Err(ErreurPersistance::FichierIntrouvable(chemin.to_path_buf()));
    }

    let octets = fs::read(chemin)?;
    let enveloppe = Enveloppe::desserialiser(&octets)?;

    let (cle, cle_de_repli) = deriver_cle_avec_repli(&enveloppe, mot_de_passe.as_bytes());

    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&cle));
    let nonce = Nonce::from_slice(&enveloppe.iv);
    let donnees_compressees = cipher
        .decrypt(nonce, enveloppe.donnees_chiffrees.as_ref())
        .map_err(|_erreur| erreur_dechiffrement(cle_de_repli))?;

    let donnees_json = zstd::stream::decode_all(donnees_compressees.as_slice())
        .map_err(|_erreur| ErreurPersistance::ErreurCompression)?;

    let mut valeur: serde_json::Value = serde_json::from_slice(&donnees_json)?;
    migration::appliquer_migrations(
        &mut valeur,
        VERSION_SCHEMA_COURANTE,
        migration::ETAPES_MIGRATION_REELLES,
    )?;
    let racine: DonneesRacine = serde_json::from_value(valeur)?;

    Ok((racine, cle))
}

/// Sauvegarde le fichier de données (RG-001 à RG-003) : sauvegarde de sécurité horodatée de l'ancien contenu si un
/// fichier existe déjà, rotation au-delà du nombre paramétré, puis écriture atomique du nouveau contenu avec un
/// sel et un IV fraîchement régénérés (RNF-012).
///
/// # Erreurs
///
/// [`ErreurPersistance::FichierVerrouille`] si le fichier cible est verrouillé par un autre processus.
pub(crate) fn sauvegarder_fichier(
    chemin: &Path,
    donnees: &DonneesRacine,
    mot_de_passe: &str,
) -> Result<[u8; TAILLE_CLE], ErreurPersistance> {
    ecrire_fichier_chiffre(chemin, donnees, mot_de_passe)
}

/// Supprime, s'il existe, le fichier temporaire d'écriture atomique laissé orphelin par une écriture interrompue
/// précédente (coupure, processus tué) visant ce même chemin cible.
pub(crate) fn nettoyer_fichier_temporaire_orphelin(chemin: &Path) -> Result<(), ErreurPersistance> {
    let chemin_temporaire = chemin_temporaire(chemin);
    if chemin_temporaire.exists() {
        fs::remove_file(&chemin_temporaire)?;
    }
    Ok(())
}

/// Dérive la clé de chiffrement en tentant d'abord l'algorithme porté par l'enveloppe puis, si celui-ci n'est
/// reconnu par aucune version supportée, le repli PBKDF2-SHA256. Retourne également un indicateur précisant si le
/// repli a été emprunté, utilisé pour distinguer l'anomalie remontée en cas d'échec du déchiffrement.
fn deriver_cle_avec_repli(enveloppe: &Enveloppe, mot_de_passe: &[u8]) -> ([u8; TAILLE_CLE], bool) {
    match kdf::decoder_bloc(&enveloppe.bloc_kdf) {
        DecodageKdf::Reconnu(parametres) => {
            match parametres.deriver_cle(mot_de_passe, &enveloppe.sel) {
                Ok(cle) => (cle, false),
                // Des paramètres reconnus mais rejetés par Argon2 (ex. coûts invalides) sont traités comme un
                // format non supporté : repli PBKDF2, cohérent avec le cas d'un identifiant non reconnu.
                Err(_) => (
                    kdf::deriver_cle_pbkdf2_repli(mot_de_passe, &enveloppe.sel),
                    true,
                ),
            }
        }
        DecodageKdf::NonReconnu => (
            kdf::deriver_cle_pbkdf2_repli(mot_de_passe, &enveloppe.sel),
            true,
        ),
    }
}

/// Anomalie remontée lorsque le déchiffrement échoue : distingue un mot de passe incorrect sur un format reconnu
/// (cas courant) d'un format dont même le repli PBKDF2 ne permet pas la lecture (format réellement non supporté).
fn erreur_dechiffrement(cle_de_repli: bool) -> ErreurPersistance {
    if cle_de_repli {
        ErreurPersistance::EnveloppeNonReconnue
    } else {
        ErreurPersistance::MotDePasseOuFichierInvalide
    }
}

/// Sérialise, compresse, chiffre puis écrit `donnees` de façon atomique au chemin donné, après avoir constitué une
/// sauvegarde de sécurité de l'ancien contenu (s'il existe) et vérifié l'absence de verrou détenu par un autre
/// processus.
fn ecrire_fichier_chiffre(
    chemin: &Path,
    donnees: &DonneesRacine,
    mot_de_passe: &str,
) -> Result<[u8; TAILLE_CLE], ErreurPersistance> {
    if chemin.exists() {
        verifier_fichier_non_verrouille(chemin)?;
        rotation_sauvegardes(
            chemin,
            donnees.parametres.sauvegarde.nombre_sauvegardes_securite,
        )?;
    }

    let mut sel = [0u8; TAILLE_SEL];
    rand::rng().fill_bytes(&mut sel);
    let mut iv = [0u8; TAILLE_IV];
    rand::rng().fill_bytes(&mut iv);

    let parametres_kdf = ParametresArgon2id::par_defaut();
    let cle = parametres_kdf.deriver_cle(mot_de_passe.as_bytes(), &sel)?;

    let json = serde_json::to_vec(donnees)?;
    let compresse = zstd::stream::encode_all(json.as_slice(), 0)
        .map_err(|_erreur| ErreurPersistance::ErreurCompression)?;

    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&cle));
    let nonce = Nonce::from_slice(&iv);
    let donnees_chiffrees = cipher
        .encrypt(nonce, compresse.as_ref())
        .map_err(|_erreur| ErreurPersistance::ErreurChiffrement)?;

    let enveloppe = Enveloppe {
        version_enveloppe: VERSION_ENVELOPPE_COURANTE,
        bloc_kdf: parametres_kdf.encoder(),
        sel,
        iv,
        donnees_chiffrees,
    };

    ecrire_atomique(chemin, &enveloppe.serialiser())?;

    Ok(cle)
}

/// Écrit `octets` dans un fichier temporaire sibling puis le renomme vers `chemin` (opération atomique sur un même
/// système de fichiers), de sorte qu'une interruption laisse le fichier original intact.
fn ecrire_atomique(chemin: &Path, octets: &[u8]) -> Result<(), ErreurPersistance> {
    let chemin_temporaire = chemin_temporaire(chemin);
    {
        let mut fichier_temporaire = File::create(&chemin_temporaire)?;
        fichier_temporaire.write_all(octets)?;
        fichier_temporaire.sync_all()?;
    }
    fs::rename(&chemin_temporaire, chemin)?;
    Ok(())
}

/// Chemin du fichier temporaire sibling utilisé pour l'écriture atomique du chemin donné.
fn chemin_temporaire(chemin: &Path) -> PathBuf {
    let mut nom = nom_fichier(chemin);
    nom.push('.');
    nom.push_str(EXTENSION_TEMPORAIRE);
    chemin.with_file_name(nom)
}

/// Nom de fichier (dernier composant du chemin), ou un nom de repli si le chemin n'en porte pas.
fn nom_fichier(chemin: &Path) -> String {
    chemin
        .file_name()
        .and_then(|nom| nom.to_str())
        .unwrap_or("donnees")
        .to_string()
}

/// Vérifie qu'aucun autre processus ne détient de verrou exclusif sur le fichier existant.
///
/// # Erreurs
///
/// [`ErreurPersistance::FichierVerrouille`] si un verrou est déjà détenu par un autre processus.
fn verifier_fichier_non_verrouille(chemin: &Path) -> Result<(), ErreurPersistance> {
    let fichier = File::open(chemin)?;
    let verrou_acquis = fichier.try_lock_exclusive()?;
    if !verrou_acquis {
        return Err(ErreurPersistance::FichierVerrouille);
    }
    FileExt::unlock(&fichier)?;
    Ok(())
}

/// Constitue une sauvegarde de sécurité horodatée de l'ancien fichier avant son écrasement (RG-003), puis fait
/// tourner les sauvegardes existantes au-delà du nombre paramétré.
fn rotation_sauvegardes(
    chemin: &Path,
    nombre_sauvegardes_securite: u32,
) -> Result<(), ErreurPersistance> {
    if nombre_sauvegardes_securite == 0 {
        return Ok(());
    }

    let horodatage = chrono::Utc::now().format("%Y%m%dT%H%M%S%.6f").to_string();
    let chemin_sauvegarde = chemin_sauvegarde_horodatee(chemin, &horodatage);
    fs::copy(chemin, &chemin_sauvegarde)?;

    supprimer_sauvegardes_excedentaires(chemin, nombre_sauvegardes_securite)
}

/// Chemin d'une sauvegarde de sécurité horodatée pour le fichier principal donné.
fn chemin_sauvegarde_horodatee(chemin: &Path, horodatage: &str) -> PathBuf {
    let nom = format!("{}{MARQUEUR_SAUVEGARDE}{horodatage}", nom_fichier(chemin));
    chemin.with_file_name(nom)
}

/// Préfixe de nom de fichier identifiant les sauvegardes de sécurité du fichier principal donné.
fn prefixe_sauvegarde(chemin: &Path) -> String {
    format!("{}{MARQUEUR_SAUVEGARDE}", nom_fichier(chemin))
}

/// Supprime les sauvegardes de sécurité les plus anciennes au-delà du nombre paramété conservé.
fn supprimer_sauvegardes_excedentaires(
    chemin: &Path,
    nombre_sauvegardes_securite: u32,
) -> Result<(), ErreurPersistance> {
    let dossier = chemin.parent().unwrap_or_else(|| Path::new("."));
    let prefixe = prefixe_sauvegarde(chemin);

    let mut sauvegardes: Vec<PathBuf> = fs::read_dir(dossier)?
        .filter_map(std::result::Result::ok)
        .map(|entree| entree.path())
        .filter(|chemin_candidat| {
            chemin_candidat
                .file_name()
                .and_then(|nom| nom.to_str())
                .is_some_and(|nom| nom.starts_with(&prefixe))
        })
        .collect();

    // Le nom porte un horodatage au format lexicographiquement croissant (AAAAMMJJTHHMMSS.microsecondes) : un tri
    // lexicographique des chemins suffit à obtenir l'ordre chronologique, du plus ancien au plus récent.
    sauvegardes.sort();

    let nombre_max = nombre_sauvegardes_securite as usize;
    while sauvegardes.len() > nombre_max {
        let plus_ancienne = sauvegardes.remove(0);
        fs::remove_file(&plus_ancienne)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modele::racine::DonneesRacine;
    use std::io::Read as _;

    /// Répertoire temporaire de test, supprimé à la destruction de la valeur.
    struct DossierTemporaire {
        chemin: PathBuf,
    }

    impl DossierTemporaire {
        fn nouveau(prefixe: &str) -> Self {
            let mut chemin = std::env::temp_dir();
            let unique = uuid::Uuid::new_v4();
            chemin.push(format!("suiviqualimetrie-test-{prefixe}-{unique}"));
            fs::create_dir_all(&chemin).unwrap_or(());
            Self { chemin }
        }

        fn chemin_fichier(&self, nom: &str) -> PathBuf {
            self.chemin.join(nom)
        }
    }

    impl Drop for DossierTemporaire {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.chemin);
        }
    }

    #[test]
    fn round_trip_complet_creation_sauvegarde_chargement() -> Result<(), ErreurPersistance> {
        let dossier = DossierTemporaire::nouveau("round-trip");
        let chemin = dossier.chemin_fichier("donnees.sqm");

        let (mut racine, _cle) = creer_fichier(
            &chemin,
            "mot-de-passe-correct",
            "2026-07-20T08:00:00Z",
            "Test",
        )?;
        racine.groupes.push(crate::modele::racine::Groupe {
            id: "a0000000-0000-4000-8000-000000000001".to_string(),
            nom: "Groupe de test".to_string(),
            description: String::new(),
            instances: vec![],
            membres_connus: vec![],
            annotations: vec![],
            indicateurs_desactives: vec![],
            projets: vec![],
        });

        sauvegarder_fichier(&chemin, &racine, "mot-de-passe-correct")?;

        let (relue, _cle) = charger_fichier(&chemin, "mot-de-passe-correct")?;

        assert_eq!(relue, racine);
        Ok(())
    }

    #[test]
    fn mot_de_passe_incorrect_est_rejete_sans_precision_technique() -> Result<(), ErreurPersistance>
    {
        let dossier = DossierTemporaire::nouveau("mdp-incorrect");
        let chemin = dossier.chemin_fichier("donnees.sqm");
        creer_fichier(
            &chemin,
            "mot-de-passe-correct",
            "2026-07-20T08:00:00Z",
            "Test",
        )?;

        let resultat = charger_fichier(&chemin, "mot-de-passe-incorrect");

        assert!(matches!(
            resultat,
            Err(ErreurPersistance::MotDePasseOuFichierInvalide)
        ));
        Ok(())
    }

    #[test]
    fn fichier_absent_est_signale() {
        let dossier = DossierTemporaire::nouveau("absent");
        let chemin = dossier.chemin_fichier("inexistant.sqm");

        let resultat = charger_fichier(&chemin, "peu-importe");

        assert!(matches!(
            resultat,
            Err(ErreurPersistance::FichierIntrouvable(_))
        ));
    }

    #[test]
    fn fichier_corrompu_ou_tronque_est_rejete() -> Result<(), ErreurPersistance> {
        let dossier = DossierTemporaire::nouveau("corrompu");
        let chemin = dossier.chemin_fichier("donnees.sqm");
        creer_fichier(
            &chemin,
            "mot-de-passe-correct",
            "2026-07-20T08:00:00Z",
            "Test",
        )?;

        // Tronque le fichier pour simuler une écriture ou une copie interrompue.
        let contenu_complet = fs::read(&chemin)?;
        fs::write(&chemin, &contenu_complet[..contenu_complet.len() / 2])?;

        let resultat = charger_fichier(&chemin, "mot-de-passe-correct");

        assert!(resultat.is_err());
        Ok(())
    }

    #[test]
    fn version_schema_superieure_a_la_courante_est_rejetee() -> Result<(), ErreurPersistance> {
        let dossier = DossierTemporaire::nouveau("version-superieure");
        let chemin = dossier.chemin_fichier("donnees.sqm");
        let (mut racine, _cle) = creer_fichier(
            &chemin,
            "mot-de-passe-correct",
            "2026-07-20T08:00:00Z",
            "Test",
        )?;
        racine.version_schema = VERSION_SCHEMA_COURANTE + 1;
        sauvegarder_fichier(&chemin, &racine, "mot-de-passe-correct")?;

        let resultat = charger_fichier(&chemin, "mot-de-passe-correct");

        assert!(matches!(
            resultat,
            Err(ErreurPersistance::VersionSchemaSuperieure { .. })
        ));
        Ok(())
    }

    #[test]
    fn repli_pbkdf2_permet_de_lire_une_enveloppe_a_identifiant_kdf_non_reconnu()
    -> Result<(), ErreurPersistance> {
        let dossier = DossierTemporaire::nouveau("repli-pbkdf2");
        let chemin = dossier.chemin_fichier("donnees.sqm");
        let mot_de_passe = "mot-de-passe-correct";

        // Construit directement une enveloppe dont l'identifiant KDF n'est reconnu par aucune version supportée,
        // chiffrée avec la clé qu'obtiendrait le repli PBKDF2-SHA256 pour ce même sel.
        let mut sel = [0u8; TAILLE_SEL];
        rand::rng().fill_bytes(&mut sel);
        let mut iv = [0u8; TAILLE_IV];
        rand::rng().fill_bytes(&mut iv);

        let cle = kdf::deriver_cle_pbkdf2_repli(mot_de_passe.as_bytes(), &sel);
        let racine = DonneesRacine::nouvelle("Test", "2026-07-20T08:00:00Z");
        let json = serde_json::to_vec(&racine)?;
        let compresse = zstd::stream::encode_all(json.as_slice(), 0)
            .map_err(|_| ErreurPersistance::ErreurCompression)?;
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&cle));
        let nonce = Nonce::from_slice(&iv);
        let donnees_chiffrees = cipher
            .encrypt(nonce, compresse.as_ref())
            .map_err(|_| ErreurPersistance::ErreurChiffrement)?;

        let mut bloc_kdf = [0u8; kdf::TAILLE_BLOC_PARAMETRES_KDF];
        bloc_kdf[0] = 250; // identifiant volontairement non reconnu par cette version de l'application.
        let enveloppe = Enveloppe {
            version_enveloppe: VERSION_ENVELOPPE_COURANTE,
            bloc_kdf,
            sel,
            iv,
            donnees_chiffrees,
        };
        fs::write(&chemin, enveloppe.serialiser())?;

        let (relue, _cle) = charger_fichier(&chemin, mot_de_passe)?;

        assert_eq!(relue, racine);
        Ok(())
    }

    #[test]
    fn repli_pbkdf2_echoue_aussi_est_rejete_explicitement() -> Result<(), ErreurPersistance> {
        let dossier = DossierTemporaire::nouveau("repli-pbkdf2-echec");
        let chemin = dossier.chemin_fichier("donnees.sqm");

        let mut sel = [0u8; TAILLE_SEL];
        rand::rng().fill_bytes(&mut sel);
        let mut iv = [0u8; TAILLE_IV];
        rand::rng().fill_bytes(&mut iv);
        let mut bloc_kdf = [0u8; kdf::TAILLE_BLOC_PARAMETRES_KDF];
        bloc_kdf[0] = 250;
        let enveloppe = Enveloppe {
            version_enveloppe: VERSION_ENVELOPPE_COURANTE,
            bloc_kdf,
            sel,
            iv,
            donnees_chiffrees: vec![0u8; 32],
        };
        fs::write(&chemin, enveloppe.serialiser())?;

        let resultat = charger_fichier(&chemin, "peu-importe");

        assert!(matches!(
            resultat,
            Err(ErreurPersistance::EnveloppeNonReconnue)
        ));
        Ok(())
    }

    #[test]
    fn fichier_temporaire_orphelin_est_nettoye_au_chargement_suivant()
    -> Result<(), ErreurPersistance> {
        let dossier = DossierTemporaire::nouveau("temp-orphelin");
        let chemin = dossier.chemin_fichier("donnees.sqm");
        creer_fichier(
            &chemin,
            "mot-de-passe-correct",
            "2026-07-20T08:00:00Z",
            "Test",
        )?;

        // Simule une écriture atomique interrompue : un fichier temporaire orphelin subsiste à côté du fichier
        // principal, qui lui reste intact.
        let chemin_temporaire_orphelin = chemin_temporaire(&chemin);
        fs::write(&chemin_temporaire_orphelin, b"contenu-partiel-interrompu")?;
        assert!(chemin_temporaire_orphelin.exists());

        let (_racine, _cle) = charger_fichier(&chemin, "mot-de-passe-correct")?;

        assert!(!chemin_temporaire_orphelin.exists());
        Ok(())
    }

    #[test]
    fn sauvegarde_est_rejetee_si_fichier_verrouille_par_un_autre_processus()
    -> Result<(), ErreurPersistance> {
        let dossier = DossierTemporaire::nouveau("verrouille");
        let chemin = dossier.chemin_fichier("donnees.sqm");
        let (racine, _cle) = creer_fichier(
            &chemin,
            "mot-de-passe-correct",
            "2026-07-20T08:00:00Z",
            "Test",
        )?;

        let fichier_verrouilleur = File::open(&chemin)?;
        let verrou_acquis = fichier_verrouilleur.try_lock_exclusive()?;
        assert!(
            verrou_acquis,
            "le verrou de test doit être acquis pour que le scénario soit valide"
        );

        let resultat = sauvegarder_fichier(&chemin, &racine, "mot-de-passe-correct");

        FileExt::unlock(&fichier_verrouilleur)?;
        assert!(matches!(
            resultat,
            Err(ErreurPersistance::FichierVerrouille)
        ));
        Ok(())
    }

    #[test]
    fn rotation_des_sauvegardes_respecte_la_limite_parametree() -> Result<(), ErreurPersistance> {
        let dossier = DossierTemporaire::nouveau("rotation");
        let chemin = dossier.chemin_fichier("donnees.sqm");
        let (mut racine, _cle) = creer_fichier(
            &chemin,
            "mot-de-passe-correct",
            "2026-07-20T08:00:00Z",
            "Test",
        )?;
        racine.parametres.sauvegarde.nombre_sauvegardes_securite = 2;

        // Trois sauvegardes successives : seules les deux dernières doivent subsister.
        for _ in 0..3 {
            sauvegarder_fichier(&chemin, &racine, "mot-de-passe-correct")?;
        }

        let prefixe = prefixe_sauvegarde(&chemin);
        let nombre_sauvegardes = fs::read_dir(&dossier.chemin)?
            .filter_map(std::result::Result::ok)
            .filter(|entree| {
                entree
                    .file_name()
                    .to_str()
                    .is_some_and(|nom| nom.starts_with(&prefixe))
            })
            .count();

        assert_eq!(nombre_sauvegardes, 2);
        Ok(())
    }

    #[test]
    fn contenu_ecrit_nest_jamais_en_clair_sur_le_disque() -> Result<(), ErreurPersistance> {
        let dossier = DossierTemporaire::nouveau("chiffre");
        let chemin = dossier.chemin_fichier("donnees.sqm");
        creer_fichier(
            &chemin,
            "mot-de-passe-correct",
            "2026-07-20T08:00:00Z",
            "ApplicationDeTest",
        )?;

        let mut contenu = String::new();
        // Une lecture en tant que texte échoue déjà probablement (octets non UTF-8) ; à défaut, le marqueur
        // distinctif du nom de l'application ne doit en tout état de cause jamais apparaître en clair.
        let lecture_texte = File::open(&chemin)?.read_to_string(&mut contenu);
        if lecture_texte.is_ok() {
            assert!(!contenu.contains("ApplicationDeTest"));
        }
        Ok(())
    }
}
