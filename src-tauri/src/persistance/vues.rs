// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Mutations liées aux vues enregistrées (Phase 9, incrément 1, US-028 ; RG-027) : création, mise à jour et
//! suppression d'un modèle de filtres nommé, propre à un écran, avec au plus une vue par défaut par écran.
//!
//! Comme le reste du Moteur de persistance, ce module ne touche jamais le disque ni l'état de session : il opère
//! uniquement sur une [`DonneesRacine`] déjà chargée en mémoire ; la sauvegarde effective reste de la
//! responsabilité des commandes de la Façade qui l'invoquent (`commandes::vues`).
//!
//! Depuis le plan_16 (incrément 4, RG-054, extension de RG-023), toute mutation de vue — création, renommage,
//! duplication, suppression, ajout ou retrait du statut par défaut — consigne une entrée du journal des
//! modifications avant sauvegarde, au même titre que les autres mutations de référentiels. L'entrée ne porte que
//! le nom de la vue, l'écran concerné et le statut par défaut (`{@link resume_vue}`), jamais le contenu des
//! filtres (cf. `docs/02_documentation/05_reglesGestion.md`, RG-054). Ce revirement par rapport au choix initial
//! de la Phase 9 (vue = donnée de travail personnelle non consignée) est une décision d'arbitrage humain du
//! 2026-08-30, actée au plan_16 : l'administration centralisée des vues (onglet Paramétrage, US-054) justifie une
//! trace de ces mutations comme pour toute autre entité de paramétrage.
//!
//! Nom de commande non fourni littéralement par la documentation source (aucune séquence fonctionnelle détaillée
//! ni nom de commande pour les vues enregistrées dans
//! `docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`) : retenu
//! par symétrie avec `definirSeuil`/`definirReferentiel` (une seule commande d'ajout/mise à jour selon la présence
//! d'un identifiant, sur le modèle déjà établi par `qualifierMembre`) et avec `supprimerMembreConnu`/
//! `supprimerReferentiel` pour la suppression, décision à valider par un humain.

use crate::modele::racine::{DonneesRacine, EntreeJournal, VueEnregistree};
use serde_json::{Value, json};
use thiserror::Error;

/// Anomalie de validation métier levée avant toute tentative de sauvegarde.
#[derive(Debug, Error, PartialEq, Eq)]
pub(crate) enum ErreurVues {
    /// L'identifiant de vue désigné n'existe pas dans les données courantes.
    #[error("la vue enregistrée désignée est introuvable")]
    VueIntrouvable,
}

/// Résumé d'une vue consigné au journal des modifications (RG-054) : nom, écran et statut par défaut uniquement,
/// jamais le contenu des filtres.
fn resume_vue(vue: &VueEnregistree) -> Value {
    json!({ "nom": vue.nom, "ecran": vue.ecran, "parDefaut": vue.par_defaut })
}

/// Ajoute ou met à jour une vue enregistrée (US-028, RG-027).
///
/// `id` distingue les deux cas : absent, une nouvelle vue est créée avec un identifiant UUID v4 généré ; présent,
/// il doit désigner une vue déjà existante, intégralement remplacée par les champs fournis. Si `par_defaut` vaut
/// `true`, toute autre vue déjà marquée par défaut pour le même `ecran` est désélectionnée au préalable, afin de
/// garantir qu'au plus une vue par défaut existe par écran (RG-027 : « possibilité de la définir comme vue par
/// défaut de son écran »).
///
/// Une entrée de journal (RG-054) est consignée avant retour, portant le [`resume_vue`] avant et après mutation
/// (`avant` vaut `Value::Null` pour une création).
///
/// # Erreurs
///
/// [`ErreurVues::VueIntrouvable`] si `id` est fourni mais ne désigne aucune vue existante.
#[allow(
    clippy::too_many_arguments,
    reason = "une VueEnregistree complète (6 champs) plus l'identifiant optionnel de mise à jour et les métadonnées de journalisation (origine, horodatage) ; regrouper ces paramètres dans une structure dédiée n'apporterait pas de clarté supplémentaire pour un seul point d'appel, sur le modèle déjà retenu par `persistance::administration::qualifier_membre`"
)]
pub(crate) fn definir_vue(
    donnees: &mut DonneesRacine,
    id: Option<String>,
    nom: String,
    ecran: String,
    version_filtres: u32,
    par_defaut: bool,
    filtres: Value,
    origine: String,
    horodatage: String,
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

    let avant = donnees
        .vues_enregistrees
        .iter()
        .find(|vue| vue.id == id)
        .map_or(Value::Null, resume_vue);

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

    donnees.journal.push(EntreeJournal {
        id: uuid::Uuid::new_v4().to_string(),
        horodatage,
        objet: format!("vuesEnregistrees/{id}"),
        avant,
        apres: resume_vue(&vue),
        origine,
        detail_origine: None,
    });

    Ok(vue)
}

