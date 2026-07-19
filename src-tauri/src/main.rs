// Fichier généré par la commande `tauri init` puis adapté avec l'assistance de l'IA (Claude Code) pour respecter
// les normes de développement du projet (mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md).
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![forbid(unsafe_code)]

//! Binaire natif de l'application : délègue immédiatement à la bibliothèque `suivi_qualimetrie_lib`.

/// Point d'entrée du binaire natif.
fn main() {
    suivi_qualimetrie_lib::run();
}
