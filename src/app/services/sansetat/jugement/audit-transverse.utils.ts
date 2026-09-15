// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Construit la liste transverse des audits de tous les projets de tous les groupes (US-063, RG-063, plan_20
// Partie D, section « Suppression ciblée » de l'onglet Paramétrage « Purge des audits »).
//
// Décision d'architecture (même principe que `agregation-theme-fiche-projet.utils.ts`, Phase 6 incrément 5) : ce
// module, classé sous `services/sansetat/`, n'importe rien de `services/avecetat/` (frontière de couches du
// projet). Les formes d'entrée ci-dessous (`*SourceLigneAuditTransverse`) sont donc des interfaces structurelles
// minimales, délibérément plus étroites que `DonneesRacine`/`Groupe`/`Projet`/`Audit`/`Campagne`
// (`services/avecetat/etat/types-donnees.ts`) : un objet réel de ces types reste structurellement assignable à ces
// formes (surtypage par largeur, TypeScript), ce qui permet de transmettre directement la racine chargée sans
// assertion de type (`as`, interdite par `@typescript-eslint/consistent-type-assertions`) ni généricité complexe.
import { DateCalendaireUtils } from './date-calendaire.utils';

/**
 * Audit source minimal requis par ce module (sous-ensemble structurel de `Audit`).
 */
export interface AuditSourceLigneAuditTransverse {
  readonly id: string;
  readonly date: string;
  readonly campagneId: string;
  readonly typeAudit: 'reguliere' | 'historique';
  readonly dateExecution?: string;
  readonly resultats: readonly unknown[];
}

/**
 * Projet source minimal requis par ce module (sous-ensemble structurel de `Projet`).
 */
export interface ProjetSourceLigneAuditTransverse {
  readonly id: string;
  readonly nom: string;
  readonly audits: readonly AuditSourceLigneAuditTransverse[];
}

/**
 * Groupe source minimal requis par ce module (sous-ensemble structurel de `Groupe`).
 */
export interface GroupeSourceLigneAuditTransverse {
  readonly id: string;
  readonly nom: string;
  readonly projets: readonly ProjetSourceLigneAuditTransverse[];
}

/**
 * Campagne source minimale requise par ce module (sous-ensemble structurel de `Campagne`).
 */
export interface CampagneSourceLigneAuditTransverse {
  readonly id: string;
  readonly date: string;
}

/**
 * Racine source minimale requise par ce module (sous-ensemble structurel de `DonneesRacine`).
 */
export interface RacineSourceLigneAuditTransverse {
  readonly groupes: readonly GroupeSourceLigneAuditTransverse[];
  readonly campagnes: readonly CampagneSourceLigneAuditTransverse[];
}

/**
 * Ligne de la liste transverse des audits (US-063), une par audit, tous groupes et projets confondus.
 */
export interface LigneAuditTransverse {
  /** Identifiant de l'audit (utilisé pour la sélection et la suppression). */
  readonly auditId: string;
  /** Identifiant du groupe de rattachement. */
  readonly groupeId: string;
  /** Libellé du groupe de rattachement. */
  readonly groupeLabel: string;
  /** Identifiant du projet de rattachement. */
  readonly projetId: string;
  /** Libellé du projet de rattachement. */
  readonly projetLabel: string;
  /** Type de l'audit, brut (valeur de filtre). */
  readonly type: 'reguliere' | 'historique';
  /** Libellé du type de l'audit, tel qu'affiché en colonne. */
  readonly typeLabel: 'régulier' | 'historique';
  /** Date ciblée mise en forme (`JJ/MM/AAAA`). */
  readonly dateCibleeLabel: string;
  /** Date ciblée brute (`AAAA-MM-JJ…`), triable/filtrable lexicalement. */
  readonly dateCibleeTri: string;
  /** Date de réalisation / création mise en forme (`JJ/MM/AAAA`) : `dateExecution` si renseigné, sinon `date`. */
  readonly dateRealisationLabel: string;
  /** Date de réalisation / création brute, triable/filtrable lexicalement. */
  readonly dateRealisationTri: string;
  /** Libellé de la campagne d'origine (sa date), `—` si introuvable. */
  readonly campagneLabel: string;
  /** Nombre d'indicateurs (résultats) portés par cet audit. */
  readonly nombreIndicateurs: number;
}

/**
 * Construit la liste transverse des audits de tous les projets de tous les groupes (US-063), pour la section
 * « Suppression ciblée » de l'onglet Paramétrage « Purge des audits ». Fonction pure, sans effet de bord : lecture
 * seule de la racine, aucune mutation.
 */
export class AuditTransverseUtils {
  /**
   * Met en forme une date en `JJ/MM/AAAA`, à partir soit d'une date calendaire (`AAAA-MM-JJ`, sans passer par
   * `Date`), soit d'un horodatage complet (jour civil local extrait de l'instant).
   * @param dateIso - Date calendaire ou horodatage ISO 8601 à mettre en forme.
   * @returns Le libellé `JJ/MM/AAAA` correspondant.
   */
  private static formaterDate(dateIso: string): string {
    if (DateCalendaireUtils.estDateCalendaire(dateIso)) {
      return DateCalendaireUtils.formaterFr(dateIso);
    }
    const date = new Date(dateIso);
    const deuxChiffres = (valeur: number): string => valeur.toString().padStart(2, '0');
    return `${deuxChiffres(date.getDate())}/${deuxChiffres(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  /**
   * Construit la liste transverse des audits, une ligne par audit, tous groupes et projets confondus.
   * @param racine - Racine des données chargées (ou tout objet structurellement compatible, cf. commentaire
   * d'en-tête).
   * @returns Les lignes construites, dans l'ordre de parcours des groupes/projets/audits (aucun tri appliqué ici :
   * le tri par défaut, décroissant sur la date de réalisation, est appliqué par l'écran appelant).
   */
  public static construireLignes(
    racine: RacineSourceLigneAuditTransverse,
  ): readonly LigneAuditTransverse[] {
    const campagnesParId = new Map(
      racine.campagnes.map((campagne) => [campagne.id, campagne] as const),
    );
    const lignes: LigneAuditTransverse[] = [];
    for (const groupe of racine.groupes) {
      for (const projet of groupe.projets) {
        for (const audit of projet.audits) {
          const dateRealisation = audit.dateExecution ?? audit.date;
          const campagne = campagnesParId.get(audit.campagneId);
          lignes.push({
            auditId: audit.id,
            groupeId: groupe.id,
            groupeLabel: groupe.nom,
            projetId: projet.id,
            projetLabel: projet.nom,
            type: audit.typeAudit,
            typeLabel: audit.typeAudit === 'historique' ? 'historique' : 'régulier',
            dateCibleeLabel: AuditTransverseUtils.formaterDate(audit.date),
            dateCibleeTri: audit.date,
            dateRealisationLabel: AuditTransverseUtils.formaterDate(dateRealisation),
            dateRealisationTri: dateRealisation,
            campagneLabel:
              campagne === undefined ? '—' : AuditTransverseUtils.formaterDate(campagne.date),
            nombreIndicateurs: audit.resultats.length,
          });
        }
      }
    }
    return lignes;
  }
}
