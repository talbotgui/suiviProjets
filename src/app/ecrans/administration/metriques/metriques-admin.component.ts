// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Onglet « Métriques » de l'écran Administration (US-055, RG-055) : volumétrie du fichier de données ouvert, en
// lecture seule. Les cinq compteurs sont dérivés de l'état déjà en mémoire (signal `racine()`/`groupes()`, coût
// négligeable) ; les tailles (poids sur disque, poids du JSON en clair, ventilation en cinq postes) sont calculées
// par la commande native `calculerMetriquesVolumetrie`, appelée une fois à la construction du composant, qui n'est
// instancié qu'à l'activation de l'onglet (bloc `@case` de la coquille). Aucune mutation : ni sauvegarde, ni
// ressaisie du mot de passe (RG-002 non déclenchée).
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type {
  MetriquesVolumetrie,
  VentilationJsonClair,
} from '../../../services/avecetat/etat/types-donnees';
import {
  TailleFichierUtils,
  type VentilationPourcentages,
} from '../../../services/sansetat/taille-fichier.utils';

/**
 * Identifiant d'un poste de la ventilation du poids du JSON en clair (RG-055).
 */
export type PosteVentilation = 'parametrage' | 'journal' | 'administration' | 'audits' | 'autre';

/**
 * Ligne du tableau de ventilation : un poste, son poids en octets et son pourcentage entier.
 */
export interface LigneVentilation {
  /** Poste concerné. */
  readonly poste: PosteVentilation;
  /** Libellé affiché du poste. */
  readonly libelle: string;
  /** Poids du poste, en octets. */
  readonly octets: number;
  /** Part du poste dans le total, en pourcentage entier (somme des cinq lignes = 100). */
  readonly pourcentage: number;
}

/**
 * Onglet « Métriques » de l'écran Administration : compteurs du fichier de données et volumétrie (poids sur
 * disque, poids du JSON en clair, ventilation en cinq postes de somme 100 %), en lecture seule (US-055, RG-055).
 */
@Component({
  selector: 'app-metriques-admin',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './metriques-admin.component.html',
})
export class SqmMetriquesAdminComponent {
  private readonly donneesApplication: DonneesApplicationService = inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

  /**
   * Métriques de volumétrie renvoyées par la commande native, `null` tant que l'appel n'a pas abouti (chargement
   * en cours, ou échec).
   */
  public readonly metriques: WritableSignal<MetriquesVolumetrie | null> = signal(null);

  /**
   * Vrai pendant l'appel natif de calcul de la volumétrie.
   */
  public readonly enCours: WritableSignal<boolean> = signal(false);

  /**
   * Déclenche le calcul de la volumétrie dès l'activation de l'onglet (le composant n'est instancié qu'à ce
   * moment-là).
   */
  public constructor() {
    void this.charger();
  }

  /**
   * Nombre de groupes actuellement chargés.
   * @returns Le nombre de groupes.
   */
  public nombreGroupes(): number {
    return this.donneesApplication.groupes().length;
  }

  /**
   * Nombre total de projets, tous groupes confondus.
   * @returns Le nombre de projets.
   */
  public nombreProjets(): number {
    return this.donneesApplication
      .groupes()
      .reduce((total, groupe) => total + groupe.projets.length, 0);
  }

  /**
   * Nombre total d'audits, tous projets confondus.
   * @returns Le nombre d'audits.
   */
  public nombreAudits(): number {
    return this.donneesApplication
      .groupes()
      .reduce(
        (total, groupe) =>
          total + groupe.projets.reduce((sousTotal, projet) => sousTotal + projet.audits.length, 0),
        0,
      );
  }

  /**
   * Nombre total de règles de membre connu (`membresConnus`), tous groupes confondus.
   * @returns Le nombre de règles de membre.
   */
  public nombreReglesMembre(): number {
    return this.donneesApplication
      .groupes()
      .reduce((total, groupe) => total + groupe.membresConnus.length, 0);
  }

  /**
   * Nombre de règles de dépendance du référentiel (`referentiels.reglesDependances`).
   * @returns Le nombre de règles de dépendance.
   */
  public nombreReglesDependance(): number {
    return this.donneesApplication.racine()?.referentiels.reglesDependances.length ?? 0;
  }

  /**
   * Invoque la commande native de calcul de la volumétrie et route toute erreur vers une notification.
   * @returns Une promesse résolue une fois l'appel terminé (succès ou échec).
   */
  public async charger(): Promise<void> {
    this.enCours.set(true);
    const resultat = await this.donneesApplication.calculerMetriquesVolumetrie();
    this.enCours.set(false);
    switch (resultat.type) {
      case 'succes':
        this.metriques.set(resultat.metriques);
        break;
      case 'echec':
        this.notification.erreur(
          "Le calcul de la volumétrie du fichier de données a échoué. Consultez le journal technique pour plus de détails.",
        );
        break;
    }
  }

  /**
   * Met en forme une taille en octets en mégaoctets (registre français).
   * @param octets - Taille en octets.
   * @returns Le texte affichable (ex. `2,4 Mo`).
   */
  public formaterMegaOctets(octets: number): string {
    return TailleFichierUtils.formaterMegaOctets(octets);
  }

  /**
   * Construit les cinq lignes du tableau de ventilation (poste, octets, pourcentage entier) à partir de la
   * ventilation brute renvoyée par le cœur natif. Les pourcentages, calculés par la méthode du plus fort reste,
   * totalisent exactement 100.
   * @param ventilation - Ventilation brute (octets par poste).
   * @returns Les cinq lignes du tableau, dans l'ordre d'affichage.
   */
  public lignesVentilation(ventilation: VentilationJsonClair): readonly LigneVentilation[] {
    const pourcentages: VentilationPourcentages = TailleFichierUtils.ventilationPourcentages(
      ventilation.parametrageOctets,
      ventilation.journalOctets,
      ventilation.administrationOctets,
      ventilation.auditsOctets,
      ventilation.autreOctets,
    );
    return [
      {
        poste: 'parametrage',
        libelle: this.libellePoste('parametrage'),
        octets: ventilation.parametrageOctets,
        pourcentage: pourcentages.parametrage,
      },
      {
        poste: 'journal',
        libelle: this.libellePoste('journal'),
        octets: ventilation.journalOctets,
        pourcentage: pourcentages.journal,
      },
      {
        poste: 'administration',
        libelle: this.libellePoste('administration'),
        octets: ventilation.administrationOctets,
        pourcentage: pourcentages.administration,
      },
      {
        poste: 'audits',
        libelle: this.libellePoste('audits'),
        octets: ventilation.auditsOctets,
        pourcentage: pourcentages.audits,
      },
      {
        poste: 'autre',
        libelle: this.libellePoste('autre'),
        octets: ventilation.autreOctets,
        pourcentage: pourcentages.autre,
      },
    ];
  }

  /**
   * Libellé affiché d'un poste de ventilation.
   * @param poste - Poste concerné.
   * @returns Le libellé français du poste.
   */
  private libellePoste(poste: PosteVentilation): string {
    switch (poste) {
      case 'parametrage':
        return 'Paramétrage (paramètres, référentiels, vues enregistrées)';
      case 'journal':
        return 'Journal des modifications';
      case 'administration':
        return 'Administration (groupes, projets, sources, membres connus, annotations)';
      case 'audits':
        return 'Audits (historiques, campagnes, brouillon)';
      case 'autre':
        return 'Autre (métadonnées, structure du fichier)';
    }
  }
}
