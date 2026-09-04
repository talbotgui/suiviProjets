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
    /// La règle soumise, de `typeCritere` `email`/`domaineEmail`, porte le même critère qu'une autre règle du
    /// groupe avec un statut différent (RG-008 : conflit de règles) — bloqué à la saisie depuis R10-07 par
    /// symétrie avec [`ErreurAdministration::DoublonUsernameMembreConnu`], ce conflit n'étant auparavant que
    /// signalé après coup (`identifiants_en_conflit`), jamais bloqué.
    #[error(
        "cette règle entre en conflit avec une autre règle du groupe portant le même critère et un statut différent"
    )]
    ConflitReglesMembreConnu,
    /// La date de départ (`partiLe`, RG-061) soumise est invalide : posée sur une règle de `typeCritere`
    /// `domaineEmail` (un domaine ne « part » pas), non analysable comme date `AAAA-MM-JJ`, ou postérieure au jour
    /// de la qualification. Revalidation côté cœur natif du contrôle déjà fait à la saisie côté interface.
    #[error("la date de départ (partiLe) soumise est invalide")]
    DateDepartInvalide,
}

/// Qualifie un membre connu d'un groupe (US-022, US-023) : ajoute une nouvelle règle ou met à jour une règle
/// existante, puis consigne la modification au journal (RG-023).
///
/// Si `membre_id` est fourni, la règle portant cet identifiant est mise à jour (anomalie si elle n'existe pas dans
/// le groupe désigné) : c'est le cas d'usage de l'écran d'Administration (US-023), qui connaît l'identifiant précis
/// de la règle éditée. Si `membre_id` est absent, la règle est retrouvée par correspondance exacte de
/// `type_critere`/`critere` au sein du groupe (mise à jour si trouvée, création sinon) : cela reproduit exactement
/// la sémantique « ajoute ou met à jour » attendue d'une éventuelle qualification depuis une alerte (US-020,
/// Phase 8, toujours hors périmètre à cette phase, cf. commentaire d'en-tête de `commandes::administration::
/// qualifier_membre`), qui ne connaîtrait que le critère observé, jamais un identifiant préexistant.
///
/// # Erreurs
///
/// [`ErreurAdministration::GroupeIntrouvable`] si `groupe_id` ne désigne aucun groupe ;
/// [`ErreurAdministration::MembreIntrouvable`] si `membre_id` est fourni mais ne désigne aucune règle du groupe ;
/// [`ErreurAdministration::DoublonUsernameMembreConnu`] si la règle soumise porte un `typeCritere` `username` déjà
/// utilisé par une autre règle du groupe (RG-008) ; [`ErreurAdministration::ConflitReglesMembreConnu`] si la règle
/// soumise, de `typeCritere` `email`/`domaineEmail`, porte le même critère qu'une autre règle du groupe avec un
/// statut différent (RG-008, R10-07 : bloqué à la saisie depuis cet incrément, par symétrie avec le doublon de
/// username).
///
/// # Retour
///
/// Les identifiants des règles de membres connus du groupe encore en conflit après cette qualification (RG-008 :
/// même `typeCritere` et même `critere`, statuts contradictoires). Depuis R10-07, aucune nouvelle règle soumise ne
/// peut plus créer un tel conflit (bloqué ci-dessus) : ce retour reste utile pour signaler d'éventuels conflits
/// résiduels préexistants dans les données (import de configuration antérieur à ce blocage, document migré),
/// purement informatif et sans effet sur la saisie courante.
#[allow(
    clippy::too_many_arguments,
    reason = "un `MembreConnu` complet (6 champs métier, dont `partiLe` RG-061) plus les métadonnées de journalisation (origine, horodatage) et les identifiants de résolution (groupe, membre) ; regrouper ces paramètres dans une structure dédiée n'apporterait pas de clarté supplémentaire pour un seul point d'appel"
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
    parti_le: Option<String>,
    origine: String,
    horodatage: String,
) -> Result<Vec<String>, ErreurAdministration> {
    valider_parti_le(parti_le.as_deref(), type_critere, &horodatage)?;

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

    // R10-07 : blocage strict du conflit de règles email/domaineEmail à la saisie, symétrique du blocage du
    // doublon de username ci-dessus (RG-008). Seule une règle avec un statut différent constitue un conflit :
    // deux règles identiques (même critère, même statut) restent tolérées, comme avant cet incrément (cf.
    // `identifiants_en_conflit_ignore_les_regles_identiques_ou_isolees`).
    if (type_critere == TypeCritere::Email || type_critere == TypeCritere::DomaineEmail)
        && groupe.membres_connus.iter().any(|membre| {
            membre.id != cible_id
                && membre.type_critere == type_critere
                && membre.critere == critere
                && membre.statut != statut
        })
    {
        return Err(ErreurAdministration::ConflitReglesMembreConnu);
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
        parti_le,
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

/// Entrée d'un lot de qualifications de membres connus (US-044, RG-041), un par ligne validée de la modale de
/// saisie en masse : mêmes champs qu'un appel unitaire de [`qualifier_membre`], sans `membre_id` (saisie en masse
/// strictement additive, uniquement des créations, jamais de modification d'une règle existante — celles-ci sont
/// déjà rejetées en amont côté interface par `SaisieMasseMembresUtils.analyser`).
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct EntreeQualificationMembre {
    pub(crate) critere: String,
    pub(crate) type_critere: TypeCritere,
    pub(crate) statut: StatutMembre,
    pub(crate) libelle: Option<String>,
    pub(crate) alias_email: Option<String>,
    /// Date de départ optionnelle (`partiLe`, RG-061) : validée par ligne selon les mêmes règles que la saisie
    /// unitaire (cf. [`valider_parti_le`]) ; une ligne invalide échoue sans bloquer les autres (RG-041).
    #[serde(default)]
    pub(crate) parti_le: Option<String>,
}

/// Qualifie plusieurs membres connus d'un même groupe en une seule fois (US-044, RG-041), appelée par la commande
/// batch `qualifierMembres` de la Façade, introduite pour corriger un défaut de performance de la saisie en masse
/// de membres connus : celle-ci appelait jusqu'ici [`qualifier_membre`] une fois par ligne, chaque appel
/// déclenchant une sauvegarde disque complète (dérivation Argon2id, rotation des sauvegardes de sécurité RG-003,
/// écriture chiffrée complète), un coût proportionnel au nombre de lignes saisies.
///
/// Applique [`qualifier_membre`] séquentiellement, entrée par entrée, dans l'ordre de `entrees`, SANS jamais
/// modifier cette fonction, sur le même patron que
/// [`crate::persistance::parametrage::definir_referentiels`] : ne propage jamais l'échec d'une entrée vers
/// l'appelant — un échec sur une entrée (ex. doublon de username, RG-008, y compris entre deux entrées du même
/// lot, puisque chaque appel relit `donnees` déjà muté par les appels précédents) n'empêche jamais la tentative des
/// entrées suivantes (échec partiel, RG-041 point 5, jamais de rollback des entrées déjà réussies du même lot).
/// Chaque entrée effectivement enregistrée produit sa propre entrée de journal, comme le ferait un appel unitaire.
/// `membre_id` est toujours `None` (uniquement des créations) et `origine` est partagée par toutes les entrées du
/// lot.
///
/// La sauvegarde effective du fichier reste, comme pour [`qualifier_membre`], de la seule responsabilité de la
/// commande de la Façade qui invoque cette fonction — laquelle ne doit sauvegarder qu'une seule fois pour
/// l'ensemble du lot, uniquement si au moins une entrée a réussi.
///
/// # Retour
///
/// Un indicateur de succès par entrée, dans le même ordre que `entrees`.
pub(crate) fn qualifier_membres(
    donnees: &mut DonneesRacine,
    groupe_id: &str,
    entrees: Vec<EntreeQualificationMembre>,
    origine: String,
    horodatage: String,
) -> Vec<bool> {
    entrees
        .into_iter()
        .map(|entree| {
            qualifier_membre(
                donnees,
                groupe_id,
                None,
                entree.critere,
                entree.type_critere,
                entree.statut,
                entree.libelle,
                entree.alias_email,
                entree.parti_le,
                origine.clone(),
                horodatage.clone(),
            )
            .is_ok()
        })
        .collect()
}

/// Valide la date de départ optionnelle d'une règle de membre connu (`partiLe`, RG-061), en complément du contrôle
/// déjà effectué côté interface : refusée sur une règle de `typeCritere` `domaineEmail` (un domaine ne « part »
/// pas), doit être une date `AAAA-MM-JJ` valide et non postérieure au jour de la qualification (dérivé de
/// `horodatage`, pour rester déterministe à horodatage fixé). `partiLe` est sans effet sur la datation de la prise
/// en charge (RG-058) : cette validation ne fait que garantir la cohérence de la donnée saisie.
fn valider_parti_le(
    parti_le: Option<&str>,
    type_critere: TypeCritere,
    horodatage: &str,
) -> Result<(), ErreurAdministration> {
    let Some(parti_le) = parti_le else {
        return Ok(());
    };
    if type_critere == TypeCritere::DomaineEmail {
        return Err(ErreurAdministration::DateDepartInvalide);
    }
    let depart = chrono::NaiveDate::parse_from_str(parti_le, "%Y-%m-%d")
        .map_err(|_| ErreurAdministration::DateDepartInvalide)?;
    let aujourdhui = horodatage
        .get(0..10)
        .and_then(|jour| chrono::NaiveDate::parse_from_str(jour, "%Y-%m-%d").ok())
        .unwrap_or_else(|| chrono::Utc::now().date_naive());
    if depart > aujourdhui {
        return Err(ErreurAdministration::DateDepartInvalide);
    }
    Ok(())
}

/// Détecte les règles de membres connus en conflit au sein d'un même groupe (RG-008) : deux règles distinctes
/// portant le même `typeCritere` et le même `critere` mais un `statut` différent. Fonction pure, opérant
/// uniquement sur la liste de règles fournie, sans aucune donnée d'audit (hors périmètre de cette phase, cf.
/// Moteur de jugement, Phase 6). `parti_le` (RG-061) n'entre volontairement pas dans cette comparaison : deux
/// règles ne diffèrent jamais « en conflit » par leur seule date de départ.
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
            parti_le: None,
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
    fn qualifier_membre_bloque_le_conflit_de_regles_courriel_domaine_a_la_saisie() {
        // R10-07 : ce scénario créait auparavant un conflit signalé après coup (`membres_en_conflit`) sans jamais
        // bloquer la saisie ; il est désormais bloqué à la saisie, symétrique du doublon de username.
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

        let resultat = qualifier_membre(
            &mut racine,
            "g1",
            Some("m2".to_string()),
            "bob@x.fr".to_string(),
            TypeCritere::Email,
            StatutMembre::Client,
            None,
            None,
            None,
            "Administration".to_string(),
            "2026-07-21T09:15:00Z".to_string(),
        );

        assert_eq!(
            resultat,
            Err(ErreurAdministration::ConflitReglesMembreConnu)
        );
        assert_eq!(
            racine.groupes[0].membres_connus[1].critere, "*@y.fr",
            "la règle existante ne doit pas avoir été modifiée par la tentative rejetée"
        );
        assert!(racine.journal.is_empty());
    }

    #[test]
    fn qualifier_membre_autorise_une_regle_courriel_domaine_identique_de_meme_statut()
    -> Result<(), ErreurAdministration> {
        // Deux règles identiques (même critère, même statut) restent tolérées : ce n'est pas un conflit au sens de
        // RG-008 (cf. `identifiants_en_conflit_ignore_les_regles_identiques_ou_isolees`), donc pas davantage bloqué
        // par R10-07. `membre_id` absent ne suffit pas à recréer un doublon exact : `qualifier_membre` retrouverait
        // alors la règle existante par correspondance de critère et la mettrait à jour (cf. commentaire de
        // `qualifier_membre`) ; les deux règles identiques sont donc ici déjà présentes dans le groupe, et c'est
        // l'édition explicite (par `membre_id`) de l'une d'elles, conservant le même critère et le même statut,
        // qui est exercée.
        let mut groupe = groupe_vide("g1");
        groupe.membres_connus.push(membre(
            "m1",
            "*@x.fr",
            TypeCritere::DomaineEmail,
            StatutMembre::Interne,
        ));
        groupe.membres_connus.push(membre(
            "m2",
            "*@x.fr",
            TypeCritere::DomaineEmail,
            StatutMembre::Interne,
        ));
        let mut racine = racine_avec_groupe(groupe);

        let conflits = qualifier_membre(
            &mut racine,
            "g1",
            Some("m2".to_string()),
            "*@x.fr".to_string(),
            TypeCritere::DomaineEmail,
            StatutMembre::Interne,
            Some("Domaine interne (libellé mis à jour)".to_string()),
            None,
            None,
            "Administration".to_string(),
            "2026-07-21T09:16:00Z".to_string(),
        )?;

        assert!(conflits.is_empty());
        assert_eq!(racine.groupes[0].membres_connus.len(), 2);
        Ok(())
    }

    #[test]
    fn qualifier_membre_signale_un_conflit_residuel_sans_bloquer_une_edition_non_liee()
    -> Result<(), ErreurAdministration> {
        // R10-07 ne bloque que la règle SOUMISE si elle crée un nouveau conflit ; un conflit résiduel préexistant
        // entre deux AUTRES règles (ex. import de configuration antérieur à ce blocage) reste signalé de façon
        // purement informative, sans empêcher une édition non liée à ce conflit.
        let mut groupe = groupe_vide("g1");
        groupe.membres_connus.push(membre(
            "m1",
            "bob@x.fr",
            TypeCritere::Email,
            StatutMembre::Interne,
        ));
        groupe.membres_connus.push(membre(
            "m2",
            "bob@x.fr",
            TypeCritere::Email,
            StatutMembre::Client,
        ));
        groupe.membres_connus.push(membre(
            "m3",
            "carol",
            TypeCritere::Username,
            StatutMembre::Interne,
        ));
        let mut racine = racine_avec_groupe(groupe);

        let conflits = qualifier_membre(
            &mut racine,
            "g1",
            Some("m3".to_string()),
            "carol".to_string(),
            TypeCritere::Username,
            StatutMembre::Partenaire,
            None,
            None,
            None,
            "Administration".to_string(),
            "2026-07-21T09:17:00Z".to_string(),
        )?;

        assert_eq!(conflits.len(), 2);
        assert!(conflits.contains(&"m1".to_string()));
        assert!(conflits.contains(&"m2".to_string()));
        assert_eq!(
            racine.groupes[0].membres_connus[2].statut,
            StatutMembre::Partenaire
        );
        Ok(())
    }

    fn entree_qualification(
        critere: &str,
        type_critere: TypeCritere,
        statut: StatutMembre,
    ) -> EntreeQualificationMembre {
        EntreeQualificationMembre {
            critere: critere.to_string(),
            type_critere,
            statut,
            libelle: None,
            alias_email: None,
            parti_le: None,
        }
    }

    #[test]
    fn qualifier_membres_toutes_reussissent_et_journalise_une_entree_par_ligne() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let reussites = qualifier_membres(
            &mut racine,
            "g1",
            vec![
                entree_qualification("alice", TypeCritere::Username, StatutMembre::Interne),
                entree_qualification("bob", TypeCritere::Username, StatutMembre::Client),
            ],
            "Administration".to_string(),
            "2026-07-21T09:20:00Z".to_string(),
        );

        assert_eq!(reussites, vec![true, true]);
        assert_eq!(racine.groupes[0].membres_connus.len(), 2);
        assert_eq!(racine.journal.len(), 2);
    }

    #[test]
    fn qualifier_membres_echec_partiel_au_milieu_du_lot_continue_avec_les_suivantes() {
        // `membre_id` étant toujours absent en saisie en masse, `qualifier_membre` résout la règle cible par
        // correspondance de critère : le doublon de username (RG-008) ne peut donc se déclencher que si les
        // données portent déjà, avant cette soumission, deux règles distinctes avec le même critère — état résiduel
        // incohérent (ex. import antérieur au blocage à la saisie, R10-07), construit ici directement pour ce test,
        // symétrique de `qualifier_membre_signale_un_conflit_residuel_sans_bloquer_une_edition_non_liee`.
        let mut groupe = groupe_vide("g1");
        groupe.membres_connus.push(membre(
            "m1",
            "dave",
            TypeCritere::Username,
            StatutMembre::Interne,
        ));
        groupe.membres_connus.push(membre(
            "m2",
            "dave",
            TypeCritere::Username,
            StatutMembre::Client,
        ));
        let mut racine = racine_avec_groupe(groupe);

        let reussites = qualifier_membres(
            &mut racine,
            "g1",
            vec![
                entree_qualification("bob", TypeCritere::Username, StatutMembre::Client),
                entree_qualification("dave", TypeCritere::Username, StatutMembre::Partenaire),
                entree_qualification("carol", TypeCritere::Username, StatutMembre::Interne),
            ],
            "Administration".to_string(),
            "2026-07-21T09:25:00Z".to_string(),
        );

        assert_eq!(reussites, vec![true, false, true]);
        assert_eq!(racine.groupes[0].membres_connus.len(), 4);
        assert_eq!(racine.journal.len(), 2);
    }

    #[test]
    fn qualifier_membres_deux_entrees_du_meme_lot_portant_le_meme_critere_se_fusionnent_dans_la_meme_regle()
     {
        // À la différence de `definir_referentiels` (RG-042, rejet strict d'un motif dupliqué), deux entrées de
        // saisie en masse de membres portant le même critère ne peuvent normalement jamais atteindre cette fonction
        // (dédoublonnées en amont par `SaisieMasseMembresUtils.analyser`, RG-041) ; si elles y parvenaient malgré
        // tout, `membre_id` étant absent, la seconde entrée met simplement à jour la règle créée par la première
        // (résolution par correspondance de critère), sans erreur ni duplication de règle.
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let reussites = qualifier_membres(
            &mut racine,
            "g1",
            vec![
                entree_qualification("alice", TypeCritere::Username, StatutMembre::Interne),
                entree_qualification("alice", TypeCritere::Username, StatutMembre::Client),
            ],
            "Administration".to_string(),
            "2026-07-21T09:30:00Z".to_string(),
        );

        assert_eq!(reussites, vec![true, true]);
        assert_eq!(racine.groupes[0].membres_connus.len(), 1);
        assert_eq!(
            racine.groupes[0].membres_connus[0].statut,
            StatutMembre::Client
        );
        assert_eq!(racine.journal.len(), 2);
    }

    #[test]
    fn qualifier_membres_lot_vide_ne_fait_rien() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let reussites = qualifier_membres(
            &mut racine,
            "g1",
            vec![],
            "Administration".to_string(),
            "2026-07-21T09:35:00Z".to_string(),
        );

        assert!(reussites.is_empty());
        assert!(racine.groupes[0].membres_connus.is_empty());
        assert!(racine.journal.is_empty());
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

    #[test]
    fn qualifier_membre_enregistre_une_date_de_depart_valide_sur_une_regle_username()
    -> Result<(), ErreurAdministration> {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        qualifier_membre(
            &mut racine,
            "g1",
            None,
            "alice".to_string(),
            TypeCritere::Username,
            StatutMembre::Interne,
            None,
            None,
            Some("2025-06-30".to_string()),
            "Administration".to_string(),
            "2026-09-03T09:00:00Z".to_string(),
        )?;

        assert_eq!(
            racine.groupes[0].membres_connus[0].parti_le.as_deref(),
            Some("2025-06-30")
        );
        Ok(())
    }

    #[test]
    fn qualifier_membre_rejette_une_date_de_depart_sur_une_regle_domaine() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));

        let resultat = qualifier_membre(
            &mut racine,
            "g1",
            None,
            "*@entreprise.fr".to_string(),
            TypeCritere::DomaineEmail,
            StatutMembre::Interne,
            None,
            None,
            Some("2025-06-30".to_string()),
            "Administration".to_string(),
            "2026-09-03T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurAdministration::DateDepartInvalide));
        assert!(racine.groupes[0].membres_connus.is_empty());
        assert!(racine.journal.is_empty());
    }

    #[test]
    fn qualifier_membre_rejette_une_date_de_depart_future_ou_non_analysable() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));
        let appel = |racine: &mut DonneesRacine, parti_le: &str| {
            qualifier_membre(
                racine,
                "g1",
                None,
                "alice".to_string(),
                TypeCritere::Username,
                StatutMembre::Interne,
                None,
                None,
                Some(parti_le.to_string()),
                "Administration".to_string(),
                "2026-09-03T09:00:00Z".to_string(),
            )
        };

        assert_eq!(
            appel(&mut racine, "2026-09-04"),
            Err(ErreurAdministration::DateDepartInvalide),
            "date postérieure au jour de la qualification"
        );
        assert_eq!(
            appel(&mut racine, "30/06/2025"),
            Err(ErreurAdministration::DateDepartInvalide),
            "format non ISO"
        );
    }

    #[test]
    fn qualifier_membres_une_date_de_depart_invalide_nechoue_que_sa_propre_ligne() {
        let mut racine = racine_avec_groupe(groupe_vide("g1"));
        let mut ligne_domaine = entree_qualification(
            "*@entreprise.fr",
            TypeCritere::DomaineEmail,
            StatutMembre::Interne,
        );
        ligne_domaine.parti_le = Some("2025-06-30".to_string());
        let mut ligne_valide =
            entree_qualification("bob", TypeCritere::Username, StatutMembre::Client);
        ligne_valide.parti_le = Some("2025-01-15".to_string());

        let reussites = qualifier_membres(
            &mut racine,
            "g1",
            vec![ligne_domaine, ligne_valide],
            "Administration".to_string(),
            "2026-09-03T09:00:00Z".to_string(),
        );

        assert_eq!(reussites, vec![false, true]);
        assert_eq!(racine.groupes[0].membres_connus.len(), 1);
        assert_eq!(racine.groupes[0].membres_connus[0].critere, "bob");
        assert_eq!(
            racine.groupes[0].membres_connus[0].parti_le.as_deref(),
            Some("2025-01-15")
        );
    }
}
