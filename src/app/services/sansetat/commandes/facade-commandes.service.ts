// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Client typé de la Façade de commandes (Phase 2, US-003, US-004 ; Phase 3, US-008 ; Phase 5, US-009), frontière
// unique entre l'interface Angular et le cœur natif Rust (cf.
// docs/02_documentation/11_architectureTechnique.md#découpage-en-composantsmodules-et-responsabilités).
// Périmètre de la Phase 2 : commandes de credentials (`testerConnectivite`, `definirCredentials`). Périmètre de
// la Phase 3 : autocomplétion des branches d'un dépôt GitLab pour la ref auditée d'une source (`interrogerBranches`).
// Périmètre de la Phase 5, incrément 1 : dix opérations d'interrogation des indicateurs GitLab/Sonar déterministes
// du Moteur d'audit. Périmètre de l'incrément 3 : `interrogerDerniereAnalyse`, donnée intermédiaire consommée par
// le Connecteur croisé (`services/avecetat/campagne/connecteur-croise.utils.ts`). Classé sous `services/sansetat/`
// : aucun état interne n'est conservé entre deux appels de ce service.
// Invocation IPC passée par `InvocationCommandeUtils` (et non `invoke` directement) depuis le 2026-07-28 : point de
// passage unique permettant le bouchon TS des commandes ci-dessous hors contexte Tauri (`ng serve`), cf.
// `invocation-commande.utils.ts`.
// Évolution du 2026-08-02 (US-008, RG-036) : `listerSourcesDisponibles`, qui remplace la saisie libre de
// l'identifiant externe d'une source par une liste avec autocomplétion. Évolution du 2026-08-25 (même règle) :
// cette liste n'est plus chargée en un seul appel non filtré à la sélection de l'instance (coûteux côté GitLab,
// à l'origine d'un statut HTTP 502 constaté en usage réel) mais recherchée au fil de la frappe via un paramètre
// `recherche` optionnel, sur le modèle déjà en place pour `interrogerBranches`.
import { Injectable } from '@angular/core';
import { InvocationCommandeUtils } from './invocation-commande.utils';
import type {
  ErreurConnecteur,
  Instance,
  RegleMarqueurIA,
  ResultatGitlabBranches,
  ResultatGitlabContributeurs,
  ResultatGitlabDependances,
  ResultatGitlabMarqueursIa,
  ResultatGitlabMembres,
  ResultatGitlabMergeRequests,
  ResultatGitlabTailleDepot,
  ResultatGitlabVitalite,
  ResultatInterrogationBranches,
  ResultatInterrogationBranchesCompletes,
  ResultatInterrogationContributeurs,
  ResultatInterrogationCouverture,
  ResultatInterrogationDependances,
  ResultatInterrogationDerniereAnalyse,
  ResultatInterrogationDette,
  ResultatInterrogationMarqueursIa,
  ResultatInterrogationMembres,
  ResultatInterrogationMergeRequests,
  ResultatInterrogationNcloc,
  ResultatInterrogationNotes,
  ResultatInterrogationTailleDepot,
  ResultatInterrogationVitalite,
  ResultatInterrogationViolations,
  ResultatListerSourcesDisponibles,
  ResultatSonarCouverture,
  ResultatSonarDette,
  ResultatSonarNcloc,
  ResultatSonarNotes,
  ResultatSonarViolations,
  ResultatTestConnectivite,
  SourceDisponible,
  VerdictConnectivite,
} from './types-facade';

/**
 * Client typé de la Façade de commandes, dédié en Phase 2 aux credentials de session (US-003, US-004), en
 * Phase 3 à l'autocomplétion des branches (US-008), et en Phase 5 (incrément 1) à dix opérations d'interrogation
 * des indicateurs GitLab/Sonar du Moteur d'audit (US-009). Chaque méthode invoque une commande Tauri identique
 * côté cœur natif (`tester_connectivite`, `definir_credentials`, `interroger_branches`, `interroger_vitalite`, …).
 */
