// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Bouchon TS de `FacadeAdministrationService`, activé par `InvocationCommandeUtils` hors contexte Tauri
// (`ng serve`), introduit le 2026-07-28 après constat qu'une campagne lancée en `ng serve` échouait silencieusement
// à l'étape `enregistrer_brouillon` (seule commande de ce service jusque-là non bouchonnée), laissant la Liste de
// travail/Synthèse des audits vides malgré des indicateurs GitLab/Sonar bouchonnés avec succès.
//
// Reproduit une version volontairement simplifiée de la logique métier du cœur natif (`src-tauri/src/commandes/
// administration.rs`, hors périmètre de lecture de cette tâche) : mutations structurelles correctes (ajout/mise à
// jour/suppression, résolution du brouillon), mais sans certaines finesses des règles de gestion, chacune signalée
// ci-dessous comme décision arbitraire :
// - RG-008 (détection des membres connus en conflit) : `membresEnConflit` toujours vide, cette détection relevant
//   d'une logique de recoupement de motifs équivalente à celle du Moteur de jugement, hors périmètre d'un bouchon ;
// - RG-023 (journal des modifications) : jamais alimenté par ce bouchon (`donnees.journal` reste inchangé), le
//   journal n'étant lu par aucun écran testé manuellement à ce jour (`journal-parametrage.component.ts` affiche
//   une liste vide plutôt qu'une erreur, cf. son propre écran de repli) ;
// - RG-015 (annotation système à l'activation de l'IA) : reproduite par une annotation simplifiée, texte différent
//   de celui du cœur natif réel.
//
// Volontairement non typé sur `DonneesRacine`/`Groupe`/`Projet`/… (`services/avecetat/etat/types-donnees.ts`),
// interdits en dépendance depuis `services/sansetat/` (cf. commentaire d'en-tête de `donnees-racine-bouchon.ts`) :
// traversée défensive de type `unknown`, sur le modèle déjà retenu par `FacadeCommandesService.estErreurConnecteur`
// et `DonneesApplicationService.anomalieAdministration` pour toute valeur reçue à cette même frontière.

/**
 * Catégories d'anomalie que ce bouchon sait lever, sous-ensemble de `CategorieErreurAdministration`
 * (`services/avecetat/etat/types-donnees.ts`) pertinent aux six commandes couvertes ici — dupliqué localement en
 * chaîne de caractères plutôt qu'importé, pour la même raison que le reste de ce fichier.
 */
type CategorieAnomalieBouchon =
  | 'groupeIntrouvable'
  | 'projetIntrouvable'
  | 'membreIntrouvable'
  | 'doublonUsernameMembreConnu'
  | 'brouillonDejaExistant'
  | 'aucunBrouillonCourant'
  | 'projetAbsentDuBrouillon';

/**
 * Anomalie typée levée par ce bouchon : une instance d'`Error` (jamais un objet littéral, cf.
 * `@typescript-eslint/prefer-promise-reject-errors`) portant néanmoins un champ `type` reconnu par
 * `DonneesApplicationService.anomalieAdministration` (`'type' in valeur`), pour que l'écran appelant affiche la
 * même catégorie d'anomalie qu'avec le cœur natif réel plutôt qu'un générique `erreurInterne`.
 */
class AnomalieAdministrationBouchon extends Error {
  public readonly type: CategorieAnomalieBouchon;

  public constructor(type: CategorieAnomalieBouchon) {
    super(`BouchonAdministrationUtils : anomalie « ${type} ».`);
    this.type = type;
  }
}

/** Réponse brute d'une commande bouchonnée : soit la racine mise à jour, soit l'enveloppe propre à `qualifier_membre`. */
type ReponseBouchonAdministration =
  | Record<string, unknown>
  | { readonly donnees: Record<string, unknown>; readonly membresEnConflit: readonly string[] };

/**
 * Bouchon TS des six commandes de la Façade portées par `FacadeAdministrationService` (qualification des membres
 * connus, politique d'autorisation de l'IA, cycle de vie du brouillon d'une campagne), activé hors contexte Tauri
 * par `InvocationCommandeUtils`.
 */
export class BouchonAdministrationUtils {
  /**
   * Noms des commandes de `FacadeAdministrationService` que ce bouchon sait résoudre, utilisé par
   * `InvocationCommandeUtils` pour distribuer un appel entre ce bouchon et les autres.
   */
  public static readonly COMMANDES: ReadonlySet<string> = new Set([
    'qualifier_membre',
    'definir_politique_ia',
    'supprimer_membre_connu',
    'enregistrer_brouillon',
    'integrer_brouillon',
    'rejeter_brouillon',
  ]);

