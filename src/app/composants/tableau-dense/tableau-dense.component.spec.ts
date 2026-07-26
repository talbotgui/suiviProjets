// Test du composant transverse Tableau dense (cf. tableau-dense.component.ts, charte d'ergonomie), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ColonneTableauDense } from './tableau-dense.component';
import { SqmTableauDenseComponent } from './tableau-dense.component';
import { DomTestUtils } from '../../testing/dom-test.utils';

/**
 * Ligne de test minimale, sans rapport avec un domaine métier particulier (composant générique).
 */
interface LigneTest {
  readonly id: string;
  readonly nom: string;
  readonly valeur: number;
}

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction hors
 * classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit les colonnes de test : première colonne (« nom ») triable et filtrable, seconde colonne (« valeur »)
   * triable uniquement, avec une valeur de tri numérique distincte de son texte brut.
   * @returns Les colonnes de test.
   */
  public static colonnes(): readonly ColonneTableauDense<LigneTest>[] {
    return [
      {
        cle: 'nom',
        libelle: 'Nom',
        triable: true,
        filtrable: true,
        extraireTexteBrut: (ligne) => ligne.nom,
        extraireCellule: (ligne) => ({ segments: [{ type: 'texte', valeur: ligne.nom }] }),
      },
      {
        cle: 'valeur',
        libelle: 'Valeur',
        triable: true,
        extraireTexteBrut: (ligne) => String(ligne.valeur),
        extraireValeurTri: (ligne) => ligne.valeur,
        extraireCellule: (ligne) => ({
          segments: [{ type: 'texteCouleur', valeur: String(ligne.valeur), couleur: 'vert' }],
        }),
      },
    ];
  }

  /**
   * Construit une unique colonne restituant un segment de type badge, pour vérifier la délégation à
   * `SqmBadgeComponent`.
   * @returns La colonne de test.
   */
  public static colonneAvecBadge(): readonly ColonneTableauDense<LigneTest>[] {
    return [
      {
        cle: 'statut',
        libelle: 'Statut',
        extraireTexteBrut: () => 'ok',
        extraireCellule: () => ({
          segments: [{ type: 'badge', libelle: 'AUDIT ANCIEN', couleur: 'orange' }],
        }),
      },
    ];
  }

  /**
   * Construit un jeu de lignes de test.
   * @returns Les lignes de test.
   */
  public static lignes(): readonly LigneTest[] {
    return [
      { id: 'b', nom: 'Bravo', valeur: 20 },
      { id: 'a', nom: 'Alpha', valeur: 30 },
      { id: 'c', nom: 'Charlie', valeur: 10 },
    ];
  }

  /**
   * Extrait l'identifiant d'une ligne de test. Signature `this: void` : cette méthode statique n'accède jamais à
   * `this` et est transmise telle quelle en référence de fonction à `setInput` dans les tests ci-dessous
   * (`@typescript-eslint/unbound-method`).
   * @param ligne - Ligne dont l'identifiant est demandé.
   * @returns L'identifiant de la ligne.
   */
  public static identifiant(this: void, ligne: LigneTest): string {
    return ligne.id;
  }
}

