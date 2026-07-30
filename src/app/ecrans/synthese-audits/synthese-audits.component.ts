// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Synthèse des audits (US-015, Phase 6 incrément 4) : tableau dense des 12 colonnes documentées par
// `docs/02_documentation/09_maquettes.md#synthèse-des-audits` (Projet, Groupe, Dernier audit, Vitalité, Taille,
// Couverture, Notes Sonar, Violations, MR ouvertes, Membres, IA, Sonar), recalculées à l'affichage depuis les
// constats bruts du dernier audit intégré de chaque projet et les seuils/référentiels courants (RG-011, RG-022) —
// aucun verdict n'est jamais stocké.
//
// Décision d'architecture (à valider par un humain, cf. rapport de développement de cet incrément) : chaque ligne
// est entièrement pré-calculée en un objet `LigneSyntheseAudit` (couleurs et libellés déjà résolus) lors de la
// construction de `toutesLesLignes`, plutôt que recalculée à la volée par chaque fonction d'extraction de cellule de
// `SqmTableauDenseComponent` : cela garantit une lecture UNIQUE des seuils courants par rendu (une seule traversée
// de `parametres.seuils` via `ParametresJugementUtils`, RG-022), les fonctions `extraireCelluleXxx` ci-dessous ne
// faisant plus que restituer ces champs déjà résolus.
//
// RG-009 (alerte membre inconnu jamais masquée par un tri ou un filtre) : le bandeau et son décompte sont calculés
// depuis `toutesLesLignes` (jeu de données COMPLET, non filtré), jamais depuis `lignesFiltrees` (jeu réellement
// transmis à `SqmTableauDenseComponent`, lui-même librement filtrable/triable par l'utilisateur) : aucune
// combinaison de filtres de cet écran (groupe, indicateur, recherche texte) ni aucun tri interne du tableau dense
// ne peut donc faire disparaître le signal, qui reste au moins signalé globalement (RG-009) même si la ligne
// concernée est filtrée hors du tableau visible.
import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { toPng } from 'html-to-image';
import { SqmBandeauAlerteComponent } from '../../composants/bandeau-alerte/bandeau-alerte.component';
import { SqmSelecteurVueComponent } from '../../composants/selecteur-vue/selecteur-vue.component';
import type {
  DemandeEnregistrementVue,
  DemandeSuppressionVue,
  VueSelectionnable,
} from '../../composants/selecteur-vue/selecteur-vue.component';
import { SqmTableauDenseComponent } from '../../composants/tableau-dense/tableau-dense.component';
import type {
  CelluleTableauDense,
  ColonneTableauDense,
  SegmentCelluleTableauDense,
} from '../../composants/tableau-dense/tableau-dense.component';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import type {
  Campagne,
  Groupe,
  MembreConnu,
  Projet,
  Resultat,
} from '../../services/avecetat/etat/types-donnees';
import { VuesEnregistreesUtils } from '../../services/sansetat/jugement/vues-enregistrees.utils';
import type {
  ResultatFiltrageVues,
  VueEnregistreeConnue,
} from '../../services/sansetat/jugement/vues-enregistrees.utils';
import type { ResultatCroiseFraicheurSonar } from '../../services/avecetat/campagne/connecteur-croise.utils';
import type {
  Marqueur,
  MergeRequestOuverte,
  ResultatGitlabTailleDepot,
  ResultatSonarCouverture,
  ResultatSonarNotes,
} from '../../services/sansetat/commandes/types-facade';
import { BadgeAuditAncienUtils } from '../../services/sansetat/jugement/badge-audit-ancien.utils';
import { BadgeSonarKoUtils } from '../../services/sansetat/jugement/badge-sonar-ko.utils';
import { ClasseTailleUtils } from '../../services/sansetat/jugement/classe-taille.utils';
import { NoteSonarUtils } from '../../services/sansetat/jugement/note-sonar.utils';
import type { ResultatNoteSonar } from '../../services/sansetat/jugement/note-sonar.utils';
import {
  ParametresJugementUtils,
  type LectureDefensive,
  type SeuilsCouleursViolations,
  type SeuilsCouverture,
  type SeuilsFraicheurSonar,
  type SeuilsMrOuvertes,
  type SeuilsTailleDepot,
  type SeuilsVitalite,
} from '../../services/sansetat/jugement/parametres-jugement.utils';
import {
  SeuilsCouleurUtils,
  type Couleur,
} from '../../services/sansetat/jugement/seuils-couleur.utils';
import { StatutIaUtils } from '../../services/sansetat/jugement/statut-ia.utils';
import { StatutMembreUtils } from '../../services/sansetat/jugement/statut-membre.utils';

const MILLISECONDES_PAR_JOUR = 24 * 60 * 60 * 1000;

/**
 * Clé de filtre par indicateur (barre de filtres, `docs/02_documentation/09_maquettes.md#synthèse-des-audits`) :
 * limite les lignes affichées à celles « en alerte » (couleur orange/rouge, ou signal booléen actif) sur
 * l'indicateur choisi. Décision arbitraire (à valider par un humain, cf. rapport de développement de cet
 * incrément) : la maquette de référence n'illustre que l'option par défaut « Tous les indicateurs », sans énumérer
 * les options réelles du sélecteur ; cette interprétation retient un filtre « en alerte sur cet indicateur »,
 * cohérente avec l'usage habituel d'un tel sélecteur dans un tableau de bord de restitution.
 */
export type CleFiltreIndicateur =
  | 'tous'
  | 'vitalite'
  | 'couverture'
  | 'violations'
  | 'mrOuvertes'
  | 'membresInconnus'
  | 'sonarKo'
  | 'ia';

/**
 * Identifiant stable de cet écran pour les vues enregistrées (US-028, RG-027, Phase 9 incrément 2), distinct de
 * `listeTravail` (Phase 9 incrément 1) et de `syntheseGraphique`.
 */
const ECRAN_SYNTHESE_AUDITS = 'syntheseAudits';

/**
 * Version courante du schéma de filtres de cet écran (US-028, RG-027) : à incrémenter si la forme de
 * {@link FiltresSyntheseAudits} change, sur le modèle déjà établi par `SqmListeTravailComponent` (Phase 9
 * incrément 1).
 */
const VERSION_FILTRES_SYNTHESE_AUDITS = 1;

/**
 * Forme des filtres de cet écran persistée par une vue enregistrée (US-028, RG-027 : « groupes, projets,
 * indicateurs, période, tri »). Le texte de recherche libre en est volontairement exclu (recherche ponctuelle, non
 * un critère de vue durable), sur le modèle déjà retenu par `SqmListeTravailComponent`.
 */
interface FiltresSyntheseAudits {
  readonly groupeId: string | null;
  readonly indicateur: CleFiltreIndicateur;
}

/**
 * Libellé et couleur sémantique d'une valeur calculée, couleur absente si aucun seuil courant n'est disponible pour
 * la juger (RG-022 : aucune couleur par défaut inventée en l'absence de seuil).
 */
interface EtiquetteCouleur {
  /** Libellé affiché. */
  readonly label: string;
  /** Couleur sémantique, absente si non calculable (seuil courant indisponible). */
  readonly couleur?: Couleur;
}

