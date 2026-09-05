// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Comparaison entre deux audits (US-018, Phase 6 incrément 6, cf.
// `docs/02_documentation/09_maquettes.md#comparaison-entre-deux-audits` : sélection de deux dates avec raccourcis,
// différentiel en quatre volets, rappel des annotations de l'intervalle). Aucune maquette haute-fidélité n'existe
// pour cet écran (seule une description textuelle), contrairement à la Fiche projet (incrément 5) : la conception
// de détail ci-dessous (choix des indicateurs du volet 1, présentation des trois autres volets, interaction exacte
// des raccourcis) est donc une décision arbitraire de cet incrément, à valider par un humain, cf. rapport de
// développement.
//
// Route `comparaison-audits/:projetId` (`app.routes.ts`), paramètre lié directement à l'`input()` {@link projetId}
// via `withComponentInputBinding()` (`app.config.ts`), sur le modèle exact de `SqmFicheProjetComponent`, dont le
// lien d'action pointe déjà vers cette route (câblée par anticipation à l'incrément 5).
//
// Le calcul du différentiel proprement dit (RG-011 : recalculé à l'affichage à partir des seuils/référentiels
// COURANTS) est intégralement délégué à `DifferentielAuditsUtils` (Moteur de jugement, `services/sansetat/
// jugement/differentiel-audits.utils.ts`) : ce composant ne fait que résoudre la sélection des deux audits comparés
// (raccourcis compris) et mettre en forme le différentiel déjà calculé (libellés, couleurs), sur le modèle déjà
// établi par `SqmFicheProjetComponent` pour la coloration des indicateurs Sonar et du statut de rattachement des
// membres.
//
// Évolution C15-14 (audit historique à date passée, US-046, RG-046) : `construireOptions` suffixe le libellé d'un
// audit historique (« (historique) ») dans le sélecteur, sans autre changement — le mécanisme de sélection/
// différentiel existant (`DifferentielAuditsUtils`) reste inchangé, un audit historique restant comparable à un
// audit régulier au même titre.
//
// Évolution plan_18 incrément 7 (US-059, RG-059) : repère « prise en charge » sur l'audit dont la date correspond
// exactement à `Projet.premierCommitInterne.date` (`determine` uniquement), suffixe cumulable avec « (historique) »
// dans les sélecteurs ; raccourci `priseEnCharge` (borne gauche = cet audit, borne droite = le dernier audit
// régulier), désactivé avec une invite (lien vers la constitution de campagne) si aucun audit ne correspond
// exactement ; avertissement discret quand la borne gauche est un audit historique **sélectionné via ce raccourci**
// (texte normatif de RG-059, cf. `viaRaccourciPriseEnCharge` : une coïncidence de date obtenue par sélection
// manuelle ne déclenche jamais l'avertissement) — périmètre d'indicateurs structurellement réduit dans ce cas
// (RG-059 M8), attendu et non une régression. Le calcul du différentiel proprement dit (`DifferentielAuditsUtils`)
// n'est pas modifié : un audit « prise en charge » est un audit du projet comme un autre, simplement mis en
// évidence.
import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { InputSignal, Signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toPng } from 'html-to-image';
import { SqmBadgeComponent } from '../../composants/badge/badge.component';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import { StatutMembre } from '../../services/avecetat/etat/types-donnees';
import type {
  Annotation,
  Audit,
  Groupe,
  Projet,
  TypeAudit,
} from '../../services/avecetat/etat/types-donnees';
import type { Marqueur } from '../../services/sansetat/commandes/types-facade';
import type {
  DependanceDifferentielle,
  DifferentielAudits,
  DifferentielIndicateurs,
  MembreDifferentiel,
} from '../../services/sansetat/jugement/differentiel-audits.utils';
import { DifferentielAuditsUtils } from '../../services/sansetat/jugement/differentiel-audits.utils';
import { EcosystemeDependanceUtils } from '../../services/sansetat/jugement/ecosysteme-dependance.utils';
import type { EcosystemeDependance } from '../../services/sansetat/jugement/ecosysteme-dependance.utils';
import { ExportImageUtils } from '../../services/sansetat/jugement/export-image.utils';
import { NoteSonarUtils } from '../../services/sansetat/jugement/note-sonar.utils';
import {
  ParametresJugementUtils,
  type LectureDefensive,
  type SeuilsCouleursViolations,
  type SeuilsCouverture,
} from '../../services/sansetat/jugement/parametres-jugement.utils';
import {
  SeuilsCouleurUtils,
  type Couleur,
} from '../../services/sansetat/jugement/seuils-couleur.utils';
import type { ResolutionStatutMembre } from '../../services/sansetat/jugement/statut-membre.utils';
import type { ResultatObsolescence } from '../../services/sansetat/jugement/statut-obsolescence.utils';
import type { StatutIA } from '../../services/sansetat/jugement/statut-ia.utils';

const UN_MEGAOCTET = 1_000_000;

/**
 * Étiquette d'un jugement calculé (libellé + couleur sémantique, absente si non calculable), sur le modèle de
 * `SqmFicheProjetComponent.EtiquetteCouleur` (redéclarée localement, comme systématiquement fait par chaque écran
 * de restitution de ce projet).
 */
interface EtiquetteCouleur {
  /** Libellé affiché. */
  readonly label: string;
  /** Couleur sémantique, absente si non calculable. */
  readonly couleur?: Couleur;
}

/** Un audit du projet, restitué comme option de sélection (sélecteurs de date, raccourcis). */
interface OptionAudit {
  /** Identifiant de l'audit. */
  readonly id: string;
  /** Date ISO 8601 de l'audit. */
  readonly date: string;
  /** Libellé court affiché dans le sélecteur. */
  readonly label: string;
  /**
   * Catégorie de l'audit (C15-14, RG-046), nécessaire à la résolution du raccourci « prise en charge » (RG-059,
   * plan_18 incrément 7 : « le dernier audit régulier »).
   */
  readonly typeAudit: TypeAudit;
  /**
   * `true` si la date de cet audit correspond exactement à `Projet.premierCommitInterne.date` (US-059, RG-058,
   * RG-059, plan_18 incrément 7).
   */
  readonly priseEnCharge: boolean;
}

/** Ligne affichée du premier volet (indicateurs avant/après/delta). */
interface LigneIndicateurAffiche {
  /** Libellé de l'indicateur. */
  readonly libelle: string;
  /** Étiquette côté audit le plus ancien, absente si non calculable. */
  readonly avant: EtiquetteCouleur | undefined;
  /** Étiquette côté audit le plus récent, absente si non calculable. */
  readonly apres: EtiquetteCouleur | undefined;
  /** Libellé du delta, `—` si non calculable. */
  readonly deltaLabel: string;
}

