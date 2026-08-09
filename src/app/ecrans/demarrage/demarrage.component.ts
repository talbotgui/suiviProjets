// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran de Démarrage (US-001, US-002 ; RG-001, RG-002), écran « Accueil (avant ouverture d'un fichier) » de
// `docs/02_documentation/08_arborescenceNavigation.md`, jamais construit jusqu'ici (cf. diagnostic ayant motivé
// cette tâche). Nommé `SqmDemarrageComponent` plutôt que `SqmAccueilComponent` (décision validée par un humain
// avant cette tâche) pour lever l'ambiguïté documentaire déjà signalée trois fois dans
// `docs/04_rapports/rapportDeDeveloppement.md` entre cet écran et `SqmAccueilComponent` (résumé post-ouverture,
// US-005, déjà construit).
//
// Sélection de fichier exclusivement via la boîte de dialogue native de l'OS (`@tauri-apps/plugin-dialog`), jamais
// une saisie libre de chemin (docs/02_documentation/15_normesSecurite.md#contrôle-des-entrées-et-sorties). Appel
// passé par `SelecteurFichierUtils` (et non `save`/`open` directement) depuis le 2026-07-28 : ces deux fonctions
// invoquent en interne le pont IPC Tauri sans jamais tester `isTauri()` elles-mêmes, d'où un plantage sec hors
// contexte Tauri (`ng serve`) sans ce point de passage, cf. `selecteur-fichier.utils.ts`.
//
// Navigation après chargement (`08_arborescenceNavigation.md` : « Liste de travail si alertes non traitées,
// Synthèse des audits sinon ») : la détection de la seule cause d'alerte actuellement implémentée (membre inconnu,
// RG-006 à RG-009) est dupliquée localement à partir de `StatutMembreUtils.calculerStatutMembre`, sur le modèle
// déjà posé par `SqmAccueilComponent.causesMembreInconnu`/`SqmListeTravailComponent` (« dupliqué localement plutôt
// que généralisé », commentaire d'en-tête de `liste-travail.component.ts`) : ce composant n'a besoin que d'un
// booléen, pas de la liste enrichie construite par ces deux écrans.
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import type { CategorieErreurAdministration } from '../../services/avecetat/etat/types-donnees';
import { SelecteurFichierUtils } from '../../services/sansetat/commandes/selecteur-fichier.utils';
import { StatutMembreUtils } from '../../services/sansetat/jugement/statut-membre.utils';

/**
 * Filtre d'extension de la boîte de dialogue native, unique pour la création et le chargement (extension `.sqm`
 * déjà retenue par le projet, cf. `docs/03_plan/plan_13_developpement.md`).
 */
const FILTRE_FICHIER_DONNEES = [{ name: 'Fichier de données Qualimétrie', extensions: ['sqm'] }];

/**
 * Nom de fichier initial proposé par la boîte de dialogue de création.
 */
const NOM_FICHIER_PAR_DEFAUT = 'suivi-qualimetrie.sqm';

/**
 * Écran de Démarrage : point d'entrée de l'application avant l'ouverture d'un fichier de données (US-001, US-002).
 * Propose la création d'un nouveau fichier chiffré ou le chargement d'un fichier existant, chacun via la boîte de
 * dialogue native de sélection de fichier de l'OS.
 */
