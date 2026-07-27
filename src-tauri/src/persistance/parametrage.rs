// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Mutations de données de jugement portées par l'écran de Paramétrage de la Phase 7 (US-033) : modification d'un
//! seuil de couleur (`parametres.seuils`) et ajout/modification/remplacement d'un référentiel (`referentiels`).
//! Consigne systématiquement la modification au journal append-only (RG-023), sur le même modèle que
//! `persistance::administration`.
//!
//! Ce module ne touche jamais le disque ni l'état de session : il opère uniquement sur une [`DonneesRacine`] déjà
//! chargée en mémoire. La sauvegarde effective reste de la responsabilité des commandes de la Façade qui
//! l'invoquent (`commandes::parametrage`), conformément à la séquence « Modifier un seuil ou un référentiel et
//! requalifier l'historique » de `docs/02_documentation/13_conceptionDetaillee.md#séquences-des-scénarios-fonctionnels-principaux`.
//!
//! Décision de modélisation reprise sans changement (cf. commentaire d'en-tête de `modele/racine.rs`) :
//! `parametres.seuils` et les éléments de `referentiels.reglesDependances`/`reglesMarqueursIA` restent des valeurs
//! JSON génériques côté cœur natif — ce module les valide donc structurellement (présence des champs requis) sans
//! les typer en dur, l'interprétation fine de leur contenu restant du seul ressort du Moteur de jugement (UI).
//! Seul `referentiels.motifNommageBranches` est typé en toutes lettres côté cœur natif (RG-030) et validé ici comme
//! expression régulière syntaxiquement correcte, à l'aide de la dépendance `regex` déjà présente dans
//! `Cargo.toml` (introduite pour le Connecteur GitLab, aucune nouvelle dépendance requise par cet incrément).

use crate::modele::racine::DonneesRacine;
use regex::Regex;
use serde_json::Value;
use thiserror::Error;

/// Anomalie de validation métier levée avant toute tentative de sauvegarde (RG-023, RG-030).
#[derive(Debug, Error, PartialEq, Eq)]
pub(crate) enum ErreurParametrage {
    /// Le chemin pointé fourni ne désigne aucune clé existante de `parametres.seuils` : `definirSeuil` ne crée
    /// jamais de clé arbitraire, seule une clé déjà présente (par un audit précédent ou par le document initial)
    /// peut être modifiée.
    #[error("la clé de seuil désignée est introuvable")]
    CleSeuilIntrouvable,
    /// Le type de référentiel désigné n'est reconnu par aucune des trois branches gérées par cette commande.
    #[error("le type de référentiel désigné est inconnu")]
    TypeReferentielInconnu,
    /// L'entrée soumise pour un référentiel-liste (`reglesDependances`/`reglesMarqueursIA`) ne porte pas les
    /// champs requis sous la forme attendue (RG-023 : revalidation côté cœur natif d'une saisie déjà validée côté
    /// interface).
    #[error("l'entrée de référentiel soumise est invalide")]
    EntreeReferentielInvalide,
    /// Le motif de nommage de branche soumis est vide ou n'est pas une expression régulière syntaxiquement valide
    /// (RG-030).
    #[error("le motif de nommage de branche soumis est invalide")]
    MotifNommageBranchesInvalide,
}

