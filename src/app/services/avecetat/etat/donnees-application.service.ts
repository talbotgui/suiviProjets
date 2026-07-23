// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Store d'état applicatif des données du fichier (Phase 3 du plan de développement, US-006, US-007, US-008 ;
// Phase 4, US-022 à US-024). Nom de service arbitraire (décision à signaler dans le rapport de développement, sur
// le modèle de la décision similaire déjà prise pour `deverrouillerSession` en Phase 1) :
// `docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces` ne nomme
// qu'un unique « Store d'état applicatif », déjà porté par `EtatSessionService` pour la session ; ce service en
// est le pendant pour les données du fichier de données lui-même (groupes, projets, sources, membres connus,
// politique IA).
//
// Décision d'architecture (cf. rapport de développement de la Phase 3) : conformément à l'absence de toute
// commande `creerGroupe`/`creerProjet`/`creerSource` dans la Façade de commandes documentée, le CRUD groupes/
// projets/sources a lieu entièrement ici, sur la racine déjà chargée en mémoire (obtenue par
// `creerFichier`/`chargerFichier`) ; la persistance sur disque reste assurée par la commande `sauvegarderFichier`
// existante (Phase 1), qui réécrit la racine intégralement (`docs/02_documentation/12_modeleDonnees.md#stratégie-
// de-persistance`). Chaque mutation produit une nouvelle racine immuable plutôt que de modifier l'existante en
// place, pour rester cohérent avec les Signals Angular (détection de changement par égalité de référence).
//
// Décision d'architecture complémentaire (Phase 4, à signaler dans le rapport de développement de cette phase) :
// `qualifierMembre` et `definirPolitiqueIA`, à la différence du CRUD groupes/projets/sources, sont des commandes
// nommées de la Façade qui mutent puis sauvegardent elles-mêmes le fichier (cf. commentaire d'en-tête de
// `commandes/administration.rs` côté cœur natif). Ce Store délègue leur appel `invoke` à
// `FacadeAdministrationService` (`services/sansetat/commandes/`), un second client dédié de la Façade de
// commandes, plutôt que d'invoquer `invoke` lui-même : la version initiale de ce Store appelait `invoke`
// directement, au motif que le type `DonneesRacine` échangé, défini dans ce fichier, ne pouvait être importé
// depuis `sansetat/commandes/` sans inverser le sens de dépendance autorisé entre les deux catégories de services
// (`avecetat` → `sansetat`, jamais l'inverse) ; corrigé en revue (cf. rapport de développement de cette phase) en
// rendant `FacadeAdministrationService` générique sur ce type plutôt qu'en le lui important directement, ce qui
// restaure la frontière unique vers `invoke` documentée en en-tête de `FacadeCommandesService` sans jamais
// inverser cette dépendance. Ce Store, qui possède déjà le cycle de vie de la racine (`chargerRacine`/mutations),
// reste le seul point d'appel connaissant le type concret `DonneesRacine` transmis à ces paramètres de type ; il
// en résulte que la Façade de commandes côté interface est répartie sur plusieurs services selon le type de
// données échangé, à l'image du découpage déjà adopté côté cœur natif
// (`commandes::fichier`/`commandes::connectivite`/`commandes::administration`, plusieurs modules Rust distincts).
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { FacadeAdministrationService } from '../../sansetat/commandes/facade-administration.service';
import type { Instance } from '../../sansetat/commandes/types-facade';
import { EtatSessionService } from './etat-session.service';
import type {
  CategorieErreurAdministration,
  DonneesRacine,
  ErreurAdministration,
  EntreeJournal,
  Groupe,
  Projet,
  ReponseQualificationMembre,
  ResultatBrouillonProjet,
  ResultatMutationAdministration,
  ResultatQualificationMembre,
  Source,
  StatutMembre,
  TypeCritereMembre,
  Verdict,
} from './types-donnees';
import { TypeSource } from './types-donnees';

/**
 * Origine consignée dans le journal des modifications (RG-023) pour toute mutation issue de l'écran
 * Administration.
 */
const ORIGINE_ADMINISTRATION = 'Administration';

