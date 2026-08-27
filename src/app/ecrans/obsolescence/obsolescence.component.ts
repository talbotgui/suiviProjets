// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Obsolescence (US-051) : grille dense de tuiles, une par projet, portant un indicateur de retard en versions
// majeures par catégorie de dépendance (RG-050, RG-051). Toutes les valeurs sont recalculées à l'affichage depuis
// les constats bruts du dernier audit retenu de chaque projet et le référentiel courant (RG-011, RG-022) — aucun
// verdict n'est jamais stocké.
//
// Décisions arbitraires (à valider par un humain, cf. rapport de développement de cet incrément), faute de maquette
// haute-fidélité :
// - Audit retenu par projet : dernier audit RÉGULIER (`typeAudit !== 'historique'`) dont la date est antérieure ou
//   égale à la date du filtre (initialisée à aujourd'hui), sur le modèle de sélection de la Synthèse des audits.
// - Filtre par catégorie : un couple valeur min / valeur max par catégorie, appliqués en ET ; un couple laissé à
//   pleine amplitude (`[0, max]`) n'est pas un filtre actif (un projet sans valeur pour cette catégorie n'est alors
//   pas exclu) ; dès qu'un couple est resserré, un projet sans valeur pour cette catégorie est exclu.
// - Palette : une teinte constante par catégorie, indexée par la position de la catégorie dans le référentiel
//   (`PALETTE_CATEGORIES`, cycle si plus de catégories que de teintes) ; la valeur est encodée par la seule
//   longueur de barre, la valeur numérique restant toujours affichée (RNF-020).
// - Médiane d'une catégorie : médiane des valeurs des projets AFFICHÉS ayant une valeur pour cette catégorie (les
//   projets sans valeur sont exclus du calcul, jamais comptés `0`).
import {
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import { toPng } from 'html-to-image';
import { SqmBarreMesureComponent } from '../../composants/barre-mesure/barre-mesure.component';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import type { Audit } from '../../services/avecetat/etat/types-donnees';
import { AgregationThemeFicheProjetUtils } from '../../services/sansetat/jugement/agregation-theme-fiche-projet.utils';
import { ExportImageUtils } from '../../services/sansetat/jugement/export-image.utils';
import {
  ObsolescenceRetardUtils,
  type ObsolescenceCategorie,
} from '../../services/sansetat/jugement/obsolescence-retard.utils';
import {
  ParametresJugementUtils,
  type CategorieDependance,
  type RegleDependance,
} from '../../services/sansetat/jugement/parametres-jugement.utils';
import { StatutObsolescenceUtils } from '../../services/sansetat/jugement/statut-obsolescence.utils';
import { TriAlphabetiqueUtils } from '../../services/sansetat/jugement/tri-alphabetique.utils';

/** Teintes catégorielles (même clarté/saturation) ; cyclées si le référentiel porte davantage de catégories. */
const PALETTE_CATEGORIES: readonly string[] = [
  'hsl(215 65% 52%)',
  'hsl(150 48% 42%)',
  'hsl(28 72% 52%)',
  'hsl(280 42% 55%)',
  'hsl(190 55% 45%)',
  'hsl(340 55% 55%)',
];

/** Retard d'obsolescence d'un projet, par catégorie, pour l'audit retenu. */
interface LigneObsolescence {
  readonly projetId: string;
  readonly nomProjet: string;
  readonly groupeId: string;
  readonly nomGroupe: string;
  /** Audit régulier retenu (le plus récent à la date du filtre), `undefined` si le projet n'en a aucun. */
  readonly audit: Audit | undefined;
  /** Retard par identifiant de catégorie ; une catégorie absente signifie « aucune valeur » (jamais `0`). */
  readonly valeurParCategorie: ReadonlyMap<string, number>;
}

/** Couple de bornes d'un filtre par catégorie. */
interface BornesFiltre {
  readonly min: number;
  readonly max: number;
}

/** Ligne de détail d'une dépendance dans la modale du dernier audit d'un projet. */
interface LigneDetailDependance {
  readonly reference: string;
  readonly version: string;
  readonly categorie: string;
  readonly retard: string;
  readonly estJava: boolean;
}

/**
 * Écran Obsolescence : filtres (groupe, date, valeur min/max par catégorie), bandeau de légende (médiane par
 * catégorie, décompte), grille de tuiles projet, modale de détail du dernier audit, export PNG.
 */
@Component({
  selector: 'app-obsolescence',
  imports: [SqmBarreMesureComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './obsolescence.component.html',
  styleUrl: './obsolescence.component.scss',
  host: { '(document:keydown.escape)': 'fermerDetail()' },
})
export class SqmObsolescenceComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly notification: NotificationService = inject(NotificationService);

  private readonly conteneurExport: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('conteneurExport');

  /** Groupe sélectionné (`null` = tous les groupes). */
  public readonly filtreGroupeId: WritableSignal<string | null> = signal<string | null>(null);

  /** Date de l'audit retenu (dernier audit régulier à cette date ou avant), initialisée à aujourd'hui. */
  public readonly filtreDate: WritableSignal<string> = signal(
    SqmObsolescenceComponent.aujourdhui(),
  );

  /**
   * Bornes de filtre resserrées par l'utilisateur, par identifiant de catégorie. Une catégorie absente de cette
   * table n'est pas filtrée (pleine amplitude).
   */
  private readonly bornesFiltre: WritableSignal<ReadonlyMap<string, BornesFiltre>> = signal(
    new Map<string, BornesFiltre>(),
  );

  /** Projet dont la modale de détail est ouverte, `null` si aucune. */
  public readonly projetSelectionne: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Date du jour au format `AAAA-MM-JJ` (locale du système).
   * @returns La date du jour.
   */
  private static aujourdhui(): string {
    const maintenant = new Date();
    return ExportImageUtils.construireHorodatage(maintenant).slice(0, 10);
  }

  /** Groupes disponibles, triés par nom (via le Store). */
  public readonly groupesDisponibles = computed(() => this.donneesApplication.groupes());

  /** Catégories de dépendance du référentiel courant (fixent aussi l'ordre d'affichage des indicateurs). */
  public readonly categories: Signal<readonly CategorieDependance[]> = computed(() => {
    const lecture = ParametresJugementUtils.lireCategoriesDependances(
      this.donneesApplication.racine()?.referentiels,
    );
    return lecture.type === 'valeur' ? lecture.valeur : [];
  });

  /** Retard d'obsolescence de chaque projet (tous groupes), pour la date de filtre courante. */
  private readonly lignesTousProjets: Signal<readonly LigneObsolescence[]> = computed(() => {
    const racine = this.donneesApplication.racine();
    if (racine === null) {
      return [];
    }
    const lectureRegles = ParametresJugementUtils.lireReglesDependances(racine.referentiels);
    const regles: readonly RegleDependance[] =
      lectureRegles.type === 'valeur' ? lectureRegles.valeur : [];
    const categories = this.categories();
    const dateLimite = this.filtreDate();

    const lignes: LigneObsolescence[] = [];
    for (const groupe of racine.groupes) {
      for (const projet of groupe.projets) {
        const audit = projet.audits
          .filter(
            (candidat) =>
              candidat.typeAudit !== 'historique' && candidat.date.slice(0, 10) <= dateLimite,
          )
          .at(-1);
        const obsolescence: readonly ObsolescenceCategorie[] =
          audit === undefined
            ? []
            : ObsolescenceRetardUtils.calculerObsolescenceParCategorie(
                AgregationThemeFicheProjetUtils.regrouper(audit.resultats).dependances,
                regles,
                categories,
              );
        lignes.push({
          projetId: projet.id,
          nomProjet: projet.nom,
          groupeId: groupe.id,
          nomGroupe: groupe.nom,
          audit,
          valeurParCategorie: new Map(
            obsolescence.map((entree) => [entree.categorieId, entree.valeur]),
          ),
        });
      }
    }
    return lignes
      .slice()
      .sort((a, b) => TriAlphabetiqueUtils.comparerTextes(a.nomProjet, b.nomProjet));
  });

  /**
   * Valeur maximale de chaque catégorie, tous filtres ignorés (borne haute des curseurs de filtre, cf. maquette).
   */
  public readonly maxParCategorie: Signal<ReadonlyMap<string, number>> = computed(() => {
    const max = new Map<string, number>();
    for (const ligne of this.lignesTousProjets()) {
      for (const [categorieId, valeur] of ligne.valeurParCategorie) {
        max.set(categorieId, Math.max(max.get(categorieId) ?? 0, valeur));
      }
    }
    return max;
  });

  /** Projets affichés après application des filtres (groupe + min/max par catégorie, en ET). */
  public readonly projetsAffiches: Signal<readonly LigneObsolescence[]> = computed(() => {
    const groupeId = this.filtreGroupeId();
    const bornes = this.bornesFiltre();
    const maxParCategorie = this.maxParCategorie();
    const categories = this.categories();
    return this.lignesTousProjets().filter((ligne) => {
      if (groupeId !== null && ligne.groupeId !== groupeId) {
        return false;
      }
      for (const categorie of categories) {
        const filtre = bornes.get(categorie.id);
        if (filtre === undefined) {
          continue;
        }
        const amplitudeMax = maxParCategorie.get(categorie.id) ?? 0;
        const pleineAmplitude = filtre.min <= 0 && filtre.max >= amplitudeMax;
        if (pleineAmplitude) {
          continue;
        }
        const valeur = ligne.valeurParCategorie.get(categorie.id);
        if (valeur === undefined || valeur < filtre.min || valeur > filtre.max) {
          return false;
        }
      }
      return true;
    });
  });

  /** Médiane de chaque catégorie sur les projets affichés (projets sans valeur exclus). */
  public readonly medianeParCategorie: Signal<ReadonlyMap<string, number>> = computed(() => {
    const mediane = new Map<string, number>();
    for (const categorie of this.categories()) {
      const valeurs = this.projetsAffiches()
        .map((ligne) => ligne.valeurParCategorie.get(categorie.id))
        .filter((valeur): valeur is number => valeur !== undefined)
        .sort((a, b) => a - b);
      if (valeurs.length === 0) {
        continue;
      }
      const milieu = Math.floor(valeurs.length / 2);
      mediane.set(
        categorie.id,
        valeurs.length % 2 === 0 ? (valeurs[milieu - 1] + valeurs[milieu]) / 2 : valeurs[milieu],
      );
    }
    return mediane;
  });

  /** Nombre de projets affichés (décompte du bandeau). */
  public readonly total: Signal<number> = computed(() => this.projetsAffiches().length);

  /** Détail des dépendances du dernier audit retenu du projet sélectionné (modale). */
  public readonly detailProjetSelectionne: Signal<{
    readonly nomProjet: string;
    readonly dateAudit: string;
    readonly lignes: readonly LigneDetailDependance[];
  } | null> = computed(() => {
    const projetId = this.projetSelectionne();
    if (projetId === null) {
      return null;
    }
    const ligne = this.lignesTousProjets().find((candidat) => candidat.projetId === projetId);
    if (ligne === undefined) {
      return null;
    }
    if (ligne.audit === undefined) {
      return { nomProjet: ligne.nomProjet, dateAudit: 'jamais audité', lignes: [] };
    }
    const racine = this.donneesApplication.racine();
    const lectureRegles = ParametresJugementUtils.lireReglesDependances(racine?.referentiels);
    const regles: readonly RegleDependance[] =
      lectureRegles.type === 'valeur' ? lectureRegles.valeur : [];
    const libelleParCategorie = new Map(
      this.categories().map((categorie) => [categorie.id, categorie.libelle]),
    );
    const dependances = AgregationThemeFicheProjetUtils.regrouper(
      ligne.audit.resultats,
    ).dependances;
    const lignesDetail: LigneDetailDependance[] = dependances.map((dependance) => {
      const regle = StatutObsolescenceUtils.trouverRegle(dependance.reference, regles);
      const retard =
        regle === undefined
          ? undefined
          : ObsolescenceRetardUtils.calculerRetardDependance(dependance, regle);
      const categorieId = regle?.categorie;
      return {
        reference: dependance.reference,
        version: dependance.version,
        categorie: categorieId === undefined ? '—' : (libelleParCategorie.get(categorieId) ?? '—'),
        retard: retard === undefined ? '—' : String(retard),
        estJava: dependance.reference === 'java',
      };
    });
    return {
      nomProjet: ligne.nomProjet,
      dateAudit: ligne.audit.date.slice(0, 10),
      lignes: lignesDetail.slice().sort((a, b) => a.reference.localeCompare(b.reference)),
    };
  });

  /**
   * Couleur de barre associée à une catégorie (par position dans le référentiel).
   * @param categorieId - Identifiant de la catégorie.
   * @returns La couleur CSS.
   */
  public couleurCategorie(categorieId: string): string {
    const index = this.categories().findIndex((categorie) => categorie.id === categorieId);
    const position = index < 0 ? 0 : index;
    return PALETTE_CATEGORIES[position % PALETTE_CATEGORIES.length];
  }

  /**
   * Valeur d'obsolescence d'un projet pour une catégorie, ou `null` si le projet n'a aucune dépendance de cette
   * catégorie au dernier audit retenu.
   * @param ligne - Ligne du projet.
   * @param categorieId - Identifiant de la catégorie.
   * @returns La valeur, ou `null`.
   */
  public valeurProjet(ligne: LigneObsolescence, categorieId: string): number | null {
    return ligne.valeurParCategorie.get(categorieId) ?? null;
  }

  /**
   * Infobulle native d'une tuile : détail texte complet de toutes les catégories du projet.
   * @param ligne - Ligne du projet.
   * @returns Le texte de l'infobulle.
   */
  public infobulleProjet(ligne: LigneObsolescence): string {
    const details = this.categories().map((categorie) => {
      const valeur = ligne.valeurParCategorie.get(categorie.id);
      return `${categorie.libelle} : ${valeur === undefined ? 'aucune dépendance' : `${valeur} version(s) majeure(s) de retard`}`;
    });
    return `${ligne.nomProjet} (${ligne.nomGroupe})\n${details.join('\n')}`;
  }

  /**
   * Borne minimale actuelle du filtre d'une catégorie (0 par défaut).
   * @param categorieId - Identifiant de la catégorie.
   * @returns La borne minimale.
   */
  public minFiltre(categorieId: string): number {
    return this.bornesFiltre().get(categorieId)?.min ?? 0;
  }

  /**
   * Borne maximale actuelle du filtre d'une catégorie (max de la catégorie par défaut).
   * @param categorieId - Identifiant de la catégorie.
   * @returns La borne maximale.
   */
  public maxFiltre(categorieId: string): number {
    return (
      this.bornesFiltre().get(categorieId)?.max ?? this.maxParCategorie().get(categorieId) ?? 0
    );
  }

  /**
   * Applique une borne de filtre saisie pour une catégorie.
   * @param categorieId - Identifiant de la catégorie.
   * @param borne - Borne concernée.
   * @param valeur - Nouvelle valeur brute saisie.
   */
  public onChangerBorne(categorieId: string, borne: 'min' | 'max', valeur: string): void {
    const nombre = Number.parseInt(valeur, 10);
    const amplitudeMax = this.maxParCategorie().get(categorieId) ?? 0;
    const courant: BornesFiltre = {
      min: this.minFiltre(categorieId),
      max: this.maxFiltre(categorieId),
    };
    const nouveau: BornesFiltre =
      borne === 'min'
        ? { ...courant, min: Number.isNaN(nombre) ? 0 : Math.max(0, Math.min(nombre, courant.max)) }
        : {
            ...courant,
            max: Number.isNaN(nombre)
              ? amplitudeMax
              : Math.min(amplitudeMax, Math.max(nombre, courant.min)),
          };
    const table = new Map(this.bornesFiltre());
    table.set(categorieId, nouveau);
    this.bornesFiltre.set(table);
  }

  /**
   * Met à jour le filtre de groupe.
   * @param valeur - Identifiant de groupe, ou chaîne vide pour « tous les groupes ».
   */
  public onChangerGroupe(valeur: string): void {
    this.filtreGroupeId.set(valeur.length === 0 ? null : valeur);
  }

  /**
   * Met à jour la date de l'audit retenu.
   * @param valeur - Date saisie au format `AAAA-MM-JJ`.
   */
  public onChangerDate(valeur: string): void {
    if (valeur.length > 0) {
      this.filtreDate.set(valeur);
    }
  }

  /**
   * Ouvre la modale de détail du dernier audit d'un projet.
   * @param projetId - Identifiant du projet.
   */
  public ouvrirDetail(projetId: string): void {
    this.projetSelectionne.set(projetId);
  }

  /** Ferme la modale de détail. */
  public fermerDetail(): void {
    this.projetSelectionne.set(null);
  }

  /**
   * Exporte la grille courante en image PNG et déclenche son téléchargement (US-047, RG-047).
   */
  public async exporterPng(): Promise<void> {
    const conteneur = this.conteneurExport()?.nativeElement;
    if (conteneur === undefined) {
      return;
    }
    const dataUrl = await toPng(conteneur);
    const nomFichier = `obsolescence-${ExportImageUtils.construireHorodatage(new Date())}.png`;
    const lien = document.createElement('a');
    lien.href = dataUrl;
    lien.download = nomFichier;
    lien.click();
    this.notification.succes(
      `L'image ${nomFichier} a été téléchargée dans le dossier de téléchargements de votre navigateur/système.`,
    );
  }
}
