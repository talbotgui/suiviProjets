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

use crate::modele::racine::{DonneesRacine, Proxy};
use regex::Regex;
use serde_json::Value;
use thiserror::Error;
use url::Url;

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
    /// Un réglage applicatif soumis (délai de verrouillage, nombre d'échecs, concurrence d'audit, URL de proxy,
    /// nombre de sauvegardes de sécurité ou seuil d'avertissement de taille) ne respecte pas sa borne de validité
    /// minimale (US-034, US-035, RG-031, RG-032) : revalidation côté cœur natif d'une saisie déjà validée côté
    /// interface.
    #[error("le réglage applicatif soumis est invalide")]
    ReglageApplicatifInvalide,
    /// L'identifiant soumis à `supprimerRegleDependance`/`supprimerRegleMarqueurIA` ne désigne aucune entrée
    /// existante du référentiel concerné (US-033, RG-035).
    #[error("l'entrée de référentiel désignée est introuvable")]
    EntreeReferentielIntrouvable,
    /// Le motif soumis pour une entrée de `referentiels.reglesDependances` correspond déjà au `motif` d'une autre
    /// entrée existante du référentiel (RG-042, Phase 15 C15-10) : revalidation côté cœur natif du contrôle déjà
    /// effectué côté interface, rejet strict symétrique de RG-040 (saisie en masse) — jamais de fusion implicite,
    /// l'utilisateur doit modifier directement la règle existante.
    #[error("le motif soumis correspond déjà à une règle de dépendances existante")]
    MotifDependanceDejaExistant,
    /// Le libellé soumis pour une entrée de `referentiels.categoriesDependances` correspond déjà, à l'identique, au
    /// `libelle` d'une autre entrée existante du référentiel (US-048, RG-048) : rejet strict symétrique de
    /// [`Self::MotifDependanceDejaExistant`], jamais de doublon silencieux, l'utilisateur doit modifier directement
    /// la catégorie existante.
    #[error("le libellé soumis correspond déjà à une catégorie de dépendance existante")]
    LibelleCategorieDependanceDejaExistant,
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
/// `versions` tableau dont chaque élément est un objet portant `motifVersion`/`statut` non vides, RG-043, Phase 15
/// C15-11 ; `categorie` facultatif mais, si présent, chaîne non vide, US-049/RG-049), sans imposer de liste fermée
/// de valeurs pour `statut` (champ libre, RG-022 : l'interprétation fine du contenu reste du seul ressort du Moteur
/// de jugement, UI).
///
/// `pub(crate)` depuis la Phase 9, incrément 3 (correction post-relecture) : réutilisé tel quel par
/// `persistance::configuration_partageable::calculer_differentiel` pour signaler comme lignes invalides, plutôt
/// que d'appliquer sans contrôle, les entrées importées ne respectant pas cette même forme minimale — la voie
/// d'import ne doit jamais être moins stricte que la saisie manuelle sur les mêmes données. Cette réutilisation
/// s'applique mécaniquement à l'extension structurelle des éléments de `versions` (RG-043), sans changement requis
/// côté import.
pub(crate) fn valider_entree_regles_dependances(entree: &Value) -> Result<&str, ErreurParametrage> {
    let objet = entree
        .as_object()
        .ok_or(ErreurParametrage::EntreeReferentielInvalide)?;
    let id = lire_champ_chaine_non_vide(objet, "id")?;
    lire_champ_chaine_non_vide(objet, "motif")?;
    let versions = objet
        .get("versions")
        .and_then(Value::as_array)
        .ok_or(ErreurParametrage::EntreeReferentielInvalide)?;
    for version in versions {
        let version_objet = version
            .as_object()
            .ok_or(ErreurParametrage::EntreeReferentielInvalide)?;
        lire_champ_chaine_non_vide(version_objet, "motifVersion")?;
        lire_champ_chaine_non_vide(version_objet, "statut")?;
    }
    // `categorie` est facultatif (US-049, RG-049) : absent ou chaîne non vide (identifiant d'une entrée du
    // référentiel des catégories de dépendance). Une valeur présente mais vide ou non-chaîne est rejetée, comme la
    // saisie manuelle côté interface. L'existence effective de la catégorie n'est pas vérifiée ici (une catégorie
    // peut être supprimée après coup : le Moteur de jugement ignore alors la règle, RG-049).
    if let Some(categorie) = objet.get("categorie") {
        let categorie_valide = categorie.as_str().is_some_and(|valeur| !valeur.is_empty());
        if !categorie_valide {
            return Err(ErreurParametrage::EntreeReferentielInvalide);
        }
    }
    Ok(id)
}

/// Valide la forme minimale attendue d'une entrée de `referentiels.categoriesDependances` (US-048) : `id` et
/// `libelle` non vides ; `sigle` facultatif mais, s'il est présent, chaîne non vide d'au plus trois caractères
/// (colonne compacte de l'écran Obsolescence, US-051). Sur le modèle de [`valider_entree_regles_dependances`], sans
/// imposer d'autre contrainte de contenu — l'interprétation fine reste du ressort du Moteur de jugement (UI).
///
/// `pub(crate)` : réutilisé par `persistance::configuration_partageable::calculer_differentiel` afin que la voie
/// d'import ne soit jamais moins stricte que la saisie manuelle sur la même donnée.
pub(crate) fn valider_entree_categorie_dependance(
    entree: &Value,
) -> Result<&str, ErreurParametrage> {
    let objet = entree
        .as_object()
        .ok_or(ErreurParametrage::EntreeReferentielInvalide)?;
    let id = lire_champ_chaine_non_vide(objet, "id")?;
    lire_champ_chaine_non_vide(objet, "libelle")?;
    if let Some(sigle) = objet.get("sigle") {
        let sigle_valide = sigle
            .as_str()
            .is_some_and(|valeur| !valeur.is_empty() && valeur.chars().count() <= 3);
        if !sigle_valide {
            return Err(ErreurParametrage::EntreeReferentielInvalide);
        }
    }
    Ok(id)
}