/**
 * Données saisies pour créer ou remplacer intégralement un groupe (US-006).
 */
export interface DonneesGroupe {
  /** Nom du groupe. */
  readonly nom: string;
  /** Description du groupe. */
  readonly description: string;
  /** Instances GitLab/Sonar déclarées pour ce groupe. */
  readonly instances: readonly Instance[];
}

/**
 * Données saisies pour créer ou remplacer intégralement un projet (US-007), hors politique IA (RG-014 : toujours
 * interdite à la création, éditable uniquement depuis la Phase 4).
 */
export interface DonneesProjet {
  /** Nom du projet. */
  readonly nom: string;
  /** Description du projet. */
  readonly description: string;
}

/**
 * Données saisies pour créer ou remplacer intégralement une source (US-008). `refAuditee` doit être transmis
 * explicitement, y compris à `undefined` pour revenir à la branche par défaut du dépôt : ce type représentant
 * l'état complet souhaité (et non une mise à jour partielle), une clé absente serait ambiguë avec « ne pas
 * changer ».
 */
export interface DonneesSource {
  /** Identifiant de l'instance de rattachement (doit appartenir au même groupe que le projet). */
  readonly instanceId: string;
  /** Type de la source. */
  readonly type: TypeSource;
  /** Identifiant externe (identifiant de projet côté instance). */
  readonly idExterne: string;
  /** Ref auditée (branche, tag ou SHA) ; `undefined` = branche par défaut du dépôt. */
  readonly refAuditee: string | undefined;
}

/**
 * Données saisies pour qualifier un membre connu d'un groupe (US-022, US-023). `membreId` distingue la mise à jour
 * d'une règle existante (fourni, désigne la règle éditée même si son critère change) de la création d'une
 * nouvelle règle (absent, la règle est alors retrouvée par correspondance exacte de critère côté cœur natif).
 */
export interface DonneesMembreConnu {
  /** Identifiant de la règle à mettre à jour, absent pour une création. */
  readonly membreId?: string;
  /** Motif de reconnaissance (login, email ou domaine selon `typeCritere`). */
  readonly critere: string;
  /** Type du critère de reconnaissance. */
  readonly typeCritere: TypeCritereMembre;
  /** Statut associé (interne, client, partenaire). */
  readonly statut: StatutMembre;
  /** Libellé lisible optionnel. */
  readonly libelle?: string;
  /** Alias courriel optionnel. */
  readonly aliasEmail?: string;
}

/**
 * Store d'état applicatif des données du fichier actuellement chargé (Phase 3, Phase 4) : expose la racine
 * courante en lecture seule et l'ensemble des mutations CRUD sur les groupes, projets et sources (US-006, US-007,
 * US-008). Ces mutations n'écrivent pas sur disque : la sauvegarde explicite (`sauvegarderFichier`, RG-002) reste
 * une action distincte, déclenchée par l'écran appelant. `qualifierMembre` et `definirPolitiqueIA` (US-022 à
 * US-024) dérogent à cette règle : elles délèguent à `FacadeAdministrationService` les commandes natives de même
 * nom, qui mutent puis sauvegardent elles-mêmes le fichier (cf. commentaire d'en-tête de ce fichier).
 */
@Injectable({ providedIn: 'root' })
export class DonneesApplicationService {
  private readonly etatSession: EtatSessionService = inject(EtatSessionService);
  private readonly facadeAdministration: FacadeAdministrationService = inject(
    FacadeAdministrationService,
  );
  private readonly racineInterne: WritableSignal<DonneesRacine | null> = signal(null);

  /**
   * Racine des données actuellement chargées, `null` si aucun fichier n'est ouvert.
   */
  public readonly racine: Signal<DonneesRacine | null> = this.racineInterne.asReadonly();

  /**
   * Groupes de la racine courante, tableau vide si aucun fichier n'est ouvert.
   */
  public readonly groupes: Signal<readonly Groupe[]> = computed(
    () => this.racineInterne()?.groupes ?? [],
  );

