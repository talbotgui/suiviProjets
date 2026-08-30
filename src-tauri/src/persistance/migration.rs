// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Mécanisme générique de migration de `versionSchema`, appliqué palier par palier, jamais fondé sur une horloge
//! (cf. `docs/02_documentation/12_modeleDonnees.md#stratégie-de-migration-des-données`,
//! `docs/02_documentation/13_conceptionDetaillee.md#gestion-des-erreurs-et-cas-limites-au-niveau-technique`).
//!
//! Le mécanisme générique est exercé et prouvé par les tests de ce module au moyen d'un registre fictif à
//! plusieurs paliers, conformément à l'exigence de tests de la Phase 1 (cf.
//! `docs/02_documentation/16_normesTests.md#tests-unitaires` : « migration de schéma palier par palier ... avec au
//! moins un palier fictif pour prouver le mécanisme »). Le registre réel ([`ETAPES_MIGRATION_REELLES`]) est resté
//! vide jusqu'à la Phase 5, incrément 7 (une seule version de schéma avait jamais existé) : il porte sa toute
//! première étape réelle, [`migration_1_vers_2`], complétée d'une seconde à la Phase 6, incrément 1,
//! [`migration_2_vers_3`] (ajout de `referentiels.motifNommageBranches`, RG-030), puis étendue jusqu'à
//! [`migration_5_vers_6`] (US-048 ajout de `referentiels.categoriesDependances` ; US-050 insertion de la règle de
//! dépendances `java` par défaut — première étape réelle à muter le document au-delà de `versionSchema`),
//! [`migration_6_vers_7`] (Phase 16, amendement de RG-043 : normalisation de la casse du champ `statut` des bornes
//! de version de `referentiels.reglesDependances`), [`migration_7_vers_8`] (correction du bug Sonar
//! `new_coverage` : `ResultatSonarCouverture.couvertureNouveauCode` devient optionnel), [`migration_8_vers_9`]
//! (US-017 : `MembreGitlab.herite` remplacé par `direct` + `groupesInvites`) et [`migration_9_vers_10`] (plan_16,
//! incrément 2 : uniformisation de la forme du champ `filtres` de chaque `VueEnregistree` en `{ groupeId, projetIds }`,
//! RG-027 amendée / RG-053).

use super::erreurs::ErreurPersistance;
use serde_json::Value;

/// Fonction de migration d'un palier de schéma vers le suivant, appliquée en place sur le document JSON.
pub(crate) type EtapeMigration = fn(&mut Value) -> Result<(), ErreurPersistance>;

/// Première migration réelle du projet (Phase 5, incrément 7), faisant progresser `versionSchema` de `1` à `2`
/// suite à l'ajout du champ optionnel `duplicationNouveauCode` sur `ResultatSonarCouverture` (`sonar.couverture`,
/// cf. [`crate::modele::racine::ResultatSonarCouverture`]).
///
/// Aucune transformation de donnée n'est nécessaire ici, à la différence des paliers fictifs de test ci-dessous :
/// le nouveau champ est optionnel (`#[serde(default, skip_serializing_if = "Option::is_none")]`), donc son
/// absence sur un document existant se désérialise directement en `None` sans qu'aucune valeur n'ait à être
/// recalculée ni déplacée ; seule la version de schéma progresse.
fn migration_1_vers_2(valeur: &mut Value) -> Result<(), ErreurPersistance> {
    if let Some(objet) = valeur.as_object_mut() {
        objet.insert("versionSchema".to_string(), Value::from(2));
    }
    Ok(())
}

/// Seconde migration réelle du projet (Phase 6, incrément 1), faisant progresser `versionSchema` de `2` à `3`
/// suite à l'ajout du champ `motifNommageBranches` sur `Referentiels` (RG-030, cf.
/// [`crate::modele::racine::Referentiels`]).
///
/// Aucune transformation de donnée n'est nécessaire ici, sur le modèle de [`migration_1_vers_2`] : le nouveau
/// champ porte `#[serde(default = "...")]` (repli Gitflow), donc son absence sur un document existant se
/// désérialise directement à cette valeur par défaut sans qu'aucune valeur n'ait à être recalculée ni déplacée ;
/// seule la version de schéma progresse.
fn migration_2_vers_3(valeur: &mut Value) -> Result<(), ErreurPersistance> {
    if let Some(objet) = valeur.as_object_mut() {
        objet.insert("versionSchema".to_string(), Value::from(3));
    }
    Ok(())
}

/// Troisième migration réelle du projet (Phase 10, incrément 8), faisant progresser `versionSchema` de `3` à `4`
/// suite à l'ajout du champ `seuilAvertissementTailleOctets` sur `Parametres` (US-035, RG-031, RG-032, cf.
/// [`crate::modele::racine::Parametres`]).
///
/// Aucune transformation de donnée n'est nécessaire ici, sur le modèle de [`migration_2_vers_3`] : le nouveau
/// champ porte `#[serde(default = "...")]`, donc son absence sur un document existant se désérialise directement à
/// cette valeur par défaut sans qu'aucune valeur n'ait à être recalculée ni déplacée ; seule la version de schéma
/// progresse.
fn migration_3_vers_4(valeur: &mut Value) -> Result<(), ErreurPersistance> {
    if let Some(objet) = valeur.as_object_mut() {
        objet.insert("versionSchema".to_string(), Value::from(4));
    }
    Ok(())
}

/// Quatrième migration réelle du projet (C15-14, audit historique à date passée), faisant progresser
/// `versionSchema` de `4` à `5` suite à l'ajout des champs `typeAudit` et `dateExecution` sur `Audit` (cf.
/// [`crate::modele::racine::Audit`]).
///
/// Aucune transformation de donnée n'est nécessaire ici, sur le modèle de [`migration_3_vers_4`] : les deux
/// nouveaux champs portent `#[serde(default)]` (`typeAudit` se désérialisant à `TypeAudit::Reguliere`,
/// `dateExecution` à `None`), donc leur absence sur un document existant se désérialise directement à ces valeurs
/// par défaut sans qu'aucune valeur n'ait à être recalculée ni déplacée ; seule la version de schéma progresse.
fn migration_4_vers_5(valeur: &mut Value) -> Result<(), ErreurPersistance> {
    if let Some(objet) = valeur.as_object_mut() {
        objet.insert("versionSchema".to_string(), Value::from(5));
    }
    Ok(())
}

