// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Liste de travail (US-020, Phase 8) : centralise l'ensemble des alertes actives, tous groupes et projets
// confondus (RG-026), avec les membres inconnus toujours en tête (critère d'acceptation littéral de US-020, cf.
// `docs/02_documentation/04_casUsage.md#cas-dusage--user-stories`). Reprend et généralise la détection de causes de
// membre inconnu déjà construite pour l'encart de l'Accueil (Phase 6, incrément 3,
// `SqmAccueilComponent.causesMembreInconnu`) : ici sur l'ENSEMBLE des projets (pas de plafond à 3), enrichie de la
// gravité RG-010 (`StatutMembreUtils.calculerGraviteAlerteMembreInconnu`) et des colonnes attendues par la maquette
// (`docs/02_documentation/09_maquettes.md#liste-de-travail` : gravité, projet, groupe, description, date de
// première détection, statut vu/traité avec commentaire et horodatage).
//
// Décision d'architecture (à valider par un humain, cf. rapport de développement de cette phase) :
// `AlertesAccueilUtils.calculerAlertesActives` (Phase 6) ne restitue la mention de traitement antérieur que pour la
// dernière entrée `traitee` d'une clé (usage Accueil : signaler une réapparition, RG-026) ; il ne distingue pas une
// entrée `vue` d'une absence totale d'historique, insuffisant pour restituer ici le statut COURANT affiché en
// colonne. Ce composant recherche donc lui-même, pour chaque alerte, l'entrée `traitementsAlertes` la plus récente
// (même principe que `AlertesAccueilUtils.trouverTraitementAnterieur`, dupliqué localement plutôt que généralisé
// dans ce module partagé pour ne pas complexifier son usage Accueil, plus simple).
//
// Décision arbitraire (à valider par un humain) : aucune donnée persistée ne porte la date de première détection
// d'une alerte (ni `Annotation`, ni `TraitementAlerte`, cf. `docs/02_documentation/12_modeleDonnees.md`) ; la
// colonne « détectée depuis » restitue donc l'horodatage de la plus ANCIENNE entrée `traitementsAlertes` connue
// pour cette clé (première interaction humaine), `—` si l'alerte n'a jamais encore été vue ni traitée.
//
// Décision arbitraire (à valider par un humain) : le tableau dense générique (`SqmTableauDenseComponent`, Phase 6)
// ne porte aucune action de cellule (seuls des segments texte/badge/icône passifs, cf. son commentaire d'en-tête) ;
// « marquer vu »/« traiter avec commentaire » sont donc portés par un panneau de traitement dédié, ouvert par
// activation de la ligne concernée (`activerLigne`), plutôt que par un bouton en cellule. L'accès à la Fiche projet
// (arborescence : « Liste de travail a un enfant contextuel Fiche projet, accès par clic sur une alerte ») est
// proposé comme une action explicite de ce même panneau plutôt que déclenché directement par l'activation de ligne,
// pour ne pas faire disparaître silencieusement le panneau de traitement à chaque simple consultation.
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { Params } from '@angular/router';
import { SqmConfirmationMotDePasseComponent } from '../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
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
} from '../../composants/tableau-dense/tableau-dense.component';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import type { Groupe, TraitementAlerte } from '../../services/avecetat/etat/types-donnees';
import {
  StatutTraitementAlerte,
  TypeCritereMembre,
} from '../../services/avecetat/etat/types-donnees';
import type { MembreGitlab } from '../../services/sansetat/commandes/types-facade';
import { HorodatageUtils } from '../../services/sansetat/jugement/horodatage.utils';
import { StatutMembreUtils } from '../../services/sansetat/jugement/statut-membre.utils';
import type { GraviteAlerteMembreInconnu } from '../../services/sansetat/jugement/statut-membre.utils';
import { VuesEnregistreesUtils } from '../../services/sansetat/jugement/vues-enregistrees.utils';
import type {
  ResultatFiltrageVues,
  VueEnregistreeConnue,
} from '../../services/sansetat/jugement/vues-enregistrees.utils';