/** Ligne affichée du deuxième volet (dépendances). */
interface LigneDependanceAffiche {
  /** Référence de la dépendance. */
  readonly reference: string;
  /** Chemin du manifeste d'où provient cette dépendance. */
  readonly manifeste: string;
  /** Libellé de la version côté audit le plus ancien, `—` si absente (ajout). */
  readonly versionAvantLabel: string;
  /** Libellé de la version côté audit le plus récent, `—` si absente (retrait). */
  readonly versionApresLabel: string;
  /** Étiquette du statut d'obsolescence côté audit le plus ancien. */
  readonly statutAvant: EtiquetteCouleur;
  /** Étiquette du statut d'obsolescence côté audit le plus récent. */
  readonly statutApres: EtiquetteCouleur;
}

/**
 * Décompte des lignes d'une section d'écosystème du volet Dépendances par type d'évolution (US-056), affiché dans
 * la barre de titre de la section repliable. Sur un différentiel, un décompte « par statut » n'aurait pas de sens
 * direct : le décompte porte donc sur `Ajout` / `Retrait` / `Changement de statut` (décision arbitraire, cf.
 * rapport de développement). Les types sans aucune occurrence ne produisent aucune entrée.
 */
interface DecompteEvolutionDependances {
  /** Libellé du type d'évolution (`Ajout`, `Retrait`, `Changement de statut`). */
  readonly label: string;
  /** Couleur sémantique du type d'évolution. */
  readonly couleur: Couleur;
  /** Nombre de lignes de la section relevant de ce type d'évolution (toujours strictement positif). */
  readonly nombre: number;
}

/**
 * Section repliable d'un écosystème (Maven, NPM, Autres) du volet Dépendances de la Comparaison d'audits (US-056) :
 * reprend le modèle des sections repliables de la Fiche projet, adapté à un différentiel. Seules les sections
 * comportant au moins une ligne sont produites.
 */
interface SectionDependancesDiff {
  /** Écosystème d'appartenance de la section. */
  readonly ecosysteme: EcosystemeDependance;
  /** Libellé affiché de la section (« Maven », « NPM », « Autres »). */
  readonly titre: string;
  /** Dépendances ajoutées de la section (présentes uniquement dans l'audit le plus récent). */
  readonly ajouts: readonly LigneDependanceAffiche[];
  /** Dépendances retirées de la section (présentes uniquement dans l'audit le plus ancien). */
  readonly retraits: readonly LigneDependanceAffiche[];
  /** Dépendances de la section dont seul le statut d'obsolescence a changé entre les deux audits. */
  readonly modifications: readonly LigneDependanceAffiche[];
  /** Nombre total de lignes de la section (`ajouts` + `retraits` + `modifications`). */
  readonly total: number;
  /** Décompte par type d'évolution affiché dans la barre de titre (types à zéro omis). */
  readonly decompteParEvolution: readonly DecompteEvolutionDependances[];
}

/** Ligne affichée du troisième volet (membres et contributeurs). */
interface LigneMembreAffiche {
  /** Identifiant de connexion du membre. */
  readonly username: string;
  /** Libellé du nom côté audit le plus ancien, `—` si absent (ajout). */
  readonly nomAvantLabel: string;
  /** Libellé du nom côté audit le plus récent, `—` si absent (retrait). */
  readonly nomApresLabel: string;
  /** Étiquette du statut de rattachement côté audit le plus ancien, absente si le membre est un ajout. */
  readonly statutAvant: EtiquetteCouleur | undefined;
  /** Étiquette du statut de rattachement côté audit le plus récent, absente si le membre est un retrait. */
  readonly statutApres: EtiquetteCouleur | undefined;
}

/** Quatrième volet affiché (marqueurs IA détectés), avec le statut IA global recalculé aux deux bords (RG-016). */
interface DonneesMarqueursIaAffichees {
  /** Marqueurs détectés uniquement par l'audit le plus récent. */
  readonly ajouts: readonly Marqueur[];
  /** Marqueurs détectés uniquement par l'audit le plus ancien. */
  readonly retraits: readonly Marqueur[];
  /** Étiquette du statut IA global côté audit le plus ancien. */
  readonly statutIaAvant: EtiquetteCouleur;
  /** Étiquette du statut IA global côté audit le plus récent. */
  readonly statutIaApres: EtiquetteCouleur;
}

/** Données complètes de l'écran une fois deux audits comparables sélectionnés. */
interface DonneesComparaisonAudits {
  /** Identifiant du groupe de rattachement. */
  readonly groupeId: string;
  /** Nom du groupe de rattachement (fil d'ariane). */
  readonly nomGroupe: string;
  /** Nom du projet (fil d'ariane). */
  readonly nomProjet: string;
  /** Options de sélection (tous les audits du projet), triées de la plus ancienne à la plus récente. */
  readonly options: readonly OptionAudit[];
  /** Identifiant de l'audit le plus ancien actuellement comparé. */
  readonly idAvant: string;
  /** Identifiant de l'audit le plus récent actuellement comparé. */
  readonly idApres: string;
  /** Libellé de la date de l'audit le plus ancien actuellement comparé. */
  readonly dateAvantLabel: string;
  /** Libellé de la date de l'audit le plus récent actuellement comparé. */
  readonly dateApresLabel: string;
  /**
   * Message explicite à afficher à l'utilisateur lorsque la sélection courante des deux dates désignait le même
   * audit et a dû être automatiquement ajustée sur l'audit adjacent (R10-15 : ce repli restait jusqu'ici
   * silencieux), absent sinon.
   */
  readonly messageSelectionRepliee?: string;
  /**
   * Rattachement à la date de prise en charge du projet (US-059, RG-058, RG-059), absent si jamais calculée ou
   * calcul non `determine` (rien à proposer).
   */
  readonly priseEnCharge?: InfoPriseEnCharge;
  /**
   * `true` si la sélection courante provient du raccourci « Depuis la prise en charge » **et** que l'audit le plus
   * ancien comparé est historique (RG-059, M8, texte normatif : « … sélectionné via ce raccourci ») : pilote
   * l'avertissement de périmètre d'indicateurs réduit côté « prise en charge » (`gitlab.membres`,
   * `gitlab.taille_depot`, `croise.ia_nouveau_code`, métriques « nouveau code »), attendu et non une régression.
   * Une coïncidence de date obtenue par sélection manuelle des mêmes deux audits ne déclenche jamais cet
   * avertissement.
   */
  readonly avertissementPriseEnChargeHistorique: boolean;
  /** Premier volet : indicateurs avant/après/delta. */
  readonly indicateurs: readonly LigneIndicateurAffiche[];
  /**
   * Deuxième volet : dépendances. `ajouts`/`retraits`/`modifications` restent exposés pour le garde global du
   * volet ; `sections` porte la ventilation par écosystème effectivement rendue (US-056).
   */
  readonly dependances: {
    readonly ajouts: readonly LigneDependanceAffiche[];
    readonly retraits: readonly LigneDependanceAffiche[];
    readonly modifications: readonly LigneDependanceAffiche[];
    readonly sections: readonly SectionDependancesDiff[];
  };
  /** Troisième volet : membres et contributeurs. */
  readonly membres: {
    readonly ajouts: readonly LigneMembreAffiche[];
    readonly retraits: readonly LigneMembreAffiche[];
    readonly modifications: readonly LigneMembreAffiche[];
  };
  /** Quatrième volet : marqueurs IA détectés. */
  readonly marqueursIa: DonneesMarqueursIaAffichees;
  /** Annotations du projet dont la date tombe dans l'intervalle entre les deux audits comparés (bornes incluses). */
  readonly annotationsIntervalle: readonly Annotation[];
}

