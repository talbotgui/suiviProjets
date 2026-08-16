// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! Types et utilitaires partagés entre le Connecteur GitLab et le Connecteur Sonar (US-004, RG-021), afin d'éviter
//! toute duplication entre `gitlab.rs` et `sonar.rs`, chacun ne conservant que sa logique HTTP propre.

use std::time::Duration;

/// Délai maximal accordé à tout appel GitLab/Sonar (test de connectivité, autocomplétion, indicateurs d'audit)
/// avant anomalie « délai dépassé ».
///
/// Décision arbitraire (cf. rapport de développement de cette phase) : aucune valeur n'est fixée par la
/// documentation pour ce point d'entrée précis. `parametres.audit` ne porte à ce stade qu'un réglage de
/// concurrence, sans délai, et concerne de toute façon les futurs appels d'audit du Moteur d'audit (Phase 5), pas
/// ce test ponctuel de credential.
///
/// Portée à 30 secondes (contre 10 auparavant) pour corriger R15-05 (Phase 15, recette du 2026-08-16) : une
/// anomalie `DelaiDepasse` a été constatée sur `listerSourcesDisponibles` contre une instance GitLab réelle,
/// probablement trop juste pour une liste paginée de projets (`membership=true&simple=true&per_page=100`) sur une
/// instance distante potentiellement chargée. Ce relèvement ne couvre que l'hypothèse d'un délai réseau trop court
/// parmi les trois envisagées à l'analyse de R15-05 (les deux autres, un proxy sortant requis mais non configuré ou
/// une instance réellement injoignable depuis le poste, restent hors du contrôle de ce seul réglage et doivent être
/// écartées séparément si l'anomalie persiste) ; valeur à confirmer par un humain plutôt que présumée définitive.
const DELAI_REQUETE: Duration = Duration::from_secs(30);

/// Catégorie d'anomalie pouvant survenir lors d'un appel à une instance GitLab ou Sonar, alignée sur le catalogue
/// figé RG-021 (`docs/02_documentation/05_reglesGestion.md#audits-et-campagnes`).
///
/// Chaque variante porte désormais un champ `message` : message technique brut (statut HTTP, texte d'erreur
/// réseau/parsing) destiné au futur écran « rapport d'anomalies » (US-013/RG-021/F08), affiché de façon repliable.
/// Ce message ne doit jamais contenir de credential, de jeton ou d'en-tête d'authentification
/// (`docs/02_documentation/15_normesSecurite.md`) : il reste un diagnostic structurel, jamais une donnée sensible.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub(crate) enum ErreurConnecteur {
    /// Le credential fourni a été rejeté par l'instance (statut 401, ou jeton explicitement invalide).
    AuthentificationRefusee {
        /// Message technique brut associé à l'anomalie (diagnostic uniquement, jamais de credential).
        message: String,
    },
    /// La ref auditée (branche, tag ou SHA) n'existe pas sur la source au moment de l'audit (Phase 5, Moteur
    /// d'audit) : catégorie RG-021 non mobilisée par le seul test de connectivité ou l'autocomplétion des branches
    /// des phases précédentes, d'où son absence jusqu'ici.
    RefIntrouvable {
        /// Message technique brut associé à l'anomalie (diagnostic uniquement, jamais de credential).
        message: String,
    },
    /// L'instance n'a pas pu être jointe (résolution DNS, connexion refusée, etc.).
    InstanceInjoignable {
        /// Message technique brut associé à l'anomalie (diagnostic uniquement, jamais de credential).
        message: String,
    },
    /// L'instance n'a pas répondu dans le délai imparti.
    DelaiDepasse {
        /// Message technique brut associé à l'anomalie (diagnostic uniquement, jamais de credential).
        message: String,
    },
    /// Réponse HTTP reçue mais ne correspondant pas au format attendu (statut ou JSON inattendu).
    ReponseInattendue {
        /// Message technique brut associé à l'anomalie (diagnostic uniquement, jamais de credential).
        message: String,
    },
    /// Le credential est valide mais ne dispose pas des droits suffisants (statut 403).
    DroitsInsuffisants {
        /// Message technique brut associé à l'anomalie (diagnostic uniquement, jamais de credential).
        message: String,
    },
    /// Aucun credential n'est actuellement détenu en mémoire pour l'instance demandée (Phase 3, autocomplétion
    /// des branches, US-008) : catégorie propre à `interrogerBranches`, hors catalogue RG-021 d'origine qui ne
    /// couvre que les anomalies d'exécution d'un audit.
    CredentialAbsent {
        /// Message technique brut associé à l'anomalie (diagnostic uniquement, jamais de credential).
        message: String,
    },
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

