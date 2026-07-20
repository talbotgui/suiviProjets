// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Validation par schéma du JSON collé de credentials (US-003, RG-004), cf.
// docs/02_documentation/15_normesSecurite.md#contrôle-des-entrées-et-sorties : « un contenu malformé ou hors
// schéma est rejeté avec un message explicite, sans tentative d'interprétation partielle ». Le schéma attendu est
// une simple map plate `identifiant d'instance -> jeton` (`docs/01_besoin/Specification.md#52-f02--gestion-des-credentials-et-assistant-de-création`,
// à titre indicatif) : une fonction de validation manuelle suffit, sans dépendance de validation JSON Schema
// dédiée. Ne vérifie pas la correspondance des identifiants avec des instances réellement configurées
// (l'Administration n'existe pas avant la Phase 3) : validation de forme uniquement, limite assumée.
//
// Le type des credentials validés (`Readonly<Record<string, string>>`) est redéfini localement plutôt qu'importé
// du Store d'état applicatif (`CredentialsEnMemoire`, `services/avecetat/etat/`) : ce module `sansetat/` reste
// ainsi autonome, sans dépendance vers la couche `avecetat/`, conformément au découpage en couches du projet.

/**
 * Résultat typé de la validation du JSON de credentials collé, à traiter par un switch exhaustif sur `type`.
 */
export type ResultatValidationCredentials =
  | { readonly type: 'valide'; readonly credentials: Readonly<Record<string, string>> }
  | { readonly type: 'invalide'; readonly message: string };

/**
 * Classe utilitaire à membres statiques uniquement dédiée à la validation du JSON de credentials collé par
 * l'utilisateur (US-003), sur le modèle du gabarit `ExempleReferenceUtils`.
 */
export class ValidationCredentialsUtils {
  /**
   * Valide un contenu JSON collé contre le schéma attendu (map plate `identifiant d'instance -> jeton non vide`),
   * sans tentative d'interprétation partielle en cas d'écart (RG-004, `15_normesSecurite.md`).
   * @param contenu - Contenu brut collé par l'utilisateur.
   * @returns Le résultat de validation : credentials extraits si valide, message explicite sinon.
   */
  public static validerJsonCredentials(contenu: string): ResultatValidationCredentials {
    let valeur: unknown;
    try {
      valeur = JSON.parse(contenu);
    } catch {
      return { type: 'invalide', message: "Le contenu collé n'est pas un JSON valide." };
    }

    if (typeof valeur !== 'object' || valeur === null || Array.isArray(valeur)) {
      return {
        type: 'invalide',
        message:
          "Le contenu collé doit être un objet JSON associant un identifiant d'instance à un jeton, pas un tableau ni une valeur simple.",
      };
    }

    const credentials: Record<string, string> = {};
    for (const [identifiant, jeton] of Object.entries(valeur)) {
      if (typeof jeton !== 'string' || jeton.length === 0) {
        return {
          type: 'invalide',
          message: `La valeur associée à l'identifiant « ${identifiant} » doit être une chaîne non vide.`,
        };
      }
      credentials[identifiant] = jeton;
    }

    return { type: 'valide', credentials };
  }
}
