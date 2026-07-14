# Handoff : Application de suivi de la qualimétrie et de l'obsolescence

## Aperçu

Ce dossier contient les maquettes visuelles de 4 écrans clés de l'application de suivi de la qualimétrie et de l'obsolescence des dépendances, telle que décrite dans la spécification fonctionnelle v1.0 (9 juillet 2026) : **Écran d'accueil (F03)**, **Synthèse des audits (F10)**, **Fiche projet (F12)** et **Tableau de bord d'exécution d'audit (F06)**.

## À propos des fichiers de design

Les fichiers HTML de ce dossier sont des **références de design** — des maquettes montrant l'apparence et le comportement voulus, pas du code de production à copier tel quel. Le travail consiste à **recréer ces designs HTML dans l'environnement cible réel de l'application** — une application de bureau **Tauri** avec un front **Angular** (TypeScript, Signals, RxJS) — en respectant les patterns, composants et conventions déjà établis dans ce codebase. Si l'environnement Angular/Tauri n'existe pas encore, l'implémenter selon l'architecture décrite en section 1.1 de la spécification jointe.

Ne pas réutiliser le HTML/CSS/JS de la maquette directement : la maquette est un composant "Design Component" propriétaire (balises `<x-dc>`, `<sc-if>`, `<sc-for>`, styles inline, moteur de rendu React interne) qui n'a pas vocation à s'exécuter dans l'application finale. Le développeur doit traduire fidèlement la structure visuelle, les couleurs, les espacements et les comportements en composants Angular.

## Fidélité