  /**
   * Résout une commande bouchonnée, sur le modèle de `invoke<TReponse>(commande, parametres)`. Toute anomalie
   * levée par les mutations structurelles ci-dessous (synchrones) est rattrapée puis convertie en rejet de
   * Promise, jamais laissée s'échapper en exception synchrone (cf. bug corrigé le 2026-07-28 sur
   * `BouchonCommandesUtils.invoquer`, même piège).
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
  ): Promise<ReponseBouchonAdministration> {
    try {
      return Promise.resolve(BouchonAdministrationUtils.resoudre(commande, parametres));
    } catch (erreur: unknown) {
      return Promise.reject(erreur instanceof Error ? erreur : new Error(String(erreur)));
    }
  }

  /**
   * Distribue la commande vers sa résolution bouchonnée dédiée, sur le modèle de `BouchonCommandesUtils.resoudre`.
   * @param commande - Nom de la commande.
   * @param parametres - Paramètres de la commande.
   * @returns La réponse brute, enveloppée par {@link invoquer}.
   */
  private static resoudre(
    commande: string,
    parametres: Readonly<Record<string, unknown>>,
  ): ReponseBouchonAdministration {
    switch (commande) {
      case 'qualifier_membre':
        return BouchonAdministrationUtils.qualifierMembre(parametres);
      case 'definir_politique_ia':
        return BouchonAdministrationUtils.horodater(
          BouchonAdministrationUtils.definirPolitiqueIA(parametres),
        );
      case 'supprimer_membre_connu':
        return BouchonAdministrationUtils.horodater(
          BouchonAdministrationUtils.supprimerMembreConnu(parametres),
        );
      case 'enregistrer_brouillon':
        return BouchonAdministrationUtils.horodater(
          BouchonAdministrationUtils.enregistrerBrouillon(parametres),
        );
      case 'integrer_brouillon':
        return BouchonAdministrationUtils.horodater(
          BouchonAdministrationUtils.resoudreBrouillon(parametres, 'integre'),
        );
      case 'rejeter_brouillon':
        return BouchonAdministrationUtils.horodater(
          BouchonAdministrationUtils.resoudreBrouillon(parametres, 'rejete'),
        );
      default:
        throw new Error(`BouchonAdministrationUtils : commande « ${commande} » non bouchonnée.`);
    }
  }

  /**
   * Qualifie un membre connu (US-022, US-023) : met à jour la règle désignée par `membreId`, ou en crée une
   * nouvelle après contrôle de doublon (RG-006, RG-007) si absent.
   * @param parametres - Paramètres reçus (`groupeId`, `membreId`, `critere`, `typeCritere`, `statut`, `libelle`,
   * `aliasEmail`, `donnees`).
   * @returns L'enveloppe `{ donnees, membresEnConflit }` attendue par `ReponseQualificationMembre`.
   */
  private static qualifierMembre(parametres: Readonly<Record<string, unknown>>): {
    readonly donnees: Record<string, unknown>;
    readonly membresEnConflit: readonly string[];
  } {
    const donnees = BouchonAdministrationUtils.exigerObjet(parametres['donnees']);
    const groupeId = BouchonAdministrationUtils.lireTexte(parametres, 'groupeId');
    const membreId = BouchonAdministrationUtils.lireTexteOptionnel(parametres, 'membreId');
    const critere = BouchonAdministrationUtils.lireTexte(parametres, 'critere');
    const typeCritere = BouchonAdministrationUtils.lireTexte(parametres, 'typeCritere');
    const statut = BouchonAdministrationUtils.lireTexte(parametres, 'statut');
    const libelle = BouchonAdministrationUtils.lireTexteOptionnel(parametres, 'libelle');
    const aliasEmail = BouchonAdministrationUtils.lireTexteOptionnel(parametres, 'aliasEmail');

    const nouvelleRacine = BouchonAdministrationUtils.horodater(
      BouchonAdministrationUtils.miseAJourGroupe(donnees, groupeId, (groupe) => {
        const membresConnus = BouchonAdministrationUtils.lireListe(groupe, 'membresConnus');
        if (membreId !== undefined) {
          const index = membresConnus.findIndex(
            (membre) => BouchonAdministrationUtils.lireTexte(membre, 'id') === membreId,
          );
          if (index === -1) {
            throw new AnomalieAdministrationBouchon('membreIntrouvable');
          }
          const nouveauxMembres = [...membresConnus];
          nouveauxMembres[index] = {
            ...membresConnus[index],
            critere,
            typeCritere,
            statut,
            libelle,
            aliasEmail,
          };
          return { ...groupe, membresConnus: nouveauxMembres };
        }
        const doublon = membresConnus.some(
          (membre) =>
            typeCritere === 'username' &&
            BouchonAdministrationUtils.lireTexte(membre, 'typeCritere') === 'username' &&
            BouchonAdministrationUtils.lireTexte(membre, 'critere') === critere,
        );
        if (doublon) {
          throw new AnomalieAdministrationBouchon('doublonUsernameMembreConnu');
        }
        const nouvelleEntree = {
          id: crypto.randomUUID(),
          critere,
          typeCritere,
          statut,
          libelle,
          aliasEmail,
        };
        return { ...groupe, membresConnus: [...membresConnus, nouvelleEntree] };
      }),
    );
    return { donnees: nouvelleRacine, membresEnConflit: [] };
  }

