// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commandes de la Façade dédiées à la remontée, dans le journal technique local, de diagnostics calculés côté
//! interface : erreurs JavaScript non interceptées (`ErrorHandler` Angular global, écouteur `unhandledrejection`)
//! et résumé de fin d'analyse d'une source d'audit (R15-06). Sans ce relais, ces informations ne restaient visibles
//! que dans la console du navigateur ou pas du tout, jamais dans le journal déjà consulté pour tout autre
//! diagnostic (ajoutées à la suite du diagnostic d'un blocage de campagne d'audit resté invisible du journal
//! technique local, puis de celui de R15-06, cf. rapport de développement).

use std::collections::HashMap;

/// Consigne une erreur JavaScript non interceptée remontée depuis l'interface : `nom` reprend `Error.name` (ex.
/// `TypeError`), `message` reprend `Error.message`, `pile` reprend `Error.stack` si disponible. Ne reçoit que ces
/// trois champs, jamais une donnée applicative ni un credential (cf.
/// `docs/02_documentation/15_normesSecurite.md#journalisation-des-événements-sensibles`).
#[tauri::command]
pub(crate) fn consigner_erreur_ui(nom: String, message: String, pile: Option<String>) {
    crate::journalisation::consigner_debut_commande("consignerErreurUi");
    crate::journalisation::consigner_erreur_ui(&nom, &message, pile.as_deref());
    crate::journalisation::consigner_fin_commande("consignerErreurUi");
}

/// Consigne, en fin d'analyse d'une SOURCE d'un projet (une entrée par source, jamais un total agrégé par projet),
/// le nombre d'items obtenus par type d'indicateur (`gitlab.membres`, `gitlab.dependances`, etc.), remonté par
/// `OrchestrateurCampagneService.auditerProjet` (seul appelant connaissant, source par source, le résultat de
/// chaque indicateur interrogé). Ajoutée en diagnostic de R15-06 (cf. `docs/03_plan/plan_13_developpement.md#bugs-
/// constatés-r15-01-à-r15-06`) : ne reçoit que des compteurs entiers, jamais le contenu des résultats eux-mêmes
/// (cf. `docs/02_documentation/15_normesSecurite.md#journalisation-des-événements-sensibles`).
#[tauri::command]
pub(crate) fn consigner_resume_source(
    source_id: String,
    id_externe: String,
    compteurs: HashMap<String, u32>,
) {
    crate::journalisation::consigner_debut_commande("consignerResumeSource");
    crate::journalisation::consigner_resume_source(&source_id, &id_externe, &compteurs);
    crate::journalisation::consigner_fin_commande("consignerResumeSource");
}
