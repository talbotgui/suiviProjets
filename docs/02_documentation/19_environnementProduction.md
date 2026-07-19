# Installation de l'environnement de production et déploiement

## Sommaire

1. [Prérequis de l'environnement de production](#prérequis-de-lenvironnement-de-production)
2. [Étapes d'installation de l'environnement](#étapes-dinstallation-de-lenvironnement)
3. [Stratégie de déploiement](#stratégie-de-déploiement)
4. [Stratégie de build, empaquetage et publication](#stratégie-de-build-empaquetage-et-publication)
5. [Gestion des versions et des mises à jour](#gestion-des-versions-et-des-mises-à-jour)
6. [Journalisation applicative et gestion des erreurs en production](#journalisation-applicative-et-gestion-des-erreurs-en-production)
7. [Supervision](#supervision)
8. [Plan de reprise d'activité](#plan-de-reprise-dactivité)
9. [Procédures d'exploitation post-déploiement](#procédures-dexploitation-post-déploiement)

Cette application étant locale et sans serveur ([style architectural retenu à l'étape 6](./11_architectureTechnique.md#style-architectural-retenu-et-justification)), l'« environnement de production » désigne ici le poste sur lequel l'utilisateur installe l'application, et non un serveur applicatif : les chapitres qui suivent adaptent les pratiques habituelles de mise en production à ce contexte.

## Prérequis de l'environnement de production

| prérequis | description |
|---|---|
| Système d'exploitation | Windows, macOS ou Linux (avec WebKitGTK), conformément à [RNF-021](./07_exigencesNonFonctionnelles.md#portabilité-et-environnements-cibles) |
| Runtime | Aucun runtime tiers requis : l'exécutable produit par Tauri est autonome, seul le webview système du poste est sollicité (cf. [Prérequis du poste développeur](./17_posteDeveloppeur.md#prérequis-matériels-et-logiciels) pour le détail des webviews par OS) |
| Réseau sortant | Accès HTTPS sortant vers les instances GitLab et Sonar auditées, respectant la configuration proxy éventuelle du poste ([RNF-023](./07_exigencesNonFonctionnelles.md#portabilité-et-environnements-cibles)) |

## Étapes d'installation de l'environnement

1. Télécharger, depuis les GitHub Releases du dépôt, l'artefact correspondant à son système d'exploitation.
2. Sous Windows, deux artefacts sont proposés à chaque publication (cf. [stratégie de build, empaquetage et publication](#stratégie-de-build-empaquetage-et-publication)) : un installeur classique (`.msi`/`.exe`), ou une archive `.zip` portable à décompresser puis exécuter directement, sans installation ni droits d'administration. Sous macOS, l'installeur est un `.dmg` ; sous Linux, un `.AppImage` ou un `.deb`.
3. Au premier lancement, l'écran d'accueil ([étape 5](./08_arborescenceNavigation.md#arborescence-des-écrans)) permet de créer un nouveau fichier de données ou d'en charger un existant.

L'archive `.zip` portable n'inscrit ni raccourci ni entrée de désinstallation dans le système : une désinstallation se limite à supprimer le dossier décompressé, sans « ménage » automatique. Elle reste soumise à la même politique de mise à jour que l'installeur (cf. [gestion des versions et des mises à jour](#gestion-des-versions-et-des-mises-à-jour)).

## Stratégie de déploiement

Le « déploiement » consiste à distribuer un nouvel exécutable, et non à mettre à jour un service partagé : il n'existe qu'une seule configuration d'exécution, celle du poste de l'utilisateur, sans distinction d'environnements dev/staging/production au sens classique. Les seuls réglages variables sont ceux du paramétrage applicatif propre à chaque fichier de données ([`parametres`, étape 7](./12_modeleDonnees.md#entités-attributs-et-relations)).

Un rollback consiste à réinstaller une version antérieure : les exécutables de toutes les versions publiées restent disponibles en GitHub Releases. La [stratégie de migration du fichier de données](./12_modeleDonnees.md#stratégie-de-migration-des-données) garantit qu'un fichier créé ou modifié par une version plus récente reste, au pire, explicitement refusé par une version antérieure plutôt que corrompu, cf. [invariants et règles de cohérence, étape 7](./12_modeleDonnees.md#invariants-et-règles-de-cohérence).

## Stratégie de build, empaquetage et publication

- Le build multiplateforme est produit par le pipeline d'intégration continue (cf. [mise en place du pipeline, étape 12](./18_pic.md#mise-en-place-du-pipeline)), via la commande de build Tauri, générant les formats natifs propres à chaque système d'exploitation. Sous Windows, un artefact `.zip` portable (le binaire compilé, autonome car sans runtime tiers requis, cf. [Prérequis](#prérequis-de-lenvironnement-de-production)) est produit en complément de l'installeur `.msi`/`.exe`, à destination des utilisateurs souhaitant s'en passer.
- La publication est déclenchée soit par un tag Git de version (`vX.Y.Z`) poussé par le développeur, soit manuellement depuis GitHub Actions (déclencheur `workflow_dispatch` avec saisie du numéro de version), qui crée lui-même le tag correspondant avant de poursuivre le pipeline ; dans les deux cas, celui-ci génère une GitHub Release associée, y attache les exécutables produits (dont l'archive portable) ainsi que le manifeste de mise à jour, et dérive un changelog des messages [Conventional Commits](./14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git) constatés depuis le tag précédent.
- L'archive `.zip` portable n'étant pas installée par un programme d'installation, sa participation exacte au mécanisme du updater Tauri (cf. [gestion des versions et des mises à jour](#gestion-des-versions-et-des-mises-à-jour)) reste à vérifier lors de la mise en œuvre effective : selon le comportement confirmé à ce moment-là, l'usage portable pourra nécessiter un remplacement manuel de l'archive plutôt qu'une mise à jour automatique.
- Le dépôt contient déjà un fichier `LICENSE`, élément préexistant identifié en relecture à l'étape 10 (cf. [plan de mise en place de l'étape 10](../03_plan/plan_10_normesSecurite.md#actions-issues-de-létape-10--normes-de-sécurité-applicative)) : la licence [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.html) qui y figure est confirmée pour la publication de l'application. Toute redistribution de l'application, modifiée ou non, devra donc en fournir le code source sous la même licence.
- Les exécutables et le manifeste de mise à jour sont signés, condition requise par le updater Tauri retenu ci-dessous ; la clé de signature est gérée comme un secret de la plateforme d'intégration continue (cf. [sécurité de la PIC, étape 12](./18_pic.md#sécurité-de-la-pic)).

## Gestion des versions et des mises à jour

Le versionnage suit [SemVer](https://semver.org/) (majeure.mineure.correctif), dérivé directement des types de commit [Conventional Commits](./14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git) retenus à l'étape 9 : un commit `fix` incrémente le correctif, un commit `feat` incrémente la version mineure, une rupture de compatibilité explicitement signalée incrémente la version majeure.

La mise à jour est automatique, via le [updater intégré de Tauri](https://tauri.app/plugin/updater/) : l'application vérifie périodiquement le manifeste de version publié avec la dernière GitHub Release et propose l'installation à l'utilisateur, qui reste maître du moment de la mise à jour. Ce mécanisme introduit le seul appel réseau automatique de vérification de version de l'application ; il ne transmet et ne collecte aucune donnée d'usage, contrairement à un service de télémétrie, et reste ainsi cohérent avec le principe d'absence de télémétrie acté à l'étape 10 (cf. [journalisation des événements sensibles](./15_normesSecurite.md#journalisation-des-événements-sensibles)).

La compatibilité du fichier de données entre versions applicatives est garantie par le versionnage indépendant du schéma de données et de l'enveloppe chiffrée, déjà détaillé à l'étape 7 (cf. [stratégie de migration des données](./12_modeleDonnees.md#stratégie-de-migration-des-données)).

## Journalisation applicative et gestion des erreurs en production

Le [journal des modifications](./12_modeleDonnees.md#entités-attributs-et-relations) et les journaux techniques locaux, déjà définis à l'étape 10 (cf. [journalisation des événements sensibles](./15_normesSecurite.md#journalisation-des-événements-sensibles)), restent strictement locaux en production, sans télémétrie ni envoi distant. Une erreur non gérée (panique du cœur natif, exception non interceptée côté UI) est capturée par un gestionnaire global qui la consigne dans le journal technique local et affiche un message explicite à l'utilisateur, plutôt que de provoquer une fermeture silencieuse de l'application ou de transmettre l'erreur à distance.

Une fonction d'export d'un rapport de diagnostic local est prévue, regroupant les journaux techniques récents (sans secret ni donnée personnelle), que l'utilisateur peut consulter lui-même ou joindre volontairement à une remontée de problème (par exemple une issue GitHub) — décision actée à cette étape en cohérence avec l'absence de télémétrie.

## Supervision

| métrique | seuil d'alerte |
|---|---|
| Aucune métrique distante suivie | Sans objet : conformément à la décision actée à cette étape et à l'absence de télémétrie retenue à l'étape 10, il n'existe ni collecte de métriques ni service d'alerting distant pour cette application locale et sans serveur |

La « supervision » se limite ainsi à la consultation, par l'utilisateur lui-même et à sa demande, du rapport de diagnostic local décrit ci-dessus.

## Plan de reprise d'activité

| scénario | objectif de reprise | procédure |
|---|---|---|
| Perte ou corruption du fichier de données | RPO : intervalle depuis la dernière sauvegarde volontaire de l'utilisateur ; RTO : quasi immédiat | Restauration d'une [sauvegarde de sécurité horodatée](./12_modeleDonnees.md#stratégie-de-sauvegarde-et-de-restauration) depuis l'écran d'accueil, comme n'importe quel fichier de données |
| Perte du poste utilisateur | RPO : dépend de l'existence d'une copie du fichier de données sur un support externe, sous la responsabilité de l'utilisateur (cf. [étape 7](./12_modeleDonnees.md#stratégie-de-sauvegarde-et-de-restauration)) ; RTO : durée de réinstallation de l'application | Réinstallation de l'application depuis GitHub Releases sur un nouveau poste, puis chargement du fichier de données si une copie externe existe ; en son absence, la perte est définitive, risque déjà identifié à [l'étape 2](./03_expressionBesoin.md#risques-projet-identifiés) |
| Perte du dépôt de code source ou de l'environnement de développement | RPO : nul (dépôt distant sur GitHub) ; RTO : durée d'un nouveau clone | Un clone du dépôt distant suffit à reconstituer le poste développeur (cf. [étape 12](./17_posteDeveloppeur.md#étapes-dinstallation)) ; aucune perte de code au-delà du dernier commit poussé |

## Procédures d'exploitation post-déploiement

Aucune astreinte n'est mise en place : il s'agit d'une application locale, sans service partagé à surveiller en continu, utilisée par un utilisateur unique sans autre partie prenante (cf. [parties prenantes, étape 2](./03_expressionBesoin.md#parties-prenantes)).

| opération courante | procédure |
|---|---|
| Vérifier la disponibilité d'une nouvelle version | Automatique via le updater Tauri (cf. [gestion des versions et des mises à jour](#gestion-des-versions-et-des-mises-à-jour)) ; aucune action manuelle requise |
| Exporter un rapport de diagnostic | Depuis l'écran de paramétrage (cf. [journalisation applicative et gestion des erreurs en production](#journalisation-applicative-et-gestion-des-erreurs-en-production)) |
| Restaurer une sauvegarde de sécurité | Depuis l'écran d'accueil (cf. [plan de reprise d'activité](#plan-de-reprise-dactivité)) |
| Purger ou agréger les audits anciens | Depuis l'écran de paramétrage (cf. [US-025](./04_casUsage.md#cas-dusage--user-stories)) |
