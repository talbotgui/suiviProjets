// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Brouillon et rapport d'anomalies (US-013, US-014, Phase 5, incrément 6) : présente le différentiel du
// brouillon courant par rapport au dernier audit intégré de chaque projet (F09 : indicateurs bougeant au-delà du
// seuil de matérialité, valeurs aberrantes RG-020 déjà calculées à l'incrément 4), permet d'intégrer tout,
// d'intégrer projet par projet ou de rejeter (motif optionnel, RG-019/RG-020), et restitue le rapport d'anomalies
// techniques de la campagne regroupées par cause commune (F08, RG-021, `RapportAnomaliesUtils`).
//
// La couche service (`DonneesApplicationService.integrerBrouillon`/`rejeterBrouillon`) existe depuis la Phase 5,
// incrément 2, mais n'avait encore aucun appelant réel dans l'interface avant cet incrément (cf.
// `docs/04_rapports/rapportDeDeveloppement.md`).
//
// Routé seul, sans shell applicatif, même choix pragmatique que les deux autres écrans d'Audits (cf. commentaire
// d'en-tête de `ecrans/audits/constitution-campagne/constitution-campagne.component.ts`). RG-019 reste, comme
// décidé pour cet incrément, un bandeau de blocage dans Constitution de campagne plutôt qu'un guard de route ;
// ce bandeau porte désormais un lien direct vers cet écran.
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type {
  ErreurAdministration,
  Groupe,
  ResultatBrouillonProjet,
} from '../../../services/avecetat/etat/types-donnees';
import type { Aberration } from '../../../services/avecetat/campagne/aberration.utils';
import type { EcartMateriel } from '../../../services/avecetat/campagne/differentiel-resultat.utils';
import { DifferentielResultatUtils } from '../../../services/avecetat/campagne/differentiel-resultat.utils';
import type { AnomalieRegroupee } from '../../../services/avecetat/campagne/rapport-anomalies.utils';
import { RapportAnomaliesUtils } from '../../../services/avecetat/campagne/rapport-anomalies.utils';

/**
 * Valeur par défaut du seuil de matérialité (`parametres.seuils.materialiteBrouillon.variationRelative`), reprise
 * de `docs/01_besoin/exemple-donnees.json` selon la même convention que `OrchestrateurCampagneService` (dont cette
 * valeur ne peut être importée sans créer une dépendance non désirée d'un écran vers l'Orchestrateur de campagne
 * pour cette seule constante).
 */
const VARIATION_RELATIVE_PAR_DEFAUT = 0.1;

/**
 * Action en attente de confirmation du mot de passe du fichier (RG-002), avec la sélection de projets à laquelle
 * elle s'applique.
 */
type ActionEnAttente =
  | { readonly type: 'integrer'; readonly selection: readonly string[] | undefined }
  | { readonly type: 'rejeter'; readonly selection: readonly string[] | undefined };

/**
 * Écran Brouillon et rapport d'anomalies : différentiel du brouillon courant, intégration/rejet (US-014), et
 * rapport d'anomalies techniques de la campagne (US-013).
 */
