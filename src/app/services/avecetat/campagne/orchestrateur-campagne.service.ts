// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Orchestrateur de campagne (UI, Phase 5, incréments 4 et 5), tel que défini à l'étape 6
// (cf. docs/02_documentation/11_architectureTechnique.md#découpage-en-composantsmodules-et-responsabilités) :
// planifie l'interrogation des sources d'un périmètre de projets avec une concurrence limitée (RG-017), gère
// l'annulation propre (RG-018) et alimente le brouillon existant (`DonneesApplicationService.enregistrerBrouillon`,
// Phase 5 incrément 2) en invoquant le Connecteur GitLab et le Connecteur Sonar via `FacadeCommandesService`
// (Phase 5 incrément 1), et le Connecteur croisé (`ConnecteurCroiseUtils`, Phase 5 incrément 3). Classé sous
// `services/avecetat/campagne/` conformément à la structure fixée en Phase 0 (cf. README.md de ce dossier).
//
// Décision d'architecture (incrément 5, corrigeant l'incrément 4) : la progression réactive d'une campagne en
// cours n'est plus un signal interne de ce service, mais vit directement dans `EtatSessionService`
// (`services/avecetat/etat/etat-session.service.ts`), conformément au texte de la conception détaillée
// (`docs/02_documentation/13_conceptionDetaillee.md`, séquence « Réaliser une campagne d'audit » : « l'Orchestrateur
// de campagne met à jour l'état de progression directement dans le Store d'état applicatif »). Ce service reste
// donc, à la différence du Connecteur croisé (pur), porteur d'un unique état interne non partagé
// (`annulationDemandee`, un drapeau de contrôle du pipeline RxJS).
//
// Correction (Phase 12, constat R12-07) : `annulationDemandee` était jusqu'ici un simple booléen privé, jamais lu
// par un écran — un clic sur « Annuler la campagne » (Tableau de bord d'exécution) ne produisait donc strictement
// aucun retour visuel tant que les projets déjà en cours d'audit n'avaient pas atteint leur terme normalement
// (RG-018 : aucun désabonnement, résultats acquis conservés), ce qui pouvait durer plusieurs minutes selon le
// nombre de sources et de connecteurs concernés. Devenu un signal en lecture seule exposé aux écrans
// (`annulationDemandee`), pour que le bouton se désactive et change de libellé dès la demande, sans attendre la
// fin effective de l'annulation.
//
// Périmètre acté aux incréments 4/5 (décisions actées lors de sessions de clarification préalables avec
// l'utilisateur, cf. rapport de développement de cette phase) :
//   - RG-020 (détection d'aberrations) est traitée depuis l'incrément 4, pour les 3 indicateurs documentés
//     (`AberrationUtils`).
//   - Un projet est « succès » dès qu'au moins un résultat exploitable a été obtenu (résultats partiels conservés,
//     anomalies des appels échoués consignées) ; « échec » seulement si aucun résultat n'a pu être obtenu.
//   - `interrogerMarqueursIa` et `croise.ia_nouveau_code` sont livrés à l'incrément 7 (référentiel
//     `reglesMarqueursIA` extrait via `extraireReglesMarqueursIa`, jamais persisté par ce service).
//     `interrogerBranchesCompletes` (`gitlab.branches`) et `interrogerDependances` (`gitlab.dependances`) sont
//     câblés depuis l'incrément de rattrapage de la Phase 5 (précédant la Phase 6), les deux dernières opérations
//     du catalogue figé des résultats d'audit restées différées jusque-là.
//   - Le rapport d'anomalies détaillé (F08, RG-021 : catégorie/message/action suggérée/regroupement) reste un
//     incrément ultérieur ; les anomalies sont collectées ici sous une forme minimale (`{ indicateur, sourceId,
//     anomalie }`), décision arbitraire documentée dans le rapport de développement de cette phase.
//
// Évolution C15-14 (audit historique à date passée, US-046, RG-046) : `lancerCampagne`/`auditerProjet` reçoivent un
// paramètre optionnel `dateCiblee`, absent = comportement strictement inchangé (audit régulier). Renseigné, le
// périmètre d'indicateurs historisables est réduit (ni `gitlab.taille_depot`, ni `gitlab.membres`, ni
// `croise.ia_nouveau_code`, ce dernier dépendant structurellement de métriques `new_*` non historisables), une
// source GitLab dont la ref auditée est un SHA/tag figé est exclue des commandes GitLab de cet audit (dégradation
// par source, jamais un échec de campagne, cf. {@link verifierRefAuditeeHistorique}), et l'`Audit` produit porte
// `typeAudit: 'historique'`, `date` = la date ciblée demandée (jamais la date d'exécution réelle, cf. commentaire de
// `Audit.dateExecution` dans `types-donnees.ts`) et `dateExecution` = l'horodatage réel de la campagne. Le repli
// automatique sur la date Sonar disponible la plus proche en cas d'absence à la date demandée est intégralement
// géré côté cœur natif (transparent pour ce service).
import { Injectable, inject, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { EMPTY, firstValueFrom, from } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
import type {
  ErreurConnecteur,
  Instance,
  RegleMarqueurIA,
  ResultatGitlabContributeurs,
  ResultatGitlabMarqueursIa,
  ResultatGitlabTailleDepot,
  ResultatGitlabVitalite,
  ResultatSonarCouverture,
  ResultatSonarNcloc,
  ResultatSonarViolations,
} from '../../sansetat/commandes/types-facade';
import { FacadeCommandesService } from '../../sansetat/commandes/facade-commandes.service';
import { EtatSessionService } from '../etat/etat-session.service';
import { DonneesApplicationService } from '../etat/donnees-application.service';
import type {
  Audit,
  Groupe,
  Projet,
  Resultat,
  ResultatBrouillonProjet,
  ResultatMutationAdministration,
  Source,
  Verdict,
} from '../etat/types-donnees';
import { TypeSource } from '../etat/types-donnees';
import { ConnecteurCroiseUtils } from './connecteur-croise.utils';
import { AberrationUtils } from './aberration.utils';
import type { Aberration, ValeursComparablesAberration } from './aberration.utils';

/**
 * Valeur par défaut de la concurrence d'une campagne (RG-017), reprise de `parametres.audit.concurrence` de
 * `docs/01_besoin/exemple-donnees.json`, faute de valeur chiffrée dans les règles de gestion elles-mêmes :
 * décision arbitraire documentée dans le rapport de développement de cette phase, appliquée si `parametres` ne
 * porte pas cette clé (fichier créé avant l'introduction de ce paramètre, ou valeur malformée).
 */
const CONCURRENCE_PAR_DEFAUT = 4;

/**
 * Valeur par défaut du seuil de matérialité du brouillon (`parametres.seuils.materialiteBrouillon.
 * variationRelative`), reprise de `docs/01_besoin/exemple-donnees.json` selon la même convention que
 * {@link CONCURRENCE_PAR_DEFAUT}, seule valeur numérique consommée par les règles de détection d'aberration
 * (RG-020, cf. `aberration.utils.ts`).
 */
const VARIATION_RELATIVE_PAR_DEFAUT = 0.1;

/**
 * Estimation du coût et des credentials manquants d'un périmètre de campagne (US-012), retournée par
 * `constituerCampagne`.
 */
export interface ConstitutionCampagne {
  /** Nombre de projets du périmètre. */
  readonly nombreProjets: number;
  /** Nombre d'instances distinctes référencées par les sources des projets du périmètre. */
  readonly nombreInstances: number;
  /** Identifiants des instances référencées par le périmètre mais sans credential en mémoire. */
  readonly credentialsManquants: readonly string[];
}

/**
 * Orchestrateur de campagne (UI) : planifie et exécute les audits d'un périmètre de projets avec une concurrence
 * limitée (RG-017), gère l'annulation propre (RG-018) et alimente le brouillon existant. Cf. commentaire d'en-tête
 * de ce fichier pour le périmètre exact de cet incrément.
 */
@Injectable({ providedIn: 'root' })
export class OrchestrateurCampagneService {
  private readonly facadeCommandes: FacadeCommandesService = inject(FacadeCommandesService);
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly etatSession: EtatSessionService = inject(EtatSessionService);

  private readonly annulationDemandeeInterne: WritableSignal<boolean> = signal(false);

  /**
   * Indique si l'annulation de la campagne en cours a été demandée (RG-018, R12-07) : permet à un écran (Tableau
   * de bord d'exécution) de donner un retour visuel immédiat au clic sur « Annuler la campagne », alors même que
   * les projets déjà en cours d'audit continuent normalement jusqu'à leur terme (aucun désabonnement, résultats
   * acquis conservés) et que la campagne peut donc rester visuellement « en cours » un moment après la demande.
   * Remis à `false` au lancement de chaque nouvelle campagne ({@link lancerCampagne}).
   */
  public readonly annulationDemandee: Signal<boolean> = this.annulationDemandeeInterne.asReadonly();

  /**
   * Estime le coût prévisionnel d'un périmètre de campagne et contrôle la présence en mémoire des credentials
   * nécessaires (US-012), sans effet de bord ni appel réseau : lecture pure de l'état déjà chargé du Store.
   * @param perimetre - Identifiants des projets du périmètre envisagé.
   * @returns Le nombre de projets, le nombre d'instances distinctes concernées, et les instances sans credential.
   */
  public constituerCampagne(perimetre: readonly string[]): ConstitutionCampagne {
    const groupes = this.donneesApplication.groupes();
    const instancesReferencees = new Set<string>();
    for (const projetId of perimetre) {
      const resolution = this.resoudreProjetEtGroupe(groupes, projetId);
      if (resolution === undefined) {
        continue;
      }
      for (const source of resolution.projet.sources) {
        instancesReferencees.add(source.instanceId);
      }
    }
    const credentials = this.etatSession.credentials();
    const credentialsManquants = Array.from(instancesReferencees).filter(
      (instanceId) => credentials?.[instanceId] === undefined,
    );
    return {
      nombreProjets: perimetre.length,
      nombreInstances: instancesReferencees.size,
      credentialsManquants,
    };
  }

  /**
   * Lance une campagne d'audit sur le périmètre donné (US-009) : interroge chaque projet avec une concurrence
   * limitée et paramétrable (RG-017), puis alimente le brouillon existant (`DonneesApplicationService.
   * enregistrerBrouillon`) une fois le périmètre intégralement traité ou l'annulation prise en compte (RG-018).
   * @param perimetre - Identifiants des projets du périmètre de la campagne.
   * @param motDePasse - Mot de passe du fichier, ressaisi par l'utilisateur pour la sauvegarde du brouillon
   * (RG-002).
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, US-046, RG-046, format `AAAA-MM-JJ`) ; absente,
   * comportement strictement inchangé (audit régulier à la date du jour). Cf. commentaire d'en-tête de ce fichier
   * pour le détail du périmètre réduit appliqué lorsqu'elle est renseignée.
   * @returns Le Résultat typé de l'enregistrement du brouillon (`DonneesApplicationService.enregistrerBrouillon`).
   */
  public async lancerCampagne(
    perimetre: readonly string[],
    motDePasse: string,
    dateCiblee?: string,
  ): Promise<ResultatMutationAdministration> {
    this.annulationDemandeeInterne.set(false);
    this.etatSession.demarrerProgressionCampagne(perimetre);

    const campagneId = crypto.randomUUID();
    const concurrence = this.extraireConcurrence();
    const resultatsProjets = await firstValueFrom(
      from(perimetre).pipe(
        mergeMap((projetId) => {
          if (this.annulationDemandeeInterne()) {
            return EMPTY;
          }
          return from(this.auditerProjet(projetId, campagneId, dateCiblee));
        }, concurrence),
        toArray(),
      ),
    );

    const projetsTraites = new Map(
      resultatsProjets.map((resultat) => [resultat.projetId, resultat]),
    );
    const verdicts: Verdict[] = perimetre.map((projetId) => {
      const resultat = projetsTraites.get(projetId);
      if (resultat === undefined) {
        this.etatSession.mettreAJourProgressionProjet(projetId, { statut: 'ignore' });
        return { projetId, statut: 'ignore' };
      }
      return resultat.verdict;
    });
    const resultatsParProjet: ResultatBrouillonProjet[] = resultatsProjets
      .map((resultat) => resultat.resultatBrouillon)
      .filter((resultat): resultat is ResultatBrouillonProjet => resultat !== undefined);

    const date = new Date().toISOString();
    return this.donneesApplication.enregistrerBrouillon(
      campagneId,
      date,
      perimetre,
      verdicts,
      resultatsParProjet,
      motDePasse,
    );
  }

  /**
   * Demande l'annulation propre de la campagne en cours (RG-018, US-011) : les projets déjà en cours d'audit vont
   * à leur terme normalement (aucun désabonnement, résultats acquis conservés), aucun nouveau projet n'est
   * soumis ; les projets ainsi non traités rejoignent le statut « ignoré ».
   */
  public annulerCampagne(): void {
    this.annulationDemandeeInterne.set(true);
  }

  /**
   * Audite un projet du périmètre : interroge chacune de ses sources GitLab/Sonar (en tenant compte des
   * indicateurs désactivés pour son groupe, US-009), calcule les résultats croisés déjà livrés
   * (`ConnecteurCroiseUtils`), détermine le verdict d'exécution (succès dès qu'un résultat exploitable existe,
   * cf. commentaire d'en-tête de ce fichier) et, en cas de succès, les aberrations RG-020 par comparaison avec le
   * dernier audit intégré du projet.
   * @param projetId - Identifiant du projet à auditer.
   * @param campagneId - Identifiant de la campagne en cours, reporté dans l'`Audit` produit en cas de succès.
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, US-046, RG-046) ; absente, comportement
   * strictement inchangé (audit régulier), cf. commentaire d'en-tête de ce fichier pour le périmètre réduit
   * appliqué lorsqu'elle est renseignée.
   * @returns Le verdict d'exécution et, en cas de succès, l'entrée de brouillon prête à être proposée.
   */
  private async auditerProjet(
    projetId: string,
    campagneId: string,
    dateCiblee?: string,
  ): Promise<{
    readonly projetId: string;
    readonly verdict: Verdict;
    readonly resultatBrouillon?: ResultatBrouillonProjet;
  }> {
    const modeHistorique = dateCiblee !== undefined;
    const debut = Date.now();
    this.etatSession.mettreAJourProgressionProjet(projetId, { statut: 'enCours' });
    const resolution = this.resoudreProjetEtGroupe(this.donneesApplication.groupes(), projetId);
    if (resolution === undefined) {
      this.etatSession.mettreAJourProgressionProjet(projetId, {
        statut: 'echoue',
        dureeMs: Date.now() - debut,
        motifEchec: 'Projet introuvable dans les groupes actuels',
      });
      return { projetId, verdict: { projetId, statut: 'echec' } };
    }

    const resultats: Resultat[] = [];
    const anomalies: unknown[] = [];
    let dernierMotifEchec: string | undefined;
    let vitalite: ResultatGitlabVitalite | undefined;
    let tailleDepot: ResultatGitlabTailleDepot | undefined;
    let contributeurs: ResultatGitlabContributeurs | undefined;
    let violations: ResultatSonarViolations | undefined;
    let couverture: ResultatSonarCouverture | undefined;
    let ncloc: ResultatSonarNcloc | undefined;
    let derniereAnalyse: string | null | undefined;
    let marqueursIa: ResultatGitlabMarqueursIa | undefined;

    for (const source of resolution.projet.sources) {
      const instance = resolution.groupe.instances.find(
        (candidate) => candidate.id === source.instanceId,
      );
      if (instance === undefined) {
        // R10-09 : une source dont l'instance associée n'existe plus dans le groupe était jusqu'ici ignorée
        // silencieusement (source de configuration invalide, jamais consignée) ; consignée désormais comme une
        // anomalie explicite, sur le même modèle minimal `{ indicateur, sourceId, anomalie }` que les échecs d'appel
        // (cf. commentaire d'en-tête de ce fichier), afin de rester visible dans le rapport d'anomalies (F08).
        anomalies.push({
          indicateur: 'source.instanceIntrouvable',
          sourceId: source.id,
          anomalie: {
            type: 'instanceIntrouvable',
            message: `Instance ${source.instanceId} introuvable dans le groupe ${resolution.groupe.id}`,
          },
        });
        continue;
      }
      this.etatSession.mettreAJourProgressionProjet(projetId, {
        connecteurActif: source.type === TypeSource.DepotGitlab ? 'gitlab' : 'sonar',
      });
      if (source.type === TypeSource.DepotGitlab) {
        const verificationRef = await this.verifierRefAuditeeHistorique(
          instance,
          source,
          dateCiblee,
        );
        if (verificationRef.exclue) {
          anomalies.push(verificationRef.anomalieEntree);
          dernierMotifEchec = verificationRef.motif;
          continue;
        }

        const reponseVitalite = await this.executerIndicateur(
          'gitlab.vitalite',
          resolution.groupe.indicateursDesactives,
          source.id,
          () =>
            this.facadeCommandes.interrogerVitalite(
              instance,
              source.id,
              source.idExterne,
              source.refAuditee,
              dateCiblee,
            ),
        );
        dernierMotifEchec =
          this.integrer(reponseVitalite, resultats, anomalies) ?? dernierMotifEchec;
        vitalite = reponseVitalite.resultatBrut;

        // `gitlab.taille_depot` n'est jamais interrogé en mode historique (RG-046 : absence tolérée, un audit à
        // date passée ne saurait reconstituer une taille de dépôt à cette date sans nouvel appel API non couvert
        // par le plan retenu) : `comptesTailleDepot` reste à 0 dans ce cas pour le résumé de fin de source.
        let comptesTailleDepot = 0;
        if (!modeHistorique) {
          const reponseTaille = await this.executerIndicateur(
            'gitlab.taille_depot',
            resolution.groupe.indicateursDesactives,
            source.id,
            () =>
              this.facadeCommandes.interrogerTailleDepot(
                instance,
                source.id,
                source.idExterne,
                source.refAuditee,
              ),
          );
          dernierMotifEchec =
            this.integrer(reponseTaille, resultats, anomalies) ?? dernierMotifEchec;
          tailleDepot = reponseTaille.resultatBrut;
          comptesTailleDepot = reponseTaille.resultatBrut === undefined ? 0 : 1;
        }

        const reponseContributeurs = await this.executerIndicateur(
          'gitlab.contributeurs',
          resolution.groupe.indicateursDesactives,
          source.id,
          () =>
            this.facadeCommandes.interrogerContributeurs(
              instance,
              source.id,
              source.idExterne,
              source.refAuditee,
              dateCiblee,
            ),
        );
        dernierMotifEchec =
          this.integrer(reponseContributeurs, resultats, anomalies) ?? dernierMotifEchec;
        contributeurs = reponseContributeurs.resultatBrut;

        const reponseMergeRequests = await this.executerIndicateur(
          'gitlab.merge_requests',
          resolution.groupe.indicateursDesactives,
          source.id,
          () =>
            this.facadeCommandes.interrogerMergeRequests(
              instance,
              source.id,
              source.idExterne,
              source.refAuditee,
              dateCiblee,
            ),
        );
        dernierMotifEchec =
          this.integrer(reponseMergeRequests, resultats, anomalies) ?? dernierMotifEchec;

        // `gitlab.membres` n'est jamais interrogé en mode historique (RG-046 : absence tolérée, même principe que
        // `gitlab.taille_depot` ci-dessus).
        let comptesMembres = 0;
        if (!modeHistorique) {
          const reponseMembres = await this.executerIndicateur(
            'gitlab.membres',
            resolution.groupe.indicateursDesactives,
            source.id,
            () =>
              this.facadeCommandes.interrogerMembres(
                instance,
                source.id,
                source.idExterne,
                source.refAuditee,
              ),
          );
          dernierMotifEchec =
            this.integrer(reponseMembres, resultats, anomalies) ?? dernierMotifEchec;
          comptesMembres = reponseMembres.resultatBrut?.membres.length ?? 0;
        }

        const reponseBranches = await this.executerIndicateur(
          'gitlab.branches',
          resolution.groupe.indicateursDesactives,
          source.id,
          () =>
            this.facadeCommandes.interrogerBranchesCompletes(
              instance,
              source.id,
              source.idExterne,
              source.refAuditee,
              dateCiblee,
            ),
        );
        dernierMotifEchec =
          this.integrer(reponseBranches, resultats, anomalies) ?? dernierMotifEchec;

        const reponseDependances = await this.executerIndicateur(
          'gitlab.dependances',
          resolution.groupe.indicateursDesactives,
          source.id,
          () =>
            this.facadeCommandes.interrogerDependances(
              instance,
              source.id,
              source.idExterne,
              source.refAuditee,
              dateCiblee,
            ),
        );
        dernierMotifEchec =
          this.integrer(reponseDependances, resultats, anomalies) ?? dernierMotifEchec;

        const reponseMarqueursIa = await this.executerIndicateur(
          'gitlab.marqueurs_ia',
          resolution.groupe.indicateursDesactives,
          source.id,
          () =>
            this.facadeCommandes.interrogerMarqueursIa(
              instance,
              source.id,
              source.idExterne,
              this.extraireReglesMarqueursIa(),
              source.refAuditee,
              dateCiblee,
            ),
        );
        dernierMotifEchec =
          this.integrer(reponseMarqueursIa, resultats, anomalies) ?? dernierMotifEchec;
        marqueursIa = reponseMarqueursIa.resultatBrut;

        // Diagnostic de R15-06 (un projet à deux sources GitLab n'affichant les dépendances que d'un seul des deux
        // dépôts) : consigne, dans le journal technique local, le nombre d'items obtenus par type pour CETTE seule
        // source (jamais un total par projet), afin de confirmer si chaque source produit bien ses propres
        // résultats côté cœur natif avant toute nouvelle hypothèse d'agrégation.
        await this.facadeCommandes.consignerResumeSource(source.id, source.idExterne, {
          'gitlab.vitalite': reponseVitalite.resultatBrut === undefined ? 0 : 1,
          'gitlab.taille_depot': comptesTailleDepot,
          'gitlab.contributeurs': reponseContributeurs.resultatBrut?.contributeurs.length ?? 0,
          'gitlab.merge_requests': reponseMergeRequests.resultatBrut?.mrOuvertes.length ?? 0,
          'gitlab.membres': comptesMembres,
          'gitlab.branches': reponseBranches.resultatBrut?.branches.length ?? 0,
          'gitlab.dependances': reponseDependances.resultatBrut?.dependances.length ?? 0,
          'gitlab.marqueurs_ia': reponseMarqueursIa.resultatBrut?.marqueurs.length ?? 0,
        });
      } else {
        const reponseViolations = await this.executerIndicateur(
          'sonar.violations',
          resolution.groupe.indicateursDesactives,
          source.id,
          () =>
            this.facadeCommandes.interrogerViolations(
              instance,
              source.id,
              source.idExterne,
              dateCiblee,
            ),
        );
        dernierMotifEchec =
          this.integrer(reponseViolations, resultats, anomalies) ?? dernierMotifEchec;
        violations = reponseViolations.resultatBrut;

        const reponseDette = await this.executerIndicateur(
          'sonar.dette',
          resolution.groupe.indicateursDesactives,
          source.id,
          () =>
            this.facadeCommandes.interrogerDette(instance, source.id, source.idExterne, dateCiblee),
        );
        dernierMotifEchec = this.integrer(reponseDette, resultats, anomalies) ?? dernierMotifEchec;

        const reponseCouverture = await this.executerIndicateur(
          'sonar.couverture',
          resolution.groupe.indicateursDesactives,
          source.id,
          () =>
            this.facadeCommandes.interrogerCouverture(
              instance,
              source.id,
              source.idExterne,
              dateCiblee,
            ),
        );
        dernierMotifEchec =
          this.integrer(reponseCouverture, resultats, anomalies) ?? dernierMotifEchec;
        couverture = reponseCouverture.resultatBrut;

        const reponseNotes = await this.executerIndicateur(
          'sonar.notes',
          resolution.groupe.indicateursDesactives,
          source.id,
          () =>
            this.facadeCommandes.interrogerNotes(instance, source.id, source.idExterne, dateCiblee),
        );
        dernierMotifEchec = this.integrer(reponseNotes, resultats, anomalies) ?? dernierMotifEchec;

        const reponseNcloc = await this.executerIndicateur(
          'sonar.ncloc',
          resolution.groupe.indicateursDesactives,
          source.id,
          () =>
            this.facadeCommandes.interrogerNcloc(instance, source.id, source.idExterne, dateCiblee),
        );
        dernierMotifEchec = this.integrer(reponseNcloc, resultats, anomalies) ?? dernierMotifEchec;
        ncloc = reponseNcloc.resultatBrut;

        let derniereAnalyseObtenueCetteSource = false;
        if (!resolution.groupe.indicateursDesactives.includes('croise.fraicheur_sonar')) {
          const reponseDerniereAnalyse = await this.facadeCommandes.interrogerDerniereAnalyse(
            instance,
            source.idExterne,
            dateCiblee,
          );
          if (reponseDerniereAnalyse.type === 'succes') {
            derniereAnalyse = reponseDerniereAnalyse.resultat;
            derniereAnalyseObtenueCetteSource = true;
          } else {
            anomalies.push({
              indicateur: 'croise.fraicheur_sonar',
              sourceId: source.id,
              anomalie: reponseDerniereAnalyse.anomalie,
            });
            dernierMotifEchec = `croise.fraicheur_sonar : ${reponseDerniereAnalyse.anomalie.type}`;
          }
        }

        // Diagnostic de R15-06 (cf. commentaire symétrique de la branche GitLab ci-dessus) : résumé de fin
        // d'analyse de cette seule source Sonar.
        await this.facadeCommandes.consignerResumeSource(source.id, source.idExterne, {
          'sonar.violations': reponseViolations.resultatBrut === undefined ? 0 : 1,
          'sonar.dette': reponseDette.resultatBrut === undefined ? 0 : 1,
          'sonar.couverture': reponseCouverture.resultatBrut === undefined ? 0 : 1,
          'sonar.notes': reponseNotes.resultatBrut === undefined ? 0 : 1,
          'sonar.ncloc': reponseNcloc.resultatBrut === undefined ? 0 : 1,
          'croise.fraicheur_sonar': derniereAnalyseObtenueCetteSource ? 1 : 0,
        });
      }
    }

    // Garde alignée sur celle de `croise.activite_sans_qualite` ci-dessous (relecture de cet incrément) : couvre
    // désormais aussi le cas où `vitalite` a pu être obtenue mais `interrogerDerniereAnalyse` a échoué ou est
    // désactivé (`derniereAnalyse` alors `undefined`), auparavant ignoré à tort par une garde ne testant que
    // `derniereAnalyse`. Une confirmation Sonar « jamais analysé » (`derniereAnalyse === null`, une donnée réelle,
    // non `undefined`) reste volontairement traitée comme suffisante à elle seule, y compris sans `vitalite` :
    // décision arbitraire alignée sur le précédent déjà validé en relecture de l'incrément 3 (un tableau de
    // contributeurs présent mais vide compte déjà comme exploitable, distinct d'une source absente), verrouillée
    // par un test dédié (`orchestrateur-campagne.service.spec.ts`).
    if (
      !resolution.groupe.indicateursDesactives.includes('croise.fraicheur_sonar') &&
      (vitalite !== undefined || derniereAnalyse !== undefined)
    ) {
      resultats.push({
        type: 'croise.fraicheur_sonar',
        ...ConnecteurCroiseUtils.calculerFraicheurSonar(
          vitalite?.dernierCommitLe,
          derniereAnalyse ?? undefined,
        ),
      });
    }
    if (
      !resolution.groupe.indicateursDesactives.includes('croise.activite_sans_qualite') &&
      (contributeurs !== undefined || violations !== undefined)
    ) {
      resultats.push({
        type: 'croise.activite_sans_qualite',
        ...ConnecteurCroiseUtils.calculerActiviteSansQualite(contributeurs, violations),
      });
    }
    // `croise.ia_nouveau_code` n'est jamais calculé en mode historique (C15-14, RG-046) : ce résultat croisé
    // dépend structurellement de métriques Sonar `new_*` (nouveau code depuis la dernière analyse), non
    // historisables — un calcul à une date passée n'aurait ici aucun sens fonctionnel, contrairement à
    // `croise.fraicheur_sonar`/`croise.activite_sans_qualite` ci-dessus, recalculés normalement même en mode
    // historique à partir des résultats disponibles (éventuellement partiels).
    if (
      !modeHistorique &&
      !resolution.groupe.indicateursDesactives.includes('croise.ia_nouveau_code') &&
      (marqueursIa !== undefined || couverture !== undefined || violations !== undefined)
    ) {
      resultats.push({
        type: 'croise.ia_nouveau_code',
        ...ConnecteurCroiseUtils.calculerIaNouveauCode(marqueursIa, couverture, violations),
      });
    }

    if (resultats.length === 0) {
      this.etatSession.mettreAJourProgressionProjet(projetId, {
        statut: 'echoue',
        dureeMs: Date.now() - debut,
        motifEchec: dernierMotifEchec ?? 'Aucun résultat obtenu',
      });
      return { projetId, verdict: { projetId, statut: 'echec', anomalies } };
    }

    const nouveau: ValeursComparablesAberration = {
      tailleOctets: tailleDepot?.tailleOctets,
      ncloc: ncloc?.ncloc,
      couverture: couverture?.couverture,
    };
    const ancien = this.extraireValeursDernierAuditIntegre(resolution.projet.audits);
    const aberrations: readonly Aberration[] = AberrationUtils.detecterAberrations(
      ancien,
      nouveau,
      this.extraireVariationRelative(),
    );

    this.etatSession.mettreAJourProgressionProjet(projetId, {
      statut: 'termine',
      dureeMs: Date.now() - debut,
      nombreResultats: resultats.length,
    });
    const auditId = crypto.randomUUID();
    // Construction de l'`Audit` produit (C15-14, RG-046) : un audit régulier porte `date` = l'horodatage réel
    // d'exécution et `typeAudit: 'reguliere'`, sans `dateExecution` (comportement strictement inchangé) ; un audit
    // historique porte `date` = la date ciblée demandée (jamais l'horodatage réel, cf. commentaire d'en-tête de ce
    // fichier et de `Audit.date`/`Audit.dateExecution` dans `types-donnees.ts`) et `dateExecution` = l'horodatage
    // réel de la campagne qui l'a produit.
    const audit: Audit =
      dateCiblee === undefined
        ? {
            id: auditId,
            date: new Date().toISOString(),
            campagneId,
            resultats,
            typeAudit: 'reguliere',
          }
        : {
            id: auditId,
            date: dateCiblee,
            campagneId,
            resultats,
            typeAudit: 'historique',
            dateExecution: new Date().toISOString(),
          };
    return {
      projetId,
      verdict: {
        projetId,
        statut: 'succes',
        anomalies: anomalies.length > 0 ? anomalies : undefined,
      },
      resultatBrouillon: {
        projetId,
        audit,
        statut: 'enAttente',
        aberrations,
      },
    };
  }

  /**
   * Vérifie, en mode audit historique (`dateCiblee` renseigné), qu'une source GitLab n'est pas figée sur un
   * SHA/tag (C15-14, RG-046, refus arbitré lors du cadrage de cette évolution) : une ref auditée strictement figée
   * n'a par nature aucun sens à une date différente de celle où elle a été fixée. Réutilise `interrogerBranches`
   * (autocomplétion existante, US-008) plutôt qu'un nouveau contrôle côté cœur natif : une branche vivante est
   * acceptée (les commandes historisables résolvent alors elles-mêmes, côté cœur natif, le commit de cette branche
   * à la date ciblée), un SHA/tag figé ou une branche supprimée entretemps sont refusés — dégradation par source
   * (aucune commande GitLab n'est alors appelée pour cette source), jamais un échec de campagne. L'absence de
   * `refAuditee` (branche par défaut du dépôt) est toujours acceptée sans appel, la branche par défaut restant par
   * construction vivante ; de même en mode régulier (`dateCiblee` absent), où cette vérification n'a pas lieu
   * d'être.
   * @param instance - Instance GitLab hébergeant le dépôt de la source à vérifier.
   * @param source - Source GitLab à vérifier.
   * @param dateCiblee - Date ciblée de l'audit historique ; `undefined` = audit régulier, aucune vérification.
   * @returns `{ exclue: false }` si la source peut être auditée (audit régulier, branche par défaut, ou ref vivante
   * confirmée) ; sinon l'anomalie à consigner (forme minimale `{ indicateur, sourceId, anomalie }`, cf. commentaire
   * d'en-tête de ce fichier) et le motif d'échec court associé.
   */
  private async verifierRefAuditeeHistorique(
    instance: Instance,
    source: Source,
    dateCiblee: string | undefined,
  ): Promise<
    | { readonly exclue: false }
    | {
        readonly exclue: true;
        readonly anomalieEntree: Record<string, unknown>;
        readonly motif: string;
      }
  > {
    if (dateCiblee === undefined || source.refAuditee === undefined) {
      return { exclue: false };
    }
    const reponse = await this.facadeCommandes.interrogerBranches(
      instance,
      source.idExterne,
      source.refAuditee,
    );
    if (reponse.type === 'echec') {
      return {
        exclue: true,
        anomalieEntree: {
          indicateur: 'gitlab.refFigee',
          sourceId: source.id,
          anomalie: reponse.anomalie,
        },
        motif: `gitlab.refFigee : ${reponse.anomalie.type}`,
      };
    }
    if (!reponse.branches.includes(source.refAuditee)) {
      return {
        exclue: true,
        anomalieEntree: {
          indicateur: 'gitlab.refFigee',
          sourceId: source.id,
          anomalie: {
            type: 'refFigeeNonAuditable',
            message:
              `Ref auditée « ${source.refAuditee} » absente des branches vivantes du dépôt : audit ` +
              'historique refusé pour cette source (SHA/tag figé présumé).',
          },
        },
        motif: `gitlab.refFigee : ref « ${source.refAuditee} » non vivante`,
      };
    }
    return { exclue: false };
  }

  /**
   * Invoque une opération d'interrogation d'indicateur, sauf si son tag figure parmi les indicateurs désactivés
   * du groupe (US-009 : « indicateurs coûteux désactivables par groupe »). Le tag est contraint au discriminant
   * `Resultat['type']` (Phase 6, incrément 1) : le type de retour attendu de `appel` (et donc de `resultatBrut`)
   * s'en déduit automatiquement comme la charge utile de la variante `Resultat` correspondante, vérifiée par le
   * compilateur à chaque site d'appel plutôt que par un simple `string` non contraint.
   * @param tag - Tag `Resultat` de l'indicateur (`#[serde(rename = "...")]` côté cœur natif, ex. `gitlab.vitalite`).
   * @param indicateursDesactives - Indicateurs désactivés du groupe du projet audité.
   * @param sourceId - Identifiant de la source concernée, reporté dans l'anomalie en cas d'échec.
   * @param appel - Appel de la Façade de commandes à effectuer si l'indicateur n'est pas désactivé.
   * @returns Le résultat brut typé (pour les calculs croisés/aberrations), le résultat tagué prêt pour le
   * brouillon, et l'anomalie éventuelle : chaque champ absent selon le cas (désactivé, succès ou échec).
   */
  private async executerIndicateur<TTag extends Resultat['type']>(
    tag: TTag,
    indicateursDesactives: readonly string[],
    sourceId: string,
    appel: () => Promise<
      | {
          readonly type: 'succes';
          readonly resultat: Omit<Extract<Resultat, { readonly type: TTag }>, 'type'>;
        }
      | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur }
    >,
  ): Promise<{
    readonly resultatBrut?: Omit<Extract<Resultat, { readonly type: TTag }>, 'type'>;
    readonly resultatTague?: Record<string, unknown>;
    readonly anomalieEntree?: Record<string, unknown>;
    readonly motif?: string;
  }> {
    if (indicateursDesactives.includes(tag)) {
      return {};
    }
    const reponse = await appel();
    if (reponse.type === 'succes') {
      return { resultatBrut: reponse.resultat, resultatTague: { type: tag, ...reponse.resultat } };
    }
    return {
      anomalieEntree: { indicateur: tag, sourceId, anomalie: reponse.anomalie },
      motif: `${tag} : ${reponse.anomalie.type}`,
    };
  }

  /**
   * Vérifie qu'une valeur porte un champ `type` de type `string`, condition nécessaire à son appartenance à
   * l'union {@link Resultat}. Type-guard utilisateur plutôt qu'une assertion `as` (interdite sans exception par
   * la configuration ESLint du projet, `@typescript-eslint/consistent-type-assertions: 'never'`) : la correction
   * réelle repose sur l'invariant local de {@link executerIndicateur}, seul appelant de {@link integrer}, qui
   * construit toujours `resultatTague` en associant le `tag` demandé (contraint à `Resultat['type']`) à la
   * charge utile exacte renvoyée par un appel de la Façade de commandes typé en conséquence.
   * @param valeur - Résultat tagué construit par {@link executerIndicateur}.
   * @returns `true` si `valeur` porte un champ `type` de type `string`.
   */
  private estResultatTypeConnu(valeur: unknown): valeur is Resultat {
    return this.estObjetIndexable(valeur) && typeof valeur['type'] === 'string';
  }

  /**
   * Reporte le résultat d'{@link executerIndicateur} dans les tableaux locaux de résultats/anomalies de l'appelant
   * (locaux à chaque appel d'`auditerProjet`, jamais un état partagé entre projets exécutés en parallèle).
   * @param reponse - Résultat retourné par {@link executerIndicateur}.
   * @param reponse.resultatTague - Résultat tagué à ajouter, absent si désactivé ou en échec.
   * @param reponse.anomalieEntree - Anomalie à ajouter, absente si désactivé ou en succès.
   * @param reponse.motif - Motif court de l'échec, absent si désactivé ou en succès.
   * @param resultats - Tableau local des résultats typés déjà obtenus pour ce projet.
   * @param anomalies - Tableau local des anomalies déjà rencontrées pour ce projet.
   * @returns Le motif court de cet appel s'il a échoué, `undefined` sinon (désactivé ou succès).
   */
  private integrer(
    reponse: {
      readonly resultatTague?: Record<string, unknown>;
      readonly anomalieEntree?: Record<string, unknown>;
      readonly motif?: string;
    },
    resultats: Resultat[],
    anomalies: unknown[],
  ): string | undefined {
    if (reponse.resultatTague !== undefined && this.estResultatTypeConnu(reponse.resultatTague)) {
      resultats.push(reponse.resultatTague);
    }
    if (reponse.anomalieEntree !== undefined) {
      anomalies.push(reponse.anomalieEntree);
    }
    return reponse.motif;
  }

  /**
   * Résout un projet et son groupe parent à partir de son identifiant (le périmètre d'une campagne ne porte que
   * des identifiants de projet, sans groupe associé).
   * @param groupes - Groupes de la racine courante.
   * @param projetId - Identifiant du projet à résoudre.
   * @returns Le projet et son groupe parent, `undefined` si l'identifiant ne désigne plus aucun projet existant.
   */
  private resoudreProjetEtGroupe(
    groupes: readonly Groupe[],
    projetId: string,
  ): { readonly projet: Projet; readonly groupe: Groupe } | undefined {
    for (const groupe of groupes) {
      const projet = groupe.projets.find((candidat) => candidat.id === projetId);
      if (projet !== undefined) {
        return { projet, groupe };
      }
    }
    return undefined;
  }

  /**
   * Extrait, du dernier audit intégré d'un projet, les 3 valeurs comparables par RG-020 (`AberrationUtils`).
   * Simplifié à la Phase 6, incrément 1 (`resultats` désormais typé {@link Resultat}, cf. suppression de
   * l'ancien couple `extraireChampNumerique`/`estResultatTague`, devenu inutile) : narrowing direct par
   * discriminant `type` plutôt que par accès non sûr à une valeur `unknown`.
   * @param audits - Historique des audits intégrés du projet (`Projet.audits`, ordre d'intégration).
   * @returns Les valeurs extraites, `undefined` si le projet n'a encore aucun audit intégré (premier audit).
   */
  private extraireValeursDernierAuditIntegre(
    audits: readonly Audit[],
  ): ValeursComparablesAberration | undefined {
    const dernierAudit = audits.at(-1);
    if (dernierAudit === undefined) {
      return undefined;
    }
    return {
      tailleOctets: dernierAudit.resultats.find(
        (resultat): resultat is Extract<Resultat, { readonly type: 'gitlab.taille_depot' }> =>
          resultat.type === 'gitlab.taille_depot',
      )?.tailleOctets,
      ncloc: dernierAudit.resultats.find(
        (resultat): resultat is Extract<Resultat, { readonly type: 'sonar.ncloc' }> =>
          resultat.type === 'sonar.ncloc',
      )?.ncloc,
      couverture: dernierAudit.resultats.find(
        (resultat): resultat is Extract<Resultat, { readonly type: 'sonar.couverture' }> =>
          resultat.type === 'sonar.couverture',
      )?.couverture,
    };
  }

  /**
   * Type-guard sans assertion `as` : vérifie qu'une valeur `unknown` est un objet non nul, donc indexable en
   * sûreté par une clé dynamique (contrairement à l'opérateur `in` seul, qui ne suffit pas à narrower un type
   * indexable pour une clé non littérale). Utilisé par la détection du type de résultat brut d'un audit (ligne
   * ~596), par {@link validerRegleMarqueurIa} (contenu de `referentiels.reglesMarqueursIA` non typé item par item)
   * et par {@link extraireVariationRelative} (`parametres.seuils`, `serde_json::Value` générique côté cœur natif).
   * @param valeur - Valeur à vérifier.
   * @returns `true` si `valeur` est un objet non nul.
   */
  private estObjetIndexable(valeur: unknown): valeur is Record<string, unknown> {
    return typeof valeur === 'object' && valeur !== null;
  }

  /**
   * Extrait la concurrence paramétrée d'une campagne (`parametres.audit.concurrence`, RG-017), avec repli
   * documenté sur {@link CONCURRENCE_PAR_DEFAUT}. Simplifié à la Phase 10, incrément 8 (`parametres.audit`
   * désormais typé `ParametresAudit`, cf. `types-donnees.ts`) : accès direct sans traversée générique, la seule
   * prudence restante portant sur l'absence de racine chargée (`racine()` nullable) et sur une valeur paramétrée
   * invalide (zéro ou négative).
   * @returns La concurrence à appliquer.
   */
  private extraireConcurrence(): number {
    const valeur = this.donneesApplication.racine()?.parametres.audit.concurrence;
    return typeof valeur === 'number' && valeur > 0 ? valeur : CONCURRENCE_PAR_DEFAUT;
  }

  /**
   * Extrait le seuil de matérialité paramétré du brouillon (`parametres.seuils.materialiteBrouillon.
   * variationRelative`, RG-020), avec repli documenté sur {@link VARIATION_RELATIVE_PAR_DEFAUT}. À la différence de
   * {@link extraireConcurrence}, `parametres.seuils` reste côté cœur natif un `serde_json::Value` générique, non une
   * structure Rust typée (`src-tauri/src/modele/racine.rs`, hors périmètre détaillé de la Phase 1) : sa valeur par
   * défaut y est `null`, aussi bien pour un fichier tout juste créé que pour un fichier antérieur à l'ajout de ce
   * champ. Le typage TypeScript `SeuilsJugement` de `parametres.seuils` (`types-donnees.ts`) ne reflète donc pas
   * fidèlement cette possibilité réelle ; traversée via {@link estObjetIndexable} (comme pour tout accès à une
   * valeur JSON non garantie par un type Rust propre) plutôt qu'un enchaînement de propriétés typées, pour ne pas
   * lever d'exception nonInterceptée sur ce cas réel plutôt que théorique (corrigé à la suite d'un blocage de
   * campagne d'audit provoqué par ce `null`, cf. rapport de développement).
   * @returns Le seuil de matérialité à appliquer.
   */
  private extraireVariationRelative(): number {
    const seuils: unknown = this.donneesApplication.racine()?.parametres.seuils;
    const materialiteBrouillon = this.estObjetIndexable(seuils)
      ? seuils['materialiteBrouillon']
      : undefined;
    const valeur = this.estObjetIndexable(materialiteBrouillon)
      ? materialiteBrouillon['variationRelative']
      : undefined;
    return typeof valeur === 'number' && valeur > 0 ? valeur : VARIATION_RELATIVE_PAR_DEFAUT;
  }

  /**
   * Extrait le référentiel de règles de détection des marqueurs IA (`referentiels.reglesMarqueursIA`, F18).
   * Simplifié à la Phase 6, incrément 1 (`referentiels` désormais typé `Referentiels`, cf. `types-donnees.ts`) :
   * `reglesMarqueursIA` est déjà garanti tableau, seul le contenu de chaque élément reste `unknown` (règles
   * détaillées hors périmètre avant la Phase 7, Paramétrage). Toute entrée ne correspondant pas à la forme
   * attendue est ignorée silencieusement plutôt que de faire échouer l'audit du projet.
   * @returns Les règles valides du référentiel, tableau vide si absent ou malformé.
   */
  private extraireReglesMarqueursIa(): readonly RegleMarqueurIA[] {
    const regles = this.donneesApplication.racine()?.referentiels.reglesMarqueursIA ?? [];
    const reglesValides: RegleMarqueurIA[] = [];
    for (const regle of regles) {
      const regleValide = this.validerRegleMarqueurIa(regle);
      if (regleValide !== undefined) {
        reglesValides.push(regleValide);
      }
    }
    return reglesValides;
  }

  /**
   * Valide qu'une entrée brute du référentiel de marqueurs IA correspond à la forme attendue de `RegleMarqueurIA`,
   * sans assertion `as` non justifiée.
   * @param valeur - Entrée brute du référentiel, de type `unknown`.
   * @returns La règle validée, `undefined` si `valeur` ne correspond pas à la forme attendue.
   */
  private validerRegleMarqueurIa(valeur: unknown): RegleMarqueurIA | undefined {
    if (!this.estObjetIndexable(valeur)) {
      return undefined;
    }
    const { motif, typeCorrespondance, portee, nature, outil } = valeur;
    if (
      typeof motif !== 'string' ||
      typeof outil !== 'string' ||
      (typeCorrespondance !== 'exact' && typeCorrespondance !== 'motif') ||
      (portee !== 'racine' && portee !== 'partout') ||
      (nature !== 'fichier' && nature !== 'repertoire')
    ) {
      return undefined;
    }
    return { motif, typeCorrespondance, portee, nature, outil };
  }
}
