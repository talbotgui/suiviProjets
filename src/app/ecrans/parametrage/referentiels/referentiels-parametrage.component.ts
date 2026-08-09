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
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './referentiels-parametrage.component.html',
})
export class SqmReferentielsParametrageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

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
   * Action de référentiel en attente de ressaisie du mot de passe (RG-002).
   */
  public actionEnAttenteMotDePasse: ActionReferentielEnAttente = null;

  /**
   * Indique qu'un appel à une commande native est en cours, pour désactiver les actions concurrentes.
   */
  public enCours = false;

  // --- Règles de dépendances ---

  /**
   * Règles de dépendances actuellement chargées.
   * @returns Le tableau des règles de dépendances de la racine courante.
   */
  public reglesDependances(): readonly EntreeReglesDependances[] {
    return this.donneesApplication.racine()?.referentiels.reglesDependances ?? [];
  }

  public formulaireDependanceVisible = false;
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
    this.formulaireDependanceVisible = true;
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
    this.formulaireDependanceVisible = true;
  }

  /**
   * Referme le formulaire de règle de dépendances sans enregistrer.
   */
  public fermerFormulaireDependance(): void {
    this.formulaireDependanceVisible = false;
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
    this.actionEnAttenteMotDePasse = 'dependance';
  }

  /**
   * Enregistre la règle de dépendances après confirmation du mot de passe (US-033, RG-002, RG-023).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrementDependance(motDePasse: string): Promise<void> {
    const versions = this.analyserVersions(this.versionsDependanceTexte) ?? [];
    const entree: EntreeReglesDependances = {
      id: this.dependanceEnEditionId ?? crypto.randomUUID(),
      motif: this.motifDependance.trim(),
      versions,
    };

    this.enCours = true;
    const resultat = await this.donneesApplication.definirReferentiel(
      'reglesDependances',
      entree,
      motDePasse,
    );
    this.enCours = false;
    this.actionEnAttenteMotDePasse = null;

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.formulaireDependanceVisible = false;
  }

  // --- Règles de marqueurs IA ---

  /**
   * Règles de marqueurs IA actuellement chargées.
   * @returns Le tableau des règles de marqueurs IA de la racine courante.
   */
  public reglesMarqueursIA(): readonly EntreeReglesMarqueursIA[] {
    return this.donneesApplication.racine()?.referentiels.reglesMarqueursIA ?? [];
  }

  public formulaireMarqueurIaVisible = false;
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
    this.formulaireMarqueurIaVisible = true;
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
    this.formulaireMarqueurIaVisible = true;
  }

  /**
   * Referme le formulaire de règle de marqueur IA sans enregistrer.
   */
  public fermerFormulaireMarqueurIa(): void {
    this.formulaireMarqueurIaVisible = false;
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
    this.actionEnAttenteMotDePasse = 'marqueurIA';
  }

  /**
   * Enregistre la règle de marqueur IA après confirmation du mot de passe (US-033, RG-002, RG-023).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrementMarqueurIa(motDePasse: string): Promise<void> {
    const entree: EntreeReglesMarqueursIA = {
      id: this.marqueurIaEnEditionId ?? crypto.randomUUID(),
      motif: this.motifMarqueurIa.trim(),
      typeCorrespondance: this.typeCorrespondanceMarqueurIa,
      portee: this.porteeMarqueurIa,
      nature: this.natureMarqueurIa,
      outil: this.outilMarqueurIa.trim(),
    };

    this.enCours = true;
    const resultat = await this.donneesApplication.definirReferentiel(
      'reglesMarqueursIA',
      entree,
      motDePasse,
    );
    this.enCours = false;
    this.actionEnAttenteMotDePasse = null;

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.formulaireMarqueurIaVisible = false;
  }

  // --- Motif de nommage des branches ---

  /**
   * Motif de nommage des branches actuellement en vigueur (RG-030).
   * @returns Le motif d'expression régulière actuellement en vigueur.
   */
  public motifNommageBranchesActuel(): string {
    return this.donneesApplication.racine()?.referentiels.motifNommageBranches ?? '';
  }

  public formulaireMotifNommageVisible = false;
  public motifNommageBranchesFormulaire = '';

  /**
   * Ouvre le formulaire pré-rempli du motif de nommage des branches actuellement en vigueur.
   */
  public ouvrirEditionMotifNommage(): void {
    this.motifNommageBranchesFormulaire = this.motifNommageBranchesActuel();
    this.messageErreur = null;
    this.formulaireMotifNommageVisible = true;
  }

  /**
   * Referme le formulaire du motif de nommage sans enregistrer.
   */
  public fermerFormulaireMotifNommage(): void {
    this.formulaireMotifNommageVisible = false;
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
    this.actionEnAttenteMotDePasse = 'motifNommage';
  }

  /**
   * Enregistre le motif de nommage des branches après confirmation du mot de passe (US-033, RG-002, RG-023,
   * RG-030).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrementMotifNommage(motDePasse: string): Promise<void> {
    this.enCours = true;
    const resultat = await this.donneesApplication.definirReferentiel(
      'motifNommageBranches',
      this.motifNommageBranchesFormulaire.trim(),
      motDePasse,
    );
    this.enCours = false;
    this.actionEnAttenteMotDePasse = null;

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.formulaireMotifNommageVisible = false;
  }

  // --- Suppression d'une entrée de référentiel (US-033, RG-035, Phase 10 incrément 8) ---

  /**
   * Suppression d'entrée de référentiel actuellement en attente de confirmation, `null` si aucune.
   */
  public suppressionEnAttente: SuppressionEnAttente | null = null;

  /**
   * Demande la suppression d'une règle de dépendances : ouvre la confirmation de suppression (avant ressaisie du
   * mot de passe).
   * @param id - Identifiant de la règle à supprimer.
   */
  public demanderSuppressionDependance(id: string): void {
    this.messageErreur = null;
    this.suppressionEnAttente = { type: 'dependance', id };
  }

  /**
   * Demande la suppression d'une règle de marqueur IA : ouvre la confirmation de suppression (avant ressaisie du
   * mot de passe).
   * @param id - Identifiant de la règle à supprimer.
   */
  public demanderSuppressionMarqueurIa(id: string): void {
    this.messageErreur = null;
    this.suppressionEnAttente = { type: 'marqueurIA', id };
  }

  /**
   * Annule la suppression en attente de confirmation.
   */
  public annulerSuppression(): void {
    this.suppressionEnAttente = null;
  }

  /**
   * Confirme la suppression : ouvre la ressaisie du mot de passe (RG-002).
   */
  public confirmerSuppression(): void {
    if (!this.suppressionEnAttente) {
      return;
    }
    this.actionEnAttenteMotDePasse =
      this.suppressionEnAttente.type === 'dependance'
        ? 'suppressionDependance'
        : 'suppressionMarqueurIA';
  }

  /**
   * Supprime l'entrée de référentiel désignée après confirmation du mot de passe (US-033, RG-002, RG-035).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerSuppressionMotDePasse(motDePasse: string): Promise<void> {
    if (!this.suppressionEnAttente) {
      return;
    }
    const { type, id } = this.suppressionEnAttente;

    this.enCours = true;
    const resultat =
      type === 'dependance'
        ? await this.donneesApplication.supprimerRegleDependance(id, motDePasse)
        : await this.donneesApplication.supprimerRegleMarqueurIA(id, motDePasse);
    this.enCours = false;
    this.actionEnAttenteMotDePasse = null;

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      this.suppressionEnAttente = null;
      return;
    }
    this.suppressionEnAttente = null;
  }

  /**
   * Annule la ressaisie du mot de passe en cours, quelle que soit l'action qui l'avait demandée.
   */
  public annulerMotDePasse(): void {
    this.actionEnAttenteMotDePasse = null;
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
      case 'erreurInterne':
        return "Une erreur inattendue est survenue lors de l'enregistrement.";
    }
  }
}
