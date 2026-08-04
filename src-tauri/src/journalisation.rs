// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Journalisation technique locale des actions tracées (Phase 11, R11-01, cf.
//! `docs/03_plan/plan_13_developpement.md#phase-11--journalisation-technique-et-confort-de-saisie-projets-sources`) :
//! appels sortants vers les connecteurs GitLab/Sonar (`commandes/connectivite.rs`, `commandes/audit.rs`) et
//! écritures du fichier de données au point de convergence `persistance::moteur::sauvegarder_fichier`. Rend
//! effective la décision déjà actée à l'étape 12 du cadrage (dossier `logs/` à côté de l'exécutable, rotation
//! quotidienne, rétention 30 jours), cf.
//! `docs/02_documentation/19_environnementProduction.md#journalisation-applicative-et-gestion-des-erreurs-en-production`.
//!
//! Limite connue de la rotation quotidienne (constatée en relecture de cet incrément, cf. rapport de
//! développement) : le nom du fichier journal du jour n'est calculé qu'une seule fois, au démarrage de
//! l'application (cf. [`nom_fichier_journal_du_jour`]) ; `tauri_plugin_log` (v2.9.0) ne réévalue jamais ce nom en
//! cours de session, seule sa taille déclenchant une rotation active. Une session applicative laissée ouverte à
//! cheval sur un changement de jour calendaire continue donc d'écrire dans le fichier daté du jour de son
//! lancement plutôt que de basculer vers un nouveau fichier à minuit : la rotation « un fichier par jour » n'est
//! donc garantie qu'entre deux lancements de l'application, pas au sein d'une session continue. Limitation
//! acceptée telle quelle (application desktop mono-utilisateur, généralement relancée régulièrement) plutôt que
//! développement d'un mécanisme actif de bascule en cours de session, hors de portée du greffon tiers utilisé.
//!
//! Rappel impératif (cf.
//! `docs/02_documentation/15_normesSecurite.md#journalisation-des-événements-sensibles`) : aucune donnée sensible
//! (mot de passe, credential, contenu déchiffré) n'apparaît jamais dans ce journal, y compris au niveau de détail
//! le plus fin. Les deux fonctions de consignation ci-dessous n'acceptent en paramètre que des identifiants
//! fonctionnels (nom de commande, nom d'instance, identifiant externe de source) : aucun appelant ne peut donc leur
//! transmettre un credential par erreur, la signature elle-même l'exclut.

use std::fs;
use std::path::{Path, PathBuf};

/// Cible (catégorie) dédiée aux actions tracées par cette phase dans le journal `log`, distincte des messages de
/// diagnostic génériques du reste du crate : permet de filtrer ces événements dans le fichier journal.
const CIBLE_ACTION_TRACEE: &str = "action_tracee";

/// Nombre de jours de rétention des journaux techniques, valeur fixe non paramétrable actée à l'étape 12 du
/// cadrage (cf. commentaire d'en-tête de ce module).
const RETENTION_JOURS: i64 = 30;

/// Taille maximale, en octets, d'un fichier journal avant rotation de secours par `tauri_plugin_log`. La rotation
/// quotidienne (un fichier par jour, cf. [`nom_fichier_journal_du_jour`]) reste le mécanisme normal ; cette valeur
/// n'intervient qu'en secours si un même jour produit un volume de journal inhabituel. Valeur non fixée par un
/// texte normatif du projet : décision arbitraire à valider par un humain (cf. rapport de développement de cette
/// phase), retenue large pour qu'elle n'interfère pas avec la rotation quotidienne en usage normal.
pub(crate) const TAILLE_MAX_FICHIER_JOURNAL_OCTETS: u128 = 10_000_000;

/// Consigne un appel sortant vers un connecteur GitLab/Sonar (R11-01a) : action et cible fonctionnelle uniquement
/// (nom d'instance, identifiant externe de la source concernée), jamais le contenu de la réponse ni un token.
pub(crate) fn consigner_appel_connecteur(commande: &str, instance_nom: &str, cible: &str) {
    log::info!(
        target: CIBLE_ACTION_TRACEE,
        "{commande} : instance={instance_nom}, cible={cible}"
    );
}

/// Consigne une écriture du fichier de données (R11-01b), au point de convergence unique
/// `persistance::moteur::sauvegarder_fichier` : nom de la commande de la Façade à l'origine de cette écriture,
/// jamais le contenu du fichier ni le mot de passe.
pub(crate) fn consigner_ecriture_fichier(commande_origine: &str) {
    log::info!(
        target: CIBLE_ACTION_TRACEE,
        "sauvegarde du fichier de données à l'initiative de {commande_origine}"
    );
}

/// Dossier `logs/` situé à côté de l'exécutable courant, plutôt qu'un répertoire système partagé (décision actée à
/// l'étape 12 du cadrage, cf. commentaire d'en-tête de ce module). `None` si l'exécutable courant ne peut être
/// résolu (cas dégradé, non observé en pratique).
pub(crate) fn dossier_logs() -> Option<PathBuf> {
    let executable = std::env::current_exe().ok()?;
    let parent = executable.parent()?;
    Some(parent.join("logs"))
}