  /**
   * Charge une racine nouvellement créée ou chargée (`creerFichier`/`chargerFichier`), remplaçant tout état
   * précédent.
   * @param racine - Racine des données désormais active.
   */
  public chargerRacine(racine: DonneesRacine): void {
    this.racineInterne.set(racine);
  }

  /**
   * Oublie la racine courante (fermeture du fichier).
   */
  public reinitialiser(): void {
    this.racineInterne.set(null);
  }

  /**
   * Crée un nouveau groupe (US-006).
   * @param donnees - Nom, description et instances du groupe à créer.
   * @returns L'identifiant UUID v4 du groupe créé.
   */
  public creerGroupe(donnees: DonneesGroupe): string {
    const id = this.genererId();
    const groupe: Groupe = {
      id,
      nom: donnees.nom,
      description: donnees.description,
      instances: donnees.instances,
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [],
    };
    this.mettreAJourRacine((racine) => ({ ...racine, groupes: [...racine.groupes, groupe] }));
    return id;
  }

  /**
   * Remplace le nom, la description et les instances d'un groupe existant (US-006).
   * @param groupeId - Identifiant du groupe à modifier.
   * @param donnees - Nouvelles valeurs.
   */
  public modifierGroupe(groupeId: string, donnees: DonneesGroupe): void {
    this.mettreAJourRacine((racine) => ({
      ...racine,
      groupes: racine.groupes.map((groupe) =>
        groupe.id === groupeId ? { ...groupe, ...donnees } : groupe,
      ),
    }));
  }

  /**
   * Supprime un groupe et l'ensemble de ses projets (US-006). La confirmation préalable rappelant la perte de
   * l'historique d'audits associé relève de l'écran appelant, pas de ce Store.
   * @param groupeId - Identifiant du groupe à supprimer.
   */
  public supprimerGroupe(groupeId: string): void {
    this.mettreAJourRacine((racine) => ({
      ...racine,
      groupes: racine.groupes.filter((groupe) => groupe.id !== groupeId),
    }));
  }

  /**
   * Crée un nouveau projet au sein d'un groupe (US-007). La politique IA du nouveau projet est toujours interdite
   * (RG-014) : ce Store ne l'expose pas comme donnée saisissable.
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param donnees - Nom et description du projet à créer.
   * @returns L'identifiant UUID v4 du projet créé.
   */
  public creerProjet(groupeId: string, donnees: DonneesProjet): string {
    const id = this.genererId();
    const projet: Projet = {
      id,
      nom: donnees.nom,
      description: donnees.description,
      iaAutorisee: false,
      sources: [],
      annotations: [],
      audits: [],
    };
    this.mettreAJourRacine((racine) => ({
      ...racine,
      groupes: racine.groupes.map((groupe) =>
        groupe.id === groupeId ? { ...groupe, projets: [...groupe.projets, projet] } : groupe,
      ),
    }));
    return id;
  }

  /**
   * Remplace le nom et la description d'un projet existant (US-007).
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param projetId - Identifiant du projet à modifier.
   * @param donnees - Nouvelles valeurs.
   */
  public modifierProjet(groupeId: string, projetId: string, donnees: DonneesProjet): void {
    this.mettreAJourRacine((racine) => ({
      ...racine,
      groupes: racine.groupes.map((groupe) =>
        groupe.id === groupeId
          ? {
              ...groupe,
              projets: groupe.projets.map((projet) =>
                projet.id === projetId ? { ...projet, ...donnees } : projet,
              ),
            }
          : groupe,
      ),
    }));
  }

  /**
   * Supprime un projet et ses sources (US-007). La confirmation préalable relève de l'écran appelant.
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param projetId - Identifiant du projet à supprimer.
   */
  public supprimerProjet(groupeId: string, projetId: string): void {
    this.mettreAJourRacine((racine) => ({
      ...racine,
      groupes: racine.groupes.map((groupe) =>
        groupe.id === groupeId
          ? { ...groupe, projets: groupe.projets.filter((projet) => projet.id !== projetId) }
          : groupe,
      ),
    }));
  }