/// Élément de la liste des dépôts GitLab ou des projets Sonar accessibles avec le credential courant d'une
/// Instance, proposé par l'autocomplétion de l'identifiant externe d'une source (US-008, RG-036, ajouté le
/// 2026-08-02).
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SourceDisponible {
    /// Valeur à retenir comme `Source.idExterne` (identifiant du projet côté GitLab, clé du projet côté Sonar).
    pub(crate) id_externe: String,
    /// Libellé lisible affiché dans la liste (chemin complet du dépôt GitLab, nom du projet Sonar).
    pub(crate) libelle: String,
}

/// Construit un client HTTP tenant compte du réglage applicatif de proxy optionnel fourni (US-034, RG-031), en
/// complément du proxy système déjà pris en compte nativement par `reqwest` (`Proxy::system()`, actif par défaut
/// pour toute requête, y compris avec ce réglage additionnel). `None` reproduit le comportement du client par
/// défaut d'avant la Phase 10 (proxy système seul), utilisé par exemple par les tests d'intégration hors CI
/// (`connecteurs::tests_integration_reelle`). Reconstruit un client à chaque appel plutôt que de le mettre en cache
/// pour le processus entier (à la différence du choix initial de la Phase 2) : le réglage de proxy peut changer en
/// cours de session (`definirProxy`), ce qu'un singleton `OnceLock` ne pourrait jamais refléter ; ce coût de
/// reconstruction reste négligeable au regard de la latence réseau de chaque appel HTTP effectué avec ce client.
///
/// Une URL de proxy syntaxiquement invalide ou un fascicule de certificats illisible/invalide sont ignorés
/// silencieusement (repli sur le comportement par défaut) plutôt que de faire échouer la construction du client :
/// ces deux valeurs ont déjà été validées à leur saisie (`definirProxy`, RG-031), ce cas ne devrait donc survenir
/// qu'en cas de modification externe du fichier de données entre-temps, auquel cas dégrader silencieusement vers
/// le proxy système reste préférable à l'échec de toute interrogation d'indicateur.
pub(crate) fn client_http_avec_proxy(
    proxy: Option<&crate::modele::racine::Proxy>,
) -> reqwest::Client {
    let mut builder = reqwest::Client::builder().timeout(DELAI_REQUETE);
    if let Some(proxy) = proxy {
        if let Some(url) = proxy.url.as_deref().filter(|url| !url.is_empty())
            && let Ok(proxy_reqwest) = reqwest::Proxy::all(url)
        {
            builder = builder.proxy(proxy_reqwest);
        }
        if let Some(chemin) = proxy.chemin_bundle_ca.as_deref()
            && let Ok(pem) = std::fs::read(chemin)
            && let Ok(certificat) = reqwest::Certificate::from_pem(&pem)
        {
            builder = builder.add_root_certificate(certificat);
        }
    }
    builder.build().unwrap_or_default()
}

/// Traduit une erreur de bas niveau du client HTTP en anomalie typée (RG-021). Conserve désormais le message
/// technique brut de l'erreur `reqwest` (texte de diagnostic réseau/délai, jamais un credential ni un en-tête
/// d'authentification) pour le futur écran « rapport d'anomalies » (US-013/RG-021/F08), à la différence de
/// `ErreurFacade`, qui ne détaille jamais d'information technique côté UI générale.
pub(crate) fn erreur_depuis_reqwest(erreur: &reqwest::Error) -> ErreurConnecteur {
    if erreur.is_timeout() {
        ErreurConnecteur::DelaiDepasse {
            message: erreur.to_string(),
        }
    } else if erreur.is_connect() {
        ErreurConnecteur::InstanceInjoignable {
            message: erreur.to_string(),
        }
    } else {
        ErreurConnecteur::ReponseInattendue {
            message: erreur.to_string(),
        }
    }
}