/// Cinquième migration réelle du projet (US-048 catégorisation des dépendances, US-050 version de Java), faisant
/// progresser `versionSchema` de `5` à `6` suite à l'ajout du champ `categoriesDependances` sur `Referentiels` (cf.
/// [`crate::modele::racine::Referentiels`]).
///
/// Le champ `categoriesDependances` porte `#[serde(default = "...")]` (repli sur
/// [`crate::modele::racine::CATEGORIES_DEPENDANCES_PAR_DEFAUT`]) : son absence sur un document existant se
/// désérialise directement à la liste par défaut, aucune transformation n'est nécessaire pour lui (modèle de
/// [`migration_2_vers_3`]). En revanche, à la différence des paliers précédents, cette étape **mute** le document :
/// elle insère la règle de dépendances par défaut couvrant la version de Java
/// ([`crate::modele::racine::regle_java_par_defaut`], US-050) si — et seulement si — `reglesDependances` ne contient
/// encore aucune règle de motif `java`, pour que le suivi de Java fonctionne sans configuration sur un fichier
/// antérieur sans jamais écraser ni dupliquer une règle `java` déjà saisie par l'utilisateur.
fn migration_5_vers_6(valeur: &mut Value) -> Result<(), ErreurPersistance> {
    if let Some(objet) = valeur.as_object_mut() {
        inserer_regle_java_si_absente(objet);
        objet.insert("versionSchema".to_string(), Value::from(6));
    }
    Ok(())
}

/// Sixième migration réelle du projet (Phase 16, amendement de RG-043), faisant progresser `versionSchema` de `6`
/// à `7` : normalise la casse du champ `statut` des bornes de version de `referentiels.reglesDependances` — une
/// valeur correspondant, casse mise à part, à l'un des quatre statuts canoniques
/// ([`crate::modele::racine::STATUTS_OBSOLESCENCE_CANONIQUES`]) est réécrite dans sa forme canonique, toute autre
/// valeur restant inchangée (champ libre, RG-022).
///
/// Comme [`migration_5_vers_6`], cette étape **mute** le document. Best-effort : si `referentiels`/
/// `reglesDependances` a une forme inattendue (document édité à la main), la normalisation de l'entrée concernée
/// est simplement ignorée plutôt que de faire échouer la migration.
fn migration_6_vers_7(valeur: &mut Value) -> Result<(), ErreurPersistance> {
    if let Some(objet) = valeur.as_object_mut() {
        normaliser_casse_statuts_regles_dependances(objet);
        objet.insert("versionSchema".to_string(), Value::from(7));
    }
    Ok(())
}

/// Septième migration réelle du projet (correction du bug Sonar `new_coverage`, 2026-08-27), faisant progresser
/// `versionSchema` de `7` à `8` suite au passage du champ `couvertureNouveauCode` de
/// [`crate::modele::racine::ResultatSonarCouverture`] (`sonar.couverture`) de `f64` à `Option<f64>`.
///
/// Aucune transformation de donnée n'est nécessaire ici, sur le modèle de [`migration_1_vers_2`] : le champ
/// devient optionnel (`#[serde(default, skip_serializing_if = "Option::is_none")]`), donc une valeur `f64`
/// présente sur un document existant se désérialise directement en `Some(_)` et son absence en `None` ; seule la
/// version de schéma progresse.
fn migration_7_vers_8(valeur: &mut Value) -> Result<(), ErreurPersistance> {
    if let Some(objet) = valeur.as_object_mut() {
        objet.insert("versionSchema".to_string(), Value::from(8));
    }
    Ok(())
}

/// Huitième migration réelle du projet (US-017, ventilation des membres du dépôt sur la Fiche projet), faisant
/// progresser `versionSchema` de `8` à `9` : sur [`crate::modele::racine::MembreGitlab`] (`gitlab.membres`), le
/// champ booléen `herite` cède la place à `direct` (`#[serde(default = "...")]` → `true`) et `groupesInvites`
/// (`Vec<String>`, `#[serde(default)]` → vide).
///
/// Aucune transformation de donnée n'est nécessaire ici, sur le modèle de [`migration_1_vers_2`] : les deux
/// nouveaux champs sont additifs à valeur de repli, l'ancien `herite` est simplement ignoré à la désérialisation
/// (aucun `deny_unknown_fields` sur le modèle). Conséquence fonctionnelle **assumée et validée par un humain**
/// (cf. [`crate::modele::racine::VERSION_SCHEMA_COURANTE`]) : un audit déjà stocké restitue tous ses membres dans
/// la section « Membres directs » de la Fiche projet, quelle que soit la valeur qu'avait `herite`. Seule la version
/// de schéma progresse.
fn migration_8_vers_9(valeur: &mut Value) -> Result<(), ErreurPersistance> {
    if let Some(objet) = valeur.as_object_mut() {
        objet.insert("versionSchema".to_string(), Value::from(9));
    }
    Ok(())
}

/// Neuvième migration réelle du projet (plan_16, incrément 2 — filtrage groupe/projet mutualisé, RG-027 amendée,
/// RG-053), faisant progresser `versionSchema` de `9` à `10` : uniformise la forme du champ `filtres` de chaque
/// [`crate::modele::racine::VueEnregistree`] de `vuesEnregistrees`.
///
/// Comme [`migration_5_vers_6`] et [`migration_6_vers_7`], cette étape **mute** le document : pour chaque entrée,
/// `filtres` est réécrit en `{ groupeId, projetIds }` (`groupeId` repris tel quel s'il est une chaîne, sinon
/// `null` ; `projetIds` repris tel quel s'il est un tableau, sinon `null` ; tout autre champ, notamment
/// l'`indicateur` des vues Synthèse des audits, est abandonné) et `versionFiltres` est fixé à
/// [`crate::modele::racine::VERSION_FILTRES_VUE`]. Une vue antérieure est ainsi migrée vers la forme courante,
/// plutôt qu'ignorée avec avertissement par l'interface. Best-effort : si `vuesEnregistrees` a une forme
/// inattendue (document édité à la main), l'entrée concernée est laissée telle quelle plutôt que de faire échouer
/// la migration.
fn migration_9_vers_10(valeur: &mut Value) -> Result<(), ErreurPersistance> {
    if let Some(objet) = valeur.as_object_mut() {
        uniformiser_filtres_vues(objet);
        objet.insert("versionSchema".to_string(), Value::from(10));
    }
    Ok(())
}

