// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant transverse « explication du calcul », exigé par la charte d'ergonomie bien qu'aucune US/RG ne le nomme
// explicitement (cf. docs/02_documentation/10_charteErgonomie.md#principes-dinteraction-communs : « l'interface
// donne accès, en un clic, à l'explication du calcul (seuil appliqué, référentiel utilisé) plutôt que d'afficher un
// verdict opaque »), inclus au périmètre de la Phase 6 par décision explicite de l'utilisateur.
//
// Consomme directement `ParametresJugementUtils` (RG-022 : point unique de lecture des seuils/référentiels) pour ne
// jamais dupliquer la donnée affichée : le composant appelant transmet la valeur brute de `parametres.seuils`
// et/ou `referentiels` telle quelle (non interprétée), ainsi que la clé du seuil à expliquer ; le texte
// d'explication est entièrement recalculé ici, jamais pré-formaté par l'appelant. Chaque branche de calcul reste
// typée sans assertion (`as` interdit par `@typescript-eslint/consistent-type-assertions` de ce projet) : un
// switch dédié par clé délègue à une méthode privée dont le paramètre est le type de lecture défensive concret
// correspondant, la réduction de type du discriminant `absent`/`valeur` s'opérant nativement.
import { Component, computed, input, signal, ChangeDetectionStrategy } from '@angular/core';
import type { InputSignal, Signal, WritableSignal } from '@angular/core';
import {
  ParametresJugementUtils,
  type LectureDefensive,
  type RegleDependance,
  type SeuilsActiviteSansQualite,
  type SeuilsCouleursViolations,
  type SeuilsCouverture,
  type SeuilsFraicheurAudit,
  type SeuilsFraicheurSonar,
  type SeuilsMaterialiteBrouillon,
  type SeuilsMrOuvertes,
  type SeuilsTailleDepot,
  type SeuilsVitalite,
} from '../../services/sansetat/jugement/parametres-jugement.utils';
import type { RegleMarqueurIA } from '../../services/sansetat/commandes/types-facade';

/**
 * Clé du seuil ou référentiel à expliquer, une entrée par branche lue par {@link ParametresJugementUtils}
 * consommée par le Moteur de jugement. `reglesMarqueursIA` ajoutée à la Phase 6 incrément 4 (correction de
 * relecture) : la colonne « IA » de la Synthèse des audits (RG-016) repose sur ce référentiel, jusqu'ici absent de
 * ce composant alors même que `motifNommageBranches` (référentiel de même nature) y figurait déjà. `reglesDependances`
 * ajoutée à la Phase 6 incrément 5 (Fiche projet, US-017) : le statut d'obsolescence d'une dépendance
 * (`StatutObsolescenceUtils`) repose lui aussi sur un référentiel, jusqu'ici jamais affiché nulle part avant cet
 * écran (`gitlab.dependances` n'était consommé par aucun écran antérieur).
 */
export type CleExplicationJugement =
  | 'vitalite'
  | 'tailleDepot'
  | 'couverture'
  | 'fraicheurSonar'
  | 'activiteSansQualite'
  | 'fraicheurAudit'
  | 'mrOuvertes'
  | 'couleursViolations'
  | 'materialiteBrouillon'
  | 'motifNommageBranches'
  | 'reglesMarqueursIA'
  | 'reglesDependances';

/**
 * Popover réutilisable donnant accès en un clic à l'explication du calcul d'un jugement affiché (seuil ou
 * référentiel appliqué). Fermé par défaut ; s'ouvre/se ferme au clic sur son bouton déclencheur ou à la touche
 * Échap une fois ouvert.
 */
@Component({
  selector: 'app-explication-jugement',
  templateUrl: './explication-jugement.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './explication-jugement.component.scss',
})
export class SqmExplicationJugementComponent {
  /**
   * Clé du seuil ou référentiel à expliquer.
   */
  public readonly cle: InputSignal<CleExplicationJugement> =
    input.required<CleExplicationJugement>();

  /**
   * Valeur brute de `parametres.seuils`, non interprétée par l'appelant (lecture différée à
   * {@link ParametresJugementUtils}). Absente si {@link cle} désigne un référentiel plutôt qu'un seuil.
   */
  public readonly seuilsBruts: InputSignal<unknown> = input<unknown>(undefined);

  /**
   * Valeur brute de `referentiels`, non interprétée par l'appelant. Absente si {@link cle} désigne un seuil plutôt
   * qu'un référentiel.
   */
  public readonly referentielsBruts: InputSignal<unknown> = input<unknown>(undefined);