/**
 * Lignes du tableau dense de la Synthèse des audits, entièrement pré-calculée (cf. commentaire d'en-tête : RG-022,
 * une seule lecture des seuils par construction de ligne).
 */
interface LigneSyntheseAudit {
  /** Identifiant du projet. */
  readonly projetId: string;
  /** Identifiant du groupe de rattachement. */
  readonly groupeId: string;
  /** Nom du groupe de rattachement. */
  readonly nomGroupe: string;
  /** Nom du projet. */
  readonly nomProjet: string;
  /** `true` si le projet n'a jamais été audité (état particulier : ligne grisée, sans seuil de couleur applicable). */
  readonly jamaisAudite: boolean;
  /** `true` si la dernière campagne dont ce projet fait partie du périmètre s'est soldée par un échec pour lui. */
  readonly campagneEnEchec: boolean;
  /** `true` si le badge AUDIT ANCIEN doit être affiché (cf. `BadgeAuditAncienUtils`). */
  readonly auditAncien: boolean;
  /** Libellé de la date du dernier audit intégré, `jamais audité` si {@link jamaisAudite}. */
  readonly dateAuditLabel: string;
  /** Vitalité du dépôt, absente si non calculable. */
  readonly vitalite: EtiquetteCouleur | undefined;
  /** Classe de taille du dépôt (S/M/L/XL), `—` si non calculable. */
  readonly tailleLabel: string;
  /** `true` si aucune source Sonar n'a produit de résultat pour ce dernier audit (colonnes Sonar non jugeables). */
  readonly pasDeSonar: boolean;
  /** `true` si le badge SONAR_KO est déclenché (RG-013) : grise les colonnes Couverture/Notes/Violations. */
  readonly sonarKo: boolean;
  /** Couverture de tests, absente si non calculable ou {@link pasDeSonar}. */
  readonly couverture: EtiquetteCouleur | undefined;
  /** Notes A–E des quatre axes Sonar (fiabilité, sécurité, maintenabilité, revue sécurité), vide si non calculable. */
  readonly notes: readonly ResultatNoteSonar[];
  /** Décompte de violations bloquantes, absent si non calculable ou {@link pasDeSonar}. */
  readonly violationBloquant: EtiquetteCouleur | undefined;
  /** Décompte de violations critiques, absent si non calculable ou {@link pasDeSonar}. */
  readonly violationCritique: EtiquetteCouleur | undefined;
  /** Décompte et statut des demandes de fusion ouvertes, absent si non calculable. */
  readonly mr: EtiquetteCouleur | undefined;
  /** `true` si au moins un membre du dépôt est de statut `inconnu`/`conflit` (RG-006 à RG-009). */
  readonly membreInconnuDetecte: boolean;
  /** Libellé de la colonne Membres. */
  readonly membresLabel: string;
  /** Statut IA du projet (RG-016), absent si non calculable (aucun audit intégré). */
  readonly ia: EtiquetteCouleur | undefined;
}

/**
 * Seuils courants nécessaires à la construction des lignes, chacun résolu une seule fois par rendu (RG-022) via
 * {@link ParametresJugementUtils}.
 */
interface SeuilsResolus {
  /** Seuils de vitalité (`parametres.seuils.vitalite`). */
  readonly vitalite: LectureDefensive<SeuilsVitalite>;
  /** Bornes de classe de taille (`parametres.seuils.tailleDepot`). */
  readonly tailleDepot: LectureDefensive<SeuilsTailleDepot>;
  /** Seuils de couverture (`parametres.seuils.couverture`). */
  readonly couverture: LectureDefensive<SeuilsCouverture>;
  /** Tolérance de fraîcheur Sonar (`parametres.seuils.fraicheurSonar`, RG-013). */
  readonly fraicheurSonar: LectureDefensive<SeuilsFraicheurSonar>;
  /** Seuils des demandes de fusion ouvertes (`parametres.seuils.mrOuvertes`). */
  readonly mrOuvertes: LectureDefensive<SeuilsMrOuvertes>;
  /** Seuils de couleur des violations bloquantes/critiques (`parametres.seuils.couleursViolations`). */
  readonly couleursViolations: LectureDefensive<SeuilsCouleursViolations>;
}

/**
 * Écran Synthèse des audits (US-015) : tableau dense des 12 colonnes du catalogue figé, filtres groupe/indicateur/
 * recherche, badge AUDIT ANCIEN, grisage SONAR_KO (RG-013), export PNG (alerte membre inconnu conservée sur
 * l'export).
 */
@Component({
  selector: 'app-synthese-audits',
  imports: [SqmBandeauAlerteComponent, SqmTableauDenseComponent, SqmSelecteurVueComponent],
  templateUrl: './synthese-audits.component.html',
  styleUrl: './synthese-audits.component.scss',
})
export class SqmSyntheseAuditsComponent {
  /**
   * Ordre de gravité des couleurs sémantiques, utilisé pour retenir la plus grave de deux jugements combinés (ex.
   * âge et taux de conflit des MR ouvertes). `bleu` n'appartient pas à ce dégradé de gravité (statut IA dédié,
   * R10-03) et n'est jamais produit par les fonctions combinées ici ; sa présence n'est requise que par
   * l'exhaustivité du type `Couleur`.
   */
  private static readonly GRAVITE_COULEUR: Readonly<Record<Couleur, number>> = {
    vert: 0,
    orange: 1,
    rouge: 2,
    bleu: -1,
  };

