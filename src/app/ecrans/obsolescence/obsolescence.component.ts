// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Modale de détail pilotée par l'URL (plan_16, incrément 5 — US-052, RG-052) : l'ouverture de la modale du dernier
// audit d'un projet n'est plus un état interne du composant mais un paramètre de requête `projet` de la route
// `/obsolescence` (`withComponentInputBinding()`, `app.config.ts`), l'écran restant monté sous la modale. Ouvrir la
// modale revient à naviguer vers `/obsolescence?projet=<id>` (nouvelle étape d'historique) ; la fermer revient à
// reculer dans l'historique si possible, sinon à naviguer vers `/obsolescence` sans paramètre. Un paramètre
// désignant un projet supprimé depuis est ignoré sans erreur (modale close). Les autres écrans n'exposent aucune
// superposition dans l'URL ; seule cette modale l'est.
//
// Écran Obsolescence (US-051) : grille dense de tuiles, une par projet, portant un indicateur de retard en versions
// majeures par catégorie de dépendance (RG-050, RG-051). Toutes les valeurs sont recalculées à l'affichage depuis
// les constats bruts du dernier audit retenu de chaque projet et le référentiel courant (RG-011, RG-022) — aucun
// verdict n'est jamais stocké.
//
// Décisions arbitraires (à valider par un humain, cf. rapport de développement de cet incrément), faute de maquette
// haute-fidélité :
// - Audit retenu par projet : dernier audit RÉGULIER (`typeAudit !== 'historique'`) dont la date est antérieure ou
//   égale à la date du filtre (initialisée à aujourd'hui), sur le modèle de sélection de la Synthèse des audits.
// - Filtre par catégorie : un couple valeur min / valeur max par catégorie, appliqués en ET ; un couple laissé à
//   pleine amplitude (`[0, max]`) n'est pas un filtre actif (un projet sans valeur pour cette catégorie n'est alors
//   pas exclu) ; dès qu'un couple est resserré, un projet sans valeur pour cette catégorie est exclu (choix
//   surprenant relevé en relecture, N10 : conservé faute d'un comportement plus intuitif consensuel).
// - Palette : une teinte constante par catégorie, indexée par la position de la catégorie dans le référentiel
//   (`PALETTE_CATEGORIES`, cycle si plus de catégories que de teintes) ; la valeur est encodée par la seule
//   longueur de barre, la valeur numérique restant toujours affichée (RNF-020).
// - Médiane d'une catégorie : médiane des valeurs des projets AFFICHÉS ayant une valeur pour cette catégorie (les
//   projets sans valeur sont exclus du calcul, jamais comptés `0`).
//
// Toutes les données par tuile (mesures, infobulle) et la table des couleurs sont précalculées dans des `computed`
// (N9, relecture) : aucune méthode en O(n) n'est appelée depuis le gabarit dans une boucle de rendu.
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { InputSignal, Signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toPng } from 'html-to-image';
import { SqmBarreMesureComponent } from '../../composants/barre-mesure/barre-mesure.component';
import { SqmIconeLangageComponent } from '../../composants/icone-langage/icone-langage.component';
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
import { HistoriqueNavigationService } from '../../services/avecetat/etat/historique-navigation.service';
import type { EtatFiltreGroupeProjet } from '../../services/avecetat/etat/contexte-consultation.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import type { Audit, Resultat } from '../../services/avecetat/etat/types-donnees';
import { VuesEnregistreesUtils } from '../../services/sansetat/jugement/vues-enregistrees.utils';
import type {
  ResultatFiltrageVues,
  VueEnregistreeConnue,
} from '../../services/sansetat/jugement/vues-enregistrees.utils';
import { AgregationThemeFicheProjetUtils } from '../../services/sansetat/jugement/agregation-theme-fiche-projet.utils';
import { ExportImageUtils } from '../../services/sansetat/jugement/export-image.utils';
import { LangagesPrincipauxUtils } from '../../services/sansetat/jugement/langages-principaux.utils';
import type { LangagePrincipal } from '../../services/sansetat/jugement/langages-principaux.utils';
import {
  ObsolescenceRetardUtils,
  type ObsolescenceCategorie,
} from '../../services/sansetat/jugement/obsolescence-retard.utils';
import {
  ParametresJugementUtils,
  type CategorieDependance,
  type RegleDependance,
} from '../../services/sansetat/jugement/parametres-jugement.utils';
import { StatutObsolescenceUtils } from '../../services/sansetat/jugement/statut-obsolescence.utils';
import { TriAlphabetiqueUtils } from '../../services/sansetat/jugement/tri-alphabetique.utils';

