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
// l'étape `enregistrer_brouillon`, seule commande alors non bouchonnée du parcours de campagne). Étendu à la
// Phase 12 à `FacadeParametrageService` (seuils, référentiels, purges, réglages applicatifs), `FacadeAlertesService`
// (annotations, qualification d'alerte) et `FacadeVuesService` (vues enregistrées), qui appelaient `invoke`
// directement jusqu'ici — écart constaté lors de la préparation du test de bout en bout Playwright (tout appel de
// ces trois Façades échouait systématiquement en `ng serve`). `FacadeConfigurationPartageableService` (export/
// import) reste volontairement hors de ce point de passage : son propre commentaire d'en-tête documente déjà que
// l'export/import est intrinsèquement lié à un vrai fichier du disque, choisi via une boîte de dialogue native
// bouchonnée séparément par `SelecteurFichierUtils` — un bouchon dédié serait peu représentatif une fois simulé ;
// exclu du parcours du test de bout en bout Playwright pour cette même raison (cf. Phase 12 du plan).
//
// Point de passage unique également retenu pour l'indicateur de chargement transverse (Phase 11, R11-04, cf.
// `IndicateurChargementUtils.envelopper`) : couvre ainsi automatiquement les Façades déjà câblées ici (bouchon
// compris, pour un comportement identique en `ng serve`) ; les Façades restantes, qui appellent encore `invoke`
// directement, enveloppent chacun de leurs appels individuellement avec ce même point d'enveloppe (cf. leurs
// fichiers respectifs).
import { invoke, isTauri } from '@tauri-apps/api/core';
import { BouchonAdministrationUtils } from './bouchon/bouchon-administration.utils';
import { BouchonAlertesUtils } from './bouchon/bouchon-alertes.utils';
import { BouchonCommandesUtils } from './bouchon/bouchon-commandes.utils';
import { BouchonFichierUtils } from './bouchon/bouchon-fichier.utils';
import { BouchonParametrageUtils } from './bouchon/bouchon-parametrage.utils';
import { BouchonVuesUtils } from './bouchon/bouchon-vues.utils';
import { IndicateurChargementUtils } from './indicateur-chargement.utils';

/**
 * Point de passage unique entre `FacadeCommandesService`/`FacadeFichierService`/`FacadeAdministrationService`/
 * `FacadeParametrageService`/`FacadeAlertesService`/`FacadeVuesService` et le pont IPC Tauri, permettant de
 * substituer un bouchon TS (`BouchonCommandesUtils`, `BouchonFichierUtils`, `BouchonAdministrationUtils`,
 * `BouchonParametrageUtils`, `BouchonAlertesUtils`, `BouchonVuesUtils`) au cœur natif Rust hors contexte Tauri.
 */
export class InvocationCommandeUtils {
  /**
   * Invoque une commande, réellement via Tauri si l'application s'exécute dans son contexte natif, ou via le
   * bouchon TS adéquat sinon, désigné par la Façade dont relève la commande (`BouchonFichierUtils`,
   * `BouchonAdministrationUtils`, `BouchonParametrageUtils`, `BouchonAlertesUtils`, `BouchonVuesUtils`, ou
   * `BouchonCommandesUtils` par défaut).
   * @param commande - Nom de la commande (`snake_case`, identique côté cœur natif).
   * @param parametres - Paramètres de la commande, tels que transmis à `invoke`.
   * @returns La réponse typée de la commande.
   */
  public static async invoquer<TReponse>(
    commande: string,
    parametres?: Readonly<Record<string, unknown>>,
  ): Promise<TReponse> {
    return IndicateurChargementUtils.envelopper(async () => {
      if (isTauri()) {
        return invoke<TReponse>(commande, parametres);
      }
      if (BouchonFichierUtils.COMMANDES.has(commande)) {
        return BouchonFichierUtils.invoquer<TReponse>(commande);
      }
      if (BouchonAdministrationUtils.COMMANDES.has(commande)) {
        return BouchonAdministrationUtils.invoquer<TReponse>(commande, parametres ?? {});
      }
      if (BouchonParametrageUtils.COMMANDES.has(commande)) {
        return BouchonParametrageUtils.invoquer<TReponse>(commande, parametres ?? {});
      }
      if (BouchonAlertesUtils.COMMANDES.has(commande)) {
        return BouchonAlertesUtils.invoquer<TReponse>(commande, parametres ?? {});
      }
      if (BouchonVuesUtils.COMMANDES.has(commande)) {
        return BouchonVuesUtils.invoquer<TReponse>(commande, parametres ?? {});
      }
      return BouchonCommandesUtils.invoquer<TReponse>(commande, parametres ?? {});
    });
  }
}
