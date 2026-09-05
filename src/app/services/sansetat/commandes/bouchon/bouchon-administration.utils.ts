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
 * (`services/avecetat/etat/types-donnees.ts`) pertinent aux sept commandes couvertes ici — dupliqué localement en
 * chaîne de caractères plutôt qu'importé, pour la même raison que le reste de ce fichier.
 */
type CategorieAnomalieBouchon =
  | 'groupeIntrouvable'
  | 'projetIntrouvable'
  | 'membreIntrouvable'
  | 'doublonUsernameMembreConnu'
  | 'dateDepartInvalide'
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

/**
 * Réponse brute d'une commande bouchonnée : la racine mise à jour, l'une des deux enveloppes propres à
 * `qualifier_membre`/`qualifier_membres`, une structure `PremierCommitInterne` (`calculer_prise_en_charge_projet`),
 * ou une simple chaîne (`empreinte_referentiel_interne`).
 */
type ReponseBouchonAdministration =
  | Record<string, unknown>
  | { readonly donnees: Record<string, unknown>; readonly membresEnConflit: readonly string[] }
  | { readonly donnees: Record<string, unknown>; readonly reussites: readonly boolean[] }
  | string;

/**
 * Délai artificiel fixe (jamais aléatoire) appliqué à `calculer_prise_en_charge_projet`, sur le modèle de
 * `DELAI_INTERROGATION_AUDIT_MS` de `BouchonCommandesUtils` : cette commande interroge en réel les dépôts GitLab,
 * le délai permet d'exercer l'indicateur de chargement du bouton « recalculer » de la Fiche projet en `ng serve`.
 */
const DELAI_CALCUL_PRISE_EN_CHARGE_MS = 800;

/**
 * Bouchon TS des dix commandes de la Façade portées par `FacadeAdministrationService` (qualification des membres
 * connus, unitaire et en masse, politique d'autorisation de l'IA, cycle de vie du brouillon d'une campagne,
 * volumétrie du fichier de données, calcul de la date de prise en charge d'un projet et empreinte du référentiel
 * `interne`), activé hors contexte Tauri par `InvocationCommandeUtils`.
 */
export class BouchonAdministrationUtils {
  /**
   * Noms des commandes de `FacadeAdministrationService` que ce bouchon sait résoudre, utilisé par
   * `InvocationCommandeUtils` pour distribuer un appel entre ce bouchon et les autres.
   */
  public static readonly COMMANDES: ReadonlySet<string> = new Set([
    'qualifier_membre',
    'qualifier_membres',
    'definir_politique_ia',
    'supprimer_membre_connu',
    'enregistrer_brouillon',
    'integrer_brouillon',
    'rejeter_brouillon',
    'calculer_metriques_volumetrie',
    'calculer_prise_en_charge_projet',
    'empreinte_referentiel_interne',
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
    if (commande === 'calculer_prise_en_charge_projet') {
      return BouchonAdministrationUtils.calculerPriseEnChargeProjet(parametres);
    }
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
      case 'empreinte_referentiel_interne':
        return BouchonAdministrationUtils.empreinteReferentielInterne(parametres);
      case 'qualifier_membre':
        return BouchonAdministrationUtils.qualifierMembre(parametres);
      case 'qualifier_membres':
        return BouchonAdministrationUtils.qualifierMembres(parametres);
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
      case 'calculer_metriques_volumetrie':
        return BouchonAdministrationUtils.calculerMetriquesVolumetrie(parametres);
      default:
        throw new Error(`BouchonAdministrationUtils : commande « ${commande} » non bouchonnée.`);
    }
  }