  /**
   * Duplique un projet existant au sein du même groupe (US-007) : reprend nom (suffixé), description et sources
   * (avec de nouveaux identifiants), mais jamais l'historique (aucune annotation ni aucun audit dupliqué, le
   * projet dupliqué étant une nouvelle entité) ; la politique IA du projet dupliqué est toujours interdite
   * (RG-014), quelle qu'ait été celle du projet source.
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param projetId - Identifiant du projet à dupliquer.
   * @returns L'identifiant UUID v4 du projet dupliqué.
   */
  public dupliquerProjet(groupeId: string, projetId: string): string {
    const projetSource = this.trouverProjet(groupeId, projetId);
    const id = this.genererId();
    const copie: Projet = {
      id,
      nom: `${projetSource.nom} (copie)`,
      description: projetSource.description,
      iaAutorisee: false,
      sources: projetSource.sources.map((source) => ({ ...source, id: this.genererId() })),
      annotations: [],
      audits: [],
    };
    this.mettreAJourRacine((racine) => ({
      ...racine,
      groupes: racine.groupes.map((groupe) =>
        groupe.id === groupeId ? { ...groupe, projets: [...groupe.projets, copie] } : groupe,
      ),
    }));
    return id;
  }

  /**
   * Crée une nouvelle source au sein d'un projet (US-008).
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param projetId - Identifiant du projet de rattachement.
   * @param donnees - Instance, type, identifiant externe et ref auditée de la source à créer.
   * @returns L'identifiant UUID v4 de la source créée.
   */
  public creerSource(groupeId: string, projetId: string, donnees: DonneesSource): string {
    const id = this.genererId();
    const nouvelleSource: Source = {
      id,
      instanceId: donnees.instanceId,
      type: donnees.type,
      idExterne: donnees.idExterne,
      refAuditee: donnees.refAuditee,
    };
    this.mettreAJourRacine((racine) => ({
      ...racine,
      groupes: racine.groupes.map((groupe) =>
        groupe.id === groupeId
          ? {
              ...groupe,
              projets: groupe.projets.map((projet) =>
                projet.id === projetId
                  ? { ...projet, sources: [...projet.sources, nouvelleSource] }
                  : projet,
              ),
            }
          : groupe,
      ),
    }));
    return id;
  }

  /**
   * Remplace intégralement une source existante (US-008). Si la ref auditée change, une entrée est ajoutée au
   * journal des modifications (RG-023), avec l'ancienne et la nouvelle valeur.
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param projetId - Identifiant du projet de rattachement.
   * @param sourceId - Identifiant de la source à modifier.
   * @param donnees - Nouvelles valeurs.
   */
  public modifierSource(
    groupeId: string,
    projetId: string,
    sourceId: string,
    donnees: DonneesSource,
  ): void {
    this.mettreAJourRacine((racine) => {
      const sourceActuelle = this.trouverSource(racine, groupeId, projetId, sourceId);
      const entreeJournal =
        sourceActuelle.refAuditee !== donnees.refAuditee
          ? this.construireEntreeJournalRefAuditee(
              groupeId,
              projetId,
              sourceId,
              sourceActuelle.refAuditee,
              donnees.refAuditee,
            )
          : null;

      const sourceModifiee: Source = {
        id: sourceId,
        instanceId: donnees.instanceId,
        type: donnees.type,
        idExterne: donnees.idExterne,
        refAuditee: donnees.refAuditee,
      };

      return {
        ...racine,
        groupes: racine.groupes.map((groupe) =>
          groupe.id === groupeId
            ? {
                ...groupe,
                projets: groupe.projets.map((projet) =>
                  projet.id === projetId
                    ? {
                        ...projet,
                        sources: projet.sources.map((source) =>
                          source.id === sourceId ? sourceModifiee : source,
                        ),
                      }
                    : projet,
                ),
              }
            : groupe,
        ),
        journal: entreeJournal ? [...racine.journal, entreeJournal] : racine.journal,
      };
    });
  }

