// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Composant réutilisable de saisie d'une source (US-008), extrait de `SqmSourcesAdminComponent` (Phase 3) à
// l'occasion de C11-01 (Phase 11) pour être consommé à l'identique par l'onglet Sources (`actionsVisibles` par
// défaut, pied « Annuler »/« Enregistrer » interne) et par le mini-flux guidé « Créer et ajouter des sources » de
// `SqmProjetsAdminComponent` (`actionsVisibles` à `false`, pied piloté par le composant appelant via les méthodes
// publiques `soumettre`/`enregistrer`/`estVide`/`reinitialiser`, cf. la variable de référence de gabarit
// `#formulaireSource`). Cette extraction est explicitement anticipée par C11-02, qui prévoit de généraliser plus
// avant ce même formulaire pour les deux écrans à la fois.
//
// Tout l'état du formulaire (`type`, `instanceId`, `idExterne`, `refAuditee`, `sourcesDisponibles`,
// `credentialAbsent`, `suggestionsBranches`) est porté par des signals plutôt que des propriétés simples,
// conformément à R11-07 (application zoneless : seule une écriture de signal déclenche un nouveau rendu). Ceci
// est impératif ici y compris pour les quatre premiers champs, alimentés non seulement par les gestionnaires
// `(ngModelChange)` synchrones habituels mais aussi par l'`effect` de préchargement depuis {@link sourceAModifier}
// ci-dessous, qui ne s'exécute pas dans la pile d'un évènement DOM.
import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import type { InputSignal, OutputEmitterRef, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, from, of } from 'rxjs';
import type { Observable } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import type { DonneesSource } from '../../services/avecetat/etat/donnees-application.service';
import type { Source } from '../../services/avecetat/etat/types-donnees';
import { TypeSource } from '../../services/avecetat/etat/types-donnees';
import { FacadeCommandesService } from '../../services/sansetat/commandes/facade-commandes.service';
import { TypeInstance } from '../../services/sansetat/commandes/types-facade';
import type {
  Instance,
  ResultatInterrogationBranches,
  SourceDisponible,
} from '../../services/sansetat/commandes/types-facade';

/**
 * Délai de silence, en millisecondes, avant qu'une saisie dans le champ de ref auditée ne déclenche
 * l'interrogation des branches (US-008), pour éviter un appel réseau à chaque frappe.
 */
const DELAI_DEBOUNCE_RECHERCHE_MS = 300;

/**
 * Formulaire réutilisable de création/modification d'une source (US-008) : cascade Type→Instance, autocomplétion
 * de l'identifiant externe (RG-036) et de la ref auditée. Consommé par `SqmSourcesAdminComponent` (formulaire
 * autonome, pied de formulaire interne) et par le mini-flux guidé de `SqmProjetsAdminComponent` (`actionsVisibles`
 * à `false`, groupe/projet déjà connus, pied de formulaire externe).
 */
