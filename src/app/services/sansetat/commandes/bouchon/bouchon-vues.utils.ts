// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Bouchon TS de `FacadeVuesService`, activé par `InvocationCommandeUtils` hors contexte Tauri (`ng serve`),
// introduit à la Phase 12 après constat que ce service appelait `invoke` directement jusqu'ici (cf. commentaire
// d'en-tête d'`invocation-commande.utils.ts`), en échec systématique hors contexte Tauri — bloquant notamment
// l'enregistrement d'une vue depuis l'écran Synthèse des audits lors d'un rejeu du test de bout en bout Playwright.
//
// Reproduit une version volontairement simplifiée de la logique métier du cœur natif
// (`src-tauri/src/commandes/vues.rs`), sur le modèle déjà retenu par les bouchons voisins. Depuis le plan_16
// (incrément 4, RG-054), toute mutation de vue consigne une entrée du journal des modifications (`avant`/`apres`
// résumés en `{ nom, ecran, parDefaut }`, jamais le contenu des filtres), pour que le test de bout en bout puisse
// vérifier cette journalisation.
//
// Volontairement non typé sur `DonneesRacine`/`VueEnregistree`/… (`services/avecetat/etat/types-donnees.ts`),
// interdits en dépendance depuis `services/sansetat/` (cf. commentaire d'en-tête de `donnees-racine-bouchon.ts`) :
// traversée défensive de type `unknown`, sur le modèle déjà retenu par `BouchonAdministrationUtils`.

/**
 * Bouchon TS des deux commandes de la Façade portées par `FacadeVuesService` (vues enregistrées), activé hors
 * contexte Tauri par `InvocationCommandeUtils`.
 */
