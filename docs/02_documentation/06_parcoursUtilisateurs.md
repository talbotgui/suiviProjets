# Parcours utilisateurs

## Sommaire

1. [Parcours principaux](#parcours-principaux)
   1. [Créer un nouveau fichier de données et le paramétrer](#créer-un-nouveau-fichier-de-données-et-le-paramétrer)
   2. [Réaliser une campagne d'audit et intégrer les résultats](#réaliser-une-campagne-daudit-et-intégrer-les-résultats)
   3. [Traiter une alerte de membre inconnu](#traiter-une-alerte-de-membre-inconnu)
2. [Parcours alternatifs](#parcours-alternatifs)
   1. [Charger un fichier de données existant](#charger-un-fichier-de-données-existant)
   2. [Rejouer les échecs d'une campagne précédente](#rejouer-les-échecs-dune-campagne-précédente)
   3. [Comparer deux audits depuis la fiche projet](#comparer-deux-audits-depuis-la-fiche-projet)
   4. [Autoriser l'usage de l'IA sur un projet](#autoriser-lusage-de-lia-sur-un-projet)
   5. [Exporter puis importer une configuration partagée](#exporter-puis-importer-une-configuration-partagée)
3. [Cas d'erreur](#cas-derreur)

## Parcours principaux

### Créer un nouveau fichier de données et le paramétrer

Rattaché à [US-001](./04_casUsage.md#cas-dusage--user-stories), [US-006](./04_casUsage.md#cas-dusage--user-stories) à [US-008](./04_casUsage.md#cas-dusage--user-stories) et [US-033](./04_casUsage.md#cas-dusage--user-stories).

| étape | acteur | description |
|---|---|---|
| 1 | Camille | Depuis l'écran d'accueil, choisit « Créer un nouveau fichier » |
| 2 | Camille | Saisit et confirme le mot de passe du futur fichier de données |
| 3 | Application | Crée le fichier chiffré vide et ouvre l'écran d'administration |
| 4 | Camille | Crée un ou plusieurs groupes, avec leurs instances GitLab et Sonar |
| 5 | Camille | Crée les projets de chaque groupe et leurs sources, avec la ref auditée souhaitée |
| 6 | Camille | Ajuste au paramétrage les seuils de couleur et les référentiels de dépendances et de marqueurs IA |
| 7 | Application | Sauvegarde le fichier chiffré après confirmation du mot de passe |

### Réaliser une campagne d'audit et intégrer les résultats

Rattaché à [US-003](./04_casUsage.md#cas-dusage--user-stories), [US-009](./04_casUsage.md#cas-dusage--user-stories), [US-010](./04_casUsage.md#cas-dusage--user-stories), [US-012](./04_casUsage.md#cas-dusage--user-stories), [US-014](./04_casUsage.md#cas-dusage--user-stories) et [US-015](./04_casUsage.md#cas-dusage--user-stories).

| étape | acteur | description |
|---|---|---|
| 1 | Camille | Saisit les credentials nécessaires en mémoire pour la session |
| 2 | Camille | Depuis l'écran de constitution de campagne, sélectionne le périmètre de projets à auditer |
| 3 | Application | Affiche le coût prévisionnel et contrôle la présence des credentials requis |
| 4 | Camille | Lance la campagne |
| 5 | Application | Interroge les sources du périmètre avec une concurrence limitée et affiche la progression en temps réel |
| 6 | Application | À la fin de la campagne, place les résultats dans le brouillon |
| 7 | Camille | Consulte le différentiel du brouillon, examine les valeurs aberrantes signalées |
| 8 | Camille | Intègre les résultats du brouillon à l'historique, projet par projet ou globalement |
| 9 | Camille | Consulte la synthèse des audits mise à jour |

### Traiter une alerte de membre inconnu

Rattaché à [US-020](./04_casUsage.md#cas-dusage--user-stories) et [US-022](./04_casUsage.md#cas-dusage--user-stories).

| étape | acteur | description |
|---|---|---|
| 1 | Application | Signale un membre au statut `inconnu` en tête de la liste de travail, indépendamment de tout autre signal |
| 2 | Camille | Ouvre l'alerte pour voir le projet, le niveau d'accès et la date de première détection du membre concerné |
| 3 | Camille | Choisit « Qualifier ce membre » |
| 4 | Camille | Crée ou complète une règle des membres connus du groupe (statut interne, client ou partenaire) |
| 5 | Application | Requalifie instantanément tout l'historique du projet concerné, sans nouvel audit |
| 6 | Application | Retire l'alerte de la liste de travail si plus aucun membre inconnu ne subsiste sur le projet |

## Parcours alternatifs

### Charger un fichier de données existant

Variante de [« Créer un nouveau fichier de données et le paramétrer »](#créer-un-nouveau-fichier-de-données-et-le-paramétrer), rattachée à [US-002](./04_casUsage.md#cas-dusage--user-stories) et [US-005](./04_casUsage.md#cas-dusage--user-stories).

| étape | acteur | description |
|---|---|---|
| 1 | Camille | Depuis l'écran d'accueil, choisit « Charger un fichier existant » et sélectionne le fichier sur son poste |
| 2 | Camille | Saisit le mot de passe du fichier |
| 3 | Application | Déchiffre le fichier, migre le schéma si une version plus ancienne est détectée |
| 4 | Application | Affiche le résumé depuis la dernière session : projets non audités depuis longtemps, alertes non traitées |
| 5 | Camille | Poursuit vers la liste de travail si des alertes existent, ou vers la synthèse des audits sinon |

### Rejouer les échecs d'une campagne précédente

Variante de [« Réaliser une campagne d'audit et intégrer les résultats »](#réaliser-une-campagne-daudit-et-intégrer-les-résultats), rattachée à [US-012](./04_casUsage.md#cas-dusage--user-stories) et [US-013](./04_casUsage.md#cas-dusage--user-stories).

| étape | acteur | description |
|---|---|---|
| 1 | Camille | Depuis l'écran de constitution de campagne, choisit le raccourci « Rejouer les échecs de la dernière campagne » |
| 2 | Application | Présélectionne le périmètre correspondant aux projets en échec ou ignorés de la campagne précédente |
| 3 | Camille | Complète éventuellement le périmètre avec le raccourci « projets non audités depuis plus de N jours » |
| 4 | Camille | Lance la campagne ciblée |
| 5 | Application | À l'issue, met à jour le rapport d'anomalies pour les échecs persistants |

### Comparer deux audits depuis la fiche projet

Rattaché à [US-017](./04_casUsage.md#cas-dusage--user-stories), [US-018](./04_casUsage.md#cas-dusage--user-stories) et [US-032](./04_casUsage.md#cas-dusage--user-stories).

| étape | acteur | description |
|---|---|---|
| 1 | Camille | Depuis la fiche d'un projet, choisit « Comparer deux audits » |
| 2 | Camille | Sélectionne deux dates, ou utilise un raccourci (dernier vs précédent, 1 mois, 3 mois) |
| 3 | Application | Affiche le différentiel en quatre volets : indicateurs, dépendances, membres et contributeurs, marqueurs IA |
| 4 | Application | Rappelle les annotations posées sur l'intervalle choisi |
| 5 | Camille | Exporte éventuellement la comparaison en image PNG |

### Autoriser l'usage de l'IA sur un projet

Rattaché à [US-024](./04_casUsage.md#cas-dusage--user-stories).

| étape | acteur | description |
|---|---|---|
| 1 | Camille | Depuis l'administration ou la fiche du projet, active la politique IA du projet |
| 2 | Application | Horodate le passage à autorisé, crée automatiquement une annotation système non supprimable et consigne le changement dans le journal des modifications ([RG-015](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-023](./05_reglesGestion.md#seuils-référentiels-et-historisation)) |
| 3 | Application | Affiche désormais les marqueurs IA détectés comme informatifs plutôt que comme violation |
| 4 | Application | Juxtapose, sur les graphiques du projet, les courbes de qualité du nouveau code de part et d'autre de la date d'activation |

### Exporter puis importer une configuration partagée

Rattaché à [US-029](./04_casUsage.md#cas-dusage--user-stories) et [US-030](./04_casUsage.md#cas-dusage--user-stories).

| étape | acteur | description |
|---|---|---|
| 1 | Camille | Depuis le paramétrage, exporte la configuration en clair (seuils et référentiels) |
| 2 | Camille | Transmet le fichier exporté par un canal de son choix |
| 3 | Camille (ou une autre instance de l'application) | Importe le fichier de configuration reçu |
| 4 | Application | Présente le différentiel entre la configuration importée et la configuration courante (ajouts, modifications, identiques) |
| 5 | Camille | Accepte tout ou partie du différentiel, ligne à ligne ou globalement |
| 6 | Application | Applique les changements acceptés de façon transactionnelle et consigne l'origine de l'import dans le journal |

## Cas d'erreur

| étape | erreur rencontrée | comportement attendu |
|---|---|---|
| Chargement du fichier de données | Mot de passe incorrect saisi | L'application signale l'échec de déchiffrement sans exposer de détail technique et permet une nouvelle saisie |
| Chargement du fichier de données | Fichier altéré ou corrompu | L'échec d'authentification du chiffrement (AES-256-GCM) est détecté immédiatement ; l'application refuse le chargement et invite à restaurer une sauvegarde de sécurité antérieure |
| Constitution ou exécution d'une campagne | Credential manquant ou invalide pour une instance requise | L'écran de constitution de campagne renvoie vers la saisie des credentials manquants avant de lancer la campagne ; en cours de campagne, l'échec est classé anomalie « authentification refusée » sur les projets concernés, sans interrompre la campagne |
| Exécution d'un audit | Ref auditée introuvable sur le dépôt | Une anomalie typée « ref introuvable » est produite pour la source concernée, avec action suggérée ; les autres sources du projet et les autres projets de la campagne continuent d'être traités |
| Test de connectivité ou exécution d'un audit | Instance injoignable (réseau, proxy, délai dépassé) | L'anomalie est typée en conséquence (« instance injoignable » ou « délai dépassé ») avec message technique repliable et action suggérée ; les projets concernés sont marqués en échec sans bloquer les autres |
| Lancement d'une nouvelle campagne | Un brouillon existant n'a pas encore été traité | L'application bloque le lancement et redirige vers l'écran de brouillon pour intégration ou rejet préalable |
| Déverrouillage de session | Nombre paramétrable d'échecs consécutifs de saisie du mot de passe | Le fichier se ferme et l'application revient à l'écran d'accueil ; le fichier chiffré sur disque reste la seule vérité, aucune donnée n'est perdue |
| Import d'une configuration | Version de schéma de l'export plus récente que celle supportée par l'application | L'import est refusé avec une explication claire ; une version plus ancienne déclenche au contraire une migration à la volée |