  /**
   * Définit la politique d'autorisation de l'IA d'un projet (US-024) : ne modifie `iaAutoriseeDepuis` et
   * n'ajoute l'annotation système que lors du passage effectif à `true` (RG-014 à RG-016).
   * @param parametres - Paramètres reçus (`groupeId`, `projetId`, `iaAutorisee`, `donnees`).
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static definirPolitiqueIA(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const donnees = BouchonAdministrationUtils.exigerObjet(parametres['donnees']);
    const groupeId = BouchonAdministrationUtils.lireTexte(parametres, 'groupeId');
    const projetId = BouchonAdministrationUtils.lireTexte(parametres, 'projetId');
    const iaAutorisee = parametres['iaAutorisee'] === true;

    return BouchonAdministrationUtils.miseAJourProjet(donnees, groupeId, projetId, (projet) => {
      const etaitAutorisee = projet['iaAutorisee'] === true;
      if (etaitAutorisee === iaAutorisee) {
        return projet;
      }
      if (!iaAutorisee) {
        return { ...projet, iaAutorisee };
      }
      const aujourdHui = new Date().toISOString().slice(0, 10);
      const annotations = BouchonAdministrationUtils.lireListe(projet, 'annotations');
      const annotationSysteme = {
        id: crypto.randomUUID(),
        date: aujourdHui,
        libelle: "Activation de l'IA",
        categorie: 'activationIA',
        description: 'Autorisation consignée par le bouchon ng serve.',
        systeme: true,
      };
      return {
        ...projet,
        iaAutorisee,
        iaAutoriseeDepuis:
          BouchonAdministrationUtils.lireTexteOptionnel(projet, 'iaAutoriseeDepuis') ?? aujourdHui,
        annotations: [...annotations, annotationSysteme],
      };
    });
  }

  /**
   * Supprime une règle de membre connu (US-023).
   * @param parametres - Paramètres reçus (`groupeId`, `membreId`, `donnees`).
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static supprimerMembreConnu(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const donnees = BouchonAdministrationUtils.exigerObjet(parametres['donnees']);
    const groupeId = BouchonAdministrationUtils.lireTexte(parametres, 'groupeId');
    const membreId = BouchonAdministrationUtils.lireTexte(parametres, 'membreId');

    return BouchonAdministrationUtils.miseAJourGroupe(donnees, groupeId, (groupe) => {
      const membresConnus = BouchonAdministrationUtils.lireListe(groupe, 'membresConnus');
      if (
        !membresConnus.some(
          (membre) => BouchonAdministrationUtils.lireTexte(membre, 'id') === membreId,
        )
      ) {
        throw new AnomalieAdministrationBouchon('membreIntrouvable');
      }
      return {
        ...groupe,
        membresConnus: membresConnus.filter(
          (membre) => BouchonAdministrationUtils.lireTexte(membre, 'id') !== membreId,
        ),
      };
    });
  }

  /**
   * Enregistre les résultats d'une campagne dans la zone de brouillon (US-009, US-014, RG-019) : refuse tant
   * qu'un brouillon existant n'a pas été intégralement traité, sur le modèle exact du cœur natif.
   * @param parametres - Paramètres reçus (`campagneId`, `date`, `perimetre`, `verdicts`, `resultatsParProjet`,
   * `donnees`).
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static enregistrerBrouillon(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const donnees = BouchonAdministrationUtils.exigerObjet(parametres['donnees']);
    if (donnees['brouillon'] !== null && donnees['brouillon'] !== undefined) {
      throw new AnomalieAdministrationBouchon('brouillonDejaExistant');
    }
    const campagneId = BouchonAdministrationUtils.lireTexte(parametres, 'campagneId');
    const date = BouchonAdministrationUtils.lireTexte(parametres, 'date');
    const perimetre = Array.isArray(parametres['perimetre']) ? parametres['perimetre'] : [];
    const verdicts = Array.isArray(parametres['verdicts']) ? parametres['verdicts'] : [];
    const resultatsBruts = Array.isArray(parametres['resultatsParProjet'])
      ? parametres['resultatsParProjet']
      : [];
    const resultatsParProjet = resultatsBruts.map((entree: unknown) =>
      BouchonAdministrationUtils.estObjet(entree) ? { ...entree, statut: 'enAttente' } : entree,
    );
    const campagnes = BouchonAdministrationUtils.lireListe(donnees, 'campagnes');

    return {
      ...donnees,
      campagnes: [...campagnes, { id: campagneId, date, perimetre, verdicts }],
      brouillon: { campagneId, creeLe: date, resultatsParProjet },
    };
  }

  /**
   * Intègre (`statutCible: 'integre'`) ou rejette (`statutCible: 'rejete'`) tout ou partie des entrées encore en
   * attente du brouillon courant (US-014). Une entrée intégrée rejoint l'historique des audits du projet
   * concerné ; une entrée rejetée n'y est jamais ajoutée. Le brouillon est effacé (`null`) une fois toutes ses
   * entrées résolues.
   * @param parametres - Paramètres reçus (`selection`, `motif`, `donnees`).
   * @param statutCible - Statut à appliquer aux entrées ciblées.
   * @returns La racine mise à jour (non encore horodatée).
   */
  private static resoudreBrouillon(
    parametres: Readonly<Record<string, unknown>>,
    statutCible: 'integre' | 'rejete',
  ): Record<string, unknown> {
    const donnees = BouchonAdministrationUtils.exigerObjet(parametres['donnees']);
    const brouillon = donnees['brouillon'];
    if (!BouchonAdministrationUtils.estObjet(brouillon)) {
      throw new AnomalieAdministrationBouchon('aucunBrouillonCourant');
    }
    const resultatsParProjet = BouchonAdministrationUtils.lireListe(
      brouillon,
      'resultatsParProjet',
    );
    const motif = BouchonAdministrationUtils.lireTexteOptionnel(parametres, 'motif');
    const selectionBrute = parametres['selection'];
    const selection = Array.isArray(selectionBrute)
      ? selectionBrute.filter((valeur): valeur is string => typeof valeur === 'string')
      : undefined;

    const idsEnAttente = new Set(
      resultatsParProjet
        .filter((entree) => BouchonAdministrationUtils.lireTexte(entree, 'statut') === 'enAttente')
        .map((entree) => BouchonAdministrationUtils.lireTexte(entree, 'projetId')),
    );
    if (selection !== undefined) {
      for (const projetId of selection) {
        if (!idsEnAttente.has(projetId)) {
          throw new AnomalieAdministrationBouchon('projetAbsentDuBrouillon');
        }
      }
    }
    const cibles = new Set(selection ?? idsEnAttente);

    let donneesCourantes = donnees;
    const nouveauxResultats = resultatsParProjet.map((entree) => {
      const projetId = BouchonAdministrationUtils.lireTexte(entree, 'projetId');
      if (
        BouchonAdministrationUtils.lireTexte(entree, 'statut') !== 'enAttente' ||
        !cibles.has(projetId)
      ) {
        return entree;
      }
      if (statutCible === 'integre') {
        const audit = entree['audit'];
        donneesCourantes = BouchonAdministrationUtils.miseAJourProjetParId(
          donneesCourantes,
          projetId,
          (projet) => ({
            ...projet,
            audits: [...BouchonAdministrationUtils.lireListe(projet, 'audits'), audit],
          }),
        );
        return { ...entree, statut: 'integre' };
      }
      return { ...entree, statut: 'rejete', ...(motif === undefined ? {} : { motifRejet: motif }) };
    });

    const encoreEnAttente = nouveauxResultats.some(
      (entree) => BouchonAdministrationUtils.lireTexte(entree, 'statut') === 'enAttente',
    );
    return {
      ...donneesCourantes,
      brouillon: encoreEnAttente ? { ...brouillon, resultatsParProjet: nouveauxResultats } : null,
    };
  }

