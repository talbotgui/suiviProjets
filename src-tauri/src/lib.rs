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
//! `reglesMarqueursIA` transmis en paramètre.

mod commandes;
mod connecteurs;
mod modele;
mod persistance;

use commandes::etat_session::EtatSession;

/// Démarre l'application Tauri : construit la fenêtre principale, installe le plugin de journalisation en mode
/// développement, enregistre l'état de session et les commandes de la Façade, puis lance la boucle d'événements
/// native.
///
/// Toute erreur fatale au démarrage est explicitement journalisée sur la sortie d'erreur avant l'arrêt du
/// processus, plutôt que de recourir à `.unwrap()`/`.expect()` (interdits par les normes de développement du
/// projet, cf. `docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--rust`).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let resultat = tauri::Builder::default()
        .manage(EtatSession::nouveau())
        .invoke_handler(tauri::generate_handler![
            commandes::fichier::creer_fichier,
            commandes::fichier::charger_fichier,
            commandes::fichier::sauvegarder_fichier,
            commandes::fichier::verrouiller_session,
            commandes::fichier::deverrouiller_session,
            commandes::connectivite::tester_connectivite,
            commandes::connectivite::definir_credentials,
            commandes::connectivite::interroger_branches,
            commandes::administration::qualifier_membre,
            commandes::administration::definir_politique_ia,
            commandes::administration::supprimer_membre_connu,
            commandes::audit::interroger_vitalite,
            commandes::audit::interroger_taille_depot,
            commandes::audit::interroger_contributeurs,
            commandes::audit::interroger_merge_requests,
            commandes::audit::interroger_membres,
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
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!());

    if let Err(erreur) = resultat {
        eprintln!("Erreur fatale au démarrage de l'application : {erreur}");
        std::process::exit(1);
    }
}
