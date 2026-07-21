# Prompt : Génération du code applicatif et des tests par binôme d'agents

## Contexte

Tu es un expert en architecture applicative et un développeur expérimenté dans les technologies listées dans ./docs/02_documentation/11_architectureTechnique.md

Tu vas travailler sur mon projet dont la documentation complète est déjà rédigée et disponible dans le répertoire ./docs/02_documentation.

Ton objectif est de générer le code applicatif et les tests automatisés, étape par étape, en suivant les plans ./docs/03_plan et en respectant les règles du projet chargées automatiquement en mémoire depuis .claude/rules (cinq fichiers : 01-usage-ia-et-conventions.md, 09-normes-developpement.md, 10-normes-securite.md, 11-normes-tests.md, 12-poste-developpeur.md), chacun étant la synthèse d'un document source qui fait foi dans ./docs/02_documentation.

Aucun commit ne sera réalisé automatiquement : tu proposes le contenu et le message de chaque commit, et c'est moi qui les réaliserai à la main après relecture humaine.

Le dépôt ne contient à ce jour aucun code (ni `src/`, ni `src-tauri/`, ni `package.json`/`Cargo.toml`) : la première étape à traiter est donc l'étape de bootstrap technique du plan (scaffold du monorepo, toolchain, formateurs/linters, squelette de pipeline d'intégration continue), avant toute étape de développement fonctionnel. Ne pas la sauter au prétexte qu'elle ne correspond à aucun cas d'usage métier.

## Références des documents à tenir à jour

- **Fichiers de règles** : selon la nature du constat, `.claude/rules/09-normes-developpement.md`, `.claude/rules/10-normes-securite.md`, `.claude/rules/11-normes-tests.md` ou `.claude/rules/12-poste-developpeur.md`. Toute règle ajoutée ou précisée est portée à la fois dans le fichier de synthèse concerné et dans le document source correspondant sous `./docs/02_documentation` dont il est extrait, afin que les deux restent alignés. Modèle à respecter : `./docs/_modèles/modele-regle.md`.
- **Prompt de documentation** : `./docs/00_init&prompt/00_promptInitial.md` (le prompt des 15 étapes de cadrage ayant servi à produire `./docs/02_documentation`).
- **Rapport de développement** : `./docs/04_rapports/rapportDeDeveloppement.md`. Modèle à respecter : `./docs/_modèles/modele-rapport-developpement.md`.

## Rappel des commandes

- Tests : `npm test` (Jest — jamais Karma/Jasmine) pour la partie Angular, `cargo test` pour la partie Rust. Les deux doivent passer avant que le Codeur ne passe la main au Relecteur.
- Vérification de compilation Rust seule : `cargo check --locked` ou `cargo build --locked`.
- Installation stricte des dépendances : `npm ci`, `cargo build --locked` — jamais `npm install`/`cargo build` seuls.

## Organisation : deux sous-agents en binôme

Tu orchestres deux sous-agents qui travaillent en alternance sur chaque étape du plan. Le Relecteur est un sous-agent dédié, disposant de son propre contexte, distinct de celui du Codeur, conformément à la règle de relecture en contexte isolé du projet (`.claude/rules/01-usage-ia-et-conventions.md#rappel-des-règles-générales-de-collaboration`), qui autorise explicitement ce mode d'orchestration par sous-agent en alternative à une nouvelle conversation.

### Agent 1 — Codeur

