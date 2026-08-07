// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Bouchon TS de `FacadeAlertesService`, activé par `InvocationCommandeUtils` hors contexte Tauri (`ng serve`),
// introduit à la Phase 12 après constat que ce service appelait `invoke` directement jusqu'ici (cf. commentaire
// d'en-tête d'`invocation-commande.utils.ts`), en échec systématique hors contexte Tauri — bloquant notamment le
// traitement d'une alerte depuis l'écran Liste de travail lors d'un rejeu du test de bout en bout Playwright.
//
// Reproduit une version volontairement simplifiée de la logique métier du cœur natif
// (`src-tauri/src/commandes/alertes.rs`, hors périmètre de lecture de cette tâche), sur le modèle déjà retenu par
// `BouchonAdministrationUtils`/`BouchonParametrageUtils` : mutations structurelles correctes, mais sans certaines
// finesses des règles de gestion, signalées ci-dessous comme décisions arbitraires :
// - RG-023 (journal des modifications) : jamais alimenté par ce bouchon, comme déjà pour les bouchons voisins.
//
// Volontairement non typé sur `DonneesRacine`/`Groupe`/`Projet`/… (`services/avecetat/etat/types-donnees.ts`),
// interdits en dépendance depuis `services/sansetat/` (cf. commentaire d'en-tête de `donnees-racine-bouchon.ts`) :
// traversée défensive de type `unknown`, sur le modèle déjà retenu par `BouchonAdministrationUtils`.

type CategorieAnomalieBouchonAlertes =
  'groupeIntrouvable' | 'projetIntrouvable' | 'annotationIntrouvable';

/**
 * Anomalie typée levée par ce bouchon, sur le modèle d'`AnomalieAdministrationBouchon`
 * (`bouchon-administration.utils.ts`).
 */
class AnomalieAlertesBouchon extends Error {
  public readonly type: CategorieAnomalieBouchonAlertes;

  public constructor(type: CategorieAnomalieBouchonAlertes) {
    super(`BouchonAlertesUtils : anomalie « ${type} ».`);
    this.type = type;
  }
}

/**
 * Bouchon TS des trois commandes de la Façade portées par `FacadeAlertesService` (annotations, qualification
 * d'alerte), activé hors contexte Tauri par `InvocationCommandeUtils`.
 */
export class BouchonAlertesUtils {
  /**
   * Noms des commandes de `FacadeAlertesService` que ce bouchon sait résoudre, utilisé par
   * `InvocationCommandeUtils` pour distribuer un appel entre ce bouchon et les autres.
   */
  public static readonly COMMANDES: ReadonlySet<string> = new Set([
    'creer_annotation',
    'supprimer_annotation',
    'qualifier_alerte',
  ]);

  /**
   * Résout une commande bouchonnée, sur le modèle de `invoke<TReponse>(commande, parametres)`. Toute anomalie
   * levée par les mutations structurelles ci-dessous (synchrones) est rattrapée puis convertie en rejet de
   * Promise, jamais laissée s'échapper en exception synchrone, sur le modèle de `BouchonAdministrationUtils`.
   * @param commande - Nom de la commande (`snake_case`, identique côté cœur natif).
   * @param parametres - Paramètres de la commande, tels que transmis par la Façade à `invoke`.
   * @returns La réponse typée de la commande.
   */
  public static invoquer<TReponse>(
    commande: string,
    parametres: Readonly<Record<string, unknown>>,
  ): Promise<TReponse>;
  public static invoquer(
    commande: string,
    parametres: Readonly<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    try {
      return Promise.resolve(BouchonAlertesUtils.resoudre(commande, parametres));
    } catch (erreur: unknown) {
      return Promise.reject(erreur instanceof Error ? erreur : new Error(String(erreur)));
    }
  }

  /**
   * Distribue la commande vers sa résolution bouchonnée dédiée.
   * @param commande - Nom de la commande.
   * @param parametres - Paramètres de la commande.
   * @returns La réponse brute, enveloppée par {@link invoquer}.
   */
  private static resoudre(
    commande: string,
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    switch (commande) {
      case 'creer_annotation':
        return BouchonAlertesUtils.horodater(BouchonAlertesUtils.creerAnnotation(parametres));
      case 'supprimer_annotation':
        return BouchonAlertesUtils.horodater(BouchonAlertesUtils.supprimerAnnotation(parametres));
      case 'qualifier_alerte':
        return BouchonAlertesUtils.horodater(BouchonAlertesUtils.qualifierAlerte(parametres));
      default:
        throw new Error(`BouchonAlertesUtils : commande « ${commande} » non bouchonnée.`);
    }
  }

