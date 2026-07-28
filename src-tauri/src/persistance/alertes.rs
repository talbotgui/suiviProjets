// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Mutations liées aux alertes et aux annotations, portées par l'écran Liste de travail et les graphiques
//! d'évolution (Phase 8, US-019, US-020 ; RG-026). Voir le commentaire d'en-tête de `commandes::alertes` pour le
//! détail des décisions de conception (absence de séquence fonctionnelle détaillée dans
//! `docs/02_documentation/13_conceptionDetaillee.md` pour ces deux commandes).
//!
//! Comme le reste du Moteur de persistance, ce module ne touche jamais le disque ni l'état de session : il opère
//! uniquement sur une [`DonneesRacine`] déjà chargée en mémoire ; la sauvegarde effective reste de la responsabilité
//! des commandes de la Façade qui l'invoquent (`commandes::alertes`).

use crate::modele::racine::{
    Annotation, DonneesRacine, EntreeJournal, StatutTraitementAlerte, TraitementAlerte,
};
use thiserror::Error;

/// Origine consignée au journal des modifications (RG-023) pour la création d'une annotation.
const ORIGINE_ANNOTATION: &str = "Annotation";

/// Anomalie de validation métier levée avant toute tentative de sauvegarde, lorsque les identifiants fournis ne
/// désignent rien dans les données courantes.
#[derive(Debug, Error, PartialEq, Eq)]
pub(crate) enum ErreurAlertes {
    /// Le groupe désigné n'existe pas dans les données courantes.
    #[error("le groupe désigné est introuvable")]
    GroupeIntrouvable,
    /// Le projet désigné n'existe pas dans les données courantes.
    #[error("le projet désigné est introuvable")]
    ProjetIntrouvable,
}

/// Crée une annotation de portée groupe ou projet (US-019), puis consigne la création au journal (RG-023).
///
/// `projet_id` distingue la portée : présent, l'annotation est ajoutée aux annotations du projet désigné (qui doit
/// appartenir au groupe désigné) ; absent, elle est ajoutée aux annotations du groupe lui-même. Décision arbitraire
/// documentée dans le compte-rendu de développement de cette phase : une `Annotation`, à la différence d'un
/// `TraitementAlerte` (donnée de travail personnelle jamais exportée, cf.
/// `docs/02_documentation/12_modeleDonnees.md#gouvernance-et-propriété-des-données`), est une donnée métier exportée
/// au même titre qu'une règle de membre connu (`MembreConnu`) ; sa création est donc consignée au journal sur le
/// même modèle que `qualifier_membre`, bien que RG-023 ne liste pas explicitement les annotations parmi les
/// modifications consignées.
///
/// # Erreurs
///
/// [`ErreurAlertes::GroupeIntrouvable`] si `groupe_id` ne désigne aucun groupe ; [`ErreurAlertes::ProjetIntrouvable`]
/// si `projet_id` est fourni mais ne désigne aucun projet de ce groupe.
#[allow(
    clippy::too_many_arguments,
    reason = "une Annotation complète (4 champs métier) plus les identifiants de portée (groupe, projet optionnel) et l'horodatage de journalisation ; regrouper ces paramètres dans une structure dédiée n'apporterait pas de clarté supplémentaire pour un seul point d'appel, sur le modèle déjà retenu par `persistance::administration::qualifier_membre`"
)]
pub(crate) fn creer_annotation(
    donnees: &mut DonneesRacine,
    groupe_id: &str,
    projet_id: Option<&str>,
    date: String,
    libelle: String,
    categorie: String,
    description: Option<String>,
    horodatage: String,
) -> Result<Annotation, ErreurAlertes> {
    let groupe = donnees
        .groupes
        .iter_mut()
        .find(|groupe| groupe.id == groupe_id)
        .ok_or(ErreurAlertes::GroupeIntrouvable)?;

    let annotation = Annotation {
        id: uuid::Uuid::new_v4().to_string(),
        date,
        libelle,
        categorie,
        description,
        systeme: None,
    };

    let objet = match projet_id {
        Some(projet_id) => {
            let projet = groupe
                .projets
                .iter_mut()
                .find(|projet| projet.id == projet_id)
                .ok_or(ErreurAlertes::ProjetIntrouvable)?;
            projet.annotations.push(annotation.clone());
            format!(
                "groupes/{groupe_id}/projets/{projet_id}/annotations/{}",
                annotation.id
            )
        }
        None => {
            groupe.annotations.push(annotation.clone());
            format!("groupes/{groupe_id}/annotations/{}", annotation.id)
        }
    };

    donnees.journal.push(EntreeJournal {
        id: uuid::Uuid::new_v4().to_string(),
        horodatage,
        objet,
        avant: serde_json::Value::Null,
        apres: serde_json::to_value(&annotation).unwrap_or(serde_json::Value::Null),
        origine: ORIGINE_ANNOTATION.to_string(),
        detail_origine: None,
    });

    Ok(annotation)
}