export class BouchonVuesUtils {
  /**
   * Noms des commandes de `FacadeVuesService` que ce bouchon sait résoudre, utilisé par `InvocationCommandeUtils`
   * pour distribuer un appel entre ce bouchon et les autres.
   */
  public static readonly COMMANDES: ReadonlySet<string> = new Set(['definir_vue', 'supprimer_vue']);

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
      return Promise.resolve(BouchonVuesUtils.resoudre(commande, parametres));
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
      case 'definir_vue':
        return BouchonVuesUtils.horodater(BouchonVuesUtils.definirVue(parametres));
      case 'supprimer_vue':
        return BouchonVuesUtils.horodater(BouchonVuesUtils.supprimerVue(parametres));
      default:
        throw new Error(`BouchonVuesUtils : commande « ${commande} » non bouchonnée.`);
    }
  }

  /**
   * Ajoute ou met à jour une vue enregistrée par identifiant (US-028). Si `parametres.parDefaut` est vrai, retire
   * ce statut des autres vues du même écran (une seule vue par défaut par écran).
   * @param parametres - Paramètres reçus (`id`, `nom`, `ecran`, `versionFiltres`, `parDefaut`, `filtres`,
   * `donnees`).
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static definirVue(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const donnees = BouchonVuesUtils.exigerObjet(parametres['donnees']);
    const ecran = BouchonVuesUtils.lireTexte(parametres, 'ecran');
    const parDefaut = parametres['parDefaut'] === true;
    const idExistant = BouchonVuesUtils.lireTexteOptionnel(parametres, 'id');
    const id = idExistant ?? crypto.randomUUID();
    const nouvelleVue = {
      id,
      nom: BouchonVuesUtils.lireTexte(parametres, 'nom'),
      ecran,
      versionFiltres:
        typeof parametres['versionFiltres'] === 'number' ? parametres['versionFiltres'] : 1,
      parDefaut,
      filtres: parametres['filtres'] ?? null,
    };

    const vues = BouchonVuesUtils.lireListe(donnees, 'vuesEnregistrees');
    const index = vues.findIndex((vue) => vue['id'] === id);
    // Rétrogradations implicites des autres vues par défaut du même écran (RG-023 étendu), comme côté cœur natif :
    // à la création comme à la mise à jour.
    const retrogradees = parDefaut
      ? vues.filter(
          (vue) => vue['ecran'] === ecran && vue['id'] !== id && vue['parDefaut'] === true,
        )
      : [];
    const vuesRebasees = parDefaut
      ? vues.map((vue) => (vue['ecran'] === ecran ? { ...vue, parDefaut: false } : vue))
      : vues;
    const nouvellesVues =
      index === -1
        ? [...vuesRebasees, nouvelleVue]
        : vuesRebasees.map((vue, position) => (position === index ? nouvelleVue : vue));

    const avant = index === -1 ? null : BouchonVuesUtils.resumeVue(vues[index]);
    const origine = BouchonVuesUtils.lireTexte(parametres, 'origine') || 'Vues enregistrées';
    return {
      ...donnees,
      vuesEnregistrees: nouvellesVues,
      journal: [
        ...BouchonVuesUtils.lireListe(donnees, 'journal'),
        BouchonVuesUtils.entreeJournal(origine, id, avant, BouchonVuesUtils.resumeVue(nouvelleVue)),
        ...retrogradees.map((vue) =>
          BouchonVuesUtils.entreeJournal(
            origine,
            typeof vue['id'] === 'string' ? vue['id'] : '',
            BouchonVuesUtils.resumeVue(vue),
            { ...BouchonVuesUtils.resumeVue(vue), parDefaut: false },
          ),
        ),
      ],
    };
  }

  /**
   * Supprime une vue enregistrée par identifiant (US-028), consigne l'entrée de journal correspondante (RG-054).
   * @param parametres - Paramètres reçus (`id`, `origine`, `donnees`).
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static supprimerVue(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const donnees = BouchonVuesUtils.exigerObjet(parametres['donnees']);
    const id = BouchonVuesUtils.lireTexte(parametres, 'id');
    const vues = BouchonVuesUtils.lireListe(donnees, 'vuesEnregistrees');
    const supprimee = vues.find((vue) => vue['id'] === id);
    const origine = BouchonVuesUtils.lireTexte(parametres, 'origine') || 'Vues enregistrées';
    return {
      ...donnees,
      vuesEnregistrees: vues.filter((vue) => vue['id'] !== id),
      journal: [
        ...BouchonVuesUtils.lireListe(donnees, 'journal'),
        BouchonVuesUtils.entreeJournal(
          origine,
          id,
          supprimee === undefined ? null : BouchonVuesUtils.resumeVue(supprimee),
          null,
        ),
      ],
    };
  }

  /**
   * Résume une vue pour le journal des modifications (RG-054) : nom, écran et statut par défaut uniquement, jamais
   * le contenu des filtres.
   * @param vue - Vue (objet non typé à cette frontière).
   * @returns Le résumé `{ nom, ecran, parDefaut }`.
   */
  private static resumeVue(vue: Readonly<Record<string, unknown>>): Record<string, unknown> {
    return {
      nom: typeof vue['nom'] === 'string' ? vue['nom'] : '',
      ecran: typeof vue['ecran'] === 'string' ? vue['ecran'] : '',
      parDefaut: vue['parDefaut'] === true,
    };
  }

  /**
   * Construit une entrée de journal des modifications pour une mutation de vue (RG-054).
   * @param origine - Libellé d'origine de la mutation.
   * @param idVue - Identifiant de la vue concernée.
   * @param avant - Résumé avant mutation, `null` pour une création.
   * @param apres - Résumé après mutation, `null` pour une suppression.
   * @returns L'entrée de journal.
   */
  private static entreeJournal(
    origine: string,
    idVue: string,
    avant: Record<string, unknown> | null,
    apres: Record<string, unknown> | null,
  ): Record<string, unknown> {
    return {
      id: crypto.randomUUID(),
      horodatage: new Date().toISOString(),
      objet: `vuesEnregistrees/${idVue}`,
      avant,
      apres,
      origine,
    };
  }

  /**
   * Met à jour `meta.modifieLe` à l'horodatage courant, sur le modèle de `BouchonAdministrationUtils.horodater`.
   * @param donnees - Racine à horodater.
   * @returns La racine avec `meta.modifieLe` mis à jour.
   */
  private static horodater(donnees: Record<string, unknown>): Record<string, unknown> {
    const meta = BouchonVuesUtils.estObjet(donnees['meta']) ? donnees['meta'] : {};
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
    if (!BouchonVuesUtils.estObjet(valeur)) {
      throw new Error('BouchonVuesUtils : paramètre « donnees » absent ou mal formé.');
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
      BouchonVuesUtils.estObjet(entree),
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