/// Réécrit le champ `filtres` et le champ `versionFiltres` de chaque entrée de `document.vuesEnregistrees`
/// (cf. [`migration_9_vers_10`]). Best-effort, comme [`inserer_regle_java_si_absente`].
fn uniformiser_filtres_vues(document: &mut serde_json::Map<String, Value>) {
    let Some(vues) = document
        .get_mut("vuesEnregistrees")
        .and_then(Value::as_array_mut)
    else {
        return;
    };
    for vue in vues {
        let Some(vue) = vue.as_object_mut() else {
            continue;
        };
        let groupe_id = vue
            .get("filtres")
            .and_then(|filtres| filtres.get("groupeId"))
            .filter(|valeur| valeur.is_string())
            .cloned()
            .unwrap_or(Value::Null);
        let projet_ids = vue
            .get("filtres")
            .and_then(|filtres| filtres.get("projetIds"))
            .filter(|valeur| valeur.is_array())
            .cloned()
            .unwrap_or(Value::Null);
        vue.insert(
            "filtres".to_string(),
            serde_json::json!({ "groupeId": groupe_id, "projetIds": projet_ids }),
        );
        vue.insert(
            "versionFiltres".to_string(),
            Value::from(crate::modele::racine::VERSION_FILTRES_VUE),
        );
    }
}

/// Normalise la casse du champ `statut` de toutes les bornes de version de `document.referentiels.reglesDependances`
/// (cf. [`migration_6_vers_7`]), en déléguant chaque entrée à
/// [`crate::modele::racine::canoniser_casse_statuts_regle_dependance`]. Best-effort, comme
/// [`inserer_regle_java_si_absente`].
fn normaliser_casse_statuts_regles_dependances(document: &mut serde_json::Map<String, Value>) {
    let Some(regles) = document
        .get_mut("referentiels")
        .and_then(Value::as_object_mut)
        .and_then(|referentiels| referentiels.get_mut("reglesDependances"))
        .and_then(Value::as_array_mut)
    else {
        return;
    };
    for regle in regles {
        crate::modele::racine::canoniser_casse_statuts_regle_dependance(regle);
    }
}

/// Insère [`crate::modele::racine::regle_java_par_defaut`] dans `document.referentiels.reglesDependances` si aucune
/// règle de motif `java` n'y figure déjà (US-050). Best-effort : si `referentiels`/`reglesDependances` a une forme
/// inattendue (document édité à la main), l'insertion est simplement ignorée plutôt que de faire échouer la
/// migration.
fn inserer_regle_java_si_absente(document: &mut serde_json::Map<String, Value>) {
    let Some(regles) = document
        .get_mut("referentiels")
        .and_then(Value::as_object_mut)
        .and_then(|referentiels| referentiels.get_mut("reglesDependances"))
        .and_then(Value::as_array_mut)
    else {
        return;
    };
    let deja_presente = regles.iter().any(|regle| {
        regle.get("motif").and_then(Value::as_str) == Some(crate::modele::racine::REGLE_JAVA_MOTIF)
    });
    if !deja_presente {
        regles.push(crate::modele::racine::regle_java_par_defaut());
    }
}

/// Registre réel des étapes de migration connues de cette version de l'application, chacune associée à la version
/// de schéma qu'elle sait faire progresser. Cf. [`migration_1_vers_2`], [`migration_2_vers_3`],
/// [`migration_3_vers_4`], [`migration_4_vers_5`], [`migration_5_vers_6`], [`migration_6_vers_7`],
/// [`migration_7_vers_8`], [`migration_8_vers_9`] et [`migration_9_vers_10`].
pub(crate) const ETAPES_MIGRATION_REELLES: &[(u32, EtapeMigration)] = &[
    (1, migration_1_vers_2),
    (2, migration_2_vers_3),
    (3, migration_3_vers_4),
    (4, migration_4_vers_5),
    (5, migration_5_vers_6),
    (6, migration_6_vers_7),
    (7, migration_7_vers_8),
    (8, migration_8_vers_9),
    (9, migration_9_vers_10),
];

/// Lit `versionSchema` à la racine du document, `0` si le champ est absent ou n'est pas un entier.
fn lire_version_schema(valeur: &Value) -> u32 {
    valeur
        .get("versionSchema")
        .and_then(Value::as_u64)
        .and_then(|v| u32::try_from(v).ok())
        .unwrap_or(0)
}

