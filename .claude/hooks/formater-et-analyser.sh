#!/usr/bin/env bash
# Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
# .claude/rules/01-usage-ia-et-conventions.md.
#
# Hook Claude Code PostToolUse (Edit|Write) : formatage et analyse statique automatiques après toute modification
# de fichier, humaine ou assistée par IA (cf. docs/02_documentation/14_normesDeveloppement.md#règles-de-qualité-de-code
# et .claude/rules/09-normes-developpement.md#qualité-de-code).
#
# Fonctionnement : lit sur l'entrée standard l'événement JSON transmis par Claude Code (champ
# .tool_input.file_path), puis choisit l'outil à appliquer selon l'extension du fichier modifié :
#   - *.rs                      : rustfmt puis cargo clippy (portée du crate src-tauri) ;
#   - *.ts/.html                 : prettier --write puis eslint --fix ;
#   - *.scss/*.json/*.js/*.yml/*.yaml : prettier --write uniquement (pas de portée eslint.config.js sur ces
#     extensions, cf. bloc `files: ['**/*.ts']` de eslint.config.js).
#
# Ajout en relecture (Phase 0) : *.js/*.yml/*.yaml manquaient à l'origine, ce qui laissait les fichiers de
# configuration racine correspondants (ex. eslint.config.js, jest.config.js, .github/workflows/*.yml) hors de tout
# formatage automatique local.
#
# Ce hook reste un contrôle de confort local, au plus tôt : l'intégration continue (cf.
# docs/02_documentation/18_pic.md#mise-en-place-du-pipeline) reste le niveau de vérité bloquant pour l'analyse
# statique, que ce hook ait ou non été exécuté. Il ne doit donc jamais faire échouer la session Claude Code :
# toute erreur d'un outil est journalisée sur la sortie d'erreur mais n'interrompt jamais le hook (sortie 0).
set -uo pipefail

racine_depot="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
evenement="$(cat)"
fichier="$(printf '%s' "$evenement" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"

if [ -z "$fichier" ] || [ ! -f "$fichier" ]; then
  exit 0
fi

case "$fichier" in
  *.rs)
    (cd "$racine_depot/src-tauri" && cargo fmt -- "$fichier") 2>&1 | sed 's/^/[hook rustfmt] /' >&2 || true
    (cd "$racine_depot/src-tauri" && cargo clippy --quiet --all-targets) 2>&1 | sed 's/^/[hook clippy] /' >&2 || true
    ;;
  *.ts | *.html | *.scss | *.json | *.js | *.yml | *.yaml)
    (cd "$racine_depot" && npx --no-install prettier --write "$fichier") 2>&1 | sed 's/^/[hook prettier] /' >&2 || true
    case "$fichier" in
      *.ts | *.html)
        (cd "$racine_depot" && npx --no-install eslint --fix "$fichier") 2>&1 | sed 's/^/[hook eslint] /' >&2 || true
        ;;
    esac
    ;;
  *) ;;
esac

exit 0
