// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Zone « Réglages applicatifs » de l'onglet Seuils et référentiels de l'écran Paramétrage (US-034, US-035, Phase 10
// incrément 8, C10-01/C10-02), qualifiée par une session d'arbitrage humain distincte du reste de la Phase 10 : la
// maquette de référence (`docs/01_besoin/Specification.md#526-f26--paramétrage`) en fait l'une des quatre zones
// visuelles de cet écran, jusqu'ici jamais construite faute d'US/RG. Solution B retenue pour chacun des cinq
// réglages (délai de verrouillage, concurrence d'audit, proxy, nombre de sauvegardes de sécurité, seuil
// d'avertissement de taille) : une commande dédiée par réglage plutôt qu'une commande générique paramétrée par
// clé, sur le modèle de `qualifierMembre`/`definirPolitiqueIA`. Cinq blocs indépendants, chacun avec son propre
// discriminant d'édition/ressaisie du mot de passe, sur le patron de `SqmReferentielsParametrageComponent` (un seul
// réglage modifiable à la fois par bloc).
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { ErreurAdministration } from '../../../services/avecetat/etat/types-donnees';

/**
 * Réglage applicatif actuellement en cours d'édition (RG-002), `null` si aucun.
 */
type ReglageEnAttente =
  'verrouillage' | 'concurrenceAudit' | 'proxy' | 'nombreSauvegardes' | 'seuilAvertissement' | null;

/**
 * Zone « Réglages applicatifs » : délai de verrouillage, concurrence d'audit par défaut, proxy HTTP, nombre de
 * sauvegardes de sécurité (US-034, RG-031) et seuil d'avertissement de taille à la sauvegarde (US-035, RG-031,
 * RG-032).
 */
