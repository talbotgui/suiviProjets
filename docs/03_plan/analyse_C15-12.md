# Analyse du point C15-12 — Borne de repli par défaut pour une règle de dépendances

Document généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par [`.claude/rules/01-usage-ia-et-conventions.md`](../../.claude/rules/01-usage-ia-et-conventions.md). Analyse préparatoire au seul usage d'une session d'arbitrage humain à venir : aucune décision n'est tranchée ici, aucun développement n'est réalisé, aucun document normatif existant (`04_casUsage.md`, `05_reglesGestion.md`, `07_exigencesNonFonctionnelles.md`, `plan_13_developpement.md`) n'est modifié par ce document.

## Sommaire

- [1. Rappel du point](#1-rappel-du-point)
- [2. Analyse](#2-analyse)
  - [2.1. Comportement réel du Moteur de jugement en l'absence de borne correspondante](#21-comportement-réel-du-moteur-de-jugement-en-labsence-de-borne-correspondante)
  - [2.2. Contrainte d'ordre de déclaration des bornes](#22-contrainte-dordre-de-déclaration-des-bornes)
  - [2.3. État réel du formulaire unitaire aujourd'hui](#23-état-réel-du-formulaire-unitaire-aujourdhui)
  - [2.4. Vérification de la non-duplication avec C15-07](#24-vérification-de-la-non-duplication-avec-c15-07)
  - [2.5. Périmètre exact du point (formulaire unitaire, pas la saisie en masse)](#25-périmètre-exact-du-point-formulaire-unitaire-pas-la-saisie-en-masse)
- [3. Options de solution](#3-options-de-solution)
  - [3.1. Option A — Borne de repli injectée automatiquement dans le formulaire unitaire](#31-option-a--borne-de-repli-injectée-automatiquement-dans-le-formulaire-unitaire)
  - [3.2. Option B — Affordance explicite, sans injection automatique](#32-option-b--affordance-explicite-sans-injection-automatique)
  - [3.3. Option C — Statut par défaut calculé côté Moteur de jugement, sans borne persistée](#33-option-c--statut-par-défaut-calculé-côté-moteur-de-jugement-sans-borne-persistée)
- [4. Questions ouvertes nécessitant un arbitrage humain](#4-questions-ouvertes-nécessitant-un-arbitrage-humain)
- [5. Propositions d'identifiants US/RG provisoires](#5-propositions-didentifiants-usrg-provisoires)

## 1. Rappel du point

Constat consigné dans [`plan_13_developpement.md`](./plan_13_developpement.md) (table des points de recette de la Phase 15, ligne `C15-12`) : « À la création d'une règle de dépendance, pré-remplie ou saisie librement, aucune borne de repli n'est proposée par défaut pour couvrir les versions ne correspondant à aucun motif plus spécifique déjà défini. »

Analyse préliminaire déjà consignée dans le plan : « Valeur par défaut business du même type que les décisions arbitraires déjà documentées pour d'autres seuils (cf. nombre de sauvegardes de sécurité, `09-normes-developpement.md`) : à confirmer que « *=obsolete » est la sémantique voulue dans tous les cas, y compris pour un formulaire pré-rempli où une ligne « *=obsolete » figure potentiellement déjà (cf. C15-07), pour éviter un doublon de cette ligne de repli. »

Statut actuel dans le plan : « À qualifier (RG à mettre à jour, vérifier la non-duplication avec C15-07) ».

## 2. Analyse

### 2.1. Comportement réel du Moteur de jugement en l'absence de borne correspondante

Lecture directe de `src/app/services/sansetat/jugement/statut-obsolescence.utils.ts` (`StatutObsolescenceUtils.calculerStatutObsolescence`, lignes 29 à 46) : le calcul retient la première règle du référentiel dont le motif (glob) correspond à la référence constatée, puis, au sein de cette règle, la première borne de version dont le motif (glob) correspond à la version constatée.

Le commentaire de cette méthode documente explicitement une décision arbitraire déjà validée par un humain lors de son développement initial : « ni l'absence de règle correspondant à la référence, ni la correspondance d'une règle sans qu'aucune de ses bornes de version ne corresponde à la version constatée, ne produisent de statut d'obsolescence par défaut (ni `obsolete` ni `maintenu` ne sont supposés sans base normative, cf. consigne explicite de cet incrément) : les deux cas sont restitués identiquement par le type `nonReference` ». Ce comportement est donc réel, volontaire, et déjà couvert par les tests unitaires du module (`statut-obsolescence.utils.spec.ts`).

Autrement dit, aujourd'hui, une dépendance dont la référence correspond à une règle existante mais dont aucune borne de version ne correspond à la version constatée est traitée exactement comme une dépendance ne correspondant à aucune règle du tout : statut `nonReference`, jamais `obsolete` par défaut. C15-12 propose de faire évoluer ce point précis (la seconde branche : règle trouvée, borne non trouvée), sans toucher à la première (absence totale de règle correspondant à la référence), qui reste hors périmètre du constat tel que formulé (« couvrir les versions ne correspondant à aucun motif plus spécifique déjà défini » vise les bornes de version d'une règle déjà identifiée, pas l'absence de règle elle-même).

### 2.2. Contrainte d'ordre de déclaration des bornes

Lecture directe de `src/app/services/sansetat/jugement/parametres-jugement.utils.ts` (interface `RegleDependance`, ligne 636) : le tableau `versions` est documenté et implémenté comme évalué « dans l'ordre déclaré, la première correspondance l'emportant » — un `Array.prototype.find` par ordre d'index, non un choix de la borne la plus spécifique. `correspondMotifGlob` (lignes 499 à 505) traduit un motif glob en expression régulière ancrée ; un motif `*` seul correspond donc à n'importe quelle chaîne.

Conséquence technique directe et vérifiable : une borne de repli de motif `*` doit impérativement occuper la **dernière** position du tableau `versions` d'une règle, faute de quoi elle intercepterait toute correspondance avant même que les bornes plus spécifiques déclarées après elle ne soient évaluées. Toute solution retenue pour C15-12 doit donc soit garantir cette position par construction (ligne ajoutée en fin de zone de texte, jamais en tête), soit avertir explicitement l'utilisateur du risque en cas de saisie libre d'une borne `*` qui ne serait pas en dernière position.

### 2.3. État réel du formulaire unitaire aujourd'hui

Lecture directe de `src/app/ecrans/parametrage/referentiels/referentiels-parametrage.component.ts` :

- Création libre (`ouvrirCreationDependance`, lignes 221 à 228) : `motifDependance` et `versionsDependanceTexte` sont réinitialisés à une chaîne vide (`''`). Aucune borne, de repli ou autre, n'est pré-remplie.
- Édition d'une règle existante (`ouvrirEditionDependance`, lignes 234 à 247) : `versionsDependanceTexte` est reconstruit strictement à partir des bornes déjà persistées de la règle (`regle.versions.map(...)`). Aucune borne n'est ajoutée qui ne soit déjà présente en base.
- Pré-remplissage depuis le lien contextuel « Créer une règle » de la Fiche projet (constructeur, effet des lignes 147 à 161, alimenté par les entrées `motifPreselectionne`/`versionPreselectionnee`) : `versionsDependanceTexte` est initialisé à `` `${versionCible}=` `` — une unique ligne portant le motif de version exact de la dépendance non référencée à l'origine du clic, avec un statut vide laissé à la charge de l'utilisateur. Aucune ligne `*=...` supplémentaire n'est ajoutée par ce mécanisme.

Le constat initial de C15-12 est donc confirmé par lecture directe : dans les trois cas d'entrée du formulaire unitaire, aucune borne de repli n'est aujourd'hui proposée, ni par défaut ni même comme suggestion optionnelle.

### 2.4. Vérification de la non-duplication avec C15-07

C15-07 (saisie en masse de règles de dépendances, `US-043`/`RG-040`) est développé et **Fait**. Lecture directe de `src/app/services/sansetat/jugement/saisie-masse-dependances.utils.ts` : la classe `SaisieMasseDependancesUtils` est une logique pure de *parsing*, validation et regroupement du texte effectivement saisi par l'utilisateur ; elle ne génère elle-même aucune ligne, encore moins une ligne de repli `*=obsolete`.

Lecture directe de `src/app/ecrans/fiche-projet/fiche-projet.component.ts` (`texteInitialSaisieMasseDependances`, lignes 1244 à 1252) : le pré-remplissage de la modale de saisie en masse produit une ligne par couple (référence, version) distinct parmi les dépendances « non référencé » du projet, au format `motif;motifVersion=` — statut laissé vide, sans aucune ligne de repli ajoutée.

La seule occurrence du texte `*=obsolete` dans le dépôt se trouve dans `saisie-masse-dependances.utils.spec.ts`, comme exemple de donnée de test représentant une ligne que l'utilisateur *pourrait* saisir lui-même (ex. `moment;*=obsolete`), jamais comme sortie générée par le code de production.

Conclusion vérifiée : à ce jour, aucun doublon automatique ne peut se produire, puisqu'aucun des deux parcours (formulaire unitaire, saisie en masse C15-07) n'injecte de ligne de repli. Le risque de doublon évoqué par l'analyse préliminaire du plan n'est donc pas un risque déjà matérialisé dans le code existant, mais un risque **prospectif**, qui ne se poserait que si une future implémentation de C15-12 étendait par erreur l'injection automatique d'une borne de repli au-delà du seul formulaire unitaire visé par le constat — en particulier si elle touchait aussi le pré-remplissage de la modale de saisie en masse (C15-07), où une ligne de repli pourrait alors coexister avec une ligne de repli identique éventuellement tapée à la main par l'utilisateur pour le même motif regroupé. Ce risque reste donc entièrement maîtrisable par un simple choix de périmètre lors de la qualification (cf. section 4).

### 2.5. Périmètre exact du point (formulaire unitaire, pas la saisie en masse)

Le libellé du constat (« pré-remplie ou saisie librement ») désigne les deux modes d'ouverture déjà identifiés en 2.3 pour le seul formulaire unitaire de `SqmReferentielsParametrageComponent` : pré-remplissage depuis le lien contextuel de la Fiche projet, ou ouverture libre depuis l'écran de Paramétrage. Il ne vise pas la modale de saisie en masse (C15-07), fonctionnalité distincte, déjà qualifiée et développée séparément, avec sa propre règle de gestion (`RG-040`) qui ne mentionne aucune borne de repli. Une extension du périmètre de C15-12 à la saisie en masse reste possible mais doit être une décision explicite de l'arbitrage, pas une extension silencieuse au moment du développement.

## 3. Options de solution

### 3.1. Option A — Borne de repli injectée automatiquement dans le formulaire unitaire

**Principe.** À l'ouverture du formulaire de création d'une nouvelle règle (libre ou pré-remplie), le composant ajoute automatiquement, en dernière ligne de `versionsDependanceTexte`, une borne `*=<valeurParDefaut>` (ex. `*=obsolete`), affichée et modifiable/supprimable comme n'importe quelle autre ligne avant validation. En édition d'une règle déjà existante, la borne n'est injectée que si aucune borne `*` n'est déjà présente dans les bornes persistées, pour ne jamais dupliquer une borne de repli déjà explicitement saisie par un développement antérieur ou une intervention manuelle.

**Avantages.** Réduit l'oubli le plus fréquent constaté en recette (une règle limitée à quelques motifs de version spécifiques, sans filet pour le reste) ; cohérent avec l'esprit d'une aide à la saisie déjà pratiqué ailleurs dans l'application (pré-remplissage du motif/de la version depuis la Fiche projet) ; reste réversible, l'utilisateur pouvant supprimer la ligne avant d'enregistrer.

**Inconvénients.** Introduit une valeur métier par défaut non couverte par un texte normatif existant (même famille de décision arbitraire que le nombre de sauvegardes de sécurité, cf. `09-normes-developpement.md`) : le statut `obsolete` n'a, comme le documente déjà C15-11 volet (a), aucun statut privilégié au sens du code — c'est une chaîne libre parmi d'autres, seules quatre valeurs bénéficiant d'un rendu visuel dédié. Choisir `obsolete` par défaut revient à présumer une intention (« tout ce qui n'est pas explicitement couvert est considéré comme obsolète ») qui n'est écrite nulle part dans `05_reglesGestion.md`. Risque d'confusion si l'utilisateur ne remarque pas la ligne pré-ajoutée et enregistre une règle plus permissive qu'il ne le pensait. Nécessite une règle de non-duplication explicite lors de l'édition (cf. principe ci-dessus), qui doit elle-même être testée soigneusement (présence d'une borne `*` avec un statut différent de la valeur par défaut : faut-il quand même s'abstenir d'injecter, ou considérer que seul le motif `*` compte indépendamment du statut associé ?).

**Impact code.** `referentiels-parametrage.component.ts` : modification de `ouvrirCreationDependance` (ajout inconditionnel) et de l'effet de pré-remplissage (lignes 147-161, ajout après la borne pré-remplie éventuelle) ; ajout d'une vérification de présence d'une borne `*` dans `ouvrirEditionDependance` avant toute injection. Ajout d'une constante de statut par défaut (probablement dans `referentiels-parametrage.component.ts` lui-même, à l'image des autres valeurs par défaut arbitraires déjà documentées en commentaire de fichier dans ce projet). Aucun impact sur `StatutObsolescenceUtils` ni sur le cœur natif Rust : la donnée reste une borne de version ordinaire, structurellement identique à toute autre borne saisie manuellement.

**Impact documentation.** Mise à jour de `RG-022` ou ajout d'une règle dédiée pour documenter la valeur par défaut proposée et le principe de non-duplication à l'édition ; mise à jour de `04_casUsage.md` (US concernée) pour décrire ce nouveau comportement de pré-remplissage.

### 3.2. Option B — Affordance explicite, sans injection automatique

**Principe.** Aucune ligne n'est ajoutée automatiquement. Le formulaire propose une action explicite (ex. un bouton ou lien « Ajouter une borne de repli ») qui, sur clic volontaire de l'utilisateur, ajoute une ligne `*=` (motif renseigné, statut laissé vide) en dernière position du texte des bornes — jamais de statut pré-rempli, cohérent avec le principe déjà retenu pour C15-07/RG-041 (« le statut de chaque ligne n'est jamais pré-rempli par défaut, une valeur explicite étant exigée avant validation »).

**Avantages.** Ne présume d'aucune valeur métier non couverte par un texte normatif : la décision du statut de repli (`obsolete`, ou tout autre) reste entièrement à la charge de l'utilisateur, à chaque règle, cohérent avec la robustesse d'ambiguïté déjà retenue pour C15-07/C15-08. Aucun risque de doublon avec quelque saisie que ce soit, puisque rien n'est injecté sans action explicite. Développement plus simple, sans logique de détection de borne `*` déjà existante à l'édition.

**Inconvénients.** Ne résout le problème de recette que partiellement : un utilisateur pressé peut toujours oublier de cliquer sur l'affordance, reproduisant le symptôme initial de C15-12 (absence de filet de repli). Un simple bouton ne garantit pas non plus, à lui seul, que la ligne ajoutée reste en dernière position si l'utilisateur réordonne ensuite le texte librement (la zone de saisie reste un simple `<textarea>` multi-lignes) — un rappel explicite du risque d'ordre (cf. section 2.2) devient alors nécessaire dans le texte d'aide déjà généralisé par C15-04.

**Impact code.** `referentiels-parametrage.component.ts`/`.html` : ajout d'une méthode publique (ex. `ajouterBorneDeRepli()`) et d'un bouton dans le gabarit, sans toucher aux méthodes d'ouverture existantes. Aucun impact sur le Moteur de jugement ni sur le cœur natif.

**Impact documentation.** Mise à jour plus légère que l'option A : ajout d'une clause à `RG-022` (ou nouvelle RG) décrivant l'affordance et rappelant explicitement la contrainte d'ordre de la section 2.2, sans fixer de valeur par défaut business dans le texte normatif.

### 3.3. Option C — Statut par défaut calculé côté Moteur de jugement, sans borne persistée

**Principe.** Rupture avec les deux options précédentes : au lieu d'agir sur le formulaire de saisie, cette option modifie `StatutObsolescenceUtils.calculerStatutObsolescence` pour distinguer explicitement les deux cas aujourd'hui confondus sous `nonReference` (absence de règle correspondant à la référence vs règle trouvée mais aucune borne de version correspondante), et restituer, pour le second cas uniquement, un statut par défaut calculé à l'affichage (ex. `obsolete`), sans jamais rien écrire dans les données persistées de la règle.

**Avantages.** Résout le problème pour toutes les règles existantes rétroactivement, y compris celles déjà créées avant l'introduction de ce point, sans nécessiter de reprise de données ni de ressaisie ; élimine structurellement tout risque de doublon avec C15-07, puisqu'aucune ligne n'est jamais ajoutée à aucun formulaire ; élimine aussi le risque d'ordre décrit en 2.2, puisqu'aucune borne `*` n'a besoin d'être positionnée par qui que ce soit.

**Inconvénients.** Contredit frontalement une décision arbitraire déjà documentée en commentaire de code et présentée comme validée par un humain (« ni `obsolete` ni `maintenu` ne sont supposés sans base normative, cf. consigne explicite de cet incrément ») : un arbitrage explicite doit donc trancher s'il s'agit de faire évoluer cette décision antérieure, ou si C15-12 doit au contraire rester dans le cadre déjà posé (auquel cas seules les options A/B, agissant sur la donnée saisie et non sur le calcul, sont recevables). Réintroduit une valeur codée en dur dans une fonction du Moteur de jugement, à rebours de la règle du projet « aucune valeur de seuil ou de référentiel codée en dur : toujours lue depuis `parametres`/`referentiels` » (`09-normes-developpement.md`), sauf à faire de cette valeur elle-même un nouveau réglage paramétrable (ce qui déplace la complexité plutôt que de la supprimer). Rend moins visible, pour l'utilisateur consultant la règle dans l'écran de Paramétrage, la raison du statut affiché sur une dépendance : aucune borne explicite ne figure dans la règle listée, alors que l'indicateur affiché ailleurs (Fiche projet, Synthèse) ne serait plus `nonReference` — écart entre ce que montre le référentiel et ce que montre le jugement calculé.

**Impact code.** `statut-obsolescence.utils.ts` : modification de la signature de retour (`ResultatObsolescence` devrait distinguer les deux causes de non-correspondance si l'on souhaite continuer à alerter séparément sur les dépendances réellement non couvertes par aucune règle, information aujourd'hui utilisée ailleurs — ex. compteur de dépendances « non référencé » consommé par C15-07/RG-040) ; mise à jour de tous les appelants et de leurs tests. Si la valeur par défaut devient elle-même un réglage paramétrable, ajout d'un champ à `parametres`/`referentiels`, d'une commande de la Façade, et de sa persistance côté cœur natif (impact largement supérieur aux options A/B).

**Impact documentation.** Modification de `RG-011`/`RG-022` en profondeur (la restitution d'un statut calculé sans base de donnée saisie touche directement le principe « tout jugement est calculé à l'affichage à partir des seuils et référentiels courants »), et non plus seulement ajout d'une clause.

## 4. Questions ouvertes nécessitant un arbitrage humain

- La sémantique de repli est-elle bien `*=obsolete` dans tous les cas, comme le suppose l'analyse préliminaire du plan, ou une autre valeur métier (ex. laisser le choix du statut entièrement libre, comme le propose l'option B) est-elle préférable ? Aucun texte normatif actuel (`04_casUsage.md`, `05_reglesGestion.md`, `Specification.md`) ne fixe cette valeur ; elle serait, si retenue, une décision arbitraire au même titre que le nombre de sauvegardes de sécurité déjà documenté.
- Le point doit-il rester circonscrit au seul formulaire unitaire de `SqmReferentielsParametrageComponent` (périmètre du libellé initial, confirmé par lecture directe en section 2.5), ou son traitement doit-il être explicitement étendu à la modale de saisie en masse (C15-07) ? Cette dernière extension, si retenue, doit intégrer dès sa conception la règle de non-duplication avec une ligne de repli identique déjà tapée manuellement par l'utilisateur au sein du même motif regroupé.
- Le principe retenu agit-il sur la donnée saisie (options A/B, une borne `*` réellement ajoutée à `referentiels.reglesDependances[].versions`) ou sur le calcul de restitution (option C, aucune donnée ajoutée, comportement du Moteur de jugement modifié) ? Ce choix engage une révision, ou non, de la décision arbitraire déjà actée et documentée dans `statut-obsolescence.utils.ts` sur l'absence de statut par défaut sans base normative — un arbitrage doit se prononcer explicitement sur le maintien ou la remise en cause de cette décision antérieure, plutôt que de la contredire silencieusement au fil d'un développement ultérieur.
- Si une borne est effectivement injectée dans le texte du formulaire (options A ou B), l'application doit-elle se contenter d'un ordre garanti par construction (ligne toujours ajoutée en dernière position, jamais réordonnable) ou doit-elle activement avertir/bloquer si l'utilisateur place ensuite une borne `*` avant une borne plus spécifique dans la zone de texte libre, compte tenu de la sémantique « première correspondance déclarée l'emporte » déjà en vigueur (section 2.2) ?
- En édition d'une règle existante portant déjà une borne `*` avec un statut différent de la valeur par défaut envisagée, l'option A doit-elle s'abstenir d'injecter une seconde borne `*` (détection par motif seul, indépendamment du statut associé), ou existe-t-il un cas où les deux devraient légitimement coexister (ce que la sémantique « première correspondance l'emporte » rendrait de toute façon inopérant pour la seconde) ?
- Le comportement retenu doit-il être identique entre une règle de dépendances et une éventuelle future entité de référentiel construite sur le même patron (motif + bornes), ou s'agit-il d'une spécificité propre aux règles de dépendances, sans généralisation prévue à ce stade ?

## 5. Propositions d'identifiants US/RG provisoires (mise à jour après arbitrage)

Arbitrage humain rendu le 2026-08-18 : **option A retenue** (borne de repli `*=obsolete` injectée automatiquement, modifiable/supprimable avant validation), périmètre **étendu à la modale de saisie en masse** (C15-07/RG-040), garantie d'ordre assurée **par construction uniquement** (sans surveillance active d'un réordonnancement manuel ultérieur), comportement jugé **spécifique aux règles de dépendances** (pas de généralisation prévue à ce stade). En édition d'une règle portant déjà une borne `*`, l'abstention d'injection se fait par détection du seul motif `*`, indépendamment de son statut.

Numérotation coordonnée avec les cinq autres points `C15-NN` de cette même phase pour éviter toute collision d'identifiant (cf. `docs/03_plan/analyse_C15-10.md` et `analyse_C15-11.md`, qui consomment déjà `RG-042` et `RG-043` dans l'ordre de traitement retenu).

- **US-045** (provisoire) : cas d'usage utilisateur portant sur la disponibilité d'une borne de repli lors de la création d'une règle de dépendances, injectée automatiquement et modifiable, applicable au formulaire unitaire et à la saisie en masse.
- **RG-044** (provisoire), rattachée au même domaine fonctionnel que `RG-022`/`RG-040` (« Seuils, référentiels et historisation ») : précise la valeur de repli (`*=obsolete`), la garantie de position en dernière ligne du tableau des bornes assurée par construction, le principe de non-duplication à l'édition (abstention par motif seul, indépendamment du statut) et l'extension à la saisie en masse.

Cette numérotation reste une proposition provisoire à confirmer au moment de la qualification documentaire effective.