/// Valide la forme minimale attendue d'une entrée de `referentiels.reglesMarqueursIA` (F18) : `id`, `motif`,
/// `outil` non vides, `typeCorrespondance`/`portee`/`nature` parmi leurs valeurs closes respectives (mêmes
/// ensembles que `ParametresJugementUtils` côté UI, `services/sansetat/jugement/parametres-jugement.utils.ts`).
///
/// `pub(crate)` depuis la Phase 9, incrément 3 (correction post-relecture) : cf. commentaire de
/// [`valider_entree_regles_dependances`] ci-dessus, même justification.
pub(crate) fn valider_entree_regles_marqueurs_ia(
    entree: &Value,
) -> Result<&str, ErreurParametrage> {
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

/// Valide qu'une valeur JSON est une chaîne non vide et syntaxiquement valide comme expression régulière (RG-030),
/// et la renvoie. Extraite de [`definir_referentiel`] à la Phase 9, incrément 3 (correction post-relecture) :
/// `pub(crate)`, réutilisée telle quelle par `persistance::configuration_partageable::calculer_differentiel` pour
/// signaler comme ligne invalide, plutôt que d'appliquer sans contrôle, un motif de nommage de branche importé
/// syntaxiquement incorrect — la voie d'import ne doit jamais être moins stricte que la saisie manuelle sur la
/// même donnée.
pub(crate) fn valider_motif_nommage_branches(entree: &Value) -> Result<&str, ErreurParametrage> {
    let motif = entree
        .as_str()
        .filter(|motif| !motif.is_empty())
        .ok_or(ErreurParametrage::MotifNommageBranchesInvalide)?;
    Regex::new(motif).map_err(|_| ErreurParametrage::MotifNommageBranchesInvalide)?;
    Ok(motif)
}

/// Ajoute ou met à jour, par identifiant, une entrée d'un référentiel-liste (`regles`), et renvoie l'entrée
/// précédente (`Value::Null` si l'identifiant était absent, c'est-à-dire création).
///
/// `pub(crate)` (plutôt que privé au module) depuis la Phase 9, incrément 3 : réutilisé tel quel par
/// `persistance::configuration_partageable::appliquer_ligne` pour l'application d'une ligne acceptée du
/// différentiel d'import de configuration (US-030), afin de ne pas dupliquer cette logique d'upsert.
pub(crate) fn upsert_par_id(regles: &mut Vec<Value>, id: &str, entree: Value) -> Value {
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
/// `type_referentiel` désigne la branche concernée : `"reglesDependances"`, `"reglesMarqueursIA"`,
/// `"categoriesDependances"` (ajout/mise à jour d'une entrée par `id`, cf. [`upsert_par_id`]) ou
/// `"motifNommageBranches"` (remplacement scalaire).
///
/// # Erreurs
///
/// [`ErreurParametrage::TypeReferentielInconnu`] si `type_referentiel` ne désigne aucune des quatre branches
/// ci-dessus ; [`ErreurParametrage::EntreeReferentielInvalide`] si `entree` ne porte pas la forme minimale requise
/// pour un référentiel-liste ; [`ErreurParametrage::MotifDependanceDejaExistant`] si `type_referentiel` vaut
/// `"reglesDependances"` et que le `motif` soumis correspond déjà à une autre entrée existante du référentiel
/// (RG-042) ; [`ErreurParametrage::LibelleCategorieDependanceDejaExistant`] si `type_referentiel` vaut
/// `"categoriesDependances"` et que le `libelle` soumis correspond déjà à une autre entrée existante (US-048,
/// RG-048) ; [`ErreurParametrage::MotifNommageBranchesInvalide`] si `entree` n'est pas une chaîne non vide et
/// syntaxiquement valide comme expression régulière (RG-030).
pub(crate) fn definir_referentiel(
    donnees: &mut DonneesRacine,
    type_referentiel: &str,
    entree: Value,
    horodatage: String,
) -> Result<(), ErreurParametrage> {
    let objet = match type_referentiel {
        "reglesDependances" => {
            let id = valider_entree_regles_dependances(&entree)?.to_string();
            // RG-042 (Phase 15, C15-10) : revalidation côté cœur natif du contrôle déjà effectué côté interface.
            // Aucune AUTRE entrée déjà présente (identifiant différent) ne doit porter le même motif, pour éviter
            // un doublon fonctionnellement mort (le Moteur de jugement ne retient que la première règle du tableau
            // dont le motif correspond). Rejette avant toute mutation du référentiel.
            let motif = entree
                .get("motif")
                .and_then(Value::as_str)
                .unwrap_or_default();
            let motif_deja_existant = donnees.referentiels.regles_dependances.iter().any(|regle| {
                let regle_objet = regle.as_object();
                let id_regle = regle_objet
                    .and_then(|objet| objet.get("id"))
                    .and_then(Value::as_str);
                let motif_regle = regle_objet
                    .and_then(|objet| objet.get("motif"))
                    .and_then(Value::as_str);
                id_regle != Some(id.as_str()) && motif_regle == Some(motif)
            });
            if motif_deja_existant {
                return Err(ErreurParametrage::MotifDependanceDejaExistant);
            }
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
        "categoriesDependances" => {
            let id = valider_entree_categorie_dependance(&entree)?.to_string();
            // US-048 / RG-048 : rejet strict d'un libellé déjà porté par une AUTRE entrée (identifiant différent),
            // symétrique de RG-042 sur le `motif` d'une règle de dépendance — jamais de doublon silencieux.
            let libelle = entree
                .get("libelle")
                .and_then(Value::as_str)
                .unwrap_or_default();
            let libelle_deja_existant =
                donnees
                    .referentiels
                    .categories_dependances
                    .iter()
                    .any(|categorie| {
                        let categorie_objet = categorie.as_object();
                        let id_categorie = categorie_objet
                            .and_then(|objet| objet.get("id"))
                            .and_then(Value::as_str);
                        let libelle_categorie = categorie_objet
                            .and_then(|objet| objet.get("libelle"))
                            .and_then(Value::as_str);
                        id_categorie != Some(id.as_str()) && libelle_categorie == Some(libelle)
                    });
            if libelle_deja_existant {
                return Err(ErreurParametrage::LibelleCategorieDependanceDejaExistant);
            }
            let avant = upsert_par_id(
                &mut donnees.referentiels.categories_dependances,
                &id,
                entree.clone(),
            );
            (format!("referentiels.categoriesDependances/{id}"), avant)
        }
        "motifNommageBranches" => {
            let motif = valider_motif_nommage_branches(&entree)?.to_string();
            let avant = Value::String(donnees.referentiels.motif_nommage_branches.clone());
            donnees.referentiels.motif_nommage_branches = motif;
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

/// Ajoute ou met à jour plusieurs entrées d'un même référentiel en une seule fois (US-043, RG-040), appelée par la
/// commande batch `definirReferentiels` de la Façade, introduite pour corriger un défaut de performance de la
/// saisie en masse de règles de dépendances : celle-ci appelait jusqu'ici [`definir_referentiel`] une fois par
/// groupe créé — un coût (dérivation Argon2id, rotation des sauvegardes de sécurité RG-003, écriture chiffrée
/// complète) proportionnel au nombre de groupes saisis, ressenti comme très long par l'utilisateur.
///
/// Applique [`definir_referentiel`] séquentiellement, entrée par entrée, dans l'ordre de `entrees`, SANS jamais
/// modifier cette fonction : à la différence de celle-ci, ne propage jamais l'échec d'une entrée vers l'appelant —
/// un échec sur une entrée (ex. motif déjà existant, RG-042, y compris entre deux entrées du même lot, puisque
/// chaque appel relit `donnees` déjà muté par les appels précédents) n'empêche jamais la tentative des entrées
/// suivantes (échec partiel, RG-040 point 5, jamais de rollback des entrées déjà réussies du même lot). Chaque
/// entrée effectivement enregistrée produit sa propre entrée de journal, comme le ferait un appel unitaire.
///
/// La sauvegarde effective du fichier reste, comme pour [`definir_referentiel`], de la seule responsabilité de la
/// commande de la Façade qui invoque cette fonction — laquelle ne doit sauvegarder qu'une seule fois pour
/// l'ensemble du lot, uniquement si au moins une entrée a réussi.
///
/// # Retour
///
/// Un indicateur de succès par entrée, dans le même ordre que `entrees`.
pub(crate) fn definir_referentiels(
    donnees: &mut DonneesRacine,
    type_referentiel: &str,
    entrees: Vec<Value>,
    horodatage: String,
) -> Vec<bool> {
    entrees
        .into_iter()
        .map(|entree| {
            definir_referentiel(donnees, type_referentiel, entree, horodatage.clone()).is_ok()
        })
        .collect()
}

/// Consigne au journal une modification ou une suppression, factorisé pour les cinq fonctions de réglages
/// applicatifs (`definir_verrouillage`/`definir_concurrence_audit`/`definir_proxy`/
/// `definir_nombre_sauvegardes_securite`/`definir_seuil_avertissement_taille`, US-034, US-035, RG-031, RG-032) et
/// pour les deux fonctions de suppression d'entrée de référentiel ci-dessous (US-033, RG-035).
fn consigner_modification(
    donnees: &mut DonneesRacine,
    objet: &str,
    avant: Value,
    apres: Value,
    horodatage: String,
) {
    donnees.journal.push(crate::modele::racine::EntreeJournal {
        id: uuid::Uuid::new_v4().to_string(),
        horodatage,
        objet: objet.to_string(),
        avant,
        apres,
        origine: "Paramétrage".to_string(),
        detail_origine: None,
    });
}

/// Modifie les réglages de verrouillage de session (`parametres.verrouillage`), puis consigne la modification au
/// journal (US-034, RG-031).
///
/// # Erreurs
///
/// [`ErreurParametrage::ReglageApplicatifInvalide`] si `delai_inactivite_minutes` ou `echecs_avant_fermeture` est
/// nul.
pub(crate) fn definir_verrouillage(
    donnees: &mut DonneesRacine,
    delai_inactivite_minutes: u32,
    echecs_avant_fermeture: u32,
    horodatage: String,
) -> Result<(), ErreurParametrage> {
    if delai_inactivite_minutes == 0 || echecs_avant_fermeture == 0 {
        return Err(ErreurParametrage::ReglageApplicatifInvalide);
    }
    let avant = serde_json::to_value(&donnees.parametres.verrouillage).unwrap_or(Value::Null);
    donnees.parametres.verrouillage = crate::modele::racine::Verrouillage {
        delai_inactivite_minutes,
        echecs_avant_fermeture,
    };
    let apres = serde_json::to_value(&donnees.parametres.verrouillage).unwrap_or(Value::Null);
    consigner_modification(donnees, "parametres.verrouillage", avant, apres, horodatage);
    Ok(())
}

/// Modifie la concurrence par défaut d'une campagne d'audit (`parametres.audit.concurrence`), puis consigne la
/// modification au journal (US-034, RG-031, RNF-004).
///
/// # Erreurs
///
/// [`ErreurParametrage::ReglageApplicatifInvalide`] si `concurrence` est nulle.
pub(crate) fn definir_concurrence_audit(
    donnees: &mut DonneesRacine,
    concurrence: u32,
    horodatage: String,
) -> Result<(), ErreurParametrage> {
    if concurrence == 0 {
        return Err(ErreurParametrage::ReglageApplicatifInvalide);
    }
    let avant = Value::from(donnees.parametres.audit.concurrence);
    donnees.parametres.audit.concurrence = concurrence;
    consigner_modification(
        donnees,
        "parametres.audit.concurrence",
        avant,
        Value::from(concurrence),
        horodatage,
    );
    Ok(())
}

/// Modifie le réglage de proxy sortant (`parametres.proxy`), puis consigne la modification au journal (US-034,
/// RG-031). Une URL et un chemin de fascicule de certificats tous deux vides efface le réglage (retour au seul
/// proxy système).
///
/// # Erreurs
///
/// [`ErreurParametrage::ReglageApplicatifInvalide`] si `url` est non vide mais syntaxiquement invalide comme URL
/// (revalidation côté cœur natif d'une saisie déjà validée côté interface, cf.
/// `docs/02_documentation/15_normesSecurite.md#contrôle-des-entrées-et-sorties`).
pub(crate) fn definir_proxy(
    donnees: &mut DonneesRacine,
    url: Option<String>,
    chemin_bundle_ca: Option<String>,
    horodatage: String,
) -> Result<(), ErreurParametrage> {
    let url = url.filter(|url| !url.is_empty());
    let chemin_bundle_ca = chemin_bundle_ca.filter(|chemin| !chemin.is_empty());
    if let Some(url) = url.as_deref()
        && Url::parse(url).is_err()
    {
        return Err(ErreurParametrage::ReglageApplicatifInvalide);
    }

    let nouveau_proxy = match (&url, &chemin_bundle_ca) {
        (None, None) => None,
        _ => Some(Proxy {
            url,
            chemin_bundle_ca,
        }),
    };

    let avant = serde_json::to_value(&donnees.parametres.proxy).unwrap_or(Value::Null);
    let apres = serde_json::to_value(&nouveau_proxy).unwrap_or(Value::Null);
    donnees.parametres.proxy = nouveau_proxy;
    consigner_modification(donnees, "parametres.proxy", avant, apres, horodatage);
    Ok(())
}

/// Modifie le nombre de sauvegardes de sécurité conservées avant rotation
/// (`parametres.sauvegarde.nombreSauvegardesSecurite`), puis consigne la modification au journal (US-034, RG-003,
/// RG-031).
///
/// # Erreurs
///
/// [`ErreurParametrage::ReglageApplicatifInvalide`] si `nombre` est nul.
pub(crate) fn definir_nombre_sauvegardes_securite(
    donnees: &mut DonneesRacine,
    nombre: u32,
    horodatage: String,
) -> Result<(), ErreurParametrage> {
    if nombre == 0 {
        return Err(ErreurParametrage::ReglageApplicatifInvalide);
    }
    let avant = Value::from(donnees.parametres.sauvegarde.nombre_sauvegardes_securite);
    donnees.parametres.sauvegarde.nombre_sauvegardes_securite = nombre;
    consigner_modification(
        donnees,
        "parametres.sauvegarde.nombreSauvegardesSecurite",
        avant,
        Value::from(nombre),
        horodatage,
    );
    Ok(())
}

/// Modifie le seuil de taille, en octets, déclenchant l'avertissement contextuel de purge à la sauvegarde
/// (`parametres.seuilAvertissementTailleOctets`), puis consigne la modification au journal (US-035, RG-031,
/// RG-032).
///
/// # Erreurs
///
/// [`ErreurParametrage::ReglageApplicatifInvalide`] si `seuil_octets` est nul.
pub(crate) fn definir_seuil_avertissement_taille(
    donnees: &mut DonneesRacine,
    seuil_octets: u64,
    horodatage: String,
) -> Result<(), ErreurParametrage> {
    if seuil_octets == 0 {
        return Err(ErreurParametrage::ReglageApplicatifInvalide);
    }
    let avant = Value::from(donnees.parametres.seuil_avertissement_taille_octets);
    donnees.parametres.seuil_avertissement_taille_octets = seuil_octets;
    consigner_modification(
        donnees,
        "parametres.seuilAvertissementTailleOctets",
        avant,
        Value::from(seuil_octets),
        horodatage,
    );
    Ok(())
}

/// Position d'une entrée de référentiel-liste désignée par son identifiant, `None` si absente. Factorisé pour les
/// deux fonctions de suppression ci-dessous, sur le modèle de recherche déjà utilisé par [`upsert_par_id`].
fn position_par_id(regles: &[Value], id: &str) -> Option<usize> {
    regles.iter().position(|regle| {
        regle.as_object().and_then(|objet| objet.get("id")) == Some(&Value::String(id.to_string()))
    })
}

/// Supprime une entrée du référentiel des règles de dépendances (`referentiels.reglesDependances`), par son
/// identifiant, puis consigne la suppression au journal (US-033, RG-035).
///
/// Commande symétrique de `supprimerMembreConnu` (`persistance::administration`), retenue par arbitrage humain
/// (solution B, Phase 10 incrément 8) plutôt qu'une commande générique paramétrée par type de référentiel : le
/// motif de nommage des branches, valeur scalaire et non une liste, n'est structurellement pas concerné par cette
/// fonction (RG-035).
///
/// # Erreurs
///
/// [`ErreurParametrage::EntreeReferentielIntrouvable`] si `id` ne désigne aucune entrée existante.
pub(crate) fn supprimer_regle_dependance(
    donnees: &mut DonneesRacine,
    id: &str,
    horodatage: String,
) -> Result<(), ErreurParametrage> {
    let position = position_par_id(&donnees.referentiels.regles_dependances, id)
        .ok_or(ErreurParametrage::EntreeReferentielIntrouvable)?;
    let supprimee = donnees.referentiels.regles_dependances.remove(position);
    consigner_modification(
        donnees,
        &format!("referentiels.reglesDependances/{id}"),
        supprimee,
        Value::Null,
        horodatage,
    );
    Ok(())
}

/// Supprime une entrée du référentiel des règles de marqueurs IA (`referentiels.reglesMarqueursIA`), par son
/// identifiant, puis consigne la suppression au journal (US-033, RG-035). Cf. [`supprimer_regle_dependance`] pour
/// la justification du choix de deux fonctions dédiées plutôt qu'une commande générique.
///
/// # Erreurs
///
/// [`ErreurParametrage::EntreeReferentielIntrouvable`] si `id` ne désigne aucune entrée existante.
pub(crate) fn supprimer_regle_marqueur_ia(
    donnees: &mut DonneesRacine,
    id: &str,
    horodatage: String,
) -> Result<(), ErreurParametrage> {
    let position = position_par_id(&donnees.referentiels.regles_marqueurs_ia, id)
        .ok_or(ErreurParametrage::EntreeReferentielIntrouvable)?;
    let supprimee = donnees.referentiels.regles_marqueurs_ia.remove(position);
    consigner_modification(
        donnees,
        &format!("referentiels.reglesMarqueursIA/{id}"),
        supprimee,
        Value::Null,
        horodatage,
    );
    Ok(())
}

/// Supprime une entrée du référentiel des catégories de dépendance (`referentiels.categoriesDependances`), par son
/// identifiant, puis consigne la suppression au journal (US-048, RG-035). Cf. [`supprimer_regle_dependance`] pour la
/// justification du choix de fonctions dédiées plutôt qu'une commande générique.
///
/// # Erreurs
///
/// [`ErreurParametrage::EntreeReferentielIntrouvable`] si `id` ne désigne aucune entrée existante.
pub(crate) fn supprimer_categorie_dependance(
    donnees: &mut DonneesRacine,
    id: &str,
    horodatage: String,
) -> Result<(), ErreurParametrage> {
    let position = position_par_id(&donnees.referentiels.categories_dependances, id)
        .ok_or(ErreurParametrage::EntreeReferentielIntrouvable)?;
    let supprimee = donnees.referentiels.categories_dependances.remove(position);
    consigner_modification(
        donnees,
        &format!("referentiels.categoriesDependances/{id}"),
        supprimee,
        Value::Null,
        horodatage,
    );
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
        // La règle `java` semée par défaut (US-050) est retirée ici : les tests de ce module portent sur le CRUD
        // du référentiel et raisonnent sur un référentiel de dépendances initialement vide.
        racine.referentiels.regles_dependances.clear();
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
    fn definir_referentiel_regles_dependances_avec_categorie_valide_est_accepte()
    -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();

        definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d1", "motif": "moment", "versions": [], "categorie": "c1" }),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        assert_eq!(
            racine.referentiels.regles_dependances[0]["categorie"],
            json!("c1")
        );
        Ok(())
    }

    #[test]
    fn definir_referentiel_regles_dependances_avec_categorie_vide_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d1", "motif": "moment", "versions": [], "categorie": "" }),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurParametrage::EntreeReferentielInvalide));
        assert!(racine.referentiels.regles_dependances.is_empty());
    }

    #[test]
    fn definir_referentiel_regles_dependances_motif_deja_existant_est_rejete_a_la_creation()
    -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();
        definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d1", "motif": "moment", "versions": [] }),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        let resultat = definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d2", "motif": "moment", "versions": [] }),
            "2026-07-27T10:00:00Z".to_string(),
        );

        assert_eq!(
            resultat,
            Err(ErreurParametrage::MotifDependanceDejaExistant)
        );
        assert_eq!(racine.referentiels.regles_dependances.len(), 1);
        assert_eq!(racine.journal.len(), 1);
        Ok(())
    }

    #[test]
    fn definir_referentiel_regles_dependances_mise_a_jour_sans_changer_le_motif_est_acceptee()
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
            json!({ "id": "d1", "motif": "moment", "versions": [{ "motifVersion": "*", "statut": "obsolete" }] }),
            "2026-07-27T10:00:00Z".to_string(),
        )?;

        assert_eq!(racine.referentiels.regles_dependances.len(), 1);
        Ok(())
    }

    #[test]
    fn definir_referentiel_regles_dependances_deux_motifs_differents_est_accepte()
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
            json!({ "id": "d2", "motif": "lodash", "versions": [] }),
            "2026-07-27T10:00:00Z".to_string(),
        )?;

        assert_eq!(racine.referentiels.regles_dependances.len(), 2);
        Ok(())
    }

    #[test]
    fn definir_referentiel_regles_dependances_element_versions_sans_motif_version_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d1", "motif": "moment", "versions": [{ "statut": "obsolete" }] }),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurParametrage::EntreeReferentielInvalide));
        assert!(racine.referentiels.regles_dependances.is_empty());
    }

    #[test]
    fn definir_referentiel_regles_dependances_element_versions_sans_statut_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d1", "motif": "moment", "versions": [{ "motifVersion": "*" }] }),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurParametrage::EntreeReferentielInvalide));
    }

    #[test]
    fn definir_referentiel_regles_dependances_element_versions_statut_vide_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d1", "motif": "moment", "versions": [{ "motifVersion": "*", "statut": "" }] }),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurParametrage::EntreeReferentielInvalide));
    }

    #[test]
    fn definir_referentiel_regles_dependances_element_versions_non_objet_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d1", "motif": "moment", "versions": ["pas-un-objet"] }),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurParametrage::EntreeReferentielInvalide));
    }

    #[test]
    fn definir_referentiel_regles_dependances_statut_hors_liste_connue_est_accepte()
    -> Result<(), ErreurParametrage> {
        // RG-043 : le cœur natif ne ferme jamais l'ensemble des valeurs de `statut` (champ libre, RG-022) ; seule
        // l'interface avertit, sans bloquer, sur un statut hors des quatre valeurs reconnues.
        let mut racine = racine_de_test();

        definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d1", "motif": "moment", "versions": [{ "motifVersion": "*", "statut": "statutInconnu" }] }),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        assert_eq!(racine.referentiels.regles_dependances.len(), 1);
        Ok(())
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

    #[test]
    fn definir_referentiels_toutes_reussissent_et_journalise_une_entree_par_ligne() {
        let mut racine = racine_de_test();

        let reussites = definir_referentiels(
            &mut racine,
            "reglesDependances",
            vec![
                json!({ "id": "d1", "motif": "moment", "versions": [] }),
                json!({ "id": "d2", "motif": "lodash", "versions": [] }),
            ],
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(reussites, vec![true, true]);
        assert_eq!(racine.referentiels.regles_dependances.len(), 2);
        assert_eq!(racine.journal.len(), 2);
    }

    #[test]
    fn definir_referentiels_echec_partiel_au_milieu_du_lot_continue_avec_les_suivantes() {
        let mut racine = racine_de_test();
        // Champ manquant sur l'entrée du milieu (EntreeReferentielInvalide) : ne doit pas empêcher la troisième.
        let reussites = definir_referentiels(
            &mut racine,
            "reglesDependances",
            vec![
                json!({ "id": "d1", "motif": "moment", "versions": [] }),
                json!({ "id": "d2", "versions": [] }),
                json!({ "id": "d3", "motif": "lodash", "versions": [] }),
            ],
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(reussites, vec![true, false, true]);
        assert_eq!(racine.referentiels.regles_dependances.len(), 2);
        assert_eq!(racine.journal.len(), 2);
    }

    #[test]
    fn definir_referentiels_detecte_un_motif_duplique_entre_deux_entrees_du_meme_lot() {
        let mut racine = racine_de_test();
        // Deux entrées distinctes (id différents) portant le même motif : la seconde doit être rejetée par RG-042,
        // la première ayant déjà été appliquée en mémoire par l'appel précédent de la boucle.
        let reussites = definir_referentiels(
            &mut racine,
            "reglesDependances",
            vec![
                json!({ "id": "d1", "motif": "moment", "versions": [] }),
                json!({ "id": "d2", "motif": "moment", "versions": [] }),
            ],
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(reussites, vec![true, false]);
        assert_eq!(racine.referentiels.regles_dependances.len(), 1);
        assert_eq!(racine.journal.len(), 1);
    }

    #[test]
    fn definir_referentiels_lot_vide_ne_fait_rien() {
        let mut racine = racine_de_test();

        let reussites = definir_referentiels(
            &mut racine,
            "reglesDependances",
            vec![],
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert!(reussites.is_empty());
        assert!(racine.referentiels.regles_dependances.is_empty());
        assert!(racine.journal.is_empty());
    }

    #[test]
    fn definir_verrouillage_remplace_les_deux_champs() -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();

        definir_verrouillage(&mut racine, 30, 3, "2026-07-27T09:00:00Z".to_string())?;

        assert_eq!(racine.parametres.verrouillage.delai_inactivite_minutes, 30);
        assert_eq!(racine.parametres.verrouillage.echecs_avant_fermeture, 3);
        assert_eq!(racine.journal[0].objet, "parametres.verrouillage");
        Ok(())
    }

    #[test]
    fn definir_verrouillage_delai_nul_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_verrouillage(&mut racine, 0, 3, "2026-07-27T09:00:00Z".to_string());

        assert_eq!(resultat, Err(ErreurParametrage::ReglageApplicatifInvalide));
        assert!(racine.journal.is_empty());
    }

    #[test]
    fn definir_verrouillage_echecs_nul_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_verrouillage(&mut racine, 30, 0, "2026-07-27T09:00:00Z".to_string());

        assert_eq!(resultat, Err(ErreurParametrage::ReglageApplicatifInvalide));
    }

    #[test]
    fn definir_concurrence_audit_remplace_la_valeur() -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();

        definir_concurrence_audit(&mut racine, 8, "2026-07-27T09:00:00Z".to_string())?;

        assert_eq!(racine.parametres.audit.concurrence, 8);
        assert_eq!(racine.journal[0].objet, "parametres.audit.concurrence");
        Ok(())
    }

    #[test]
    fn definir_concurrence_audit_nulle_est_rejetee() {
        let mut racine = racine_de_test();

        let resultat =
            definir_concurrence_audit(&mut racine, 0, "2026-07-27T09:00:00Z".to_string());

        assert_eq!(resultat, Err(ErreurParametrage::ReglageApplicatifInvalide));
        assert!(racine.journal.is_empty());
    }

    #[test]
    fn definir_proxy_enregistre_url_et_bundle_ca() -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();

        definir_proxy(
            &mut racine,
            Some("http://proxy.exemple.local:3128".to_string()),
            Some("/etc/ssl/ca-supplementaire.pem".to_string()),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        assert_eq!(
            racine
                .parametres
                .proxy
                .as_ref()
                .and_then(|proxy| proxy.url.as_deref()),
            Some("http://proxy.exemple.local:3128")
        );
        assert_eq!(
            racine
                .parametres
                .proxy
                .as_ref()
                .and_then(|proxy| proxy.chemin_bundle_ca.as_deref()),
            Some("/etc/ssl/ca-supplementaire.pem")
        );
        assert_eq!(racine.journal[0].objet, "parametres.proxy");
        Ok(())
    }

    #[test]
    fn definir_proxy_url_et_chemin_vides_efface_le_reglage() -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();
        definir_proxy(
            &mut racine,
            Some("http://proxy.exemple.local:3128".to_string()),
            None,
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        definir_proxy(&mut racine, None, None, "2026-07-27T10:00:00Z".to_string())?;

        assert_eq!(racine.parametres.proxy, None);
        Ok(())
    }

    #[test]
    fn definir_proxy_url_syntaxiquement_invalide_est_rejetee() {
        let mut racine = racine_de_test();

        let resultat = definir_proxy(
            &mut racine,
            Some("pas-une-url".to_string()),
            None,
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurParametrage::ReglageApplicatifInvalide));
        assert!(racine.journal.is_empty());
    }

    #[test]
    fn definir_nombre_sauvegardes_securite_remplace_la_valeur() -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();

        definir_nombre_sauvegardes_securite(&mut racine, 10, "2026-07-27T09:00:00Z".to_string())?;

        assert_eq!(racine.parametres.sauvegarde.nombre_sauvegardes_securite, 10);
        assert_eq!(
            racine.journal[0].objet,
            "parametres.sauvegarde.nombreSauvegardesSecurite"
        );
        Ok(())
    }

    #[test]
    fn definir_nombre_sauvegardes_securite_nul_est_rejete() {
        let mut racine = racine_de_test();

        let resultat =
            definir_nombre_sauvegardes_securite(&mut racine, 0, "2026-07-27T09:00:00Z".to_string());

        assert_eq!(resultat, Err(ErreurParametrage::ReglageApplicatifInvalide));
        assert!(racine.journal.is_empty());
    }

    #[test]
    fn definir_seuil_avertissement_taille_remplace_la_valeur() -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();

        definir_seuil_avertissement_taille(
            &mut racine,
            5_000_000,
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        assert_eq!(
            racine.parametres.seuil_avertissement_taille_octets,
            5_000_000
        );
        assert_eq!(
            racine.journal[0].objet,
            "parametres.seuilAvertissementTailleOctets"
        );
        Ok(())
    }

    #[test]
    fn definir_seuil_avertissement_taille_nul_est_rejete() {
        let mut racine = racine_de_test();

        let resultat =
            definir_seuil_avertissement_taille(&mut racine, 0, "2026-07-27T09:00:00Z".to_string());

        assert_eq!(resultat, Err(ErreurParametrage::ReglageApplicatifInvalide));
    }

    #[test]
    fn supprimer_regle_dependance_retire_lentree_et_consigne_le_journal()
    -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();
        definir_referentiel(
            &mut racine,
            "reglesDependances",
            json!({ "id": "d1", "motif": "moment", "versions": [] }),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        supprimer_regle_dependance(&mut racine, "d1", "2026-07-27T10:00:00Z".to_string())?;

        assert!(racine.referentiels.regles_dependances.is_empty());
        let derniere_entree = &racine.journal[1];
        assert_eq!(derniere_entree.objet, "referentiels.reglesDependances/d1");
        assert_eq!(derniere_entree.apres, Value::Null);
        Ok(())
    }

    #[test]
    fn supprimer_regle_dependance_introuvable_est_rejetee() {
        let mut racine = racine_de_test();

        let resultat = supprimer_regle_dependance(
            &mut racine,
            "inexistante",
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(
            resultat,
            Err(ErreurParametrage::EntreeReferentielIntrouvable)
        );
    }

    #[test]
    fn supprimer_regle_marqueur_ia_retire_lentree_et_consigne_le_journal()
    -> Result<(), ErreurParametrage> {
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

        supprimer_regle_marqueur_ia(&mut racine, "m1", "2026-07-27T10:00:00Z".to_string())?;

        assert!(racine.referentiels.regles_marqueurs_ia.is_empty());
        let derniere_entree = &racine.journal[1];
        assert_eq!(derniere_entree.objet, "referentiels.reglesMarqueursIA/m1");
        Ok(())
    }

    #[test]
    fn supprimer_regle_marqueur_ia_introuvable_est_rejetee() {
        let mut racine = racine_de_test();

        let resultat = supprimer_regle_marqueur_ia(
            &mut racine,
            "inexistante",
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(
            resultat,
            Err(ErreurParametrage::EntreeReferentielIntrouvable)
        );
    }

    #[test]
    fn definir_referentiel_categories_dependances_cree_une_entree() -> Result<(), ErreurParametrage>
    {
        let mut racine = racine_de_test();
        let nombre_par_defaut = racine.referentiels.categories_dependances.len();

        definir_referentiel(
            &mut racine,
            "categoriesDependances",
            json!({ "id": "c1", "libelle": "fmkMobile", "sigle": "FMM" }),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        assert_eq!(
            racine.referentiels.categories_dependances.len(),
            nombre_par_defaut + 1
        );
        let entree = &racine.journal[0];
        assert_eq!(entree.objet, "referentiels.categoriesDependances/c1");
        assert_eq!(entree.avant, Value::Null);
        Ok(())
    }

    #[test]
    fn definir_referentiel_categories_dependances_libelle_manquant_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_referentiel(
            &mut racine,
            "categoriesDependances",
            json!({ "id": "c1", "sigle": "FMM" }),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurParametrage::EntreeReferentielInvalide));
    }

    #[test]
    fn definir_referentiel_categories_dependances_sigle_trop_long_est_rejete() {
        let mut racine = racine_de_test();

        let resultat = definir_referentiel(
            &mut racine,
            "categoriesDependances",
            json!({ "id": "c1", "libelle": "fmkMobile", "sigle": "TROP" }),
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(resultat, Err(ErreurParametrage::EntreeReferentielInvalide));
    }

    #[test]
    fn definir_referentiel_categories_dependances_sigle_absent_est_accepte()
    -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();

        definir_referentiel(
            &mut racine,
            "categoriesDependances",
            json!({ "id": "c1", "libelle": "fmkMobile" }),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        assert!(
            racine
                .referentiels
                .categories_dependances
                .iter()
                .any(|categorie| categorie["id"] == json!("c1"))
        );
        Ok(())
    }

    #[test]
    fn definir_referentiel_categories_dependances_libelle_deja_existant_est_rejete()
    -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();
        definir_referentiel(
            &mut racine,
            "categoriesDependances",
            json!({ "id": "c1", "libelle": "fmkMobile", "sigle": "FMM" }),
            "2026-07-27T09:00:00Z".to_string(),
        )?;
        let journal_avant = racine.journal.len();

        let resultat = definir_referentiel(
            &mut racine,
            "categoriesDependances",
            json!({ "id": "c2", "libelle": "fmkMobile", "sigle": "FM2" }),
            "2026-07-27T10:00:00Z".to_string(),
        );

        assert_eq!(
            resultat,
            Err(ErreurParametrage::LibelleCategorieDependanceDejaExistant)
        );
        assert_eq!(racine.journal.len(), journal_avant);
        Ok(())
    }

    #[test]
    fn definir_referentiel_categories_dependances_mise_a_jour_sans_changer_le_libelle_est_acceptee()
    -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();
        definir_referentiel(
            &mut racine,
            "categoriesDependances",
            json!({ "id": "c1", "libelle": "fmkMobile", "sigle": "FMM" }),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        definir_referentiel(
            &mut racine,
            "categoriesDependances",
            json!({ "id": "c1", "libelle": "fmkMobile", "sigle": "MOB" }),
            "2026-07-27T10:00:00Z".to_string(),
        )?;

        let sigle = racine
            .referentiels
            .categories_dependances
            .iter()
            .find(|categorie| categorie["id"] == json!("c1"))
            .map(|categorie| categorie["sigle"].clone());
        assert_eq!(sigle, Some(json!("MOB")));
        Ok(())
    }

    #[test]
    fn supprimer_categorie_dependance_retire_lentree_et_consigne_le_journal()
    -> Result<(), ErreurParametrage> {
        let mut racine = racine_de_test();
        definir_referentiel(
            &mut racine,
            "categoriesDependances",
            json!({ "id": "c1", "libelle": "fmkMobile", "sigle": "FMM" }),
            "2026-07-27T09:00:00Z".to_string(),
        )?;

        supprimer_categorie_dependance(&mut racine, "c1", "2026-07-27T10:00:00Z".to_string())?;

        assert!(
            !racine
                .referentiels
                .categories_dependances
                .iter()
                .any(|categorie| categorie["id"] == json!("c1"))
        );
        let derniere_entree = &racine.journal[racine.journal.len() - 1];
        assert_eq!(
            derniere_entree.objet,
            "referentiels.categoriesDependances/c1"
        );
        assert_eq!(derniere_entree.apres, Value::Null);
        Ok(())
    }

    #[test]
    fn supprimer_categorie_dependance_introuvable_est_rejetee() {
        let mut racine = racine_de_test();

        let resultat = supprimer_categorie_dependance(
            &mut racine,
            "inexistante",
            "2026-07-27T09:00:00Z".to_string(),
        );

        assert_eq!(
            resultat,
            Err(ErreurParametrage::EntreeReferentielIntrouvable)
        );
    }
}
