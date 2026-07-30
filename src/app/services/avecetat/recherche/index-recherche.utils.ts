// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Index de recherche transversale (US-021, F16, Phase 7 incrément 5 ; RNF-005), conception détaillée :
// `construireIndex(données)`/`rechercher(terme, options)` (`docs/02_documentation/13_conceptionDetaillee.md#détail-
// des-modulescomposants-et-de-leurs-interfaces`). Classé sous `services/avecetat/` (et non `services/sansetat/
// jugement/`, à la différence des autres fonctions pures de restitution) car son propriétaire naturel,
// `IndexRechercheTransversaleService`, conserve l'index construit comme un état interne reconstruit à chaque
// changement de la racine courante plutôt qu'à chaque frappe (cf. README de ce dossier) ; ce fichier n'en reste pas
// moins constitué de fonctions pures, testées sans TestBed, sur le modèle de `AgregationThemeFicheProjetUtils`
// (`services/sansetat/jugement/agregation-theme-fiche-projet.utils.ts`).
//
// Quatre natures de résultats (F16) : dépendances (`gitlab.dependances`), membres et contributeurs
// (`gitlab.membres`/`gitlab.contributeurs`), outils IA détectés (`gitlab.marqueurs_ia`) et entités (groupes,
// projets, sources). Les trois premières natures sont réservées au dernier audit intégré de chaque projet par
// défaut (`audits.at(-1)`, même convention que `FicheProjetComponent`), étendues à tout l'historique sur option
// (`inclureHistorique`) ; la nature « entités » est structurelle (Administration) et ne dépend d'aucun audit, donc
// jamais concernée par cette option. Chaque ligne de dépendance/membre/outil IA porte la date de l'audit dont elle
// est issue, afin de permettre à l'utilisateur de répondre par lui-même à une question du type « quand a-t-on
// cessé d'utiliser struts ? » (Specification.md, F16) par lecture directe des dates listées avec l'historique
// inclus, sans construction d'une frise dédiée (Could have, hors périmètre de cet incrément).
import type { Groupe, Resultat } from '../etat/types-donnees';
import { TypeSource } from '../etat/types-donnees';

/**
 * Occurrence indexée d'une dépendance déclarée par un manifeste (F16 : « log4j liste les projets concernés et
 * leurs versions »).
 */
export interface OccurrenceDependanceIndexee {
  /** Identifiant du projet portant cette dépendance. */
  readonly projetId: string;
  /** Nom du projet, dénormalisé pour éviter une remontée d'arborescence à l'affichage. */
  readonly projetNom: string;
  /** Nom du groupe du projet, dénormalisé. */
  readonly groupeNom: string;
  /** Référence de la dépendance (ex. « log4j »). */
  readonly reference: string;
  /** Version déclarée. */
  readonly version: string;
  /** Date de l'audit ayant produit ce constat. */
  readonly dateAudit: string;
  /** `true` si ce constat provient du dernier audit intégré du projet. */
  readonly dansDernierAudit: boolean;
}

/**
 * Occurrence indexée d'un membre du dépôt (`gitlab.membres`) ou d'un contributeur (`gitlab.contributeurs`, F16).
 */
export interface OccurrenceMembreIndexee {
  /** Identifiant du projet concerné. */
  readonly projetId: string;
  /** Nom du projet, dénormalisé. */
  readonly projetNom: string;
  /** Nom du groupe du projet, dénormalisé. */
  readonly groupeNom: string;
  /** Origine du constat : membre déclaré du dépôt, ou auteur de commit non nécessairement membre. */
  readonly nature: 'membre' | 'contributeur';
  /** Identifiant de reconnaissance (login pour un membre, courriel pour un contributeur). */
  readonly identifiant: string;
  /** Nom affiché. */
  readonly nom: string;
  /** Date de l'audit ayant produit ce constat. */
  readonly dateAudit: string;
  /** `true` si ce constat provient du dernier audit intégré du projet. */
  readonly dansDernierAudit: boolean;
}

/**
 * Occurrence indexée d'un marqueur d'outil IA détecté dans l'arborescence (`gitlab.marqueurs_ia`, F16, F18).
 */
export interface OccurrenceOutilIaIndexee {
  /** Identifiant du projet concerné. */
  readonly projetId: string;
  /** Nom du projet, dénormalisé. */
  readonly projetNom: string;
  /** Nom du groupe du projet, dénormalisé. */
  readonly groupeNom: string;
  /** Outil IA détecté (ex. « Claude Code »). */
  readonly outil: string;
  /** Chemin du marqueur détecté. */
  readonly chemin: string;
  /** Date de l'audit ayant produit ce constat. */
  readonly dateAudit: string;
  /** `true` si ce constat provient du dernier audit intégré du projet. */
  readonly dansDernierAudit: boolean;
}

