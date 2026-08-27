// Test du composant transverse « Barre de mesure » (cf. barre-mesure.component.ts), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmBarreMesureComponent } from './barre-mesure.component';

describe('SqmBarreMesureComponent', () => {
  /**
   * Crée un fixture avec les entrées fournies.
   * @param sigle - Sigle de l'indicateur.
   * @param valeur - Valeur de l'indicateur, ou `null`.
   * @param valeurMax - Valeur maximale.
   * @returns Le fixture rendu.
   */
  function creer(
    sigle: string,
    valeur: number | null,
    valeurMax: number,
  ): ComponentFixture<SqmBarreMesureComponent> {
    const fixture = TestBed.createComponent(SqmBarreMesureComponent);
    fixture.componentRef.setInput('sigle', sigle);
    fixture.componentRef.setInput('valeur', valeur);
    fixture.componentRef.setInput('valeurMax', valeurMax);
    fixture.componentRef.setInput('couleur', 'hsl(0 0% 0%)');
    fixture.detectChanges();
    return fixture;
  }

  it('calcule le pourcentage de remplissage borné à [0, 100]', () => {
    expect(creer('EXE', 3, 10).componentInstance.pourcentage()).toBe(30);
    expect(creer('EXE', 15, 10).componentInstance.pourcentage()).toBe(100);
    expect(creer('EXE', 0, 10).componentInstance.pourcentage()).toBe(0);
  });

  it('produit un pourcentage nul pour une valeur absente ou un maximum nul', () => {
    expect(creer('EXE', null, 10).componentInstance.pourcentage()).toBe(0);
    expect(creer('EXE', 4, 0).componentInstance.pourcentage()).toBe(0);
  });

  it('affiche la valeur numérique, un tiret si elle est absente', () => {
    expect(creer('EXE', 4, 10).componentInstance.valeurAffichee()).toBe('4');
    expect(creer('EXE', null, 10).componentInstance.valeurAffichee()).toBe('—');
  });

  it('rend le sigle et la valeur dans le DOM', () => {
    const element = DomTestUtils.obtenirElementNatif(creer('FMB', 2, 8));
    expect(element.textContent).toContain('FMB');
    expect(element.textContent).toContain('2');
  });
});
