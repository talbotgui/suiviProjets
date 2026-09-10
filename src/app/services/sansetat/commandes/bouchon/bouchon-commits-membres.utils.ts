// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Jeu de démonstration déterministe et rejouable de l'écran « Commits des membres » (US-060, RG-060, plan_17
// chapitre 4), servi hors contexte Tauri (`ng serve`, test manuel et test de bout en bout Playwright) via
// `BouchonCommandesUtils`, qui délègue à cette classe les deux commandes `preparer_analyse_commits_membres` et
// `lister_evenements_poussees_membre`.
//
// Quatre développeurs synthétiques et trois dépôts. Les horodatages de poussée sont **calculés par décalage fixe
// depuis `Date.now()`** au moment de l'appel (jamais aléatoires) : l'ordre des lignes du tableau et l'état des
// alertes sont donc stables d'une exécution à l'autre. Un développeur « silencieux » (dernière poussée il y a une
// dizaine de jours ouvrés) apparaît en alerte et devant le développeur « régulier » au tri par score de risque.
import type {
  EvenementPoussee,
  MembreGroupeGitlab,
  PreparationAnalyseCommitsMembres,
  ProjetGroupeGitlab,
} from '../types-facade';

/** Millisecondes par heure. */
const MS_PAR_HEURE = 60 * 60 * 1000;

/** Millisecondes par jour, pour le calcul des décalages depuis `Date.now()`. */
const MS_PAR_JOUR = 24 * MS_PAR_HEURE;

/**
 * Jeu de démonstration des deux commandes de `FacadeCommitsMembresService` (US-060, RG-060), auxquelles
 * `BouchonCommandesUtils` délègue. Classe à membres statiques uniquement, sur le modèle de `BouchonAlertesUtils` /
 * `BouchonParametrageUtils`.
 */
export class BouchonCommitsMembresUtils {
  /** Dépôts synthétiques du groupe analysé. */
  private static readonly PROJETS: readonly ProjetGroupeGitlab[] = [
    { id: 5001, chemin: 'demonstration/api-commandes' },
    { id: 5002, chemin: 'demonstration/portail-web' },
    { id: 5003, chemin: 'demonstration/batch-nuit' },
  ];

  /** Roster synthétique du groupe analysé (quatre profils distincts). */
  private static readonly MEMBRES: readonly MembreGroupeGitlab[] = [
    {
      id: 9001,
      username: 'dana.regulier',
      nom: 'Dana Régulier',
      courriel: 'dana@demonstration.example',
    },
    {
      id: 9002,
      username: 'sam.silencieux',
      nom: 'Sam Silencieux',
      courriel: 'sam@demonstration.example',
    },
    {
      id: 9003,
      username: 'nadia.dusoir',
      nom: 'Nadia Du Soir',
      courriel: 'nadia@demonstration.example',
    },
    {
      id: 9004,
      username: 'igor.irregulier',
      nom: 'Igor Irrégulier',
      courriel: 'igor@partenaire.example',
    },
  ];

  /**
   * Passe de préparation : le roster et les dépôts synthétiques, servis quel que soit le groupe demandé.
   * @returns Le roster et les dépôts.
   */
  public static preparerAnalyse(): PreparationAnalyseCommitsMembres {
    return {
      membres: BouchonCommitsMembresUtils.MEMBRES,
      projets: BouchonCommitsMembresUtils.PROJETS,
    };
  }

  /**
   * Événements de poussée d'un membre, selon son profil (déterministe, sans aléa).
   * @param parametres - Paramètres transmis par la Façade à `invoke` (`utilisateurId` lu ici).
   * @returns Les événements du membre, ou une liste vide si `utilisateurId` est absent ou inconnu.
   */
  public static listerEvenementsPoussees(
    parametres: Readonly<Record<string, unknown>>,
  ): readonly EvenementPoussee[] {
    const utilisateurId = parametres['utilisateurId'];
    return BouchonCommitsMembresUtils.evenementsPour(
      typeof utilisateurId === 'number' ? utilisateurId : 0,
    );
  }

