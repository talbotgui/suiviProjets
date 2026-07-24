// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Rapport d'anomalies techniques d'une campagne (F08, RG-021, écran Brouillon, Phase 5 incrément 6) : résout les
// entrées brutes `{ indicateur, sourceId, anomalie }` collectées par `OrchestrateurCampagneService` (forme minimale
// décidée à l'incrément 4, cf. commentaire d'en-tête de `orchestrateur-campagne.service.ts`) en anomalies
// résolues (projet, instance), puis les regroupe par cause commune (F08 : « les anomalies de même cause sont
// regroupées », exemple « un token expiré sur 15 projets = une ligne racine »).
//
// Décision arbitraire (cf. rapport de développement de cette phase) : la cause commune retenue est la paire
// (catégorie typée, instance concernée) plutôt qu'un triplet incluant l'indicateur précis — un même credential
// expiré touchant 5 opérations GitLab distinctes pour un même projet reste ainsi une seule cause par instance,
// conforme à l'esprit de l'exemple F08, au prix de la perte du détail fin par indicateur (conservé néanmoins dans
// `AnomalieRegroupee.indicateurs`). Le message affiché pour un groupe est celui de la première anomalie rencontrée
// pour cette cause : les messages techniques de plusieurs appels en échec pour la même cause ne sont jamais
// strictement identiques (ex. horodatage embarqué), sans que cette variation apporte d'information utile au
// diagnostic une fois la catégorie et l'instance connues.
import { ErreurConnecteurUtils } from '../../sansetat/commandes/erreur-connecteur.utils';
import type { CategorieErreurConnecteur } from '../../sansetat/commandes/types-facade';
import type { Groupe } from '../etat/types-donnees';

/**
 * Anomalie technique résolue (projet et instance identifiés), avant regroupement (RG-021).
 */
export interface AnomalieResolue {
  /** Identifiant du projet concerné. */
  readonly projetId: string;
  /** Nom lisible du projet concerné. */
  readonly projetNom: string;
  /** Identifiant de la source concernée. */
  readonly sourceId: string;
  /** Identifiant de l'instance concernée, `undefined` si la source n'a pas pu être résolue. */
  readonly instanceId: string | undefined;
  /** Nom lisible de l'instance concernée. */
  readonly instanceNom: string;
  /** Tag `Resultat` ou opération concernée (ex. `gitlab.vitalite`). */
  readonly indicateur: string;
  /** Catégorie typée de l'anomalie (RG-021). */
  readonly categorie: CategorieErreurConnecteur;
  /** Message technique brut de l'anomalie. */
  readonly message: string;
}

/**
 * Groupe d'anomalies de même cause (F08 : « les anomalies de même cause sont regroupées »).
 */
export interface AnomalieRegroupee {
  /** Catégorie typée commune au groupe. */
  readonly categorie: CategorieErreurConnecteur;
  /** Libellé lisible de la catégorie (F08/F24). */
  readonly libelleCategorie: string;
  /** Action suggérée en langage clair (F08/F24). */
  readonly actionSuggeree: string;
  /** Instance commune au groupe, `undefined` si non résolue. */
  readonly instanceId: string | undefined;
  /** Nom lisible de l'instance commune au groupe. */
  readonly instanceNom: string;
  /** Message technique brut représentatif du groupe (première occurrence rencontrée). */
  readonly message: string;
  /** Indicateurs distincts concernés par ce groupe. */
  readonly indicateurs: readonly string[];
  /** Projets distincts concernés par ce groupe. */
  readonly projets: readonly { readonly projetId: string; readonly projetNom: string }[];
}

/**
 * Rapport d'anomalies techniques d'une campagne (UI, Phase 5 incrément 6) : classe utilitaire à membres statiques
 * uniquement, sur le modèle du gabarit `ExempleReferenceUtils`. Chaque méthode reste pure, sans effet de bord.
 */
export class RapportAnomaliesUtils {
  /**
   * Résout les entrées brutes d'anomalies d'un projet (`Verdict.anomalies`, typé `unknown[]`) en anomalies
   * résolues, sans accès non sûr à la valeur reçue.
   * @param projetId - Identifiant du projet concerné.
   * @param projetNom - Nom lisible du projet concerné.
   * @param anomaliesBrutes - Entrées brutes du `Verdict` du projet, absentes si aucune anomalie.
   * @param groupes - Groupes actuellement chargés, pour résoudre l'instance de chaque source.
   * @returns Les anomalies résolues, tableau vide si `anomaliesBrutes` est absent ou vide.
   */
  public static resoudreAnomaliesProjet(
    projetId: string,
    projetNom: string,
    anomaliesBrutes: readonly unknown[] | undefined,
    groupes: readonly Groupe[],
  ): readonly AnomalieResolue[] {
    if (anomaliesBrutes === undefined) {
      return [];
    }
    const resolues: AnomalieResolue[] = [];
    for (const brute of anomaliesBrutes) {
      const entree = this.extraireEntreeAnomalie(brute);
      if (entree === undefined) {
        continue;
      }
      const instance = this.resoudreInstanceDeSource(entree.sourceId, groupes);
      resolues.push({
        projetId,
        projetNom,
        sourceId: entree.sourceId,
        instanceId: instance?.id,
        instanceNom: instance?.nom ?? 'Instance inconnue',
        indicateur: entree.indicateur,
        categorie: entree.categorie,
        message: entree.message,
      });
    }
    return resolues;
  }