/**
 * Identifiant stable de cet écran pour les vues enregistrées (US-028, RG-027).
 */
const ECRAN_LISTE_TRAVAIL = 'listeTravail';

/**
 * Version courante du schéma de filtres de cet écran (US-028, RG-027) : à incrémenter si la forme de
 * {@link FiltresListeTravail} change, pour que `VuesEnregistreesUtils.filtrerPourEcran` ignore avec avertissement
 * les vues enregistrées par un schéma antérieur incompatible (cf.
 * `docs/02_documentation/12_modeleDonnees.md#stratégie-de-migration-des-données`).
 */
const VERSION_FILTRES_LISTE_TRAVAIL = 1;

/**
 * Forme des filtres de cet écran persistée par une vue enregistrée (US-028). Seul `filtreGroupeId` est aujourd'hui
 * un filtre à proprement parler ; `texteRecherche` est volontairement exclu (recherche ponctuelle, non un critère
 * de vue durable, cf. RG-027 : « groupes, projets, indicateurs, période, tri »).
 */
interface FiltresListeTravail {
  readonly groupeId: string | null;
}

/**
 * Préfixe de clé d'alerte des causes de membre inconnu (RG-006 à RG-009), seul type d'alerte actuellement
 * détectable par ce projet (cf. commentaire d'en-tête de `accueil.component.ts`) : sert de premier critère de tri
 * pour garantir « les membres inconnus toujours en tête » (US-020) même une fois d'autres types d'alerte ajoutés.
 */
const PREFIXE_CLE_MEMBRE_INCONNU = 'membreInconnu|';

/**
 * Ordre de gravité RG-010, du plus grave au moins grave.
 */
const ORDRE_GRAVITE: Readonly<Record<GraviteAlerteMembreInconnu, number>> = {
  elevee: 0,
  moderee: 1,
};

/**
 * Ligne du tableau de la Liste de travail : une alerte active, enrichie de sa gravité (RG-010), de sa localisation
 * et de son statut de traitement courant (RG-026).
 */
interface LigneAlerteTravail {
  /** Clé stable de l'alerte (RG-026). */
  readonly cleAlerte: string;
  /** Libellé affichable de l'alerte. */
  readonly libelle: string;
  /** Gravité de l'alerte (RG-010). */
  readonly gravite: GraviteAlerteMembreInconnu;
  /** Identifiant du projet concerné. */
  readonly projetId: string;
  /** Nom du projet concerné. */
  readonly nomProjet: string;
  /** Identifiant du groupe de rattachement. */
  readonly groupeId: string;
  /** Nom du groupe de rattachement. */
  readonly nomGroupe: string;
  /**
   * Critère par défaut proposé pour pré-remplir le formulaire de création d'une règle de membre connu (bouton
   * « Qualifier ce membre », cf. {@link SqmListeTravailComponent.qualifierMembre}), sur le modèle exact de
   * `LigneMembre.critereParDefautQualification` (`fiche-projet.component.ts`) : présent uniquement pour une alerte
   * de membre réellement `inconnu`, absent pour un `conflit` (liste des règles existantes à consulter plutôt
   * qu'une création).
   */
  readonly critereParDefautQualification:
    { readonly type: TypeCritereMembre; readonly valeur: string } | undefined;
  /** Statut de traitement courant, `null` si l'alerte n'a jamais été vue ni traitée. */
  readonly statut: StatutTraitementAlerte | null;
  /** Commentaire du dernier traitement, s'il en portait un. */
  readonly commentaire: string | undefined;
  /** Horodatage de la plus ancienne entrée de traitement connue (décision arbitraire, cf. commentaire d'en-tête). */
  readonly detecteeDepuis: string | undefined;
}

/**
 * Action en attente de ressaisie du mot de passe (RG-002).
 */
type ActionEnAttente = 'vu' | 'traitement' | null;