  /**
   * Supprime une source (US-008).
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param projetId - Identifiant du projet de rattachement.
   * @param sourceId - Identifiant de la source à supprimer.
   */
  public supprimerSource(groupeId: string, projetId: string, sourceId: string): void {
    this.mettreAJourRacine((racine) => ({
      ...racine,
      groupes: racine.groupes.map((groupe) =>
        groupe.id === groupeId
          ? {
              ...groupe,
              projets: groupe.projets.map((projet) =>
                projet.id === projetId
                  ? {
                      ...projet,
                      sources: projet.sources.filter((source) => source.id !== sourceId),
                    }
                  : projet,
              ),
            }
          : groupe,
      ),
    }));
  }

  /**
   * Qualifie un membre connu d'un groupe (US-022, US-023) : invoque la commande native `qualifierMembre`, qui
   * ajoute ou met à jour la règle, consigne la modification au journal et sauvegarde effectivement le fichier
   * (RG-002, RG-006 à RG-008, RG-012, RG-023) avant de renvoyer la racine mise à jour, substituée à l'état courant
   * de ce Store. Le résultat est un Résultat typé plutôt qu'un rejet de Promise non typé, à traiter par un switch
   * exhaustif sur son discriminant `type` (ex. `doublonUsernameMembreConnu` pour RG-008).
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param donnees - Critère, type, statut et identifiant de la règle à qualifier.
   * @param origine - Origine consignée au journal (`Administration` depuis cet écran).
   * @param motDePasse - Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002).
   * @returns En cas de succès, les identifiants des règles de membres connus du groupe désormais en conflit
   * (RG-008, signalement non bloquant) ; l'anomalie typée en cas d'échec.
   * @throws {Error} Si aucun fichier n'est chargé ou si aucun chemin de fichier n'est connu de la session (erreur
   * de programmation de l'écran appelant, non une anomalie métier).
   */
  public async qualifierMembre(
    groupeId: string,
    donnees: DonneesMembreConnu,
    origine: string,
    motDePasse: string,
  ): Promise<ResultatQualificationMembre> {
    const racine = this.racineActuelle();
    const chemin = this.cheminFichierActuel();
    try {
      const reponse = await this.facadeAdministration.qualifierMembre<
        DonneesRacine,
        ReponseQualificationMembre
      >({
        chemin,
        donnees: racine,
        groupeId,
        membreId: donnees.membreId,
        critere: donnees.critere,
        typeCritere: donnees.typeCritere,
        statut: donnees.statut,
        libelle: donnees.libelle,
        aliasEmail: donnees.aliasEmail,
        origine,
        motDePasse,
      });
      this.racineInterne.set(reponse.donnees);
      return { type: 'succes', membresEnConflit: reponse.membresEnConflit };
    } catch (erreur: unknown) {
      return { type: 'echec', anomalie: this.anomalieAdministration(erreur) };
    }
  }

  /**
   * Définit la politique d'autorisation de l'IA d'un projet (US-024) : invoque la commande native
   * `definirPolitiqueIA`, qui consigne la modification au journal, crée l'annotation système sur autorisation
   * (RG-015) et sauvegarde effectivement le fichier (RG-002, RG-023) avant de renvoyer la racine mise à jour,
   * substituée à l'état courant de ce Store. Un appel redondant (valeur déjà en vigueur) n'écrit rien sur le
   * disque côté cœur natif ; la racine renvoyée reste alors strictement identique.
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param projetId - Identifiant du projet concerné.
   * @param iaAutorisee - Nouvelle valeur de la politique IA du projet.
   * @param motDePasse - Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002).
   * @returns Le Résultat typé de l'opération.
   * @throws {Error} Si aucun fichier n'est chargé ou si aucun chemin de fichier n'est connu de la session.
   */
  public async definirPolitiqueIA(
    groupeId: string,
    projetId: string,
    iaAutorisee: boolean,
    motDePasse: string,
  ): Promise<ResultatMutationAdministration> {
    const racine = this.racineActuelle();
    const chemin = this.cheminFichierActuel();
    try {
      const nouvelleRacine = await this.facadeAdministration.definirPolitiqueIA<
        DonneesRacine,
        DonneesRacine
      >({
        chemin,
        donnees: racine,
        groupeId,
        projetId,
        iaAutorisee,
        motDePasse,
      });
      this.racineInterne.set(nouvelleRacine);
      return { type: 'succes' };
    } catch (erreur: unknown) {
      return { type: 'echec', anomalie: this.anomalieAdministration(erreur) };
    }
  }

