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

Shell applicatif (après ouverture d'un fichier — sidebar persistante + barre supérieure)
├── Accueil (résumé depuis la dernière session)
├── Synthèse des audits
│   └── Fiche projet (accès par clic sur un projet)
│       └── Comparaison entre deux audits
├── Synthèse graphique
│   └── Fiche projet (accès par clic sur une série ou un point)
├── Liste de travail
│   └── Fiche projet (accès par clic sur une alerte)
├── Audits
│   ├── Constitution de campagne
│   ├── Tableau de bord d'exécution
│   └── Brouillon (avec rapport d'anomalies)
├── Administration
│   ├── Groupes (dont onglet Membres connus, Annotations de groupe)
│   ├── Projets (dont Politique IA)
│   └── Sources (dont ref auditée)
├── Paramétrage
│   ├── Seuils et référentiels (dépendances, marqueurs IA, nommage des branches)
│   ├── Journal des modifications
│   ├── Purge des audits
│   └── Export / Import de configuration
├── Gestion des credentials (accessible depuis la barre supérieure et depuis Constitution de campagne ; inclut le test de connectivité globale comme zone du même écran, non un écran distinct)
└── Verrouillage (superposition plein écran, accessible depuis la barre supérieure ou déclenché automatiquement)

Composant transversal
└── Recherche transversale (superposition modale, raccourci clavier, accessible depuis tout écran du shell)
```

## Règles de navigation

- La sidebar (232px, cf. [maquette de référence](../01_besoin/Suivi%20Qualimetrie.dc.html)) reste visible en permanence dans le shell applicatif et matérialise l'écran actif ; elle donne accès direct à Accueil, Synthèse des audits, Synthèse graphique, Liste de travail, Audits, Administration et Paramétrage.
- Dans l'arborescence ci-dessus, les éléments indentés sous Administration et Paramétrage sont des onglets d'un même écran (une seule ligne dans la matrice écrans / user stories ci-dessous) ; le test de connectivité globale, mentionné entre parenthèses sous Gestion des credentials, est une zone de ce même écran, ni un onglet ni un écran contextuel ; les éléments indentés sous Audits (Constitution de campagne, Tableau de bord d'exécution, Brouillon) sont trois écrans distincts, chacun recensé séparément dans cette matrice.
- La barre supérieure, commune à tous les écrans du shell, affiche le nom du fichier chargé, le statut de sauvegarde, et donne accès à la recherche transversale, à la gestion des credentials et au verrouillage manuel.
- Les écrans contextuels (Fiche projet, Comparaison entre deux audits) ne figurent pas dans la sidebar : ils s'ouvrent par navigation contextuelle (clic sur un projet, une alerte ou un point de graphique) et portent un bouton de retour explicite vers l'écran d'origine (Synthèse des audits, Synthèse graphique ou Liste de travail).
- Le passage à un écran contextuel n'interrompt pas une campagne d'audit en cours ; le tableau de bord d'exécution reste accessible et son état persiste en arrière-plan.
- L'entrée « Audits » de la sidebar ouvre par défaut Constitution de campagne ; elle ouvre le Tableau de bord d'exécution si une campagne est en cours (cf. règle précédente), ou l'écran de Brouillon si un brouillon reste à traiter (cf. règle suivante).
- La navigation vers Constitution de campagne est bloquée tant qu'un brouillon existant n'a pas été traité (cf. [RG-019](./05_reglesGestion.md#audits-et-campagnes)) : elle redirige automatiquement vers l'écran de Brouillon.
- La recherche transversale s'ouvre en superposition modale depuis n'importe quel écran du shell (raccourci clavier) et se ferme par la touche Échap ou par sélection d'un résultat, qui navigue alors vers la fiche concernée.
- Le verrouillage de session, automatique après le délai d'inactivité paramétrable ou déclenché manuellement, se superpose à l'écran courant en masquant toute donnée ; le déverrouillage restaure l'écran quitté.
- Aucune profondeur de navigation ne dépasse trois niveaux (écran de la sidebar → écran contextuel → sous-écran contextuel, ex. Fiche projet → Comparaison entre deux audits), afin de garder un retour toujours prévisible.

## Matrice écrans / user stories

| écran | cas d'usage / user story |
|---|---|
| Accueil | [US-001](./04_casUsage.md#cas-dusage--user-stories), [US-002](./04_casUsage.md#cas-dusage--user-stories), [US-005](./04_casUsage.md#cas-dusage--user-stories) |
| Gestion des credentials | [US-003](./04_casUsage.md#cas-dusage--user-stories), [US-004](./04_casUsage.md#cas-dusage--user-stories), [US-031](./04_casUsage.md#cas-dusage--user-stories) |
| Administration | [US-006](./04_casUsage.md#cas-dusage--user-stories), [US-007](./04_casUsage.md#cas-dusage--user-stories), [US-008](./04_casUsage.md#cas-dusage--user-stories), [US-023](./04_casUsage.md#cas-dusage--user-stories), [US-024](./04_casUsage.md#cas-dusage--user-stories) |
| Constitution de campagne | [US-009](./04_casUsage.md#cas-dusage--user-stories), [US-012](./04_casUsage.md#cas-dusage--user-stories) |
| Tableau de bord d'exécution | [US-010](./04_casUsage.md#cas-dusage--user-stories), [US-011](./04_casUsage.md#cas-dusage--user-stories) |
| Brouillon (et rapport d'anomalies) | [US-013](./04_casUsage.md#cas-dusage--user-stories), [US-014](./04_casUsage.md#cas-dusage--user-stories) |
| Synthèse des audits | [US-015](./04_casUsage.md#cas-dusage--user-stories), [US-032](./04_casUsage.md#cas-dusage--user-stories) |
| Synthèse graphique | [US-016](./04_casUsage.md#cas-dusage--user-stories), [US-019](./04_casUsage.md#cas-dusage--user-stories), [US-032](./04_casUsage.md#cas-dusage--user-stories) |
| Fiche projet | [US-017](./04_casUsage.md#cas-dusage--user-stories), [US-022](./04_casUsage.md#cas-dusage--user-stories), [US-032](./04_casUsage.md#cas-dusage--user-stories) |
| Comparaison entre deux audits | [US-018](./04_casUsage.md#cas-dusage--user-stories), [US-032](./04_casUsage.md#cas-dusage--user-stories) |
| Liste de travail | [US-020](./04_casUsage.md#cas-dusage--user-stories), [US-028](./04_casUsage.md#cas-dusage--user-stories) |
| Recherche transversale | [US-021](./04_casUsage.md#cas-dusage--user-stories) |
| Paramétrage | [US-025](./04_casUsage.md#cas-dusage--user-stories), [US-027](./04_casUsage.md#cas-dusage--user-stories), [US-028](./04_casUsage.md#cas-dusage--user-stories), [US-029](./04_casUsage.md#cas-dusage--user-stories), [US-030](./04_casUsage.md#cas-dusage--user-stories), [US-033](./04_casUsage.md#cas-dusage--user-stories) |
| Verrouillage | [US-026](./04_casUsage.md#cas-dusage--user-stories) |
