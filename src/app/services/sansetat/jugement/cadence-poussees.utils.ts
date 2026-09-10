// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Moteur de jugement de l'écran « Commits des membres » (US-060, RG-060, plan_17 chapitre 4) : fonction pure,
// sans effet de bord ni accès disque/réseau, calculant les indicateurs de régularité de poussée d'un développeur
// à partir de l'activité brute déjà récupérée, des seuils courants et de l'instant de référence. Elle est
// réévaluée par le Store d'orchestration à chaque changement de seuil, sans nouvel appel réseau.
//
// Priorité de couverture unitaire (seuil 90 %, cf. docs/02_documentation/16_normesTests.md).
import type { EvenementPoussee } from '../commandes/types-facade';
import { StatutMembreUtils } from './statut-membre.utils';
import type { RegleMembreConnu } from './statut-membre.utils';

/** Millisecondes par heure, pour convertir les écarts d'horodatage. */
const MS_PAR_HEURE = 60 * 60 * 1000;

/** Millisecondes par jour. */
const MS_PAR_JOUR = 24 * MS_PAR_HEURE;

/**
 * Seuil de part des poussées en soirée au-delà duquel l'alerte `soiree` est levée. **Décision arbitraire** (cf.
 * rapport de développement) : 40 % des poussées d'un développeur faites en soirée sur la fenêtre.
 */
const SEUIL_ALERTE_SOIREE = 0.4;

/**
 * Dix seuils de calcul, miroir structurel de `parametres.cadenceCommits` (types-donnees.ts) — repris ici sous une
 * forme locale au Moteur de jugement pour ne pas importer depuis `services/avecetat/`.
 */
export interface SeuilsCadencePoussees {
  readonly fenetreJours: number;
  readonly seuilJoursOuvresSansPoussee: number;
  readonly multiplicateurEcartCadence: number;
  readonly ponderationInactivite: number;
  readonly ponderationEcartCadence: number;
  readonly ponderationSoiree: number;
  readonly heureDebutSoiree: number;
  readonly heureFinSoiree: number;
  readonly fuseauHoraire: string;
  readonly comptesExclus: readonly string[];
}

/** Statut de rattachement d'un développeur, issu de `StatutMembreUtils` (RG-006 à RG-010). */
export type StatutDeveloppeur = 'interne' | 'client' | 'partenaire' | 'inconnu';

/** Alertes possibles sur une ligne du tableau (RG-060). */
export type AlerteCadence = 'inactivite' | 'ecartCadence' | 'soiree';

/** Membre du roster et son activité brute sur la fenêtre, entrée de {@link CadencePousseesUtils.analyser}. */
export interface ActivitePousseesDeveloppeur {
  /** Identité GitLab du membre. */
  readonly membre: {
    readonly id: number;
    readonly username: string;
    readonly nom: string;
    readonly courriel: string | null;
  };
  /** Événements de poussée récupérés pour ce membre (ordre indifférent). */
  readonly evenements: readonly EvenementPoussee[];
}

/** Une ligne du tableau « Commits des membres » (RG-060). */
export interface LigneCadencePoussees {
  readonly username: string;
  readonly nom: string;
  readonly statut: StatutDeveloppeur;
  /** Horodatage ISO de la dernière poussée sur la fenêtre, `null` si aucune. */
  readonly dernierePousseeIso: string | null;
  /** Chemin (ou identifiant à défaut) du dépôt de la dernière poussée, `null` si aucune. */
  readonly depotDernierePoussee: string | null;
  /** Nombre de jours ouvrés (lundi-vendredi, jours fériés ignorés) écoulés depuis la dernière poussée, `null` si aucune. */
  readonly joursOuvresDepuisDernierePoussee: number | null;
  /** Nombre de poussées sur la fenêtre. */
  readonly nombrePoussees: number;
  /** Nombre de commits transportés sur la fenêtre. */
  readonly nombreCommits: number;
  /** Médiane, en heures, des écarts entre poussées consécutives ; `null` si moins de deux poussées. */
  readonly cadenceMedianeHeures: number | null;
  /** Ratio « heures depuis la dernière poussée / cadence médiane » ; `null` si non calculable. */
  readonly ecartCadence: number | null;
  /** Part des poussées faites dans la plage de soirée (0 à 1) ; `null` si aucune poussée. */
  readonly partSoiree: number | null;
  /** Score de risque composite (0 à 1). */
  readonly scoreRisque: number;
  /** Alertes levées pour cette ligne. */
  readonly alertes: readonly AlerteCadence[];
  /** `true` si le développeur a strictement moins de deux poussées sur la fenêtre. */
  readonly donneesInsuffisantes: boolean;
}