/**
 * Nature d'une entité structurelle indexée (F16).
 */
export type TypeEntiteIndexee = 'groupe' | 'projet' | 'source';

/**
 * Entité structurelle indexée (groupe, projet ou source, F16), sans dépendance à un audit.
 */
export interface EntiteIndexee {
  /** Nature de l'entité. */
  readonly type: TypeEntiteIndexee;
  /** Identifiant propre de l'entité. */
  readonly id: string;
  /** Libellé affiché et recherché. */
  readonly libelle: string;
  /** Nom du groupe de rattachement, dénormalisé. */
  readonly groupeNom: string;
  /**
   * Identifiant du projet vers la fiche duquel naviguer, présent pour les entités « projet » (leur propre
   * identifiant) et « source » (le projet propriétaire, aucune fiche dédiée à une source n'existant à ce jour) ;
   * absent pour une entité « groupe », faute d'écran dédié (repli documenté vers l'Administration par l'appelant).
   */
  readonly projetId: string | undefined;
}

/**
 * Ensemble des occurrences indexées, tel que construit par {@link IndexRechercheUtils.construireIndex} à partir de
 * la grappe de groupes courante.
 */
export interface IndexRechercheTransversale {
  /** Occurrences de dépendances indexées, tous audits confondus. */
  readonly dependances: readonly OccurrenceDependanceIndexee[];
  /** Occurrences de membres et contributeurs indexées, tous audits confondus. */
  readonly membres: readonly OccurrenceMembreIndexee[];
  /** Occurrences de marqueurs d'outils IA indexées, tous audits confondus. */
  readonly outilsIa: readonly OccurrenceOutilIaIndexee[];
  /** Entités structurelles indexées (groupes, projets, sources). */
  readonly entites: readonly EntiteIndexee[];
}

/**
 * Options de recherche transversale (F16).
 */
export interface OptionsRechercheTransversale {
  /** Étend la recherche des dépendances/membres/outils IA à tout l'historique plutôt qu'au dernier audit intégré. */
  readonly inclureHistorique: boolean;
}

/**
 * Occurrences d'une nature de résultat, plafonnées à {@link IndexRechercheUtils.NOMBRE_RESULTATS_MAX_PAR_NATURE}
 * pour rester lisibles, avec le décompte réel avant troncature.
 */
export interface GroupeResultatsRecherche<TOccurrence> {
  /** Occurrences effectivement à afficher (plafonnées). */
  readonly occurrences: readonly TOccurrence[];
  /** Nombre total d'occurrences correspondantes, avant troncature. */
  readonly nombreTotal: number;
}

/**
 * Résultats groupés par nature d'une recherche transversale (F16 : « résultats groupés par nature »).
 */
export interface ResultatsRechercheTransversale {
  /** Dépendances correspondantes. */
  readonly dependances: GroupeResultatsRecherche<OccurrenceDependanceIndexee>;
  /** Membres et contributeurs correspondants. */
  readonly membres: GroupeResultatsRecherche<OccurrenceMembreIndexee>;
  /** Outils IA détectés correspondants. */
  readonly outilsIa: GroupeResultatsRecherche<OccurrenceOutilIaIndexee>;
  /** Entités correspondantes. */
  readonly entites: GroupeResultatsRecherche<EntiteIndexee>;
  /** `true` si aucune des quatre natures ne porte de résultat (maquette de référence : message explicite). */
  readonly aucunResultat: boolean;
}

/**
 * Construit l'index de recherche transversale et interroge cet index par terme et options (US-021, F16). Fonctions
 * pures, sans effet de bord, cf. commentaire d'en-tête pour le choix de classement sous `services/avecetat/`.
 */
export class IndexRechercheUtils {
  /**
   * Longueur minimale du terme recherché en-deçà de laquelle aucune recherche n'est déclenchée (repli pragmatique,
   * aucune valeur normative ne fixant ce seuil), pour éviter de restituer la quasi-totalité de l'index dès la
   * première frappe.
   */
  private static readonly LONGUEUR_MINIMALE_TERME = 2;

  /**
   * Nombre maximal d'occurrences affichées par nature (repli pragmatique, aucune valeur normative ne fixant ce
   * seuil), pour garder les résultats lisibles même avec l'historique complet inclus.
   */
  private static readonly NOMBRE_RESULTATS_MAX_PAR_NATURE = 50;

