// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Export et import de la configuration partageable, portés par l'onglet Export/Import de l'écran de Paramétrage
//! de la Phase 9, incrément 3 (US-029, US-030 ; RG-028, RG-029), cf.
//! `docs/01_besoin/Specification.md#523-f23--export-et-import-de-configuration` : « un JSON non chiffré couvrant
//! strictement `parametres.seuils` + `referentiels` ... jamais les membres connus, ni les vues, ni les données de
//! groupes ».
//!
//! Contrairement aux autres modules de `persistance::` (`parametrage`, `vues`, `purge`), celui-ci touche
//! directement le disque (lecture/écriture du fichier de configuration en clair, distinct du fichier de données
//! chiffré) : décision de conception propre à cet incrément (à valider par un humain, cf. rapport de développement)
//! reprenant la même responsabilité que `persistance::moteur` pour le fichier de données, plutôt que de faire
//! remonter cette lecture/écriture en clair jusqu'à la Façade de commandes (`commandes::configuration_partageable`),
//! qui ne fait par ailleurs jamais elle-même d'entrée/sortie disque directe dans le reste du projet.
//!
//! Aucun nom de commande, de fonction ni de structure de différentiel n'est fourni littéralement par
//! `docs/02_documentation/13_conceptionDetaillee.md` pour cette fonctionnalité (décision arbitraire, cf. rapport de
//! développement de cet incrément) : le différentiel à trois catégories (ajout, modification, identique) reprend le
//! vocabulaire exact de `Specification.md#523-f23` (« différentiel à trois colonnes »), une ligne par entrée de
//! référentiel-liste (`reglesDependances`/`reglesMarqueursIA`/`categoriesDependances`, identifiée par son `id`),
//! par le motif de nommage de
//! branche (valeur scalaire) et par feuille de `parametres.seuils` (chemin pointé obtenu par aplanissement
//! récursif de l'objet JSON, sur le même principe que le chemin pointé déjà utilisé par `definir_seuil`).
//!
//! L'application d'une ligne acceptée ne fait jamais confiance à la sélection proposée par l'interface (cf.
//! `docs/02_documentation/15_normesSecurite.md#contrôle-des-entrées-et-sorties`) : `importer_configuration`
//! recalcule lui-même le différentiel à partir du contenu actuellement relu du fichier de configuration désigné,
//! puis vérifie que chaque chemin accepté y correspond réellement avant toute mutation ; toute incohérence (état
//! obsolète) rejette l'import dans son intégralité, sans appliquer aucune ligne (RG-029 : « application
//! transactionnelle, tout ou rien »).
//!
//! Correction post-relecture (Phase 9, incrément 3, arbitrage humain explicite) : la voie d'import réutilise
//! désormais les mêmes validateurs que la saisie manuelle de `parametrage::definir_referentiel`
//! (`valider_entree_regles_dependances`, `valider_entree_regles_marqueurs_ia`,
//! `valider_entree_categorie_dependance`, `valider_motif_nommage_branches`)
//! pour ne jamais être moins stricte qu'elle sur les mêmes données ; une entrée importée qui échoue à cette
//! validation (motif de nommage syntaxiquement invalide, champ obligatoire manquant, `id` absent compris) n'est
//! jamais proposée à l'acceptation, mais reste explicitement signalée à l'utilisateur (`lignes_invalides`) plutôt
//! que silencieusement exclue comme la version initiale de cet incrément le faisait pour la seule absence d'`id`.

use crate::modele::racine::{DonneesRacine, EntreeJournal, Referentiels, VERSION_SCHEMA_COURANTE};
use crate::persistance::erreurs::ErreurPersistance;
use crate::persistance::migration::{ETAPES_MIGRATION_REELLES, appliquer_migrations};
use crate::persistance::parametrage::{
    ErreurParametrage, upsert_par_id, valider_entree_categorie_dependance,
    valider_entree_regles_dependances, valider_entree_regles_marqueurs_ia,
    valider_motif_nommage_branches,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::Path;
use thiserror::Error;

/// Anomalie pouvant survenir lors de l'export ou de l'import de la configuration partageable (US-029, US-030).
#[derive(Debug, Error, PartialEq, Eq)]
pub(crate) enum ErreurConfigurationPartageable {
    /// Le fichier désigné est illisible (absent, droits insuffisants, erreur d'entrée/sortie).
    #[error("le fichier de configuration est illisible ou introuvable")]
    FichierIllisible,
    /// Le contenu du fichier n'est pas un JSON reconnu comme une configuration partageable valide.
    #[error("le contenu du fichier de configuration n'est pas reconnu")]
    FormatNonReconnu,
    /// Le fichier de configuration a été produit par une version de schéma plus récente que celle de
    /// l'application (F23 : « vérification de la version de schéma ... plus récente = refus expliqué »).
    #[error(
        "le fichier de configuration a été produit par une version plus récente de l'application"
    )]
    VersionSchemaSuperieure,
    /// Une ligne acceptée par l'appelant ne correspond à aucune ligne du différentiel recalculé sur le contenu
    /// actuel (état obsolète, ex. fichier modifié entre la prévisualisation et la confirmation) : l'import entier
    /// est rejeté (RG-029, « tout ou rien »), sans qu'aucune ligne n'ait été appliquée.
    #[error(
        "une ligne acceptée ne correspond à aucune ligne du différentiel recalculé (état obsolète)"
    )]
    LigneDifferentielInconnue,
}

