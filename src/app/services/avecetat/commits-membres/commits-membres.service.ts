// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Store d'orchestration de l'écran « Commits des membres » (US-060, RG-060, plan_17 chapitre 4, amendé par
// plan_21 le 2026-09-16) : dérivation locale des membres analysables, puis une boucle sur ces membres à
// concurrence limitée avec progression réactive, sur le modèle explicite de `OrchestrateurCampagneService` (même
// patron `mergeMap(fn, concurrence)` RxJS, même repli de concurrence sur `parametres.audit.concurrence`).
//
// Le résultat vit en mémoire de session uniquement : aucune donnée d'activité nominative n'est persistée
// (docs/02_documentation/15_normesSecurite.md). Le calcul des indicateurs est délégué à la fonction pure
// `CadencePousseesUtils.analyser` (Moteur de jugement), réévaluée à chaque changement de seuil sans nouvel appel
// réseau via le `computed` `lignes`.
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { firstValueFrom, from } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
import { FacadeCommitsMembresService } from '../../sansetat/commandes/facade-commits-membres.service';
import { ErreurConnecteurUtils } from '../../sansetat/commandes/erreur-connecteur.utils';
import { CadencePousseesUtils } from '../../sansetat/jugement/cadence-poussees.utils';
import type {
  ActivitePousseesDeveloppeur,
  LigneCadencePoussees,
  SeuilsCadencePoussees,
} from '../../sansetat/jugement/cadence-poussees.utils';
import { TypeInstance } from '../../sansetat/commandes/types-facade';
import type { Instance } from '../../sansetat/commandes/types-facade';
import { DonneesApplicationService } from '../etat/donnees-application.service';
import { NotificationService } from '../etat/notification.service';
import { StatutMembre, TypeCritereMembre, TypeSource } from '../etat/types-donnees';
import type { MembreConnu, Projet } from '../etat/types-donnees';

/** Repli des seuils de calcul quand `parametres.cadenceCommits` est absent (fichier au schéma antérieur non migré). */
const SEUILS_CADENCE_PAR_DEFAUT: SeuilsCadencePoussees = {
  fenetreJours: 28,
  seuilJoursOuvresSansPoussee: 3,
  multiplicateurEcartCadence: 2,
  ponderationInactivite: 0.5,
  ponderationEcartCadence: 0.3,
  ponderationSoiree: 0.2,
  heureDebutSoiree: 19,
  heureFinSoiree: 7,
  fuseauHoraire: 'Europe/Paris',
  comptesExclus: [],
};

/** Repli de concurrence de la boucle sur les membres (RG-017), aligné sur `OrchestrateurCampagneService`. */
const CONCURRENCE_PAR_DEFAUT = 4;

/** Progression de l'analyse en cours (membres traités sur total). */
export interface ProgressionAnalyseCommitsMembres {
  readonly traites: number;
  readonly total: number;
}

/**
 * Prédicats de filtrage des membres connus d'un groupe, appliqués par le Store (plan_21 §2 décision 2). Classe à
 * membres statiques uniquement (règle « aucune fonction hors classe »).
 */
class FiltresMembresConnus {
  /**
   * `true` si `membre` est un membre connu `interne`, qualifié par nom d'utilisateur exact, actif (sans date de
   * départ renseignée) — seul périmètre analysable par l'écran depuis plan_21.
   * @param membre - Règle de membre connu du groupe.
   * @returns `true` si le membre est analysable.
   */
  public static estAnalysable(membre: MembreConnu): boolean {
    return (
      membre.statut === StatutMembre.Interne &&
      membre.typeCritere === TypeCritereMembre.Username &&
      membre.partiLe === undefined
    );
  }

  /**
   * `true` si `membre` est une règle `interne` non analysable (type `email` ou `domaineEmail`, plan_21) : ne
   * désigne aucun compte GitLab précis, son nombre est signalé explicitement à l'écran.
   * @param membre - Règle de membre connu du groupe.
   * @returns `true` si la règle est `interne` et non analysable.
   */
  public static estInterneNonAnalysable(membre: MembreConnu): boolean {
    return (
      membre.statut === StatutMembre.Interne && membre.typeCritere !== TypeCritereMembre.Username
    );
  }
}

/**
 * Store d'orchestration de l'écran « Commits des membres » (US-060, RG-060).
 */
@Injectable({ providedIn: 'root' })
export class CommitsMembresService {
  private readonly facadeCommitsMembres: FacadeCommitsMembresService = inject(
    FacadeCommitsMembresService,
  );
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

  private readonly enCoursInterne: WritableSignal<boolean> = signal(false);
  private readonly progressionInterne: WritableSignal<ProgressionAnalyseCommitsMembres | null> =
    signal<ProgressionAnalyseCommitsMembres | null>(null);
  private readonly instantAnalyseInterne: WritableSignal<Date | null> = signal<Date | null>(null);
  private readonly plusieursInstancesGitlabInterne: WritableSignal<boolean> = signal(false);
  private readonly premiereInstanceGitlabNomInterne: WritableSignal<string | null> = signal<
    string | null
  >(null);
  private readonly activiteBruteInterne: WritableSignal<
    readonly ActivitePousseesDeveloppeur[] | null
  > = signal<readonly ActivitePousseesDeveloppeur[] | null>(null);
  private readonly cheminsDepotsParIdInterne: WritableSignal<ReadonlyMap<number, string>> = signal<
    ReadonlyMap<number, string>
  >(new Map());
  private readonly reglesNonAnalysablesInterne: WritableSignal<number> = signal(0);