@Injectable({ providedIn: 'root' })
export class FacadeCommandesService {
  /**
   * Teste la connectivité d'un credential pour une instance donnée et contrôle sa portée quand l'instance le
   * permet (US-004). Le résultat est un Résultat typé plutôt qu'un rejet de Promise non typé, à traiter par un
   * switch exhaustif sur son discriminant `type`.
   * @param instance - Instance GitLab ou Sonar à interroger.
   * @param credential - Credential à tester, transmis une seule fois, jamais conservé par ce client.
   * @returns Le verdict de connectivité en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async testerConnectivite(
    instance: Instance,
    credential: string,
  ): Promise<ResultatTestConnectivite> {
    try {
      const verdict = await InvocationCommandeUtils.invoquer<VerdictConnectivite>(
        'tester_connectivite',
        {
          instance,
          credential,
        },
      );
      return { type: 'succes', verdict };
    } catch (erreur: unknown) {
      if (this.estErreurConnecteur(erreur)) {
        return { type: 'echec', anomalie: erreur };
      }
      return {
        type: 'echec',
        anomalie: {
          type: 'reponseInattendue',
          message: 'Réponse inattendue de la frontière IPC (forme non reconnue)',
        },
      };
    }
  }

  /**
   * Enregistre les credentials de la session courante en mémoire côté cœur natif (US-003), en miroir du Store
   * d'état applicatif de l'interface, afin qu'un unique verrouillage de session les efface des deux côtés (RG-004,
   * RG-005).
   * @param credentials - Credentials à mirroirer, par identifiant d'instance, jamais persistés (RG-004).
   */
  public async definirCredentials(credentials: Readonly<Record<string, string>>): Promise<void> {
    await InvocationCommandeUtils.invoquer<void>('definir_credentials', { credentials });
  }

  /**
   * Consigne, dans le journal technique local du cœur natif, une erreur JavaScript non interceptée par ailleurs
   * (`ErrorHandlerGlobal`). Best-effort : toute erreur en cours de consignation (ex. commande non bouchonnée hors
   * contexte Tauri, `ng serve`) est silencieusement ignorée plutôt que relancée, cette méthode ne devant jamais
   * devenir elle-même une nouvelle source d'exception non gérée.
   * @param nom - Nom de l'erreur JavaScript (`Error.name`).
   * @param message - Message de l'erreur JavaScript (`Error.message`).
   * @param pile - Pile d'appel de l'erreur (`Error.stack`), absente si indisponible.
   */
  public async consignerErreurUi(nom: string, message: string, pile?: string): Promise<void> {
    try {
      await InvocationCommandeUtils.invoquer<void>('consigner_erreur_ui', { nom, message, pile });
    } catch {
      // Volontairement ignoré : cf. commentaire ci-dessus.
    }
  }

  /**
   * Consigne, dans le journal technique local du cœur natif, le résumé du nombre d'items obtenus par type
   * d'indicateur en fin d'analyse d'une SOURCE (jamais un total par projet), ajouté en diagnostic de R15-06 (un
   * projet à deux sources GitLab n'affichant les dépendances que d'un seul des deux dépôts) : permet de confirmer
   * si chaque source produit bien ses propres résultats côté cœur natif. Best-effort, sur le même modèle que
   * {@link consignerErreurUi} : jamais de nouvelle source d'exception non gérée pour l'Orchestrateur de campagne
   * appelant.
   * @param sourceId - Identifiant interne de la source concernée (`Source.id`).
   * @param idExterne - Identifiant externe de la source côté instance (`Source.idExterne`), plus lisible que
   * `sourceId` pour rapprocher la ligne de journal d'un dépôt/projet réel.
   * @param compteurs - Nombre d'items obtenus par type d'indicateur (`gitlab.membres`, `gitlab.dependances`, etc.),
   * jamais le contenu des résultats eux-mêmes.
   */
  public async consignerResumeSource(
    sourceId: string,
    idExterne: string,
    compteurs: Readonly<Record<string, number>>,
  ): Promise<void> {
    try {
      await InvocationCommandeUtils.invoquer<void>('consigner_resume_source', {
        sourceId,
        idExterne,
        compteurs,
      });
    } catch {
      // Volontairement ignoré : cf. commentaire de consignerErreurUi.
    }
  }

