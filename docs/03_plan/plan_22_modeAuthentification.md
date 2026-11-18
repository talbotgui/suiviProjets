<!-- Document rédigé avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par docs/02_documentation/01_modalitesUsageEtConventions.md. Plan de conception établi à partir d'une demande utilisateur explicite (2026-11-18) ; il précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. -->

# Conception — Mode d'authentification d'un projet détecté par ses dépendances (US-067 / RG-067)

## Statut du document

Ce document décrit une évolution ajoutant, sur la Fiche projet et sur les tuiles de l'écran Obsolescence, une restitution par icône du mode d'authentification de l'application auditée (OIDC, SAML, CAS ou « aucun détecté »), déduit des dépendances déjà collectées par le Connecteur GitLab, à partir de règles de détection paramétrables.

Comme `plan_16_navigationFiltrageEtVues.md` à `plan_21_commitsMembresParGroupe.md`, ce fichier est une exception à la règle générale (les évolutions postérieures à la Phase 15 sont normalement tracées sous forme d'entrées « Étape N » du [rapport de développement](../04_rapports/rapportDeDeveloppement.md)) : son emplacement et son nom restent à ajuster si besoin.

Statut : ce plan précède la mise à jour des documents normatifs et tout développement, qui restent conditionnés à une validation humaine explicite. La méthode du projet s'applique : arbitrage humain, puis mise à jour des documents normatifs, puis développement, sans passage à l'étape suivante sans validation explicite de la précédente. **Aucune ligne de code n'a été modifiée à l'écriture de ce document.**

Mise à jour du 2026-11-18 : plan validé par l'utilisateur (« Je valide le plan. Tu peux développer »), les propositions du document (identifiants, priorité Should have, pictogrammes maison, jeu de règles par défaut) étant retenues en l'état sous réserve de la validation humaine de l'étape de développement correspondante, tracée par l'Étape 45 du [rapport de développement](../04_rapports/rapportDeDeveloppement.md).

## Sommaire

1. [Objet](#1-objet)
2. [Décisions actées](#2-décisions-actées)
3. [Périmètre et identifiants d'exigence proposés](#3-périmètre-et-identifiants-dexigence-proposés)
4. [Référentiel `reglesAuthentification`](#4-référentiel-reglesauthentification)
5. [Moteur de jugement](#5-moteur-de-jugement)
6. [Composant d'icône partagé](#6-composant-dicône-partagé)
7. [Fiche projet et écran Obsolescence](#7-fiche-projet-et-écran-obsolescence)
8. [Écran de Paramétrage](#8-écran-de-paramétrage)
9. [Bouchon TypeScript](#9-bouchon-typescript)
10. [Impacts sur le modèle de données et migration](#10-impacts-sur-le-modèle-de-données-et-migration)
11. [Impacts documentaires](#11-impacts-documentaires)
12. [Impacts sur les tests](#12-impacts-sur-les-tests)
13. [Découpage en incréments](#13-découpage-en-incréments)
14. [Vérification de bout en bout](#14-vérification-de-bout-en-bout)
15. [Points restant ouverts](#15-points-restant-ouverts)

## 1. Objet

L'utilisateur souhaite connaître d'un coup d'œil le mode d'authentification de chaque application suivie, sur la Fiche projet et sur la tuile de l'écran Obsolescence, sous forme d'icône.

La demande initiale envisageait deux sources de détection : les dépendances détectées, et la recherche de chaînes de caractères dans des fichiers du dépôt (motif de nom de fichier et motif de contenu paramétrables). L'analyse du code existant a montré que seule la première source est disponible sans nouvelle collecte : les dépendances déclarées dans `pom.xml`, `package.json` et `build.gradle` sont déjà collectées par `gitlab::interroger_dependances` et persistées dans chaque audit (`Resultat::GitlabDependances`, champ `reference` au format `groupId:artifactId` pour Maven/Gradle et nom de paquet pour npm), alors qu'aucune lecture du contenu d'autres fichiers n'existe aujourd'hui (le Connecteur ne lit que ces trois manifestes, les marqueurs IA ne portant que sur des noms de fichiers). La recherche dans le contenu des fichiers aurait exigé une nouvelle commande de la Façade, des requêtes GitLab supplémentaires bornées et un nouveau type de résultat persisté ; l'utilisateur a choisi d'y renoncer (échange du 2026-11-18).

## 2. Décisions actées

Décisions arbitrées par l'utilisateur le 2026-11-18 :

1. **Détection exclusivement par les dépendances.** Aucune recherche dans le contenu de fichiers. Aucune nouvelle collecte GitLab, aucune nouvelle commande d'audit, aucun nouveau type `Resultat`.
2. **Règles paramétrables.** Les correspondances « motif de dépendance → mode d'authentification » sont portées par un nouveau référentiel partageable `reglesAuthentification`, administrable depuis l'écran de Paramétrage et inclus dans l'export/import de configuration partageable.
3. **Liste fermée de modes : `OIDC`, `SAML`, `CAS`.** Chaque mode dispose d'un pictogramme dédié. L'ajout d'un mode est une évolution de code.
4. **Plusieurs modes détectés → une icône par mode**, dans l'ordre fixe OIDC, SAML, CAS ; l'infobulle de chaque icône liste les dépendances ayant déclenché la détection.
5. **Absence de détection → mention neutre « Aucune authentification détectée ».** Une absence de signal ne prouve pas l'absence d'authentification (bibliothèque interne, dépendance transitive, authentification portée par un reverse proxy) ; le libellé ne doit jamais affirmer « aucune authentification ». Si le projet n'a jamais été audité ou si l'audit retenu ne contient aucun résultat `gitlab.dependances`, rien n'est affiché.

Décisions de conception proposées (à valider) :

6. **Calcul à l'affichage, jamais persisté**, sur le modèle des langages principaux (RG-057) et du statut d'obsolescence (RG-011) : le mode d'authentification est une vue calculée interne, recalculée à chaque affichage par une fonction pure du Moteur de jugement. Conséquence : toute modification des règles s'applique immédiatement et rétroactivement à tous les audits déjà stockés, sans nouvelle campagne.
7. **Référentiel distinct de `reglesDependances`.** Une règle de dépendances porte des bornes de version et des statuts d'obsolescence sans rapport avec l'authentification ; y ajouter un attribut `modeAuthentification` mélangerait deux finalités et obligerait à créer des règles d'obsolescence artificielles pour des bibliothèques d'authentification.
8. **Même syntaxe de motif que `reglesDependances`** : glob simple où seul `*` est spécial, appliqué à `Dependance.reference`, via `ParametresJugementUtils.correspondMotifGlob` ([parametres-jugement.utils.ts](../../src/app/services/sansetat/jugement/parametres-jugement.utils.ts)), sans nouveau matcher.
9. **Audit retenu identique à celui des indicateurs voisins** de chaque écran : `DernierAuditRegulierUtils.dernierAuditRegulier` sur la Fiche projet, `auditRetenu` sur l'écran Obsolescence ; dépendances fusionnées entre sources via `AgregationThemeFicheProjetUtils.regrouper`.

## 3. Périmètre et identifiants d'exigence proposés

Derniers identifiants **intégrés** aux documents normatifs à la date de rédaction : `US-065`, `RG-065`. `plan_19_auditAccesMembresPartis.md`, **non intégré**, réserve `US-066` / `RG-066`.

Allocation proposée pour ce plan : **`US-067` / `RG-067`**, à reconfirmer au moment de la qualification effective. Si `plan_19` est abandonné ou si une autre session consomme des identifiants entre-temps, décaler en bloc sans réintroduire de trou.

| exigence | intitulé proposé | priorité |
|---|---|---|
| US-067 | Visualiser le mode d'authentification détecté d'une application (OIDC, SAML, CAS) sur la Fiche projet et la tuile Obsolescence, et administrer les règles de détection correspondantes | Should have (à confirmer) |
| RG-067 | Règle de détection du mode d'authentification : confrontation des dépendances du dernier audit retenu aux règles `reglesAuthentification` (glob sur `reference`), liste fermée de modes, restitution multiple ordonnée, mention neutre en l'absence de détection, rien en l'absence de résultat `gitlab.dependances` | — |

`RG-067` s'articule avec `RG-022` (référentiels paramétrables, aucune valeur codée en dur), `RG-057` (même principe de vue calculée non persistée, même emplacement de restitution) et les règles de configuration partageable.

## 4. Référentiel `reglesAuthentification`

### Forme d'une entrée

```json
{ "id": "UUID v4", "mode": "OIDC | SAML | CAS", "motif": "org.springframework.security:spring-security-cas" }
```

- `id` : identifiant stable requis par `definirReferentiel` (US-033) ;
- `mode` : énumération fermée, validée côté interface et côté cœur natif ;
- `motif` : glob non vide sur `Dependance.reference`.

### Cœur natif

- [racine.rs](../../src-tauri/src/modele/racine.rs), structure `Referentiels` : nouveau champ `regles_authentification: Vec<Value>` avec `#[serde(default = "regles_authentification_par_defaut")]`, sur le modèle exact de `categories_dependances` (un document antérieur récupère la liste par défaut et non une liste vide) ; constante `REGLES_AUTHENTIFICATION_PAR_DEFAUT` à identifiants stables (préfixe `50000000-0000-4000-8000-…`, à la suite des préfixes déjà employés) ; mise à jour de `impl Default for Referentiels`.
- [parametrage.rs](../../src-tauri/src/persistance/parametrage.rs) : nouveau bras `"reglesAuthentification"` dans `definir_referentiel`, validation `valider_entree_regles_authentification` (forme objet, `id` présent, `mode` ∈ {`OIDC`, `SAML`, `CAS`}, `motif` chaîne non vide), suppression sur le modèle de `supprimer_regle_marqueur_ia` (nom de commande par symétrie : `supprimerRegleAuthentification` / `supprimer_regle_authentification`, décision arbitraire à valider). Journalisation début/fin de commande conforme à la norme.
- [configuration_partageable.rs](../../src-tauri/src/persistance/configuration_partageable.rs) : ajout de `referentiels.reglesAuthentification` au différentiel (`calculer_differentiel`) et à l'application ligne à ligne (`appliquer_ligne`), avec la même validation que ci-dessus.

### Interface

- [types-donnees.ts](../../src/app/services/avecetat/etat/types-donnees.ts) : type `ModeAuthentification = 'OIDC' | 'SAML' | 'CAS'`, interface `EntreeRegleAuthentification`, champ `reglesAuthentification` dans `Referentiels`.
- [parametres-jugement.utils.ts](../../src/app/services/sansetat/jugement/parametres-jugement.utils.ts) : lecteur défensif `lireReglesAuthentification` sur le modèle de `lireReglesMarqueursIA` (entrée invalide ignorée, jamais d'exception).

### Règles par défaut proposées

Faute de valeur fixée par un texte normatif et d'entrée correspondante dans `docs/01_besoin/exemple-donnees.json`, le jeu ci-dessous est une **décision arbitraire à valider par un humain**. Chaque coordonnée doit être vérifiée (dépôt Maven Central / registre npm) avant intégration.

| mode | motifs proposés |
|---|---|
| OIDC | `org.springframework.boot:spring-boot-starter-oauth2-client`, `org.springframework.security:spring-security-oauth2-client`, `org.keycloak:*`, `com.nimbusds:oauth2-oidc-sdk`, `keycloak-js`, `keycloak-angular`, `angular-oauth2-oidc`, `angular-auth-oidc-client`, `oidc-client-ts`, `oidc-client` |
| SAML | `org.springframework.security:spring-security-saml2-service-provider`, `org.springframework.security.extensions:spring-security-saml2-core`, `org.opensaml:*`, `org.pac4j:pac4j-saml`, `@node-saml/*`, `passport-saml` |
| CAS | `org.springframework.security:spring-security-cas`, `org.jasig.cas.client:*`, `org.apereo.cas.client:*`, `org.pac4j:pac4j-cas` |

## 5. Moteur de jugement

Nouveau fichier `src/app/services/sansetat/jugement/mode-authentification.utils.ts`, classe à membres statiques `ModeAuthentificationUtils`, sur le patron de [langages-principaux.utils.ts](../../src/app/services/sansetat/jugement/langages-principaux.utils.ts) : fonction pure, sans effet de bord, aucun import depuis `services/avecetat/`.

```ts
type DetectionAuthentification =
  | { type: 'detecte'; modes: readonly { mode: ModeAuthentification; references: readonly string[] }[] }
  | { type: 'aucunDetecte' };

ParametresJugementUtils.MODES_AUTHENTIFICATION: readonly ModeAuthentification[] = ['OIDC', 'SAML', 'CAS'];
ModeAuthentificationUtils.detecter(dependances, regles): DetectionAuthentification;
```

- une dépendance déclenche un mode dès qu'au moins une règle de ce mode lui correspond ; une même dépendance peut déclencher plusieurs modes (ex. `org.pac4j:*` mal paramétré) ;
- `references` : références distinctes, triées par comparaison relationnelle brute (déterminisme du rendu et des tests, comme RG-057) ;
- modes restitués dans l'ordre de `ParametresJugementUtils.MODES_AUTHENTIFICATION` ;
- l'état « non déterminé » (pas d'audit, pas de résultat `gitlab.dependances`) n'est pas du ressort de cette fonction : il est porté par l'appelant (champ `undefined`), sur le modèle de `langagesPrincipaux`.

## 6. Composant d'icône partagé

Nouveau répertoire `src/app/composants/icone-authentification/`, composant `app-icone-authentification`, sur le patron d'[`app-icone-langage`](../../src/app/composants/icone-langage/icone-langage.component.ts) :

- entrées : `mode` (`ModeAuthentification`), `references` (liste affichée dans l'infobulle), `taille: 'md' | 'sm'` (`md` sur la Fiche projet, `sm` sur les tuiles Obsolescence) ;
- rendu : `<img src="authentification/<mode>.svg">` avec `alt` et `title` (« Authentification OIDC détectée via : … ») ; repli en pastille texte (`OIDC`, `SAML`, `CAS`) si l'image échoue, via le même mécanisme `linkedSignal` ;
- assets : trois pictogrammes SVG dans `public/authentification/` (cf. [§15](#15-points-restant-ouverts) sur leur origine) ;
- la mention « Aucune authentification détectée » n'est pas une icône de ce composant : elle est rendue par l'écran appelant (texte discret sur la Fiche projet, pictogramme neutre avec infobulle sur la tuile Obsolescence, faute de place).

## 7. Fiche projet et écran Obsolescence

### Fiche projet

[fiche-projet.component.ts](../../src/app/ecrans/fiche-projet/fiche-projet.component.ts) : nouveau champ `modeAuthentification?: DetectionAuthentification` dans `DonneesFicheProjet`, calculé dans `construireDonnees` à partir de `themes.dependances` (déjà obtenu par `AgregationThemeFicheProjetUtils.regrouper` sur le dernier audit régulier) et des règles lues par `lireReglesAuthentification(referentielsBruts)` ; `undefined` si aucun résultat `gitlab.dependances`. Affichage dans une ligne « Authentification » placée sous la ligne « Langages principaux » du gabarit.

### Écran Obsolescence

[obsolescence.component.ts](../../src/app/ecrans/obsolescence/obsolescence.component.ts) : nouveau champ dans `LigneObsolescence` et `TuileObsolescence`, calculé dans `lignesTousProjets` sur l'audit retenu (`auditRetenu`), recopié dans `tuiles` ; règles lues dans un `computed` voisin de `regles`. Icônes `taille="sm"` sur la ligne de nom de la tuile, à côté des icônes de langage. L'infobulle de tuile (`construireInfobulle`) mentionne le ou les modes détectés.

## 8. Écran de Paramétrage

[referentiels-parametrage.component](../../src/app/ecrans/parametrage/referentiels/referentiels-parametrage.component.ts) : nouvelle section « Règles de détection de l'authentification », sur le modèle de la section des règles de marqueurs IA : tableau (mode, motif), ajout, modification, suppression, ressaisie du mot de passe via `app-confirmation-mot-de-passe` à chaque enregistrement (RG-002), validation côté interface (mode dans la liste, motif non vide) doublée de la validation native (§4). Enregistrement via `DonneesApplicationService.definirReferentiel('reglesAuthentification', …)`.

## 9. Bouchon TypeScript

- [donnees-racine-bouchon.ts](../../src/app/services/sansetat/commandes/bouchon/donnees-racine-bouchon.ts) : règles par défaut dans `referentiels` (copie de `RACINE_BOUCHON_CHARGEMENT` et `construireVide()`), type `RacineBouchon.referentiels` complété.
- [donnees-bouchon.ts](../../src/app/services/sansetat/commandes/bouchon/donnees-bouchon.ts) : dépendances ajoutées à `CONSTATS_GITLAB_BOUCHON` de façon à couvrir au moins un projet OIDC, un projet cumulant deux modes et un projet sans mode détecté.
- [bouchon-parametrage.utils.ts](../../src/app/services/sansetat/commandes/bouchon/bouchon-parametrage.utils.ts) : `definir_referentiel` est déjà générique sur `typeReferentiel` ; ajout de la commande de suppression (§4).

## 10. Impacts sur le modèle de données et migration

Ajout du champ `referentiels.reglesAuthentification`. Conformément à la convention du projet pour tout changement de forme du schéma (cf. commentaire de `VERSION_SCHEMA_COURANTE` dans [racine.rs](../../src-tauri/src/modele/racine.rs)), `VERSION_SCHEMA_COURANTE` passe de `13` à `14`, avec un palier `migration_13_vers_14` **à transformation nulle** (comme `migration_12_vers_13`) enregistré dans `ETAPES_MIGRATION_REELLES` : un fichier antérieur récupère la liste par défaut par le `#[serde(default = "…")]`, aucune donnée existante n'est transformée. Si un autre plan incrémentant ce compteur est intégré avant, ce plan prend le palier suivant, sans trou.

Aucun champ ajouté aux audits, aucun recalcul de donnée persistée : le mode d'authentification n'est jamais stocké.

## 11. Impacts documentaires

| fichier | modification |
|---|---|
| `02_documentation/04_casUsage.md` | ligne US-067 |
| `02_documentation/05_reglesGestion.md` | RG-067 (section « Seuils, référentiels et historisation »), matrice écran → RG (Fiche projet, Obsolescence, Paramétrage) |
| `02_documentation/12_modeleDonnees.md` | entité `RegleAuthentification`, champ `Referentiels.reglesAuthentification`, version de schéma 14 |
| `02_documentation/13_conceptionDetaillee.md` | utilitaire `ModeAuthentificationUtils`, composant `app-icone-authentification`, commande de suppression |
| `guide-utilisateur.md` | mention de l'icône sur la Fiche projet et l'Obsolescence, administration des règles |
| `04_rapports/rapportDeDeveloppement.md` | nouvelle étape, décisions arbitraires listées (règles par défaut, nom de commande, pictogrammes) |

## 12. Impacts sur les tests

- Jest, `mode-authentification.utils.spec.ts` (seuil 90 %, Moteur de jugement) : aucune dépendance, aucune règle, aucun mode détecté, un mode, plusieurs modes (ordre fixe), plusieurs dépendances pour un même mode (dédoublonnage et tri), une dépendance déclenchant deux modes, motif glob avec `*` en tête, au milieu et en fin.
- Jest, `parametres-jugement.utils.spec.ts` : `lireReglesAuthentification` avec entrées invalides (mode hors liste, motif vide, forme non objet).
- Jest, composants : `icone-authentification` (rendu, repli texte), Fiche projet et Obsolescence (présence, absence, mention neutre), section de paramétrage (ajout, modification, suppression, validation).
- Rust : chargement d'un document sans `reglesAuthentification` → liste par défaut ; `definir_referentiel` refusant un `mode` hors liste et un motif vide ; suppression ; migration 13 → 14 ; import de configuration partageable incluant le nouveau référentiel.
- E2E (`e2e/parcours-complet.spec.ts`) : icônes attendues sur la Fiche projet et la tuile Obsolescence d'un projet du bouchon ; ajout d'une règle depuis le Paramétrage et effet immédiat à l'affichage.

## 13. Découpage en incréments

1. **Référentiel et Moteur de jugement** : champ Rust avec défauts, validation, suppression, configuration partageable, palier de migration 13 → 14, types TS, lecteur défensif, `ModeAuthentificationUtils` et tests unitaires.
2. **Restitution** : composant `app-icone-authentification` et pictogrammes, Fiche projet, écran Obsolescence, données du bouchon.
3. **Administration et documentation** : section de Paramétrage, parcours E2E, documents normatifs, guide utilisateur, rapport de développement.

## 14. Vérification de bout en bout

- `cargo test --locked`, `cargo clippy --locked`, `npm test`, `npm run typecheck`.
- `npm run test:e2e`.
- Sous `npm start` (bouchon) : contrôle visuel de la Fiche projet et de l'écran Obsolescence pour les trois cas (un mode, deux modes, aucun détecté), en thème clair et sombre ; suppression d'une règle par défaut depuis le Paramétrage et disparition immédiate de l'icône correspondante.
- Sous `npm run tauri dev` : ouverture d'un fichier de données en version de schéma 13 → migration silencieuse vers 14 et présence des règles par défaut dans le Paramétrage.

## 15. Points restant ouverts

1. **Pictogrammes.** Le logo OpenID est une marque déposée de l'OpenID Foundation ; SAML et CAS n'ont pas de logo d'usage libre établi. Proposition : trois pictogrammes maison neutres (cadenas stylisé + sigle), versionnés sous la licence du projet. Alternative : simple pastille texte (`app-badge`) sans SVG.
2. **Règles par défaut.** Liste du §4 à vérifier coordonnée par coordonnée et à arbitrer ; en particulier, `spring-boot-starter-oauth2-client` couvre aussi OAuth2 sans OIDC, et `spring-boot-starter-oauth2-resource-server` (API validant des jetons émis par un fournisseur OIDC) n'est pas inclus : à trancher.
3. **Limite de détection.** Seules les dépendances déclarées dans `pom.xml`, `package.json` et `build.gradle` sont vues (ni transitives, ni autres écosystèmes) : une authentification portée par une bibliothèque interne d'entreprise ne sera détectée que si l'utilisateur ajoute une règle pour cette bibliothèque. C'est la justification principale du paramétrage.
4. **Priorité MoSCoW** de US-067 à confirmer.
5. **Allocation des identifiants** `US-067` / `RG-067` à reconfirmer selon le sort de `plan_19`.
