// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.

//! État de session détenu côté cœur natif par la Façade de commandes (US-026, RG-002, RG-004, RG-005) : chemin du
//! fichier actuellement ouvert, clé dérivée courante et credentials en mémoire (une entrée par identifiant
//! d'instance, US-003/US-004). Le mot de passe lui-même n'est jamais conservé, seule la clé dérivée l'est, pour la
//! durée de la session (RG-002). Les credentials ne sont jamais persistés sur disque : ils sont transmis en
//! paramètre de chaque commande qui en a besoin (`testerConnectivite`) et uniquement mirroirés ici afin qu'un
//! unique verrouillage de session les efface aussi bien côté interface que côté cœur natif (RG-004, RG-005, cf.
//! `docs/02_documentation/13_conceptionDetaillee.md#séquences-des-scénarios-fonctionnels-principaux`, séquence
//! « Verrouiller et déverrouiller la session »). Le verrouillage efface la clé dérivée et les credentials sans
//! oublier le chemin du fichier, afin de permettre un déverrouillage ultérieur par nouvelle vérification du mot de
//! passe sans ressaisie du chemin.
//!
//! Géré par Tauri comme état managé ([`tauri::Manager::manage`]), partagé entre toutes les commandes de la
//! session applicative.

use crate::modele::racine::Proxy;
use crate::persistance::kdf::TAILLE_CLE;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard, PoisonError};
use zeroize::{Zeroize, Zeroizing};

/// Clé dérivée détenue en mémoire, effacée explicitement (mise à zéro) à sa destruction plutôt que laissée dans
/// une zone mémoire réutilisable en clair (RG-002, RG-005, RNF-013).
struct CleSession([u8; TAILLE_CLE]);

impl Drop for CleSession {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}

/// Contenu protégé par le verrou interne de [`EtatSession`].
#[derive(Default)]
struct EtatSessionInterieur {
    /// Chemin du fichier de données actuellement ouvert, conservé y compris pendant un verrouillage temporaire.
    chemin_fichier: Option<PathBuf>,
    /// Clé dérivée courante, absente lorsque la session est verrouillée ou qu'aucun fichier n'est ouvert.
    cle_derivee: Option<CleSession>,
    /// Credentials en mémoire de la session courante, par identifiant d'instance (RG-004) : jamais persistés sur
    /// disque, effacés explicitement (mise à zéro) avec la structure qui les porte.
    credentials: HashMap<String, Zeroizing<String>>,
    /// Réglage applicatif de proxy actuellement en vigueur (US-034, RG-031), mis en cache ici depuis
    /// `parametres.proxy` des données chargées afin que les commandes d'interrogation d'indicateurs (`audit.rs`,
    /// `connectivite.rs`), qui ne reçoivent jamais la racine complète du fichier (décision arbitraire de la
    /// Phase 5, cf. commentaire d'en-tête de `commandes::audit`), puissent construire un client HTTP qui en tient
    /// compte sans changement de leur signature. À la différence de `cle_derivee`/`credentials`, n'est jamais
    /// effacé par [`EtatSession::purger`] : ce n'est pas un secret, et le proxy réseau du poste reste pertinent
    /// même verrouillé.
    proxy: Option<Proxy>,
    /// Client HTTP mis en cache avec le réglage de proxy avec lequel il a été construit, pour réutiliser le pool de
    /// connexions HTTP/TLS sous-jacent d'un appel à l'autre au sein d'une même campagne d'audit plutôt que de rouvrir
    /// une connexion neuve à chaque interrogation d'indicateur (plusieurs appels consécutifs vers la même instance
    /// Sonar/GitLab en quelques secondes, constat relevé lors du diagnostic d'un blocage de campagne signalé par
    /// l'utilisateur). Reconstruit automatiquement dès que le réglage de proxy en cache diverge de celui
    /// actuellement en vigueur (comparaison à chaque appel de [`EtatSession::client_http`]), jamais invalidé
    /// autrement : `reqwest::Client` ne porte aucun credential (transmis par requête via `bearer_auth`, jamais au
    /// niveau du client), sa mise en cache ne pose donc pas de risque de fuite entre deux sessions différentes.
    client_http_cache: Option<(Option<Proxy>, reqwest::Client)>,
}