/**
 * Calcul pur des indicateurs de régularité de poussée d'un groupe (US-060, RG-060). Classe à membres statiques
 * uniquement (règle « aucune fonction hors classe »).
 */
export class CadencePousseesUtils {
  /**
   * Produit une ligne par développeur non exclu, filtrée à la fenêtre glissante, triée par score de risque
   * décroissant (départage stable par `username` croissant).
   * @param activite - Activité brute par développeur du roster.
   * @param seuils - Seuils de calcul courants.
   * @param cheminsDepotsParId - Correspondance identifiant de dépôt GitLab -> chemin lisible.
   * @param reglesMembresConnus - Règles de membre connu du groupe, projetées sur {@link StatutDeveloppeur}.
   * @param maintenantIso - Instant de référence (horodatage ISO de l'analyse).
   * @returns Les lignes du tableau, triées.
   */
  public static analyser(
    activite: readonly ActivitePousseesDeveloppeur[],
    seuils: SeuilsCadencePoussees,
    cheminsDepotsParId: ReadonlyMap<number, string>,
    reglesMembresConnus: readonly RegleMembreConnu<StatutDeveloppeur>[],
    maintenantIso: string,
  ): readonly LigneCadencePoussees[] {
    const maintenant = Date.parse(maintenantIso);
    const debutFenetre = maintenant - seuils.fenetreJours * MS_PAR_JOUR;
    // Comparaison insensible à la casse : un identifiant de connexion GitLab a une forme canonique, mais l'exclure
    // ne doit pas dépendre de la casse exacte saisie dans les réglages (RG-060).
    const comptesExclus = new Set(seuils.comptesExclus.map((compte) => compte.toLowerCase()));

    const lignes = activite
      .filter((entree) => !comptesExclus.has(entree.membre.username.toLowerCase()))
      .map((entree) =>
        CadencePousseesUtils.construireLigne(
          entree,
          seuils,
          cheminsDepotsParId,
          reglesMembresConnus,
          maintenant,
          debutFenetre,
        ),
      );

    return [...lignes].sort(
      (a, b) => b.scoreRisque - a.scoreRisque || a.username.localeCompare(b.username),
    );
  }

  /**
   * Construit une ligne pour un développeur.
   * @param entree - Activité brute du développeur.
   * @param seuils - Seuils courants.
   * @param cheminsDepotsParId - Correspondance identifiant -> chemin de dépôt.
   * @param reglesMembresConnus - Règles de membre connu du groupe.
   * @param maintenant - Instant de référence (ms).
   * @param debutFenetre - Borne basse de la fenêtre (ms).
   * @returns La ligne calculée.
   */
  private static construireLigne(
    entree: ActivitePousseesDeveloppeur,
    seuils: SeuilsCadencePoussees,
    cheminsDepotsParId: ReadonlyMap<number, string>,
    reglesMembresConnus: readonly RegleMembreConnu<StatutDeveloppeur>[],
    maintenant: number,
    debutFenetre: number,
  ): LigneCadencePoussees {
    const evenements = entree.evenements
      .filter((evenement) => {
        const instant = Date.parse(evenement.horodatage);
        return instant >= debutFenetre && instant <= maintenant;
      })
      .slice()
      .sort((a, b) => Date.parse(a.horodatage) - Date.parse(b.horodatage));

    const statut = CadencePousseesUtils.resoudreStatut(entree.membre, reglesMembresConnus);
    const nombrePoussees = evenements.length;
    const nombreCommits = evenements.reduce(
      (total, evenement) => total + evenement.nombreCommits,
      0,
    );

    if (nombrePoussees === 0) {
      return {
        username: entree.membre.username,
        nom: entree.membre.nom,
        statut,
        dernierePousseeIso: null,
        depotDernierePoussee: null,
        joursOuvresDepuisDernierePoussee: null,
        nombrePoussees: 0,
        nombreCommits: 0,
        cadenceMedianeHeures: null,
        ecartCadence: null,
        partSoiree: null,
        scoreRisque: 0,
        alertes: [],
        donneesInsuffisantes: true,
      };
    }

    const derniere = evenements[evenements.length - 1];
    const dernierePousseeIso = derniere.horodatage;
    const depotDernierePoussee =
      cheminsDepotsParId.get(derniere.projetId) ?? String(derniere.projetId);
    const heuresDepuis = Math.max(0, (maintenant - Date.parse(dernierePousseeIso)) / MS_PAR_HEURE);
    const joursOuvresDepuis = CadencePousseesUtils.joursOuvresEntre(
      dernierePousseeIso,
      new Date(maintenant).toISOString(),
      seuils.fuseauHoraire,
    );
    const partSoiree = CadencePousseesUtils.partCreneauSoiree(evenements, seuils);
    const donneesInsuffisantes = nombrePoussees < 2;

    const horodatagesTries = evenements.map((evenement) => Date.parse(evenement.horodatage));
    const cadenceMedianeHeures = donneesInsuffisantes
      ? null
      : CadencePousseesUtils.medianeIntervallesHeures(horodatagesTries);
    const ecartCadence =
      cadenceMedianeHeures !== null && cadenceMedianeHeures > 0
        ? heuresDepuis / cadenceMedianeHeures
        : null;

    const signalInactivite = Math.min(
      1,
      joursOuvresDepuis / Math.max(1, seuils.seuilJoursOuvresSansPoussee),
    );
    const signalEcart =
      cadenceMedianeHeures !== null && cadenceMedianeHeures > 0
        ? Math.min(
            1,
            heuresDepuis / cadenceMedianeHeures / Math.max(1, seuils.multiplicateurEcartCadence),
          )
        : null;
    const signalSoiree = partSoiree;

    const scoreRisque = CadencePousseesUtils.scoreComposite([
      { valeur: signalInactivite, poids: seuils.ponderationInactivite },
      { valeur: signalEcart, poids: seuils.ponderationEcartCadence },
      { valeur: signalSoiree, poids: seuils.ponderationSoiree },
    ]);

    const alertes: AlerteCadence[] = [];
    if (joursOuvresDepuis >= seuils.seuilJoursOuvresSansPoussee) {
      alertes.push('inactivite');
    }
    if (
      cadenceMedianeHeures !== null &&
      cadenceMedianeHeures > 0 &&
      heuresDepuis / cadenceMedianeHeures > seuils.multiplicateurEcartCadence
    ) {
      alertes.push('ecartCadence');
    }
    if (partSoiree > SEUIL_ALERTE_SOIREE) {
      alertes.push('soiree');
    }

    return {
      username: entree.membre.username,
      nom: entree.membre.nom,
      statut,
      dernierePousseeIso,
      depotDernierePoussee,
      joursOuvresDepuisDernierePoussee: joursOuvresDepuis,
      nombrePoussees,
      nombreCommits,
      cadenceMedianeHeures,
      ecartCadence,
      partSoiree,
      scoreRisque,
      alertes,
      donneesInsuffisantes,
    };
  }

