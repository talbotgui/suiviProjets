// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Tableau de bord d'exécution (US-009, US-010, Phase 5, incrément 5) : suivi temps réel d'une campagne
// (RG-017), annulation propre (RG-018), sur le modèle visuel de la maquette de référence
// (`docs/01_besoin/Suivi Qualimetrie.dc.html`, section « Tableau de bord d'audit », capture
// `docs/01_besoin/screenshots/04-tableau-de-bord-audit.png`). Lit `EtatSessionService.progressionCampagne`
// (Store d'état applicatif, cf. commentaire d'en-tête de `orchestrateur-campagne.service.ts`), jamais persisté.
//
// Routé seul, sans shell applicatif, même choix pragmatique que Constitution de campagne (cf. commentaire d'en-
// tête de ce dernier).
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import type {
  ProgressionCampagne,
  ProgressionProjet,
  StatutExecutionProjet,
} from '../../../services/avecetat/etat/etat-session.service';
import { OrchestrateurCampagneService } from '../../../services/avecetat/campagne/orchestrateur-campagne.service';

/**
 * Écran Tableau de bord d'exécution : progression réactive locale d'une campagne en cours, annulation propre.
 */
@Component({
  selector: 'app-tableau-de-bord',
  imports: [RouterLink],
  templateUrl: './tableau-de-bord.component.html',
  styleUrl: './tableau-de-bord.component.scss',
})
export class SqmTableauDeBordComponent {
  private readonly etatSession: EtatSessionService = inject(EtatSessionService);
  private readonly orchestrateurCampagne: OrchestrateurCampagneService = inject(
    OrchestrateurCampagneService,
  );
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);

  /**
   * Progression réactive locale de la campagne en cours (ou de la dernière campagne exécutée), `null` si aucune
   * campagne n'a encore été lancée depuis le chargement de l'application.
   * @returns La progression courante.
   */
  public progression(): ProgressionCampagne | null {
    return this.etatSession.progressionCampagne();
  }

  /**
   * Résout le nom lisible d'un projet à partir de son identifiant.
   * @param projetId - Identifiant du projet.
   * @returns Le nom du projet, ou son identifiant s'il n'est plus trouvé (projet supprimé en cours de campagne).
   */
  public nomProjet(projetId: string): string {
    for (const groupe of this.donneesApplication.groupes()) {
      const projet = groupe.projets.find((candidate) => candidate.id === projetId);
      if (projet !== undefined) {
        return projet.nom;
      }
    }
    return projetId;
  }

  /**
   * Nombre de projets du périmètre déjà traités (terminé, échoué ou ignoré).
   * @returns Le nombre de projets traités.
   */
  public nombreProjetsTraites(): number {
    const progression = this.progression();
    if (progression === null) {
      return 0;
    }
    return Object.values(progression.projets).filter((projetProgression) =>
      this.estTraite(projetProgression.statut),
    ).length;
  }

  /**
   * Pourcentage de progression de la campagne en cours, arrondi à l'entier.
   * @returns Le pourcentage, `0` si aucune campagne n'est en cours ou si son périmètre est vide.
   */
  public pourcentage(): number {
    const progression = this.progression();
    if (progression === null || progression.perimetre.length === 0) {
      return 0;
    }
    return Math.round((this.nombreProjetsTraites() / progression.perimetre.length) * 100);
  }

  /**
   * Estime le temps restant de la campagne en cours par une moyenne glissante des durées déjà connues, multipliée
   * par le nombre de projets restant à traiter.
   * @returns L'estimation en millisecondes, `null` si aucune campagne n'est en cours ou si aucune durée n'est
   * encore connue.
   */
  public tempsRestantEstimeMs(): number | null {
    const progression = this.progression();
    if (progression === null) {
      return null;
    }
    const durees = Object.values(progression.projets)
      .map((projetProgression) => projetProgression.dureeMs)
      .filter((duree): duree is number => duree !== undefined);
    if (durees.length === 0) {
      return null;
    }
    const moyenneMs = durees.reduce((total, duree) => total + duree, 0) / durees.length;
    const projetsRestants = progression.perimetre.length - this.nombreProjetsTraites();
    return projetsRestants > 0 ? Math.round(moyenneMs * projetsRestants) : 0;
  }

  /**
   * Formate une durée en millisecondes pour l'affichage (secondes avec une décimale).
   * @param dureeMs - Durée en millisecondes.
   * @returns La durée formatée (ex. « 1,2 s »).
   */
  public formaterDuree(dureeMs: number): string {
    return `${(dureeMs / 1_000).toFixed(1).replace('.', ',')} s`;
  }

  /**
   * Libellé lisible d'un statut d'exécution.
   * @param statut - Statut d'exécution d'un projet.
   * @returns Le libellé à afficher.
   */
  public libelleStatut(statut: StatutExecutionProjet): string {
    switch (statut) {
      case 'enAttente':
        return 'En attente';
      case 'enCours':
        return 'En cours';
      case 'termine':
        return 'Terminé';
      case 'echoue':
        return 'Échoué';
      case 'ignore':
        return 'Ignoré';
    }
  }

  /**
   * Contenu de la colonne « Connecteur/détail » du tableau (US-010, F06) : connecteur actif si le projet est en
   * cours, nombre de résultats obtenus s'il est terminé, motif court s'il a échoué, chaîne vide sinon (en attente,
   * ignoré).
   * @param progressionProjet - Progression du projet concerné.
   * @returns Le texte à afficher dans cette colonne.
   */
  public detailColonne(progressionProjet: ProgressionProjet): string {
    switch (progressionProjet.statut) {
      case 'enCours':
        return this.libelleConnecteur(progressionProjet.connecteurActif);
      case 'termine':
        return `${progressionProjet.nombreResultats ?? 0} résultat(s)`;
      case 'echoue':
        return progressionProjet.motifEchec ?? '';
      case 'enAttente':
      case 'ignore':
        return '';
    }
  }

  /**
   * Libellé lisible d'un connecteur actif.
   * @param connecteur - Connecteur actuellement interrogé, absent si non pertinent.
   * @returns Le libellé à afficher, chaîne vide si aucun connecteur n'est actif.
   */
  private libelleConnecteur(connecteur: 'gitlab' | 'sonar' | undefined): string {
    switch (connecteur) {
      case 'gitlab':
        return 'GitLab';
      case 'sonar':
        return 'Sonar';
      case undefined:
        return '';
    }
  }

  /**
   * Demande l'annulation propre de la campagne en cours (RG-018).
   */
  public annuler(): void {
    this.orchestrateurCampagne.annulerCampagne();
  }

  /**
   * Indique si un statut d'exécution correspond à un projet déjà traité (par opposition à en attente ou en
   * cours).
   * @param statut - Statut d'exécution à évaluer.
   * @returns `true` si le projet est déjà traité.
   */
  private estTraite(statut: StatutExecutionProjet): boolean {
    return statut === 'termine' || statut === 'echoue' || statut === 'ignore';
  }
}
