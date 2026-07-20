# Normes de sécurité applicative

Synthèse actionnable de [15_normesSecurite.md](../../docs/02_documentation/15_normesSecurite.md). En cas de doute, le document source fait foi ; toute évolution de ce document entraîne la mise à jour de ce fichier.

## Secrets et données sensibles

- Aucun secret n'est jamais persisté sur disque : credentials GitLab/Sonar exclusivement en mémoire volatile, purgés à la fermeture/verrouillage/inactivité ; mot de passe du fichier jamais stocké, seule sa clé dérivée (Argon2id) vit en mémoire de session ([source](../../docs/02_documentation/15_normesSecurite.md#gestion-des-secrets-et-données-sensibles)).
- Credentials transmis uniquement en en-tête HTTP (`PRIVATE-TOKEN`, `Authorization: Bearer`), jamais en paramètre d'URL.
- Aucun secret dans un prompt IA ni dans l'historique Git ; `.env`, `*.pem`, `*.key` et jeux de données de test avec credentials réels exclus du dépôt (cf. [01-usage-ia-et-conventions.md#diligence](./01-usage-ia-et-conventions.md#diligence)).
- Le mot de passe du fichier est réellement redemandé par l'interface à chaque sauvegarde (RG-002), et jamais réutilisé silencieusement depuis une valeur mise en cache côté UI, même si le cœur natif ne conserve que la clé dérivée en mémoire entre deux sauvegardes : cette clé en cache ne sert que les opérations qui n'écrivent rien sur le disque entre deux sauvegardes, jamais à dispenser l'utilisateur de la ressaisie explicite (ajouté le 2026-07-20 : ambiguïté relevée par le Codeur de la Phase 1 entre deux passages de la documentation source, cf. [source](../../docs/02_documentation/15_normesSecurite.md#gestion-des-secrets-et-données-sensibles)).
- Quand un format binaire n'est spécifié par la documentation que par ses grandes composantes (ex. enveloppe chiffrée du fichier de données), la convention concrète retenue (largeur exacte de chaque bloc, encodage) est documentée explicitement dans un document normatif de `docs/02_documentation`, et non dans le seul commentaire du code, afin qu'elle fasse foi de façon stable pour les phases suivantes (ajouté le 2026-07-20 : largeur du bloc « paramètres KDF » de l'enveloppe, fixée à 13 octets par le Codeur de la Phase 1 sans qu'aucun document consulté ne la précise, cf. [source](../../docs/02_documentation/15_normesSecurite.md#gestion-des-secrets-et-données-sensibles)).

## Entrées et sorties

- Toute donnée saisie est validée côté UI **et** revalidée côté cœur natif ; aucune confiance aveugle dans une donnée reçue via une commande ([source](../../docs/02_documentation/15_normesSecurite.md#contrôle-des-entrées-et-sorties)).
- JSON de credentials validé par schéma avant usage ; réponses API GitLab/Sonar désérialisées avec typage strict Rust (champ inattendu → anomalie typée, jamais un comportement indéfini).
- Aucune injection HTML dynamique : contenu externe (noms de projets/dépendances/membres) toujours échappé via l'interpolation Angular ; tout `[innerHTML]`/`bypassSecurityTrust*` soumis à revue explicite. CSP stricte, sans `unsafe-inline` ni `eval`.
- Sélection de fichier uniquement via les API natives de l'OS, jamais une saisie libre de chemin.

## Droits d'accès

- Rôle unique, pas de système de comptes applicatif ; seul contrôle d'accès = mot de passe du fichier de données ([source](../../docs/02_documentation/15_normesSecurite.md#gestion-des-droits-daccès-et-des-permissions)).
- Portée minimale (lecture seule) recommandée pour les credentials GitLab/Sonar saisis par l'utilisateur ; l'application ne les élève ni ne les restreint elle-même, mais avertit en cas de portée excessive détectée.

## Dépendances vulnérables

- `cargo audit`/`npm audit` systématiques en CI ; vulnérabilité critique ou élevée = pipeline bloqué, sauf exception documentée (justification + date de réévaluation) dans un fichier versionné ([source](../../docs/02_documentation/15_normesSecurite.md#analyse-des-dépendances-vulnérables)).

## Journalisation

- Aucune donnée sensible (mot de passe, credential, contenu déchiffré) dans un journal technique, même en niveau de détail maximal ([source](../../docs/02_documentation/15_normesSecurite.md#journalisation-des-événements-sensibles)).
- Journaux strictement locaux : aucune télémétrie, aucun envoi distant, quel que soit le contexte.
