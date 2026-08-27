// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Section « Référentiels » de l'onglet Seuils et référentiels de l'écran Paramétrage (US-033, Phase 7,
// incrément 2 ; RG-023, RG-030) : ajout/modification d'une règle de dépendances (`referentiels.reglesDependances`)
// ou d'une règle de marqueur IA (`referentiels.reglesMarqueursIA`), CRUD des catégories de dépendance
// (`referentiels.categoriesDependances`, US-048, RG-048), et remplacement du motif de nommage des branches
// (`referentiels.motifNommageBranches`). Sur le patron CRUD + confirmation de mot de passe de
// `SqmMembresConnusAdminComponent` (Phase 4), avec un unique discriminant d'action en attente pour les
// sous-formulaires plutôt que des indicateurs distincts (une seule action possible à la fois).
//
// Suppression d'une entrée de référentiel (US-033, RG-035, Phase 10 incrément 8) : deux commandes dédiées
// (`supprimerRegleDependance`/`supprimerRegleMarqueurIA`), retenues par arbitrage humain plutôt qu'une commande
// générique paramétrée par type, sur le modèle à deux étapes (confirmation puis mot de passe) déjà utilisé par
// `SqmMembresConnusAdminComponent` pour une action irréversible.
//
// Décisions arbitraires (à valider par un humain, cf. rapport de développement de cet incrément) :
// - L'identifiant d'une nouvelle règle est généré côté interface (`crypto.randomUUID()`, réutilisé tel quel du
//   Store, cf. `DonneesApplicationService`), le cœur natif ne générant jamais lui-même cet identifiant pour
//   `definirReferentiel` (à la différence de `qualifierMembre`, Phase 4).
// - Faute de maquette haute-fidélité précisant la représentation des bornes de version d'une règle de dépendances,
//   celles-ci sont saisies sous forme de lignes de texte `motifVersion=statut` (une par ligne) plutôt qu'un
//   sous-formulaire répétable, pour limiter la complexité de ce premier incrément.
// - Le motif de nommage des branches est validé comme expression régulière syntaxiquement correcte côté client
//   (`new RegExp(...)`) avant tout envoi, en complément de la revalidation déjà effectuée côté cœur natif (RG-030).
//
// Entrées `motifPreselectionne`/`versionPreselectionnee`, relayées depuis `SqmParametrageComponent` (lien « Créer
// une règle » de la Fiche projet, sur une dépendance « non référencée », cf. `fiche-projet.component.ts`) : un
// effet (constructeur) ouvre une fois pour toutes le formulaire de création d'une règle de dépendances pré-rempli
// avec le motif reçu et, si présente, une première borne de version dont seul le motif de version est renseigné (le
// statut restant à la charge de l'utilisateur), sur le même patron que `SqmMembresConnusAdminComponent` (Phase 4).
//
// Recette Phase 15 (arbitrage humain du 2026-08-18, C15-10/C15-11/C15-12, cf. `docs/03_plan/analyse_C15-10.md`,
// `analyse_C15-11.md`, `analyse_C15-12.md`) :
// - RG-042 : l'enregistrement d'une règle de dépendances est bloqué si le motif saisi correspond déjà au motif
//   d'une autre entrée du référentiel (rejet strict, jamais de fusion implicite, symétrique de RG-040 pour la
//   saisie en masse), qu'il s'agisse d'une saisie libre ou d'un pré-remplissage depuis la Fiche projet.
// - RG-043 : un statut de borne de version hors des quatre valeurs bénéficiant d'une couleur dédiée à l'affichage
//   (`obsolete`, `maintenu`, `aJourM1`, `aJourM3`, comparaison sensible à la casse) déclenche un avertissement non
//   bloquant à l'enregistrement, distinct du bloc d'erreur bloquante.
// - RG-044 : une borne de repli `*=obsolete` est injectée automatiquement en dernière position des bornes de
//   version d'une règle de dépendances nouvellement créée (ou complétée à l'édition si aucune borne `*` n'existe
//   déjà, indépendamment de son statut), pour couvrir les versions ne correspondant à aucun motif plus spécifique.
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
  ChangeDetectionStrategy,
  input,
} from '@angular/core';
import type { InputSignal, Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { SqmConfirmationSuppressionComponent } from '../../../composants/confirmation-suppression/confirmation-suppression.component';
import type {
  NatureMarqueur,
  PorteeMarqueur,
  TypeCorrespondanceMarqueur,
} from '../../../services/sansetat/commandes/types-facade';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type {
  EntreeCategorieDependance,
  EntreeReglesDependances,
  EntreeReglesMarqueursIA,
  ErreurAdministration,
  ResultatMutationAdministration,
} from '../../../services/avecetat/etat/types-donnees';
import type { VersionDependance } from '../../../services/sansetat/jugement/parametres-jugement.utils';
import { ObsolescenceRetardUtils } from '../../../services/sansetat/jugement/obsolescence-retard.utils';

/**
 * Action de référentiel actuellement en attente de ressaisie du mot de passe (RG-002), `null` si aucune. Les deux
 * variantes `suppression*` (US-033, RG-035, Phase 10 incrément 8) sont atteintes après confirmation de la
 * suppression elle-même (`SqmConfirmationSuppressionComponent`), sur le modèle à deux étapes déjà utilisé par
 * `SqmMembresConnusAdminComponent` pour une action irréversible.
 */
type ActionReferentielEnAttente =
  | 'dependance'
  | 'marqueurIA'
  | 'categorieDependance'
  | 'motifNommage'
  | 'suppressionDependance'
  | 'suppressionMarqueurIA'
  | 'suppressionCategorieDependance'
  | null;

/**
 * Suppression d'entrée de référentiel en attente de confirmation (avant ressaisie du mot de passe), `null` si
 * aucune (US-033, US-048, RG-035, Phase 10 incrément 8).
 */
interface SuppressionEnAttente {
  readonly type: 'dependance' | 'marqueurIA' | 'categorieDependance';
  readonly id: string;
}

/**
 * Section « Référentiels » : CRUD complet (ajout/modification/suppression, US-033, RG-023, RG-030, RG-035) des
 * règles de dépendances et de marqueurs IA, et remplacement du motif de nommage des branches.
 */
@Component({
  selector: 'app-referentiels-parametrage',
  imports: [FormsModule, SqmConfirmationMotDePasseComponent, SqmConfirmationSuppressionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './referentiels-parametrage.component.html',
})
export class SqmReferentielsParametrageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);
  private readonly injector: Injector = inject(Injector);

  /**
   * Premier champ du formulaire de règle de dépendances, résolu une fois ce champ effectivement rendu dans le DOM
   * (cf. {@link ouvrirCreationDependance}, {@link ouvrirEditionDependance}, C15-02).
   */
  private readonly premierChampDependance: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('premierChampDependance');

  /**
   * Premier champ du formulaire de règle de marqueur IA (cf. {@link ouvrirCreationMarqueurIa},
   * {@link ouvrirEditionMarqueurIa}, C15-02).
   */
  private readonly premierChampMarqueurIa: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('premierChampMarqueurIa');

  /**
   * Premier champ du formulaire du motif de nommage des branches (cf. {@link ouvrirEditionMotifNommage}, C15-02).
   */
  private readonly premierChampMotifNommage: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('premierChampMotifNommage');

  /**
   * Premier champ du formulaire de catégorie de dépendance (cf. {@link ouvrirCreationCategorie},
   * {@link ouvrirEditionCategorie}, US-048).
   */
  private readonly premierChampCategorie: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('premierChampCategorie');

  /**
   * Pose le focus sur le champ désigné dès son rendu effectif (C15-02) : un appel direct à `.focus()` échouerait
   * ici, le champ n'existant pas encore dans le DOM au moment de l'appel (`@if` conditionnel pas encore réévalué) ;
   * `afterNextRender` diffère l'appel après le rendu réel du DOM (cf. `exemple-reference.component.ts`).
   * @param champ - Référence du champ à focaliser, résolue par `viewChild()`.
   */
  private focusApresRendu(champ: Signal<ElementRef<HTMLInputElement> | undefined>): void {
    afterNextRender(() => champ()?.nativeElement.focus(), { injector: this.injector });
  }

  /**
   * Motif à présélectionner dans le formulaire de création d'une règle de dépendances (cf. commentaire d'en-tête).
   */
  public readonly motifPreselectionne: InputSignal<string | undefined> = input<string>();

  /**
   * Version à présélectionner dans le formulaire de création d'une règle de dépendances (cf. commentaire
   * d'en-tête).
   */
  public readonly versionPreselectionnee: InputSignal<string | undefined> = input<string>();

  /**
   * Indique que la présélection depuis {@link motifPreselectionne} a déjà été appliquée une fois pour cette
   * instance (cf. commentaire d'en-tête, même patron que `SqmMembresConnusAdminComponent.preselectionDejaAppliquee`).
   */
  private preselectionDejaAppliquee = false;

  public constructor() {
    effect(() => {
      const motifCible = this.motifPreselectionne();
      if (this.preselectionDejaAppliquee || motifCible === undefined) {
        return;
      }
      this.preselectionDejaAppliquee = true;
      this.ouvrirCreationDependance();
      this.motifDependance = motifCible;
      const versionCible = this.versionPreselectionnee();
      if (versionCible !== undefined && versionCible.length > 0) {
        // RG-044 : la ligne spécifique pré-remplie doit précéder la borne de repli déjà positionnée par
        // `ouvrirCreationDependance` (sémantique « première correspondance déclarée l'emporte », cf.
        // `parametres-jugement.utils.ts`), jamais l'inverse.
        this.versionsDependanceTexte = `${versionCible}=\n${SqmReferentielsParametrageComponent.BORNE_DE_REPLI_PAR_DEFAUT}`;
      }
    });
  }

  /**
   * Types de correspondance proposés au formulaire d'une règle de marqueur IA.
   */
  public readonly typesCorrespondance: readonly TypeCorrespondanceMarqueur[] = ['exact', 'motif'];

  /**
   * Portées proposées au formulaire d'une règle de marqueur IA.
   */
  public readonly portees: readonly PorteeMarqueur[] = ['racine', 'partout'];

  /**
   * Natures proposées au formulaire d'une règle de marqueur IA.
   */
  public readonly natures: readonly NatureMarqueur[] = ['fichier', 'repertoire'];

  /**
   * Message d'erreur de validation ou de rejet par le cœur natif, `null` si aucune erreur en cours.
   */
  public messageErreur: string | null = null;

  /**
   * Avertissement non bloquant sur le formulaire de règle de dépendances (RG-043 : statut de borne de version hors
   * des quatre valeurs reconnues), `null` si aucun. Distinct de {@link messageErreur} : n'empêche jamais
   * l'enregistrement, contrairement à un message d'erreur.
   */
  public avertissementStatutInconnu: string | null = null;

  /**
   * Avertissement non bloquant (relecture N1) : la première borne de version d'une règle de dépendances fait foi de
   * la version majeure la plus récente connue pour le calcul du retard d'obsolescence (RG-050) ; si une borne
   * ultérieure porte un majeur plus élevé, ce calcul serait faussé. `null` si aucun.
   */
  public avertissementOrdreVersions: string | null = null;

  /**
   * Action de référentiel en attente de ressaisie du mot de passe (RG-002). Signal (plutôt qu'une simple propriété)
   * car mutée depuis la continuation asynchrone des quatre méthodes `confirmer*` de ce composant, hors de toute
   * planification automatique de détection de changement en application zoneless (cf. `cheminCreation` de
   * `SqmDemarrageComponent`, correctif de référence).
   */
  public readonly actionEnAttenteMotDePasse: WritableSignal<ActionReferentielEnAttente> =
    signal<ActionReferentielEnAttente>(null);

  /**
   * Indique qu'un appel à une commande native est en cours, pour désactiver les actions concurrentes. Signal pour le
   * même motif que {@link actionEnAttenteMotDePasse}.
   */
  public readonly enCours: WritableSignal<boolean> = signal(false);

  // --- Règles de dépendances ---

  /**
   * Règles de dépendances actuellement chargées.
   * @returns Le tableau des règles de dépendances de la racine courante.
   */
  public reglesDependances(): readonly EntreeReglesDependances[] {
    return this.donneesApplication.racine()?.referentiels.reglesDependances ?? [];
  }

  /**
   * Visibilité du formulaire de règle de dépendances. Signal pour le même motif que
   * {@link actionEnAttenteMotDePasse}.
   */
  public readonly formulaireDependanceVisible: WritableSignal<boolean> = signal(false);

  public dependanceEnEditionId: string | null = null;
  public motifDependance = '';
  public versionsDependanceTexte = '';
  /** Identifiant de la catégorie de dépendance rattachée à la règle en cours d'édition, `null` si aucune (US-049). */
  public categorieDependance: string | null = null;

  /**
   * Ligne de borne de repli injectée automatiquement à la création ou à l'édition d'une règle de dépendances
   * dépourvue de borne `*` (RG-044). Décision arbitraire déjà validée par l'arbitrage humain du 2026-08-18 (cf.
   * `docs/03_plan/analyse_C15-12.md`), faute de valeur métier fixée par un texte normatif antérieur, sur le modèle
   * des autres valeurs par défaut arbitraires déjà documentées dans ce projet (cf.
   * `.claude/rules/09-normes-developpement.md#structure-et-nommage`, nombre de sauvegardes de sécurité).
   */
  private static readonly BORNE_DE_REPLI_PAR_DEFAUT = '*=obsolete';

  /**
   * Statuts de borne de version bénéficiant d'une couleur dédiée à l'affichage (cf. texte d'aide du champ « Bornes
   * de version »). Toute autre valeur reste acceptée par le cœur natif (champ libre, RG-022) mais déclenche un
   * avertissement non bloquant à l'enregistrement (RG-043), comparaison strictement sensible à la casse.
   */
  private static readonly STATUTS_CONNUS: readonly string[] = [
    'obsolete',
    'maintenu',
    'aJourM1',
    'aJourM3',
  ];

  /**
   * Ouvre le formulaire pour la création d'une nouvelle règle de dépendances, pré-rempli d'une borne de repli
   * `*=obsolete` (RG-044), modifiable ou supprimable avant validation.
   */
  public ouvrirCreationDependance(): void {
    this.dependanceEnEditionId = null;
    this.motifDependance = '';
    this.versionsDependanceTexte = SqmReferentielsParametrageComponent.BORNE_DE_REPLI_PAR_DEFAUT;
    this.categorieDependance = null;
    this.messageErreur = null;
    this.avertissementStatutInconnu = null;
    this.avertissementOrdreVersions = null;
    this.formulaireDependanceVisible.set(true);
    this.focusApresRendu(this.premierChampDependance);
  }

  /**
   * Ouvre le formulaire pré-rempli pour la modification d'une règle de dépendances existante. Complète
   * automatiquement les bornes reconstruites d'une ligne de repli `*=obsolete` en dernière position si aucune des
   * bornes déjà persistées ne porte le motif `*` (RG-044) : la détection porte uniquement sur le motif, quel que
   * soit le statut associé, pour ne jamais dupliquer une borne de repli déjà présente sous un autre statut.
   * @param id - Identifiant de la règle à modifier.
   */
  public ouvrirEditionDependance(id: string): void {
    const regle = this.reglesDependances().find((candidate) => candidate.id === id);
    if (!regle) {
      return;
    }
    this.dependanceEnEditionId = regle.id;
    this.motifDependance = regle.motif;
    this.categorieDependance = regle.categorie ?? null;
    const lignes = regle.versions.map((version) => `${version.motifVersion}=${version.statut}`);
    const contientDejaUneBorneDeRepli = regle.versions.some(
      (version) => version.motifVersion === '*',
    );
    if (!contientDejaUneBorneDeRepli) {
      lignes.push(SqmReferentielsParametrageComponent.BORNE_DE_REPLI_PAR_DEFAUT);
    }
    this.versionsDependanceTexte = lignes.join('\n');
    this.messageErreur = null;
    this.avertissementStatutInconnu = null;
    this.avertissementOrdreVersions = null;
    this.formulaireDependanceVisible.set(true);
    this.focusApresRendu(this.premierChampDependance);
  }

  /**
   * Referme le formulaire de règle de dépendances sans enregistrer.
   */
  public fermerFormulaireDependance(): void {
    this.formulaireDependanceVisible.set(false);
  }

  /**
   * Analyse le texte des bornes de version (une ligne `motifVersion=statut` par borne).
   * @param texte - Texte saisi par l'utilisateur.
   * @returns Les bornes analysées, ou `undefined` si au moins une ligne non vide est malformée.
   */
  private analyserVersions(texte: string): readonly VersionDependance[] | undefined {
    const lignes = texte
      .split('\n')
      .map((ligne) => ligne.trim())
      .filter((ligne) => ligne.length > 0);
    const versions: VersionDependance[] = [];
    for (const ligne of lignes) {
      const indexEgal = ligne.indexOf('=');
      if (indexEgal <= 0 || indexEgal === ligne.length - 1) {
        return undefined;
      }
      versions.push({
        motifVersion: ligne.slice(0, indexEgal).trim(),
        statut: ligne.slice(indexEgal + 1).trim(),
      });
    }
    return versions;
  }

  /**
   * Valide le formulaire de règle de dépendances puis, si valide, ouvre la ressaisie du mot de passe (RG-002).
   * Bloque avec {@link messageErreur} si le motif est vide, si une ligne de bornes est malformée, ou si le motif
   * correspond déjà à une autre entrée du référentiel (RG-042, rejet strict, jamais de fusion implicite). Pose
   * ensuite, sans bloquer l'enregistrement, un éventuel {@link avertissementStatutInconnu} si une borne porte un
   * statut hors des quatre valeurs reconnues (RG-043).
   */
  public demanderEnregistrementDependance(): void {
    if (this.motifDependance.trim().length === 0) {
      this.messageErreur = 'Le motif est obligatoire.';
      this.avertissementStatutInconnu = null;
      this.avertissementOrdreVersions = null;
      return;
    }
    const versions = this.analyserVersions(this.versionsDependanceTexte);
    if (versions === undefined) {
      this.messageErreur =
        'Chaque ligne de bornes de version doit être au format « motifVersion=statut ».';
      this.avertissementStatutInconnu = null;
      this.avertissementOrdreVersions = null;
      return;
    }
    const motif = this.motifDependance.trim();
    const motifDejaExistant = this.reglesDependances().some(
      (regle) => regle.id !== this.dependanceEnEditionId && regle.motif === motif,
    );
    if (motifDejaExistant) {
      this.messageErreur =
        'Une règle de dépendances existe déjà pour ce motif : modifiez directement la règle existante plutôt que d’en créer une nouvelle (RG-042).';
      this.avertissementStatutInconnu = null;
      this.avertissementOrdreVersions = null;
      return;
    }
    this.messageErreur = null;
    const statutHorsListeConnue = versions.some(
      (version) => !SqmReferentielsParametrageComponent.STATUTS_CONNUS.includes(version.statut),
    );
    this.avertissementStatutInconnu = statutHorsListeConnue
      ? 'Au moins une borne de version porte un statut hors des quatre valeurs reconnues (obsolete, maintenu, aJourM1, aJourM3) : elle sera néanmoins enregistrée telle quelle.'
      : null;
    this.avertissementOrdreVersions =
      SqmReferentielsParametrageComponent.premiereBorneNestPasLaPlusRecente(versions)
        ? "La première borne de version n'est pas celle qui porte le numéro majeur le plus élevé : elle sert pourtant de version de référence pour le calcul du retard d'obsolescence (écran Obsolescence). Placez la version la plus récente en première ligne."
        : null;
    this.actionEnAttenteMotDePasse.set('dependance');
  }

  /**
   * Indique si la première borne de version n'est pas celle qui porte le numéro majeur le plus élevé parmi les
   * bornes numériquement analysables (relecture N1, RG-050).
   * @param versions - Bornes de version analysées.
   * @returns `true` s'il faut avertir l'utilisateur.
   */
  private static premiereBorneNestPasLaPlusRecente(
    versions: readonly VersionDependance[],
  ): boolean {
    const premierMajeur = ObsolescenceRetardUtils.parseMajeur(versions[0]?.motifVersion ?? '');
    if (premierMajeur === undefined) {
      return false;
    }
    return versions.slice(1).some((version) => {
      const majeur = ObsolescenceRetardUtils.parseMajeur(version.motifVersion);
      return majeur !== undefined && majeur > premierMajeur;
    });
  }

  /**
   * Enregistre la règle de dépendances après confirmation du mot de passe (US-033, RG-002, RG-023).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrementDependance(motDePasse: string): Promise<void> {
    const dependanceEnEditionId = this.dependanceEnEditionId;
    const versions = this.analyserVersions(this.versionsDependanceTexte) ?? [];
    const categorie = this.categorieDependance ?? undefined;
    const entree: EntreeReglesDependances = {
      id: dependanceEnEditionId ?? crypto.randomUUID(),
      motif: this.motifDependance.trim(),
      versions,
      ...(categorie === undefined ? {} : { categorie }),
    };

    this.enCours.set(true);
    const resultat = await this.donneesApplication.definirReferentiel(
      'reglesDependances',
      entree,
      motDePasse,
    );
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.formulaireDependanceVisible.set(false);
    this.avertissementStatutInconnu = null;
    this.avertissementOrdreVersions = null;
    this.notification.succes(
      dependanceEnEditionId
        ? 'La règle de dépendances a été modifiée.'
        : 'La règle de dépendances a été ajoutée.',
    );
  }

  // --- Règles de marqueurs IA ---

  /**
   * Règles de marqueurs IA actuellement chargées.
   * @returns Le tableau des règles de marqueurs IA de la racine courante.
   */
  public reglesMarqueursIA(): readonly EntreeReglesMarqueursIA[] {
    return this.donneesApplication.racine()?.referentiels.reglesMarqueursIA ?? [];
  }

  /**
   * Visibilité du formulaire de règle de marqueur IA. Signal pour le même motif que
   * {@link actionEnAttenteMotDePasse}.
   */
  public readonly formulaireMarqueurIaVisible: WritableSignal<boolean> = signal(false);

  public marqueurIaEnEditionId: string | null = null;
  public motifMarqueurIa = '';
  public typeCorrespondanceMarqueurIa: TypeCorrespondanceMarqueur = 'exact';
  public porteeMarqueurIa: PorteeMarqueur = 'racine';
  public natureMarqueurIa: NatureMarqueur = 'fichier';
  public outilMarqueurIa = '';

  /**
   * Ouvre le formulaire pour la création d'une nouvelle règle de marqueur IA.
   */
  public ouvrirCreationMarqueurIa(): void {
    this.marqueurIaEnEditionId = null;
    this.motifMarqueurIa = '';
    this.typeCorrespondanceMarqueurIa = 'exact';
    this.porteeMarqueurIa = 'racine';
    this.natureMarqueurIa = 'fichier';
    this.outilMarqueurIa = '';
    this.messageErreur = null;
    this.formulaireMarqueurIaVisible.set(true);
    this.focusApresRendu(this.premierChampMarqueurIa);
  }

  /**
   * Ouvre le formulaire pré-rempli pour la modification d'une règle de marqueur IA existante.
   * @param id - Identifiant de la règle à modifier.
   */
  public ouvrirEditionMarqueurIa(id: string): void {
    const regle = this.reglesMarqueursIA().find((candidate) => candidate.id === id);
    if (!regle) {
      return;
    }
    this.marqueurIaEnEditionId = regle.id;
    this.motifMarqueurIa = regle.motif;
    this.typeCorrespondanceMarqueurIa = regle.typeCorrespondance;
    this.porteeMarqueurIa = regle.portee;
    this.natureMarqueurIa = regle.nature;
    this.outilMarqueurIa = regle.outil;
    this.messageErreur = null;
    this.formulaireMarqueurIaVisible.set(true);
    this.focusApresRendu(this.premierChampMarqueurIa);
  }

  /**
   * Referme le formulaire de règle de marqueur IA sans enregistrer.
   */
  public fermerFormulaireMarqueurIa(): void {
    this.formulaireMarqueurIaVisible.set(false);
  }

  /**
   * Valide le formulaire de règle de marqueur IA puis, si valide, ouvre la ressaisie du mot de passe (RG-002).
   */
  public demanderEnregistrementMarqueurIa(): void {
    if (this.motifMarqueurIa.trim().length === 0 || this.outilMarqueurIa.trim().length === 0) {
      this.messageErreur = 'Le motif et l’outil sont obligatoires.';
      return;
    }
    this.messageErreur = null;
    this.actionEnAttenteMotDePasse.set('marqueurIA');
  }

  /**
   * Enregistre la règle de marqueur IA après confirmation du mot de passe (US-033, RG-002, RG-023).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrementMarqueurIa(motDePasse: string): Promise<void> {
    const marqueurIaEnEditionId = this.marqueurIaEnEditionId;
    const entree: EntreeReglesMarqueursIA = {
      id: marqueurIaEnEditionId ?? crypto.randomUUID(),
      motif: this.motifMarqueurIa.trim(),
      typeCorrespondance: this.typeCorrespondanceMarqueurIa,
      portee: this.porteeMarqueurIa,
      nature: this.natureMarqueurIa,
      outil: this.outilMarqueurIa.trim(),
    };

    this.enCours.set(true);
    const resultat = await this.donneesApplication.definirReferentiel(
      'reglesMarqueursIA',
      entree,
      motDePasse,
    );
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.formulaireMarqueurIaVisible.set(false);
    this.notification.succes(
      marqueurIaEnEditionId
        ? 'La règle de marqueur IA a été modifiée.'
        : 'La règle de marqueur IA a été ajoutée.',
    );
  }

  // --- Catégories de dépendance (US-048, RG-048) ---

  /**
   * Catégories de dépendance actuellement chargées (US-048).
   * @returns Le tableau des catégories de dépendance de la racine courante.
   */
  public categoriesDependances(): readonly EntreeCategorieDependance[] {
    return this.donneesApplication.racine()?.referentiels.categoriesDependances ?? [];
  }

  /**
   * Libellé de la catégorie de dépendance désignée par son identifiant (US-049).
   * @param id - Identifiant de la catégorie, ou `undefined` si la règle n'en porte pas.
   * @returns Le libellé de la catégorie, ou `null` si l'identifiant est absent ou ne désigne aucune catégorie
   * connue (catégorie supprimée depuis : la règle est alors traitée comme sans catégorie, RG-049).
   */
  public nomCategorie(id: string | undefined): string | null {
    if (id === undefined) {
      return null;
    }
    return this.categoriesDependances().find((categorie) => categorie.id === id)?.libelle ?? null;
  }

  /**
   * Visibilité du formulaire de catégorie de dépendance. Signal pour le même motif que
   * {@link actionEnAttenteMotDePasse}.
   */
  public readonly formulaireCategorieVisible: WritableSignal<boolean> = signal(false);

  public categorieEnEditionId: string | null = null;
  public libelleCategorie = '';
  public sigleCategorie = '';

  /**
   * Ouvre le formulaire pour la création d'une nouvelle catégorie de dépendance.
   */
  public ouvrirCreationCategorie(): void {
    this.categorieEnEditionId = null;
    this.libelleCategorie = '';
    this.sigleCategorie = '';
    this.messageErreur = null;
    this.formulaireCategorieVisible.set(true);
    this.focusApresRendu(this.premierChampCategorie);
  }

  /**
   * Ouvre le formulaire pré-rempli pour la modification d'une catégorie de dépendance existante.
   * @param id - Identifiant de la catégorie à modifier.
   */
  public ouvrirEditionCategorie(id: string): void {
    const categorie = this.categoriesDependances().find((candidate) => candidate.id === id);
    if (!categorie) {
      return;
    }
    this.categorieEnEditionId = categorie.id;
    this.libelleCategorie = categorie.libelle;
    this.sigleCategorie = categorie.sigle;
    this.messageErreur = null;
    this.formulaireCategorieVisible.set(true);
    this.focusApresRendu(this.premierChampCategorie);
  }

  /**
   * Referme le formulaire de catégorie de dépendance sans enregistrer.
   */
  public fermerFormulaireCategorie(): void {
    this.formulaireCategorieVisible.set(false);
  }

  /**
   * Valide le formulaire de catégorie de dépendance puis, si valide, ouvre la ressaisie du mot de passe (RG-002).
   * Bloque avec {@link messageErreur} si le libellé est vide, si le sigle dépasse trois caractères, ou si le
   * libellé correspond déjà à une autre catégorie existante (RG-048, rejet strict revalidé côté cœur natif).
   */
  public demanderEnregistrementCategorie(): void {
    const libelle = this.libelleCategorie.trim();
    const sigle = this.sigleCategorie.trim();
    if (libelle.length === 0) {
      this.messageErreur = 'Le libellé est obligatoire.';
      return;
    }
    if (sigle.length > 3) {
      this.messageErreur = 'Le sigle ne peut pas dépasser trois caractères.';
      return;
    }
    const libelleDejaExistant = this.categoriesDependances().some(
      (categorie) => categorie.id !== this.categorieEnEditionId && categorie.libelle === libelle,
    );
    if (libelleDejaExistant) {
      this.messageErreur =
        'Une catégorie de dépendance porte déjà ce libellé : modifiez directement la catégorie existante plutôt que d’en créer une nouvelle (RG-048).';
      return;
    }
    this.messageErreur = null;
    this.actionEnAttenteMotDePasse.set('categorieDependance');
  }

  /**
   * Enregistre la catégorie de dépendance après confirmation du mot de passe (US-048, RG-002, RG-023).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrementCategorie(motDePasse: string): Promise<void> {
    const categorieEnEditionId = this.categorieEnEditionId;
    const libelle = this.libelleCategorie.trim();
    const sigle =
      this.sigleCategorie.trim().length > 0
        ? this.sigleCategorie.trim().toUpperCase()
        : libelle.slice(0, 3).toUpperCase();
    const entree: EntreeCategorieDependance = {
      id: categorieEnEditionId ?? crypto.randomUUID(),
      libelle,
      sigle,
    };

    this.enCours.set(true);
    const resultat = await this.donneesApplication.definirReferentiel(
      'categoriesDependances',
      entree,
      motDePasse,
    );
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.formulaireCategorieVisible.set(false);
    this.notification.succes(
      categorieEnEditionId
        ? 'La catégorie de dépendance a été modifiée.'
        : 'La catégorie de dépendance a été ajoutée.',
    );
  }

  /**
   * Demande la suppression d'une catégorie de dépendance : ouvre la confirmation de suppression (avant ressaisie du
   * mot de passe).
   * @param id - Identifiant de la catégorie à supprimer.
   */
  public demanderSuppressionCategorie(id: string): void {
    this.messageErreur = null;
    this.suppressionEnAttente.set({ type: 'categorieDependance', id });
  }

  // --- Motif de nommage des branches ---

  /**
   * Motif de nommage des branches actuellement en vigueur (RG-030).
   * @returns Le motif d'expression régulière actuellement en vigueur.
   */
  public motifNommageBranchesActuel(): string {
    return this.donneesApplication.racine()?.referentiels.motifNommageBranches ?? '';
  }

  /**
   * Visibilité du formulaire du motif de nommage des branches. Signal pour le même motif que
   * {@link actionEnAttenteMotDePasse}.
   */
  public readonly formulaireMotifNommageVisible: WritableSignal<boolean> = signal(false);

  public motifNommageBranchesFormulaire = '';

  /**
   * Ouvre le formulaire pré-rempli du motif de nommage des branches actuellement en vigueur.
   */
  public ouvrirEditionMotifNommage(): void {
    this.motifNommageBranchesFormulaire = this.motifNommageBranchesActuel();
    this.messageErreur = null;
    this.formulaireMotifNommageVisible.set(true);
    this.focusApresRendu(this.premierChampMotifNommage);
  }

  /**
   * Referme le formulaire du motif de nommage sans enregistrer.
   */
  public fermerFormulaireMotifNommage(): void {
    this.formulaireMotifNommageVisible.set(false);
  }

  /**
   * Valide le motif saisi comme expression régulière syntaxiquement correcte, non vide (RG-030), puis ouvre la
   * ressaisie du mot de passe si valide.
   */
  public demanderEnregistrementMotifNommage(): void {
    const motif = this.motifNommageBranchesFormulaire.trim();
    if (motif.length === 0) {
      this.messageErreur = 'Le motif de nommage ne peut pas être vide.';
      return;
    }
    try {
      new RegExp(motif);
    } catch {
      this.messageErreur = "Ce motif n'est pas une expression régulière syntaxiquement valide.";
      return;
    }
    this.messageErreur = null;
    this.actionEnAttenteMotDePasse.set('motifNommage');
  }

  /**
   * Enregistre le motif de nommage des branches après confirmation du mot de passe (US-033, RG-002, RG-023,
   * RG-030).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrementMotifNommage(motDePasse: string): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.definirReferentiel(
      'motifNommageBranches',
      this.motifNommageBranchesFormulaire.trim(),
      motDePasse,
    );
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.formulaireMotifNommageVisible.set(false);
    this.notification.succes('Le motif de nommage des branches a été modifié.');
  }

  // --- Suppression d'une entrée de référentiel (US-033, RG-035, Phase 10 incrément 8) ---

  /**
   * Suppression d'entrée de référentiel actuellement en attente de confirmation, `null` si aucune. Signal pour le
   * même motif que {@link actionEnAttenteMotDePasse}.
   */
  public readonly suppressionEnAttente: WritableSignal<SuppressionEnAttente | null> =
    signal<SuppressionEnAttente | null>(null);

  /**
   * Demande la suppression d'une règle de dépendances : ouvre la confirmation de suppression (avant ressaisie du
   * mot de passe).
   * @param id - Identifiant de la règle à supprimer.
   */
  public demanderSuppressionDependance(id: string): void {
    this.messageErreur = null;
    this.suppressionEnAttente.set({ type: 'dependance', id });
  }

  /**
   * Demande la suppression d'une règle de marqueur IA : ouvre la confirmation de suppression (avant ressaisie du
   * mot de passe).
   * @param id - Identifiant de la règle à supprimer.
   */
  public demanderSuppressionMarqueurIa(id: string): void {
    this.messageErreur = null;
    this.suppressionEnAttente.set({ type: 'marqueurIA', id });
  }

  /**
   * Annule la suppression en attente de confirmation.
   */
  public annulerSuppression(): void {
    this.suppressionEnAttente.set(null);
  }

  /**
   * Confirme la suppression : ouvre la ressaisie du mot de passe (RG-002).
   */
  public confirmerSuppression(): void {
    const suppressionEnAttente = this.suppressionEnAttente();
    if (!suppressionEnAttente) {
      return;
    }
    switch (suppressionEnAttente.type) {
      case 'dependance':
        this.actionEnAttenteMotDePasse.set('suppressionDependance');
        break;
      case 'marqueurIA':
        this.actionEnAttenteMotDePasse.set('suppressionMarqueurIA');
        break;
      case 'categorieDependance':
        this.actionEnAttenteMotDePasse.set('suppressionCategorieDependance');
        break;
    }
  }

  /**
   * Supprime l'entrée de référentiel désignée après confirmation du mot de passe (US-033, RG-002, RG-035).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerSuppressionMotDePasse(motDePasse: string): Promise<void> {
    const suppressionEnAttente = this.suppressionEnAttente();
    if (!suppressionEnAttente) {
      return;
    }
    const { type, id } = suppressionEnAttente;

    this.enCours.set(true);
    let resultat: ResultatMutationAdministration;
    switch (type) {
      case 'dependance':
        resultat = await this.donneesApplication.supprimerRegleDependance(id, motDePasse);
        break;
      case 'marqueurIA':
        resultat = await this.donneesApplication.supprimerRegleMarqueurIA(id, motDePasse);
        break;
      case 'categorieDependance':
        resultat = await this.donneesApplication.supprimerCategorieDependance(id, motDePasse);
        break;
    }
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      this.suppressionEnAttente.set(null);
      return;
    }
    this.suppressionEnAttente.set(null);
  }

  /**
   * Annule la ressaisie du mot de passe en cours, quelle que soit l'action qui l'avait demandée.
   */
  public annulerMotDePasse(): void {
    this.actionEnAttenteMotDePasse.set(null);
  }

  /**
   * Traduit une anomalie typée en message lisible par l'utilisateur, sans détail technique sensible.
   * @param anomalie - Anomalie remontée par la commande native.
   * @returns Le message à afficher.
   */
  private libelleAnomalie(anomalie: ErreurAdministration): string {
    switch (anomalie.type) {
      case 'entreeReferentielInvalide':
        return "Cette entrée n'est pas valide : vérifiez les champs obligatoires.";
      case 'motifDependanceDejaExistant':
        return 'Une règle de dépendances existe déjà pour ce motif : modifiez directement la règle existante plutôt que d’en créer une nouvelle.';
      case 'libelleCategorieDependanceDejaExistant':
        return 'Une catégorie de dépendance porte déjà ce libellé : modifiez directement la catégorie existante plutôt que d’en créer une nouvelle.';
      case 'entreeReferentielIntrouvable':
        return "Cette entrée de référentiel n'existe plus (peut-être déjà supprimée).";
      case 'motifNommageBranchesInvalide':
        return "Ce motif n'est pas une expression régulière valide, ou est vide.";
      case 'typeReferentielInconnu':
        return 'Ce type de référentiel est inconnu.';
      case 'fichierVerrouille':
        return 'Le fichier de données est verrouillé par un autre processus.';
      case 'motDePasseOuFichierInvalide':
        return 'Mot de passe incorrect.';
      case 'sessionVerrouillee':
        return 'La session est verrouillée : déverrouillez-la avant de sauvegarder.';
      case 'motDePasseSessionDivergent':
        return 'Le mot de passe saisi ne correspond pas à celui de la session en cours.';
      case 'cleSeuilIntrouvable':
      case 'groupeIntrouvable':
      case 'projetIntrouvable':
      case 'membreIntrouvable':
      case 'doublonUsernameMembreConnu':
      case 'conflitReglesMembreConnu':
      case 'brouillonDejaExistant':
      case 'aucunBrouillonCourant':
      case 'projetAbsentDuBrouillon':
      case 'fichierIntrouvable':
      case 'formatNonReconnu':
      case 'versionSchemaSuperieure':
      case 'aucunFichierOuvert':
      case 'credentialInvalide':
      case 'modePurgeAgeInconnu':
      case 'fichierConfigurationIllisible':
      case 'formatConfigurationNonReconnu':
      case 'versionSchemaConfigurationSuperieure':
      case 'ligneDifferentielInconnue':
      case 'vueIntrouvable':
      case 'reglageApplicatifInvalide':
      case 'annotationIntrouvable':
      case 'annotationSystemeNonSupprimable':
      case 'nouveauMotDePasseInvalide':
      case 'erreurInterne':
        return "Une erreur inattendue est survenue lors de l'enregistrement.";
    }
  }
}