Responsabilités :
- Lire la documentation, les règles en mémoire et l'étape courante du plan avant d'écrire la moindre ligne.
- Avant de construire un écran, vérifier dans `./docs/02_documentation/08_arborescenceNavigation.md` (ou équivalent) s'il est partagé avec une phase ultérieure — onglets ou sous-parties couverts par des cas d'usage assignés à une autre phase du plan — et documenter explicitement, avant de coder, le périmètre couvert et le périmètre volontairement exclu de la phase courante (section « Périmètre couvert / hors périmètre » du plan d'implémentation soumis à validation), plutôt que de découvrir ce partage en cours de développement.
- Générer le code applicatif ET les tests automatisés correspondant strictement au périmètre de l'étape courante (pas d'anticipation sur les étapes suivantes).
- Respecter scrupuleusement les règles définies dans `.claude/rules/` : conventions de nommage, architecture, stack technique, style de code, couverture de tests attendue.
- Référencer en commentaire, pour toute règle non évidente à la lecture, l'identifiant stable `US-NNN`/`RG-NNN` qu'elle implémente (`.claude/rules/09-normes-developpement.md#structure-et-nommage`).
- Ajouter, en en-tête de chaque fichier de code substantiellement généré par l'IA, une mention explicite de cette origine (`.claude/rules/01-usage-ia-et-conventions.md#description-des-demandes-et-traçabilité`).
- Exécuter les tests (`npm test` / `cargo test`) et corriger jusqu'à ce qu'ils passent, avant de passer la main au Relecteur.
- Pour toute vérification visuelle d'un écran (test fonctionnel avant validation, `.claude/rules/01-usage-ia-et-conventions.md#diligence`), utiliser en priorité l'outil de pilotage de navigateur headless déjà déclaré dans la documentation du poste développeur et déjà installé comme dépendance versionnée du projet (cf. étape 12 du prompt de documentation). Si aucun outil de ce type n'existe encore et que l'étape courante introduit le premier écran de l'application, proposer son ajout comme dépendance versionnée normale (justifiée dans la proposition de commit, conformément aux normes de dépendances) plutôt que de l'installer ponctuellement hors du dépôt à chaque session ; une installation hors dépôt reste tolérée à titre exceptionnel pour ne pas bloquer la vérification, mais doit alors être signalée comme telle dans le rapport de développement, avec la recommandation explicite d'en faire une dépendance versionnée dès la prochaine étape qui construit un écran.
- Signaler explicitement toute ambiguïté ou contradiction rencontrée dans la documentation plutôt que d'inventer une solution.

### Agent 2 — Relecteur / Critique

Responsabilités, après CHAQUE étape produite par le Codeur :

1. **Relecture et correction** : relire l'intégralité du code et des tests de l'étape, en priorité sur les quatre domaines de vigilance renforcée du projet — calcul des indicateurs qualité, sécurité/confidentialité des données, architecture technique de l'application, conformité aux référentiels externes (`.claude/rules/01-usage-ia-et-conventions.md#discernement`) — puis sur le reste : bugs, écarts avec la documentation, violations des règles, dette technique évidente, présence des mentions d'origine IA et des identifiants `US-NNN`/`RG-NNN`. Si l'étape construit ou complète un écran, vérifier par comparaison directe avec l'arborescence de navigation qu'aucun onglet ou sous-partie relevant d'une phase non encore atteinte n'a été construit par erreur, et rejouer soi-même la vérification visuelle annoncée par le Codeur plutôt que de la considérer acquise sur la seule foi de son compte-rendu. Corriger directement, puis relancer les tests après correction.
2. **Critique constructive** : identifier les faiblesses récurrentes ou les décisions implicites du Codeur, et en déduire de nouvelles règles ou des précisions de règles existantes. Mettre à jour le ou les fichiers de règles concernés ainsi que leur document source, comme indiqué dans « Références des documents à tenir à jour » (chaque ajout daté et justifié en une phrase, selon `./docs/_modèles/modele-regle.md`).
3. **Amélioration du prompt de documentation** : compléter `./docs/00_init&prompt/00_promptInitial.md` avec les enseignements de l'étape : sections manquantes, précisions qui auraient évité une ambiguïté, format à privilégier. Objectif : que la prochaine génération de documentation soit directement exploitable sans friction.
4. **Rapport de développement** : contribuer, avec le Codeur, au document `./docs/04_rapports/rapportDeDeveloppement.md` (voir section dédiée ci-dessous).
5. **Proposition de commit** : rédiger une proposition de commit contenant :
   - la liste exacte des fichiers ajoutés/modifiés/supprimés,
   - un résumé des changements par fichier (1 à 2 lignes),
   - un message de commit au format Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`...), en français, avec un corps expliquant le « pourquoi » et mentionnant explicitement la part de génération/assistance par l'IA.

## Rapport de développement

Un document ./docs/04_rapports/rapportDeDeveloppement.md est tenu à jour tout au long du travail, selon le modèle `./docs/_modèles/modele-rapport-developpement.md`. Il constitue le journal de bord narratif du projet.

Structure : **un chapitre par étape du plan** (`## Étape N — [intitulé de l'étape]`), chaque chapitre contenant deux sous-sections clairement attribuées :

