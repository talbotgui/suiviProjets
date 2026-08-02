// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran de Gestion des credentials (Phase 9, incrément 3 ; US-003, US-004, F02, F24) : jusqu'ici bouton désactivé
// de la barre supérieure du shell applicatif (« à venir »), depuis la Phase 6 incrément 3. Saisie en mémoire d'un
// credential par instance GitLab/Sonar déclarée (jamais persisté sur disque, RG-004) et test de connectivité
// unitaire ou global (US-031, F24 : « Depuis l'écran des credentials ... bouton "tout tester" »).
//
// Injecte `FacadeCommandesService` directement plutôt que de passer par `DonneesApplicationService` (décision
// arbitraire de cet incrément, à valider par un humain, cf. rapport de développement) : `testerConnectivite` et
// `definirCredentials` n'échangent ni ne mutent jamais `DonneesRacine` (seule `EtatSessionService.credentials`,
// signal de session, en est le reflet côté interface), sur le même modèle déjà retenu par
// `SqmSourcesAdminComponent` pour `interrogerBranches` (Phase 3) : aucune des deux commandes ne requiert la
// généricité de type propre aux clients dédiés (`FacadeVuesService`, `FacadeParametrageService`, ...).
//
// Test de connectivité global (US-031) : ne teste que les instances pour lesquelles un credential est
// actuellement saisi (déjà enregistré ou en cours de saisie), avec la même limitation de concurrence que les
// audits (RG-017, `parametres.audit.concurrence`) ; les instances sans credential restent listées avec un verdict
// « — », jamais masquées (F24). Décision de périmètre de cet incrément (à valider par un humain) : le bouton
// « tout tester » n'est construit qu'ici, pas encore repris en préambule de la constitution de campagne (second
// emplacement littéralement cité par F24), laissé à un incrément ultérieur.
import { Component, computed, inject, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../services/avecetat/etat/etat-session.service';
import { ErreurConnecteurUtils } from '../../services/sansetat/commandes/erreur-connecteur.utils';
import { FacadeCommandesService } from '../../services/sansetat/commandes/facade-commandes.service';
import { TypeInstance } from '../../services/sansetat/commandes/types-facade';
import type { Instance } from '../../services/sansetat/commandes/types-facade';

/**
 * Valeur par défaut de la concurrence du test global (RG-017), reprise de la même convention que
 * `OrchestrateurCampagneService.CONCURRENCE_PAR_DEFAUT` (`parametres.audit.concurrence`,
 * `docs/01_besoin/exemple-donnees.json`) : duplication volontaire d'une constante déjà privée à ce service plutôt
 * que son extraction en dépendance partagée, cf. règle du projet contre l'abstraction prématurée.
 */
const CONCURRENCE_PAR_DEFAUT = 4;

/** Statut d'affichage du verdict d'une instance, `nonTeste` avant tout appel de {@link tester}. */
type StatutVerdictAffiche = 'enCours' | 'succes' | 'echec';

/** Verdict affiché pour une instance (test unitaire ou global, US-004, US-031). */
interface VerdictAffiche {
  /** Statut du dernier test lancé pour cette instance. */
  readonly statut: StatutVerdictAffiche;
  /** Latence mesurée côté interface (ms), absente tant que le test n'est pas terminé. */
  readonly latenceMs?: number;
  /** `true` si le credential porte une portée excédant la portée minimale recommandée (succès uniquement). */
  readonly porteeExcessive?: boolean;
  /** Libellé de l'anomalie rencontrée (échec uniquement). */
  readonly libelleAnomalie?: string;
  /** Action suggérée pour résoudre l'anomalie (échec uniquement, F08/F24). */
  readonly actionSuggeree?: string;
}

/** Instance déclarée, complétée du nom de son groupe de rattachement pour l'affichage. */
interface InstanceAffichee {
  /** Instance GitLab ou Sonar.*/
  readonly instance: Instance;
  /** Nom du groupe portant cette instance. */
  readonly nomGroupe: string;
}

/**
 * Écran de Gestion des credentials : saisie en mémoire d'un credential par instance déclarée (US-003), test de
 * connectivité unitaire (US-004) ou global (US-031).
 */
@Component({
  selector: 'app-credentials',
  imports: [FormsModule],
  templateUrl: './credentials.component.html',
})
export class SqmCredentialsComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly etatSession: EtatSessionService = inject(EtatSessionService);
  private readonly facadeCommandes: FacadeCommandesService = inject(FacadeCommandesService);

  /**
   * Toutes les instances déclarées, tous groupes confondus, complétées du nom de leur groupe de rattachement.
   */
  public readonly instances: Signal<readonly InstanceAffichee[]> = computed(() => {
    const racine = this.donneesApplication.racine();
    if (racine === null) {
      return [];
    }
    return racine.groupes.flatMap((groupe) =>
      groupe.instances.map((instance) => ({ instance, nomGroupe: groupe.nom })),
    );
  });

  /**
   * Saisie en cours par identifiant d'instance, non encore enregistrée en mémoire de session.
   */
  private readonly saisieInterne: WritableSignal<Readonly<Record<string, string>>> = signal({});

  /**
   * Verdicts des tests de connectivité (unitaires ou global) par identifiant d'instance.
   */
  private readonly verdicts: WritableSignal<Readonly<Record<string, VerdictAffiche>>> = signal({});

  /**
   * Message d'erreur de la dernière opération, `null` si aucune erreur en cours.
   */
  public messageErreur: string | null = null;

  /**
   * Message de confirmation de succès de la dernière opération, discret et non bloquant (charte d'ergonomie),
   * `null` si aucune opération récente.
   */
  public messageSucces: string | null = null;

  /**
   * Indique qu'un enregistrement des credentials saisis est en cours.
   */
  public enregistrementEnCours = false;

  /**
   * Indique qu'un test de connectivité global (US-031) est en cours.
   */
  public testGlobalEnCours = false;

  /**
   * Valeur actuellement affichée pour le champ de saisie d'une instance : la saisie en cours si elle existe,
   * sinon le credential déjà enregistré en mémoire de session, sinon une chaîne vide.
   * @param instanceId - Identifiant de l'instance concernée.
   * @returns La valeur à afficher dans le champ de saisie.
   */
  public valeurSaisie(instanceId: string): string {
    return this.saisieInterne()[instanceId] ?? this.etatSession.credentials()?.[instanceId] ?? '';
  }

  /**
   * Met à jour la saisie en cours d'un credential, non encore enregistrée en mémoire de session.
   * @param instanceId - Identifiant de l'instance concernée.
   * @param valeur - Nouvelle valeur saisie.
   */
  public definirSaisie(instanceId: string, valeur: string): void {
    this.saisieInterne.update((courant) => ({ ...courant, [instanceId]: valeur }));
  }

  /**
   * Enregistre en mémoire de session (interface et cœur natif) les credentials actuellement saisis, fusionnés
   * avec ceux déjà enregistrés (US-003, RG-004) : jamais persistés sur disque.
   */
  public async enregistrer(): Promise<void> {
    this.messageErreur = null;
    this.messageSucces = null;
    const saisies = Object.entries(this.saisieInterne()).filter(([, valeur]) => valeur.length > 0);
    if (saisies.length === 0) {
      return;
    }
    const fusion: Record<string, string> = { ...(this.etatSession.credentials() ?? {}) };
    for (const [instanceId, valeur] of saisies) {
      fusion[instanceId] = valeur;
    }
    this.enregistrementEnCours = true;
    try {
      await this.facadeCommandes.definirCredentials(fusion);
      this.etatSession.definirCredentials(fusion);
      this.saisieInterne.set({});
      this.messageSucces = 'Les credentials ont été enregistrés pour cette session.';
    } catch {
      this.messageErreur =
        "Un ou plusieurs credentials saisis sont vides : aucun n'a été enregistré.";
    } finally {
      this.enregistrementEnCours = false;
    }
  }

  /**
   * Teste la connectivité d'une instance avec le credential actuellement saisi ou déjà enregistré (US-004),
   * mesure la latence côté interface.
   * @param item - Instance à tester.
   */
  public async tester(item: InstanceAffichee): Promise<void> {
    const credential = this.valeurSaisie(item.instance.id);
    if (credential.length === 0) {
      return;
    }
    this.definirVerdict(item.instance.id, { statut: 'enCours' });
    const debut = Date.now();
    const resultat = await this.facadeCommandes.testerConnectivite(item.instance, credential);
    const latenceMs = Date.now() - debut;
    if (resultat.type === 'succes') {
      this.definirVerdict(item.instance.id, {
        statut: 'succes',
        latenceMs,
        porteeExcessive: resultat.verdict.porteeExcessive,
      });
      return;
    }
    this.definirVerdict(item.instance.id, {
      statut: 'echec',
      latenceMs,
      libelleAnomalie: ErreurConnecteurUtils.libelleCategorie(resultat.anomalie.type),
      actionSuggeree: ErreurConnecteurUtils.actionSuggeree(resultat.anomalie.type),
    });
  }

  /**
   * Teste en une action la connectivité de toutes les instances pour lesquelles un credential est actuellement
   * saisi (US-031, F24), en parallèle avec la même limitation de concurrence que les audits (RG-017). Les
   * instances sans credential restent listées avec un verdict « — », jamais masquées (F24).
   */
  public async toutTester(): Promise<void> {
    const testables = this.instances().filter(
      (item) => this.valeurSaisie(item.instance.id).length > 0,
    );
    if (testables.length === 0) {
      return;
    }
    this.testGlobalEnCours = true;
    const file = [...testables];
    const concurrence = Math.min(this.extraireConcurrence(), file.length);
    const executants = Array.from({ length: concurrence }, () => this.executerFile(file));
    await Promise.all(executants);
    this.testGlobalEnCours = false;
  }

  /**
   * Verdict actuellement affiché pour une instance, `undefined` si elle n'a encore jamais été testée.
   * @param instanceId - Identifiant de l'instance concernée.
   * @returns Le verdict affiché, ou `undefined`.
   */
  public verdict(instanceId: string): VerdictAffiche | undefined {
    return this.verdicts()[instanceId];
  }

  /**
   * Libellé lisible du type d'une instance.
   * @param type - Type de l'instance.
   * @returns Le libellé à afficher.
   */
  public libelleType(type: TypeInstance): string {
    return type === TypeInstance.Gitlab ? 'GitLab' : 'Sonar';
  }

  /**
   * Exécute séquentiellement les tests d'une file partagée jusqu'à épuisement (US-031), un exécutant par unité de
   * concurrence disponible (cf. {@link toutTester}).
   * @param file - File partagée d'instances restant à tester, consommée en place (`Array.prototype.shift`).
   */
  private async executerFile(file: InstanceAffichee[]): Promise<void> {
    let item = file.shift();
    while (item !== undefined) {
      await this.tester(item);
      item = file.shift();
    }
  }

  /**
   * Met à jour le verdict affiché d'une instance.
   * @param instanceId - Identifiant de l'instance concernée.
   * @param verdict - Nouveau verdict à afficher.
   */
  private definirVerdict(instanceId: string, verdict: VerdictAffiche): void {
    this.verdicts.update((courant) => ({ ...courant, [instanceId]: verdict }));
  }

  /**
   * Extrait la concurrence paramétrée d'une campagne (`parametres.audit.concurrence`, RG-017), avec repli
   * documenté sur {@link CONCURRENCE_PAR_DEFAUT}. Simplifié à la Phase 10, incrément 8 (`parametres.audit`
   * désormais typé `ParametresAudit`, cf. `types-donnees.ts`) : accès direct sans traversée générique, la seule
   * prudence restante portant sur l'absence de racine chargée (`racine()` nullable) et sur une valeur paramétrée
   * invalide (zéro ou négative), même convention que `OrchestrateurCampagneService.extraireConcurrence`.
   * @returns La concurrence à appliquer.
   */
  private extraireConcurrence(): number {
    const valeur = this.donneesApplication.racine()?.parametres.audit.concurrence;
    return typeof valeur === 'number' && valeur > 0 ? valeur : CONCURRENCE_PAR_DEFAUT;
  }
}