/// Modifie un seuil de couleur (`parametres.seuils`), désigné par un chemin pointé (segments séparés par `.`, ex.
/// `vitalite.mortJours`), puis consigne la modification au journal (RG-022, RG-023).
///
/// Convention arbitraire du chemin pointé (à valider par un humain, cf. rapport de développement de cet
/// incrément) : faute de précision documentaire sur la forme exacte de la `clé` de `definirSeuil(clé, valeur)`.
/// Ne crée jamais de clé absente : seule une feuille déjà présente dans `parametres.seuils` peut être remplacée,
/// ce qui évite qu'une faute de frappe introduise silencieusement une branche de seuils jamais lue par le Moteur
/// de jugement.
///
/// # Erreurs
///
/// [`ErreurParametrage::CleSeuilIntrouvable`] si `cle` ne désigne pas une feuille existante de
/// `parametres.seuils`.
pub(crate) fn definir_seuil(
    donnees: &mut DonneesRacine,
    cle: &str,
    valeur: Value,
    horodatage: String,
) -> Result<(), ErreurParametrage> {
    let segments: Vec<&str> = cle.split('.').collect();
    let (derniere, parents) = segments
        .split_last()
        .ok_or(ErreurParametrage::CleSeuilIntrouvable)?;

    let mut courant = &mut donnees.parametres.seuils;
    for segment in parents {
        courant = courant
            .as_object_mut()
            .and_then(|objet| objet.get_mut(*segment))
            .ok_or(ErreurParametrage::CleSeuilIntrouvable)?;
    }
    let objet = courant
        .as_object_mut()
        .ok_or(ErreurParametrage::CleSeuilIntrouvable)?;
    if !objet.contains_key(*derniere) {
        return Err(ErreurParametrage::CleSeuilIntrouvable);
    }

    let avant = objet
        .insert((*derniere).to_string(), valeur.clone())
        .unwrap_or(Value::Null);

    donnees.journal.push(crate::modele::racine::EntreeJournal {
        id: uuid::Uuid::new_v4().to_string(),
        horodatage,
        objet: format!("parametres.seuils.{cle}"),
        avant,
        apres: valeur,
        origine: "Paramétrage".to_string(),
        detail_origine: None,
    });

    Ok(())
}

/// Lit un champ chaîne non vide d'un objet JSON, anomalie [`ErreurParametrage::EntreeReferentielInvalide`] sinon.
fn lire_champ_chaine_non_vide<'a>(
    objet: &'a serde_json::Map<String, Value>,
    champ: &str,
) -> Result<&'a str, ErreurParametrage> {
    objet
        .get(champ)
        .and_then(Value::as_str)
        .filter(|valeur| !valeur.is_empty())
        .ok_or(ErreurParametrage::EntreeReferentielInvalide)
}

/// Valide la forme minimale attendue d'une entrée de `referentiels.reglesDependances` (`id`, `motif` non vides,
/// `versions` tableau), sans interpréter le détail de chaque borne de version (rôle du Moteur de jugement, UI).
fn valider_entree_regles_dependances(entree: &Value) -> Result<&str, ErreurParametrage> {
    let objet = entree
        .as_object()
        .ok_or(ErreurParametrage::EntreeReferentielInvalide)?;
    let id = lire_champ_chaine_non_vide(objet, "id")?;
    lire_champ_chaine_non_vide(objet, "motif")?;
    if !objet.get("versions").is_some_and(Value::is_array) {
        return Err(ErreurParametrage::EntreeReferentielInvalide);
    }
    Ok(id)
}

/// Valide la forme minimale attendue d'une entrée de `referentiels.reglesMarqueursIA` (F18) : `id`, `motif`,
/// `outil` non vides, `typeCorrespondance`/`portee`/`nature` parmi leurs valeurs closes respectives (mêmes
/// ensembles que `ParametresJugementUtils` côté UI, `services/sansetat/jugement/parametres-jugement.utils.ts`).
fn valider_entree_regles_marqueurs_ia(entree: &Value) -> Result<&str, ErreurParametrage> {
    let objet = entree
        .as_object()
        .ok_or(ErreurParametrage::EntreeReferentielInvalide)?;
    let id = lire_champ_chaine_non_vide(objet, "id")?;
    lire_champ_chaine_non_vide(objet, "motif")?;
    lire_champ_chaine_non_vide(objet, "outil")?;
    let type_correspondance = lire_champ_chaine_non_vide(objet, "typeCorrespondance")?;
    if !matches!(type_correspondance, "exact" | "motif") {
        return Err(ErreurParametrage::EntreeReferentielInvalide);
    }
    let portee = lire_champ_chaine_non_vide(objet, "portee")?;
    if !matches!(portee, "racine" | "partout") {
        return Err(ErreurParametrage::EntreeReferentielInvalide);
    }
    let nature = lire_champ_chaine_non_vide(objet, "nature")?;
    if !matches!(nature, "fichier" | "repertoire") {
        return Err(ErreurParametrage::EntreeReferentielInvalide);
    }
    Ok(id)
}

/// Ajoute ou met à jour, par identifiant, une entrée d'un référentiel-liste (`regles`), et renvoie l'entrée
/// précédente (`Value::Null` si l'identifiant était absent, c'est-à-dire création).
fn upsert_par_id(regles: &mut Vec<Value>, id: &str, entree: Value) -> Value {
    let existante = regles.iter_mut().find(|regle| {
        regle.as_object().and_then(|objet| objet.get("id")) == Some(&Value::String(id.to_string()))
    });
    match existante {
        Some(regle) => std::mem::replace(regle, entree),
        None => {
            regles.push(entree);
            Value::Null
        }
    }
}

