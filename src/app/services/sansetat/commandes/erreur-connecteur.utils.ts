// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Vocabulaire français partagé pour les 7 catégories de `CategorieErreurConnecteur` (Phase 5, incrément 6, écran
// Brouillon et rapport d'anomalies, F08/RG-021). `docs/01_besoin/Specification.md#58-f08--rapport-danomalies-
// techniques-daudit` exige explicitement que ce vocabulaire soit le même que celui du futur test de connectivité
// global (F24, hors périmètre à ce jour, cf. `docs/02_documentation/04_casUsage.md` : aucun écran ne consomme
// encore `testerConnectivite`) : factorisé ici plutôt que codé en dur dans l'écran Brouillon, pour rester le point
// d'entrée unique le jour où F24 sera construit. Classe à membres statiques uniquement, sur le modèle du gabarit
// `ExempleReferenceUtils`.
import type { CategorieErreurConnecteur } from './types-facade';

/**
 * Vocabulaire français (libellé de catégorie et action suggérée) associé à une anomalie de connecteur (RG-021,
 * F08/F24).
 */
export class ErreurConnecteurUtils {
  /**
   * Libellé lisible d'une catégorie d'anomalie de connecteur.
   * @param categorie - Catégorie typée (`ErreurConnecteur.type`).
   * @returns Le libellé à afficher.
   */
  public static libelleCategorie(categorie: CategorieErreurConnecteur): string {
    switch (categorie) {
      case 'authentificationRefusee':
        return 'Authentification refusée';
      case 'refIntrouvable':
        return 'Référence introuvable';
      case 'instanceInjoignable':
        return 'Instance injoignable';
      case 'delaiDepasse':
        return 'Délai dépassé';
      case 'reponseInattendue':
        return 'Réponse inattendue';
      case 'droitsInsuffisants':
        return 'Droits insuffisants';
      case 'credentialAbsent':
        return 'Credential absent';
    }
  }

  /**
   * Action suggérée en langage clair pour une catégorie d'anomalie de connecteur (F08 : « accompagnée d'une action
   * suggérée en langage clair »).
   * @param categorie - Catégorie typée (`ErreurConnecteur.type`).
   * @returns L'action suggérée à afficher.
   */
  public static actionSuggeree(categorie: CategorieErreurConnecteur): string {
    switch (categorie) {
      case 'authentificationRefusee':
        return 'Vérifier que le credential enregistré pour cette instance est toujours valide, et le régénérer si nécessaire.';
      case 'refIntrouvable':
        return 'Vérifier que la référence auditée (branche, tag ou SHA) existe toujours sur ce dépôt.';
      case 'instanceInjoignable':
        return "Vérifier l'accessibilité réseau de l'instance (URL, proxy, VPN) puis réessayer.";
      case 'delaiDepasse':
        return "Réessayer plus tard ; si l'anomalie persiste, vérifier la charge ou la disponibilité de l'instance.";
      case 'reponseInattendue':
        return "Vérifier la version de l'instance ; signaler l'anomalie si elle persiste après une nouvelle tentative.";
      case 'droitsInsuffisants':
        return 'Vérifier que le credential dispose des droits nécessaires sur ce projet ou ce dépôt.';
      case 'credentialAbsent':
        return 'Saisir un credential pour cette instance avant de relancer une campagne.';
    }
  }
}
