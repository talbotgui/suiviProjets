<!-- Document rédigé avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par docs/02_documentation/01_modalitesUsageEtConventions.md. Plan de conception établi à partir d'une demande utilisateur explicite (2026-09-08) ; il précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. -->

# Conception — Membres connus, dates calendaires et gestion transverse des audits

## Statut du document

Ce plan couvre quatre sujets indépendants. Trois sont des corrections issues de l'exploitation de la livraison `plan_18_datePriseEnCharge.md` : le tri alphabétique de la liste des règles de membres connus d'un groupe (Partie A), la correction de l'affichage de la date de départ `partiLe` (Partie B), qui affiche actuellement `31/08/2026` pour une saisie `01/09/2026` sur le poste de l'utilisateur, et la correction du message trompeur « aucun membre interne qualifié pour ce groupe » affiché par la Fiche projet alors que des membres internes sont bel et bien qualifiés (Partie C). Le quatrième est une évolution fonctionnelle : visualiser, tous projets confondus, la liste des audits et en supprimer de façon ciblée selon leur date ciblée et leur date de réalisation / création — objectif initial, retirer les audits produits par des versions antérieures de l'application (Partie D).

Le regroupement de ces sujets sans lien direct dans un même document résulte d'une demande explicite de l'utilisateur (Partie D ajoutée le 2026-09-08), sur le même principe que `plan_16_navigationFiltrageEtVues.md` et `plan_17_metriquesVolumetrie.md`. Comme ces deux plans et `plan_18_datePriseEnCharge.md`, ce fichier est une exception à la règle générale (les évolutions postérieures à la Phase 15 sont normalement tracées sous forme d'entrées « Étape N » du [rapport de développement](../04_rapports/rapportDeDeveloppement.md)) : son emplacement et son nom restent à ajuster si besoin. Le numéro `plan_19` est laissé libre : il est réservé par [plan_18 §14](./plan_18_datePriseEnCharge.md) à l'audit d'accès des membres partis.

Statut : ce plan précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. La méthode du projet s'applique : arbitrage humain, puis mise à jour des documents normatifs, puis développement, sans passage à l'étape suivante sans validation explicite de la précédente.

## Sommaire

1. [Objet](#1-objet)
2. [Décisions](#2-décisions)
3. [Périmètre et identifiants d'exigence](#3-périmètre-et-identifiants-dexigence)
4. [Partie A — Tri alphabétique des membres connus d'un groupe](#4-partie-a--tri-alphabétique-des-membres-connus-dun-groupe)
5. [Partie B — Affichage des dates calendaires (date de départ `partiLe`)](#5-partie-b--affichage-des-dates-calendaires-date-de-départ-partile)
6. [Partie C — Message « aucun membre interne qualifié pour ce groupe » trompeur](#6-partie-c--message--aucun-membre-interne-qualifié-pour-ce-groupe--trompeur)
7. [Partie D — Liste transverse et suppression ciblée des audits](#7-partie-d--liste-transverse-et-suppression-ciblée-des-audits)
8. [Impacts sur le modèle de données et migration](#8-impacts-sur-le-modèle-de-données-et-migration)
9. [Impacts documentaires](#9-impacts-documentaires)
10. [Impacts sur les tests](#10-impacts-sur-les-tests)
11. [Découpage en incréments](#11-découpage-en-incréments)
12. [Vérification de bout en bout](#12-vérification-de-bout-en-bout)
13. [Points restant ouverts](#13-points-restant-ouverts)

## 1. Objet

Trois anomalies constatées à l'usage et une évolution fonctionnelle, sur le périmètre « membres connus » / Fiche projet :

- **Tri.** La liste des règles de membres connus d'un groupe est affichée dans l'ordre d'insertion (`SqmMembresConnusAdminComponent.membresConnus()` renvoie `groupe.membresConnus` sans tri, [`membres-connus-admin.component.ts:289`](../../src/app/ecrans/administration/groupes/membres-connus/membres-connus-admin.component.ts#L289)). Sur un groupe comptant plusieurs dizaines de règles (jusqu'à 33 contributeurs constatés en pratique, cf. US-044), retrouver une règle donnée devient pénible. La liste doit être triée alphabétiquement.
- **Date de départ.** La mention `· parti le JJ/MM/AAAA` d'une règle portant `partiLe` (RG-061, US-061) affiche `31/08/2026` pour une valeur stockée `2026-09-01`. La cause est identifiée (§5.1) : la correction R18-W-09 du 2026-09-07 (`date:'dd/MM/yyyy':'UTC'`, commit `d97d3c9`) est **incorrecte** et a introduit le décalage pour tout utilisateur situé à l'est de UTC — la relecture s'étant déroulée en conteneur réglé sur UTC, le défaut n'y était pas visible.
- **Message de prise en charge trompeur.** La métadonnée « Âge chez nous » de la Fiche projet affiche « aucun membre interne qualifié pour ce groupe » (statut `aucune_regle_interne`) alors que le groupe de rattachement du projet compte plus de 70 règles de membre connu de statut `interne`. La cause est identifiée (§6.1) : le cœur natif renvoie `AucuneRegleInterne` dès que la table de correspondance est vide (`CorrespondanceInterne::est_vide`), ce qui recouvre non seulement l'absence de règle `interne`, mais aussi le cas — fréquent — où toutes les règles `interne` sont de type `username` sans `aliasEmail`, donc inexploitables pour comparer un courriel d'auteur de commit. Le libellé affiché ne dit alors pas la vérité et laisse l'utilisateur sans piste d'action. Correctif : désambiguïsation du libellé à l'affichage (option b, décision 7), sans modification du cœur natif ni du schéma, et **précision de RG-058** sur la portée exacte du statut `aucune_regle_interne`.
- **Gestion transverse des audits (évolution).** Il n'existe aujourd'hui aucun écran présentant la liste des audits, ni aucun moyen d'en supprimer de façon ciblée. La seule suppression possible est la purge globale par densité ou par âge (F19, [US-025](../02_documentation/04_casUsage.md#cas-dusage--user-stories), [RG-024](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation) / [RG-025](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation)), déclenchée depuis le Paramétrage et pilotée par des règles d'âge / densité, sans sélection explicite. **Objectif initial** : retirer en masse les audits produits par des versions antérieures de l'application (repérables par leur date de réalisation / création). Plus généralement, l'utilisateur a besoin de voir, **tous projets confondus**, les audits — groupe, projet, type, **date ciblée**, **date de réalisation / création**, campagne d'origine — de les filtrer par ces dates et d'en supprimer une sélection.

Les trois corrections (Parties A à C) sont sans lien fonctionnel entre elles ; la Partie D est une évolution distincte. L'ensemble est regroupé sur demande explicite de l'utilisateur, tous les sujets touchant le périmètre « membres connus » / Fiche projet.

## 2. Décisions

1. **Clé de tri : libellé sinon critère, insensible à la casse et aux accents (arbitrage utilisateur du 2026-09-08).** Le tri porte sur `libelle` lorsqu'il est renseigné et non vide, sinon sur `critere`. Comparaison `localeCompare` en locale française, `sensitivity: 'base'` (insensible à la casse et aux accents). Départage déterministe des ex æquo : `critere`, puis `id`.
2. **Tri d'affichage uniquement.** L'ordre des règles stocké dans le fichier de données n'est pas modifié : `membresConnus()` reste une vue calculée à la volée, aucune écriture n'est déclenchée par ce plan pour le tri.
3. **Périmètre du tri : le seul sous-onglet « Membres connus » de l'écran Administration (arbitrage utilisateur du 2026-09-08).** Les autres restitutions de membres (sections de la Fiche projet, modale de saisie en masse) conservent leur ordre actuel.
4. **Une date calendaire ne transite jamais par `Date` ni par `DatePipe`.** Une valeur de type « date calendaire » (`AAAA-MM-JJ`, sans composante horaire ni fuseau : `partiLe`, `premierCommitInterne.date`, `premierCommitInterne.calculeLe`, `date` d'un audit historique) est mise en forme par simple manipulation de chaîne. Cette règle est ajoutée aux normes de développement (§9). `DatePipe` et `new Date(...)` restent réservés aux horodatages instantanés complets (suffixe `Z`).
5. **Correctif de `partiLe` porté par un utilitaire pur partagé.** Introduction d'une classe à membres statiques `DateCalendaireUtils` (norme « aucune fonction hors classe ») exposant `formaterFr(dateIso: string): string` (`'2026-09-01'` → `'01/09/2026'`) et `estDateCalendaire(valeur: string): boolean`. La correction R18-W-09 (`:'UTC'` sur la ligne 220 du gabarit) est remplacée par un appel à cet utilitaire ; l'entrée correspondante de `plan_18_relecture.md` et du rapport de développement est corrigée pour acter que R18-W-09 était une correction erronée.
6. **Recensement et alignement des autres helpers de date.** Les méthodes `formaterDateCourte` / `formaterDate` dupliquées dans `SqmFicheProjetComponent`, `SqmComparaisonAuditsComponent`, `SqmSyntheseAuditsComponent`, `SqmRechercheTransversaleComponent` et `SqmGraphiqueEvolutionComponent` (toutes de la forme `new Date(dateIso)` puis accesseurs locaux, cf. commentaire déjà présent dans [`horodatage.utils.ts`](../../src/app/services/sansetat/jugement/horodatage.utils.ts#L19)) portent le défaut miroir : un décalage d'un jour pour un utilisateur situé à l'ouest de UTC lorsque `dateIso` est une date calendaire (date d'audit historique, `premierCommitInterne.date`). **Décision à acter** : ces helpers sont soit factorisés sur `DateCalendaireUtils` (cas d'une entrée strictement calendaire), soit conservés tels quels avec un commentaire explicite lorsqu'ils traitent un horodatage complet. Le détail par point d'appel est arrêté à l'implémentation (§5.3), aucune valeur n'est codée d'avance.
7. **Désambiguïsation à l'affichage, sans changement de schéma — option (b) retenue (arbitrage utilisateur du 2026-09-08).** Le cœur natif continue de renvoyer le statut `aucune_regle_interne` dans les deux cas (aucune règle `interne` ; règles `interne` présentes mais toutes de type `username` sans `aliasEmail`, donc sans canal exploitable). Les **six statuts sont inchangés**, aucune variante d'`enum`, aucun palier de migration. La Fiche projet lève l'ambiguïté à l'affichage : elle dispose déjà de `groupe.membresConnus` pour compter les règles `interne` et celles portant un canal courriel exploitable. L'option (a) envisagée un temps (nouvelle variante `AucuneRegleInterneExploitable` côté cœur natif, visible aussi en campagne / journal) est **écartée** : coût de migration disproportionné pour un besoin d'information porté par le seul écran de consultation.
8. **Message d'aide actionnable.** Lorsque des règles `interne` existent mais qu'aucune n'est exploitable pour la datation, la métadonnée « Âge chez nous » affiche un libellé explicite invitant à l'action, à la place de « aucun membre interne qualifié pour ce groupe » : « N membres internes qualifiés, mais uniquement par identifiant de connexion : renseignez un alias courriel sur ces règles, ou ajoutez une règle de courriel ou de domaine, pour permettre la datation ». Cohérent avec le message d'aide de la case à cocher du formulaire de campagne (plan_18 §2 décision 9). Ce point est **documenté dans les documents normatifs** : RG-058 (sémantique du statut `aucune_regle_interne`), `09_maquettes.md` (libellés de « Âge chez nous »), `guide-utilisateur.md` (section « Date de prise en charge »), `Specification.md` §5.17 (liste des statuts) et `04_casUsage.md` (US-017).
9. **Alignement du bouchon TypeScript.** Le bouchon (`bouchon-administration.utils.ts`) compte aujourd'hui toute règle `interne` (quel que soit son type) et renverrait donc `determine` là où le cœur natif renvoie `aucune_regle_interne` : il doit reproduire la règle réelle (présence d'au moins un canal courriel exact, alias ou domaine) pour que les tests et le parcours E2E puissent exercer ce cas.

### Partie D — décisions actées (arbitrages utilisateur du 2026-09-08)

Le besoin est **transverse à tous les projets**. Objectif initial : supprimer en masse les audits produits par des versions antérieures de l'application, repérés par leur **date de réalisation / création**. La fonction reste utile ensuite pour tout retrait ciblé d'audits (date ciblée erronée, campagne à rejouer).

10. **Emplacement : Paramétrage, à côté de « Purge des audits ».** La fonction vit dans l'onglet Paramétrage « Purge des audits » (F19), qui traite déjà du retrait transverse d'audits pour la maîtrise de la volumétrie. Sous-décision d'implémentation (non bloquante) : une nouvelle **section « Suppression ciblée »** au sein de cet onglet, ou un onglet distinct `suppressionAudits` — à trancher à l'implémentation.
11. **Modèle : liste filtrée transverse + cases à cocher + « tout sélectionner le résultat ».** La liste couvre **les audits de tous les projets de tous les groupes**, colonnes : groupe, projet, type (régulier / historique), **date ciblée**, **date de réalisation / création**, campagne, nombre d'indicateurs. Filtres : plage de date de réalisation / création (filtre primaire pour l'objectif « versions antérieures »), plage de date ciblée, groupe, projet, type. La liste filtrée s'affiche avec une case par ligne et un bouton « tout cocher le résultat filtré ». Une **prévisualisation du volume** (« N audits sur M projets, X Mo → Y Mo », sur le modèle de `PrevisualisationPurge`) précède la confirmation. La suppression porte toujours sur la sélection cochée, jamais sur un critère implicite.
12. **Aucune protection du premier / dernier audit, avertissement récapitulatif.** Contrairement à la purge par densité ([RG-024](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation), qui conserve toujours le premier et le dernier audit de chaque projet), la suppression ciblée peut retirer n'importe quel audit — y compris le seul restant d'un projet (indispensable : un audit d'ancienne version peut être le seul du projet). Le récapitulatif de confirmation liste explicitement **les projets qui se retrouveraient sans aucun audit** et, le cas échéant, la perte d'un repère « prise en charge » (plan_18 RG-059).
13. **Identification des audits « version antérieure » : date butoir de réalisation / création.** L'utilisateur fixe une date butoir (mise en service de la version corrigée) ; tout audit dont la date de réalisation / création est antérieure est candidat. La **date de réalisation / création** d'un audit est `dateExecution` s'il est renseigné (audit historique), sinon `date` (audit régulier, où les deux coïncident). Aucun marqueur de version n'est ajouté au modèle : la fonction opère sur les données existantes.
14. **Aucune modification du schéma de données.** La suppression retire des entrées de `Projet.audits` ; les `Campagne` de la racine, les `Annotation` et le journal ne sont pas modifiés au-delà de l'entrée récapitulative (une campagne peut rester sans audit associé, comme aujourd'hui après une purge). `VERSION_SCHEMA_COURANTE` inchangée, aucun palier de migration.

## 3. Périmètre et identifiants d'exigence

Les Parties A à C sont des amendements de critères d'acceptation d'exigences existantes, sans nouvel identifiant ni changement de schéma. La Partie D introduit **un** nouvel `US` et **une** nouvelle `RG` (Mutation).

| exigence | nature |
|---|---|
| US-023 (Gérer la liste des membres connus d'un groupe) | amendement : la liste des règles est affichée triée par `libelle` (à défaut `critere`), insensible à la casse et aux accents |
| US-061 (Renseigner la date de départ `partiLe` d'un membre connu) | amendement : le critère « mention discrète `· parti le JJ/MM/AAAA` » est confirmé ; la date est affichée sans conversion de fuseau (date calendaire) |
| US-017 (Consulter la fiche détaillée d'un projet) | amendement : lorsque des règles `interne` existent mais qu'aucune n'est exploitable pour la datation (toutes de type `username` sans alias courriel), la métadonnée « Âge chez nous » le dit explicitement et invite à l'action, au lieu de « aucun membre interne qualifié pour ce groupe » |
| RG-058 | amendement : le statut `aucune_regle_interne` recouvre **à la fois** l'absence totale de règle `interne` et la présence de règles `interne` toutes inexploitables (type `username` sans `aliasEmail`) ; la Fiche projet distingue ces deux situations **à l'affichage** pour produire, dans le second cas, un libellé actionnable |
| RG-061 | amendement : `partiLe` est une date calendaire, restituée telle quelle sans interprétation de fuseau horaire |
| [`14_normesDeveloppement.md`](../02_documentation/14_normesDeveloppement.md) | amendement : nouvelle règle de qualité de code — une date calendaire (`AAAA-MM-JJ`) n'est jamais mise en forme via `Date` / `DatePipe` |
| US-063 (proposé) | **Consulter la liste transverse des audits et en supprimer de façon ciblée.** En tant que Camille, je veux voir, tous projets confondus, les audits avec leur groupe, leur projet, leur type, leur date ciblée et leur date de réalisation / création, filtrer par plage de dates, groupe, projet ou type, et supprimer la sélection — afin notamment de retirer en masse les audits produits par des versions antérieures de l'application. Mutation — Should have |
| RG-063 (proposé) | **Suppression ciblée d'audits (transverse).** Depuis l'onglet Paramétrage « Purge des audits », l'utilisateur affiche la liste des audits de tous les projets, la restreint par filtres (plage de date de réalisation / création, plage de date ciblée, groupe, projet, type), coche des lignes (ou « tout le résultat filtré »), obtient une prévisualisation du volume, puis supprime après confirmation et ressaisie du mot de passe du fichier ([RG-002](../02_documentation/05_reglesGestion.md#stockage-et-confidentialité-des-données)). La date de réalisation / création est `dateExecution` si renseigné, sinon `date`. L'opération retire les audits de `Projet.audits` de chaque projet concerné, produit **une** entrée de journal récapitulative ([RG-023](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation)) et une sauvegarde chiffrée avec rotation des sauvegardes de sécurité ([RG-003](../02_documentation/05_reglesGestion.md#stockage-et-confidentialité-des-données)). Contrairement à la purge par densité ([RG-024](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation)), elle n'impose aucune conservation du premier ou du dernier audit ; le récapitulatif de confirmation signale les projets qui se retrouveraient sans aucun audit. Elle ne modifie ni les `Campagne`, ni les annotations, ni le journal au-delà de l'entrée récapitulative. règle de gestion |

Les numéros `US-063` / `RG-063` sont **à reconfirmer au moment de la qualification** (croiser avec `plan_16` Étape 25 et `plan_17` chapitres 3 à 5 non intégrés — cf. même précaution que `plan_18` §3) ; en cas de collision, décaler en bloc sans réintroduire de trou.

## 4. Partie A — Tri alphabétique des membres connus d'un groupe

### 4.1 État actuel

[`membres-connus-admin.component.ts:289`](../../src/app/ecrans/administration/groupes/membres-connus/membres-connus-admin.component.ts#L289) :

```ts
public membresConnus(): readonly MembreConnu[] {
  return (
    this.groupes().find((groupe) => groupe.id === this.groupeSelectionneId)?.membresConnus ?? []
  );
}
```

La méthode est appelée dans le gabarit par `@for (regle of membresConnus(); track regle.id)`. Elle est réévaluée à chaque cycle de détection de changement (application zoneless, `this.groupes()` est un signal) : le tri peut y être ajouté sans introduire de signal dérivé, `groupeSelectionneId` n'étant pas un signal (le même patron de méthode-vue est déjà en place ailleurs dans le composant).

Les autres accès à la liste (`estEnConflit`, présélection depuis un paramètre de requête, `ouvrirEdition`) opèrent par `id` et sont insensibles à l'ordre.

### 4.2 Règle de tri

- clé primaire : `regle.libelle?.trim()` si non vide, sinon `regle.critere` ;
- comparaison : `cleA.localeCompare(cleB, 'fr', { sensitivity: 'base' })` ;
- départage : à égalité, comparer `critere` (même `localeCompare`), puis `id` (comparaison binaire) pour un ordre totalement déterministe ;
- le tableau source n'est jamais muté (`readonly`, issu du signal d'état) : `[...membres].sort(comparateur)`.

Extraction du comparateur dans une petite méthode privée `private comparerRegles(a: MembreConnu, b: MembreConnu): number` documentée (JSDoc, type de retour explicite), ou dans `DateCalendaireUtils`… non : hors sujet, le comparateur reste local au composant (aucun autre consommateur, cf. décision 3).

### 4.3 Implémentation

```ts
public membresConnus(): readonly MembreConnu[] {
  const membres =
    this.groupes().find((groupe) => groupe.id === this.groupeSelectionneId)?.membresConnus ?? [];
  return [...membres].sort((a, b) => this.comparerRegles(a, b));
}
```

`comparerRegles` : voir §4.2. Aucun `any`, visibilité explicite, JSDoc obligatoire.

### 4.4 Tests

`membres-connus-admin.component.spec.ts` (Jest) :

- trois règles saisies dans un ordre volontairement non alphabétique (`« marie »`, `« Élodie »`, `alias sans libellé`) → l'ordre rendu est `Élodie`, `marie`, puis la règle sans libellé triée sur son `critere`, avec vérification de l'insensibilité aux accents et à la casse ;
- deux règles de même libellé → départage stable et déterministe sur `critere` ;
- le tri n'altère pas la détection de conflit (`estEnConflit`) ni l'ouverture en édition de la bonne règle après changement d'ordre.

## 5. Partie B — Affichage des dates calendaires (date de départ `partiLe`)

### 5.1 Diagnostic

`partiLe` est stockée en date calendaire `AAAA-MM-JJ` (RG-061), sans composante horaire ni fuseau. Le gabarit la rend par :

```html
· parti le {{ regle.partiLe | date: 'dd/MM/yyyy' : 'UTC' }}
```

`DatePipe`, sur une chaîne ISO **sans partie horaire ni fuseau**, construit la date via les accesseurs **locaux** (`isoStringToDate` d'Angular : le groupe de capture du fuseau est absent, donc `setFullYear` / `setHours` locaux, et non `setUTCFullYear` / `setUTCHours`). L'instant obtenu est donc « minuit, heure locale » du poste. Le paramètre `:'UTC'` reconvertit ensuite cet instant absolu vers UTC : pour un poste à l'est de UTC (France : UTC+1 en hiver, UTC+2 en été), minuit local est la veille en UTC, d'où `31/08/2026` pour `2026-09-01`.

La correction R18-W-09 (`:'UTC'`) est donc à l'origine du symptôme observé. Sans ce paramètre, le défaut se manifesterait en sens inverse (recul d'un jour) pour un poste à l'ouest de UTC. Aucune combinaison de paramètres de `DatePipe` ne restitue correctement une date calendaire indépendante du fuseau : il faut ne pas passer par `Date`.

### 5.2 Correctif retenu

Nouvel utilitaire pur `src/app/services/sansetat/jugement/date-calendaire.utils.ts` (colocation pragmatique, sur le modèle de [`horodatage.utils.ts`](../../src/app/services/sansetat/jugement/horodatage.utils.ts) et `changement-seuil.utils.ts`), en-tête de mention IA, classe `DateCalendaireUtils` à membres statiques uniquement :

```ts
/** Met en forme une date calendaire ISO `AAAA-MM-JJ` en `JJ/MM/AAAA`, sans aucune interprétation de fuseau. */
public static formaterFr(dateIso: string): string {
  const correspondance = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  if (correspondance === null) {
    return dateIso; // valeur inattendue restituée telle quelle, jamais une exception d'affichage
  }
  const [, annee, mois, jour] = correspondance;
  return `${jour}/${mois}/${annee}`;
}
```

Gabarit `membres-connus-admin.component.html` : suppression du `DatePipe` sur cette ligne (et de l'import `DatePipe` s'il n'a plus d'autre usage dans le composant), remplacement par un appel à `DateCalendaireUtils.formaterFr(regle.partiLe)` exposé via une méthode du composant ou un `Pipe` pur dédié `dateCalendaire` (à trancher à l'implémentation ; un `Pipe` est réutilisable et testable isolément, une méthode est plus légère — décision arbitraire à valider).

### 5.3 Recensement des points d'appel

À traiter dans le même incrément, sur la base de la décision 6 :

| emplacement | entrée | traitement |
|---|---|---|
| `membres-connus-admin.component.html:220` | `partiLe` (calendaire) | `DateCalendaireUtils.formaterFr` |
| `fiche-projet.component.ts` `formaterDateCourte` | `audit.date` (horodatage régulier **ou** date calendaire d'audit historique), `premierCommitInterne.date` (calendaire) | scinder : `DateCalendaireUtils` pour l'entrée calendaire ; conserver `new Date` + commentaire pour l'horodatage complet |
| `comparaison-audits.component.ts` `formaterDateCourte` | `audit.date` | idem |
| `synthese-audits.component.ts` `formaterDate` | `audit.date` | idem |
| `recherche-transversale.component.ts` `formaterDate` | `dateIso` d'occurrences historiques | idem, format `JJ/MM/AAAA` déjà attendu |
| `graphique-evolution.component.ts` `formaterDateCourte` | `epochMs` (nombre, pas une chaîne) | hors périmètre : entrée numérique déjà non ambiguë, à confirmer |
| `accueil.component.html:85` | `traitement.horodatage` (horodatage complet `Z`) | inchangé, `DatePipe` légitime sur un horodatage instantané |

Le commentaire de `horodatage.utils.ts` acte déjà la duplication des `formaterDateCourte` ; ce plan la réduit sans nécessairement fusionner les cinq méthodes en une (la factorisation complète reste un point ouvert, §13).

### 5.4 Tests

`date-calendaire.utils.spec.ts` (Jest, Moteur de jugement, seuil 90 %) :

- `formaterFr('2026-09-01')` → `'01/09/2026'` ; `formaterFr('2026-12-31')` → `'31/12/2026'` ;
- **indépendance au fuseau** : le même appel exécuté sous `process.env.TZ` réglé successivement sur `'Etc/UTC'`, `'Europe/Paris'` et `'America/New_York'` (via `beforeAll` du fichier de test, V8 relit `TZ` dynamiquement) donne un résultat identique ; à défaut de portabilité de `TZ`, la seule absence de construction de `Date` dans l'implémentation suffit à garantir l'invariance et est vérifiée par lecture ;
- entrée non conforme (`'2026-9-1'`, `''`, horodatage complet) restituée telle quelle sans exception.

`membres-connus-admin.component.spec.ts` : une règle avec `partiLe: '2026-09-01'` affiche `· parti le 01/09/2026` (test qui échoue sur le code actuel dans un fuseau non-UTC, garde de non-régression du présent plan).

Non-régression des helpers factorisés : conserver au moins un test par écran concerné vérifiant l'affichage d'une date d'audit historique calendaire.

## 6. Partie C — Message « aucun membre interne qualifié pour ce groupe » trompeur

### 6.1 Diagnostic

Le projet appartient à **un seul** groupe dans le modèle de données (`donnees.groupes[].projets[]`). `calculer_prise_en_charge_projet` ([`commandes/prise_en_charge.rs:41`](../../src-tauri/src/commandes/prise_en_charge.rs#L41), `trouver_groupe_et_projet`) ne consulte que les `membresConnus` de ce groupe de rattachement ; la résolution du statut des membres affichés sur la Fiche projet en fait autant ([`fiche-projet.component.ts:1116`](../../src/app/ecrans/fiche-projet/fiche-projet.component.ts#L1116), `groupe.membresConnus`). Les catégories « nominatif direct », « membre d'un groupe invité », « hérité de l'arborescence » décrivent le **mode d'accès GitLab** au dépôt, pas le groupe applicatif qui porte la règle de qualification : les 70 membres `interne` que voit l'utilisateur sont donc bien résolus contre le groupe de rattachement du projet, qui porte bien ces règles.

`construire_correspondance_interne` ([`persistance/prise_en_charge.rs:120`](../../src-tauri/src/persistance/prise_en_charge.rs#L120)) ne retient d'une règle `interne` que trois canaux comparables au courriel d'auteur d'un commit : courriel exact (`typeCritere == email`), domaine (`typeCritere == domaineEmail`), alias courriel (`aliasEmail` d'une règle `username`). Une règle `interne` de type `username` **sans** `aliasEmail` n'alimente aucun canal (le login n'est pas exposé par l'API des commits — RG-058). `calculer_prise_en_charge` ([`persistance/prise_en_charge.rs:199`](../../src-tauri/src/persistance/prise_en_charge.rs#L199)) teste ensuite `correspondance.est_vide()` (aucun courriel, aucun alias, aucun domaine) et renvoie `StatutPremierCommit::AucuneRegleInterne`.

Le défaut : `est_vide()` est vrai aussi bien quand **aucune** règle `interne` n'existe que quand **toutes** les règles `interne` sont de type `username` sans alias (cas de l'utilisateur : 70 règles saisies depuis les membres GitLab, identifiés par leur login). RG-058 réserve pourtant `aucune_regle_interne` au premier cas (« si aucune règle de statut `interne` n'existe pour le groupe »). Le libellé de la Fiche projet (`construireAgeChezNousLabel`, [`fiche-projet.component.ts:1321`](../../src/app/ecrans/fiche-projet/fiche-projet.component.ts#L1321) : « aucun membre interne qualifié pour ce groupe ») est donc faux dans ce cas et ne donne aucune piste d'action.

À confirmer sur le fichier réel de l'utilisateur avant développement : que les règles `interne` du groupe de rattachement sont bien majoritairement de type `username` sans `aliasEmail` (hypothèse la plus probable), et non un cas de conflit de critère (RG-008) retirant chaque canal.

### 6.2 Correctif retenu — désambiguïsation à l'affichage (option b, arbitrage du 2026-09-08)

Le cœur natif est **inchangé** : `calculer_prise_en_charge` continue de renvoyer `aucune_regle_interne` quand `correspondance.est_vide()`, que ce soit faute de règle `interne` ou parce que toutes sont inexploitables. Les six statuts, l'`enum` `PremierCommitInterne` et le schéma de données ne bougent pas.

`SqmFicheProjetComponent.construireAgeChezNousLabel` reçoit deux décomptes, calculés côté interface à partir de `groupe.membresConnus` (aucun hash, aucune commande supplémentaire) :

- `nombreReglesInternes` : règles de `statut === 'interne'` ;
- `nombreReglesInternesExploitables` : parmi elles, celles portant un canal comparable à un courriel d'auteur de commit — `typeCritere ∈ { 'email', 'domaineEmail' }`, ou `aliasEmail` non vide (miroir exact de `construire_correspondance_interne`, RG-058).

Pour le statut `aucune_regle_interne`, le libellé devient :

- `nombreReglesInternes === 0` → « aucun membre interne qualifié pour ce groupe » (libellé actuel, correct) ;
- `nombreReglesInternes > 0` (donc `nombreReglesInternesExploitables === 0`, sinon le cœur natif n'aurait pas renvoyé ce statut) → « N membres internes qualifiés, mais uniquement par identifiant de connexion : renseignez un alias courriel sur ces règles, ou ajoutez une règle de courriel ou de domaine, pour permettre la datation » (décision 8), avec `N = nombreReglesInternes`.

Les libellés des cinq autres statuts sont inchangés.

Points connexes :

- **bouchon TypeScript aligné** (décision 9) : `bouchon-administration.utils.ts` `reglesInternes` (ou le test qui décide du statut) ne compte que les règles `interne` portant un canal exploitable, sans quoi le bouchon renvoie `determine` là où le cœur natif renvoie `aucune_regle_interne` ;
- **aucune modification de l'algorithme de datation** : une règle `username` sans alias reste, par conception (RG-058), sans effet sur la recherche du premier commit — ce plan ne fait que rendre la situation lisible ;
- **documentation normative mise à jour** pour ce point (cf. §9) : RG-058, `09_maquettes.md`, `guide-utilisateur.md`, `Specification.md` §5.17, `04_casUsage.md` (US-017), `13_conceptionDetaillee.md`.

### 6.3 Tests

- **Cœur natif (`cargo test`)** : non-régression — un groupe portant uniquement des règles `interne` de type `username` sans `aliasEmail` produit bien `AucuneRegleInterne` **sans appel réseau** (comportement conservé) ; un groupe avec au moins une règle `email` / `domaineEmail` ou un `aliasEmail` n'est pas concerné. `construire_correspondance_interne` : une règle `username` avec `aliasEmail` alimente bien le canal alias (à confirmer, cas a priori déjà couvert).
- **Interface (`npm test`, Jest)** : `fiche-projet.component.spec.ts` — les deux libellés du statut `aucune_regle_interne` selon `nombreReglesInternes` ; le libellé actionnable cite le décompte réel ; `nombreReglesInternesExploitables` calculé conformément à `construire_correspondance_interne` (règle `email`, `domaineEmail`, ou `username` avec alias → exploitable ; `username` sans alias → non).
- **Bouchon** : `bouchon-administration.utils.spec.ts` — un groupe de règles `interne` toutes `username` sans alias → `aucune_regle_interne`, jamais `determine`.

## 7. Partie D — Liste transverse et suppression ciblée des audits

### 7.1 Objectif et état actuel

**Objectif initial** : supprimer en masse les audits produits par des versions antérieures de l'application, repérés par leur date de réalisation / création (décision 13). La fonction sert ensuite à tout retrait ciblé (date ciblée erronée, campagne à rejouer).

- Modèle : `Projet.audits: Vec<Audit>` ([`racine.rs:891`](../../src-tauri/src/modele/racine.rs#L891)). Un `Audit` porte `id` (UUID v4), `date`, `campagneId`, `resultats`, `typeAudit` (`reguliere` par défaut, ou `historique`, C15-14) et `dateExecution` (`Option<String>`).
  - **audit régulier** : `date` est l'horodatage complet de la campagne qui l'a produit ; `dateExecution` est **absent** — date ciblée et date de réalisation coïncident ;
  - **audit historique** : `date` est la **date ciblée** demandée (`AAAA-MM-JJ`, date calendaire — cf. Partie B) ; `dateExecution` est l'**horodatage réel** de la campagne.
  - **date de réalisation / création** (au sens de la décision 13) = `dateExecution` si renseigné, sinon `date`.
  - Aucun champ de version d'application n'existe sur l'`Audit` : l'identification passe donc par la date, pas par un marqueur (décision 13).
- Les `Campagne` sont stockées à la racine (`DonneesRacine.campagnes`), un audit y renvoyant par `campagneId` ; une campagne couvre plusieurs projets. Aucune règle n'interdit une campagne sans audit associé (déjà le cas après une purge).
- Affichage actuel des audits : la Fiche projet montre la mini-liste des audits historiques et la métadonnée « dernier audit » ; la Synthèse graphique et la Comparaison d'audits consomment `audit.date`. **Aucun écran ne présente la liste transverse** (tous projets, réguliers + historiques) ni ne permet une suppression ciblée.
- Suppression existante : uniquement la **purge globale** par densité / âge (`persistance/purge.rs`, [US-025](../02_documentation/04_casUsage.md#cas-dusage--user-stories), RG-024 / RG-025), depuis l'onglet Paramétrage « Purge des audits ». Le helper interne `purger(racine, selectionner)` ([`purge.rs:203`](../../src-tauri/src/persistance/purge.rs#L203)) retire de chaque projet les audits d'un ensemble d'`id` et renvoie un `PrevisualisationPurge` (compteurs + tailles compressées avant/après) ; `consigner_purge` ([`purge.rs:242`](../../src-tauri/src/persistance/purge.rs#L242)) journalise l'opération ; `previsualiser_purge_densite` / `executer_purge_*` séparent prévisualisation et exécution. Ces briques sont **réutilisées** pour la suppression ciblée.

### 7.2 Emplacement (décision 10)

Onglet Paramétrage « Purge des audits » ([`parametrage.component.ts`](../../src/app/ecrans/parametrage/parametrage.component.ts), onglet `purge`, `SqmPurgeParametrageComponent`). Deux formes possibles, à trancher à l'implémentation : une nouvelle **section « Suppression ciblée »** sous la purge automatique existante, ou un **onglet distinct** `suppressionAudits` ajouté à `ONGLETS`. La première est privilégiée (même sujet, même écran, un seul point d'entrée « gérer mes audits »).

### 7.3 Liste transverse et sélection (décision 11)

Nouvel utilitaire de vue (Moteur de jugement, `services/sansetat/`) construisant, à partir de la racine, la liste `LigneAuditTransverse` — une ligne par audit, **tous groupes et projets confondus** :

- `auditId`, `projetId`, `groupeLabel`, `projetLabel`, `type` (« régulier » / « historique »), `dateCibleeLabel` (`DateCalendaireUtils.formaterFr(audit.date)` pour un historique, libellé court de l'horodatage pour un régulier — cf. Partie B), `dateRealisationLabel` (formaté depuis `dateExecution` ?? `date`), `dateRealisationTri` (clé de tri / filtre, chaîne ISO brute), `campagneLabel` (date de la `Campagne` d'`id` `campagneId`, `—` si introuvable), `nombreIndicateurs` (`resultats.length`) ;
- tri par défaut sur la date de réalisation / création décroissante ; colonnes triables ;
- **filtres** : plage de date de réalisation / création (deux champs `type="date"`, filtre primaire de l'objectif « versions antérieures »), plage de date ciblée, groupe, projet, type ;
- **sélection** : case à cocher par ligne + bouton « tout cocher le résultat filtré » / « tout décocher » ; compteur « N audits sélectionnés sur M projets » ;
- **prévisualisation** : avant confirmation, un appel de prévisualisation (§7.4) renvoie « N audits sur M projets, X → Y » (taille compressée) sur le modèle de `PrevisualisationPurge`, plus la **liste des projets qui se retrouveraient sans aucun audit** (décision 12).

Lecture seule : aucune commande de mutation, la liste et les filtres sont dérivés des données déjà en mémoire.

### 7.4 Suppression (décisions 12, 13, 14)

Deux commandes de la Façade, sur le modèle `previsualiser…` / `executer…` de la purge :

- `previsualiserSuppressionAudits(donnees, auditIds)` : commande de **consultation pure** (pas de `State<EtatSession>`, pas de mot de passe, pas d'écriture, journalisation technique début / fin), renvoie un `PrevisualisationSuppressionAudits` : `nbAudits`, `nbProjetsConcernes`, `octetsAvant`, `octetsApres`, `projetsVides` (identifiants et libellés des projets qui perdraient leur dernier audit) ;
- `supprimerAudits(auditIds, motDePasse, origine, etat)` : retire des `Projet.audits` de la racine tous les audits dont l'`id` figure dans `auditIds` (quel que soit leur projet — la fonction résout elle-même le rattachement), via le patron `retain` de `purger` ; **revalide** que chaque `id` existe réellement dans la racine (sinon `ErreurFacade` typée, [norme sécurité](../../.claude/rules/10-normes-securite.md#entrées-et-sorties)) ; consigne **une** entrée de journal récapitulative ([RG-023](../02_documentation/05_reglesGestion.md#seuils-référentiels-et-historisation), `consigner_purge` généralisé : « suppression ciblée de N audits sur M projets ») ; déclenche la sauvegarde chiffrée avec rotation des sauvegardes de sécurité ([RG-003](../02_documentation/05_reglesGestion.md#stockage-et-confidentialité-des-données)) ; journalisation technique début / fin obligatoire ([norme 09](../../.claude/rules/09-normes-developpement.md#qualité-de-code)).

Nouveau module cœur natif `persistance::suppression_audits` (ou fonctions ajoutées à `persistance::purge`), réutilisant `purger` et `taille_compressee`. Enregistrement des deux commandes dans `src-tauri/src/lib.rs`.

**Garde-fous** (décisions 12, 14) :

- **aucune conservation forcée** du premier / dernier audit : la suppression peut vider entièrement l'historique d'un projet ; le récapitulatif de prévisualisation (`projetsVides`) le signale explicitement et la confirmation UI le rappelle ;
- **ressaisie du mot de passe** (`app-confirmation-mot-de-passe`, [RG-002](../02_documentation/05_reglesGestion.md#stockage-et-confidentialité-des-données)) avant `supprimerAudits`, comme toute mutation écrivant le fichier ;
- **impacts en aval, non bloquants** : la Comparaison d'audits gère déjà l'absence d'un audit (« supprimé depuis ») ; la Synthèse graphique, la Synthèse des audits et la métadonnée « dernier audit » se recalculent depuis `projet.audits` ; les alertes sont recalculées depuis le dernier audit intégré (aucune donnée d'alerte stockée n'est invalidée, les annotations persistent) ; un repère « prise en charge » (plan_18 RG-059) redevient indisponible si l'audit correspondant est supprimé — déjà prévu ; les `Campagne` restent en place même sans audit associé (cf. §7.1).

### 7.5 Façade TS, bouchon et E2E

- Façade `sansetat/commandes/` : `previsualiserSuppressionAudits` et `supprimerAudits`, génériques sur le type de racine (frontière unique, [norme 09](../../.claude/rules/09-normes-developpement.md#structure-et-nommage)).
- Bouchon (`bouchon-parametrage.utils.ts`, cohérent avec la purge existante) : la prévisualisation renvoie un résumé calculé sur la racine bouchonnée ; `supprimerAudits` retire les audits ciblés et renvoie la racine mise à jour, avec le délai artificiel usuel des mutations.
- Le jeu de démonstration du bouchon doit comporter des audits sur plusieurs projets et de plusieurs dates de réalisation pour exercer les filtres et la liste des projets vidés.

### 7.6 Tests

- **Cœur natif (`cargo test`)** : `supprimer_audits` retire exactement les `id` fournis, dans les bons projets, et rien d'autre ; un `id` absent de la racine → `ErreurFacade`, aucune suppression ; **une** entrée de journal récapitulative ; les `Campagne` de la racine et les annotations sont inchangées ; suppression de tous les audits d'un projet → autorisée, projet listé dans `projetsVides` par la prévisualisation ; `previsualiserSuppressionAudits` ne modifie jamais la racine et calcule des tailles compressées avant / après cohérentes.
- **Interface (`npm test`, Jest)** : construction de `LigneAuditTransverse` (libellés date ciblée / date réalisation corrects pour un régulier et pour un historique ; campagne résolue ou `—`) ; filtres (plage de date de réalisation, plage de date ciblée, groupe, projet, type) et « tout cocher le résultat filtré » ; la prévisualisation affiche le décompte et la liste des projets qui se videraient ; le bouton déclenche la ressaisie du mot de passe ; annulation de la ressaisie → aucune commande de suppression émise.
- **E2E (`npm run test:e2e`)** : onglet Paramétrage « Purge des audits » → section « Suppression ciblée » → filtrer par date de réalisation antérieure à une date, « tout cocher le résultat filtré », prévisualiser, confirmer + mot de passe → les audits disparaissent de la liste, de la Synthèse des audits et de la Comparaison d'audits ; une entrée de journal est présente.

## 8. Impacts sur le modèle de données et migration

Néant. Aucune structure de données modifiée, aucun changement de forme du schéma, `VERSION_SCHEMA_COURANTE` inchangée, aucun palier de migration — pour les quatre parties. Partie C : l'option d'un statut dédié côté cœur natif a été explicitement écartée (décision 7) précisément pour éviter un palier de migration. Partie D : la suppression ne fait que retirer des entrées de `Projet.audits`, comme le fait déjà la purge (RG-024). `partiLe` reste `Option<String>` / `readonly partiLe?: string` au format `AAAA-MM-JJ`, inchangé.

## 9. Impacts documentaires

| document | modification |
|---|---|
| [`01_besoin/Specification.md`](../01_besoin/Specification.md) §5.17 | préciser la définition du statut `aucune_regle_interne` : « aucune règle `interne` **exploitable** — soit aucune règle `interne`, soit uniquement des règles de type `username` sans alias courriel ; aucun appel réseau », la Fiche projet distinguant les deux cas à l'affichage |
| [`02_documentation/04_casUsage.md`](../02_documentation/04_casUsage.md) | US-023 : critère d'acceptation complété (liste triée par `libelle` à défaut `critere`, insensible casse/accents) ; US-061 : préciser que `· parti le JJ/MM/AAAA` est affichée sans conversion de fuseau ; US-017 : la métadonnée « Âge chez nous », pour le statut `aucune_regle_interne`, affiche un libellé actionnable distinct lorsque des règles `interne` existent mais ne portent aucun canal courriel ; **ajouter US-063** (liste transverse des audits et suppression ciblée, depuis Paramétrage) ; compléter le critère d'acceptation d'US-025 (deux mécanismes de retrait d'audits : purge automatique et suppression ciblée) |
| [`02_documentation/05_reglesGestion.md`](../02_documentation/05_reglesGestion.md) | RG-061 : `partiLe` est une date calendaire restituée telle quelle, sans interprétation de fuseau ; RG-058 : le statut `aucune_regle_interne` recouvre **à la fois** l'absence de règle `interne` et la présence de règles `interne` toutes inexploitables (type `username` sans `aliasEmail`), la Fiche projet différenciant ces deux situations à l'affichage pour produire un libellé actionnable dans le second cas ; **ajouter RG-063** (suppression ciblée d'audits, transverse) rattachée à l'« Écran de paramétrage (purge) » ; compléter la ligne « Écran de paramétrage » de la matrice écran → RG |
| [`02_documentation/08_arborescenceNavigation.md`](../02_documentation/08_arborescenceNavigation.md) | mention du tri de la liste dans la description du sous-onglet « Membres connus » si cette granularité y figure ; Paramétrage > Purge des audits : ajouter la section (ou l'onglet) « Suppression ciblée » (liste transverse + filtres + suppression) et compléter la matrice écrans × US pour US-063 |
| [`02_documentation/09_maquettes.md`](../02_documentation/09_maquettes.md) | Administration > Membres connus : préciser « liste triée alphabétiquement » ; confirmer le format `JJ/MM/AAAA` de la mention de départ ; Fiche projet : le libellé du statut `aucune_regle_interne` de « Âge chez nous » est conditionnel (cf. Partie C) ; Paramétrage > Purge des audits : ajouter la section « Suppression ciblée » — liste transverse (colonnes groupe / projet / type / date ciblée / date de réalisation / campagne / nb indicateurs), filtres (plage de date de réalisation, plage de date ciblée, groupe, projet, type), « tout cocher le résultat filtré », prévisualisation (volume + projets qui se videraient), confirmation + mot de passe ; état particulier « aucun audit ne correspond aux filtres » |
| [`02_documentation/13_conceptionDetaillee.md`](../02_documentation/13_conceptionDetaillee.md) | Partie C : préciser la sémantique de `CorrespondanceInterne::est_vide` (vide = aucun canal exploitable, pas seulement aucune règle) et le libellé conditionnel de `construireAgeChezNousLabel` ; aucun changement de la Façade ni du schéma. Partie D : commandes `previsualiserSuppressionAudits` (consultation pure) et `supprimerAudits`, module `persistance::suppression_audits` (réutilisation de `purger` / `consigner_purge` / `taille_compressee`), utilitaire de vue `LigneAuditTransverse` ; matrice module → US pour US-063 / RG-063 |
| [`02_documentation/14_normesDeveloppement.md`](../02_documentation/14_normesDeveloppement.md) | nouvelle règle de qualité de code : une date calendaire (`AAAA-MM-JJ`) n'est jamais mise en forme via `Date` / `DatePipe` ; utilitaire dédié `DateCalendaireUtils` ; synchroniser [`.claude/rules/09-normes-developpement.md`](../../.claude/rules/09-normes-developpement.md) |
| [`02_documentation/16_normesTests.md`](../02_documentation/16_normesTests.md) | ajouter `DateCalendaireUtils` à la matrice de traçabilité (cas nominal, invariance au fuseau, entrée non conforme) ; cas « règles `interne` toutes `username` sans alias » → libellé actionnable (interface + bouchon), non-régression `AucuneRegleInterne` (cœur natif) ; `previsualiser_suppression_audits` / `supprimer_audits` (cœur natif : sélection exacte tous projets, `id` absent rejeté, journal unique, campagnes / annotations inchangées, projet vidé listé) et la section « Suppression ciblée » (interface + E2E) à la matrice |
| [`03_plan/plan_18_relecture.md`](./plan_18_relecture.md) et [`04_rapports/rapportDeDeveloppement.md`](../04_rapports/rapportDeDeveloppement.md) | acter que la correction R18-W-09 (`:'UTC'`) était erronée et est remplacée par le présent plan |
| [`guide-utilisateur.md`](../guide-utilisateur.md) | section « Date de prise en charge » : préciser que si des règles `interne` existent mais sont toutes définies par nom d'utilisateur seul (sans adresse ni domaine), la fiche le signale et invite à compléter la qualification ; ajouter un paragraphe « Supprimer des audits ciblés » dans la section Purge (Paramétrage) : liste transverse filtrable par date de réalisation / date ciblée / groupe / projet / type, sélection puis suppression avec prévisualisation et mot de passe, distincte de la purge automatique densité / âge, cas d'usage « retirer les audits d'anciennes versions » ; vérifier qu'aucune capture ne fige une liste de membres non triée ou une date de départ décalée |
| [`01_besoin/Specification.md`](../01_besoin/Specification.md) §5.19 (F19) | ajouter, à côté de la purge automatique par densité / âge, la **suppression ciblée** : liste transverse des audits (tous projets), filtrable par date de réalisation / création, date ciblée, groupe, projet, type ; sélection explicite ; prévisualisation du volume et des projets qui se retrouveraient sans audit ; aucune conservation forcée du premier / dernier audit ; objectif initial : retrait des audits produits par des versions antérieures de l'application |

La colonne « Specification.md §5.17 » ci-dessus concerne la Partie C ; la ligne §5.19 concerne la Partie D.

Le tableau ci-dessus est la spécification à appliquer à l'incrément 1. Le point de la Partie C (statut `aucune_regle_interne` et libellé conditionnel) a par ailleurs été **reporté immédiatement dans les documents normatifs** sur demande explicite de l'utilisateur (2026-09-08), avant validation d'ensemble du plan : `05_reglesGestion.md` (RG-058), `01_besoin/Specification.md` §5.17, `09_maquettes.md`, `04_casUsage.md` (US-017), `13_conceptionDetaillee.md`, `guide-utilisateur.md`. Les autres lignes du tableau (tri, dates calendaires, norme de développement, **Partie D**) restent à appliquer à l'incrément 1 après validation.

## 10. Impacts sur les tests

- **Interface (`npm test`, Jest)** : `date-calendaire.utils.spec.ts` (nouveau, §5.4) ; `membres-connus-admin.component.spec.ts` étendu (tri §4.4, affichage de `partiLe` §5.4) ; `fiche-projet.component.spec.ts` étendu (libellés de « Âge chez nous » selon le décompte de règles `interne` / exploitables §6.3) ; nouvel utilitaire `LigneAuditTransverse` et écran Paramétrage « Suppression ciblée » (construction de la liste, filtres, « tout cocher le résultat filtré », prévisualisation, confirmation + mot de passe, annulation §7.6) ; non-régression d'affichage de date d'audit historique sur les écrans dont le helper est factorisé.
- **Cœur natif (`cargo test`)** : Parties A et B sans impact ; Partie C — non-régression : un groupe dont toutes les règles `interne` sont de type `username` sans alias produit bien `AucuneRegleInterne` sans appel réseau (§6.3), le cœur natif n'étant pas modifié ; Partie D — `supprimer_audits` et `previsualiser_suppression_audits` (§7.6 : sélection exacte tous projets, `id` absent rejeté, entrée de journal unique récapitulative, `Campagne` et annotations inchangées, projet entièrement vidé autorisé et listé en prévisualisation, prévisualisation sans mutation).
- **Bouchon (`bouchon-parametrage.utils.spec.ts`)** : le décompte de règles `interne` exploitables est aligné sur `construire_correspondance_interne` (§6.2, `bouchon-administration.utils.spec.ts`) ; `previsualiserSuppressionAudits` / `supprimerAudits` retirent les audits ciblés de la racine bouchonnée (§7.5).
- **E2E (`npm run test:e2e`, Playwright)** : contrôle facultatif sur l'ordre de la liste des membres connus et le libellé « Âge chez nous » ; Paramétrage > Purge des audits > « Suppression ciblée » — filtrer par date de réalisation antérieure à une date, « tout cocher le résultat filtré », prévisualiser, confirmer + mot de passe, vérifier la disparition des audits de la Synthèse des audits et de la Comparaison d'audits (§7.6). À confirmer selon le coût.
- **Matrice de traçabilité** : vérification croisée refaite (règle générale n°13) — `DateCalendaireUtils`, le nouveau cas de prise en charge, `previsualiser_suppression_audits` et `supprimer_audits` couverts par au moins un test ; tests de charge — la liste transverse s'inscrit dans la volumétrie RNF-006 (le nombre d'audits est déjà borné par les mêmes règles que la purge), aucune exigence de performance chiffrée propre, exclusion à noter.

## 11. Découpage en incréments

1. **Documents normatifs** : amendements de `Specification.md` (§5.17, §5.19), `04_casUsage.md` (US-017, US-023, US-061, US-025, **US-063**), `05_reglesGestion.md` (RG-058, RG-061, **RG-063**), `08`, `09`, `13`, `14_normesDeveloppement.md` (+ règle `.claude/`), `16_normesTests.md`, `guide-utilisateur.md`, correction de `plan_18_relecture.md` / rapport (cf. tableau §9). Le sous-ensemble « Partie C » de ces amendements est déjà appliqué (§9). Validation humaine explicite du reste — dont les numéros US-063 / RG-063 et la forme d'emplacement de la Partie D (décision 10 : section vs onglet) — avant tout code.
2. **Correctif d'affichage des dates calendaires** : `DateCalendaireUtils` + tests, remplacement sur `membres-connus-admin.component.html`, recensement et traitement des helpers `formaterDate*` (§5.3), tests de non-régression. Premier incrément à valeur utilisateur visible (le décalage de `partiLe` disparaît).
3. **Tri alphabétique des membres connus** : `membresConnus()` + `comparerRegles` + tests.
4. **Message de prise en charge (Partie C)** : libellé conditionnel de `construireAgeChezNousLabel` sur `nombreReglesInternes` / `nombreReglesInternesExploitables` (§6.2), alignement du bouchon, tests interface et bouchon, non-régression cœur natif. Aucune modification du cœur natif ni du schéma.
5. **Liste transverse des audits (Partie D, lecture seule)** : utilitaire `LigneAuditTransverse`, section « Suppression ciblée » de l'onglet Paramétrage « Purge des audits », filtres et tri, commande `previsualiserSuppressionAudits` (consultation pure) + `persistance::suppression_audits::previsualiser` + Façade TS + bouchon ; tests cœur natif (prévisualisation) et interface. Aucune écriture.
6. **Suppression ciblée d'audits (Partie D, mutation)** : `persistance::suppression_audits::supprimer`, commande `supprimerAudits`, enregistrement `lib.rs`, journalisation début / fin, entrée de journal récapitulative, sauvegarde + rotation RG-003 ; Façade TS + bouchon ; confirmation + ressaisie du mot de passe ; récapitulatif des projets vidés ; tests cœur natif, interface, bouchon, E2E.
7. **Revue croisée finale** de la matrice de traçabilité et vérification qu'aucune capture du guide utilisateur n'est prise en défaut.

Chaque incrément : auto-revue + revue assistée par l'IA en contexte isolé, exécution / test réel avant validation, pas de passage à l'incrément suivant sans validation humaine explicite.

## 12. Vérification de bout en bout

Sur `npm start` (bouchon TypeScript), poste réglé sur un fuseau à l'est de UTC (`Europe/Paris`) :

1. créer plusieurs règles de membres connus dans un ordre non alphabétique, avec et sans libellé → la liste s'affiche triée, insensible à la casse et aux accents, les règles sans libellé triées sur leur critère ;
2. renseigner `partiLe = 01/09/2026` sur une règle nominative, enregistrer → la ligne affiche `· parti le 01/09/2026` (et non `31/08/2026`) ;
3. rouvrir la règle en édition → le champ « Parti le » présente bien `01/09/2026` ;
4. rejouer les étapes 1 et 2 avec le poste réglé sur `America/New_York` → mêmes résultats (aucun décalage dans l'autre sens) ;
5. ouvrir la Fiche projet d'un projet dont `premierCommitInterne.statut = determine` et la Comparaison d'audits avec un audit historique → les dates calendaires affichées correspondent à la valeur stockée, quel que soit le fuseau du poste ;
6. export PNG de la Fiche projet → dates inchangées ;
7. sur un groupe dont toutes les règles `interne` sont de type `username` sans alias courriel, lancer le calcul de prise en charge (bouton « recalculer » de la Fiche projet) → le libellé « Âge chez nous » indique que des membres internes existent mais ne sont pas qualifiés par courriel, et invite à l'action (et non « aucun membre interne qualifié ») ;
8. ajouter un `aliasEmail` à l'une de ces règles, recalculer → le calcul aboutit (`determine` si un commit correspond, `aucun_membre_interne` sinon), plus le libellé de l'étape 7 ;
9. sur un groupe **sans aucune** règle `interne` → le libellé reste « aucun membre interne qualifié pour ce groupe » ;
10. **sur le fichier réel de l'utilisateur** (avant développement) : vérifier le type des règles `interne` du groupe concerné, pour confirmer le diagnostic §6.1 ;
11. ouvrir Paramétrage > « Purge des audits » > section « Suppression ciblée » → la liste affiche les audits **de tous les projets** avec groupe, projet, type, date ciblée, date de réalisation, campagne ; pour un audit régulier, date ciblée et date de réalisation coïncident ; pour un audit historique, la date ciblée est la date calendaire demandée et la date de réalisation l'horodatage réel ;
12. filtrer par plage de date de réalisation, puis ajouter un filtre de groupe et de type → la liste et le bouton « tout cocher le résultat filtré » se restreignent correctement ;
13. cocher « tout le résultat filtré » puis prévisualiser → « N audits sur M projets, X → Y », avec la liste des projets qui se retrouveraient sans aucun audit ;
14. confirmer + ressaisir le mot de passe → les audits disparaissent de la liste, de la Synthèse des audits et de la Comparaison d'audits ; une entrée de journal récapitulative unique est présente ; une sauvegarde a eu lieu ;
15. vider entièrement l'historique d'un projet de test → autorisé, le projet figure bien dans le récapitulatif des projets vidés, sa Fiche projet affiche « jamais audité » sans erreur ;
16. rejeter la ressaisie du mot de passe → aucun audit supprimé, aucune écriture ;
17. filtres ne correspondant à aucun audit → liste vide avec message explicite, bouton de suppression inactif.

## 13. Points restant ouverts

1. **Datation par autre canal que le courriel.** RG-058 restreint la correspondance aux canaux exposés par un commit. Récupérer le courriel des membres identifiés par login (API des membres GitLab, ou corrélation avec `author_email` des commits) pour enrichir automatiquement `aliasEmail` est un vrai besoin, hors périmètre de ce plan, à rapprocher de plan_19 (audit d'accès des membres).
2. **Agrégation multi-groupes.** Le calcul de prise en charge, comme la résolution du statut des membres sur la Fiche projet, ne consulte que le groupe de rattachement du projet. Si l'utilisateur attend qu'un membre qualifié `interne` dans un **autre** groupe compte pour un projet, c'est un changement de fond touchant aussi RG-006 à RG-008 : à instruire séparément, non couvert ici.
3. **Factorisation complète des helpers `formaterDate*`.** Le présent plan réduit le défaut sans nécessairement fusionner les cinq méthodes homonymes en un utilitaire unique. Une factorisation intégrale reste souhaitable et pourrait faire l'objet d'un incrément de nettoyage ultérieur.
4. **Forme du correctif de gabarit** (méthode de composant vs `Pipe` pur `dateCalendaire`) : à trancher à l'implémentation de l'incrément 2 ; un `Pipe` est privilégié s'il est réutilisé par les écrans du §5.3.
5. **Contrôle E2E du tri et du libellé** : à inclure seulement si le jeu de démonstration du bouchon s'y prête sans alourdir le parcours unique.
6. **`graphique-evolution.component.ts`** : son helper prend un `number` (epoch), pas une chaîne ; confirmer en relecture qu'aucune entrée calendaire ambiguë ne l'atteint.
7. **Partie D — forme d'emplacement (décision 10 : section de l'onglet « Purge des audits » vs onglet distinct `suppressionAudits`) et numéros US-063 / RG-063** : à figer à l'incrément 1.
8. **Partie D — marqueur de version d'audit.** L'objectif initial (retrait des audits d'anciennes versions) repose sur une date butoir choisie par l'utilisateur (décision 13). Ajouter un champ `versionApplication` aux audits produits **désormais** faciliterait les futurs nettoyages ciblés par version ; hors périmètre de ce plan (n'aide pas pour l'existant, implique un changement de schéma), à réévaluer plus tard.
9. **Partie D — audit référencé par une vue enregistrée.** Vérifier à l'implémentation qu'aucune `VueEnregistrée` ne fige un `id` d'audit (a priori non : les vues portent des filtres de périmètre, pas des références d'audit) ; si c'était le cas, prévoir le nettoyage de la référence morte.
10. **Partie D — volumétrie de la liste transverse.** Sur un fichier à l'échelle RNF-006, la liste peut compter des milliers de lignes. Prévoir une pagination ou un rendu virtualisé si le tableau dense existant ne suffit pas ; à mesurer à l'implémentation (l'objectif « anciennes versions » se traite de toute façon par filtre + « tout cocher le résultat »).