describe('SqmTableauDenseComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmTableauDenseComponent],
    }).compileComponents();
  });

  /**
   * Crée et initialise un fixture du composant avec les données de test par défaut.
   * @param ligneDesactivee - Prédicat optionnel de désactivation de ligne.
   * @param ligneGrisee - Prédicat optionnel de grisage de ligne.
   * @returns Le fixture prêt à l'emploi.
   */
  function creerFixture(
    ligneDesactivee?: (ligne: LigneTest) => boolean,
    ligneGrisee?: (ligne: LigneTest) => boolean,
  ): ComponentFixture<SqmTableauDenseComponent<LigneTest>> {
    const fixture = TestBed.createComponent(SqmTableauDenseComponent<LigneTest>);
    fixture.componentRef.setInput('colonnes', DonneesDeTest.colonnes());
    fixture.componentRef.setInput('lignes', DonneesDeTest.lignes());
    fixture.componentRef.setInput('identifiant', DonneesDeTest.identifiant);
    if (ligneDesactivee !== undefined) {
      fixture.componentRef.setInput('ligneDesactivee', ligneDesactivee);
    }
    if (ligneGrisee !== undefined) {
      fixture.componentRef.setInput('ligneGrisee', ligneGrisee);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('affiche la première colonne comme colonne fixe au défilement horizontal, jamais les suivantes', () => {
    const fixture = creerFixture();
    const entetes =
      DomTestUtils.obtenirElementNatif(fixture).querySelectorAll('thead tr:first-child th');

    expect(entetes.length).toBe(2);
    expect(entetes[0].classList.contains('tableau-dense__cellule--fixe')).toBe(true);
    expect(entetes[1].classList.contains('tableau-dense__cellule--fixe')).toBe(false);
  });

  it('affiche les lignes dans leur ordre d’origine tant qu’aucun tri n’est appliqué', () => {
    const fixture = creerFixture();
    const noms = Array.from(
      DomTestUtils.obtenirElementNatif(fixture).querySelectorAll('tbody tr'),
    ).map((ligne) => ligne.textContent ?? '');

    expect(noms[0]).toContain('Bravo');
    expect(noms[1]).toContain('Alpha');
    expect(noms[2]).toContain('Charlie');
  });

  it('trie les lignes par ordre croissant puis décroissant à l’activation répétée d’un en-tête triable (bouton natif, activable au clavier)', () => {
    const fixture = creerFixture();
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const boutonTriNom = element.querySelector<HTMLButtonElement>('.tableau-dense__bouton-tri');
    expect(boutonTriNom).not.toBeNull();
    if (boutonTriNom === null) {
      throw new Error('Bouton de tri introuvable.');
    }

    // Un bouton HTML natif est nativement activable au clavier (Entrée/Espace) via le même événement `click` que la
    // souris : le focus puis l'activation programmatique du clic représentent fidèlement l'activation clavier.
    boutonTriNom.focus();
    expect(document.activeElement).toBe(boutonTriNom);
    boutonTriNom.click();
    fixture.detectChanges();

    let noms = Array.from(element.querySelectorAll('tbody tr')).map(
      (ligne) => ligne.textContent ?? '',
    );
    expect(noms[0]).toContain('Alpha');
    expect(noms[1]).toContain('Bravo');
    expect(noms[2]).toContain('Charlie');

    boutonTriNom.click();
    fixture.detectChanges();

    noms = Array.from(element.querySelectorAll('tbody tr')).map((ligne) => ligne.textContent ?? '');
    expect(noms[0]).toContain('Charlie');
    expect(noms[1]).toContain('Bravo');
    expect(noms[2]).toContain('Alpha');
  });

  it('trie numériquement une colonne dotée d’une valeur de tri distincte de son texte brut', () => {
    const fixture = creerFixture();
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const boutons = element.querySelectorAll<HTMLButtonElement>('.tableau-dense__bouton-tri');
    const boutonTriValeur = boutons.item(1);

    boutonTriValeur.click();
    fixture.detectChanges();

    const noms = Array.from(element.querySelectorAll('tbody tr')).map(
      (ligne) => ligne.textContent ?? '',
    );
    expect(noms[0]).toContain('Charlie');
    expect(noms[1]).toContain('Bravo');
    expect(noms[2]).toContain('Alpha');
  });

  it('indique le sens de tri courant via l’attribut aria-sort (technologies d’assistance)', () => {
    const fixture = creerFixture();
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const enteteNom = element.querySelectorAll('thead tr:first-child th').item(0);
    expect(enteteNom.getAttribute('aria-sort')).toBe('none');

    element.querySelector<HTMLButtonElement>('.tableau-dense__bouton-tri')?.click();
    fixture.detectChanges();

    expect(enteteNom.getAttribute('aria-sort')).toBe('ascending');
  });

  it('filtre les lignes selon le texte saisi dans le champ de filtre d’une colonne filtrable', () => {
    const fixture = creerFixture();
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const champFiltre = element.querySelector<HTMLInputElement>('.tableau-dense__champ-filtre');
    expect(champFiltre).not.toBeNull();
    if (champFiltre === null) {
      throw new Error('Champ de filtre introuvable.');
    }

    champFiltre.value = 'al';
    champFiltre.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const lignesAffichees = element.querySelectorAll('tbody tr');
    expect(lignesAffichees.length).toBe(1);
    expect(lignesAffichees[0].textContent).toContain('Alpha');
  });

  it('affiche un message explicite lorsqu’aucune ligne ne correspond au filtre courant', () => {
    const fixture = creerFixture();
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const champFiltre = element.querySelector<HTMLInputElement>('.tableau-dense__champ-filtre');
    if (champFiltre === null) {
      throw new Error('Champ de filtre introuvable.');
    }

    champFiltre.value = 'zzz';
    champFiltre.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.textContent).toContain('Aucune ligne à afficher.');
  });

  it('émet la ligne activée au clic sur une ligne non désactivée', () => {
    const fixture = creerFixture();
    const emises: LigneTest[] = [];
    fixture.componentInstance.activerLigne.subscribe((ligne) => emises.push(ligne));

    const premiereLigne = DomTestUtils.obtenirElementNatif(fixture).querySelector('tbody tr');
    expect(premiereLigne).not.toBeNull();
    premiereLigne?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emises).toHaveLength(1);
    expect(emises[0].nom).toBe('Bravo');
  });

  it('émet la ligne activée à la touche Entrée sur une ligne focalisée (activation clavier)', () => {
    const fixture = creerFixture();
    const emises: LigneTest[] = [];
    fixture.componentInstance.activerLigne.subscribe((ligne) => emises.push(ligne));

    const premiereLigne =
      DomTestUtils.obtenirElementNatif(fixture).querySelector<HTMLElement>('tbody tr');
    expect(premiereLigne?.getAttribute('tabindex')).toBe('0');
    premiereLigne?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(emises).toHaveLength(1);
  });

  it('n’émet rien et retire le focus clavier pour une ligne désactivée', () => {
    const fixture = creerFixture((ligne) => ligne.id === 'b');
    const emises: LigneTest[] = [];
    fixture.componentInstance.activerLigne.subscribe((ligne) => emises.push(ligne));

    const premiereLigne =
      DomTestUtils.obtenirElementNatif(fixture).querySelector<HTMLElement>('tbody tr');
    expect(premiereLigne?.getAttribute('tabindex')).toBeNull();
    expect(premiereLigne?.getAttribute('aria-disabled')).toBe('true');
    premiereLigne?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emises).toHaveLength(0);
  });

  it('applique la classe de grisage aux lignes désignées par ligneGrisee, sans les désactiver', () => {
    const fixture = creerFixture(undefined, (ligne) => ligne.id === 'b');

    const premiereLigne = DomTestUtils.obtenirElementNatif(fixture).querySelector('tbody tr');
    expect(premiereLigne?.classList.contains('tableau-dense__ligne--grisee')).toBe(true);
    expect(premiereLigne?.getAttribute('tabindex')).toBe('0');
  });

  it('restitue les segments de type badge via SqmBadgeComponent', () => {
    const fixture = TestBed.createComponent(SqmTableauDenseComponent<LigneTest>);
    fixture.componentRef.setInput('colonnes', DonneesDeTest.colonneAvecBadge());
    fixture.componentRef.setInput('lignes', DonneesDeTest.lignes());
    fixture.componentRef.setInput('identifiant', DonneesDeTest.identifiant);
    fixture.detectChanges();

    expect(DomTestUtils.obtenirElementNatif(fixture).textContent).toContain('AUDIT ANCIEN');
  });

  it('grise une cellule isolée quand la colonne le déclare (RG-013), sans griser le reste de la ligne', () => {
    const fixture = TestBed.createComponent(SqmTableauDenseComponent<LigneTest>);
    const colonnes: readonly ColonneTableauDense<LigneTest>[] = [
      {
        cle: 'nom',
        libelle: 'Nom',
        extraireTexteBrut: (ligne) => ligne.nom,
        extraireCellule: (ligne) => ({ segments: [{ type: 'texte', valeur: ligne.nom }] }),
      },
      {
        cle: 'valeur',
        libelle: 'Valeur',
        extraireTexteBrut: (ligne) => String(ligne.valeur),
        extraireCellule: (ligne) => ({
          segments: [{ type: 'texte', valeur: String(ligne.valeur) }],
          grisee: true,
        }),
      },
    ];
    fixture.componentRef.setInput('colonnes', colonnes);
    fixture.componentRef.setInput('lignes', DonneesDeTest.lignes());
    fixture.componentRef.setInput('identifiant', DonneesDeTest.identifiant);
    fixture.detectChanges();

    const cellules =
      DomTestUtils.obtenirElementNatif(fixture).querySelectorAll('tbody tr:first-child td');
    expect(cellules[0].classList.contains('tableau-dense__cellule--grisee')).toBe(false);
    expect(cellules[1].classList.contains('tableau-dense__cellule--grisee')).toBe(true);
  });

  it('affiche un déclencheur d’explication du calcul dans l’en-tête d’une colonne qui le déclare, une seule fois par colonne', () => {
    const fixture = TestBed.createComponent(SqmTableauDenseComponent<LigneTest>);
    const colonnes: readonly ColonneTableauDense<LigneTest>[] = [
      {
        cle: 'nom',
        libelle: 'Nom',
        extraireTexteBrut: (ligne) => ligne.nom,
        extraireCellule: (ligne) => ({ segments: [{ type: 'texte', valeur: ligne.nom }] }),
      },
      {
        cle: 'valeur',
        libelle: 'Valeur',
        extraireTexteBrut: (ligne) => String(ligne.valeur),
        extraireCellule: (ligne) => ({
          segments: [{ type: 'texte', valeur: String(ligne.valeur) }],
        }),
        explication: {
          cle: 'vitalite',
          seuilsBruts: { vitalite: { mourantJours: 180, mortJours: 365 } },
        },
      },
    ];
    fixture.componentRef.setInput('colonnes', colonnes);
    fixture.componentRef.setInput('lignes', DonneesDeTest.lignes());
    fixture.componentRef.setInput('identifiant', DonneesDeTest.identifiant);
    fixture.detectChanges();

    const entetes =
      DomTestUtils.obtenirElementNatif(fixture).querySelectorAll('thead tr:first-child th');
    expect(entetes[0].querySelector('app-explication-jugement')).toBeNull();
    expect(entetes[1].querySelector('app-explication-jugement')).not.toBeNull();
    // Un seul déclencheur pour toute la colonne, jamais un par ligne (3 lignes de données de test).
    expect(
      DomTestUtils.obtenirElementNatif(fixture).querySelectorAll('app-explication-jugement').length,
    ).toBe(1);
  });
});
