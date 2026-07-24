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
// (`annulationDemandee`, un simple drapeau de contrôle du pipeline RxJS, jamais lu par un écran).
//
// Périmètre acté aux incréments 4/5 (décisions actées lors de sessions de clarification préalables avec
// l'utilisateur, cf. rapport de développement de cette phase) :
//   - RG-020 (détection d'aberrations) est traitée depuis l'incrément 4, pour les 3 indicateurs documentés
//     (`AberrationUtils`).
//   - Un projet est « succès » dès qu'au moins un résultat exploitable a été obtenu (résultats partiels conservés,
//     anomalies des appels échoués consignées) ; « échec » seulement si aucun résultat n'a pu être obtenu.
//   - `interrogerDependances` et `gitlab.branches` restent différés (connecteurs non livrés) : simplement absents
//     des appels effectués ici. `interrogerMarqueursIa` et `croise.ia_nouveau_code` sont livrés à l'incrément 7
//     (référentiel `reglesMarqueursIA` extrait via `extraireReglesMarqueursIa`, jamais persisté par ce service).
//   - Le rapport d'anomalies détaillé (F08, RG-021 : catégorie/message/action suggérée/regroupement) reste un
//     incrément ultérieur ; les anomalies sont collectées ici sous une forme minimale (`{ indicateur, sourceId,
//     anomalie }`), décision arbitraire documentée dans le rapport de développement de cette phase.
import { Injectable, inject } from '@angular/core';
import { EMPTY, firstValueFrom, from } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
import type {
  ErreurConnecteur,
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
  ResultatBrouillonProjet,
  ResultatMutationAdministration,
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

  private annulationDemandee = false;

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
   * @returns Le Résultat typé de l'enregistrement du brouillon (`DonneesApplicationService.enregistrerBrouillon`).
   */
  public async lancerCampagne(
    perimetre: readonly string[],
    motDePasse: string,
  ): Promise<ResultatMutationAdministration> {
    this.annulationDemandee = false;
    this.etatSession.demarrerProgressionCampagne(perimetre);

    const campagneId = crypto.randomUUID();
    const concurrence = this.extraireConcurrence();
    const resultatsProjets = await firstValueFrom(
      from(perimetre).pipe(
        mergeMap((projetId) => {
          if (this.annulationDemandee) {
            return EMPTY;
          }
          return from(this.auditerProjet(projetId, campagneId));
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
    this.annulationDemandee = true;
  }

  /**
   * Audite un projet du périmètre : interroge chacune de ses sources GitLab/Sonar (en tenant compte des
   * indicateurs désactivés pour son groupe, US-009), calcule les résultats croisés déjà livrés
   * (`ConnecteurCroiseUtils`), détermine le verdict d'exécution (succès dès qu'un résultat exploitable existe,
   * cf. commentaire d'en-tête de ce fichier) et, en cas de succès, les aberrations RG-020 par comparaison avec le
   * dernier audit intégré du projet.
   * @param projetId - Identifiant du projet à auditer.
   * @param campagneId - Identifiant de la campagne en cours, reporté dans l'`Audit` produit en cas de succès.
   * @returns Le verdict d'exécution et, en cas de succès, l'entrée de brouillon prête à être proposée.
   */
  private async auditerProjet(
    projetId: string,
    campagneId: string,
  ): Promise<{
    readonly projetId: string;
    readonly verdict: Verdict;
    readonly resultatBrouillon?: ResultatBrouillonProjet;
  }> {
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

    const resultats: unknown[] = [];
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
        continue;
      }
      this.etatSession.mettreAJourProgressionProjet(projetId, {
        connecteurActif: source.type === TypeSource.DepotGitlab ? 'gitlab' : 'sonar',
      });
      if (source.type === TypeSource.DepotGitlab) {
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
            ),
        );
        dernierMotifEchec =
          this.integrer(reponseVitalite, resultats, anomalies) ?? dernierMotifEchec;
        vitalite = reponseVitalite.resultatBrut;

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
        dernierMotifEchec = this.integrer(reponseTaille, resultats, anomalies) ?? dernierMotifEchec;
        tailleDepot = reponseTaille.resultatBrut;

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
            ),
        );
        dernierMotifEchec =
          this.integrer(reponseMergeRequests, resultats, anomalies) ?? dernierMotifEchec;

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
            ),
        );
        dernierMotifEchec =
          this.integrer(reponseMarqueursIa, resultats, anomalies) ?? dernierMotifEchec;
        marqueursIa = reponseMarqueursIa.resultatBrut;
      } else {
        const reponseViolations = await this.executerIndicateur(
          'sonar.violations',
          resolution.groupe.indicateursDesactives,
          source.id,
          () => this.facadeCommandes.interrogerViolations(instance, source.id, source.idExterne),
        );
        dernierMotifEchec =
          this.integrer(reponseViolations, resultats, anomalies) ?? dernierMotifEchec;
        violations = reponseViolations.resultatBrut;

        const reponseDette = await this.executerIndicateur(
          'sonar.dette',
          resolution.groupe.indicateursDesactives,
          source.id,
          () => this.facadeCommandes.interrogerDette(instance, source.id, source.idExterne),
        );
        dernierMotifEchec = this.integrer(reponseDette, resultats, anomalies) ?? dernierMotifEchec;

        const reponseCouverture = await this.executerIndicateur(
          'sonar.couverture',
          resolution.groupe.indicateursDesactives,
          source.id,
          () => this.facadeCommandes.interrogerCouverture(instance, source.id, source.idExterne),
        );
        dernierMotifEchec =
          this.integrer(reponseCouverture, resultats, anomalies) ?? dernierMotifEchec;
        couverture = reponseCouverture.resultatBrut;

        const reponseNotes = await this.executerIndicateur(
          'sonar.notes',
          resolution.groupe.indicateursDesactives,
          source.id,
          () => this.facadeCommandes.interrogerNotes(instance, source.id, source.idExterne),
        );
        dernierMotifEchec = this.integrer(reponseNotes, resultats, anomalies) ?? dernierMotifEchec;

        const reponseNcloc = await this.executerIndicateur(
          'sonar.ncloc',
          resolution.groupe.indicateursDesactives,
          source.id,
          () => this.facadeCommandes.interrogerNcloc(instance, source.id, source.idExterne),
        );
        dernierMotifEchec = this.integrer(reponseNcloc, resultats, anomalies) ?? dernierMotifEchec;
        ncloc = reponseNcloc.resultatBrut;

        if (!resolution.groupe.indicateursDesactives.includes('croise.fraicheur_sonar')) {
          const reponseDerniereAnalyse = await this.facadeCommandes.interrogerDerniereAnalyse(
            instance,
            source.idExterne,
          );
          if (reponseDerniereAnalyse.type === 'succes') {
            derniereAnalyse = reponseDerniereAnalyse.resultat;
          } else {
            anomalies.push({
              indicateur: 'croise.fraicheur_sonar',
              sourceId: source.id,
              anomalie: reponseDerniereAnalyse.anomalie,
            });
            dernierMotifEchec = `croise.fraicheur_sonar : ${reponseDerniereAnalyse.anomalie.type}`;
          }
        }
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
    if (
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
    return {
      projetId,
      verdict: {
        projetId,
        statut: 'succes',
        anomalies: anomalies.length > 0 ? anomalies : undefined,
      },
      resultatBrouillon: {
        projetId,
        audit: {
          id: auditId,
          date: new Date().toISOString(),
          campagneId,
          resultats,
        },
        statut: 'enAttente',
        aberrations,
      },
    };
  }

  /**
   * Invoque une opération d'interrogation d'indicateur, sauf si son tag figure parmi les indicateurs désactivés
   * du groupe (US-009 : « indicateurs coûteux désactivables par groupe »).
   * @param tag - Tag `Resultat` de l'indicateur (`#[serde(rename = "...")]` côté cœur natif, ex. `gitlab.vitalite`).
   * @param indicateursDesactives - Indicateurs désactivés du groupe du projet audité.
   * @param sourceId - Identifiant de la source concernée, reporté dans l'anomalie en cas d'échec.
   * @param appel - Appel de la Façade de commandes à effectuer si l'indicateur n'est pas désactivé.
   * @returns Le résultat brut typé (pour les calculs croisés/aberrations), le résultat tagué prêt pour le
   * brouillon, et l'anomalie éventuelle : chaque champ absent selon le cas (désactivé, succès ou échec).
   */
  private async executerIndicateur<TResultat extends object>(
    tag: string,
    indicateursDesactives: readonly string[],
    sourceId: string,
    appel: () => Promise<
      | { readonly type: 'succes'; readonly resultat: TResultat }
      | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur }
    >,
  ): Promise<{
    readonly resultatBrut?: TResultat;
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
   * Reporte le résultat d'{@link executerIndicateur} dans les tableaux locaux de résultats/anomalies de l'appelant
   * (locaux à chaque appel d'`auditerProjet`, jamais un état partagé entre projets exécutés en parallèle).
   * @param reponse - Résultat retourné par {@link executerIndicateur}.
   * @param reponse.resultatTague - Résultat tagué à ajouter, absent si désactivé ou en échec.
   * @param reponse.anomalieEntree - Anomalie à ajouter, absente si désactivé ou en succès.
   * @param reponse.motif - Motif court de l'échec, absent si désactivé ou en succès.
   * @param resultats - Tableau local des résultats tagués déjà obtenus pour ce projet.
   * @param anomalies - Tableau local des anomalies déjà rencontrées pour ce projet.
   * @returns Le motif court de cet appel s'il a échoué, `undefined` sinon (désactivé ou succès).
   */
  private integrer(
    reponse: {
      readonly resultatTague?: Record<string, unknown>;
      readonly anomalieEntree?: Record<string, unknown>;
      readonly motif?: string;
    },
    resultats: unknown[],
    anomalies: unknown[],
  ): string | undefined {
    if (reponse.resultatTague !== undefined) {
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
      tailleOctets: this.extraireChampNumerique(
        dernierAudit.resultats,
        'gitlab.taille_depot',
        'tailleOctets',
      ),
      ncloc: this.extraireChampNumerique(dernierAudit.resultats, 'sonar.ncloc', 'ncloc'),
      couverture: this.extraireChampNumerique(
        dernierAudit.resultats,
        'sonar.couverture',
        'couverture',
      ),
    };
  }

  /**
   * Extrait un champ numérique d'un résultat d'audit historique typé `unknown` (catalogue figé non interprété
   * côté interface avant le Moteur de jugement, Phase 6), sans accès non sûr à la valeur reçue.
   * @param resultats - Résultats bruts de l'audit (`Audit.resultats`).
   * @param tag - Tag `Resultat` recherché.
   * @param champ - Nom du champ numérique à extraire au sein de ce résultat.
   * @returns La valeur numérique si le résultat existe et porte ce champ sous forme de nombre, `undefined` sinon.
   */
  private extraireChampNumerique(
    resultats: readonly unknown[],
    tag: string,
    champ: string,
  ): number | undefined {
    const entree = resultats.find((resultat) => this.estResultatTague(resultat, tag));
    if (!this.estObjetIndexable(entree)) {
      return undefined;
    }
    const valeur = entree[champ];
    return typeof valeur === 'number' ? valeur : undefined;
  }

  /**
   * Vérifie, sans accès non sûr à la valeur reçue, qu'un résultat d'audit historique correspond au tag `Resultat`
   * recherché, sur le modèle de `FacadeCommandesService.estErreurConnecteur`.
   * @param resultat - Entrée de `Audit.resultats`, de type `unknown`.
   * @param tag - Tag `Resultat` recherché.
   * @returns `true` si `resultat` porte ce tag.
   */
  private estResultatTague(resultat: unknown, tag: string): boolean {
    if (typeof resultat !== 'object' || resultat === null || !('type' in resultat)) {
      return false;
    }
    return resultat.type === tag;
  }

  /**
   * Type-guard sans assertion `as` : vérifie qu'une valeur `unknown` est un objet non nul, donc indexable en
   * sûreté par une clé dynamique (contrairement à l'opérateur `in` seul, qui ne suffit pas à narrower un type
   * indexable pour une clé non littérale).
   * @param valeur - Valeur à vérifier.
   * @returns `true` si `valeur` est un objet non nul.
   */
  private estObjetIndexable(valeur: unknown): valeur is Record<string, unknown> {
    return typeof valeur === 'object' && valeur !== null;
  }

  /**
   * Extrait la concurrence paramétrée d'une campagne (`parametres.audit.concurrence`, RG-017), sans accès non sûr
   * à la racine `unknown`, avec repli documenté sur {@link CONCURRENCE_PAR_DEFAUT}.
   * @returns La concurrence à appliquer.
   */
  private extraireConcurrence(): number {
    const valeur = this.extraireValeurParametres(['audit', 'concurrence']);
    return typeof valeur === 'number' && valeur > 0 ? valeur : CONCURRENCE_PAR_DEFAUT;
  }

  /**
   * Extrait le seuil de matérialité paramétré du brouillon (`parametres.seuils.materialiteBrouillon.
   * variationRelative`, RG-020), sans accès non sûr à la racine `unknown`, avec repli documenté sur
   * {@link VARIATION_RELATIVE_PAR_DEFAUT}.
   * @returns Le seuil de matérialité à appliquer.
   */
  private extraireVariationRelative(): number {
    const valeur = this.extraireValeurParametres([
      'seuils',
      'materialiteBrouillon',
      'variationRelative',
    ]);
    return typeof valeur === 'number' && valeur > 0 ? valeur : VARIATION_RELATIVE_PAR_DEFAUT;
  }

  /**
   * Traverse en sûreté une racine `parametres` de type `unknown` (jamais typée avant le Moteur de jugement, Phase
   * 6) selon un chemin de clés, sans jamais recourir à une assertion `as` non justifiée.
   * @param chemin - Suite de clés à traverser depuis `parametres`.
   * @returns La valeur trouvée en bout de chemin, `undefined` si une étape est absente ou n'est pas un objet.
   */
  private extraireValeurParametres(chemin: readonly string[]): unknown {
    let courant: unknown = this.donneesApplication.racine()?.parametres;
    for (const cle of chemin) {
      if (!this.estObjetIndexable(courant)) {
        return undefined;
      }
      courant = courant[cle];
    }
    return courant;
  }

  /**
   * Extrait le référentiel de règles de détection des marqueurs IA (`referentiels.reglesMarqueursIA`, F18), sans
   * accès non sûr à la racine `unknown` (`referentiels` reste une donnée générique côté cœur natif, hors périmètre
   * de l'Administration/Paramétrage, Phase 3/7). Toute entrée ne correspondant pas à la forme attendue est ignorée
   * silencieusement plutôt que de faire échouer l'audit du projet.
   * @returns Les règles valides du référentiel, tableau vide si absent ou malformé.
   */
  private extraireReglesMarqueursIa(): readonly RegleMarqueurIA[] {
    const referentiels = this.donneesApplication.racine()?.referentiels;
    if (!this.estObjetIndexable(referentiels)) {
      return [];
    }
    const regles = referentiels['reglesMarqueursIA'];
    if (!Array.isArray(regles)) {
      return [];
    }
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