  /**
   * Horodatage ISO calculé à `joursAvant` jours et `heureUtc` heures avant/à partir de maintenant.
   * @param joursAvant - Nombre de jours à retrancher à `Date.now()`.
   * @param heureUtc - Heure UTC à imposer sur ce jour (0–23).
   * @returns L'horodatage ISO `Z`.
   */
  private static horodatage(joursAvant: number, heureUtc: number): string {
    const date = new Date(Date.now() - joursAvant * MS_PAR_JOUR);
    date.setUTCHours(heureUtc, 0, 0, 0);
    // Imposer une heure précise peut projeter la poussée du jour même dans le futur (appel avant `heureUtc`) : on
    // la ramène alors à la veille **moins une heure**, pour rester une poussée réellement passée sans jamais
    // coïncider avec la poussée `joursAvant + 1` du même profil (qui reste à `heureUtc:00` la veille).
    if (date.getTime() > Date.now()) {
      date.setTime(date.getTime() - MS_PAR_JOUR - MS_PAR_HEURE);
    }
    return date.toISOString();
  }

  /**
   * Construit un événement de poussée synthétique.
   * @param joursAvant - Ancienneté de la poussée en jours.
   * @param heureUtc - Heure UTC de la poussée.
   * @param projetId - Dépôt poussé.
   * @param nombreCommits - Nombre de commits de la poussée.
   * @returns L'événement.
   */
  private static poussee(
    joursAvant: number,
    heureUtc: number,
    projetId: number,
    nombreCommits: number,
  ): EvenementPoussee {
    return {
      horodatage: BouchonCommitsMembresUtils.horodatage(joursAvant, heureUtc),
      projetId,
      refPoussee: 'refs/heads/main',
      nombreCommits,
    };
  }

  /**
   * Liste d'événements de poussée d'un membre, selon son profil (déterministe, sans aléa).
   * @param utilisateurId - Identifiant numérique du membre.
   * @returns Les événements, du plus récent au plus ancien (comme `sort=desc` côté cœur natif).
   */
  private static evenementsPour(utilisateurId: number): readonly EvenementPoussee[] {
    switch (utilisateurId) {
      case 9001: {
        // Régulier : une poussée par jour ouvré sur trois semaines, en milieu de journée.
        const evenements: EvenementPoussee[] = [];
        for (let jour = 0; jour <= 21; jour += 1) {
          const jourSemaine = new Date(Date.now() - jour * MS_PAR_JOUR).getUTCDay();
          if (jourSemaine !== 0 && jourSemaine !== 6) {
            evenements.push(BouchonCommitsMembresUtils.poussee(jour, 13, 5001, 2));
          }
        }
        return evenements;
      }
      case 9002:
        // Silencieux : dernière poussée il y a ~14 jours calendaires (≈ 10 jours ouvrés), puis plus rien.
        return [
          BouchonCommitsMembresUtils.poussee(14, 10, 5002, 1),
          BouchonCommitsMembresUtils.poussee(17, 9, 5002, 3),
          BouchonCommitsMembresUtils.poussee(21, 11, 5002, 2),
        ];
      case 9003: {
        // Du soir : poussées tous les deux jours, en soirée (20 h UTC ≈ 21–22 h à Paris).
        const evenements: EvenementPoussee[] = [];
        for (let jour = 1; jour <= 20; jour += 2) {
          evenements.push(BouchonCommitsMembresUtils.poussee(jour, 20, 5001, 3));
        }
        return evenements;
      }
      case 9004:
        // Irrégulier : une rafale il y a ~12 jours, puis un sursaut récent.
        return [
          BouchonCommitsMembresUtils.poussee(2, 15, 5003, 1),
          BouchonCommitsMembresUtils.poussee(12, 9, 5003, 4),
          BouchonCommitsMembresUtils.poussee(12, 10, 5003, 2),
          BouchonCommitsMembresUtils.poussee(12, 11, 5003, 3),
          BouchonCommitsMembresUtils.poussee(13, 16, 5003, 5),
          BouchonCommitsMembresUtils.poussee(14, 17, 5003, 1),
        ];
      default:
        return [];
    }
  }
}
