// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Enveloppe binaire chiffrée sur disque, conforme au format décrit par
//! `docs/01_besoin/Specification.md#63-enveloppe-chiffrée` :
//! `magie (4 octets) | versionEnveloppe (1) | paramètres KDF | sel (16) | IV (12) | données chiffrées + tag GCM`.
//!
//! Le format exact du bloc « paramètres KDF » n'étant pas détaillé au-delà de sa présence dans la spécification,
//! sa largeur fixe et son contenu sont définis dans le module [`super::kdf`] et documentés comme une décision de
//! conception explicite.

use super::erreurs::ErreurPersistance;
use super::kdf::TAILLE_BLOC_PARAMETRES_KDF;

/// Signature en tête de fichier identifiant un fichier de données de l'application (arbitraire, aucune valeur
/// n'étant imposée par la documentation : décision de conception, à valider par un humain).
const MAGIE: [u8; 4] = *b"SQM1";

/// Version courante du format d'enveloppe (indépendante de `versionSchema`, cf.
/// `docs/02_documentation/12_modeleDonnees.md#stratégie-de-migration-des-données`). Une seule version existe à ce
/// stade : aucun mécanisme de migration d'enveloppe n'est requis par la Phase 1 (à la différence de la migration
/// de `versionSchema`, dont le mécanisme générique est bien en place, cf. `super::migration`).
pub(crate) const VERSION_ENVELOPPE_COURANTE: u8 = 1;

/// Longueur, en octets, du sel de dérivation de clé (RNF-012, `Specification.md` §5.1).
pub(crate) const TAILLE_SEL: usize = 16;
/// Longueur, en octets, de l'IV (nonce) AES-256-GCM (RNF-012, `Specification.md` §5.1).
pub(crate) const TAILLE_IV: usize = 12;

/// Longueur, en octets, de l'en-tête de l'enveloppe précédant les données chiffrées.
const TAILLE_ENTETE: usize = MAGIE.len() + 1 + TAILLE_BLOC_PARAMETRES_KDF + TAILLE_SEL + TAILLE_IV;

/// Enveloppe binaire chiffrée, telle que lue depuis ou écrite vers le disque.
pub(crate) struct Enveloppe {
    /// Version du format d'enveloppe portée par le fichier.
    pub(crate) version_enveloppe: u8,
    /// Bloc de paramètres KDF de largeur fixe (cf. `super::kdf`).
    pub(crate) bloc_kdf: [u8; TAILLE_BLOC_PARAMETRES_KDF],
    /// Sel de dérivation de clé.
    pub(crate) sel: [u8; TAILLE_SEL],
    /// IV (nonce) AES-256-GCM.
    pub(crate) iv: [u8; TAILLE_IV],
    /// Données compressées puis chiffrées, tag d'authentification GCM inclus.
    pub(crate) donnees_chiffrees: Vec<u8>,
}

impl Enveloppe {
    /// Sérialise l'enveloppe dans l'ordre binaire exact attendu sur disque.
    pub(crate) fn serialiser(&self) -> Vec<u8> {
        let mut octets = Vec::with_capacity(TAILLE_ENTETE + self.donnees_chiffrees.len());
        octets.extend_from_slice(&MAGIE);
        octets.push(self.version_enveloppe);
        octets.extend_from_slice(&self.bloc_kdf);
        octets.extend_from_slice(&self.sel);
        octets.extend_from_slice(&self.iv);
        octets.extend_from_slice(&self.donnees_chiffrees);
        octets
    }

    /// Désérialise une enveloppe depuis les octets bruts lus sur disque.
    ///
    /// # Erreurs
    ///
    /// Retourne [`ErreurPersistance::EnveloppeNonReconnue`] si les octets sont trop courts pour porter un en-tête
    /// complet, si la signature ne correspond pas, ou si la version d'enveloppe est postérieure à celle connue de
    /// cette version de l'application (fichier créé par une version plus récente).
    pub(crate) fn desserialiser(octets: &[u8]) -> Result<Self, ErreurPersistance> {
        if octets.len() < TAILLE_ENTETE {
            return Err(ErreurPersistance::EnveloppeNonReconnue);
        }
        if octets[0..MAGIE.len()] != MAGIE {
            return Err(ErreurPersistance::EnveloppeNonReconnue);
        }

        let mut curseur = MAGIE.len();
        let version_enveloppe = octets[curseur];
        curseur += 1;
        if version_enveloppe > VERSION_ENVELOPPE_COURANTE {
            return Err(ErreurPersistance::EnveloppeNonReconnue);
        }

        let mut bloc_kdf = [0u8; TAILLE_BLOC_PARAMETRES_KDF];
        bloc_kdf.copy_from_slice(&octets[curseur..curseur + TAILLE_BLOC_PARAMETRES_KDF]);
        curseur += TAILLE_BLOC_PARAMETRES_KDF;

        let mut sel = [0u8; TAILLE_SEL];
        sel.copy_from_slice(&octets[curseur..curseur + TAILLE_SEL]);
        curseur += TAILLE_SEL;

        let mut iv = [0u8; TAILLE_IV];
        iv.copy_from_slice(&octets[curseur..curseur + TAILLE_IV]);
        curseur += TAILLE_IV;

        let donnees_chiffrees = octets[curseur..].to_vec();

        Ok(Self {
            version_enveloppe,
            bloc_kdf,
            sel,
            iv,
            donnees_chiffrees,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enveloppe_survit_a_un_aller_retour_binaire() {
        let enveloppe = Enveloppe {
            version_enveloppe: VERSION_ENVELOPPE_COURANTE,
            bloc_kdf: [7u8; TAILLE_BLOC_PARAMETRES_KDF],
            sel: [1u8; TAILLE_SEL],
            iv: [2u8; TAILLE_IV],
            donnees_chiffrees: vec![9, 9, 9, 9],
        };

        let octets = enveloppe.serialiser();
        let relue = Enveloppe::desserialiser(&octets);

        let relue = match relue {
            Ok(relue) => relue,
            Err(_) => panic!("la désérialisation d'une enveloppe valide ne doit pas échouer"),
        };
        assert_eq!(relue.version_enveloppe, VERSION_ENVELOPPE_COURANTE);
        assert_eq!(relue.bloc_kdf, [7u8; TAILLE_BLOC_PARAMETRES_KDF]);
        assert_eq!(relue.sel, [1u8; TAILLE_SEL]);
        assert_eq!(relue.iv, [2u8; TAILLE_IV]);
        assert_eq!(relue.donnees_chiffrees, vec![9, 9, 9, 9]);
    }

    #[test]
    fn signature_absente_est_rejetee() {
        let octets = vec![0u8; TAILLE_ENTETE + 4];

        assert!(matches!(
            Enveloppe::desserialiser(&octets),
            Err(ErreurPersistance::EnveloppeNonReconnue)
        ));
    }

    #[test]
    fn fichier_tronque_est_rejete() {
        let octets = vec![b'S', b'Q', b'M', b'1', 1];

        assert!(matches!(
            Enveloppe::desserialiser(&octets),
            Err(ErreurPersistance::EnveloppeNonReconnue)
        ));
    }

    #[test]
    fn version_enveloppe_superieure_est_rejetee() {
        let mut octets = vec![0u8; TAILLE_ENTETE];
        octets[0..MAGIE.len()].copy_from_slice(&MAGIE);
        octets[MAGIE.len()] = VERSION_ENVELOPPE_COURANTE + 1;

        assert!(matches!(
            Enveloppe::desserialiser(&octets),
            Err(ErreurPersistance::EnveloppeNonReconnue)
        ));
    }
}
