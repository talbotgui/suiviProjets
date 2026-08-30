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
  PointSerieGraphique,
  SerieGraphiqueEvolution,
} from '../../composants/graphique-evolution/graphique-evolution.component';
import { SqmGraphiqueEvolutionComponent } from '../../composants/graphique-evolution/graphique-evolution.component';
import { SqmSelecteurVueComponent } from '../../composants/selecteur-vue/selecteur-vue.component';
import type {
  DemandeEnregistrementVue,
  DemandeSuppressionVue,
  VueSelectionnable,
} from '../../composants/selecteur-vue/selecteur-vue.component';
import { SqmFiltreGroupeProjetComponent } from '../../composants/filtre-groupe-projet/filtre-groupe-projet.component';
import type {
  GroupeFiltrable,
  ProjetFiltrable,
  SelectionGroupeProjet,
} from '../../composants/filtre-groupe-projet/filtre-groupe-projet.component';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { ContexteConsultationService } from '../../services/avecetat/etat/contexte-consultation.service';
import type { EtatFiltreGroupeProjet } from '../../services/avecetat/etat/contexte-consultation.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import type { Projet, Resultat } from '../../services/avecetat/etat/types-donnees';
import { ChangementSeuilUtils } from '../../services/sansetat/jugement/changement-seuil.utils';
import { ExportImageUtils } from '../../services/sansetat/jugement/export-image.utils';
import { TriAlphabetiqueUtils } from '../../services/sansetat/jugement/tri-alphabetique.utils';
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
 * Version courante du schéma de filtres, commune à tous les écrans depuis le palier de migration `9` → `10`
 * (plan_16, incrément 2) : la forme de {@link FiltresSyntheseGraphique} (`{ groupeId, projetIds }`) est partagée.
 */
const VERSION_FILTRES_SYNTHESE_GRAPHIQUE = 1;

/**
 * Forme des filtres persistée par une vue enregistrée depuis le palier `9` → `10` (RG-027 amendée) : uniquement la
 * sélection de groupe et de projets, commune à tous les écrans. Le type d'indicateur est un filtre complémentaire
 * propre à cet écran, géré localement et jamais mémorisé dans une vue.
 */
interface FiltresSyntheseGraphique {
  /** Identifiant du groupe sélectionné, `null` = tous les groupes. */
  readonly groupeId: string | null;
  /** Identifiants des projets sélectionnés, `null` = aucune restriction de projet. */
  readonly projetIds: readonly string[] | null;
}

/**
 * Origine d'une application de vue, pour distinguer une sélection explicite de l'utilisateur (qui prend le pas sur
 * la vue par défaut d'un écran, RG-053) de l'amorçage automatique par la vue par défaut à la première visite.
 */