  /**
   * Supprime une règle de membre connu d'un groupe (US-023) : invoque la commande native `supprimerMembreConnu`,
   * qui retire la règle, consigne la suppression au journal et sauvegarde effectivement le fichier (RG-002,
   * RG-023) avant de renvoyer la racine mise à jour, substituée à l'état courant de ce Store.
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param membreId - Identifiant de la règle à supprimer.
   * @param origine - Origine consignée au journal (`Administration` depuis cet écran).
   * @param motDePasse - Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002).
   * @returns Le Résultat typé de l'opération.
   * @throws {Error} Si aucun fichier n'est chargé ou si aucun chemin de fichier n'est connu de la session.
   */
  public async supprimerMembreConnu(
    groupeId: string,
    membreId: string,
    origine: string,
    motDePasse: string,
  ): Promise<ResultatMutationAdministration> {
    const racine = this.racineActuelle();
    const chemin = this.cheminFichierActuel();
    try {
      const nouvelleRacine = await this.facadeAdministration.supprimerMembreConnu<
        DonneesRacine,
        DonneesRacine
      >({
        chemin,
        donnees: racine,
        groupeId,
        membreId,
        origine,
        motDePasse,
      });
      this.racineInterne.set(nouvelleRacine);
      return { type: 'succes' };
    } catch (erreur: unknown) {
      return { type: 'echec', anomalie: this.anomalieAdministration(erreur) };
    }
  }

  /**
   * Enregistre les résultats d'une campagne dans la zone de brouillon (US-009, US-014) : invoque la commande
   * native `enregistrerBrouillon`, qui refuse tant qu'un brouillon existant n'a pas été traité (RG-019), puis
   * sauvegarde effectivement le fichier (RG-002) avant de renvoyer la racine mise à jour, substituée à l'état
   * courant de ce Store.
   * @param campagneId - Identifiant de la campagne dont ce brouillon est issu.
   * @param date - Date de lancement de la campagne.
   * @param perimetre - Identifiants des projets du périmètre de la campagne.
   * @param verdicts - Verdicts d'exécution par projet, y compris les projets échoués ou ignorés (RG-018).
   * @param resultatsParProjet - Résultats en attente de validation, par projet.
   * @param motDePasse - Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002).
   * @returns Le Résultat typé de l'opération.
   * @throws {Error} Si aucun fichier n'est chargé ou si aucun chemin de fichier n'est connu de la session.
   */
  public async enregistrerBrouillon(
    campagneId: string,
    date: string,
    perimetre: readonly string[],
    verdicts: readonly Verdict[],
    resultatsParProjet: readonly ResultatBrouillonProjet[],
    motDePasse: string,
  ): Promise<ResultatMutationAdministration> {
    const racine = this.racineActuelle();
    const chemin = this.cheminFichierActuel();
    try {
      const nouvelleRacine = await this.facadeAdministration.enregistrerBrouillon<
        DonneesRacine,
        Verdict,
        ResultatBrouillonProjet,
        DonneesRacine
      >({
        chemin,
        donnees: racine,
        campagneId,
        date,
        perimetre,
        verdicts,
        resultatsParProjet,
        motDePasse,
      });
      this.racineInterne.set(nouvelleRacine);
      return { type: 'succes' };
    } catch (erreur: unknown) {
      return { type: 'echec', anomalie: this.anomalieAdministration(erreur) };
    }
  }