@Component({
  selector: 'app-reglages-applicatifs-parametrage',
  imports: [FormsModule, SqmConfirmationMotDePasseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reglages-applicatifs-parametrage.component.html',
})
export class SqmReglagesApplicatifsParametrageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

  /**
   * Message d'erreur de validation ou de rejet par le cœur natif, `null` si aucune erreur en cours.
   */
  public messageErreur: string | null = null;

  /**
   * Réglage en attente de ressaisie du mot de passe (RG-002). Porté par un signal (plutôt qu'une simple propriété)
   * car mis à jour depuis la continuation asynchrone de chacune des cinq méthodes `confirmerEnregistrementXxx`,
   * hors de toute planification automatique de détection de changement dans une application zoneless (aucune
   * dépendance `zone.js`, cf. `app.config.ts`) : seule une écriture de signal est garantie de déclencher un
   * nouveau rendu à ce moment-là, à la différence d'une propriété mutée après un `await` (même motif que
   * `cheminCreation` dans `demarrage.component.ts`, gabarit de ce correctif). Les six autres propriétés
   * converties en signal ci-dessous, pour ce même motif, ne répètent pas cette explication.
   */
  public readonly reglageEnAttenteMotDePasse: WritableSignal<ReglageEnAttente> =
    signal<ReglageEnAttente>(null);

  /**
   * Indique qu'un appel à une commande native est en cours, pour désactiver les actions concurrentes.
   */
  public readonly enCours: WritableSignal<boolean> = signal(false);

  // --- Délai de verrouillage ---

  /** Visibilité du formulaire d'édition du délai de verrouillage. */
  public readonly verrouillageEditVisible: WritableSignal<boolean> = signal(false);
  public delaiInactiviteMinutesFormulaire = 0;
  public echecsAvantFermetureFormulaire = 0;

  /**
   * Ouvre le formulaire pré-rempli des réglages de verrouillage.
   */
  public ouvrirEditionVerrouillage(): void {
    const verrouillage = this.donneesApplication.racine()?.parametres.verrouillage;
    this.delaiInactiviteMinutesFormulaire = verrouillage?.delaiInactiviteMinutes ?? 15;
    this.echecsAvantFermetureFormulaire = verrouillage?.echecsAvantFermeture ?? 5;
    this.messageErreur = null;
    this.verrouillageEditVisible.set(true);
  }

  /**
   * Referme le formulaire des réglages de verrouillage sans enregistrer.
   */
  public fermerEditionVerrouillage(): void {
    this.verrouillageEditVisible.set(false);
  }

  /**
   * Valide le formulaire des réglages de verrouillage puis, si valide, ouvre la ressaisie du mot de passe
   * (RG-002).
   */
  public demanderEnregistrementVerrouillage(): void {
    if (this.delaiInactiviteMinutesFormulaire <= 0 || this.echecsAvantFermetureFormulaire <= 0) {
      this.messageErreur = 'Le délai et le nombre d’échecs doivent être des entiers positifs.';
      return;
    }
    this.messageErreur = null;
    this.reglageEnAttenteMotDePasse.set('verrouillage');
  }

  /**
   * Enregistre les réglages de verrouillage après confirmation du mot de passe (US-034, RG-002, RG-031).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrementVerrouillage(motDePasse: string): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.definirVerrouillage(
      this.delaiInactiviteMinutesFormulaire,
      this.echecsAvantFermetureFormulaire,
      motDePasse,
    );
    this.enCours.set(false);
    this.reglageEnAttenteMotDePasse.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.verrouillageEditVisible.set(false);
    this.notification.succes('Les réglages de verrouillage ont été enregistrés.');
  }

  // --- Concurrence d'audit ---

  /** Visibilité du formulaire d'édition de la concurrence d'audit. */
  public readonly concurrenceEditVisible: WritableSignal<boolean> = signal(false);
  public concurrenceFormulaire = 0;

  /**
   * Ouvre le formulaire pré-rempli de la concurrence d'audit par défaut.
   */
  public ouvrirEditionConcurrence(): void {
    this.concurrenceFormulaire =
      this.donneesApplication.racine()?.parametres.audit.concurrence ?? 4;
    this.messageErreur = null;
    this.concurrenceEditVisible.set(true);
  }

  /**
   * Referme le formulaire de concurrence d'audit sans enregistrer.
   */
  public fermerEditionConcurrence(): void {
    this.concurrenceEditVisible.set(false);
  }

  /**
   * Valide le formulaire de concurrence d'audit puis, si valide, ouvre la ressaisie du mot de passe (RG-002).
   */
  public demanderEnregistrementConcurrence(): void {
    if (this.concurrenceFormulaire <= 0) {
      this.messageErreur = 'La concurrence doit être un entier positif.';
      return;
    }
    this.messageErreur = null;
    this.reglageEnAttenteMotDePasse.set('concurrenceAudit');
  }

  /**
   * Enregistre la concurrence d'audit après confirmation du mot de passe (US-034, RG-002, RG-031).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrementConcurrence(motDePasse: string): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.definirConcurrenceAudit(
      this.concurrenceFormulaire,
      motDePasse,
    );
    this.enCours.set(false);
    this.reglageEnAttenteMotDePasse.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.concurrenceEditVisible.set(false);
    this.notification.succes('La concurrence d’audit a été enregistrée.');
  }

  // --- Proxy ---

  /** Visibilité du formulaire d'édition du proxy. */
  public readonly proxyEditVisible: WritableSignal<boolean> = signal(false);
  public urlProxyFormulaire = '';
  public cheminBundleCaFormulaire = '';

  /**
   * Ouvre le formulaire pré-rempli du réglage de proxy.
   */
  public ouvrirEditionProxy(): void {
    const proxy = this.donneesApplication.racine()?.parametres.proxy;
    this.urlProxyFormulaire = proxy?.url ?? '';
    this.cheminBundleCaFormulaire = proxy?.cheminBundleCa ?? '';
    this.messageErreur = null;
    this.proxyEditVisible.set(true);
  }

  /**
   * Referme le formulaire de proxy sans enregistrer.
   */
  public fermerEditionProxy(): void {
    this.proxyEditVisible.set(false);
  }

  /**
   * Ouvre la ressaisie du mot de passe pour le réglage de proxy (aucune validation cliente au-delà de la syntaxe
   * d'URL déjà imposée par `type="url"`, revalidée de toute façon côté cœur natif, RG-031).
   */
  public demanderEnregistrementProxy(): void {
    this.messageErreur = null;
    this.reglageEnAttenteMotDePasse.set('proxy');
  }

  /**
   * Enregistre le réglage de proxy après confirmation du mot de passe (US-034, RG-002, RG-031). Une URL et un
   * chemin tous deux vides effacent le réglage (retour au seul proxy système).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrementProxy(motDePasse: string): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.definirProxy(
      this.urlProxyFormulaire.trim() || undefined,
      this.cheminBundleCaFormulaire.trim() || undefined,
      motDePasse,
    );
    this.enCours.set(false);
    this.reglageEnAttenteMotDePasse.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.proxyEditVisible.set(false);
    this.notification.succes('Le réglage de proxy a été enregistré.');
  }

  // --- Nombre de sauvegardes de sécurité ---

  /** Visibilité du formulaire d'édition du nombre de sauvegardes de sécurité. */
  public readonly nombreSauvegardesEditVisible: WritableSignal<boolean> = signal(false);
  public nombreSauvegardesFormulaire = 0;

  /**
   * Ouvre le formulaire pré-rempli du nombre de sauvegardes de sécurité conservées.
   */
  public ouvrirEditionNombreSauvegardes(): void {
    this.nombreSauvegardesFormulaire =
      this.donneesApplication.racine()?.parametres.sauvegarde.nombreSauvegardesSecurite ?? 5;
    this.messageErreur = null;
    this.nombreSauvegardesEditVisible.set(true);
  }

  /**
   * Referme le formulaire de nombre de sauvegardes sans enregistrer.
   */
  public fermerEditionNombreSauvegardes(): void {
    this.nombreSauvegardesEditVisible.set(false);
  }

  /**
   * Valide le formulaire du nombre de sauvegardes puis, si valide, ouvre la ressaisie du mot de passe (RG-002).
   */
  public demanderEnregistrementNombreSauvegardes(): void {
    if (this.nombreSauvegardesFormulaire <= 0) {
      this.messageErreur = 'Le nombre de sauvegardes doit être un entier positif.';
      return;
    }
    this.messageErreur = null;
    this.reglageEnAttenteMotDePasse.set('nombreSauvegardes');
  }

  /**
   * Enregistre le nombre de sauvegardes de sécurité après confirmation du mot de passe (US-034, RG-002, RG-003,
   * RG-031).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrementNombreSauvegardes(motDePasse: string): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.definirNombreSauvegardesSecurite(
      this.nombreSauvegardesFormulaire,
      motDePasse,
    );
    this.enCours.set(false);
    this.reglageEnAttenteMotDePasse.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.nombreSauvegardesEditVisible.set(false);
    this.notification.succes('Le nombre de sauvegardes de sécurité a été enregistré.');
  }

  // --- Seuil d'avertissement de taille (US-035, RG-032) ---

  /** Visibilité du formulaire d'édition du seuil d'avertissement de taille. */
  public readonly seuilAvertissementEditVisible: WritableSignal<boolean> = signal(false);

  /** Seuil saisi par l'utilisateur, en mébioctets (converti en octets à l'enregistrement). */
  public seuilAvertissementMoFormulaire = 0;

  /**
   * Seuil d'avertissement de taille actuellement en vigueur, en mébioctets arrondis (US-035).
   * @returns Le seuil actuel, en Mo.
   */
  public seuilAvertissementMoActuel(): number {
    const octets = this.donneesApplication.racine()?.parametres.seuilAvertissementTailleOctets ?? 0;
    return Math.round(octets / (1024 * 1024));
  }

  /**
   * Ouvre le formulaire pré-rempli du seuil d'avertissement de taille.
   */
  public ouvrirEditionSeuilAvertissement(): void {
    this.seuilAvertissementMoFormulaire = this.seuilAvertissementMoActuel();
    this.messageErreur = null;
    this.seuilAvertissementEditVisible.set(true);
  }

  /**
   * Referme le formulaire du seuil d'avertissement sans enregistrer.
   */
  public fermerEditionSeuilAvertissement(): void {
    this.seuilAvertissementEditVisible.set(false);
  }

  /**
   * Valide le formulaire du seuil d'avertissement puis, si valide, ouvre la ressaisie du mot de passe (RG-002).
   */
  public demanderEnregistrementSeuilAvertissement(): void {
    if (this.seuilAvertissementMoFormulaire <= 0) {
      this.messageErreur = 'Le seuil doit être un nombre de mébioctets positif.';
      return;
    }
    this.messageErreur = null;
    this.reglageEnAttenteMotDePasse.set('seuilAvertissement');
  }

  /**
   * Enregistre le seuil d'avertissement de taille après confirmation du mot de passe (US-035, RG-002, RG-031,
   * RG-032).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerEnregistrementSeuilAvertissement(motDePasse: string): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.definirSeuilAvertissementTaille(
      Math.round(this.seuilAvertissementMoFormulaire * 1024 * 1024),
      motDePasse,
    );
    this.enCours.set(false);
    this.reglageEnAttenteMotDePasse.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur(this.libelleAnomalie(resultat.anomalie));
      return;
    }
    this.seuilAvertissementEditVisible.set(false);
    this.notification.succes('Le seuil d’avertissement de taille a été enregistré.');
  }

  /**
   * Annule la ressaisie du mot de passe en cours, quel que soit le réglage qui l'avait demandée.
   */
  public annulerMotDePasse(): void {
    this.reglageEnAttenteMotDePasse.set(null);
  }

  /**
   * Traduit une anomalie typée en message lisible par l'utilisateur, sans détail technique sensible.
   * @param anomalie - Anomalie remontée par la commande native.
   * @returns Le message à afficher.
   */
  private libelleAnomalie(anomalie: ErreurAdministration): string {
    switch (anomalie.type) {
      case 'reglageApplicatifInvalide':
        return 'Ce réglage n’est pas valide.';
      case 'fichierVerrouille':
        return 'Le fichier de données est verrouillé par un autre processus.';
      case 'motDePasseOuFichierInvalide':
        return 'Mot de passe incorrect.';
      case 'sessionVerrouillee':
        return 'La session est verrouillée : déverrouillez-la avant de sauvegarder.';
      case 'motDePasseSessionDivergent':
        return 'Le mot de passe saisi ne correspond pas à celui de la session en cours.';
      case 'motifDependanceDejaExistant':
      case 'libelleCategorieDependanceDejaExistant':
      case 'entreeReferentielInvalide':
      case 'entreeReferentielIntrouvable':
      case 'motifNommageBranchesInvalide':
      case 'typeReferentielInconnu':
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
      case 'annotationIntrouvable':
      case 'annotationSystemeNonSupprimable':
      case 'nouveauMotDePasseInvalide':
      case 'erreurInterne':
        return "Une erreur inattendue est survenue lors de l'enregistrement.";
    }
  }
}
