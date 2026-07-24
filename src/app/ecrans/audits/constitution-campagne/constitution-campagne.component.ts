// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Constitution de campagne (US-009, US-012, Phase 5, incrément 5) : sélection du périmètre d'une campagne
// (tout, par groupe, manuel, raccourcis F07), récapitulatif du coût prévisionnel et des credentials manquants
// (`OrchestrateurCampagneService.constituerCampagne`), blocage RG-019 et lancement (`OrchestrateurCampagneService.
// lancerCampagne`) avec ressaisie du mot de passe (RG-002, `SqmConfirmationMotDePasseComponent`).
//
// Routé seul, sans shell applicatif (aucun shell ne existe encore, cf. `app.routes.ts` : même choix pragmatique
// que l'écran Administration en Phase 3, à revoir une fois le shell construit).
//
// Décisions arbitraires (cf. rapport de développement de cette phase) : les credentials manquants sont affichés en
// simple liste (nom d'instance), sans navigation vers un écran de saisie qui n'existe pas encore ; le blocage
// RG-019 est un bandeau intégré à cet écran plutôt qu'un guard de route, faute d'écran Brouillon existant vers
// lequel rediriger ; le lancement n'attend pas la fin de la campagne avant de naviguer vers le Tableau de bord
// d'exécution (la progression y est réactive), ce qui signifie qu'un échec de la sauvegarde finale du brouillon
// (RG-002, mot de passe incorrect) n'est aujourd'hui pas re-signalé après cette navigation — limitation connue, à
// traiter par un incrément ultérieur (écran Brouillon).
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SqmConfirmationMotDePasseComponent } from '../../../composants/confirmation-mot-de-passe/confirmation-mot-de-passe.component';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import type { Groupe } from '../../../services/avecetat/etat/types-donnees';
import { OrchestrateurCampagneService } from '../../../services/avecetat/campagne/orchestrateur-campagne.service';
import type { ConstitutionCampagne } from '../../../services/avecetat/campagne/orchestrateur-campagne.service';
import { PerimetreCampagneUtils } from '../../../services/avecetat/campagne/perimetre-campagne.utils';

/**
 * Valeur par défaut du seuil « non audité depuis plus de N jours » (`parametres.seuils.fraicheurAudit.
 * ancienJours`), reprise de `docs/01_besoin/exemple-donnees.json` selon la même convention que
 * `CONCURRENCE_PAR_DEFAUT`/`VARIATION_RELATIVE_PAR_DEFAUT` d'`OrchestrateurCampagneService`.
 */
const ANCIEN_JOURS_PAR_DEFAUT = 30;

/**
 * Écran Constitution de campagne : sélection du périmètre, raccourcis F07, récapitulatif et lancement d'une
 * campagne d'audit.
 */