  /**
   * Qualifie un membre connu (US-022, US-023) : met à jour la règle désignée par `membreId`, ou en crée une
   * nouvelle après contrôle de doublon (RG-006, RG-007) si absent.
   * @param parametres - Paramètres reçus (`groupeId`, `membreId`, `critere`, `typeCritere`, `statut`, `libelle`,
   * `aliasEmail`, `partiLe`, `donnees`).
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
    const partiLe = BouchonAdministrationUtils.lireTexteOptionnel(parametres, 'partiLe');
    BouchonAdministrationUtils.validerPartiLe(partiLe, typeCritere);

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
            partiLe,
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
          partiLe,
        };
        return { ...groupe, membresConnus: [...membresConnus, nouvelleEntree] };
      }),
    );
    return { donnees: nouvelleRacine, membresEnConflit: [] };
  }

  /**
   * Qualifie plusieurs membres connus d'un même groupe en une seule fois (US-044, RG-041), sur le modèle de
   * {@link qualifierMembre} ci-dessus appliqué en boucle. Contrairement au bouchon batch de
   * `BouchonParametrageUtils.definirReferentiels`, celui-ci DOIT simuler l'échec partiel : `qualifierMembre` simule
   * déjà `doublonUsernameMembreConnu` (RG-008), qu'une entrée de ce lot peut légitimement déclencher sans que cela
   * n'interrompe le traitement des entrées suivantes (échec partiel, RG-041 point 5) — chaque entrée en échec est
   * simplement ignorée (`donnees` inchangé pour elle), la boucle continuant avec les entrées suivantes sur la
   * racine déjà mutée par celles réussies.
   * @param parametres - Paramètres reçus (`groupeId`, `entrees`, `origine`, `donnees`).
   * @returns L'enveloppe `{ donnees, reussites }` attendue par `ReponseMutationMasse` côté cœur natif.
   */
  private static qualifierMembres(parametres: Readonly<Record<string, unknown>>): {
    readonly donnees: Record<string, unknown>;
    readonly reussites: readonly boolean[];
  } {
    const entreesBrutes = parametres['entrees'];
    const entrees = Array.isArray(entreesBrutes) ? entreesBrutes : [];
    let donnees = BouchonAdministrationUtils.exigerObjet(parametres['donnees']);
    const reussites: boolean[] = [];
    for (const entreeBrute of entrees) {
      if (!BouchonAdministrationUtils.estObjet(entreeBrute)) {
        reussites.push(false);
        continue;
      }
      try {
        const resultat = BouchonAdministrationUtils.qualifierMembre({
          ...parametres,
          donnees,
          membreId: undefined,
          critere: entreeBrute['critere'],
          typeCritere: entreeBrute['typeCritere'],
          statut: entreeBrute['statut'],
          libelle: entreeBrute['libelle'],
          aliasEmail: entreeBrute['aliasEmail'],
          partiLe: entreeBrute['partiLe'],
        });
        donnees = resultat.donnees;
        reussites.push(true);
      } catch {
        reussites.push(false);
      }
    }
    return { donnees, reussites };
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
   *
   * `prisesEnCharge` (US-058, RG-058, plan_18 incrément 6) : reportée telle quelle sur le brouillon si non vide,
   * sur le même principe que `resultatsParProjet` ; absente ou vide, comportement strictement inchangé. Comme le
   * reste de ce bouchon, aucune entrée de journal n'est produite ici (décision documentée en tête de fichier :
   * RG-023 jamais alimenté par ce bouchon) — l'application effective de `prisesEnCharge` a lieu à l'intégration
   * (cf. {@link resoudreBrouillon}).
   * @param parametres - Paramètres reçus (`campagneId`, `date`, `perimetre`, `verdicts`, `resultatsParProjet`,
   * `prisesEnCharge`, `donnees`).
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
    const prisesEnCharge = BouchonAdministrationUtils.estObjet(parametres['prisesEnCharge'])
      ? parametres['prisesEnCharge']
      : undefined;