  /**
   * Crée une annotation de portée groupe ou projet (US-019).
   * @param parametres - Paramètres reçus (`groupeId`, `projetId`, `date`, `libelle`, `categorie`, `description`,
   * `donnees`).
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static creerAnnotation(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const donnees = BouchonAlertesUtils.exigerObjet(parametres['donnees']);
    const groupeId = BouchonAlertesUtils.lireTexte(parametres, 'groupeId');
    const projetId = BouchonAlertesUtils.lireTexteOptionnel(parametres, 'projetId');
    const nouvelleAnnotation = {
      id: crypto.randomUUID(),
      date: BouchonAlertesUtils.lireTexte(parametres, 'date'),
      libelle: BouchonAlertesUtils.lireTexte(parametres, 'libelle'),
      categorie: BouchonAlertesUtils.lireTexte(parametres, 'categorie'),
      description: BouchonAlertesUtils.lireTexteOptionnel(parametres, 'description'),
      systeme: false,
    };

    return BouchonAlertesUtils.transformerPortee(donnees, groupeId, projetId, (annotations) => [
      ...annotations,
      nouvelleAnnotation,
    ]);
  }

  /**
   * Supprime une annotation de portée groupe ou projet par identifiant (US-019, RG-033).
   * @param parametres - Paramètres reçus (`groupeId`, `projetId`, `annotationId`, `donnees`).
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static supprimerAnnotation(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const donnees = BouchonAlertesUtils.exigerObjet(parametres['donnees']);
    const groupeId = BouchonAlertesUtils.lireTexte(parametres, 'groupeId');
    const projetId = BouchonAlertesUtils.lireTexteOptionnel(parametres, 'projetId');
    const annotationId = BouchonAlertesUtils.lireTexte(parametres, 'annotationId');

    return BouchonAlertesUtils.transformerPortee(donnees, groupeId, projetId, (annotations) =>
      annotations.filter((annotation) => annotation['id'] !== annotationId),
    );
  }

  /**
   * Applique une transformation à la liste `annotations` du groupe (portée groupe) ou du projet désigné (portée
   * projet), selon que `projetId` est fourni.
   * @param donnees - Racine courante.
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param projetId - Identifiant du projet de rattachement, absent pour une portée groupe.
   * @param transformer - Fonction pure produisant la nouvelle liste d'annotations.
   * @returns La racine avec `groupes` mis à jour.
   */
  private static transformerPortee(
    donnees: Record<string, unknown>,
    groupeId: string,
    projetId: string | undefined,
    transformer: (
      annotations: readonly Record<string, unknown>[],
    ) => readonly Record<string, unknown>[],
  ): Record<string, unknown> {
    const groupes = BouchonAlertesUtils.lireListe(donnees, 'groupes');
    const indexGroupe = groupes.findIndex((groupe) => groupe['id'] === groupeId);
    if (indexGroupe === -1) {
      throw new AnomalieAlertesBouchon('groupeIntrouvable');
    }
    const nouveauxGroupes = [...groupes];
    const groupe = groupes[indexGroupe];

    if (projetId === undefined) {
      nouveauxGroupes[indexGroupe] = {
        ...groupe,
        annotations: transformer(BouchonAlertesUtils.lireListe(groupe, 'annotations')),
      };
      return { ...donnees, groupes: nouveauxGroupes };
    }

    const projets = BouchonAlertesUtils.lireListe(groupe, 'projets');
    const indexProjet = projets.findIndex((projet) => projet['id'] === projetId);
    if (indexProjet === -1) {
      throw new AnomalieAlertesBouchon('projetIntrouvable');
    }
    const nouveauxProjets = [...projets];
    nouveauxProjets[indexProjet] = {
      ...projets[indexProjet],
      annotations: transformer(BouchonAlertesUtils.lireListe(projets[indexProjet], 'annotations')),
    };
    nouveauxGroupes[indexGroupe] = { ...groupe, projets: nouveauxProjets };
    return { ...donnees, groupes: nouveauxGroupes };
  }

