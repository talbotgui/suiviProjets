# Normes de sécurité applicative

## Sommaire

1. [Gestion des secrets et données sensibles](#gestion-des-secrets-et-données-sensibles)
2. [Contrôle des entrées et sorties](#contrôle-des-entrées-et-sorties)
3. [Gestion des droits d'accès et des permissions](#gestion-des-droits-daccès-et-des-permissions)
4. [Analyse des dépendances vulnérables](#analyse-des-dépendances-vulnérables)
5. [Journalisation des événements sensibles](#journalisation-des-événements-sensibles)

## Gestion des secrets et données sensibles

- Aucun secret n'est jamais persisté sur disque : les credentials (tokens GitLab/Sonar) vivent exclusivement en mémoire volatile, purgés à la fermeture, au verrouillage et après le délai d'inactivité ([RG-004](./05_reglesGestion.md#stockage-et-confidentialité-des-données)).
- Le mot de passe du fichier de données n'est jamais stocké : seule la clé qui en est dérivée (Argon2id) est conservée en mémoire pendant la session ([RG-002](./05_reglesGestion.md#stockage-et-confidentialité-des-données)) ; les paramètres KDF et le sel présents dans l'enveloppe ne permettent pas de retrouver le mot de passe.
- Les credentials sont transmis exclusivement en en-tête HTTP vers l'instance concernée (`PRIVATE-TOKEN`, `Authorization: Bearer`), jamais en paramètre d'URL, pour éviter toute fuite dans des journaux de proxy ou de serveur intermédiaire.
- Aucun secret n'est transmis à l'IA dans les prompts, ni committé dans l'historique Git (rappel de la protection des informations sensibles actée à l'étape 1) ; les fichiers `.env`, `*.pem`, `*.key` et tout jeu de données de test contenant des credentials réels sont exclus du dépôt.
- Le bundle d'autorité de certification interne et l'URL de proxy (`parametres.proxy`, cf. [RNF-023](./07_exigencesNonFonctionnelles.md#portabilité-et-environnements-cibles)) ne sont pas des secrets applicatifs au sens strict mais restent internes à l'organisation : ils font partie de la branche `parametres`, jamais couverte par l'export en clair au-delà de `parametres.seuils` ([RG-028](./05_reglesGestion.md#vues-alertes-export-et-import)).
- Le mot de passe du fichier est réellement redemandé par l'interface à chaque sauvegarde, conformément à [RG-002](./05_reglesGestion.md#stockage-et-confidentialité-des-données), et non silencieusement réutilisé depuis une valeur mise en cache côté UI : la clé dérivée conservée en mémoire côté cœur natif entre deux sauvegardes ne sert que les opérations qui n'écrivent rien sur le disque dans l'intervalle, jamais à dispenser l'utilisateur de la ressaisie explicite du mot de passe au moment d'écrire (ajouté le 2026-07-20 : à l'implémentation de la Phase 1, le Codeur a relevé une tension apparente entre le passage de la spécification imposant la ressaisie à chaque sauvegarde et celui justifiant la conservation de la clé dérivée en mémoire pour éviter de refaire la dérivation coûteuse ; ces deux passages ne sont compatibles que si la régénération obligatoire du sel à chaque sauvegarde, cf. [RNF-012](./07_exigencesNonFonctionnelles.md#sécurité), impose de toute façon une nouvelle dérivation à partir du mot de passe ressaisi, la clé en cache ne servant qu'entre deux sauvegardes).
- Quand un format binaire n'est décrit par la documentation que par ses grandes composantes (ex. l'enveloppe chiffrée de [Specification.md, section 6.3](../01_besoin/Specification.md#63-enveloppe-chiffrée), dont le bloc « paramètres KDF » n'est pas détaillé au-delà de sa présence), la convention concrète retenue pour l'implémenter (largeur exacte de chaque bloc, encodage) est documentée explicitement dans un document normatif de `docs/02_documentation`, et non dans le seul commentaire du code source, afin de rester stable et opposable aux phases suivantes plutôt que sujette à réinterprétation (ajouté le 2026-07-20 : bloc « paramètres KDF » fixé à une largeur de 13 octets par le Codeur de la Phase 1, faute de toute précision documentaire sur ce point).

## Contrôle des entrées et sorties

- Toute donnée saisie par l'utilisateur (nom de groupe/projet, motif d'une règle, commentaire de traitement d'alerte) est validée côté UI avant envoi à la Façade de commandes, puis revalidée côté cœur natif : aucune confiance aveugle n'est accordée aux données reçues via une commande.
- Le collage d'une chaîne JSON de credentials ([F02](../01_besoin/Specification.md#52-f02--gestion-des-credentials-et-assistant-de-création)) est validé par schéma avant tout usage ; un contenu malformé ou hors schéma est rejeté avec un message explicite, sans tentative d'interprétation partielle.
- Les réponses des API GitLab et Sonar sont désérialisées avec un typage strict côté Rust ; un champ inattendu ou manquant produit une anomalie typée « réponse inattendue » ([RG-021](./05_reglesGestion.md#audits-et-campagnes)) plutôt qu'un comportement indéfini.
- Aucune injection HTML dynamique côté UI : les noms de projets, de dépendances ou de membres, bien qu'issus d'API externes, sont donc traités comme non fiables à l'affichage et systématiquement échappés par les mécanismes natifs d'Angular (interpolation) ; tout contournement de cet assainissement (`[innerHTML]`, `bypassSecurityTrust*`) est soumis à revue explicite avant intégration.
- Une Content Security Policy stricte est appliquée, sans `unsafe-inline` ni `eval` ([RNF-015](./07_exigencesNonFonctionnelles.md#sécurité)).
- La sélection du fichier de données passe systématiquement par les API natives de sélection de fichier du système d'exploitation, jamais par une saisie libre de chemin interprétée sans contrôle.

## Gestion des droits d'accès et des permissions

| rôle | permissions |
|---|---|
| Utilisateur unique (Camille) | Accès complet à l'ensemble des fonctionnalités de l'application, sans restriction interne, une fois le fichier de données déchiffré avec le mot de passe correct |

L'application ne comporte pas de système de comptes ni de rôles applicatifs internes ([RNF-018](./07_exigencesNonFonctionnelles.md#sécurité)) : le seul contrôle d'accès est la connaissance du mot de passe du fichier de données. Les droits d'accès aux instances GitLab et Sonar elles-mêmes sont déterminés par la portée des credentials saisis par l'utilisateur, dont la portée minimale en lecture seule est recommandée par l'assistant de création de token ([F02](../01_besoin/Specification.md#52-f02--gestion-des-credentials-et-assistant-de-création)) ; l'application ne les élève ni ne les restreint elle-même, mais avertit en cas de portée excessive détectée.

## Analyse des dépendances vulnérables

Conformément à [RNF-016](./07_exigencesNonFonctionnelles.md#sécurité), les dépendances du projet sont verrouillées par fichier de lock et auditées en continu :

- `cargo audit` (Rust) et `npm audit` (Angular/npm) sont exécutés systématiquement en intégration continue (cf. [mise en place du pipeline, étape 12](./18_pic.md#mise-en-place-du-pipeline)) et recommandés en local avant tout commit introduisant une nouvelle dépendance.
- Toute vulnérabilité de sévérité critique ou élevée détectée bloque l'intégration continue jusqu'à mise à jour de la dépendance ou justification documentée d'exception.
- L'analyse est déclenchée à chaque commit poussé, complétée par une exécution périodique indépendante des commits (fréquence précisée à l'étape 12), afin de détecter les vulnérabilités publiées après le dernier commit touchant une dépendance restée inchangée.
- Les exceptions (vulnérabilité connue sans correctif disponible, jugée non exploitable dans le contexte de cette application locale) sont documentées explicitement, avec justification et date de réévaluation, dans un fichier d'exceptions versionné dans le dépôt.

## Journalisation des événements sensibles

- Le [journal des modifications](./12_modeleDonnees.md#entités-attributs-et-relations) (`EntréeJournal`, étape 7) journalise toute modification d'une donnée de jugement, conformément à [RG-023](./05_reglesGestion.md#seuils-référentiels-et-historisation) : seuil, référentiel, qualification d'un membre, politique IA d'un projet, ref auditée d'une source. Le changement de politique IA d'un projet vers autorisé crée **à la fois** une entrée de ce journal **et** une annotation système horodatée et non supprimable ([RG-015](./05_reglesGestion.md#constat-jugement-et-politique-ia)) : l'annotation sert de repère visuel sur les graphiques, le journal en conserve la trace exhaustive et horodatée au même titre que les autres données de jugement (décision actée en revue complète, cf. [journal des décisions](./02_glossaire.md#journal-des-décisions)).
- Des événements techniques de sécurité, distincts de ce journal fonctionnel, sont journalisés localement : échecs de déchiffrement du fichier de données, échecs de déverrouillage de session consécutifs, fermeture automatique du fichier après dépassement du nombre d'échecs autorisé.
- Aucune donnée sensible (mot de passe, credential, contenu déchiffré) n'apparaît jamais dans un journal technique ou une trace de diagnostic, y compris au niveau de journalisation le plus détaillé ; seuls des identifiants et des catégories d'événements y figurent.
- Les journaux techniques restent strictement locaux, sans télémétrie ni envoi distant, cohérent avec le principe d'une application entièrement locale ; leur emplacement précis et leur politique de rétention sont fixés à l'étape 12 (cf. [Journalisation applicative et gestion des erreurs en production](./19_environnementProduction.md#journalisation-applicative-et-gestion-des-erreurs-en-production)).
