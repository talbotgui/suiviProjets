// Fichier généré par la commande `tauri init` puis adapté avec l'assistance de l'IA (Claude Code) pour respecter
// les normes de développement et de sécurité du projet (mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md).
#![forbid(unsafe_code)]

//! Bibliothèque native (cœur Tauri) de l'application de suivi de la qualimétrie logicielle.
//!
//! Phase 1 (socle de persistance et sécurité du fichier, cf. `docs/03_plan/plan_13_developpement.md`) : ce crate
//! expose les commandes de création, chargement, sauvegarde et verrouillage/déverrouillage du fichier de données
//! chiffré (US-001, US-002, US-026). Phase 2 (gestion des credentials) : s'y ajoutent les commandes de test de
//! connectivité et de saisie en mémoire des credentials de session (US-003, US-004). Phase 3 (administration du
//! modèle) : s'y ajoute l'interrogation des branches d'un dépôt GitLab pour l'autocomplétion de la ref auditée
//! d'une source (US-008) ; le CRUD des groupes, projets et sources lui-même a lieu côté interface, sur les
//! données déjà chargées en mémoire, et se persiste via la commande `sauvegarderFichier` existante. Phase 4
//! (membres connus et politique IA) : s'y ajoutent `qualifierMembre` et `definirPolitiqueIA` (US-022 à US-024),
//! qui mutent et sauvegardent elles-mêmes le fichier, à la différence du CRUD groupes/projets/sources de la
//! Phase 3. Phase 5, incrément 1 (Moteur d'audit) : s'y ajoutent dix commandes d'interrogation d'indicateurs
//! GitLab/Sonar (US-009), qui ne mutent ni ne sauvegardent le fichier — leur résultat est destiné à être assemblé
//! côté interface par l'Orchestrateur de campagne, différé à un incrément ultérieur. Phase 5, incrément 2: s'y
//! ajoutent `enregistrerBrouillon`, `integrerBrouillon` et `rejeterBrouillon` (US-014, RG-019), qui mutent et
//! sauvegardent elles-mêmes le fichier, sur le même gabarit que `qualifierMembre`/`definirPolitiqueIA`. Phase 5,
//! incrément 7 : s'y ajoute `interrogerMarqueursIa` (US-009, F18, RG-021), différée depuis l'incrément 1, qui
//! détecte les marqueurs d'outils IA de l'arborescence d'un dépôt GitLab par correspondance avec le référentiel
//! `reglesMarqueursIA` transmis en paramètre. Incrément de rattrapage de la Phase 5 (précédant la Phase 6) : s'y
//! ajoutent `interrogerBranchesCompletes` et `interrogerDependances` (US-009), les deux dernières opérations du
//! catalogue figé des résultats d'audit restées différées ; à cette occasion, `Branche` perd ses champs
//! `rebasee`/`nommageConforme` (cf. `docs/02_documentation/02_glossaire.md#journal-des-décisions`). Phase 8 (US-019,
//! US-020 ; RG-026) : s'y ajoutent `creerAnnotation` et `qualifierAlerte`, qui mutent et sauvegardent elles-mêmes le
//! fichier, sur le même gabarit que `qualifierMembre`/`definirPolitiqueIA`. Évolution du 2026-08-02 (US-008,
//! RG-036) : s'y ajoute `listerSourcesDisponibles`, qui liste les dépôts GitLab ou projets Sonar accessibles avec
//! le credential courant d'une Instance, pour l'autocomplétion de l'identifiant externe d'une source (remplace la
//! saisie libre), sur le même gabarit que `interrogerBranches`. Phase 11 (R11-01) : le greffon de journalisation
//! technique (`mod journalisation`) est désormais actif en développement comme en production (retrait de la
//! restriction `cfg!(debug_assertions)`), écrit dans un dossier `logs/` à côté de l'exécutable avec rotation
//! quotidienne et rétention de 30 jours ; les commandes appelant GitLab/Sonar et le point de convergence
//! `persistance::moteur::sauvegarder_fichier` y consignent chacun de leurs appels, y compris désormais leurs
//! anomalies (`ErreurConnecteur`), pas seulement leur déclenchement (R12-06). Phase 12 (R12-05) : le greffon
//! `tauri_plugin_opener` est ajouté pour l'ouverture de la mention d'attribution de la sidebar (lien GitHub) dans
//! le navigateur système par défaut, la webview ne le faisant jamais d'elle-même pour une navigation externe.

mod commandes;
mod connecteurs;
mod journalisation;
mod modele;
mod persistance;

use commandes::etat_session::EtatSession;

