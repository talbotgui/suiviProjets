// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant transverse « Tableau dense » de la charte d'ergonomie (cf.
// docs/02_documentation/10_charteErgonomie.md#composants-dinterface-réutilisables : « Première colonne fixe au
// défilement horizontal, en-têtes explicites, tri et filtres accessibles au clavier, ligne activable pour naviguer
// vers le détail »), premier consommateur : l'écran Synthèse des audits (US-015).
//
// Décision d'architecture (à valider par un humain, cf. rapport de développement de cet incrément) : généricité sur
// le type `T` de chaque ligne, à l'image de `RegleMembreConnu<TStatut>` (`statut-membre.utils.ts`). Plutôt qu'une
// projection de contenu par gabarit (`ng-template` par colonne, dont la généricité côté vérification de type
// stricte des gabarits Angular reste délicate sans assertion de type), chaque colonne fournit une fonction pure
// `extraireCellule` qui transforme la ligne en une structure de données déclarative fermée
// ({@link CelluleTableauDense}, une liste de segments texte/texte coloré/badge/icône) : le composant reste ainsi
// entièrement générique (aucune connaissance du type `T` ni du domaine synthèse d'audits) tout en permettant un
// contenu de cellule riche (ex. nom de projet suivi d'un badge « AUDIT ANCIEN »), sans jamais recourir à une
// assertion de type (`as`, interdite par `@typescript-eslint/consistent-type-assertions` de ce projet). Le type
// `Couleur` réutilisé par {@link SegmentCelluleTableauDense} provient du Moteur de jugement
// (`services/sansetat/jugement/seuils-couleur.utils.ts`) : ce n'est pas une dépendance au domaine synthèse d'audits,
// seulement au vocabulaire de couleur sémantique déjà partagé par `SqmBadgeComponent` (même import).
//
// Couverture de la charte : première colonne fixe (position `sticky`, appliquée par convention à la colonne
// d'indice 0 de {@link colonnes}) ; tri au clavier (chaque en-tête triable est un `<button>`, nativement activable
// au clavier, aucun gestionnaire dédié nécessaire) ; filtres au clavier (une ligne de champs texte natifs, un par
// colonne filtrable) ; ligne activable (clic ou touche Entrée sur la ligne, événement {@link activerLigne}).
//
// Ajout Phase 6, incrément 4 (correction de relecture) : {@link ColonneTableauDense.explication}, optionnel, permet
// d'accrocher un déclencheur `SqmExplicationJugementComponent` (charte d'ergonomie : « l'interface donne accès, en
// un clic, à l'explication du calcul ») à une colonne. Porté par l'EN-TÊTE de la colonne, pas par chaque cellule :
// le seuil/référentiel expliqué est le même pour toutes les lignes d'une colonne donnée, dupliquer le déclencheur
// par ligne aurait multiplié inutilement le nombre de popovers (ex. 6 projets × 5 colonnes concernées = 30
// déclencheurs identiques) sans bénéfice pour l'utilisateur. Import de `SqmExplicationJugementComponent` depuis un
// autre composant transverse du même dossier `composants/` : ne crée aucune dépendance vers `services/avecetat/`
// ni vers un domaine métier particulier (même précédent que l'import de `SqmBadgeComponent` ci-dessous).
import { Component, computed, input, output, signal } from '@angular/core';
import type { InputSignal, OutputEmitterRef, Signal, WritableSignal } from '@angular/core';
import { SqmBadgeComponent } from '../badge/badge.component';
import { SqmExplicationJugementComponent } from '../explication-jugement/explication-jugement.component';
import type { CleExplicationJugement } from '../explication-jugement/explication-jugement.component';
import type { Couleur } from '../../services/sansetat/jugement/seuils-couleur.utils';

/**
 * Segment de contenu d'une cellule de tableau dense, forme fermée couvrant les besoins de restitution du Moteur de
 * jugement (texte brut, texte coloré sans pastille, badge/pastille, icône), sans que ce composant n'ait à connaître
 * le domaine métier de l'écran appelant.
 */
export type SegmentCelluleTableauDense =
  | { readonly type: 'texte'; readonly valeur: string }
  | { readonly type: 'texteCouleur'; readonly valeur: string; readonly couleur: Couleur }
  | { readonly type: 'badge'; readonly libelle: string; readonly couleur: Couleur }
  | { readonly type: 'icone'; readonly symbole: string; readonly titre: string };

