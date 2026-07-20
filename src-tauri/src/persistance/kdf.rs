// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Dérivation de la clé de chiffrement à partir du mot de passe du fichier.
//!
//! Décision de conception (bloc « paramètres KDF » de l'enveloppe, non détaillé au-delà de sa présence par
//! `docs/01_besoin/Specification.md#63-enveloppe-chiffrée`) : ce bloc a une largeur fixe de
//! [`TAILLE_BLOC_PARAMETRES_KDF`] octets quel que soit son contenu (un identifiant d'algorithme suivi d'une charge
//! utile de douze octets), afin que la position du sel, de l'IV et des données chiffrées dans l'enveloppe reste
//! toujours calculable même lorsque l'identifiant lu ne correspond à aucune version supportée par cette version de
//! l'application. C'est cette situation précise — identifiant non reconnu, mais bloc correctement délimité — qui
//! déclenche le repli PBKDF2-SHA256 décrit par `docs/01_besoin/Specification.md#51-f01--stockage-chiffré-local` et
//! `docs/02_documentation/13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique` : la
//! dérivation est retentée avec un nombre d'itérations fixe et documenté ci-dessous, en utilisant le sel lu dans
//! l'enveloppe, sans dépendre du contenu (non interprétable) de la charge utile.

use super::erreurs::ErreurPersistance;
use argon2::{Algorithm, Argon2, Params, Version};
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;

/// Longueur, en octets, de la clé dérivée (clé AES-256).
pub(crate) const TAILLE_CLE: usize = 32;

/// Largeur fixe, en octets, du bloc « paramètres KDF » de l'enveloppe : un octet d'identifiant d'algorithme suivi
/// d'une charge utile de douze octets (cf. commentaire d'en-tête de ce module).
pub(crate) const TAILLE_BLOC_PARAMETRES_KDF: usize = 13;

/// Identifiant d'algorithme réservé à Argon2id, seul algorithme utilisé à l'écriture par cette version de
/// l'application.
const IDENTIFIANT_ARGON2ID: u8 = 1;

/// Coût mémoire par défaut d'Argon2id, en kibioctets (RNF-002 : mémoire ≥ 64 Mo).
pub(crate) const ARGON2_M_COUT_KIO_PAR_DEFAUT: u32 = 65_536;
/// Nombre d'itérations par défaut d'Argon2id (RNF-002 : 3 itérations).
pub(crate) const ARGON2_T_COUT_PAR_DEFAUT: u32 = 3;
/// Degré de parallélisme d'Argon2id : non fixé par la documentation normative, retenu à 1 (décision arbitraire, à
/// valider par un humain, cf. compte-rendu de développement de la Phase 1).
pub(crate) const ARGON2_P_COUT_PAR_DEFAUT: u32 = 1;

/// Nombre d'itérations du repli PBKDF2-SHA256, fixe et indépendant du contenu de l'enveloppe (`Specification.md`
/// §5.1 : « repli PBKDF2-SHA256 ≥ 600 000 itérations »).
pub(crate) const PBKDF2_ITERATIONS_REPLI: u32 = 600_000;

/// Paramètres de dérivation de clé Argon2id effectivement portés par l'enveloppe.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct ParametresArgon2id {
    /// Coût mémoire, en kibioctets.
    pub(crate) m_cout_kio: u32,
    /// Nombre d'itérations.
    pub(crate) t_cout: u32,
    /// Degré de parallélisme.
    pub(crate) p_cout: u32,
}

impl ParametresArgon2id {
    /// Paramètres retenus par cette version de l'application pour toute nouvelle sauvegarde (RNF-002).
    pub(crate) fn par_defaut() -> Self {
        Self {
            m_cout_kio: ARGON2_M_COUT_KIO_PAR_DEFAUT,
            t_cout: ARGON2_T_COUT_PAR_DEFAUT,
            p_cout: ARGON2_P_COUT_PAR_DEFAUT,
        }
    }

    /// Encode ces paramètres dans le bloc de largeur fixe de l'enveloppe.
    pub(crate) fn encoder(&self) -> [u8; TAILLE_BLOC_PARAMETRES_KDF] {
        let mut bloc = [0u8; TAILLE_BLOC_PARAMETRES_KDF];
        bloc[0] = IDENTIFIANT_ARGON2ID;
        bloc[1..5].copy_from_slice(&self.m_cout_kio.to_le_bytes());
        bloc[5..9].copy_from_slice(&self.t_cout.to_le_bytes());
        bloc[9..13].copy_from_slice(&self.p_cout.to_le_bytes());
        bloc
    }

