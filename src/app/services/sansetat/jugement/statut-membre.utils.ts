// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Calcule le statut de rattachement d'un membre ou contributeur (RG-006 à RG-010).
//
// Décision d'architecture (à valider par un humain) : `RegleMembreConnu<TStatut>` ci-dessous reprend
// structurellement la forme de `MembreConnu` (`services/avecetat/etat/types-donnees.ts`) sans l'importer, pour la
// même raison que `parametres-jugement.utils.ts` (aucune dépendance de `services/sansetat/` vers
// `services/avecetat/`). Le paramètre de type `TStatut` (plutôt qu'une duplication de l'enum `StatutMembre`) rend
// ce module agnostique de la valeur concrète du statut : il ne fait que la comparer par égalité et la restituer telle
// quelle, sur le modèle déjà retenu par `ParametresSuppressionMembreConnu<TDonnees>`
// (`services/sansetat/commandes/facade-administration.service.ts`) pour ce même problème de couches.
import { ParametresJugementUtils } from './parametres-jugement.utils';

/**
 *
 */
export class StatutMembreUtils {
  /**
   * Extrait, parmi les règles de membres connus, celles de type `username` correspondant exactement à
   * l'identifiant fourni (RG-007, premier niveau de précédence).
   * @param identifiant - Identifiant du membre ou contributeur à résoudre.
   * @param regles - Règles de membres connus du groupe.
   * @returns Les règles correspondantes (précédence 1).
   */
  private static filtrerReglesUsername<TStatut>(
    identifiant: IdentifiantMembre,
    regles: readonly RegleMembreConnu<TStatut>[],
  ): readonly RegleMembreConnu<TStatut>[] {
    const { username } = identifiant;
    if (username === undefined) {
      return [];
    }
    return regles.filter((regle) => regle.typeCritere === 'username' && regle.critere === username);
  }

  /**
   * Extrait, parmi les règles de membres connus, celles correspondant exactement à l'adresse courriel fournie
   * (RG-007, deuxième niveau de précédence) : une règle `email` dont le critère est cette adresse, ou une règle
   * `username` dont l'alias courriel (`aliasEmail`) est cette adresse — ce second cas permet de résoudre un
   * contributeur connu uniquement par son adresse courriel (ex. auteur d'un commit) contre une règle initialement
   * saisie par identifiant de connexion (décision d'interprétation d'`aliasEmail`, à valider par un humain : aucun
   * texte normatif consulté ne décrit littéralement cet algorithme de résolution).
   * @param identifiant - Identifiant du membre ou contributeur à résoudre.
   * @param regles - Règles de membres connus du groupe.
   * @returns Les règles correspondantes (précédence 2).
   */
  private static filtrerReglesEmail<TStatut>(
    identifiant: IdentifiantMembre,
    regles: readonly RegleMembreConnu<TStatut>[],
  ): readonly RegleMembreConnu<TStatut>[] {
    const { email } = identifiant;
    if (email === undefined) {
      return [];
    }
    return regles.filter(
      (regle) =>
        (regle.typeCritere === 'email' && regle.critere === email) ||
        (regle.typeCritere === 'username' && regle.aliasEmail === email),
    );
  }

  /**
   * Extrait, parmi les règles de membres connus, celles de type `domaineEmail` dont le critère (motif glob, ex.
   * `*@entreprise.fr`, cf. `docs/01_besoin/exemple-donnees.json`) correspond à l'adresse courriel fournie (RG-007,
   * troisième niveau de précédence).
   * @param identifiant - Identifiant du membre ou contributeur à résoudre.
   * @param regles - Règles de membres connus du groupe.
   * @returns Les règles correspondantes (précédence 3).
   */
  private static filtrerReglesDomaine<TStatut>(
    identifiant: IdentifiantMembre,
    regles: readonly RegleMembreConnu<TStatut>[],
  ): readonly RegleMembreConnu<TStatut>[] {
    const { email } = identifiant;
    if (email === undefined) {
      return [];
    }
    return regles.filter(
      (regle) =>
        regle.typeCritere === 'domaineEmail' &&
        ParametresJugementUtils.correspondMotifGlob(regle.critere, email),
    );
  }

