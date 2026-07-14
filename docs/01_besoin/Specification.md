# Application de suivi de la qualimétrie et de l'obsolescence

**Spécification fonctionnelle et technique — version 1.0 — 9 juillet 2026**

---

## 1. Introduction

Ce document consolide la conception d'une application de suivi et de surveillance de la qualimétrie et de l'obsolescence des dépendances d'un grand nombre d'applications, réparties dans plusieurs groupes organisationnels. L'application interroge les APIs de plusieurs instances GitLab et SonarQube pour en extraire des indicateurs, les historiser et les restituer sous forme de synthèses, de graphiques d'évolution et d'alertes.

### 1.1 Architecture retenue

L'application est une **application de bureau Tauri** : le front est développé en **Angular** (TypeScript, Signals, RxJS pour l'orchestration des audits), le cœur en **Rust** assure les appels HTTP vers les APIs (via `reqwest`), la cryptographie du fichier de données et les accès disque. Ce choix résout deux contraintes d'environnement : les instances GitLab et Sonar sont protégées par des en-têtes CORS (sans effet sur des appels effectués hors navigateur) et accessibles via un proxy d'entreprise (`reqwest` respecte `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`, avec paramétrage manuel possible et prise en charge du bundle CA interne pour l'inspection TLS).

L'application ne comporte **aucun serveur ni base de données** : la totalité des données vit dans un fichier JSON chiffré et compressé, chargé et sauvegardé par l'utilisateur sur son poste.

### 1.2 Principes de conception

Quatre principes structurent l'ensemble de la conception :

1. **Le constat est stocké, le jugement est calculé.** Les audits enregistrent des données brutes (dates, listes, compteurs). Toute classification (statut d'obsolescence, vitalité, taille S/L/XL/XXL, statut d'un membre, badge SONAR_KO, violation de politique IA) est calculée à l'affichage en croisant le constat avec les référentiels et seuils courants. Modifier un seuil ou qualifier un membre requalifie instantanément tout l'historique, sans ré-audit.
2. **Interdiction par défaut** (*deny by default*). L'usage de l'IA est interdit sauf autorisation explicite ; un membre non reconnu est `inconnu` ; l'absence de champ vaut la valeur la plus restrictive.
3. **Les secrets ne sont jamais persistés.** Credentials des sources et identifiants proxy vivent exclusivement en mémoire volatile, sont ressaisis à chaque session et purgés au verrouillage.
4. **Français intégral.** Le code, la documentation, le modèle de données et les discriminants de type sont en français. Seules les valeurs imposées par les APIs externes (clés de métriques Sonar, champs GitLab) restent en anglais dans la couche connecteur, traduites en français à cette frontière.

### 1.3 Terminologie de nommage

Le modèle de données utilise : `groupes`, `projets`, `sources`, `instances`, `refAuditee`, `iaAutorisee`, `membresConnus`, `reglesDependances`, `reglesMarqueursIA`, `seuils`, `campagnes`, `brouillon`, `annotations`, `journal`, `vuesEnregistrees`, `traitementsAlertes`. Les discriminants de résultats suivent le motif `origine.nature` : `gitlab.dependances`, `sonar.notes`, `croise.fraicheur_sonar`, etc. Toutes les entités sont identifiées par **UUID** (prérequis de la fusion de fichiers, du traitement d'alertes et des vues enregistrées).

---

## 2. Objectifs

L'application a pour objectif de suivre et surveiller la qualimétrie et l'obsolescence des dépendances d'un grand nombre d'applications réparties dans plusieurs groupes, en s'appuyant sur les accès API (URL et credentials) de plusieurs instances GitLab et SonarQube.

Elle doit permettre de détecter, projet par projet et en tendance :

- les projets non audités depuis longtemps ;
- les projets dont la qualimétrie Sonar se dégrade ;
- les projets dont les problèmes d'usage de GitLab augmentent ;
- les projets dont les dépendances posent des problèmes d'obsolescence ;
- les projets morts ou mourants (absence de commits) ;
- les usages de l'IA non autorisés (marqueurs détectés sur un projet où l'IA est interdite) ;
- les **membres de dépôts non autorisés** (statut `inconnu`), signal de sécurité prioritaire devant être *très* visible ;
- les incohérences de la chaîne d'analyse (Sonar périmé par rapport aux commits) ;
- les signaux dérivés : activité sans qualité, corrélation IA × qualité du nouveau code.

Elle doit rester **100 % locale**, sans base SQL ni serveur, avec des données chiffrées par mot de passe et des secrets jamais sauvegardés.

---

## 3. Résumé des fonctionnalités

| # | Fonctionnalité | Description en une ligne |
|---|---|---|
| F01 | Stockage chiffré local | Fichier JSON compressé puis chiffré (Argon2id + AES-256-GCM), chargé/sauvegardé par l'utilisateur |
| F02 | Gestion des credentials | Saisie en mémoire volatile, collage d'une map JSON, assistant de création de tokens, jamais persistés |
| F03 | Écran d'accueil | Création d'un nouveau fichier ou chargement d'un fichier existant |
| F04 | Administration | Ajout/modification/suppression des groupes, projets, sources et instances |
| F05 | Audits | Interrogation des sources d'un ou plusieurs projets, extraction des indicateurs du catalogue figé |
| F06 | Tableau de bord d'exécution | Suivi temps réel des campagnes d'audit, annulation propre |
| F07 | Audit partiel et reprise | Constitution de campagne ciblée, rejeu des échecs, projets non audités depuis N jours |
| F08 | Rapport d'anomalies techniques | Anomalies d'exécution typées, distinctes des indicateurs, avec actions suggérées |
| F09 | Brouillon et validation | Différentiel avant intégration à l'historique, détection d'aberrations, intégration/rejet par projet |
| F10 | Synthèse des audits | Dernier audit de chaque projet, filtres groupes/indicateurs, seuils de couleur |
| F11 | Synthèse graphique | Grand graphique d'évolution filtrable par groupe, projet et type d'indicateur |
| F12 | Fiche projet | Tous les indicateurs de tous les audits d'un projet, courbes d'évolution |
| F13 | Comparaison entre deux audits | Différentiel complet entre deux dates (indicateurs, dépendances, membres, marqueurs IA) |
| F14 | Annotations d'événements | Repères datés (projet ou groupe) affichés en lignes verticales sur les graphiques |
| F15 | Liste de travail | Agrégation transversale des alertes actives, statut vu/traité, commentaires |
| F16 | Recherche transversale | Recherche globale sur dépendances, membres, outils IA, entités |
| F17 | Surveillance des membres | Croisement membres/contributeurs avec la liste des membres connus du groupe, alerte `inconnu` |
| F18 | Politique IA | Autorisation par projet (interdite par défaut), détection des marqueurs IA dans l'arborescence |
| F19 | Purge des audits | Dédoublonnage < 1 semaine et purge/agrégation > 6 mois, proposée et prévisualisée |
| F20 | Verrouillage de session | Verrouillage sur inactivité, purge mémoire des secrets et de la clé dérivée |
| F21 | Journal des modifications | Trace horodatée des changements de paramétrage, superposable aux graphiques |
| F22 | Vues enregistrées | Modèles nommés de filtres pour la synthèse, le graphique et la liste de travail |
| F23 | Export/import de configuration | Export JSON en clair des seuils et référentiels partageables, import avec différentiel |
| F24 | Test de connectivité global | Test parallèle de toutes les instances, contrôle de portée des tokens |
| F25 | Exports PNG | Export image des graphiques, fiches projet et synthèses |
| F26 | Paramétrage | Seuils de couleur, référentiels de dépendances et de marqueurs IA, délais et concurrence |

---

## 4. Glossaire

| Terme | Définition |
|---|---|
| **Source** | Fournit la vérité : l'endroit où se situent les données à jour et auditables. Un dépôt GitLab et un projet Sonar sont des sources. |
| **Instance** | Un serveur GitLab ou Sonar (URL de base) référencé dans un groupe, dans lequel sont sélectionnées les sources des projets. |
| **Projet** | Unité logique contenant au moins un dépôt GitLab et pouvant rassembler, en plus, des projets Sonar et d'autres dépôts GitLab. |
| **Groupe** | Rassemble des projets en un ensemble ayant du sens organisationnellement. Porte les instances, la liste des membres connus et des annotations. |
| **Audit** | Action d'interroger les sources d'un ou plusieurs projets pour en extraire les indicateurs à la date du jour, analyser ces indicateurs et en sauvegarder les résultats. |
| **Campagne** | Une exécution d'audit portant sur un périmètre de projets, laissant une trace (verdicts par projet) support de la reprise et du rapport d'anomalies. |
| **Résultat** | Donnée structurée conservée d'un audit à l'autre, typée par un discriminant `type` (ex. `gitlab.dependances`, `sonar.notes`). |
| **Indicateur** | Grandeur restituée à l'utilisateur, extraite d'un résultat (directement ou par calcul contre les seuils et référentiels courants). |
| **Référentiel** | Grille de lecture partageable entre utilisateurs : règles de dépendances (statuts d'obsolescence) et règles de marqueurs IA. Exportable en clair. |
| **Membres connus** | Donnée propre à un groupe (non partageable, jamais exportée en clair) : règles d'identification des collaborateurs par username, email ou domaine, avec statut `interne`, `client` ou `partenaire`. |
| **Alerte** | Situation remontée par la liste de travail (membre inconnu, violation IA, SONAR_KO, projet mort, dépendance obsolète…), identifiée par une clé stable pour le suivi de traitement. |
| **Brouillon** | Zone de transit des résultats d'une campagne avant validation et intégration à l'historique. Au plus un brouillon à la fois. |
| **Annotation** | Repère daté posé sur un projet ou un groupe (migration, changement d'équipe, incident…), affiché sur les graphiques d'évolution. |
| **Ref auditée** | Branche, tag ou SHA sur lequel portent les audits d'un dépôt GitLab (`refAuditee`), par défaut la branche par défaut du dépôt. |
| **SONAR_KO** | Badge signalant que la dernière analyse Sonar est incohérente avec la date du dernier commit de la ref auditée (au-delà d'une tolérance paramétrable). |
| **Données** | La grappe de données dont la racine est la liste des groupes, complétée des référentiels, paramètres, campagnes, brouillon, journal, vues et traitements d'alertes. |

---

## 5. Détails des fonctionnalités

### 5.1 F01 — Stockage chiffré local

La solution ne contient pas de base de données SQL. Les données sont chargées par l'utilisateur depuis un fichier de son poste et sauvegardées par téléchargement/écriture vers son poste. Le fichier est un JSON **sérialisé, puis compressé, puis chiffré** — dans cet ordre, un flux chiffré étant incompressible.

Chaîne cryptographique (implémentée côté Rust, crates RustCrypto) :

- **Compression** : zstd.
- **Dérivation de clé** : Argon2id (mémoire ≥ 64 Mo, 3 itérations), sel aléatoire de 16 octets régénéré à chaque sauvegarde. Repli PBKDF2-SHA256 ≥ 600 000 itérations si nécessaire.
- **Chiffrement authentifié** : AES-256-GCM, IV aléatoire de 12 octets à chaque sauvegarde. Un fichier altéré ou un mauvais mot de passe est détecté immédiatement.
- **Format de fichier** : en-tête clair versionné `magie (4o) | version (1o) | paramètres KDF | sel | IV | données chiffrées + tag`. Le versionnage permet de faire évoluer les paramètres cryptographiques sans casser les anciens fichiers.

Le mot de passe est demandé au chargement et à chaque sauvegarde. La **clé dérivée** (jamais le mot de passe) est conservée en mémoire pendant la session pour éviter de refaire l'Argon2 coûteux, et effacée au verrouillage. Avant chaque écrasement, une **sauvegarde de sécurité** horodatée de l'ancien fichier est conservée (N dernières, chiffrées à l'identique).

### 5.2 F02 — Gestion des credentials et assistant de création

Les credentials ne sont **jamais** sauvegardés : ils sont systématiquement ressaisis avant d'interroger les APIs, via un formulaire multi-sources et le **collage d'une chaîne JSON** contenant une map des credentials par identifiant d'instance (validée par schéma au collage). Ils vivent dans un store mémoire volatile unique côté Angular (jamais `localStorage`, jamais dans l'état sérialisé), sont passés en paramètre de chaque commande Tauri (pas de stockage côté Rust), transmis exclusivement en en-tête HTTP (`PRIVATE-TOKEN` GitLab, `Authorization: Bearer` Sonar), et purgés à la fermeture, au verrouillage et après inactivité.

L'**assistant de création** guide l'utilisateur par instance : lien direct vers la page de création de token de l'instance (`{urlBase}/-/user_settings/personal_access_tokens` pour GitLab, `{urlBase}/account/security` pour Sonar) ouvert dans le navigateur système, nom de token suggéré, **portée minimale en lecture seule** (`read_api` GitLab, « Browse » Sonar), durée de vie recommandée. Un bouton « Tester » par credential appelle un point d'API anodin et affiche le verdict ; la portée du token est contrôlée quand l'API le permet, avec avertissement en cas de token sur-privilégié. L'application peut générer le **gabarit JSON** pré-rempli des identifiants d'instances (valeurs `<TOKEN_ICI>`), à compléter dans le gestionnaire de secrets de l'utilisateur.

L'application applique une CSP stricte (pas d'`unsafe-inline` ni d'`eval`), aucune injection HTML dynamique, et un verrouillage des dépendances npm (lockfile, audit en CI) : une XSS équivaudrait à un vol de tokens.

### 5.3 F03 — Écran d'accueil

Propose deux actions : **créer un nouveau fichier de données** depuis rien (saisie et confirmation du mot de passe) ou **charger un fichier existant** (sélecteur natif, saisie du mot de passe, migration de version de schéma à la volée si nécessaire). À l'ouverture d'un fichier, un encart « depuis votre dernière session » signale les projets non audités depuis plus de N jours et les alertes non traitées ; si des alertes existent, la liste de travail peut être proposée comme premier écran.

### 5.4 F04 — Administration des groupes, projets et sources

Écran d'administration en ajout/modification/suppression :

- **Groupes** : nom, description, instances GitLab et Sonar (URL de base), onglet « Membres connus » (cf. F17), annotations de groupe.
- **Projets** : nom, description, politique IA (cf. F18), sources rattachées, duplication d'un projet existant (mêmes instances, même paramétrage) pour accélérer la saisie en masse.
- **Sources** : instance de rattachement, type (`depotGitlab` ou `projetSonar`), identifiant externe, et pour les dépôts la **ref auditée** (`refAuditee`, optionnelle — absente, la branche par défaut du dépôt s'applique ; la valeur effective est toujours affichée). Le champ accepte une branche, un tag ou un SHA. Autocomplétion des branches via l'API au moment de la configuration ; l'existence de la ref est validée à l'audit avec une anomalie explicite en cas d'absence.

À la première liaison d'une source GitLab à un projet, l'application calcule la **date du premier commit interne** (cf. F17). Les suppressions sont confirmées et rappellent la perte de l'historique d'audits associé.

### 5.5 F05 — Audits et catalogue des indicateurs

Un audit interroge les sources d'un projet et produit des résultats typés. Chaque connecteur (GitLab, Sonar) implémente une interface commune ; un troisième « connecteur » purement local calcule les résultats croisés une fois les deux premiers réunis. Les appels sont mutualisés : l'arborescence `repository/tree?ref={refAuditee}&recursive=true` sert à la fois aux dépendances, aux marqueurs IA et aux fichiers d'hygiène ; les métriques Sonar sont obtenues en un appel `measures/component` multi-métriques.

Chaque résultat GitLab porte la ref effectivement auditée et le SHA du commit de tête (traçabilité et reproductibilité). La liste des indicateurs est **figée** :

| Type de résultat | Contenu stocké (constat) | Indicateurs restitués (jugement calculé) |
|---|---|---|
| `gitlab.dependances` | Liste des dépendances (référence unique + version) | Statuts d'obsolescence via `reglesDependances` : obsolète, maintenu, à jour M-3, à jour M-1 |
| `gitlab.branches` | Nombre et état des branches (avec/sans MR, rebased, mal nommée…) | Problèmes d'usage GitLab |
| `gitlab.vitalite` | Date du dernier commit sur la ref auditée, SHA | Vivant / mourant (> 6 mois) / mort (> 12 mois), seuils paramétrables |
| `gitlab.contributeurs` | Emails des auteurs distincts des commits (fenêtre 90 j) et volumes | Nombre de contributeurs actifs ; croisement avec les membres connus |
| `gitlab.taille_depot` | Taille du dépôt en octets | Classe S / L / XL / XXL, bornes paramétrables ; courbe de croissance |
| `gitlab.merge_requests` | MR ouvertes : iid, date de création, en conflit | Nombre, âge médian et maximal, % de MR en conflit |
| `gitlab.marqueurs_ia` | Marqueurs détectés dans l'arborescence : chemin, nature, outil | Violation de politique IA (cf. F18), répartition des outils |
| `gitlab.membres` | Membres (username, nom, niveau d'accès, hérité) et auteurs de commits | Statuts interne / client / partenaire / inconnu via les membres connus (cf. F17) |
| `sonar.violations` | Nombre de violations par sévérité | Seuils de couleur |
| `sonar.dette` | Dette technique totale, ratio dette/taille | Comparabilité inter-projets |
| `sonar.couverture` | `coverage` et `new_coverage` | Seuils de couleur |
| `sonar.notes` | Notes A–E des quatre axes (fiabilité, sécurité, maintenabilité, revue sécurité), stockées séparément | Lettres colorées A=vert … E=rouge |
| `sonar.ncloc` | `ncloc` et répartition par langage | Volumétrie, dénominateur de normalisation |
| `croise.fraicheur_sonar` | Date du dernier commit et date de la dernière analyse Sonar | Badge **SONAR_KO** si écart > tolérance (défaut 7 j) ou aucune analyse ; grise toutes les métriques Sonar du même audit |
| `croise.activite_sans_qualite` | Nombre de commits (90 j) et nouvelles violations | Signal levé si les deux dépassent leurs seuils ; « non évaluable » si une source manque ou si SONAR_KO |
| `croise.ia_nouveau_code` | Présence de marqueurs, outils, `new_coverage`, `new_violations`, `new_duplicated_lines_density` | Juxtaposition des séries sur les projets où l'IA est autorisée ; aucun verdict automatique |

Le coût API de chaque indicateur est classé (gratuit/léger/coûteux) et les indicateurs coûteux sont désactivables par groupe.

### 5.6 F06 — Tableau de bord d'exécution d'audit

Écran de suivi temps réel de chaque campagne : progression globale, estimation de durée restante (moyenne glissante), et liste des projets avec état — *en attente*, *en cours* (connecteur actif affiché), *terminé* (durée, nombre de résultats), *échoué* (motif court), *ignoré*. Les échecs n'interrompent pas la campagne. L'**annulation est propre** : elle vide la file sans interrompre les requêtes en vol ; les résultats acquis sont conservés, les projets non traités deviennent *ignorés* et rejoignent le périmètre de reprise. La concurrence est limitée (paramétrable, défaut 4 projets simultanés) pour ménager les instances et le proxy. Pendant une campagne, le minuteur d'inactivité du verrouillage est suspendu.

### 5.7 F07 — Audit partiel et reprise sur échec

Tout lancement passe par un écran de **constitution de campagne** : sélection par cases à cocher (tout, par groupes, manuelle) et deux raccourcis intelligents — « rejouer les échecs de la dernière campagne » et « projets non audités depuis plus de N jours ». L'écran affiche le coût prévisionnel (nombre de projets et d'instances) et contrôle la présence en mémoire des credentials nécessaires, avec renvoi vers le formulaire de saisie listant précisément les credentials manquants. Chaque campagne laisse une trace légère dans le fichier : identifiant, date, périmètre demandé, verdict par projet (*succès / échec / ignoré / rejeté*).

### 5.8 F08 — Rapport d'anomalies techniques d'audit

Distingue rigoureusement les **anomalies d'exécution** des indicateurs métier. Chaque anomalie porte : projet et source concernés, **catégorie typée** (authentification refusée, ref introuvable, instance injoignable, délai dépassé, réponse inattendue, droits insuffisants), message technique brut repliable, et **action suggérée** en langage clair. Les anomalies de même cause sont regroupées (un token expiré sur 15 projets = une ligne racine). Le rapport de la dernière campagne reste consultable depuis la synthèse ; les projets en échec y portent un pictogramme dédié, distinct des couleurs de seuils. Le vocabulaire d'erreurs est le même que celui du test de connectivité (F24).

### 5.9 F09 — Brouillon d'audit et validation avant intégration

Les résultats d'une campagne atterrissent dans une **zone de brouillon** persistée dans le fichier (au plus un brouillon ; en lancer une nouvelle campagne exige de traiter le brouillon courant). Le brouillon est présenté en différentiel par rapport au dernier audit intégré de chaque projet : indicateurs bougeant au-delà d'un seuil de matérialité paramétrable, nouveautés remarquables (membre inconnu, marqueur IA apparu, dépendance disparue), et **valeurs aberrantes** signalées automatiquement (taille ×10, ncloc divisé par deux, couverture 60 % → 0 % — symptômes d'une mauvaise ref ou d'un projet Sonar réassigné). L'utilisateur intègre tout, intègre projet par projet, ou **rejette** (motif optionnel consigné) ; un projet rejeté est marqué « audité, résultat rejeté », distinct d'un non-audité.

### 5.10 F10 — Écran de synthèse des audits

Affiche le dernier audit intégré de chaque projet, filtrable par groupes et types d'indicateurs, avec les **seuils de couleur** du paramétrage. Permet de comparer les projets et de détecter : non audités depuis longtemps, qualimétrie en baisse, problèmes GitLab en hausse, obsolescence des dépendances. Traitements spéciaux : un **membre inconnu court-circuite les seuils** (pastille d'alerte dédiée, tri d'office en tête, bandeau global cliquable « N projets comportent des membres au statut inconnu ») ; le badge SONAR_KO grise les métriques Sonar concernées ; un badge « IA autorisée » matérialise le périmètre dérogatoire ; les projets en échec de dernière campagne portent leur pictogramme. Vue exportable en PNG (l'alerte membre inconnu doit y rester visible).

### 5.11 F11 — Synthèse graphique

Un grand graphique d'évolution (ECharts) filtrable par groupe, projet et type d'indicateur, pour détecter les tendances. Zoom temporel, séries superposables, annotations (F14) et changements de seuils du journal (F21) affichés en lignes verticales, export PNG natif. Les signaux (activité sans qualité) s'affichent comme séries binaires superposables aux courbes.

### 5.12 F12 — Fiche projet (écran de détail)

Visualise tous les indicateurs de tous les audits d'un projet, avec une vue graphique de l'évolution de chacun. En tête : identité du projet, politique IA, date du premier commit interne (« âge du projet chez nous »), dernier audit et son verdict. Sections : indicateurs par thème, liste nominative des membres et statuts (avec raccourci « qualifier ce membre » en deux clics vers les membres connus du groupe), marqueurs IA détectés, section « IA & qualité du nouveau code » (courbes juxtaposées, ligne verticale à la date d'activation IA), annotations, entrées de journal concernant le projet. Export PNG de la fiche.

### 5.13 F13 — Comparaison entre deux audits

Depuis la fiche projet : choix de deux dates (défaut dernier vs précédent, raccourcis 1 mois / 3 mois) et différentiel en quatre volets — **indicateurs** (avant/après/delta, coloré selon le sens propre de chaque indicateur), **dépendances** (apparues, disparues, montées de version, statuts d'obsolescence courants appliqués aux deux dates), **membres et contributeurs** (arrivées, départs, changements de niveau d'accès), **marqueurs IA** (apparus/disparus par outil). Les annotations de l'intervalle sont rappelées. Pur calcul d'affichage, exportable en PNG.

### 5.14 F14 — Annotations d'événements

Une annotation = date, libellé court, description optionnelle, portée (projet ou groupe entier), catégorie suggérée (migration, changement d'équipe, activation IA, incident, jalon). Création depuis la fiche projet, l'administration du groupe, ou par clic sur une date d'un graphique. Affichage en lignes verticales étiquetées sur tous les graphiques d'évolution, filtrables par catégorie ; rappel dans la comparaison entre deux audits. La date d'activation IA est matérialisée automatiquement comme annotation système non supprimable.

### 5.15 F15 — Vue « liste de travail »

Agrège toutes les **alertes actives** des derniers audits intégrés : membres inconnus (toujours en tête), violations de politique IA, SONAR_KO, projets morts/mourants, dépendances obsolètes, activité sans qualité, MR en conflit au-delà du seuil. Chaque ligne : gravité, projet, groupe, description, **date de première détection** (« ce membre inconnu traîne depuis 3 mois »). Statuts **« vue »** et **« traitée »** avec commentaire et horodatage, attachés à une **clé d'identité stable de l'alerte** (ex. `membre_inconnu|projetId|username`) : une alerte traitée qui persiste réapparaît discrètement (« traitée le 12/06, toujours présente ») ; une alerte disparue des constats est classée automatiquement, avec trace. Filtres mémorisables en vues (F22). Écran d'accueil naturel en présence d'alertes non traitées.

### 5.16 F16 — Recherche transversale

Champ global (raccourci clavier) interrogeant les derniers audits intégrés de tous les projets : dépendances (référence et version — « log4j » liste les projets concernés et leurs versions), membres et contributeurs (username, nom, email), outils IA détectés, entités (groupes, projets, sources). Résultats groupés par nature, chaque ligne menant à la fiche concernée. Option « inclure l'historique » étendant la recherche à tous les audits (« quand a-t-on cessé d'utiliser struts ? »). Implémentation : index en mémoire construit à l'ouverture du fichier.

### 5.17 F17 — Surveillance des membres et premier commit interne

**Liste des membres connus** — donnée propre à chaque groupe (ce n'est pas un référentiel partageable ; elle n'entre jamais dans l'export en clair). Chaque entrée est une règle : critère + type de critère + statut (`interne`, `client`, `partenaire`) + libellé optionnel + alias email optionnel. La **précédence de correspondance** est : 1) username exact (le plus fiable — le domaine email n'est pas systématiquement fiable, un même domaine pouvant héberger deux types de membres), 2) email exact, 3) domaine email (règle de masse, toujours surchargeable par 1 et 2). Premier niveau qui matche gagne ; aucun match → **`inconnu`** (valeur par défaut). Deux règles de même niveau contradictoires produisent un statut « conflit de règles », traité visuellement comme `inconnu` ; l'écran d'administration bloque la saisie de doublons username.

**Audit** : `GET /projects/:id/members/all` (membres **hérités** inclus — mêmes droits effectifs) fournit username, nom et niveau d'accès (l'API n'expose pas l'email, sauf token admin ou email public). Les auteurs de commits, eux, sont identifiés par email : le croisement des deux canaux détecte aussi les **contributeurs non membres et non reconnus**. Le statut n'est jamais stocké dans l'audit : il est résolu à la consultation, si bien que qualifier un membre requalifie tout l'historique. Le niveau d'accès module la gravité (un inconnu Maintainer est plus grave qu'un inconnu Reporter).

**Visibilité** : c'est le seul indicateur signalant un incident de sécurité potentiel — il court-circuite les seuils (cf. F10, F15), et la qualification d'un inconnu tient en deux clics depuis l'alerte.

**Conformité** : ces données sont des données personnelles (RGPD) — minimisation par les règles de domaine, protection au repos par le chiffrement du fichier, et exclusion structurelle de l'export en clair (la donnée vit dans `groupes`, l'export ne couvre que `parametres.seuils` et `referentiels`).

**Premier commit interne** : à la première liaison d'une source GitLab (repli : premier audit si credentials absents), l'application recherche le premier commit dont l'auteur matche une règle `interne` du groupe — pagination depuis la dernière page de `repository/commits` (l'API ne trie pas du plus ancien au plus récent), remontée bornée (statut « non déterminé au-delà de N commits » sinon). Résultat stocké comme attribut immuable du projet : date, SHA, email d'auteur, date de calcul, empreinte du sous-ensemble `interne` des membres connus au moment du calcul. Bouton « recalculer » dans la fiche projet, suggéré discrètement quand l'empreinte a changé.

### 5.18 F18 — Politique IA

Chaque projet porte un booléen `iaAutorisee`, **interdit par défaut** : le toggle est décoché à la création et un champ absent vaut `false` (défaut structurel, pas seulement d'interface). Le passage à `true` est horodaté (`iaAutoriseeDepuis`) et crée l'annotation système correspondante.

Chaque audit détecte les **marqueurs IA** dans l'arborescence complète de la ref auditée, par correspondance avec le référentiel paramétrable `reglesMarqueursIA` (motif, type de correspondance, portée racine/partout, nature fichier/répertoire, outil). Référentiel de départ : `CLAUDE.md` et `.claude/` (Claude Code), `.cursorrules` et `.cursor/` (Cursor), `.github/copilot-instructions.md` (Copilot), `.windsurfrules` et `.windsurf/` (Windsurf), `.aider.conf.yml` (Aider), `GEMINI.md` et `.gemini/` (Gemini), `AGENTS.md` et `llms.txt` (conventions multi-outils), `.continue/` (Continue), plus les signaux `.mcp.json` et `.claude/settings.json`.

Évaluation (calculée) : interdit + marqueurs → **rouge, violation** ; interdit + rien → vert (avec la réserve du faux négatif : la détection prouve une configuration commitée, pas l'usage réel — précisé dans l'aide) ; autorisé + marqueurs → informatif (outils listés). Le résultat stocke chemin, nature et outil de chaque marqueur, jamais le verdict.

### 5.19 F19 — Purge des audits

Deux règles complémentaires, **proposées, jamais automatiques**, avec prévisualisation (« 142 audits supprimés sur 8 projets, 2,4 Mo → 0,9 Mo ») et rappel de sauvegarde préalable :

- **Densité** : parmi les audits espacés de moins d'une semaine, balayage chronologique avec ancre — on conserve le premier audit, puis uniquement ceux à ≥ 7 jours de la dernière ancre conservée. Le premier et le dernier audit de chaque projet sont toujours conservés.
- **Âge** : au-delà de 6 mois, au choix de l'utilisateur — suppression, ou **agrégation mensuelle** (conservation du dernier audit de chaque mois) préservant la tendance longue.

Déclencheurs : entrée du paramétrage, et suggestion contextuelle à la sauvegarde au-delà d'un seuil de taille.

### 5.20 F20 — Verrouillage de session

Après un délai d'inactivité paramétrable (défaut 15 minutes) ou sur action manuelle (bouton + raccourci) : écran de verrouillage masquant toute donnée, **effacement de la clé dérivée et de tous les credentials** en mémoire, côté Angular comme côté Rust. Le déverrouillage redemande le mot de passe du fichier ; les credentials sont perdus et à recoller (annoncé clairement sur l'écran). Les modifications non sauvegardées survivent au verrouillage. Cas particuliers : campagne en cours = activité (minuteur suspendu) ; verrouillage manuel pendant une campagne = confirmation puis annulation propre. N échecs de déverrouillage consécutifs ferment le fichier (retour à l'accueil) — le fichier chiffré sur disque reste la seule vérité.

### 5.21 F21 — Journal des modifications de paramétrage

Consignation automatique de chaque modification des données « de jugement » : seuils, règles de dépendances, règles de marqueurs IA, qualifications de membres, politique IA d'un projet, ref auditée d'une source. Une entrée = horodatage, objet concerné, valeur avant/après, origine (saisie manuelle, import de configuration, qualification depuis une alerte). Consultable dans le paramétrage (filtres type/période) et **contextuellement** : entrées concernant un projet sur sa fiche, changements de seuils superposables au grand graphique en lignes verticales grises — quand une courbe change de couleur rétroactivement, l'explication est sous les yeux. Journal en append-only dans le fichier chiffré, purge proposée et prévisualisée au-delà d'une limite.

### 5.22 F22 — Modèles de vues enregistrées

Sur la synthèse, le grand graphique et la liste de travail, l'état courant des filtres (groupes, projets, types d'indicateurs, période, tri, options) peut être enregistré sous un nom. Sélecteur en tête d'écran ; modification → « mettre à jour » ou « enregistrer sous » ; un modèle peut être **vue par défaut** de son écran. Données personnelles de travail : elles vivent dans le fichier chiffré (branche `vuesEnregistrees`), référencent groupes et projets par UUID et ne font pas partie de l'export en clair. Chaque modèle stocke la version de schéma de ses filtres (filtre disparu = ignoré avec avertissement).

### 5.23 F23 — Export et import de configuration

**Export en clair** : un JSON non chiffré couvrant strictement `parametres.seuils` + `referentiels` (règles de dépendances et de marqueurs IA) — jamais les membres connus, ni les vues, ni les données de groupes. Destiné au partage entre utilisateurs.

**Import** : différentiel à trois colonnes — *ajouts*, *modifications* (avant/après), *identiques* (repliées) — avec acceptation globale ou ligne à ligne ; rien n'est écrasé sans décision explicite. Garde-fous : vérification de la version de schéma (plus récente = refus expliqué ; plus ancienne = migration à la volée), entrées de journal pour chaque acceptation (origine « import du fichier X »), application transactionnelle (tout ou rien).

### 5.24 F24 — Test de connectivité global

Depuis l'écran des credentials et proposé en préambule de campagne : bouton « tout tester » lançant en parallèle (même limitation de concurrence que les audits), pour chaque instance déclarée : appel de validation anodin (`/api/v4/user` GitLab, `api/authentication/validate` Sonar), contrôle de portée du token quand possible, traversée effective du proxy. Restitution en tableau : instance, verdict (✓ / ✗ / ⚠ sur-privilégié / — pas de credential saisi), latence mesurée, message d'erreur exploitable avec les mêmes catégories typées que le rapport d'anomalies. Les instances sans credential sont listées, pas masquées.

### 5.25 F25 — Exports PNG

Tous les écrans affichant des données sont exportables en PNG : graphiques (export natif ECharts via `getDataURL()`), fiche détaillée d'un projet, synthèse d'un groupe, comparaison entre deux audits (rendu DOM via `html-to-image`). Les alertes de sécurité restent visibles sur les exports.

### 5.26 F26 — Paramétrage

Écran regroupant : les **seuils de couleur** de chaque indicateur de la synthèse ; les seuils spécifiques — vitalité (mourant/mort), bornes de taille de dépôt (S/L/XL/XXL), tolérance de fraîcheur Sonar, seuils du signal activité sans qualité, seuil de matérialité du brouillon, fraîcheur d'audit ; le référentiel des **dépendances** (motif, versions et statut : obsolète, maintenu, à jour M-3, à jour M-1) ; le référentiel des **marqueurs IA** ; les réglages applicatifs (délai de verrouillage, concurrence d'audit, proxy optionnel, nombre de sauvegardes de sécurité) ; l'accès au journal (F21), à la purge (F19) et à l'export/import de configuration (F23).

