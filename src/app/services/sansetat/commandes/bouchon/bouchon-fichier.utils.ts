// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Bouchon TS de `FacadeFichierService`, activé par `InvocationCommandeUtils` hors contexte Tauri (`ng serve`),
// introduit le 2026-07-28 pour débloquer l'écran de Démarrage (`SqmDemarrageComponent`), qui plantait avant ce
// bouchon en tentant d'invoquer `creer_fichier`/`charger_fichier` sans cœur natif disponible. Complète le bouchon
// des indicateurs GitLab/Sonar (`bouchon-commandes.utils.ts`) : `charger_fichier` renvoie une racine dont les
// sources sont les mêmes identifiants que ceux connus de ce dernier (cf. `donnees-racine-bouchon.ts`), pour que
// les écrans d'audit affichent des constats cohérents une fois le fichier bouchonné « chargé ».
//
// Étendu en Phase 15 (C15-03, US-041, RG-038) à `changer_mot_de_passe_fichier` : seule commande de ce bouchon à
// recevoir des `parametres` (la racine courante, pour y consigner une entrée de journal simulée), d'où la signature
// de `invoquer` désormais alignée sur celle de `BouchonParametrageUtils.invoquer`, RG-023 non alimenté avec le même
// luxe de détail que le cœur natif (mêmes limites déjà assumées par `BouchonParametrageUtils`, cf. son commentaire
// d'en-tête), le contenu du mot de passe n'étant en tout état de cause jamais consigné, ni côté cœur natif ni ici.
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
   * @param parametres - Paramètres de la commande, tels que transmis par la Façade à `invoke` (seule
   * `changer_mot_de_passe_fichier` en consomme, pour y consigner une entrée de journal simulée).
   * @returns La réponse typée de la commande.
   */
  public static invoquer<TReponse>(
    commande: string,
    parametres?: Readonly<Record<string, unknown>>,
  ): Promise<TReponse>;
  public static invoquer(
    commande: string,
    parametres?: Readonly<Record<string, unknown>>,
  ): Promise<RacineBouchon | Record<string, unknown> | undefined> {
    switch (commande) {
      case 'creer_fichier':
        return Promise.resolve(RacineBouchonUtils.construireVide());
      case 'charger_fichier':
        return Promise.resolve(RACINE_BOUCHON_CHARGEMENT);
      case 'sauvegarder_fichier':
      case 'verrouiller_session':
      case 'deverrouiller_session':
        return Promise.resolve(undefined);
      case 'changer_mot_de_passe_fichier':
        return Promise.resolve(BouchonFichierUtils.changerMotDePasseFichier(parametres ?? {}));
      default:
        return Promise.reject(
          new Error(`BouchonFichierUtils : commande « ${commande} » non bouchonnée.`),
        );
    }
  }

  /**
   * Consigne une entrée de journal simulée du changement de mot de passe (US-041, RG-038), sans jamais y exposer
   * l'un ou l'autre mot de passe reçu, sur le même principe que le cœur natif.
   * @param parametres - Paramètres reçus, portant `donnees` (la racine courante).
   * @returns La racine mise à jour avec la nouvelle entrée de journal.
   */
  private static changerMotDePasseFichier(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const donnees = BouchonFichierUtils.estObjet(parametres['donnees'])
      ? parametres['donnees']
      : {};
    const journal: readonly unknown[] = Array.isArray(donnees['journal']) ? donnees['journal'] : [];
    const horodatage = new Date().toISOString();
    return {
      ...donnees,
      journal: [
        ...journal,
        {
          id: crypto.randomUUID(),
          horodatage,
          objet: 'securite.motDePasseFichier',
          avant: null,
          apres: null,
          origine: 'Paramétrage',
          detailOrigine: 'Changement du mot de passe du fichier',
        },
      ],
    };
  }

  /**
   * Vérifie qu'une valeur reçue à cette frontière non typée est bien un objet, sur le modèle de
   * `BouchonParametrageUtils.estObjet`.
   * @param valeur - Valeur à vérifier.
   * @returns `true` si `valeur` est un objet non nul.
   */
  private static estObjet(valeur: unknown): valeur is Record<string, unknown> {
    return typeof valeur === 'object' && valeur !== null;
  }

  /**
   * Noms des commandes de `FacadeFichierService` que ce bouchon sait résoudre, utilisé par
   * `InvocationCommandeUtils` pour distribuer un appel entre ce bouchon et `BouchonCommandesUtils`.
   */
  public static readonly COMMANDES: ReadonlySet<string> = new Set([
    'creer_fichier',
    'charger_fichier',
    'sauvegarder_fichier',
    'changer_mot_de_passe_fichier',
    'verrouiller_session',
    'deverrouiller_session',
  ]);
}