@Component({
  selector: 'app-demarrage',
  imports: [FormsModule],
  templateUrl: './demarrage.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './demarrage.component.scss',
})
export class SqmDemarrageComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly router: Router = inject(Router);

  /**
   * Chemin choisi pour le nouveau fichier, `null` tant qu'aucun emplacement n'a été choisi. Porté par un signal
   * (plutôt qu'une simple propriété) car mis à jour depuis la continuation asynchrone d'un appel à la boîte de
   * dialogue native, hors de toute planification automatique de détection de changement dans une application
   * zoneless (aucune dépendance `zone.js`, cf. `app.config.ts`) : seule une écriture de signal est garantie de
   * déclencher un nouveau rendu à ce moment-là, à la différence d'une propriété mutée après un `await` (bug
   * constaté : le chemin ne s'affichait qu'après une interaction ultérieure sans rapport, ex. saisie du mot de
   * passe).
   */
  public readonly cheminCreation: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Mot de passe saisi pour le nouveau fichier.
   */
  public readonly motDePasseCreation: WritableSignal<string> = signal('');

  /**
   * Confirmation du mot de passe saisi pour le nouveau fichier (parcours documenté : « Saisit et confirme le mot
   * de passe du futur fichier »).
   */
  public readonly confirmationMotDePasseCreation: WritableSignal<string> = signal('');

  /**
   * Message d'erreur du formulaire de création, `null` si aucune erreur.
   */
  public readonly messageErreurCreation: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /**
   * Indique qu'une création est en cours, pour désactiver le bouton de soumission le temps de l'appel natif.
   */
  public readonly creationEnCours: WritableSignal<boolean> = signal(false);

  /**
   * Chemin du fichier choisi pour le chargement, `null` tant qu'aucun fichier n'a été choisi. Signal pour le même
   * motif que {@link cheminCreation}.
   */
  public readonly cheminChargement: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Mot de passe saisi pour le chargement du fichier choisi.
   */
  public readonly motDePasseChargement: WritableSignal<string> = signal('');

  /**
   * Message d'erreur du formulaire de chargement, `null` si aucune erreur.
   */
  public readonly messageErreurChargement: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /**
   * Indique qu'un chargement est en cours, pour désactiver le bouton de soumission le temps de l'appel natif.
   */
  public readonly chargementEnCours: WritableSignal<boolean> = signal(false);

  /**
   * Ouvre la boîte de dialogue native de sélection d'emplacement pour le nouveau fichier (US-001).
   */
  public async choisirEmplacementCreation(): Promise<void> {
    const chemin = await SelecteurFichierUtils.choisirEmplacementCreation({
      filters: FILTRE_FICHIER_DONNEES,
      defaultPath: NOM_FICHIER_PAR_DEFAUT,
    });
    if (chemin !== null) {
      this.cheminCreation.set(chemin);
      this.messageErreurCreation.set(null);
    }
  }

  /**
   * Valide le formulaire de création puis crée le fichier (US-001, RG-001, RG-002) : redirige vers Administration
   * en cas de succès (parcours documenté : « ouvre le shell applicatif sur Administration »).
   */
  public async creerFichier(): Promise<void> {
    this.messageErreurCreation.set(null);
    const cheminCreation = this.cheminCreation();
    if (cheminCreation === null) {
      this.messageErreurCreation.set('Choisissez un emplacement pour le nouveau fichier.');
      return;
    }
    const motDePasseCreation = this.motDePasseCreation();
    if (motDePasseCreation.length === 0) {
      this.messageErreurCreation.set('Le mot de passe est obligatoire.');
      return;
    }
    if (motDePasseCreation !== this.confirmationMotDePasseCreation()) {
      this.messageErreurCreation.set('La confirmation ne correspond pas au mot de passe saisi.');
      return;
    }
    this.creationEnCours.set(true);
    try {
      const resultat = await this.donneesApplication.creerFichier(
        cheminCreation,
        motDePasseCreation,
      );
      if (resultat.type === 'succes') {
        void this.router.navigateByUrl('/administration');
        return;
      }
      this.messageErreurCreation.set(this.libelleAnomalie(resultat.anomalie.type));
    } finally {
      this.creationEnCours.set(false);
    }
  }

  /**
   * Ouvre la boîte de dialogue native de sélection du fichier à charger (US-002).
   */
  public async choisirFichierChargement(): Promise<void> {
    const chemin = await SelecteurFichierUtils.choisirFichierChargement({
      multiple: false,
      filters: FILTRE_FICHIER_DONNEES,
    });
    if (typeof chemin === 'string') {
      this.cheminChargement.set(chemin);
      this.messageErreurChargement.set(null);
    }
  }

  /**
   * Valide le formulaire de chargement puis charge le fichier choisi (US-002, RG-002) : redirige vers Liste de
   * travail ou Synthèse des audits selon la présence d'alertes actives en cas de succès
   * (`08_arborescenceNavigation.md`, cf. commentaire d'en-tête de ce fichier).
   */
  public async chargerFichier(): Promise<void> {
    this.messageErreurChargement.set(null);
    const cheminChargement = this.cheminChargement();
    if (cheminChargement === null) {
      this.messageErreurChargement.set('Choisissez un fichier à charger.');
      return;
    }
    const motDePasseChargement = this.motDePasseChargement();
    if (motDePasseChargement.length === 0) {
      this.messageErreurChargement.set('Le mot de passe est obligatoire.');
      return;
    }
    this.chargementEnCours.set(true);
    try {
      const resultat = await this.donneesApplication.chargerFichier(
        cheminChargement,
        motDePasseChargement,
      );
      if (resultat.type === 'succes') {
        void this.router.navigateByUrl(this.cibleApresChargement());
        return;
      }
      this.messageErreurChargement.set(this.libelleAnomalie(resultat.anomalie.type));
    } finally {
      this.chargementEnCours.set(false);
    }
  }

  /**
   * Détermine l'écran cible après un chargement réussi (cf. commentaire d'en-tête de ce fichier).
   * @returns `/liste-travail` si une alerte active est détectée, `/synthese-audits` sinon.
   */
  private cibleApresChargement(): string {
    return this.alertesActivesDetectees() ? '/liste-travail' : '/synthese-audits';
  }

  /**
   * Détecte si au moins une cause de membre inconnu ou en conflit (RG-006 à RG-009) existe sur le dernier audit
   * intégré d'un projet quelconque, sur le modèle de `SqmAccueilComponent.causesMembreInconnu` (cf. commentaire
   * d'en-tête de ce fichier).
   * @returns `true` si au moins une cause d'alerte active est détectée.
   */
  private alertesActivesDetectees(): boolean {
    for (const groupe of this.donneesApplication.groupes()) {
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
            if (resolution.type === 'inconnu' || resolution.type === 'conflit') {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Traduit une catégorie d'anomalie technique en message utilisateur, sans détail technique sensible (US-002 :
   * « signalé sans exposer d'information technique sensible »). Recherche par table plutôt que par `switch` sur
   * `CategorieErreurAdministration` (mirroir de l'enum `ErreurFacade` partagé par de nombreuses commandes, dont
   * seule une poignée de catégories est pertinente pour un écran de fichier) : un `switch` non exhaustif sur ce
   * type large échouerait `@typescript-eslint/switch-exhaustiveness-check` (`eslint.config.js`) sans qu'énumérer
   * les quatorze catégories hors périmètre n'apporte de valeur.
   * @param categorie - Catégorie de l'anomalie remontée par le cœur natif.
   * @returns Le message à afficher à l'utilisateur.
   */
  private libelleAnomalie(categorie: CategorieErreurAdministration): string {
    return (
      SqmDemarrageComponent.MESSAGES_ANOMALIE[categorie] ?? 'Une erreur inattendue est survenue.'
    );
  }

  /**
   * Messages utilisateur des seules catégories d'anomalie pertinentes pour la création/le chargement d'un fichier
   * (cf. {@link libelleAnomalie}).
   */
  private static readonly MESSAGES_ANOMALIE: Readonly<
    Partial<Record<CategorieErreurAdministration, string>>
  > = {
    fichierIntrouvable: 'Le fichier désigné est introuvable.',
    motDePasseOuFichierInvalide: 'Mot de passe incorrect ou fichier altéré.',
    formatNonReconnu: "Le format du fichier n'est pas reconnu par cette version de l'application.",
    versionSchemaSuperieure: "Ce fichier a été créé par une version plus récente de l'application.",
    fichierVerrouille: 'Le fichier est verrouillé par un autre processus.',
  };
}
