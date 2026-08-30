<!-- Document rédigé avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par docs/02_documentation/01_modalitesUsageEtConventions.md. Document de conception établi à partir d'une session d'arbitrage humain explicite (2026-08-30) ; il précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. -->

# Conception — Navigation transverse, filtrage groupe/projet mutualisé et administration des vues

## Sommaire

1. [Objet et statut du document](#objet-et-statut-du-document)
2. [Décisions actées lors de l'arbitrage du 2026-08-30](#décisions-actées-lors-de-larbitrage-du-2026-08-30)
3. [Périmètre et identifiants d'exigence proposés](#périmètre-et-identifiants-dexigence-proposés)
4. [Partie A — Historique de navigation et liens contextuels](#partie-a--historique-de-navigation-et-liens-contextuels)
5. [Partie B — Filtre groupe/projet mutualisé et persistant](#partie-b--filtre-groupeprojet-mutualisé-et-persistant)
6. [Partie C — Administration des vues enregistrées](#partie-c--administration-des-vues-enregistrées)
7. [Impacts sur le modèle de données et migration](#impacts-sur-le-modèle-de-données-et-migration)
8. [Impacts documentaires](#impacts-documentaires)
9. [Impacts sur les tests](#impacts-sur-les-tests)
10. [Découpage en incréments](#découpage-en-incréments)
11. [Décisions du second tour d'arbitrage (2026-08-30)](#décisions-du-second-tour-darbitrage-2026-08-30)
12. [Points restant ouverts](#points-restant-ouverts)

## Objet et statut du document

Ce document consolide, en un plan unique, trois besoins ajoutés au fil d'une discussion du 2026-08-30 : des liens de navigation contextuels entre écrans, des boutons Reculer et Avancer pilotant un historique de navigation, et un composant de filtrage par groupe et projet mutualisé entre écrans, doté d'un mécanisme d'enregistrement et d'administration des vues.

Il est établi selon la méthode du projet : l'arbitrage humain sur les options ouvertes précède la mise à jour des documents normatifs (`04_casUsage.md`, `05_reglesGestion.md`, `08_arborescenceNavigation.md`, `09_maquettes.md`, `12_modeleDonnees.md`, `16_normesTests.md`), elle-même préalable à tout développement. Aucun passage à l'étape suivante sans validation humaine explicite de l'étape précédente.

Le nom et l'emplacement de ce fichier restent à ajuster : les évolutions postérieures à la Phase 15 sont aujourd'hui tracées sous forme d'entrées « Étape N » du [rapport de développement](../04_rapports/rapportDeDeveloppement.md), et non de fichiers `plan_NN` distincts.

## Décisions actées lors de l'arbitrage du 2026-08-30

Historique de navigation.

- L'historique est conservé lors d'un verrouillage de session et restauré au déverrouillage ; il est purgé lors d'un changement de fichier de données.
- L'ouverture de la modale de détail de l'écran Obsolescence constitue une étape d'historique et modifie l'URL.
- Les boutons « Retour » explicites des écrans contextuels (Fiche projet, Comparaison entre deux audits) sont conservés tels quels, sans être remplacés par le nouveau bouton Reculer.

Filtre groupe/projet mutualisé.

- Sélectionner un groupe réinitialise (désélectionne) la sélection de projets et restreint la liste de projets proposée à ce groupe.
- Le composant mutualisé porte les seuls filtres de groupe et de projet ; il peut être complété, sous lui, par des filtres propres à l'écran (indicateur, date, bornes par catégorie). Une vue enregistrée ne mémorise que la sélection de groupe et de projets, jamais ces filtres complémentaires.
- Le texte de recherche libre reste exclu des vues enregistrées.
- Les vues enregistrées existantes sont migrées (montée de version), non ignorées.
- Le composant n'est pas monté sur les écrans de Paramétrage ni d'Administration.
- Le filtre partagé l'emporte pour groupe et projet dès que l'utilisateur l'a modifié pendant la session ; la vue par défaut d'un écran n'agit qu'à la première visite de cet écran dans la session, tant que le filtre partagé n'a pas été touché.
- Un lien contextuel portant des paramètres de requête explicites (ex. « Fiche projet → Obsolescence pré-filtrée sur le groupe ») écrase le filtre partagé et la vue par défaut.
- Le filtre partagé suit le même cycle de vie que l'historique de navigation : conservé au verrouillage, purgé au changement de fichier.

Administration des vues.

- Le renommage d'une vue est réservé au nouvel onglet « Vues enregistrées » de l'écran de Paramétrage.
- Une action « Dupliquer une vue » est retenue.
- `RG-027` et `US-028` sont amendées pour refléter le périmètre étendu et l'administration centralisée.

Liens contextuels retenus : les groupes 1.1 (écarts déjà documentés), 1.2 (sorties de l'écran Accueil) et 1.3 (parcours audit) décrits en [Partie A](#partie-a--historique-de-navigation-et-liens-contextuels). Le bandeau commun de bascule entre les trois écrans de synthèse (ancien groupe 1.4) n'est pas retenu : le filtre partagé rend la continuité entre ces écrans sans qu'un bandeau dédié soit nécessaire.

## Périmètre et identifiants d'exigence proposés

Derniers identifiants consommés à la date de rédaction : `US-051`, `RG-051`. Allocation proposée, à reconfirmer au moment de la qualification effective (une autre session peut avoir consommé des identifiants entre-temps).

| identifiant | intitulé | type |
|---|---|---|
| US-052 | Naviguer avec un historique Reculer/Avancer et des liens contextuels entre écrans | Consultation |
| US-053 | Filtrer par groupe et projet avec un composant mutualisé et un filtre conservé d'un écran à l'autre | Consultation |
| US-054 | Administrer les vues enregistrées (renommer, dupliquer, supprimer, définir par défaut) | Mutation |
| RG-052 | Historique de navigation interne (pile, portée, cycle de vie, modale Obsolescence comme étape) | — |
| RG-053 | Composant de filtrage groupe/projet mutualisé, filtre partagé entre écrans, priorité des sources et filtres complémentaires propres à l'écran | — |
| RG-054 | Administration centralisée des vues (onglet Paramétrage) et journalisation de toute mutation de vue | — |
| RG-027 (amendée) | Contenu d'une vue restreint à groupe et projet, périmètre étendu à Obsolescence, migration des vues | — |
| US-028 (amendée) | Administration centralisée des vues (renvoi vers US-054) | — |

Les trois nouvelles règles sont numérotées `RG-052`, `RG-053`, `RG-054`, sans trou. Les trois nouveaux cas d'usage sont numérotés `US-052`, `US-053`, `US-054`, sans trou. Ces numéros sont à revérifier disponibles au moment de la qualification (une autre session peut en avoir consommé entre-temps) ; le cas échéant, décaler l'ensemble en bloc sans réintroduire de trou.

## Partie A — Historique de navigation et liens contextuels

### A.1 Boutons Reculer et Avancer

Deux boutons, `◀` et `▶`, sont ajoutés en tête de la barre supérieure du shell ([shell.component.html](../../src/app/composants/shell/shell.component.html)), avant le nom de fichier. Chacun est désactivé (`disabled` et `aria-disabled`) quand le déplacement correspondant n'est pas possible.

L'implémentation repose sur un service avec état dédié, `HistoriqueNavigationService` ([src/app/services/avecetat/etat/](../../src/app/services/avecetat/etat/)), plutôt que sur `Location.back()` et `Location.forward()` de `@angular/common` : le navigateur n'expose pas si une navigation « avant » est possible, ce qui interdit de désactiver correctement le bouton Avancer, et son historique inclut des entrées hors application. Le service :

- s'abonne aux évènements `NavigationEnd` du `Router` ;
- maintient une pile ordonnée d'URLs internes et un index courant ;
- expose des signaux `peutReculer` et `peutAvancer`, et des méthodes `reculer()` et `avancer()` ;
- lors d'un `reculer()` ou `avancer()`, navigue via `router.navigateByUrl(url, { state: { deplacementHistorique: true } })` afin de ne pas empiler une nouvelle entrée ;
- tronque la branche « avant » de la pile dès qu'une navigation normale survient alors que l'index n'est pas en fin de pile (comportement standard d'un historique).

### A.2 Cycle de vie de l'historique (RG-052)

L'historique a une portée de session. Il est conservé lors d'un verrouillage et restauré au déverrouillage : le service ne réagit pas à `EtatFichier.Verrouille`. Il est vidé lors d'un changement de fichier de données (chargement d'un autre fichier, création, fermeture), sur le même déclencheur que la purge des credentials.

Les changements de filtres ne polluent pas l'historique : l'état du filtre groupe/projet est porté par un service ([Partie B](#partie-b--filtre-groupeprojet-mutualisé-et-persistant)), pas par l'URL. Seuls les liens contextuels explicites portent des paramètres de requête, et n'ajoutent qu'une entrée par navigation.

### A.3 Modale de l'écran Obsolescence pilotée par l'URL (RG-052)

Aujourd'hui, la modale de détail de l'écran Obsolescence est un état interne du composant ([obsolescence.component.ts](../../src/app/ecrans/obsolescence/obsolescence.component.ts), signal `projetSelectionne`). Elle devient pilotée par un paramètre de requête sur la route `/obsolescence` (par exemple `?projet=<projetId>`), plutôt que par une route enfant, afin de garder l'écran monté sous la modale :

- ouvrir la modale revient à naviguer vers `/obsolescence?projet=<id>` (nouvelle entrée d'historique) ;
- la fermer (bouton ou touche Échap) revient à `reculer()` ou à naviguer vers `/obsolescence` sans paramètre ;
- un paramètre `projet` inconnu (projet supprimé depuis) est ignoré sans erreur, modale close.

Ce changement ne concerne que cette modale. Les autres superpositions (recherche transversale, verrouillage, confirmations de mot de passe) restent des états internes non représentés dans l'URL.

### A.4 Liens contextuels retenus

Groupe 1.1 — écarts déjà prévus par [08_arborescenceNavigation.md](../02_documentation/08_arborescenceNavigation.md) mais absents du code.

| source | cible | mécanisme |
|---|---|---|
| Modale Obsolescence, nouveau lien « Ouvrir la fiche projet » (libellé mentionnant la date de l'audit retenu) | `/fiche-projet/:projetId` | `routerLink` dans le pied de la modale |
| Écran Synthèse graphique, clic sur une série ou un point | `/fiche-projet/:projetId` | navigation programmatique sur l'évènement de clic du graphique, sur le modèle de `SqmSyntheseAuditsComponent.activerLigne` |

Groupe 1.2 — l'écran Accueil n'a aujourd'hui aucune sortie de navigation.

| source | cible | mécanisme |
|---|---|---|
| Carte « Dernière campagne » | `/audits/tableau-de-bord` si une campagne est réellement en cours, sinon `/synthese-audits` | bouton, cible conditionnelle recalculée à l'activation (sur le modèle de l'entrée « Audits » de la sidebar) |
| Carte « Alertes actives » et titre de la section « Alertes principales » | `/liste-travail` | `routerLink` |
| Carte « Projets avec membre inconnu » | `/liste-travail` | `routerLink` |
| Section « Projets non audités depuis longtemps », chaque ligne | `/fiche-projet/:projetId` | activation de ligne, sur le modèle de la Synthèse des audits |
| Section « Alertes principales », chaque ligne | `/fiche-projet/:projetId` | activation de ligne (l'alerte porte déjà `projetId`) |

Groupe 1.3 — parcours d'audit.

| source | cible | mécanisme |
|---|---|---|
| Tableau de bord d'exécution, une fois la campagne terminée, nouveau lien « Voir les résultats intégrés » | `/synthese-audits`, ou `/audits/brouillon` si un brouillon subsiste | bouton, cible conditionnelle |
| Brouillon et rapport d'anomalies, chaque projet concerné par une anomalie | `/fiche-projet/:projetId` | activation de ligne |
| Constitution de campagne, nouveau lien « Ajuster le périmètre » | `/administration` | `routerLink`, à côté du lien « Traiter le brouillon » existant |

Lien complémentaire retenu (arbitrage du 2026-08-30) : « Fiche projet → Obsolescence pré-filtrée sur le groupe du projet », via des paramètres de requête consommés par le filtre mutualisé (cf. [B.4](#b4-priorité-entre-les-sources-du-filtre-rg-053)). Il relevait de l'ancien groupe 1.4, écarté par ailleurs, mais est confirmé pour lui-même.

## Partie B — Filtre groupe/projet mutualisé et persistant

### B.1 État actuel

Le mécanisme de vues enregistrées existe déjà ([selecteur-vue.component.ts](../../src/app/composants/selecteur-vue/selecteur-vue.component.ts), `US-028`, `RG-027`), monté sur trois écrans. Le filtrage par groupe est un `<select>` mono-valeur ré-implémenté dans chaque écran ; le filtrage par projet n'existe que sur la Synthèse graphique (multi-sélection). L'écran Obsolescence n'a pas de composant de vues. Chaque écran redéclare sa propre forme `FiltresXxx`, sa constante `VERSION_FILTRES_XXX`, son identifiant d'écran, son garde de type et la glue `appliquerVue` / `enregistrerVue` / `supprimerVue`.

### B.2 Composant `SqmFiltreGroupeProjetComponent` (RG-053)

Nouveau composant transverse dans [src/app/composants/](../../src/app/composants/), agnostique de l'écran appelant, sur le modèle de frontière déjà retenu par `selecteur-vue` (aucun import de `services/avecetat/`).

- Entrées : liste des groupes, liste des projets, état courant `groupeId: string | null` et `projetIds: readonly string[] | null` (`null` = tous).
- Rendu : un sélecteur de groupe (« Tous les groupes » plus une entrée par groupe) et un sélecteur multi-projets dont la liste est restreinte au groupe sélectionné (tous les projets si aucun groupe n'est sélectionné). Le composant héberge également le montage de `SqmSelecteurVueComponent` pour former une barre de filtres homogène sur les quatre écrans.
- Sorties : émission de l'état `{ groupeId, projetIds }` à chaque changement.
- Règle de couplage : tout changement de groupe vide la sélection de projets et recalcule la liste proposée.

Les filtres propres à l'écran (indicateur pour la Synthèse des audits et la Synthèse graphique, date et bornes par catégorie pour l'Obsolescence) restent gérés par l'écran et rendus sous la barre commune. Ils ne transitent pas par le composant mutualisé et ne sont pas mémorisés dans une vue. Le tri des tableaux reste non persisté, comme aujourd'hui : il n'entre ni dans une vue, ni dans le filtre partagé (arbitrage du 2026-08-30).

### B.3 Filtre partagé entre écrans : `ContexteConsultationService` (RG-053)

Nouveau service avec état ([src/app/services/avecetat/etat/](../../src/app/services/avecetat/etat/)) portant un signal `{ groupeId: string | null, projetIds: readonly string[] | null }` et un indicateur `filtreModifieParUtilisateur: boolean`.

- Chaque écran filtré lit l'état initial de son composant `SqmFiltreGroupeProjetComponent` depuis ce service, et y réécrit à chaque changement (qui positionne aussi `filtreModifieParUtilisateur` à `true`).
- En entrant sur un écran, le filtre groupe/projet est donc déjà positionné sur le dernier choix de l'utilisateur.
- Cycle de vie identique à l'historique de navigation : conservé au verrouillage, restauré au déverrouillage, remis à l'état initial (`null`, `null`, `false`) au changement de fichier.
- Non persisté dans le fichier de données : état de session uniquement, jamais écrit dans `parametres` ni ailleurs (arbitrage du 2026-08-30), cohérent avec l'absence de tout état d'interface transitoire persisté aujourd'hui.

### B.4 Priorité entre les sources du filtre (RG-053)

À l'entrée sur un écran filtré, l'état initial du filtre groupe/projet est déterminé dans cet ordre :

1. paramètres de requête explicites de l'URL (lien contextuel), s'ils sont présents : ils écrasent tout et repositionnent `ContexteConsultationService` ;
2. sinon, l'état courant de `ContexteConsultationService` si `filtreModifieParUtilisateur` vaut `true` (l'utilisateur a déjà fait un choix pendant la session, ce choix le suit) ;
3. sinon, la vue par défaut de l'écran (`parDefaut`), si elle existe : sa sélection groupe/projet seed `ContexteConsultationService` sans positionner `filtreModifieParUtilisateur` ;
4. sinon, « tous les groupes, tous les projets ».

Les filtres complémentaires propres à l'écran conservent leur comportement d'initialisation actuel (indicateur « tous », date du jour pour l'Obsolescence).

### B.5 Amendement de `RG-027`

Réécriture proposée : une vue enregistrée mémorise uniquement la sélection de groupe et de projets d'un écran, sous un nom réutilisable, avec possibilité de la définir comme vue par défaut de l'écran. Le périmètre est étendu à l'écran Obsolescence (quatre écrans : Synthèse des audits, Synthèse graphique, Obsolescence, Liste de travail). Les filtres complémentaires propres à un écran (indicateur, période, bornes par catégorie), le tri d'un tableau et le texte de recherche libre ne sont pas mémorisés. Les vues enregistrées dans une version antérieure du schéma sont migrées vers cette forme, non ignorées.

## Partie C — Administration des vues enregistrées

### C.1 Manques constatés

- Dans `selecteur-vue`, l'action « Mettre à jour » écrase toujours les filtres de la vue par ceux de l'écran courant : aucun renommage pur n'est possible.
- La suppression n'est possible que pour la vue actuellement sélectionnée sur l'écran courant.
- Aucune liste consolidée de toutes les vues ; aucune gestion des vues d'un écran sans s'y rendre.
- Le statut « par défaut » ne se règle qu'au moment de la création.

### C.2 Onglet « Vues enregistrées » de l'écran de Paramétrage (US-054)

Nouvel onglet `vuesEnregistrees` dans [parametrage.component.ts](../../src/app/ecrans/parametrage/parametrage.component.ts), sur le patron de coquille à onglets déjà en place.

- Tableau de toutes les entrées `vuesEnregistrees`, regroupées par écran, avec une table de libellés lisibles (`syntheseAudits` → « Synthèse des audits », etc.).
- Actions par ligne : renommer (nom seul, filtres inchangés), dupliquer (crée une copie « … (copie) » non par défaut), supprimer, définir ou retirer le statut de vue par défaut (exclusif par écran).
- Chaque mutation sauvegarde effectivement le fichier et redemande donc le mot de passe (`RG-002`), en réutilisant `SqmConfirmationMotDePasseComponent` et `SqmConfirmationSuppressionComponent` comme le fait déjà `selecteur-vue`.
- Aucune commande native nouvelle : le renommage est `DonneesApplicationService.definirVue(id, nouveauNom, ecran, versionFiltres, vue.parDefaut, vue.filtres, motDePasse)` ; la duplication est un `definirVue(undefined, …)` réutilisant `ecran`, `versionFiltres` et `filtres` de la source. La signature existante suffit (cf. [donnees-application.service.ts](../../src/app/services/avecetat/etat/donnees-application.service.ts)).
- Journalisation (`RG-054`, extension de `RG-023`) : toute mutation de vue — création, renommage, duplication, suppression, ajout ou retrait du statut par défaut — produit une entrée du journal des modifications, qu'elle provienne de l'onglet d'administration ou de `selecteur-vue`. Les commandes natives `persistance::vues::definir_vue` et `supprimer_vue` sont modifiées pour ajouter cette entrée avant sauvegarde, au même titre que les autres mutations de référentiels ; l'entrée porte le nom de la vue et l'écran concerné, jamais le contenu des filtres au-delà de ce que le journal consigne déjà pour les autres entités.
- La modification des filtres eux-mêmes reste sur l'écran d'origine (elle a besoin de sa barre de filtres) : l'onglet propose un lien « Ouvrir l'écran concerné », qui s'appuie sur les liens de navigation de la [Partie A](#partie-a--historique-de-navigation-et-liens-contextuels).
- `selecteur-vue` gagne un lien discret « Gérer les vues… » vers cet onglet. Le renommage en ligne n'est pas ajouté à `selecteur-vue` (réservé à l'onglet).

### C.3 Amendement de `US-028`

Le critère d'acceptation d'`US-028` est complété d'un renvoi à `US-054` pour l'administration centralisée (renommage, duplication, suppression et statut par défaut depuis l'écran de Paramétrage). Le comportement « un filtre disparu dans une version ultérieure du schéma est ignoré avec avertissement » est remplacé par « migré vers la forme courante » (cohérent avec l'amendement de `RG-027`).

## Impacts sur le modèle de données et migration

Le champ `VueEnregistrée.filtres` reste typé `unknown` côté cœur natif et n'est interprété que par l'interface. Après cette évolution, sa forme est uniforme pour tous les écrans : `{ groupeId: string | null, projetIds: string[] | null }`.

Migration proposée : un palier de schéma `9` → `10` (`VERSION_SCHEMA_COURANTE`, [racine.rs](../../src-tauri/src/modele/racine.rs)) qui, pour chaque entrée de `vuesEnregistrees` :

- réécrit `filtres` en `{ groupeId: <filtres.groupeId ou null>, projetIds: <filtres.projetIds ou null> }`, en abandonnant tout autre champ éventuellement présent (`indicateur` des vues Synthèse des audits notamment) ;
- fixe `versionFiltres` à `1` pour tous les écrans (forme désormais commune).

Cette transformation est générique : le cœur natif n'a pas besoin de connaître la forme de filtres de chaque écran, la cible étant identique pour tous. `VuesEnregistreesUtils.filtrerPourEcran` continue de filtrer par `ecran` et par `versionFiltres`, mais la valeur attendue devient une constante partagée unique.

Conséquence fonctionnelle assumée : une vue « Synthèse des audits » enregistrée avant cette évolution perd le filtre d'indicateur qu'elle portait ; elle conserve sa sélection de groupe. À signaler dans l'entrée de rapport de développement et dans la note de version.

`08_arborescenceNavigation.md` : ajout de la mention de la modale Obsolescence pilotée par l'URL et de l'onglet « Vues enregistrées » ; l'arborescence gagne les liens contextuels de la [Partie A](#partie-a--historique-de-navigation-et-liens-contextuels) ; la règle « aucune profondeur de navigation ne dépasse trois niveaux » est revérifiée (les nouveaux liens ne créent pas de quatrième niveau : ils pointent vers des écrans de la sidebar ou des écrans contextuels déjà recensés).

## Impacts documentaires

| document | nature de la mise à jour |
|---|---|
| `04_casUsage.md` | ajout de `US-052`, `US-053`, `US-054` (numérotation consécutive, sans trou) ; amendement du critère d'acceptation d'`US-028` |
| `05_reglesGestion.md` | ajout de `RG-052`, `RG-053`, `RG-054` (numérotation consécutive, sans trou) ; réécriture de `RG-027` ; extension du périmètre de `RG-023` (journal des modifications) aux mutations de vues ; mise à jour des lignes « périmètre » des écrans Synthèse des audits, Synthèse graphique, Obsolescence, Liste de travail et Paramétrage ; matrice RG × US |
| `08_arborescenceNavigation.md` | boutons Reculer/Avancer de la barre supérieure ; modale Obsolescence dans l'URL ; onglet « Vues enregistrées » ; liens contextuels ; revérification de la règle des trois niveaux |
| `09_maquettes.md` | barre de filtres commune décrite une fois puis référencée par les quatre écrans ; zone « Vues enregistrées » de Paramétrage ; boutons Reculer/Avancer |
| `12_modeleDonnees.md` | forme uniforme de `VueEnregistrée.filtres` ; palier de migration `9` → `10` ; `versionSchema` courant |
| `13_conceptionDetaillee.md` | `HistoriqueNavigationService`, `ContexteConsultationService`, `SqmFiltreGroupeProjetComponent` ajoutés à la couche interface ; modification des commandes natives `definir_vue` / `supprimer_vue` (journalisation, migration) |
| `16_normesTests.md` | stratégie de test du composant de filtrage mutualisé, du service d'historique, du service de contexte de consultation et de l'onglet d'administration des vues ; journalisation d'une entrée par mutation de vue ; mise à jour du parcours E2E unique |
| `.claude/rules/09-normes-developpement.md`, `11-normes-tests.md` | synchronisation si une règle synthétisée est touchée |

## Impacts sur les tests

Tests unitaires (Jest).

- `HistoriqueNavigationService` : empilement, troncature de la branche « avant », `peutReculer` / `peutAvancer`, absence d'empilement lors d'un déplacement d'historique, conservation au verrouillage, purge au changement de fichier.
- `ContexteConsultationService` : persistance entre écrans simulés, bascule de `filtreModifieParUtilisateur`, réinitialisation au changement de fichier.
- `SqmFiltreGroupeProjetComponent` : couplage groupe → réinitialisation des projets, restriction de la liste de projets, émissions.
- `VuesEnregistreesUtils` : filtrage par écran contre la constante de version unique désormais partagée ; `trouverVueParDefaut` inchangé. La migration des formes de filtres antérieures est faite côté cœur natif (palier `9` → `10`), pas ici.
- Onglet « Vues enregistrées » : renommage sans altération des filtres, duplication, suppression, exclusivité du statut par défaut, ressaisie du mot de passe pour chaque mutation, création d'une entrée de journal pour chaque mutation.
- Commandes natives `definir_vue` / `supprimer_vue` (`cargo test`) : entrée de journal ajoutée pour chaque mutation ; palier de migration `9` → `10` (round-trip, vue de forme antérieure, vue déjà à la forme cible).
- Suivi du nombre de méthodes jamais appelées pour les composants graphiques touchés (barre de filtres), conformément à la stratégie de couverture des composants de présentation.

Tests de bout en bout (Playwright, `ng serve`, façade bouchonnée).

- Le parcours unique est complété : application d'un filtre groupe/projet sur un écran puis vérification de sa conservation sur un autre écran ; enregistrement d'une vue puis rechargement ; usage des boutons Reculer/Avancer ; ouverture puis fermeture de la modale Obsolescence via l'URL et le bouton Reculer ; au moins un lien contextuel de chaque groupe (1.1, 1.2, 1.3).
- Le bouchon TypeScript de la façade doit exposer `definirVue` / `supprimerVue` avec le comportement de migration.

Tests de charge et de performance : la barre de filtres commune est incluse dans les mesures de rendu de la Synthèse des audits et de l'Obsolescence à l'échelle `RNF-006` ; aucun nouveau seuil.

## Découpage en incréments

Chaque incrément est développé par un Codeur puis relu par un Relecteur en contexte isolé, et validé explicitement par un humain avant l'incrément suivant.

1. Mise à jour documentaire : `04`, `05`, `08`, `09`, `12`, `16` selon le tableau ci-dessus, sans code. Point de validation humaine bloquant.
2. Socle du filtrage : `ContexteConsultationService`, `SqmFiltreGroupeProjetComponent`, migration de schéma `9` → `10` des vues, montage sur la Synthèse des audits comme écran pilote (retrait de son `<select>` de groupe ad hoc et du filtre d'indicateur des vues).
3. Généralisation du composant aux trois autres écrans (Synthèse graphique, Obsolescence, Liste de travail) ; retrait des `<select>` de groupe ad hoc et du filtre projet ad hoc de la Synthèse graphique ; montage du composant de vues sur l'Obsolescence.
4. Onglet « Vues enregistrées » de Paramétrage (renommer, dupliquer, supprimer, définir par défaut) ; lien « Gérer les vues… » depuis `selecteur-vue`.
5. `HistoriqueNavigationService` et boutons Reculer/Avancer du shell ; passage de la modale Obsolescence en paramètre de requête.
6. Liens contextuels du groupe 1.1.
7. Liens contextuels du groupe 1.2.
8. Liens contextuels du groupe 1.3.
9. Mise à jour du parcours E2E, mesures de charge sur les écrans touchés, relecture isolée finale et note de version.

L'ordre des incréments 5 à 8 est indépendant des incréments 2 à 4 et peut être réordonnancé.

## Décisions du second tour d'arbitrage (2026-08-30)

1. Le lien « Fiche projet → Obsolescence pré-filtrée sur le groupe » est confirmé (cf. [A.4](#a4-liens-contextuels-retenus)).
2. Numérotation sans trou : `US-052` / `US-053` / `US-054` et `RG-052` / `RG-053` / `RG-054`. À la qualification, si ces numéros sont déjà pris, décaler l'ensemble en bloc, toujours sans trou.
3. Le filtre groupe/projet n'est jamais persisté dans `parametres` : état de session uniquement.
4. Toute mutation de vue est journalisée (`RG-054`, extension de `RG-023`) : les commandes natives `definir_vue` / `supprimer_vue` sont adaptées en conséquence.
5. Le tri des tableaux reste non persisté (ni en vue, ni en filtre partagé).
6. Le présent document reste à sa place actuelle (`docs/03_plan/plan_16_navigationFiltrageEtVues.md`).
7. La forme des paramètres de requête (modale Obsolescence, liens pré-filtrants) est harmonisée avec ceux déjà utilisés par la Fiche projet (`queryParamsQualification`, `queryParamsReferentielDependance`) au moment de la conception détaillée de l'incrément concerné.

## Points restant ouverts

Aucun arbitrage fonctionnel ouvert. Restent des choix de conception détaillée, à trancher dans l'incrément concerné et sans nouvelle décision humaine : mécanisme exact de restauration de la pile d'historique après déverrouillage, nom précis des paramètres de requête, emplacement visuel exact des filtres complémentaires sous la barre commune.