/// Contenu exportable/importable de F23 : strictement les seuils et référentiels partageables (RG-028), jamais les
/// membres connus, les vues enregistrées, ni aucune autre donnée de groupe.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ConfigurationPartageable {
    /// Version de schéma au moment de l'export, fondement exclusif de la migration à la volée d'un import plus
    /// ancien (même mécanique que `DonneesRacine.versionSchema`).
    pub(crate) version_schema: u32,
    /// Grilles de lecture partageables (référentiels), mirroir strict de `DonneesRacine.referentiels`.
    #[serde(default)]
    pub(crate) referentiels: Referentiels,
    /// Grille de seuils du Moteur de jugement, mirroir strict de `DonneesRacine.parametres.seuils`.
    #[serde(default)]
    pub(crate) seuils: Value,
}

/// Catégorie d'une ligne du différentiel d'import (RG-029, « différentiel à trois colonnes »).
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CategorieLigneDifferentiel {
    /// La valeur importée n'existe pas dans la configuration actuelle.
    Ajout,
    /// La valeur importée diffère de la valeur actuelle.
    Modification,
    /// La valeur importée est strictement identique à la valeur actuelle.
    Identique,
}

/// Ligne du différentiel entre la configuration actuelle et celle importée.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LigneDifferentielImport {
    /// Chemin stable identifiant la valeur concernée (ex. `parametres.seuils.vitalite.mortJours`,
    /// `referentiels.reglesDependances/d1`, `referentiels.motifNommageBranches`).
    pub(crate) chemin: String,
    /// Catégorie de la ligne.
    pub(crate) categorie: CategorieLigneDifferentiel,
    /// Valeur actuelle, absente si la ligne est un ajout.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) avant: Option<Value>,
    /// Valeur importée.
    pub(crate) apres: Value,
}

/// Ligne d'une entrée importée structurellement invalide (motif de nommage de branche syntaxiquement incorrect,
/// entrée de référentiel-liste dépourvue de ses champs obligatoires), jamais proposée à l'acceptation, signalée
/// explicitement à l'utilisateur plutôt que silencieusement exclue ou appliquée sans contrôle (correction
/// post-relecture, Phase 9 incrément 3 : la voie d'import ne doit jamais être moins stricte que la saisie manuelle
/// équivalente, `parametrage::definir_referentiel`, décision humaine actée de rendre cette exclusion visible).
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LigneInvalideImport {
    /// Chemin stable de la ligne concernée, sur le même format que [`LigneDifferentielImport::chemin`] (identifiant
    /// de repli `{prefixe}/?` si l'entrée est dépourvue d'`id` exploitable).
    pub(crate) chemin: String,
    /// Motif de l'invalidité, message technique de [`ErreurParametrage`] (jamais un credential ni une donnée
    /// sensible, cf. `docs/02_documentation/15_normesSecurite.md`).
    pub(crate) motif: String,
}

/// Différentiel complet entre la configuration actuelle et celle importée (US-030).
#[derive(Debug, Clone, Serialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DifferentielImportConfiguration {
    /// Lignes du différentiel, dans l'ordre : motif de nommage de branche, règles de dépendances, règles de
    /// marqueurs IA, catégories de dépendance, puis feuilles de `parametres.seuils`.
    pub(crate) lignes: Vec<LigneDifferentielImport>,
    /// Lignes importées structurellement invalides, jamais proposées à l'acceptation (cf. [`LigneInvalideImport`]).
    #[serde(default)]
    pub(crate) lignes_invalides: Vec<LigneInvalideImport>,
}

/// Exporte la configuration partageable courante (US-029, RG-028) : strictement `referentiels` et
/// `parametres.seuils`, jamais les membres connus ni aucune autre donnée de groupe.
pub(crate) fn exporter_configuration(donnees: &DonneesRacine) -> ConfigurationPartageable {
    ConfigurationPartageable {
        version_schema: donnees.version_schema,
        referentiels: donnees.referentiels.clone(),
        seuils: donnees.parametres.seuils.clone(),
    }
}

/// Écrit la configuration exportée en clair (JSON indenté, lisible et diffable par l'utilisateur) au chemin
/// désigné (US-029).
pub(crate) fn ecrire_configuration(
    chemin: &Path,
    configuration: &ConfigurationPartageable,
) -> Result<(), ErreurConfigurationPartageable> {
    let json = serde_json::to_string_pretty(configuration)
        .map_err(|_| ErreurConfigurationPartageable::FormatNonReconnu)?;
    std::fs::write(chemin, json).map_err(|_| ErreurConfigurationPartageable::FichierIllisible)
}

/// Lit un fichier de configuration partageable et applique la migration à la volée si sa version de schéma est
/// antérieure à la version courante (F23), en réutilisant le même registre de migrations que le fichier de données
/// (`crate::persistance::migration::ETAPES_MIGRATION_REELLES`) : décision arbitraire de cet incrément (à valider
/// par un humain, cf. rapport de développement), aucune migration dédiée à la configuration partageable seule
/// n'étant fournie par la documentation source. Refuse explicitement un fichier plus récent plutôt que de le
/// migrer de façon hasardeuse (même politique que `crate::persistance::moteur::charger_fichier`).
///
/// Conséquence assumée (relecture N11) : `migration_5_vers_6` insérant la règle de dépendances `java` par défaut
/// (US-050) quand elle est absente, l'import d'une configuration antérieure à la version 6 fait apparaître cette
/// règle comme une ligne « Ajout » du différentiel — l'utilisateur reste libre de ne pas l'accepter, comme pour
/// toute autre ligne.
fn lire_configuration(chemin: &Path) -> Result<Value, ErreurConfigurationPartageable> {
    let contenu = std::fs::read_to_string(chemin)
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;
    let mut valeur: Value = serde_json::from_str(&contenu)
        .map_err(|_| ErreurConfigurationPartageable::FormatNonReconnu)?;

    appliquer_migrations(
        &mut valeur,
        VERSION_SCHEMA_COURANTE,
        ETAPES_MIGRATION_REELLES,
    )
    .map_err(|erreur| match erreur {
        ErreurPersistance::VersionSchemaSuperieure { .. } => {
            ErreurConfigurationPartageable::VersionSchemaSuperieure
        }
        _ => ErreurConfigurationPartageable::FormatNonReconnu,
    })?;

    if !valeur.is_object() {
        return Err(ErreurConfigurationPartageable::FormatNonReconnu);
    }
    Ok(valeur)
}