/**
 * Écran Liste de travail (US-020) : centralise les alertes actives, membres inconnus toujours en tête, permet de
 * les marquer vues ou traitées avec commentaire.
 */
@Component({
  selector: 'app-liste-travail',
  imports: [
    FormsModule,
    SqmTableauDenseComponent,
    SqmConfirmationMotDePasseComponent,
    SqmSelecteurVueComponent,
  ],
  templateUrl: './liste-travail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './liste-travail.component.scss',
})
export class SqmListeTravailComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);

  private readonly router: Router = inject(Router);
  private readonly notification: NotificationService = inject(NotificationService);

  /**
   * Indique que la vue par défaut de cet écran (US-028, RG-027) a déjà été appliquée une fois, pour ne
   * l'appliquer qu'une seule fois par instance de ce composant même si `vuesApplicables` est recalculé ensuite
   * (ex. après la création d'une nouvelle vue).
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
   * Identifiant du groupe sélectionné dans le filtre, `null` = tous les groupes.
   */
  public readonly filtreGroupeId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Texte de recherche courant (nom de projet ou libellé de l'alerte).
   */
  public readonly texteRecherche: WritableSignal<string> = signal('');

  /**
   * Clé de l'alerte actuellement sélectionnée pour traitement, `null` si aucun panneau n'est ouvert.
   */
  public readonly alerteSelectionneeCle: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /**
   * Commentaire saisi dans le panneau de traitement.
   */
  public commentaire = '';

  /**
   * Action en attente de ressaisie du mot de passe (RG-002), `null` si aucune boîte de ressaisie n'est affichée.
   * Porté par un signal (plutôt qu'une simple propriété) car mis à jour depuis la continuation asynchrone de
   * `confirmerQualification`, hors de toute planification automatique de détection de changement dans une
   * application zoneless : seule une écriture de signal est garantie de déclencher un nouveau rendu à ce moment-là.
   */
  public readonly actionEnAttenteMotDePasse: WritableSignal<ActionEnAttente> =
    signal<ActionEnAttente>(null);

  /**
   * Indique qu'un appel à une commande native est en cours, pour désactiver les actions concurrentes. Signal pour
   * le même motif que {@link actionEnAttenteMotDePasse}.
   */
  public readonly enCours: WritableSignal<boolean> = signal(false);

  /**
   * Ensemble complet des alertes actives, membres inconnus toujours en tête (RG-009, US-020), non filtré.
   */
  public readonly toutesLesAlertes: Signal<readonly LigneAlerteTravail[]> = computed(() =>
    this.construireAlertes(),
  );

  /**
   * Alertes après application des filtres courants (groupe, recherche texte).
   */
  public readonly alertesFiltrees: Signal<readonly LigneAlerteTravail[]> = computed(() => {
    const groupeId = this.filtreGroupeId();
    const texte = this.texteRecherche().trim().toLowerCase();
    return this.toutesLesAlertes().filter((ligne) => {
      if (groupeId !== null && !this.appartientAuGroupe(ligne, groupeId)) {
        return false;
      }
      if (texte.length === 0) {
        return true;
      }
      return (
        ligne.nomProjet.toLowerCase().includes(texte) || ligne.libelle.toLowerCase().includes(texte)
      );
    });
  });

  /**
   * Résultat du filtrage des vues enregistrées de cet écran par version de filtres courante (US-028, RG-027) :
   * vues applicables et nombre de vues ignorées pour cause de version de filtres obsolète (cf.
   * `docs/02_documentation/12_modeleDonnees.md#stratégie-de-migration-des-données`).
   */
  private readonly resultatFiltrageVues: Signal<ResultatFiltrageVues> = computed(() => {
    const connues: readonly VueEnregistreeConnue[] =
      this.donneesApplication.racine()?.vuesEnregistrees ?? [];
    return VuesEnregistreesUtils.filtrerPourEcran(
      connues,
      ECRAN_LISTE_TRAVAIL,
      VERSION_FILTRES_LISTE_TRAVAIL,
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
   * Indique qu'aucune alerte n'est active (état particulier de la maquette : message explicite, jamais un tableau
   * vide silencieux).
   * @returns `true` si aucune alerte n'est actuellement active.
   */
  public aucuneAlerte(): boolean {
    return this.toutesLesAlertes().length === 0;
  }

  /**
   * Applique le filtre de groupe sélectionné.
   * @param valeur - Identifiant du groupe sélectionné, chaîne vide = tous les groupes.
   */
  public onChangerGroupe(valeur: string): void {
    this.filtreGroupeId.set(valeur.length === 0 ? null : valeur);
  }

  /**
   * Applique le texte de recherche saisi.
   * @param valeur - Texte saisi.
   */
  public onChangerRecherche(valeur: string): void {
    this.texteRecherche.set(valeur);
  }

  /**
   * Applique les filtres portés par une vue enregistrée choisie dans `SqmSelecteurVueComponent` (US-028).
   * Ignore silencieusement une vue dont les filtres ne correspondent pas structurellement à
   * {@link FiltresListeTravail} (aucun accès non sûr à une valeur JSON externe) : ce cas ne devrait jamais se
   * produire en pratique, `vuesApplicables` étant déjà restreint à la version de filtres courante de cet écran.
   * @param vue - Vue choisie, dont `filtres` reste typé `unknown` côté composant transverse.
   */
  public appliquerVue(vue: VueSelectionnable): void {
    if (!SqmListeTravailComponent.estFiltresListeTravail(vue.filtres)) {
      return;
    }
    this.filtreGroupeId.set(vue.filtres.groupeId);
  }

  /**
   * Vérifie structurellement qu'une valeur JSON externe (`VueEnregistree.filtres`) correspond bien à
   * {@link FiltresListeTravail}, avant tout accès à ses champs (aucun accès non sûr à une valeur JSON externe, cf.
   * `docs/02_documentation/14_normesDeveloppement.md#rigueur-du-typage-et-de-la-documentation--typescript`).
   * @param valeur - Valeur à vérifier.
   * @returns `true` si `valeur` correspond à la forme attendue.
   */
  private static estFiltresListeTravail(valeur: unknown): valeur is FiltresListeTravail {
    if (typeof valeur !== 'object' || valeur === null || !('groupeId' in valeur)) {
      return false;
    }
    const groupeId: unknown = valeur.groupeId;
    return groupeId === null || typeof groupeId === 'string';
  }

  /**
   * Crée ou met à jour une vue enregistrée avec les filtres courants (US-028, RG-027, RG-002) : invoque
   * `DonneesApplicationService.definirVue`, sauvegarde effective incluse.
   * @param demande - Nom, statut par défaut, identifiant de mise à jour éventuel et mot de passe déjà confirmés par
   * `SqmSelecteurVueComponent`.
   */
  public async enregistrerVue(demande: DemandeEnregistrementVue): Promise<void> {
    const filtres: FiltresListeTravail = { groupeId: this.filtreGroupeId() };
    const resultat = await this.donneesApplication.definirVue(
      demande.id,
      demande.nom,
      ECRAN_LISTE_TRAVAIL,
      VERSION_FILTRES_LISTE_TRAVAIL,
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
   * Supprime une vue enregistrée (US-028, RG-002) : invoque `DonneesApplicationService.supprimerVue`, sauvegarde
   * effective incluse.
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
   * Extrait l'identifiant stable d'une ligne, transmis à `SqmTableauDenseComponent`.
   * @param ligne - Ligne concernée.
   * @returns La clé d'alerte de cette ligne.
   */
  public identifiantLigne(ligne: LigneAlerteTravail): string {
    return ligne.cleAlerte;
  }

  /**
   * Colonnes du tableau dense de la Liste de travail (cf. `docs/02_documentation/09_maquettes.md#liste-de-travail`
   * : gravité, projet, groupe, description, date de première détection, statut).
   * @returns Les colonnes à afficher.
   */
  public colonnes(): readonly ColonneTableauDense<LigneAlerteTravail>[] {
    return [
      {
        cle: 'gravite',
        libelle: 'Gravité',
        triable: true,
        extraireTexteBrut: (ligne) => ligne.gravite,
        extraireCellule: (ligne) => this.extraireCelluleGravite(ligne),
      },
      {
        cle: 'projet',
        libelle: 'Projet',
        triable: true,
        extraireTexteBrut: (ligne) => ligne.nomProjet,
        extraireCellule: (ligne) => ({ segments: [{ type: 'texte', valeur: ligne.nomProjet }] }),
      },
      {
        cle: 'groupe',
        libelle: 'Groupe',
        triable: true,
        extraireTexteBrut: (ligne) => ligne.nomGroupe,
        extraireCellule: (ligne) => ({ segments: [{ type: 'texte', valeur: ligne.nomGroupe }] }),
      },
      {
        cle: 'description',
        libelle: 'Description',
        extraireTexteBrut: (ligne) => ligne.libelle,
        extraireCellule: (ligne) => ({ segments: [{ type: 'texte', valeur: ligne.libelle }] }),
      },
      {
        cle: 'detecteeDepuis',
        libelle: 'Détectée depuis',
        triable: true,
        extraireTexteBrut: (ligne) => ligne.detecteeDepuis ?? '',
        extraireCellule: (ligne) => ({
          segments: [
            { type: 'texte', valeur: HorodatageUtils.formaterDateAvecRepli(ligne.detecteeDepuis) },
          ],
        }),
      },
      {
        cle: 'statut',
        libelle: 'Statut',
        triable: true,
        extraireTexteBrut: (ligne) => ligne.statut ?? '',
        extraireCellule: (ligne) => this.extraireCelluleStatut(ligne),
      },
    ];
  }

  /**
   * Ouvre le panneau de traitement de l'alerte activée (clic ou touche Entrée sur la ligne).
   * @param ligne - Ligne activée par l'utilisateur.
   */
  public activerLigne(ligne: LigneAlerteTravail): void {
    this.alerteSelectionneeCle.set(ligne.cleAlerte);
    this.commentaire = '';
  }

  /**
   * Alerte actuellement sélectionnée pour traitement, `undefined` si aucune (panneau fermé).
   * @returns La ligne sélectionnée, `undefined` sinon.
   */
  public alerteSelectionnee(): LigneAlerteTravail | undefined {
    const cle = this.alerteSelectionneeCle();
    return cle === null
      ? undefined
      : this.toutesLesAlertes().find((ligne) => ligne.cleAlerte === cle);
  }

  /**
   * Referme le panneau de traitement sans qualifier l'alerte.
   */
  public fermerPanneau(): void {
    this.alerteSelectionneeCle.set(null);
  }

  /**
   * Ouvre la ressaisie du mot de passe (RG-002) avant de marquer l'alerte sélectionnée comme vue.
   */
  public demanderMarquerVu(): void {
    this.actionEnAttenteMotDePasse.set('vu');
  }

  /**
   * Ouvre la ressaisie du mot de passe (RG-002) avant de marquer l'alerte sélectionnée comme traitée.
   */
  public demanderTraiter(): void {
    this.actionEnAttenteMotDePasse.set('traitement');
  }

  /**
   * Annule la ressaisie du mot de passe en cours, quelle que soit l'action qui l'avait demandée.
   */
  public annulerMotDePasse(): void {
    this.actionEnAttenteMotDePasse.set(null);
  }

  /**
   * Qualifie l'alerte sélectionnée après confirmation du mot de passe (US-020, RG-002, RG-026).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public async confirmerQualification(motDePasse: string): Promise<void> {
    const cle = this.alerteSelectionneeCle();
    const action = this.actionEnAttenteMotDePasse();
    if (cle === null || action === null) {
      this.actionEnAttenteMotDePasse.set(null);
      return;
    }
    const statut = action === 'vu' ? StatutTraitementAlerte.Vue : StatutTraitementAlerte.Traitee;
    const commentaire = this.commentaire.trim().length > 0 ? this.commentaire.trim() : undefined;

    this.enCours.set(true);
    const resultat = await this.donneesApplication.qualifierAlerte(
      cle,
      statut,
      commentaire,
      motDePasse,
    );
    this.enCours.set(false);
    this.actionEnAttenteMotDePasse.set(null);

    if (resultat.type === 'echec') {
      this.notification.erreur('Une erreur inattendue est survenue lors de la qualification.');
      return;
    }
    this.alerteSelectionneeCle.set(null);
  }

  /**
   * Navigue vers la Fiche projet du projet concerné par l'alerte sélectionnée (arborescence : « Liste de travail a
   * un enfant contextuel Fiche projet, accès par clic sur une alerte »).
   */
  public ouvrirFicheProjet(): void {
    const alerte = this.alerteSelectionnee();
    if (alerte === undefined) {
      return;
    }
    void this.router.navigateByUrl(`/fiche-projet/${alerte.projetId}`);
  }

  /**
   * Indique si l'alerte concerne la gestion d'un membre inconnu (seul cas où {@link qualifierMembre} est
   * pertinent), sur le même critère que {@link comparerAlertes} (préparé pour d'autres types d'alerte, cf.
   * commentaire de `PREFIXE_CLE_MEMBRE_INCONNU`).
   * @param alerte - Ligne d'alerte concernée.
   * @returns `true` si cette alerte est une alerte de membre inconnu.
   */
  public estAlerteMembreInconnu(alerte: LigneAlerteTravail): boolean {
    return alerte.cleAlerte.startsWith(PREFIXE_CLE_MEMBRE_INCONNU);
  }

  /**
   * Navigue vers l'écran Administration pour qualifier le membre de l'alerte sélectionnée (sous-onglet Membres
   * connus du bon groupe, formulaire de création pré-rempli), sur le modèle exact du lien « Qualifier ce membre »
   * de la Fiche projet (`fiche-projet.component.ts`).
   */
  public qualifierMembre(): void {
    const alerte = this.alerteSelectionnee();
    if (alerte === undefined) {
      return;
    }
    void this.router.navigate(['/administration'], {
      queryParams: this.queryParamsQualification(alerte),
    });
  }

  /**
   * Construit les paramètres de requête du bouton « Qualifier ce membre » (cf. {@link qualifierMembre}).
   * @param alerte - Ligne d'alerte concernée.
   * @returns Les paramètres de requête à transmettre à `Router.navigate`.
   */
  private queryParamsQualification(alerte: LigneAlerteTravail): Params {
    if (alerte.critereParDefautQualification === undefined) {
      return { groupeId: alerte.groupeId };
    }
    return {
      groupeId: alerte.groupeId,
      typeCritere: alerte.critereParDefautQualification.type,
      critere: alerte.critereParDefautQualification.valeur,
    };
  }

  /**
   * Restitue la cellule « Gravité » sous forme de badge (rouge pour élevée, orange pour modérée).
   * @param ligne - Ligne concernée.
   * @returns La cellule calculée.
   */
  private extraireCelluleGravite(ligne: LigneAlerteTravail): CelluleTableauDense {
    return {
      segments: [
        {
          type: 'badge',
          libelle: ligne.gravite === 'elevee' ? 'Élevée' : 'Modérée',
          couleur: ligne.gravite === 'elevee' ? 'rouge' : 'orange',
        },
      ],
    };
  }

  /**
   * Restitue la cellule « Statut » : texte brut, jamais de couleur inventée (aucune sémantique de gravité propre au
   * statut de traitement, à la différence de la colonne Gravité).
   * @param ligne - Ligne concernée.
   * @returns La cellule calculée.
   */
  private extraireCelluleStatut(ligne: LigneAlerteTravail): CelluleTableauDense {
    const libelle = this.libelleStatut(ligne);
    return { segments: [{ type: 'texte', valeur: libelle }] };
  }

  /**
   * Libellé lisible du statut de traitement courant d'une alerte, complété du commentaire s'il en porte un.
   * @param ligne - Ligne concernée.
   * @returns Le libellé à afficher.
   */
  public libelleStatut(ligne: LigneAlerteTravail): string {
    if (ligne.statut === null) {
      return 'Non vue';
    }
    const base = ligne.statut === StatutTraitementAlerte.Traitee ? 'Traitée' : 'Vue';
    return ligne.commentaire ? `${base} — ${ligne.commentaire}` : base;
  }

  /**
   * Indique si une ligne appartient au groupe désigné.
   * @param ligne - Ligne concernée.
   * @param groupeId - Identifiant du groupe recherché.
   * @returns `true` si le projet de cette ligne appartient au groupe désigné.
   */
  private appartientAuGroupe(ligne: LigneAlerteTravail, groupeId: string): boolean {
    const groupe = this.donneesApplication.groupes().find((candidat) => candidat.id === groupeId);
    return groupe?.projets.some((projet) => projet.id === ligne.projetId) ?? false;
  }

  /**
   * Construit l'ensemble des alertes actives (RG-006 à RG-009, RG-010, RG-026), triées membres inconnus en tête
   * puis par gravité décroissante (US-020).
   * @returns Les alertes actives triées, tableau vide si aucun fichier n'est chargé.
   */
  private construireAlertes(): readonly LigneAlerteTravail[] {
    const racine = this.donneesApplication.racine();
    if (racine === null) {
      return [];
    }
    const traitements = racine.traitementsAlertes;
    const lignes: LigneAlerteTravail[] = [];
    for (const groupe of racine.groupes) {
      for (const projet of groupe.projets) {
        const dernierAudit = projet.audits.at(-1);
        if (dernierAudit === undefined) {
          continue;
        }
        for (const resultat of dernierAudit.resultats) {
          if (resultat.type !== 'gitlab.membres') {
            continue;
          }
          for (const membre of resultat.membres) {
            const resolution = StatutMembreUtils.calculerStatutMembre(
              { username: membre.username, email: membre.emailPublic },
              groupe.membresConnus,
            );
            if (resolution.type !== 'inconnu' && resolution.type !== 'conflit') {
              continue;
            }
            const cleAlerte = `${PREFIXE_CLE_MEMBRE_INCONNU}${projet.id}|${membre.username}`;
            const dernierTraitement = this.dernierTraitement(cleAlerte, traitements);
            lignes.push({
              cleAlerte,
              libelle: `Membre inconnu « ${membre.username} »`,
              gravite: StatutMembreUtils.calculerGraviteAlerteMembreInconnu(membre.niveauAcces),
              projetId: projet.id,
              nomProjet: projet.nom,
              groupeId: groupe.id,
              nomGroupe: groupe.nom,
              critereParDefautQualification:
                resolution.type === 'inconnu'
                  ? this.calculerCritereParDefautQualification(membre)
                  : undefined,
              statut: dernierTraitement?.statut ?? null,
              commentaire: dernierTraitement?.commentaire,
              detecteeDepuis: this.premiereDetection(cleAlerte, traitements),
            });
          }
        }
      }
    }
    return lignes.sort((a, b) => this.comparerAlertes(a, b));
  }

  /**
   * Calcule le critère par défaut à proposer pour qualifier un membre inconnu (bouton « Qualifier ce membre »),
   * dupliqué depuis `SqmFicheProjetComponent.calculerCritereParDefautQualification` (aucune dépendance directe
   * entre écrans) : domaine de son email public s'il en dispose (partie suivant le premier `@`), sinon son
   * username.
   * @param membre - Membre du dépôt constaté.
   * @returns Le critère par défaut et son type.
   */
  private calculerCritereParDefautQualification(membre: MembreGitlab): {
    type: TypeCritereMembre;
    valeur: string;
  } {
    const email = membre.emailPublic;
    const indexArobase = email !== undefined ? email.indexOf('@') : -1;
    if (email !== undefined && indexArobase >= 0) {
      return { type: TypeCritereMembre.DomaineEmail, valeur: email.slice(indexArobase + 1) };
    }
    return { type: TypeCritereMembre.Username, valeur: membre.username };
  }

  /**
   * Compare deux alertes pour le tri par défaut : membres inconnus toujours en tête (US-020), puis par gravité
   * décroissante (RG-010), puis alphabétiquement pour la stabilité de l'ordre.
   * @param a - Première alerte.
   * @param b - Seconde alerte.
   * @returns L'ordre relatif des deux alertes.
   */
  private comparerAlertes(a: LigneAlerteTravail, b: LigneAlerteTravail): number {
    const prioriteA = a.cleAlerte.startsWith(PREFIXE_CLE_MEMBRE_INCONNU) ? 0 : 1;
    const prioriteB = b.cleAlerte.startsWith(PREFIXE_CLE_MEMBRE_INCONNU) ? 0 : 1;
    if (prioriteA !== prioriteB) {
      return prioriteA - prioriteB;
    }
    if (ORDRE_GRAVITE[a.gravite] !== ORDRE_GRAVITE[b.gravite]) {
      return ORDRE_GRAVITE[a.gravite] - ORDRE_GRAVITE[b.gravite];
    }
    return a.libelle.localeCompare(b.libelle);
  }

  /**
   * Retrouve l'entrée de traitement la plus récente pour une clé d'alerte, sur le modèle de
   * `AlertesAccueilUtils.trouverTraitementAnterieur` (cf. commentaire d'en-tête : ne filtre pas sur le statut
   * `traitee`, à la différence de cette dernière, afin de restituer le statut COURANT quel qu'il soit).
   * @param cleAlerte - Clé stable de l'alerte recherchée.
   * @param traitements - Historique complet des statuts de traitement connus.
   * @returns L'entrée la plus récente, `undefined` si aucune n'existe pour cette clé.
   */
  private dernierTraitement(
    cleAlerte: string,
    traitements: readonly TraitementAlerte[],
  ):
    | { readonly statut: StatutTraitementAlerte; readonly commentaire: string | undefined }
    | undefined {
    const entrees = traitements.filter((traitement) => traitement.cleAlerte === cleAlerte);
    if (entrees.length === 0) {
      return undefined;
    }
    const plusRecente = entrees.reduce((plusRecenteConnue, candidate) =>
      new Date(candidate.horodatage).getTime() > new Date(plusRecenteConnue.horodatage).getTime()
        ? candidate
        : plusRecenteConnue,
    );
    return { statut: plusRecente.statut, commentaire: plusRecente.commentaire };
  }

  /**
   * Retrouve l'horodatage de la plus ancienne entrée de traitement connue pour une clé d'alerte (décision
   * arbitraire de restitution de la « date de première détection », cf. commentaire d'en-tête).
   * @param cleAlerte - Clé stable de l'alerte recherchée.
   * @param traitements - Historique complet des statuts de traitement connus.
   * @returns L'horodatage le plus ancien, `undefined` si aucune entrée n'existe pour cette clé.
   */
  private premiereDetection(
    cleAlerte: string,
    traitements: readonly TraitementAlerte[],
  ): string | undefined {
    const entrees = traitements.filter((traitement) => traitement.cleAlerte === cleAlerte);
    if (entrees.length === 0) {
      return undefined;
    }
    const plusAncienne = entrees.reduce((plusAncienneConnue, candidate) =>
      new Date(candidate.horodatage).getTime() < new Date(plusAncienneConnue.horodatage).getTime()
        ? candidate
        : plusAncienneConnue,
    );
    return plusAncienne.horodatage;
  }
}