@Component({
  selector: 'app-constitution-campagne',
  imports: [SqmConfirmationMotDePasseComponent],
  templateUrl: './constitution-campagne.component.html',
  styleUrl: './constitution-campagne.component.scss',
})
export class SqmConstitutionCampagneComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly orchestrateurCampagne: OrchestrateurCampagneService = inject(
    OrchestrateurCampagneService,
  );
  private readonly router: Router = inject(Router);

  /**
   * Identifiants des projets actuellement sélectionnés pour la prochaine campagne.
   */
  public selectionProjetIds: ReadonlySet<string> = new Set();

  /**
   * Indique si la ressaisie du mot de passe du fichier est actuellement affichée avant lancement (RG-002).
   */
  public confirmationMotDePasseVisible = false;

  /**
   * Groupes actuellement chargés.
   * @returns Le tableau des groupes de la racine courante.
   */
  public groupes(): readonly Groupe[] {
    return this.donneesApplication.groupes();
  }

  /**
   * Indique si un brouillon existant reste à traiter (RG-019), bloquant la constitution d'une nouvelle campagne.
   * @returns `true` si un brouillon est en attente de traitement.
   */
  public brouillonEnAttente(): boolean {
    const racine = this.donneesApplication.racine();
    return racine !== null && racine.brouillon !== null;
  }

  /**
   * Indique si un projet donné fait partie de la sélection courante.
   * @param projetId - Identifiant du projet.
   * @returns `true` si le projet est sélectionné.
   */
  public estProjetSelectionne(projetId: string): boolean {
    return this.selectionProjetIds.has(projetId);
  }

  /**
   * Bascule la sélection d'un projet.
   * @param projetId - Identifiant du projet à basculer.
   */
  public basculerProjet(projetId: string): void {
    const nouvelleSelection = new Set(this.selectionProjetIds);
    if (nouvelleSelection.has(projetId)) {
      nouvelleSelection.delete(projetId);
    } else {
      nouvelleSelection.add(projetId);
    }
    this.selectionProjetIds = nouvelleSelection;
  }

  /**
   * Indique si tous les projets d'un groupe sont actuellement sélectionnés.
   * @param groupe - Groupe concerné.
   * @returns `true` si le groupe compte au moins un projet et qu'ils sont tous sélectionnés.
   */
  public estGroupeIntegralementSelectionne(groupe: Groupe): boolean {
    return (
      groupe.projets.length > 0 &&
      groupe.projets.every((projet) => this.selectionProjetIds.has(projet.id))
    );
  }

  /**
   * Indique si un groupe est partiellement sélectionné (au moins un projet sélectionné, mais pas tous), pour
   * matérialiser l'état intermédiaire de sa case à cocher (`indeterminate`).
   * @param groupe - Groupe concerné.
   * @returns `true` si la sélection du groupe est partielle.
   */
  public estGroupePartiellementSelectionne(groupe: Groupe): boolean {
    const nombreSelectionnes = groupe.projets.filter((projet) =>
      this.selectionProjetIds.has(projet.id),
    ).length;
    return nombreSelectionnes > 0 && nombreSelectionnes < groupe.projets.length;
  }

  /**
   * Bascule la sélection de l'intégralité des projets d'un groupe.
   * @param groupe - Groupe concerné.
   */
  public basculerGroupe(groupe: Groupe): void {
    const toutSelectionne = this.estGroupeIntegralementSelectionne(groupe);
    const nouvelleSelection = new Set(this.selectionProjetIds);
    for (const projet of groupe.projets) {
      if (toutSelectionne) {
        nouvelleSelection.delete(projet.id);
      } else {
        nouvelleSelection.add(projet.id);
      }
    }
    this.selectionProjetIds = nouvelleSelection;
  }

  /**
   * Indique si l'intégralité des projets de tous les groupes est actuellement sélectionnée.
   * @returns `true` si au moins un projet existe et qu'ils sont tous sélectionnés.
   */
  public estToutSelectionne(): boolean {
    const tousProjets = this.groupes().flatMap((groupe) => groupe.projets);
    return (
      tousProjets.length > 0 &&
      tousProjets.every((projet) => this.selectionProjetIds.has(projet.id))
    );
  }

  /**
   * Indique si la sélection courante est partielle (au moins un projet sélectionné, mais pas tous), pour
   * matérialiser l'état intermédiaire de la case à cocher « tout ».
   * @returns `true` si la sélection globale est partielle.
   */
  public estPartiellementSelectionne(): boolean {
    const tousProjets = this.groupes().flatMap((groupe) => groupe.projets);
    return this.selectionProjetIds.size > 0 && this.selectionProjetIds.size < tousProjets.length;
  }

  /**
   * Bascule la sélection de l'intégralité des projets de tous les groupes.
   */
  public basculerTout(): void {
    const tousProjets = this.groupes().flatMap((groupe) => groupe.projets);
    this.selectionProjetIds = this.estToutSelectionne()
      ? new Set()
      : new Set(tousProjets.map((projet) => projet.id));
  }

  /**
   * Applique le raccourci « rejouer les échecs de la dernière campagne » (F07), remplaçant la sélection courante.
   */
  public appliquerRaccourciEchecs(): void {
    const campagnes = this.donneesApplication.racine()?.campagnes ?? [];
    this.selectionProjetIds = new Set(
      PerimetreCampagneUtils.projetsEnEchecDerniereCampagne(campagnes),
    );
  }

  /**
   * Applique le raccourci « projets non audités depuis plus de N jours » (F07), remplaçant la sélection courante.
   */
  public appliquerRaccourciNonAudites(): void {
    const projets = PerimetreCampagneUtils.projetsNonAuditesDepuis(
      this.groupes(),
      this.extraireAncienJours(),
      new Date(),
    );
    this.selectionProjetIds = new Set(projets);
  }

  /**
   * Récapitulatif de la sélection courante (US-012) : coût prévisionnel et credentials manquants.
   * @returns Le récapitulatif calculé par `OrchestrateurCampagneService.constituerCampagne`.
   */
  public recapitulatif(): ConstitutionCampagne {
    return this.orchestrateurCampagne.constituerCampagne(Array.from(this.selectionProjetIds));
  }

  /**
   * Résout le nom lisible d'une instance à partir de son identifiant, pour l'affichage de la liste des credentials
   * manquants.
   * @param instanceId - Identifiant de l'instance.
   * @returns Le nom de l'instance, ou son identifiant si elle n'est plus trouvée (ne devrait pas survenir).
   */
  public nomInstance(instanceId: string): string {
    for (const groupe of this.groupes()) {
      const instance = groupe.instances.find((candidate) => candidate.id === instanceId);
      if (instance !== undefined) {
        return instance.nom;
      }
    }
    return instanceId;
  }

  /**
   * Ouvre la ressaisie du mot de passe du fichier avant de lancer la campagne (RG-002).
   */
  public demanderLancement(): void {
    this.confirmationMotDePasseVisible = true;
  }

  /**
   * Annule le lancement demandé.
   */
  public annulerLancement(): void {
    this.confirmationMotDePasseVisible = false;
  }

  /**
   * Lance la campagne sur la sélection courante après confirmation du mot de passe (US-009, RG-002), puis navigue
   * immédiatement vers le Tableau de bord d'exécution sans attendre la fin de la campagne (cf. commentaire d'en-
   * tête de ce fichier : la progression y est réactive, un échec de sauvegarde finale n'est pas re-signalé ici).
   * @param motDePasse - Mot de passe du fichier ressaisi par l'utilisateur.
   */
  public confirmerLancement(motDePasse: string): void {
    this.confirmationMotDePasseVisible = false;
    void this.orchestrateurCampagne.lancerCampagne(Array.from(this.selectionProjetIds), motDePasse);
    void this.router.navigateByUrl('/audits/tableau-de-bord');
  }

  /**
   * Extrait le seuil « non audité depuis plus de N jours » paramétré (`parametres.seuils.fraicheurAudit.
   * ancienJours`), sans accès non sûr à la racine `unknown`, avec repli documenté sur
   * {@link ANCIEN_JOURS_PAR_DEFAUT}.
   * @returns Le seuil à appliquer.
   */
  private extraireAncienJours(): number {
    const parametres = this.donneesApplication.racine()?.parametres;
    if (typeof parametres !== 'object' || parametres === null || !('seuils' in parametres)) {
      return ANCIEN_JOURS_PAR_DEFAUT;
    }
    const seuils = parametres.seuils;
    if (typeof seuils !== 'object' || seuils === null || !('fraicheurAudit' in seuils)) {
      return ANCIEN_JOURS_PAR_DEFAUT;
    }
    const fraicheurAudit = seuils.fraicheurAudit;
    if (
      typeof fraicheurAudit !== 'object' ||
      fraicheurAudit === null ||
      !('ancienJours' in fraicheurAudit)
    ) {
      return ANCIEN_JOURS_PAR_DEFAUT;
    }
    const valeur = fraicheurAudit.ancienJours;
    return typeof valeur === 'number' && valeur > 0 ? valeur : ANCIEN_JOURS_PAR_DEFAUT;
  }
}
