// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Mutations de données de jugement portées par l'écran Administration de la Phase 4 (US-022, US-023, US-024) :
//! qualification d'un membre connu d'un groupe (RG-006 à RG-008, RG-012) et définition de la politique
//! d'autorisation de l'IA d'un projet (RG-014 à RG-016). Consigne systématiquement la modification au journal
//! append-only (RG-023).
//!
//! Ce module ne touche jamais le disque ni l'état de session : il opère uniquement sur une [`DonneesRacine`] déjà
//! chargée en mémoire, à l'identique du reste du Moteur de persistance. La sauvegarde effective et la mise à jour
//! de l'état de session restent de la responsabilité des commandes de la Façade qui l'invoquent
//! (`commandes::administration`), conformément à la séquence « Qualifier un membre inconnu depuis une alerte » de
//! `docs/02_documentation/13_conceptionDetaillee.md#séquences-des-scénarios-fonctionnels-principaux` (« la Façade
//! de commandes délègue au Moteur de persistance : ajoute ou met à jour l'entrée MembreConnu du Groupe, ajoute une
//! EntréeJournal, puis sauvegarde le fichier »).

use crate::modele::racine::{
    Annotation, DonneesRacine, EntreeJournal, MembreConnu, StatutMembre, TypeCritere,
};
use thiserror::Error;

/// Anomalie de validation métier levée avant toute tentative de sauvegarde, lorsque les identifiants fournis ne
/// désignent rien dans les données courantes ou que la règle soumise viole une contrainte du modèle (RG-008).
#[derive(Debug, Error, PartialEq, Eq)]
pub(crate) enum ErreurAdministration {
    /// Le groupe désigné n'existe pas dans les données courantes.
    #[error("le groupe désigné est introuvable")]
    GroupeIntrouvable,
    /// Le projet désigné n'existe pas dans les données courantes.
    #[error("le projet désigné est introuvable")]
    ProjetIntrouvable,
    /// La règle de membre connu désignée par son identifiant n'existe pas dans le groupe.
    #[error("la règle de membre connu désignée est introuvable")]
    MembreIntrouvable,
    /// La règle soumise porte un `typeCritere` `username` déjà utilisé par une autre règle du groupe (RG-008 :
    /// « la saisie d'un doublon de username est bloquée à l'administration »).
    #[error("cette règle porte un doublon de username déjà utilisé par une autre règle du groupe")]
    DoublonUsernameMembreConnu,
}