/// Démarre l'application Tauri : construit la fenêtre principale, installe le greffon de journalisation technique
/// (développement comme production depuis R11-01, cf. `crate::journalisation`), enregistre l'état de session et
/// les commandes de la Façade, puis lance la boucle d'événements native.
///
/// Toute erreur fatale au démarrage est explicitement journalisée sur la sortie d'erreur avant l'arrêt du
/// processus, plutôt que de recourir à `.unwrap()`/`.expect()` (interdits par les normes de développement du
/// projet, cf. `docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--rust`).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let resultat = tauri::Builder::default()
        .manage(EtatSession::nouveau())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commandes::fichier::creer_fichier,
            commandes::fichier::charger_fichier,
            commandes::fichier::sauvegarder_fichier,
            commandes::fichier::changer_mot_de_passe_fichier,
            commandes::fichier::verrouiller_session,
            commandes::fichier::deverrouiller_session,
            commandes::connectivite::tester_connectivite,
            commandes::connectivite::definir_credentials,
            commandes::connectivite::interroger_branches,
            commandes::connectivite::lister_sources_disponibles,
            commandes::administration::qualifier_membre,
            commandes::administration::qualifier_membres,
            commandes::administration::definir_politique_ia,
            commandes::administration::supprimer_membre_connu,
            commandes::administration::calculer_metriques_volumetrie,
            commandes::prise_en_charge::calculer_prise_en_charge_projet,
            commandes::prise_en_charge::empreinte_referentiel_interne,
            commandes::audit::interroger_vitalite,
            commandes::audit::interroger_taille_depot,
            commandes::audit::interroger_contributeurs,
            commandes::audit::interroger_merge_requests,
            commandes::audit::interroger_membres,
            commandes::audit::interroger_branches_completes,
            commandes::audit::interroger_dependances,
            commandes::audit::interroger_marqueurs_ia,
            commandes::audit::interroger_violations,
            commandes::audit::interroger_dette,
            commandes::audit::interroger_couverture,
            commandes::audit::interroger_notes,
            commandes::audit::interroger_ncloc,
            commandes::audit::interroger_derniere_analyse,
            commandes::audit::enregistrer_brouillon,
            commandes::audit::integrer_brouillon,
            commandes::audit::rejeter_brouillon,
            commandes::parametrage::definir_seuil,
            commandes::parametrage::definir_referentiel,
            commandes::parametrage::definir_referentiels,
            commandes::parametrage::supprimer_regle_dependance,
            commandes::parametrage::supprimer_regle_marqueur_ia,
            commandes::parametrage::supprimer_categorie_dependance,
            commandes::parametrage::definir_verrouillage,
            commandes::parametrage::definir_concurrence_audit,
            commandes::parametrage::definir_proxy,
            commandes::parametrage::definir_nombre_sauvegardes_securite,
            commandes::parametrage::definir_seuil_avertissement_taille,
            commandes::purge::previsualiser_purge_densite,
            commandes::purge::executer_purge_densite,
            commandes::purge::previsualiser_purge_age,
            commandes::purge::executer_purge_age,
            commandes::purge::previsualiser_purge_journal,
            commandes::purge::executer_purge_journal,
            commandes::alertes::creer_annotation,
            commandes::alertes::supprimer_annotation,
            commandes::alertes::qualifier_alerte,
            commandes::vues::definir_vue,
            commandes::vues::supprimer_vue,
            commandes::configuration_partageable::exporter_configuration,
            commandes::configuration_partageable::previsualiser_import_configuration,
            commandes::configuration_partageable::importer_configuration,
            commandes::diagnostic::consigner_erreur_ui,
            commandes::diagnostic::consigner_resume_source,
        ])
        .setup(|app| {
            let cible_fichier = journalisation::dossier_logs().map(|dossier| {
                journalisation::purger_journaux_anciens(&dossier);
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Folder {
                    path: dossier,
                    file_name: Some(journalisation::nom_fichier_journal_du_jour()),
                })
            });
            let mut constructeur_log = tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .max_file_size(journalisation::TAILLE_MAX_FICHIER_JOURNAL_OCTETS)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .clear_targets()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ));
            match cible_fichier {
                Some(cible) => constructeur_log = constructeur_log.target(cible),
                // Dossier de l'exécutable non résolu (cas dégradé, non observé en pratique) : la journalisation se
                // limite alors à la sortie standard plutôt que d'empêcher le démarrage de l'application.
                None => eprintln!(
                    "Impossible de déterminer le dossier de journalisation à côté de l'exécutable : journalisation fichier désactivée pour cette session."
                ),
            }
            app.handle().plugin(constructeur_log.build())?;
            Ok(())
        })
        .run(tauri::generate_context!());

    if let Err(erreur) = resultat {
        eprintln!("Erreur fatale au démarrage de l'application : {erreur}");
        std::process::exit(1);
    }
}
