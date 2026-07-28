// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Point de passage unique vers le pont IPC Tauri (`invoke`), introduit le 2026-07-28 pour permettre le test manuel
// de l'interface en `ng serve` (aucun cœur natif disponible hors de l'application Tauri packagée). `isTauri()`
// (`@tauri-apps/api/core`, présent dès la v2) détecte le contexte réel d'exécution en testant la présence de
// `window.__TAURI_INTERNALS__` : absent en `ng serve` (navigateur nu), présent dans l'application packagée et en
// `npm run tauri dev`. Câblé successivement le même jour sur `FacadeCommandesService` (interrogations GitLab/Sonar,
// connectivité), `FacadeFichierService` (cycle de vie du fichier de données et de la session, après constat que
// l'écran de Démarrage plantait en `ng serve` faute de ce bouchon — `save`/`open` de `@tauri-apps/plugin-dialog`,
// bouchonnés séparément par `SelecteurFichierUtils`, précèdent d'ailleurs ces commandes dans le parcours
// utilisateur), puis `FacadeAdministrationService` (qualification des membres connus, politique IA, cycle de vie
// du brouillon d'une campagne, après constat qu'une campagne lancée en `ng serve` échouait silencieusement à
// l'étape `enregistrer_brouillon`, seule commande alors non bouchonnée du parcours de campagne). Les Façades
// restantes (paramétrage, alertes, vues) continuent d'appeler `invoke` directement.
import { invoke, isTauri } from '@tauri-apps/api/core';
import { BouchonAdministrationUtils } from './bouchon/bouchon-administration.utils';
import { BouchonCommandesUtils } from './bouchon/bouchon-commandes.utils';
import { BouchonFichierUtils } from './bouchon/bouchon-fichier.utils';

/**
 * Point de passage unique entre `FacadeCommandesService`/`FacadeFichierService`/`FacadeAdministrationService` et
 * le pont IPC Tauri, permettant de substituer un bouchon TS (`BouchonCommandesUtils`, `BouchonFichierUtils`,
 * `BouchonAdministrationUtils`) au cœur natif Rust hors contexte Tauri.
 */
export class InvocationCommandeUtils {
  /**
   * Invoque une commande, réellement via Tauri si l'application s'exécute dans son contexte natif, ou via le
   * bouchon TS adéquat sinon, désigné par la Façade dont relève la commande (`BouchonFichierUtils`,
   * `BouchonAdministrationUtils`, ou `BouchonCommandesUtils` par défaut).
   * @param commande - Nom de la commande (`snake_case`, identique côté cœur natif).
   * @param parametres - Paramètres de la commande, tels que transmis à `invoke`.
   * @returns La réponse typée de la commande.
   */
  public static async invoquer<TReponse>(
    commande: string,
    parametres?: Readonly<Record<string, unknown>>,
  ): Promise<TReponse> {
    if (isTauri()) {
      return invoke<TReponse>(commande, parametres);
    }
    if (BouchonFichierUtils.COMMANDES.has(commande)) {
      return BouchonFichierUtils.invoquer<TReponse>(commande);
    }
    if (BouchonAdministrationUtils.COMMANDES.has(commande)) {
      return BouchonAdministrationUtils.invoquer<TReponse>(commande, parametres ?? {});
    }
    return BouchonCommandesUtils.invoquer<TReponse>(commande, parametres ?? {});
  }
}
