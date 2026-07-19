#!/usr/bin/env bash
# Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
# .claude/rules/01-usage-ia-et-conventions.md.
#
# Hook Claude Code UserPromptSubmit : journalise l'horodatage et le contenu de chaque prompt soumis directement
# par l'utilisateur dans la session principale, conformément à
# docs/02_documentation/17_posteDeveloppeur.md#traçabilité-des-échanges-avec-lia et
# .claude/rules/12-poste-developpeur.md#traçabilité-des-échanges-avec-lia.
#
# Ce hook n'est déclaré que pour l'événement UserPromptSubmit de la session principale : les échanges internes
# des sous-agents (délégation via l'outil Agent) ne déclenchent pas cet événement et ne sont donc, par
# construction, jamais consignés ici (cf. décision actée dans la documentation citée ci-dessus).
#
# Fichier de journal strictement local (.claude/logs/prompts.log), exclu du suivi de version (.gitignore),
# sans transmission distante, conformément à l'absence de télémétrie actée par les normes de sécurité du projet.
set -uo pipefail

racine_depot="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
repertoire_journaux="$racine_depot/.claude/logs"
fichier_journal="$repertoire_journaux/prompts.log"

mkdir -p "$repertoire_journaux"

evenement="$(cat)"
prompt="$(printf '%s' "$evenement" | jq -r '.prompt // empty' 2>/dev/null)"
horodatage="$(date --iso-8601=seconds)"

if [ -n "$prompt" ]; then
  {
    printf '[%s]\n' "$horodatage"
    printf '%s\n' "$prompt"
    printf -- '---\n'
  } >>"$fichier_journal"
fi

exit 0