/// Aplanit récursivement un objet JSON en une liste de chemins pointés (segments séparés par `.`) associés à leur
/// valeur feuille, sur le même principe que le chemin pointé déjà utilisé par `parametrage::definir_seuil`. Une
/// valeur non-objet à la racine (y compris un objet vide) est elle-même traitée comme une feuille unique.
fn aplanir_json(valeur: &Value, prefixe: &str, sortie: &mut Vec<(String, Value)>) {
    match valeur.as_object() {
        Some(objet) if !objet.is_empty() => {
            for (cle, sous_valeur) in objet {
                let chemin = if prefixe.is_empty() {
                    cle.clone()
                } else {
                    format!("{prefixe}.{cle}")
                };
                aplanir_json(sous_valeur, &chemin, sortie);
            }
        }
        _ => {
            if !prefixe.is_empty() {
                sortie.push((prefixe.to_string(), valeur.clone()));
            }
        }
    }
}

/// Lit la valeur au chemin pointé désigné (segments séparés par `.`) d'un objet JSON, `None` si un segment
/// intermédiaire est absent ou n'est pas un objet.
fn lire_chemin_pointe<'a>(valeur: &'a Value, chemin: &str) -> Option<&'a Value> {
    chemin
        .split('.')
        .try_fold(valeur, |courant, segment| courant.get(segment))
}

/// Construit une ligne de différentiel scalaire, catégorisée par comparaison directe entre `avant` et `apres`.
fn ligne_scalaire(
    lignes: &mut Vec<LigneDifferentielImport>,
    chemin: String,
    avant: Option<Value>,
    apres: Value,
) {
    let categorie = match &avant {
        Some(valeur_avant) if *valeur_avant == apres => CategorieLigneDifferentiel::Identique,
        Some(_) => CategorieLigneDifferentiel::Modification,
        None => CategorieLigneDifferentiel::Ajout,
    };
    lignes.push(LigneDifferentielImport {
        chemin,
        categorie,
        avant,
        apres,
    });
}

/// Ajoute une ligne par entrée importée d'un référentiel-liste
/// (`reglesDependances`/`reglesMarqueursIA`/`categoriesDependances`), validée
/// au préalable par `valider` (la même fonction que celle appliquée par `parametrage::definir_referentiel` à la
/// saisie manuelle, RG-023 : la voie d'import ne doit jamais être moins stricte), puis appariée à l'entrée
/// courante de même `id`. Une entrée importée invalide (`id` manquant compris) est signalée dans
/// `lignes_invalides` plutôt qu'exclue silencieusement ou appliquée sans contrôle (correction post-relecture, cf.
/// commentaire de [`LigneInvalideImport`]).
fn ajouter_lignes_referentiel_liste(
    lignes: &mut Vec<LigneDifferentielImport>,
    lignes_invalides: &mut Vec<LigneInvalideImport>,
    prefixe: &str,
    liste_courante: &[Value],
    liste_importee: Option<&Value>,
    valider: fn(&Value) -> Result<&str, ErreurParametrage>,
) {
    let Some(entrees_importees) = liste_importee.and_then(Value::as_array) else {
        return;
    };
    for entree in entrees_importees {
        match valider(entree) {
            Ok(id) => {
                let existante = liste_courante
                    .iter()
                    .find(|regle| regle.get("id").and_then(Value::as_str) == Some(id));
                ligne_scalaire(
                    lignes,
                    format!("{prefixe}/{id}"),
                    existante.cloned(),
                    entree.clone(),
                );
            }
            Err(erreur) => {
                let identifiant = entree.get("id").and_then(Value::as_str).unwrap_or("?");
                lignes_invalides.push(LigneInvalideImport {
                    chemin: format!("{prefixe}/{identifiant}"),
                    motif: erreur.to_string(),
                });
            }
        }
    }
}

/// Calcule le différentiel entre la configuration actuelle de `donnees` et celle portée par `configuration_importee`
/// (déjà migrée à la version de schéma courante par {@link lire_configuration}).
fn calculer_differentiel(
    donnees: &DonneesRacine,
    configuration_importee: &Value,
) -> DifferentielImportConfiguration {
    let mut lignes = Vec::new();
    let mut lignes_invalides = Vec::new();

    if let Some(motif_importe) =
        configuration_importee.pointer("/referentiels/motifNommageBranches")
    {
        match valider_motif_nommage_branches(motif_importe) {
            Ok(_) => ligne_scalaire(
                &mut lignes,
                "referentiels.motifNommageBranches".to_string(),
                Some(Value::String(
                    donnees.referentiels.motif_nommage_branches.clone(),
                )),
                motif_importe.clone(),
            ),
            Err(erreur) => lignes_invalides.push(LigneInvalideImport {
                chemin: "referentiels.motifNommageBranches".to_string(),
                motif: erreur.to_string(),
            }),
        }
    }

    ajouter_lignes_referentiel_liste(
        &mut lignes,
        &mut lignes_invalides,
        "referentiels.reglesDependances",
        &donnees.referentiels.regles_dependances,
        configuration_importee.pointer("/referentiels/reglesDependances"),
        valider_entree_regles_dependances,
    );
    ajouter_lignes_referentiel_liste(
        &mut lignes,
        &mut lignes_invalides,
        "referentiels.reglesMarqueursIA",
        &donnees.referentiels.regles_marqueurs_ia,
        configuration_importee.pointer("/referentiels/reglesMarqueursIA"),
        valider_entree_regles_marqueurs_ia,
    );
    ajouter_lignes_referentiel_liste(
        &mut lignes,
        &mut lignes_invalides,
        "referentiels.categoriesDependances",
        &donnees.referentiels.categories_dependances,
        configuration_importee.pointer("/referentiels/categoriesDependances"),
        valider_entree_categorie_dependance,
    );

    let mut feuilles_importees = Vec::new();
    if let Some(seuils_importes) = configuration_importee.pointer("/seuils") {
        aplanir_json(seuils_importes, "", &mut feuilles_importees);
    }
    for (chemin_relatif, valeur_importee) in feuilles_importees {
        let valeur_courante =
            lire_chemin_pointe(&donnees.parametres.seuils, &chemin_relatif).cloned();
        ligne_scalaire(
            &mut lignes,
            format!("parametres.seuils.{chemin_relatif}"),
            valeur_courante,
            valeur_importee,
        );
    }

    DifferentielImportConfiguration {
        lignes,
        lignes_invalides,
    }
}

