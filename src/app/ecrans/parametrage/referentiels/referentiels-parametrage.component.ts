// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Section « Référentiels » de l'onglet Seuils et référentiels de l'écran Paramétrage (US-033, Phase 7,
// incrément 2 ; RG-023, RG-030) : ajout/modification d'une règle de dépendances (`referentiels.reglesDependances`)
// ou d'une règle de marqueur IA (`referentiels.reglesMarqueursIA`), et remplacement du motif de nommage des
// branches (`referentiels.motifNommageBranches`). Sur le patron CRUD + confirmation de mot de passe de
// `SqmMembresConnusAdminComponent` (Phase 4), avec un unique discriminant d'action en attente pour les trois
// sous-formulaires plutôt que trois indicateurs distincts (une seule action possible à la fois).
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
  EntreeReglesDependances,
  EntreeReglesMarqueursIA,
  ErreurAdministration,
} from '../../../services/avecetat/etat/types-donnees';
import type { VersionDependance } from '../../../services/sansetat/jugement/parametres-jugement.utils';

/**
 * Action de référentiel actuellement en attente de ressaisie du mot de passe (RG-002), `null` si aucune. Les deux
 * variantes `suppression*` (US-033, RG-035, Phase 10 incrément 8) sont atteintes après confirmation de la
 * suppression elle-même (`SqmConfirmationSuppressionComponent`), sur le modèle à deux étapes déjà utilisé par
 * `SqmMembresConnusAdminComponent` pour une action irréversible.
 */
type ActionReferentielEnAttente =
  | 'dependance'
  | 'marqueurIA'
  | 'motifNommage'
  | 'suppressionDependance'
  | 'suppressionMarqueurIA'
  | null;

/**
 * Suppression d'entrée de référentiel en attente de confirmation (avant ressaisie du mot de passe), `null` si
 * aucune (US-033, RG-035, Phase 10 incrément 8).
 */
interface SuppressionEnAttente {
  readonly type: 'dependance' | 'marqueurIA';
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
        this.versionsDependanceTexte = `${versionCible}=`;
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

  /**
   * Ouvre le formulaire pour la création d'une nouvelle règle de dépendances.
   */
  public ouvrirCreationDependance(): void {
    this.dependanceEnEditionId = null;
    this.motifDependance = '';
    this.versionsDependanceTexte = '';
    this.messageErreur = null;
    this.formulaireDependanceVisible.set(true);
    this.focusApresRendu(this.premierChampDependance);
  }

  /**
   * Ouvre le formulaire pré-rempli pour la modification d'une règle de dépendances existante.
   * @param id - Identifiant de la règle à modifier.
   */
  public ouvrirEditionDependance(id: string): void {
    const regle = this.reglesDependances().find((candidate) => candidate.id === id);
    if (!regle) {
      return;
    }
    this.dependanceEnEditionId = regle.id;
    this.motifDependance = regle.motif;
    this.versionsDependanceTexte = regle.versions
      .map((version) => `${version.motifVersion}=${version.statut}`)
      .join('\n');
    this.messageErreur = null;
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
   */
  public demanderEnregistrementDependance(): void {
    if (this.motifDependance.trim().length === 0) {
      this.messageErreur = 'Le motif est obligatoire.';
      return;
    }
    if (this.analyserVersions(this.versionsDependanceTexte) === undefined) {
      this.messageErreur =
        'Chaque ligne de bornes de version doit être au format « motifVersion=statut ».';
      return;
    }
    this.messageErreur = null;
    this.actionEnAttenteMotDePasse.set('dependance');
  }

  /**
   * Enregistre la règle de dépendances après confirmation du mot de passe (US-033, RG-002, RG-023).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrementDependance(motDePasse: string): Promise<void> {
    const dependanceEnEditionId = this.dependanceEnEditionId;
    const versions = this.analyserVersions(this.versionsDependanceTexte) ?? [];
    const entree: EntreeReglesDependances = {
      id: dependanceEnEditionId ?? crypto.randomUUID(),
      motif: this.motifDependance.trim(),
      versions,
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
    this.actionEnAttenteMotDePasse.set(
      suppressionEnAttente.type === 'dependance'
        ? 'suppressionDependance'
        : 'suppressionMarqueurIA',
    );
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
    const resultat =
      type === 'dependance'
        ? await this.donneesApplication.supprimerRegleDependance(id, motDePasse)
        : await this.donneesApplication.supprimerRegleMarqueurIA(id, motDePasse);
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
