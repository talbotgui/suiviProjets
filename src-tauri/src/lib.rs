// Fichier généré par la commande `tauri init` puis adapté avec l'assistance de l'IA (Claude Code) pour respecter
// les normes de développement et de sécurité du projet (mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md).
#![forbid(unsafe_code)]

//! Bibliothèque native (cœur Tauri) de l'application de suivi de la qualimétrie logicielle.
//!
//! À ce stade du projet (Phase 0 — bootstrap du poste de développement et de l'outillage), ce crate ne porte
//! encore aucune commande ni logique métier : il expose uniquement le point d'entrée générique nécessaire au
//! lancement d'une fenêtre Tauri vide, socle des phases de développement fonctionnel ultérieures (cf.
//! `docs/03_plan/plan_13_developpement.md`).

mod connecteurs;

/// Démarre l'application Tauri : construit la fenêtre principale, installe le plugin de journalisation en mode
/// développement, puis lance la boucle d'événements native.
///
/// Toute erreur fatale au démarrage est explicitement journalisée sur la sortie d'erreur avant l'arrêt du
/// processus, plutôt que de recourir à `.unwrap()`/`.expect()` (interdits par les normes de développement du
/// projet, cf. `docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--rust`).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let resultat = tauri::Builder::default()
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