/// Prévisualise l'import d'un fichier de configuration partageable (US-030) : lit et migre le fichier désigné si
/// nécessaire, puis calcule son différentiel avec la configuration actuelle. Aucune modification ni sauvegarde
/// (consultation pure, pas de mot de passe requis).
pub(crate) fn previsualiser_import_configuration(
    donnees: &DonneesRacine,
    chemin_configuration: &Path,
) -> Result<DifferentielImportConfiguration, ErreurConfigurationPartageable> {
    let configuration_importee = lire_configuration(chemin_configuration)?;
    Ok(calculer_differentiel(donnees, &configuration_importee))
}

/// Applique une ligne de différentiel déjà validée (chemin garanti présent dans le différentiel recalculé, cf.
/// {@link importer_configuration}) à `donnees`.
fn appliquer_ligne(donnees: &mut DonneesRacine, ligne: &LigneDifferentielImport) {
    if ligne.chemin == "referentiels.motifNommageBranches" {
        if let Some(motif) = ligne.apres.as_str() {
            donnees.referentiels.motif_nommage_branches = motif.to_string();
        }
        return;
    }
    if let Some(id) = ligne.chemin.strip_prefix("referentiels.reglesDependances/") {
        // Amendement de RG-043 (Phase 16) : normalisation de la casse des statuts de bornes de version, à
        // l'identique de `parametrage::definir_referentiel` (la voie d'import ne doit jamais diverger de la saisie
        // manuelle sur la même donnée). Couvre le cas d'une configuration déjà en `versionSchema` courant mais
        // éditée à la main ; une configuration antérieure est déjà normalisée en amont par la migration `6 → 7`.
        let mut entree = ligne.apres.clone();
        crate::modele::racine::canoniser_casse_statuts_regle_dependance(&mut entree);
        upsert_par_id(&mut donnees.referentiels.regles_dependances, id, entree);
        return;
    }
    if let Some(id) = ligne.chemin.strip_prefix("referentiels.reglesMarqueursIA/") {
        upsert_par_id(
            &mut donnees.referentiels.regles_marqueurs_ia,
            id,
            ligne.apres.clone(),
        );
        return;
    }
    if let Some(id) = ligne
        .chemin
        .strip_prefix("referentiels.categoriesDependances/")
    {
        upsert_par_id(
            &mut donnees.referentiels.categories_dependances,
            id,
            ligne.apres.clone(),
        );
        return;
    }
    if let Some(chemin_seuil) = ligne.chemin.strip_prefix("parametres.seuils.") {
        definir_feuille_seuil(
            &mut donnees.parametres.seuils,
            chemin_seuil,
            ligne.apres.clone(),
        );
    }
}

/// Définit une feuille de `parametres.seuils` au chemin pointé désigné, construisant les objets intermédiaires
/// manquants si nécessaire (à la différence de `parametrage::definir_seuil`, qui refuse toute clé absente : ce
/// refus protège la saisie manuelle d'un seuil existant contre une faute de frappe, tandis qu'un import de
/// configuration partageable peut légitimement introduire une feuille nouvelle, absente de la configuration
/// actuelle — décision arbitraire de cet incrément, à valider par un humain, cf. rapport de développement).
fn definir_feuille_seuil(seuils: &mut Value, chemin: &str, valeur: Value) {
    let segments: Vec<&str> = chemin.split('.').collect();
    let Some((derniere, parents)) = segments.split_last() else {
        return;
    };

    let mut courant = seuils;
    for segment in parents {
        if !courant.is_object() {
            *courant = Value::Object(serde_json::Map::new());
        }
        let objet = match courant.as_object_mut() {
            Some(objet) => objet,
            None => return,
        };
        courant = objet
            .entry((*segment).to_string())
            .or_insert_with(|| Value::Object(serde_json::Map::new()));
    }
    if !courant.is_object() {
        *courant = Value::Object(serde_json::Map::new());
    }
    if let Some(objet) = courant.as_object_mut() {
        objet.insert((*derniere).to_string(), valeur);
    }
}