@Component({
  selector: 'app-brouillon',
  imports: [FormsModule, SqmConfirmationMotDePasseComponent],
  templateUrl: './brouillon.component.html',
  styleUrl: './brouillon.component.scss',
})
export class SqmBrouillonComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly router: Router = inject(Router);

  /**
   * Identifiants des projets actuellement sélectionnés pour une action groupée.
   */
  public selectionProjetIds: ReadonlySet<string> = new Set();

  /**
   * Motif de rejet en cours de saisie (F09 : « rejette (motif optionnel) »).
   */
  public motifRejet = '';

  /**
   * Action en attente de confirmation du mot de passe du fichier, `null` si aucune ressaisie n'est en cours.
   */
  public actionEnAttente: ActionEnAttente | null = null;

  /**
   * Indique qu'une mutation est en cours, pour désactiver les actions concurrentes.
   */
  public enCours = false;

  /**
   * Message d'erreur à afficher après l'échec d'une mutation, `null` sinon.
   */
  public messageErreur: string | null = null;

  /**
   * Entrées en attente de traitement du brouillon courant (F09), `undefined` si aucun brouillon n'est en cours.
   * @returns Les entrées en attente, tableau vide si le brouillon existe mais que toutes ses entrées sont déjà
   * traitées (cas transitoire, normalement purgé automatiquement côté cœur natif).
   */
  public entrees(): readonly ResultatBrouillonProjet[] {
    const brouillon = this.donneesApplication.racine()?.brouillon;
    if (brouillon === null || brouillon === undefined) {
      return [];
    }
    return brouillon.resultatsParProjet.filter((entree) => entree.statut === 'enAttente');
  }

  /**
   * Indique si un brouillon est actuellement en cours de traitement.
   * @returns `true` si un brouillon existe. `false` si aucun fichier n'est chargé (à distinguer d'un brouillon
   * réellement absent, cf. `SqmConstitutionCampagneComponent.brouillonEnAttente`, même garde à deux temps).
   */
  public brouillonPresent(): boolean {
    const racine = this.donneesApplication.racine();
    return racine !== null && racine.brouillon !== null;
  }

  /**
   * Résout le nom lisible d'un projet à partir de son identifiant, sur le modèle de
   * `SqmTableauDeBordComponent.nomProjet`.
   * @param projetId - Identifiant du projet.
   * @returns Le nom du projet, ou son identifiant s'il n'est plus trouvé.
   */
  public nomProjet(projetId: string): string {
    for (const groupe of this.groupes()) {
      const projet = groupe.projets.find((candidate) => candidate.id === projetId);
      if (projet !== undefined) {
        return projet.nom;
      }
    }
    return projetId;
  }

  /**
   * Écarts matériels de l'entrée de brouillon d'un projet par rapport à son dernier audit intégré (F09).
   * @param entree - Entrée de brouillon du projet concerné.
   * @returns Les écarts matériels détectés.
   */
  public ecarts(entree: ResultatBrouillonProjet): readonly EcartMateriel[] {
    const projet = this.trouverProjet(entree.projetId);
    const dernierAudit = projet?.audits.at(-1);
    return DifferentielResultatUtils.comparerAudits(
      dernierAudit?.resultats,
      entree.audit.resultats,
      this.extraireVariationRelative(),
    );
  }

  /**
   * Valeurs aberrantes déjà détectées pour l'entrée de brouillon d'un projet (RG-020, `AberrationUtils`, calculées
   * à la Phase 5 incrément 4), extraites sans accès non sûr à la valeur reçue.
   * @param entree - Entrée de brouillon du projet concerné.
   * @returns Les aberrations extraites, tableau vide si aucune ou si la forme est inattendue.
   */
  public aberrations(entree: ResultatBrouillonProjet): readonly Aberration[] {
    if (entree.aberrations === undefined) {
      return [];
    }
    const aberrations: Aberration[] = [];
    for (const brute of entree.aberrations) {
      const aberration = this.extraireAberration(brute);
      if (aberration !== undefined) {
        aberrations.push(aberration);
      }
    }
    return aberrations;
  }

  /**
   * Rapport d'anomalies techniques de la campagne à l'origine du brouillon courant (US-013, RG-021), regroupées
   * par cause commune.
   * @returns Les groupes d'anomalies, tableau vide si aucun brouillon ou aucune anomalie.
   */
  public anomalies(): readonly AnomalieRegroupee[] {
    const racine = this.donneesApplication.racine();
    const brouillon = racine?.brouillon;
    if (racine === null || racine === undefined || brouillon === null || brouillon === undefined) {
      return [];
    }
    const campagne = racine.campagnes.find((candidate) => candidate.id === brouillon.campagneId);
    if (campagne === undefined) {
      return [];
    }
    const resolues = campagne.verdicts.flatMap((verdict) =>
      RapportAnomaliesUtils.resoudreAnomaliesProjet(
        verdict.projetId,
        this.nomProjet(verdict.projetId),
        verdict.anomalies,
        this.groupes(),
      ),
    );
    return RapportAnomaliesUtils.regrouper(resolues);
  }

  /**
   * Indique si un projet donné fait partie de la sélection courante.
   * @param projetId - Identifiant du projet.
   * @returns `true` si le projet est sélectionné.
   */
  public estSelectionne(projetId: string): boolean {
    return this.selectionProjetIds.has(projetId);
  }

  /**
   * Bascule la sélection d'un projet.
   * @param projetId - Identifiant du projet à basculer.
   */
  public basculerSelection(projetId: string): void {
    const nouvelleSelection = new Set(this.selectionProjetIds);
    if (nouvelleSelection.has(projetId)) {
      nouvelleSelection.delete(projetId);
    } else {
      nouvelleSelection.add(projetId);
    }
    this.selectionProjetIds = nouvelleSelection;
  }

  /**
   * Indique si l'intégralité des entrées en attente est actuellement sélectionnée.
   * @returns `true` si au moins une entrée existe et qu'elles sont toutes sélectionnées.
   */
  public estToutSelectionne(): boolean {
    const entrees = this.entrees();
    return (
      entrees.length > 0 && entrees.every((entree) => this.selectionProjetIds.has(entree.projetId))
    );
  }

  /**
   * Bascule la sélection de l'intégralité des entrées en attente.
   */
  public basculerTout(): void {
    const entrees = this.entrees();
    this.selectionProjetIds = this.estToutSelectionne()
      ? new Set()
      : new Set(entrees.map((entree) => entree.projetId));
  }

  /**
   * Demande l'intégration de l'intégralité des entrées en attente (F09 : « intègre tout »), après ressaisie du
   * mot de passe du fichier (RG-002).
   */
  public demanderIntegrerTout(): void {
    this.messageErreur = null;
    this.actionEnAttente = { type: 'integrer', selection: undefined };
  }

  /**
   * Demande l'intégration de la sélection courante (F09 : « intègre projet par projet »).
   */
  public demanderIntegrerSelection(): void {
    this.messageErreur = null;
    this.actionEnAttente = { type: 'integrer', selection: Array.from(this.selectionProjetIds) };
  }

  /**
   * Demande l'intégration d'un unique projet, indépendamment de la sélection courante.
   * @param projetId - Identifiant du projet à intégrer.
   */
  public demanderIntegrerUnique(projetId: string): void {
    this.messageErreur = null;
    this.actionEnAttente = { type: 'integrer', selection: [projetId] };
  }

  /**
   * Demande le rejet de la sélection courante (F09 : « rejette », motif optionnel).
   */
  public demanderRejeterSelection(): void {
    this.messageErreur = null;
    this.actionEnAttente = { type: 'rejeter', selection: Array.from(this.selectionProjetIds) };
  }

  /**
   * Demande le rejet d'un unique projet, indépendamment de la sélection courante.
   * @param projetId - Identifiant du projet à rejeter.
   */
  public demanderRejeterUnique(projetId: string): void {
    this.messageErreur = null;
    this.actionEnAttente = { type: 'rejeter', selection: [projetId] };
  }

  /**
   * Annule l'action en attente de confirmation du mot de passe.
   */
  public annulerAction(): void {
    this.actionEnAttente = null;
  }

  /**
   * Confirme l'action en attente après ressaisie du mot de passe du fichier (RG-002), puis navigue vers la
   * Constitution de campagne si le brouillon est intégralement résolu (RG-019).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerAction(motDePasse: string): Promise<void> {
    const action = this.actionEnAttente;
    if (action === null) {
      return;
    }
    this.enCours = true;
    const resultat =
      action.type === 'integrer'
        ? await this.donneesApplication.integrerBrouillon(action.selection, motDePasse)
        : await this.donneesApplication.rejeterBrouillon(
            action.selection,
            this.motifRejet.trim().length > 0 ? this.motifRejet.trim() : undefined,
            motDePasse,
          );
    this.enCours = false;
    this.actionEnAttente = null;

    if (resultat.type === 'echec') {
      this.messageErreur = this.libelleAnomalie(resultat.anomalie);
      return;
    }

    this.selectionProjetIds = new Set();
    this.motifRejet = '';
    if (this.donneesApplication.racine()?.brouillon === null) {
      void this.router.navigateByUrl('/audits/constitution-campagne');
    }
  }

  /**
   * Groupes actuellement chargés.
   * @returns Le tableau des groupes de la racine courante.
   */
  private groupes(): readonly Groupe[] {
    return this.donneesApplication.groupes();
  }

  /**
   * Retrouve le projet correspondant à un identifiant parmi les groupes actuellement chargés.
   * @param projetId - Identifiant du projet.
   * @returns Le projet trouvé, `undefined` s'il n'existe plus.
   */
  private trouverProjet(
    projetId: string,
  ): { readonly audits: readonly { readonly resultats: readonly unknown[] }[] } | undefined {
    for (const groupe of this.groupes()) {
      const projet = groupe.projets.find((candidate) => candidate.id === projetId);
      if (projet !== undefined) {
        return projet;
      }
    }
    return undefined;
  }

  /**
   * Extrait, sans accès non sûr à la valeur reçue, une aberration RG-020 (`{ indicateur, ancienneValeur,
   * nouvelleValeur }`) d'une entrée brute de `ResultatBrouillonProjet.aberrations`.
   * @param valeur - Entrée brute, de type `unknown`.
   * @returns L'aberration extraite, `undefined` si `valeur` ne correspond pas à la forme attendue.
   */
  private extraireAberration(valeur: unknown): Aberration | undefined {
    if (typeof valeur !== 'object' || valeur === null) {
      return undefined;
    }
    if (
      !('indicateur' in valeur) ||
      !('ancienneValeur' in valeur) ||
      !('nouvelleValeur' in valeur)
    ) {
      return undefined;
    }
    const { indicateur, ancienneValeur, nouvelleValeur } = valeur;
    if (
      typeof indicateur !== 'string' ||
      typeof ancienneValeur !== 'number' ||
      typeof nouvelleValeur !== 'number'
    ) {
      return undefined;
    }
    if (
      indicateur !== 'gitlab.taille_depot' &&
      indicateur !== 'sonar.ncloc' &&
      indicateur !== 'sonar.couverture'
    ) {
      return undefined;
    }
    return { indicateur, ancienneValeur, nouvelleValeur };
  }

  /**
   * Extrait le seuil de matérialité paramétré (`parametres.seuils.materialiteBrouillon.variationRelative`), sans
   * accès non sûr à la racine `unknown`, avec repli documenté sur {@link VARIATION_RELATIVE_PAR_DEFAUT}, sur le
   * modèle d'`OrchestrateurCampagneService.extraireVariationRelative`.
   * @returns Le seuil de matérialité à appliquer.
   */
  private extraireVariationRelative(): number {
    const parametres = this.donneesApplication.racine()?.parametres;
    if (
      typeof parametres !== 'object' ||
      parametres === null ||
      !('seuils' in parametres) ||
      typeof parametres.seuils !== 'object' ||
      parametres.seuils === null ||
      !('materialiteBrouillon' in parametres.seuils)
    ) {
      return VARIATION_RELATIVE_PAR_DEFAUT;
    }
    const materialite = parametres.seuils.materialiteBrouillon;
    if (
      typeof materialite !== 'object' ||
      materialite === null ||
      !('variationRelative' in materialite)
    ) {
      return VARIATION_RELATIVE_PAR_DEFAUT;
    }
    const valeur = materialite.variationRelative;
    return typeof valeur === 'number' && valeur > 0 ? valeur : VARIATION_RELATIVE_PAR_DEFAUT;
  }

  /**
   * Traduit une anomalie typée en message lisible par l'utilisateur, sans détail technique sensible, sur le modèle
   * de `SqmMembresConnusAdminComponent.libelleAnomalie`.
   * @param anomalie - Anomalie remontée par la commande native.
   * @returns Le message à afficher.
   */
  private libelleAnomalie(anomalie: ErreurAdministration): string {
    switch (anomalie.type) {
      case 'aucunBrouillonCourant':
        return 'Ce brouillon a déjà été traité (peut-être depuis un autre onglet).';
      case 'projetAbsentDuBrouillon':
        return "Un des projets sélectionnés n'est plus présent dans ce brouillon.";
      case 'fichierVerrouille':
        return 'Le fichier de données est verrouillé par un autre processus.';
      case 'motDePasseOuFichierInvalide':
        return 'Mot de passe incorrect.';
      case 'groupeIntrouvable':
      case 'projetIntrouvable':
      case 'membreIntrouvable':
      case 'doublonUsernameMembreConnu':
      case 'brouillonDejaExistant':
      case 'fichierIntrouvable':
      case 'formatNonReconnu':
      case 'versionSchemaSuperieure':
      case 'aucunFichierOuvert':
      case 'credentialInvalide':
      case 'erreurInterne':
        return "Une erreur inattendue est survenue lors de l'enregistrement.";
    }
  }
}
