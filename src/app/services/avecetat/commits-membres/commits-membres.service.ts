// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Store d'orchestration de l'écran « Commits des membres » (US-060, RG-060, plan_17 chapitre 4) : une passe de
// préparation (roster + dépôts du groupe GitLab), puis une boucle sur les membres à concurrence limitée avec
// progression réactive, sur le modèle explicite de `OrchestrateurCampagneService` (même patron
// `mergeMap(fn, concurrence)` RxJS, même repli de concurrence sur `parametres.audit.concurrence`).
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
  StatutDeveloppeur,
} from '../../sansetat/jugement/cadence-poussees.utils';
import type { RegleMembreConnu } from '../../sansetat/jugement/statut-membre.utils';
import { TypeInstance } from '../../sansetat/commandes/types-facade';
import type { Instance } from '../../sansetat/commandes/types-facade';
import { DonneesApplicationService } from '../etat/donnees-application.service';
import { NotificationService } from '../etat/notification.service';
import type { MembreConnu } from '../etat/types-donnees';

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
  private readonly groupeGitlabSaisiInterne: WritableSignal<string> = signal('');
  private readonly groupeAnalyseIdInterne: WritableSignal<string | null> = signal<string | null>(
    null,
  );
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

  /** `true` pendant une analyse (préparation + boucle sur les membres). */
  public readonly enCours: Signal<boolean> = this.enCoursInterne.asReadonly();
  /** Progression de l'analyse en cours, `null` hors analyse. */
  public readonly progression: Signal<ProgressionAnalyseCommitsMembres | null> =
    this.progressionInterne.asReadonly();
  /** Instant de la dernière analyse aboutie, `null` si aucune. */
  public readonly instantAnalyse: Signal<Date | null> = this.instantAnalyseInterne.asReadonly();
  /** Référence de groupe GitLab de la dernière analyse (miroir de la saisie de l'écran). */
  public readonly groupeGitlabSaisi: Signal<string> = this.groupeGitlabSaisiInterne.asReadonly();
  /** `true` si le groupe applicatif analysé déclare plus d'une instance de type GitLab (seule la première est interrogée). */
  public readonly plusieursInstancesGitlab: Signal<boolean> =
    this.plusieursInstancesGitlabInterne.asReadonly();
  /** Nom de la première instance de type GitLab du groupe analysé, `null` hors analyse. */
  public readonly premiereInstanceGitlabNom: Signal<string | null> =
    this.premiereInstanceGitlabNomInterne.asReadonly();
  /** Activité brute par développeur de la dernière analyse, `null` si aucune. */
  public readonly activiteBrute: Signal<readonly ActivitePousseesDeveloppeur[] | null> =
    this.activiteBruteInterne.asReadonly();

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
    const groupeId = this.groupeAnalyseIdInterne();
    const groupe = this.donneesApplication.groupes().find((candidat) => candidat.id === groupeId);
    const reglesMembresConnus = (groupe?.membresConnus ?? []).map((membre) =>
      CommitsMembresService.projeterRegleMembre(membre),
    );
    const maintenantIso = (this.instantAnalyseInterne() ?? new Date()).toISOString();
    return CadencePousseesUtils.analyser(
      activite,
      seuils,
      this.cheminsDepotsParIdInterne(),
      reglesMembresConnus,
      maintenantIso,
    );
  });

  /**
   * Lance une analyse : préparation du roster puis boucle sur les membres à concurrence limitée (US-060, RG-060).
   * L'analyse porte sur la **première instance de type GitLab** déclarée par le groupe applicatif ; les instances
   * supplémentaires sont signalées via {@link plusieursInstancesGitlab}. Une erreur sur un membre est consignée sans
   * interrompre la boucle ; une erreur de préparation interrompt l'analyse.
   * @param groupeApplicatifId - Identifiant du groupe applicatif analysé.
   * @param groupeGitlab - Référence (chemin ou identifiant) du groupe GitLab dont le roster est analysé.
   */
  public async analyser(groupeApplicatifId: string, groupeGitlab: string): Promise<void> {
    if (this.enCoursInterne()) {
      return;
    }
    this.groupeGitlabSaisiInterne.set(groupeGitlab);
    this.groupeAnalyseIdInterne.set(groupeApplicatifId);

    const groupe = this.donneesApplication
      .groupes()
      .find((candidat) => candidat.id === groupeApplicatifId);
    const instancesGitlab = (groupe?.instances ?? []).filter(
      (instance) => instance.type === TypeInstance.Gitlab,
    );
    this.plusieursInstancesGitlabInterne.set(instancesGitlab.length > 1);
    const instance = instancesGitlab[0];
    if (instance === undefined) {
      this.premiereInstanceGitlabNomInterne.set(null);
      this.notification.erreur(
        'Ce groupe ne déclare aucune instance GitLab : impossible d’analyser les poussées de ses membres.',
      );
      return;
    }
    this.premiereInstanceGitlabNomInterne.set(instance.nom);

    this.enCoursInterne.set(true);
    this.progressionInterne.set({ traites: 0, total: 0 });
    try {
      await this.executerAnalyse(instance, groupeGitlab);
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
    this.groupeGitlabSaisiInterne.set('');
    this.groupeAnalyseIdInterne.set(null);
    this.plusieursInstancesGitlabInterne.set(false);
    this.premiereInstanceGitlabNomInterne.set(null);
    this.cheminsDepotsParIdInterne.set(new Map());
  }

  /**
   * Corps de l'analyse une fois l'instance GitLab résolue.
   * @param instance - Première instance de type GitLab du groupe.
   * @param groupeGitlab - Référence du groupe GitLab.
   */
  private async executerAnalyse(instance: Instance, groupeGitlab: string): Promise<void> {
    const preparation = await this.facadeCommitsMembres.preparerAnalyseCommitsMembres(
      instance,
      groupeGitlab,
    );
    if (preparation.type === 'echec') {
      this.notification.erreur(
        `L’analyse n’a pas pu démarrer : ${ErreurConnecteurUtils.libelleCategorie(preparation.anomalie.type)}.`,
      );
      return;
    }

    const { membres, projets } = preparation.resultat;
    this.cheminsDepotsParIdInterne.set(
      new Map(projets.map((projet) => [projet.id, projet.chemin])),
    );
    this.progressionInterne.set({ traites: 0, total: membres.length });

    const apresDate = this.borneBasseFenetre();
    const concurrence = this.extraireConcurrence();
    let traites = 0;

    const activite = await firstValueFrom(
      from(membres).pipe(
        mergeMap(async (membre): Promise<ActivitePousseesDeveloppeur> => {
          const reponse = await this.facadeCommitsMembres.listerEvenementsPousseesMembre(
            instance,
            membre.id,
            apresDate,
          );
          if (reponse.type === 'echec') {
            this.notification.erreur(
              `Poussées de ${membre.username} non récupérées : ${ErreurConnecteurUtils.libelleCategorie(
                reponse.anomalie.type,
              )}.`,
            );
          }
          traites += 1;
          this.progressionInterne.set({ traites, total: membres.length });
          return {
            membre: {
              id: membre.id,
              username: membre.username,
              nom: membre.nom,
              courriel: membre.courriel,
            },
            evenements: reponse.type === 'succes' ? reponse.resultat : [],
          };
        }, concurrence),
        toArray(),
      ),
    );

    this.activiteBruteInterne.set(activite);
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
   * Projette une règle de membre connu du fichier de données vers la forme générique consommée par le Moteur de
   * jugement (`RegleMembreConnu<StatutDeveloppeur>`, sans `partiLe` ni `libelle`, sans effet sur la résolution).
   * @param membre - Règle de membre connu du groupe.
   * @returns La règle projetée.
   */
  private static projeterRegleMembre(membre: MembreConnu): RegleMembreConnu<StatutDeveloppeur> {
    return {
      critere: membre.critere,
      typeCritere: membre.typeCritere,
      statut: membre.statut,
      aliasEmail: membre.aliasEmail,
    };
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