/// Qualifie un membre connu d'un groupe (US-022, US-023) : ajoute une nouvelle règle ou met à jour une règle
/// existante, puis consigne la modification au journal (RG-023).
///
/// Si `membre_id` est fourni, la règle portant cet identifiant est mise à jour (anomalie si elle n'existe pas dans
/// le groupe désigné) : c'est le cas d'usage de l'écran d'Administration (US-023), qui connaît l'identifiant précis
/// de la règle éditée. Si `membre_id` est absent, la règle est retrouvée par correspondance exacte de
/// `type_critere`/`critere` au sein du groupe (mise à jour si trouvée, création sinon) : cela reproduit exactement
/// la sémantique « ajoute ou met à jour » attendue de la qualification depuis une alerte (US-022, Phase 8), qui ne
/// connaît que le critère observé, jamais un identifiant préexistant.
///
/// # Erreurs
///
/// [`ErreurAdministration::GroupeIntrouvable`] si `groupe_id` ne désigne aucun groupe ;
/// [`ErreurAdministration::MembreIntrouvable`] si `membre_id` est fourni mais ne désigne aucune règle du groupe ;
/// [`ErreurAdministration::DoublonUsernameMembreConnu`] si la règle soumise porte un `typeCritere` `username` déjà
/// utilisé par une autre règle du groupe (RG-008).
///
/// # Retour
///
/// Les identifiants des règles de membres connus du groupe désormais en conflit (RG-008 : même `typeCritere` et
/// même `critere`, statuts contradictoires). Cette détection est purement informative et ne bloque jamais la
/// saisie (seul le doublon de username l'est) : décision arbitraire documentée dans le compte-rendu de
/// développement de cette phase, RG-008 ne décrivant explicitement le blocage que pour le doublon de username.
#[allow(
    clippy::too_many_arguments,
    reason = "un `MembreConnu` complet (5 champs métier) plus les métadonnées de journalisation (origine, horodatage) et les identifiants de résolution (groupe, membre) ; regrouper ces paramètres dans une structure dédiée n'apporterait pas de clarté supplémentaire pour un seul point d'appel"
)]
pub(crate) fn qualifier_membre(
    donnees: &mut DonneesRacine,
    groupe_id: &str,
    membre_id: Option<String>,
    critere: String,
    type_critere: TypeCritere,
    statut: StatutMembre,
    libelle: Option<String>,
    alias_email: Option<String>,
    origine: String,
    horodatage: String,
) -> Result<Vec<String>, ErreurAdministration> {
    let groupe = donnees
        .groupes
        .iter_mut()
        .find(|groupe| groupe.id == groupe_id)
        .ok_or(ErreurAdministration::GroupeIntrouvable)?;

    let cible_id = match membre_id {
        Some(id) => {
            if !groupe.membres_connus.iter().any(|membre| membre.id == id) {
                return Err(ErreurAdministration::MembreIntrouvable);
            }
            id
        }
        None => groupe
            .membres_connus
            .iter()
            .find(|membre| membre.type_critere == type_critere && membre.critere == critere)
            .map(|membre| membre.id.clone())
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
    };

    if type_critere == TypeCritere::Username
        && groupe.membres_connus.iter().any(|membre| {
            membre.id != cible_id
                && membre.type_critere == TypeCritere::Username
                && membre.critere == critere
        })
    {
        return Err(ErreurAdministration::DoublonUsernameMembreConnu);
    }

    let avant = groupe
        .membres_connus
        .iter()
        .find(|membre| membre.id == cible_id)
        .map(|membre| serde_json::to_value(membre).unwrap_or(serde_json::Value::Null))
        .unwrap_or(serde_json::Value::Null);

    let membre_qualifie = MembreConnu {
        id: cible_id.clone(),
        critere,
        type_critere,
        statut,
        libelle,
        alias_email,
    };
    let apres = serde_json::to_value(&membre_qualifie).unwrap_or(serde_json::Value::Null);

    match groupe
        .membres_connus
        .iter_mut()
        .find(|membre| membre.id == cible_id)
    {
        Some(existant) => *existant = membre_qualifie,
        None => groupe.membres_connus.push(membre_qualifie),
    }

    let membres_en_conflit = identifiants_en_conflit(&groupe.membres_connus);

    donnees.journal.push(EntreeJournal {
        id: uuid::Uuid::new_v4().to_string(),
        horodatage,
        objet: format!("groupes/{groupe_id}/membresConnus/{cible_id}"),
        avant,
        apres,
        origine,
        detail_origine: None,
    });

    Ok(membres_en_conflit)
}

/// Détecte les règles de membres connus en conflit au sein d'un même groupe (RG-008) : deux règles distinctes
/// portant le même `typeCritere` et le même `critere` mais un `statut` différent. Fonction pure, opérant
/// uniquement sur la liste de règles fournie, sans aucune donnée d'audit (hors périmètre de cette phase, cf.
/// Moteur de jugement, Phase 6).
fn identifiants_en_conflit(membres: &[MembreConnu]) -> Vec<String> {
    let mut en_conflit = Vec::new();
    for (index, membre) in membres.iter().enumerate() {
        let conflit = membres.iter().enumerate().any(|(autre_index, autre)| {
            autre_index != index
                && autre.type_critere == membre.type_critere
                && autre.critere == membre.critere
                && autre.statut != membre.statut
        });
        if conflit {
            en_conflit.push(membre.id.clone());
        }
    }
    en_conflit
}

