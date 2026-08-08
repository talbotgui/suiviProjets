# Règles de gestion métier

## Sommaire

1. [Convention d'identifiant](#convention-didentifiant)
2. [Description sommaire des écrans concernés](#description-sommaire-des-écrans-concernés)
3. [Règles de gestion par domaine fonctionnel](#règles-de-gestion-par-domaine-fonctionnel)
4. [Matrice de traçabilité](#matrice-de-traçabilité)

## Convention d'identifiant

Chaque règle de gestion porte un identifiant stable de la forme `RG-NNN` (numérotation séquentielle sur trois chiffres), attribué à la création et jamais renommé. Cet identifiant est réutilisé sans changement dans les étapes suivantes (conception, tests, etc.).

## Description sommaire des écrans concernés

| écran | description sommaire | règle(s) de gestion concernée(s) |
|---|---|---|
| Shell applicatif (bandeau global) | Bandeau transverse, affiché sous l'entête sur tout écran du shell, signalant un credential manquant pour une instance utilisée par le fichier ouvert | RG-037 |
| Écran d'accueil | Point d'entrée : créer ou charger le fichier de données, résumé de l'état depuis la dernière session | RG-001, RG-002, RG-003, RG-009, RG-026 |
| Gestion des credentials | Saisie en mémoire des credentials par instance, assistant de création de token, test de connectivité | RG-004 |
| Administration | Gestion des groupes, projets, sources, membres connus, politique IA et annotations de groupe | RG-006, RG-007, RG-008, RG-012, RG-014, RG-015, RG-023, RG-033, RG-036 |
| Constitution de campagne | Sélection du périmètre d'une campagne d'audit, contrôle des credentials nécessaires | RG-017, RG-019 |
| Tableau de bord d'exécution | Suivi temps réel d'une campagne, annulation propre | RG-017, RG-018 |
| Brouillon (et rapport d'anomalies) | Différentiel d'une campagne avant intégration à l'historique, anomalies d'exécution | RG-011, RG-019, RG-020, RG-021 |
| Synthèse des audits | Dernier audit intégré de chaque projet, seuils de couleur, filtres | RG-006, RG-009, RG-011, RG-013, RG-016, RG-022, RG-027 |
| Synthèse graphique | Évolution des indicateurs dans le temps, annotations et changements de seuils | RG-011, RG-022, RG-023, RG-027 |
| Fiche projet (et comparaison entre deux audits) | Détail complet d'un projet, historique, différentiel entre deux dates | RG-006, RG-009, RG-010, RG-011, RG-013, RG-014, RG-015, RG-016, RG-022, RG-023, RG-033 |
| Liste de travail | Agrégation des alertes actives et suivi de leur traitement | RG-009, RG-010, RG-026, RG-027 |
| Écran de paramétrage | Seuils, référentiels (et leur suppression), journal des modifications (et sa purge), purge des audits, export/import de configuration, réglages applicatifs, avertissement de taille du fichier | RG-003, RG-012, RG-022, RG-023, RG-024, RG-025, RG-028, RG-029, RG-030, RG-031, RG-032, RG-034, RG-035 |
| Écran de verrouillage | Verrouillage de session sur inactivité ou action manuelle | RG-004, RG-005, RG-031 |

## Règles de gestion par domaine fonctionnel

### Stockage et confidentialité des données

| identifiant | énoncé de la règle | écran(s) concerné(s) | conditions d'application |
|---|---|---|---|
| RG-001 | Le fichier de données est sérialisé, compressé (zstd) puis chiffré (Argon2id + AES-256-GCM) ; aucune donnée n'est écrite en clair sur le disque | Écran d'accueil | À chaque création et à chaque sauvegarde du fichier de données |
| RG-002 | Le mot de passe du fichier est redemandé à chaque chargement et à chaque sauvegarde ; seule la clé dérivée, jamais le mot de passe, est conservée en mémoire pendant la session | Écran d'accueil | Chargement et sauvegarde du fichier |
| RG-003 | Avant tout écrasement du fichier de données, une sauvegarde de sécurité horodatée de l'ancien fichier est conservée, dans la limite d'un nombre paramétrable de versions | Écran d'accueil, Écran de paramétrage | À chaque sauvegarde |
| RG-004 | Aucun credential n'est jamais persisté sur disque ; il est ressaisi à chaque session, transmis uniquement en en-tête HTTP vers l'instance concernée, et purgé à la fermeture, au verrouillage et après un délai d'inactivité | Gestion des credentials, Écran de verrouillage | Pendant toute la durée de la session |
| RG-005 | Le verrouillage de session, qu'il soit déclenché par inactivité ou manuellement, efface la clé dérivée et l'ensemble des credentials en mémoire, côté front comme côté cœur applicatif | Écran de verrouillage | Sur déclenchement du verrouillage |
| RG-037 | Un bandeau non bloquant, affiché sous l'entête sur tout écran du shell tant que la condition reste vraie, signale qu'au moins une instance GitLab ou Sonar référencée par une source du fichier ouvert n'a pas de credential mémorisé pour la session en cours, avec une action de raccourci vers la Gestion des credentials ; ce signal complète [RG-004](#stockage-et-confidentialité-des-données) sans le remplacer, le credential lui-même restant ressaisi à chaque session, jamais persisté (ajouté le 2026-08-08, besoin identifié en Phase 11 lors de la session de réflexion UX du 2026-08-03, absent de `Specification.md`, cf. [C11-04](../03_plan/plan_13_developpement.md#phase-11--journalisation-technique-et-confort-de-saisie-projets-sources)) | Shell applicatif (bandeau global) | Dès qu'une instance référencée par une source du fichier ouvert n'a pas de credential mémorisé pour la session en cours |

### Membres et sécurité des accès

| identifiant | énoncé de la règle | écran(s) concerné(s) | conditions d'application |
|---|---|---|---|
| RG-006 | Un membre ou contributeur ne correspondant à aucune règle des membres connus du groupe se voit attribuer le statut `inconnu` par défaut | Fiche projet, Synthèse des audits, Administration | À chaque audit exposant des membres ou des auteurs de commits |
| RG-007 | La précédence de correspondance des règles de membres connus est : username exact, puis email exact, puis domaine email ; le premier niveau qui correspond l'emporte | Administration | Résolution du statut d'un membre ou contributeur |
| RG-008 | Deux règles de même niveau de précédence produisant des statuts contradictoires donnent lieu à un statut « conflit de règles », traité visuellement comme `inconnu` ; la saisie d'un doublon de username est bloquée à l'administration | Administration | Résolution du statut d'un membre ou contributeur, saisie d'une règle |
| RG-009 | Un membre au statut `inconnu` court-circuite les seuils de couleur : il est signalé par une alerte dédiée toujours visible, quel que soit l'état des autres indicateurs du projet | Écran d'accueil, Synthèse des audits, Fiche projet, Liste de travail | Dès qu'un membre `inconnu` existe sur un projet |
| RG-010 | Le niveau d'accès du membre `inconnu` module la gravité de l'alerte associée : un statut `inconnu` avec des droits de mainteneur ou d'administration est plus grave qu'un statut `inconnu` en lecture seule | Fiche projet, Liste de travail | Calcul de la gravité d'une alerte membre inconnu |

### Constat, jugement et politique IA

| identifiant | énoncé de la règle | écran(s) concerné(s) | conditions d'application |
|---|---|---|---|
| RG-011 | Les résultats d'audit ne contiennent jamais de verdict (statut d'obsolescence, statut de membre, badge, classe de taille) ; seuls les constats bruts sont stockés, tout jugement étant calculé à l'affichage à partir des seuils et référentiels courants | Brouillon, Synthèse des audits, Fiche projet, Synthèse graphique | À chaque restitution d'un indicateur calculé |
| RG-012 | Modifier un seuil, une règle de dépendance, une règle de marqueur IA, le motif de nommage des branches ou qualifier un membre requalifie instantanément tout l'historique affiché, sans nouvel audit | Administration, Écran de paramétrage | Immédiatement après la modification |
| RG-013 | Un badge SONAR_KO est déclenché lorsque l'écart entre la date du dernier commit et la date de la dernière analyse Sonar dépasse la tolérance paramétrable ; il grise l'ensemble des métriques Sonar de l'audit concerné | Synthèse des audits, Fiche projet | Restitution des indicateurs Sonar d'un projet |
| RG-014 | Chaque projet porte un indicateur d'autorisation de l'usage de l'IA, interdit par défaut ; l'absence de valeur du champ vaut interdit | Administration, Fiche projet | Création d'un projet, restitution de sa politique IA |
| RG-015 | Le passage de la politique IA d'un projet à autorisé est horodaté et crée automatiquement une annotation système non supprimable | Administration, Fiche projet | Modification de la politique IA d'un projet |
| RG-016 | Un projet à politique IA interdite sur lequel des marqueurs IA sont détectés est classé en violation ; un projet interdit sans marqueur détecté est classé conforme, avec la réserve documentée que cette absence ne prouve pas l'absence d'usage réel | Synthèse des audits, Fiche projet | Restitution du statut IA d'un projet après audit |

### Audits et campagnes

| identifiant | énoncé de la règle | écran(s) concerné(s) | conditions d'application |
|---|---|---|---|
| RG-017 | Une campagne d'audit interroge les sources de son périmètre avec une concurrence limitée et paramétrable (valeur par défaut : [quatre projets simultanés](../01_besoin/Specification.md#56-f06--tableau-de-bord-dexécution-daudit)) | Constitution de campagne, Tableau de bord d'exécution | Exécution d'une campagne |
| RG-018 | L'annulation d'une campagne est propre : elle vide la file d'attente sans interrompre les requêtes en vol, conserve les résultats déjà acquis et classe les projets non traités en « ignoré », les faisant rejoindre le périmètre de reprise | Tableau de bord d'exécution | Annulation manuelle d'une campagne en cours |
| RG-019 | Le lancement d'une nouvelle campagne est bloqué tant qu'un brouillon existant n'a pas été traité (intégré ou rejeté) ; au plus un brouillon existe à la fois | Constitution de campagne, Brouillon | Tentative de lancement d'une campagne |
| RG-020 | Une variation d'indicateur jugée aberrante par rapport au dernier audit intégré du même projet est signalée automatiquement dans le brouillon avant toute intégration | Brouillon | Présentation du brouillon d'une campagne |
| RG-021 | Une anomalie d'exécution est distinguée d'un indicateur métier, typée selon une catégorie fixe (authentification refusée, ref introuvable, instance injoignable, délai dépassé, réponse inattendue, droits insuffisants), et accompagnée d'une action suggérée en langage clair ; les anomalies de même cause sont regroupées | Brouillon (rapport d'anomalies) | Restitution des anomalies d'une campagne |

### Sources et connecteurs

| identifiant | énoncé de la règle | écran(s) concerné(s) | conditions d'application |
|---|---|---|---|
| RG-036 | À la sélection d'une Instance dans le formulaire de rattachement d'une source, la liste complète des dépôts GitLab (instance de type `gitlab`) ou des projets Sonar (instance de type `sonar`) accessibles avec le credential courant est chargée en un seul appel, mis en cache pour la durée de la session par instance ; l'identifiant externe de la source est saisi au moyen d'un composant de recherche riche réutilisable (et non plus un champ texte libre à autocomplétion HTML native), présentant la liste précédente triée par ordre alphabétique insensible à la casse y compris avant toute saisie de l'utilisateur, avec surlignage du texte recherché dans chaque suggestion, message explicite en l'absence de correspondance et navigation complète au clavier (ajouté le 2026-08-02, besoin identifié en Phase 10, absent de `Specification.md` ; composant de recherche généralisé le 2026-08-08, cf. [C11-02](../03_plan/plan_13_developpement.md#phase-11--journalisation-technique-et-confort-de-saisie-projets-sources)) | Administration | Sélection d'une Instance dans le formulaire de rattachement d'une source, y compris depuis le mini-flux guidé projet → sources ([C11-01](../03_plan/plan_13_developpement.md#phase-11--journalisation-technique-et-confort-de-saisie-projets-sources)) |

### Seuils, référentiels et historisation

| identifiant | énoncé de la règle | écran(s) concerné(s) | conditions d'application |
|---|---|---|---|
| RG-022 | Les seuils de couleur, les bornes de classe de taille, la tolérance de fraîcheur Sonar et les référentiels de dépendances, de marqueurs IA et de nommage des branches définis au paramétrage s'appliquent uniformément à tous les écrans de restitution | Écran de paramétrage, Synthèse des audits, Synthèse graphique, Fiche projet | Restitution de tout indicateur calculé |
| RG-023 | Toute modification d'une donnée de jugement — seuil, référentiel de dépendances, référentiel de marqueurs IA, référentiel de nommage des branches, qualification d'un membre, politique IA d'un projet, ref auditée d'une source (périmètre complet de [F21](../01_besoin/Specification.md#521-f21--journal-des-modifications-de-paramétrage), étendu au motif de nommage des branches) — est consignée dans le journal des modifications, avec horodatage, valeur avant/après et origine de la modification | Écran de paramétrage, Synthèse graphique, Fiche projet, Administration | À chaque modification d'une donnée de jugement |
| RG-024 | La purge par densité conserve le premier audit de chaque projet, puis un audit au minimum [tous les sept jours](../01_besoin/Specification.md#519-f19--purge-des-audits) parmi les audits rapprochés ; le premier et le dernier audit de chaque projet sont toujours conservés | Écran de paramétrage (purge) | Exécution d'une purge par densité |
| RG-025 | La purge par âge, [au-delà de six mois](../01_besoin/Specification.md#519-f19--purge-des-audits), est toujours proposée avec prévisualisation du volume libéré et n'est jamais déclenchée automatiquement ; l'utilisateur choisit entre suppression et agrégation mensuelle | Écran de paramétrage (purge) | Proposition ou déclenchement d'une purge par âge |
| RG-030 | La conformité de nommage d'une branche d'un dépôt GitLab audité n'est jamais stockée comme un constat d'audit : elle est calculée à l'affichage par confrontation du nom de branche constaté au motif d'expression régulière paramétrable `referentiels.motifNommageBranches`, initialisé par défaut à une valeur représentant la convention Gitflow | Écran de paramétrage | Restitution de l'indicateur de nommage d'une branche, modification du motif |
| RG-031 | Les réglages applicatifs de session — délai d'inactivité avant verrouillage, nombre d'échecs avant fermeture, concurrence par défaut d'une campagne d'audit, proxy HTTP (URL et éventuel fascicule de certificats additionnels) et nombre de sauvegardes de sécurité conservées — sont ajustables depuis l'écran de paramétrage et s'appliquent immédiatement, sans redémarrage de l'application ; le proxy défini, une fois enregistré, est effectivement utilisé par l'ensemble des appels HTTP des connecteurs GitLab et Sonar, en complément du proxy système déjà pris en compte nativement | Écran de paramétrage, Écran de verrouillage | Modification d'un réglage applicatif ; ouverture d'une connexion HTTP vers une instance GitLab ou Sonar |
| RG-032 | Lorsque la taille du fichier de données dépasse le seuil paramétrable défini par [RG-031](#seuils-référentiels-et-historisation) à l'issue d'une sauvegarde, un avertissement non bloquant invite l'utilisateur à consulter les onglets de purge (audits, journal) de l'écran de paramétrage, sans déclencher aucune purge automatique | Écran de paramétrage | À l'issue de chaque sauvegarde du fichier de données |
| RG-034 | Le journal des modifications conserve uniquement les entrées horodatées de moins de deux ans ; une purge par âge, toujours proposée avec prévisualisation du nombre d'entrées concernées et jamais déclenchée automatiquement, retire sur confirmation les entrées plus anciennes que cette limite fixe, à l'exception de l'entrée consignant la purge elle-même | Écran de paramétrage (journal) | Prévisualisation ou exécution d'une purge du journal des modifications |
| RG-035 | Une entrée des référentiels de règles de dépendances ou de règles de marqueurs IA peut être supprimée individuellement par son identifiant ; le motif de nommage des branches, valeur scalaire unique et non une liste, n'est pas concerné par cette suppression | Écran de paramétrage | Suppression d'une entrée de référentiel |

### Vues, alertes, export et import

| identifiant | énoncé de la règle | écran(s) concerné(s) | conditions d'application |
|---|---|---|---|
| RG-026 | Une alerte est identifiée par une clé stable, indépendante des audits, et porte un statut vu/traité persistant ; une alerte traitée dont la cause persiste au constat suivant réapparaît avec la mention de son traitement antérieur | Liste de travail, Écran d'accueil | Restitution et traitement des alertes |
| RG-027 | Une vue enregistrée mémorise l'état des filtres d'un écran (groupes, projets, indicateurs, période, tri) sous un nom réutilisable, avec possibilité de la définir comme vue par défaut de son écran | Synthèse des audits, Synthèse graphique, Liste de travail | Enregistrement ou sélection d'une vue |
| RG-028 | L'export en clair de la configuration est strictement limité aux seuils et référentiels partageables ; il exclut structurellement les membres connus et toute autre donnée de groupe, les campagnes, le brouillon, le journal et les vues enregistrées | Écran de paramétrage (export/import) | Export de configuration |
| RG-029 | L'import d'une configuration applique un différentiel explicite entre ajouts, modifications et éléments identiques, n'écrase aucune valeur sans décision explicite de l'utilisateur, et s'applique de façon transactionnelle (tout ou rien) | Écran de paramétrage (export/import) | Import d'une configuration |
| RG-033 | Une annotation peut être créée directement sur un groupe et non sur l'un de ses projets, auquel cas elle est rattachée au groupe ; une annotation non système peut être supprimée depuis son écran de portée (Fiche projet pour une annotation de projet, Administration pour une annotation de groupe) ; une annotation système ([RG-015](#constat-jugement-et-politique-ia)) n'est jamais supprimable | Fiche projet, Administration | Création ou suppression d'une annotation |

## Matrice de traçabilité

| règle de gestion | cas d'usage / user story |
|---|---|
| RG-001 | [US-001](./04_casUsage.md#cas-dusage--user-stories) |
| RG-002 | [US-001](./04_casUsage.md#cas-dusage--user-stories), [US-002](./04_casUsage.md#cas-dusage--user-stories) |
| RG-003 | [US-001](./04_casUsage.md#cas-dusage--user-stories) |
| RG-004 | [US-003](./04_casUsage.md#cas-dusage--user-stories), [US-004](./04_casUsage.md#cas-dusage--user-stories), [US-026](./04_casUsage.md#cas-dusage--user-stories) |
| RG-005 | [US-026](./04_casUsage.md#cas-dusage--user-stories) |
| RG-006 | [US-022](./04_casUsage.md#cas-dusage--user-stories) |
| RG-007 | [US-022](./04_casUsage.md#cas-dusage--user-stories), [US-023](./04_casUsage.md#cas-dusage--user-stories) |
| RG-008 | [US-022](./04_casUsage.md#cas-dusage--user-stories), [US-023](./04_casUsage.md#cas-dusage--user-stories) |
| RG-009 | [US-005](./04_casUsage.md#cas-dusage--user-stories), [US-015](./04_casUsage.md#cas-dusage--user-stories), [US-017](./04_casUsage.md#cas-dusage--user-stories), [US-020](./04_casUsage.md#cas-dusage--user-stories) |
| RG-010 | [US-017](./04_casUsage.md#cas-dusage--user-stories) |
| RG-011 | [US-009](./04_casUsage.md#cas-dusage--user-stories), [US-014](./04_casUsage.md#cas-dusage--user-stories), [US-015](./04_casUsage.md#cas-dusage--user-stories), [US-016](./04_casUsage.md#cas-dusage--user-stories), [US-017](./04_casUsage.md#cas-dusage--user-stories), [US-018](./04_casUsage.md#cas-dusage--user-stories) |
| RG-012 | [US-022](./04_casUsage.md#cas-dusage--user-stories), [US-033](./04_casUsage.md#cas-dusage--user-stories) |
| RG-013 | [US-015](./04_casUsage.md#cas-dusage--user-stories), [US-017](./04_casUsage.md#cas-dusage--user-stories) |
| RG-014 | [US-007](./04_casUsage.md#cas-dusage--user-stories), [US-024](./04_casUsage.md#cas-dusage--user-stories) |
| RG-015 | [US-024](./04_casUsage.md#cas-dusage--user-stories) |
| RG-016 | [US-017](./04_casUsage.md#cas-dusage--user-stories), [US-024](./04_casUsage.md#cas-dusage--user-stories) |
| RG-017 | [US-009](./04_casUsage.md#cas-dusage--user-stories), [US-010](./04_casUsage.md#cas-dusage--user-stories), [US-012](./04_casUsage.md#cas-dusage--user-stories) |
| RG-018 | [US-010](./04_casUsage.md#cas-dusage--user-stories), [US-011](./04_casUsage.md#cas-dusage--user-stories) |
| RG-019 | [US-012](./04_casUsage.md#cas-dusage--user-stories), [US-014](./04_casUsage.md#cas-dusage--user-stories) |
| RG-020 | [US-014](./04_casUsage.md#cas-dusage--user-stories) |
| RG-021 | [US-013](./04_casUsage.md#cas-dusage--user-stories) |
| RG-022 | [US-015](./04_casUsage.md#cas-dusage--user-stories), [US-016](./04_casUsage.md#cas-dusage--user-stories), [US-033](./04_casUsage.md#cas-dusage--user-stories) |
| RG-023 | [US-008](./04_casUsage.md#cas-dusage--user-stories), [US-016](./04_casUsage.md#cas-dusage--user-stories), [US-024](./04_casUsage.md#cas-dusage--user-stories), [US-027](./04_casUsage.md#cas-dusage--user-stories), [US-033](./04_casUsage.md#cas-dusage--user-stories) |
| RG-024 | [US-025](./04_casUsage.md#cas-dusage--user-stories) |
| RG-025 | [US-025](./04_casUsage.md#cas-dusage--user-stories) |
| RG-026 | [US-005](./04_casUsage.md#cas-dusage--user-stories), [US-020](./04_casUsage.md#cas-dusage--user-stories) |
| RG-027 | [US-028](./04_casUsage.md#cas-dusage--user-stories) |
| RG-028 | [US-029](./04_casUsage.md#cas-dusage--user-stories) |
| RG-029 | [US-030](./04_casUsage.md#cas-dusage--user-stories) |
| RG-030 | [US-033](./04_casUsage.md#cas-dusage--user-stories) |
| RG-031 | [US-034](./04_casUsage.md#cas-dusage--user-stories), [US-035](./04_casUsage.md#cas-dusage--user-stories) |
| RG-032 | [US-035](./04_casUsage.md#cas-dusage--user-stories) |
| RG-033 | [US-019](./04_casUsage.md#cas-dusage--user-stories) |
| RG-034 | [US-036](./04_casUsage.md#cas-dusage--user-stories) |
| RG-035 | [US-033](./04_casUsage.md#cas-dusage--user-stories) |
| RG-036 | [US-008](./04_casUsage.md#cas-dusage--user-stories) |
| RG-037 | [US-003](./04_casUsage.md#cas-dusage--user-stories), [US-004](./04_casUsage.md#cas-dusage--user-stories) |
