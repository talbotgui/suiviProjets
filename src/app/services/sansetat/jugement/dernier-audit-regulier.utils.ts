// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Sélectionne le dernier audit RÉGULIER intégré d'un projet (`typeAudit !== 'historique'`), convention établie par
// l'évolution C15-14 (audit historique à date passée, US-046, RG-046) : la restitution « dernier audit » par défaut
// ne doit jamais être un simple `Projet.audits.at(-1)`, car un audit historique (date ciblée dans le passé,
// périmètre d'indicateurs réduit) intégré après coup se retrouverait en dernière position du tableau
// (`Projet.audits` suit l'ordre d'intégration, cf. `src-tauri/src/persistance/audit.rs`, jamais l'ordre des dates
// ciblées) et remplacerait silencieusement l'audit régulier courant.
//
// Ce module centralise le filtre `projet.audits.filter((a) => a.typeAudit !== 'historique').at(-1)` jusqu'ici
// dupliqué à l'identique dans `SqmFicheProjetComponent` et `SqmSyntheseAuditsComponent`, et absent (à tort) de
// `SqmAccueilComponent`, `SqmListeTravailComponent`, `SqmDemarrageComponent` et
// `PerimetreCampagneUtils.projetsNonAuditesDepuis`, ce qui provoquait deux incohérences constatées : des projets
// audités le jour même signalés « non audités depuis longtemps » sur l'Accueil, et des membres inconnus signalés
// par la Synthèse des audits mais absents de la Liste de travail.
//
// Classé sous `services/sansetat/` : n'importe rien de `services/avecetat/` (frontière de couches du projet). Le
// type `Audit` étant déclaré côté `services/avecetat/etat/types-donnees.ts`, la méthode est générique sur la forme
// réelle des audits (surtypage structurel par largeur : un `readonly Audit[]` reste assignable au paramètre), sur
// le modèle déjà retenu par `agregation-theme-fiche-projet.utils.ts` pour la même contrainte de couches.

/**
 * Catégorie d'audit, forme minimale consommée par ce module (mirroir structurel de `TypeAudit`,
 * `services/avecetat/etat/types-donnees.ts`, non importable ici, cf. commentaire d'en-tête).
 */
type TypeAuditMinimal = 'reguliere' | 'historique';

/**
 * Sélection du dernier audit régulier intégré d'un projet (convention C15-14, US-046, RG-046).
 */
export class DernierAuditRegulierUtils {
  /**
   * Restitue le dernier audit régulier intégré (`typeAudit !== 'historique'`) d'un tableau d'audits ordonné par
   * intégration (`Projet.audits`), en ignorant systématiquement les audits historiques à date passée (C15-14,
   * US-046, RG-046). Fonction pure, sans effet de bord : ne fait que retrouver une entrée déjà présente.
   * @param audits - Historique des audits intégrés du projet, dans l'ordre d'intégration.
   * @returns Le dernier audit régulier, `undefined` si le projet n'a aucun audit régulier (jamais audité, ou
   * uniquement des audits historiques).
   */
  public static dernierAuditRegulier<T extends { readonly typeAudit: TypeAuditMinimal }>(
    audits: readonly T[],
  ): T | undefined {
    return audits.filter((audit) => audit.typeAudit !== 'historique').at(-1);
  }
}