/**
 * Identifiant stable de cet écran pour les vues enregistrées (US-028, RG-027), distinct de `syntheseAudits`,
 * `syntheseGraphique` et `listeTravail`. Écran ajouté au périmètre des vues par le plan_16 (RG-027 amendée).
 */
const ECRAN_OBSOLESCENCE = 'obsolescence';

/**
 * Version courante du schéma de filtres, commune à tous les écrans depuis le palier de migration `9` → `10`
 * (plan_16, incrément 2) : la forme de {@link FiltresObsolescence} (`{ groupeId, projetIds }`) est partagée.
 */
const VERSION_FILTRES_OBSOLESCENCE = 1;

/**
 * Forme des filtres persistée par une vue enregistrée (RG-027 amendée) : uniquement la sélection de groupe et de
 * projets, commune à tous les écrans. La date de l'audit retenu et les bornes min/max par catégorie n'entrent
 * jamais dans une vue (filtres complémentaires propres à l'écran, gérés localement).
 */
interface FiltresObsolescence {
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

/** Teintes catégorielles (même clarté/saturation) ; cyclées si le référentiel porte davantage de catégories. */
const PALETTE_CATEGORIES: readonly string[] = [
  'hsl(215 65% 52%)',
  'hsl(150 48% 42%)',
  'hsl(28 72% 52%)',
  'hsl(280 42% 55%)',
  'hsl(190 55% 45%)',
  'hsl(340 55% 55%)',
];

/** Retard d'obsolescence d'un projet, par catégorie, pour l'audit retenu (données brutes, avant filtrage). */
interface LigneObsolescence {
  readonly projetId: string;
  readonly nomProjet: string;
  readonly groupeId: string;
  readonly nomGroupe: string;
  /** Audit régulier retenu (le plus récent à la date du filtre), `undefined` si le projet n'en a aucun. */
  readonly audit: Audit | undefined;
  /** Retard par identifiant de catégorie ; une catégorie absente signifie « aucune valeur » (jamais `0`). */
  readonly valeurParCategorie: ReadonlyMap<string, number>;
  /**
   * Langages principaux du projet (RG-057), sélectionnés à partir de la ventilation Sonar `ncloc_language_distribution`
   * de l'audit retenu. Liste vide si la ventilation par langage est indisponible.
   */
  readonly langagesPrincipaux: readonly LangagePrincipal[];
  /** Texte de l'infobulle native de la tuile, précalculé. */
  readonly infobulle: string;
}

/** Mesure affichée d'une catégorie sur une tuile (une barre). */
interface MesureCategorie {
  readonly categorieId: string;
  readonly sigle: string;
  readonly couleur: string;
  readonly valeur: number | null;
  readonly valeurMax: number;
}

/** Tuile affichée : projet + une mesure par catégorie, après application des filtres. */
interface TuileObsolescence {
  readonly projetId: string;
  readonly nomProjet: string;
  readonly infobulle: string;
  /** Langages principaux du projet (RG-057), recopiés de la ligne source pour l'affichage en icônes sur la tuile. */
  readonly langagesPrincipaux: readonly LangagePrincipal[];
  readonly mesures: readonly MesureCategorie[];
}

/** Couple de bornes d'un filtre par catégorie. */
interface BornesFiltre {
  readonly min: number;
  readonly max: number;
}

/** Ligne de détail d'une dépendance dans la modale du dernier audit d'un projet. */
interface LigneDetailDependance {
  readonly reference: string;
  readonly manifeste: string;
  readonly version: string;
  readonly categorie: string;
  readonly retard: string;
  readonly estJava: boolean;
}

/** Contenu de la modale de détail. */
interface DetailProjet {
  /** Identifiant du projet, pour le lien « Ouvrir la fiche projet » du pied de la modale (plan_16, groupe 1.1). */
  readonly projetId: string;
  readonly nomProjet: string;
  readonly dateAudit: string;
  readonly lignes: readonly LigneDetailDependance[];
}

/**
 * Écran Obsolescence : filtres (groupe, date, valeur min/max par catégorie), bandeau de légende (médiane par
 * catégorie, décompte), grille de tuiles projet, modale de détail du dernier audit, export PNG.
 */
@Component({
  selector: 'app-obsolescence',
  imports: [
    SqmBarreMesureComponent,
    SqmIconeLangageComponent,
    SqmSelecteurVueComponent,
    SqmFiltreGroupeProjetComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './obsolescence.component.html',
  styleUrl: './obsolescence.component.scss',
  host: { '(document:keydown.escape)': 'fermerDetail()' },
})
export class SqmObsolescenceComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);
  private readonly injector: Injector = inject(Injector);
  private readonly router: Router = inject(Router);
  private readonly routeActive: ActivatedRoute = inject(ActivatedRoute);
  private readonly historique: HistoriqueNavigationService = inject(HistoriqueNavigationService);