  /**
   * Interroge les branches d'un dépôt GitLab pour l'autocomplétion de la ref auditée d'une source (US-008). Le
   * credential utilisé est celui déjà mémorisé côté cœur natif pour cette instance (`definirCredentials`) : il
   * n'est jamais retransmis par cette méthode.
   * @param instance - Instance GitLab hébergeant le dépôt.
   * @param idExterne - Identifiant du projet GitLab côté instance (`Source.idExterne`).
   * @param recherche - Terme de recherche optionnel, pour restreindre la liste retournée.
   * @returns La liste des noms de branches en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerBranches(
    instance: Instance,
    idExterne: string,
    recherche?: string,
  ): Promise<ResultatInterrogationBranches> {
    try {
      const branches = await InvocationCommandeUtils.invoquer<readonly string[]>(
        'interroger_branches',
        {
          instance,
          idExterne,
          recherche,
        },
      );
      return { type: 'succes', branches };
    } catch (erreur: unknown) {
      if (this.estErreurConnecteur(erreur)) {
        return { type: 'echec', anomalie: erreur };
      }
      return {
        type: 'echec',
        anomalie: {
          type: 'reponseInattendue',
          message: 'Réponse inattendue de la frontière IPC (forme non reconnue)',
        },
      };
    }
  }

  /**
   * Recherche, parmi les dépôts GitLab ou les projets Sonar accessibles avec le credential courant d'une instance,
   * ceux correspondant au terme recherché, pour l'autocomplétion de l'identifiant externe d'une source (US-008,
   * RG-036) : remplace la saisie libre. Le credential utilisé est celui déjà mémorisé côté cœur natif pour cette
   * instance (`definirCredentials`) : il n'est jamais retransmis par cette méthode, sur le même principe que
   * {@link interrogerBranches}.
   *
   * `recherche` vide ou absent ne déclenche aucun appel réseau (RG-036, évolution du 2026-08-25) : cf. le
   * commentaire de `gitlab::lister_projets` côté cœur natif pour la justification (délestage d'un chargement complet
   * non filtré, à l'origine d'un statut HTTP 502 constaté en usage réel contre une instance GitLab volumineuse).
   * @param instance - Instance GitLab ou Sonar dont on recherche les dépôts/projets accessibles.
   * @param recherche - Terme recherché, saisi par l'utilisateur.
   * @returns La liste des dépôts/projets correspondants en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async listerSourcesDisponibles(
    instance: Instance,
    recherche?: string,
  ): Promise<ResultatListerSourcesDisponibles> {
    try {
      const sourcesDisponibles = await InvocationCommandeUtils.invoquer<
        readonly SourceDisponible[]
      >('lister_sources_disponibles', { instance, recherche });
      return { type: 'succes', sourcesDisponibles };
    } catch (erreur: unknown) {
      if (this.estErreurConnecteur(erreur)) {
        return { type: 'echec', anomalie: erreur };
      }
      return {
        type: 'echec',
        anomalie: {
          type: 'reponseInattendue',
          message: 'Réponse inattendue de la frontière IPC (forme non reconnue)',
        },
      };
    }
  }

  /**
   * Interroge la vitalité d'un dépôt GitLab, c'est-à-dire la date du dernier commit sur la ref auditée (US-009).
   * Le credential utilisé est celui déjà mémorisé côté cœur natif pour cette instance (`definirCredentials`).
   * @param instance - Instance GitLab hébergeant le dépôt.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Identifiant du projet GitLab côté instance (`Source.idExterne`).
   * @param refAuditee - Ref auditée (`Source.refAuditee`) ; absente, la branche par défaut du dépôt est résolue.
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046, format `AAAA-MM-JJ`) ; absente, la date
   * du jour est utilisée (comportement inchangé d'un audit régulier).
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerVitalite(
    instance: Instance,
    sourceId: string,
    idExterne: string,
    refAuditee?: string,
    dateCiblee?: string,
  ): Promise<ResultatInterrogationVitalite> {
    return this.interrogerIndicateurGitlab<ResultatGitlabVitalite>(
      'interroger_vitalite',
      instance,
      sourceId,
      idExterne,
      refAuditee,
      dateCiblee,
    );
  }

  /**
   * Interroge la taille d'un dépôt GitLab en octets (US-009).
   * @param instance - Instance GitLab hébergeant le dépôt.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Identifiant du projet GitLab côté instance (`Source.idExterne`).
   * @param refAuditee - Ref auditée (`Source.refAuditee`) ; absente, la branche par défaut du dépôt est résolue.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerTailleDepot(
    instance: Instance,
    sourceId: string,
    idExterne: string,
    refAuditee?: string,
  ): Promise<ResultatInterrogationTailleDepot> {
    return this.interrogerIndicateurGitlab<ResultatGitlabTailleDepot>(
      'interroger_taille_depot',
      instance,
      sourceId,
      idExterne,
      refAuditee,
    );
  }

  /**
   * Interroge les contributeurs distincts sur la fenêtre glissante d'un dépôt GitLab (US-009).
   * @param instance - Instance GitLab hébergeant le dépôt.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Identifiant du projet GitLab côté instance (`Source.idExterne`).
   * @param refAuditee - Ref auditée (`Source.refAuditee`) ; absente, la branche par défaut du dépôt est résolue.
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046) ; absente, comportement inchangé.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerContributeurs(
    instance: Instance,
    sourceId: string,
    idExterne: string,
    refAuditee?: string,
    dateCiblee?: string,
  ): Promise<ResultatInterrogationContributeurs> {
    return this.interrogerIndicateurGitlab<ResultatGitlabContributeurs>(
      'interroger_contributeurs',
      instance,
      sourceId,
      idExterne,
      refAuditee,
      dateCiblee,
    );
  }

  /**
   * Interroge les demandes de fusion ouvertes d'un dépôt GitLab (US-009).
   * @param instance - Instance GitLab hébergeant le dépôt.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Identifiant du projet GitLab côté instance (`Source.idExterne`).
   * @param refAuditee - Ref auditée (`Source.refAuditee`) ; absente, la branche par défaut du dépôt est résolue.
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046) ; absente, comportement inchangé.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerMergeRequests(
    instance: Instance,
    sourceId: string,
    idExterne: string,
    refAuditee?: string,
    dateCiblee?: string,
  ): Promise<ResultatInterrogationMergeRequests> {
    return this.interrogerIndicateurGitlab<ResultatGitlabMergeRequests>(
      'interroger_merge_requests',
      instance,
      sourceId,
      idExterne,
      refAuditee,
      dateCiblee,
    );
  }

  /**
   * Interroge les membres d'un dépôt GitLab (US-009).
   * @param instance - Instance GitLab hébergeant le dépôt.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Identifiant du projet GitLab côté instance (`Source.idExterne`).
   * @param refAuditee - Ref auditée (`Source.refAuditee`) ; absente, la branche par défaut du dépôt est résolue.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerMembres(
    instance: Instance,
    sourceId: string,
    idExterne: string,
    refAuditee?: string,
  ): Promise<ResultatInterrogationMembres> {
    return this.interrogerIndicateurGitlab<ResultatGitlabMembres>(
      'interroger_membres',
      instance,
      sourceId,
      idExterne,
      refAuditee,
    );
  }

  /**
   * Interroge la liste complète des branches d'un dépôt GitLab pour le catalogue figé des résultats d'audit
   * (US-009, RG-030, incrément de rattrapage de la Phase 5 précédant la Phase 6) : à ne pas confondre avec
   * {@link interrogerBranches} ci-dessus, dédiée à l'autocomplétion (US-008). Ne retourne ni `rebasee` ni
   * `nommageConforme` (cf. commentaire du type `Branche` dans `types-facade.ts`).
   * @param instance - Instance GitLab hébergeant le dépôt.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Identifiant du projet GitLab côté instance (`Source.idExterne`).
   * @param refAuditee - Ref auditée (`Source.refAuditee`) ; absente, la branche par défaut du dépôt est résolue.
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046) ; absente, comportement inchangé.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerBranchesCompletes(
    instance: Instance,
    sourceId: string,
    idExterne: string,
    refAuditee?: string,
    dateCiblee?: string,
  ): Promise<ResultatInterrogationBranchesCompletes> {
    return this.interrogerIndicateurGitlab<ResultatGitlabBranches>(
      'interroger_branches_completes',
      instance,
      sourceId,
      idExterne,
      refAuditee,
      dateCiblee,
    );
  }

  /**
   * Interroge les dépendances déclarées par les manifestes d'un dépôt GitLab (US-009, incrément de rattrapage de
   * la Phase 5 précédant la Phase 6) : parseur best-effort limité en V1 aux trois écosystèmes illustrés par
   * `docs/01_besoin/exemple-donnees.json` (cf. `src-tauri/src/connecteurs/gitlab.rs` pour le détail des limites
   * assumées).
   * @param instance - Instance GitLab hébergeant le dépôt.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Identifiant du projet GitLab côté instance (`Source.idExterne`).
   * @param refAuditee - Ref auditée (`Source.refAuditee`) ; absente, la branche par défaut du dépôt est résolue.
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046) ; absente, comportement inchangé.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerDependances(
    instance: Instance,
    sourceId: string,
    idExterne: string,
    refAuditee?: string,
    dateCiblee?: string,
  ): Promise<ResultatInterrogationDependances> {
    return this.interrogerIndicateurGitlab<ResultatGitlabDependances>(
      'interroger_dependances',
      instance,
      sourceId,
      idExterne,
      refAuditee,
      dateCiblee,
    );
  }

  /**
   * Interroge les marqueurs d'outils IA détectés dans l'arborescence d'un dépôt GitLab (US-009, F18, Phase 5
   * incrément 7), par correspondance avec le référentiel `reglesMarqueursIA` transmis par l'appelant (le cœur
   * natif ne le persiste jamais lui-même).
   * @param instance - Instance GitLab hébergeant le dépôt.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Identifiant du projet GitLab côté instance (`Source.idExterne`).
   * @param reglesMarqueursIA - Référentiel de règles de détection (`referentiels.reglesMarqueursIA`).
   * @param refAuditee - Ref auditée (`Source.refAuditee`) ; absente, la branche par défaut du dépôt est résolue.
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046) ; absente, comportement inchangé.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerMarqueursIa(
    instance: Instance,
    sourceId: string,
    idExterne: string,
    reglesMarqueursIA: readonly RegleMarqueurIA[],
    refAuditee?: string,
    dateCiblee?: string,
  ): Promise<ResultatInterrogationMarqueursIa> {
    try {
      // Nom de clé IPC `reglesMarqueursIa` (et non `reglesMarqueursIA`) : la conversion snake_case -> camelCase
      // appliquée par Tauri au paramètre Rust `regles_marqueurs_ia` ne capitalise que la première lettre de
      // chaque segment (« Ia », pas « IA »), comme déjà constaté pour `avec_mr` -> `avecMr` (Phase 5, incrément 1,
      // cf. commentaire de `Branche.avec_mr` dans `src-tauri/src/modele/racine.rs`).
      const resultat = await InvocationCommandeUtils.invoquer<ResultatGitlabMarqueursIa>(
        'interroger_marqueurs_ia',
        {
          instance,
          sourceId,
          idExterne,
          reglesMarqueursIa: reglesMarqueursIA,
          refAuditee,
          dateCiblee,
        },
      );
      return { type: 'succes', resultat };
    } catch (erreur: unknown) {
      if (this.estErreurConnecteur(erreur)) {
        return { type: 'echec', anomalie: erreur };
      }
      return {
        type: 'echec',
        anomalie: {
          type: 'reponseInattendue',
          message: 'Réponse inattendue de la frontière IPC (forme non reconnue)',
        },
      };
    }
  }

  /**
   * Interroge les violations Sonar par sévérité (US-009).
   * @param instance - Instance Sonar hébergeant le projet.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Clé du projet Sonar côté instance (`Source.idExterne`).
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046) ; absente, comportement inchangé. En
   * mode historique, résolue côté cœur natif par repli sur la donnée Sonar disponible la plus proche.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerViolations(
    instance: Instance,
    sourceId: string,
    idExterne: string,
    dateCiblee?: string,
  ): Promise<ResultatInterrogationViolations> {
    return this.interrogerIndicateurSonar<ResultatSonarViolations>(
      'interroger_violations',
      instance,
      sourceId,
      idExterne,
      dateCiblee,
    );
  }

  /**
   * Interroge la dette technique Sonar (US-009).
   * @param instance - Instance Sonar hébergeant le projet.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Clé du projet Sonar côté instance (`Source.idExterne`).
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046) ; absente, comportement inchangé.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerDette(
    instance: Instance,
    sourceId: string,
    idExterne: string,
    dateCiblee?: string,
  ): Promise<ResultatInterrogationDette> {
    return this.interrogerIndicateurSonar<ResultatSonarDette>(
      'interroger_dette',
      instance,
      sourceId,
      idExterne,
      dateCiblee,
    );
  }

  /**
   * Interroge la couverture de tests Sonar (US-009).
   * @param instance - Instance Sonar hébergeant le projet.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Clé du projet Sonar côté instance (`Source.idExterne`).
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046) ; absente, comportement inchangé.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerCouverture(
    instance: Instance,
    sourceId: string,
    idExterne: string,
    dateCiblee?: string,
  ): Promise<ResultatInterrogationCouverture> {
    return this.interrogerIndicateurSonar<ResultatSonarCouverture>(
      'interroger_couverture',
      instance,
      sourceId,
      idExterne,
      dateCiblee,
    );
  }

  /**
   * Interroge les notes Sonar des quatre axes (US-009).
   * @param instance - Instance Sonar hébergeant le projet.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Clé du projet Sonar côté instance (`Source.idExterne`).
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046) ; absente, comportement inchangé.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerNotes(
    instance: Instance,
    sourceId: string,
    idExterne: string,
    dateCiblee?: string,
  ): Promise<ResultatInterrogationNotes> {
    return this.interrogerIndicateurSonar<ResultatSonarNotes>(
      'interroger_notes',
      instance,
      sourceId,
      idExterne,
      dateCiblee,
    );
  }

  /**
   * Interroge le volume de code Sonar (US-009).
   * @param instance - Instance Sonar hébergeant le projet.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Clé du projet Sonar côté instance (`Source.idExterne`).
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046) ; absente, comportement inchangé.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  public async interrogerNcloc(
    instance: Instance,
    sourceId: string,
    idExterne: string,
    dateCiblee?: string,
  ): Promise<ResultatInterrogationNcloc> {
    return this.interrogerIndicateurSonar<ResultatSonarNcloc>(
      'interroger_ncloc',
      instance,
      sourceId,
      idExterne,
      dateCiblee,
    );
  }

  /**
   * Interroge la date de la dernière analyse Sonar d'un projet (Phase 5, incrément 3), donnée intermédiaire
   * consommée par le Connecteur croisé (`ConnecteurCroiseUtils.calculerFraicheurSonar`). À la différence des dix
   * méthodes d'interrogation précédentes, ne reçoit pas `sourceId` : cette donnée n'appartient à aucune variante
   * du catalogue figé des résultats d'audit et n'est donc jamais destinée à être persistée seule.
   * @param instance - Instance Sonar hébergeant le projet.
   * @param idExterne - Clé du projet Sonar côté instance (`Source.idExterne`).
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046) ; absente, comportement inchangé.
   * @returns La date de dernière analyse (`null` si le projet n'a jamais été analysé) en cas de succès, ou
   * l'anomalie typée en cas d'échec.
   */
  public async interrogerDerniereAnalyse(
    instance: Instance,
    idExterne: string,
    dateCiblee?: string,
  ): Promise<ResultatInterrogationDerniereAnalyse> {
    try {
      const resultat = await InvocationCommandeUtils.invoquer<string | null>(
        'interroger_derniere_analyse',
        {
          instance,
          idExterne,
          dateCiblee,
        },
      );
      return { type: 'succes', resultat };
    } catch (erreur: unknown) {
      if (this.estErreurConnecteur(erreur)) {
        return { type: 'echec', anomalie: erreur };
      }
      return {
        type: 'echec',
        anomalie: {
          type: 'reponseInattendue',
          message: 'Réponse inattendue de la frontière IPC (forme non reconnue)',
        },
      };
    }
  }

