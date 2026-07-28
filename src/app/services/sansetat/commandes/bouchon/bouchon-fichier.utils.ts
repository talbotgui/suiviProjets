// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Bouchon TS de `FacadeFichierService`, activé par `InvocationCommandeUtils` hors contexte Tauri (`ng serve`),
// introduit le 2026-07-28 pour débloquer l'écran de Démarrage (`SqmDemarrageComponent`), qui plantait avant ce
// bouchon en tentant d'invoquer `creer_fichier`/`charger_fichier` sans cœur natif disponible. Complète le bouchon
// des indicateurs GitLab/Sonar (`bouchon-commandes.utils.ts`) : `charger_fichier` renvoie une racine dont les
// sources sont les mêmes identifiants que ceux connus de ce dernier (cf. `donnees-racine-bouchon.ts`), pour que
// les écrans d'audit affichent des constats cohérents une fois le fichier bouchonné « chargé ».
import { RacineBouchonUtils, RACINE_BOUCHON_CHARGEMENT } from './donnees-racine-bouchon';
import type { RacineBouchon } from './donnees-racine-bouchon';

/**
 * Bouchon TS des commandes de la Façade portées par `FacadeFichierService` (cycle de vie du fichier de données et
 * de la session), activé hors contexte Tauri par `InvocationCommandeUtils`. Signature surchargée pour éviter toute
 * assertion de type à cette frontière, sur le modèle exact de `BouchonCommandesUtils.invoquer` (cf. commentaire
 * détaillé de cette méthode).
 */
export class BouchonFichierUtils {
  /**
   * Résout une commande bouchonnée, sur le modèle de `invoke<TReponse>(commande, parametres)`.
   * @param commande - Nom de la commande (`snake_case`, identique côté cœur natif).
   * @returns La réponse typée de la commande.
   */
  public static invoquer<TReponse>(commande: string): Promise<TReponse>;
  public static invoquer(commande: string): Promise<RacineBouchon | undefined> {
    switch (commande) {
      case 'creer_fichier':
        return Promise.resolve(RacineBouchonUtils.construireVide());
      case 'charger_fichier':
        return Promise.resolve(RACINE_BOUCHON_CHARGEMENT);
      case 'sauvegarder_fichier':
      case 'verrouiller_session':
      case 'deverrouiller_session':
        return Promise.resolve(undefined);
      default:
        return Promise.reject(
          new Error(`BouchonFichierUtils : commande « ${commande} » non bouchonnée.`),
        );
    }
  }

  /**
   * Noms des commandes de `FacadeFichierService` que ce bouchon sait résoudre, utilisé par
   * `InvocationCommandeUtils` pour distribuer un appel entre ce bouchon et `BouchonCommandesUtils`.
   */
  public static readonly COMMANDES: ReadonlySet<string> = new Set([
    'creer_fichier',
    'charger_fichier',
    'sauvegarder_fichier',
    'verrouiller_session',
    'deverrouiller_session',
  ]);
}