/// Supprime une règle de membre connu d'un groupe (US-023), puis consigne la suppression au journal (RG-023).
///
/// Nom de commande non fourni littéralement par `docs/02_documentation/13_conceptionDetaillee.md` (seule
/// `qualifierMembre` y est nommée, pour l'ajout et la mise à jour) : décision arbitraire documentée dans le
/// compte-rendu de développement de cette phase, retenue par symétrie avec `qualifierMembre` (même structure,
/// même délégation au Moteur de persistance suivie d'une sauvegarde effective), sur le modèle de la décision
/// similaire déjà prise pour `deverrouillerSession` en Phase 1.
///
/// # Erreurs
///
/// [`ErreurAdministration::GroupeIntrouvable`] si `groupe_id` ne désigne aucun groupe ;
/// [`ErreurAdministration::MembreIntrouvable`] si `membre_id` ne désigne aucune règle du groupe.
pub(crate) fn supprimer_membre_connu(
    donnees: &mut DonneesRacine,
    groupe_id: &str,
    membre_id: &str,
    origine: String,
    horodatage: String,
) -> Result<(), ErreurAdministration> {
    let groupe = donnees
        .groupes
        .iter_mut()
        .find(|groupe| groupe.id == groupe_id)
        .ok_or(ErreurAdministration::GroupeIntrouvable)?;

    let position = groupe
        .membres_connus
        .iter()
        .position(|membre| membre.id == membre_id)
        .ok_or(ErreurAdministration::MembreIntrouvable)?;
    let membre_supprime = groupe.membres_connus.remove(position);

    donnees.journal.push(EntreeJournal {
        id: uuid::Uuid::new_v4().to_string(),
        horodatage,
        objet: format!("groupes/{groupe_id}/membresConnus/{membre_id}"),
        avant: serde_json::to_value(&membre_supprime).unwrap_or(serde_json::Value::Null),
        apres: serde_json::Value::Null,
        origine,
        detail_origine: None,
    });

    Ok(())
}

/// Libellé de l'annotation système créée sur l'autorisation de l'IA d'un projet (RG-015).
const LIBELLE_ANNOTATION_IA_AUTORISEE: &str = "Usage de l'IA autorisé";

/// Catégorie de l'annotation système créée sur l'autorisation de l'IA d'un projet (RG-015).
const CATEGORIE_ANNOTATION_POLITIQUE_IA: &str = "politiqueIA";

