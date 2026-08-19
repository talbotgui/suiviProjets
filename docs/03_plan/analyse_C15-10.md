# Analyse du point de recette C15-10 — Formulaire unitaire de règle de dépendances face à un motif déjà existant

Document généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par `.claude/rules/01-usage-ia-et-conventions.md`.

Ce document est une analyse préparatoire en vue d'une session d'arbitrage humain. Il ne constitue ni une décision, ni une qualification documentaire actée : aucune ligne de `04_casUsage.md`, `05_reglesGestion.md`, `10_charteErgonomie.md` ou `plan_13_developpement.md` n'a été modifiée pour le produire, conformément au périmètre demandé. Les identifiants `US-NNN`/`RG-NNN` cités en section 5 sont des propositions provisoires, à confirmer lors de l'arbitrage.

## Sommaire

1. Rappel du point
2. Analyse (constats de lecture directe du code et de la documentation)
3. Options de solution
4. Questions ouvertes nécessitant un arbitrage humain
5. Proposition d'identifiants US/RG provisoires

## 1. Rappel du point

Constat consigné dans `docs/03_plan/plan_13_developpement.md` (ligne C15-10) : « Le formulaire de création d'une règle de dépendance, notamment pré-rempli depuis le détail d'un audit, ne gère pas le cas où le motif saisi correspond déjà à une règle existante : la demande est de fusionner la nouvelle borne dans la règle existante plutôt que d'échouer ou de créer un doublon. »

Analyse préliminaire déjà consignée dans le plan : le comportement est à mettre en cohérence explicite avec C15-07 qui, pour la saisie en masse, impose à l'inverse un rejet strict en cas de motif déjà connu ; l'arbitrage doit trancher si cette divergence formulaire unitaire (fusion)/saisie en masse (rejet) est réellement voulue, ou si les deux doivent adopter le même comportement. Question complémentaire déjà posée : en cas de fusion, comment les bornes se combinent-elles si la nouvelle borne contredit une borne déjà existante pour un motif partiellement recouvrant — simple concaténation en fin de liste, ou détection explicite de contradiction à signaler.

Statut actuel dans le plan : « À qualifier conjointement avec C15-07 (cohérence de comportement à arbitrer) ».

## 2. Analyse

### 2.1. Comportement réel du formulaire unitaire aujourd'hui (constaté par lecture directe du code)

Le formulaire unitaire de règle de dépendances est porté par `src/app/ecrans/parametrage/referentiels/referentiels-parametrage.component.ts` (`SqmReferentielsParametrageComponent`, section « Règles de dépendances », lignes 198-329).

