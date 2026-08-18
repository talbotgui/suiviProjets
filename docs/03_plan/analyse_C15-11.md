# Analyse approfondie — C15-11 (volet b) : validation du statut saisi dans une borne de version d'une règle de dépendances

> Document généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par `.claude/rules/01-usage-ia-et-conventions.md`. Cette analyse ne tranche aucune question : elle expose un comportement constaté par lecture directe du code et des options de solution argumentées, en vue d'un arbitrage humain.

## Sommaire

1. [Rappel du point](#1-rappel-du-point)
2. [Analyse](#2-analyse)
3. [Options de solution](#3-options-de-solution)
4. [Questions ouvertes nécessitant un arbitrage humain](#4-questions-ouvertes-nécessitant-un-arbitrage-humain)
5. [Proposition d'identifiants US/RG provisoires](#5-proposition-didentifiants-usrg-provisoires)

## 1. Rappel du point

Constat initial de recette (`docs/03_plan/plan_13_developpement.md`, tableau de la Phase 15, ligne `C15-11`) : « Le formulaire de création/modification d'une règle de dépendance ne documente pas, dans l'interface, la syntaxe attendue pour les bornes (motif de version, statuts valides après le `=`), et il n'est pas confirmé que la validation au clic sur ENREGISTRER rejette explicitement un statut inconnu. »

Le plan distingue deux volets :

- **Volet (a), documentaire/UX** — aide sous le champ, exemples de motifs et liste des statuts bénéficiant d'une couleur dédiée. Ce volet est **Fait**, couvert par C15-04 (cf. rapport, [Étape 15 incrément 4](../04_rapports/rapportDeDeveloppement.md#étape-15-incrément-4--recette--c15-04-généralisation-du-texte-daide-des-champs-de-lécran-paramétrage)). Ce même incrément avait déjà constaté, par lecture directe de `statut-obsolescence.utils.ts` (RG-022), que `statut` est une chaîne ouverte, sans liste fermée de valeurs valides : seules quatre valeurs (`obsolete`, `maintenu`, `aJourM1`, `aJourM3`) bénéficient d'une couleur dédiée à l'affichage, toute autre valeur étant acceptée telle quelle.
- **Volet (b), validation** — objet de la présente analyse. Le plan précise déjà que, compte tenu du constat du volet (a), il ne peut s'agir que d'un éventuel avertissement non bloquant sur une valeur hors des quatre statuts connus, et non d'un rejet strict d'un « statut inconnu » — notion qui n'existe pas par conception dans le modèle actuel. L'état réel de la validation restait cependant à vérifier par lecture du code plutôt qu'à présumer, ce qui fait l'objet de la section suivante.

## 2. Analyse

### 2.1. Comportement réel côté interface (Angular)

Le formulaire de règle de dépendances est porté par `SqmReferentielsParametrageComponent` (`src/app/ecrans/parametrage/referentiels/referentiels-parametrage.component.ts`). Les bornes de version sont saisies comme un bloc de texte libre, une ligne par borne au format `motifVersion=statut` (choix arbitraire déjà documenté en tête de fichier, faute de maquette haute-fidélité).

La validation au clic sur ENREGISTRER est portée par `demanderEnregistrementDependance()` (lignes 283-295), qui délègue le contrôle du texte des bornes à `analyserVersions()` (lignes 261-278) :

- `motifDependance` doit être non vide (sinon message bloquant « Le motif est obligatoire. »).
- Chaque ligne non vide du champ « Bornes de version » doit contenir un `=` ni en première ni en dernière position de la ligne (après `trim()`), c'est-à-dire un `motifVersion` et un `statut` tous deux non vides après séparation — sinon message bloquant « Chaque ligne de bornes de version doit être au format « motifVersion=statut ». ».
- Aucune comparaison n'est faite entre la valeur de `statut` extraite et les quatre valeurs connues (`obsolete`, `maintenu`, `aJourM1`, `aJourM3`). Cette liste de quatre valeurs n'existe d'ailleurs comme constante nulle part dans `referentiels-parametrage.component.ts` ; elle n'est présente que dans le texte d'aide HTML (ajouté par C15-04, cf. `referentiels-parametrage.component.html` lignes 66-76) et, séparément, dans le composant d'affichage qui associe une couleur à ces quatre valeurs précises.

Il n'existe donc, à ce jour, **aucun avertissement, ni bloquant ni non bloquant**, lorsqu'un statut hors de ces quatre valeurs est saisi : la ligne est acceptée silencieusement, exactement comme n'importe quelle autre ligne syntaxiquement bien formée.

Le texte d'aide déjà en place (C15-04) documente explicitement ce choix comme volontaire : « le statut est une valeur libre — quatre valeurs sont reconnues avec une couleur dédiée à l'affichage (…), tout autre texte est accepté et affiché tel quel. » Ce libellé, déjà validé et livré, est un élément factuel important pour l'arbitrage : il ne s'agit pas d'un oubli non documenté, mais d'un comportement aujourd'hui présenté à l'utilisateur comme la conception retenue.

### 2.2. Comportement réel côté cœur natif (Rust)

La commande de la Façade `definirReferentiel` (routée côté Rust par `commandes/parametrage.rs`, non détaillée ici car elle délègue directement) appelle `persistance::parametrage::definir_referentiel` (`src-tauri/src/persistance/parametrage.rs`, lignes 222-268), qui, pour `type_referentiel == "reglesDependances"`, appelle `valider_entree_regles_dependances` (lignes 134-144) :

```rust
pub(crate) fn valider_entree_regles_dependances(entree: &Value) -> Result<&str, ErreurParametrage> {
    let objet = entree.as_object().ok_or(ErreurParametrage::EntreeReferentielInvalide)?;
    let id = lire_champ_chaine_non_vide(objet, "id")?;
    lire_champ_chaine_non_vide(objet, "motif")?;
    if !objet.get("versions").is_some_and(Value::is_array) {
        return Err(ErreurParametrage::EntreeReferentielInvalide);
    }
    Ok(id)
}
```

Cette fonction vérifie uniquement que `id` et `motif` sont des chaînes non vides et que `versions` est un tableau JSON. **Elle ne descend jamais dans les éléments de ce tableau** : ni la présence des champs `motifVersion`/`statut` sur chaque élément, ni leur type chaîne, ni leur non-vacuité, ni a fortiori une éventuelle appartenance de `statut` à un ensemble de valeurs closes, ne sont vérifiées côté cœur natif.

Ce constat contraste avec la fonction sœur `valider_entree_regles_marqueurs_ia` (lignes 152-174), qui, elle, impose des ensembles fermés de valeurs pour `typeCorrespondance` (`"exact" | "motif"`), `portee` (`"racine" | "partout"`) et `nature` (`"fichier" | "repertoire"`), rejetant explicitement toute valeur hors de ces ensembles avec `ErreurParametrage::EntreeReferentielInvalide`. Le commentaire de tête du module (lignes 14-17) assume ce choix de modélisation générique pour les référentiels-liste, en renvoyant l'interprétation fine du contenu au Moteur de jugement (UI) — mais l'application réelle de ce principe est aujourd'hui **asymétrique entre les deux référentiels-liste** : `reglesMarqueursIA` bénéficie d'une revalidation structurelle fine, `reglesDependances` non.

Les tests unitaires existants du module (`#[cfg(test)] mod tests`, mêmes fichier) confirment cette asymétrie : `definir_referentiel_regles_dependances_champ_manquant_est_rejete` (ligne 630) ne couvre que l'absence du champ `motif` au niveau racine de l'entrée, aucun test n'exerçant un élément de `versions` malformé (champ manquant, type incorrect, ou statut vide) pour `reglesDependances`, alors qu'un test dédié existe pour la valeur fermée invalide de `reglesMarqueursIA` (`definir_referentiel_regles_marqueurs_ia_type_correspondance_invalide_est_rejete`, ligne 668).

### 2.3. Conformité à la norme de sécurité « validation croisée UI + cœur natif »

`.claude/rules/10-normes-securite.md` (section « Entrées et sorties ») exige : « Toute donnée saisie est validée côté UI **et** revalidée côté cœur natif ; aucune confiance aveugle dans une donnée reçue via une commande ». Deux niveaux distincts sont à examiner séparément pour `reglesDependances` :

- **Au niveau de l'entrée dans son ensemble** (`id`, `motif`, présence de `versions` en tant que tableau) : la revalidation existe et est effective des deux côtés — conforme.
- **Au niveau de chaque élément de `versions`** (`motifVersion`, `statut`) : seule l'interface valide un format minimal (présence d'un `=` ni initial ni final). Le cœur natif ne revalide rien de ces éléments. Une commande `definirReferentiel` invoquée directement (hors du formulaire, par un appel `invoke` construit à la main, un bug futur d'un autre composant, ou une évolution qui court-circuiterait `analyserVersions`) pourrait donc aujourd'hui enregistrer un tableau `versions` contenant des éléments non-objets, ou des objets sans les champs `motifVersion`/`statut`, sans qu'aucune anomalie ne soit levée côté cœur natif. Ce n'est **pas conforme** à l'exigence de revalidation systématique de la norme citée.

Ce deuxième constat est **indépendant de la question du statut inconnu** posée par C15-11 : il porte sur l'absence de toute validation structurelle des éléments de `versions`, alors que la question initiale du point C15-11 porte sur la valeur admissible de `statut` une fois sa présence acquise. Les deux méritent cependant d'être traités dans le même mouvement, la correction du second passant par le même point du code que toute évolution du premier (`valider_entree_regles_dependances`).

### 2.4. Synthèse du comportement réel constaté

| Question | Comportement constaté |
|---|---|
| Un statut hors des quatre valeurs connues est-il rejeté (bloquant) au clic sur ENREGISTRER, côté UI ? | Non : accepté silencieusement, aucun message, ni bloquant ni non bloquant. |
| Un statut hors des quatre valeurs connues est-il rejeté par le cœur natif (`definirReferentiel`) ? | Non : le champ `statut` de chaque borne n'est ni lu, ni contrôlé côté Rust — seule la présence de `versions` comme tableau est vérifiée. |
| La structure de chaque élément de `versions` (présence de `motifVersion`/`statut`, type, non-vacuité) est-elle revalidée côté cœur natif ? | Non : aucun contrôle, à la différence de `reglesMarqueursIA` qui valide ses trois champs à valeurs fermées. |
| Ce comportement est-il déjà présenté à l'utilisateur comme un choix assumé ? | Oui, depuis C15-04 : le texte d'aide du champ indique explicitement que le statut est une valeur libre et que toute valeur hors des quatre reconnues est acceptée et affichée telle quelle. |

## 3. Options de solution

### Option 1 — Statu quo documenté : aucune modification de code, clôture du volet (b) sans nouvel identifiant

**Principe.** Considérer que le comportement constaté est déjà conforme à la conception assumée et déjà documentée à l'utilisateur par C15-04 : le statut est un champ libre par construction (cf. `ResultatObsolescence.statut: string` dans `statut-obsolescence.utils.ts`, commentaire de tête assumant l'absence de valeur par défaut supposée). Le constat initial de C15-11, qui évoquait un « rejet explicite d'un statut inconnu », part d'une prémisse (existence d'une notion de « statut inconnu ») qui ne correspond pas au modèle retenu ; une fois cette prémisse corrigée par le volet (a), il n'y a plus d'écart à combler pour le volet (b) au niveau UI.

**Avantages.** Aucun développement. Préserve l'extensibilité actuelle du référentiel (un statut personnalisé, non prévu par les quatre couleurs codées en dur, reste utilisable — utile si une organisation utilisatrice souhaite introduire ses propres catégories de dépendances sans modification de code). Cohérent avec le principe déjà énoncé en commentaire de `persistance/parametrage.rs` de laisser l'interprétation fine du contenu des référentiels-liste au Moteur de jugement.

**Inconvénients.** Une simple faute de frappe sur un statut proche d'une valeur connue (ex. `obsolette`, `maintenue`, `a-jour-m1`) ne produit aucun signal : la dépendance concernée n'affichera jamais la couleur attendue, sans que l'auteur de la règle en soit informé au moment de la saisie — risque d'erreur silencieuse touchant un domaine de vigilance renforcée (calcul des indicateurs, cf. `.claude/rules/01-usage-ia-et-conventions.md#discernement`). Ne traite pas le constat distinct de la section 2.3 (absence de revalidation structurelle des éléments de `versions` côté cœur natif), qui reste un écart réel par rapport à la norme de sécurité, indépendamment du sort réservé à la question du statut.

**Impact code/documentation.** Aucun changement de code. Mise à jour du seul plan (`plan_13_developpement.md`) pour clore C15-11 en `Fait`/`Sans suite`, avec le constat ci-dessus.

### Option 2 — Avertissement non bloquant côté interface sur un statut hors des quatre valeurs connues

**Principe.** Sans changer la nature libre du champ, avertir l'utilisateur, au moment de la validation du formulaire (ou à la saisie), lorsqu'une ligne de borne de version porte un `statut` non compris dans `['obsolete', 'maintenu', 'aJourM1', 'aJourM3']`, sur le modèle déjà en place ailleurs dans ce même écran pour d'autres avertissements non bloquants (ex. C10-02, bandeau de dépassement de taille de fichier). L'enregistrement reste possible malgré l'avertissement.

**Avantages.** Réduit fortement le risque de faute de frappe silencieuse identifié en option 1, sans remettre en cause l'extensibilité du champ ni imposer de rupture de conception. Développement limité à l'interface (aucune modification Rust nécessaire, puisqu'il ne s'agit pas d'un rejet).

**Inconvénients.** Introduit une distinction nouvelle entre message bloquant (`messageErreur`, déjà utilisé pour le motif vide ou la syntaxe `motifVersion=statut`) et message non bloquant, qui n'existe pas aujourd'hui dans ce composant — nécessite un nouveau canal d'affichage (signal ou propriété dédiée) pour ne pas mélanger les deux sémantiques. Le déclenchement (à chaque frappe, à la perte de focus, ou seulement au clic ENREGISTRER) et la sensibilité à la casse de la comparaison restent à trancher (cf. section 4). Ne traite toujours pas, à lui seul, l'écart de revalidation structurelle côté cœur natif (section 2.3).

**Impact code/documentation.** `referentiels-parametrage.component.ts` (nouvelle constante des quatre statuts connus — à factoriser plutôt qu'à dupliquer, en s'appuyant si possible sur la même source que le composant qui colore l'affichage) et `.html` (zone d'avertissement) ; nouvelle RG documentant ce comportement d'avertissement (mise à jour de RG-022 ou nouvelle règle, cf. section 5) ; mise à jour du texte d'aide de C15-04 pour mentionner l'avertissement.

### Option 3 — Liste fermée de statuts valides, rejet strict UI + cœur natif (rupture de conception)

**Principe.** Transformer `statut` en énumération fermée (les quatre valeurs actuelles, ou un ensemble à redéfinir), remplacer la saisie libre par une sélection contrainte (ou, a minima, un contrôle de correspondance stricte), et faire échouer explicitement `definirReferentiel` côté Rust si un élément de `versions` porte un `statut` hors de cette liste — sur le modèle exact de `valider_entree_regles_marqueurs_ia`.

**Avantages.** Élimine toute possibilité de faute de frappe ou d'incohérence. Aligne la rigueur de revalidation de `reglesDependances` sur celle, déjà en place, de `reglesMarqueursIA`. Traite au passage, de façon complète, l'écart de revalidation structurelle du cœur natif relevé en section 2.3 (puisqu'il faudrait de toute façon descendre dans chaque élément de `versions` pour vérifier le statut).

**Inconvénients.** Contredit frontalement un choix de conception déjà documenté et récemment renforcé auprès de l'utilisateur (texte d'aide C15-04, livré et non remis en cause depuis) : « le statut est une valeur libre ». Un tel revirement doit être assumé explicitement par un arbitrage humain, pas déduit d'une lecture de code. Impact potentiellement rétroactif sur des données existantes portant déjà un statut hors des quatre valeurs (migration ou tolérance des entrées historiques à prévoir). Développement le plus lourd des trois options : UI (remplacement du textarea libre par un sous-formulaire structuré ou une contrainte de saisie), Rust (extension de `valider_entree_regles_dependances`), tests des deux côtés, mise à jour de RG-022 et du texte d'aide C15-04. Réduit l'extensibilité aujourd'hui permise par un statut personnalisé.

**Impact code/documentation.** `referentiels-parametrage.component.ts`/`.html`, `statut-obsolescence.utils.ts` (le type `ResultatObsolescence.statut: string` resterait probablement une chaîne côté restitution, mais la saisie serait contrainte en amont), `persistance/parametrage.rs` (`valider_entree_regles_dependances` étendue), tests Rust et Angular correspondants, mise à jour de RG-022 (voire nouvelle RG dédiée) et du texte d'aide.

### Option 4 — Combler uniquement l'écart de revalidation structurelle côté cœur natif (section 2.3), indépendamment du sort de la question des quatre statuts

**Principe.** Option complémentaire, cumulable avec l'option 1 ou l'option 2 : étendre `valider_entree_regles_dependances` pour vérifier que chaque élément de `versions` est un objet portant des champs `motifVersion` et `statut` non vides (sans imposer de liste fermée de valeurs pour `statut`), afin de rendre la revalidation cœur natif conforme à la norme de sécurité citée en section 2.3, sans rouvrir le débat sur le caractère libre ou fermé du statut lui-même.

**Avantages.** Corrige un véritable écart de conformité à `.claude/rules/10-normes-securite.md` identifié indépendamment de la question du statut inconnu, avec un effort de développement réduit (quelques lignes dans `valider_entree_regles_dependances`, sur le modèle déjà présent dans `lire_champ_chaine_non_vide`), sans remettre en cause le choix déjà documenté du statut libre. Peut être combinée avec l'option 1 (statu quo sur la question du statut) ou l'option 2 (avertissement UI) sans les contredire.

**Inconvénients.** Ne répond pas, à elle seule, à la question initiale de C15-11 sur le statut inconnu (elle porte sur la structure des éléments, pas sur la valeur du champ `statut`) ; peut être perçue comme hors périmètre strict de C15-11 si l'arbitrage souhaite le traiter comme un point de sécurité séparé plutôt que comme faisant partie de la clôture de ce point de recette.

**Impact code/documentation.** `persistance/parametrage.rs` uniquement côté code (extension ciblée, tests Rust associés) ; documentation à mettre à jour selon que ce correctif est rattaché à C15-11 ou consigné comme un point de sécurité distinct dans le plan.

## 4. Questions ouvertes nécessitant un arbitrage humain

1. Le comportement actuel (statut libre, non signalé, documenté depuis C15-04) doit-il être confirmé comme la conception définitive (option 1), ou un avertissement doit-il être ajouté pour réduire le risque de faute de frappe silencieuse (option 2) ?
2. Si un avertissement est retenu (option 2), à quel moment doit-il se déclencher : à chaque frappe/perte de focus sur le champ, ou seulement au clic sur ENREGISTRER, comme les deux contrôles bloquants déjà en place dans ce même formulaire ?
3. Si un avertissement est retenu, la comparaison entre le statut saisi et les quatre valeurs connues doit-elle être strictement sensible à la casse (`Obsolete` déclenche l'avertissement) ou tolérante ?
4. Le champ `statut` doit-il, à terme, rester extensible (valeur libre au-delà des quatre couleurs codées en dur), ou une organisation utilisatrice a-t-elle un besoin réel justifiant l'option 3 (liste fermée, rupture de conception, cf. C15-12 qui présuppose également un statut `obsolete` parmi d'autres valeurs implicitement acceptées) ?
5. L'écart de revalidation structurelle du cœur natif identifié en section 2.3 (absence de tout contrôle des éléments de `versions`, hors question du statut) doit-il être traité comme faisant partie de la clôture de C15-11, ou consigné comme un point de sécurité distinct dans le plan, à qualifier séparément ?
6. Si l'option 4 est retenue seule (sans option 2 ni 3), le durcissement de `valider_entree_regles_dependances` doit-il également couvrir la voie d'import de configuration (`persistance::configuration_partageable::calculer_differentiel`, qui réutilise `valider_entree_regles_dependances` telle quelle, cf. commentaire de tête de cette fonction) — ce qui semble être le cas mécaniquement du fait de la réutilisation directe de la même fonction, mais mérite confirmation explicite avant développement.

## 5. Proposition d'identifiants US/RG provisoires (mise à jour après arbitrage)

Arbitrage humain rendu le 2026-08-18 : **option 2 retenue** (avertissement non bloquant côté interface, déclenché au clic sur ENREGISTRER, comparaison sensible à la casse), combinée à l'**option 4** (l'écart de revalidation structurelle côté cœur natif des éléments de `versions` est traité dans le cadre de la clôture de ce même point, plutôt que consigné à part).

Numérotation coordonnée avec les cinq autres points `C15-NN` de cette même phase pour éviter toute collision d'identifiant entre les propositions initiales, chacune calculée indépendamment à partir du seul dernier identifiant connu au moment de sa rédaction (`US-044`/`RG-041`) — cf. `docs/03_plan/analyse_C15-10.md`, qui a consommé le premier identifiant disponible (`RG-042`) dans l'ordre de traitement retenu.

- **RG-043** (provisoire), rattachée à `US-033` existante (pas de nouvelle US) : avertissement non bloquant sur un statut de borne de version hors des quatre valeurs reconnues (`obsolete`, `maintenu`, `aJourM1`, `aJourM3`), comparaison sensible à la casse, déclenché au clic sur ENREGISTRER ; complétée de la clause de revalidation structurelle côté cœur natif des éléments de `versions` (présence/type de `motifVersion`/`statut`), sur le modèle de RG-037/RG-032 déjà rattachées à une US existante sans création d'US dédiée.

Cette numérotation reste une proposition provisoire à confirmer au moment de la qualification documentaire effective.