  /**
   * État d'ouverture du popover, fermé par défaut.
   */
  public readonly ouvert: WritableSignal<boolean> = signal(false);

  /**
   * Texte d'explication recalculé à chaque changement de {@link cle}/{@link seuilsBruts}/{@link referentielsBruts},
   * directement depuis {@link ParametresJugementUtils} (aucune donnée dupliquée depuis l'appelant).
   */
  public readonly explication: Signal<string> = computed(() =>
    SqmExplicationJugementComponent.formaterExplication(
      this.cle(),
      this.seuilsBruts(),
      this.referentielsBruts(),
    ),
  );

  /**
   * Construit le message affiché lorsque la lecture défensive d'une clé est `absent`.
   * @param cle - Clé du seuil ou référentiel dont la lecture a échoué.
   * @returns Le message d'indisponibilité.
   */
  private static messageAbsent(cle: CleExplicationJugement): string {
    return `Donnée « ${cle} » indisponible dans le document courant.`;
  }

  /**
   * Formate l'explication des seuils de vitalité.
   * @param lecture - Résultat de {@link ParametresJugementUtils.lireSeuilsVitalite}.
   * @returns Le texte d'explication.
   */
  private static formaterVitalite(lecture: LectureDefensive<SeuilsVitalite>): string {
    if (lecture.type === 'absent') {
      return SqmExplicationJugementComponent.messageAbsent('vitalite');
    }
    const { mourantJours, mortJours } = lecture.valeur;
    return `Dépôt jugé mourant au-delà de ${mourantJours} j sans commit, mort au-delà de ${mortJours} j.`;
  }

  /**
   * Formate l'explication des bornes de classe de taille de dépôt.
   * @param lecture - Résultat de {@link ParametresJugementUtils.lireSeuilsTailleDepot}.
   * @returns Le texte d'explication.
   */
  private static formaterTailleDepot(lecture: LectureDefensive<SeuilsTailleDepot>): string {
    if (lecture.type === 'absent') {
      return SqmExplicationJugementComponent.messageAbsent('tailleDepot');
    }
    const { borneS, borneL, borneXL } = lecture.valeur;
    return `Classes de taille : S jusqu'à ${borneS} o, M jusqu'à ${borneL} o, L jusqu'à ${borneXL} o, XL au-delà.`;
  }

  /**
   * Formate l'explication des seuils de couverture de tests.
   * @param lecture - Résultat de {@link ParametresJugementUtils.lireSeuilsCouverture}.
   * @returns Le texte d'explication.
   */
  private static formaterCouverture(lecture: LectureDefensive<SeuilsCouverture>): string {
    if (lecture.type === 'absent') {
      return SqmExplicationJugementComponent.messageAbsent('couverture');
    }
    const { seuilRouge, seuilOrange } = lecture.valeur;
    return `Couverture jugée rouge sous ${seuilRouge} %, orange sous ${seuilOrange} %.`;
  }

  /**
   * Formate l'explication de la tolérance de fraîcheur Sonar (RG-013).
   * @param lecture - Résultat de {@link ParametresJugementUtils.lireSeuilsFraicheurSonar}.
   * @returns Le texte d'explication.
   */
  private static formaterFraicheurSonar(lecture: LectureDefensive<SeuilsFraicheurSonar>): string {
    if (lecture.type === 'absent') {
      return SqmExplicationJugementComponent.messageAbsent('fraicheurSonar');
    }
    return `Badge SONAR_KO déclenché au-delà de ${lecture.valeur.toleranceJours} j d'écart entre dernier commit et dernière analyse.`;
  }

  /**
   * Formate l'explication des seuils d'activité sans qualité.
   * @param lecture - Résultat de {@link ParametresJugementUtils.lireSeuilsActiviteSansQualite}.
   * @returns Le texte d'explication.
   */
  private static formaterActiviteSansQualite(
    lecture: LectureDefensive<SeuilsActiviteSansQualite>,
  ): string {
    if (lecture.type === 'absent') {
      return SqmExplicationJugementComponent.messageAbsent('activiteSansQualite');
    }
    const { minCommits, minNouvellesViolations } = lecture.valeur;
    return `Signal déclenché à partir de ${minCommits} commits et ${minNouvellesViolations} nouvelles violations sur la fenêtre glissante.`;
  }

