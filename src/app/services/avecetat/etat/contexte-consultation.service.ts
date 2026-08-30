// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Store d'état applicatif du filtre groupe/projet mutualisé (plan_16, incrément 2 — RG-053, US-053). Porte la
// seule sélection de groupe et de projets partagée entre les écrans de restitution (Synthèse des audits, Synthèse
// graphique, Obsolescence, Liste de travail) : chaque écran lit son état initial ici et y réécrit à chaque
// changement, de sorte que le périmètre suive l'utilisateur d'un écran à l'autre sans ressaisie.
//
// Comme `EtatSessionService`, ce service n'invoque aucune commande Tauri et n'observe aucun autre service : il
// expose un état réactif local, mis à jour par les couches consommatrices (écrans consommateurs pour les
// mutations ; `DonneesApplicationService` pour la réinitialisation au changement de fichier, sur le même modèle
// que la purge des credentials). Il n'est jamais persisté dans le fichier de données (état de session uniquement,
// cf. `docs/02_documentation/05_reglesGestion.md#navigation-transverse-et-filtrage-mutualisé`, arbitrage du
// 2026-08-30). Son cycle de vie est calqué sur celui de l'historique de navigation (RG-052) : conservé au
// verrouillage puis restauré au déverrouillage (aucune purge n'y est déclenchée), remis à l'état initial (aucun
// groupe, tous les projets) au changement de fichier de données (chargement d'un autre fichier, création,
// fermeture).
import { Injectable, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';

/**
 * Sélection de périmètre partagée par les écrans de restitution filtrés (RG-053). `null` signifie explicitement
 * « aucune restriction » : `groupeId` à `null` = tous les groupes, `projetIds` à `null` = tous les projets (du
 * groupe courant, ou de tous les groupes si `groupeId` vaut `null`).
 */
export interface EtatFiltreGroupeProjet {
  /** Identifiant du groupe sélectionné, `null` = tous les groupes. */
  readonly groupeId: string | null;
  /** Identifiants des projets sélectionnés, `null` = aucune restriction de projet. */
  readonly projetIds: readonly string[] | null;
}

/**
 * État initial du filtre partagé : aucun groupe, aucune restriction de projet. Réutilisé à la création du service
 * et à chaque changement de fichier de données.
 */
const ETAT_INITIAL: EtatFiltreGroupeProjet = { groupeId: null, projetIds: null };

/**
 * Store d'état applicatif du filtre groupe/projet mutualisé (RG-053). Expose la sélection courante et un indicateur
 * signalant si l'utilisateur l'a modifiée pendant la session (qui pilote la priorité entre le filtre partagé et la
 * vue par défaut d'un écran, cf. `docs/02_documentation/05_reglesGestion.md#navigation-transverse-et-filtrage-mutualisé`).
 */
@Injectable({ providedIn: 'root' })
export class ContexteConsultationService {
  private readonly etatInterne: WritableSignal<EtatFiltreGroupeProjet> = signal(ETAT_INITIAL);
  private readonly modifieParUtilisateurInterne: WritableSignal<boolean> = signal(false);

  /**
   * Sélection de groupe et de projets courante, partagée entre écrans, exposée en lecture seule.
   */
  public readonly etat: Signal<EtatFiltreGroupeProjet> = this.etatInterne.asReadonly();

  /**
   * Indique si l'utilisateur a modifié le filtre partagé pendant la session courante. Tant qu'il vaut `false`, la
   * vue par défaut d'un écran non encore visité peut amorcer le filtre ; dès qu'il vaut `true`, le filtre partagé
   * l'emporte (RG-053, ordre de priorité).
   */
  public readonly filtreModifieParUtilisateur: Signal<boolean> =
    this.modifieParUtilisateurInterne.asReadonly();

  /**
   * Enregistre une sélection décidée par l'utilisateur (choix dans le composant de filtre, sélection explicite
   * d'une vue enregistrée, lien contextuel pré-filtrant) : remplace l'état courant et marque le filtre comme
   * modifié par l'utilisateur, de sorte qu'il l'emporte désormais sur toute vue par défaut d'écran (RG-053).
   * @param etat - Nouvelle sélection de groupe et de projets.
   */
  public definirParUtilisateur(etat: EtatFiltreGroupeProjet): void {
    this.etatInterne.set(ContexteConsultationService.normaliser(etat));
    this.modifieParUtilisateurInterne.set(true);
  }

  /**
   * Amorce le filtre partagé depuis la vue par défaut d'un écran, sans marquer le filtre comme modifié par
   * l'utilisateur (RG-053, source de priorité n°3). Sans effet si l'utilisateur a déjà touché le filtre pendant la
   * session : dans ce cas, son choix le suit d'un écran à l'autre et prime sur la vue par défaut.
   * @param etat - Sélection portée par la vue par défaut de l'écran.
   */
  public amorcerParVueParDefaut(etat: EtatFiltreGroupeProjet): void {
    if (this.modifieParUtilisateurInterne()) {
      return;
    }
    this.etatInterne.set(ContexteConsultationService.normaliser(etat));
  }

  /**
   * Remet le filtre partagé à son état initial (aucun groupe, aucune restriction de projet) et efface l'indicateur
   * de modification. Invoqué par `DonneesApplicationService` au changement de fichier de données (chargement d'un
   * autre fichier, création, fermeture) ; jamais au verrouillage.
   */
  public reinitialiser(): void {
    this.etatInterne.set(ETAT_INITIAL);
    this.modifieParUtilisateurInterne.set(false);
  }

  /**
   * Normalise une sélection reçue : une chaîne vide de `groupeId` devient `null`, un tableau de `projetIds` vide
   * devient `null` (les deux formes signifiant « aucune restriction »).
   * @param etat - Sélection à normaliser.
   * @returns La sélection normalisée.
   */
  private static normaliser(etat: EtatFiltreGroupeProjet): EtatFiltreGroupeProjet {
    const groupeId = etat.groupeId !== null && etat.groupeId.length > 0 ? etat.groupeId : null;
    const projetIds =
      etat.projetIds !== null && etat.projetIds.length > 0 ? [...etat.projetIds] : null;
    return { groupeId, projetIds };
  }
}