  /**
   * Résout le statut d'un développeur contre les règles de membre connu (RG-006 à RG-010). Une issue `conflit` est
   * ramenée à `inconnu` (RG-008) ; les règles `email` / `domaineEmail` ne sont résolues que si le courriel est
   * connu (jeton d'administration).
   * @param membre - Identité GitLab du développeur.
   * @param regles - Règles de membre connu du groupe.
   * @returns Le statut de rattachement.
   */
  private static resoudreStatut(
    membre: ActivitePousseesDeveloppeur['membre'],
    regles: readonly RegleMembreConnu<StatutDeveloppeur>[],
  ): StatutDeveloppeur {
    const resolution = StatutMembreUtils.calculerStatutMembre<StatutDeveloppeur>(
      { username: membre.username, email: membre.courriel ?? undefined },
      regles,
    );
    return resolution.type === 'connu' ? resolution.statut : 'inconnu';
  }

  /**
   * Nombre de jours ouvrés (lundi-vendredi, jours fériés ignorés) écoulés entre deux instants, dans le fuseau
   * indiqué : demi-ouvert `(jour(depuis) ; jour(jusqua)]` — même jour → 0, vendredi → lundi → 1 (RG-060,
   * décision fonctionnelle n° 10 : aucun calendrier national codé).
   * @param depuisIso - Horodatage ISO de départ.
   * @param jusquaIso - Horodatage ISO d'arrivée.
   * @param fuseauHoraire - Fuseau IANA (repli sur `'UTC'` si invalide).
   * @returns Le nombre de jours ouvrés, jamais négatif.
   */
  private static joursOuvresEntre(
    depuisIso: string,
    jusquaIso: string,
    fuseauHoraire: string,
  ): number {
    const depuis = CadencePousseesUtils.ancreDeJour(depuisIso, fuseauHoraire);
    const jusqua = CadencePousseesUtils.ancreDeJour(jusquaIso, fuseauHoraire);
    if (jusqua <= depuis) {
      return 0;
    }
    let compte = 0;
    for (let jour = depuis + MS_PAR_JOUR; jour <= jusqua; jour += MS_PAR_JOUR) {
      const jourSemaine = new Date(jour).getUTCDay();
      if (jourSemaine >= 1 && jourSemaine <= 5) {
        compte += 1;
      }
    }
    return compte;
  }

