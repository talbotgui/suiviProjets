// Configuration ESLint (flat config) mise en place lors du bootstrap du poste de développement (Phase 0),
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
// Base générée par `ng add @angular-eslint/schematics`, complétée pour couvrir l'ensemble des règles de rigueur du
// typage et de la documentation TypeScript décrites dans docs/02_documentation/14_normesDeveloppement.md
// (rubrique « Rigueur du typage et de la documentation — TypeScript »).
//
// Point de vigilance documenté (cf. norme citée ci-dessus) : la règle `@typescript-eslint/no-extraneous-class` est
// activée avec `allowStaticOnly: true`, en divergence assumée avec la valeur par défaut recommandée par
// typescript-eslint (`false`), afin d'autoriser la convention « classes utilitaires à membres statiques uniquement »
// retenue par ce projet pour les fonctions utilitaires (aucune fonction hors classe). L'option `allowWithDecorator:
// true` est également nécessaire pour ne pas signaler les composants/services Angular (classes portant un
// décorateur) qui n'ont, à ce stade du projet, ni membre d'instance ni constructeur.
// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const jsdoc = require('eslint-plugin-jsdoc');

module.exports = defineConfig([
  {
    ignores: [
      'dist/**',
      '.angular/**',
      'coverage/**',
      'src-tauri/**',
      'node_modules/**',
      'docs/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      angular.configs.tsRecommended,
      jsdoc.configs['flat/recommended-typescript'],
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      jsdoc,
    },
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],

      // Visibilité explicite sur tout membre de classe.
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'explicit' }],

      // Type de retour explicite sur toute fonction/méthode, y compris aux frontières de module.
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: false, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // JSDoc obligatoire sur toute classe et toute méthode.
      'jsdoc/require-jsdoc': [
        'error',
        {
          contexts: ['ClassDeclaration', 'MethodDefinition'],
          checkConstructors: false,
        },
      ],

      // Aucune fonction ni constante-fonction déclarée en dehors d'une classe : aucune règle générique existante
      // ne couvre ce cas (cf. docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--typescript).
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program > FunctionDeclaration',
          message:
            "Aucune fonction déclarée en dehors d'une classe : regrouper les fonctions utilitaires dans une classe à membres statiques uniquement.",
        },
        {
          selector: 'Program > ExportNamedDeclaration > FunctionDeclaration',
          message:
            "Aucune fonction déclarée en dehors d'une classe : regrouper les fonctions utilitaires dans une classe à membres statiques uniquement.",
        },
        {
          selector: 'Program > ExportDefaultDeclaration > FunctionDeclaration',
          message:
            "Aucune fonction déclarée en dehors d'une classe : regrouper les fonctions utilitaires dans une classe à membres statiques uniquement.",
        },
        {
          selector: 'Program > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression',
          message:
            "Aucune constante-fonction déclarée en dehors d'une classe : regrouper les fonctions utilitaires dans une classe à membres statiques uniquement.",
        },
        {
          selector: 'Program > VariableDeclaration > VariableDeclarator > FunctionExpression',
          message:
            "Aucune constante-fonction déclarée en dehors d'une classe : regrouper les fonctions utilitaires dans une classe à membres statiques uniquement.",
        },
        {
          selector:
            'Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression',
          message:
            "Aucune constante-fonction déclarée en dehors d'une classe : regrouper les fonctions utilitaires dans une classe à membres statiques uniquement.",
        },
        // Trois cas complétés en relecture (Phase 0) : les sélecteurs ci-dessus laissaient passer sans aucune
        // erreur une constante-fonction exportée nommément sous forme de `function` (plutôt que fléchée), ainsi
        // que toute fonction fléchée ou `function` exportée par défaut (`export default () => {}` /
        // `export default function () {}` anonyme assigné) — repérés par test manuel lors de la relecture.
        {
          selector:
            'Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > FunctionExpression',
          message:
            "Aucune constante-fonction déclarée en dehors d'une classe : regrouper les fonctions utilitaires dans une classe à membres statiques uniquement.",
        },
        {
          selector: 'Program > ExportDefaultDeclaration > ArrowFunctionExpression',
          message:
            "Aucune fonction déclarée en dehors d'une classe : regrouper les fonctions utilitaires dans une classe à membres statiques uniquement.",
        },
        {
          selector: 'Program > ExportDefaultDeclaration > FunctionExpression',
          message:
            "Aucune fonction déclarée en dehors d'une classe : regrouper les fonctions utilitaires dans une classe à membres statiques uniquement.",
        },
      ],

      // Classes utilitaires à membres statiques uniquement autorisées (divergence assumée, cf. commentaire d'en-tête).
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowStaticOnly: true, allowWithDecorator: true },
      ],

      // Aucun type `any`, explicite ou implicite (complété par `noImplicitAny` dans tsconfig.json).
      '@typescript-eslint/no-explicit-any': 'error',

      // Aucune assertion de type ni assertion de non-nullité non justifiée.
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-non-null-assertion': 'error',

      // Variable ou import déclaré et jamais utilisé.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Conventions de nommage (cf. docs/02_documentation/14_normesDeveloppement.md#conventions-de-nommage).
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase'],
        },
        {
          selector: 'property',
          format: null,
        },
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
      ],

      // Exhaustivité du traitement du discriminant `type` d'un Résultat (RG-011).
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // Toute Promise est explicitement gérée.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