/// Nom du fichier journal du jour courant (UTC) au moment de l'appel, sans extension (ajoutée par
/// `tauri_plugin_log`) : appelé une seule fois au démarrage (cf. limite documentée en en-tête de ce module), un
/// nouveau fichier n'est donc créé qu'au lancement suivant l'application si le jour a changé depuis, pas en cours
/// de session.
pub(crate) fn nom_fichier_journal_du_jour() -> String {
    chrono::Utc::now().format("%Y-%m-%d").to_string()
}

/// Supprime, dans le dossier de journaux donné, tout fichier journal dont le nom débute par une date
/// (`AAAA-MM-JJ`) antérieure de plus de [`RETENTION_JOURS`] jours à aujourd'hui (rétention fixe actée à l'étape 12
/// du cadrage). Un fichier dont le nom ne débute pas par une date reconnue est ignoré plutôt que supprimé
/// (prudence : ce nettoyage ne doit toucher que des journaux techniques qu'il reconnaît explicitement). Un dossier
/// absent (première exécution de l'application) est traité comme un dossier vide, sans erreur.
pub(crate) fn purger_journaux_anciens(dossier: &Path) {
    let Ok(entrees) = fs::read_dir(dossier) else {
        return;
    };
    let aujourdhui = chrono::Utc::now().date_naive();
    for entree in entrees.filter_map(Result::ok) {
        let chemin = entree.path();
        if !chemin.is_file() {
            continue;
        }
        let Some(nom) = chemin.file_name().and_then(|nom| nom.to_str()) else {
            continue;
        };
        let Some(date_str) = nom.get(0..10) else {
            continue;
        };
        let Ok(date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") else {
            continue;
        };
        if (aujourdhui - date).num_days() > RETENTION_JOURS {
            let _ = fs::remove_file(&chemin);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Répertoire temporaire de test, supprimé à la destruction de la valeur (même gabarit que
    /// `persistance::moteur::tests::DossierTemporaire`, non réutilisable telle quelle car privée à son module).
    struct DossierTemporaire {
        chemin: PathBuf,
    }

    impl DossierTemporaire {
        fn nouveau(prefixe: &str) -> Self {
            let mut chemin = std::env::temp_dir();
            let unique = uuid::Uuid::new_v4();
            chemin.push(format!("suiviqualimetrie-test-{prefixe}-{unique}"));
            fs::create_dir_all(&chemin).unwrap_or(());
            Self { chemin }
        }
    }

    impl Drop for DossierTemporaire {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.chemin);
        }
    }

    #[test]
    fn purge_supprime_uniquement_les_journaux_plus_vieux_que_la_retention() {
        let dossier = DossierTemporaire::nouveau("purge-journaux");
        let aujourdhui = chrono::Utc::now().date_naive();
        let recent = aujourdhui - chrono::Duration::days(10);
        let ancien = aujourdhui - chrono::Duration::days(RETENTION_JOURS + 1);

        let chemin_recent = dossier
            .chemin
            .join(format!("{}.log", recent.format("%Y-%m-%d")));
        let chemin_ancien = dossier
            .chemin
            .join(format!("{}.log", ancien.format("%Y-%m-%d")));
        let chemin_sans_date = dossier.chemin.join("notes.txt");
        fs::write(&chemin_recent, "x").unwrap_or(());
        fs::write(&chemin_ancien, "x").unwrap_or(());
        fs::write(&chemin_sans_date, "x").unwrap_or(());

        purger_journaux_anciens(&dossier.chemin);

        assert!(chemin_recent.exists());
        assert!(!chemin_ancien.exists());
        assert!(chemin_sans_date.exists());
    }

    #[test]
    fn purge_ne_supprime_pas_un_journal_exactement_a_la_limite_de_retention() {
        let dossier = DossierTemporaire::nouveau("purge-limite");
        let aujourdhui = chrono::Utc::now().date_naive();
        let a_la_limite = aujourdhui - chrono::Duration::days(RETENTION_JOURS);
        let chemin = dossier
            .chemin
            .join(format!("{}.log", a_la_limite.format("%Y-%m-%d")));
        fs::write(&chemin, "x").unwrap_or(());

        purger_journaux_anciens(&dossier.chemin);

        assert!(chemin.exists());
    }

    #[test]
    fn purge_sur_dossier_absent_ne_panique_pas() {
        let dossier = DossierTemporaire::nouveau("purge-absent");
        let chemin_absent = dossier.chemin.join("sous-dossier-inexistant");

        purger_journaux_anciens(&chemin_absent);
    }

    #[test]
    fn nom_fichier_journal_du_jour_respecte_le_format_aaaa_mm_jj() {
        let nom = nom_fichier_journal_du_jour();

        assert!(chrono::NaiveDate::parse_from_str(&nom, "%Y-%m-%d").is_ok());
    }

    #[test]
    fn dossier_logs_se_termine_par_le_segment_logs() {
        let dossier = dossier_logs();

        assert!(dossier.is_some_and(|chemin| chemin.ends_with("logs")));
    }
}