---

## 6. Structure des données

### 6.1 Vue d'ensemble

Le fichier de données est un document JSON unique dont la racine porte la version de schéma et les branches suivantes :

```
racine
├── versionSchema            entier — version du schéma de données (migrations à la volée)
├── meta                     dates de création/modification, application
├── groupes[]                la grappe principale
│   ├── instances[]          serveurs GitLab / Sonar du groupe (URL de base)
│   ├── membresConnus[]      règles d'identification des collaborateurs (donnée du groupe, jamais exportée en clair)
│   ├── annotations[]        événements datés de portée groupe
│   └── projets[]
│       ├── iaAutorisee      booléen, faux par défaut (+ iaAutoriseeDepuis)
│       ├── premierCommitInterne   attribut immuable recalculable
│       ├── sources[]        dépôts GitLab (avec refAuditee) et projets Sonar
│       ├── annotations[]    événements datés de portée projet
│       └── audits[]         historique — chaque audit contient des resultats[] typés
├── referentiels             grilles de lecture partageables (export en clair)
│   ├── reglesDependances[]  motifs, versions et statuts d'obsolescence
│   └── reglesMarqueursIA[]  motifs de détection des outils IA
├── parametres               seuils + réglages applicatifs (seuils exportés en clair)
├── campagnes[]              traces d'exécution : périmètre, verdicts, anomalies
├── brouillon                zone de validation (au plus un, nullable)
├── traitementsAlertes[]     statuts vu/traité par clé d'alerte stable
├── journal[]                modifications de paramétrage, append-only
└── vuesEnregistrees[]       modèles de filtres nommés
```

