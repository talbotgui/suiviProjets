// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Fonctions génériques réutilisables « valeur + seuils orange/rouge → couleur », factorisant le motif répété par
// RG-022 (violations bloquant/critique, couverture, vitalité, MR ouvertes) plutôt que de le dupliquer dans chaque
// fonction du Moteur de jugement qui en a besoin.
/**
 *
 */
export class SeuilsCouleurUtils {
  /**
   * Calcule une couleur pour une valeur dont la gravité CROÎT avec sa grandeur (ex. nombre de violations, âge
   * d'une MR ouverte, nombre de jours depuis le dernier commit) : `rouge` dès que `valeur` atteint ou dépasse
   * `seuilRouge`, `orange` dès qu'elle atteint ou dépasse `seuilOrange` (mais reste sous `seuilRouge`), `vert`
   * sinon. Cas limite documenté : une valeur exactement égale à un seuil appartient déjà à la couleur de ce seuil
   * (comparaison `>=`), cohérent avec la convention du gabarit `ExempleReferenceUtils.atteintLeSeuil`.
   * @param valeur - Valeur constatée.
   * @param seuilOrange - Seuil à partir duquel la valeur est jugée orange.
   * @param seuilRouge - Seuil à partir duquel la valeur est jugée rouge.
   * @returns La couleur calculée.
   */
  public static calculerCouleurCroissante(
    valeur: number,
    seuilOrange: number,
    seuilRouge: number,
  ): Couleur {
    if (valeur >= seuilRouge) {
      return 'rouge';
    }
    if (valeur >= seuilOrange) {
      return 'orange';
    }
    return 'vert';
  }

  /**
   * Calcule une couleur pour une valeur dont la gravité DÉCROÎT avec sa grandeur (ex. pourcentage de couverture de
   * tests) : `rouge` dès que `valeur` descend strictement sous `seuilRouge`, `orange` dès qu'elle descend
   * strictement sous `seuilOrange` (mais reste à `seuilRouge` ou au-dessus), `vert` sinon. Cas limite documenté :
   * une valeur exactement égale à un seuil appartient à la couleur supérieure, jamais à la couleur inférieure
   * (comparaison stricte `<`), symétrique de {@link calculerCouleurCroissante}.
   * @param valeur - Valeur constatée.
   * @param seuilRouge - Seuil en-dessous duquel la valeur est jugée rouge.
   * @param seuilOrange - Seuil en-dessous duquel la valeur est jugée orange (au-delà de `seuilRouge`).
   * @returns La couleur calculée.
   */
  public static calculerCouleurDecroissante(
    valeur: number,
    seuilRouge: number,
    seuilOrange: number,
  ): Couleur {
    if (valeur < seuilRouge) {
      return 'rouge';
    }
    if (valeur < seuilOrange) {
      return 'orange';
    }
    return 'vert';
  }

  /**
   * Calcule une couleur binaire rouge/vert à partir d'un unique seuil (ex. taux de conflit des MR ouvertes, qui ne
   * porte qu'un seuil rouge dans `parametres.seuils.mrOuvertes.pourcentageConflitRouge`, aucun seuil orange
   * intermédiaire n'étant défini par le modèle de données) : `rouge` dès que `valeur` atteint ou dépasse
   * `seuilRouge`, `vert` sinon.
   * @param valeur - Valeur constatée.
   * @param seuilRouge - Seuil à partir duquel la valeur est jugée rouge.
   * @returns La couleur calculée.
   */
  public static calculerCouleurSeuilUnique(valeur: number, seuilRouge: number): Couleur {
    return valeur >= seuilRouge ? 'rouge' : 'vert';
  }

  /**
   * Calcule la couleur de vitalité d'un dépôt à partir du nombre de jours écoulés depuis le dernier commit et des
   * seuils courants `parametres.seuils.vitalite` : réutilise {@link calculerCouleurCroissante} avec `mourantJours`/
   * `mortJours` comme seuils orange/rouge.
   * @param joursDepuisDernierCommit - Nombre de jours écoulés depuis le dernier commit constaté.
   * @param mourantJours - Seuil de vitalité `mourantJours` (`parametres.seuils.vitalite.mourantJours`).
   * @param mortJours - Seuil de vitalité `mortJours` (`parametres.seuils.vitalite.mortJours`).
   * @returns La couleur de vitalité calculée.
   */
  public static calculerCouleurVitalite(
    joursDepuisDernierCommit: number,
    mourantJours: number,
    mortJours: number,
  ): Couleur {
    return SeuilsCouleurUtils.calculerCouleurCroissante(
      joursDepuisDernierCommit,
      mourantJours,
      mortJours,
    );
  }