/**
 * Contenu calculé d'une cellule de tableau dense (cf. {@link SegmentCelluleTableauDense}).
 */
export interface CelluleTableauDense {
  /** Segments composant la cellule, restitués dans l'ordre. */
  readonly segments: readonly SegmentCelluleTableauDense[];
  /**
   * Grise visuellement cette seule cellule (indépendamment du grisage de ligne porté par
   * {@link SqmTableauDenseComponent.ligneGrisee}), ex. RG-013 : le badge SONAR_KO grise les métriques Sonar
   * concernées d'une ligne par ailleurs normalement affichée. Absent/`false` : cellule non grisée.
   */
  readonly grisee?: boolean;
}

/**
 * Définition d'une colonne de tableau dense, générique sur le type `T` des lignes restituées par le composant
 * appelant. La colonne d'indice 0 de la liste transmise à {@link SqmTableauDenseComponent.colonnes} est
 * conventionnellement la colonne fixe au défilement horizontal (cf. commentaire d'en-tête).
 */
export interface ColonneTableauDense<T> {
  /** Clé stable de la colonne (utilisée pour le tri, le filtre et le suivi de rendu). */
  readonly cle: string;
  /** Libellé affiché en en-tête. */
  readonly libelle: string;
  /** `true` si la colonne est triable (en-tête rendu comme bouton), `false`/absent sinon. */
  readonly triable?: boolean;
  /** `true` si la colonne porte un champ de filtre texte dédié, `false`/absent sinon. */
  readonly filtrable?: boolean;
  /**
   * Extrait la représentation texte brute d'une ligne pour cette colonne, utilisée par le filtre et, à défaut de
   * {@link extraireValeurTri}, par le tri.
   * @param ligne - Ligne dont le texte brut est demandé.
   */
  readonly extraireTexteBrut: (ligne: T) => string;
  /**
   * Extrait la valeur de tri d'une ligne pour cette colonne, si distincte du texte brut (ex. valeur numérique
   * plutôt que son libellé formaté). Absente : {@link extraireTexteBrut} est utilisé pour le tri.
   * @param ligne - Ligne dont la valeur de tri est demandée.
   */
  readonly extraireValeurTri?: (ligne: T) => string | number;
  /**
   * Calcule le contenu riche affiché dans la cellule.
   * @param ligne - Ligne dont la cellule est demandée.
   */
  readonly extraireCellule: (ligne: T) => CelluleTableauDense;
  /**
   * Déclencheur d'explication du calcul (charte d'ergonomie) affiché dans l'en-tête de cette colonne, absent si le
   * jugement restitué par cette colonne ne repose sur aucun seuil/référentiel de `parametres`/`referentiels`
   * (auquel cas il n'y a rien à expliquer, cf. décision arbitraire documentée dans le rapport de développement pour
   * les colonnes Notes Sonar et Taille, en l'état actuel du modèle de données).
   */
  readonly explication?: {
    /** Clé du seuil ou référentiel à expliquer (cf. `CleExplicationJugement`). */
    readonly cle: CleExplicationJugement;
    /** Valeur brute de `parametres.seuils`, transmise telle quelle (non interprétée par ce composant). */
    readonly seuilsBruts?: unknown;
    /** Valeur brute de `referentiels`, transmise telle quelle (non interprétée par ce composant). */
    readonly referentielsBruts?: unknown;
  };
}

/**
 * Sens de tri courant d'une colonne.
 */
type SensTri = 'asc' | 'desc';

/**
 * Composant transverse « Tableau dense » (cf. commentaire d'en-tête) : première colonne fixe au défilement
 * horizontal, tri et filtres accessibles au clavier, ligne activable. Générique sur le type `T` des lignes fournies
 * par le composant appelant : ce composant ne connaît aucun domaine métier, seulement la structure déclarative de
 * {@link ColonneTableauDense}/{@link CelluleTableauDense}.
 */
@Component({
  selector: 'app-tableau-dense',
  imports: [SqmBadgeComponent, SqmExplicationJugementComponent],
  templateUrl: './tableau-dense.component.html',
  styleUrl: './tableau-dense.component.scss',
})
export class SqmTableauDenseComponent<T> {
  /**
   * Colonnes du tableau, dans l'ordre d'affichage (la colonne d'indice 0 est la colonne fixe).
   */
  public readonly colonnes: InputSignal<readonly ColonneTableauDense<T>[]> = input.required();

