// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Synthèse graphique (US-016, Phase 6 incrément 7) : visualise l'évolution dans le temps des indicateurs d'un
// ou plusieurs projets, filtrable par groupe, projet et type d'indicateur (`docs/02_documentation/09_maquettes.md
// #synthèse-graphique`), avec export PNG (réutilisation stricte du pattern déjà établi par `SqmSyntheseAuditsComponent`
// et `SqmFicheProjetComponent`, aucune nouvelle abstraction d'export, cf. rapport de développement de cet
// incrément).
//
// Décision arbitraire (à valider par un humain, cf. rapport de développement de cet incrément, faute de maquette
// haute-fidélité pour cet écran) : ensemble des cinq indicateurs proposés au filtre « type d'indicateur »
// (couverture de tests, violations bloquantes, violations critiques, taille du dépôt, MR ouvertes), choisi parmi les
// indicateurs numériques déjà restitués ailleurs dans l'application, directement extractibles d'un audit sans
// recalcul complexe. Explicitement exclus de cette première version, faute de maquette et pour contenir le
// périmètre de cet incrément : les indicateurs relevant d'un calcul plus lourd par point historique (nombre de
// dépendances obsolètes recalculé à chaque audit contre le référentiel COURANT) et les « signaux binaires »
// mentionnés par la maquette (SONAR_KO, membre inconnu, violation IA) — point signalé comme doute pour arbitrage
// humain.
import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { toPng } from 'html-to-image';
import type {
  LigneVerticaleGraphique,
  SerieGraphiqueEvolution,
} from '../../composants/graphique-evolution/graphique-evolution.component';
import { SqmGraphiqueEvolutionComponent } from '../../composants/graphique-evolution/graphique-evolution.component';
import { SqmSelecteurVueComponent } from '../../composants/selecteur-vue/selecteur-vue.component';
import type {
  DemandeEnregistrementVue,
  DemandeSuppressionVue,
  VueSelectionnable,
} from '../../composants/selecteur-vue/selecteur-vue.component';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import type { Groupe, Projet, Resultat } from '../../services/avecetat/etat/types-donnees';
import { ChangementSeuilUtils } from '../../services/sansetat/jugement/changement-seuil.utils';
import { VuesEnregistreesUtils } from '../../services/sansetat/jugement/vues-enregistrees.utils';
import type {
  ResultatFiltrageVues,
  VueEnregistreeConnue,
} from '../../services/sansetat/jugement/vues-enregistrees.utils';

/**
 * Clé d'un type d'indicateur restituable par cet écran (cf. commentaire d'en-tête pour la justification de cet
 * ensemble).
 */
export type CleIndicateurGraphique =
  'couverture' | 'violationsBloquant' | 'violationsCritique' | 'tailleDepot' | 'mrOuvertes';

/**
 * Identifiant stable de cet écran pour les vues enregistrées (US-028, RG-027, Phase 9 incrément 2), distinct de
 * `listeTravail` (Phase 9 incrément 1) et de `syntheseAudits` (Phase 9 incrément 2).
 */
const ECRAN_SYNTHESE_GRAPHIQUE = 'syntheseGraphique';

/**
 * Version courante du schéma de filtres de cet écran (US-028, RG-027) : à incrémenter si la forme de
 * {@link FiltresSyntheseGraphique} change.
 */
const VERSION_FILTRES_SYNTHESE_GRAPHIQUE = 1;

/**
 * Forme des filtres de cet écran persistée par une vue enregistrée (US-028, RG-027 : « groupes, projets,
 * indicateurs, période, tri »). `projetIds` restitue {@link filtreProjetIdsInterne} sous forme sérialisable
 * (`null` = tous les projets disponibles, sur le même modèle que le signal interne).
 */
interface FiltresSyntheseGraphique {
  readonly groupeId: string | null;
  readonly indicateur: CleIndicateurGraphique;
  readonly projetIds: readonly string[] | null;
}

/**
 * Définition d'un type d'indicateur restituable : libellé affiché, préfixe de filtrage des changements de seuil du
 * journal des modifications (RG-023, `ChangementSeuilUtils`) pertinents pour cet indicateur, et unité affichée.
 */
interface DefinitionIndicateur {
  /** Clé de l'indicateur. */
  readonly cle: CleIndicateurGraphique;
  /** Libellé affiché dans le sélecteur de filtre. */
  readonly libelle: string;
  /** Préfixe de `EntreeJournal.objet` filtrant les changements de seuil pertinents pour cet indicateur (RG-023). */
  readonly prefixeSeuil: string;
}

