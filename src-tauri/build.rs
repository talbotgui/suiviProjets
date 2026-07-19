// Fichier généré par la commande `tauri init` puis adapté avec l'assistance de l'IA (Claude Code) pour respecter
// les normes de développement du projet (mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md).
#![forbid(unsafe_code)]

//! Script de build de Tauri : génère les métadonnées natives nécessaires à l'empaquetage de l'application
//! (icônes, manifeste, ressources) avant la compilation du crate principal.

fn main() {
    tauri_build::build()
}