  /**
   * Retrouve, dans les résultats d'un audit, l'unique résultat portant le discriminant `type` demandé (sur le
   * modèle de `AgregationThemeFicheProjetUtils.trouver`).
   * @param resultats - Résultats d'un audit.
   * @param type - Discriminant `type` recherché.
   * @returns Le résultat trouvé, `undefined` si absent de cet audit.
   */
  private static trouverResultat<TType extends Resultat['type']>(
    resultats: readonly Resultat[],
    type: TType,
  ): Extract<Resultat, { type: TType }> | undefined {
    return resultats.find(
      (resultat): resultat is Extract<Resultat, { type: TType }> => resultat.type === type,
    );
  }

  /**
   * Construit l'index de recherche transversale à partir de la grappe de groupes courante (F16, reconstruit à
   * chaque changement de la racine — ouverture de fichier ou intégration de brouillon — par l'appelant, cf.
   * `IndexRechercheTransversaleService`).
   * @param groupes - Grappe de groupes courante (`DonneesApplicationService.groupes()`).
   * @returns L'index de recherche transversale.
   */
  public static construireIndex(groupes: readonly Groupe[]): IndexRechercheTransversale {
    const dependances: OccurrenceDependanceIndexee[] = [];
    const membres: OccurrenceMembreIndexee[] = [];
    const outilsIa: OccurrenceOutilIaIndexee[] = [];
    const entites: EntiteIndexee[] = [];

    for (const groupe of groupes) {
      entites.push({
        type: 'groupe',
        id: groupe.id,
        libelle: groupe.nom,
        groupeNom: groupe.nom,
        projetId: undefined,
      });

      for (const projet of groupe.projets) {
        entites.push({
          type: 'projet',
          id: projet.id,
          libelle: projet.nom,
          groupeNom: groupe.nom,
          projetId: projet.id,
        });

        for (const source of projet.sources) {
          const libelleType =
            source.type === TypeSource.DepotGitlab ? 'Dépôt GitLab' : 'Projet Sonar';
          entites.push({
            type: 'source',
            id: source.id,
            libelle: `${libelleType} ${source.idExterne}`,
            groupeNom: groupe.nom,
            projetId: projet.id,
          });
        }

        const dernierAuditId = projet.audits.at(-1)?.id;
        for (const audit of projet.audits) {
          const dansDernierAudit = audit.id === dernierAuditId;

          const resultatDependances = IndexRechercheUtils.trouverResultat(
            audit.resultats,
            'gitlab.dependances',
          );
          for (const dependance of resultatDependances?.dependances ?? []) {
            dependances.push({
              projetId: projet.id,
              projetNom: projet.nom,
              groupeNom: groupe.nom,
              reference: dependance.reference,
              version: dependance.version,
              dateAudit: audit.date,
              dansDernierAudit,
            });
          }

          const resultatMembres = IndexRechercheUtils.trouverResultat(
            audit.resultats,
            'gitlab.membres',
          );
          for (const membre of resultatMembres?.membres ?? []) {
            membres.push({
              projetId: projet.id,
              projetNom: projet.nom,
              groupeNom: groupe.nom,
              nature: 'membre',
              identifiant: membre.username,
              nom: membre.nom,
              dateAudit: audit.date,
              dansDernierAudit,
            });
          }

          const resultatContributeurs = IndexRechercheUtils.trouverResultat(
            audit.resultats,
            'gitlab.contributeurs',
          );
          for (const contributeur of resultatContributeurs?.contributeurs ?? []) {
            membres.push({
              projetId: projet.id,
              projetNom: projet.nom,
              groupeNom: groupe.nom,
              nature: 'contributeur',
              identifiant: contributeur.email,
              nom: contributeur.nom,
              dateAudit: audit.date,
              dansDernierAudit,
            });
          }

          const resultatMarqueurs = IndexRechercheUtils.trouverResultat(
            audit.resultats,
            'gitlab.marqueurs_ia',
          );
          for (const marqueur of resultatMarqueurs?.marqueurs ?? []) {
            outilsIa.push({
              projetId: projet.id,
              projetNom: projet.nom,
              groupeNom: groupe.nom,
              outil: marqueur.outil,
              chemin: marqueur.chemin,
              dateAudit: audit.date,
              dansDernierAudit,
            });
          }
        }
      }
    }

    return { dependances, membres, outilsIa, entites };
  }

  /** Borne inférieure (incluse) du bloc Unicode des marques diacritiques combinantes (U+0300). */
  private static readonly DEBUT_MARQUES_DIACRITIQUES = 0x0300;

  /** Borne supérieure (incluse) du bloc Unicode des marques diacritiques combinantes (U+036F). */
  private static readonly FIN_MARQUES_DIACRITIQUES = 0x036f;

