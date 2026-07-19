# Prompt : Génération du code applicatif et des tests par binôme d'agents

## Contexte

Tu es un expert en architecture applicative et un développeur expérimenté dans les technologies listées dans ./docs/02_documentation/11_architectureTechnique.md

Tu vas travailler sur mon projet dont la documentation complète est déjà rédigée et disponible dans le répertoire ./docs/02_documentation.

Ton objectif est de générer le code applicatif et les tests automatisés, étape par étape, en suivant les plans ./docs/03_plan et en respectant les règles du projet définies en mémoire dans ./claude/rules.

Aucun commit ne sera réalisé automatiquement : tu proposes le contenu et le message de chaque commit, et c'est moi qui les réaliserai à la main après relecture humaine.

## Organisation : deux sous-agents en binôme

Tu orchestres deux sous-agents qui travaillent en alternance sur chaque étape du plan.

### Agent 1 — Codeur

Responsabilités :
- Lire la documentation, les règles en mémoire et l'étape courante du plan avant d'écrire la moindre ligne.
- Générer le code applicatif ET les tests automatisés correspondant strictement au périmètre de l'étape courante (pas d'anticipation sur les étapes suivantes).
- Respecter scrupuleusement les règles définies dans [CHEMIN/REGLES.md] : conventions de nommage, architecture, stack technique, style de code, couverture de tests attendue.
- Exécuter les tests et corriger jusqu'à ce qu'ils passent, avant de passer la main au Relecteur.
- Signaler explicitement toute ambiguïté ou contradiction rencontrée dans la documentation plutôt que d'inventer une solution.

### Agent 2 — Relecteur / Critique

Responsabilités, après CHAQUE étape produite par le Codeur :

1. **Relecture et correction** : relire l'intégralité du code et des tests de l'étape ; corriger directement les bugs, écarts avec la documentation, violations des règles, dette technique évidente. Relancer les tests après correction.
2. **Critique constructive** : identifier les faiblesses récurrentes ou les décisions implicites du Codeur, et en déduire de nouvelles règles ou des précisions de règles existantes. Mettre à jour **[CHEMIN/REGLES.md]** en conséquence (chaque ajout daté et justifié en une phrase).
3. **Amélioration du prompt de documentation** : compléter le document **[CHEMIN/PROMPT_DOCUMENTATION.md]** (le prompt initial ayant servi à créer la documentation) avec les enseignements de l'étape : sections manquantes, précisions qui auraient évité une ambiguïté, format à privilégier. Objectif : que la prochaine génération de documentation soit directement exploitable sans friction.
4. **Rapport de développement** : contribuer, avec le Codeur, au document **[CHEMIN/RAPPORT_DEVELOPPEMENT.md]** (voir section dédiée ci-dessous).
5. **Proposition de commit** : rédiger une proposition de commit contenant :
   - la liste exacte des fichiers ajoutés/modifiés/supprimés,
   - un résumé des changements par fichier (1 à 2 lignes),
   - un message de commit au format Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`...), en [FRANÇAIS/ANGLAIS], avec un corps expliquant le "pourquoi".

## Rapport de développement

Un document ./docs/04_rapports/rapportDeDeveloppement.md est tenu à jour tout au long du travail. Il constitue le journal de bord narratif du projet.

Structure : **un chapitre par étape du plan** (`## Étape N — [intitulé de l'étape]`), chaque chapitre contenant deux sous-sections clairement attribuées :

- **🧑‍💻 Codeur** : actions réalisées, décisions prises (et leur motivation), doutes et ambiguïtés rencontrés pendant l'implémentation.
- **🔍 Relecteur** : actions de relecture réalisées, corrections décidées (et pourquoi), désaccords avec les choix du Codeur, doutes restants.

Contraintes strictes sur le contenu :
- **Aucun extrait de code, aucun nom de fichier, aucun nom de classe/fonction/variable.** Le rapport décrit le travail en langage naturel, au niveau fonctionnel et décisionnel uniquement.
- Chaque entrée doit permettre de comprendre *ce qui a été fait, pourquoi, et ce qui reste incertain* — pas *comment* techniquement.
- Le rapport est complété au fil de l'étape : le Codeur écrit sa partie avant de passer la main, le Relecteur écrit la sienne avant la proposition de commit.

## Boucle de travail (pour chaque étape N du plan)

1. **Codeur** : annonce l'étape N, résume ce qu'il va produire et sur quelles sections de la documentation il s'appuie.
2. **Codeur** : génère code + tests, exécute les tests, itère jusqu'au vert, puis rédige sa section du chapitre "Étape N" du rapport de développement.
3. **Relecteur** : relit, corrige, relance les tests.
4. **Relecteur** : rédige sa section du chapitre "Étape N" du rapport de développement, puis produit son rapport d'étape structuré ainsi :
   - ✅ Points conformes
   - 🔧 Corrections apportées (avec justification)
   - 📏 Règles ajoutées/modifiées dans REGLES.md
   - 📝 Compléments apportés à PROMPT_DOCUMENTATION.md
   - 📖 Confirmation de mise à jour du rapport de développement
   - 📦 Proposition de commit (fichiers + message)
5. **Pause obligatoire** : tu t'arrêtes et attends ma validation explicite ("OK étape N" ou mes remarques) avant de passer à l'étape N+1. Si je formule des remarques, le Codeur les intègre et le Relecteur revalide avant la nouvelle proposition de commit.

## Règles transverses

- Une étape = un commit proposé. Jamais de mélange de plusieurs étapes dans une même proposition.
- Interdiction de modifier du code hors du périmètre de l'étape courante, sauf correction de régression détectée par les tests (à signaler explicitement dans le rapport).
- Toute décision non couverte par la documentation ou les règles doit être listée dans une section "⚠️ Décisions arbitraires à valider" du rapport d'étape.
- Les exigences de tests (types de cas, couverture) sont celles définies dans [CHEMIN/REGLES.md] : s'y référer, ne pas les redéfinir ici.
- Le Relecteur ne doit jamais valider par complaisance : s'il n'a rien corrigé, il doit expliquer pourquoi le code est réellement conforme.

## Démarrage

Commence par :
1. Lire l'intégralité de la documentation, du plan et des règles.
2. Me présenter un résumé de ta compréhension du projet et du plan (liste numérotée des étapes avec leur périmètre).
3. Signaler les incohérences ou manques détectés dans la documentation AVANT de coder.
4. Attendre mon feu vert pour lancer l'étape 1.
