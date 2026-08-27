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
//! [`migration_5_vers_6`] (US-048, ajout de `referentiels.categoriesDependances`).

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

/// Cinquième migration réelle du projet (US-048, catégorisation des dépendances), faisant progresser
/// `versionSchema` de `5` à `6` suite à l'ajout du champ `categoriesDependances` sur `Referentiels` (cf.
/// [`crate::modele::racine::Referentiels`]).
///
/// Aucune transformation de donnée n'est nécessaire ici, sur le modèle de [`migration_2_vers_3`] : le nouveau
/// champ porte `#[serde(default = "...")]` (repli sur [`crate::modele::racine::CATEGORIES_DEPENDANCES_PAR_DEFAUT`]),
/// donc son absence sur un document existant se désérialise directement à cette liste par défaut sans qu'aucune
/// valeur n'ait à être recalculée ni déplacée ; seule la version de schéma progresse.
fn migration_5_vers_6(valeur: &mut Value) -> Result<(), ErreurPersistance> {
    if let Some(objet) = valeur.as_object_mut() {
        objet.insert("versionSchema".to_string(), Value::from(6));
    }
    Ok(())
}

/// Registre réel des étapes de migration connues de cette version de l'application, chacune associée à la version
/// de schéma qu'elle sait faire progresser. Cf. [`migration_1_vers_2`], [`migration_2_vers_3`],
/// [`migration_3_vers_4`], [`migration_4_vers_5`] et [`migration_5_vers_6`].
pub(crate) const ETAPES_MIGRATION_REELLES: &[(u32, EtapeMigration)] = &[
    (1, migration_1_vers_2),
    (2, migration_2_vers_3),
    (3, migration_3_vers_4),
    (4, migration_4_vers_5),
    (5, migration_5_vers_6),
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
        assert_eq!(racine.referentiels.regles_dependances.len(), 1);
        let libelles: Vec<&str> = racine
            .referentiels
            .categories_dependances
            .iter()
            .filter_map(|entree| entree.get("libelle").and_then(Value::as_str))
            .collect();
        assert_eq!(libelles, vec!["exec", "os", "fmkBack", "fmkFront"]);
        Ok(())
    }
}