  /**
   * Formate l'explication du seuil de fraîcheur d'audit.
   * @param lecture - Résultat de {@link ParametresJugementUtils.lireSeuilsFraicheurAudit}.
   * @returns Le texte d'explication.
   */
  private static formaterFraicheurAudit(lecture: LectureDefensive<SeuilsFraicheurAudit>): string {
    if (lecture.type === 'absent') {
      return SqmExplicationJugementComponent.messageAbsent('fraicheurAudit');
    }
    return `Projet jugé non audité depuis trop longtemps au-delà de ${lecture.valeur.ancienJours} j.`;
  }

  /**
   * Formate l'explication des seuils de demandes de fusion ouvertes.
   * @param lecture - Résultat de {@link ParametresJugementUtils.lireSeuilsMrOuvertes}.
   * @returns Le texte d'explication.
   */
  private static formaterMrOuvertes(lecture: LectureDefensive<SeuilsMrOuvertes>): string {
    if (lecture.type === 'absent') {
      return SqmExplicationJugementComponent.messageAbsent('mrOuvertes');
    }
    const { ageOrangeJours, ageRougeJours, pourcentageConflitRouge } = lecture.valeur;
    return `MR ouverte jugée orange à partir de ${ageOrangeJours} j, rouge à partir de ${ageRougeJours} j ; taux de conflit jugé rouge à partir de ${pourcentageConflitRouge} %.`;
  }

  /**
   * Formate l'explication des seuils de couleur des violations bloquantes/critiques.
   * @param lecture - Résultat de {@link ParametresJugementUtils.lireSeuilsCouleursViolations}.
   * @returns Le texte d'explication.
   */
  private static formaterCouleursViolations(
    lecture: LectureDefensive<SeuilsCouleursViolations>,
  ): string {
    if (lecture.type === 'absent') {
      return SqmExplicationJugementComponent.messageAbsent('couleursViolations');
    }
    const { bloquant, critique } = lecture.valeur;
    return `Violations bloquantes jugées orange à partir de ${bloquant.seuilOrange}, rouge à partir de ${bloquant.seuilRouge} ; violations critiques jugées orange à partir de ${critique.seuilOrange}, rouge à partir de ${critique.seuilRouge}.`;
  }

  /**
   * Formate l'explication du seuil de matérialité du brouillon.
   * @param lecture - Résultat de {@link ParametresJugementUtils.lireSeuilsMaterialiteBrouillon}.
   * @returns Le texte d'explication.
   */
  private static formaterMaterialiteBrouillon(
    lecture: LectureDefensive<SeuilsMaterialiteBrouillon>,
  ): string {
    if (lecture.type === 'absent') {
      return SqmExplicationJugementComponent.messageAbsent('materialiteBrouillon');
    }
    return `Mouvement du brouillon jugé matériel au-delà d'une variation relative de ${lecture.valeur.variationRelative}.`;
  }

  /**
   * Formate l'explication du motif de nommage de branche (RG-030).
   * @param lecture - Résultat de {@link ParametresJugementUtils.lireMotifNommageBranches}.
   * @returns Le texte d'explication.
   */
  private static formaterMotifNommageBranches(lecture: LectureDefensive<string>): string {
    if (lecture.type === 'absent') {
      return SqmExplicationJugementComponent.messageAbsent('motifNommageBranches');
    }
    return `Motif de nommage de branche appliqué : ${lecture.valeur}`;
  }

  /**
   * Formate l'explication du référentiel des marqueurs IA (F18, RG-016), consommé par `StatutIaUtils.
   * calculerStatutIA` pour détecter une éventuelle violation de la politique IA d'un projet.
   * @param lecture - Résultat de {@link ParametresJugementUtils.lireReglesMarqueursIA}.
   * @returns Le texte d'explication.
   */
  private static formaterReglesMarqueursIA(
    lecture: LectureDefensive<readonly RegleMarqueurIA[]>,
  ): string {
    if (lecture.type === 'absent') {
      return SqmExplicationJugementComponent.messageAbsent('reglesMarqueursIA');
    }
    if (lecture.valeur.length === 0) {
      return 'Aucune règle de détection de marqueurs IA définie dans le référentiel courant.';
    }
    const regles = lecture.valeur
      .map((regle) => `${regle.outil} (${regle.motif}, ${regle.portee}, ${regle.nature})`)
      .join(' ; ');
    return `Violation IA détectée si l'une de ces ${lecture.valeur.length} règle(s) du référentiel courant correspond à l'arborescence du dépôt : ${regles}.`;
  }