  /**
   * Intègre à l'historique des projets concernés tout ou partie des résultats en attente du brouillon courant
   * (US-014) : invoque la commande native `integrerBrouillon`, qui sauvegarde effectivement le fichier (RG-002)
   * avant de renvoyer la racine mise à jour, substituée à l'état courant de ce Store.
   * @param selection - Identifiants des projets ciblés ; absent = l'intégralité des entrées encore en attente du
   * brouillon (F09 : « intègre tout »).
   * @param motDePasse - Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002).
   * @returns Le Résultat typé de l'opération.
   * @throws {Error} Si aucun fichier n'est chargé ou si aucun chemin de fichier n'est connu de la session.
   */
  public async integrerBrouillon(
    selection: readonly string[] | undefined,
    motDePasse: string,
  ): Promise<ResultatMutationAdministration> {
    const racine = this.racineActuelle();
    const chemin = this.cheminFichierActuel();
    try {
      const nouvelleRacine = await this.facadeAdministration.integrerBrouillon<
        DonneesRacine,
        DonneesRacine
      >({
        chemin,
        donnees: racine,
        selection,
        motDePasse,
      });
      this.racineInterne.set(nouvelleRacine);
      return { type: 'succes' };
    } catch (erreur: unknown) {
      return { type: 'echec', anomalie: this.anomalieAdministration(erreur) };
    }
  }

  /**
   * Rejette tout ou partie des résultats en attente du brouillon courant, sans jamais les ajouter à l'historique
   * du projet concerné (US-014) : invoque la commande native `rejeterBrouillon`, qui sauvegarde effectivement le
   * fichier (RG-002) avant de renvoyer la racine mise à jour, substituée à l'état courant de ce Store.
   * @param selection - Identifiants des projets ciblés ; absent = l'intégralité des entrées encore en attente du
   * brouillon (F09 : « rejette »).
   * @param motif - Motif de rejet optionnel, consigné sur la trace durable de la campagne.
   * @param motDePasse - Mot de passe du fichier, ressaisi par l'utilisateur pour cette sauvegarde (RG-002).
   * @returns Le Résultat typé de l'opération.
   * @throws {Error} Si aucun fichier n'est chargé ou si aucun chemin de fichier n'est connu de la session.
   */
  public async rejeterBrouillon(
    selection: readonly string[] | undefined,
    motif: string | undefined,
    motDePasse: string,
  ): Promise<ResultatMutationAdministration> {
    const racine = this.racineActuelle();
    const chemin = this.cheminFichierActuel();
    try {
      const nouvelleRacine = await this.facadeAdministration.rejeterBrouillon<
        DonneesRacine,
        DonneesRacine
      >({
        chemin,
        donnees: racine,
        selection,
        motif,
        motDePasse,
      });
      this.racineInterne.set(nouvelleRacine);
      return { type: 'succes' };
    } catch (erreur: unknown) {
      return { type: 'echec', anomalie: this.anomalieAdministration(erreur) };
    }
  }

  /**
   * Vérifie, sans accès non sûr à la valeur reçue, qu'un rejet d'une commande native d'administration correspond
   * bien à une anomalie typée (`ErreurFacade` côté cœur natif) plutôt qu'à une valeur inattendue de la frontière
   * IPC, sur le modèle de la méthode équivalente de `FacadeCommandesService`.
   * @param valeur - Valeur rejetée par `invoke`, de type `unknown` à cette frontière.
   * @returns L'anomalie typée, ou la catégorie `erreurInterne` par défaut si `valeur` ne correspond pas à la
   * forme attendue.
   */
  private anomalieAdministration(valeur: unknown): ErreurAdministration {
    const categories: readonly CategorieErreurAdministration[] = [
      'groupeIntrouvable',
      'projetIntrouvable',
      'membreIntrouvable',
      'doublonUsernameMembreConnu',
      'brouillonDejaExistant',
      'aucunBrouillonCourant',
      'projetAbsentDuBrouillon',
      'fichierIntrouvable',
      'motDePasseOuFichierInvalide',
      'formatNonReconnu',
      'versionSchemaSuperieure',
      'fichierVerrouille',
      'aucunFichierOuvert',
      'credentialInvalide',
      'erreurInterne',
    ];
    if (typeof valeur === 'object' && valeur !== null && 'type' in valeur) {
      const categorie: unknown = valeur.type;
      const trouvee = categories.find((candidate) => candidate === categorie);
      if (trouvee) {
        return { type: trouvee };
      }
    }
    return { type: 'erreurInterne' };
  }

