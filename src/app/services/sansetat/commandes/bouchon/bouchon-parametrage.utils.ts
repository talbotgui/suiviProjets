// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Bouchon TS de `FacadeParametrageService`, activé par `InvocationCommandeUtils` hors contexte Tauri (`ng serve`),
// introduit à la Phase 12 après constat que ce service appelait `invoke` directement jusqu'ici (cf. commentaire
// d'en-tête d'`invocation-commande.utils.ts`), en échec systématique hors contexte Tauri — bloquant notamment la
// saisie d'une règle de dépendance ou d'un réglage applicatif lors d'un rejeu du test de bout en bout Playwright.
//
// Reproduit une version volontairement simplifiée de la logique métier du cœur natif
// (`src-tauri/src/commandes/parametrage.rs`, `src-tauri/src/persistance/purge.rs`, hors périmètre de lecture de
// cette tâche), sur le modèle déjà retenu par `BouchonAdministrationUtils` : mutations structurelles correctes,
// mais sans certaines finesses des règles de gestion, chacune signalée ci-dessous comme décision arbitraire :
// - RG-023 (journal des modifications) : jamais alimenté par ce bouchon, comme déjà pour `BouchonAdministrationUtils` ;
// - RG-024/RG-025 (purge par densité/par âge) : la prévisualisation renvoie toujours un résumé vide (aucune
//   suppression proposée), l'exécution renvoie la racine inchangée — cette logique de sélection des audits à
//   purger équivaut à une portion du Moteur de jugement, hors périmètre d'un bouchon ; suffisant pour vérifier
//   que l'écran affiche un résultat sans erreur, pas pour vérifier une sélection réelle ;
// - RG-034 (purge du journal des modifications) : même simplification que ci-dessus, le journal n'étant de toute
//   façon jamais alimenté par ce bouchon.
//
// Volontairement non typé sur `DonneesRacine`/`Groupe`/`Projet`/… (`services/avecetat/etat/types-donnees.ts`),
// interdits en dépendance depuis `services/sansetat/` (cf. commentaire d'en-tête de `donnees-racine-bouchon.ts`) :
// traversée défensive de type `unknown`, sur le modèle déjà retenu par `BouchonAdministrationUtils`.

/** Réponse brute d'une commande bouchonnée : soit la racine mise à jour, soit un résumé de purge. */
type ReponseBouchonParametrage =
  Record<string, unknown> | { readonly nombreAuditsSupprimes: number };

/**
 * Bouchon TS des quinze commandes de la Façade portées par `FacadeParametrageService` (seuils, référentiels,
 * purges, réglages applicatifs), activé hors contexte Tauri par `InvocationCommandeUtils`.
 */