@Component({
  selector: 'app-formulaire-source',
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './formulaire-source.component.html',
})
export class SqmFormulaireSourceComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);
  private readonly facadeCommandes: FacadeCommandesService = inject(FacadeCommandesService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly rechercheBranche$: Subject<string> = new Subject<string>();

  /**
   * Dépôts GitLab ou projets Sonar disponibles déjà chargés, indexés par `Instance.id` (US-008, RG-036) : un seul
   * appel par instance pour la durée de vie du composant, plutôt qu'un appel à chaque sélection de cette même
   * instance.
   */
  private readonly sourcesDisponiblesParInstance = new Map<string, readonly SourceDisponible[]>();

  /**
   * Types de source proposés au formulaire (dépôt GitLab, projet Sonar).
   */
  public readonly typesSource: readonly TypeSource[] = [
    TypeSource.DepotGitlab,
    TypeSource.ProjetSonar,
  ];

  /**
   * Identifiant du groupe de rattachement de la source (déjà sélectionné par l'écran appelant).
   */
  public readonly groupeId: InputSignal<string> = input.required<string>();

  /**
   * Identifiant du projet de rattachement de la source (déjà sélectionné par l'écran appelant).
   */
  public readonly projetId: InputSignal<string> = input.required<string>();

  /**
   * Source à modifier, `null` en création. Sa présence (à l'instanciation du composant, ou à un changement
   * ultérieur) initialise les champs du formulaire via l'`effect` du constructeur.
   */
  public readonly sourceAModifier: InputSignal<Source | null> = input<Source | null>(null);

  /**
   * Affiche le pied de formulaire interne (titre, message d'erreur, boutons « Annuler »/« Enregistrer ») quand
   * `true` (défaut). À `false`, le composant appelant pilote ses propres actions via les méthodes publiques
   * {@link soumettre}/{@link enregistrer}/{@link estVide}/{@link reinitialiser} (mini-flux guidé, C11-01).
   */
  public readonly actionsVisibles: InputSignal<boolean> = input<boolean>(true);

  /**
   * Émis lorsque l'utilisateur annule la saisie via le bouton « Annuler » interne (sans effet si
   * {@link actionsVisibles} vaut `false`, ce bouton n'existant alors pas).
   */
  public readonly annulee: OutputEmitterRef<void> = output<void>();

  /**
   * Émis avec l'identifiant de la source créée/modifiée après un enregistrement réussi déclenché via
   * {@link soumettre} : soit depuis le formulaire interne ({@link actionsVisibles} à `true`, soumission du
   * `<form>`, bouton « Enregistrer » ou touche Entrée), soit invoqué explicitement par le composant appelant
   * ({@link actionsVisibles} à `false`, mini-flux guidé C11-01, aucun `<form>` interne dans ce mode).
   */
  public readonly enregistree: OutputEmitterRef<string> = output<string>();

  /**
   * Type de source saisi dans le formulaire.
   */
  public readonly type: WritableSignal<TypeSource> = signal(TypeSource.DepotGitlab);

  /**
   * Identifiant d'instance saisi dans le formulaire.
   */
  public readonly instanceId: WritableSignal<string> = signal('');

  /**
   * Identifiant externe (identifiant de projet côté instance) saisi dans le formulaire.
   */
  public readonly idExterne: WritableSignal<string> = signal('');

  /**
   * Ref auditée saisie dans le formulaire, chaîne vide si absente (branche par défaut du dépôt).
   */
  public readonly refAuditee: WritableSignal<string> = signal('');

  /**
   * Message d'erreur de validation du formulaire, `null` si aucune erreur en cours. Reste une propriété simple :
   * uniquement mutée depuis des gestionnaires d'évènements DOM synchrones (soumission, saisie), jamais depuis
   * l'`effect` de préchargement ni un callback asynchrone.
   */
  public messageErreur: string | null = null;

  /**
   * Suggestions de branches actuellement proposées par l'autocomplétion (US-008).
   */
  public readonly suggestionsBranches: WritableSignal<readonly string[]> = signal([]);

  /**
   * Dépôts GitLab ou projets Sonar disponibles pour l'instance actuellement sélectionnée dans le formulaire,
   * proposés en autocomplétion de l'identifiant externe (US-008, RG-036).
   */
  public readonly sourcesDisponibles: WritableSignal<readonly SourceDisponible[]> = signal([]);

  /**
   * Indique qu'aucun credential n'est actuellement mémorisé pour l'instance sélectionnée : ni l'autocomplétion des
   * branches ni celle de l'identifiant externe (RG-036) ne sont disponibles, l'utilisateur doit d'abord saisir un
   * credential (Gestion des credentials).
   */
  public readonly credentialAbsent: WritableSignal<boolean> = signal(false);

  public constructor() {
    effect(() => {
      const source = this.sourceAModifier();
      if (!source) {
        return;
      }
      this.instanceId.set(source.instanceId);
      this.type.set(source.type);
      this.idExterne.set(source.idExterne);
      this.refAuditee.set(source.refAuditee ?? '');
      void this.chargerSourcesDisponibles(source.instanceId);
    });

    this.rechercheBranche$
      .pipe(
        debounceTime(DELAI_DEBOUNCE_RECHERCHE_MS),
        distinctUntilChanged(),
        switchMap((terme) => this.interrogerBranchesPourInstance(terme)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultat) => {
        this.appliquerResultatBranches(resultat);
      });
  }

  /**
   * Instances du groupe de rattachement compatibles avec le type de source actuellement saisi dans le formulaire
   * (une source GitLab ne peut référencer qu'une instance GitLab, une source Sonar qu'une instance Sonar).
   * @returns Le tableau des instances compatibles.
   */
  public instancesCompatibles(): readonly Instance[] {
    const groupe = this.donneesApplication
      .groupes()
      .find((candidat) => candidat.id === this.groupeId());
    if (!groupe) {
      return [];
    }
    const typeInstanceAttendu =
      this.type() === TypeSource.DepotGitlab ? TypeInstance.Gitlab : TypeInstance.Sonar;
    return groupe.instances.filter((instance) => instance.type === typeInstanceAttendu);
  }

  /**
   * Change le type de source saisi dans le formulaire, en réinitialisant l'instance sélectionnée (une instance
   * compatible avec l'ancien type peut ne plus l'être avec le nouveau).
   * @param nouveauType - Type de source désormais sélectionné.
   */
  public changerType(nouveauType: TypeSource): void {
    this.type.set(nouveauType);
    this.instanceId.set('');
    this.suggestionsBranches.set([]);
    this.sourcesDisponibles.set([]);
  }

  /**
   * Sélectionne l'instance du formulaire de source et déclenche le chargement (mis en cache) de la liste des
   * dépôts/projets disponibles pour l'autocomplétion de l'identifiant externe (US-008, RG-036).
   * @param instanceId - Identifiant de l'instance désormais sélectionnée dans le formulaire.
   */
  public selectionnerInstance(instanceId: string): void {
    this.instanceId.set(instanceId);
    void this.chargerSourcesDisponibles(instanceId);
  }

  /**
   * Met à jour la ref auditée saisie et relance (de façon débouncée) l'autocomplétion des branches (US-008).
   * @param valeur - Nouvelle valeur saisie dans le champ de ref auditée.
   */
  public modifierRefAuditee(valeur: string): void {
    this.refAuditee.set(valeur);
    this.rechercherBranches();
  }

  /**
   * Déclenche (de façon débouncée) l'autocomplétion des branches pour le terme actuellement saisi dans le champ
   * de ref auditée (US-008). Sans effet pour une source Sonar, qui n'a pas de branches.
   */
  public rechercherBranches(): void {
    if (this.type() === TypeSource.ProjetSonar) {
      return;
    }
    this.rechercheBranche$.next(this.refAuditee());
  }

  /**
   * Valide puis enregistre le formulaire (création ou modification selon la présence de {@link sourceAModifier}).
   * @returns L'identifiant de la source créée/modifiée, ou `null` si la validation a échoué (message affiché via
   * {@link messageErreur}).
   */
  public enregistrer(): string | null {
    if (this.instanceId().length === 0) {
      this.messageErreur = 'Une instance doit être sélectionnée.';
      return null;
    }
    if (this.idExterne().trim().length === 0) {
      this.messageErreur = "L'identifiant externe est obligatoire.";
      return null;
    }

    const donnees: DonneesSource = {
      instanceId: this.instanceId(),
      type: this.type(),
      idExterne: this.idExterne().trim(),
      refAuditee: this.refAuditee().trim().length > 0 ? this.refAuditee().trim() : undefined,
    };

    const sourceExistante = this.sourceAModifier();
    if (sourceExistante) {
      this.donneesApplication.modifierSource(
        this.groupeId(),
        this.projetId(),
        sourceExistante.id,
        donnees,
      );
      return sourceExistante.id;
    }
    return this.donneesApplication.creerSource(this.groupeId(), this.projetId(), donnees);
  }

  /**
   * Indique si le formulaire n'a reçu aucune saisie (aucune instance choisie et aucun identifiant externe
   * renseigné), utilisé par le mini-flux guidé (C11-01) pour savoir s'il y a une source à enregistrer avant de
   * changer d'étape.
   * @returns `true` si le formulaire est resté entièrement vide.
   */
  public estVide(): boolean {
    return this.instanceId().length === 0 && this.idExterne().trim().length === 0;
  }

  /**
   * Remet Type/Instance/Identifiant/Ref à blanc, sans modifier {@link groupeId}/{@link projetId} (mini-flux
   * guidé, C11-01 : le projet reste le même d'une source à l'autre).
   */
  public reinitialiser(): void {
    this.type.set(TypeSource.DepotGitlab);
    this.instanceId.set('');
    this.idExterne.set('');
    this.refAuditee.set('');
    this.messageErreur = null;
    this.suggestionsBranches.set([]);
    this.sourcesDisponibles.set([]);
    this.credentialAbsent.set(false);
  }

  /**
   * Enregistre puis émet {@link enregistree} en cas de succès uniquement. Déclenché par le formulaire interne
   * (`<form>`, bouton « Enregistrer » ou touche Entrée) quand {@link actionsVisibles} vaut `true`, ou invoqué
   * directement par le composant appelant (mini-flux guidé, C11-01) quand {@link actionsVisibles} vaut `false`.
   */
  public soumettre(): void {
    const id = this.enregistrer();
    if (id !== null) {
      this.enregistree.emit(id);
    }
  }

  /**
   * Gère l'annulation de la saisie par l'utilisateur via le bouton « Annuler » interne.
   */
  public annuler(): void {
    this.annulee.emit();
  }

  /**
   * Charge, en un seul appel mis en cache pour la durée de vie du composant (US-008, RG-036), la liste des dépôts
   * GitLab ou des projets Sonar disponibles pour l'instance désignée, pour l'autocomplétion de l'identifiant
   * externe. Sans effet si `instanceId` est vide ou déjà présente dans le cache.
   * @param instanceId - Identifiant de l'instance dont on charge la liste des dépôts/projets disponibles.
   */
  private async chargerSourcesDisponibles(instanceId: string): Promise<void> {
    if (instanceId.length === 0) {
      this.sourcesDisponibles.set([]);
      return;
    }
    const enCache = this.sourcesDisponiblesParInstance.get(instanceId);
    if (enCache) {
      this.sourcesDisponibles.set(enCache);
      this.credentialAbsent.set(false);
      return;
    }
    const instance = this.instancesCompatibles().find((candidat) => candidat.id === instanceId);
    if (!instance) {
      this.sourcesDisponibles.set([]);
      return;
    }
    const resultat = await this.facadeCommandes.listerSourcesDisponibles(instance);
    if (resultat.type === 'succes') {
      this.sourcesDisponiblesParInstance.set(instanceId, resultat.sourcesDisponibles);
      this.sourcesDisponibles.set(resultat.sourcesDisponibles);
      this.credentialAbsent.set(false);
      return;
    }
    this.sourcesDisponibles.set([]);
    this.credentialAbsent.set(resultat.anomalie.type === 'credentialAbsent');
  }

  /**
   * Interroge les branches de l'instance actuellement sélectionnée dans le formulaire pour le terme donné.
   * @param terme - Terme de recherche saisi par l'utilisateur.
   * @returns Un flux résolvant le résultat de l'interrogation, ou `null` si aucune instance n'est sélectionnée.
   */
  private interrogerBranchesPourInstance(
    terme: string,
  ): Observable<ResultatInterrogationBranches | null> {
    const instance = this.instancesCompatibles().find(
      (candidat) => candidat.id === this.instanceId(),
    );
    if (!instance || this.idExterne().trim().length === 0) {
      return of(null);
    }
    return from(
      this.facadeCommandes.interrogerBranches(instance, this.idExterne().trim(), terme),
    ).pipe(catchError(() => of(null)));
  }

  /**
   * Applique le résultat d'une interrogation de branches à l'état du formulaire.
   * @param resultat - Résultat de l'interrogation, `null` si elle n'a pas pu être lancée.
   */
  private appliquerResultatBranches(resultat: ResultatInterrogationBranches | null): void {
    if (!resultat) {
      this.suggestionsBranches.set([]);
      return;
    }
    if (resultat.type === 'succes') {
      this.suggestionsBranches.set(resultat.branches);
      this.credentialAbsent.set(false);
      return;
    }
    this.suggestionsBranches.set([]);
    this.credentialAbsent.set(resultat.anomalie.type === 'credentialAbsent');
  }
}