/// Définit la politique d'autorisation de l'IA d'un projet (US-024, RG-014 à RG-016), puis consigne la
/// modification au journal (RG-023).
///
/// Un appel redondant (valeur soumise identique à la valeur courante) ne modifie ni le journal ni les annotations
/// et retourne `false` : décision arbitraire documentée dans le compte-rendu de développement de cette phase, afin
/// de ne jamais dupliquer l'horodatage ni l'annotation système sur un passage « autorisé » déjà en vigueur (RG-015
/// ne décrit cette création qu'au moment de la transition). Le passage à interdit ne réinitialise jamais
/// `iaAutoriseeDepuis` (conservé comme trace de la dernière autorisation effective) et ne crée aucune nouvelle
/// annotation système, RG-015 ne décrivant cette création que pour le passage à autorisé ; seule une entrée de
/// journal est ajoutée dans ce sens (RG-023).
///
/// # Erreurs
///
/// [`ErreurAdministration::GroupeIntrouvable`]/[`ErreurAdministration::ProjetIntrouvable`] si `groupe_id`/
/// `projet_id` ne désignent rien dans les données courantes.
///
/// # Retour
///
/// `true` si la politique a réellement changé (une entrée de journal a été ajoutée, et une annotation système en
/// cas de passage à autorisé) ; `false` si l'appel était redondant et n'a rien modifié.
pub(crate) fn definir_politique_ia(
    donnees: &mut DonneesRacine,
    groupe_id: &str,
    projet_id: &str,
    ia_autorisee: bool,
    horodatage: String,
) -> Result<bool, ErreurAdministration> {
    let groupe = donnees
        .groupes
        .iter_mut()
        .find(|groupe| groupe.id == groupe_id)
        .ok_or(ErreurAdministration::GroupeIntrouvable)?;
    let projet = groupe
        .projets
        .iter_mut()
        .find(|projet| projet.id == projet_id)
        .ok_or(ErreurAdministration::ProjetIntrouvable)?;

    if projet.ia_autorisee == ia_autorisee {
        return Ok(false);
    }

    let avant = projet.ia_autorisee;
    projet.ia_autorisee = ia_autorisee;

    if ia_autorisee {
        projet.ia_autorisee_depuis = Some(horodatage.clone());
        projet.annotations.push(Annotation {
            id: uuid::Uuid::new_v4().to_string(),
            date: horodatage.clone(),
            libelle: LIBELLE_ANNOTATION_IA_AUTORISEE.to_string(),
            categorie: CATEGORIE_ANNOTATION_POLITIQUE_IA.to_string(),
            description: None,
            systeme: Some(true),
        });
    }

    donnees.journal.push(EntreeJournal {
        id: uuid::Uuid::new_v4().to_string(),
        horodatage,
        objet: format!("groupes/{groupe_id}/projets/{projet_id}/iaAutorisee"),
        avant: serde_json::Value::Bool(avant),
        apres: serde_json::Value::Bool(ia_autorisee),
        origine: "Administration".to_string(),
        detail_origine: None,
    });

    Ok(true)
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
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-21T08:00:00Z");
        racine.groupes.push(groupe);
        racine
    }

    fn membre(
        id: &str,
        critere: &str,
        type_critere: TypeCritere,
        statut: StatutMembre,
    ) -> MembreConnu {
        MembreConnu {
            id: id.to_string(),
            critere: critere.to_string(),
            type_critere,
            statut,
            libelle: None,
            alias_email: None,
        }
    }

    #[test]
    fn identifiants_en_conflit_detecte_deux_regles_contradictoires() {
        let membres = vec![
            membre(
                "1",
                "*@x.fr",
                TypeCritere::DomaineEmail,
                StatutMembre::Interne,
            ),
            membre(
                "2",
                "*@x.fr",
                TypeCritere::DomaineEmail,
                StatutMembre::Client,
            ),
            membre("3", "alice", TypeCritere::Username, StatutMembre::Interne),
        ];

        let conflits = identifiants_en_conflit(&membres);

        assert_eq!(conflits.len(), 2);
        assert!(conflits.contains(&"1".to_string()));
        assert!(conflits.contains(&"2".to_string()));
        assert!(!conflits.contains(&"3".to_string()));
    }

    #[test]
    fn identifiants_en_conflit_ignore_les_regles_identiques_ou_isolees() {
        let membres = vec![
            membre(
                "1",
                "*@x.fr",
                TypeCritere::DomaineEmail,
                StatutMembre::Interne,
            ),
            membre(
                "2",
                "*@x.fr",
                TypeCritere::DomaineEmail,
                StatutMembre::Interne,
            ),
            membre(
                "3",
                "*@y.fr",
                TypeCritere::DomaineEmail,
                StatutMembre::Client,
            ),
        ];

        assert!(identifiants_en_conflit(&membres).is_empty());
    }

    #[test]
    fn qualifier_membre_ajoute_une_nouvelle_regle() -> Result<(), ErreurAdministration> {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let conflits = qualifier_membre(
            &mut racine,
            "g1",
            None,
            "*@entreprise.fr".to_string(),
            TypeCritere::DomaineEmail,
            StatutMembre::Interne,
            Some("Domaine interne".to_string()),
            None,
            "Administration".to_string(),
            "2026-07-21T09:00:00Z".to_string(),
        )?;

        let groupe = &racine.groupes[0];
        assert_eq!(groupe.membres_connus.len(), 1);
        assert_eq!(groupe.membres_connus[0].critere, "*@entreprise.fr");
        assert_eq!(groupe.membres_connus[0].statut, StatutMembre::Interne);
        assert!(conflits.is_empty());

        assert_eq!(racine.journal.len(), 1);
        let entree = &racine.journal[0];
        assert_eq!(entree.origine, "Administration");
        assert_eq!(
            entree.objet,
            format!("groupes/g1/membresConnus/{}", groupe.membres_connus[0].id)
        );
        assert_eq!(entree.avant, serde_json::Value::Null);
        assert_ne!(entree.apres, serde_json::Value::Null);
        Ok(())
    }

    #[test]
    fn qualifier_membre_met_a_jour_une_regle_existante() -> Result<(), ErreurAdministration> {
        let mut groupe = groupe_vide("g1");
        groupe.membres_connus.push(membre(
            "m1",
            "alice",
            TypeCritere::Username,
            StatutMembre::Interne,
        ));
        let mut racine = racine_avec_groupe(groupe);

        qualifier_membre(
            &mut racine,
            "g1",
            Some("m1".to_string()),
            "alice".to_string(),
            TypeCritere::Username,
            StatutMembre::Partenaire,
            None,
            None,
            "Administration".to_string(),
            "2026-07-21T09:05:00Z".to_string(),
        )?;

        let groupe = &racine.groupes[0];
        assert_eq!(
            groupe.membres_connus.len(),
            1,
            "aucune règle ne doit être dupliquée"
        );
        assert_eq!(groupe.membres_connus[0].id, "m1");
        assert_eq!(groupe.membres_connus[0].statut, StatutMembre::Partenaire);

        assert_eq!(racine.journal.len(), 1);
        assert_ne!(racine.journal[0].avant, serde_json::Value::Null);
        Ok(())
    }

    #[test]
    fn qualifier_membre_bloque_le_doublon_de_username() {
        let mut groupe = groupe_vide("g1");
        groupe.membres_connus.push(membre(
            "m1",
            "alice",
            TypeCritere::Username,
            StatutMembre::Interne,
        ));
        groupe.membres_connus.push(membre(
            "m2",
            "bob",
            TypeCritere::Username,
            StatutMembre::Interne,
        ));
        let mut racine = racine_avec_groupe(groupe);

        let resultat = qualifier_membre(
            &mut racine,
            "g1",
            Some("m2".to_string()),
            "alice".to_string(),
            TypeCritere::Username,
            StatutMembre::Client,
            None,
            None,
            "Administration".to_string(),
            "2026-07-21T09:10:00Z".to_string(),
        );

        assert_eq!(
            resultat,
            Err(ErreurAdministration::DoublonUsernameMembreConnu)
        );
        assert_eq!(
            racine.groupes[0].membres_connus[1].statut,
            StatutMembre::Interne,
            "la règle existante ne doit pas avoir été modifiée par la tentative rejetée"
        );
        assert!(racine.journal.is_empty());
    }

    #[test]
    fn qualifier_membre_detecte_le_conflit_de_regles_apres_edition()
    -> Result<(), ErreurAdministration> {
        let mut groupe = groupe_vide("g1");
        groupe.membres_connus.push(membre(
            "m1",
            "bob@x.fr",
            TypeCritere::Email,
            StatutMembre::Interne,
        ));
        groupe.membres_connus.push(membre(
            "m2",
            "*@y.fr",
            TypeCritere::DomaineEmail,
            StatutMembre::Client,
        ));
        let mut racine = racine_avec_groupe(groupe);

        let conflits = qualifier_membre(
            &mut racine,
            "g1",
            Some("m2".to_string()),
            "bob@x.fr".to_string(),
            TypeCritere::Email,
            StatutMembre::Client,
            None,
            None,
            "Administration".to_string(),
            "2026-07-21T09:15:00Z".to_string(),
        )?;

        assert_eq!(conflits.len(), 2);
        assert!(conflits.contains(&"m1".to_string()));
        assert!(conflits.contains(&"m2".to_string()));
        Ok(())
    }

    #[test]
    fn qualifier_membre_retourne_groupe_introuvable() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let resultat = qualifier_membre(
            &mut racine,
            "groupe-inconnu",
            None,
            "alice".to_string(),
            TypeCritere::Username,
            StatutMembre::Interne,
            None,
            None,
            "Administration".to_string(),
            "2026-07-21T09:20:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurAdministration::GroupeIntrouvable));
    }

    #[test]
    fn qualifier_membre_retourne_membre_introuvable() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let resultat = qualifier_membre(
            &mut racine,
            "g1",
            Some("membre-inconnu".to_string()),
            "alice".to_string(),
            TypeCritere::Username,
            StatutMembre::Interne,
            None,
            None,
            "Administration".to_string(),
            "2026-07-21T09:25:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurAdministration::MembreIntrouvable));
    }

    #[test]
    fn supprimer_membre_connu_retire_la_regle_et_consigne_le_journal()
    -> Result<(), ErreurAdministration> {
        let mut groupe = groupe_vide("g1");
        groupe.membres_connus.push(membre(
            "m1",
            "alice",
            TypeCritere::Username,
            StatutMembre::Interne,
        ));
        let mut racine = racine_avec_groupe(groupe);

        supprimer_membre_connu(
            &mut racine,
            "g1",
            "m1",
            "Administration".to_string(),
            "2026-07-21T09:30:00Z".to_string(),
        )?;

        assert!(racine.groupes[0].membres_connus.is_empty());
        assert_eq!(racine.journal.len(), 1);
        assert_eq!(racine.journal[0].objet, "groupes/g1/membresConnus/m1");
        assert_ne!(racine.journal[0].avant, serde_json::Value::Null);
        assert_eq!(racine.journal[0].apres, serde_json::Value::Null);
        Ok(())
    }

    #[test]
    fn supprimer_membre_connu_retourne_groupe_introuvable() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let resultat = supprimer_membre_connu(
            &mut racine,
            "groupe-inconnu",
            "m1",
            "Administration".to_string(),
            "2026-07-21T09:30:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurAdministration::GroupeIntrouvable));
    }

    #[test]
    fn supprimer_membre_connu_retourne_membre_introuvable() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let resultat = supprimer_membre_connu(
            &mut racine,
            "g1",
            "membre-inconnu",
            "Administration".to_string(),
            "2026-07-21T09:30:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurAdministration::MembreIntrouvable));
    }

    #[test]
    fn definir_politique_ia_autorise_et_cree_une_annotation_systeme()
    -> Result<(), ErreurAdministration> {
        let mut groupe = groupe_vide("g1");
        groupe.projets.push(projet_vide("p1"));
        let mut racine = racine_avec_groupe(groupe);

        let a_change = definir_politique_ia(
            &mut racine,
            "g1",
            "p1",
            true,
            "2026-07-21T10:00:00Z".to_string(),
        )?;

        assert!(a_change);
        let projet = &racine.groupes[0].projets[0];
        assert!(projet.ia_autorisee);
        assert_eq!(
            projet.ia_autorisee_depuis,
            Some("2026-07-21T10:00:00Z".to_string())
        );
        assert_eq!(projet.annotations.len(), 1);
        assert_eq!(projet.annotations[0].systeme, Some(true));
        assert_eq!(racine.journal.len(), 1);
        assert_eq!(racine.journal[0].avant, serde_json::Value::Bool(false));
        assert_eq!(racine.journal[0].apres, serde_json::Value::Bool(true));
        Ok(())
    }

    #[test]
    fn definir_politique_ia_ne_duplique_pas_lannotation_sur_appel_redondant()
    -> Result<(), ErreurAdministration> {
        let mut groupe = groupe_vide("g1");
        groupe.projets.push(projet_vide("p1"));
        let mut racine = racine_avec_groupe(groupe);

        definir_politique_ia(
            &mut racine,
            "g1",
            "p1",
            true,
            "2026-07-21T10:00:00Z".to_string(),
        )?;
        let a_change = definir_politique_ia(
            &mut racine,
            "g1",
            "p1",
            true,
            "2026-07-21T10:05:00Z".to_string(),
        )?;

        assert!(!a_change);
        assert_eq!(racine.groupes[0].projets[0].annotations.len(), 1);
        assert_eq!(racine.journal.len(), 1);
        assert_eq!(
            racine.groupes[0].projets[0].ia_autorisee_depuis,
            Some("2026-07-21T10:00:00Z".to_string()),
            "l'horodatage initial ne doit pas être remplacé par l'appel redondant"
        );
        Ok(())
    }

    #[test]
    fn definir_politique_ia_interdit_sans_nouvelle_annotation_ni_perte_de_lhorodatage()
    -> Result<(), ErreurAdministration> {
        let mut groupe = groupe_vide("g1");
        groupe.projets.push(projet_vide("p1"));
        let mut racine = racine_avec_groupe(groupe);

        definir_politique_ia(
            &mut racine,
            "g1",
            "p1",
            true,
            "2026-07-21T10:00:00Z".to_string(),
        )?;
        let a_change = definir_politique_ia(
            &mut racine,
            "g1",
            "p1",
            false,
            "2026-07-21T11:00:00Z".to_string(),
        )?;

        assert!(a_change);
        let projet = &racine.groupes[0].projets[0];
        assert!(!projet.ia_autorisee);
        assert_eq!(
            projet.ia_autorisee_depuis,
            Some("2026-07-21T10:00:00Z".to_string()),
            "la dernière date d'autorisation effective doit être conservée"
        );
        assert_eq!(
            projet.annotations.len(),
            1,
            "aucune nouvelle annotation sur un retour à interdit"
        );
        assert_eq!(racine.journal.len(), 2);
        assert_eq!(racine.journal[1].avant, serde_json::Value::Bool(true));
        assert_eq!(racine.journal[1].apres, serde_json::Value::Bool(false));
        Ok(())
    }

    #[test]
    fn definir_politique_ia_retourne_groupe_introuvable() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let resultat = definir_politique_ia(
            &mut racine,
            "groupe-inconnu",
            "p1",
            true,
            "2026-07-21T10:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurAdministration::GroupeIntrouvable));
    }

    #[test]
    fn definir_politique_ia_retourne_projet_introuvable() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let resultat = definir_politique_ia(
            &mut racine,
            "g1",
            "projet-inconnu",
            true,
            "2026-07-21T10:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurAdministration::ProjetIntrouvable));
    }
}