  /**
   * Formate l'explication du référentiel des dépendances (`referentiels.reglesDependances`), consommé par
   * `StatutObsolescenceUtils.calculerStatutObsolescence` pour déterminer le statut d'obsolescence d'une dépendance
   * constatée (Fiche projet, US-017, Phase 6 incrément 5).
   * @param lecture - Résultat de {@link ParametresJugementUtils.lireReglesDependances}.
   * @returns Le texte d'explication.
   */
  private static formaterReglesDependances(
    lecture: LectureDefensive<readonly RegleDependance[]>,
  ): string {
    if (lecture.type === 'absent') {
      return SqmExplicationJugementComponent.messageAbsent('reglesDependances');
    }
    if (lecture.valeur.length === 0) {
      return 'Aucune règle de dépendances définie dans le référentiel courant.';
    }
    const regles = lecture.valeur
      .map(
        (regle) =>
          `${regle.motif} (${regle.versions.map((version) => `${version.motifVersion} → ${version.statut}`).join(', ')})`,
      )
      .join(' ; ');
    return `Statut d'obsolescence déterminé par la première règle du référentiel courant dont le motif correspond à la référence, puis la première borne de version correspondant à la version constatée : ${regles}.`;
  }

  /**
   * Calcule le texte d'explication de la clé demandée en déléguant la lecture défensive à
   * {@link ParametresJugementUtils}.
   * @param cle - Clé du seuil ou référentiel à expliquer.
   * @param seuilsBruts - Valeur brute de `parametres.seuils`.
   * @param referentielsBruts - Valeur brute de `referentiels`.
   * @returns Le texte d'explication.
   */
  private static formaterExplication(
    cle: CleExplicationJugement,
    seuilsBruts: unknown,
    referentielsBruts: unknown,
  ): string {
    switch (cle) {
      case 'vitalite':
        return SqmExplicationJugementComponent.formaterVitalite(
          ParametresJugementUtils.lireSeuilsVitalite(seuilsBruts),
        );
      case 'tailleDepot':
        return SqmExplicationJugementComponent.formaterTailleDepot(
          ParametresJugementUtils.lireSeuilsTailleDepot(seuilsBruts),
        );
      case 'couverture':
        return SqmExplicationJugementComponent.formaterCouverture(
          ParametresJugementUtils.lireSeuilsCouverture(seuilsBruts),
        );
      case 'fraicheurSonar':
        return SqmExplicationJugementComponent.formaterFraicheurSonar(
          ParametresJugementUtils.lireSeuilsFraicheurSonar(seuilsBruts),
        );
      case 'activiteSansQualite':
        return SqmExplicationJugementComponent.formaterActiviteSansQualite(
          ParametresJugementUtils.lireSeuilsActiviteSansQualite(seuilsBruts),
        );
      case 'fraicheurAudit':
        return SqmExplicationJugementComponent.formaterFraicheurAudit(
          ParametresJugementUtils.lireSeuilsFraicheurAudit(seuilsBruts),
        );
      case 'mrOuvertes':
        return SqmExplicationJugementComponent.formaterMrOuvertes(
          ParametresJugementUtils.lireSeuilsMrOuvertes(seuilsBruts),
        );
      case 'couleursViolations':
        return SqmExplicationJugementComponent.formaterCouleursViolations(
          ParametresJugementUtils.lireSeuilsCouleursViolations(seuilsBruts),
        );
      case 'materialiteBrouillon':
        return SqmExplicationJugementComponent.formaterMaterialiteBrouillon(
          ParametresJugementUtils.lireSeuilsMaterialiteBrouillon(seuilsBruts),
        );
      case 'motifNommageBranches':
        return SqmExplicationJugementComponent.formaterMotifNommageBranches(
          ParametresJugementUtils.lireMotifNommageBranches(referentielsBruts),
        );
      case 'reglesMarqueursIA':
        return SqmExplicationJugementComponent.formaterReglesMarqueursIA(
          ParametresJugementUtils.lireReglesMarqueursIA(referentielsBruts),
        );
      case 'reglesDependances':
        return SqmExplicationJugementComponent.formaterReglesDependances(
          ParametresJugementUtils.lireReglesDependances(referentielsBruts),
        );
    }
  }

  /**
   * Bascule l'état d'ouverture du popover lors de l'activation du bouton déclencheur par l'utilisateur.
   */
  public basculer(): void {
    this.ouvert.set(!this.ouvert());
  }

  /**
   * Ferme le popover, notamment sur activation de la touche Échap.
   */
  public fermer(): void {
    this.ouvert.set(false);
  }
}