  /**
   * Résout un niveau de précédence RG-007 : `undefined` si aucune règle ne correspond (le niveau suivant doit être
   * tenté), un statut `conflit` (RG-008) si les règles correspondantes portent des statuts contradictoires, sinon
   * le statut commun à toutes les règles correspondantes.
   * @param regles - Règles correspondant à ce niveau de précédence.
   * @returns La résolution de ce niveau, ou `undefined` si aucune règle ne correspond.
   */
  private static resoudreNiveau<TStatut>(
    regles: readonly RegleMembreConnu<TStatut>[],
  ): ResolutionStatutMembre<TStatut> | undefined {
    if (regles.length === 0) {
      return undefined;
    }
    const statutsDistincts = new Set(regles.map((regle) => regle.statut));
    if (statutsDistincts.size > 1) {
      return { type: 'conflit', reglesEnConflit: regles };
    }
    return { type: 'connu', statut: regles[0].statut };
  }

  /**
   * Calcule le statut de rattachement d'un membre ou contributeur contre les règles de membres connus du groupe
   * (RG-006 à RG-008) : précédence username exact, puis email exact (ou alias courriel d'une règle `username`),
   * puis domaine email ; le premier niveau qui correspond l'emporte (RG-007). Statut `inconnu` par défaut si aucune
   * règle ne correspond à aucun niveau (RG-006). Statut `conflit` si, au sein d'un même niveau, les règles
   * correspondantes portent des statuts contradictoires (RG-008) — restitué distinctement de `inconnu` pour
   * permettre à l'écran appelant d'orienter l'utilisateur vers l'administration, tout en étant traité visuellement
   * comme `inconnu` (cf. charte d'ergonomie).
   * @param identifiant - Identifiant (username et/ou email) du membre ou contributeur à résoudre.
   * @param regles - Règles de membres connus du groupe (`Groupe.membresConnus`).
   * @returns La résolution du statut de rattachement.
   */
  public static calculerStatutMembre<TStatut>(
    identifiant: IdentifiantMembre,
    regles: readonly RegleMembreConnu<TStatut>[],
  ): ResolutionStatutMembre<TStatut> {
    const resolutionUsername = StatutMembreUtils.resoudreNiveau(
      StatutMembreUtils.filtrerReglesUsername(identifiant, regles),
    );
    if (resolutionUsername !== undefined) {
      return resolutionUsername;
    }
    const resolutionEmail = StatutMembreUtils.resoudreNiveau(
      StatutMembreUtils.filtrerReglesEmail(identifiant, regles),
    );
    if (resolutionEmail !== undefined) {
      return resolutionEmail;
    }
    const resolutionDomaine = StatutMembreUtils.resoudreNiveau(
      StatutMembreUtils.filtrerReglesDomaine(identifiant, regles),
    );
    if (resolutionDomaine !== undefined) {
      return resolutionDomaine;
    }
    return { type: 'inconnu' };
  }

  /**
   * Résout la règle de membre connu ayant permis de rattacher ce membre ou contributeur via un canal **nominatif**
   * (précédences 1 et 2 de RG-007 uniquement : `username` exact, ou `email` exact / alias courriel d'une règle
   * `username`) — ne redescend jamais au niveau domaine, une règle `domaineEmail` ne pouvant jamais porter `partiLe`
   * (RG-061). Utilisée exclusivement pour construire le lien « Marquer comme parti » de la Fiche projet (décision
   * 10 du plan `plan_18`) : l'appelant ne doit l'invoquer que pour un membre déjà résolu `connu` par
   * {@link calculerStatutMembre}, auquel cas une correspondance sans conflit à l'un de ces deux niveaux est garantie
   * par construction (le résultat `undefined` d'un niveau contradictoire n'est donc pas attendu en pratique, mais
   * reste géré sans exception pour rester une fonction pure totale).
   * Générique sur le type concret des règles fourni ({@link TRegle}, contraint à structurellement étendre
   * {@link RegleMembreConnu}) plutôt que sur `RegleMembreConnu<TStatut>` lui-même, pour restituer la règle
   * d'origine telle quelle — avec ses champs additionnels éventuels (ex. `id`, `partiLe` de `MembreConnu`,
   * volontairement absents de {@link RegleMembreConnu}, cf. commentaire d'en-tête) — plutôt qu'une copie appauvrie.
   * @param identifiant - Identifiant (username et/ou email) du membre ou contributeur à résoudre.
   * @param regles - Règles de membres connus du groupe (`Groupe.membresConnus`).
   * @returns La règle nominative correspondante, `undefined` en l'absence de correspondance aux précédences 1/2 ou
   * en cas de correspondances contradictoires à un même niveau.
   */
  public static resoudreRegleNominative<TStatut, TRegle extends RegleMembreConnu<TStatut>>(
    identifiant: IdentifiantMembre,
    regles: readonly TRegle[],
  ): TRegle | undefined {
    const { username, email } = identifiant;
    const reglesUsername =
      username === undefined
        ? []
        : regles.filter((regle) => regle.typeCritere === 'username' && regle.critere === username);
    if (reglesUsername.length > 0) {
      return new Set(reglesUsername.map((regle) => regle.statut)).size === 1
        ? reglesUsername[0]
        : undefined;
    }
    const reglesEmail =
      email === undefined
        ? []
        : regles.filter(
            (regle) =>
              (regle.typeCritere === 'email' && regle.critere === email) ||
              (regle.typeCritere === 'username' && regle.aliasEmail === email),
          );
    if (reglesEmail.length > 0) {
      return new Set(reglesEmail.map((regle) => regle.statut)).size === 1
        ? reglesEmail[0]
        : undefined;
    }
    return undefined;
  }