  /**
   * Factorise l'appel des cinq commandes d'interrogation d'indicateur GitLab de cette phase, identiques hormis le
   * nom de la commande invoquée et la ref auditée transmise.
   * @param commande - Nom de la commande Tauri à invoquer (`snake_case`).
   * @param instance - Instance GitLab hébergeant le dépôt.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Identifiant du projet GitLab côté instance (`Source.idExterne`).
   * @param refAuditee - Ref auditée (`Source.refAuditee`) ; absente, la branche par défaut du dépôt est résolue.
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046), transmise telle quelle si fournie par
   * l'appelant ; `undefined` pour `interrogerTailleDepot`/`interrogerMembres`, jamais historisables (cf. plan
   * C15-14 § orchestrateur), et pour tout appel en mode régulier.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  private async interrogerIndicateurGitlab<TResultat>(
    commande: string,
    instance: Instance,
    sourceId: string,
    idExterne: string,
    refAuditee?: string,
    dateCiblee?: string,
  ): Promise<
    | { readonly type: 'succes'; readonly resultat: TResultat }
    | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur }
  > {
    try {
      const resultat = await InvocationCommandeUtils.invoquer<TResultat>(commande, {
        instance,
        sourceId,
        idExterne,
        refAuditee,
        dateCiblee,
      });
      return { type: 'succes', resultat };
    } catch (erreur: unknown) {
      if (this.estErreurConnecteur(erreur)) {
        return { type: 'echec', anomalie: erreur };
      }
      return {
        type: 'echec',
        anomalie: {
          type: 'reponseInattendue',
          message: 'Réponse inattendue de la frontière IPC (forme non reconnue)',
        },
      };
    }
  }

  /**
   * Factorise l'appel des cinq commandes d'interrogation d'indicateur Sonar de cette phase, identiques hormis le
   * nom de la commande invoquée.
   * @param commande - Nom de la commande Tauri à invoquer (`snake_case`).
   * @param instance - Instance Sonar hébergeant le projet.
   * @param sourceId - Identifiant de la source concernée (`Source.id`), reporté tel quel dans le résultat.
   * @param idExterne - Clé du projet Sonar côté instance (`Source.idExterne`).
   * @param dateCiblee - Date ciblée d'un audit historique (C15-14, RG-046), transmise telle quelle si fournie par
   * l'appelant ; `undefined` pour tout appel en mode régulier.
   * @returns Le constat brut en cas de succès, ou l'anomalie typée en cas d'échec.
   */
  private async interrogerIndicateurSonar<TResultat>(
    commande: string,
    instance: Instance,
    sourceId: string,
    idExterne: string,
    dateCiblee?: string,
  ): Promise<
    | { readonly type: 'succes'; readonly resultat: TResultat }
    | { readonly type: 'echec'; readonly anomalie: ErreurConnecteur }
  > {
    try {
      const resultat = await InvocationCommandeUtils.invoquer<TResultat>(commande, {
        instance,
        sourceId,
        idExterne,
        dateCiblee,
      });
      return { type: 'succes', resultat };
    } catch (erreur: unknown) {
      if (this.estErreurConnecteur(erreur)) {
        return { type: 'echec', anomalie: erreur };
      }
      return {
        type: 'echec',
        anomalie: {
          type: 'reponseInattendue',
          message: 'Réponse inattendue de la frontière IPC (forme non reconnue)',
        },
      };
    }
  }