/// Ajoute ou met à jour une entrée d'un référentiel (`referentiels`), ou remplace intégralement le motif de
/// nommage de branche, puis consigne la modification au journal (RG-023, RG-030).
///
/// `type_referentiel` désigne la branche concernée : `"reglesDependances"`, `"reglesMarqueursIA"` (ajout/mise à
/// jour d'une entrée par `id`, cf. [`upsert_par_id`]) ou `"motifNommageBranches"` (remplacement scalaire).
///
/// # Erreurs
///
/// [`ErreurParametrage::TypeReferentielInconnu`] si `type_referentiel` ne désigne aucune des trois branches
/// ci-dessus ; [`ErreurParametrage::EntreeReferentielInvalide`] si `entree` ne porte pas la forme minimale requise
/// pour un référentiel-liste ; [`ErreurParametrage::MotifNommageBranchesInvalide`] si `entree` n'est pas une
/// chaîne non vide et syntaxiquement valide comme expression régulière (RG-030).
pub(crate) fn definir_referentiel(
    donnees: &mut DonneesRacine,
    type_referentiel: &str,
    entree: Value,
    horodatage: String,
) -> Result<(), ErreurParametrage> {
    let objet = match type_referentiel {
        "reglesDependances" => {
            let id = valider_entree_regles_dependances(&entree)?.to_string();
            let avant = upsert_par_id(
                &mut donnees.referentiels.regles_dependances,
                &id,
                entree.clone(),
            );
            (format!("referentiels.reglesDependances/{id}"), avant)
        }
        "reglesMarqueursIA" => {
            let id = valider_entree_regles_marqueurs_ia(&entree)?.to_string();
            let avant = upsert_par_id(
                &mut donnees.referentiels.regles_marqueurs_ia,
                &id,
                entree.clone(),
            );
            (format!("referentiels.reglesMarqueursIA/{id}"), avant)
        }
        "motifNommageBranches" => {
            let motif = entree
                .as_str()
                .filter(|motif| !motif.is_empty())
                .ok_or(ErreurParametrage::MotifNommageBranchesInvalide)?;
            Regex::new(motif).map_err(|_| ErreurParametrage::MotifNommageBranchesInvalide)?;
            let avant = Value::String(donnees.referentiels.motif_nommage_branches.clone());
            donnees.referentiels.motif_nommage_branches = motif.to_string();
            ("referentiels.motifNommageBranches".to_string(), avant)
        }
        _ => return Err(ErreurParametrage::TypeReferentielInconnu),
    };
    let (objet, avant) = objet;

    donnees.journal.push(crate::modele::racine::EntreeJournal {
        id: uuid::Uuid::new_v4().to_string(),
        horodatage,
        objet,
        avant,
        apres: entree,
        origine: "Paramétrage".to_string(),
        detail_origine: None,
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn racine_de_test() -> DonneesRacine {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-27T08:00:00Z");
        racine.parametres.seuils = json!({
            "vitalite": { "mourantJours": 180, "mortJours": 365 },
            "fraicheurAudit": { "ancienJours": 30 },
        });
        racine
    }

    #[test]
    fn definir_seuil_remplace_une_feuille_existante() -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();

        definir_seuil(
            &mut racine,
            "vitalite.mortJours",
            json!(400),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        assert_eq!(
            racine.parametres.seuils["vitalite"]["mortJours"],
            json!(400)
        );
        assert_eq!(racine.journal.len(), 1);
        let entree = &racine.journal[0];
        assert_eq!(entree.objet, "parametres.seuils.vitalite.mortJours");
        assert_eq!(entree.avant, json!(365));
        assert_eq!(entree.apres, json!(400));
        assert_eq!(entree.origine, "Paramétrage");
        Ok(())
    }

    #[test]
    fn definir_seuil_racine_a_une_seule_clef() -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();

        definir_seuil(
            &mut racine,
            "fraicheurAudit.ancienJours",
            json!(45),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        assert_eq!(
            racine.parametres.seuils["fraicheurAudit"]["ancienJours"],
            json!(45)
        );
        Ok(())
    }

    #[test]
    fn definir_seuil_cle_introuvable_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_seuil(
            &mut racine,
            "vitalite.cleInexistante",
            json!(1),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurParametrage::CleSeuilIntrouvable));
        assert!(racine.journal.is_empty());
    }

    #[test]
    fn definir_seuil_branche_introuvable_est_rejetee() {
        let mut racine = racine_de_test();

        let resultat = definir_seuil(
            &mut racine,
            "brancheInexistante.cle",
            json!(1),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurParametrage::CleSeuilIntrouvable));
    }

    #[test]
    fn definir_referentiel_regles_dependances_cree_une_entree() -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();

        definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d1", "motif": "moment", "versions": [] }),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        assert_eq!(racine.referentiels.regles_dependances.len(), 1);
        let entree = &racine.journal[0];
        assert_eq!(entree.objet, "referentiels.reglesDependances/d1");
        assert_eq!(entree.avant, Value::Null);
        Ok(())
    }

    #[test]
    fn definir_referentiel_regles_dependances_met_a_jour_une_entree_existante()
    -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();
        definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d1", "motif": "moment", "versions": [] }),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d1", "motif": "moment2", "versions": [] }),
            "2026-07-27T10:00:00Z".to_string(),
        )?;

        assert_eq!(racine.referentiels.regles_dependances.len(), 1);
        assert_eq!(
            racine.referentiels.regles_dependances[0]["motif"],
            json!("moment2")
        );
        let derniere_entree = &racine.journal[1];
        assert_eq!(derniere_entree.avant["motif"], json!("moment"));
        Ok(())
    }

    #[test]
    fn definir_referentiel_regles_dependances_champ_manquant_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d1", "versions": [] }),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurParametrage::EntreeReferentielInvalide));
        assert!(racine.referentiels.regles_dependances.is_empty());
    }

    #[test]
    fn definir_referentiel_regles_marqueurs_ia_cree_une_entree() -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();

        definir_referentiel(
            &mut racine,
            "reglesMarqueursIA",
            json!({
                "id": "m1",
                "motif": "CLAUDE.md",
                "typeCorrespondance": "exact",
                "portee": "racine",
                "nature": "fichier",
                "outil": "claude"
            }),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        assert_eq!(racine.referentiels.regles_marqueurs_ia.len(), 1);
        assert_eq!(racine.journal[0].objet, "referentiels.reglesMarqueursIA/m1");
        Ok(())
    }

    #[test]
    fn definir_referentiel_regles_marqueurs_ia_type_correspondance_invalide_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_referentiel(
            &mut racine,
            "reglesMarqueursIA",
            json!({
                "id": "m1",
                "motif": "CLAUDE.md",
                "typeCorrespondance": "invalide",
                "portee": "racine",
                "nature": "fichier",
                "outil": "claude"
            }),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurParametrage::EntreeReferentielInvalide));
    }

    #[test]
    fn definir_referentiel_motif_nommage_branches_remplace_la_valeur()
    -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();
        let motif_initial = racine.referentiels.motif_nommage_branches.clone();

        definir_referentiel(
            &mut racine,
            "motifNommageBranches",
            json!("^feature/.+$"),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        assert_eq!(racine.referentiels.motif_nommage_branches, "^feature/.+$");
        let entree = &racine.journal[0];
        assert_eq!(entree.objet, "referentiels.motifNommageBranches");
        assert_eq!(entree.avant, Value::String(motif_initial));
        assert_eq!(entree.apres, Value::String("^feature/.+$".to_string()));
        Ok(())
    }

    #[test]
    fn definir_referentiel_motif_nommage_branches_vide_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_referentiel(
            &mut racine,
            "motifNommageBranches",
            json!(""),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(
            resultat,
            Err(ErreurParametrage::MotifNommageBranchesInvalide)
        );
    }

    #[test]
    fn definir_referentiel_motif_nommage_branches_syntaxiquement_invalide_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_referentiel(
            &mut racine,
            "motifNommageBranches",
            json!("["),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(
            resultat,
            Err(ErreurParametrage::MotifNommageBranchesInvalide)
        );
    }

    #[test]
    fn definir_referentiel_type_inconnu_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_referentiel(
            &mut racine,
            "typeInexistant",
            json!({}),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurParametrage::TypeReferentielInconnu));
    }
}