    /// Dérive la clé de chiffrement à partir du mot de passe et du sel, avec ces paramètres.
    pub(crate) fn deriver_cle(
        &self,
        mot_de_passe: &[u8],
        sel: &[u8],
    ) -> Result<[u8; TAILLE_CLE], ErreurPersistance> {
        let params = Params::new(self.m_cout_kio, self.t_cout, self.p_cout, Some(TAILLE_CLE))
            .map_err(|_erreur| ErreurPersistance::EnveloppeNonReconnue)?;
        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
        let mut cle = [0u8; TAILLE_CLE];
        argon2
            .hash_password_into(mot_de_passe, sel, &mut cle)
            .map_err(|_erreur| ErreurPersistance::EnveloppeNonReconnue)?;
        Ok(cle)
    }
}

/// Résultat du décodage du bloc « paramètres KDF » lu dans l'enveloppe.
pub(crate) enum DecodageKdf {
    /// L'identifiant d'algorithme est reconnu par cette version de l'application.
    Reconnu(ParametresArgon2id),
    /// L'identifiant d'algorithme ne correspond à aucune version supportée : déclenche le repli PBKDF2-SHA256.
    NonReconnu,
}

/// Décode le bloc « paramètres KDF » de largeur fixe lu dans l'enveloppe.
pub(crate) fn decoder_bloc(bloc: &[u8; TAILLE_BLOC_PARAMETRES_KDF]) -> DecodageKdf {
    if bloc[0] != IDENTIFIANT_ARGON2ID {
        return DecodageKdf::NonReconnu;
    }
    let m_cout_kio = u32::from_le_bytes([bloc[1], bloc[2], bloc[3], bloc[4]]);
    let t_cout = u32::from_le_bytes([bloc[5], bloc[6], bloc[7], bloc[8]]);
    let p_cout = u32::from_le_bytes([bloc[9], bloc[10], bloc[11], bloc[12]]);
    DecodageKdf::Reconnu(ParametresArgon2id {
        m_cout_kio,
        t_cout,
        p_cout,
    })
}

/// Dérive la clé de chiffrement par repli PBKDF2-SHA256, à nombre d'itérations fixe (cf. commentaire d'en-tête de
/// ce module). Contrairement à Argon2id, cette fonction ne peut pas échouer : HMAC accepte une clé de toute
/// longueur.
pub(crate) fn deriver_cle_pbkdf2_repli(mot_de_passe: &[u8], sel: &[u8]) -> [u8; TAILLE_CLE] {
    let mut cle = [0u8; TAILLE_CLE];
    pbkdf2_hmac::<Sha256>(mot_de_passe, sel, PBKDF2_ITERATIONS_REPLI, &mut cle);
    cle
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bloc_argon2id_est_reconnu_apres_encodage() {
        let params = ParametresArgon2id::par_defaut();
        let bloc = params.encoder();

        match decoder_bloc(&bloc) {
            DecodageKdf::Reconnu(relu) => assert_eq!(relu, params),
            DecodageKdf::NonReconnu => panic!("le bloc encodé devrait être reconnu"),
        }
    }

    #[test]
    fn identifiant_inconnu_declenche_le_non_reconnu() {
        let mut bloc = [0u8; TAILLE_BLOC_PARAMETRES_KDF];
        bloc[0] = 99;

        assert!(matches!(decoder_bloc(&bloc), DecodageKdf::NonReconnu));
    }

    #[test]
    fn deux_derivations_argon2id_avec_le_meme_sel_produisent_la_meme_cle()
    -> Result<(), ErreurPersistance> {
        let params = ParametresArgon2id::par_defaut();
        let sel = [1u8; 16];

        let cle_a = params.deriver_cle(b"mot-de-passe", &sel)?;
        let cle_b = params.deriver_cle(b"mot-de-passe", &sel)?;

        assert_eq!(cle_a, cle_b);
        Ok(())
    }

    #[test]
    fn deux_sels_differents_produisent_des_cles_differentes() -> Result<(), ErreurPersistance> {
        let params = ParametresArgon2id::par_defaut();

        let cle_a = params.deriver_cle(b"mot-de-passe", &[1u8; 16])?;
        let cle_b = params.deriver_cle(b"mot-de-passe", &[2u8; 16])?;

        assert_ne!(cle_a, cle_b);
        Ok(())
    }

    #[test]
    fn le_repli_pbkdf2_est_deterministe_a_sel_egal() {
        let sel = [3u8; 16];

        let cle_a = deriver_cle_pbkdf2_repli(b"mot-de-passe", &sel);
        let cle_b = deriver_cle_pbkdf2_repli(b"mot-de-passe", &sel);

        assert_eq!(cle_a, cle_b);
    }
}
