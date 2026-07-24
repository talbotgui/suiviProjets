// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Store d'état applicatif de la session (US-026, RG-004, RG-005), Phase 1 du plan de développement. Décision de
// conception (cf. compte-rendu de développement de la Phase 1) : conformément à l'interface décrite en
// docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces (« Aucune
// dépendance externe ; état local à l'UI »), ce service n'invoque aucune commande Tauri lui-même : il expose un
// état réactif local, mis à jour par les couches consommatrices (façade de commandes, écrans), introduites aux
// phases ultérieures du plan. Aucun écran ni aucune façade de commandes TypeScript n'existe encore à ce stade.
import { Injectable, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';

/**
 * État courant du fichier de données au sein de la session applicative (US-026).
 */
export enum EtatFichier {
  /** Aucun fichier n'est ouvert : écran d'accueil (création ou chargement). */
  Ferme = 'ferme',
  /** Un fichier est ouvert et déverrouillé. */
  Ouvert = 'ouvert',
  /** Un fichier est ouvert mais verrouillé : la clé dérivée et les credentials ont été purgés. */
  Verrouille = 'verrouille',
}

/**
 * Emplacement, en mémoire, des credentials de la session courante : une entrée par identifiant d'instance
 * GitLab/Sonar. Structure prête pour la saisie réelle introduite en Phase 2 (US-003, US-004) ; jamais persistée,
 * ni dans l'état sérialisé du fichier de données, ni dans un stockage navigateur (RG-004, RNF-013).
 */
export type CredentialsEnMemoire = Readonly<Record<string, string>>;

/**
 * Statut d'exécution d'un projet au sein de la progression réactive locale d'une campagne en cours (Phase 5,
 * incrément 4 ; mirroir partiel de `StatutVerdict` côté cœur natif, complété de `enCours`, propre à cet état
 * transitoire jamais persisté).
 */
export type StatutExecutionProjet = 'enAttente' | 'enCours' | 'termine' | 'echoue' | 'ignore';

/**
 * Progression d'un projet au sein d'une campagne en cours (Phase 5, incrément 5) : connecteur actif, durée
 * écoulée, nombre de résultats obtenus et motif court d'échec, affichés par le Tableau de bord d'exécution sur le
 * modèle de la maquette de référence (`docs/01_besoin/Suivi Qualimetrie.dc.html`, section « Tableau de bord
 * d'audit » : « Terminé (nombre de résultats), Échoué (motif court, encart dépliable) »,
 * `docs/01_besoin/Specification.md#56-f06--tableau-de-bord-dexécution-daudit`).
 */
export interface ProgressionProjet {
  /** Statut d'exécution courant. */
  readonly statut: StatutExecutionProjet;
  /** Connecteur actuellement interrogé, uniquement pertinent lorsque `statut` vaut `enCours`. */
  readonly connecteurActif?: 'gitlab' | 'sonar';
  /** Durée écoulée en millisecondes, connue une fois `statut` à `termine` ou `echoue`. */
  readonly dureeMs?: number;
  /** Nombre de résultats obtenus, connu une fois `statut` à `termine`. */
  readonly nombreResultats?: number;
  /** Motif court du dernier échec rencontré, connu une fois `statut` à `echoue`. */
  readonly motifEchec?: string;
}

/**
 * Progression réactive locale d'une campagne en cours ou terminée (Phase 5, incrément 4), mise à jour directement
 * dans ce Store d'état applicatif par `OrchestrateurCampagneService`, conformément à
 * `docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces` (« la
 * progression... est un état réactif local », jamais persistée).
 */
export interface ProgressionCampagne {
  /** Identifiants des projets du périmètre de la campagne, dans l'ordre demandé. */
  readonly perimetre: readonly string[];
  /** Date de lancement de la campagne (ISO 8601). */
  readonly dateDebut: string;
  /** Progression de chaque projet du périmètre. */
  readonly projets: Readonly<Record<string, ProgressionProjet>>;
}

/**
 * Store d'état applicatif de la session : fichier ouvert/verrouillé/fermé, emplacement des credentials en mémoire,
 * marqueur de présence d'une clé de session côté cœur natif, et purge complète invoquée au verrouillage comme à la
 * fermeture (RG-004, RG-005). La clé dérivée elle-même ne transite jamais vers l'interface (RG-002) : seul un
 * marqueur booléen de sa présence est reflété ici.
 */
@Injectable({ providedIn: 'root' })
export class EtatSessionService {
  private readonly etatFichierInterne: WritableSignal<EtatFichier> = signal(EtatFichier.Ferme);
  private readonly cheminFichierInterne: WritableSignal<string | null> = signal(null);
  private readonly credentialsInterne: WritableSignal<CredentialsEnMemoire | null> = signal(null);
  private readonly cleSessionPresenteInterne: WritableSignal<boolean> = signal(false);
  private readonly echecsDeverrouillageInterne: WritableSignal<number> = signal(0);
  private readonly progressionCampagneInterne: WritableSignal<ProgressionCampagne | null> =
    signal(null);

  /**
   * État courant du fichier de données (fermé, ouvert, verrouillé), exposé en lecture seule.
   */
  public readonly etatFichier: Signal<EtatFichier> = this.etatFichierInterne.asReadonly();

  /**
   * Chemin du fichier actuellement ouvert, `null` si aucun fichier n'est ouvert. Conservé pendant un verrouillage
   * temporaire afin de permettre un déverrouillage ultérieur sans ressaisie du chemin.
   */
  public readonly cheminFichier: Signal<string | null> = this.cheminFichierInterne.asReadonly();

  /**
   * Credentials actuellement détenus en mémoire, `null` si aucun n'est saisi ou après purge (RG-004).
   */
  public readonly credentials: Signal<CredentialsEnMemoire | null> =
    this.credentialsInterne.asReadonly();

  /**
   * Indique si une clé dérivée est actuellement détenue côté cœur natif pour cette session (jamais la clé
   * elle-même, cf. RG-002).
   */
  public readonly cleSessionPresente: Signal<boolean> = this.cleSessionPresenteInterne.asReadonly();

  /**
   * Nombre d'échecs consécutifs de déverrouillage déjà enregistrés depuis le dernier déverrouillage réussi (ou
   * depuis l'ouverture du fichier), exposé en lecture seule. Remis à zéro dès qu'un déverrouillage réussit (US-026).
   */
  public readonly echecsDeverrouillage: Signal<number> =
    this.echecsDeverrouillageInterne.asReadonly();

  /**
   * Progression réactive locale de la campagne en cours (ou de la dernière campagne exécutée), `null` si aucune
   * campagne n'a encore été lancée depuis le chargement de l'application (Phase 5, incrément 4).
   */
  public readonly progressionCampagne: Signal<ProgressionCampagne | null> =
    this.progressionCampagneInterne.asReadonly();

  /**
   * Marque l'ouverture d'un fichier (création ou chargement réussi) : passe en état ouvert, mémorise le chemin et
   * marque la présence d'une clé de session.
   * @param cheminFichier - Chemin du fichier désormais ouvert.
   */
  public ouvrirFichier(cheminFichier: string): void {
    this.cheminFichierInterne.set(cheminFichier);
    this.etatFichierInterne.set(EtatFichier.Ouvert);
    this.cleSessionPresenteInterne.set(true);
  }

  /**
   * Enregistre les credentials de la session courante en mémoire (structure prête dès la Phase 1, saisie réelle
   * introduite en Phase 2).
   * @param credentials - Credentials à conserver, jamais persistés (RG-004).
   */
  public definirCredentials(credentials: CredentialsEnMemoire): void {
    this.credentialsInterne.set(credentials);
  }

  /**
   * Démarre la progression réactive locale d'une nouvelle campagne (Phase 5, incrément 4) : tous les projets du
   * périmètre initialisés au statut `enAttente`. Remplace toute progression précédente (campagne antérieure déjà
   * terminée).
   * @param perimetre - Identifiants des projets du périmètre de la campagne qui commence.
   */
  public demarrerProgressionCampagne(perimetre: readonly string[]): void {
    this.progressionCampagneInterne.set({
      perimetre,
      dateDebut: new Date().toISOString(),
      projets: Object.fromEntries(perimetre.map((projetId) => [projetId, { statut: 'enAttente' }])),
    });
  }

  /**
   * Met à jour la progression d'un projet au sein de la campagne en cours (Phase 5, incrément 4), en fusionnant
   * les champs fournis à l'entrée déjà existante. Sans effet si aucune campagne n'est en cours (garde défensive,
   * ne devrait pas survenir dans le flux normal de `OrchestrateurCampagneService`).
   * @param projetId - Identifiant du projet concerné.
   * @param misesAJour - Champs de {@link ProgressionProjet} à fusionner dans l'entrée existante.
   */
  public mettreAJourProgressionProjet(
    projetId: string,
    misesAJour: Partial<ProgressionProjet>,
  ): void {
    const progression = this.progressionCampagneInterne();
    if (progression === null) {
      return;
    }
    const entreeCourante: ProgressionProjet = progression.projets[projetId] ?? {
      statut: 'enAttente',
    };
    this.progressionCampagneInterne.set({
      ...progression,
      projets: {
        ...progression.projets,
        [projetId]: { ...entreeCourante, ...misesAJour },
      },
    });
  }

  /**
   * Verrouille la session courante (US-026) : purge les credentials et le marqueur de clé de session en mémoire,
   * sans oublier le chemin du fichier ouvert, afin de permettre un déverrouillage ultérieur (RG-004, RG-005).
   */
  public verrouiller(): void {
    this.purgerDonneesSensibles();
    this.etatFichierInterne.set(EtatFichier.Verrouille);
  }

  /**
   * Marque un déverrouillage réussi (US-026) : repasse en état ouvert et restaure le marqueur de présence d'une
   * clé de session.
   */
  public marquerDeverrouille(): void {
    this.echecsDeverrouillageInterne.set(0);
    this.cleSessionPresenteInterne.set(true);
    this.etatFichierInterne.set(EtatFichier.Ouvert);
  }

  /**
   * Enregistre un échec de déverrouillage (mot de passe rejeté par le cœur natif) et ferme complètement le fichier
   * dès que le nombre d'échecs consécutifs atteint le seuil paramétré, plutôt que de laisser l'utilisateur
   * ressayer indéfiniment depuis l'écran de verrouillage (US-026 : « un nombre paramétrable d'échecs consécutifs
   * ferme le fichier »). Cette décision est portée par le Store d'état applicatif plutôt que par le cœur natif,
   * qui se limite à vérifier le mot de passe sans compter les échecs (cf. compte-rendu de développement de la
   * Phase 1) : c'est ici, et non côté cœur natif, que ce seuil doit être appliqué.
   * @param echecsAvantFermeture - Nombre d'échecs consécutifs tolérés avant fermeture complète du fichier
   * (`parametres.verrouillage.echecsAvantFermeture` des données déjà chargées, connu de l'appelant).
   * @returns `true` si cet échec a provoqué la fermeture complète du fichier, `false` si l'écran de verrouillage
   * reste proposé pour un nouvel essai.
   */
  public enregistrerEchecDeverrouillage(echecsAvantFermeture: number): boolean {
    const echecsConsecutifs = this.echecsDeverrouillageInterne() + 1;
    this.echecsDeverrouillageInterne.set(echecsConsecutifs);
    if (echecsConsecutifs >= echecsAvantFermeture) {
      this.fermer();
      return true;
    }
    return false;
  }

  /**
   * Ferme complètement le fichier (US-026 : fermeture après un nombre paramétrable d'échecs consécutifs de
   * déverrouillage) : purge les données sensibles et oublie également le chemin du fichier, retour à l'état
   * fermé.
   */
  public fermer(): void {
    this.purgerDonneesSensibles();
    this.echecsDeverrouillageInterne.set(0);
    this.cheminFichierInterne.set(null);
    this.etatFichierInterne.set(EtatFichier.Ferme);
  }

  /**
   * Purge les credentials et le marqueur de clé de session détenus en mémoire, sans modifier l'état du fichier ni
   * son chemin (RG-004, RG-005).
   */
  private purgerDonneesSensibles(): void {
    this.credentialsInterne.set(null);
    this.cleSessionPresenteInterne.set(false);
  }
}