**Haute fidélité (hifi)** — mais volontairement **statique** (pas d'interactions réelles au-delà de la navigation entre les 4 écrans). Couleurs, typographie, espacements et contenus sont représentatifs de l'intention finale et doivent être recréés fidèlement. Les listes/tableaux affichent des données d'exemple (dérivées du fichier `exemple-donnees.json` de la spec) — le développeur doit les remplacer par le binding réel aux données du fichier chiffré, calculées via les référentiels et seuils courants (principe "le constat est stocké, le jugement est calculé", section 1.2).

## Fichiers inclus

- `Suivi Qualimetrie.dc.html` — la maquette des 4 écrans (fichier de référence, voir structure ci-dessous).
- `screenshots/` — capture PNG de chaque écran (01-accueil, 02-synthese, 03-fiche-projet, 04-tableau-de-bord-audit), pour référence visuelle rapide sans avoir à ouvrir le fichier HTML.
- `data.js` — logique de calcul des indicateurs à partir des constats bruts (statuts de vitalité, classes de taille, notes Sonar, statuts de membres, statuts de dépendances, badge SONAR_KO…) + référentiels et jeu de données d'exemple utilisés par la maquette. Utile pour comprendre la logique métier attendue, à réimplémenter côté Rust/Angular selon l'architecture réelle (le calcul du jugement doit rester recalculable à la volée, jamais stocké).
- `Specification.md` — spécification fonctionnelle et technique complète (v1.0) fournie par l'utilisateur, à conserver comme référence faisant foi pour toute question de comportement, de modèle de données ou de règle métier non couverte par les maquettes visuelles.

## Écrans / Vues

Les 4 écrans partagent une même coquille : sidebar de navigation (232px, fond gris clair) + barre supérieure (titre d'écran, nom du fichier de données, statut de sauvegarde) + zone de contenu scrollable.

### 1. Écran d'accueil (F03)

**Objectif** : point d'entrée — créer un nouveau fichier de données ou en charger un, puis résumer l'état depuis la dernière session.

**Layout** :
- Deux cartes côte à côte (`display:flex; gap:16px`) : "Créer un nouveau fichier" (neutre) et "Charger un fichier existant" (mise en avant, bordure et fond bleus).
- Bandeau de 4 cartes statistiques en grille 4 colonnes (`grid-template-columns:repeat(4,1fr)`) : Groupes/Projets, Dernière campagne, **Membres inconnus** (carte rose/rouge — signal de sécurité prioritaire, doit toujours ressortir visuellement), Alertes actives.
- Bandeau d'alerte pleine largeur (fond rose `oklch(93% 0.06 340)`, bordure `oklch(78% 0.14 340)`) signalant les membres inconnus, avec lien "Ouvrir la liste de travail".
- Liste des 3 alertes les plus importantes (projet mort, violation IA, campagne en échec), chaque ligne avec un point de couleur (rouge/orange) + libellé + nom du groupe.

**Composants clés** : cartes avec `border-radius:10px`, `border:1px solid oklch(89% 0.006 250)`, padding `14-20px`. Police : Inter pour le texte, JetBrains Mono pour les valeurs numériques/dates.

### 2. Synthèse des audits (F10)

**Objectif** : dernier audit intégré de chaque projet, avec seuils de couleur, filtrable par groupe/indicateur.

**Layout** :
- Barre de filtres en haut : sélecteur de groupe, sélecteur d'indicateurs, champ de recherche, compteur de projets à droite.
- Bandeau d'alerte "membre inconnu" identique à l'accueil, toujours au-dessus du tableau si applicable (court-circuite les seuils, cf. section 5.10 de la spec).
- Tableau dense (police 12.5px, padding vertical 9px) avec 12 colonnes : Projet, Groupe, Dernier audit, Vitalité, Taille (S/L/XL/XXL), Couverture, Notes Sonar (4 lettres F·S·M·RS), Violations Bloquant/Critique, MR ouvertes, Membres, IA, Sonar (badge SONAR_KO le cas échéant).
- Première colonne (Projet) en `position:sticky; left:0` pour le scroll horizontal.
- Codes couleur systématiques : vert `oklch(93% 0.05 150)/oklch(38% 0.13 150)`, orange `oklch(94% 0.06 65)/oklch(48% 0.15 65)`, rouge `oklch(93% 0.06 25)/oklch(45% 0.18 25)`, alerte membre inconnu en rose `oklch(93% 0.06 340)/oklch(38% 0.2 340)`.
- Badges "AUDIT ANCIEN" et pictogramme ⛔ (campagne en échec) accolés au nom du projet quand applicable.
- Ligne du projet en alerte (membre inconnu) légèrement teintée (`oklch(98% 0.015 340)`) pour ressortir sans être criarde.

### 3. Fiche projet (F12)

**Objectif** : détail complet d'un projet — indicateurs, dépendances, membres, marqueurs IA, MR, tout historique confondu.

**Layout** :
- En-tête pleine largeur : groupe > nom du projet > description + ref auditée (badge monospace), avec à droite les badges de statut (IA violation, SONAR_KO, membre inconnu).
- Ligne de métadonnées : âge chez nous (premier commit interne), dernier audit, dernière campagne (rouge si échec), taille/classe.
- Encart d'anomalie technique si la dernière campagne a échoué (fond orange clair, message + action suggérée).
- Corps en 2 colonnes (`grid-template-columns:1.3fr 1fr`) :
  - **Colonne gauche** : bloc "Indicateurs Sonar" (grisé à `opacity:0.55` si SONAR_KO, avec l'explication de l'écart en légende), bloc "Dépendances" (tableau référence/version/statut), bloc "Merge requests ouvertes" (fond orangé si en conflit).
  - **Colonne droite** : bloc "Membres et statuts" (fond rose si un membre inconnu est présent, avec bordure renforcée sur la ligne concernée + lien "Qualifier ce membre"), bloc "Marqueurs IA détectés" (fond orangé si violation), bloc "Annotations & journal".

### 4. Tableau de bord d'exécution d'audit (F06)

**Objectif** : suivi temps réel d'une campagne en cours.

**Layout** :
- Carte d'en-tête : nom/heure de la campagne, compteur "X / N projets terminés", estimation de temps restant, bouton "Annuler la campagne" (rouge), barre de progression (`height:8px`, remplissage bleu `oklch(55% 0.16 258)`).
- Liste des projets sous forme de tableau à 4 colonnes (Projet, État, Connecteur/détail, Durée) :
  - **Terminé** : badge vert, nombre de résultats extraits.
  - **Échoué** : badge rouge, motif court + encart déplié avec message technique et action suggérée (fond orange clair).
  - **En cours** : badge bleu, ligne entière teintée en bleu clair, connecteur actif affiché.
  - **En attente** : ligne grisée, tirets.

## État des interactions

Seule interaction implémentée dans la maquette : clic sur les 4 items de la sidebar (Accueil / Synthèse / Fiche projet / Tableau de bord) pour changer d'écran, géré par un `state.screen` React et des styles conditionnels (pas de manipulation DOM directe). Aucune autre interaction (filtres, tri, boutons d'action, formulaires) n'est câblée — elles sont représentées visuellement mais statiques.

## Design tokens

**Couleurs** (format OKLCH) :
- Fond général : `oklch(97.5% 0.003 250)` — Fond cartes : `white` — Fond sidebar : `oklch(96.3% 0.004 250)`
- Bordures neutres : `oklch(89% 0.006 250)` (cartes), `oklch(93% 0.004 250)` (séparateurs de tableau)
- Texte principal : `oklch(22% 0.01 250)` — Texte secondaire : `oklch(48-52% 0.012 250)`
- Accent primaire (bleu, actions/navigation active) : `oklch(55% 0.16 258)`
- Vert (statut OK) : fond `oklch(93% 0.05 150)`, texte `oklch(38% 0.13 150)`
- Orange (statut attention) : fond `oklch(94% 0.06 65)`, texte `oklch(48% 0.15 65)`
- Rouge (statut critique) : fond `oklch(93% 0.06 25)`, texte `oklch(45% 0.18 25)`
- Rose/magenta (alerte membre inconnu — signal prioritaire dédié) : fond `oklch(93% 0.06 340)`, texte `oklch(38% 0.2 340)`, accent fort `oklch(52% 0.22 340)`

**Typographie** :
- Police texte : `Inter` (400/500/600/700/800)
- Police données/monospace : `JetBrains Mono` (400/500/600/700) — utilisée pour dates, tailles, notes, durées, tout ce qui est une valeur "brute"
- Tailles : 19px (titres de fiche), 16px (titres de section), 13-14px (corps), 12-12.5px (tableaux/labels), 10.5-11.5px (métadonnées, badges)

**Rayons et espacements** :
- Cartes : `border-radius:10px`, padding 18-22px
- Badges/pastilles : `border-radius:20px` (pilule), padding `2-4px 8-10px`
- Grilles de cartes : `gap:12-16px`
- Sidebar : largeur fixe `232px`

## Modèle de données à respecter

Le développeur doit implémenter le modèle de données exact décrit dans la spécification jointe (`Specification.md`, sections 6.1-6.4) : racine JSON avec `groupes[]`, `referentiels`, `parametres`, `campagnes[]`, `brouillon`, `traitementsAlertes[]`, `journal[]`, `vuesEnregistrees[]`. UUID v4 pour toutes les entités. Aucun verdict/jugement stocké dans les `resultats` d'audit — uniquement des constats bruts, le calcul se faisant à l'affichage (principe fondamental, section 1.2.1). Voir `data.js` pour un exemple de logique de calcul (statuts, seuils, couleurs) à réimplémenter fidèlement côté application réelle.

## Assets

Aucune image ni icône externe — tous les glyphes utilisés (⌂ ▤ ▦ ◷ ⚑ ⌕ ⚙ ≡ ⚠ ✓ ✕ ⟳ ⛔ ●) sont des caractères Unicode, pas des fichiers d'icônes. Le développeur peut les conserver tels quels ou les remplacer par une bibliothèque d'icônes cohérente avec le design system Angular utilisé.