  /**
   * Regroupe des anomalies résolues par cause commune (catégorie + instance, cf. commentaire d'en-tête).
   * @param anomalies - Anomalies résolues de l'ensemble des projets d'une campagne.
   * @returns Les groupes d'anomalies, triés par nombre décroissant de projets concernés.
   */
  public static regrouper(anomalies: readonly AnomalieResolue[]): readonly AnomalieRegroupee[] {
    const groupesParCle = new Map<string, AnomalieResolue[]>();
    for (const anomalie of anomalies) {
      const cle = `${anomalie.categorie}|${anomalie.instanceId ?? anomalie.sourceId}`;
      const groupe = groupesParCle.get(cle);
      if (groupe === undefined) {
        groupesParCle.set(cle, [anomalie]);
      } else {
        groupe.push(anomalie);
      }
    }

    const groupes: AnomalieRegroupee[] = Array.from(groupesParCle.values()).map((membres) => {
      const premiere = membres[0];
      const indicateurs = Array.from(new Set(membres.map((membre) => membre.indicateur)));
      const projetsParId = new Map(
        membres.map((membre) => [membre.projetId, membre.projetNom] as const),
      );
      return {
        categorie: premiere.categorie,
        libelleCategorie: ErreurConnecteurUtils.libelleCategorie(premiere.categorie),
        actionSuggeree: ErreurConnecteurUtils.actionSuggeree(premiere.categorie),
        instanceId: premiere.instanceId,
        instanceNom: premiere.instanceNom,
        message: premiere.message,
        indicateurs,
        projets: Array.from(projetsParId, ([projetId, projetNom]) => ({ projetId, projetNom })),
      };
    });

    return groupes.sort((a, b) => b.projets.length - a.projets.length);
  }

  /**
   * Résout l'instance d'une source à partir de son identifiant, en parcourant les groupes et projets chargés.
   * @param sourceId - Identifiant de la source à résoudre.
   * @param groupes - Groupes actuellement chargés.
   * @returns L'instance trouvée, `undefined` si la source n'est plus résolvable (projet ou source supprimé).
   */
  private static resoudreInstanceDeSource(
    sourceId: string,
    groupes: readonly Groupe[],
  ): { readonly id: string; readonly nom: string } | undefined {
    for (const groupe of groupes) {
      for (const projet of groupe.projets) {
        const source = projet.sources.find((candidate) => candidate.id === sourceId);
        if (source === undefined) {
          continue;
        }
        const instance = groupe.instances.find((candidate) => candidate.id === source.instanceId);
        return instance === undefined ? undefined : { id: instance.id, nom: instance.nom };
      }
    }
    return undefined;
  }

  /**
   * Extrait, sans accès non sûr à la valeur reçue, les champs d'une entrée brute d'anomalie
   * (`{ indicateur, sourceId, anomalie: { type, message } }`, forme minimale décidée à l'incrément 4).
   * @param valeur - Entrée brute de `Verdict.anomalies`, de type `unknown`.
   * @returns Les champs extraits, `undefined` si `valeur` ne correspond pas à la forme attendue.
   */
  private static extraireEntreeAnomalie(valeur: unknown):
    | {
        readonly indicateur: string;
        readonly sourceId: string;
        readonly categorie: CategorieErreurConnecteur;
        readonly message: string;
      }
    | undefined {
    if (typeof valeur !== 'object' || valeur === null) {
      return undefined;
    }
    if (!('indicateur' in valeur) || !('sourceId' in valeur) || !('anomalie' in valeur)) {
      return undefined;
    }
    const { indicateur, sourceId, anomalie } = valeur;
    if (typeof indicateur !== 'string' || typeof sourceId !== 'string') {
      return undefined;
    }
    if (typeof anomalie !== 'object' || anomalie === null) {
      return undefined;
    }
    if (!('type' in anomalie) || !('message' in anomalie)) {
      return undefined;
    }
    const { type: categorie, message } = anomalie;
    if (typeof message !== 'string') {
      return undefined;
    }
    const categorieConnue = this.resoudreCategorieConnue(categorie);
    if (categorieConnue === undefined) {
      return undefined;
    }
    return { indicateur, sourceId, categorie: categorieConnue, message };
  }

  /**
   * Résout une valeur `unknown` vers une catégorie connue de `CategorieErreurConnecteur`, sans assertion `as` non
   * justifiée, sur le modèle de `DonneesApplicationService.anomalieAdministration`.
   * @param valeur - Valeur à résoudre (`ErreurConnecteur.type` côté frontière IPC, non garanti à la compilation).
   * @returns La catégorie connue correspondante, `undefined` si `valeur` n'en est aucune.
   */
  private static resoudreCategorieConnue(valeur: unknown): CategorieErreurConnecteur | undefined {
    const categories: readonly CategorieErreurConnecteur[] = [
      'authentificationRefusee',
      'refIntrouvable',
      'instanceInjoignable',
      'delaiDepasse',
      'reponseInattendue',
      'droitsInsuffisants',
      'credentialAbsent',
    ];
    return categories.find((candidate) => candidate === valeur);
  }
}
