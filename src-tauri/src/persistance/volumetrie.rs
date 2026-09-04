// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Calcul de la volumétrie du fichier de données ouvert (US-055, RG-055 ; onglet « Métriques » de l'écran
//! Administration) : poids du fichier chiffré sur disque, poids du JSON en clair (sérialisation `serde_json` de la
//! racine en mémoire, identique à celle réellement persistée par `persistance::moteur`), et ventilation de ce JSON
//! en clair sur cinq postes dont la somme fait exactement le poids total.
//!
//! Algorithme (décisions d'architecture du plan `docs/03_plan/plan_17_metriquesVolumetrie.md`, chapitre 1) :
//!
//! - `parametrage` = taille JSON de `parametres` + `referentiels` + `vuesEnregistrees` ;
//! - `journal` = taille JSON de `journal` ;
//! - `administration` = pour chaque groupe, `taille(groupe) − taille(groupe.projets)` ; auquel s'ajoute, pour
//!   chaque projet, `taille(projet) − taille(projet.audits)` (soustractions saturées). Ce poste capte donc les
//!   enveloppes de groupe et de projet (identité, description, instances, sources, membres connus, annotations,
//!   indicateurs désactivés) hors audits ;
//! - `audits` = pour chaque projet, `taille(projet.audits)` ; auquel s'ajoutent `taille(campagnes)` et
//!   `taille(brouillon)` ;
//! - `autre` = reste : `taille_json_clair − parametrage − journal − administration − audits` (soustraction
//!   saturée). Le surcoût structurel du JSON (noms de clés de premier niveau, accolades, `meta`, `versionSchema`,
//!   `traitementsAlertes`, enveloppes des tableaux) tombe ainsi mécaniquement dans ce poste, et la somme des cinq
//!   postes vaut exactement `taille_json_clair_octets`.
//!
//! Le calcul n'opère qu'en mémoire sur une [`DonneesRacine`] déjà chargée ; seule la taille sur disque lit le
//! système de fichiers (`std::fs::metadata`), et reflète donc la dernière sauvegarde, pas l'état en mémoire
//! courant.

use crate::modele::racine::DonneesRacine;
use serde::Serialize;
use std::path::Path;

/// Métriques de volumétrie du fichier de données (US-055, RG-055), miroir strict de l'interface TypeScript
/// `MetriquesVolumetrie` (`src/app/services/avecetat/etat/types-donnees.ts`), sérialisée en `camelCase`. Structure
/// de transfert calculée à la volée, jamais persistée.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MetriquesVolumetrie {
    /// Poids du fichier chiffré sur disque, en octets ; `None` si aucun fichier n'est ouvert (jamais sauvegardé)
    /// ou si la lecture des métadonnées du fichier échoue. Reflète la dernière sauvegarde, pas l'état en mémoire.
    pub(crate) taille_disque_octets: Option<u64>,
    /// Poids total de la sérialisation JSON en clair de la racine en mémoire, en octets (avant compression et
    /// chiffrement).
    pub(crate) taille_json_clair_octets: u64,
    /// Ventilation du JSON en clair sur cinq postes dont la somme vaut exactement `taille_json_clair_octets`.
    pub(crate) ventilation: VentilationJsonClair,
}

/// Ventilation du poids du JSON en clair sur cinq postes (RG-055), miroir strict de l'interface TypeScript
/// `VentilationJsonClair`. La somme des cinq champs vaut exactement `MetriquesVolumetrie::taille_json_clair_octets`.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct VentilationJsonClair {
    /// `parametres` + `referentiels` + `vuesEnregistrees`.
    pub(crate) parametrage_octets: u64,
    /// `journal`.
    pub(crate) journal_octets: u64,
    /// Enveloppes de `groupes[]` hors audits : projets, sources, membres connus, annotations, instances,
    /// indicateurs désactivés.
    pub(crate) administration_octets: u64,
    /// `groupes[].projets[].audits[]` + `campagnes` + `brouillon`.
    pub(crate) audits_octets: u64,
    /// Reste : `meta`, `versionSchema`, `traitementsAlertes` et surcoût structurel du JSON.
    pub(crate) autre_octets: u64,
}