### 6.2 Règles transverses

- **Identifiants** : toutes les entités (groupes, projets, sources, instances, audits, annotations, campagnes, règles, vues) portent un UUID v4 — prérequis de la fusion de fichiers, du traitement d'alertes et des vues.
- **Constat vs jugement** : les `resultats` d'audit ne contiennent jamais de verdict (statut d'obsolescence, statut de membre, badge, classe de taille) ; seuls les constats bruts y figurent.
- **Discriminant** : chaque résultat porte un champ `type` de la forme `origine.nature` (`gitlab.*`, `sonar.*`, `croise.*`) ; le moteur, les filtres et les graphiques sont extensibles par ajout de type sans modification.
- **Traçabilité GitLab** : chaque résultat issu d'un dépôt porte `refEffective` et `shaTete`.
- **Périmètre de l'export en clair** : strictement `parametres.seuils` + `referentiels`. Les branches `groupes` (dont `membresConnus`), `campagnes`, `brouillon`, `journal`, `vuesEnregistrees` et `traitementsAlertes` n'en font jamais partie.
- **Clé d'alerte** : chaîne stable de la forme `type_alerte|projetId|discriminant` (ex. `membre_inconnu|<uuid>|jdoe-ext`), indépendante des audits, support du cycle vu/traité/réapparition.

### 6.3 Enveloppe chiffrée

Le document JSON est sérialisé, compressé (zstd) puis chiffré (AES-256-GCM, clé dérivée du mot de passe par Argon2id). L'enveloppe binaire sur disque est :

```
magie (4 octets) | versionEnveloppe (1) | paramètres KDF | sel (16) | IV (12) | données chiffrées + tag GCM
```

La version d'enveloppe (cryptographie) est indépendante de `versionSchema` (structure du JSON) : les deux migrent séparément.

### 6.4 Fichiers livrés avec cette spécification

- `schema-donnees.schema.json` — schéma JSON (draft 2020-12) du document en clair, faisant foi pour la structure détaillée de chaque entité.
- `exemple-donnees.json` — jeu d'exemple complet : 2 groupes, 3 projets par groupe, audits multi-types, membres connus, référentiels, campagnes, brouillon, annotations, journal, vues enregistrées et traitements d'alertes.