  /** `true` pendant une analyse (résolution des membres puis boucle des événements). */
  public readonly enCours: Signal<boolean> = this.enCoursInterne.asReadonly();
  /** Progression de l'analyse en cours, `null` hors analyse. */
  public readonly progression: Signal<ProgressionAnalyseCommitsMembres | null> =
    this.progressionInterne.asReadonly();
  /** Instant de la dernière analyse aboutie, `null` si aucune. */
  public readonly instantAnalyse: Signal<Date | null> = this.instantAnalyseInterne.asReadonly();
  /** `true` si le groupe applicatif analysé déclare plus d'une instance de type GitLab (seule la première est interrogée). */
  public readonly plusieursInstancesGitlab: Signal<boolean> =
    this.plusieursInstancesGitlabInterne.asReadonly();
  /** Nom de la première instance de type GitLab du groupe analysé, `null` hors analyse. */
  public readonly premiereInstanceGitlabNom: Signal<string | null> =
    this.premiereInstanceGitlabNomInterne.asReadonly();
  /** Activité brute par développeur résolu de la dernière analyse, `null` si aucune. */
  public readonly activiteBrute: Signal<readonly ActivitePousseesDeveloppeur[] | null> =
    this.activiteBruteInterne.asReadonly();
  /**
   * Nombre de règles `interne` non analysables (type `email` ou `domaineEmail`) du groupe analysé, `0` hors
   * analyse ou si aucune (plan_21 §2 décision 2).
   */
  public readonly reglesNonAnalysables: Signal<number> =
    this.reglesNonAnalysablesInterne.asReadonly();

  /**
   * Lignes du tableau, recalculées par la fonction pure du Moteur de jugement à chaque changement de
   * `parametres.cadenceCommits` **sans** relancer {@link analyser} (RG-060).
   */
  public readonly lignes: Signal<readonly LigneCadencePoussees[]> = computed(() => {
    const activite = this.activiteBruteInterne();
    if (activite === null) {
      return [];
    }
    const seuils =
      this.donneesApplication.racine()?.parametres.cadenceCommits ?? SEUILS_CADENCE_PAR_DEFAUT;
    const maintenantIso = (this.instantAnalyseInterne() ?? new Date()).toISOString();
    return CadencePousseesUtils.analyser(
      activite,
      seuils,
      this.cheminsDepotsParIdInterne(),
      maintenantIso,
    );
  });

  /**
   * Lance une analyse : dérive les membres analysables du groupe puis boucle sur eux à concurrence limitée
   * (US-060, RG-060, plan_21). L'analyse porte sur la **première instance de type GitLab** déclarée par le groupe
   * applicatif ; les instances supplémentaires sont signalées via {@link plusieursInstancesGitlab}. Une erreur ou
   * une absence de résolution sur un membre est consignée sans interrompre la boucle.
   * @param groupeApplicatifId - Identifiant du groupe applicatif analysé.
   */
  public async analyser(groupeApplicatifId: string): Promise<void> {
    if (this.enCoursInterne()) {
      return;
    }

    const groupe = this.donneesApplication
      .groupes()
      .find((candidat) => candidat.id === groupeApplicatifId);
    const instancesGitlab = (groupe?.instances ?? []).filter(
      (instance) => instance.type === TypeInstance.Gitlab,
    );
    const instance = instancesGitlab[0];
    if (groupe === undefined || instance === undefined) {
      // Groupe non analysable : on vide tout résultat précédent plutôt que de laisser le tableau projeter
      // l'activité de l'ancienne analyse sur les membres connus du nouveau groupe.
      this.reinitialiser();
      this.notification.erreur(
        'Ce groupe ne déclare aucune instance GitLab : impossible d’analyser les poussées de ses membres.',
      );
      return;
    }

    this.plusieursInstancesGitlabInterne.set(instancesGitlab.length > 1);
    this.premiereInstanceGitlabNomInterne.set(instance.nom);
    this.reglesNonAnalysablesInterne.set(
      groupe.membresConnus.filter((membre) => FiltresMembresConnus.estInterneNonAnalysable(membre))
        .length,
    );
    this.cheminsDepotsParIdInterne.set(
      CommitsMembresService.construireCheminsDepots(groupe.projets),
    );

    const membresAnalysables = groupe.membresConnus.filter((membre) =>
      FiltresMembresConnus.estAnalysable(membre),
    );

    this.enCoursInterne.set(true);
    this.progressionInterne.set({ traites: 0, total: membresAnalysables.length });
    try {
      await this.executerAnalyse(instance, membresAnalysables);
    } finally {
      this.enCoursInterne.set(false);
      this.progressionInterne.set(null);
    }
  }