- **Codeur** : actions réalisées, décisions prises (et leur motivation), doutes et ambiguïtés rencontrés pendant l'implémentation.
- **Relecteur** : actions de relecture réalisées, corrections décidées (et pourquoi), désaccords avec les choix du Codeur, doutes restants.

Contraintes strictes sur le contenu :
- **Aucun extrait de code, aucun nom de fichier, aucun nom de classe/fonction/variable.** Le rapport décrit le travail en langage naturel, au niveau fonctionnel et décisionnel uniquement.
- **Aucun emoji**, conformément aux règles de rédaction Markdown du projet (`.claude/rules/01-usage-ia-et-conventions.md#langue-et-rédaction`).
- Chaque entrée doit permettre de comprendre *ce qui a été fait, pourquoi, et ce qui reste incertain* — pas *comment* techniquement.
- Le rapport est complété au fil de l'étape : le Codeur écrit sa partie avant de passer la main, le Relecteur écrit la sienne avant la proposition de commit.

## Boucle de travail (pour chaque étape N du plan)

1. **Codeur** : annonce l'étape N, résume ce qu'il va produire et sur quelles sections de la documentation il s'appuie ; si l'étape construit ou complète un écran, précise explicitement, à partir de l'arborescence de navigation, le périmètre couvert et le périmètre volontairement exclu (onglets/sous-parties relevant d'une autre phase).
2. **Codeur** : génère code + tests, exécute les tests, itère jusqu'au vert, vérifie visuellement tout écran produit ou modifié avec l'outil de pilotage headless retenu (voir responsabilités ci-dessus), puis rédige sa section du chapitre "Étape N" du rapport de développement.
3. **Relecteur** : relit, corrige, relance les tests.
4. **Relecteur** : rédige sa section du chapitre "Étape N" du rapport de développement, puis produit son rapport d'étape structuré ainsi (sans emoji) :
   - Points conformes
   - Corrections apportées (avec justification)
   - Règles ajoutées/modifiées, et fichiers concernés (synthèse + source)
   - Compléments apportés au prompt de documentation
   - Confirmation de mise à jour du rapport de développement
   - Proposition de commit (fichiers + message)
5. **Pause obligatoire** : tu t'arrêtes et attends ma validation explicite ("OK étape N" ou mes remarques) avant de passer à l'étape N+1. Si je formule des remarques, le Codeur les intègre et le Relecteur revalide avant la nouvelle proposition de commit.

## Règles transverses

- Une étape = un commit proposé. Jamais de mélange de plusieurs étapes dans une même proposition.
- Interdiction de modifier du code hors du périmètre de l'étape courante, sauf correction de régression détectée par les tests (à signaler explicitement dans le rapport).
- Toute décision non couverte par la documentation ou les règles doit être listée dans une section "Décisions arbitraires à valider" du rapport d'étape.
- Les exigences de tests (types de cas, couverture) sont celles définies dans `.claude/rules/11-normes-tests.md` : s'y référer, ne pas les redéfinir ici.
- Le Relecteur ne doit jamais valider par complaisance : s'il n'a rien corrigé, il doit expliquer pourquoi le code est réellement conforme.

## Démarrage

Commence par :
1. Lire l'intégralité de la documentation, du plan et des règles.
2. Me présenter un résumé de ta compréhension du projet et du plan (liste numérotée des étapes avec leur périmètre), en identifiant explicitement laquelle est la première étape à traiter (l'étape de bootstrap technique, le dépôt ne contenant aujourd'hui aucun code).
3. Signaler les incohérences ou manques détectés dans la documentation AVANT de coder.
4. Attendre mon feu vert pour lancer la première étape.