export class BouchonParametrageUtils {
  /**
   * Noms des commandes de `FacadeParametrageService` que ce bouchon sait résoudre, utilisé par
   * `InvocationCommandeUtils` pour distribuer un appel entre ce bouchon et les autres.
   */
  public static readonly COMMANDES: ReadonlySet<string> = new Set([
    'definir_seuil',
    'definir_referentiel',
    'previsualiser_purge_densite',
    'executer_purge_densite',
    'previsualiser_purge_age',
    'executer_purge_age',
    'supprimer_regle_dependance',
    'supprimer_regle_marqueur_ia',
    'definir_verrouillage',
    'definir_concurrence_audit',
    'definir_proxy',
    'definir_nombre_sauvegardes_securite',
    'definir_seuil_avertissement_taille',
    'previsualiser_purge_journal',
    'executer_purge_journal',
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
  ): Promise<ReponseBouchonParametrage> {
    try {
      return Promise.resolve(BouchonParametrageUtils.resoudre(commande, parametres));
    } catch (erreur: unknown) {
      return Promise.reject(erreur instanceof Error ? erreur : new Error(String(erreur)));
    }
  }

  /**
   * Distribue la commande vers sa résolution bouchonnée dédiée, sur le modèle de
   * `BouchonAdministrationUtils.resoudre`.
   * @param commande - Nom de la commande.
   * @param parametres - Paramètres de la commande.
   * @returns La réponse brute, enveloppée par {@link invoquer}.
   */
  private static resoudre(
    commande: string,
    parametres: Readonly<Record<string, unknown>>,
  ): ReponseBouchonParametrage {
    switch (commande) {
      case 'definir_seuil':
        return BouchonParametrageUtils.horodater(BouchonParametrageUtils.definirSeuil(parametres));
      case 'definir_referentiel':
        return BouchonParametrageUtils.horodater(
          BouchonParametrageUtils.definirReferentiel(parametres),
        );
      case 'previsualiser_purge_densite':
      case 'previsualiser_purge_age':
      case 'previsualiser_purge_journal':
        return { nombreAuditsSupprimes: 0 };
      case 'executer_purge_densite':
      case 'executer_purge_age':
      case 'executer_purge_journal':
        return BouchonParametrageUtils.horodater(
          BouchonParametrageUtils.exigerObjet(parametres['donnees']),
        );
      case 'supprimer_regle_dependance':
        return BouchonParametrageUtils.horodater(
          BouchonParametrageUtils.supprimerEntreeReferentiel(parametres, 'reglesDependances'),
        );
      case 'supprimer_regle_marqueur_ia':
        return BouchonParametrageUtils.horodater(
          BouchonParametrageUtils.supprimerEntreeReferentiel(parametres, 'reglesMarqueursIA'),
        );
      case 'definir_verrouillage':
        return BouchonParametrageUtils.horodater(
          BouchonParametrageUtils.definirVerrouillage(parametres),
        );
      case 'definir_concurrence_audit':
        return BouchonParametrageUtils.horodater(
          BouchonParametrageUtils.definirSection(parametres, 'audit', {
            concurrence: BouchonParametrageUtils.lireNombre(parametres, 'concurrence'),
          }),
        );
      case 'definir_proxy':
        return BouchonParametrageUtils.horodater(BouchonParametrageUtils.definirProxy(parametres));
      case 'definir_nombre_sauvegardes_securite':
        return BouchonParametrageUtils.horodater(
          BouchonParametrageUtils.definirSection(parametres, 'sauvegarde', {
            nombreSauvegardesSecurite: BouchonParametrageUtils.lireNombre(parametres, 'nombre'),
          }),
        );
      case 'definir_seuil_avertissement_taille':
        return BouchonParametrageUtils.horodater(
          BouchonParametrageUtils.definirParametreRacine(
            parametres,
            'seuilAvertissementTailleOctets',
            BouchonParametrageUtils.lireNombre(parametres, 'seuilOctets'),
          ),
        );
      default:
        throw new Error(`BouchonParametrageUtils : commande « ${commande} » non bouchonnée.`);
    }
  }

  /**
   * Modifie un seuil de couleur désigné par un chemin pointé (US-033), au sein de `parametres.seuils`.
   * @param parametres - Paramètres reçus (`cle`, `valeur`, `donnees`).
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static definirSeuil(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const donnees = BouchonParametrageUtils.exigerObjet(parametres['donnees']);
    const cle = BouchonParametrageUtils.lireTexte(parametres, 'cle');
    const racineParametres = BouchonParametrageUtils.estObjet(donnees['parametres'])
      ? donnees['parametres']
      : {};
    const seuils = BouchonParametrageUtils.estObjet(racineParametres['seuils'])
      ? racineParametres['seuils']
      : {};
    const nouveauxSeuils = BouchonParametrageUtils.ecrireCheminPointe(
      seuils,
      cle.split('.'),
      parametres['valeur'],
    );
    return {
      ...donnees,
      parametres: { ...racineParametres, seuils: nouveauxSeuils },
    };
  }

  /**
   * Ajoute/met à jour une entrée d'un référentiel-liste (par `id`), ou remplace le motif de nommage de branche
   * (RG-030), au sein de `donnees.referentiels`.
   * @param parametres - Paramètres reçus (`typeReferentiel`, `entree`, `donnees`).
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static definirReferentiel(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const donnees = BouchonParametrageUtils.exigerObjet(parametres['donnees']);
    const typeReferentiel = BouchonParametrageUtils.lireTexte(parametres, 'typeReferentiel');
    const referentiels = BouchonParametrageUtils.estObjet(donnees['referentiels'])
      ? donnees['referentiels']
      : {};

    if (typeReferentiel === 'motifNommageBranches') {
      const entree = parametres['entree'];
      return {
        ...donnees,
        referentiels: {
          ...referentiels,
          motifNommageBranches: typeof entree === 'string' ? entree : '',
        },
      };
    }

    const entree = parametres['entree'];
    if (!BouchonParametrageUtils.estObjet(entree)) {
      throw new Error('BouchonParametrageUtils : paramètre « entree » absent ou mal formé.');
    }
    const liste = BouchonParametrageUtils.lireListe(referentiels, typeReferentiel);
    const id = BouchonParametrageUtils.lireTexteOptionnel(entree, 'id') ?? crypto.randomUUID();
    const entreeAvecId = { ...entree, id };
    const index = liste.findIndex((existante) => existante['id'] === id);
    const nouvelleListe =
      index === -1
        ? [...liste, entreeAvecId]
        : liste.map((existante, position) => (position === index ? entreeAvecId : existante));

    return { ...donnees, referentiels: { ...referentiels, [typeReferentiel]: nouvelleListe } };
  }

  /**
   * Supprime une entrée d'un référentiel-liste par identifiant (US-033, RG-035).
   * @param parametres - Paramètres reçus (`id`, `donnees`).
   * @param typeReferentiel - Branche de référentiel concernée (`reglesDependances` ou `reglesMarqueursIA`).
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static supprimerEntreeReferentiel(
    parametres: Readonly<Record<string, unknown>>,
    typeReferentiel: 'reglesDependances' | 'reglesMarqueursIA',
  ): Record<string, unknown> {
    const donnees = BouchonParametrageUtils.exigerObjet(parametres['donnees']);
    const id = BouchonParametrageUtils.lireTexte(parametres, 'id');
    const referentiels = BouchonParametrageUtils.estObjet(donnees['referentiels'])
      ? donnees['referentiels']
      : {};
    const liste = BouchonParametrageUtils.lireListe(referentiels, typeReferentiel);
    return {
      ...donnees,
      referentiels: {
        ...referentiels,
        [typeReferentiel]: liste.filter((entree) => entree['id'] !== id),
      },
    };
  }

  /**
   * Modifie les réglages de verrouillage de session (US-034, RG-031), au sein de `parametres.verrouillage`.
   * @param parametres - Paramètres reçus (`delaiInactiviteMinutes`, `echecsAvantFermeture`, `donnees`).
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static definirVerrouillage(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    return BouchonParametrageUtils.definirSection(parametres, 'verrouillage', {
      delaiInactiviteMinutes: BouchonParametrageUtils.lireNombre(
        parametres,
        'delaiInactiviteMinutes',
      ),
      echecsAvantFermeture: BouchonParametrageUtils.lireNombre(parametres, 'echecsAvantFermeture'),
    });
  }

  /**
   * Modifie le réglage de proxy sortant (US-034, RG-031), au sein de `parametres.proxy`.
   * @param parametres - Paramètres reçus (`url`, `cheminBundleCa`, `donnees`).
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static definirProxy(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    return BouchonParametrageUtils.definirSection(parametres, 'proxy', {
      url: BouchonParametrageUtils.lireTexteOptionnel(parametres, 'url') ?? '',
      cheminBundleCA:
        BouchonParametrageUtils.lireTexteOptionnel(parametres, 'cheminBundleCa') ?? '',
    });
  }

  /**
   * Remplace intégralement une sous-section de `donnees.parametres` par les valeurs fournies.
   * @param parametres - Paramètres reçus, portant `donnees`.
   * @param section - Clé de la sous-section (`verrouillage`, `audit`, `proxy`, `sauvegarde`).
   * @param valeurs - Nouvelles valeurs de la sous-section.
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static definirSection(
    parametres: Readonly<Record<string, unknown>>,
    section: string,
    valeurs: Record<string, unknown>,
  ): Record<string, unknown> {
    const donnees = BouchonParametrageUtils.exigerObjet(parametres['donnees']);
    const racineParametres = BouchonParametrageUtils.estObjet(donnees['parametres'])
      ? donnees['parametres']
      : {};
    return { ...donnees, parametres: { ...racineParametres, [section]: valeurs } };
  }

  /**
   * Remplace la valeur d'une clé scalaire directement sous `donnees.parametres` (ex.
   * `seuilAvertissementTailleOctets`, hors toute sous-section).
   * @param parametres - Paramètres reçus, portant `donnees`.
   * @param cle - Clé à modifier.
   * @param valeur - Nouvelle valeur.
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static definirParametreRacine(
    parametres: Readonly<Record<string, unknown>>,
    cle: string,
    valeur: unknown,
  ): Record<string, unknown> {
    const donnees = BouchonParametrageUtils.exigerObjet(parametres['donnees']);
    const racineParametres = BouchonParametrageUtils.estObjet(donnees['parametres'])
      ? donnees['parametres']
      : {};
    return { ...donnees, parametres: { ...racineParametres, [cle]: valeur } };
  }

  /**
   * Écrit une valeur au chemin pointé désigné au sein d'un objet, en clonant chaque niveau traversé.
   * @param objet - Objet source.
   * @param segments - Segments du chemin (ex. `['vitalite', 'mortJours']`).
   * @param valeur - Valeur à écrire au segment final.
   * @returns Une copie de `objet` avec la valeur écrite.
   */
  private static ecrireCheminPointe(
    objet: Record<string, unknown>,
    segments: readonly string[],
    valeur: unknown,
  ): Record<string, unknown> {
    const [tete, ...reste] = segments;
    if (tete === undefined) {
      return objet;
    }
    if (reste.length === 0) {
      return { ...objet, [tete]: valeur };
    }
    const sousObjet = BouchonParametrageUtils.estObjet(objet[tete]) ? objet[tete] : {};
    return {
      ...objet,
      [tete]: BouchonParametrageUtils.ecrireCheminPointe(sousObjet, reste, valeur),
    };
  }

  /**
   * Met à jour `meta.modifieLe` à l'horodatage courant, sur le modèle de `BouchonAdministrationUtils.horodater`.
   * @param donnees - Racine à horodater.
   * @returns La racine avec `meta.modifieLe` mis à jour.
   */
  private static horodater(donnees: Record<string, unknown>): Record<string, unknown> {
    const meta = BouchonParametrageUtils.estObjet(donnees['meta']) ? donnees['meta'] : {};
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
    if (!BouchonParametrageUtils.estObjet(valeur)) {
      throw new Error('BouchonParametrageUtils : paramètre « donnees » absent ou mal formé.');
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
      BouchonParametrageUtils.estObjet(entree),
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

  /**
   * Lit un nombre à une clé donnée, `0` si absent ou mal typé.
   * @param objet - Objet source.
   * @param cle - Clé à lire.
   * @returns Le nombre lu.
   */
  private static lireNombre(objet: Readonly<Record<string, unknown>>, cle: string): number {
    const valeur = objet[cle];
    return typeof valeur === 'number' ? valeur : 0;
  }
}