  /**
   * Construit l'entrée de journal (RG-023) consignant un changement de ref auditée.
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param projetId - Identifiant du projet de rattachement.
   * @param sourceId - Identifiant de la source concernée.
   * @param avant - Ancienne ref auditée, `undefined` si elle était absente.
   * @param apres - Nouvelle ref auditée, `undefined` si elle devient absente.
   * @returns La nouvelle entrée de journal, non encore ajoutée à la racine.
   */
  private construireEntreeJournalRefAuditee(
    groupeId: string,
    projetId: string,
    sourceId: string,
    avant: string | undefined,
    apres: string | undefined,
  ): EntreeJournal {
    return {
      id: this.genererId(),
      horodatage: new Date().toISOString(),
      objet: `groupes/${groupeId}/projets/${projetId}/sources/${sourceId}/refAuditee`,
      avant: avant ?? null,
      apres: apres ?? null,
      origine: ORIGINE_ADMINISTRATION,
    };
  }

  /**
   * Retrouve un projet par identifiant dans l'état courant.
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param projetId - Identifiant du projet recherché.
   * @returns Le projet trouvé.
   * @throws {Error} Si aucun fichier n'est chargé, si le groupe ou le projet n'existe pas.
   */
  private trouverProjet(groupeId: string, projetId: string): Projet {
    const racine = this.racineInterne();
    if (!racine) {
      throw new Error("Aucun fichier de données n'est chargé.");
    }
    const groupe = racine.groupes.find((candidat) => candidat.id === groupeId);
    const projet = groupe?.projets.find((candidat) => candidat.id === projetId);
    if (!projet) {
      throw new Error(`Projet introuvable : ${groupeId}/${projetId}`);
    }
    return projet;
  }

  /**
   * Retrouve une source par identifiant au sein de la racine donnée.
   * @param racine - Racine dans laquelle rechercher.
   * @param groupeId - Identifiant du groupe de rattachement.
   * @param projetId - Identifiant du projet de rattachement.
   * @param sourceId - Identifiant de la source recherchée.
   * @returns La source trouvée.
   * @throws {Error} Si le groupe, le projet ou la source n'existe pas.
   */
  private trouverSource(
    racine: DonneesRacine,
    groupeId: string,
    projetId: string,
    sourceId: string,
  ): Source {
    const groupe = racine.groupes.find((candidat) => candidat.id === groupeId);
    const projet = groupe?.projets.find((candidat) => candidat.id === projetId);
    const source = projet?.sources.find((candidat) => candidat.id === sourceId);
    if (!source) {
      throw new Error(`Source introuvable : ${groupeId}/${projetId}/${sourceId}`);
    }
    return source;
  }

  /**
   * Applique une mutation immuable à la racine courante.
   * @param mutateur - Fonction produisant la nouvelle racine à partir de l'actuelle.
   * @throws {Error} Si aucun fichier n'est chargé.
   */
  private mettreAJourRacine(mutateur: (racine: DonneesRacine) => DonneesRacine): void {
    const racine = this.racineInterne();
    if (!racine) {
      throw new Error("Aucun fichier de données n'est chargé.");
    }
    this.racineInterne.set(mutateur(racine));
  }

  /**
   * Racine actuellement chargée, requise avant l'invocation d'une commande native échangeant la racine complète.
   * @returns La racine courante.
   * @throws {Error} Si aucun fichier n'est chargé.
   */
  private racineActuelle(): DonneesRacine {
    const racine = this.racineInterne();
    if (!racine) {
      throw new Error("Aucun fichier de données n'est chargé.");
    }
    return racine;
  }

  /**
   * Chemin du fichier actuellement ouvert, requis avant l'invocation d'une commande native qui sauvegarde
   * effectivement sur le disque.
   * @returns Le chemin du fichier courant.
   * @throws {Error} Si aucun chemin de fichier n'est connu de la session (aucun fichier ouvert).
   */
  private cheminFichierActuel(): string {
    const chemin = this.etatSession.cheminFichier();
    if (!chemin) {
      throw new Error("Aucun fichier n'est actuellement ouvert.");
    }
    return chemin;
  }

  /**
   * Génère un identifiant UUID v4.
   * @returns Un nouvel identifiant UUID v4.
   */
  private genererId(): string {
    return crypto.randomUUID();
  }
}
