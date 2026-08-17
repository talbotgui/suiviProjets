# Usage de l'IA et conventions de rédaction

Synthèse actionnable de [01_modalitesUsageEtConventions.md](../../docs/02_documentation/01_modalitesUsageEtConventions.md). En cas de doute, le document source fait foi ; toute évolution de ce document entraîne la mise à jour de ce fichier.

## Langue et rédaction

- Français, registre professionnel et technique, sans familiarité ([source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#langue-et-registre-de-la-discussion-et-des-documents)).
- Réponses directes, sans préambule ni résumé redondant en fin de réponse ([source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#niveau-de-détail-attendu-dans-les-réponses)).
- Tout document Markdown produit : un paragraphe par ligne logique (pas de retour à la ligne manuel en son milieu), aucun emoji sauf demande explicite, sommaire en tête de fichier ([source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#règles-de-rédaction-des-documents-markdown)).

## Rappel des règles générales de collaboration

- Aucun passage à l'étape N+1 sans validation humaine explicite de l'étape N ; une relecture seule n'y suffit pas.
- Relecture de chaque étape dans un contexte isolé de celui du Codeur : nouvelle conversation, ou sous-agent dédié disposant de son propre contexte (ex. outil Agent orchestrant un binôme Codeur/Relecteur) — pour éviter que les biais et angles morts du Codeur ne contaminent la relecture.
- Chaque exigence porte un identifiant stable (`US-NNN`, `RG-NNN`), réutilisé sans être renommé dans toutes les étapes suivantes.
- Modèles de structure et de format à respecter pour tout document produit : `./docs/_modèles` ([source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#rappel-des-règles-générales-de-collaboration)).

## Actions interdites à l'IA

- Toute commande git est autorisée à l'IA, à l'exception de `git push` qui reste réservée à l'exécution humaine (cf. convention de commits de code applicatif dans [09-normes-developpement.md#git-et-commits](./09-normes-developpement.md#git-et-commits)).
- Aucun déploiement en production, aucun envoi de communication externe, aucune suppression de données, aucune opération irréversible ou affectant un système partagé (dont `git push`), même préparée par l'IA ([source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#actions-à-exécution-strictement-humaine)).
- Le garde-fou technique de `.claude/settings.json` bloquant toute commande dont le premier mot était `git` a été retiré le 2026-08-17 pour réautoriser l'usage de git par l'IA, notamment pour la manipulation des worktree ; seule `git push` reste interdite à l'IA, sans garde-fou technique dédié dans la configuration actuelle (aucune entrée de refus spécifique à `push`). Cette exclusion repose donc sur la présente règle et sur la relecture de chaque commande git proposée par l'IA avant exécution, en particulier pour toute commande composée où `push` apparaîtrait de façon non initiale (ex. substitution de processus, sous-shell), le même angle mort que celui déjà documenté pour l'ancien garde-fou générique sur `git` (ajouté le 2026-08-17, en remplacement de la note du 2026-07-26 relative au garde-fou désormais retiré, cf. [source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#actions-à-exécution-strictement-humaine)).

## Description des demandes et traçabilité

- Une demande ambiguë appelle des questions avant toute production de contenu, jamais une hypothèse non vérifiée ([source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#formulation-des-demandes-à-lia)).
- Tout document ou code substantiellement généré ou assisté par l'IA porte une mention explicite de cette origine (en-tête de document, commentaire d'en-tête de fichier de code, message de commit) ([source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#mention-de-lorigine-des-contenus)).
- Dispense de cette mention en en-tête de fichier dans deux cas : fichier reproduisant tel quel, sans adaptation, la sortie brute d'un générateur officiel (`ng new`, `cargo init`, `tauri init`) ; fichier dont le format ne supporte aucun commentaire (ex. JSON strict), la mention en commit restant alors seule obligatoire (ajouté le 2026-07-19, à la suite d'incohérences constatées en relecture de la Phase 0, cf. [source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#mention-de-lorigine-des-contenus)).

## Discernement

- Toute affirmation chiffrée, réglementaire ou technique précise doit être vérifiée avant d'être présentée comme acquise ([source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#fiabilité-et-limites-connues-de-lia)).
- Quatre domaines exigent une relecture humaine renforcée : calcul des indicateurs qualité, sécurité/confidentialité des données, architecture technique de l'application, conformité aux référentiels externes ([source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#points-de-vigilance-spécifiques-au-projet)).
- Les arbitrages fonctionnels, d'architecture ou de sécurité restent des décisions humaines ; l'IA propose, ne tranche pas ([source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#non-substitution-du-jugement-métier)).

## Diligence

- Aucune ligne de code générée par l'IA n'est intégrée sans avoir été relue et comprise par un humain ([source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#relecture-obligatoire-du-code-généré)).
- Le résultat doit être concrètement exécuté ou testé avant validation ; une relecture visuelle seule ne suffit pas ([source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#vérification-fonctionnelle-avant-validation)).
- Toute affirmation du compte-rendu du Codeur décrivant un mécanisme ou une répartition de responsabilité (ex. « telle décision est confiée à tel module ») est vérifiée par lecture directe du code réellement produit avant validation, jamais acceptée sur la seule foi du texte du rapport (ajouté le 2026-07-20 : compteur d'échecs de déverrouillage annoncé par le Codeur comme confié au Store d'état applicatif de la Phase 1, mais absent du code constaté à la relecture, cf. [source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#vérification-fonctionnelle-avant-validation)).
- Une affirmation du compte-rendu du Codeur décrivant une correction de configuration (ex. ajustement d'un seuil d'avertissement de build) est vérifiée par comparaison directe avec la liste réelle des fichiers modifiés de l'incrément, pas seulement rejouée : une correction absente de cette liste ne peut pas être tenue pour acquise, même si le comportement observé au moment de la relecture semble déjà conforme (ajouté le 2026-07-26 : ajustement d'un seuil de taille de fascicule annoncé par le Codeur de la Phase 6 incrément 7 comme réalisé à cet incrément, alors que le fichier de configuration concerné n'apparaissait pas parmi les fichiers modifiés constatés à la relecture, cf. [source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#vérification-fonctionnelle-avant-validation)).
- En présence de deux sessions de développement exécutées en parallèle sur un même arbre de travail partagé, l'attribution par l'une d'elles à une phase antérieure déjà close d'un comportement observé dans du code qu'elle n'a pas écrit elle-même n'est jamais acceptée sans vérification indépendante, ce comportement pouvant avoir été introduit entre-temps par la session concurrente (ajouté le 2026-08-12 : attribution erronée à R11-03 d'une notification de succès en réalité introduite par la session concurrente traitant R12-03/US-038 sur les mêmes fichiers, cf. [source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#vérification-fonctionnelle-avant-validation)).
- Aucune donnée confidentielle, personnelle ou secrète n'est transmise à l'IA dans un prompt : contenu du fichier de données chiffré, données personnelles des membres, secrets et clés (`.pem`, `.key`, déjà refusés par `.claude/settings.json`) ([source](../../docs/02_documentation/01_modalitesUsageEtConventions.md#protection-des-informations-sensibles)).
