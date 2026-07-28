// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Mutations liées aux vues enregistrées (Phase 9, incrément 1, US-028 ; RG-027) : création, mise à jour et
//! suppression d'un modèle de filtres nommé, propre à un écran, avec au plus une vue par défaut par écran.
//!
//! Comme le reste du Moteur de persistance, ce module ne touche jamais le disque ni l'état de session : il opère
//! uniquement sur une [`DonneesRacine`] déjà chargée en mémoire ; la sauvegarde effective reste de la
//! responsabilité des commandes de la Façade qui l'invoquent (`commandes::vues`).
//!
//! Aucune entrée de journal (RG-023) n'est consignée par ce module : une `VueEnregistree`, comme un
//! `TraitementAlerte` (Phase 8), est une donnée de travail personnelle jamais exportée (cf.
//! `docs/02_documentation/12_modeleDonnees.md#gouvernance-et-propriété-des-données`, qui la classe explicitement au
//! même titre que `TraitementAlerte`), et RG-023 n'énumère pas les vues enregistrées parmi les modifications
//! consignées — décision arbitraire documentée dans le compte-rendu de développement de cette phase, prise en
//! cohérence stricte avec la lecture déjà validée par le Relecteur de la Phase 8 pour `qualifier_alerte` (à la
//! différence de la lecture initialement inversée du Codeur pour `creer_annotation` sur ce même point).
//!
//! Nom de commande non fourni littéralement par la documentation source (aucune séquence fonctionnelle détaillée
//! ni nom de commande pour les vues enregistrées dans
//! `docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`) : retenu
//! par symétrie avec `definirSeuil`/`definirReferentiel` (une seule commande d'ajout/mise à jour selon la présence
//! d'un identifiant, sur le modèle déjà établi par `qualifierMembre`) et avec `supprimerMembreConnu`/
//! `supprimerReferentiel` pour la suppression, décision à valider par un humain.

use crate::modele::racine::{DonneesRacine, VueEnregistree};
use serde_json::Value;
use thiserror::Error;

/// Anomalie de validation métier levée avant toute tentative de sauvegarde.
#[derive(Debug, Error, PartialEq, Eq)]
pub(crate) enum ErreurVues {
    /// L'identifiant de vue désigné n'existe pas dans les données courantes.
    #[error("la vue enregistrée désignée est introuvable")]
    VueIntrouvable,
}

/// Ajoute ou met à jour une vue enregistrée (US-028, RG-027).
///
/// `id` distingue les deux cas : absent, une nouvelle vue est créée avec un identifiant UUID v4 généré ; présent,
/// il doit désigner une vue déjà existante, intégralement remplacée par les champs fournis. Si `par_defaut` vaut
/// `true`, toute autre vue déjà marquée par défaut pour le même `ecran` est désélectionnée au préalable, afin de
/// garantir qu'au plus une vue par défaut existe par écran (RG-027 : « possibilité de la définir comme vue par
/// défaut de son écran »).
///
/// # Erreurs
///
/// [`ErreurVues::VueIntrouvable`] si `id` est fourni mais ne désigne aucune vue existante.
#[allow(
    clippy::too_many_arguments,
    reason = "une VueEnregistree complète (6 champs) plus l'identifiant optionnel de mise à jour ; regrouper ces paramètres dans une structure dédiée n'apporterait pas de clarté supplémentaire pour un seul point d'appel, sur le modèle déjà retenu par `persistance::alertes::creer_annotation`"
)]
pub(crate) fn definir_vue(
    donnees: &mut DonneesRacine,
    id: Option<String>,
    nom: String,
    ecran: String,
    version_filtres: u32,
    par_defaut: bool,
    filtres: Value,
) -> Result<VueEnregistree, ErreurVues> {
    let id = match id {
        Some(id) => {
            if !donnees.vues_enregistrees.iter().any(|vue| vue.id == id) {
                return Err(ErreurVues::VueIntrouvable);
            }
            id
        }
        None => uuid::Uuid::new_v4().to_string(),
    };

    if par_defaut {
        for vue in donnees
            .vues_enregistrees
            .iter_mut()
            .filter(|vue| vue.ecran == ecran)
        {
            vue.par_defaut = false;
        }
    }

    let vue = VueEnregistree {
        id: id.clone(),
        nom,
        ecran,
        version_filtres,
        par_defaut,
        filtres,
    };

    match donnees.vues_enregistrees.iter_mut().find(|v| v.id == id) {
        Some(existante) => *existante = vue.clone(),
        None => donnees.vues_enregistrees.push(vue.clone()),
    }

    Ok(vue)
}