/// État de session de la Façade de commandes, partagé entre les commandes via l'état managé de Tauri.
#[derive(Default)]
pub(crate) struct EtatSession {
    interieur: Mutex<EtatSessionInterieur>,
}

/// Accède au contenu protégé, en récupérant les données même si le verrou a été empoisonné par une panique
/// antérieure : aucune commande de ce module ne recourt à `.unwrap()`/`.expect()`, un empoisonnement ne devrait
/// donc jamais survenir en pratique, mais la récupération explicite évite qu'une telle panique, si elle survenait
/// malgré tout, ne rende la session définitivement inutilisable.
fn deverrouiller_mutex<'a>(
    resultat: Result<
        MutexGuard<'a, EtatSessionInterieur>,
        PoisonError<MutexGuard<'a, EtatSessionInterieur>>,
    >,
) -> MutexGuard<'a, EtatSessionInterieur> {
    match resultat {
        Ok(garde) => garde,
        Err(empoisonne) => empoisonne.into_inner(),
    }
}

impl EtatSession {
    /// Construit un état de session vide (aucun fichier ouvert).
    pub(crate) fn nouveau() -> Self {
        Self::default()
    }

    /// Enregistre le fichier ouvert et sa clé dérivée courante, remplaçant tout état précédent. Purge également
    /// les credentials d'une éventuelle session précédente : ouvrir un nouveau fichier ne doit jamais laisser
    /// fuiter les credentials du fichier précédemment ouvert (défense en profondeur, cohérent avec RG-004).
    pub(crate) fn definir(&self, chemin_fichier: PathBuf, cle_derivee: [u8; TAILLE_CLE]) {
        let mut interieur = deverrouiller_mutex(self.interieur.lock());
        interieur.chemin_fichier = Some(chemin_fichier);
        interieur.cle_derivee = Some(CleSession(cle_derivee));
        interieur.credentials.clear();
    }

    /// Remplace intégralement les credentials détenus en mémoire pour la session courante (US-003), mirroir côté
    /// cœur natif du Store d'état applicatif de l'interface, afin qu'un unique verrouillage de session les efface
    /// des deux côtés (RG-004, RG-005). Revalide qu'aucune valeur n'est vide plutôt que de faire confiance à la
    /// validation déjà effectuée côté interface (`ValidationCredentialsUtils`), conformément à
    /// `docs/02_documentation/15_normesSecurite.md#contrôle-des-entrées-et-sorties` : si un credential vide est
    /// présent, aucun credential n'est mémorisé (y compris ceux qui étaient valides dans le même appel) et `false`
    /// est renvoyé.
    pub(crate) fn definir_credentials(&self, credentials: HashMap<String, String>) -> bool {
        if credentials.values().any(String::is_empty) {
            return false;
        }
        let mut interieur = deverrouiller_mutex(self.interieur.lock());
        interieur.credentials = credentials
            .into_iter()
            .map(|(id, jeton)| (id, Zeroizing::new(jeton)))
            .collect();
        true
    }