  /**
   * Replie les accents d'une chaîne (décomposition Unicode NFD, qui sépare chaque lettre accentuée en une lettre de
   * base suivie d'une marque diacritique combinante, puis suppression de ces seules marques), pour que la
   * comparaison de termes de {@link rechercher} soit insensible aux accents (R10-18) en plus de la casse.
   * @param valeur - Chaîne à traiter.
   * @returns La chaîne sans accents.
   */
  private static replierAccents(valeur: string): string {
    return Array.from(valeur.normalize('NFD'))
      .filter((caractere) => {
        const codePoint = caractere.codePointAt(0) ?? 0;
        return (
          codePoint < IndexRechercheUtils.DEBUT_MARQUES_DIACRITIQUES ||
          codePoint > IndexRechercheUtils.FIN_MARQUES_DIACRITIQUES
        );
      })
      .join('');
  }

  /**
   * Normalise une chaîne pour comparaison : casse et accents repliés (R10-18).
   * @param valeur - Chaîne à normaliser.
   * @returns La chaîne normalisée.
   */
  private static normaliser(valeur: string): string {
    return IndexRechercheUtils.replierAccents(valeur.toLowerCase());
  }

  /**
   * Interroge l'index de recherche transversale par terme et options (US-021, F16). Comparaison insensible à la
   * casse et aux accents (R10-18), par inclusion simple.
   * @param index - Index construit par {@link construireIndex}.
   * @param terme - Terme recherché, saisi par l'utilisateur.
   * @param options - Options de recherche (extension à l'historique).
   * @returns Les résultats groupés par nature, plafonnés par nature.
   */
  public static rechercher(
    index: IndexRechercheTransversale,
    terme: string,
    options: OptionsRechercheTransversale,
  ): ResultatsRechercheTransversale {
    const termeNormalise = IndexRechercheUtils.normaliser(terme.trim());
    if (termeNormalise.length < IndexRechercheUtils.LONGUEUR_MINIMALE_TERME) {
      return IndexRechercheUtils.resultatsVides();
    }

    const dependances = IndexRechercheUtils.plafonner(
      index.dependances.filter(
        (occurrence) =>
          (options.inclureHistorique || occurrence.dansDernierAudit) &&
          IndexRechercheUtils.normaliser(occurrence.reference).includes(termeNormalise),
      ),
    );
    const membres = IndexRechercheUtils.plafonner(
      index.membres.filter(
        (occurrence) =>
          (options.inclureHistorique || occurrence.dansDernierAudit) &&
          (IndexRechercheUtils.normaliser(occurrence.identifiant).includes(termeNormalise) ||
            IndexRechercheUtils.normaliser(occurrence.nom).includes(termeNormalise)),
      ),
    );
    const outilsIa = IndexRechercheUtils.plafonner(
      index.outilsIa.filter(
        (occurrence) =>
          (options.inclureHistorique || occurrence.dansDernierAudit) &&
          IndexRechercheUtils.normaliser(occurrence.outil).includes(termeNormalise),
      ),
    );
    const entites = IndexRechercheUtils.plafonner(
      index.entites.filter((entite) =>
        IndexRechercheUtils.normaliser(entite.libelle).includes(termeNormalise),
      ),
    );

    return {
      dependances,
      membres,
      outilsIa,
      entites,
      aucunResultat:
        dependances.nombreTotal === 0 &&
        membres.nombreTotal === 0 &&
        outilsIa.nombreTotal === 0 &&
        entites.nombreTotal === 0,
    };
  }

  /**
   * Plafonne une liste d'occurrences filtrées à {@link NOMBRE_RESULTATS_MAX_PAR_NATURE}, en conservant le décompte
   * réel avant troncature.
   * @param occurrences - Occurrences filtrées d'une nature.
   * @returns Le groupe de résultats plafonné.
   */
  private static plafonner<TOccurrence>(
    occurrences: readonly TOccurrence[],
  ): GroupeResultatsRecherche<TOccurrence> {
    return {
      occurrences: occurrences.slice(0, IndexRechercheUtils.NOMBRE_RESULTATS_MAX_PAR_NATURE),
      nombreTotal: occurrences.length,
    };
  }

  /**
   * Construit un résultat vide (terme trop court, aucune recherche déclenchée). Distinct de {@link aucunResultat}
   * après recherche effective, cf. `SqmRechercheTransversaleComponent` pour la distinction d'affichage.
   * @returns Un résultat vide pour les quatre natures.
   */
  private static resultatsVides(): ResultatsRechercheTransversale {
    const groupeVide = { occurrences: [], nombreTotal: 0 };
    return {
      dependances: groupeVide,
      membres: groupeVide,
      outilsIa: groupeVide,
      entites: groupeVide,
      aucunResultat: false,
    };
  }
}
