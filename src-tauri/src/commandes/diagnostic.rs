// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Commande de la Façade dédiée à la remontée, dans le journal technique local, des erreurs JavaScript non
//! interceptées côté interface (`ErrorHandler` Angular global, écouteur `unhandledrejection`) : sans ce relais, une
//! telle erreur ne restait visible que dans la console du navigateur, jamais dans le journal déjà consulté pour
//! tout autre diagnostic (ajoutée à la suite du diagnostic d'un blocage de campagne d'audit resté invisible du
//! journal technique local, cf. rapport de développement).

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