  /**
   * Module la gravité de l'alerte associée à un membre `inconnu` ou en `conflit` selon son niveau d'accès GitLab
   * (RG-010 : un statut inconnu avec des droits de mainteneur ou d'administration est plus grave qu'un statut
   * inconnu en lecture seule). Seuil retenu (à valider par un humain, aucune valeur chiffrée fournie par RG-010) :
   * `niveauAcces >= 40` (mainteneur GitLab) est jugé `elevee`, en-deçà `moderee` — 40 étant le niveau GitLab
   * standard du rôle « Maintainer », cf. `MembreGitlab.niveauAcces` (`services/sansetat/commandes/types-facade.ts`).
   * @param niveauAcces - Niveau d'accès GitLab du membre (10 invité, 20 lecteur, 30 développeur, 40 mainteneur,
   * 50 propriétaire).
   * @returns La gravité de l'alerte à associer au membre inconnu ou en conflit.
   */
  public static calculerGraviteAlerteMembreInconnu(
    niveauAcces: number,
  ): GraviteAlerteMembreInconnu {
    return niveauAcces >= 40 ? 'elevee' : 'moderee';
  }
}

/**
 * Type de critère d'une règle de membre connu (mirroir structurel de `TypeCritereMembre`, cf. commentaire d'en-tête).
 */
export type TypeCritereMembreConnu = 'username' | 'email' | 'domaineEmail';

/**
 * Forme structurelle d'une règle de membre connu consommée par ce module, générique sur le type du statut restitué
 * (cf. commentaire d'en-tête). La résolution du statut ne lit que `critere`, `typeCritere`, `statut` et
 * `aliasEmail` : la date de départ `partiLe` d'une règle (RG-061) n'y figure volontairement pas et n'a aucun effet
 * sur la résolution du statut (RG-006 à RG-008) — un membre parti conserve exactement le statut qu'il aurait sans
 * cette date.
 */
export interface RegleMembreConnu<TStatut> {
  /** Motif de reconnaissance (login, email ou motif glob de domaine selon `typeCritere`). */
  readonly critere: string;
  /** Type du critère de reconnaissance. */
  readonly typeCritere: TypeCritereMembreConnu;
  /** Statut associé, restitué tel quel par ce module (jamais interprété). */
  readonly statut: TStatut;
  /** Alias courriel optionnel (uniquement significatif pour une règle `username`, cf. {@link StatutMembreUtils.filtrerReglesEmail}). */
  readonly aliasEmail?: string;
}

/**
 * Identifiant d'un membre ou contributeur à résoudre contre les règles de membres connus. Au moins l'un des deux
 * champs est attendu en pratique (un contributeur GitLab porte toujours un `username` ; un auteur de commit
 * n'est identifié que par son `email`), mais les deux restent optionnels côté type pour rester une fonction pure
 * tolérante à une donnée d'entrée incomplète (cas limite testé explicitement).
 */
export interface IdentifiantMembre {
  /** Identifiant de connexion (login) du membre, si connu. */
  readonly username?: string;
  /** Adresse courriel du membre ou contributeur, si connue. */
  readonly email?: string;
}

/**
 * Gravité de l'alerte associée à un membre `inconnu` ou en `conflit` (RG-010).
 */
export type GraviteAlerteMembreInconnu = 'elevee' | 'moderee';

/**
 * Résolution du statut de rattachement d'un membre ou contributeur (RG-006 à RG-008), générique sur le type du
 * statut restitué (cf. commentaire d'en-tête).
 */
export type ResolutionStatutMembre<TStatut> =
  | { readonly type: 'connu'; readonly statut: TStatut }
  | { readonly type: 'inconnu' }
  | { readonly type: 'conflit'; readonly reglesEnConflit: readonly RegleMembreConnu<TStatut>[] };
