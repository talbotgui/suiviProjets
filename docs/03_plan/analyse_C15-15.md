# Analyse du point C15-15 — Export PNG de la Fiche projet : confirmation utilisateur et convention de nommage

Document généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par `.claude/rules/01-usage-ia-et-conventions.md`. Ce document constitue une analyse préparatoire en vue d'un arbitrage humain ; il ne tranche aucune question, ne modifie aucun document normatif existant et ne développe aucun code.

## Sommaire

1. [Rappel du point](#1-rappel-du-point)
2. [Analyse du comportement actuel](#2-analyse-du-comportement-actuel)
3. [Options de solution](#3-options-de-solution)
4. [Questions ouvertes nécessitant un arbitrage humain](#4-questions-ouvertes-nécessitant-un-arbitrage-humain)
5. [Proposition d'identifiants US/RG provisoires](#5-proposition-didentifiants-usrg-provisoires)

## 1. Rappel du point

Constat consigné dans `docs/03_plan/plan_13_developpement.md` (table des évolutions à qualifier, ligne C15-15) : « L'export PNG de la Fiche projet ne confirme aujourd'hui à l'utilisateur ni le nom ni l'emplacement du fichier réellement généré, et son nom ne semble pas systématiquement inclure le nom du projet. »

Analyse préliminaire déjà consignée dans le plan, à l'origine de la présente analyse approfondie : « Deux volets complémentaires, mineurs et autonomes : (a) un message de confirmation explicite (nom + répertoire), cohérent avec le service de notification centralisé déjà en place (R11-03) ; (b) une convention de nommage `fiche-projet-<nomProjet>-<date>.png`, à confirmer compatible avec les caractères spéciaux éventuels d'un nom de projet (échappement/normalisation à prévoir). »

Statut actuel dans le plan : « À qualifier (RG à préciser sur le retour utilisateur et la convention de nommage des exports) ».

## 2. Analyse du comportement actuel

### 2.1 Mécanisme d'export PNG en place

La fonctionnalité d'export PNG de la Fiche projet est implémentée dans `src/app/ecrans/fiche-projet/fiche-projet.component.ts`, méthode publique `exporterPng()` (lignes 574-581) appelant `declencherTelechargementPng()` (lignes 587-592). Le rendu de l'image repose sur la bibliothèque `html-to-image` (`toPng()`, importée ligne 31), qui convertit le conteneur DOM ciblé (`viewChild` `conteneurExport`, ligne 373) en une URL de données (`data:image/png;base64,...`), sans aucun appel réseau ni disque.

Ce même gabarit, à l'identique près du seul préfixe du nom de fichier, est strictement repris par trois autres écrans : `src/app/ecrans/synthese-audits/synthese-audits.component.ts` (préfixe `synthese-audits-`), `src/app/ecrans/synthese-graphique/synthese-graphique.component.ts` (préfixe `synthese-graphique-`) et `src/app/ecrans/comparaison-audits/comparaison-audits.component.ts`. Ce constat est confirmé par les commentaires d'en-tête de ces fichiers, qui documentent explicitement cette réutilisation stricte du même patron, ainsi que par le rapport de développement (`docs/04_rapports/rapportDeDeveloppement.md`, section relative à l'export PNG de la Comparaison entre deux audits, US-032), qui précise que les deux méthodes y sont « identiques au caractère près » à celles de la Synthèse graphique, à l'exception du préfixe.

Le constat C15-15 ne porte, dans son libellé, que sur la Fiche projet. Toute solution retenue devra donc préciser explicitement si son périmètre se limite à cet écran ou s'étend, par cohérence transverse, aux trois autres écrans partageant le même gabarit d'export (cf. section 4).

### 2.2 Convention de nommage actuelle

Lecture directe de `declencherTelechargementPng()` (`fiche-projet.component.ts`, ligne 590) :

```
lien.download = `fiche-projet-${new Date().toISOString().slice(0, 10)}.png`;
```

Le nom de fichier généré aujourd'hui est donc de la forme `fiche-projet-AAAA-MM-JJ.png` (date du jour au format ISO tronqué à la partie calendaire). Il ne contient, à ce jour, ni le nom du projet ni son identifiant technique, ni aucune heure. Le constat du plan (« son nom ne semble pas systématiquement inclure le nom du projet ») est donc confirmé et même renforcé par la lecture directe : le nom de projet n'est jamais inclus, pas seulement « pas systématiquement ». Le même schéma générique (préfixe d'écran + date, sans nom de projet ni de groupe) est repris à l'identique sur les trois autres écrans cités en 2.1.

La donnée nécessaire pour intégrer le nom du projet est déjà disponible dans le composant au moment de l'export : l'état de l'écran (`EtatFicheProjet`, variante `{ type: 'trouve', donnees: DonneesFicheProjet }`) porte un champ `nomProjet: string` (`DonneesFicheProjet`, ligne 237), déjà consommé par ailleurs dans le composant (fil d'ariane) et lu selon le même patron `const etatCourant = this.etat();` déjà utilisé à d'autres endroits du fichier (lignes 470, 547, 1468). Aucune nouvelle donnée ni aucun nouvel appel de commande n'est donc nécessaire pour disposer du nom du projet au moment de l'export.

### 2.3 Emplacement de sauvegarde

Le déclenchement du téléchargement (`declencherTelechargementPng`) repose exclusivement sur un élément `<a>` HTML créé dynamiquement, dont l'attribut `href` porte l'URL de données PNG et l'attribut `download` porte le nom de fichier suggéré, suivi d'un appel programmatique `lien.click()`. Ce mécanisme délègue entièrement à l'environnement d'exécution (moteur web du webview Tauri) la décision de l'emplacement d'enregistrement : aucun code applicatif ne reçoit en retour le chemin réel choisi, ni ne propose de dialogue de sélection d'emplacement.

Confirmation par recherche exhaustive : aucune occurrence de `@tauri-apps/plugin-fs`, d'API d'écriture de fichier binaire (`writeFile`, `writeBinaryFile`) côté Angular, ni de commande Rust dédiée à l'écriture d'un fichier PNG arbitraire, n'a été trouvée dans `src/app` ni `src-tauri/src`. Le fichier `src-tauri/capabilities/default.json` ne déclare aujourd'hui que trois permissions : `core:default`, `dialog:default`, `opener:default` — aucune permission de la famille `fs:*` n'est accordée à la fenêtre principale. L'export PNG ne peut donc, en l'état, ni écrire lui-même sur disque à un chemin choisi par l'utilisateur, ni interroger l'OS pour connaître le chemin réellement retenu par le mécanisme de téléchargement du navigateur/webview.

Ce point technique est déterminant pour les options du volet (a) : avec le mécanisme actuel, l'application ne peut confirmer avec certitude que le nom de fichier *suggéré* (qu'elle contrôle), jamais l'emplacement réellement retenu (que seul l'utilisateur ou la configuration du système contrôle, hors de portée de l'application).

### 2.4 Message de confirmation

Aucun appel à `NotificationService` (ni `succes()` ni `erreur()`) n'a été trouvé dans `exporterPng()` ni dans `declencherTelechargementPng()`, sur aucun des quatre écrans concernés. L'export PNG ne produit donc aujourd'hui strictement aucun retour utilisateur visible dans l'interface applicative après son déclenchement, hormis le comportement propre du navigateur/webview (le cas échéant, une notification de téléchargement gérée par l'OS, hors du contrôle et de la connaissance de l'application). Le constat du plan est donc également confirmé sur ce point par lecture directe : il n'existe aujourd'hui aucun message de confirmation, même partiel, côté application.

### 2.5 Service de notification centralisé (R11-03)

Le service `NotificationService` (`src/app/services/avecetat/etat/notification.service.ts`) expose une API minimale et déjà largement réutilisée dans l'application : `succes(message: string): void` (auto-disparition après 5 secondes) et `erreur(message: string): void` (auto-disparition après 8 secondes), toutes deux empilant une notification affichée par `SqmNotificationComponent`, monté une seule fois par le Shell. Le composant Fiche projet injecte déjà ce service (`this.notification`, utilisé par exemple ligne 566 pour signaler l'échec d'une suppression d'annotation) : sa réutilisation pour confirmer l'export PNG ne nécessite ni nouvelle abstraction ni nouveau composant, seulement un appel supplémentaire à `this.notification.succes(...)` avec un message construit dynamiquement. L'API ne porte aucune contrainte de format particulière (simple chaîne de caractères déjà mise en forme par l'appelant), ce qui laisse toute latitude pour y inclure nom de fichier et/ou chemin.

### 2.6 Précédent proche : export de la configuration partageable

Un précédent directement comparable existe déjà dans le code : `src/app/ecrans/parametrage/export-import/export-import-parametrage.component.ts`, méthode `exporter()` (lignes 92-108). Celle-ci ouvre la boîte de dialogue native de sélection d'emplacement via `SelecteurFichierUtils.choisirEmplacementCreation()` (point de passage unique déjà établi, `src/app/services/sansetat/commandes/selecteur-fichier.utils.ts`, introduit le 2026-07-28 pour l'écran de démarrage — US-001/US-002 — et déjà réemployé ici), avec un nom de fichier par défaut proposé (`NOM_FICHIER_EXPORT_PAR_DEFAUT = 'configuration-qualimetrie.json'`), puis confirme le succès par `this.notification.succes('La configuration a été exportée.')`.

Ce précédent apporte deux enseignements utiles à l'arbitrage. D'une part, il démontre qu'un mécanisme de sélection d'emplacement natif, conforme à la règle de sécurité imposant la boîte de dialogue native pour toute opération de fichier (`docs/02_documentation/15_normesSecurite.md#contrôle-des-entrées-et-sorties`), est déjà en place et directement réutilisable dans l'application, sans dépendance nouvelle. D'autre part, il montre que même ce précédent le plus proche ne confirme pas aujourd'hui le chemin choisi dans son message de succès (« La configuration a été exportée. », sans nom ni chemin), alors que la variable `chemin` est pourtant connue à cet endroit du code : la demande du constat C15-15 (confirmer nom et emplacement) irait donc, si elle est retenue à l'identique, au-delà de ce qui est fait aujourd'hui même sur l'écran le plus proche, et pourrait par cohérence être signalée comme amélioration possible de ce second écran — étendre ce point précis n'est cependant pas demandé par le constat C15-15, strictement circonscrit à l'export PNG de la Fiche projet, et n'est donc pas traité plus avant dans cette analyse.

## 3. Options de solution

### 3.1 Volet (a) — message de confirmation explicite

**Option A1 — Confirmation allégée, sans changement du mécanisme de téléchargement.**

Principe : conserver strictement le mécanisme actuel (ancre `<a download>`), et ajouter un appel `this.notification.succes(...)` immédiatement après `lien.click()`, avec un message mentionnant le nom de fichier réellement suggéré (connu du code, puisqu'il le construit) et une formulation générique sur l'emplacement, sans chemin absolu (par exemple : « L'image *fiche-projet-\<nomProjet\>-\<date\>.png* a été téléchargée dans le dossier de téléchargements de votre navigateur/système. »).

Avantages : risque et effort minimaux ; réutilisation stricte de l'API existante `NotificationService.succes()` sans aucune modification de signature ; aucun nouveau code Rust, aucune nouvelle dépendance, aucune nouvelle permission de capacité Tauri ; cohérent avec le patron déjà appliqué aux autres notifications de succès du composant.

Inconvénients : ne répond que partiellement au constat initial, qui demande explicitement la confirmation du nom *et* de l'emplacement réels. Avec le mécanisme d'ancre de téléchargement, l'application ne connaît jamais l'emplacement réellement retenu (paramétrable par l'utilisateur au niveau de son navigateur/système, totalement hors de portée de l'application), ni ne peut garantir l'absence de renommage automatique en cas de collision avec un fichier existant du même nom dans le dossier de téléchargement (comportement standard du navigateur, hors du contrôle applicatif). Le message resterait donc, par construction, imprécis sur l'emplacement — ce qui pourrait être jugé insuffisant au regard de la lettre du constat.

**Option A2 — Confirmation exacte via bascule vers la boîte de dialogue native.**

Principe : réutiliser le mécanisme déjà en place pour l'export de la configuration partageable (cf. 2.6), en ouvrant `SelecteurFichierUtils.choisirEmplacementCreation()` avant l'export, avec un nom de fichier par défaut construit selon la convention retenue au volet (b). Le chemin retourné (non nul, l'utilisateur n'ayant pas annulé) est alors directement exact et réutilisable tel quel dans le message de confirmation (par exemple : `` this.notification.succes(`Image exportée : ${chemin}`) ``), répondant intégralement et sans ambiguïté au constat initial.

Avantages : exactitude totale du message de confirmation (nom et emplacement réellement choisis par l'utilisateur, jamais supposés) ; cohérence renforcée avec la règle de sécurité imposant la boîte de dialogue native pour toute sélection de fichier ; l'utilisateur reprend la main sur le nom final proposé (peut le modifier dans la boîte de dialogue elle-même), ce qui couvre indirectement une partie des difficultés de normalisation du volet (b).

Inconvénients : modifie substantiellement le mécanisme d'export existant, aujourd'hui partagé à l'identique par les quatre écrans cités en 2.1. Elle suppose l'écriture réelle du fichier PNG sur le disque au chemin choisi, alors qu'aucun mécanisme d'écriture de fichier arbitraire n'existe aujourd'hui côté interface (seul le fichier de données chiffré est écrit, exclusivement via le cœur natif). Deux façons de réaliser cette écriture, chacune avec un impact propre :

- une nouvelle commande dédiée de la Façade de commandes (`src-tauri/src/commandes/`), recevant en paramètre le buffer PNG (obtenu côté Angular via `toBlob()` d'`html-to-image`, fonction déjà exportée par la bibliothèque bien que non utilisée aujourd'hui, plutôt que `toPng()`) et l'écrivant au chemin fourni : cohérent avec la frontière `services/sansetat/commandes/` déjà en place comme point de passage unique vers `invoke`, mais implique une nouvelle commande à journaliser systématiquement (début/fin d'exécution, conformément à la règle de journalisation en vigueur depuis le 2026-08-15) et à couvrir par des tests unitaires Rust dédiés ;
- l'ajout de la dépendance `@tauri-apps/plugin-fs` côté Angular, avec une nouvelle permission de capacité (de la famille `fs:*`) à ajouter explicitement à `src-tauri/capabilities/default.json`, qui n'en déclare aujourd'hui aucune : solution plus légère en code applicatif, mais introduisant une nouvelle dépendance non encore présente dans le projet et un nouvel écart possible avec la convention actuelle selon laquelle toute écriture sur disque transite par le cœur natif.

Cette option impose également de statuer sur le périmètre transverse (cf. section 4) : rester cohérente avec le gabarit d'export PNG strictement partagé aujourd'hui suppose de l'appliquer identiquement aux quatre écrans, ce qui alourdit d'autant l'effort par rapport au seul périmètre littéral du constat (Fiche projet).

### 3.2 Volet (b) — convention de nommage du fichier exporté

**Option B1 — Convention `fiche-projet-<nomProjet-normalisé>-<date>.png`, conforme à l'analyse préliminaire du plan.**

Principe : construire le nom de fichier à partir du nom du projet réellement affiché à l'écran (`DonneesFicheProjet.nomProjet`, disponible sans appel supplémentaire, cf. 2.2), après normalisation : suppression des diacritiques (un précédent existe déjà dans le code pour une autre finalité — l'indexation de recherche transversale, `src/app/services/avecetat/recherche/index-recherche.utils.ts`, ligne 333, `valeur.normalize('NFD')` puis filtrage des marques diacritiques), remplacement des caractères interdits ou déconseillés dans un nom de fichier multiplateforme (`/ \ : * ? " < > |`, espaces) par un séparateur neutre, réduction des séparateurs consécutifs, et éventuellement un plafond de longueur pour éviter un nom de fichier démesuré sur un système de fichiers contraint.

Avantages : répond exactement à la convention déjà esquissée dans le plan ; nom de fichier lisible et immédiatement reconnaissable par l'utilisateur parmi plusieurs exports téléchargés, ce qui est l'objet même du constat.

Inconvénients : nécessite l'écriture d'une fonction utilitaire de normalisation dédiée (aucune fonction de ce type, généraliste et destinée à un nom de fichier, n'existe aujourd'hui — le seul précédent trouvé, l'indexation de recherche, répond à un besoin différent, la comparaison insensible aux accents, non à la production d'un nom de fichier valide) ; risque de collision resituée mais non aggravée si deux projets partagent un nom identique ou normalisé identique (le comportement de renommage automatique en cas de collision reste, comme aujourd'hui, délégué au navigateur/webview avec le mécanisme d'ancre — cf. option A1 — ou à l'utilisateur via la boîte de dialogue s'il modifie le nom proposé — cf. option A2) ; se pose également la question du périmètre transverse aux trois autres écrans partageant le même gabarit d'export, alors que ceux-ci ne portent pas nécessairement un unique nom de projet clairement identifiable (la Synthèse des audits et la Synthèse graphique peuvent porter sur plusieurs projets/groupes filtrés simultanément, à la différence de la Fiche projet et, dans une moindre mesure, de la Comparaison entre deux audits qui compare précisément deux projets) — cette extension éventuelle sort du périmètre littéral du constat C15-15 et devrait être traitée comme une question de périmètre distincte plutôt que présumée.

**Option B2 — Convention `fiche-projet-<identifiant-technique-du-projet>-<date>.png`, sans normalisation de texte libre.**

Principe : utiliser, à la place du nom lisible du projet, son identifiant technique stable (`DonneesFicheProjet.projetId`, déjà disponible dans le même état de composant). Vérification par lecture directe du code de persistance (`src-tauri/src/persistance/alertes.rs`) : les identifiants d'entités de ce type sont générés par `uuid::Uuid::new_v4().to_string()`, produisant une chaîne composée exclusivement de chiffres hexadécimaux et de tirets — intrinsèquement valide comme fragment de nom de fichier sur tout système d'exploitation, sans aucune normalisation ni échappement à écrire.

Avantages : élimine entièrement la difficulté de normalisation des caractères spéciaux soulevée par le constat, sans risque de collision entre deux projets distincts (identifiant unique par construction) ; effort d'implémentation minimal (une seule interpolation de chaîne, aucune fonction utilitaire nouvelle).

Inconvénients : un identifiant UUID n'est pas lisible par un humain et ne permet pas à l'utilisateur de reconnaître le projet au seul examen du nom de fichier téléchargé, ce qui va à l'encontre de l'intention manifeste du constat initial (« son nom ne semble pas systématiquement inclure le nom du projet », qui vise implicitement un nom lisible, non un identifiant technique opaque). Cette option est présentée pour complétude et comme repli technique plus simple, mais paraît moins conforme à l'intention du constat que l'option B1.

## 4. Questions ouvertes nécessitant un arbitrage humain

1. Périmètre transverse : la correction doit-elle se limiter strictement à la Fiche projet (seul écran cité par le constat C15-15), ou s'étendre par cohérence aux trois autres écrans partageant à l'identique le même gabarit d'export PNG (Synthèse des audits, Synthèse graphique, Comparaison entre deux audits) ? Ce type de question de périmètre transverse a déjà été posé et tranché explicitement par l'utilisateur pour des constats similaires de cette même phase (C15-01, C15-02).
2. Volet (a) : le niveau d'exactitude attendu du message de confirmation justifie-t-il de faire évoluer le mécanisme d'export lui-même vers la boîte de dialogue native (option A2, avec écriture réelle du fichier sur disque et nouvelle permission de capacité Tauri), ou un message allégé mentionnant seulement le nom suggéré, sans emplacement précis, est-il jugé suffisant au regard de l'esprit du constat (option A1) ?
3. Si l'option A2 est retenue : l'écriture du fichier PNG doit-elle transiter par une nouvelle commande dédiée de la Façade de commandes côté cœur natif, ou par l'ajout de la dépendance `@tauri-apps/plugin-fs` côté Angular avec une nouvelle permission de capacité ? Ce choix engage une décision d'architecture (frontière `services/sansetat/commandes/`) qui dépasse le seul confort d'usage.
4. Si l'option A2 est retenue : que doit produire le bouton d'export en cas d'annulation de la boîte de dialogue par l'utilisateur (`chemin === null`) ? Absence silencieuse de toute action, comme pour l'export de configuration partageable (cf. 2.6), ou une notification neutre explicite ?
5. Volet (b) : la convention de nommage retenue (option B1 ou B2, ou une variante) doit-elle également inclure le nom du groupe de rattachement, disponible lui aussi dans l'état du composant (`DonneesFicheProjet.nomGroupe`), pour distinguer deux projets homonymes appartenant à des groupes différents ?
6. Volet (b), si l'option B1 est retenue : quelle règle de troncature exacte (longueur maximale) et quel caractère de repli pour un nom de projet entièrement composé de caractères hors alphabet latin ou de symboles, au-delà du seul cas des diacritiques déjà couvert par le précédent d'indexation de recherche cité en 3.2 ?
7. Le format de la date embarquée dans le nom de fichier reste-t-il la date seule (`AAAA-MM-JJ`, comme aujourd'hui), ou une évolution vers un horodatage complet est-elle souhaitée pour éviter l'écrasement silencieux d'un export précédent du même projet réalisé le même jour ? Cette question, non soulevée par le constat initial, est mise en évidence par l'analyse du mécanisme actuel (section 2.3) : le comportement en cas de collision de nom reste, avec l'option A1, hors du contrôle de l'application.

## 5. Proposition d'identifiants US/RG provisoires (mise à jour après arbitrage)

Arbitrage humain rendu le 2026-08-18 : périmètre **étendu aux quatre écrans** partageant le gabarit d'export PNG (Fiche projet, Synthèse des audits, Synthèse graphique, Comparaison d'audits) ; volet (a) traité par l'**option A1** (confirmation allégée, sans bascule vers la boîte de dialogue native) ; volet (b) traité par l'**option B1** (nom de projet normalisé), **sans nom de groupe**, avec une **longueur plafonnée** et un **horodatage complet** (au-delà de la seule date, pour éviter toute collision entre deux exports du même jour) ; pour la Synthèse des audits et la Synthèse graphique (pouvant porter sur plusieurs projets/groupes filtrés simultanément), le **préfixe générique actuel est conservé**, sans nom d'entité.

Numérotation coordonnée avec les cinq autres points `C15-NN` de cette même phase pour éviter toute collision d'identifiant (cf. `docs/03_plan/analyse_C15-10.md` à `analyse_C15-14.md`, qui consomment déjà `RG-042` à `RG-046` et `US-045`/`US-046` dans l'ordre de traitement retenu).

- **US-047** (provisoire) : export d'un écran en image, avec confirmation du nom de fichier suggéré, couvrant les quatre écrans concernés.
- **RG-047** (provisoire) : règle de gestion précisant la convention de nommage retenue (nom de projet normalisé et tronqué, sans nom de groupe, horodatage complet, préfixe générique conservé pour les écrans multi-projets) et le contenu du message de confirmation allégé (volet a).

Si le périmètre étendu aux trois autres écrans le confirme, la qualification documentaire devra mettre à jour les cas d'usage existants de ces écrans plutôt que de créer un nouveau cas d'usage isolé pour chacun, par cohérence avec la pratique déjà observée pour des extensions transverses similaires de cette même phase (C15-01, C15-02).

Cette numérotation reste une proposition provisoire à confirmer au moment de la qualification documentaire effective.