    return {
      ...donnees,
      campagnes: [...campagnes, { id: campagneId, date, perimetre, verdicts }],
      brouillon: {
        campagneId,
        creeLe: date,
        resultatsParProjet,
        ...(prisesEnCharge !== undefined && Object.keys(prisesEnCharge).length > 0
          ? { prisesEnCharge }
          : {}),
      },
    };
  }

  /**
   * Intègre (`statutCible: 'integre'`) ou rejette (`statutCible: 'rejete'`) tout ou partie des entrées encore en
   * attente du brouillon courant (US-014). Une entrée intégrée rejoint l'historique des audits du projet
   * concerné ; une entrée rejetée n'y est jamais ajoutée. Le brouillon est effacé (`null`) une fois toutes ses
   * entrées résolues.
   *
   * `brouillon.prisesEnCharge` (US-058, RG-058, plan_18 incrément 6) : ciblée par la même `selection` que
   * `resultatsParProjet`, indépendamment de la présence d'une entrée d'audit pour le même projet. Une intégration
   * applique chaque entrée ciblée à `Projet.premierCommitInterne` (silencieusement abandonnée si le projet n'existe
   * plus, sur le modèle du cœur natif) ; un rejet l'abandonne purement et simplement, jamais appliquée (« aucune
   * application partielle », §5.4 du plan). Aucune entrée de journal n'est produite par ce bouchon (cf. commentaire
   * d'en-tête de ce fichier).
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
    const prisesEnChargeExistantes = BouchonAdministrationUtils.estObjet(
      brouillon['prisesEnCharge'],
    )
      ? brouillon['prisesEnCharge']
      : {};
    // US-058, plan_18 incrément 6 (corrigé en relecture) : un identifiant de `selection` porté uniquement par
    // `prisesEnChargeExistantes` (projet dont l'audit a totalement échoué, sans entrée dans `resultatsParProjet`,
    // mais dont le calcul de prise en charge a réussi) est accepté ici, sur le modèle du cœur natif
    // (`persistance::audit::entrees_ciblees`) — sinon une sélection projet par projet ne pourrait jamais
    // atteindre une telle entrée orpheline.
    if (selection !== undefined) {
      for (const projetId of selection) {
        if (!idsEnAttente.has(projetId) && !(projetId in prisesEnChargeExistantes)) {
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

    const idsPriseEnChargeCibles = (selection ?? Object.keys(prisesEnChargeExistantes)).filter(
      (projetId) => projetId in prisesEnChargeExistantes,
    );
    if (statutCible === 'integre') {
      for (const projetId of idsPriseEnChargeCibles) {
        const premierCommitInterne = prisesEnChargeExistantes[projetId];
        try {
          donneesCourantes = BouchonAdministrationUtils.miseAJourProjetParId(
            donneesCourantes,
            projetId,
            (projet) => ({ ...projet, premierCommitInterne }),
          );
        } catch {
          // Projet disparu entre le lancement de la campagne et l'intégration du brouillon : entrée abandonnée
          // silencieusement, sur le modèle du cœur natif (`persistance::audit::integrer_brouillon`).
        }
      }
    }
    const prisesEnChargeRestantes = Object.fromEntries(
      Object.entries(prisesEnChargeExistantes).filter(
        ([projetId]) => !idsPriseEnChargeCibles.includes(projetId),
      ),
    );

    // US-058, plan_18 incrément 6 (corrigé en relecture) : le brouillon reste ouvert tant qu'une prise en charge
    // en attente subsiste, même si tous les résultats d'audit sont résolus — sur le modèle du cœur natif
    // (`persistance::audit::purger_brouillon_si_resolu`), pour ne jamais perdre silencieusement une entrée
    // orpheline de `prisesEnCharge` (projet sans résultat d'audit exploitable).
    const encoreEnAttente =
      nouveauxResultats.some(
        (entree) => BouchonAdministrationUtils.lireTexte(entree, 'statut') === 'enAttente',
      ) || Object.keys(prisesEnChargeRestantes).length > 0;
    // `brouillonSansPrisesEnCharge` retire explicitement l'ancienne clé `prisesEnCharge` de `brouillon` avant le
    // spread ci-dessous : sans ce retrait, le motif usuel « omettre la clé si vide » ne suffirait pas à faire
    // disparaître une valeur déjà présente sur `brouillon` (la clé omise à droite d'un spread ne retire jamais une
    // clé déjà posée par le spread lui-même) et une entrée pourtant déjà extraite réapparaîtrait dans le brouillon
    // renvoyé.
    const brouillonSansPrisesEnCharge: Record<string, unknown> = { ...brouillon };
    delete brouillonSansPrisesEnCharge['prisesEnCharge'];
    return {
      ...donneesCourantes,
      brouillon: encoreEnAttente
        ? {
            ...brouillonSansPrisesEnCharge,
            resultatsParProjet: nouveauxResultats,
            ...(Object.keys(prisesEnChargeRestantes).length > 0
              ? { prisesEnCharge: prisesEnChargeRestantes }
              : {}),
          }
        : null,
    };
  }

  /**
   * Calcule des métriques de volumétrie plausibles (US-055, RG-055) : quatre postes obtenus par sérialisation des
   * sous-arbres de la racine, le cinquième (« autre ») absorbant le reste pour garantir une somme exactement égale
   * au poids total du JSON en clair (`JSON.stringify(donnees).length`). Version simplifiée du calcul du cœur natif
   * (`src-tauri/src/persistance/volumetrie.rs`) : l'ordre des clés JSON diffère entre ce bouchon et `serde`, d'où
   * le rognage défensif ci-dessous, mais l'invariant de somme est préservé (décision arbitraire de bouchonnage).
   * Aucune mutation : la racine n'est ni modifiée ni horodatée.
   * @param parametres - Paramètres reçus (`chemin`, `donnees`).
   * @returns Un objet de forme `MetriquesVolumetrie`.
   */
  private static calculerMetriquesVolumetrie(
    parametres: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    const donnees = BouchonAdministrationUtils.exigerObjet(parametres['donnees']);
    const chemin = BouchonAdministrationUtils.lireTexteOptionnel(parametres, 'chemin');
    const total = BouchonAdministrationUtils.tailleJson(donnees);

    const parametrageBrut =
      BouchonAdministrationUtils.tailleJson(donnees['parametres']) +
      BouchonAdministrationUtils.tailleJson(donnees['referentiels']) +
      BouchonAdministrationUtils.tailleJson(donnees['vuesEnregistrees']);
    const journalBrut = BouchonAdministrationUtils.tailleJson(donnees['journal']);

    let administrationBrut = 0;
    let auditsBrut = 0;
    for (const groupe of BouchonAdministrationUtils.lireListe(donnees, 'groupes')) {
      administrationBrut +=
        BouchonAdministrationUtils.tailleJson(groupe) -
        BouchonAdministrationUtils.tailleJson(groupe['projets']);
      for (const projet of BouchonAdministrationUtils.lireListe(groupe, 'projets')) {
        administrationBrut +=
          BouchonAdministrationUtils.tailleJson(projet) -
          BouchonAdministrationUtils.tailleJson(projet['audits']);
        auditsBrut += BouchonAdministrationUtils.tailleJson(projet['audits']);
      }
    }
    auditsBrut +=
      BouchonAdministrationUtils.tailleJson(donnees['campagnes']) +
      BouchonAdministrationUtils.tailleJson(donnees['brouillon'] ?? null);

    let budget = total;
    const retenir = (poste: number): number => {
      const retenu = Math.max(0, Math.min(Math.round(poste), budget));
      budget -= retenu;
      return retenu;
    };
    const parametrageOctets = retenir(parametrageBrut);
    const journalOctets = retenir(journalBrut);
    const administrationOctets = retenir(administrationBrut);
    const auditsOctets = retenir(auditsBrut);
    const autreOctets = budget;

    return {
      // Fichier réellement sur disque : compressé (zstd) puis chiffré, donc sensiblement plus petit que le JSON
      // en clair — facteur ~0,4 plausible, pour ne pas afficher un poids disque supérieur au poids en clair.
      tailleDisqueOctets: chemin === undefined ? null : Math.round(total * 0.4),
      tailleJsonClairOctets: total,
      ventilation: {
        parametrageOctets,
        journalOctets,
        administrationOctets,
        auditsOctets,
        autreOctets,
      },
    };
  }

  /**
   * Résout `calculer_prise_en_charge_projet` (US-058, RG-058) de façon déterministe et rejouable, après un délai
   * artificiel fixe ({@link DELAI_CALCUL_PRISE_EN_CHARGE_MS}). Reproduit une version simplifiée de la logique du
   * cœur natif (`src-tauri/src/persistance/prise_en_charge.rs`) : `aucune_regle_interne` si le groupe n'a aucune
   * règle `interne`, `non_applicable` sans source GitLab, sinon `determine`. Pour rester rejouable (recette :
   * « recalculer sans rien changer → inchangé »), la date retenue est celle déjà stockée tant que l'empreinte du
   * référentiel `interne` n'a pas changé depuis le dernier calcul ; elle est resynthétisée depuis l'empreinte
   * courante sinon (ou au premier calcul), pour donner à voir un changement après modification des membres.
   * @param parametres - Paramètres reçus (`projetId`, `donnees`).
   * @returns Une structure de forme `PremierCommitInterne`.
   */
  private static async calculerPriseEnChargeProjet(
    parametres: Readonly<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    const donnees = BouchonAdministrationUtils.exigerObjet(parametres['donnees']);
    const projetId = BouchonAdministrationUtils.lireTexte(parametres, 'projetId');
    const cible = BouchonAdministrationUtils.trouverGroupeEtProjet(donnees, projetId);
    if (cible === undefined) {
      throw new AnomalieAdministrationBouchon('projetIntrouvable');
    }
    await new Promise((resoudre) => setTimeout(resoudre, DELAI_CALCUL_PRISE_EN_CHARGE_MS));

    const { groupe, projet } = cible;
    const empreinteReferentiel = BouchonAdministrationUtils.empreinteDeGroupe(groupe);
    const calculeLe = new Date().toISOString().slice(0, 10);
    const base = { calculeLe, empreinteReferentiel };

    const reglesInternes = BouchonAdministrationUtils.reglesInternes(groupe);
    if (reglesInternes.length === 0) {
      return { ...base, statut: 'aucune_regle_interne' };
    }
    const sourcesGitlab = BouchonAdministrationUtils.lireListe(projet, 'sources').filter(
      (source) => BouchonAdministrationUtils.lireTexte(source, 'type') === 'depotGitlab',
    );
    if (sourcesGitlab.length === 0) {
      return { ...base, statut: 'non_applicable' };
    }

    const existant = projet['premierCommitInterne'];
    const existantDetermine =
      BouchonAdministrationUtils.estObjet(existant) &&
      BouchonAdministrationUtils.lireTexte(existant, 'statut') === 'determine'
        ? existant
        : undefined;
    const empreinteInchangee =
      existantDetermine !== undefined &&
      BouchonAdministrationUtils.lireTexte(existantDetermine, 'empreinteReferentiel') ===
        empreinteReferentiel;

    if (existantDetermine !== undefined && empreinteInchangee) {
      return {
        ...base,
        statut: 'determine',
        date: BouchonAdministrationUtils.lireTexte(existantDetermine, 'date'),
        sha: BouchonAdministrationUtils.lireTexte(existantDetermine, 'sha'),
        emailAuteur: BouchonAdministrationUtils.lireTexte(existantDetermine, 'emailAuteur'),
      };
    }
    const premiereRegle = reglesInternes[0];
    const emailAuteur =
      BouchonAdministrationUtils.lireTexteOptionnel(premiereRegle, 'aliasEmail') ??
      BouchonAdministrationUtils.lireTexte(premiereRegle, 'critere');
    return {
      ...base,
      statut: 'determine',
      date: BouchonAdministrationUtils.dateSynthetiqueDepuisEmpreinte(empreinteReferentiel),
      sha: `bouchon-${empreinteReferentiel.slice(7, 15)}`,
      emailAuteur,
    };
  }

  /**
   * Résout `empreinte_referentiel_interne` (US-058, RG-058, décision 15 du plan_18) : un condensé stable, de forme
   * `sha256:…` compatible avec le cœur natif, dérivé des seules règles `interne` du groupe (jamais `partiLe`), qui
   * change dès que ces règles changent. N'est pas un vrai SHA-256 (hachage de chaîne suffisant : l'interface ne
   * fait que comparer des chaînes, décision 15).
   * @param parametres - Paramètres reçus (`groupeId`, `donnees`).
   * @returns Le condensé bouchonné.
   */
  private static empreinteReferentielInterne(
    parametres: Readonly<Record<string, unknown>>,
  ): string {
    const donnees = BouchonAdministrationUtils.exigerObjet(parametres['donnees']);
    const groupeId = BouchonAdministrationUtils.lireTexte(parametres, 'groupeId');
    const groupe = BouchonAdministrationUtils.lireListe(donnees, 'groupes').find(
      (candidat) => BouchonAdministrationUtils.lireTexte(candidat, 'id') === groupeId,
    );
    if (groupe === undefined) {
      throw new AnomalieAdministrationBouchon('groupeIntrouvable');
    }
    return BouchonAdministrationUtils.empreinteDeGroupe(groupe);
  }

  /**
   * Règles de membre connu de statut `interne` d'un groupe.
   * @param groupe - Groupe source.
   * @returns Les règles `interne`, jamais `undefined`.
   */
  private static reglesInternes(
    groupe: Record<string, unknown>,
  ): readonly Record<string, unknown>[] {
    return BouchonAdministrationUtils.lireListe(groupe, 'membresConnus').filter(
      (membre) => BouchonAdministrationUtils.lireTexte(membre, 'statut') === 'interne',
    );
  }

  /**
   * Condensé bouchonné du sous-ensemble `interne` des membres connus d'un groupe : triplet trié
   * `(critere, typeCritere, aliasEmail)`, jamais `partiLe` (décision 11 du plan_18).
   * @param groupe - Groupe source.
   * @returns Une chaîne `sha256:…`.
   */
  private static empreinteDeGroupe(groupe: Record<string, unknown>): string {
    const triplets = BouchonAdministrationUtils.reglesInternes(groupe)
      .map(
        (membre) =>
          `${BouchonAdministrationUtils.lireTexte(membre, 'critere')}|` +
          `${BouchonAdministrationUtils.lireTexte(membre, 'typeCritere')}|` +
          `${BouchonAdministrationUtils.lireTexteOptionnel(membre, 'aliasEmail') ?? ''}`,
      )
      .sort((gauche, droite) => gauche.localeCompare(droite));
    return `sha256:${BouchonAdministrationUtils.hachageStable(triplets.join('\n'))}`;
  }

  /**
   * Hachage déterministe (variante de DJB2) d'une chaîne, rendu en hexadécimal sur 8 caractères. Suffisant pour un
   * bouchon : sert uniquement à obtenir une valeur stable qui change avec l'entrée.
   * @param valeur - Chaîne à hacher.
   * @returns Huit caractères hexadécimaux.
   */
  private static hachageStable(valeur: string): string {
    let accumulateur = 5381;
    for (let index = 0; index < valeur.length; index += 1) {
      accumulateur = (accumulateur * 33) ^ valeur.charCodeAt(index);
    }
    return (accumulateur >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Date `AAAA-MM-JJ` plausible et déterministe dérivée d'une empreinte : décalage borné à partir du 1ᵉʳ janvier
   * 2016, pour que deux empreintes distinctes donnent des dates distinctes et qu'une même empreinte redonne
   * toujours la même date.
   * @param empreinte - Empreinte `sha256:…`.
   * @returns Une date calendaire `AAAA-MM-JJ`.
   */
  private static dateSynthetiqueDepuisEmpreinte(empreinte: string): string {
    const graine = Number.parseInt(BouchonAdministrationUtils.hachageStable(empreinte), 16);
    const base = Date.UTC(2016, 0, 1);
    const decalageJours = graine % 2920;
    return new Date(base + decalageJours * 86_400_000).toISOString().slice(0, 10);
  }

  /**
   * Recherche un projet par son identifiant dans tous les groupes, en restituant aussi son groupe de rattachement
   * (lecture seule, à la différence de {@link miseAJourProjetParId}).
   * @param donnees - Racine courante.
   * @param projetId - Identifiant du projet recherché.
   * @returns Le couple `{ groupe, projet }`, ou `undefined` si aucun projet ne porte cet identifiant.
   */
  private static trouverGroupeEtProjet(
    donnees: Record<string, unknown>,
    projetId: string,
  ):
    | { readonly groupe: Record<string, unknown>; readonly projet: Record<string, unknown> }
    | undefined {
    for (const groupe of BouchonAdministrationUtils.lireListe(donnees, 'groupes')) {
      const projet = BouchonAdministrationUtils.lireListe(groupe, 'projets').find(
        (candidat) => BouchonAdministrationUtils.lireTexte(candidat, 'id') === projetId,
      );
      if (projet !== undefined) {
        return { groupe, projet };
      }
    }
    return undefined;
  }

  /**
   * Taille en octets (approchée : longueur de chaîne) de la sérialisation JSON de `valeur`, `0` si `valeur` n'est
   * pas sérialisable.
   * @param valeur - Valeur à mesurer.
   * @returns La longueur de `JSON.stringify(valeur)`, ou `0`.
   */
  private static tailleJson(valeur: unknown): number {
    const serialise = JSON.stringify(valeur);
    return typeof serialise === 'string' ? serialise.length : 0;
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

  /**
   * Revalide la date de départ optionnelle d'une règle de membre connu (RG-061), sur le modèle de
   * `persistance::administration::valider_parti_le` côté cœur natif : interdite sur un critère `domaineEmail`, doit
   * être une date `AAAA-MM-JJ` valide et non postérieure au jour courant.
   * @param partiLe - Date de départ soumise, ou `undefined`.
   * @param typeCritere - Type du critère de la règle qualifiée.
   * @throws {AnomalieAdministrationBouchon} `dateDepartInvalide` si la date est invalide.
   */
  private static validerPartiLe(partiLe: string | undefined, typeCritere: string): void {
    if (partiLe === undefined) {
      return;
    }
    const format = /^\d{4}-\d{2}-\d{2}$/;
    const horodatage = Date.parse(`${partiLe}T00:00:00Z`);
    const invalide =
      typeCritere === 'domaineEmail' ||
      !format.test(partiLe) ||
      Number.isNaN(horodatage) ||
      horodatage > Date.now();
    if (invalide) {
      throw new AnomalieAdministrationBouchon('dateDepartInvalide');
    }
  }
}