/// Applique, palier par palier, les étapes de migration nécessaires pour amener `valeur` de sa version de schéma
/// courante à `version_cible`, en s'appuyant exclusivement sur `versionSchema` (jamais sur une horloge).
///
/// # Erreurs
///
/// Retourne [`ErreurPersistance::VersionSchemaSuperieure`] si `versionSchema` est déjà postérieur à
/// `version_cible` (fichier créé par une version plus récente de l'application, refusé explicitement plutôt que
/// migré de façon hasardeuse). Retourne [`ErreurPersistance::EtapeMigrationManquante`] si aucune étape enregistrée
/// ne permet de faire progresser le document depuis sa version courante.
pub(crate) fn appliquer_migrations(
    valeur: &mut Value,
    version_cible: u32,
    etapes: &[(u32, EtapeMigration)],
) -> Result<(), ErreurPersistance> {
    loop {
        let version_courante = lire_version_schema(valeur);

        if version_courante > version_cible {
            return Err(ErreurPersistance::VersionSchemaSuperieure {
                version_fichier: version_courante,
                version_courante: version_cible,
            });
        }
        if version_courante == version_cible {
            return Ok(());
        }

        let etape = etapes
            .iter()
            .find(|(version_depart, _)| *version_depart == version_courante);
        match etape {
            Some((_, fonction)) => fonction(valeur)?,
            None => {
                return Err(ErreurPersistance::EtapeMigrationManquante {
                    version_source: version_courante,
                });
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    /// Palier fictif de démonstration (0 → 1) : renomme un champ, purement pour prouver le mécanisme générique de
    /// chaînage. Ne correspond à aucune évolution réelle du schéma de l'application.
    fn palier_fictif_0_vers_1(valeur: &mut Value) -> Result<(), ErreurPersistance> {
        if let Some(objet) = valeur.as_object_mut() {
            if let Some(ancien) = objet.remove("champFictifAncienNom") {
                objet.insert("champFictifNouveauNom".to_string(), ancien);
            }
            objet.insert("versionSchema".to_string(), json!(1));
        }
        Ok(())
    }

    /// Second palier fictif (1 → 2), pour prouver le chaînage de plusieurs étapes successives.
    fn palier_fictif_1_vers_2(valeur: &mut Value) -> Result<(), ErreurPersistance> {
        if let Some(objet) = valeur.as_object_mut() {
            objet.insert("champAjouteAuPalier2".to_string(), json!(true));
            objet.insert("versionSchema".to_string(), json!(2));
        }
        Ok(())
    }

    const ETAPES_FICTIVES: &[(u32, EtapeMigration)] =
        &[(0, palier_fictif_0_vers_1), (1, palier_fictif_1_vers_2)];

    #[test]
    fn chaine_plusieurs_paliers_fictifs_jusqua_la_cible() -> Result<(), ErreurPersistance> {
        let mut valeur = json!({
            "versionSchema": 0,
            "champFictifAncienNom": "valeur-conservee"
        });

        appliquer_migrations(&mut valeur, 2, ETAPES_FICTIVES)?;

        assert_eq!(valeur["versionSchema"], json!(2));
        assert_eq!(valeur["champFictifNouveauNom"], json!("valeur-conservee"));
        assert_eq!(valeur["champAjouteAuPalier2"], json!(true));
        assert!(valeur.get("champFictifAncienNom").is_none());
        Ok(())
    }

    #[test]
    fn ne_migre_pas_si_deja_a_la_version_cible() -> Result<(), ErreurPersistance> {
        let mut valeur = json!({ "versionSchema": 2 });

        appliquer_migrations(&mut valeur, 2, ETAPES_FICTIVES)?;

        assert_eq!(valeur["versionSchema"], json!(2));
        Ok(())
    }

    #[test]
    fn version_superieure_a_la_cible_est_rejetee() {
        let mut valeur = json!({ "versionSchema": 5 });

        let resultat = appliquer_migrations(&mut valeur, 2, ETAPES_FICTIVES);

        assert!(matches!(
            resultat,
            Err(ErreurPersistance::VersionSchemaSuperieure {
                version_fichier: 5,
                version_courante: 2
            })
        ));
    }

    #[test]
    fn absence_detape_connue_est_signalee() {
        let mut valeur = json!({ "versionSchema": 7 });

        let resultat = appliquer_migrations(&mut valeur, 8, ETAPES_FICTIVES);

        assert!(matches!(
            resultat,
            Err(ErreurPersistance::EtapeMigrationManquante { version_source: 7 })
        ));
    }

    #[test]
    fn registre_reel_ne_migre_rien_quand_deja_a_la_version_courante()
    -> Result<(), ErreurPersistance> {
        let mut valeur = json!({ "versionSchema": crate::modele::racine::VERSION_SCHEMA_COURANTE });

        appliquer_migrations(
            &mut valeur,
            crate::modele::racine::VERSION_SCHEMA_COURANTE,
            ETAPES_MIGRATION_REELLES,
        )?;

        assert_eq!(
            valeur["versionSchema"],
            json!(crate::modele::racine::VERSION_SCHEMA_COURANTE)
        );
        Ok(())
    }

    #[test]
    fn migration_reelle_1_vers_2_ne_perd_aucune_donnee_existante_et_ajoute_le_champ_a_none()
    -> Result<(), Box<dyn std::error::Error>> {
        // Document historique typique d'avant la Phase 5, incrément 7 : `versionSchema: 1`, un résultat
        // `sonar.couverture` sans le champ `duplicationNouveauCode` (absent car inexistant à l'époque, pas encore
        // optionnel-mais-vide). La migration ne doit ni échouer ni altérer les données existantes ; seul
        // `versionSchema` progresse. La désérialisation qui suit doit produire `duplication_nouveau_code: None`.
        let mut valeur = json!({
            "versionSchema": 1,
            "meta": { "creeLe": "2026-01-01T00:00:00Z", "modifieLe": "2026-01-01T00:00:00Z", "application": "test" },
            "groupes": [
                {
                    "id": "a0000000-0000-4000-8000-000000000001",
                    "nom": "Groupe historique",
                    "description": "",
                    "instances": [],
                    "membresConnus": [],
                    "annotations": [],
                    "indicateursDesactives": [],
                    "projets": [
                        {
                            "id": "d0000000-0000-4000-8000-000000000001",
                            "nom": "Projet historique",
                            "description": "",
                            "iaAutorisee": false,
                            "sources": [],
                            "annotations": [],
                            "audits": [
                                {
                                    "id": "10000000-0000-4000-8000-000000000001",
                                    "date": "2026-01-01",
                                    "campagneId": "e0000000-0000-4000-8000-000000000001",
                                    "resultats": [
                                        {
                                            "type": "sonar.couverture",
                                            "sourceId": "source-2",
                                            "couverture": 61.2,
                                            "couvertureNouveauCode": 71.0
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        appliquer_migrations(
            &mut valeur,
            crate::modele::racine::VERSION_SCHEMA_COURANTE,
            ETAPES_MIGRATION_REELLES,
        )?;

        assert_eq!(
            valeur["versionSchema"],
            json!(crate::modele::racine::VERSION_SCHEMA_COURANTE)
        );
        assert_eq!(valeur["groupes"][0]["nom"], json!("Groupe historique"));

        let racine: crate::modele::racine::DonneesRacine = serde_json::from_value(valeur)?;
        let audit = &racine.groupes[0].projets[0].audits[0];
        let crate::modele::racine::Resultat::SonarCouverture(couverture) = &audit.resultats[0]
        else {
            return Err("variante SonarCouverture attendue".into());
        };
        assert_eq!(couverture.duplication_nouveau_code, None);
        // La valeur `f64` historique de `couvertureNouveauCode` (champ devenu `Option<f64>` au palier 7 → 8) se
        // désérialise en `Some(_)`, sans perte.
        assert_eq!(couverture.couverture_nouveau_code, Some(71.0));
        Ok(())
    }

    #[test]
    fn migration_reelle_7_vers_8_rend_couverture_nouveau_code_optionnel_sans_perte()
    -> Result<(), Box<dyn std::error::Error>> {
        // Document typique d'avant la correction du bug Sonar `new_coverage` : `versionSchema: 7`, deux résultats
        // `sonar.couverture`, l'un portant `couvertureNouveauCode` (valeur `f64` de l'ancien schéma), l'autre non
        // (impossible avant le palier, illustre ici le repli `None`). La migration ne doit ni échouer ni altérer
        // les données ; `versionSchema` progresse, la valeur présente devient `Some(_)`, l'absence `None`.
        let mut valeur = json!({
            "versionSchema": 7,
            "meta": { "creeLe": "2026-01-01T00:00:00Z", "modifieLe": "2026-01-01T00:00:00Z", "application": "test" },
            "referentiels": { "reglesDependances": [], "reglesMarqueursIA": [], "motifNommageBranches": "^feature/.+$" },
            "groupes": [
                {
                    "id": "a0000000-0000-4000-8000-000000000001",
                    "nom": "Groupe",
                    "description": "",
                    "instances": [],
                    "membresConnus": [],
                    "annotations": [],
                    "indicateursDesactives": [],
                    "projets": [
                        {
                            "id": "d0000000-0000-4000-8000-000000000001",
                            "nom": "Projet",
                            "description": "",
                            "iaAutorisee": false,
                            "sources": [],
                            "annotations": [],
                            "audits": [
                                {
                                    "id": "10000000-0000-4000-8000-000000000001",
                                    "date": "2026-01-01",
                                    "campagneId": "e0000000-0000-4000-8000-000000000001",
                                    "resultats": [
                                        { "type": "sonar.couverture", "sourceId": "source-a", "couverture": 61.2, "couvertureNouveauCode": 71.0 },
                                        { "type": "sonar.couverture", "sourceId": "source-b", "couverture": 40.0 }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        appliquer_migrations(
            &mut valeur,
            crate::modele::racine::VERSION_SCHEMA_COURANTE,
            ETAPES_MIGRATION_REELLES,
        )?;

        assert_eq!(
            valeur["versionSchema"],
            json!(crate::modele::racine::VERSION_SCHEMA_COURANTE)
        );

        let racine: crate::modele::racine::DonneesRacine = serde_json::from_value(valeur)?;
        let resultats = &racine.groupes[0].projets[0].audits[0].resultats;
        let crate::modele::racine::Resultat::SonarCouverture(avec) = &resultats[0] else {
            return Err("variante SonarCouverture attendue (source-a)".into());
        };
        let crate::modele::racine::Resultat::SonarCouverture(sans) = &resultats[1] else {
            return Err("variante SonarCouverture attendue (source-b)".into());
        };
        assert_eq!(avec.couverture_nouveau_code, Some(71.0));
        assert_eq!(sans.couverture_nouveau_code, None);
        Ok(())
    }

    #[test]
    fn migration_reelle_8_vers_9_restitue_les_membres_dans_la_section_directs_sans_perte()
    -> Result<(), Box<dyn std::error::Error>> {
        // Document typique d'avant US-017 : `versionSchema: 8`, un constat `gitlab.membres` dont chaque membre
        // porte l'ancien champ `herite` (jamais `direct` ni `groupesInvites`). La migration ne doit ni échouer ni
        // altérer les données ; `versionSchema` progresse, `herite` est ignoré à la désérialisation, `direct` se
        // désérialise à `true` (repli) et `groupesInvites` à un vecteur vide — tous les membres retombent donc dans
        // la section « Membres directs » de la Fiche projet (décision fonctionnelle validée par un humain).
        let mut valeur = json!({
            "versionSchema": 8,
            "meta": { "creeLe": "2026-01-01T00:00:00Z", "modifieLe": "2026-01-01T00:00:00Z", "application": "test" },
            "groupes": [
                {
                    "id": "a0000000-0000-4000-8000-000000000001",
                    "nom": "Groupe historique",
                    "description": "",
                    "instances": [],
                    "membresConnus": [],
                    "annotations": [],
                    "indicateursDesactives": [],
                    "projets": [
                        {
                            "id": "d0000000-0000-4000-8000-000000000001",
                            "nom": "Projet historique",
                            "description": "",
                            "iaAutorisee": false,
                            "sources": [],
                            "annotations": [],
                            "audits": [
                                {
                                    "id": "10000000-0000-4000-8000-000000000001",
                                    "date": "2026-01-01",
                                    "campagneId": "e0000000-0000-4000-8000-000000000001",
                                    "resultats": [
                                        {
                                            "type": "gitlab.membres",
                                            "sourceId": "source-1",
                                            "refEffective": "main",
                                            "shaTete": "abc123",
                                            "membres": [
                                                { "username": "mdurand", "nom": "Marie Durand", "niveauAcces": 40, "herite": false },
                                                { "username": "alopez", "nom": "Ana Lopez", "niveauAcces": 30, "herite": true }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        appliquer_migrations(
            &mut valeur,
            crate::modele::racine::VERSION_SCHEMA_COURANTE,
            ETAPES_MIGRATION_REELLES,
        )?;

        assert_eq!(
            valeur["versionSchema"],
            json!(crate::modele::racine::VERSION_SCHEMA_COURANTE)
        );

        let racine: crate::modele::racine::DonneesRacine = serde_json::from_value(valeur)?;
        let crate::modele::racine::Resultat::GitlabMembres(constat) =
            &racine.groupes[0].projets[0].audits[0].resultats[0]
        else {
            return Err("variante GitlabMembres attendue".into());
        };
        assert_eq!(constat.membres.len(), 2);
        for membre in &constat.membres {
            assert!(
                membre.direct,
                "{} doit retomber en membre direct",
                membre.username
            );
            assert!(membre.groupes_invites.is_empty());
        }
        Ok(())
    }

    #[test]
    fn migration_reelle_2_vers_3_ne_perd_aucune_donnee_existante_et_ajoute_le_motif_par_defaut()
    -> Result<(), Box<dyn std::error::Error>> {
        // Document historique typique d'avant la Phase 6, incrément 1 : `versionSchema: 2`, `referentiels` sans
        // le champ `motifNommageBranches` (RG-030, absent car inexistant à l'époque). La migration ne doit ni
        // échouer ni altérer les données existantes ; seul `versionSchema` progresse, `motifNommageBranches` se
        // désérialisant nativement à sa valeur par défaut Gitflow (`#[serde(default = "...")]`).
        let mut valeur = json!({
            "versionSchema": 2,
            "meta": { "creeLe": "2026-01-01T00:00:00Z", "modifieLe": "2026-01-01T00:00:00Z", "application": "test" },
            "referentiels": {
                "reglesDependances": [],
                "reglesMarqueursIA": []
            },
            "groupes": []
        });

        appliquer_migrations(
            &mut valeur,
            crate::modele::racine::VERSION_SCHEMA_COURANTE,
            ETAPES_MIGRATION_REELLES,
        )?;

        assert_eq!(
            valeur["versionSchema"],
            json!(crate::modele::racine::VERSION_SCHEMA_COURANTE)
        );

        let racine: crate::modele::racine::DonneesRacine = serde_json::from_value(valeur)?;
        assert_eq!(
            racine.referentiels.motif_nommage_branches,
            crate::modele::racine::MOTIF_NOMMAGE_BRANCHES_PAR_DEFAUT
        );
        Ok(())
    }

    #[test]
    fn migration_reelle_4_vers_5_ne_perd_aucune_donnee_existante_et_ajoute_un_audit_regulier_par_defaut()
    -> Result<(), Box<dyn std::error::Error>> {
        // Document historique typique d'avant C15-14 : `versionSchema: 4`, un audit sans `typeAudit` ni
        // `dateExecution` (absents car inexistants à l'époque). La migration ne doit ni échouer ni altérer les
        // données existantes ; seul `versionSchema` progresse, `typeAudit` se désérialisant nativement à
        // `TypeAudit::Reguliere` (`#[default]`) et `dateExecution` à `None` (rétrocompatibilité).
        let mut valeur = json!({
            "versionSchema": 4,
            "meta": { "creeLe": "2026-01-01T00:00:00Z", "modifieLe": "2026-01-01T00:00:00Z", "application": "test" },
            "groupes": [
                {
                    "id": "a0000000-0000-4000-8000-000000000001",
                    "nom": "Groupe historique",
                    "description": "",
                    "instances": [],
                    "membresConnus": [],
                    "annotations": [],
                    "indicateursDesactives": [],
                    "projets": [
                        {
                            "id": "d0000000-0000-4000-8000-000000000001",
                            "nom": "Projet historique",
                            "description": "",
                            "iaAutorisee": false,
                            "sources": [],
                            "annotations": [],
                            "audits": [
                                {
                                    "id": "10000000-0000-4000-8000-000000000001",
                                    "date": "2026-01-01",
                                    "campagneId": "e0000000-0000-4000-8000-000000000001",
                                    "resultats": []
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        appliquer_migrations(
            &mut valeur,
            crate::modele::racine::VERSION_SCHEMA_COURANTE,
            ETAPES_MIGRATION_REELLES,
        )?;

        assert_eq!(
            valeur["versionSchema"],
            json!(crate::modele::racine::VERSION_SCHEMA_COURANTE)
        );
        assert_eq!(valeur["groupes"][0]["nom"], json!("Groupe historique"));

        let racine: crate::modele::racine::DonneesRacine = serde_json::from_value(valeur)?;
        let audit = &racine.groupes[0].projets[0].audits[0];
        assert_eq!(
            audit.type_audit,
            crate::modele::racine::TypeAudit::Reguliere
        );
        assert_eq!(audit.date_execution, None);
        Ok(())
    }

    #[test]
    fn migration_reelle_5_vers_6_ne_perd_aucune_donnee_existante_et_ajoute_les_categories_par_defaut()
    -> Result<(), Box<dyn std::error::Error>> {
        // Document historique typique d'avant US-048 : `versionSchema: 5`, `referentiels` sans le champ
        // `categoriesDependances`. La migration ne doit ni échouer ni altérer les données existantes ; seul
        // `versionSchema` progresse, `categoriesDependances` se désérialisant nativement à la liste par défaut
        // (`#[serde(default = "...")]`), sur le modèle de `migration_reelle_2_vers_3_...`.
        let mut valeur = json!({
            "versionSchema": 5,
            "meta": { "creeLe": "2026-01-01T00:00:00Z", "modifieLe": "2026-01-01T00:00:00Z", "application": "test" },
            "referentiels": {
                "reglesDependances": [
                    { "id": "20000000-0000-4000-8000-000000000001", "motif": "org.springframework:*", "versions": [] }
                ],
                "reglesMarqueursIA": [],
                "motifNommageBranches": "^feature/.+$"
            },
            "groupes": []
        });

        appliquer_migrations(
            &mut valeur,
            crate::modele::racine::VERSION_SCHEMA_COURANTE,
            ETAPES_MIGRATION_REELLES,
        )?;

        assert_eq!(
            valeur["versionSchema"],
            json!(crate::modele::racine::VERSION_SCHEMA_COURANTE)
        );

        let racine: crate::modele::racine::DonneesRacine = serde_json::from_value(valeur)?;
        // La règle existante est conservée, la règle `java` par défaut (US-050) est ajoutée.
        assert_eq!(racine.referentiels.regles_dependances.len(), 2);
        assert!(
            racine
                .referentiels
                .regles_dependances
                .iter()
                .any(|regle| regle["motif"] == json!(crate::modele::racine::REGLE_JAVA_MOTIF))
        );
        let libelles: Vec<&str> = racine
            .referentiels
            .categories_dependances
            .iter()
            .filter_map(|entree| entree.get("libelle").and_then(Value::as_str))
            .collect();
        assert_eq!(libelles, vec!["exec", "os", "fmkBack", "fmkFront"]);
        Ok(())
    }

    #[test]
    fn migration_reelle_5_vers_6_ne_duplique_pas_une_regle_java_deja_saisie()
    -> Result<(), Box<dyn std::error::Error>> {
        // US-050 : un fichier antérieur où l'utilisateur a déjà défini sa propre règle de motif `java` ne doit pas
        // recevoir de seconde règle `java` par la migration (le Moteur de jugement ne retiendrait que la première).
        let mut valeur = json!({
            "versionSchema": 5,
            "meta": { "creeLe": "2026-01-01T00:00:00Z", "modifieLe": "2026-01-01T00:00:00Z", "application": "test" },
            "referentiels": {
                "reglesDependances": [
                    { "id": "perso", "motif": "java", "versions": [{ "motifVersion": "*", "statut": "maintenu" }] }
                ],
                "reglesMarqueursIA": [],
                "motifNommageBranches": "^feature/.+$"
            },
            "groupes": []
        });

        appliquer_migrations(
            &mut valeur,
            crate::modele::racine::VERSION_SCHEMA_COURANTE,
            ETAPES_MIGRATION_REELLES,
        )?;

        let racine: crate::modele::racine::DonneesRacine = serde_json::from_value(valeur)?;
        assert_eq!(racine.referentiels.regles_dependances.len(), 1);
        assert_eq!(
            racine.referentiels.regles_dependances[0]["id"],
            json!("perso")
        );
        Ok(())
    }

    #[test]
    fn migration_reelle_6_vers_7_normalise_la_casse_des_statuts_sans_perte()
    -> Result<(), Box<dyn std::error::Error>> {
        // Document typique d'avant l'amendement de RG-043 (Phase 16) : `versionSchema: 6`, bornes de version dont
        // le `statut` est saisi dans une casse hétérogène. La migration doit réécrire chaque statut correspondant,
        // casse mise à part, à l'un des quatre statuts canoniques dans sa forme canonique, sans toucher aux autres
        // champs ni aux libellés réellement hors liste.
        let mut valeur = json!({
            "versionSchema": 6,
            "meta": { "creeLe": "2026-01-01T00:00:00Z", "modifieLe": "2026-01-01T00:00:00Z", "application": "test" },
            "referentiels": {
                "reglesDependances": [
                    { "id": "d1", "motif": "org.springframework:*", "versions": [
                        { "motifVersion": "5.3.*", "statut": "MAINTENU" },
                        { "motifVersion": "6.1.*", "statut": "Maintenu" },
                        { "motifVersion": "7.*", "statut": "AJOURM1" },
                        { "motifVersion": "3.*", "statut": "surveiller" },
                        { "motifVersion": "*", "statut": "obsolete" }
                    ] }
                ],
                "reglesMarqueursIA": [],
                "motifNommageBranches": "^feature/.+$"
            },
            "groupes": []
        });

        appliquer_migrations(
            &mut valeur,
            crate::modele::racine::VERSION_SCHEMA_COURANTE,
            ETAPES_MIGRATION_REELLES,
        )?;

        assert_eq!(
            valeur["versionSchema"],
            json!(crate::modele::racine::VERSION_SCHEMA_COURANTE)
        );

        let racine: crate::modele::racine::DonneesRacine = serde_json::from_value(valeur)?;
        let versions = &racine.referentiels.regles_dependances[0]["versions"];
        assert_eq!(versions[0]["statut"], json!("maintenu"));
        assert_eq!(versions[1]["statut"], json!("maintenu"));
        assert_eq!(versions[2]["statut"], json!("aJourM1"));
        // Libellé réellement hors des quatre valeurs : conservé tel quel (champ libre, RG-022).
        assert_eq!(versions[3]["statut"], json!("surveiller"));
        // Statut déjà canonique : inchangé. `motifVersion` et `id` intacts.
        assert_eq!(versions[4]["statut"], json!("obsolete"));
        assert_eq!(versions[0]["motifVersion"], json!("5.3.*"));
        assert_eq!(racine.referentiels.regles_dependances[0]["id"], json!("d1"));
        Ok(())
    }

    #[test]
    fn migration_reelle_6_vers_7_tolere_une_forme_inattendue_de_regles_dependances()
    -> Result<(), Box<dyn std::error::Error>> {
        // Documents édités à la main : règle sans `versions`, borne sans `statut`, et `reglesDependances` qui n'est
        // pas un tableau. Aucun ne doit faire paniquer ni échouer la migration ; `versionSchema` progresse en `7`.
        for referentiels in [
            json!({
                "reglesDependances": [
                    { "id": "d1", "motif": "sans-versions" },
                    { "id": "d2", "motif": "borne-sans-statut", "versions": [{ "motifVersion": "1.*" }] }
                ]
            }),
            json!({ "reglesDependances": "chaine-inattendue" }),
        ] {
            let mut valeur = json!({
                "versionSchema": 6,
                "meta": { "creeLe": "2026-01-01T00:00:00Z", "modifieLe": "2026-01-01T00:00:00Z", "application": "test" },
                "referentiels": referentiels,
                "groupes": []
            });

            appliquer_migrations(
                &mut valeur,
                crate::modele::racine::VERSION_SCHEMA_COURANTE,
                ETAPES_MIGRATION_REELLES,
            )?;

            assert_eq!(
                valeur["versionSchema"],
                json!(crate::modele::racine::VERSION_SCHEMA_COURANTE)
            );
        }
        Ok(())
    }

    #[test]
    fn migration_reelle_9_vers_10_uniformise_les_filtres_des_vues_et_abandonne_lindicateur()
    -> Result<(), Box<dyn std::error::Error>> {
        // Document typique d'avant plan_16 : `versionSchema: 9`, trois vues de formes de filtres hétérogènes —
        // une vue Synthèse des audits portant un `indicateur` (abandonné), une vue avec `projetIds`, une vue à
        // filtres vides. La migration réécrit `filtres` en `{ groupeId, projetIds }` et fixe `versionFiltres` à 1
        // pour toutes, sans toucher aux autres champs (`id`, `nom`, `ecran`, `parDefaut`).
        let mut valeur = json!({
            "versionSchema": 9,
            "meta": { "creeLe": "2026-01-01T00:00:00Z", "modifieLe": "2026-01-01T00:00:00Z", "application": "test" },
            "groupes": [],
            "vuesEnregistrees": [
                {
                    "id": "v1", "nom": "Vue synthèse", "ecran": "syntheseAudits", "versionFiltres": 1,
                    "parDefaut": true, "filtres": { "groupeId": "g1", "indicateur": "vitalite" }
                },
                {
                    "id": "v2", "nom": "Vue graphique", "ecran": "syntheseGraphique", "versionFiltres": 2,
                    "parDefaut": false, "filtres": { "groupeId": null, "projetIds": ["p1", "p2"] }
                },
                {
                    "id": "v3", "nom": "Vue liste", "ecran": "listeTravail", "versionFiltres": 1,
                    "parDefaut": false, "filtres": {}
                }
            ]
        });

        appliquer_migrations(
            &mut valeur,
            crate::modele::racine::VERSION_SCHEMA_COURANTE,
            ETAPES_MIGRATION_REELLES,
        )?;

        assert_eq!(
            valeur["versionSchema"],
            json!(crate::modele::racine::VERSION_SCHEMA_COURANTE)
        );

        let racine: crate::modele::racine::DonneesRacine = serde_json::from_value(valeur)?;
        assert_eq!(racine.vues_enregistrees.len(), 3);
        for vue in &racine.vues_enregistrees {
            assert_eq!(vue.version_filtres, crate::modele::racine::VERSION_FILTRES_VUE);
            let Some(filtres) = vue.filtres.as_object() else {
                return Err("filtres doit être un objet après migration".into());
            };
            assert_eq!(filtres.len(), 2, "seuls groupeId et projetIds sont conservés");
            assert!(filtres.contains_key("groupeId"));
            assert!(filtres.contains_key("projetIds"));
        }
        let v1 = &racine.vues_enregistrees[0];
        assert_eq!(v1.nom, "Vue synthèse");
        assert!(v1.par_defaut);
        assert_eq!(v1.filtres["groupeId"], json!("g1"));
        assert_eq!(v1.filtres["projetIds"], json!(null));
        assert_eq!(racine.vues_enregistrees[1].filtres["groupeId"], json!(null));
        assert_eq!(
            racine.vues_enregistrees[1].filtres["projetIds"],
            json!(["p1", "p2"])
        );
        assert_eq!(racine.vues_enregistrees[2].filtres["groupeId"], json!(null));
        assert_eq!(racine.vues_enregistrees[2].filtres["projetIds"], json!(null));
        Ok(())
    }

    #[test]
    fn migration_reelle_9_vers_10_est_idempotente_sur_une_vue_deja_a_la_forme_cible()
    -> Result<(), Box<dyn std::error::Error>> {
        // Une vue déjà à la forme `{ groupeId, projetIds }` (créée par une installation à jour puis rechargée
        // après un aller-retour sur un poste antérieur) doit ressortir inchangée du palier.
        let mut valeur = json!({
            "versionSchema": 9,
            "meta": { "creeLe": "2026-01-01T00:00:00Z", "modifieLe": "2026-01-01T00:00:00Z", "application": "test" },
            "groupes": [],
            "vuesEnregistrees": [
                {
                    "id": "v1", "nom": "Vue cible", "ecran": "obsolescence", "versionFiltres": 1,
                    "parDefaut": false, "filtres": { "groupeId": "g7", "projetIds": ["p9"] }
                }
            ]
        });

        appliquer_migrations(
            &mut valeur,
            crate::modele::racine::VERSION_SCHEMA_COURANTE,
            ETAPES_MIGRATION_REELLES,
        )?;

        let racine: crate::modele::racine::DonneesRacine = serde_json::from_value(valeur)?;
        let vue = &racine.vues_enregistrees[0];
        assert_eq!(vue.filtres["groupeId"], json!("g7"));
        assert_eq!(vue.filtres["projetIds"], json!(["p9"]));
        assert_eq!(vue.version_filtres, crate::modele::racine::VERSION_FILTRES_VUE);
        Ok(())
    }

    #[test]
    fn migration_reelle_9_vers_10_tolere_une_forme_inattendue_de_vues_enregistrees()
    -> Result<(), ErreurPersistance> {
        // Documents édités à la main : `vuesEnregistrees` qui n'est pas un tableau, entrée sans `filtres`, entrée
        // dont `filtres` est une chaîne. Aucun ne doit faire paniquer ni échouer la migration.
        for vues in [
            json!("chaine-inattendue"),
            json!([{ "id": "v1", "nom": "Sans filtres", "ecran": "listeTravail", "versionFiltres": 1 }]),
            json!([{ "id": "v2", "nom": "Filtres chaîne", "ecran": "listeTravail", "versionFiltres": 1, "filtres": "oups" }]),
        ] {
            let mut valeur = json!({
                "versionSchema": 9,
                "meta": { "creeLe": "2026-01-01T00:00:00Z", "modifieLe": "2026-01-01T00:00:00Z", "application": "test" },
                "groupes": [],
                "vuesEnregistrees": vues
            });

            appliquer_migrations(
                &mut valeur,
                crate::modele::racine::VERSION_SCHEMA_COURANTE,
                ETAPES_MIGRATION_REELLES,
            )?;

            assert_eq!(
                valeur["versionSchema"],
                json!(crate::modele::racine::VERSION_SCHEMA_COURANTE)
            );
        }
        Ok(())
    }
}