  /**
   * Lignes à restituer, avant application du tri et des filtres internes du composant.
   */
  public readonly lignes: InputSignal<readonly T[]> = input.required();

  /**
   * Extrait l'identifiant stable d'une ligne, utilisé comme clé de suivi de rendu.
   */
  public readonly identifiant: InputSignal<(ligne: T) => string> = input.required();

  /**
   * Prédicat optionnel désignant les lignes désactivées (non activables au clic/Entrée, ex. ligne « jamais
   * audité » de la Synthèse des audits). Absent : aucune ligne n'est désactivée.
   */
  public readonly ligneDesactivee: InputSignal<((ligne: T) => boolean) | undefined> = input<
    ((ligne: T) => boolean) | undefined
  >(undefined);

  /**
   * Prédicat optionnel désignant les lignes grisées visuellement (sans désactiver leur activation), ex. ligne
   * « jamais audité » de la Synthèse des audits (RG grisage, sans seuil de couleur applicable). Absent : aucune
   * ligne n'est grisée.
   */
  public readonly ligneGrisee: InputSignal<((ligne: T) => boolean) | undefined> = input<
    ((ligne: T) => boolean) | undefined
  >(undefined);

  /**
   * Émis lorsque l'utilisateur active une ligne non désactivée (clic ou touche Entrée), avec la ligne concernée.
   */
  public readonly activerLigne: OutputEmitterRef<T> = output();

  /**
   * Clé de la colonne actuellement utilisée pour le tri, `null` si aucun tri n'est appliqué.
   */
  private readonly colonneTri: WritableSignal<string | null> = signal(null);

  /**
   * Sens de tri actuellement appliqué à {@link colonneTri}.
   */
  private readonly sensTri: WritableSignal<SensTri> = signal('asc');

  /**
   * Valeurs de filtre texte actuellement saisies, par clé de colonne filtrable.
   */
  private readonly filtres: WritableSignal<Readonly<Record<string, string>>> = signal({});

  /**
   * Lignes à afficher après application des filtres et du tri courants.
   */
  public readonly lignesAffichees: Signal<readonly T[]> = computed(() =>
    this.calculerLignesAffichees(),
  );

  /**
   * Indique si la colonne d'indice donné est la colonne fixe au défilement horizontal (convention : colonne
   * d'indice 0).
   * @param index - Indice de la colonne dans {@link colonnes}.
   * @returns `true` si cette colonne doit rester fixe au défilement horizontal.
   */
  public estColonneFixe(index: number): boolean {
    return index === 0;
  }

  /**
   * Indique si au moins une colonne porte un champ de filtre, condition d'affichage de la ligne de filtres.
   * @returns `true` si au moins une colonne est filtrable.
   */
  public auMoinsUneColonneFiltrable(): boolean {
    return this.colonnes().some((colonne) => colonne.filtrable === true);
  }

  /**
   * Valeur actuellement saisie dans le champ de filtre d'une colonne.
   * @param cle - Clé de la colonne concernée.
   * @returns La valeur saisie, chaîne vide si aucun filtre n'est actif sur cette colonne.
   */
  public valeurFiltre(cle: string): string {
    return this.filtres()[cle] ?? '';
  }

  /**
   * Met à jour le filtre texte d'une colonne.
   * @param cle - Clé de la colonne concernée.
   * @param valeur - Nouvelle valeur du filtre.
   */
  public definirFiltre(cle: string, valeur: string): void {
    this.filtres.update((actuel) => ({ ...actuel, [cle]: valeur }));
  }

  /**
   * Bascule le tri sur une colonne triable : applique le tri ascendant si la colonne n'était pas déjà celle triée,
   * sinon inverse le sens courant (ascendant/descendant).
   * @param cle - Clé de la colonne à trier.
   */
  public trierPar(cle: string): void {
    if (this.colonneTri() === cle) {
      this.sensTri.set(this.sensTri() === 'asc' ? 'desc' : 'asc');
    } else {
      this.colonneTri.set(cle);
      this.sensTri.set('asc');
    }
  }

