# Arborescence des écrans et navigation

## Sommaire

1. [Arborescence des écrans](#arborescence-des-écrans)
2. [Règles de navigation](#règles-de-navigation)
3. [Matrice écrans / user stories](#matrice-écrans--user-stories)

## Arborescence des écrans

```
Accueil (avant ouverture d'un fichier)
├── Créer un nouveau fichier de données → ouvre le shell applicatif sur Administration (première configuration)
└── Charger un fichier de données existant → ouvre le shell applicatif sur Liste de travail (si alertes non traitées) ou Synthèse des audits (sinon)

Shell applicatif (après ouverture d'un fichier — sidebar persistante + barre supérieure avec boutons Reculer/Avancer)
├── Administration
│   ├── Groupes (dont onglet Membres connus, Annotations de groupe)
│   ├── Projets (dont Politique IA)
│   └── Sources (dont ref auditée)
├── Audits
│   ├── Constitution de campagne
│   ├── Tableau de bord d'exécution
│   └── Brouillon (avec rapport d'anomalies)
├── Synthèse des audits
│   └── Fiche projet (accès par clic sur un projet)
│       └── Comparaison entre deux audits
├── Synthèse graphique
│   └── Fiche projet (accès par clic sur une série ou un point)
├── Obsolescence
│   └── Détail du dernier audit d'un projet (modale pilotée par un paramètre de requête de la route /obsolescence, accès par clic sur une tuile)
├── Liste de travail
│   └── Fiche projet (accès par clic sur une alerte)
├── Accueil (résumé depuis la dernière session)
├── Paramétrage
│   ├── Seuils et référentiels (dépendances, marqueurs IA, nommage des branches)
│   ├── Journal des modifications
│   ├── Purge des audits
│   ├── Export / Import de configuration
│   └── Vues enregistrées (administration centralisée : renommer, dupliquer, supprimer, définir par défaut)
├── Gestion des credentials (accessible depuis la barre supérieure et depuis Constitution de campagne ; inclut le test de connectivité globale comme zone du même écran, non un écran distinct)
└── Verrouillage (superposition plein écran, accessible depuis la barre supérieure ou déclenché automatiquement)

Composant transversal
└── Recherche transversale (superposition modale, raccourci clavier, accessible depuis tout écran du shell)
```

## Règles de navigation

- La sidebar (232px, cf. [maquette de référence](../01_besoin/Suivi%20Qualimetrie.dc.html)) reste visible en permanence dans le shell applicatif et matérialise l'écran actif ; elle donne accès direct, dans cet ordre fixe, à Administration, Audits, Synthèse des audits, Synthèse graphique, Obsolescence, Liste de travail, Accueil et Paramétrage. Cet ordre (révisé le 2026-08-08, [C11-03](../03_plan/plan_13_developpement.md#phase-11--journalisation-technique-et-confort-de-saisie-projets-sources)) reflète la séquence d'usage typique d'un utilisateur — constituer son périmètre (Administration) puis l'auditer (Audits) avant de consulter des résultats encore vides à la création du fichier — plutôt que l'ordre initial retenu à la Phase 6 (Accueil en tête) ; il reste unique et fixe, indépendant du contenu du fichier ouvert (piste alternative d'un ordre dynamique selon la présence d'un audit intégré écartée par arbitrage humain explicite, pour ne pas introduire de réordonnancement surprenant en cours de session).
- Dans l'arborescence ci-dessus, les éléments indentés sous Administration et Paramétrage sont des onglets d'un même écran (une seule ligne dans la matrice écrans / user stories ci-dessous) ; le test de connectivité globale, mentionné entre parenthèses sous Gestion des credentials, est une zone de ce même écran, ni un onglet ni un écran contextuel ; les éléments indentés sous Audits (Constitution de campagne, Tableau de bord d'exécution, Brouillon) sont trois écrans distincts, chacun recensé séparément dans cette matrice.
- La barre supérieure, commune à tous les écrans du shell, affiche le nom du fichier chargé, le statut de sauvegarde, et donne accès à la recherche transversale, à la gestion des credentials et au verrouillage manuel.
- Les écrans contextuels (Fiche projet, Comparaison entre deux audits) ne figurent pas dans la sidebar : ils s'ouvrent par navigation contextuelle (clic sur un projet, une alerte ou un point de graphique) et portent un bouton de retour explicite vers l'écran d'origine (Synthèse des audits, Synthèse graphique ou Liste de travail).
- Le passage à un écran contextuel n'interrompt pas une campagne d'audit en cours ; le tableau de bord d'exécution reste accessible et son état persiste en arrière-plan.
- L'entrée « Audits » de la sidebar ouvre par défaut Constitution de campagne ; elle ouvre le Tableau de bord d'exécution si une campagne est en cours (cf. règle précédente), ou l'écran de Brouillon si un brouillon reste à traiter (cf. règle suivante).
- La navigation vers Constitution de campagne est bloquée tant qu'un brouillon existant n'a pas été traité (cf. [RG-019](./05_reglesGestion.md#audits-et-campagnes)) : elle redirige automatiquement vers l'écran de Brouillon.
- La recherche transversale s'ouvre en superposition modale depuis n'importe quel écran du shell (raccourci clavier) et se ferme par la touche Échap ou par sélection d'un résultat, qui navigue alors vers la fiche concernée.
- Le verrouillage de session, automatique après le délai d'inactivité paramétrable ou déclenché manuellement, se superpose à l'écran courant en masquant toute donnée ; le déverrouillage restaure l'écran quitté.
- La barre supérieure porte, en tête, deux boutons Reculer (`◀`) et Avancer (`▶`) pilotant un historique de navigation interne (pile d'URLs applicatives et index courant, cf. [RG-052](./05_reglesGestion.md#navigation-transverse-et-filtrage-mutualisé)) : un déplacement dans l'historique ne crée pas de nouvelle entrée, une navigation normale depuis une position antérieure tronque la branche « avant », et chaque bouton est désactivé quand le déplacement correspondant est impossible. Cet historique est conservé au verrouillage et restauré au déverrouillage, purgé au changement de fichier de données. Les boutons « Retour » explicites des écrans contextuels (Fiche projet, Comparaison entre deux audits) restent inchangés et ne sont pas remplacés par le bouton Reculer.
- La modale de détail de l'écran Obsolescence est pilotée par un paramètre de requête de la route `/obsolescence` (l'écran reste monté sous la modale) : l'ouvrir ajoute une entrée d'historique, la fermer (bouton ou touche Échap) revient à l'état sans paramètre ; un paramètre désignant un projet supprimé depuis est ignoré, modale close. Les autres superpositions (recherche transversale, verrouillage, confirmations de mot de passe) restent des états internes non représentés dans l'URL.
- Le filtre par groupe et par projet des écrans de restitution (Synthèse des audits, Synthèse graphique, Obsolescence, Liste de travail) est porté par un composant mutualisé et un état de session partagé : la sélection suit l'utilisateur d'un écran à l'autre sans transiter par l'URL (cf. [RG-053](./05_reglesGestion.md#navigation-transverse-et-filtrage-mutualisé)) ; seuls les liens contextuels pré-filtrants portent des paramètres de requête explicites. Cet état de session suit le même cycle de vie que l'historique de navigation (conservé au verrouillage, purgé au changement de fichier).
- L'administration des vues enregistrées (renommer, dupliquer, supprimer, définir par défaut) est regroupée dans l'onglet « Vues enregistrées » de l'écran de Paramétrage ; le sélecteur de vue de chaque écran filtré porte un lien « Gérer les vues… » vers cet onglet, et l'onglet un lien « Ouvrir l'écran concerné » vers l'écran d'origine d'une vue.
- Aucune profondeur de navigation ne dépasse trois niveaux (écran de la sidebar → écran contextuel → sous-écran contextuel, ex. Fiche projet → Comparaison entre deux audits), afin de garder un retour toujours prévisible ; les liens contextuels ajoutés le 2026-08-30 (groupes 1.1, 1.2, 1.3 de [plan_16, Partie A](../03_plan/plan_16_navigationFiltrageEtVues.md#a4-liens-contextuels-retenus)) et le lien « Fiche projet → Obsolescence pré-filtrée sur le groupe » pointent tous vers des écrans de la sidebar ou des écrans contextuels déjà recensés, sans créer de quatrième niveau. Cette règle est revérifiée à chaque ajout de lien contextuel.

## Matrice écrans / user stories

| écran | cas d'usage / user story |
|---|---|
| Accueil | [US-001](./04_casUsage.md#cas-dusage--user-stories), [US-002](./04_casUsage.md#cas-dusage--user-stories), [US-005](./04_casUsage.md#cas-dusage--user-stories) |
| Gestion des credentials | [US-003](./04_casUsage.md#cas-dusage--user-stories), [US-004](./04_casUsage.md#cas-dusage--user-stories), [US-031](./04_casUsage.md#cas-dusage--user-stories) |
| Administration | [US-006](./04_casUsage.md#cas-dusage--user-stories), [US-007](./04_casUsage.md#cas-dusage--user-stories), [US-008](./04_casUsage.md#cas-dusage--user-stories), [US-023](./04_casUsage.md#cas-dusage--user-stories), [US-024](./04_casUsage.md#cas-dusage--user-stories) |
| Constitution de campagne | [US-009](./04_casUsage.md#cas-dusage--user-stories), [US-012](./04_casUsage.md#cas-dusage--user-stories) |
| Tableau de bord d'exécution | [US-010](./04_casUsage.md#cas-dusage--user-stories), [US-011](./04_casUsage.md#cas-dusage--user-stories) |
| Brouillon (et rapport d'anomalies) | [US-013](./04_casUsage.md#cas-dusage--user-stories), [US-014](./04_casUsage.md#cas-dusage--user-stories) |
| Synthèse des audits | [US-015](./04_casUsage.md#cas-dusage--user-stories), [US-032](./04_casUsage.md#cas-dusage--user-stories), [US-053](./04_casUsage.md#cas-dusage--user-stories) |
| Synthèse graphique | [US-016](./04_casUsage.md#cas-dusage--user-stories), [US-019](./04_casUsage.md#cas-dusage--user-stories), [US-032](./04_casUsage.md#cas-dusage--user-stories), [US-053](./04_casUsage.md#cas-dusage--user-stories) |
| Obsolescence | [US-050](./04_casUsage.md#cas-dusage--user-stories), [US-051](./04_casUsage.md#cas-dusage--user-stories), [US-053](./04_casUsage.md#cas-dusage--user-stories) |
| Fiche projet | [US-017](./04_casUsage.md#cas-dusage--user-stories), [US-022](./04_casUsage.md#cas-dusage--user-stories), [US-032](./04_casUsage.md#cas-dusage--user-stories) |
| Comparaison entre deux audits | [US-018](./04_casUsage.md#cas-dusage--user-stories), [US-032](./04_casUsage.md#cas-dusage--user-stories) |
| Liste de travail | [US-020](./04_casUsage.md#cas-dusage--user-stories), [US-028](./04_casUsage.md#cas-dusage--user-stories), [US-053](./04_casUsage.md#cas-dusage--user-stories) |
| Recherche transversale | [US-021](./04_casUsage.md#cas-dusage--user-stories) |
| Paramétrage | [US-025](./04_casUsage.md#cas-dusage--user-stories), [US-027](./04_casUsage.md#cas-dusage--user-stories), [US-028](./04_casUsage.md#cas-dusage--user-stories), [US-029](./04_casUsage.md#cas-dusage--user-stories), [US-030](./04_casUsage.md#cas-dusage--user-stories), [US-033](./04_casUsage.md#cas-dusage--user-stories), [US-034](./04_casUsage.md#cas-dusage--user-stories), [US-035](./04_casUsage.md#cas-dusage--user-stories), [US-036](./04_casUsage.md#cas-dusage--user-stories), [US-048](./04_casUsage.md#cas-dusage--user-stories), [US-049](./04_casUsage.md#cas-dusage--user-stories), [US-054](./04_casUsage.md#cas-dusage--user-stories) |
| Verrouillage | [US-026](./04_casUsage.md#cas-dusage--user-stories) |

[US-037](./04_casUsage.md#cas-dusage--user-stories) (adaptation de chaque écran à la largeur de fenêtre, cf. [RNF-030, RNF-031](./07_exigencesNonFonctionnelles.md#accessibilité)) n'apparaît volontairement dans aucune ligne ci-dessus : ce besoin est transversal à l'ensemble des vingt écrans du shell applicatif, et non propre à un écran particulier ; Paramétrage n'en a été que l'écran pilote lors de sa mise en œuvre (cf. [rapport de développement, Phase 10 incrément 10](../04_rapports/rapportDeDeveloppement.md#étape-10-incrément-10--rattrapage--bugs--c10-06-écran-paramétrage)).

[US-052](./04_casUsage.md#cas-dusage--user-stories) (historique Reculer/Avancer et liens contextuels entre écrans) n'apparaît lui aussi dans aucune ligne de cette matrice : les boutons Reculer/Avancer sont un composant transverse de la barre supérieure du shell (comme la recherche transversale), et les liens contextuels qu'il recense touchent des écrans déjà présents dans les lignes ci-dessus (Accueil, Synthèse graphique, Obsolescence, Fiche projet, Administration, Tableau de bord d'exécution, Brouillon, Constitution de campagne). La Synthèse des audits reste l'écran pilote de [US-053](./04_casUsage.md#cas-dusage--user-stories) lors de sa mise en œuvre.