    /// Nombre de credentials actuellement détenus en mémoire pour la session courante, à des fins de test de la
    /// purge (RG-004, RG-005).
    #[allow(
        dead_code,
        reason = "exercé uniquement par les tests ci-dessous ; utile aux commandes qui liront un jour la présence d'un credential sans le divulguer"
    )]
    pub(crate) fn nombre_credentials(&self) -> usize {
        deverrouiller_mutex(self.interieur.lock()).credentials.len()
    }

    /// Credential actuellement détenu en mémoire pour l'instance donnée, `None` si aucun n'a été saisi pour cette
    /// instance (Phase 3, `interrogerBranches`, US-008) : une copie éphémère est retournée, le credential n'étant
    /// jamais exposé autrement qu'en en-tête HTTP vers l'instance concernée (RG-004).
    pub(crate) fn credential(&self, instance_id: &str) -> Option<String> {
        deverrouiller_mutex(self.interieur.lock())
            .credentials
            .get(instance_id)
            .map(|jeton| jeton.to_string())
    }

    /// Chemin du fichier actuellement ouvert, y compris lorsque la session est verrouillée.
    pub(crate) fn chemin_fichier(&self) -> Option<PathBuf> {
        deverrouiller_mutex(self.interieur.lock())
            .chemin_fichier
            .clone()
    }

    /// Efface la clé dérivée et l'ensemble des credentials détenus, sans oublier le chemin du fichier ouvert
    /// (RG-005). Utilisé par la commande de verrouillage de session.
    pub(crate) fn purger(&self) {
        let mut interieur = deverrouiller_mutex(self.interieur.lock());
        interieur.cle_derivee = None;
        interieur.credentials.clear();
    }

    /// Met à jour le réglage applicatif de proxy en cache (US-034, RG-031), depuis `parametres.proxy` des données
    /// couramment chargées : appelé à la création/au chargement/au rechargement du fichier ainsi qu'à chaque
    /// modification de ce réglage par `definirProxy`.
    pub(crate) fn definir_proxy(&self, proxy: Option<Proxy>) {
        deverrouiller_mutex(self.interieur.lock()).proxy = proxy;
    }

    /// Construit un client HTTP tenant compte du réglage applicatif de proxy actuellement en cache (US-034,
    /// RG-031), en plus du proxy système déjà pris en compte nativement. Réutilise le client HTTP mis en cache
    /// (`EtatSessionInterieur::client_http_cache`) tant que le réglage de proxy n'a pas changé depuis sa
    /// construction, afin que les appels consécutifs d'une même campagne d'audit vers la même instance
    /// Sonar/GitLab réutilisent le même pool de connexions HTTP/TLS plutôt que d'en rouvrir une neuve à chaque
    /// interrogation d'indicateur ; `reqwest::Client::clone()` partage ce pool sans le reconstruire (coût
    /// négligeable). Un changement de proxy (`definirProxy`) n'a pas besoin d'invalider explicitement ce cache :
    /// la comparaison ci-dessous le détecte et reconstruit un client au prochain appel.
    pub(crate) fn client_http(&self) -> reqwest::Client {
        let mut interieur = deverrouiller_mutex(self.interieur.lock());
        let proxy_courant = interieur.proxy.clone();
        if let Some((proxy_cache, client)) = &interieur.client_http_cache
            && *proxy_cache == proxy_courant
        {
            return client.clone();
        }
        let client = crate::connecteurs::commun::client_http_avec_proxy(proxy_courant.as_ref());
        interieur.client_http_cache = Some((proxy_courant, client.clone()));
        client
    }

    /// Indique si une clé dérivée est actuellement détenue (session déverrouillée avec un fichier ouvert).
    pub(crate) fn est_deverrouillee(&self) -> bool {
        deverrouiller_mutex(self.interieur.lock())
            .cle_derivee
            .is_some()
    }

    /// Compare, en temps constant, la clé fournie à la clé dérivée actuellement détenue par la session (R10-01,
    /// RG-002) : utilisé pour revérifier qu'un mot de passe fourni à une commande de mutation correspond bien à
    /// celui déjà authentifié pour la session courante, avant toute réécriture du fichier. Retourne toujours
    /// `false` si aucune clé n'est détenue (session verrouillée ou aucun fichier ouvert), sans qu'aucune
    /// comparaison ne soit alors tentée.
    pub(crate) fn correspond_a(&self, cle: &[u8; TAILLE_CLE]) -> bool {
        deverrouiller_mutex(self.interieur.lock())
            .cle_derivee
            .as_ref()
            .is_some_and(|cle_session| comparaison_temps_constant(&cle_session.0, cle))
    }
}

