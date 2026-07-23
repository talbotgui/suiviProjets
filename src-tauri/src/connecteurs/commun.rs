// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Types et utilitaires partagés entre le Connecteur GitLab et le Connecteur Sonar (US-004, RG-021), afin d'éviter
//! toute duplication entre `gitlab.rs` et `sonar.rs`, chacun ne conservant que sa logique HTTP propre.

use std::sync::OnceLock;
use std::time::Duration;

/// Délai maximal accordé à un appel de test de connectivité avant anomalie « délai dépassé ».
///
/// Décision arbitraire (cf. rapport de développement de cette phase) : aucune valeur n'est fixée par la
/// documentation pour ce point d'entrée précis. `parametres.audit` ne porte à ce stade qu'un réglage de
/// concurrence, sans délai, et concerne de toute façon les futurs appels d'audit du Moteur d'audit (Phase 5), pas
/// ce test ponctuel de credential.
const DELAI_REQUETE: Duration = Duration::from_secs(10);

/// Catégorie d'anomalie pouvant survenir lors d'un appel à une instance GitLab ou Sonar, alignée sur le catalogue
/// figé RG-021 (`docs/02_documentation/05_reglesGestion.md#audits-et-campagnes`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub(crate) enum ErreurConnecteur {
    /// Le credential fourni a été rejeté par l'instance (statut 401, ou jeton explicitement invalide).
    AuthentificationRefusee,
    /// La ref auditée (branche, tag ou SHA) n'existe pas sur la source au moment de l'audit (Phase 5, Moteur
    /// d'audit) : catégorie RG-021 non mobilisée par le seul test de connectivité ou l'autocomplétion des branches
    /// des phases précédentes, d'où son absence jusqu'ici.
    RefIntrouvable,
    /// L'instance n'a pas pu être jointe (résolution DNS, connexion refusée, etc.).
    InstanceInjoignable,
    /// L'instance n'a pas répondu dans le délai imparti.
    DelaiDepasse,
    /// Réponse HTTP reçue mais ne correspondant pas au format attendu (statut ou JSON inattendu).
    ReponseInattendue,
    /// Le credential est valide mais ne dispose pas des droits suffisants (statut 403).
    DroitsInsuffisants,
    /// Aucun credential n'est actuellement détenu en mémoire pour l'instance demandée (Phase 3, autocomplétion
    /// des branches, US-008) : catégorie propre à `interrogerBranches`, hors catalogue RG-021 d'origine qui ne
    /// couvre que les anomalies d'exécution d'un audit.
    CredentialAbsent,
}

/// Verdict d'un test de connectivité réussi (credential accepté par l'instance).
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct VerdictConnectivite {
    /// `true` si le credential porte une portée excédant la portée minimale en lecture seule recommandée par
    /// l'assistant de création de token (US-004) ; toujours `false` lorsque l'instance ne permet aucun contrôle de
    /// portée à ce point d'entrée (cf. Connecteur Sonar).
    pub(crate) portee_excessive: bool,
}

/// Construit (une seule fois par processus) le client HTTP partagé par les deux connecteurs, avec le délai de
/// requête fixe ci-dessus. Le proxy du poste est pris en compte nativement par `reqwest` (`Proxy::system()`,
/// activé par défaut), conformément à `docs/02_documentation/17_posteDeveloppeur.md#variables-denvironnement`.
pub(crate) fn client_http() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(DELAI_REQUETE)
            .build()
            .unwrap_or_default()
    })
}

/// Traduit une erreur de bas niveau du client HTTP en anomalie typée (RG-021), sans jamais exposer le message
/// technique brut à l'appelant (cf. `ErreurFacade`, qui ne détaille jamais d'information technique sensible).
pub(crate) fn erreur_depuis_reqwest(erreur: &reqwest::Error) -> ErreurConnecteur {
    if erreur.is_timeout() {
        ErreurConnecteur::DelaiDepasse
    } else if erreur.is_connect() {
        ErreurConnecteur::InstanceInjoignable
    } else {
        ErreurConnecteur::ReponseInattendue
    }
}