  /**
   * Indicateur textuel du sens de tri courant d'une colonne, destiné à un affichage visuel (doublé de
   * {@link directionTri} pour les technologies d'assistance).
   * @param cle - Clé de la colonne concernée.
   * @returns Une flèche indiquant le sens de tri, chaîne vide si cette colonne n'est pas la colonne triée.
   */
  public indicateurTri(cle: string): string {
    if (this.colonneTri() !== cle) {
      return '';
    }
    return this.sensTri() === 'asc' ? '▲' : '▼';
  }

  /**
   * Valeur `aria-sort` d'une colonne triable, pour les technologies d'assistance.
   * @param cle - Clé de la colonne concernée.
   * @returns La direction de tri au sens ARIA.
   */
  public directionTri(cle: string): 'ascending' | 'descending' | 'none' {
    if (this.colonneTri() !== cle) {
      return 'none';
    }
    return this.sensTri() === 'asc' ? 'ascending' : 'descending';
  }

  /**
   * Indique si une ligne est désactivée (cf. {@link ligneDesactivee}).
   * @param ligne - Ligne concernée.
   * @returns `true` si la ligne est désactivée.
   */
  public estLigneDesactivee(ligne: T): boolean {
    return this.ligneDesactivee()?.(ligne) ?? false;
  }

  /**
   * Indique si une ligne est grisée visuellement (cf. {@link ligneGrisee}).
   * @param ligne - Ligne concernée.
   * @returns `true` si la ligne est grisée.
   */
  public estLigneGrisee(ligne: T): boolean {
    return this.ligneGrisee()?.(ligne) ?? false;
  }

  /**
   * Gère l'activation d'une ligne par l'utilisateur (clic ou touche Entrée) : n'émet {@link activerLigne} que si la
   * ligne n'est pas désactivée.
   * @param ligne - Ligne activée par l'utilisateur.
   */
  public onActiverLigne(ligne: T): void {
    if (this.estLigneDesactivee(ligne)) {
      return;
    }
    this.activerLigne.emit(ligne);
  }

  /**
   * Calcule les lignes à afficher : filtrées selon {@link filtres} (une ligne est retenue si son texte brut, pour
   * chaque colonne filtrée, contient la valeur saisie, comparaison insensible à la casse), puis triées selon
   * {@link colonneTri}/{@link sensTri} si un tri est actif.
   * @returns Les lignes filtrées et triées.
   */
  private calculerLignesAffichees(): readonly T[] {
    const colonnesParCle = new Map(this.colonnes().map((colonne) => [colonne.cle, colonne]));
    const filtresActifs = Object.entries(this.filtres()).filter(
      ([, valeur]) => valeur.trim().length > 0,
    );
    const lignesFiltrees = this.lignes().filter((ligne) =>
      filtresActifs.every(([cle, valeur]) => {
        const colonne = colonnesParCle.get(cle);
        if (colonne === undefined) {
          return true;
        }
        return colonne.extraireTexteBrut(ligne).toLowerCase().includes(valeur.toLowerCase());
      }),
    );

    const cleTri = this.colonneTri();
    const colonneTriee = cleTri === null ? undefined : colonnesParCle.get(cleTri);
    if (colonneTriee === undefined) {
      return lignesFiltrees;
    }
    const sens = this.sensTri();
    return [...lignesFiltrees].sort((a, b) => {
      const base = this.comparerLignes(a, b, colonneTriee);
      return sens === 'asc' ? base : -base;
    });
  }

  /**
   * Compare deux lignes selon la colonne de tri active, valeur numérique si {@link ColonneTableauDense.
   * extraireValeurTri} (ou, à défaut, {@link ColonneTableauDense.extraireTexteBrut}) restitue un nombre pour les
   * deux lignes comparées, comparaison alphabétique française sinon.
   * @param a - Première ligne comparée.
   * @param b - Seconde ligne comparée.
   * @param colonne - Colonne de tri active.
   * @returns Un nombre négatif si `a` précède `b`, positif si `b` précède `a`, nul si équivalentes.
   */
  private comparerLignes(a: T, b: T, colonne: ColonneTableauDense<T>): number {
    const extraire = colonne.extraireValeurTri ?? colonne.extraireTexteBrut;
    const valeurA = extraire(a);
    const valeurB = extraire(b);
    if (typeof valeurA === 'number' && typeof valeurB === 'number') {
      return valeurA - valeurB;
    }
    return String(valeurA).localeCompare(String(valeurB), 'fr');
  }
}