Le pré-remplissage « depuis le détail d'un audit » cité par le point s'effectue via les entrées `motifPreselectionne`/`versionPreselectionnee` (lignes 130-160), relayées depuis le lien contextuel « Créer une règle » de la Fiche projet (`queryParamsReferentielDependance`, `fiche-projet.component.ts` lignes 1170-1180, sur chaque dépendance au statut « non référencé »). Un effet posé dans le constructeur (lignes 147-161) appelle systématiquement `this.ouvrirCreationDependance()` dès qu'un `motifCible` est reçu, **sans jamais interroger au préalable `this.reglesDependances()` pour vérifier si ce motif correspond déjà à une règle existante** : que le motif présélectionné corresponde ou non à une règle déjà présente, le chemin de code emprunté est toujours celui de la création (`dependanceEnEditionId = null`), jamais celui de l'édition (`ouvrirEditionDependance`, qui n'est atteint que par un clic explicite sur une règle déjà listée).

`confirmerEnregistrementDependance` (lignes 301-329) construit alors une nouvelle entrée `EntreeReglesDependances` dont l'`id` est un `crypto.randomUUID()` fraîchement généré côté interface (choix arbitraire déjà documenté en en-tête de ce fichier, lignes 17-19), puis appelle la commande native `definirReferentiel('reglesDependances', entree, motDePasse)`.

Côté cœur natif, `persistance::parametrage::definir_referentiel` (`src-tauri/src/persistance/parametrage.rs`, lignes 222-268) délègue l'ajout/mise à jour à `upsert_par_id` (lignes 191-208), qui recherche une entrée existante **strictement par le champ `id`** (`regle.as_object().and_then(|objet| objet.get("id")) == Some(&Value::String(id.to_string()))`) — jamais par le champ `motif`. Aucune fonction de validation (`valider_entree_regles_dependances`, lignes 127-144) ne contrôle l'unicité du motif : seules la non-vacuité de `id`/`motif` et la présence d'un tableau `versions` sont vérifiées. L'énumération `ErreurParametrage` (lignes 30 et suivantes) ne porte aucune variante relative à un motif déjà existant (seules `TypeReferentielInconnu`, `EntreeReferentielInvalide`, `MotifNommageBranchesInvalide` existent).

**Conséquence directe, vérifiée par lecture du code, et non présumée** : lorsque le motif saisi (ou présélectionné) correspond à une règle déjà existante, l'enregistrement ne fusionne rien, n'échoue pas, et ne remplace pas la règle existante — il crée une **seconde entrée distincte** dans `referentiels.reglesDependances`, portant un `id` différent mais le même `motif`, poussée en fin de tableau (`regles.push(entree)`).

Ce doublon n'est pas seulement une redondance de stockage inoffensive : le Moteur de jugement (`src/app/services/sansetat/jugement/statut-obsolescence.utils.ts`, ligne 33) sélectionne la règle applicable à une dépendance constatée par `regles.find((regle) => ParametresJugementUtils.correspondMotifGlob(regle.motif, dependance.reference))` — soit la **première** règle du tableau dont le motif (interprété comme glob) correspond, dans l'ordre du tableau. La règle déjà existante ayant été insérée avant la nouvelle (toujours poussée en fin de tableau par `upsert_par_id`), c'est **systématiquement l'ancienne règle qui continue d'être évaluée**, jamais la nouvelle : la borne que l'utilisateur pensait avoir ajoutée est silencieusement inopérante, sans aucun message d'erreur ni de succès trompeur — seule la notification générique « La règle de dépendances a été ajoutée » s'affiche (ligne 327), sans indiquer qu'une règle homonyme préexistait et qu'elle seule reste appliquée.

Le comportement réel est donc plus problématique que la simple alternative « échouer ou créer un doublon » évoquée par le texte du point : il s'agit d'un **doublon silencieux et fonctionnellement mort**, non d'une simple duplication visible. Aucun test unitaire ou E2E existant ne couvre ce cas (recherche `grep -n "motif.*déjà\|dejaExistant\|motif.*existant"` sur `referentiels-parametrage.component.spec.ts` : aucune occurrence).

### 2.2. Comportement réel de C15-07 (saisie en masse), déjà développé et validé en relecture

`src/app/services/sansetat/jugement/saisie-masse-dependances.utils.ts` (`SaisieMasseDependancesUtils.analyser`, lignes 75-122) reçoit un paramètre `motifsExistants: readonly string[]` (les motifs des règles déjà enregistrées avant l'ouverture de la modale) et rejette explicitement toute ligne dont le motif y figure (lignes 100-107), sans jamais interrompre le traitement des autres lignes de la soumission (RG-040, point 2). Seules les lignes de la **même soumission** partageant un motif encore inconnu sont regroupées en une règle multi-bornes (`groupesParMotif`, lignes 108-114) ; il ne s'agit donc jamais d'une fusion avec une règle préexistante, uniquement d'un regroupement interne au lot en cours de saisie.

`RG-040` (`docs/02_documentation/05_reglesGestion.md`, ligne 98) documente ce comportement en toutes lettres : « strictement additive : elle ne modifie ni ne fusionne jamais une règle déjà enregistrée avant l'ouverture de la modale ». Ce point a été qualifié, développé et confirmé « conforme » lors d'une relecture isolée (rapport, section « Étape 15 incrément 7 », point 3), avec vérification directe du code de rejet.

Il y a donc bien, à ce jour, une divergence de fait entre les deux formulaires — mais elle n'oppose pas un rejet strict (C15-07, comportement voulu et documenté) à une fusion (formulaire unitaire, comportement demandé par C15-10) : elle oppose ce rejet strict voulu à une **absence totale de gestion** du cas côté formulaire unitaire, dont la conséquence observée est un doublon mort plutôt qu'une fusion. Aucune fusion n'est implémentée nulle part dans le code actuel du projet pour cette entité.

### 2.3. Cadre normatif existant

- **RG-022** (`05_reglesGestion.md`, ligne 88) : les référentiels définis au paramétrage s'appliquent uniformément à tous les écrans de restitution — ne traite pas la création/mise à jour d'une entrée, seulement sa restitution.
- **RG-023** (ligne 89) : toute modification d'une donnée de jugement, dont un référentiel de dépendances, est consignée au journal avec avant/après et origine — déjà respecté par le chemin actuel (une entrée de journal `referentiels.reglesDependances/{id}` est bien créée à chaque appel de `definirReferentiel`, y compris pour le doublon actuel), mais ne prescrit rien sur l'unicité du motif.
- **RG-030** (ligne 92) : concerne exclusivement le motif de nommage des branches (valeur scalaire), sans rapport avec l'unicité des motifs de règles de dépendances.
- **RG-035** (ligne 96) : suppression d'une entrée de référentiel par identifiant — confirme que l'`id`, et non le `motif`, est la clé fonctionnelle actuellement retenue pour identifier une règle de dépendances, cohérent avec le constat de 2.1 (`upsert_par_id`).
- **RG-040**/**RG-041** (lignes 98 et 55) : comportement de C15-07/C15-08, analysé en 2.2.

Aucune règle de gestion existante ne traite aujourd'hui explicitement du cas « motif déjà existant » pour la création unitaire d'une règle de dépendances : c'est un vide normatif réel, confirmé par la lecture de `05_reglesGestion.md` dans son intégralité sur ce périmètre, et non une lacune seulement supposée par le texte du point.

### 2.4. Éléments techniques pertinents pour les options de solution

- L'ordre des bornes au sein d'une règle (`RegleDependance.versions`) est significatif pour le jugement : « évaluées dans l'ordre déclaré, la première correspondance l'emportant » (`parametres-jugement.utils.ts`, ligne 636). Une fusion par simple concaténation en fin de liste placerait donc toute borne nouvellement fusionnée en **dernière priorité d'évaluation**, cohérent avec la sémantique déjà en vigueur (une borne plus générale ou plus ancienne continuerait de l'emporter sur un motif de version qu'elle couvre déjà), mais cela doit être confirmé comme le comportement attendu plutôt que présumé.
- Le motif d'une règle de dépendances comme celui d'une borne de version sont tous deux interprétés comme des motifs glob traduits en expression régulière ancrée (`correspondMotifGlob`, lignes 499-505). Une détection générale de recouvrement entre deux motifs glob (ex. `lodash*` et `lodash-es`) est un problème de comparaison d'expressions régulières non trivial en cas général ; une détection de contradiction fiable sur le seul plan technique ne peut réalistement couvrir que des cas simples (égalité littérale de `motifVersion`, ou éventuellement inclusion stricte d'un motif dans l'autre), pas un recouvrement quelconque.
- Le mécanisme d'upsert par `id` déjà en place côté natif (`upsert_par_id`) sait déjà mettre à jour intégralement une entrée existante dès lors qu'on lui fournit son `id` réel plutôt qu'un `id` nouvellement généré : une fusion implémentée côté interface (résolution de l'`id` de la règle existante, construction du tableau `versions` fusionné, puis appel à `definirReferentiel` avec cet `id`) ne nécessiterait donc aucune modification du cœur natif pour la simple concaténation ; seule une détection de contradiction éventuelle serait un ajout de logique nouvelle, entièrement côté Moteur de jugement (fonctions pures, testables unitairement, seuil de couverture 90 %).
- Le message de succès actuel (`confirmerEnregistrementDependance`, ligne 324-328) ne distingue que création/modification (« a été ajoutée »/« a été modifiée ») par la présence ou non de `dependanceEnEditionId` : une fusion introduirait un troisième cas sémantique (« a été complétée » ou équivalent), non prévu par le texte actuel.

## 3. Options de solution

### Option A — Alignement strict sur le comportement déjà validé de C15-07 (rejet, pas de fusion)

**Principe.** Avant l'appel à `definirReferentiel` en création, `demanderEnregistrementDependance` (ou l'effet de présélection lui-même) vérifie si `motifDependance.trim()` correspond déjà à une règle de `this.reglesDependances()`. Si oui, l'enregistrement est bloqué avec un message explicite invitant l'utilisateur à modifier directement la règle existante plutôt qu'à en créer une nouvelle (éventuellement avec un lien direct vers `ouvrirEditionDependance(id)` de la règle en question, pré-remplie). Le comportement du formulaire unitaire devient alors formellement identique à celui de la saisie en masse (RG-040) : strictement additif, jamais de fusion implicite.

**Avantages.** Cohérence totale et immédiate avec RG-040, déjà arbitré et validé en relecture isolée ; élimine le doublon mort constaté en 2.1 sans introduire de nouvelle sémantique de fusion ; impact code réduit (un contrôle côté client, une éventuelle nouvelle variante d'anomalie côté natif en défense en profondeur, conformément à la convention de double validation de `10-normes-securite.md`) ; aucune ambiguïté possible sur l'ordre ou la contradiction des bornes puisqu'aucune fusion n'a lieu.

**Inconvénients.** Ne répond pas littéralement à la demande initiale du point C15-10 (« fusionner la nouvelle borne dans la règle existante plutôt que d'échouer ») : l'utilisateur reste contraint à une manipulation manuelle en deux temps (constater le rejet, rouvrir la règle existante, y ajouter la ligne). Pour le cas d'usage explicitement cité par le point — le lien « Créer une règle » depuis une dépendance non référencée d'un audit — ce rejet peut surprendre un utilisateur qui n'a pas conscience qu'une règle du même motif existe déjà (d'où l'intérêt du lien direct vers l'édition, mentionné ci-dessus comme amélioration possible mais non garantie sans confirmation explicite du besoin).

**Impact code.** `referentiels-parametrage.component.ts` (contrôle de duplication, message d'erreur, éventuel lien vers l'édition) ; `persistance/parametrage.rs` (nouvelle variante `ErreurParametrage` de type « motif déjà existant », si la revalidation native est retenue) ; tests unitaires Jest et `cargo test` associés.

**Impact documentation.** Nouvelle RG (proposée RG-042, cf. section 5) précisant explicitement, pour le formulaire unitaire, le même principe additif que RG-040, avec renvoi croisé entre les deux règles pour rendre la cohérence visible dans le texte normatif lui-même (recommandation issue du constat de la section 2.3 : absence actuelle de toute clause « comportement en cas de clé déjà existante » pour cette entité, déjà relevée comme lacune structurelle par le point C15-10 lui-même).

### Option B — Fusion automatique de la nouvelle borne dans la règle existante (littéralement la demande du point)

**Principe.** À l'enregistrement, si le motif saisi correspond à une règle déjà existante, le formulaire résout l'`id` de cette règle, construit un tableau `versions` fusionné (bornes existantes suivies des nouvelles bornes saisies) et appelle `definirReferentiel` avec cet `id` réel plutôt qu'un `id` nouvellement généré, déclenchant ainsi la voie de mise à jour déjà supportée nativement par `upsert_par_id`. Deux variantes possibles pour la combinaison des bornes, à trancher ensemble avec le principe général :

- **B1 — concaténation simple.** Les nouvelles bornes sont ajoutées en fin de tableau `versions`, sans aucune analyse de recouvrement avec les bornes déjà présentes. Cohérent avec la sémantique déjà en vigueur (« première correspondance l'emporte », cf. 2.4) : une borne existante plus spécifique ou plus ancienne continue de primer sur la nouvelle si elle couvre déjà le même `motifVersion`.
- **B2 — détection explicite de contradiction.** En complément de B1, une vérification signale (avertissement bloquant ou non) toute nouvelle borne dont le `motifVersion` est strictement identique à celui d'une borne déjà présente pour ce motif, mais associée à un `statut` différent. Une détection de recouvrement glob plus générale (ex. `motifVersion` nouveau inclus dans un `motifVersion` existant non identique) resterait, par construction technique (cf. 2.4), une heuristique partielle et non une garantie complète de détection de toute contradiction possible.

**Avantages.** Répond littéralement à la demande du point C15-10, en particulier pour le parcours explicitement cité (pré-remplissage depuis une dépendance non référencée d'un audit, où l'utilisateur souhaite raisonnablement enrichir une règle déjà existante plutôt que d'être bloqué) ; aucune modification du cœur natif nécessaire pour B1 seul (l'upsert par `id` existe déjà) ; élimine le doublon mort constaté en 2.1.

**Inconvénients.** Introduit une divergence assumée et durable avec RG-040 (rejet strict en saisie en masse), déjà signalée comme potentiellement incohérente par le plan lui-même — nécessite une justification explicite de cette différence de traitement (par exemple : une saisie unitaire porte sur une seule règle sous le regard direct de l'utilisateur, un lot collé en masse porte sur un nombre de motifs que l'utilisateur ne maîtrise pas nécessairement ligne à ligne) pour ne pas apparaître comme un oubli de cohérence plutôt qu'un choix. B2 ajoute une complexité et un risque de détection incomplète, susceptible de donner un faux sentiment d'exhaustivité de contrôle. Le message de succès actuel devrait distinguer un troisième cas (fusion) des deux cas déjà gérés (création/modification), sans quoi l'utilisateur ne saurait pas qu'une fusion a eu lieu plutôt qu'une création.

**Impact code.** `referentiels-parametrage.component.ts` (résolution de la règle existante, fusion du tableau `versions`, adaptation du message de notification) ; nouvelle fonction pure de fusion/détection testable unitairement (probable ajout à `services/sansetat/jugement/`, cohérent avec la convention « Moteur de jugement pur, sans effet de bord » et le seuil de couverture 90 %) si B2 est retenu ; aucun changement natif nécessaire pour B1 seul.

**Impact documentation.** Nouvelle RG (RG-042) documentant la fusion, ses modalités exactes (B1 seul ou B1+B2) et sa divergence assumée avec RG-040, avec renvoi croisé explicite dans les deux sens (RG-040 devrait alors être complétée d'une clause renvoyant vers cette nouvelle RG pour que la divergence soit lisible depuis les deux textes, pas seulement depuis le nouveau).

### Option C — Divergence maintenue et documentée explicitement comme un choix assumé

**Principe.** Retenir la divergence telle que formulée initialement par C15-10 (fusion en formulaire unitaire, rejet en masse), sans chercher l'uniformité, mais en la justifiant explicitement dans le texte normatif plutôt qu'en laissant cette différence implicite. Combine techniquement l'option B (fusion, B1 au minimum) côté formulaire unitaire, mais la présente comme un arbitrage délibéré et documenté plutôt que comme une simple mise en conformité avec la demande initiale.

**Avantages.** Respecte l'intention initiale du point tout en levant explicitement l'ambiguïté relevée par le plan (« l'arbitrage doit trancher si cette divergence est réellement voulue ») : la réponse devient « oui, explicitement, pour telle raison », consignée dans les deux RG concernées. Évite toute discussion future répétée sur cette même divergence, puisque le texte normatif la justifie lui-même.

**Inconvénients.** Revient, sur le plan strictement fonctionnel et code, aux mêmes choix techniques que l'option B (mêmes variantes B1/B2, mêmes impacts) : ce n'est pas une option technique distincte, mais un traitement documentaire distinct de la même implémentation. À ne retenir que si l'arbitrage humain juge la divergence réellement souhaitable sur le fond, et non par simple défaut d'harmonisation.

**Impact code.** Identique à l'option B.

**Impact documentation.** RG-042 (fusion, formulaire unitaire) et RG-040 (rejet, masse) toutes deux complétées d'une clause de justification croisée de la divergence, plutôt que d'un simple renvoi neutre.

## 4. Questions ouvertes nécessitant un arbitrage humain

1. **Uniformité ou divergence assumée.** Le comportement du formulaire unitaire doit-il être aligné sur le rejet strict déjà validé pour la saisie en masse (option A), doit-il implémenter la fusion littéralement demandée par C15-10 en assumant une divergence avec RG-040 (option B), ou cette divergence doit-elle être retenue et explicitement justifiée dans les deux textes normatifs concernés (option C) ?
2. **Si la fusion est retenue (option B ou C), modalité de combinaison des bornes.** Simple concaténation en fin de tableau `versions` (B1, cohérente avec la sémantique « première correspondance l'emporte » déjà en vigueur), ou complément par une détection explicite de contradiction (B2) ? Si B2, quel périmètre exact de contradiction doit être détecté, sachant qu'une détection générale de recouvrement entre motifs glob n'est pas réalisable de façon garantie (cf. 2.4) — seule l'égalité littérale de `motifVersion` avec un `statut` différent est raisonnablement détectable de façon fiable ?
3. **Si la fusion est retenue, portée exacte du déclenchement.** Doit-elle s'appliquer uniquement au parcours explicitement cité par le point (pré-remplissage depuis le lien « Créer une règle » de la Fiche projet, `motifPreselectionne`), ou également à la saisie manuelle libre du même formulaire (l'utilisateur tape lui-même un motif déjà existant sans passer par le lien contextuel) ? Le code actuel emprunte aujourd'hui exactement le même chemin (`ouvrirCreationDependance`/`confirmerEnregistrementDependance`) dans les deux cas : les traiter différemment demanderait une distinction nouvelle, absente du code actuel.
4. **Si le rejet est retenu (option A), doit-il rediriger l'utilisateur vers l'édition de la règle existante ?** Un simple message de rejet, cohérent au minimum avec RG-040, est réalisable sans complément d'ergonomie ; un lien direct vers `ouvrirEditionDependance` de la règle en question améliorerait l'expérience mais n'a pas été explicitement demandé par le point et doit être confirmé comme souhaité avant développement.
5. **Revalidation native.** Quelle que soit l'option retenue, une revalidation côté cœur natif (nouvelle variante `ErreurParametrage`, en complément du contrôle client) est-elle exigée par cohérence avec la convention de double validation client/natif déjà appliquée ailleurs (`.claude/rules/10-normes-securite.md#entrées-et-sorties`), ou le contrôle d'unicité de motif est-il jugé de nature purement ergonomique (comme l'est déjà `correspondMotifGlob`, entièrement côté interface) et donc suffisant côté client seul ?

## 5. Proposition d'identifiants US/RG provisoires (mise à jour après arbitrage)

Arbitrage humain rendu le 2026-08-18 : **option A retenue** (rejet strict, aligné sur le comportement déjà validé de C15-07/RG-040), avec revalidation côté cœur natif exigée en complément du contrôle côté interface.

Numérotation coordonnée avec les cinq autres points `C15-NN` de cette même phase de recette, analysés en parallèle et arbitrés le même jour (`docs/03_plan/analyse_C15-11.md`, `analyse_C15-12.md` et `analyse_C15-14.md`, ainsi que les points C15-13 et C15-15, déjà qualifiés dans `05_reglesGestion.md`), pour éviter toute collision d'identifiant entre les propositions initiales : chacune de ces six analyses, produite indépendamment, avait calculé le même « prochain identifiant disponible » (`US-045`/`RG-042`) à partir du seul dernier identifiant connu au moment de sa rédaction (`US-044`/`RG-041`), sans visibilité sur les autres. Ce document, premier de la série dans l'ordre de présentation et d'arbitrage retenu, conserve donc l'identifiant `RG-042` initialement proposé.

- **RG-042** (provisoire) : comportement de rejet strict en cas de motif déjà existant lors de la création unitaire d'une règle de dépendances, symétrique de `RG-040` (saisie en masse), complétée de la clause de revalidation côté cœur natif.
- **US-033 (mise à jour)**, pas de nouveau cas d'usage : le point C15-10 modifie un comportement du formulaire déjà couvert par `US-033` (« Écran de paramétrage »), sur le même modèle que C10-05 (« US-033 mise à jour, RG-035 »).

Cette numérotation reste une proposition provisoire à confirmer au moment de la qualification documentaire effective de `04_casUsage.md`/`05_reglesGestion.md`.