  /**
   * Filtre groupe/projet mutualisé, partagé avec les autres écrans de restitution (RG-053). Exposé au gabarit pour
   * alimenter `SqmFiltreGroupeProjetComponent` et lire l'état courant.
   */
  public readonly contexte: ContexteConsultationService = inject(ContexteConsultationService);

  /**
   * Indique que la vue par défaut de cet écran (US-028, RG-027) a déjà été appliquée une fois, pour ne l'appliquer
   * qu'une seule fois par instance de ce composant.
   */
  private vueParDefautDejaAppliquee = false;

  public constructor() {
    // Priorité RG-053 n°1 (plan_16 [B.4], groupe 1.1) : un lien contextuel pré-filtrant (« Fiche projet → voir
    // l'obsolescence du groupe ») porte le paramètre de requête `groupeId` ; à l'entrée sur l'écran, il écrase le
    // filtre partagé et la vue par défaut en repositionnant `ContexteConsultationService` (sélection utilisateur,
    // `filtreModifieParUtilisateur` passe à `true`, ce qui neutralise l'amorçage par vue par défaut ci-dessous).
    // Lecture du seul `snapshot` : le constructeur n'est exécuté qu'une fois par entrée sur l'écran, l'ouverture/
    // fermeture de la modale ne réévaluant jamais ce paramètre (le filtre reste alors celui déjà mémorisé).
    const groupeIdPreFiltre = this.routeActive.snapshot.queryParamMap.get('groupeId');
    if (groupeIdPreFiltre !== null && groupeIdPreFiltre.length > 0) {
      this.contexte.definirParUtilisateur({ groupeId: groupeIdPreFiltre, projetIds: null });
    }

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

    // Gestion du focus de la modale de détail (RNF-019) : l'ouverture/fermeture étant désormais pilotée par l'URL
    // (paramètre de requête `projet`), c'est cette transition d'affichage qui déplace le focus dans le panneau à
    // l'ouverture et le rend à l'élément déclencheur à la fermeture, plutôt que les méthodes d'ouverture/fermeture
    // (asynchrones depuis qu'elles naviguent).
    effect(() => {
      const affichee = this.detailProjetSelectionne() !== null;
      if (affichee === this.modaleAffichee) {
        return;
      }
      this.modaleAffichee = affichee;
      if (affichee) {
        afterNextRender(() => this.panneauModale()?.nativeElement.focus(), {
          injector: this.injector,
        });
      } else {
        this.elementFocusAvantModale?.focus();
        this.elementFocusAvantModale = null;
      }
    });
  }

  private readonly conteneurExport: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('conteneurExport');

  /** Panneau de la modale de détail, résolu une fois la modale rendue (gestion du focus). */
  private readonly panneauModale: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('panneauModale');

  /** Élément qui avait le focus avant l'ouverture de la modale, pour le lui rendre à la fermeture. */
  private elementFocusAvantModale: HTMLElement | null = null;

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

  /** Date de l'audit retenu (dernier audit régulier à cette date ou avant), initialisée à aujourd'hui. */
  public readonly filtreDate: WritableSignal<string> = signal(
    SqmObsolescenceComponent.aujourdhui(),
  );

  /**
   * Bornes de filtre resserrées par l'utilisateur, par identifiant de catégorie. Une catégorie absente de cette
   * table n'est pas filtrée (pleine amplitude).
   */
  private readonly bornesFiltre: WritableSignal<ReadonlyMap<string, BornesFiltre>> = signal(
    new Map<string, BornesFiltre>(),
  );

