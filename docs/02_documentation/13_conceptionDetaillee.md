# Conception détaillée de l'application

## Sommaire

1. [Détail des modules/composants et de leurs interfaces](#détail-des-modulescomposants-et-de-leurs-interfaces)
2. [Séquences des scénarios fonctionnels principaux](#séquences-des-scénarios-fonctionnels-principaux)
3. [Gestion des erreurs et cas limites au niveau technique](#gestion-des-erreurs-et-cas-limites-au-niveau-technique)
4. [Matrice de traçabilité](#matrice-de-traçabilité)

## Détail des modules/composants et de leurs interfaces

| module / composant | interface exposée | dépendances |
|---|---|---|
| Cœur natif — Connecteur GitLab | Une opération par type de résultat (`interrogerDependances`, `interrogerBranches`, `interrogerVitalite`, `interrogerContributeurs`, `interrogerTailleDepot`, `interrogerMergeRequests`, `interrogerMarqueursIA`, `interrogerMembres`) ainsi que `testerConnectivite(instance, credential)`, exposées individuellement par la Façade de commandes et invocables directement depuis l'Orchestrateur de campagne (UI) | Client HTTP ([reqwest](https://docs.rs/reqwest/)), configuration proxy du poste, credential en mémoire fourni par l'appelant |
| Cœur natif — Connecteur Sonar | `interrogerViolations`, `interrogerDette`, `interrogerCouverture`, `interrogerNotes`, `interrogerNcloc`, `testerConnectivite`, mêmes modalités d'exposition que le Connecteur GitLab | Client HTTP (reqwest), configuration proxy, credential en mémoire fourni par l'appelant |
| Cœur natif — Moteur de persistance | `creerFichier(chemin, motDePasse)`, `chargerFichier(chemin, motDePasse)`, `sauvegarderFichier(chemin, données, motDePasse)`, `migrerSchema(données)`, `enregistrerBrouillon(campagneId, resultatsParProjet)` | RustCrypto (Argon2id, AES-256-GCM), zstd, système de fichiers du poste |
| Cœur natif — Façade de commandes | Ensemble des commandes mutantes et des requêtes (`creerFichier`, `chargerFichier`, `sauvegarderFichier`, `enregistrerBrouillon`, `integrerBrouillon`, `rejeterBrouillon`, `qualifierMembre`, `definirPolitiqueIA`, `verrouillerSession`, `creerAnnotation`, `qualifierAlerte`, `definirSeuil`, `definirReferentiel`, ainsi que l'ensemble des opérations du Connecteur GitLab et du Connecteur Sonar, …) et de l'événement poussé `verrouillageDeclenche` | Tous les modules du cœur natif ci-dessus |
| UI — Connecteur croisé | `calculerFraicheurSonar`, `calculerActiviteSansQualite`, `calculerIaNouveauCode` | Résultats déjà obtenus des connecteurs GitLab et Sonar pour le même audit, via la Façade de commandes (aucun appel réseau ni credential propre) |
| UI — Orchestrateur de campagne | `constituerCampagne(périmètre)`, `lancerCampagne(campagne)`, `annulerCampagne()` | Façade de commandes (opérations du Connecteur GitLab et du Connecteur Sonar, `enregistrerBrouillon`), Connecteur croisé, Store d'état applicatif (credentials en mémoire, progression) |
| UI — Moteur de jugement | `calculerStatutMembre`, `calculerClasseTaille`, `calculerBadgeSonarKo`, `calculerStatutIA`, `calculerStatutObsolescence`, … (une fonction pure par indicateur calculé, à partir des règles de jugement définies à l'étape 3, cf. [Constat, jugement et politique IA](./05_reglesGestion.md#constat-jugement-et-politique-ia), et des seuils/référentiels définis à l'étape 7, cf. [Paramètres](./12_modeleDonnees.md#entités-attributs-et-relations)) | Référentiels et Paramètres courants (lecture) ; ne réalise aucun accès disque ni réseau |
| UI — Écrans et navigation | Composants d'écran de l'arborescence (étape 5) et routeur applicatif associé | Store d'état applicatif, Moteur de jugement, Orchestrateur de campagne, Façade de commandes |
| UI — Store d'état applicatif | État réactif exposé sous forme de signaux (session courante, credentials en mémoire, filtres actifs, vue sélectionnée) | Aucune dépendance externe ; état local à l'UI |
| UI — Index de recherche transversale | `construireIndex(données)`, `rechercher(terme, options)` | Données chargées en mémoire (constats), reconstruit à chaque ouverture de fichier ou intégration de brouillon |

## Séquences des scénarios fonctionnels principaux

### Créer un nouveau fichier de données ([US-001](./04_casUsage.md#cas-dusage--user-stories))

1. L'écran d'accueil invoque la commande `creerFichier(chemin, motDePasse)` sur la Façade de commandes.
2. La Façade de commandes délègue au Moteur de persistance : génère la racine JSON vide (`versionSchema` courant, `meta.creeLe`), sérialise, compresse (zstd), dérive une clé (Argon2id, sel aléatoire), chiffre (AES-256-GCM, IV aléatoire), puis écrit le fichier de façon atomique.
3. Le Moteur de persistance renvoie la structure de données vide ; la clé dérivée est conservée en mémoire côté cœur natif pour la durée de la session ([RG-002](./05_reglesGestion.md#stockage-et-confidentialité-des-données)).
4. La Façade de commandes renvoie l'état initial à l'UI ; le Store d'état applicatif initialise la session.
5. Les Écrans et navigation redirigent vers l'Administration pour la première configuration.

### Réaliser une campagne d'audit et intégrer les résultats ([US-009](./04_casUsage.md#cas-dusage--user-stories), [US-010](./04_casUsage.md#cas-dusage--user-stories), [US-014](./04_casUsage.md#cas-dusage--user-stories))

1. L'écran de constitution de campagne invoque `constituerCampagne(périmètre)` sur l'Orchestrateur de campagne (UI) ; celui-ci calcule le coût prévisionnel et vérifie, via les credentials détenus par le Store d'état applicatif, que rien ne manque.
2. L'UI invoque `lancerCampagne(campagne)` sur l'Orchestrateur de campagne.
3. L'Orchestrateur de campagne planifie les appels avec une concurrence limitée ([RG-017](./05_reglesGestion.md#audits-et-campagnes)) ; pour chaque projet du périmètre, il invoque via la Façade de commandes les opérations du Connecteur GitLab et du Connecteur Sonar (credential transmis à chaque appel), qui restent responsables de l'appel HTTP et de la désérialisation typée côté Rust, puis calcule localement le résultat croisé (Connecteur croisé, UI) une fois les deux résultats disponibles.
4. À chaque projet terminé, l'Orchestrateur de campagne met à jour l'état de progression directement dans le Store d'état applicatif ; le Tableau de bord d'exécution se met à jour de façon réactive, sans passer par un événement poussé du cœur natif.
5. À l'issue de la campagne, l'Orchestrateur de campagne invoque `enregistrerBrouillon(campagneId, resultatsParProjet)` sur la Façade de commandes, qui délègue l'écriture au Moteur de persistance, et signale les valeurs aberrantes par comparaison avec le dernier audit intégré de chaque projet ([RG-020](./05_reglesGestion.md#audits-et-campagnes)).
6. Depuis l'écran de Brouillon, l'UI invoque `integrerBrouillon(sélection)` ; le Moteur de persistance ajoute les Audit sélectionnés à l'historique des Projet concernés, met à jour la Campagne (verdicts) et vide le Brouillon.
7. L'UI navigue vers la Synthèse des audits ; le Moteur de jugement recalcule, côté UI, les statuts affichés à partir des nouveaux constats et des référentiels/seuils courants ([RG-011](./05_reglesGestion.md#constat-jugement-et-politique-ia)).

### Qualifier un membre inconnu depuis une alerte ([US-022](./04_casUsage.md#cas-dusage--user-stories))

1. Depuis la Liste de travail ou la Fiche projet, l'UI invoque `qualifierMembre(groupeId, critère, typeCritère, statut)` sur la Façade de commandes.
2. La Façade de commandes délègue au Moteur de persistance : ajoute ou met à jour l'entrée MembreConnu du Groupe, ajoute une EntréeJournal (`origine: qualificationDepuisAlerte`), puis sauvegarde le fichier.
3. La Façade de commandes renvoie les données mises à jour à l'UI.
4. Le Moteur de jugement recalcule, côté UI, le statut de tous les membres concernés sur l'historique déjà chargé, sans nouvel audit ([RG-012](./05_reglesGestion.md#constat-jugement-et-politique-ia)).
5. L'UI retire l'alerte de la Liste de travail si plus aucun membre inconnu ne subsiste sur le projet ([RG-026](./05_reglesGestion.md#vues-alertes-export-et-import)).

### Verrouiller et déverrouiller la session ([US-026](./04_casUsage.md#cas-dusage--user-stories))

1. Sur inactivité au-delà du délai paramétrable ([RNF-014](./07_exigencesNonFonctionnelles.md#sécurité)) ou sur action manuelle depuis la barre supérieure, l'UI invoque `verrouillerSession()` sur la Façade de commandes.
2. La Façade de commandes efface la clé dérivée et l'ensemble des credentials détenus côté cœur natif, puis pousse l'événement `verrouillageDeclenche` ; le Store d'état applicatif efface en miroir les credentials et toute donnée sensible détenue côté UI ([RG-004](./05_reglesGestion.md#stockage-et-confidentialité-des-données), [RG-005](./05_reglesGestion.md#stockage-et-confidentialité-des-données)).
3. Les Écrans et navigation superposent l'écran de Verrouillage à l'écran courant sans le démonter, afin de permettre une restauration immédiate au déverrouillage.
4. Au déverrouillage, l'utilisateur ressaisit le mot de passe du fichier ; la Façade de commandes délègue au Moteur de persistance la vérification (nouvelle dérivation de clé), puis l'UI redemande la ressaisie des credentials nécessaires.
5. Un nombre paramétrable d'échecs consécutifs de mot de passe ferme le fichier plutôt que de rester sur l'écran de verrouillage.

### Modifier un seuil ou un référentiel et requalifier l'historique ([US-033](./04_casUsage.md#cas-dusage--user-stories))

1. Depuis l'écran de Paramétrage, l'UI invoque `definirSeuil(clé, valeur)` ou `definirReferentiel(type, entrée)` sur la Façade de commandes.
2. La Façade de commandes délègue au Moteur de persistance : met à jour `parametres.seuils` ou la branche `referentiels` concernée, ajoute une EntréeJournal (valeur avant/après, origine), puis sauvegarde le fichier ([RG-023](./05_reglesGestion.md#seuils-référentiels-et-historisation)).
3. La Façade de commandes renvoie les référentiels/paramètres mis à jour à l'UI ; le Store d'état applicatif les remplace.
4. Sans nouvel audit, le Moteur de jugement recalcule immédiatement, côté UI, tous les statuts affichés sur l'historique déjà chargé en mémoire, à partir des constats bruts inchangés et des nouveaux seuils/référentiels ([RG-012](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-022](./05_reglesGestion.md#seuils-référentiels-et-historisation)).
5. Les écrans de restitution ouverts (Synthèse des audits, Synthèse graphique, Fiche projet) se mettent à jour de façon réactive, sans rechargement du fichier.

## Gestion des erreurs et cas limites au niveau technique

- **Écriture interrompue** : la sauvegarde écrit dans un fichier temporaire puis le renomme ; une interruption (coupure, processus tué) laisse le fichier original intact et un fichier temporaire orphelin, détecté et nettoyé au lancement suivant.
- **Dérivation de clé incompatible** : si les paramètres KDF de l'enveloppe ne correspondent à aucune version supportée, un repli PBKDF2-SHA256 est tenté (cf. [Specification.md, section 5.1](../01_besoin/Specification.md#51-f01--stockage-chiffré-local)) ; à défaut, le fichier est rejeté explicitement comme non lisible par cette version de l'application, sans tentative de correction automatique.
- **Délai réseau dépassé** : chaque appel de connecteur applique un délai configurable (`parametres.audit`) ; au-delà, une anomalie typée « délai dépassé » est levée pour ce projet/cette source, sans bloquer les autres tâches de la campagne (le slot de concurrence est immédiatement libéré).
- **Réponse HTTP inattendue** : une réponse ne correspondant pas au schéma attendu (ex. après une montée de version d'instance GitLab/Sonar) produit une anomalie typée « réponse inattendue », avec le message technique brut conservé pour diagnostic, sans interrompre la campagne.
- **Fichier de données verrouillé par un autre processus** au moment de la sauvegarde : message explicite à l'utilisateur, sauvegarde retentée ou annulée sur décision de l'utilisateur, sans perte des modifications en mémoire.
- **Horloge système incohérente** (date système antérieure à la dernière sauvegarde connue) : la migration de schéma ne s'appuie jamais sur `meta.modifieLe`, uniquement sur `versionSchema`, ce qui évite toute dépendance à l'horloge locale.
- **Recherche transversale invoquée avant la fin de la construction de l'index** : la recherche reste désactivée avec un indicateur de chargement explicite jusqu'à ce que l'index en mémoire soit prêt ([RNF-005](./07_exigencesNonFonctionnelles.md#performance)).
- **Annulation de campagne pendant un appel en vol** : l'appel en cours va à son terme (résultat conservé si succès), aucune nouvelle tâche n'est démarrée, les projets non encore traités passent en « ignoré » ([RG-018](./05_reglesGestion.md#audits-et-campagnes)).

## Matrice de traçabilité

| élément de conception | exigence associée |
|---|---|
| Cœur natif — Connecteur GitLab, Connecteur Sonar | [US-009](./04_casUsage.md#cas-dusage--user-stories), [RNF-004](./07_exigencesNonFonctionnelles.md#performance), [RNF-010](./07_exigencesNonFonctionnelles.md#disponibilité-et-tolérance-aux-pannes) |
| Cœur natif — Moteur de persistance | [US-001](./04_casUsage.md#cas-dusage--user-stories), [US-002](./04_casUsage.md#cas-dusage--user-stories), [RG-001](./05_reglesGestion.md#stockage-et-confidentialité-des-données), [RG-002](./05_reglesGestion.md#stockage-et-confidentialité-des-données), [RG-003](./05_reglesGestion.md#stockage-et-confidentialité-des-données), [RNF-012](./07_exigencesNonFonctionnelles.md#sécurité) |
| Cœur natif — Façade de commandes | Ensemble des US impliquant une écriture dans le fichier de données ou l'interrogation d'une source, [US-001](./04_casUsage.md#cas-dusage--user-stories) à [US-033](./04_casUsage.md#cas-dusage--user-stories) : à l'exclusion des cas d'usage strictement consultatifs, sans écriture dans le fichier de données ([US-015](./04_casUsage.md#cas-dusage--user-stories) à [US-018](./04_casUsage.md#cas-dusage--user-stories), [US-021](./04_casUsage.md#cas-dusage--user-stories), [US-027](./04_casUsage.md#cas-dusage--user-stories), [US-031](./04_casUsage.md#cas-dusage--user-stories), [US-032](./04_casUsage.md#cas-dusage--user-stories)) ; [US-019](./04_casUsage.md#cas-dusage--user-stories) (création d'une Annotation) et [US-020](./04_casUsage.md#cas-dusage--user-stories) (traitement d'une alerte) sont bien mutants et couverts par `creerAnnotation` et `qualifierAlerte` |
| UI — Connecteur croisé | [RG-013](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-016](./05_reglesGestion.md#constat-jugement-et-politique-ia) |
| UI — Orchestrateur de campagne | [US-009](./04_casUsage.md#cas-dusage--user-stories), [US-010](./04_casUsage.md#cas-dusage--user-stories), [US-011](./04_casUsage.md#cas-dusage--user-stories), [US-012](./04_casUsage.md#cas-dusage--user-stories), [RG-017](./05_reglesGestion.md#audits-et-campagnes), [RG-018](./05_reglesGestion.md#audits-et-campagnes) |
| UI — Moteur de jugement | [RG-011](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-012](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-013](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-016](./05_reglesGestion.md#constat-jugement-et-politique-ia) |
| UI — Écrans et navigation | [Arborescence des écrans, étape 5](./08_arborescenceNavigation.md#arborescence-des-écrans) |
| UI — Store d'état applicatif | [RG-004](./05_reglesGestion.md#stockage-et-confidentialité-des-données), [RG-005](./05_reglesGestion.md#stockage-et-confidentialité-des-données) |
| UI — Index de recherche transversale | [US-021](./04_casUsage.md#cas-dusage--user-stories), [RNF-005](./07_exigencesNonFonctionnelles.md#performance) |
| Séquence « Créer un nouveau fichier de données » | [US-001](./04_casUsage.md#cas-dusage--user-stories), [RG-001](./05_reglesGestion.md#stockage-et-confidentialité-des-données), [RG-002](./05_reglesGestion.md#stockage-et-confidentialité-des-données), [RG-003](./05_reglesGestion.md#stockage-et-confidentialité-des-données) |
| Séquence « Réaliser une campagne d'audit et intégrer les résultats » | [US-009](./04_casUsage.md#cas-dusage--user-stories), [US-010](./04_casUsage.md#cas-dusage--user-stories), [US-014](./04_casUsage.md#cas-dusage--user-stories), [RG-011](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-017](./05_reglesGestion.md#audits-et-campagnes), [RG-020](./05_reglesGestion.md#audits-et-campagnes) |
| Séquence « Qualifier un membre inconnu » | [US-022](./04_casUsage.md#cas-dusage--user-stories), [RG-006](./05_reglesGestion.md#membres-et-sécurité-des-accès), [RG-007](./05_reglesGestion.md#membres-et-sécurité-des-accès), [RG-008](./05_reglesGestion.md#membres-et-sécurité-des-accès), [RG-012](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-026](./05_reglesGestion.md#vues-alertes-export-et-import) |
| Séquence « Verrouiller et déverrouiller la session » | [US-026](./04_casUsage.md#cas-dusage--user-stories), [RG-004](./05_reglesGestion.md#stockage-et-confidentialité-des-données), [RG-005](./05_reglesGestion.md#stockage-et-confidentialité-des-données), [RNF-014](./07_exigencesNonFonctionnelles.md#sécurité) |
| Séquence « Modifier un seuil ou un référentiel et requalifier l'historique » | [US-033](./04_casUsage.md#cas-dusage--user-stories), [RG-012](./05_reglesGestion.md#constat-jugement-et-politique-ia), [RG-022](./05_reglesGestion.md#seuils-référentiels-et-historisation), [RG-023](./05_reglesGestion.md#seuils-référentiels-et-historisation) |
| Gestion des erreurs et cas limites (cas « annulation en vol », « recherche avant fin d'indexation ») | [RG-018](./05_reglesGestion.md#audits-et-campagnes), [RNF-005](./07_exigencesNonFonctionnelles.md#performance) |