/**
 * État global de l'écran, distinguant l'absence de fichier chargé, un projet introuvable, un projet ne comptant pas
 * assez d'audits pour qu'une comparaison ait un sens (état particulier impératif : jamais un écran vide silencieux)
 * et le cas nominal.
 */
type EtatComparaisonAudits =
  | { readonly type: 'aucunFichier' }
  | { readonly type: 'projetIntrouvable' }
  | { readonly type: 'auditInsuffisant'; readonly nomGroupe: string; readonly nomProjet: string }
  | { readonly type: 'pret'; readonly donnees: DonneesComparaisonAudits };

/** Raccourci de sélection des deux dates comparées (cf. `docs/02_documentation/09_maquettes.md`). */
export type RaccourciComparaisonAudits =
  'dernierPrecedent' | 'unMois' | 'troisMois' | 'priseEnCharge';

/**
 * Rattachement de l'écran à la date de prise en charge du projet (US-059, RG-058, RG-059, plan_18 incrément 7),
 * dérivé de `Projet.premierCommitInterne` uniquement quand son statut est `determine` (absent sinon : rien à
 * proposer). `auditId` est absent si aucun audit du projet ne porte, exactement, cette date (décision 4 du plan :
 * comparaison stricte de chaînes, jamais une tolérance de quelques jours) — cas attendu, un audit régulier portant
 * un horodatage complet ne coïncide jamais avec la date calendaire `AAAA-MM-JJ` de la prise en charge (RG-058,
 * décision 16) ; seul un audit historique ciblant exactement cette date peut y correspondre.
 */
interface InfoPriseEnCharge {
  /** Date calendaire UTC de la prise en charge (`AAAA-MM-JJ`). */
  readonly date: string;
  /** Identifiant de l'audit dont la date correspond exactement, absent si aucun audit ne porte cette date. */
  readonly auditId?: string;
  /**
   * `true` si le raccourci « Depuis la prise en charge » peut effectivement être appliqué : un audit correspond
   * exactement à la date de prise en charge **et** le projet compte au moins un audit régulier (borne droite du
   * raccourci, cf. {@link resoudreRaccourciPriseEnCharge}). Corrigé en relecture : sans ce second critère, un
   * projet dont l'unique audit de prise en charge est historique mais qui ne compte plus aucun audit régulier
   * laissait le bouton actif pour un clic sans aucun effet (`resoudreRaccourciPriseEnCharge` renvoyant `undefined`
   * silencieusement).
   */
  readonly raccourciDisponible: boolean;
}

/**
 * Écran Comparaison entre deux audits (US-018) : sélection de deux dates parmi les audits réellement enregistrés
 * pour le projet, avec raccourcis, différentiel en quatre volets recalculé à l'affichage (RG-011), rappel des
 * annotations de l'intervalle.
 */