  /**
   * Identifiant du projet dont la modale de détail est ouverte, lié au paramètre de requête `projet` de la route
   * `/obsolescence` (`withComponentInputBinding()`, US-052, RG-052). Absent hors modale ouverte.
   */
  public readonly projet: InputSignal<string | undefined> = input<string>();

  /**
   * Projet dont la modale de détail est ouverte, `null` si aucune : dérivé du paramètre de requête `projet`
   * ({@link projet}). Un identifiant désignant un projet inconnu (supprimé depuis) est pris en compte ici mais
   * ignoré sans erreur par {@link detailProjetSelectionne} (modale close).
   */
  public readonly projetSelectionne: Signal<string | null> = computed(() => this.projet() ?? null);

  /** Vrai tant que la modale de détail est effectivement affichée, pour n'agir sur le focus qu'aux transitions. */
  private modaleAffichee = false;

  /**
   * Date du jour au format `AAAA-MM-JJ` (locale du système).
   * @returns La date du jour.
   */
  private static aujourdhui(): string {
    return ExportImageUtils.construireHorodatage(new Date()).slice(0, 10);
  }

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
   * Résultat du filtrage des vues enregistrées de cet écran par version de filtres courante (US-028, RG-027).
   */
  private readonly resultatFiltrageVues: Signal<ResultatFiltrageVues> = computed(() => {
    const connues: readonly VueEnregistreeConnue[] =
      this.donneesApplication.racine()?.vuesEnregistrees ?? [];
    return VuesEnregistreesUtils.filtrerPourEcran(
      connues,
      ECRAN_OBSOLESCENCE,
      VERSION_FILTRES_OBSOLESCENCE,
    );
  });

  /** Vues enregistrées applicables à cet écran (US-028, RG-027). */
  public readonly vuesApplicables: Signal<readonly VueSelectionnable[]> = computed(
    () => this.resultatFiltrageVues().applicables,
  );

  /** Nombre de vues enregistrées de cet écran ignorées pour cause de version de filtres obsolète (US-028). */
  public readonly nombreVuesIgnorees: Signal<number> = computed(
    () => this.resultatFiltrageVues().nombreIgnorees,
  );

  /** Catégories de dépendance du référentiel courant (fixent aussi l'ordre d'affichage des indicateurs). */
  public readonly categories: Signal<readonly CategorieDependance[]> = computed(() => {
    const lecture = ParametresJugementUtils.lireCategoriesDependances(
      this.donneesApplication.racine()?.referentiels,
    );
    return lecture.type === 'valeur' ? lecture.valeur : [];
  });

  /** Couleur de barre associée à chaque catégorie (par position dans le référentiel), précalculée. */
  public readonly couleurParCategorie: Signal<ReadonlyMap<string, string>> = computed(() => {
    const table = new Map<string, string>();
    this.categories().forEach((categorie, index) => {
      table.set(categorie.id, PALETTE_CATEGORIES[index % PALETTE_CATEGORIES.length]);
    });
    return table;
  });

  /** Règles de dépendances courantes (lues une seule fois par cycle, RG-022). */
  private readonly regles: Signal<readonly RegleDependance[]> = computed(() => {
    const lecture = ParametresJugementUtils.lireReglesDependances(
      this.donneesApplication.racine()?.referentiels,
    );
    return lecture.type === 'valeur' ? lecture.valeur : [];
  });