  /**
   * Ancre de jour (minuit UTC de la date locale) d'un horodatage dans le fuseau indiqué, pour l'arithmétique de
   * jours de {@link joursOuvresEntre}.
   * @param iso - Horodatage ISO.
   * @param fuseauHoraire - Fuseau IANA (repli sur `'UTC'` si invalide).
   * @returns Le nombre de millisecondes de `Date.UTC(annee, mois, jour)` de la date locale.
   */
  private static ancreDeJour(iso: string, fuseauHoraire: string): number {
    const formateur = CadencePousseesUtils.formateurDate(fuseauHoraire);
    const parties = formateur.formatToParts(new Date(iso));
    const valeur = (type: string): number =>
      Number(parties.find((partie) => partie.type === type)?.value ?? '0');
    return Date.UTC(valeur('year'), valeur('month') - 1, valeur('day'));
  }

  /**
   * Construit un formateur de date `en-CA` dans le fuseau indiqué, avec repli sur `'UTC'` si le fuseau est invalide
   * (RangeError malgré la validation amont).
   * @param fuseauHoraire - Fuseau IANA demandé.
   * @returns Le formateur.
   */
  private static formateurDate(fuseauHoraire: string): Intl.DateTimeFormat {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: fuseauHoraire,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    }
  }

  /**
   * Médiane des écarts, en heures, entre poussées consécutives.
   * @param horodatagesTriesMs - Horodatages triés en ordre croissant (ms), au moins deux.
   * @returns La médiane des intervalles en heures.
   */
  private static medianeIntervallesHeures(horodatagesTriesMs: readonly number[]): number {
    const intervalles: number[] = [];
    for (let index = 1; index < horodatagesTriesMs.length; index += 1) {
      intervalles.push((horodatagesTriesMs[index] - horodatagesTriesMs[index - 1]) / MS_PAR_HEURE);
    }
    intervalles.sort((a, b) => a - b);
    const milieu = Math.floor(intervalles.length / 2);
    return intervalles.length % 2 === 0
      ? (intervalles[milieu - 1] + intervalles[milieu]) / 2
      : intervalles[milieu];
  }

  /**
   * Part des poussées faites dans la plage de soirée (heure locale dans le fuseau paramétré), avec repli circulaire
   * quand `heureDebutSoiree > heureFinSoiree` et repli sur `'UTC'` si le fuseau est invalide.
   * @param evenements - Événements de poussée du développeur (au moins un).
   * @param seuils - Seuils courants (`heureDebutSoiree`, `heureFinSoiree`, `fuseauHoraire`).
   * @returns La part, entre 0 et 1.
   */
  private static partCreneauSoiree(
    evenements: readonly EvenementPoussee[],
    seuils: SeuilsCadencePoussees,
  ): number {
    const formateur = CadencePousseesUtils.formateurHeure(seuils.fuseauHoraire);
    const dansLaPlage = (heure: number): boolean =>
      seuils.heureDebutSoiree <= seuils.heureFinSoiree
        ? heure >= seuils.heureDebutSoiree && heure < seuils.heureFinSoiree
        : heure >= seuils.heureDebutSoiree || heure < seuils.heureFinSoiree;

    const enSoiree = evenements.filter((evenement) => {
      const parties = formateur.formatToParts(new Date(evenement.horodatage));
      const heureTexte = parties.find((partie) => partie.type === 'hour')?.value ?? '0';
      // `en-GB` avec `hour12: false` peut rendre minuit en `'24'` : normalisé à `0`.
      return dansLaPlage(Number(heureTexte) % 24);
    }).length;
    return enSoiree / evenements.length;
  }

  /**
   * Construit un formateur d'heure (0–23) `en-GB` dans le fuseau indiqué, avec repli sur `'UTC'` si le fuseau est
   * invalide.
   * @param fuseauHoraire - Fuseau IANA demandé.
   * @returns Le formateur.
   */
  private static formateurHeure(fuseauHoraire: string): Intl.DateTimeFormat {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: fuseauHoraire,
        hour: '2-digit',
        hour12: false,
      });
    } catch {
      return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', hour12: false });
    }
  }

  /**
   * Moyenne pondérée normalisée de signaux bornés dans `[0 ; 1]` : un signal `null` (non calculable) est retiré, son
   * poids exclu de la normalisation ; si aucun signal n'est calculable, le score vaut 0.
   * @param signaux - Signaux et leurs poids.
   * @returns Le score composite, entre 0 et 1.
   */
  private static scoreComposite(
    signaux: readonly { readonly valeur: number | null; readonly poids: number }[],
  ): number {
    let sommePonderee = 0;
    let sommePoids = 0;
    for (const signal of signaux) {
      if (signal.valeur !== null && signal.poids > 0) {
        sommePonderee += signal.valeur * signal.poids;
        sommePoids += signal.poids;
      }
    }
    return sommePoids > 0 ? sommePonderee / sommePoids : 0;
  }
}