/// Supprime une vue enregistrée par identifiant (US-028).
///
/// # Erreurs
///
/// [`ErreurVues::VueIntrouvable`] si `id` ne désigne aucune vue existante.
pub(crate) fn supprimer_vue(donnees: &mut DonneesRacine, id: &str) -> Result<(), ErreurVues> {
    let position = donnees
        .vues_enregistrees
        .iter()
        .position(|vue| vue.id == id)
        .ok_or(ErreurVues::VueIntrouvable)?;
    donnees.vues_enregistrees.remove(position);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn definir_vue_sans_id_cree_une_nouvelle_vue() -> Result<(), ErreurVues> {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-28T08:00:00Z");

        let vue = definir_vue(
            &mut racine,
            None,
            "Ma vue".to_string(),
            "listeTravail".to_string(),
            1,
            false,
            json!({ "groupeId": "g1" }),
        )?;

        assert_eq!(racine.vues_enregistrees.len(), 1);
        assert_eq!(racine.vues_enregistrees[0].id, vue.id);
        assert_eq!(racine.vues_enregistrees[0].nom, "Ma vue");
        assert!(!vue.id.is_empty());
        Ok(())
    }

    #[test]
    fn definir_vue_avec_id_existant_remplace_la_vue() -> Result<(), ErreurVues> {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-28T08:00:00Z");
        let creee = definir_vue(
            &mut racine,
            None,
            "Ma vue".to_string(),
            "listeTravail".to_string(),
            1,
            false,
            json!({ "groupeId": "g1" }),
        )?;

        definir_vue(
            &mut racine,
            Some(creee.id.clone()),
            "Ma vue renommée".to_string(),
            "listeTravail".to_string(),
            1,
            false,
            json!({ "groupeId": "g2" }),
        )?;

        assert_eq!(racine.vues_enregistrees.len(), 1);
        assert_eq!(racine.vues_enregistrees[0].nom, "Ma vue renommée");
        assert_eq!(
            racine.vues_enregistrees[0].filtres,
            json!({ "groupeId": "g2" })
        );
        Ok(())
    }

    #[test]
    fn definir_vue_avec_id_inexistant_est_rejetee() {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-28T08:00:00Z");

        let resultat = definir_vue(
            &mut racine,
            Some("id-inconnu".to_string()),
            "Ma vue".to_string(),
            "listeTravail".to_string(),
            1,
            false,
            json!({}),
        );

        assert_eq!(resultat, Err(ErreurVues::VueIntrouvable));
        assert!(racine.vues_enregistrees.is_empty());
    }

    #[test]
    fn definir_vue_par_defaut_desactive_les_autres_vues_par_defaut_du_meme_ecran()
    -> Result<(), ErreurVues> {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-28T08:00:00Z");
        definir_vue(
            &mut racine,
            None,
            "Première vue".to_string(),
            "listeTravail".to_string(),
            1,
            true,
            json!({}),
        )?;

        definir_vue(
            &mut racine,
            None,
            "Seconde vue".to_string(),
            "listeTravail".to_string(),
            1,
            true,
            json!({}),
        )?;

        // La première vue créée reste au premier rang du vecteur (`definir_vue` ne fait jamais que pousser une
        // vue nouvellement créée) : son statut par défaut doit avoir été désactivé par la seconde création.
        assert!(!racine.vues_enregistrees[0].par_defaut);
        assert!(racine.vues_enregistrees[1].par_defaut);
        assert_eq!(
            racine
                .vues_enregistrees
                .iter()
                .filter(|vue| vue.par_defaut)
                .count(),
            1
        );
        Ok(())
    }

    #[test]
    fn definir_vue_par_defaut_ne_touche_pas_les_vues_par_defaut_dun_autre_ecran()
    -> Result<(), ErreurVues> {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-28T08:00:00Z");
        definir_vue(
            &mut racine,
            None,
            "Vue synthèse".to_string(),
            "syntheseAudits".to_string(),
            1,
            true,
            json!({}),
        )?;

        definir_vue(
            &mut racine,
            None,
            "Vue liste de travail".to_string(),
            "listeTravail".to_string(),
            1,
            true,
            json!({}),
        )?;

        // La vue du premier écran (rang 0) ne doit pas être affectée par la création d'une vue par défaut sur un
        // écran différent (rang 1).
        assert!(racine.vues_enregistrees[0].par_defaut);
        assert!(racine.vues_enregistrees[1].par_defaut);
        Ok(())
    }

    #[test]
    fn supprimer_vue_retire_la_vue_designee() -> Result<(), ErreurVues> {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-28T08:00:00Z");
        let vue = definir_vue(
            &mut racine,
            None,
            "Ma vue".to_string(),
            "listeTravail".to_string(),
            1,
            false,
            json!({}),
        )?;

        supprimer_vue(&mut racine, &vue.id)?;

        assert!(racine.vues_enregistrees.is_empty());
        Ok(())
    }

    #[test]
    fn supprimer_vue_id_inexistant_est_rejetee() {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-28T08:00:00Z");

        let resultat = supprimer_vue(&mut racine, "id-inconnu");

        assert_eq!(resultat, Err(ErreurVues::VueIntrouvable));
    }
}