  /** Retard d'obsolescence de chaque projet (tous groupes), pour la date de filtre courante. */
  private readonly lignesTousProjets: Signal<readonly LigneObsolescence[]> = computed(() => {
    const racine = this.donneesApplication.racine();
    if (racine === null) {
      return [];
    }
    const regles = this.regles();
    const categories = this.categories();
    const dateLimite = this.filtreDate();

    const lignes: LigneObsolescence[] = [];
    for (const groupe of racine.groupes) {
      for (const projet of groupe.projets) {
        const audit = SqmObsolescenceComponent.auditRetenu(projet.audits, dateLimite);
        const obsolescence: readonly ObsolescenceCategorie[] =
          audit === undefined
            ? []
            : ObsolescenceRetardUtils.calculerObsolescenceParCategorie(
                AgregationThemeFicheProjetUtils.regrouper(audit.resultats).dependances,
                regles,
                categories,
              );
        const valeurParCategorie = new Map(
          obsolescence.map((entree) => [entree.categorieId, entree.valeur]),
        );
        const langagesPrincipaux =
          audit === undefined
            ? []
            : LangagesPrincipauxUtils.selectionner(
                SqmObsolescenceComponent.extraireParLangage(audit),
              );
        lignes.push({
          projetId: projet.id,
          nomProjet: projet.nom,
          groupeId: groupe.id,
          nomGroupe: groupe.nom,
          audit,
          valeurParCategorie,
          langagesPrincipaux,
          infobulle: SqmObsolescenceComponent.construireInfobulle(
            projet.nom,
            groupe.nom,
            categories,
            valeurParCategorie,
            langagesPrincipaux,
          ),
        });
      }
    }
    return lignes
      .slice()
      .sort((a, b) => TriAlphabetiqueUtils.comparerTextes(a.nomProjet, b.nomProjet));
  });

  /**
   * Dernier audit régulier d'un projet dont la date (jour) est antérieure ou égale à la date limite.
   * @param audits - Audits du projet.
   * @param dateLimite - Date limite au format `AAAA-MM-JJ`.
   * @returns L'audit retenu, ou `undefined`.
   */
  private static auditRetenu(audits: readonly Audit[], dateLimite: string): Audit | undefined {
    return audits
      .filter(
        (candidat) =>
          candidat.typeAudit !== 'historique' && candidat.date.slice(0, 10) <= dateLimite,
      )
      .at(-1);
  }

  /**
   * Extrait la ventilation Sonar par langage (`ncloc_language_distribution`) de l'audit retenu d'un projet
   * (RG-057), sans assertion de type : type-guard sur le discriminant `sonar.ncloc` de l'union `Resultat`.
   * @param audit - Audit retenu du projet.
   * @returns La répartition `{ clé Sonar → lignes de code }`, objet vide si l'audit ne porte pas ce constat.
   */
  private static extraireParLangage(audit: Audit): Readonly<Record<string, number>> {
    const resultat = audit.resultats.find(
      (candidat): candidat is Extract<Resultat, { type: 'sonar.ncloc' }> =>
        candidat.type === 'sonar.ncloc',
    );
    return resultat?.parLangage ?? {};
  }

  /**
   * Construit le texte de l'infobulle d'une tuile.
   * @param nomProjet - Nom du projet.
   * @param nomGroupe - Nom du groupe.
   * @param categories - Catégories du référentiel.
   * @param valeurParCategorie - Retard par identifiant de catégorie.
   * @param langagesPrincipaux - Langages principaux du projet (RG-057), ligne ajoutée si la liste est non vide.
   * @returns Le texte de l'infobulle.
   */
  private static construireInfobulle(
    nomProjet: string,
    nomGroupe: string,
    categories: readonly CategorieDependance[],
    valeurParCategorie: ReadonlyMap<string, number>,
    langagesPrincipaux: readonly LangagePrincipal[],
  ): string {
    const details = categories.map((categorie) => {
      const valeur = valeurParCategorie.get(categorie.id);
      const texte =
        valeur === undefined ? 'aucune dépendance' : `${valeur} version(s) majeure(s) de retard`;
      return `${categorie.libelle} : ${texte}`;
    });
    // Point ouvert du plan (incrément 5) : la clé Sonar brute est affichée ici, faute d'extraire la table de
    // correspondance libellé du composant d'icône ; décision arbitraire à valider par un humain.
    const ligneLangages =
      langagesPrincipaux.length === 0
        ? []
        : [`Langages : ${langagesPrincipaux.map((langage) => langage.cleSonar).join(', ')}`];
    return [`${nomProjet} (${nomGroupe})`, ...details, ...ligneLangages].join('\n');
  }

  /**
   * Valeur maximale de chaque catégorie, tous filtres ignorés (borne haute des curseurs de filtre, cf. maquette).
   */
  public readonly maxParCategorie: Signal<ReadonlyMap<string, number>> = computed(() => {
    const max = new Map<string, number>();
    for (const ligne of this.lignesTousProjets()) {
      for (const [categorieId, valeur] of ligne.valeurParCategorie) {
        max.set(categorieId, Math.max(max.get(categorieId) ?? 0, valeur));
      }
    }
    return max;
  });