/// Compare deux clés octet à octet sans interrompre la boucle à la première différence trouvée (temps constant),
/// pour ne pas exposer par canal auxiliaire la position du premier octet divergent d'un mot de passe erroné.
fn comparaison_temps_constant(a: &[u8; TAILLE_CLE], b: &[u8; TAILLE_CLE]) -> bool {
    a.iter()
        .zip(b.iter())
        .fold(0u8, |divergence, (x, y)| divergence | (x ^ y))
        == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn etat_initial_ne_porte_aucun_fichier_ni_aucune_cle() {
        let etat = EtatSession::nouveau();

        assert_eq!(etat.chemin_fichier(), None);
        assert!(!etat.est_deverrouillee());
    }

    #[test]
    fn definir_puis_purger_efface_la_cle_mais_conserve_le_chemin() {
        let etat = EtatSession::nouveau();
        let chemin = PathBuf::from("/tmp/donnees-test.sqm");

        etat.definir(chemin.clone(), [1u8; TAILLE_CLE]);
        assert!(etat.est_deverrouillee());
        assert_eq!(etat.chemin_fichier(), Some(chemin.clone()));

        etat.purger();

        assert!(!etat.est_deverrouillee());
        assert_eq!(etat.chemin_fichier(), Some(chemin));
    }

    #[test]
    fn purger_efface_les_credentials_sans_toucher_au_chemin() {
        let etat = EtatSession::nouveau();
        etat.definir(PathBuf::from("/tmp/donnees-test.sqm"), [1u8; TAILLE_CLE]);
        etat.definir_credentials(HashMap::from([(
            "instance-1".to_string(),
            "jeton-secret".to_string(),
        )]));
        assert_eq!(etat.nombre_credentials(), 1);

        etat.purger();

        assert_eq!(etat.nombre_credentials(), 0);
    }

    #[test]
    fn definir_un_nouveau_fichier_purge_les_credentials_dune_session_precedente() {
        let etat = EtatSession::nouveau();
        etat.definir(PathBuf::from("/tmp/premier.sqm"), [1u8; TAILLE_CLE]);
        etat.definir_credentials(HashMap::from([(
            "instance-1".to_string(),
            "jeton-secret".to_string(),
        )]));
        assert_eq!(etat.nombre_credentials(), 1);

        etat.definir(PathBuf::from("/tmp/second.sqm"), [2u8; TAILLE_CLE]);

        assert_eq!(etat.nombre_credentials(), 0);
    }

    #[test]
    fn definir_credentials_remplace_integralement_la_map_precedente() {
        let etat = EtatSession::nouveau();
        etat.definir_credentials(HashMap::from([(
            "instance-1".to_string(),
            "premier-jeton".to_string(),
        )]));

        etat.definir_credentials(HashMap::from([(
            "instance-2".to_string(),
            "second-jeton".to_string(),
        )]));

        assert_eq!(etat.nombre_credentials(), 1);
    }

    #[test]
    fn credential_retourne_none_pour_une_instance_sans_credential() {
        let etat = EtatSession::nouveau();

        assert_eq!(etat.credential("instance-inconnue"), None);
    }

    #[test]
    fn credential_retourne_le_jeton_de_linstance_demandee() {
        let etat = EtatSession::nouveau();
        etat.definir_credentials(HashMap::from([(
            "instance-1".to_string(),
            "jeton-secret".to_string(),
        )]));

        assert_eq!(
            etat.credential("instance-1"),
            Some("jeton-secret".to_string())
        );
        assert_eq!(etat.credential("instance-2"), None);
    }

    #[test]
    fn definir_credentials_rejette_une_valeur_vide_sans_rien_memoriser() {
        let etat = EtatSession::nouveau();
        etat.definir_credentials(HashMap::from([(
            "instance-1".to_string(),
            "jeton-valide".to_string(),
        )]));

        let accepte =
            etat.definir_credentials(HashMap::from([("instance-2".to_string(), String::new())]));

        assert!(!accepte);
        assert_eq!(
            etat.nombre_credentials(),
            1,
            "la map de credentials valide précédente ne doit pas être écrasée par un appel rejeté"
        );
    }

    #[test]
    fn correspond_a_est_faux_sans_cle_en_session() {
        let etat = EtatSession::nouveau();

        assert!(!etat.correspond_a(&[1u8; TAILLE_CLE]));
    }

    #[test]
    fn correspond_a_est_vrai_pour_la_cle_identique() {
        let etat = EtatSession::nouveau();
        etat.definir(PathBuf::from("/tmp/donnees-test.sqm"), [7u8; TAILLE_CLE]);

        assert!(etat.correspond_a(&[7u8; TAILLE_CLE]));
    }

    #[test]
    fn correspond_a_est_faux_pour_une_cle_divergente() {
        let etat = EtatSession::nouveau();
        etat.definir(PathBuf::from("/tmp/donnees-test.sqm"), [7u8; TAILLE_CLE]);

        assert!(!etat.correspond_a(&[8u8; TAILLE_CLE]));
    }

    #[test]
    fn correspond_a_redevient_faux_apres_purge() {
        let etat = EtatSession::nouveau();
        etat.definir(PathBuf::from("/tmp/donnees-test.sqm"), [7u8; TAILLE_CLE]);
        etat.purger();

        assert!(!etat.correspond_a(&[7u8; TAILLE_CLE]));
    }

    #[test]
    fn proxy_absent_par_defaut() {
        let etat = EtatSession::nouveau();

        // Doit pouvoir construire un client HTTP même sans réglage de proxy défini.
        let _client = etat.client_http();
    }

    #[test]
    fn definir_proxy_est_repris_par_client_http() {
        let etat = EtatSession::nouveau();

        etat.definir_proxy(Some(Proxy {
            url: Some("http://proxy.exemple.local:3128".to_string()),
            chemin_bundle_ca: None,
        }));

        // Le client se construit sans panique avec un réglage de proxy valide.
        let _client = etat.client_http();
    }

    #[test]
    fn client_http_met_en_cache_le_client_avec_le_proxy_courant() {
        let etat = EtatSession::nouveau();

        let _client = etat.client_http();

        let proxy_en_cache = deverrouiller_mutex(etat.interieur.lock())
            .client_http_cache
            .as_ref()
            .map(|(proxy, _)| proxy.clone());
        assert_eq!(proxy_en_cache, Some(None));
    }

    #[test]
    fn client_http_reconstruit_le_client_quand_le_proxy_change() {
        let etat = EtatSession::nouveau();
        let _premier_client = etat.client_http();

        etat.definir_proxy(Some(Proxy {
            url: Some("http://proxy.exemple.local:3128".to_string()),
            chemin_bundle_ca: None,
        }));
        let _second_client = etat.client_http();

        let proxy_en_cache = deverrouiller_mutex(etat.interieur.lock())
            .client_http_cache
            .as_ref()
            .and_then(|(proxy, _)| proxy.as_ref())
            .and_then(|proxy| proxy.url.clone());
        assert_eq!(
            proxy_en_cache,
            Some("http://proxy.exemple.local:3128".to_string()),
            "le cache doit refléter le nouveau réglage de proxy après reconstruction"
        );
    }

    #[test]
    fn purger_ne_touche_pas_au_proxy_en_cache() {
        let etat = EtatSession::nouveau();
        etat.definir(PathBuf::from("/tmp/donnees-test.sqm"), [1u8; TAILLE_CLE]);
        etat.definir_proxy(Some(Proxy {
            url: Some("http://proxy.exemple.local:3128".to_string()),
            chemin_bundle_ca: None,
        }));

        etat.purger();

        assert_eq!(
            deverrouiller_mutex(etat.interieur.lock())
                .proxy
                .as_ref()
                .and_then(|proxy| proxy.url.clone()),
            Some("http://proxy.exemple.local:3128".to_string())
        );
    }
}