  /**
   * Applique la transformation donnée à un groupe désigné par son identifiant.
   * @param donnees - Racine courante.
   * @param groupeId - Identifiant du groupe à transformer.
   * @param transformer - Fonction pure produisant le groupe mis à jour.
   * @returns La racine avec `groupes` mis à jour.
   */
  private static miseAJourGroupe(
    donnees: Record<string, unknown>,
    groupeId: string,
    transformer: (groupe: Record<string, unknown>) => Record<string, unknown>,
  ): Record<string, unknown> {
    const groupes = BouchonAdministrationUtils.lireListe(donnees, 'groupes');
    const index = groupes.findIndex(
      (groupe) => BouchonAdministrationUtils.lireTexte(groupe, 'id') === groupeId,
    );
    if (index === -1) {
      throw new AnomalieAdministrationBouchon('groupeIntrouvable');
    }
    const nouveauxGroupes = [...groupes];
    nouveauxGroupes[index] = transformer(groupes[index]);
    return { ...donnees, groupes: nouveauxGroupes };
  }

  /**
   * Applique la transformation donnée à un projet désigné par son groupe et son identifiant.
   * @param donnees - Racine courante.
   * @param groupeId - Identifiant du groupe de rattachement du projet.
   * @param projetId - Identifiant du projet à transformer.
   * @param transformer - Fonction pure produisant le projet mis à jour.
   * @returns La racine avec `groupes` mis à jour.
   */
  private static miseAJourProjet(
    donnees: Record<string, unknown>,
    groupeId: string,
    projetId: string,
    transformer: (projet: Record<string, unknown>) => Record<string, unknown>,
  ): Record<string, unknown> {
    return BouchonAdministrationUtils.miseAJourGroupe(donnees, groupeId, (groupe) => {
      const projets = BouchonAdministrationUtils.lireListe(groupe, 'projets');
      const index = projets.findIndex(
        (projet) => BouchonAdministrationUtils.lireTexte(projet, 'id') === projetId,
      );
      if (index === -1) {
        throw new AnomalieAdministrationBouchon('projetIntrouvable');
      }
      const nouveauxProjets = [...projets];
      nouveauxProjets[index] = transformer(projets[index]);
      return { ...groupe, projets: nouveauxProjets };
    });
  }

