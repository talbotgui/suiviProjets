// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Store d'état applicatif des données du fichier (Phase 3 du plan de développement, US-006, US-007, US-008).
// Nom de service arbitraire (décision à signaler dans le rapport de développement, sur le modèle de la décision
// similaire déjà prise pour `deverrouillerSession` en Phase 1) : `docs/02_documentation/13_conceptionDetaillee.md#détail-des-modulescomposants-et-de-leurs-interfaces`
// ne nomme qu'un unique « Store d'état applicatif », déjà porté par `EtatSessionService` pour la session ; ce
// service en est le pendant pour les données du fichier de données lui-même (groupes, projets, sources).
//
// Décision d'architecture (cf. rapport de développement de cette phase) : conformément à l'absence de toute
// commande `creerGroupe`/`creerProjet`/`creerSource` dans la Façade de commandes documentée, le CRUD a lieu
// entièrement ici, sur la racine déjà chargée en mémoire (obtenue par `creerFichier`/`chargerFichier`) ; la
// persistance sur disque reste assurée par la commande `sauvegarderFichier` existante (Phase 1), qui réécrit la
// racine intégralement (`docs/02_documentation/12_modeleDonnees.md#stratégie-de-persistance`). Chaque mutation
// produit une nouvelle racine immuable plutôt que de modifier l'existante en place, pour rester cohérent avec les
// Signals Angular (détection de changement par égalité de référence).
import { Injectable, computed, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import type { Instance } from '../../sansetat/commandes/types-facade';
import type { DonneesRacine, EntreeJournal, Groupe, Projet, Source } from './types-donnees';
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
 * Store d'état applicatif des données du fichier actuellement chargé (Phase 3) : expose la racine courante en
 * lecture seule et l'ensemble des mutations CRUD sur les groupes, projets et sources (US-006, US-007, US-008).
 * Aucune de ces mutations n'écrit sur disque : la sauvegarde explicite (`sauvegarderFichier`, RG-002) reste une
 * action distincte, déclenchée par l'écran appelant.
 */
@Injectable({ providedIn: 'root' })
export class DonneesApplicationService {
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
   * Génère un identifiant UUID v4.
   * @returns Un nouvel identifiant UUID v4.
   */
  private genererId(): string {
    return crypto.randomUUID();
  }
}