  /**
   * Calcule la couleur d'âge d'une demande de fusion ouverte à partir des seuils courants
   * `parametres.seuils.mrOuvertes` : réutilise {@link calculerCouleurCroissante} avec `ageOrangeJours`/
   * `ageRougeJours` comme seuils orange/rouge.
   * @param ageJours - Âge en jours de la demande de fusion ouverte constatée.
   * @param ageOrangeJours - Seuil `ageOrangeJours` (`parametres.seuils.mrOuvertes.ageOrangeJours`).
   * @param ageRougeJours - Seuil `ageRougeJours` (`parametres.seuils.mrOuvertes.ageRougeJours`).
   * @returns La couleur d'âge calculée.
   */
  public static calculerCouleurAgeMrOuverte(
    ageJours: number,
    ageOrangeJours: number,
    ageRougeJours: number,
  ): Couleur {
    return SeuilsCouleurUtils.calculerCouleurCroissante(ageJours, ageOrangeJours, ageRougeJours);
  }

  /**
   * Calcule la couleur du taux de conflit des demandes de fusion ouvertes à partir du seuil courant
   * `parametres.seuils.mrOuvertes.pourcentageConflitRouge` : réutilise {@link calculerCouleurSeuilUnique}.
   * @param pourcentageConflit - Pourcentage constaté de demandes de fusion ouvertes en conflit.
   * @param pourcentageConflitRouge - Seuil `pourcentageConflitRouge`
   * (`parametres.seuils.mrOuvertes.pourcentageConflitRouge`).
   * @returns La couleur calculée.
   */
  public static calculerCouleurConflitMrOuvertes(
    pourcentageConflit: number,
    pourcentageConflitRouge: number,
  ): Couleur {
    return SeuilsCouleurUtils.calculerCouleurSeuilUnique(
      pourcentageConflit,
      pourcentageConflitRouge,
    );
  }

  /**
   * Calcule la couleur de couverture de tests Sonar à partir des seuils courants `parametres.seuils.couverture` :
   * réutilise {@link calculerCouleurDecroissante} (une couverture plus élevée est toujours meilleure).
   * @param couverturePourcentage - Pourcentage de couverture constaté.
   * @param seuilRouge - Seuil `seuilRouge` (`parametres.seuils.couverture.seuilRouge`).
   * @param seuilOrange - Seuil `seuilOrange` (`parametres.seuils.couverture.seuilOrange`).
   * @returns La couleur de couverture calculée.
   */
  public static calculerCouleurCouverture(
    couverturePourcentage: number,
    seuilRouge: number,
    seuilOrange: number,
  ): Couleur {
    return SeuilsCouleurUtils.calculerCouleurDecroissante(
      couverturePourcentage,
      seuilRouge,
      seuilOrange,
    );
  }

  /**
   * Calcule la couleur du décompte de violations d'une sévérité donnée (bloquant ou critique) à partir des seuils
   * courants `parametres.seuils.couleursViolations.{bloquant,critique}` : réutilise
   * {@link calculerCouleurCroissante}.
   * @param nombreViolations - Nombre de violations constaté pour la sévérité concernée.
   * @param seuilOrange - Seuil orange de la sévérité concernée.
   * @param seuilRouge - Seuil rouge de la sévérité concernée.
   * @returns La couleur calculée.
   */
  public static calculerCouleurViolations(
    nombreViolations: number,
    seuilOrange: number,
    seuilRouge: number,
  ): Couleur {
    return SeuilsCouleurUtils.calculerCouleurCroissante(nombreViolations, seuilOrange, seuilRouge);
  }
}

/**
 * Couleur sémantique d'un jugement (RG-022), toujours doublée d'un libellé textuel à l'affichage (jamais de couleur
 * seule porteuse de sens, cf. `docs/02_documentation/10_charteErgonomie.md#rappel-des-exigences-daccessibilité).
 * `vert`/`orange`/`rouge` forment le dégradé de gravité des seuils de jugement (RG-022) ; `bleu` est une couleur
 * dédiée hors dégradé, réservée au statut IA « interdite — conforme sous réserve » (RG-016, R10-03), pour ne pas la
 * confondre avec un niveau de gravité de seuil.
 */
export type Couleur = 'vert' | 'orange' | 'rouge' | 'bleu';