type OrigineApplicationVue = 'utilisateur' | 'vueParDefaut';

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
  imports: [
    SqmGraphiqueEvolutionComponent,
    SqmSelecteurVueComponent,
    SqmFiltreGroupeProjetComponent,
  ],
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
   * Filtre groupe/projet mutualisé, partagé avec les autres écrans de restitution (RG-053). Exposé au gabarit pour
   * alimenter `SqmFiltreGroupeProjetComponent` et lire l'état courant.
   */
  public readonly contexte: ContexteConsultationService = inject(ContexteConsultationService);

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
      // Priorité RG-053 : dès que l'utilisateur a touché le filtre partagé pendant la session, son choix le suit
      // d'un écran à l'autre et prime sur la vue par défaut de cet écran.
      if (this.contexte.filtreModifieParUtilisateur()) {
        this.vueParDefautDejaAppliquee = true;
        return;
      }
      const vueParDefaut = VuesEnregistreesUtils.trouverVueParDefaut(
        this.resultatFiltrageVues().applicables,
      );
      if (vueParDefaut === undefined) {
        return;
      }
      this.vueParDefautDejaAppliquee = true;
      this.appliquerVue(vueParDefaut, 'vueParDefaut');
    });
  }

  /**
   * Élément conteneur exporté en PNG (filtres et graphique inclus, pattern déjà établi par
   * `SqmSyntheseAuditsComponent`).
   */
  private readonly conteneurExport = viewChild<ElementRef<HTMLElement>>('conteneurExport');

  /**
   * Identifiant du groupe sélectionné dans le filtre partagé, `null` = tous les groupes. Dérivé de
   * {@link ContexteConsultationService} (RG-053) : la sélection est partagée avec les autres écrans de restitution.
   */
  public readonly filtreGroupeId: Signal<string | null> = computed(
    () => this.contexte.etat().groupeId,
  );

  /**
   * Identifiants des projets sélectionnés dans le filtre partagé, `null` = aucune restriction. Dérivé de
   * {@link ContexteConsultationService} (RG-053).
   */
  public readonly filtreProjetIds: Signal<readonly string[] | null> = computed(
    () => this.contexte.etat().projetIds,
  );

  /**
   * Clé du type d'indicateur actuellement sélectionné : filtre complémentaire propre à cet écran, jamais mémorisé
   * dans une vue enregistrée (RG-027 amendée).
   */
  public readonly filtreIndicateur: WritableSignal<CleIndicateurGraphique> =
    signal<CleIndicateurGraphique>('couverture');

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

  /** Groupes proposés au composant de filtre mutualisé (forme structurelle minimale, RG-053), triés par nom. */
  public readonly groupesFiltrables: Signal<readonly GroupeFiltrable[]> = computed(() =>
    this.donneesApplication.groupes().map((groupe) => ({ id: groupe.id, nom: groupe.nom })),
  );

  /**
   * Ensemble des projets (tous groupes confondus) proposés au composant de filtre mutualisé (RG-053). La liste
   * réellement affichée est restreinte au groupe sélectionné par le composant lui-même.
   */
  public readonly projetsFiltrables: Signal<readonly ProjetFiltrable[]> = computed(() =>
    this.donneesApplication
      .groupes()
      .flatMap((groupe) =>
        groupe.projets.map((projet) => ({ id: projet.id, nom: projet.nom, groupeId: groupe.id })),
      ),
  );

  /**
   * Cinq indicateurs proposés au filtre « type d'indicateur » (cf. {@link INDICATEURS}).
   * @returns Les indicateurs disponibles.
   */
  public indicateursDisponibles(): readonly DefinitionIndicateur[] {
    return SqmSyntheseGraphiqueComponent.INDICATEURS;
  }

  /**
   * Projets effectivement retenus pour construire les séries : projets du groupe sélectionné dans le filtre partagé
   * (tous les groupes si aucun n'est sélectionné), restreints à la sélection de projets du filtre partagé si elle
   * est resserrée (RG-053). Triés par nom pour un affichage stable de la liste et une assignation stable de
   * couleur.
   */
  private readonly projetsRetenus: Signal<readonly Projet[]> = computed(() => {
    const { groupeId, projetIds } = this.contexte.etat();
    const groupes = this.donneesApplication.groupes();
    const groupesRetenus = groupeId === null ? groupes : groupes.filter((g) => g.id === groupeId);
    const tries = TriAlphabetiqueUtils.trierParNom(
      groupesRetenus.flatMap((groupe) => groupe.projets),
    );
    if (projetIds === null) {
      return tries;
    }
    const permis = new Set(projetIds);
    return tries.filter((projet) => permis.has(projet.id));
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
   * (RG-023, journal complet, non limité aux projets retenus — un seuil est un réglage global), annotations des
   * projets actuellement retenus (US-019, Phase 8, créées ailleurs — `SqmFicheProjetComponent` — et seulement lues
   * et affichées ici, en lecture seule, jamais créées ni modifiées par cet écran), et le repère du premier audit
   * régulier tous projets confondus (C15-14, US-046, RG-046, cf. {@link datePremierAuditRegulier}) : à gauche de ce
   * repère, tout point de toute série provient d'un audit historique, les valeurs des audits historiques et
   * régulières étant désormais fondues dans une même courbe continue (cf. {@link construireSerie}).
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

    const datePremierAuditRegulier = this.datePremierAuditRegulier();
    const lignePremierAuditRegulier: readonly LigneVerticaleGraphique[] =
      datePremierAuditRegulier === undefined
        ? []
        : [
            {
              id: 'premier-audit-regulier',
              date: datePremierAuditRegulier,
              libelle: 'Début des audits réguliers',
              categorie: 'premierAuditRegulier',
            },
          ];

    return [...lignesSeuil, ...annotationsParId.values(), ...lignePremierAuditRegulier];
  });

  /**
   * Date du plus ancien audit régulier (`typeAudit: 'reguliere'`), tous groupes et tous projets confondus, sans
   * tenir compte des filtres de groupe/projet en vigueur (C15-14, US-046, RG-046 : « à gauche de ce repère, tous
   * les audits sont historiques » — un repère de nature globale, pas propre à la sélection courante). `undefined`
   * si aucun audit régulier n'existe encore (rien à repérer). Décision d'arbitrage humain du 2026-08-27 : la
   * représentation antérieure des audits historiques en points croix séparés est remplacée par une courbe continue
   * unique, ce repère vertical portant seul l'information de bascule entre les deux régimes.
   * @returns La date ISO 8601 du premier audit régulier, `undefined` si aucun.
   */
  private readonly datePremierAuditRegulier: Signal<string | undefined> = computed(() => {
    let plusAncienne: string | undefined;
    for (const groupe of this.donneesApplication.groupes()) {
      for (const projet of groupe.projets) {
        for (const audit of projet.audits) {
          if (audit.typeAudit === 'historique') {
            continue;
          }
          if (plusAncienne === undefined || audit.date < plusAncienne) {
            plusAncienne = audit.date;
          }
        }
      }
    }
    return plusAncienne;
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
   * Applique le type d'indicateur sélectionné, validé sans assertion de type contre {@link INDICATEURS}.
   * @param valeur - Valeur brute transmise par le sélecteur HTML.
   */
  public onChangerIndicateur(valeur: string): void {
    const trouve = SqmSyntheseGraphiqueComponent.INDICATEURS.find((def) => def.cle === valeur);
    this.filtreIndicateur.set(trouve?.cle ?? 'couverture');
  }

  /**
   * Reporte dans le filtre partagé (RG-053) la sélection émise par `SqmFiltreGroupeProjetComponent`, la marquant
   * comme modifiée par l'utilisateur (elle prime désormais sur toute vue par défaut d'écran).
   * @param selection - Sélection de groupe et de projets résultante.
   */
  public onSelectionGroupeProjet(selection: SelectionGroupeProjet): void {
    this.contexte.definirParUtilisateur({
      groupeId: selection.groupeId,
      projetIds: selection.projetIds,
    });
  }

  /**
   * Applique la sélection groupe/projet portée par une vue enregistrée (RG-027 amendée). Ignore silencieusement une
   * vue dont les filtres ne correspondent pas structurellement à {@link FiltresSyntheseGraphique} (aucun accès non
   * sûr à une valeur JSON externe). Selon l'origine, reporte la sélection dans le filtre partagé soit comme un
   * choix explicite de l'utilisateur (`utilisateur`), soit comme un amorçage par la vue par défaut (`vueParDefaut`,
   * n'écrase jamais un choix déjà fait). Le type d'indicateur n'entre plus dans une vue (RG-027 amendée) : il
   * conserve sa valeur locale courante.
   * @param vue - Vue choisie, dont `filtres` reste typé `unknown` côté composant transverse.
   * @param origine - Origine de l'application (défaut : sélection explicite de l'utilisateur).
   */
  public appliquerVue(
    vue: VueSelectionnable,
    origine: OrigineApplicationVue = 'utilisateur',
  ): void {
    if (!SqmSyntheseGraphiqueComponent.estFiltresSyntheseGraphique(vue.filtres)) {
      return;
    }
    const selection: EtatFiltreGroupeProjet = {
      groupeId: vue.filtres.groupeId,
      projetIds: vue.filtres.projetIds ?? null,
    };
    if (origine === 'vueParDefaut') {
      this.contexte.amorcerParVueParDefaut(selection);
    } else {
      this.contexte.definirParUtilisateur(selection);
    }
  }

  /**
   * Vérifie structurellement qu'une valeur JSON externe (`VueEnregistree.filtres`) correspond bien à
   * {@link FiltresSyntheseGraphique}, avant tout accès à ses champs.
   * @param valeur - Valeur à vérifier.
   * @returns `true` si `valeur` correspond à la forme attendue.
   */
  private static estFiltresSyntheseGraphique(valeur: unknown): valeur is FiltresSyntheseGraphique {
    if (typeof valeur !== 'object' || valeur === null || !('groupeId' in valeur)) {
      return false;
    }
    const groupeId: unknown = valeur.groupeId;
    if (groupeId !== null && typeof groupeId !== 'string') {
      return false;
    }
    const projetIds: unknown = 'projetIds' in valeur ? valeur.projetIds : null;
    return (
      projetIds === null ||
      (Array.isArray(projetIds) && projetIds.every((id) => typeof id === 'string'))
    );
  }

  /**
   * Crée ou met à jour une vue enregistrée avec la sélection groupe/projet courante (US-028, RG-027, RG-002).
   * @param demande - Nom, statut par défaut, identifiant de mise à jour éventuel et mot de passe déjà confirmés par
   * `SqmSelecteurVueComponent`.
   */
  public async enregistrerVue(demande: DemandeEnregistrementVue): Promise<void> {
    const etat = this.contexte.etat();
    const filtres: FiltresSyntheseGraphique = {
      groupeId: etat.groupeId,
      projetIds: etat.projetIds,
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
    const nomFichier = `synthese-graphique-${ExportImageUtils.construireHorodatage(new Date())}.png`;
    const lien = document.createElement('a');
    lien.href = dataUrl;
    lien.download = nomFichier;
    lien.click();
    this.notification.succes(
      `L'image ${nomFichier} a été téléchargée dans le dossier de téléchargements de votre navigateur/système.`,
    );
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
   * nécessaire, audits historiques (`typeAudit: 'historique'`, C15-14, US-046, RG-046) et audits réguliers
   * confondus dans une même courbe continue (décision d'arbitrage humain du 2026-08-27, remplaçant la
   * représentation antérieure des audits historiques en points croix séparés). Les points sont triés par date
   * croissante : `Projet.audits` est déjà chronologique (cf. `docs/02_documentation/12_modeleDonnees.md`) mais un
   * audit historique ciblant une date passée peut avoir été ajouté après des audits réguliers plus récents, d'où le
   * tri explicite garantissant une ligne qui relie les points dans le bon ordre temporel. Le repère de bascule
   * entre audits historiques et réguliers est porté par la ligne verticale `premierAuditRegulier` (cf.
   * {@link lignesVerticales}), jamais par la forme des points.
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
    const points: PointSerieGraphique[] = [];
    for (const audit of projet.audits) {
      const valeur = this.extraireValeur(indicateur, audit.resultats);
      if (valeur !== undefined) {
        points.push({ date: audit.date, valeur });
      }
    }
    points.sort((a, b) => a.date.localeCompare(b.date));
    return {
      id: projet.id,
      libelle: projet.nom,
      couleur,
      points,
    };
  }
}