  /**
   * Qualifie une alerte (US-020) : met à jour l'entrée existante de `traitementsAlertes` désignée par `cleAlerte`,
   * ou en crée une nouvelle si absente.
   * @param parametres - Paramètres reçus (`cleAlerte`, `statut`, `commentaire`, `donnees`).
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static qualifierAlerte(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const donnees = BouchonAlertesUtils.exigerObjet(parametres['donnees']);
    const cleAlerte = BouchonAlertesUtils.lireTexte(parametres, 'cleAlerte');
    const traitements = BouchonAlertesUtils.lireListe(donnees, 'traitementsAlertes');
    const nouveauTraitement = {
      id: crypto.randomUUID(),
      cleAlerte,
      statut: BouchonAlertesUtils.lireTexte(parametres, 'statut'),
      commentaire: BouchonAlertesUtils.lireTexteOptionnel(parametres, 'commentaire'),
      horodatage: new Date().toISOString(),
    };
    const index = traitements.findIndex((traitement) => traitement['cleAlerte'] === cleAlerte);
    const nouveauxTraitements =
      index === -1
        ? [...traitements, nouveauTraitement]
        : traitements.map((traitement, position) =>
            position === index ? { ...nouveauTraitement, id: traitement['id'] } : traitement,
          );
    return { ...donnees, traitementsAlertes: nouveauxTraitements };
  }

  /**
   * Met à jour `meta.modifieLe` à l'horodatage courant, sur le modèle de `BouchonAdministrationUtils.horodater`.
   * @param donnees - Racine à horodater.
   * @returns La racine avec `meta.modifieLe` mis à jour.
   */
  private static horodater(donnees: Record<string, unknown>): Record<string, unknown> {
    const meta = BouchonAlertesUtils.estObjet(donnees['meta']) ? donnees['meta'] : {};
    return { ...donnees, meta: { ...meta, modifieLe: new Date().toISOString() } };
  }

  /**
   * Vérifie qu'une valeur reçue à cette frontière non typée est bien un objet, sur le modèle de
   * `BouchonAdministrationUtils.estObjet`.
   * @param valeur - Valeur à vérifier.
   * @returns `true` si `valeur` est un objet non nul.
   */
  private static estObjet(valeur: unknown): valeur is Record<string, unknown> {
    return typeof valeur === 'object' && valeur !== null;
  }

  /**
   * Vérifie que `parametres['donnees']` (la racine courante transmise par l'appelant) est bien un objet.
   * @param valeur - Valeur reçue.
   * @returns La valeur, réputée être la racine courante.
   */
  private static exigerObjet(valeur: unknown): Record<string, unknown> {
    if (!BouchonAlertesUtils.estObjet(valeur)) {
      throw new Error('BouchonAlertesUtils : paramètre « donnees » absent ou mal formé.');
    }
    return valeur;
  }

  /**
   * Lit un tableau d'objets à une clé donnée, liste vide si absent, mal typé, ou si ses éléments ne sont pas
   * eux-mêmes des objets.
   * @param objet - Objet source.
   * @param cle - Clé à lire.
   * @returns Le tableau d'objets, jamais `undefined`.
   */
  private static lireListe(
    objet: Record<string, unknown>,
    cle: string,
  ): readonly Record<string, unknown>[] {
    const valeur = objet[cle];
    if (!Array.isArray(valeur)) {
      return [];
    }
    return valeur.filter((entree): entree is Record<string, unknown> =>
      BouchonAlertesUtils.estObjet(entree),
    );
  }

  /**
   * Lit une chaîne à une clé donnée, chaîne vide si absente ou mal typée.
   * @param objet - Objet source.
   * @param cle - Clé à lire.
   * @returns La chaîne lue.
   */
  private static lireTexte(objet: Record<string, unknown>, cle: string): string {
    const valeur = objet[cle];
    return typeof valeur === 'string' ? valeur : '';
  }

  /**
   * Lit une chaîne optionnelle à une clé donnée, `undefined` si absente, mal typée ou vide.
   * @param objet - Objet source.
   * @param cle - Clé à lire.
   * @returns La chaîne lue, ou `undefined`.
   */
  private static lireTexteOptionnel(
    objet: Record<string, unknown>,
    cle: string,
  ): string | undefined {
    const valeur = objet[cle];
    return typeof valeur === 'string' && valeur.length > 0 ? valeur : undefined;
  }
}
