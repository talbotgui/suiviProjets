// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Jeu de démonstration déterministe et rejouable de l'écran « Commits des membres » (US-060, RG-060, plan_17
// chapitre 4, amendé par plan_21 le 2026-09-16), servi hors contexte Tauri (`ng serve`, test manuel et test de
// bout en bout Playwright) via `BouchonCommandesUtils`, qui délègue à cette classe les deux commandes
// `interroger_membre_gitlab_par_username` et `lister_evenements_poussees_membre`.
//
// Depuis plan_21, l'analyse ne porte plus sur un roster de groupe GitLab distant mais sur les membres connus
// `interne`/`username` actifs du groupe applicatif sélectionné : les trois profils synthétiques ci-dessous
// reprennent donc les noms d'utilisateur **réels** des membres connus `interne`/`username` du jeu de démonstration
// principal (`donnees-racine-bouchon.ts`) — `mdurand` et `jpetit` du groupe « Socle Comptable », `smartin` du
// groupe « Portail Nova » — plutôt que des identités inventées sans rapport avec ce jeu de données, pour qu'une
// analyse lancée depuis `npm start` sur l'un de ces deux groupes reste démonstrative. Les horodatages de poussée
// sont **calculés par décalage fixe depuis `Date.now()`** au moment de l'appel (jamais aléatoires) : l'ordre des
// lignes du tableau et l'état des alertes sont donc stables d'une exécution à l'autre. Un développeur « silencieux »
// (dernière poussée il y a une dizaine de jours ouvrés) apparaît en alerte et devant le développeur « régulier » au
// tri par score de risque.
import type { EvenementPoussee, MembreGroupeGitlab } from '../types-facade';

/** Millisecondes par heure. */
const MS_PAR_HEURE = 60 * 60 * 1000;

/** Millisecondes par jour, pour le calcul des décalages depuis `Date.now()`. */
const MS_PAR_JOUR = 24 * MS_PAR_HEURE;

/**
 * Jeu de démonstration des deux commandes de `FacadeCommitsMembresService` (US-060, RG-060, plan_21), auxquelles
 * `BouchonCommandesUtils` délègue. Classe à membres statiques uniquement, sur le modèle de `BouchonAlertesUtils` /
 * `BouchonParametrageUtils`.
 */
export class BouchonCommitsMembresUtils {
  /**
   * Comptes GitLab synthétiques, indexés par nom d'utilisateur exact (comme le ferait `GET /users?username=`) —
   * trois profils reprenant les membres connus `interne`/`username` réels du jeu de démonstration principal.
   */
  private static readonly MEMBRES_PAR_USERNAME: ReadonlyMap<string, MembreGroupeGitlab> = new Map([
    [
      'mdurand',
      {
        id: 9001,
        username: 'mdurand',
        nom: 'Marie Durand',
        courriel: 'marie.durand@entreprise.fr',
      },
    ],
    [
      'jpetit',
      { id: 9002, username: 'jpetit', nom: 'Julien Petit', courriel: 'julien.petit@entreprise.fr' },
    ],
    [
      'smartin',
      {
        id: 9003,
        username: 'smartin',
        nom: 'Sofia Martin',
        courriel: 'sofia.martin@entreprise.fr',
      },
    ],
  ]);

  /**
   * Recherche un compte GitLab par nom d'utilisateur exact (US-060, RG-060, plan_21), sur le modèle de
   * `GET /users?username=<exact>`. `null` si `username` ne correspond à aucun des profils synthétiques (cas
   * démonstratif du membre connu sans compte GitLab actif correspondant).
   * @param parametres - Paramètres transmis par la Façade à `invoke` (`username` lu ici).
   * @returns Le compte correspondant, ou `null`.
   */
  public static rechercherMembreParUsername(
    parametres: Readonly<Record<string, unknown>>,
  ): MembreGroupeGitlab | null {
    const username = parametres['username'];
    if (typeof username !== 'string') {
      return null;
    }
    return BouchonCommitsMembresUtils.MEMBRES_PAR_USERNAME.get(username) ?? null;
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
   * @param projetId - Dépôt poussé (identifiant externe GitLab d'une source réelle du jeu de démonstration
   * principal, pour qu'un nom de dépôt lisible se résolve).
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
        // mdurand, régulier : une poussée par jour ouvré sur trois semaines, en milieu de journée, sur le dépôt
        // « API Facturation » (idExterne 1234, groupe Socle Comptable).
        const evenements: EvenementPoussee[] = [];
        for (let jour = 0; jour <= 21; jour += 1) {
          const jourSemaine = new Date(Date.now() - jour * MS_PAR_JOUR).getUTCDay();
          if (jourSemaine !== 0 && jourSemaine !== 6) {
            evenements.push(BouchonCommitsMembresUtils.poussee(jour, 13, 1234, 2));
          }
        }
        return evenements;
      }
      case 9002:
        // jpetit, silencieux : dernière poussée il y a ~14 jours calendaires (≈ 10 jours ouvrés), puis plus rien,
        // sur le dépôt « Batch Comptable » (idExterne 1567, groupe Socle Comptable).
        return [
          BouchonCommitsMembresUtils.poussee(14, 10, 1567, 1),
          BouchonCommitsMembresUtils.poussee(17, 9, 1567, 3),
          BouchonCommitsMembresUtils.poussee(21, 11, 1567, 2),
        ];
      case 9003: {
        // smartin, du soir : poussées tous les deux jours, en soirée (20 h UTC ≈ 21–22 h à Paris), sur le dépôt
        // « Front Portail » (idExterne 88, groupe Portail Nova).
        const evenements: EvenementPoussee[] = [];
        for (let jour = 1; jour <= 20; jour += 2) {
          evenements.push(BouchonCommitsMembresUtils.poussee(jour, 20, 88, 3));
        }
        return evenements;
      }
      default:
        return [];
    }
  }
}
