// Test de SqmChampRechercheRicheComponent (cf. champ-recherche-riche.component.ts, C11-02, RG-036), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { DomTestUtils } from '../../testing/dom-test.utils';
import type { OptionRechercheRiche } from './champ-recherche-riche.component';
import { SqmChampRechercheRicheComponent } from './champ-recherche-riche.component';

const OPTIONS_DE_TEST: readonly OptionRechercheRiche[] = [
  { valeur: 'equipe/service-facturation', libelle: 'Service Facturation' },
  { valeur: 'equipe/service-paiement', libelle: 'Service Paiement' },
  { valeur: 'equipe/service-echeancier', libelle: 'Service Échéancier' },
];

describe('SqmChampRechercheRicheComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmChampRechercheRicheComponent],
    }).compileComponents();
  });

  it('affiche le libellé et le texte d’aide', () => {
    const fixture = TestBed.createComponent(SqmChampRechercheRicheComponent);
    fixture.componentRef.setInput('id', 'champ-test');
    fixture.componentRef.setInput('libelle', 'Identifiant externe');
    fixture.componentRef.setInput('aide', 'Ex. groupe/projet');
    fixture.componentRef.setInput('valeur', '');
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.textContent).toContain('Identifiant externe');
    expect(element.textContent).toContain('Ex. groupe/projet');
  });

  it('propose l’intégralité des suggestions avant toute saisie, dès la prise de focus', () => {
    const fixture = TestBed.createComponent(SqmChampRechercheRicheComponent);
    fixture.componentRef.setInput('id', 'champ-test');
    fixture.componentRef.setInput('libelle', 'Identifiant externe');
    fixture.componentRef.setInput('options', OPTIONS_DE_TEST);
    fixture.componentRef.setInput('valeur', '');
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    fixture.componentInstance.ouvrir();
    fixture.detectChanges();

    const suggestions = element.querySelectorAll('[role="option"]');
    expect(suggestions.length).toBe(3);
  });

  it('filtre les suggestions par le terme saisi, insensible à la casse et aux accents, et surligne la correspondance', () => {
    const fixture = TestBed.createComponent(SqmChampRechercheRicheComponent);
    fixture.componentRef.setInput('id', 'champ-test');
    fixture.componentRef.setInput('libelle', 'Identifiant externe');
    fixture.componentRef.setInput('options', OPTIONS_DE_TEST);
    fixture.componentRef.setInput('valeur', 'echeanc');
    fixture.detectChanges();
    fixture.componentInstance.ouvrir();
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    const suggestions = element.querySelectorAll('[role="option"]');
    expect(suggestions.length).toBe(1);
    expect(suggestions[0]?.textContent).toContain('Échéancier');
    expect(suggestions[0]?.querySelector('mark')?.textContent?.toLowerCase()).toBe('échéanc');
  });

  it('affiche un message explicite en l’absence de correspondance', () => {
    const fixture = TestBed.createComponent(SqmChampRechercheRicheComponent);
    fixture.componentRef.setInput('id', 'champ-test');
    fixture.componentRef.setInput('libelle', 'Identifiant externe');
    fixture.componentRef.setInput('options', OPTIONS_DE_TEST);
    fixture.componentRef.setInput('valeur', 'inexistant');
    fixture.detectChanges();
    fixture.componentInstance.ouvrir();
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.textContent).toContain('Aucun résultat');
    expect(element.textContent).toContain('inexistant');
  });

  it('sélectionne une suggestion à la souris : émet valeurChange et referme la liste', () => {
    const fixture = TestBed.createComponent(SqmChampRechercheRicheComponent);
    fixture.componentRef.setInput('id', 'champ-test');
    fixture.componentRef.setInput('libelle', 'Identifiant externe');
    fixture.componentRef.setInput('options', OPTIONS_DE_TEST);
    fixture.componentRef.setInput('valeur', '');
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    let valeurEmise: string | null = null;
    composant.valeurChange.subscribe((valeur) => {
      valeurEmise = valeur;
    });
    composant.ouvrir();
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    const suggestion = element.querySelector('[role="option"]');
    expect(suggestion).not.toBeNull();
    suggestion?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

    expect(valeurEmise).toBe('equipe/service-facturation');
    expect(composant.ouverte()).toBe(false);
  });

  it('navigation clavier : ArrowDown met en évidence la première suggestion, Entrée la sélectionne', () => {
    const fixture = TestBed.createComponent(SqmChampRechercheRicheComponent);
    fixture.componentRef.setInput('id', 'champ-test');
    fixture.componentRef.setInput('libelle', 'Identifiant externe');
    fixture.componentRef.setInput('options', OPTIONS_DE_TEST);
    fixture.componentRef.setInput('valeur', '');
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    let valeurEmise: string | null = null;
    composant.valeurChange.subscribe((valeur) => {
      valeurEmise = valeur;
    });
    composant.ouvrir();
    fixture.detectChanges();

    composant.gererTouche(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(composant.indexActif()).toBe(0);

    composant.gererTouche(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(valeurEmise).toBe('equipe/service-facturation');
  });

  it('ArrowUp sans mise en évidence courante rejoint la dernière suggestion (motif ARIA combobox)', () => {
    const fixture = TestBed.createComponent(SqmChampRechercheRicheComponent);
    fixture.componentRef.setInput('id', 'champ-test');
    fixture.componentRef.setInput('libelle', 'Identifiant externe');
    fixture.componentRef.setInput('options', OPTIONS_DE_TEST);
    fixture.componentRef.setInput('valeur', '');
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    composant.ouvrir();

    composant.gererTouche(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

    expect(composant.indexActif()).toBe(OPTIONS_DE_TEST.length - 1);
  });

  it('saisit la valeur depuis un évènement DOM réel (frappe utilisateur, `.fill()` Playwright)', () => {
    const fixture = TestBed.createComponent(SqmChampRechercheRicheComponent);
    fixture.componentRef.setInput('id', 'champ-test');
    fixture.componentRef.setInput('libelle', 'Identifiant externe');
    fixture.componentRef.setInput('options', OPTIONS_DE_TEST);
    fixture.componentRef.setInput('valeur', '');
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    let valeurEmise: string | null = null;
    composant.valeurChange.subscribe((valeur) => {
      valeurEmise = valeur;
    });
    const element = DomTestUtils.obtenirElementNatif(fixture);
    const champ = element.querySelector('input');
    if (!(champ instanceof HTMLInputElement)) {
      throw new Error('champ de recherche introuvable');
    }

    champ.value = 'paiement';
    champ.dispatchEvent(new Event('input', { bubbles: true }));

    expect(valeurEmise).toBe('paiement');
    expect(composant.ouverte()).toBe(true);
  });

  it('une touche Entrée sans suggestion mise en évidence n’est pas interceptée (formulaire englobant, R11-06)', () => {
    const fixture = TestBed.createComponent(SqmChampRechercheRicheComponent);
    fixture.componentRef.setInput('id', 'champ-test');
    fixture.componentRef.setInput('libelle', 'Identifiant externe');
    fixture.componentRef.setInput('options', OPTIONS_DE_TEST);
    fixture.componentRef.setInput('valeur', '');
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    const evenement = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });

    composant.gererTouche(evenement);

    expect(evenement.defaultPrevented).toBe(false);
  });

  it('referme la liste sur la touche Échap', () => {
    const fixture = TestBed.createComponent(SqmChampRechercheRicheComponent);
    fixture.componentRef.setInput('id', 'champ-test');
    fixture.componentRef.setInput('libelle', 'Identifiant externe');
    fixture.componentRef.setInput('options', OPTIONS_DE_TEST);
    fixture.componentRef.setInput('valeur', '');
    fixture.detectChanges();
    const composant = fixture.componentInstance;
    composant.ouvrir();

    composant.gererTouche(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(composant.ouverte()).toBe(false);
  });

  it('referme la liste après une temporisation sur la perte de focus du champ', () => {
    jest.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(SqmChampRechercheRicheComponent);
      fixture.componentRef.setInput('id', 'champ-test');
      fixture.componentRef.setInput('libelle', 'Identifiant externe');
      fixture.componentRef.setInput('options', OPTIONS_DE_TEST);
      fixture.componentRef.setInput('valeur', '');
      fixture.detectChanges();
      const composant = fixture.componentInstance;
      composant.ouvrir();

      composant.fermerDifferee();
      expect(composant.ouverte()).toBe(true);

      jest.runAllTimers();
      expect(composant.ouverte()).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});