  /** Projets affichés après application des filtres (groupe/projet partagés + min/max par catégorie, en ET). */
  public readonly projetsAffiches: Signal<readonly LigneObsolescence[]> = computed(() => {
    const { groupeId, projetIds } = this.contexte.etat();
    const bornes = this.bornesFiltre();
    const maxParCategorie = this.maxParCategorie();
    const categories = this.categories();
    return this.lignesTousProjets().filter((ligne) => {
      if (groupeId !== null && ligne.groupeId !== groupeId) {
        return false;
      }
      if (projetIds !== null && !projetIds.includes(ligne.projetId)) {
        return false;
      }
      for (const categorie of categories) {
        const filtre = bornes.get(categorie.id);
        if (filtre === undefined) {
          continue;
        }
        const amplitudeMax = maxParCategorie.get(categorie.id) ?? 0;
        const pleineAmplitude = filtre.min <= 0 && filtre.max >= amplitudeMax;
        if (pleineAmplitude) {
          continue;
        }
        const valeur = ligne.valeurParCategorie.get(categorie.id);
        if (valeur === undefined || valeur < filtre.min || valeur > filtre.max) {
          return false;
        }
      }
      return true;
    });
  });

  /** Tuiles à afficher : projet + une mesure par catégorie, tout précalculé pour le gabarit. */
  public readonly tuiles: Signal<readonly TuileObsolescence[]> = computed(() => {
    const categories = this.categories();
    const couleurs = this.couleurParCategorie();
    const maxParCategorie = this.maxParCategorie();
    return this.projetsAffiches().map((ligne) => ({
      projetId: ligne.projetId,
      nomProjet: ligne.nomProjet,
      infobulle: ligne.infobulle,
      langagesPrincipaux: ligne.langagesPrincipaux,
      mesures: categories.map((categorie) => ({
        categorieId: categorie.id,
        sigle: categorie.sigle,
        couleur: couleurs.get(categorie.id) ?? PALETTE_CATEGORIES[0],
        valeur: ligne.valeurParCategorie.get(categorie.id) ?? null,
        valeurMax: maxParCategorie.get(categorie.id) ?? 0,
      })),
    }));
  });

  /** Médiane de chaque catégorie sur les projets affichés (projets sans valeur exclus). */
  public readonly medianeParCategorie: Signal<ReadonlyMap<string, number>> = computed(() => {
    const mediane = new Map<string, number>();
    const lignes = this.projetsAffiches();
    for (const categorie of this.categories()) {
      const valeurs = lignes
        .map((ligne) => ligne.valeurParCategorie.get(categorie.id))
        .filter((valeur): valeur is number => valeur !== undefined)
        .sort((a, b) => a - b);
      if (valeurs.length === 0) {
        continue;
      }
      const milieu = Math.floor(valeurs.length / 2);
      mediane.set(
        categorie.id,
        valeurs.length % 2 === 0 ? (valeurs[milieu - 1] + valeurs[milieu]) / 2 : valeurs[milieu],
      );
    }
    return mediane;
  });

  /** Nombre de projets affichés (décompte du bandeau). */
  public readonly total: Signal<number> = computed(() => this.projetsAffiches().length);

  /** Détail des dépendances du dernier audit retenu du projet sélectionné (modale). */
  public readonly detailProjetSelectionne: Signal<DetailProjet | null> = computed(() => {
    const projetId = this.projetSelectionne();
    if (projetId === null) {
      return null;
    }
    const ligne = this.lignesTousProjets().find((candidat) => candidat.projetId === projetId);
    if (ligne === undefined) {
      return null;
    }
    if (ligne.audit === undefined) {
      return { projetId, nomProjet: ligne.nomProjet, dateAudit: 'jamais audité', lignes: [] };
    }
    const regles = this.regles();
    const libelleParCategorie = new Map(
      this.categories().map((categorie) => [categorie.id, categorie.libelle]),
    );
    const dependances = AgregationThemeFicheProjetUtils.regrouper(
      ligne.audit.resultats,
    ).dependances;
    const lignesDetail: LigneDetailDependance[] = dependances.map((dependance) => {
      const regle = StatutObsolescenceUtils.trouverRegle(dependance.reference, regles);
      const retard =
        regle === undefined
          ? undefined
          : ObsolescenceRetardUtils.calculerRetardDependance(dependance, regle);
      const categorieId = regle?.categorie;
      return {
        reference: dependance.reference,
        manifeste: dependance.manifeste,
        version: dependance.version,
        categorie: categorieId === undefined ? '—' : (libelleParCategorie.get(categorieId) ?? '—'),
        retard: retard === undefined ? '—' : String(retard),
        estJava: dependance.reference === 'java',
      };
    });
    return {
      projetId,
      nomProjet: ligne.nomProjet,
      dateAudit: ligne.audit.date.slice(0, 10),
      lignes: lignesDetail
        .slice()
        .sort(
          (a, b) =>
            a.reference.localeCompare(b.reference) ||
            a.manifeste.localeCompare(b.manifeste) ||
            a.version.localeCompare(b.version),
        ),
    };
  });

