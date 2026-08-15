# Qualité et téléchargements

## Sommaire

1. [Couverture de code](#couverture-de-code)
2. [Documentation technique générée](#documentation-technique-générée)
3. [Intégration continue](#intégration-continue)
4. [Téléchargements](#téléchargements)

## Couverture de code

Régénérée à chaque publication par le pipeline d'intégration continue (cf. [mise en place du pipeline](02_documentation/18_pic.md#mise-en-place-du-pipeline)), avec un seuil global bloquant de 80 % côté cœur natif et des seuils par périmètre côté interface (cf. [stratégie de couverture de code](02_documentation/16_normesTests.md#stratégie-de-couverture-de-code)) :

- [Cœur natif (Rust, cargo-llvm-cov)](../couverture/rust/html/index.html)
- [Interface (Angular/TypeScript, Jest/Istanbul)](../couverture/ts/index.html)

## Documentation technique générée

Documentation extraite automatiquement des commentaires du code source (Rustdoc, TSDoc), distincte de la documentation normative du projet ci-contre :

- [Cœur natif (Rust, rustdoc)](../documentation/rust/suivi_qualimetrie_lib/index.html)
- [Interface (Angular/TypeScript, Compodoc)](../documentation/ts/index.html)

## Intégration continue

Le pipeline (analyse statique, tests et couverture, tests de bout en bout, analyse des dépendances vulnérables, build multiplateforme, publication) est déclenché manuellement (`workflow_dispatch`, cf. [usage courant de la PIC](02_documentation/18_pic.md#usage-courant)) : [dernières exécutions sur GitHub Actions](https://github.com/talbotgui/suiviProjets/actions/workflows/validationVersionEtPublication.yml).

## Téléchargements

Les installeurs (Windows, macOS, Linux) de chaque version publiée, avec leur changelog dérivé des [Conventional Commits](02_documentation/14_normesDeveloppement.md#stratégie-de-branches-et-de-contribution-git), sont disponibles sur les [Releases GitHub](https://github.com/talbotgui/suiviProjets/releases).