  /**
   * Clés valides du filtre par indicateur (cf. {@link CleFiltreIndicateur}), utilisées pour valider sans assertion
   * de type la valeur brute transmise par le sélecteur HTML.
   */
  private static readonly CLES_FILTRE_INDICATEUR: readonly CleFiltreIndicateur[] = [
    'tous',
    'vitalite',
    'couverture',
    'violations',
    'mrOuvertes',
    'membresInconnus',
    'sonarKo',
    'ia',
  ];

  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);

  private readonly router: Router = inject(Router);

  /**
   * Indique que la vue par défaut de cet écran (US-028, RG-027) a déjà été appliquée une fois, pour ne l'appliquer
   * qu'une seule fois par instance de ce composant (sur le modèle de `SqmListeTravailComponent`, Phase 9
   * incrément 1).
   */
  private vueParDefautDejaAppliquee = false;

  public constructor() {
    effect(() => {
      if (this.vueParDefautDejaAppliquee) {
        return;
      }
      const vueParDefaut = VuesEnregistreesUtils.trouverVueParDefaut(
        this.resultatFiltrageVues().applicables,
      );
      if (vueParDefaut === undefined) {
        return;
      }
      this.vueParDefautDejaAppliquee = true;
      this.appliquerVue(vueParDefaut);
    });
  }

  /**
   * Élément conteneur exporté en PNG (bandeau d'alerte inclus, cf. commentaire d'en-tête : « alerte membre inconnu
   * conservée sur l'export »).
   */
  private readonly conteneurExport = viewChild<ElementRef<HTMLElement>>('conteneurExport');

  /**
   * Message d'erreur de la dernière mutation de vue enregistrée tentée (US-028), `null` si aucune erreur en cours.
   */
  public messageErreur: string | null = null;

  /**
   * Identifiant du groupe sélectionné dans le filtre, `null` = tous les groupes.
   */
  public readonly filtreGroupeId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Clé de l'indicateur actuellement sélectionné dans le filtre (cf. {@link CleFiltreIndicateur}).
   */
  public readonly filtreIndicateur: WritableSignal<CleFiltreIndicateur> = signal('tous');

  /**
   * Texte de recherche courant (nom de projet).
   */
  public readonly texteRecherche: WritableSignal<string> = signal('');

  /**
   * Colonnes du tableau dense, reconstruites à chaque lecture à partir des seuils/référentiels bruts courants
   * (`parametres.seuils`/`referentiels`), transmis tels quels aux déclencheurs `SqmExplicationJugementComponent`
   * portés par les en-têtes des colonnes concernées (correction de relecture, Phase 6 incrément 4). Chaque fonction
   * d'extraction de cellule, elle, continue de lire les champs déjà résolus de {@link LigneSyntheseAudit} : seule la
   * donnée destinée à l'explication du calcul (RG-022, un seul point de lecture via `ParametresJugementUtils`) est
   * relue ici, jamais un seuil recalculé.
   * @returns Les colonnes à afficher.
   */
  public colonnes(): readonly ColonneTableauDense<LigneSyntheseAudit>[] {
    const racine = this.donneesApplication.racine();
    return this.construireColonnes(racine?.parametres.seuils, racine?.referentiels);
  }

  /**
   * Ensemble complet des lignes de la Synthèse des audits, un par projet, non filtré (cf. commentaire d'en-tête,
   * RG-009).
   */
  public readonly toutesLesLignes: Signal<readonly LigneSyntheseAudit[]> = computed(() =>
    this.construireLignes(),
  );

  /**
   * Lignes après application des filtres courants (groupe, indicateur, recherche texte), transmises à
   * `SqmTableauDenseComponent`.
   */
  public readonly lignesFiltrees: Signal<readonly LigneSyntheseAudit[]> = computed(() => {
    const groupeId = this.filtreGroupeId();
    const indicateur = this.filtreIndicateur();
    const texte = this.texteRecherche().trim().toLowerCase();
    return this.toutesLesLignes().filter((ligne) => {
      if (groupeId !== null && ligne.groupeId !== groupeId) {
        return false;
      }
      if (texte.length > 0 && !ligne.nomProjet.toLowerCase().includes(texte)) {
        return false;
      }
      return this.correspondIndicateur(ligne, indicateur);
    });
  });

  /**
   * Résultat du filtrage des vues enregistrées de cet écran par version de filtres courante (US-028, RG-027).
   */
  private readonly resultatFiltrageVues: Signal<ResultatFiltrageVues> = computed(() => {
    const connues: readonly VueEnregistreeConnue[] =
      this.donneesApplication.racine()?.vuesEnregistrees ?? [];
    return VuesEnregistreesUtils.filtrerPourEcran(
      connues,
      ECRAN_SYNTHESE_AUDITS,
      VERSION_FILTRES_SYNTHESE_AUDITS,
    );
  });

  /**
   * Vues enregistrées applicables à cet écran (US-028, RG-027).
   */
  public readonly vuesApplicables: Signal<readonly VueSelectionnable[]> = computed(
    () => this.resultatFiltrageVues().applicables,
  );

  /**
   * Nombre de vues enregistrées de cet écran ignorées pour cause de version de filtres obsolète (US-028).
   */
  public readonly nombreVuesIgnorees: Signal<number> = computed(
    () => this.resultatFiltrageVues().nombreIgnorees,
  );

  /**
   * Groupes disponibles pour le filtre.
   * @returns Les groupes actuellement chargés.
   */
  public groupesDisponibles(): readonly Groupe[] {
    return this.donneesApplication.groupes();
  }

  /**
   * Extrait l'identifiant stable d'une ligne, transmis à `SqmTableauDenseComponent`.
   * @param ligne - Ligne concernée.
   * @returns L'identifiant du projet de cette ligne.
   */
  public identifiantLigne(ligne: LigneSyntheseAudit): string {
    return ligne.projetId;
  }

  /**
   * Désigne les lignes « jamais audité » comme grisées, sans seuil de couleur applicable (état particulier, cf.
   * `docs/02_documentation/09_maquettes.md#états-particuliers`).
   * @param ligne - Ligne concernée.
   * @returns `true` si la ligne doit être grisée.
   */
  public ligneGrisee(ligne: LigneSyntheseAudit): boolean {
    return ligne.jamaisAudite;
  }

  /**
   * Nombre de projets comportant au moins un membre de statut inconnu, calculé sur l'ensemble COMPLET des lignes
   * (RG-009 : jamais sur le sous-ensemble filtré).
   * @returns Le nombre de projets concernés.
   */
  public nombreProjetsAvecMembreInconnu(): number {
    return this.toutesLesLignes().filter((ligne) => ligne.membreInconnuDetecte).length;
  }

  /**
   * Indique si au moins un projet comporte un membre de statut inconnu (RG-009), pilote l'affichage du bandeau.
   * @returns `true` si au moins un projet est concerné.
   */
  public membreInconnuDetecteGlobalement(): boolean {
    return this.nombreProjetsAvecMembreInconnu() > 0;
  }

  /**
   * Message du bandeau membre inconnu (RG-009), au singulier ou au pluriel selon le nombre de projets concernés.
   * @returns Le message à afficher dans le bandeau.
   */
  public messageMembreInconnu(): string {
    const nombre = this.nombreProjetsAvecMembreInconnu();
    return nombre <= 1
      ? '1 projet comporte un membre au statut inconnu — signal de sécurité prioritaire.'
      : `${nombre} projets comportent un membre au statut inconnu — signal de sécurité prioritaire.`;
  }

  /**
   * Nombre de projets actuellement affichés (compteur de la barre de filtres).
   * @returns Le nombre de lignes après filtrage.
   */
  public compteurProjets(): number {
    return this.lignesFiltrees().length;
  }

  /**
   * Applique le filtre de groupe sélectionné.
   * @param valeur - Identifiant du groupe sélectionné, chaîne vide = tous les groupes.
   */
  public onChangerGroupe(valeur: string): void {
    this.filtreGroupeId.set(valeur.length === 0 ? null : valeur);
  }

  /**
   * Applique le filtre d'indicateur sélectionné, validé sans assertion de type contre {@link
   * CLES_FILTRE_INDICATEUR}.
   * @param valeur - Valeur brute transmise par le sélecteur HTML.
   */
  public onChangerIndicateur(valeur: string): void {
    const trouvee = SqmSyntheseAuditsComponent.CLES_FILTRE_INDICATEUR.find((cle) => cle === valeur);
    this.filtreIndicateur.set(trouvee ?? 'tous');
  }

  /**
   * Applique le texte de recherche saisi.
   * @param valeur - Texte saisi.
   */
  public onChangerRecherche(valeur: string): void {
    this.texteRecherche.set(valeur);
  }

  /**
   * Applique les filtres portés par une vue enregistrée choisie dans `SqmSelecteurVueComponent` (US-028). Ignore
   * silencieusement une vue dont les filtres ne correspondent pas structurellement à {@link FiltresSyntheseAudits}
   * (aucun accès non sûr à une valeur JSON externe), sur le modèle de `SqmListeTravailComponent`.
   * @param vue - Vue choisie, dont `filtres` reste typé `unknown` côté composant transverse.
   */
  public appliquerVue(vue: VueSelectionnable): void {
    if (!SqmSyntheseAuditsComponent.estFiltresSyntheseAudits(vue.filtres)) {
      return;
    }
    this.filtreGroupeId.set(vue.filtres.groupeId);
    this.filtreIndicateur.set(vue.filtres.indicateur);
  }

  /**
   * Vérifie structurellement qu'une valeur JSON externe (`VueEnregistree.filtres`) correspond bien à
   * {@link FiltresSyntheseAudits}, avant tout accès à ses champs.
   * @param valeur - Valeur à vérifier.
   * @returns `true` si `valeur` correspond à la forme attendue.
   */
  private static estFiltresSyntheseAudits(valeur: unknown): valeur is FiltresSyntheseAudits {
    if (
      typeof valeur !== 'object' ||
      valeur === null ||
      !('groupeId' in valeur) ||
      !('indicateur' in valeur)
    ) {
      return false;
    }
    const groupeId: unknown = valeur.groupeId;
    if (groupeId !== null && typeof groupeId !== 'string') {
      return false;
    }
    const indicateur: unknown = valeur.indicateur;
    return SqmSyntheseAuditsComponent.CLES_FILTRE_INDICATEUR.some((cle) => cle === indicateur);
  }

  /**
   * Crée ou met à jour une vue enregistrée avec les filtres courants (US-028, RG-027, RG-002).
   * @param demande - Nom, statut par défaut, identifiant de mise à jour éventuel et mot de passe déjà confirmés par
   * `SqmSelecteurVueComponent`.
   */
  public async enregistrerVue(demande: DemandeEnregistrementVue): Promise<void> {
    const filtres: FiltresSyntheseAudits = {
      groupeId: this.filtreGroupeId(),
      indicateur: this.filtreIndicateur(),
    };
    const resultat = await this.donneesApplication.definirVue(
      demande.id,
      demande.nom,
      ECRAN_SYNTHESE_AUDITS,
      VERSION_FILTRES_SYNTHESE_AUDITS,
      demande.parDefaut,
      filtres,
      demande.motDePasse,
    );
    if (resultat.type === 'echec') {
      this.messageErreur = "Une erreur inattendue est survenue lors de l'enregistrement de la vue.";
    }
  }

  /**
   * Supprime une vue enregistrée (US-028, RG-002).
   * @param demande - Identifiant de la vue et mot de passe déjà confirmés par `SqmSelecteurVueComponent`.
   */
  public async supprimerVue(demande: DemandeSuppressionVue): Promise<void> {
    const resultat = await this.donneesApplication.supprimerVue(demande.id, demande.motDePasse);
    if (resultat.type === 'echec') {
      this.messageErreur = 'Une erreur inattendue est survenue lors de la suppression de la vue.';
    }
  }

  /**
   * Gère l'activation d'une ligne du tableau (clic ou touche Entrée) : navigue vers la Fiche projet (US-017,
   * `SqmFicheProjetComponent`, Phase 6 incrément 5) du projet concerné. Cette capacité d'activation de ligne de
   * `SqmTableauDenseComponent` était déjà câblée depuis l'incrément précédent, en attente de cet écran (cf. rapport
   * de développement de la Phase 6, incrément 4).
   * @param ligne - Ligne activée par l'utilisateur.
   */
  public activerLigne(ligne: LigneSyntheseAudit): void {
    void this.router.navigateByUrl(`/fiche-projet/${ligne.projetId}`);
  }

  /**
   * Exporte la vue courante (bandeau d'alerte inclus, cf. commentaire d'en-tête) en image PNG et déclenche son
   * téléchargement.
   */
  public async exporterPng(): Promise<void> {
    const conteneur = this.conteneurExport()?.nativeElement;
    if (conteneur === undefined) {
      return;
    }
    const dataUrl = await toPng(conteneur);
    this.declencherTelechargementPng(dataUrl);
  }

  /**
   * Déclenche le téléchargement d'une image PNG encodée en URL de données.
   * @param dataUrl - URL de données PNG produite par `toPng`.
   */
  private declencherTelechargementPng(dataUrl: string): void {
    const lien = document.createElement('a');
    lien.href = dataUrl;
    lien.download = `synthese-audits-${new Date().toISOString().slice(0, 10)}.png`;
    lien.click();
  }

  /**
   * Détermine si une ligne correspond au filtre d'indicateur sélectionné (cf. {@link CleFiltreIndicateur}).
   * @param ligne - Ligne concernée.
   * @param cle - Clé de l'indicateur sélectionné.
   * @returns `true` si la ligne doit être conservée.
   */
  private correspondIndicateur(ligne: LigneSyntheseAudit, cle: CleFiltreIndicateur): boolean {
    switch (cle) {
      case 'tous':
        return true;
      case 'vitalite':
        return this.estEnAlerte(ligne.vitalite?.couleur);
      case 'couverture':
        return this.estEnAlerte(ligne.couverture?.couleur);
      case 'violations':
        return (
          this.estEnAlerte(ligne.violationBloquant?.couleur) ||
          this.estEnAlerte(ligne.violationCritique?.couleur)
        );
      case 'mrOuvertes':
        return this.estEnAlerte(ligne.mr?.couleur);
      case 'membresInconnus':
        return ligne.membreInconnuDetecte;
      case 'sonarKo':
        return ligne.sonarKo;
      case 'ia':
        return ligne.ia?.couleur === 'rouge';
    }
  }

  /**
   * Indique si une couleur sémantique représente une alerte (orange ou rouge).
   * @param couleur - Couleur à qualifier, absente si non calculable.
   * @returns `true` si la couleur est une alerte.
   */
  private estEnAlerte(couleur: Couleur | undefined): boolean {
    return couleur === 'orange' || couleur === 'rouge';
  }

  /**
   * Construit les 12 colonnes du tableau dense (cf. `docs/02_documentation/09_maquettes.md#synthèse-des-audits`).
   * La colonne « Projet » (indice 0) est la colonne fixe au défilement horizontal.
   *
   * Cinq colonnes portent un déclencheur `explication` (charte d'ergonomie, correction de relecture Phase 6
   * incrément 4) : Vitalité, Couverture, Violations et MR ouvertes (seuils de `parametres.seuils`) ainsi qu'IA
   * (référentiel `referentiels.reglesMarqueursIA`). Les colonnes Taille et Notes Sonar en sont volontairement
   * dépourvues : Taille dépend bien d'un seuil (`parametres.seuils.tailleDepot`) mais sa cellule ne restitue jamais
   * de couleur (texte brut seul, cf. maquette) — décision arbitraire de ne pas y accrocher d'explication faute de
   * jugement visuellement porté à expliquer ; Notes Sonar restitue la note A–E propre à SonarQube lui-même
   * (`NoteSonarUtils`), une convention fixe non paramétrable et non lue depuis `parametres`/`referentiels` — il n'y
   * a donc structurellement rien à expliquer via ce mécanisme pour cette colonne (cf. rapport de développement).
   * @param seuilsBruts - Valeur brute de `parametres.seuils`, transmise telle quelle aux déclencheurs d'explication
   * concernés (non interprétée ici, RG-022 : un seul point de lecture, `ParametresJugementUtils`).
   * @param referentielsBruts - Valeur brute de `referentiels`, transmise telle quelle au déclencheur d'explication
   * de la colonne IA.
   * @returns Les colonnes du tableau.
   */
  private construireColonnes(
    seuilsBruts: unknown,
    referentielsBruts: unknown,
  ): readonly ColonneTableauDense<LigneSyntheseAudit>[] {
    return [
      {
        cle: 'projet',
        libelle: 'Projet',
        triable: true,
        extraireTexteBrut: (ligne) => ligne.nomProjet,
        extraireCellule: (ligne) => this.extraireCelluleProjet(ligne),
      },
      {
        cle: 'groupe',
        libelle: 'Groupe',
        triable: true,
        extraireTexteBrut: (ligne) => ligne.nomGroupe,
        extraireCellule: (ligne) => ({ segments: [{ type: 'texte', valeur: ligne.nomGroupe }] }),
      },
      {
        cle: 'dernierAudit',
        libelle: 'Dernier audit',
        triable: true,
        extraireTexteBrut: (ligne) => ligne.dateAuditLabel,
        extraireCellule: (ligne) => ({
          segments: [{ type: 'texte', valeur: ligne.dateAuditLabel }],
        }),
      },
      {
        cle: 'vitalite',
        libelle: 'Vitalité',
        triable: true,
        extraireTexteBrut: (ligne) => ligne.vitalite?.label ?? '',
        extraireCellule: (ligne) => this.celluleBadgeOuTexte(ligne.vitalite),
        explication: { cle: 'vitalite', seuilsBruts },
      },
      {
        cle: 'taille',
        libelle: 'Taille',
        triable: true,
        extraireTexteBrut: (ligne) => ligne.tailleLabel,
        extraireCellule: (ligne) => ({ segments: [{ type: 'texte', valeur: ligne.tailleLabel }] }),
      },
      {
        cle: 'couverture',
        libelle: 'Couverture',
        triable: true,
        extraireTexteBrut: (ligne) => ligne.couverture?.label ?? '',
        extraireCellule: (ligne) => this.extraireCelluleCouverture(ligne),
        explication: { cle: 'couverture', seuilsBruts },
      },
      {
        cle: 'notes',
        libelle: 'Notes Sonar',
        extraireTexteBrut: (ligne) => ligne.notes.map((note) => note.lettre).join(''),
        extraireCellule: (ligne) => this.extraireCelluleNotes(ligne),
      },
      {
        cle: 'violations',
        libelle: 'Violations',
        extraireTexteBrut: (ligne) =>
          `${ligne.violationBloquant?.label ?? '—'} / ${ligne.violationCritique?.label ?? '—'}`,
        extraireCellule: (ligne) => this.extraireCelluleViolations(ligne),
        explication: { cle: 'couleursViolations', seuilsBruts },
      },
      {
        cle: 'mrOuvertes',
        libelle: 'MR ouvertes',
        triable: true,
        extraireTexteBrut: (ligne) => ligne.mr?.label ?? '',
        extraireCellule: (ligne) => this.celluleBadgeOuTexte(ligne.mr),
        explication: { cle: 'mrOuvertes', seuilsBruts },
      },
      {
        cle: 'membres',
        libelle: 'Membres',
        triable: true,
        filtrable: true,
        extraireTexteBrut: (ligne) => ligne.membresLabel,
        extraireCellule: (ligne) => this.extraireCelluleMembres(ligne),
      },
      {
        cle: 'ia',
        libelle: 'IA',
        triable: true,
        extraireTexteBrut: (ligne) => ligne.ia?.label ?? '',
        extraireCellule: (ligne) => this.celluleBadgeOuTexte(ligne.ia),
        explication: { cle: 'reglesMarqueursIA', referentielsBruts },
      },
      {
        cle: 'sonar',
        libelle: 'Sonar',
        extraireTexteBrut: (ligne) =>
          ligne.pasDeSonar ? 'aucune source' : ligne.sonarKo ? 'SONAR_KO' : 'à jour',
        extraireCellule: (ligne) => this.extraireCelluleSonar(ligne),
      },
    ];
  }

  /**
   * Restitue la cellule « Projet » : nom du projet, badge AUDIT ANCIEN et icône de campagne en échec le cas
   * échéant.
   * @param ligne - Ligne concernée.
   * @returns La cellule calculée.
   */
  private extraireCelluleProjet(ligne: LigneSyntheseAudit): CelluleTableauDense {
    const segments: SegmentCelluleTableauDense[] = [{ type: 'texte', valeur: ligne.nomProjet }];
    if (ligne.auditAncien) {
      segments.push({ type: 'badge', libelle: 'AUDIT ANCIEN', couleur: 'orange' });
    }
    if (ligne.campagneEnEchec) {
      segments.push({ type: 'icone', symbole: '⛔', titre: 'Dernière campagne en échec' });
    }
    return { segments };
  }

  /**
   * Restitue une cellule sous forme de badge si une couleur est calculable, de simple texte sinon (RG-022 : jamais
   * de couleur inventée en l'absence de seuil), `—` si l'étiquette elle-même est absente.
   * @param etiquette - Étiquette à restituer, absente si non calculable.
   * @returns La cellule calculée.
   */
  private celluleBadgeOuTexte(etiquette: EtiquetteCouleur | undefined): CelluleTableauDense {
    if (etiquette === undefined) {
      return { segments: [{ type: 'texte', valeur: '—' }] };
    }
    if (etiquette.couleur === undefined) {
      return { segments: [{ type: 'texte', valeur: etiquette.label }] };
    }
    return { segments: [{ type: 'badge', libelle: etiquette.label, couleur: etiquette.couleur }] };
  }

  /**
   * Restitue une étiquette sous forme de texte coloré (sans pastille) si une couleur est calculable, de texte brut
   * sinon.
   * @param etiquette - Étiquette à restituer.
   * @returns Le segment calculé.
   */
  private segmentValeur(etiquette: EtiquetteCouleur): SegmentCelluleTableauDense {
    return etiquette.couleur === undefined
      ? { type: 'texte', valeur: etiquette.label }
      : { type: 'texteCouleur', valeur: etiquette.label, couleur: etiquette.couleur };
  }

  /**
   * Restitue la cellule « Couverture », grisée si SONAR_KO (RG-013).
   * @param ligne - Ligne concernée.
   * @returns La cellule calculée.
   */
  private extraireCelluleCouverture(ligne: LigneSyntheseAudit): CelluleTableauDense {
    if (ligne.couverture === undefined) {
      return { segments: [{ type: 'texte', valeur: '—' }] };
    }
    return { segments: [this.segmentValeur(ligne.couverture)], grisee: ligne.sonarKo };
  }

  /**
   * Restitue la cellule « Notes Sonar » (4 badges A–E), grisée si SONAR_KO (RG-013).
   * @param ligne - Ligne concernée.
   * @returns La cellule calculée.
   */
  private extraireCelluleNotes(ligne: LigneSyntheseAudit): CelluleTableauDense {
    if (ligne.notes.length === 0) {
      return { segments: [{ type: 'texte', valeur: '—' }] };
    }
    const segments: SegmentCelluleTableauDense[] = ligne.notes.map(
      (note): SegmentCelluleTableauDense => ({
        type: 'badge',
        libelle: note.lettre,
        couleur: note.couleur,
      }),
    );
    return { segments, grisee: ligne.sonarKo };
  }

  /**
   * Restitue la cellule « Violations » (bloquant / critique), grisée si SONAR_KO (RG-013).
   * @param ligne - Ligne concernée.
   * @returns La cellule calculée.
   */
  private extraireCelluleViolations(ligne: LigneSyntheseAudit): CelluleTableauDense {
    if (ligne.violationBloquant === undefined || ligne.violationCritique === undefined) {
      return { segments: [{ type: 'texte', valeur: '—' }] };
    }
    const segments: SegmentCelluleTableauDense[] = [
      this.segmentValeur(ligne.violationBloquant),
      { type: 'texte', valeur: ' / ' },
      this.segmentValeur(ligne.violationCritique),
    ];
    return { segments, grisee: ligne.sonarKo };
  }

  /**
   * Restitue la cellule « Membres » : badge d'alerte si au moins un membre inconnu, texte sinon.
   * @param ligne - Ligne concernée.
   * @returns La cellule calculée.
   */
  private extraireCelluleMembres(ligne: LigneSyntheseAudit): CelluleTableauDense {
    if (ligne.membresLabel === '—') {
      return { segments: [{ type: 'texte', valeur: '—' }] };
    }
    if (ligne.membreInconnuDetecte) {
      return { segments: [{ type: 'badge', libelle: ligne.membresLabel, couleur: 'rouge' }] };
    }
    return { segments: [{ type: 'texte', valeur: ligne.membresLabel }] };
  }

  /**
   * Restitue la cellule « Sonar » (statut de fraîcheur global, distinct des métriques Couverture/Notes/Violations).
   * @param ligne - Ligne concernée.
   * @returns La cellule calculée.
   */
  private extraireCelluleSonar(ligne: LigneSyntheseAudit): CelluleTableauDense {
    if (ligne.pasDeSonar) {
      return { segments: [{ type: 'texte', valeur: 'aucune source' }] };
    }
    if (ligne.sonarKo) {
      return { segments: [{ type: 'badge', libelle: 'SONAR_KO', couleur: 'rouge' }] };
    }
    return { segments: [{ type: 'texteCouleur', valeur: 'à jour', couleur: 'vert' }] };
  }

  /**
   * Construit l'ensemble des lignes de la Synthèse des audits, une par projet, en lisant les seuils courants une
   * seule fois (RG-022).
   * @returns Les lignes construites, tableau vide si aucun fichier n'est chargé.
   */
  private construireLignes(): readonly LigneSyntheseAudit[] {
    const racine = this.donneesApplication.racine();
    if (racine === null) {
      return [];
    }
    const maintenant = new Date();
    const seuilsBruts = racine.parametres.seuils;
    const seuils: SeuilsResolus = {
      vitalite: ParametresJugementUtils.lireSeuilsVitalite(seuilsBruts),
      tailleDepot: ParametresJugementUtils.lireSeuilsTailleDepot(seuilsBruts),
      couverture: ParametresJugementUtils.lireSeuilsCouverture(seuilsBruts),
      fraicheurSonar: ParametresJugementUtils.lireSeuilsFraicheurSonar(seuilsBruts),
      mrOuvertes: ParametresJugementUtils.lireSeuilsMrOuvertes(seuilsBruts),
      couleursViolations: ParametresJugementUtils.lireSeuilsCouleursViolations(seuilsBruts),
    };
    const ancienJours = ParametresJugementUtils.lireAncienJoursAvecRepli(seuilsBruts);

    const lignes: LigneSyntheseAudit[] = [];
    for (const groupe of racine.groupes) {
      for (const projet of groupe.projets) {
        lignes.push(
          this.construireLigne(groupe, projet, racine.campagnes, maintenant, ancienJours, seuils),
        );
      }
    }
    return lignes;
  }

  /**
   * Construit la ligne d'un projet (cf. {@link construireLignes}).
   * @param groupe - Groupe de rattachement du projet.
   * @param projet - Projet concerné.
   * @param campagnes - Traces d'exécution des campagnes (`DonneesRacine.campagnes`).
   * @param maintenant - Date de référence pour les calculs d'ancienneté (permet des tests déterministes).
   * @param ancienJours - Seuil de fraîcheur d'audit résolu (cf. {@link ParametresJugementUtils.
   * lireAncienJoursAvecRepli}).
   * @param seuils - Seuils courants résolus une seule fois (cf. {@link construireLignes}).
   * @returns La ligne construite.
   */
  private construireLigne(
    groupe: Groupe,
    projet: Projet,
    campagnes: readonly Campagne[],
    maintenant: Date,
    ancienJours: number,
    seuils: SeuilsResolus,
  ): LigneSyntheseAudit {
    const campagneEnEchec = this.campagneEnEchecPourProjet(campagnes, projet.id);
    const dernierAudit = projet.audits.at(-1);
    if (dernierAudit === undefined) {
      return {
        projetId: projet.id,
        groupeId: groupe.id,
        nomGroupe: groupe.nom,
        nomProjet: projet.nom,
        jamaisAudite: true,
        campagneEnEchec,
        auditAncien: false,
        dateAuditLabel: 'jamais audité',
        vitalite: undefined,
        tailleLabel: '—',
        pasDeSonar: true,
        sonarKo: false,
        couverture: undefined,
        notes: [],
        violationBloquant: undefined,
        violationCritique: undefined,
        mr: undefined,
        membreInconnuDetecte: false,
        membresLabel: '—',
        ia: undefined,
      };
    }

    const resultats = dernierAudit.resultats;
    const resultatVitalite = this.trouverResultat(resultats, 'gitlab.vitalite');
    const resultatTaille = this.trouverResultat(resultats, 'gitlab.taille_depot');
    const resultatCouverture = this.trouverResultat(resultats, 'sonar.couverture');
    const resultatNotes = this.trouverResultat(resultats, 'sonar.notes');
    const resultatViolations = this.trouverResultat(resultats, 'sonar.violations');
    const resultatMr = this.trouverResultat(resultats, 'gitlab.merge_requests');
    const resultatMembres = this.trouverResultat(resultats, 'gitlab.membres');
    const resultatMarqueurs = this.trouverResultat(resultats, 'gitlab.marqueurs_ia');
    const resultatFraicheurSonar = this.trouverResultat(resultats, 'croise.fraicheur_sonar');

    const pasDeSonar = !resultats.some((resultat) => resultat.type.startsWith('sonar.'));
    const sonarKo =
      !pasDeSonar && this.calculerSonarKo(resultatFraicheurSonar, seuils.fraicheurSonar);
    const membres = this.calculerMembres(resultatMembres?.membres, groupe.membresConnus);
    const violationsSeuils =
      seuils.couleursViolations.type === 'valeur' ? seuils.couleursViolations.valeur : undefined;

    return {
      projetId: projet.id,
      groupeId: groupe.id,
      nomGroupe: groupe.nom,
      nomProjet: projet.nom,
      jamaisAudite: false,
      campagneEnEchec,
      auditAncien: BadgeAuditAncienUtils.calculerAuditAncien(
        dernierAudit.date,
        ancienJours,
        maintenant,
      ),
      dateAuditLabel: this.formaterDate(dernierAudit.date),
      vitalite: this.calculerEtiquetteVitalite(
        resultatVitalite?.dernierCommitLe,
        seuils.vitalite,
        maintenant,
      ),
      tailleLabel: this.calculerLabelTaille(resultatTaille, seuils.tailleDepot),
      pasDeSonar,
      sonarKo,
      couverture: pasDeSonar
        ? undefined
        : this.calculerEtiquetteCouverture(resultatCouverture, seuils.couverture),
      notes: pasDeSonar || resultatNotes === undefined ? [] : this.calculerNotes(resultatNotes),
      violationBloquant:
        pasDeSonar || resultatViolations === undefined
          ? undefined
          : this.calculerEtiquetteViolation(
              resultatViolations.parSeverite.bloquant,
              violationsSeuils?.bloquant,
            ),
      violationCritique:
        pasDeSonar || resultatViolations === undefined
          ? undefined
          : this.calculerEtiquetteViolation(
              resultatViolations.parSeverite.critique,
              violationsSeuils?.critique,
            ),
      mr: this.calculerEtiquetteMr(resultatMr?.mrOuvertes ?? [], seuils.mrOuvertes, maintenant),
      membreInconnuDetecte: membres.inconnu,
      membresLabel: membres.label,
      ia: this.calculerEtiquetteIa(projet.iaAutorisee, resultatMarqueurs?.marqueurs ?? []),
    };
  }

  /**
   * Retrouve, dans une liste de résultats typés, l'unique résultat portant le discriminant `type` demandé.
   * @param resultats - Résultats du dernier audit intégré.
   * @param type - Discriminant `type` recherché.
   * @returns Le résultat trouvé, `undefined` si absent de cet audit.
   */
  private trouverResultat<TType extends Resultat['type']>(
    resultats: readonly Resultat[],
    type: TType,
  ): Extract<Resultat, { type: TType }> | undefined {
    return resultats.find(
      (resultat): resultat is Extract<Resultat, { type: TType }> => resultat.type === type,
    );
  }

  /**
   * Détermine si la dernière campagne dont ce projet fait partie du périmètre s'est soldée par un échec pour lui.
   * @param campagnes - Traces d'exécution des campagnes.
   * @param projetId - Identifiant du projet concerné.
   * @returns `true` si la dernière campagne concernant ce projet est en échec pour lui.
   */
  private campagneEnEchecPourProjet(campagnes: readonly Campagne[], projetId: string): boolean {
    const campagnesDuProjet = campagnes.filter((campagne) => campagne.perimetre.includes(projetId));
    const derniere = campagnesDuProjet.reduce<Campagne | undefined>((plusRecente, campagne) => {
      if (
        plusRecente === undefined ||
        new Date(campagne.date).getTime() > new Date(plusRecente.date).getTime()
      ) {
        return campagne;
      }
      return plusRecente;
    }, undefined);
    if (derniere === undefined) {
      return false;
    }
    return derniere.verdicts.find((verdict) => verdict.projetId === projetId)?.statut === 'echec';
  }

  /**
   * Calcule le nombre de jours pleins écoulés depuis une date ISO 8601, jamais négatif.
   * @param dateIso - Date ISO 8601 de référence.
   * @param maintenant - Date courante.
   * @returns Le nombre de jours écoulés.
   */
  private joursDepuis(dateIso: string, maintenant: Date): number {
    const diffMs = maintenant.getTime() - new Date(dateIso).getTime();
    return Math.max(0, Math.floor(diffMs / MILLISECONDES_PAR_JOUR));
  }

  /**
   * Met en forme une date ISO 8601 en libellé court `AAAA-MM-JJ` (sur le modèle de la maquette de référence).
   * @param dateIso - Date ISO 8601 à mettre en forme.
   * @returns Le libellé court correspondant.
   */
  private formaterDate(dateIso: string): string {
    const date = new Date(dateIso);
    const deuxChiffres = (valeur: number): string => valeur.toString().padStart(2, '0');
    return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
  }

  /**
   * Retient la plus grave de deux couleurs sémantiques.
   * @param a - Première couleur.
   * @param b - Seconde couleur.
   * @returns La plus grave des deux couleurs.
   */
  private pireCouleur(a: Couleur, b: Couleur): Couleur {
    return SqmSyntheseAuditsComponent.GRAVITE_COULEUR[a] >=
      SqmSyntheseAuditsComponent.GRAVITE_COULEUR[b]
      ? a
      : b;
  }

  /**
   * Calcule le déclenchement du badge SONAR_KO (RG-013) à partir du constat croisé de fraîcheur Sonar.
   * @param resultat - Constat brut `croise.fraicheur_sonar`, absent si non produit par ce dernier audit.
   * @param seuils - Tolérance de fraîcheur Sonar courante.
   * @returns `true` si le badge SONAR_KO est déclenché.
   */
  private calculerSonarKo(
    resultat: ResultatCroiseFraicheurSonar | undefined,
    seuils: LectureDefensive<SeuilsFraicheurSonar>,
  ): boolean {
    if (resultat?.dernierCommitLe === undefined || seuils.type === 'absent') {
      return false;
    }
    const derniereAnalyseLe = resultat.aucuneAnalyse ? null : (resultat.derniereAnalyseLe ?? null);
    return BadgeSonarKoUtils.calculerBadgeSonarKo(
      resultat.dernierCommitLe,
      derniereAnalyseLe,
      seuils.valeur,
    ).declenche;
  }

  /**
   * Calcule l'étiquette de vitalité du dépôt.
   * @param dernierCommitLe - Date du dernier commit constaté, absente si non calculable.
   * @param seuils - Seuils de vitalité courants.
   * @param maintenant - Date de référence pour le calcul d'ancienneté.
   * @returns L'étiquette calculée, absente si {@link dernierCommitLe} est absente.
   */
  private calculerEtiquetteVitalite(
    dernierCommitLe: string | undefined,
    seuils: LectureDefensive<SeuilsVitalite>,
    maintenant: Date,
  ): EtiquetteCouleur | undefined {
    if (dernierCommitLe === undefined) {
      return undefined;
    }
    const jours = this.joursDepuis(dernierCommitLe, maintenant);
    if (seuils.type === 'absent') {
      return { label: `${jours} j` };
    }
    const couleur = SeuilsCouleurUtils.calculerCouleurVitalite(
      jours,
      seuils.valeur.mourantJours,
      seuils.valeur.mortJours,
    );
    if (couleur === 'vert') {
      return { label: 'Vivant', couleur };
    }
    if (couleur === 'orange') {
      return { label: `Mourant · ${jours} j`, couleur };
    }
    return { label: `Mort · ${jours} j`, couleur };
  }

  /**
   * Calcule le libellé de classe de taille du dépôt.
   * @param resultat - Constat brut `gitlab.taille_depot`, absent si non calculable.
   * @param seuils - Bornes de classe de taille courantes.
   * @returns Le libellé calculé, `—` si non calculable.
   */
  private calculerLabelTaille(
    resultat: ResultatGitlabTailleDepot | undefined,
    seuils: LectureDefensive<SeuilsTailleDepot>,
  ): string {
    if (resultat === undefined || seuils.type === 'absent') {
      return '—';
    }
    return ClasseTailleUtils.calculerClasseTaille(resultat.tailleOctets, seuils.valeur);
  }

  /**
   * Calcule l'étiquette de couverture de tests.
   * @param resultat - Constat brut `sonar.couverture`, absent si non calculable.
   * @param seuils - Seuils de couverture courants.
   * @returns L'étiquette calculée, absente si {@link resultat} est absent.
   */
  private calculerEtiquetteCouverture(
    resultat: ResultatSonarCouverture | undefined,
    seuils: LectureDefensive<SeuilsCouverture>,
  ): EtiquetteCouleur | undefined {
    if (resultat === undefined) {
      return undefined;
    }
    const label = `${resultat.couverture.toFixed(1)} %`;
    if (seuils.type === 'absent') {
      return { label };
    }
    return {
      label,
      couleur: SeuilsCouleurUtils.calculerCouleurCouverture(
        resultat.couverture,
        seuils.valeur.seuilRouge,
        seuils.valeur.seuilOrange,
      ),
    };
  }

  /**
   * Calcule les quatre notes A–E Sonar (fiabilité, sécurité, maintenabilité, revue sécurité).
   * @param resultat - Constat brut `sonar.notes`.
   * @returns Les quatre notes calculées, dans l'ordre fiabilité/sécurité/maintenabilité/revue sécurité.
   */
  private calculerNotes(resultat: ResultatSonarNotes): readonly ResultatNoteSonar[] {
    return [
      resultat.fiabilite,
      resultat.securite,
      resultat.maintenabilite,
      resultat.revueSecurite,
    ].map((valeur): ResultatNoteSonar => NoteSonarUtils.calculerNoteLettre(valeur));
  }

  /**
   * Calcule l'étiquette d'un décompte de violations d'une sévérité donnée.
   * @param nombre - Nombre de violations constaté.
   * @param seuils - Seuils orange/rouge de cette sévérité, absents si non calculables.
   * @returns L'étiquette calculée.
   */
  private calculerEtiquetteViolation(
    nombre: number,
    seuils: { readonly seuilOrange: number; readonly seuilRouge: number } | undefined,
  ): EtiquetteCouleur {
    if (seuils === undefined) {
      return { label: String(nombre) };
    }
    return {
      label: String(nombre),
      couleur: SeuilsCouleurUtils.calculerCouleurViolations(
        nombre,
        seuils.seuilOrange,
        seuils.seuilRouge,
      ),
    };
  }

  /**
   * Calcule l'étiquette des demandes de fusion ouvertes.
   * @param mrOuvertes - Demandes de fusion ouvertes constatées.
   * @param seuils - Seuils des demandes de fusion ouvertes courants.
   * @param maintenant - Date de référence pour le calcul d'ancienneté.
   * @returns L'étiquette calculée.
   */
  private calculerEtiquetteMr(
    mrOuvertes: readonly MergeRequestOuverte[],
    seuils: LectureDefensive<SeuilsMrOuvertes>,
    maintenant: Date,
  ): EtiquetteCouleur {
    if (mrOuvertes.length === 0) {
      return { label: 'Aucune' };
    }
    const nombreConflits = mrOuvertes.filter((mr) => mr.enConflit).length;
    const label =
      nombreConflits > 0
        ? `${mrOuvertes.length} · ${nombreConflits} conflit${nombreConflits > 1 ? 's' : ''}`
        : `${mrOuvertes.length} · ok`;
    if (seuils.type === 'absent') {
      return { label };
    }
    const ageMaxJours = Math.max(
      ...mrOuvertes.map((mr) => this.joursDepuis(mr.creeLe, maintenant)),
    );
    const pourcentageConflit = (nombreConflits / mrOuvertes.length) * 100;
    const couleurAge = SeuilsCouleurUtils.calculerCouleurAgeMrOuverte(
      ageMaxJours,
      seuils.valeur.ageOrangeJours,
      seuils.valeur.ageRougeJours,
    );
    const couleurConflit = SeuilsCouleurUtils.calculerCouleurConflitMrOuvertes(
      pourcentageConflit,
      seuils.valeur.pourcentageConflitRouge,
    );
    return { label, couleur: this.pireCouleur(couleurAge, couleurConflit) };
  }

  /**
   * Résout le statut des membres du dépôt (RG-006 à RG-009) contre les membres connus du groupe.
   * @param membres - Membres du dépôt constatés, absents si non calculables.
   * @param membresConnus - Règles de membres connus du groupe de rattachement.
   * @returns Le libellé de la colonne Membres et l'indicateur de membre inconnu détecté.
   */
  private calculerMembres(
    membres: readonly { readonly username: string; readonly emailPublic?: string }[] | undefined,
    membresConnus: readonly MembreConnu[],
  ): { readonly label: string; readonly inconnu: boolean } {
    if (membres === undefined) {
      return { label: '—', inconnu: false };
    }
    const inconnus = membres.filter((membre) => {
      const resolution = StatutMembreUtils.calculerStatutMembre(
        { username: membre.username, email: membre.emailPublic },
        membresConnus,
      );
      return resolution.type === 'inconnu' || resolution.type === 'conflit';
    });
    if (inconnus.length === 0) {
      return { label: 'ok', inconnu: false };
    }
    return { label: `⚠ inconnu (${inconnus.length})`, inconnu: true };
  }

  /**
   * Calcule l'étiquette du statut IA du projet (RG-016).
   * @param iaAutorisee - Politique d'autorisation de l'IA du projet.
   * @param marqueurs - Marqueurs d'outils IA détectés par le dernier audit.
   * @returns L'étiquette calculée.
   */
  private calculerEtiquetteIa(
    iaAutorisee: boolean,
    marqueurs: readonly Marqueur[],
  ): EtiquetteCouleur {
    const statut = StatutIaUtils.calculerStatutIA(iaAutorisee, marqueurs);
    switch (statut.type) {
      case 'autorisee': {
        const outils = Array.from(
          new Set(statut.marqueursDetectes.map((marqueur) => marqueur.outil)),
        );
        return {
          label: outils.length > 0 ? `autorisée · ${outils.join(', ')}` : 'autorisée',
          couleur: 'vert',
        };
      }
      case 'violation': {
        const outils = Array.from(
          new Set(statut.marqueursDetectes.map((marqueur) => marqueur.outil)),
        );
        return { label: `interdite — violation (${outils.join(', ')})`, couleur: 'rouge' };
      }
      case 'conformeSousReserve':
        // Couleur dédiée (R10-03) distincte de 'autorisee' (vert) et harmonisée avec la Fiche projet.
        return { label: 'interdite — ok', couleur: 'bleu' };
    }
  }
}
