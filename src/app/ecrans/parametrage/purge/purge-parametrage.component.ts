// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet « Purge des audits » de l'écran Paramétrage (US-025, Phase 7, incrément 4 ; RG-024, RG-025) : purge par
// densité (audits rapprochés de moins de sept jours) et purge par âge (au-delà de six mois, suppression ou
// agrégation mensuelle), toujours proposées avec prévisualisation du volume libéré, jamais automatiques (F19). Un
// unique discriminant d'action en attente (`'densite' | 'age' | null`) plutôt que deux indicateurs distincts, sur
// le même patron que `SqmReferentielsParametrageComponent` (une seule action possible à la fois).
//
// Décision arbitraire (à valider par un humain, cf. rapport de développement de cet incrément) : la sélection des
// audits à supprimer n'est jamais recalculée côté interface, ni transmise par elle à la commande d'exécution — ce
// composant se contente d'afficher le résumé renvoyé par les commandes natives de consultation
// (`previsualiserPurgeDensite`/`previsualiserPurgeAge`) et d'invoquer, après confirmation du mot de passe, la
// commande de mutation correspondante (`executerPurgeDensite`/`executerPurgeAge`), qui recalcule elle-même cette
// sélection à partir de la racine transmise (cf. commentaire d'en-tête de `persistance::purge` côté cœur natif).
//
// Complété par plan_20 Partie D (US-063, RG-063) d'une section « Suppression ciblée » : à la différence des deux
// purges automatiques ci-dessus, la sélection des audits à supprimer est ici entièrement déterminée côté interface
// (cases à cocher sur la liste transverse `AuditTransverseUtils.construireLignes`, filtrable par date de
// réalisation / création, date ciblée, groupe, projet, type) et transmise telle quelle aux commandes natives
// (`previsualiserSuppressionAudits`/`supprimerAudits`), qui revalident néanmoins chaque identifiant avant toute
// suppression effective (cf. commentaire d'en-tête de `persistance::suppression_audits` côté cœur natif). Les
// filtres et la sélection sont des signaux (jamais de simples propriétés mutées directement) : `lignesFiltrees`
// est un `computed` qui ne se réévalue qu'en réaction à la lecture d'un signal.
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import { AuditTransverseUtils } from '../../../services/sansetat/jugement/audit-transverse.utils';
import type { LigneAuditTransverse } from '../../../services/sansetat/jugement/audit-transverse.utils';
import { TailleFichierUtils } from '../../../services/sansetat/taille-fichier.utils';
import type {
  ErreurAdministration,
  ModePurgeAge,
  PrevisualisationPurge,
  PrevisualisationSuppressionAudits,
  ProjetVide,
} from '../../../services/avecetat/etat/types-donnees';

/**
 * Action de purge actuellement en attente de ressaisie du mot de passe (RG-002), `null` si aucune.
 */
type ActionPurgeEnAttente = 'densite' | 'age' | 'ciblee' | null;

/**
 * Projet qui perdrait son repère « prise en charge » (RG-059) si la sélection courante d'audits était supprimée :
 * l'audit portant exactement la `date` du premier commit interne `determine` du projet fait partie de la
 * sélection. Même forme que {@link ProjetVide} (`projetId`/`nomProjet`), réutilisée par alias plutôt que
 * redéclarée : les deux notions sont distinctes (vidé entièrement / repère perdu) mais partagent la même charge
 * utile d'affichage.
 */
type ProjetPerdantRepere = ProjetVide;

/**
 * Onglet « Purge des audits » : prévisualisation et exécution d'une purge par densité ou par âge des audits
 * anciens (US-025, RG-024, RG-025).
 */