/// Supprime une vue enregistrée par identifiant (US-028).
///
/// Une entrée de journal (RG-054) est consignée avant retour, portant le [`resume_vue`] de la vue supprimée en
/// `avant` et `Value::Null` en `apres`.
///
/// # Erreurs
///
/// [`ErreurVues::VueIntrouvable`] si `id` ne désigne aucune vue existante.
pub(crate) fn supprimer_vue(
    donnees: &mut DonneesRacine,
    id: &str,
    origine: String,
    horodatage: String,
) -> Result<(), ErreurVues> {
    let position = donnees
        .vues_enregistrees
        .iter()
        .position(|vue| vue.id == id)
        .ok_or(ErreurVues::VueIntrouvable)?;
    let supprimee = donnees.vues_enregistrees.remove(position);

    donnees.journal.push(EntreeJournal {
        id: uuid::Uuid::new_v4().to_string(),
        horodatage,
        objet: format!("vuesEnregistrees/{id}"),
        avant: resume_vue(&supprimee),
        apres: Value::Null,
        origine,
        detail_origine: None,
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    const HORODATAGE: &str = "2026-08-30T08:00:00Z";
    const ORIGINE: &str = "Vues enregistrées";

    /// Raccourci de test : appelle [`definir_vue`] avec l'origine et l'horodatage de test constants.
    #[allow(
        clippy::too_many_arguments,
        reason = "raccourci de test, cf. la fonction testée"
    )]
    fn definir(
        racine: &mut DonneesRacine,
        id: Option<String>,
        nom: &str,
        ecran: &str,
        version_filtres: u32,
        par_defaut: bool,
        filtres: Value,
    ) -> Result<VueEnregistree, ErreurVues> {
        definir_vue(
            racine,
            id,
            nom.to_string(),
            ecran.to_string(),
            version_filtres,
            par_defaut,
            filtres,
            ORIGINE.to_string(),
            HORODATAGE.to_string(),
        )
    }

    #[test]
    fn definir_vue_sans_id_cree_une_nouvelle_vue() -> Result<(), ErreurVues> {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-28T08:00:00Z");

        let vue = definir(
            &mut racine,
            None,
            "Ma vue",
            "listeTravail",
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
        let creee = definir(
            &mut racine,
            None,
            "Ma vue",
            "listeTravail",
            1,
            false,
            json!({ "groupeId": "g1" }),
        )?;

        definir(
            &mut racine,
            Some(creee.id.clone()),
            "Ma vue renommée",
            "listeTravail",
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

        let resultat = definir(
            &mut racine,
            Some("id-inconnu".to_string()),
            "Ma vue",
            "listeTravail",
            1,
            false,
            json!({}),
        );

        assert_eq!(resultat, Err(ErreurVues::VueIntrouvable));
        assert!(racine.vues_enregistrees.is_empty());
        assert!(racine.journal.is_empty());
    }

    #[test]
    fn definir_vue_par_defaut_desactive_les_autres_vues_par_defaut_du_meme_ecran()
    -> Result<(), ErreurVues> {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-28T08:00:00Z");
        definir(
            &mut racine,
            None,
            "Première vue",
            "listeTravail",
            1,
            true,
            json!({}),
        )?;

        definir(
            &mut racine,
            None,
            "Seconde vue",
            "listeTravail",
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
        definir(
            &mut racine,
            None,
            "Vue synthèse",
            "syntheseAudits",
            1,
            true,
            json!({}),
        )?;

        definir(
            &mut racine,
            None,
            "Vue liste de travail",
            "listeTravail",
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
        let vue = definir(
            &mut racine,
            None,
            "Ma vue",
            "listeTravail",
            1,
            false,
            json!({}),
        )?;

        supprimer_vue(
            &mut racine,
            &vue.id,
            ORIGINE.to_string(),
            HORODATAGE.to_string(),
        )?;

        assert!(racine.vues_enregistrees.is_empty());
        Ok(())
    }

    #[test]
    fn supprimer_vue_id_inexistant_est_rejetee() {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-28T08:00:00Z");

        let resultat = supprimer_vue(
            &mut racine,
            "id-inconnu",
            ORIGINE.to_string(),
            HORODATAGE.to_string(),
        );

        assert_eq!(resultat, Err(ErreurVues::VueIntrouvable));
        assert!(racine.journal.is_empty());
    }

    #[test]
    fn definir_vue_consigne_une_entree_de_journal_a_la_creation_puis_au_renommage()
    -> Result<(), ErreurVues> {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-28T08:00:00Z");

        let creee = definir(
            &mut racine,
            None,
            "Ma vue",
            "obsolescence",
            1,
            false,
            json!({}),
        )?;
        assert_eq!(racine.journal.len(), 1);
        assert_eq!(
            racine.journal[0].objet,
            format!("vuesEnregistrees/{}", creee.id)
        );
        assert_eq!(racine.journal[0].avant, Value::Null);
        assert_eq!(
            racine.journal[0].apres,
            json!({ "nom": "Ma vue", "ecran": "obsolescence", "parDefaut": false })
        );
        assert_eq!(racine.journal[0].origine, ORIGINE);
        assert_eq!(racine.journal[0].horodatage, HORODATAGE);

        definir(
            &mut racine,
            Some(creee.id.clone()),
            "Ma vue renommée",
            "obsolescence",
            1,
            false,
            json!({}),
        )?;
        assert_eq!(racine.journal.len(), 2);
        assert_eq!(
            racine.journal[1].avant,
            json!({ "nom": "Ma vue", "ecran": "obsolescence", "parDefaut": false })
        );
        assert_eq!(
            racine.journal[1].apres,
            json!({ "nom": "Ma vue renommée", "ecran": "obsolescence", "parDefaut": false })
        );
        // Le contenu des filtres n'apparaît jamais dans l'entrée de journal (RG-054).
        assert!(!racine.journal[1].avant.to_string().contains("filtres"));
        Ok(())
    }

    #[test]
    fn supprimer_vue_consigne_une_entree_de_journal_vers_null() -> Result<(), ErreurVues> {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-28T08:00:00Z");
        let vue = definir(
            &mut racine,
            None,
            "À supprimer",
            "syntheseGraphique",
            1,
            true,
            json!({}),
        )?;

        supprimer_vue(
            &mut racine,
            &vue.id,
            ORIGINE.to_string(),
            HORODATAGE.to_string(),
        )?;

        assert_eq!(racine.journal.len(), 2);
        assert_eq!(
            racine.journal[1].objet,
            format!("vuesEnregistrees/{}", vue.id)
        );
        assert_eq!(
            racine.journal[1].avant,
            json!({ "nom": "À supprimer", "ecran": "syntheseGraphique", "parDefaut": true })
        );
        assert_eq!(racine.journal[1].apres, Value::Null);
        Ok(())
    }
}