/// Importe un fichier de configuration partageable (US-030, RG-029) : relit et recalcule lui-même le différentiel
/// à partir du contenu actuel du fichier désigné (jamais une confiance aveugle dans le différentiel prévisualisé
/// par un appel antérieur, cf. commentaire d'en-tête de ce module), n'applique que les lignes désignées par
/// `chemins_acceptes` parmi celles de catégorie `Ajout`/`Modification` (une ligne `Identique` acceptée est un
/// no-op silencieux, sans entrée de journal), puis consigne une entrée de journal par ligne réellement appliquée
/// (RG-023 étendue, origine « Import de configuration », détail = nom du fichier importé).
///
/// # Erreurs
///
/// Voir {@link lire_configuration} pour les anomalies de lecture/format/version ;
/// [`ErreurConfigurationPartageable::LigneDifferentielInconnue`] si un chemin accepté ne correspond à aucune ligne
/// du différentiel recalculé (état obsolète) — dans ce cas, aucune ligne n'est appliquée (RG-029, « tout ou rien »).
pub(crate) fn importer_configuration(
    donnees: &mut DonneesRacine,
    chemin_configuration: &Path,
    chemins_acceptes: &[String],
    horodatage: String,
) -> Result<(), ErreurConfigurationPartageable> {
    let configuration_importee = lire_configuration(chemin_configuration)?;
    let differentiel = calculer_differentiel(donnees, &configuration_importee);

    let nom_fichier = chemin_configuration
        .file_name()
        .map(|nom| nom.to_string_lossy().into_owned())
        .unwrap_or_default();

    let mut lignes_a_appliquer = Vec::with_capacity(chemins_acceptes.len());
    for chemin_accepte in chemins_acceptes {
        let ligne = differentiel
            .lignes
            .iter()
            .find(|ligne| &ligne.chemin == chemin_accepte)
            .ok_or(ErreurConfigurationPartageable::LigneDifferentielInconnue)?;
        if ligne.categorie != CategorieLigneDifferentiel::Identique {
            lignes_a_appliquer.push(ligne.clone());
        }
    }

    // Chaque chemin accepté a été vérifié ci-dessus contre le différentiel fraîchement recalculé : cette boucle ne
    // peut plus échouer, l'application est donc effectivement transactionnelle (RG-029).
    for ligne in &lignes_a_appliquer {
        appliquer_ligne(donnees, ligne);
        donnees.journal.push(EntreeJournal {
            id: uuid::Uuid::new_v4().to_string(),
            horodatage: horodatage.clone(),
            objet: ligne.chemin.clone(),
            avant: ligne.avant.clone().unwrap_or(Value::Null),
            apres: ligne.apres.clone(),
            origine: "Import de configuration".to_string(),
            detail_origine: Some(nom_fichier.clone()),
        });
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::fs;

    /// Répertoire temporaire de test, supprimé à la destruction de la valeur (même gabarit que
    /// `persistance::moteur::tests::DossierTemporaire`, dupliqué ici plutôt que factorisé : chaque module de test
    /// du projet porte jusqu'ici sa propre copie).
    struct DossierTemporaire {
        chemin: std::path::PathBuf,
    }

    impl DossierTemporaire {
        fn nouveau(prefixe: &str) -> Self {
            let mut chemin = std::env::temp_dir();
            let unique = uuid::Uuid::new_v4();
            chemin.push(format!("suiviqualimetrie-test-{prefixe}-{unique}"));
            fs::create_dir_all(&chemin).unwrap_or(());
            Self { chemin }
        }

        fn chemin_fichier(&self, nom: &str) -> std::path::PathBuf {
            self.chemin.join(nom)
        }
    }

    impl Drop for DossierTemporaire {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.chemin);
        }
    }

    /// Écrit un JSON de test au chemin désigné (`clippy::expect_used` interdit jusque dans les tests par les
    /// normes de développement du projet) : `Value` implémente toujours `Display` sans échec possible, seule
    /// l'écriture disque peut échouer.
    fn ecrire_json_de_test(chemin: &std::path::Path, valeur: &Value) -> std::io::Result<()> {
        fs::write(chemin, valeur.to_string())
    }

    fn racine_de_test() -> DonneesRacine {
        let mut racine = DonneesRacine::nouvelle("Test", "2026-07-28T08:00:00Z");
        racine.parametres.seuils = json!({
            "vitalite": { "mourantJours": 180, "mortJours": 365 },
        });
        racine.referentiels.regles_dependances = vec![json!({
            "id": "d1",
            "motif": "moment",
            "versions": [],
        })];
        racine
    }

    #[test]
    fn exporter_configuration_ne_porte_que_les_seuils_et_referentiels() {
        let mut racine = racine_de_test();
        racine.groupes.push(crate::modele::racine::Groupe {
            id: "g1".to_string(),
            nom: "Groupe".to_string(),
            description: String::new(),
            instances: vec![],
            membres_connus: vec![crate::modele::racine::MembreConnu {
                id: "m1".to_string(),
                critere: "alice".to_string(),
                type_critere: crate::modele::racine::TypeCritere::Username,
                statut: crate::modele::racine::StatutMembre::Interne,
                libelle: None,
                alias_email: None,
            }],
            annotations: vec![],
            indicateurs_desactives: vec![],
            projets: vec![],
        });

        let configuration = exporter_configuration(&racine);

        assert_eq!(configuration.version_schema, VERSION_SCHEMA_COURANTE);
        assert_eq!(configuration.referentiels.regles_dependances.len(), 1);
        assert_eq!(configuration.seuils, racine.parametres.seuils);
        let json = serde_json::to_string(&configuration).unwrap_or_default();
        assert!(
            !json.contains("alice"),
            "aucune donnée de groupe (membre connu) ne doit fuiter dans l'export"
        );
    }

    #[test]
    fn ecrire_puis_previsualiser_import_configuration_identique_ne_produit_que_des_lignes_identiques()
    -> Result<(), ErreurConfigurationPartageable> {
        let racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("export-import");
        let chemin = dossier.chemin_fichier("configuration.json");
        let configuration = exporter_configuration(&racine);
        ecrire_configuration(&chemin, &configuration)?;

        let differentiel = previsualiser_import_configuration(&racine, &chemin)?;

        assert!(!differentiel.lignes.is_empty());
        assert!(
            differentiel
                .lignes
                .iter()
                .all(|ligne| ligne.categorie == CategorieLigneDifferentiel::Identique)
        );
        Ok(())
    }

    #[test]
    fn previsualiser_import_configuration_detecte_ajout_modification_et_identique()
    -> Result<(), ErreurConfigurationPartageable> {
        let racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("differentiel");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [
                        { "id": "d1", "motif": "moment2", "versions": [] },
                        { "id": "d2", "motif": "lodash", "versions": [] }
                    ],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": racine.referentiels.motif_nommage_branches,
                },
                "seuils": {
                    "vitalite": { "mourantJours": 180, "mortJours": 400 },
                }
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        let differentiel = previsualiser_import_configuration(&racine, &chemin)?;

        let ligne = |chemin: &str| {
            differentiel
                .lignes
                .iter()
                .find(|ligne| ligne.chemin == chemin)
                .unwrap_or_else(|| panic!("ligne {chemin} attendue dans le différentiel"))
        };
        assert_eq!(
            ligne("referentiels.reglesDependances/d1").categorie,
            CategorieLigneDifferentiel::Modification
        );
        assert_eq!(
            ligne("referentiels.reglesDependances/d2").categorie,
            CategorieLigneDifferentiel::Ajout
        );
        assert_eq!(
            ligne("parametres.seuils.vitalite.mourantJours").categorie,
            CategorieLigneDifferentiel::Identique
        );
        assert_eq!(
            ligne("parametres.seuils.vitalite.mortJours").categorie,
            CategorieLigneDifferentiel::Modification
        );
        assert!(
            differentiel.lignes_invalides.is_empty(),
            "aucune entrée valide ne doit être signalée comme invalide"
        );
        Ok(())
    }

    #[test]
    fn previsualiser_import_configuration_motif_nommage_branches_syntaxiquement_invalide_est_signale_sans_etre_applicable()
    -> Result<(), ErreurConfigurationPartageable> {
        let racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("differentiel-motif-invalide");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": "[",
                },
                "seuils": {},
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        let differentiel = previsualiser_import_configuration(&racine, &chemin)?;

        assert!(
            differentiel
                .lignes
                .iter()
                .all(|ligne| ligne.chemin != "referentiels.motifNommageBranches"),
            "un motif syntaxiquement invalide ne doit jamais être proposé à l'acceptation"
        );
        assert_eq!(differentiel.lignes_invalides.len(), 1);
        assert_eq!(
            differentiel.lignes_invalides[0].chemin,
            "referentiels.motifNommageBranches"
        );
        Ok(())
    }

    #[test]
    fn previsualiser_import_configuration_entree_referentiel_sans_champs_obligatoires_est_signalee()
    -> Result<(), ErreurConfigurationPartageable> {
        let racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("differentiel-entree-invalide");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [{ "id": "d9" }],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": racine.referentiels.motif_nommage_branches,
                },
                "seuils": {},
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        let differentiel = previsualiser_import_configuration(&racine, &chemin)?;

        assert!(
            differentiel
                .lignes
                .iter()
                .all(|ligne| ligne.chemin != "referentiels.reglesDependances/d9"),
            "une entrée dépourvue de ses champs obligatoires (motif, versions) ne doit jamais être proposée à \
             l'acceptation, même si elle porte un id"
        );
        assert_eq!(differentiel.lignes_invalides.len(), 1);
        assert_eq!(
            differentiel.lignes_invalides[0].chemin,
            "referentiels.reglesDependances/d9"
        );
        Ok(())
    }

    #[test]
    fn previsualiser_import_configuration_entree_referentiel_sans_id_est_signalee()
    -> Result<(), ErreurConfigurationPartageable> {
        let racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("differentiel-sans-id");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [{ "motif": "sans-id", "versions": [] }],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": racine.referentiels.motif_nommage_branches,
                },
                "seuils": {},
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        let differentiel = previsualiser_import_configuration(&racine, &chemin)?;

        assert!(
            differentiel
                .lignes
                .iter()
                .all(|ligne| !ligne.chemin.starts_with("referentiels.reglesDependances")),
            "aucune ligne de dépendance ne doit être proposée pour une entrée sans id exploitable"
        );
        assert_eq!(differentiel.lignes_invalides.len(), 1);
        assert_eq!(
            differentiel.lignes_invalides[0].chemin,
            "referentiels.reglesDependances/?"
        );
        Ok(())
    }

    #[test]
    fn previsualiser_import_configuration_entree_referentiel_borne_de_version_malformee_est_signalee()
    -> Result<(), ErreurConfigurationPartageable> {
        // RG-043 (Phase 15, C15-11) : l'extension structurelle de `valider_entree_regles_dependances` (chaque
        // élément de `versions` doit porter `motifVersion`/`statut` non vides) est réutilisée telle quelle par
        // cette voie d'import, sans code dédié — cette même fonction est appelée par `calculer_differentiel`.
        let racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("differentiel-borne-version-malformee");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [
                        { "id": "d9", "motif": "moment", "versions": [{ "motifVersion": "*" }] }
                    ],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": racine.referentiels.motif_nommage_branches,
                },
                "seuils": {},
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        let differentiel = previsualiser_import_configuration(&racine, &chemin)?;

        assert!(
            differentiel
                .lignes
                .iter()
                .all(|ligne| ligne.chemin != "referentiels.reglesDependances/d9"),
            "une entrée dont une borne de version est dépourvue de statut ne doit jamais être proposée à \
             l'acceptation"
        );
        assert_eq!(differentiel.lignes_invalides.len(), 1);
        assert_eq!(
            differentiel.lignes_invalides[0].chemin,
            "referentiels.reglesDependances/d9"
        );
        Ok(())
    }

    #[test]
    fn previsualiser_import_configuration_regle_dependance_categorie_vide_est_signalee_invalide()
    -> Result<(), ErreurConfigurationPartageable> {
        // US-049 : `categorie` facultatif mais, si présent, chaîne non vide — même fonction de validation que la
        // saisie manuelle, réutilisée telle quelle par la voie d'import.
        let racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("differentiel-categorie-regle-vide");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [
                        { "id": "d9", "motif": "moment", "versions": [], "categorie": "" }
                    ],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": racine.referentiels.motif_nommage_branches,
                },
                "seuils": {},
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        let differentiel = previsualiser_import_configuration(&racine, &chemin)?;

        assert!(
            differentiel
                .lignes
                .iter()
                .all(|ligne| ligne.chemin != "referentiels.reglesDependances/d9")
        );
        assert_eq!(
            differentiel.lignes_invalides[0].chemin,
            "referentiels.reglesDependances/d9"
        );
        Ok(())
    }

    #[test]
    fn previsualiser_import_configuration_version_schema_superieure_est_rejetee()
    -> Result<(), std::io::Error> {
        let racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("version-superieure");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE + 1,
                "referentiels": {},
                "seuils": {},
            }),
        )?;

        let resultat = previsualiser_import_configuration(&racine, &chemin);

        assert_eq!(
            resultat,
            Err(ErreurConfigurationPartageable::VersionSchemaSuperieure)
        );
        Ok(())
    }

    #[test]
    fn previsualiser_import_configuration_fichier_introuvable_est_rejetee() {
        let racine = racine_de_test();
        let resultat = previsualiser_import_configuration(
            &racine,
            Path::new("/chemin/inexistant/configuration.json"),
        );

        assert_eq!(
            resultat,
            Err(ErreurConfigurationPartageable::FichierIllisible)
        );
    }

    #[test]
    fn importer_configuration_applique_uniquement_les_lignes_acceptees_et_journalise()
    -> Result<(), ErreurConfigurationPartageable> {
        let mut racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("import-partiel");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [
                        { "id": "d1", "motif": "moment2", "versions": [] },
                        { "id": "d2", "motif": "lodash", "versions": [] }
                    ],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": racine.referentiels.motif_nommage_branches,
                },
                "seuils": {
                    "vitalite": { "mourantJours": 180, "mortJours": 400 },
                }
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        importer_configuration(
            &mut racine,
            &chemin,
            &["referentiels.reglesDependances/d2".to_string()],
            "2026-07-28T09:00:00Z".to_string(),
        )?;

        assert_eq!(racine.referentiels.regles_dependances.len(), 2);
        assert_eq!(
            racine.referentiels.regles_dependances[0]["motif"],
            json!("moment")
        );
        assert_eq!(
            racine.parametres.seuils["vitalite"]["mortJours"],
            json!(365)
        );
        assert_eq!(racine.journal.len(), 1);
        assert_eq!(racine.journal[0].objet, "referentiels.reglesDependances/d2");
        assert_eq!(racine.journal[0].origine, "Import de configuration");
        assert_eq!(
            racine.journal[0].detail_origine,
            Some("configuration.json".to_string())
        );
        Ok(())
    }

    #[test]
    fn importer_configuration_regle_dependance_corrige_la_casse_des_statuts()
    -> Result<(), ErreurConfigurationPartageable> {
        // Amendement de RG-043 (Phase 16) : une configuration déjà en `versionSchema` courant mais portant un
        // statut de borne de version dans une casse non canonique (édition manuelle) voit ce statut normalisé à
        // l'application de la ligne, comme le ferait la saisie manuelle via `definir_referentiel`.
        let mut racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("import-casse-statut");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [
                        { "id": "d9", "motif": "lodash", "versions": [{ "motifVersion": "*", "statut": "MAINTENU" }] }
                    ],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": racine.referentiels.motif_nommage_branches,
                },
                "seuils": {}
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        importer_configuration(
            &mut racine,
            &chemin,
            &["referentiels.reglesDependances/d9".to_string()],
            "2026-07-28T09:00:00Z".to_string(),
        )?;

        let statut_d9 = racine
            .referentiels
            .regles_dependances
            .iter()
            .find(|regle| regle["id"] == json!("d9"))
            .map(|regle| regle["versions"][0]["statut"].clone());
        assert_eq!(statut_d9, Some(json!("maintenu")));
        Ok(())
    }

    #[test]
    fn importer_configuration_ligne_identique_acceptee_est_un_no_op_sans_journal()
    -> Result<(), ErreurConfigurationPartageable> {
        let mut racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("import-identique");
        let chemin = dossier.chemin_fichier("configuration.json");
        let configuration = exporter_configuration(&racine);
        ecrire_configuration(&chemin, &configuration)?;

        importer_configuration(
            &mut racine,
            &chemin,
            &["parametres.seuils.vitalite.mourantJours".to_string()],
            "2026-07-28T09:00:00Z".to_string(),
        )?;

        assert!(racine.journal.is_empty());
        Ok(())
    }

    #[test]
    fn importer_configuration_ajoute_une_feuille_de_seuil_absente()
    -> Result<(), ErreurConfigurationPartageable> {
        let mut racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("import-ajout-seuil");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": racine.referentiels.motif_nommage_branches,
                },
                "seuils": {
                    "fraicheurAudit": { "ancienJours": 30 },
                }
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        importer_configuration(
            &mut racine,
            &chemin,
            &["parametres.seuils.fraicheurAudit.ancienJours".to_string()],
            "2026-07-28T09:00:00Z".to_string(),
        )?;

        assert_eq!(
            racine.parametres.seuils["fraicheurAudit"]["ancienJours"],
            json!(30)
        );
        Ok(())
    }

    #[test]
    fn importer_configuration_chemin_accepte_inconnu_rejette_tout_sans_rien_appliquer()
    -> Result<(), ErreurConfigurationPartageable> {
        let mut racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("import-incoherent");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [
                        { "id": "d2", "motif": "lodash", "versions": [] }
                    ],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": racine.referentiels.motif_nommage_branches,
                },
                "seuils": {},
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        let resultat = importer_configuration(
            &mut racine,
            &chemin,
            &[
                "referentiels.reglesDependances/d2".to_string(),
                "referentiels.reglesDependances/chemin-inexistant".to_string(),
            ],
            "2026-07-28T09:00:00Z".to_string(),
        );

        assert_eq!(
            resultat,
            Err(ErreurConfigurationPartageable::LigneDifferentielInconnue)
        );
        // Application transactionnelle (RG-029) : même la ligne valide (`d2`) n'a pas été appliquée.
        assert_eq!(racine.referentiels.regles_dependances.len(), 1);
        assert!(racine.journal.is_empty());
        Ok(())
    }

    #[test]
    fn importer_configuration_ne_peut_jamais_appliquer_une_entree_structurellement_invalide()
    -> Result<(), ErreurConfigurationPartageable> {
        let mut racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("import-entree-invalide");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [{ "id": "d9" }],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": racine.referentiels.motif_nommage_branches,
                },
                "seuils": {},
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        // Même si l'appelant tente de faire accepter la ligne invalide (jamais présente dans `lignes`, donc
        // jamais un chemin réellement accepté du point de vue de l'interface), la commande la rejette comme un
        // chemin inconnu du différentiel recalculé : elle ne peut en aucun cas être appliquée sans contrôle.
        let resultat = importer_configuration(
            &mut racine,
            &chemin,
            &["referentiels.reglesDependances/d9".to_string()],
            "2026-07-28T09:00:00Z".to_string(),
        );

        assert_eq!(
            resultat,
            Err(ErreurConfigurationPartageable::LigneDifferentielInconnue)
        );
        // Inchangé : seule l'entrée « d1 » déjà présente par `racine_de_test`, « d9 » n'a jamais été ajoutée.
        assert_eq!(racine.referentiels.regles_dependances.len(), 1);
        assert_eq!(racine.referentiels.regles_dependances[0]["id"], json!("d1"));
        assert!(racine.journal.is_empty());
        Ok(())
    }

    #[test]
    fn previsualiser_import_configuration_categories_dependances_detecte_ajout_et_modification()
    -> Result<(), ErreurConfigurationPartageable> {
        // US-048 : le référentiel-liste `categoriesDependances` est diffé comme les deux autres. Le fichier
        // importé modifie le sigle de la catégorie `exec` (id `...001`) et ajoute une catégorie `fmkMobile`.
        let racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("differentiel-categories");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": racine.referentiels.motif_nommage_branches,
                    "categoriesDependances": [
                        { "id": "40000000-0000-4000-8000-000000000001", "libelle": "exec", "sigle": "EXC" },
                        { "id": "c9", "libelle": "fmkMobile", "sigle": "FMM" }
                    ],
                },
                "seuils": {},
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        let differentiel = previsualiser_import_configuration(&racine, &chemin)?;
        let ligne = |chemin: &str| {
            differentiel
                .lignes
                .iter()
                .find(|ligne| ligne.chemin == chemin)
                .unwrap_or_else(|| panic!("ligne {chemin} attendue dans le différentiel"))
        };

        assert_eq!(
            ligne("referentiels.categoriesDependances/40000000-0000-4000-8000-000000000001")
                .categorie,
            CategorieLigneDifferentiel::Modification
        );
        assert_eq!(
            ligne("referentiels.categoriesDependances/c9").categorie,
            CategorieLigneDifferentiel::Ajout
        );
        assert!(differentiel.lignes_invalides.is_empty());
        Ok(())
    }

    #[test]
    fn importer_configuration_applique_une_categorie_dependance_acceptee_et_journalise()
    -> Result<(), ErreurConfigurationPartageable> {
        let mut racine = racine_de_test();
        let categories_avant = racine.referentiels.categories_dependances.len();
        let dossier = DossierTemporaire::nouveau("import-categorie");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": racine.referentiels.motif_nommage_branches,
                    "categoriesDependances": [
                        { "id": "c9", "libelle": "fmkMobile", "sigle": "FMM" }
                    ],
                },
                "seuils": {},
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        importer_configuration(
            &mut racine,
            &chemin,
            &["referentiels.categoriesDependances/c9".to_string()],
            "2026-07-28T09:00:00Z".to_string(),
        )?;

        assert_eq!(
            racine.referentiels.categories_dependances.len(),
            categories_avant + 1
        );
        assert!(
            racine
                .referentiels
                .categories_dependances
                .iter()
                .any(|categorie| categorie["id"] == json!("c9"))
        );
        assert_eq!(
            racine.journal[0].objet,
            "referentiels.categoriesDependances/c9"
        );
        Ok(())
    }

    #[test]
    fn previsualiser_import_configuration_categorie_dependance_sans_libelle_est_signalee_invalide()
    -> Result<(), ErreurConfigurationPartageable> {
        let racine = racine_de_test();
        let dossier = DossierTemporaire::nouveau("categorie-invalide");
        let chemin = dossier.chemin_fichier("configuration.json");
        ecrire_json_de_test(
            &chemin,
            &json!({
                "versionSchema": VERSION_SCHEMA_COURANTE,
                "referentiels": {
                    "reglesDependances": [],
                    "reglesMarqueursIA": [],
                    "motifNommageBranches": racine.referentiels.motif_nommage_branches,
                    "categoriesDependances": [{ "id": "c9" }],
                },
                "seuils": {},
            }),
        )
        .map_err(|_| ErreurConfigurationPartageable::FichierIllisible)?;

        let differentiel = previsualiser_import_configuration(&racine, &chemin)?;

        assert!(
            differentiel
                .lignes
                .iter()
                .all(|ligne| ligne.chemin != "referentiels.categoriesDependances/c9"),
            "une entrée invalide ne doit jamais être proposée à l'acceptation"
        );
        assert_eq!(
            differentiel.lignes_invalides[0].chemin,
            "referentiels.categoriesDependances/c9"
        );
        Ok(())
    }
}