@Component({
  selector: 'app-purge-parametrage',
  imports: [FormsModule, SqmConfirmationMotDePasseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './purge-parametrage.component.html',
})
export class SqmPurgeParametrageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

  /**
   * Résumé de la dernière prévisualisation de purge par densité, `null` si aucune n'a encore été demandée ou si la
   * racine a changé depuis (purge exécutée, ou par un autre onglet). Signal car mis à jour depuis la continuation
   * asynchrone d'un appel à une commande native, hors de toute planification automatique de détection de
   * changement en application zoneless (cf. commentaire d'en-tête de `cheminCreation` dans
   * `demarrage.component.ts`).
   */
  public readonly previsualisationDensite: WritableSignal<PrevisualisationPurge | null> =
    signal<PrevisualisationPurge | null>(null);

  /**
   * Résumé de la dernière prévisualisation de purge par âge, `null` si aucune n'a encore été demandée. Signal pour
   * le même motif que {@link previsualisationDensite}.
   */
  public readonly previsualisationAge: WritableSignal<PrevisualisationPurge | null> =
    signal<PrevisualisationPurge | null>(null);

  /**
   * Mode de purge par âge actuellement sélectionné (RG-025).
   */
  public modeAge: ModePurgeAge = 'suppression';

  /**
   * Action de purge en attente de ressaisie du mot de passe (RG-002). Signal pour le même motif que
   * {@link previsualisationDensite}.
   */
  public readonly actionEnAttenteMotDePasse: WritableSignal<ActionPurgeEnAttente> =
    signal<ActionPurgeEnAttente>(null);

  /**
   * Indique qu'un appel à une commande native est en cours, pour désactiver les actions concurrentes. Signal pour
   * le même motif que {@link previsualisationDensite}.
   */
  public readonly enCours: WritableSignal<boolean> = signal(false);

  /**
   * Prévisualise une purge par densité (RG-024).
   */
  public async previsualiserDensite(): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.previsualiserPurgeDensite();
    this.enCours.set(false);
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.previsualisationDensite.set(resultat.previsualisation);
  }

  /**
   * Ouvre la ressaisie du mot de passe pour l'exécution de la purge par densité (RG-002), si une prévisualisation
   * concernant au moins un audit a été demandée au préalable.
   */
  public demanderExecutionDensite(): void {
    const previsualisation = this.previsualisationDensite();
    if (!previsualisation || previsualisation.nbAuditsSupprimes === 0) {
      return;
    }
    this.actionEnAttenteMotDePasse.set('densite');
  }

  /**
   * Exécute la purge par densité après confirmation du mot de passe (RG-002, RG-024).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerExecutionDensite(motDePasse: string): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.executerPurgeDensite(motDePasse);
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.previsualisationDensite.set(null);
    this.notification.succes('La purge par densité a été effectuée.');
  }

  /**
   * Prévisualise une purge par âge pour le mode actuellement sélectionné (RG-025).
   */
  public async previsualiserAge(): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.previsualiserPurgeAge(this.modeAge);
    this.enCours.set(false);
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.previsualisationAge.set(resultat.previsualisation);
  }

  /**
   * Ouvre la ressaisie du mot de passe pour l'exécution de la purge par âge (RG-002), si une prévisualisation
   * concernant au moins un audit a été demandée au préalable pour le mode actuellement sélectionné.
   */
  public demanderExecutionAge(): void {
    const previsualisation = this.previsualisationAge();
    if (!previsualisation || previsualisation.nbAuditsSupprimes === 0) {
      return;
    }
    this.actionEnAttenteMotDePasse.set('age');
  }

  /**
   * Exécute la purge par âge, pour le mode actuellement sélectionné, après confirmation du mot de passe (RG-002,
   * RG-025).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerExecutionAge(motDePasse: string): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.executerPurgeAge(this.modeAge, motDePasse);
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.previsualisationAge.set(null);
    this.notification.succes('La purge par âge a été effectuée.');
  }

  /**
   * Invalide toute prévisualisation de purge par âge déjà affichée dès que l'utilisateur change de mode, pour ne
   * jamais laisser affiché un résumé qui ne correspond plus au mode sélectionné.
   * @param mode - Mode de purge par âge nouvellement sélectionné.
   */
  public changerModeAge(mode: ModePurgeAge): void {
    this.modeAge = mode;
    this.previsualisationAge.set(null);
  }

  /**
   * Annule la ressaisie du mot de passe en cours.
   */
  public annulerMotDePasse(): void {
    this.actionEnAttenteMotDePasse.set(null);
  }

  // --- Suppression ciblée (US-063, RG-063, plan_20 Partie D) ---

  /**
   * Liste transverse des audits de tous les projets de tous les groupes, triée par défaut par date de réalisation /
   * création décroissante (décision 11 du plan). Recalculée à chaque changement de la racine (signal dérivé).
   */
  public readonly lignesTransverses: Signal<readonly LigneAuditTransverse[]> = computed(() => {
    const racine = this.donneesApplication.racine();
    const lignes = racine === null ? [] : AuditTransverseUtils.construireLignes(racine);
    return [...lignes].sort((a, b) => b.dateRealisationTri.localeCompare(a.dateRealisationTri));
  });

  /** Groupes distincts portant au moins un audit, pour le filtre de groupe. */
  public readonly groupesFiltrables: Signal<
    readonly { readonly id: string; readonly nom: string }[]
  > = computed(() => {
    const parId = new Map<string, string>();
    for (const ligne of this.lignesTransverses()) {
      parId.set(ligne.groupeId, ligne.groupeLabel);
    }
    return [...parId.entries()]
      .map(([id, nom]) => ({ id, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  });

  /** Projets distincts portant au moins un audit, restreints au groupe filtré s'il y en a un. */
  public readonly projetsFiltrables: Signal<
    readonly { readonly id: string; readonly nom: string }[]
  > = computed(() => {
    const parId = new Map<string, string>();
    const groupeId = this.filtreGroupeId();
    for (const ligne of this.lignesTransverses()) {
      if (groupeId.length > 0 && ligne.groupeId !== groupeId) {
        continue;
      }
      parId.set(ligne.projetId, ligne.projetLabel);
    }
    return [...parId.entries()]
      .map(([id, nom]) => ({ id, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  });

  /**
   * Filtres courants de la liste transverse, en signaux plutôt qu'en propriétés simples : {@link lignesFiltrees}
   * est un signal dérivé (`computed`), qui ne se réévalue qu'en réaction à la lecture d'un autre signal — une
   * simple propriété mutée directement ne le rendrait jamais obsolète.
   */
  /** Plage de date de réalisation / création, filtre primaire de l'objectif « versions antérieures » (décision 11). */
  public readonly filtreDateRealisationMin: WritableSignal<string> = signal('');
  public readonly filtreDateRealisationMax: WritableSignal<string> = signal('');
  /** Plage de date ciblée. */
  public readonly filtreDateCibleeMin: WritableSignal<string> = signal('');
  public readonly filtreDateCibleeMax: WritableSignal<string> = signal('');
  /** Groupe sélectionné, chaîne vide = tous. */
  public readonly filtreGroupeId: WritableSignal<string> = signal('');
  /** Projet sélectionné, chaîne vide = tous. */
  public readonly filtreProjetId: WritableSignal<string> = signal('');
  /** Type d'audit sélectionné, chaîne vide = tous. */
  public readonly filtreType: WritableSignal<'' | 'reguliere' | 'historique'> = signal('');

  /** Résultat filtré de {@link lignesTransverses} selon les filtres courants. */
  public readonly lignesFiltrees: Signal<readonly LigneAuditTransverse[]> = computed(() =>
    this.lignesTransverses().filter((ligne) => this.correspondAuxFiltres(ligne)),
  );

  /** Identifiants des audits actuellement cochés (persistent au-delà d'un changement de filtre). */
  private readonly auditIdsSelectionnesInterne: WritableSignal<ReadonlySet<string>> = signal(
    new Set<string>(),
  );

  /** Résumé de la sélection courante (nombre d'audits, nombre de projets distincts). */
  public readonly resumeSelection: Signal<{
    readonly nbAudits: number;
    readonly nbProjets: number;
  }> = computed(() => {
    const ids = this.auditIdsSelectionnesInterne();
    const lignesSelectionnees = this.lignesTransverses().filter((ligne) => ids.has(ligne.auditId));
    const projets = new Set(lignesSelectionnees.map((ligne) => ligne.projetId));
    return { nbAudits: lignesSelectionnees.length, nbProjets: projets.size };
  });

  /**
   * Résumé de la dernière prévisualisation de suppression ciblée, `null` si aucune n'a encore été demandée ou si
   * la sélection a changé depuis (invalidée par {@link mettreAJourSelection}, pour ne jamais confirmer une
   * suppression sur un résumé obsolète).
   */
  public readonly previsualisationCiblee: WritableSignal<PrevisualisationSuppressionAudits | null> =
    signal<PrevisualisationSuppressionAudits | null>(null);

  /**
   * Projets qui perdraient leur repère « prise en charge » (RG-059) si la sélection courante était supprimée :
   * l'audit exactement à la date du premier commit interne `determine` du projet fait partie de la sélection.
   */
  public readonly projetsPerdantRepere: Signal<readonly ProjetPerdantRepere[]> = computed(() => {
    const racine = this.donneesApplication.racine();
    if (racine === null) {
      return [];
    }
    const ids = this.auditIdsSelectionnesInterne();
    const resultat: ProjetPerdantRepere[] = [];
    for (const groupe of racine.groupes) {
      for (const projet of groupe.projets) {
        const premierCommitInterne = projet.premierCommitInterne;
        if (premierCommitInterne?.statut !== 'determine') {
          continue;
        }
        const perdLeRepere = projet.audits.some(
          (audit) => ids.has(audit.id) && audit.date === premierCommitInterne.date,
        );
        if (perdLeRepere) {
          resultat.push({ projetId: projet.id, nomProjet: projet.nom });
        }
      }
    }
    return resultat;
  });

  /**
   * Vérifie qu'une ligne correspond à l'ensemble des filtres courants (plage de date de réalisation, plage de
   * date ciblée, groupe, projet, type).
   * @param ligne - Ligne à évaluer.
   * @returns `true` si la ligne correspond à tous les filtres actifs.
   */
  private correspondAuxFiltres(ligne: LigneAuditTransverse): boolean {
    const groupeId = this.filtreGroupeId();
    if (groupeId.length > 0 && ligne.groupeId !== groupeId) {
      return false;
    }
    const projetId = this.filtreProjetId();
    if (projetId.length > 0 && ligne.projetId !== projetId) {
      return false;
    }
    const type = this.filtreType();
    if (type.length > 0 && ligne.type !== type) {
      return false;
    }
    if (
      !SqmPurgeParametrageComponent.correspondALaPlage(
        ligne.dateRealisationTri,
        this.filtreDateRealisationMin(),
        this.filtreDateRealisationMax(),
      )
    ) {
      return false;
    }
    return SqmPurgeParametrageComponent.correspondALaPlage(
      ligne.dateCibleeTri,
      this.filtreDateCibleeMin(),
      this.filtreDateCibleeMax(),
    );
  }

  /**
   * Vérifie qu'une date (calendaire ou horodatage complet, dont seuls les dix premiers caractères `AAAA-MM-JJ`
   * sont comparés) se situe dans la plage `[min ; max]`, bornes ouvertes si vides.
   * @param dateTri - Date brute (calendaire ou horodatage ISO complet).
   * @param min - Borne inférieure (`AAAA-MM-JJ`), chaîne vide = pas de borne.
   * @param max - Borne supérieure (`AAAA-MM-JJ`), chaîne vide = pas de borne.
   * @returns `true` si `dateTri` est dans la plage.
   */
  private static correspondALaPlage(dateTri: string, min: string, max: string): boolean {
    const jour = dateTri.slice(0, 10);
    if (min.length > 0 && jour < min) {
      return false;
    }
    return !(max.length > 0 && jour > max);
  }

  /**
   * Réinitialise le filtre de projet lorsque le groupe change, pour ne jamais laisser sélectionné un projet
   * n'appartenant pas au groupe nouvellement choisi.
   * @param groupeId - Identifiant du groupe nouvellement sélectionné, chaîne vide = tous.
   */
  public changerFiltreGroupe(groupeId: string): void {
    this.filtreGroupeId.set(groupeId);
    this.filtreProjetId.set('');
  }

  /**
   * Indique si l'audit désigné fait partie de la sélection courante.
   * @param auditId - Identifiant de l'audit.
   * @returns `true` si l'audit est actuellement coché.
   */
  public estSelectionne(auditId: string): boolean {
    return this.auditIdsSelectionnesInterne().has(auditId);
  }

  /**
   * Point de passage unique de toute modification de la sélection courante : invalide la prévisualisation déjà
   * affichée (devenue obsolète) et **annule toute ressaisie du mot de passe en cours pour cette action**, pour ne
   * jamais confirmer une suppression sur une sélection différente de celle réellement prévisualisée et montrée à
   * l'utilisateur (ex. case cochée/décochée pendant que la boîte de confirmation est déjà ouverte).
   * @param nouvelleSelection - Nouvel ensemble d'identifiants d'audit sélectionnés.
   */
  private mettreAJourSelection(nouvelleSelection: ReadonlySet<string>): void {
    this.auditIdsSelectionnesInterne.set(nouvelleSelection);
    this.previsualisationCiblee.set(null);
    if (this.actionEnAttenteMotDePasse() === 'ciblee') {
      this.actionEnAttenteMotDePasse.set(null);
    }
  }

  /**
   * Coche ou décoche un audit (bascule de son état courant), et invalide toute prévisualisation ou ressaisie du
   * mot de passe déjà en cours (cf. {@link mettreAJourSelection}).
   * @param auditId - Identifiant de l'audit.
   */
  public bascule(auditId: string): void {
    const nouvelleSelection = new Set(this.auditIdsSelectionnesInterne());
    if (nouvelleSelection.has(auditId)) {
      nouvelleSelection.delete(auditId);
    } else {
      nouvelleSelection.add(auditId);
    }
    this.mettreAJourSelection(nouvelleSelection);
  }

  /**
   * Coche l'ensemble des lignes actuellement visibles après filtrage, en plus de la sélection déjà en cours
   * (décision 11 du plan : « tout cocher le résultat filtré »).
   */
  public toutCocherResultatFiltre(): void {
    const nouvelleSelection = new Set(this.auditIdsSelectionnesInterne());
    for (const ligne of this.lignesFiltrees()) {
      nouvelleSelection.add(ligne.auditId);
    }
    this.mettreAJourSelection(nouvelleSelection);
  }

  /**
   * Décoche l'intégralité de la sélection courante, filtres actifs ou non.
   */
  public toutDecocher(): void {
    this.mettreAJourSelection(new Set<string>());
  }

  /**
   * Prévisualise la suppression de la sélection courante (RG-063).
   */
  public async previsualiserSuppressionCiblee(): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.previsualiserSuppressionAudits([
      ...this.auditIdsSelectionnesInterne(),
    ]);
    this.enCours.set(false);
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.previsualisationCiblee.set(resultat.previsualisation);
  }

  /**
   * Ouvre la ressaisie du mot de passe pour l'exécution de la suppression ciblée (RG-002), si une prévisualisation
   * concernant au moins un audit a été demandée au préalable.
   */
  public demanderExecutionCiblee(): void {
    const previsualisation = this.previsualisationCiblee();
    if (!previsualisation || previsualisation.nbAudits === 0) {
      return;
    }
    this.actionEnAttenteMotDePasse.set('ciblee');
  }

  /**
   * Exécute la suppression ciblée après confirmation du mot de passe (RG-002, RG-063).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerExecutionCiblee(motDePasse: string): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.supprimerAudits(
      [...this.auditIdsSelectionnesInterne()],
      motDePasse,
    );
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);
    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.auditIdsSelectionnesInterne.set(new Set<string>());
    this.previsualisationCiblee.set(null);
    this.notification.succes('La suppression ciblée a été effectuée.');
  }

  /**
   * Met en forme une taille en octets en mégaoctets, une décimale, registre français (virgule).
   * @param octets - Taille en octets.
   * @returns Le texte affichable (ex. `2,4 Mo`).
   */
  public formaterOctets(octets: number): string {
    return TailleFichierUtils.formaterMegaOctets(octets);
  }

  /**
   * Traduit une anomalie typée en message lisible par l'utilisateur, sans détail technique sensible.
   * @param anomalie - Anomalie remontée par la commande native.
   * @returns Le message à afficher.
   */
  private libelleAnomalie(anomalie: ErreurAdministration): string {
    switch (anomalie.type) {
      case 'modePurgeAgeInconnu':
        return "Ce mode de purge par âge n'est pas reconnu.";
      case 'fichierVerrouille':
        return 'Le fichier de données est verrouillé par un autre processus.';
      case 'motDePasseOuFichierInvalide':
        return 'Mot de passe incorrect.';
      case 'sessionVerrouillee':
        return 'La session est verrouillée : déverrouillez-la avant de sauvegarder.';
      case 'motDePasseSessionDivergent':
        return 'Le mot de passe saisi ne correspond pas à celui de la session en cours.';
      case 'cleSeuilIntrouvable':
      case 'typeReferentielInconnu':
      case 'motifDependanceDejaExistant':
      case 'libelleCategorieDependanceDejaExistant':
      case 'entreeReferentielInvalide':
      case 'motifNommageBranchesInvalide':
      case 'groupeIntrouvable':
      case 'projetIntrouvable':
      case 'membreIntrouvable':
      case 'doublonUsernameMembreConnu':
      case 'conflitReglesMembreConnu':
      case 'dateDepartInvalide':
      case 'brouillonDejaExistant':
      case 'aucunBrouillonCourant':
      case 'projetAbsentDuBrouillon':
      case 'fichierIntrouvable':
      case 'formatNonReconnu':
      case 'versionSchemaSuperieure':
      case 'aucunFichierOuvert':
      case 'credentialInvalide':
      case 'fichierConfigurationIllisible':
      case 'formatConfigurationNonReconnu':
      case 'versionSchemaConfigurationSuperieure':
      case 'ligneDifferentielInconnue':
      case 'vueIntrouvable':
      case 'reglageApplicatifInvalide':
      case 'entreeReferentielIntrouvable':
      case 'annotationIntrouvable':
      case 'annotationSystemeNonSupprimable':
      case 'nouveauMotDePasseInvalide':
      case 'erreurInterne':
        return "Une erreur inattendue est survenue lors de l'opération.";
      case 'auditIntrouvable':
        return "Au moins un audit sélectionné n'existe plus (données modifiées entre-temps) : aucune suppression n'a été effectuée, veuillez rafraîchir la sélection.";
    }
  }
}
