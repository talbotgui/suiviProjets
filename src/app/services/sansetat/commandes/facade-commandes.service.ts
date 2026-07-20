// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Client typé de la Façade de commandes (Phase 2, US-003, US-004 ; Phase 3, US-008), frontière unique entre
// l'interface Angular et le cœur natif Rust (cf.
// docs/02_documentation/11_architectureTechnique.md#découpage-en-composantsmodules-et-responsabilités).
// Périmètre de la Phase 2 : commandes de credentials (`testerConnectivite`, `definirCredentials`). Périmètre de
// la Phase 3 : autocomplétion des branches d'un dépôt GitLab pour la ref auditée d'une source (`interrogerBranches`).
// Classé sous `services/sansetat/` : aucun état interne n'est conservé entre deux appels de ce service.
import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import type {
  ErreurConnecteur,
  Instance,
  ResultatInterrogationBranches,
  ResultatTestConnectivite,
  VerdictConnectivite,
} from './types-facade';

/**
 * Client typé de la Façade de commandes, dédié en Phase 2 aux credentials de session (US-003, US-004) et en
 * Phase 3 à l'autocomplétion des branches (US-008). Chaque méthode invoque une commande Tauri identique côté
 * cœur natif (`tester_connectivite`, `definir_credentials`, `interroger_branches`).
 */
@Injectable({ providedIn: 'root' })
export class FacadeCommandesService {
  /**
   * Teste la connectivité d'un credential pour une instance donnée et contrôle sa portée quand l'instance le
   * permet (US-004). Le résultat est un Résultat typé plutôt qu'un rejet de Promise non typé, à traiter par un
   * switch exhaustif sur son discriminant `type`.
   * @param instance - Instance GitLab ou Sonar à interroger.
   * @param credential - Credential à tester, transmis une seule fois, jamais conservé par ce client.
   * @returns Le verdict de connectivité en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async testerConnectivite(
    instance: Instance,
    credential: string,
  ): Promise<ResultatTestConnectivite> {
    try {
      const verdict = await invoke<VerdictConnectivite>('tester_connectivite', {
        instance,
        credential,
      });
      return { type: 'succes', verdict };
    } catch (erreur: unknown) {
      if (this.estErreurConnecteur(erreur)) {
        return { type: 'echec', anomalie: erreur };
      }
      return { type: 'echec', anomalie: { type: 'reponseInattendue' } };
    }
  }

  /**
   * Enregistre les credentials de la session courante en mémoire côté cœur natif (US-003), en miroir du Store
   * d'état applicatif de l'interface, afin qu'un unique verrouillage de session les efface des deux côtés (RG-004,
   * RG-005).
   * @param credentials - Credentials à mirroirer, par identifiant d'instance, jamais persistés (RG-004).
   */
  public async definirCredentials(credentials: Readonly<Record<string, string>>): Promise<void> {
    await invoke<void>('definir_credentials', { credentials });
  }

  /**
   * Interroge les branches d'un dépôt GitLab pour l'autocomplétion de la ref auditée d'une source (US-008). Le
   * credential utilisé est celui déjà mémorisé côté cœur natif pour cette instance (`definirCredentials`) : il
   * n'est jamais retransmis par cette méthode.
   * @param instance - Instance GitLab hébergeant le dépôt.
   * @param idExterne - Identifiant du projet GitLab côté instance (`Source.idExterne`).
   * @param recherche - Terme de recherche optionnel, pour restreindre la liste retournée.
   * @returns La liste des noms de branches en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerBranches(
    instance: Instance,
    idExterne: string,
    recherche?: string,
  ): Promise<ResultatInterrogationBranches> {
    try {
      const branches = await invoke<readonly string[]>('interroger_branches', {
        instance,
        idExterne,
        recherche,
      });
      return { type: 'succes', branches };
    } catch (erreur: unknown) {
      if (this.estErreurConnecteur(erreur)) {
        return { type: 'echec', anomalie: erreur };
      }
      return { type: 'echec', anomalie: { type: 'reponseInattendue' } };
    }
  }

  /**
   * Vérifie, sans accès non sûr à la valeur reçue, qu'un rejet de la commande native correspond bien à une
   * anomalie de connectivité typée (RG-021) plutôt qu'à une valeur inattendue de la frontière IPC.
   * @param valeur - Valeur rejetée par `invoke`, de type `unknown` à cette frontière.
   * @returns `true` si `valeur` correspond à la forme attendue d'une {@link ErreurConnecteur}.
   */
  private estErreurConnecteur(valeur: unknown): valeur is ErreurConnecteur {
    if (typeof valeur !== 'object' || valeur === null || !('type' in valeur)) {
      return false;
    }
    const categorie: unknown = valeur.type;
    return (
      categorie === 'authentificationRefusee' ||
      categorie === 'instanceInjoignable' ||
      categorie === 'delaiDepasse' ||
      categorie === 'reponseInattendue' ||
      categorie === 'droitsInsuffisants' ||
      categorie === 'credentialAbsent'
    );
  }
}