  /**
   * Borne minimale actuelle du filtre d'une catégorie (0 par défaut).
   * @param categorieId - Identifiant de la catégorie.
   * @returns La borne minimale.
   */
  public minFiltre(categorieId: string): number {
    return this.bornesFiltre().get(categorieId)?.min ?? 0;
  }

  /**
   * Borne maximale actuelle du filtre d'une catégorie (max de la catégorie par défaut).
   * @param categorieId - Identifiant de la catégorie.
   * @returns La borne maximale.
   */
  public maxFiltre(categorieId: string): number {
    return (
      this.bornesFiltre().get(categorieId)?.max ?? this.maxParCategorie().get(categorieId) ?? 0
    );
  }

  /**
   * Applique une borne de filtre saisie pour une catégorie.
   * @param categorieId - Identifiant de la catégorie.
   * @param borne - Borne concernée.
   * @param valeur - Nouvelle valeur brute saisie.
   */
  public onChangerBorne(categorieId: string, borne: 'min' | 'max', valeur: string): void {
    const nombre = Number.parseInt(valeur, 10);
    const amplitudeMax = this.maxParCategorie().get(categorieId) ?? 0;
    const courant: BornesFiltre = {
      min: this.minFiltre(categorieId),
      max: this.maxFiltre(categorieId),
    };
    const nouveau: BornesFiltre =
      borne === 'min'
        ? { ...courant, min: Number.isNaN(nombre) ? 0 : Math.max(0, Math.min(nombre, courant.max)) }
        : {
            ...courant,
            max: Number.isNaN(nombre)
              ? amplitudeMax
              : Math.min(amplitudeMax, Math.max(nombre, courant.min)),
          };
    const table = new Map(this.bornesFiltre());
    table.set(categorieId, nouveau);
    this.bornesFiltre.set(table);
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
   * vue dont les filtres ne correspondent pas structurellement à {@link FiltresObsolescence} (aucun accès non sûr à
   * une valeur JSON externe). Selon l'origine, reporte la sélection dans le filtre partagé soit comme un choix
   * explicite de l'utilisateur (`utilisateur`), soit comme un amorçage par la vue par défaut (`vueParDefaut`,
   * n'écrase jamais un choix déjà fait).
   * @param vue - Vue choisie, dont `filtres` reste typé `unknown` côté composant transverse.
   * @param origine - Origine de l'application (défaut : sélection explicite de l'utilisateur).
   */
  public appliquerVue(
    vue: VueSelectionnable,
    origine: OrigineApplicationVue = 'utilisateur',
  ): void {
    if (!SqmObsolescenceComponent.estFiltresObsolescence(vue.filtres)) {
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
   * {@link FiltresObsolescence}, avant tout accès à ses champs.
   * @param valeur - Valeur à vérifier.
   * @returns `true` si `valeur` correspond à la forme attendue.
   */
  private static estFiltresObsolescence(valeur: unknown): valeur is FiltresObsolescence {
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
      (Array.isArray(projetIds) && projetIds.every((element) => typeof element === 'string'))
    );
  }

  /**
   * Crée ou met à jour une vue enregistrée avec la sélection groupe/projet courante (US-028, RG-027, RG-002).
   * @param demande - Nom, statut par défaut, identifiant de mise à jour éventuel et mot de passe déjà confirmés par
   * `SqmSelecteurVueComponent`.
   */
  public async enregistrerVue(demande: DemandeEnregistrementVue): Promise<void> {
    const etat = this.contexte.etat();
    const filtres: FiltresObsolescence = { groupeId: etat.groupeId, projetIds: etat.projetIds };
    const resultat = await this.donneesApplication.definirVue(
      demande.id,
      demande.nom,
      ECRAN_OBSOLESCENCE,
      VERSION_FILTRES_OBSOLESCENCE,
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
   * Met à jour la date de l'audit retenu.
   * @param valeur - Date saisie au format `AAAA-MM-JJ`.
   */
  public onChangerDate(valeur: string): void {
    if (valeur.length > 0) {
      this.filtreDate.set(valeur);
    }
  }

  /**
   * Ouvre la modale de détail du dernier audit d'un projet, en naviguant vers `/obsolescence?projet=<id>` : une
   * nouvelle étape d'historique de navigation (US-052, RG-052), l'écran restant monté sous la modale. Le focus est
   * déplacé dans le panneau par l'effet dédié du constructeur, à la transition d'affichage.
   *
   * `queryParamsHandling: 'merge'` (plan_16, groupe 1.1) : le paramètre de pré-filtrage `groupeId` d'un lien
   * contextuel (« Fiche projet → voir l'obsolescence du groupe ») survit à l'ouverture de la modale, de sorte
   * qu'un rafraîchissement (F5) sur `/obsolescence?groupeId=<id>&projet=<id>` restaure le même contexte.
   * @param projetId - Identifiant du projet.
   */
  public ouvrirDetail(projetId: string): void {
    this.elementFocusAvantModale =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    void this.router.navigate(['/obsolescence'], {
      queryParams: { projet: projetId },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Ferme la modale de détail (bouton ou touche Échap) : recule dans l'historique de navigation si possible, sinon
   * navigue vers `/obsolescence` sans paramètre (US-052, RG-052). Le focus est rendu à l'élément déclencheur par
   * l'effet dédié du constructeur.
   *
   * Reculer suppose que l'étape d'historique précédente est l'écran sans paramètre `projet` — toujours vrai dans le
   * périmètre actuel : la modale ne s'ouvre que via {@link ouvrirDetail} depuis l'écran lui-même, et le seul lien
   * contextuel pré-filtrant atterrissant sur cet écran (plan_16, groupe 1.1) porte `groupeId`, jamais `projet`.
   * La branche de repli retire le seul paramètre `projet` (`queryParamsHandling: 'merge'`), conservant un éventuel
   * `groupeId` de pré-filtrage dans l'URL.
   */
  public fermerDetail(): void {
    if (this.projetSelectionne() === null) {
      return;
    }
    if (this.historique.peutReculer()) {
      this.historique.reculer();
      return;
    }
    void this.router.navigate(['/obsolescence'], {
      queryParams: { projet: null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Piège le focus à l'intérieur du panneau de la modale (Tab / Maj+Tab en boucle, RNF-019).
   * @param evenement - Évènement `keydown` lié à la touche `Tab` (`$event` du gabarit, typé `Event` par Angular).
   */
  public piegerFocus(evenement: Event): void {
    const panneau = this.panneauModale()?.nativeElement;
    if (!(evenement instanceof KeyboardEvent) || panneau === undefined) {
      return;
    }
    const focusables = Array.from(
      panneau.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusables.length === 0) {
      return;
    }
    const premier = focusables[0];
    const dernier = focusables[focusables.length - 1];
    const actif = document.activeElement;
    if (evenement.shiftKey && (actif === premier || actif === panneau)) {
      evenement.preventDefault();
      dernier.focus();
    } else if (!evenement.shiftKey && actif === dernier) {
      evenement.preventDefault();
      premier.focus();
    }
  }

  /**
   * Exporte la grille courante en image PNG et déclenche son téléchargement (US-047, RG-047).
   */
  public async exporterPng(): Promise<void> {
    const conteneur = this.conteneurExport()?.nativeElement;
    if (conteneur === undefined) {
      return;
    }
    const dataUrl = await toPng(conteneur);
    const nomFichier = `obsolescence-${ExportImageUtils.construireHorodatage(new Date())}.png`;
    const lien = document.createElement('a');
    lien.href = dataUrl;
    lien.download = nomFichier;
    lien.click();
    this.notification.succes(
      `L'image ${nomFichier} a été téléchargée dans le dossier de téléchargements de votre navigateur/système.`,
    );
  }
}
