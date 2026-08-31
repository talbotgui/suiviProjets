// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Classe l'écosystème d'une dépendance constatée (Maven, NPM, Autres) à partir du seul nom de fichier de son
// manifeste (RG-056), pour la restitution ventilée des dépendances sur la Fiche projet (F12) et la Comparaison
// d'audits (F13). Aligné sur la liste blanche `NOMS_MANIFESTES_RECONNUS` du parseur natif
// (`src-tauri/src/connecteurs/gitlab.rs`) : `pom.xml` et `build.gradle` relèvent de Maven, `package.json` de NPM,
// tout autre manifeste (ou aucun) de « Autres ». La pseudo-dépendance de référence `java` (version du runtime
// Java, cf. `obsolescence.component.ts`, indicateur `estJava`) est rattachée à Maven. Calcul d'affichage pur,
// aucune I/O, aucune dépendance vers `services/avecetat/`.

/**
 * Écosystème d'appartenance d'une dépendance constatée (RG-056).
 */
export type EcosystemeDependance = 'maven' | 'npm' | 'autres';

/**
 * Utilitaires de classification d'écosystème d'une dépendance à partir du nom de son manifeste (RG-056). Classe à
 * membres statiques uniquement (règle « aucune fonction hors classe »).
 */
export class EcosystemeDependanceUtils {
  /**
   * Écosystèmes dans l'ordre d'affichage des sections repliables (Maven, puis NPM, puis Autres).
   */
  public static readonly ORDRE: readonly EcosystemeDependance[] = ['maven', 'npm', 'autres'];

  /**
   * Déduit l'écosystème d'une dépendance du nom de fichier de son manifeste (RG-056), aligné sur
   * `NOMS_MANIFESTES_RECONNUS` du parseur natif (`src-tauri/src/connecteurs/gitlab.rs`) : le dernier segment du
   * chemin de manifeste (après le dernier `/`) valant `pom.xml` ou `build.gradle` renvoie `'maven'`,
   * `package.json` renvoie `'npm'`, tout autre renvoie `'autres'`. La pseudo-dépendance de référence `java`
   * (runtime) est rattachée à Maven quel que soit son manifeste.
   * @param dependance - Dépendance constatée (seuls `reference` et `manifeste` sont consultés).
   * @param dependance.reference - Référence unique de la dépendance (ex. coordonnées Maven, nom de paquet npm).
   * @param dependance.manifeste - Chemin du manifeste d'où provient la dépendance.
   * @returns L'écosystème d'appartenance.
   */
  public static classifier(dependance: {
    readonly reference: string;
    readonly manifeste: string;
  }): EcosystemeDependance {
    if (dependance.reference === 'java') {
      return 'maven';
    }
    const segments = dependance.manifeste.split('/');
    const nomFichier = segments[segments.length - 1];
    switch (nomFichier) {
      case 'pom.xml':
      case 'build.gradle':
        return 'maven';
      case 'package.json':
        return 'npm';
      default:
        return 'autres';
    }
  }

  /**
   * Libellé affiché de la section repliable d'un écosystème.
   * @param ecosysteme - Écosystème concerné.
   * @returns Le libellé affiché (« Maven », « NPM », « Autres »).
   */
  public static titre(ecosysteme: EcosystemeDependance): string {
    switch (ecosysteme) {
      case 'maven':
        return 'Maven';
      case 'npm':
        return 'NPM';
      case 'autres':
        return 'Autres';
    }
  }
}