/**
 * Palette catégorielle de couleurs assignées aux séries (une par projet), décision arbitraire (à valider par un
 * humain) faute de maquette haute-fidélité : identité catégorielle du projet, sans rapport avec les couleurs
 * sémantiques vert/orange/rouge du Moteur de jugement (RG-022), ces séries ne portant elles-mêmes aucun jugement.
 */
const PALETTE_SERIES: readonly string[] = [
  '#1a56db',
  '#dc2626',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
];

/**
 * Écran Synthèse graphique (US-016) : filtres groupe/projet/indicateur, graphique d'évolution réutilisable (zoom
 * temporel, séries activables/désactivables, lignes verticales des annotations et des changements de seuil,
 * RG-023), export PNG.
 */
@Component({
  selector: 'app-synthese-graphique',
  imports: [SqmGraphiqueEvolutionComponent, SqmSelecteurVueComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './synthese-graphique.component.html',
})
export class SqmSyntheseGraphiqueComponent {
  /**
   * Cinq indicateurs restituables par cet écran (cf. commentaire d'en-tête de ce fichier).
   */
  private static readonly INDICATEURS: readonly DefinitionIndicateur[] = [
    {
      cle: 'couverture',
      libelle: 'Couverture de tests (%)',
      prefixeSeuil: 'parametres.seuils.couverture',
    },
    {
      cle: 'violationsBloquant',
      libelle: 'Violations bloquantes',
      prefixeSeuil: 'parametres.seuils.couleursViolations.bloquant',
    },
    {
      cle: 'violationsCritique',
      libelle: 'Violations critiques',
      prefixeSeuil: 'parametres.seuils.couleursViolations.critique',
    },
    {
      cle: 'tailleDepot',
      libelle: 'Taille du dépôt (Mo)',
      prefixeSeuil: 'parametres.seuils.tailleDepot',
    },
    {
      cle: 'mrOuvertes',
      libelle: 'MR ouvertes (nombre)',
      prefixeSeuil: 'parametres.seuils.mrOuvertes',
    },
  ];

  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

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
   * Élément conteneur exporté en PNG (filtres et graphique inclus, pattern déjà établi par
   * `SqmSyntheseAuditsComponent`).
   */
  private readonly conteneurExport = viewChild<ElementRef<HTMLElement>>('conteneurExport');

  /**
   * Identifiant du groupe sélectionné dans le filtre, `null` = tous les groupes.
   */
  public readonly filtreGroupeId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Clé du type d'indicateur actuellement sélectionné.
   */
  public readonly filtreIndicateur: WritableSignal<CleIndicateurGraphique> =
    signal<CleIndicateurGraphique>('couverture');

  /**
   * Identifiants des projets explicitement sélectionnés par l'utilisateur parmi ceux disponibles dans le groupe
   * filtré, `null` = tous les projets disponibles (valeur par défaut).
   */
  private readonly filtreProjetIdsInterne: WritableSignal<ReadonlySet<string> | null> =
    signal<ReadonlySet<string> | null>(null);

  /**
   * Résultat du filtrage des vues enregistrées de cet écran par version de filtres courante (US-028, RG-027).
   */
  private readonly resultatFiltrageVues: Signal<ResultatFiltrageVues> = computed(() => {
    const connues: readonly VueEnregistreeConnue[] =
      this.donneesApplication.racine()?.vuesEnregistrees ?? [];
    return VuesEnregistreesUtils.filtrerPourEcran(
      connues,
      ECRAN_SYNTHESE_GRAPHIQUE,
      VERSION_FILTRES_SYNTHESE_GRAPHIQUE,
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
   * Cinq indicateurs proposés au filtre « type d'indicateur » (cf. {@link INDICATEURS}).
   * @returns Les indicateurs disponibles.
   */
  public indicateursDisponibles(): readonly DefinitionIndicateur[] {
    return SqmSyntheseGraphiqueComponent.INDICATEURS;
  }

  /**
   * Projets disponibles compte tenu du seul filtre de groupe (avant restriction éventuelle par le filtre de
   * projet), triés par nom pour un affichage stable de la liste de sélection et une assignation stable de couleur.
   */
  public readonly projetsDisponibles: Signal<readonly Projet[]> = computed(() => {
    const groupeId = this.filtreGroupeId();
    const groupes = this.donneesApplication.groupes();
    const groupesRetenus = groupeId === null ? groupes : groupes.filter((g) => g.id === groupeId);
    return groupesRetenus
      .flatMap((groupe) => groupe.projets)
      .slice()
      .sort((a, b) => a.nom.localeCompare(b.nom));
  });

  /**
   * Projets effectivement retenus pour construire les séries (après application du filtre de projet).
   */
  private readonly projetsRetenus: Signal<readonly Projet[]> = computed(() => {
    const disponibles = this.projetsDisponibles();
    const filtre = this.filtreProjetIdsInterne();
    return filtre === null ? disponibles : disponibles.filter((projet) => filtre.has(projet.id));
  });

  /**
   * Séries du graphique, une par projet retenu, pour l'indicateur actuellement sélectionné.
   */
  public readonly series: Signal<readonly SerieGraphiqueEvolution[]> = computed(() => {
    const indicateur = this.filtreIndicateur();
    return this.projetsRetenus().map((projet, index) =>
      this.construireSerie(
        projet,
        indicateur,
        PALETTE_SERIES[index % PALETTE_SERIES.length] ?? '#666',
      ),
    );
  });

  /**
   * Lignes verticales étiquetées du graphique : changements de seuil pertinents pour l'indicateur sélectionné
   * (RG-023, journal complet, non limité aux projets retenus — un seuil est un réglage global) et annotations des
   * projets actuellement retenus (US-019, Phase 8, créées ailleurs — `SqmFicheProjetComponent` — et seulement lues
   * et affichées ici, en lecture seule, jamais créées ni modifiées par cet écran).
   */
  public readonly lignesVerticales: Signal<readonly LigneVerticaleGraphique[]> = computed(() => {
    const racine = this.donneesApplication.racine();
    if (racine === null) {
      return [];
    }
    const definition = this.definitionIndicateurCourant();
    const changementsSeuil = ChangementSeuilUtils.calculerChangementsSeuil(
      racine.journal,
      definition.prefixeSeuil,
    );
    const lignesSeuil: LigneVerticaleGraphique[] = changementsSeuil.map((changement) => ({
      id: `seuil-${changement.objet}-${changement.date}`,
      date: changement.date,
      libelle: changement.libelle,
      categorie: 'changementSeuil',
    }));

    const annotationsParId = new Map<string, LigneVerticaleGraphique>();
    for (const projet of this.projetsRetenus()) {
      for (const annotation of projet.annotations) {
        annotationsParId.set(annotation.id, {
          id: annotation.id,
          date: annotation.date,
          libelle: annotation.libelle,
          categorie: 'annotation',
        });
      }
    }

    return [...lignesSeuil, ...annotationsParId.values()];
  });

  /**
   * Message affiché par le graphique en l'absence de donnée (RG explicite de la maquette : « message explicite
   * invitant à élargir le filtre »), personnalisé avec le libellé de l'indicateur actuellement sélectionné.
   * @returns Le message à transmettre au composant de graphique.
   */
  public messageAucuneDonnee(): string {
    const libelle = this.definitionIndicateurCourant().libelle;
    return (
      `Aucune donnée disponible pour « ${libelle} » sur les projets sélectionnés. Élargissez le groupe, ` +
      "le projet ou l'indicateur choisi."
    );
  }

  /**
   * Indique si un projet est actuellement retenu par le filtre de projet, pilote l'état de sa case à cocher.
   * @param projetId - Identifiant du projet concerné.
   * @returns `true` si le projet est retenu.
   */
  public projetRetenu(projetId: string): boolean {
    const filtre = this.filtreProjetIdsInterne();
    return filtre === null || filtre.has(projetId);
  }

  /**
   * Applique le filtre de groupe sélectionné ; réinitialise le filtre de projet (décision arbitraire, à valider par
   * un humain : un changement de périmètre de groupe repart d'une sélection de projets neutre — « tous » — plutôt
   * que de conserver une sélection devenue partiellement hors périmètre).
   * @param valeur - Identifiant du groupe sélectionné, chaîne vide = tous les groupes.
   */
  public onChangerGroupe(valeur: string): void {
    this.filtreGroupeId.set(valeur.length === 0 ? null : valeur);
    this.filtreProjetIdsInterne.set(null);
  }

  /**
   * Applique le type d'indicateur sélectionné, validé sans assertion de type contre {@link INDICATEURS}.
   * @param valeur - Valeur brute transmise par le sélecteur HTML.
   */
  public onChangerIndicateur(valeur: string): void {
    const trouve = SqmSyntheseGraphiqueComponent.INDICATEURS.find((def) => def.cle === valeur);
    this.filtreIndicateur.set(trouve?.cle ?? 'couverture');
  }

  /**
   * Bascule la sélection d'un projet dans le filtre de projet (charte d'ergonomie : action au clavier comme à la
   * souris, case à cocher native).
   * @param projetId - Identifiant du projet à basculer.
   */
  public basculerProjet(projetId: string): void {
    const disponibles = this.projetsDisponibles().map((projet) => projet.id);
    const actuel = this.filtreProjetIdsInterne() ?? new Set(disponibles);
    const nouveau = new Set(actuel);
    if (nouveau.has(projetId)) {
      nouveau.delete(projetId);
    } else {
      nouveau.add(projetId);
    }
    this.filtreProjetIdsInterne.set(nouveau);
  }

  /**
   * Sélectionne tous les projets actuellement disponibles (bouton de confort).
   */
  public toutSelectionner(): void {
    this.filtreProjetIdsInterne.set(null);
  }

  /**
   * Désélectionne tous les projets actuellement disponibles (bouton de confort).
   */
  public toutDeselectionner(): void {
    this.filtreProjetIdsInterne.set(new Set());
  }

  /**
   * Applique les filtres portés par une vue enregistrée choisie dans `SqmSelecteurVueComponent` (US-028). Ignore
   * silencieusement une vue dont les filtres ne correspondent pas structurellement à
   * {@link FiltresSyntheseGraphique} (aucun accès non sûr à une valeur JSON externe), sur le modèle de
   * `SqmListeTravailComponent`.
   * @param vue - Vue choisie, dont `filtres` reste typé `unknown` côté composant transverse.
   */
  public appliquerVue(vue: VueSelectionnable): void {
    if (!SqmSyntheseGraphiqueComponent.estFiltresSyntheseGraphique(vue.filtres)) {
      return;
    }
    this.filtreGroupeId.set(vue.filtres.groupeId);
    this.filtreIndicateur.set(vue.filtres.indicateur);
    this.filtreProjetIdsInterne.set(
      vue.filtres.projetIds === null ? null : new Set(vue.filtres.projetIds),
    );
  }

  /**
   * Vérifie structurellement qu'une valeur JSON externe (`VueEnregistree.filtres`) correspond bien à
   * {@link FiltresSyntheseGraphique}, avant tout accès à ses champs.
   * @param valeur - Valeur à vérifier.
   * @returns `true` si `valeur` correspond à la forme attendue.
   */
  private static estFiltresSyntheseGraphique(valeur: unknown): valeur is FiltresSyntheseGraphique {
    if (
      typeof valeur !== 'object' ||
      valeur === null ||
      !('groupeId' in valeur) ||
      !('indicateur' in valeur) ||
      !('projetIds' in valeur)
    ) {
      return false;
    }
    const groupeId: unknown = valeur.groupeId;
    if (groupeId !== null && typeof groupeId !== 'string') {
      return false;
    }
    const indicateur: unknown = valeur.indicateur;
    if (!SqmSyntheseGraphiqueComponent.INDICATEURS.some((def) => def.cle === indicateur)) {
      return false;
    }
    const projetIds: unknown = valeur.projetIds;
    return (
      projetIds === null ||
      (Array.isArray(projetIds) && projetIds.every((id) => typeof id === 'string'))
    );
  }

  /**
   * Crée ou met à jour une vue enregistrée avec les filtres courants (US-028, RG-027, RG-002).
   * @param demande - Nom, statut par défaut, identifiant de mise à jour éventuel et mot de passe déjà confirmés par
   * `SqmSelecteurVueComponent`.
   */
  public async enregistrerVue(demande: DemandeEnregistrementVue): Promise<void> {
    const filtreProjets = this.filtreProjetIdsInterne();
    const filtres: FiltresSyntheseGraphique = {
      groupeId: this.filtreGroupeId(),
      indicateur: this.filtreIndicateur(),
      projetIds: filtreProjets === null ? null : Array.from(filtreProjets),
    };
    const resultat = await this.donneesApplication.definirVue(
      demande.id,
      demande.nom,
      ECRAN_SYNTHESE_GRAPHIQUE,
      VERSION_FILTRES_SYNTHESE_GRAPHIQUE,
      demande.parDefaut,
      filtres,
      demande.motDePasse,
    );
    if (resultat.type === 'echec') {
      this.notification.erreur(
        "Une erreur inattendue est survenue lors de l'enregistrement de la vue.",
      );
      return;
    }
    this.notification.succes('La vue a été enregistrée.');
  }

  /**
   * Supprime une vue enregistrée (US-028, RG-002).
   * @param demande - Identifiant de la vue et mot de passe déjà confirmés par `SqmSelecteurVueComponent`.
   */
  public async supprimerVue(demande: DemandeSuppressionVue): Promise<void> {
    const resultat = await this.donneesApplication.supprimerVue(demande.id, demande.motDePasse);
    if (resultat.type === 'echec') {
      this.notification.erreur(
        'Une erreur inattendue est survenue lors de la suppression de la vue.',
      );
    }
  }

  /**
   * Exporte la vue courante (filtres et graphique inclus) en image PNG et déclenche son téléchargement, sur le
   * modèle exact déjà établi par `SqmSyntheseAuditsComponent`/`SqmFicheProjetComponent` (US-032, hors périmètre de
   * cet incrément en tant que mécanisme générique : réutilisation stricte du pattern existant).
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
    lien.download = `synthese-graphique-${new Date().toISOString().slice(0, 10)}.png`;
    lien.click();
  }

  /**
   * Restitue la définition de l'indicateur actuellement sélectionné.
   * @returns La définition trouvée (toujours présente, `filtreIndicateur` étant restreint à {@link INDICATEURS}).
   */
  private definitionIndicateurCourant(): DefinitionIndicateur {
    const cle = this.filtreIndicateur();
    const definition = SqmSyntheseGraphiqueComponent.INDICATEURS.find((def) => def.cle === cle);
    return definition ?? SqmSyntheseGraphiqueComponent.INDICATEURS[0];
  }

  /**
   * Retrouve, dans une liste de résultats typés, l'unique résultat portant le discriminant `type` demandé.
   * @param resultats - Résultats d'un audit.
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
   * Extrait, pour un audit donné, la valeur numérique de l'indicateur sélectionné, `undefined` si cet audit ne
   * porte pas le constat nécessaire (ex. aucune source Sonar rattachée pour un indicateur Sonar) — le point
   * correspondant est alors omis de la série plutôt que représenté par une valeur inventée (RG-011, RG-022).
   * @param cle - Indicateur dont la valeur est demandée.
   * @param resultats - Résultats de l'audit concerné.
   * @returns La valeur numérique extraite, `undefined` si non calculable.
   */
  private extraireValeur(
    cle: CleIndicateurGraphique,
    resultats: readonly Resultat[],
  ): number | undefined {
    switch (cle) {
      case 'couverture':
        return this.trouverResultat(resultats, 'sonar.couverture')?.couverture;
      case 'violationsBloquant':
        return this.trouverResultat(resultats, 'sonar.violations')?.parSeverite.bloquant;
      case 'violationsCritique':
        return this.trouverResultat(resultats, 'sonar.violations')?.parSeverite.critique;
      case 'tailleDepot': {
        const resultat = this.trouverResultat(resultats, 'gitlab.taille_depot');
        return resultat === undefined ? undefined : resultat.tailleOctets / 1_000_000;
      }
      case 'mrOuvertes':
        return this.trouverResultat(resultats, 'gitlab.merge_requests')?.mrOuvertes.length;
    }
  }

  /**
   * Construit la série d'un projet pour l'indicateur sélectionné, un point par audit du projet portant le constat
   * nécessaire, dans l'ordre chronologique de `Projet.audits` (déjà croissant, cf. `docs/02_documentation/
   * 12_modeleDonnees.md`).
   * @param projet - Projet concerné.
   * @param indicateur - Indicateur sélectionné.
   * @param couleur - Couleur catégorielle assignée à ce projet (cf. {@link PALETTE_SERIES}).
   * @returns La série construite.
   */
  private construireSerie(
    projet: Projet,
    indicateur: CleIndicateurGraphique,
    couleur: string,
  ): SerieGraphiqueEvolution {
    const points = [];
    for (const audit of projet.audits) {
      const valeur = this.extraireValeur(indicateur, audit.resultats);
      if (valeur !== undefined) {
        points.push({ date: audit.date, valeur });
      }
    }
    return { id: projet.id, libelle: projet.nom, couleur, points };
  }
}