  /**
   * Vide l'état de l'analyse (changement de groupe sélectionné).
   */
  public reinitialiser(): void {
    this.activiteBruteInterne.set(null);
    this.instantAnalyseInterne.set(null);
    this.progressionInterne.set(null);
    this.plusieursInstancesGitlabInterne.set(false);
    this.premiereInstanceGitlabNomInterne.set(null);
    this.cheminsDepotsParIdInterne.set(new Map());
    this.reglesNonAnalysablesInterne.set(0);
  }

  /**
   * Corps de l'analyse une fois l'instance GitLab et les membres analysables résolus : résout chaque membre par
   * username puis, si résolu, ses événements de poussée.
   * @param instance - Première instance de type GitLab du groupe.
   * @param membresAnalysables - Membres connus `interne`/`username` actifs retenus.
   */
  private async executerAnalyse(
    instance: Instance,
    membresAnalysables: readonly MembreConnu[],
  ): Promise<void> {
    const apresDate = this.borneBasseFenetre();
    const concurrence = this.extraireConcurrence();
    let traites = 0;

    const resultats = await firstValueFrom(
      from(membresAnalysables).pipe(
        mergeMap(async (membre): Promise<ActivitePousseesDeveloppeur | null> => {
          const resolution = await this.facadeCommitsMembres.interrogerMembreGitlabParUsername(
            instance,
            membre.critere,
          );
          traites += 1;
          this.progressionInterne.set({ traites, total: membresAnalysables.length });

          if (resolution.type === 'echec') {
            this.notification.erreur(
              `Résolution de « ${membre.critere} » impossible : ${ErreurConnecteurUtils.libelleCategorie(
                resolution.anomalie.type,
              )}.`,
            );
            return null;
          }
          const compteGitlab = resolution.resultat;
          if (compteGitlab === null) {
            this.notification.erreur(
              `Aucun compte GitLab actif ne correspond au nom d’utilisateur « ${membre.critere} ».`,
            );
            return null;
          }

          const reponse = await this.facadeCommitsMembres.listerEvenementsPousseesMembre(
            instance,
            compteGitlab.id,
            apresDate,
          );
          if (reponse.type === 'echec') {
            this.notification.erreur(
              `Poussées de ${compteGitlab.username} non récupérées : ${ErreurConnecteurUtils.libelleCategorie(
                reponse.anomalie.type,
              )}.`,
            );
          }
          return {
            membre: {
              id: compteGitlab.id,
              username: compteGitlab.username,
              nom: compteGitlab.nom,
              courriel: compteGitlab.courriel,
            },
            evenements: reponse.type === 'succes' ? reponse.resultat : [],
          };
        }, concurrence),
        toArray(),
      ),
    );

    this.activiteBruteInterne.set(
      resultats.filter((resultat): resultat is ActivitePousseesDeveloppeur => resultat !== null),
    );
    this.instantAnalyseInterne.set(new Date());
  }

  /**
   * Borne basse de la fenêtre au format `AAAA-MM-JJ`, fixée à la veille du début de fenêtre (le paramètre `after`
   * de GitLab est exclusif et à granularité de jour ; le filtrage fin est fait par le Moteur de jugement).
   * @returns La date `AAAA-MM-JJ`.
   */
  private borneBasseFenetre(): string {
    const seuils =
      this.donneesApplication.racine()?.parametres.cadenceCommits ?? SEUILS_CADENCE_PAR_DEFAUT;
    const debut = new Date(Date.now() - (seuils.fenetreJours + 1) * 24 * 60 * 60 * 1000);
    return debut.toISOString().slice(0, 10);
  }

  /**
   * Construit la correspondance identifiant de dépôt GitLab -> nom de projet applicatif, sans appel réseau, à
   * partir des sources de type dépôt GitLab des projets du groupe analysé (plan_21 §2 décision 5).
   * @param projets - Projets du groupe applicatif analysé.
   * @returns La correspondance identifiant -> nom de projet.
   */
  private static construireCheminsDepots(projets: readonly Projet[]): ReadonlyMap<number, string> {
    const chemins = new Map<number, string>();
    for (const projet of projets) {
      for (const source of projet.sources) {
        if (source.type !== TypeSource.DepotGitlab) {
          continue;
        }
        const idDepot = Number(source.idExterne);
        if (!Number.isNaN(idDepot)) {
          chemins.set(idDepot, projet.nom);
        }
      }
    }
    return chemins;
  }

  /**
   * Concurrence de la boucle sur les membres (`parametres.audit.concurrence`, RG-017), avec repli sur
   * {@link CONCURRENCE_PAR_DEFAUT}.
   * @returns La concurrence à appliquer (au moins 1).
   */
  private extraireConcurrence(): number {
    const valeur = this.donneesApplication.racine()?.parametres.audit.concurrence;
    return typeof valeur === 'number' && valeur >= 1 ? Math.floor(valeur) : CONCURRENCE_PAR_DEFAUT;
  }
}