  /**
   * Vérifie, sans accès non sûr à la valeur reçue, qu'un rejet de la commande native correspond bien à une
   * anomalie de connectivité typée (RG-021) plutôt qu'à une valeur inattendue de la frontière IPC.
   * @param valeur - Valeur rejetée par `invoke`, de type `unknown` à cette frontière.
   * @returns `true` si `valeur` correspond à la forme attendue d'une {@link ErreurConnecteur}.
   */
  private estErreurConnecteur(valeur: unknown): valeur is ErreurConnecteur {
    if (
      typeof valeur !== 'object' ||
      valeur === null ||
      !('type' in valeur) ||
      !('message' in valeur)
    ) {
      return false;
    }
    const categorie: unknown = valeur.type;
    return (
      typeof valeur.message === 'string' &&
      (categorie === 'authentificationRefusee' ||
        categorie === 'refIntrouvable' ||
        categorie === 'instanceInjoignable' ||
        categorie === 'delaiDepasse' ||
        categorie === 'reponseInattendue' ||
        categorie === 'droitsInsuffisants' ||
        categorie === 'credentialAbsent' ||
        // `depotVide` est renvoyé par le cœur natif (résolution de branche par défaut d'un dépôt sans commit) et
        // franchit donc la frontière IPC, contrairement à `instanceIntrouvable` forgé côté interface : il doit
        // être reconnu ici pour ne pas être requalifié en « réponse inattendue de la frontière IPC ».
        categorie === 'depotVide')
    );
  }
}