@Component({
  selector: 'app-comparaison-audits',
  imports: [RouterLink, SqmBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './comparaison-audits.component.html',
  styleUrl: './comparaison-audits.component.scss',
})
export class SqmComparaisonAuditsComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

  /**
   * Identifiant du projet affiché, lié au segment de route `comparaison-audits/:projetId`
   * (`withComponentInputBinding()`, `app.config.ts`).
   */
  public readonly projetId: InputSignal<string> = input.required<string>();

  /**
   * Référence du conteneur exporté en image (US-032, F25), sur le même gabarit que
   * `SqmSyntheseAuditsComponent`/`SqmSyntheseGraphiqueComponent`/`SqmFicheProjetComponent` (Phase 6) : dernier écran
   * des quatre visés par F25 à porter cette fonctionnalité (Phase 9, incrément 3), au moyen de `html-to-image`
   * (rendu DOM, cf. `docs/01_besoin/Specification.md#525-f25--exports-png`).
   */
  private readonly conteneurExport = viewChild<ElementRef<HTMLElement>>('conteneurExport');

  /**
   * Identifiant de l'audit le plus ancien explicitement sélectionné par l'utilisateur (sélecteur ou raccourci),
   * `null` tant qu'aucune sélection explicite n'a été faite (repli automatique sur l'audit le plus ancien, cf.
   * {@link calculerEtat}).
   */
  private readonly idAvantSelectionne: WritableSignal<string | null> = signal(null);

  /**
   * Identifiant de l'audit le plus récent explicitement sélectionné par l'utilisateur, `null` tant qu'aucune
   * sélection explicite n'a été faite (repli automatique sur le dernier audit).
   */
  private readonly idApresSelectionne: WritableSignal<string | null> = signal(null);

  /**
   * Identifiant du projet pour lequel la sélection courante provient précisément du raccourci « Depuis la prise
   * en charge » (US-059, RG-059, plan_18 incrément 7), `null` sinon. Comparé au projet courant dans
   * {@link calculerEtat} (`viaRaccourciPriseEnCharge = this.origineRaccourciPriseEnCharge() === this.projetId()`)
   * plutôt qu'un simple booléen : pilote seul l'avertissement « audit historique partiel »
   * (`avertissementPriseEnChargeHistorique`), conformément au texte normatif de RG-059 (« … quand la borne gauche
   * est un audit historique **sélectionné via ce raccourci** »).
   *
   * Corrigé en relecture : un simple booléen remis à `false` par {@link definirIdAvant}/{@link definirIdApres}
   * mais jamais par un changement de {@link projetId} restait vrai après une navigation vers un autre projet
   * réutilisant la même instance de composant (route `comparaison-audits/:projetId`), déclenchant à tort
   * l'avertissement sur ce nouveau projet si sa sélection par défaut retombait sur un audit historique — à la
   * différence de {@link idAvantSelectionne}/{@link idApresSelectionne}, qui s'auto-corrigent via le repli de
   * {@link resoudreId} quand l'id sélectionné n'appartient plus aux options du nouveau projet. Comparer l'identifiant
   * de projet plutôt qu'un booléen rend cette origine caduque de la même façon, structurellement, sans
   * réinitialisation explicite à ajouter à chaque nouveau point d'entrée de sélection.
   */
  private readonly origineRaccourciPriseEnCharge: WritableSignal<string | null> = signal(null);

  /**
   * État complet de l'écran, recalculé à chaque changement de {@link projetId}, de la racine courante ou de la
   * sélection courante des deux audits comparés.
   */
  public readonly etat: Signal<EtatComparaisonAudits> = computed(() => this.calculerEtat());

  /**
   * Met à jour l'audit le plus ancien explicitement sélectionné.
   * @param id - Identifiant de l'audit sélectionné.
   */
  public definirIdAvant(id: string): void {
    this.idAvantSelectionne.set(id);
    this.origineRaccourciPriseEnCharge.set(null);
  }

  /**
   * Met à jour l'audit le plus récent explicitement sélectionné.
   * @param id - Identifiant de l'audit sélectionné.
   */
  public definirIdApres(id: string): void {
    this.idApresSelectionne.set(id);
    this.origineRaccourciPriseEnCharge.set(null);
  }

  /**
   * Applique un raccourci de sélection des deux dates comparées (`docs/02_documentation/09_maquettes.md#comparaison-
   * entre-deux-audits`). Sans effet si le projet courant ne compte pas au moins deux audits.
   * @param raccourci - Raccourci à appliquer.
   */
  public appliquerRaccourci(raccourci: RaccourciComparaisonAudits): void {
    const options = this.trouverOptionsCourantes();
    if (options === undefined || options.length < 2) {
      return;
    }
    const resolution = this.resoudreRaccourci(raccourci, options);
    if (resolution === undefined) {
      // Raccourci « prise en charge » sans audit correspondant ou sans audit régulier disponible (RG-059) : le
      // bouton est déjà désactivé dans ce cas côté gabarit (`donnees.priseEnCharge?.auditId`), ce garde ne fait que
      // sécuriser un appel direct (test, régression de gabarit) sans effet de bord sur la sélection courante.
      return;
    }
    this.idAvantSelectionne.set(resolution.idAvant);
    this.idApresSelectionne.set(resolution.idApres);
    this.origineRaccourciPriseEnCharge.set(raccourci === 'priseEnCharge' ? this.projetId() : null);
  }

  /**
   * Exporte l'intégralité de l'écran (fil d'ariane, sélection, quatre volets du différentiel) en image PNG
   * (US-032, F25), sur le même gabarit que `SqmSyntheseGraphiqueComponent.exporterPng` : rendu DOM via
   * `html-to-image`, aucune capture ECharts native n'étant nécessaire ici (aucun graphique sur cet écran).
   */
  public async exporterPng(): Promise<void> {
    const conteneur = this.conteneurExport()?.nativeElement;
    const etatCourant = this.etat();
    if (conteneur === undefined || etatCourant.type !== 'pret') {
      return;
    }
    // US-056 : les sections de dépendances par écosystème sont repliées par défaut mais doivent apparaître
    // dépliées dans l'export PNG (décision fonctionnelle validée par un humain, cf. le même choix sur
    // `SqmFicheProjetComponent.exporterPng` pour les sections de membres). Dépliage impératif le temps de la
    // capture, état de repli restauré ensuite.
    const sectionsDependances = [
      ...conteneur.querySelectorAll<HTMLDetailsElement>('.comparaison-audits__section-dependances'),
    ];
    const replisInitiaux = sectionsDependances.map((section) => section.open);
    sectionsDependances.forEach((section) => (section.open = true));
    try {
      const dataUrl = await toPng(conteneur);
      this.declencherTelechargementPng(dataUrl, etatCourant.donnees.nomProjet);
    } finally {
      sectionsDependances.forEach(
        (section, index) => (section.open = replisInitiaux[index] ?? false),
      );
    }
  }

  /**
   * Déclenche le téléchargement d'une image PNG encodée en URL de données, puis confirme l'export à l'utilisateur
   * (RG-047, C15-15), sur le même principe que `SqmFicheProjetComponent.declencherTelechargementPng`.
   * @param dataUrl - URL de données PNG produite par `toPng`.
   * @param nomProjet - Nom du projet comparé (`DonneesComparaisonAudits.nomProjet`), inséré normalisé dans le nom
   * de fichier suggéré (RG-047 : sans nom de groupe, décision arbitraire).
   */
  private declencherTelechargementPng(dataUrl: string, nomProjet: string): void {
    const nomFichier = `comparaison-audits-${ExportImageUtils.normaliserNomProjet(nomProjet)}-${ExportImageUtils.construireHorodatage(new Date())}.png`;
    const lien = document.createElement('a');
    lien.href = dataUrl;
    lien.download = nomFichier;
    lien.click();
    this.notification.succes(
      `L'image ${nomFichier} a été téléchargée dans le dossier de téléchargements de votre navigateur/système.`,
    );
  }

  /**
   * Résout la sélection des deux audits comparés pour un raccourci donné. Décision arbitraire (à valider par un
   * humain, faute de maquette haute-fidélité pour cet écran, cf. rapport de développement de cet incrément) :
   * l'audit le plus récent est toujours celui du raccourci « après » ; pour les raccourcis « un mois »/« trois
   * mois », l'audit « avant » est celui dont la date est la plus proche de l'échéance demandée (date de l'audit le
   * plus récent moins un/trois mois) parmi les audits disponibles autres que l'audit le plus récent lui-même,
   * conformément à la consigne de cet incrément (« le raccourci sélectionne l'audit le plus proche de l'échéance
   * demandée parmi ceux disponibles »).
   * @param raccourci - Raccourci à résoudre.
   * @param options - Options de sélection disponibles pour le projet courant, triées de la plus ancienne à la plus
   * récente, au moins deux éléments.
   * @returns Les identifiants des deux audits résolus, `undefined` si le raccourci « prise en charge » n'a pas
   * d'audit correspondant ou aucun audit régulier disponible (RG-059) — n'arrive jamais pour les autres raccourcis.
   */
  private resoudreRaccourci(
    raccourci: RaccourciComparaisonAudits,
    options: readonly OptionAudit[],
  ): { readonly idAvant: string; readonly idApres: string } | undefined {
    const dernier = options[options.length - 1];
    if (raccourci === 'dernierPrecedent') {
      return { idAvant: options[options.length - 2].id, idApres: dernier.id };
    }
    if (raccourci === 'priseEnCharge') {
      return this.resoudreRaccourciPriseEnCharge(options);
    }
    const nombreMois = raccourci === 'unMois' ? 1 : 3;
    const echeance = new Date(dernier.date);
    echeance.setMonth(echeance.getMonth() - nombreMois);
    const echeanceMs = echeance.getTime();
    const candidats = options.slice(0, options.length - 1);
    const plusProche = candidats.reduce((meilleur, candidat) => {
      const ecartCandidat = Math.abs(new Date(candidat.date).getTime() - echeanceMs);
      const ecartMeilleur = Math.abs(new Date(meilleur.date).getTime() - echeanceMs);
      return ecartCandidat < ecartMeilleur ? candidat : meilleur;
    });
    return { idAvant: plusProche.id, idApres: dernier.id };
  }

  /**
   * Résout le raccourci « Depuis la prise en charge » (US-059, RG-059, plan_18 incrément 7, décision 4 du plan) :
   * borne gauche = l'audit dont la date correspond exactement à la prise en charge (`OptionAudit.priseEnCharge`) ;
   * borne droite = le dernier audit **régulier** (jamais un audit historique, même postérieur en date : un audit
   * historique n'a par nature aucun sens comme référence « courante », cf. C15-14).
   * @param options - Options de sélection disponibles pour le projet courant.
   * @returns Les identifiants résolus, `undefined` si aucun audit ne correspond exactement à la prise en charge ou
   * si le projet ne compte aucun audit régulier.
   */
  private resoudreRaccourciPriseEnCharge(
    options: readonly OptionAudit[],
  ): { readonly idAvant: string; readonly idApres: string } | undefined {
    const auditPriseEnCharge = options.find((option) => option.priseEnCharge);
    const dernierRegulier = [...options]
      .reverse()
      .find((option) => option.typeAudit === 'reguliere');
    if (auditPriseEnCharge === undefined || dernierRegulier === undefined) {
      return undefined;
    }
    return { idAvant: auditPriseEnCharge.id, idApres: dernierRegulier.id };
  }

  /**
   * Retrouve le groupe et le projet correspondant à l'identifiant demandé (sur le modèle de
   * `SqmFicheProjetComponent.trouverGroupeEtProjet`).
   * @param groupes - Groupes actuellement chargés.
   * @param projetId - Identifiant du projet recherché.
   * @returns Le groupe et le projet trouvés, `undefined` si aucun projet ne porte cet identifiant.
   */
  private trouverGroupeEtProjet(
    groupes: readonly Groupe[],
    projetId: string,
  ): { readonly groupe: Groupe; readonly projet: Projet } | undefined {
    for (const groupe of groupes) {
      const projet = groupe.projets.find((candidat) => candidat.id === projetId);
      if (projet !== undefined) {
        return { groupe, projet };
      }
    }
    return undefined;
  }

  /**
   * Construit les options de sélection (tous les audits du projet), triées de la plus ancienne à la plus récente.
   * Un audit historique à date passée (C15-14, US-046, RG-046, `typeAudit: 'historique'`) reste sélectionnable au
   * même titre qu'un audit régulier (le mécanisme de différentiel existant, `DifferentielAuditsUtils`, reste
   * inchangé), mais porte un libellé suffixé explicite (« (historique) ») pour ne jamais laisser croire qu'il
   * s'agit d'un audit régulier à la date affichée. Un audit dont la date correspond exactement à la date de prise
   * en charge du projet (US-059, RG-059, plan_18 incrément 7) porte de même un suffixe « (prise en charge) »,
   * cumulable avec « (historique) » (décision 4 du plan).
   * @param projet - Projet concerné.
   * @returns Les options de sélection.
   */
  private construireOptions(projet: Projet): readonly OptionAudit[] {
    const datePriseEnCharge =
      projet.premierCommitInterne?.statut === 'determine'
        ? projet.premierCommitInterne.date
        : undefined;
    return [...projet.audits]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((audit) => {
        const estPriseEnCharge =
          datePriseEnCharge !== undefined && audit.date === datePriseEnCharge;
        const suffixes = [
          audit.typeAudit === 'historique' ? 'historique' : undefined,
          estPriseEnCharge ? 'prise en charge' : undefined,
        ].filter((suffixe): suffixe is string => suffixe !== undefined);
        return {
          id: audit.id,
          date: audit.date,
          label:
            suffixes.length > 0
              ? `${this.formaterDateCourte(audit.date)} (${suffixes.join(', ')})`
              : this.formaterDateCourte(audit.date),
          typeAudit: audit.typeAudit,
          priseEnCharge: estPriseEnCharge,
        };
      });
  }

  /**
   * Construit le rattachement de l'écran à la date de prise en charge du projet (US-059, RG-058, RG-059, plan_18
   * incrément 7), à partir de `Projet.premierCommitInterne` et des options déjà construites (`construireOptions`,
   * seule source de vérité pour la correspondance exacte de date, décision 15 du plan_18 : aucune comparaison de
   * date recalculée ici).
   * @param projet - Projet concerné.
   * @param options - Options de sélection déjà construites (`construireOptions`).
   * @returns Le rattachement, `undefined` si `premierCommitInterne` est absent ou non `determine`.
   */
  private construireInfoPriseEnCharge(
    projet: Projet,
    options: readonly OptionAudit[],
  ): InfoPriseEnCharge | undefined {
    if (projet.premierCommitInterne?.statut !== 'determine') {
      return undefined;
    }
    const auditId = options.find((option) => option.priseEnCharge)?.id;
    return {
      date: projet.premierCommitInterne.date,
      auditId,
      raccourciDisponible:
        auditId !== undefined && options.some((option) => option.typeAudit === 'reguliere'),
    };
  }

  /**
   * Retrouve les options de sélection du projet actuellement affiché, indépendamment de l'état complet de l'écran
   * (utilisé par {@link appliquerRaccourci}, qui ne recalcule pas la totalité du différentiel).
   * @returns Les options de sélection, `undefined` si aucun fichier n'est chargé ou si le projet est introuvable.
   */
  private trouverOptionsCourantes(): readonly OptionAudit[] | undefined {
    const racine = this.donneesApplication.racine();
    if (racine === null) {
      return undefined;
    }
    const trouve = this.trouverGroupeEtProjet(racine.groupes, this.projetId());
    if (trouve === undefined) {
      return undefined;
    }
    return this.construireOptions(trouve.projet);
  }

  /**
   * Résout l'identifiant explicitement sélectionné s'il appartient toujours aux options disponibles (le composant
   * pouvant être réutilisé par Angular d'une navigation à l'autre sur la même route avec un `projetId` différent,
   * une sélection issue d'un projet précédent ne doit jamais être appliquée à un autre projet), avec repli sur la
   * valeur par défaut sinon.
   * @param selectionne - Identifiant explicitement sélectionné, `null` si aucune sélection explicite n'a été faite.
   * @param options - Options de sélection disponibles pour le projet courant.
   * @param repli - Identifiant de repli si {@link selectionne} est absent ou n'appartient plus aux options.
   * @returns L'identifiant résolu.
   */
  private resoudreId(
    selectionne: string | null,
    options: readonly OptionAudit[],
    repli: string,
  ): string {
    if (selectionne !== null && options.some((option) => option.id === selectionne)) {
      return selectionne;
    }
    return repli;
  }

  /**
   * Calcule l'état complet de l'écran (cf. {@link EtatComparaisonAudits}).
   * @returns L'état calculé.
   */
  private calculerEtat(): EtatComparaisonAudits {
    const racine = this.donneesApplication.racine();
    if (racine === null) {
      return { type: 'aucunFichier' };
    }
    const trouve = this.trouverGroupeEtProjet(racine.groupes, this.projetId());
    if (trouve === undefined) {
      return { type: 'projetIntrouvable' };
    }
    const { groupe, projet } = trouve;
    const options = this.construireOptions(projet);
    if (options.length < 2) {
      return { type: 'auditInsuffisant', nomGroupe: groupe.nom, nomProjet: projet.nom };
    }

    const idApres = this.resoudreId(
      this.idApresSelectionne(),
      options,
      options[options.length - 1].id,
    );
    let idAvant = this.resoudreId(this.idAvantSelectionne(), options, options[0].id);
    // R10-15 : ce repli restait jusqu'ici silencieux (la sélection de l'utilisateur était modifiée sans avertissement
    // dès lors que les deux dates désignaient le même audit) ; un message explicite est désormais restitué via
    // `messageSelectionRepliee` plutôt que de se limiter au changement silencieux de sélection.
    let messageSelectionRepliee: string | undefined;
    if (idAvant === idApres) {
      const indexApres = options.findIndex((option) => option.id === idApres);
      const indexRepli =
        indexApres > 0 ? indexApres - 1 : Math.min(indexApres + 1, options.length - 1);
      idAvant = options[indexRepli].id;
      messageSelectionRepliee =
        'Les deux dates sélectionnées désignaient le même audit : la sélection a été ' +
        'automatiquement ajustée sur l’audit adjacent.';
    }

    const auditApresChoisi = projet.audits.find((audit) => audit.id === idApres);
    const auditAvantChoisi = projet.audits.find((audit) => audit.id === idAvant);
    if (auditApresChoisi === undefined || auditAvantChoisi === undefined) {
      return { type: 'auditInsuffisant', nomGroupe: groupe.nom, nomProjet: projet.nom };
    }
    // L'audit « avant » restitué au différentiel est toujours le plus ancien chronologiquement des deux, quel que
    // soit l'ordre dans lequel les deux sélecteurs ont été renseignés par l'utilisateur.
    const [auditAvant, auditApres] =
      new Date(auditAvantChoisi.date).getTime() <= new Date(auditApresChoisi.date).getTime()
        ? [auditAvantChoisi, auditApresChoisi]
        : [auditApresChoisi, auditAvantChoisi];

    return {
      type: 'pret',
      donnees: this.construireDonnees(
        groupe,
        projet,
        auditAvant,
        auditApres,
        options,
        racine.parametres.seuils,
        racine.referentiels,
        messageSelectionRepliee,
        this.origineRaccourciPriseEnCharge() === this.projetId(),
      ),
    };
  }

  /**
   * Met en forme une date ISO 8601 en libellé court `AAAA-MM-JJ` (sur le modèle de
   * `SqmFicheProjetComponent.formaterDateCourte`, cohérence visuelle entre écrans).
   * @param dateIso - Date ISO 8601 à mettre en forme.
   * @returns Le libellé court correspondant.
   */
  private formaterDateCourte(dateIso: string): string {
    const date = new Date(dateIso);
    const deuxChiffres = (valeur: number): string => valeur.toString().padStart(2, '0');
    return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
  }

  /**
   * Construit les données complètes de l'écran pour deux audits comparables.
   * @param groupe - Groupe de rattachement du projet.
   * @param projet - Projet concerné.
   * @param auditAvant - Audit le plus ancien des deux comparés.
   * @param auditApres - Audit le plus récent des deux comparés.
   * @param options - Options de sélection (tous les audits du projet).
   * @param seuilsBruts - Valeur brute de `parametres.seuils`.
   * @param referentielsBruts - Valeur brute de `referentiels`.
   * @param messageSelectionRepliee - Message explicite à restituer si la sélection a dû être ajustée
   * automatiquement (R10-15), absent sinon.
   * @param viaRaccourciPriseEnCharge - `true` si la sélection courante provient du raccourci « Depuis la prise en
   * charge » (US-059, RG-059, plan_18 incrément 7), pilote seul `avertissementPriseEnChargeHistorique`.
   * @returns Les données complètes de l'écran.
   */
  private construireDonnees(
    groupe: Groupe,
    projet: Projet,
    auditAvant: Audit,
    auditApres: Audit,
    options: readonly OptionAudit[],
    seuilsBruts: unknown,
    referentielsBruts: unknown,
    messageSelectionRepliee: string | undefined,
    viaRaccourciPriseEnCharge: boolean,
  ): DonneesComparaisonAudits {
    const seuilsCouverture = ParametresJugementUtils.lireSeuilsCouverture(seuilsBruts);
    const seuilsCouleursViolations =
      ParametresJugementUtils.lireSeuilsCouleursViolations(seuilsBruts);
    const lectureReglesDependances =
      ParametresJugementUtils.lireReglesDependances(referentielsBruts);
    const reglesDependances =
      lectureReglesDependances.type === 'valeur' ? lectureReglesDependances.valeur : [];

    const differentiel: DifferentielAudits<StatutMembre> =
      DifferentielAuditsUtils.calculerDifferentiel(
        auditAvant.resultats,
        auditApres.resultats,
        reglesDependances,
        groupe.membresConnus,
        projet.iaAutorisee,
      );

    const dependancesAjouts = differentiel.dependances.ajouts.map((d) =>
      this.construireLigneDependance(d),
    );
    const dependancesRetraits = differentiel.dependances.retraits.map((d) =>
      this.construireLigneDependance(d),
    );
    const dependancesModifications = differentiel.dependances.modifications.map((d) =>
      this.construireLigneDependance(d),
    );
    return {
      groupeId: groupe.id,
      nomGroupe: groupe.nom,
      nomProjet: projet.nom,
      options,
      idAvant: auditAvant.id,
      idApres: auditApres.id,
      dateAvantLabel: this.formaterDateCourte(auditAvant.date),
      dateApresLabel: this.formaterDateCourte(auditApres.date),
      messageSelectionRepliee,
      priseEnCharge: this.construireInfoPriseEnCharge(projet, options),
      // RG-059 : « … quand la borne gauche est un audit historique sélectionné via ce raccourci » — c'est bien
      // `viaRaccourciPriseEnCharge` (l'origine de la sélection courante) qui pilote l'avertissement, jamais une
      // simple coïncidence de date obtenue par sélection manuelle (cf. commentaire de ce signal).
      avertissementPriseEnChargeHistorique:
        viaRaccourciPriseEnCharge && auditAvant.typeAudit === 'historique',
      indicateurs: this.construireLignesIndicateurs(
        differentiel.indicateurs,
        seuilsCouverture,
        seuilsCouleursViolations,
      ),
      dependances: {
        ajouts: dependancesAjouts,
        retraits: dependancesRetraits,
        modifications: dependancesModifications,
        sections: this.construireSectionsDependancesDiff(
          dependancesAjouts,
          dependancesRetraits,
          dependancesModifications,
        ),
      },
      membres: {
        ajouts: differentiel.membres.ajouts.map((m) => this.construireLigneMembre(m)),
        retraits: differentiel.membres.retraits.map((m) => this.construireLigneMembre(m)),
        modifications: differentiel.membres.modifications.map((m) => this.construireLigneMembre(m)),
      },
      marqueursIa: {
        ajouts: differentiel.marqueursIa.ajouts,
        retraits: differentiel.marqueursIa.retraits,
        statutIaAvant: this.libelleEtCouleurStatutIa(differentiel.marqueursIa.statutIaAvant),
        statutIaApres: this.libelleEtCouleurStatutIa(differentiel.marqueursIa.statutIaApres),
      },
      annotationsIntervalle: this.filtrerAnnotationsIntervalle(
        projet.annotations,
        auditAvant.date,
        auditApres.date,
      ),
    };
  }

  /**
   * Construit les huit lignes affichées du premier volet (indicateurs avant/après/delta). Décision arbitraire (à
   * valider par un humain, cf. commentaire d'en-tête de ce fichier) : ensemble d'indicateurs retenu par
   * `DifferentielAuditsUtils`, mis en couleur ici selon les mêmes règles que la Fiche projet (couverture,
   * violations) ou la Synthèse des audits (notes A–E), aucune couleur appliquée à la taille du dépôt (RG-022 :
   * aucun seuil de couleur n'existe pour une taille absolue, seulement pour sa classe S/M/L/XL, non restituée ici
   * faute de pertinence pour un delta).
   * @param indicateurs - Premier volet du différentiel déjà calculé.
   * @param seuilsCouverture - Seuils de couverture courants.
   * @param seuilsCouleursViolations - Seuils de couleur des violations bloquantes/critiques courants.
   * @returns Les lignes affichées du premier volet.
   */
  private construireLignesIndicateurs(
    indicateurs: DifferentielIndicateurs,
    seuilsCouverture: LectureDefensive<SeuilsCouverture>,
    seuilsCouleursViolations: LectureDefensive<SeuilsCouleursViolations>,
  ): readonly LigneIndicateurAffiche[] {
    const formaterCouverture = (valeur: number): EtiquetteCouleur => {
      const label = `${valeur.toFixed(1)} %`;
      if (seuilsCouverture.type === 'absent') {
        return { label };
      }
      return {
        label,
        couleur: SeuilsCouleurUtils.calculerCouleurCouverture(
          valeur,
          seuilsCouverture.valeur.seuilRouge,
          seuilsCouverture.valeur.seuilOrange,
        ),
      };
    };
    const formaterViolation =
      (severite: 'bloquant' | 'critique') =>
      (valeur: number): EtiquetteCouleur => {
        const label = String(valeur);
        if (seuilsCouleursViolations.type === 'absent') {
          return { label };
        }
        const seuilsSeverite = seuilsCouleursViolations.valeur[severite];
        return {
          label,
          couleur: SeuilsCouleurUtils.calculerCouleurViolations(
            valeur,
            seuilsSeverite.seuilOrange,
            seuilsSeverite.seuilRouge,
          ),
        };
      };
    const formaterTaille = (valeur: number): EtiquetteCouleur => ({
      label: `${(valeur / UN_MEGAOCTET).toFixed(1)} Mo`,
    });
    const formaterNote = (valeur: number): EtiquetteCouleur => {
      const note = NoteSonarUtils.calculerNoteLettre(valeur);
      return { label: note.lettre, couleur: note.couleur };
    };
    const formaterDeltaEntier = (delta: number): string =>
      delta > 0 ? `+${delta}` : String(delta);
    const formaterDeltaDecimal = (delta: number): string =>
      delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
    const formaterDeltaTaille = (delta: number): string => {
      const megaOctets = delta / UN_MEGAOCTET;
      return megaOctets > 0 ? `+${megaOctets.toFixed(1)} Mo` : `${megaOctets.toFixed(1)} Mo`;
    };

    return [
      this.construireLigneIndicateur(
        'Couverture de tests',
        indicateurs.couverture,
        formaterCouverture,
        formaterDeltaDecimal,
      ),
      this.construireLigneIndicateur(
        'Violations bloquantes',
        indicateurs.violationsBloquant,
        formaterViolation('bloquant'),
        formaterDeltaEntier,
      ),
      this.construireLigneIndicateur(
        'Violations critiques',
        indicateurs.violationsCritique,
        formaterViolation('critique'),
        formaterDeltaEntier,
      ),
      this.construireLigneIndicateur(
        'Taille du dépôt',
        indicateurs.tailleDepot,
        formaterTaille,
        formaterDeltaTaille,
      ),
      this.construireLigneIndicateur(
        'Note de fiabilité',
        indicateurs.noteFiabilite,
        formaterNote,
        formaterDeltaDecimal,
      ),
      this.construireLigneIndicateur(
        'Note de sécurité',
        indicateurs.noteSecurite,
        formaterNote,
        formaterDeltaDecimal,
      ),
      this.construireLigneIndicateur(
        'Note de maintenabilité',
        indicateurs.noteMaintenabilite,
        formaterNote,
        formaterDeltaDecimal,
      ),
      this.construireLigneIndicateur(
        'Note de revue de sécurité',
        indicateurs.noteRevueSecurite,
        formaterNote,
        formaterDeltaDecimal,
      ),
    ];
  }

  /**
   * Construit une ligne affichée du premier volet.
   * @param libelle - Libellé de l'indicateur.
   * @param valeur - Valeur avant/après/delta déjà calculée.
   * @param formaterValeur - Met en forme une valeur numérique en étiquette colorée.
   * @param formaterDelta - Met en forme un delta numérique en libellé signé.
   * @returns La ligne affichée construite.
   */
  private construireLigneIndicateur(
    libelle: string,
    valeur: DifferentielIndicateurs[keyof DifferentielIndicateurs],
    formaterValeur: (valeur: number) => EtiquetteCouleur,
    formaterDelta: (delta: number) => string,
  ): LigneIndicateurAffiche {
    return {
      libelle,
      avant: valeur.avant === undefined ? undefined : formaterValeur(valeur.avant),
      apres: valeur.apres === undefined ? undefined : formaterValeur(valeur.apres),
      deltaLabel: valeur.delta === undefined ? '—' : formaterDelta(valeur.delta),
    };
  }

  /**
   * Traduit un statut d'obsolescence calculé en étiquette affichable (sur le modèle de
   * `SqmFicheProjetComponent.libelleEtCouleurObsolescence`).
   * @param resultat - Statut d'obsolescence calculé.
   * @returns L'étiquette à afficher.
   */
  private libelleEtCouleurObsolescence(resultat: ResultatObsolescence): EtiquetteCouleur {
    if (resultat.type === 'nonReference') {
      return { label: 'non référencé' };
    }
    switch (resultat.statut) {
      case 'obsolete':
        return { label: 'obsolète', couleur: 'rouge' };
      case 'maintenu':
        return { label: 'maintenu', couleur: 'vert' };
      case 'aJourM1':
        return { label: 'à jour (M1)', couleur: 'vert' };
      case 'aJourM3':
        return { label: 'à jour (M3)', couleur: 'vert' };
      default:
        return { label: resultat.statut };
    }
  }

  /**
   * Construit une ligne affichée du deuxième volet (dépendances).
   * @param dependance - Dépendance différentielle déjà calculée.
   * @returns La ligne affichée construite.
   */
  private construireLigneDependance(dependance: DependanceDifferentielle): LigneDependanceAffiche {
    return {
      reference: dependance.reference,
      manifeste: dependance.manifeste,
      versionAvantLabel: dependance.versionAvant ?? '—',
      versionApresLabel: dependance.versionApres ?? '—',
      statutAvant: this.libelleEtCouleurObsolescence(dependance.statutAvant),
      statutApres: this.libelleEtCouleurObsolescence(dependance.statutApres),
    };
  }

  /**
   * Ventile les trois listes de lignes du différentiel de dépendances (ajouts, retraits, changements de statut) en
   * sections repliables par écosystème (US-056, RG-056), dans l'ordre `EcosystemeDependanceUtils.ORDRE` (Maven,
   * NPM, Autres). Seules les sections comportant au moins une ligne sont produites ; l'ordre des lignes au sein de
   * chaque type d'évolution est conservé.
   * @param ajouts - Dépendances ajoutées.
   * @param retraits - Dépendances retirées.
   * @param modifications - Dépendances dont seul le statut d'obsolescence a changé.
   * @returns Les sections non vides, dans l'ordre d'affichage.
   */
  private construireSectionsDependancesDiff(
    ajouts: readonly LigneDependanceAffiche[],
    retraits: readonly LigneDependanceAffiche[],
    modifications: readonly LigneDependanceAffiche[],
  ): readonly SectionDependancesDiff[] {
    const sections: SectionDependancesDiff[] = [];
    for (const ecosysteme of EcosystemeDependanceUtils.ORDRE) {
      const relever = (
        lignes: readonly LigneDependanceAffiche[],
      ): readonly LigneDependanceAffiche[] =>
        lignes.filter((ligne) => EcosystemeDependanceUtils.classifier(ligne) === ecosysteme);
      const ajoutsSection = relever(ajouts);
      const retraitsSection = relever(retraits);
      const modificationsSection = relever(modifications);
      const total = ajoutsSection.length + retraitsSection.length + modificationsSection.length;
      if (total === 0) {
        continue;
      }
      const evolutions: readonly DecompteEvolutionDependances[] = [
        { label: 'Ajout', couleur: 'bleu', nombre: ajoutsSection.length },
        { label: 'Retrait', couleur: 'rouge', nombre: retraitsSection.length },
        { label: 'Changement de statut', couleur: 'orange', nombre: modificationsSection.length },
      ];
      const decompteParEvolution = evolutions.filter((entree) => entree.nombre > 0);
      sections.push({
        ecosysteme,
        titre: EcosystemeDependanceUtils.titre(ecosysteme),
        ajouts: ajoutsSection,
        retraits: retraitsSection,
        modifications: modificationsSection,
        total,
        decompteParEvolution,
      });
    }
    return sections;
  }

  /**
   * Traduit une résolution de statut de rattachement en étiquette affichable (sur le modèle de
   * `SqmFicheProjetComponent.libelleEtCouleurStatutMembre`), absente si aucune résolution n'est fournie (membre en
   * ajout ou en retrait, un seul bord disponible).
   * @param resolution - Résolution du statut de rattachement calculée, absente si non calculable sur ce bord.
   * @returns L'étiquette à afficher, `undefined` si {@link resolution} est absente.
   */
  private libelleEtCouleurStatutMembre(
    resolution: ResolutionStatutMembre<StatutMembre> | undefined,
  ): EtiquetteCouleur | undefined {
    if (resolution === undefined) {
      return undefined;
    }
    if (resolution.type === 'inconnu') {
      return { label: 'inconnu', couleur: 'rouge' };
    }
    if (resolution.type === 'conflit') {
      return { label: 'conflit de règles', couleur: 'rouge' };
    }
    switch (resolution.statut) {
      case StatutMembre.Interne:
        return { label: 'interne', couleur: 'vert' };
      case StatutMembre.Client:
        return { label: 'client', couleur: 'vert' };
      case StatutMembre.Partenaire:
        return { label: 'partenaire', couleur: 'vert' };
    }
  }

  /**
   * Construit une ligne affichée du troisième volet (membres et contributeurs).
   * @param membre - Membre différentiel déjà calculé.
   * @returns La ligne affichée construite.
   */
  private construireLigneMembre(membre: MembreDifferentiel<StatutMembre>): LigneMembreAffiche {
    return {
      username: membre.username,
      nomAvantLabel: membre.nomAvant ?? '—',
      nomApresLabel: membre.nomApres ?? '—',
      statutAvant: this.libelleEtCouleurStatutMembre(membre.resolutionAvant),
      statutApres: this.libelleEtCouleurStatutMembre(membre.resolutionApres),
    };
  }

  /**
   * Traduit un statut IA global calculé en étiquette affichable (sur le modèle de
   * `SqmFicheProjetComponent.construireEtiquetteStatutIa`, sans le texte de réserve détaillé — restitué à
   * l'identique aux deux bords, non pertinent pour un différentiel).
   * @param statut - Statut IA global calculé.
   * @returns L'étiquette à afficher.
   */
  private libelleEtCouleurStatutIa(statut: StatutIA): EtiquetteCouleur {
    switch (statut.type) {
      case 'autorisee':
        return { label: 'IA autorisée', couleur: 'vert' };
      case 'violation':
        return { label: 'IA interdite · violation', couleur: 'rouge' };
      case 'conformeSousReserve':
        return { label: 'IA interdite · conforme sous réserve', couleur: 'orange' };
    }
  }

  /**
   * Filtre les annotations du projet à celles dont la date tombe dans l'intervalle entre les deux audits comparés,
   * bornes incluses, triées de la plus récente à la plus ancienne.
   * @param annotations - Annotations complètes du projet.
   * @param dateAvant - Date de l'audit le plus ancien des deux comparés.
   * @param dateApres - Date de l'audit le plus récent des deux comparés.
   * @returns Les annotations de l'intervalle.
   */
  private filtrerAnnotationsIntervalle(
    annotations: readonly Annotation[],
    dateAvant: string,
    dateApres: string,
  ): readonly Annotation[] {
    const debutMs = new Date(dateAvant).getTime();
    const finMs = new Date(dateApres).getTime();
    return annotations
      .filter((annotation) => {
        const dateMs = new Date(annotation.date).getTime();
        return dateMs >= debutMs && dateMs <= finMs;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }
}