  /**
   * Applique la transformation donnée à un projet désigné par son seul identifiant (groupe de rattachement
   * inconnu de l'appelant), en le recherchant dans tous les groupes — nécessaire à l'intégration d'une entrée de
   * brouillon, qui ne porte pas `groupeId`.
   * @param donnees - Racine courante.
   * @param projetId - Identifiant du projet à transformer.
   * @param transformer - Fonction pure produisant le projet mis à jour.
   * @returns La racine avec `groupes` mis à jour.
   */
  private static miseAJourProjetParId(
    donnees: Record<string, unknown>,
    projetId: string,
    transformer: (projet: Record<string, unknown>) => Record<string, unknown>,
  ): Record<string, unknown> {
    const groupes = BouchonAdministrationUtils.lireListe(donnees, 'groupes');
    let trouve = false;
    const nouveauxGroupes = groupes.map((groupe) => {
      const projets = BouchonAdministrationUtils.lireListe(groupe, 'projets');
      const index = projets.findIndex(
        (projet) => BouchonAdministrationUtils.lireTexte(projet, 'id') === projetId,
      );
      if (index === -1) {
        return groupe;
      }
      trouve = true;
      const nouveauxProjets = [...projets];
      nouveauxProjets[index] = transformer(projets[index]);
      return { ...groupe, projets: nouveauxProjets };
    });
    if (!trouve) {
      throw new AnomalieAdministrationBouchon('projetIntrouvable');
    }
    return { ...donnees, groupes: nouveauxGroupes };
  }

  /**
   * Met à jour `meta.modifieLe` à l'horodatage courant, sur le modèle de `DonneesApplicationService.
   * sauvegarderFichier` (le cœur natif réel n'horodate jamais lui-même, cf. commentaire de cette méthode).
   * @param donnees - Racine à horodater.
   * @returns La racine avec `meta.modifieLe` mis à jour.
   */
  private static horodater(donnees: Record<string, unknown>): Record<string, unknown> {
    const meta = BouchonAdministrationUtils.estObjet(donnees['meta']) ? donnees['meta'] : {};
    return { ...donnees, meta: { ...meta, modifieLe: new Date().toISOString() } };
  }

  /**
   * Vérifie qu'une valeur reçue à cette frontière non typée est bien un objet, sur le modèle de
   * `FacadeCommandesService.estErreurConnecteur`.
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
    if (!BouchonAdministrationUtils.estObjet(valeur)) {
      throw new Error('BouchonAdministrationUtils : paramètre « donnees » absent ou mal formé.');
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
      BouchonAdministrationUtils.estObjet(entree),
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