/// Qualifie une alerte (US-020) : ajoute une nouvelle entrée de traitement (statut vu/traité, commentaire optionnel)
/// à l'historique `traitementsAlertes` (RG-026).
///
/// Ajoute toujours une nouvelle entrée plutôt que de mettre à jour une entrée existante en place :
/// `traitementsAlertes` est un historique append-only, cf. la recherche de l'entrée la plus RÉCENTE déjà effectuée
/// côté UI (`AlertesAccueilUtils.trouverTraitementAnterieur`,
/// `services/sansetat/jugement/alertes-accueil.utils.ts`), qui présuppose que plusieurs entrées peuvent exister pour
/// une même clé d'alerte au fil du temps (RG-026 : « une alerte traitée dont la cause persiste au constat suivant
/// réapparaît avec la mention de son traitement antérieur »). Aucune entrée de journal (RG-023) n'est consignée ici,
/// à la différence de [`creer_annotation`] : `TraitementAlerte` est une donnée de travail personnelle jamais
/// exportée (cf. `docs/02_documentation/12_modeleDonnees.md#gouvernance-et-propriété-des-données`) — décision
/// arbitraire documentée dans le compte-rendu de développement de cette phase.
///
/// `cle_alerte` n'est validée contre aucune liste de causes actives connues : RG-026 la définit uniquement comme
/// « une clé stable, indépendante des audits », librement fournie par l'écran appelant.
pub(crate) fn qualifier_alerte(
    donnees: &mut DonneesRacine,
    cle_alerte: String,
    statut: StatutTraitementAlerte,
    commentaire: Option<String>,
    horodatage: String,
) -> TraitementAlerte {
    let entree = TraitementAlerte {
        id: uuid::Uuid::new_v4().to_string(),
        cle_alerte,
        statut,
        commentaire,
        horodatage,
    };
    donnees.traitements_alertes.push(entree.clone());
    entree
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::modele::racine::{Groupe, Projet};

    fn groupe_vide(id: &str) -> Groupe {
        Groupe {
            id: id.to_string(),
            nom: "Groupe de test".to_string(),
            description: String::new(),
            instances: vec![],
            membres_connus: vec![],
            annotations: vec![],
            indicateurs_desactives: vec![],
            projets: vec![],
        }
    }

    fn projet_vide(id: &str) -> Projet {
        Projet {
            id: id.to_string(),
            nom: "Projet de test".to_string(),
            description: String::new(),
            ia_autorisee: false,
            ia_autorisee_depuis: None,
            premier_commit_interne: None,
            sources: vec![],
            annotations: vec![],
            audits: vec![],
        }
    }

    fn racine_avec_groupe(groupe: Groupe) -> DonneesRacine {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-27T08:00:00Z");
        racine.groupes.push(groupe);
        racine
    }

    #[test]
    fn creer_annotation_portee_groupe_ajoute_lannotation_et_le_journal() -> Result<(), ErreurAlertes>
    {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let annotation = creer_annotation(
            &mut racine,
            "g1",
            None,
            "2026-07-27".to_string(),
            "Rupture de charge".to_string(),
            "incident".to_string(),
            Some("Détail de la rupture".to_string()),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        assert_eq!(racine.groupes[0].annotations.len(), 1);
        assert_eq!(racine.groupes[0].annotations[0].id, annotation.id);
        assert_eq!(racine.groupes[0].projets[0..].len(), 0);
        assert_eq!(racine.journal.len(), 1);
        assert_eq!(
            racine.journal[0].objet,
            format!("groupes/g1/annotations/{}", annotation.id)
        );
        assert_eq!(racine.journal[0].avant, serde_json::Value::Null);
        assert_ne!(racine.journal[0].apres, serde_json::Value::Null);
        assert_eq!(racine.journal[0].origine, ORIGINE_ANNOTATION);
        Ok(())
    }

    #[test]
    fn creer_annotation_portee_projet_ajoute_lannotation_au_projet() -> Result<(), ErreurAlertes> {
        let mut groupe = groupe_vide("g1");
        groupe.projets.push(projet_vide("p1"));
        let mut racine = racine_avec_groupe(groupe);

        let annotation = creer_annotation(
            &mut racine,
            "g1",
            Some("p1"),
            "2026-07-27".to_string(),
            "Migration majeure".to_string(),
            "technique".to_string(),
            None,
            "2026-07-27T09:05:00Z".to_string(),
        )?;

        assert!(racine.groupes[0].annotations.is_empty());
        assert_eq!(racine.groupes[0].projets[0].annotations.len(), 1);
        assert_eq!(
            racine.groupes[0].projets[0].annotations[0].id,
            annotation.id
        );
        assert_eq!(
            racine.journal[0].objet,
            format!("groupes/g1/projets/p1/annotations/{}", annotation.id)
        );
        Ok(())
    }

    #[test]
    fn creer_annotation_retourne_groupe_introuvable() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let resultat = creer_annotation(
            &mut racine,
            "groupe-inconnu",
            None,
            "2026-07-27".to_string(),
            "Libellé".to_string(),
            "categorie".to_string(),
            None,
            "2026-07-27T09:10:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurAlertes::GroupeIntrouvable));
        assert!(racine.journal.is_empty());
    }

    #[test]
    fn creer_annotation_retourne_projet_introuvable() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let resultat = creer_annotation(
            &mut racine,
            "g1",
            Some("projet-inconnu"),
            "2026-07-27".to_string(),
            "Libellé".to_string(),
            "categorie".to_string(),
            None,
            "2026-07-27T09:15:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurAlertes::ProjetIntrouvable));
        assert!(racine.journal.is_empty());
        assert!(racine.groupes[0].annotations.is_empty());
    }

    #[test]
    fn qualifier_alerte_ajoute_une_entree_sans_journal() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let entree = qualifier_alerte(
            &mut racine,
            "membreInconnu|p1|alice".to_string(),
            StatutTraitementAlerte::Vue,
            None,
            "2026-07-27T09:20:00Z".to_string(),
        );

        assert_eq!(racine.traitements_alertes.len(), 1);
        assert_eq!(racine.traitements_alertes[0].id, entree.id);
        assert_eq!(entree.cle_alerte, "membreInconnu|p1|alice");
        assert_eq!(entree.statut, StatutTraitementAlerte::Vue);
        assert!(racine.journal.is_empty());
    }

    #[test]
    fn qualifier_alerte_ajoute_une_nouvelle_entree_plutot_que_de_muter_lexistante() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        qualifier_alerte(
            &mut racine,
            "membreInconnu|p1|alice".to_string(),
            StatutTraitementAlerte::Vue,
            None,
            "2026-07-27T09:20:00Z".to_string(),
        );
        qualifier_alerte(
            &mut racine,
            "membreInconnu|p1|alice".to_string(),
            StatutTraitementAlerte::Traitee,
            Some("Qualifié comme partenaire".to_string()),
            "2026-07-27T09:25:00Z".to_string(),
        );

        assert_eq!(racine.traitements_alertes.len(), 2);
        assert_eq!(
            racine.traitements_alertes[0].statut,
            StatutTraitementAlerte::Vue
        );
        assert_eq!(
            racine.traitements_alertes[1].statut,
            StatutTraitementAlerte::Traitee
        );
        assert_eq!(
            racine.traitements_alertes[1].commentaire,
            Some("Qualifié comme partenaire".to_string())
        );
    }
}