/// Taille en octets de la sérialisation JSON compacte (jamais la variante *pretty*, pour rester cohérent avec
/// `persistance::moteur::sauvegarder_fichier`) de `valeur` ; `0` en cas d'échec de sérialisation, cas non
/// atteignable en pratique pour une racine valide (garde défensive alignée sur `persistance::purge::taille_compressee`).
fn taille_json<T: Serialize>(valeur: &T) -> u64 {
    serde_json::to_vec(valeur)
        .map(|octets| octets.len() as u64)
        .unwrap_or(0)
}

/// Calcule les métriques de volumétrie de `donnees` (US-055, RG-055). `chemin`, s'il est fourni et désigne un
/// fichier lisible, alimente `taille_disque_octets` via `std::fs::metadata` ; sinon ce champ vaut `None`.
pub(crate) fn calculer_metriques(
    donnees: &DonneesRacine,
    chemin: Option<&Path>,
) -> MetriquesVolumetrie {
    let taille_json_clair_octets = taille_json(donnees);

    let parametrage_octets = taille_json(&donnees.parametres)
        .saturating_add(taille_json(&donnees.referentiels))
        .saturating_add(taille_json(&donnees.vues_enregistrees));

    let journal_octets = taille_json(&donnees.journal);

    let mut administration_octets = 0u64;
    let mut audits_octets = 0u64;
    for groupe in &donnees.groupes {
        administration_octets = administration_octets
            .saturating_add(taille_json(groupe).saturating_sub(taille_json(&groupe.projets)));
        for projet in &groupe.projets {
            administration_octets = administration_octets
                .saturating_add(taille_json(projet).saturating_sub(taille_json(&projet.audits)));
            audits_octets = audits_octets.saturating_add(taille_json(&projet.audits));
        }
    }
    audits_octets = audits_octets
        .saturating_add(taille_json(&donnees.campagnes))
        .saturating_add(taille_json(&donnees.brouillon));

    let autre_octets = taille_json_clair_octets
        .saturating_sub(parametrage_octets)
        .saturating_sub(journal_octets)
        .saturating_sub(administration_octets)
        .saturating_sub(audits_octets);

    let taille_disque_octets = chemin
        .and_then(|chemin| std::fs::metadata(chemin).ok())
        .map(|metadonnees| metadonnees.len());

    MetriquesVolumetrie {
        taille_disque_octets,
        taille_json_clair_octets,
        ventilation: VentilationJsonClair {
            parametrage_octets,
            journal_octets,
            administration_octets,
            audits_octets,
            autre_octets,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modele::racine::{
        Audit, Groupe, MembreConnu, Projet, StatutMembre, TypeAudit, TypeCritere,
    };

    fn audit_de_test(id: &str) -> Audit {
        Audit {
            id: id.to_string(),
            date: "2026-01-01".to_string(),
            campagne_id: "campagne-1".to_string(),
            resultats: Vec::new(),
            type_audit: TypeAudit::Reguliere,
            date_execution: None,
        }
    }

    fn projet_de_test() -> Projet {
        Projet {
            id: "projet-1".to_string(),
            nom: "Projet".to_string(),
            description: String::new(),
            ia_autorisee: false,
            ia_autorisee_depuis: None,
            premier_commit_interne: None,
            sources: Vec::new(),
            annotations: Vec::new(),
            audits: vec![audit_de_test("a1"), audit_de_test("a2")],
        }
    }

    fn groupe_de_test() -> Groupe {
        Groupe {
            id: "groupe-1".to_string(),
            nom: "Groupe".to_string(),
            description: String::new(),
            instances: Vec::new(),
            membres_connus: Vec::new(),
            annotations: Vec::new(),
            indicateurs_desactives: Vec::new(),
            projets: vec![projet_de_test()],
        }
    }

    fn racine_peuplee() -> DonneesRacine {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-27T08:00:00Z");
        racine.groupes.push(groupe_de_test());
        racine
    }

    #[test]
    fn taille_json_clair_est_non_nulle_sur_une_racine_non_vide() {
        let metriques = calculer_metriques(&racine_peuplee(), None);

        assert!(metriques.taille_json_clair_octets > 0);
    }

    #[test]
    fn la_somme_des_cinq_postes_vaut_exactement_la_taille_json_clair() {
        let metriques = calculer_metriques(&racine_peuplee(), None);
        let v = &metriques.ventilation;

        assert_eq!(
            v.parametrage_octets
                + v.journal_octets
                + v.administration_octets
                + v.audits_octets
                + v.autre_octets,
            metriques.taille_json_clair_octets
        );
    }

    #[test]
    fn linvariant_de_somme_tient_aussi_sur_une_racine_vide() {
        let metriques = calculer_metriques(&DonneesRacine::nouvelle("Test", "2026-07-27T08:00:00Z"), None);
        let v = &metriques.ventilation;

        assert_eq!(
            v.parametrage_octets
                + v.journal_octets
                + v.administration_octets
                + v.audits_octets
                + v.autre_octets,
            metriques.taille_json_clair_octets
        );
    }

    #[test]
    fn le_poste_administration_augmente_avec_un_membre_connu() {
        let sans_membre = calculer_metriques(&racine_peuplee(), None)
            .ventilation
            .administration_octets;

        let mut racine = racine_peuplee();
        racine.groupes[0].membres_connus.push(MembreConnu {
            id: "membre-1".to_string(),
            critere: "jdupont".to_string(),
            type_critere: TypeCritere::Username,
            statut: StatutMembre::Interne,
            libelle: Some("Jean Dupont".to_string()),
            alias_email: None,
            parti_le: None,
        });
        let avec_membre = calculer_metriques(&racine, None)
            .ventilation
            .administration_octets;

        assert!(avec_membre > sans_membre);
    }

    #[test]
    fn le_poste_audits_augmente_avec_un_audit_supplementaire() {
        let sans = calculer_metriques(&racine_peuplee(), None)
            .ventilation
            .audits_octets;

        let mut racine = racine_peuplee();
        racine.groupes[0].projets[0].audits.push(audit_de_test("a3"));
        let avec = calculer_metriques(&racine, None).ventilation.audits_octets;

        assert!(avec > sans);
    }

    /// Fichier temporaire de test, supprimé à la destruction de la valeur (même patron que
    /// `persistance::moteur::tests::DossierTemporaire`).
    struct FichierTemporaire {
        chemin: std::path::PathBuf,
    }

    impl Drop for FichierTemporaire {
        fn drop(&mut self) {
            let _ = std::fs::remove_file(&self.chemin);
        }
    }

    #[test]
    fn taille_disque_est_absente_sans_chemin() {
        let metriques = calculer_metriques(&racine_peuplee(), None);

        assert_eq!(metriques.taille_disque_octets, None);
    }

    #[test]
    fn taille_disque_est_renseignee_pour_un_fichier_reel() -> Result<(), std::io::Error> {
        let chemin = std::env::temp_dir().join(format!("volumetrie-test-{}.bin", uuid::Uuid::new_v4()));
        std::fs::write(&chemin, b"contenu chiffre simule")?;
        let fichier = FichierTemporaire {
            chemin: chemin.clone(),
        };

        let metriques = calculer_metriques(&racine_peuplee(), Some(fichier.chemin.as_path()));

        assert_eq!(metriques.taille_disque_octets, Some(22));
        Ok(())
    }

    #[test]
    fn taille_disque_est_absente_pour_un_chemin_inexistant() {
        let chemin = std::env::temp_dir().join("volumetrie-fichier-absent-xyz.bin");

        let metriques = calculer_metriques(&racine_peuplee(), Some(chemin.as_path()));

        assert_eq!(metriques.taille_disque_octets, None);
    }
}
