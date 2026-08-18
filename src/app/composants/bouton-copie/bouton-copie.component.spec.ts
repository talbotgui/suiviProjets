// Test du composant transverse Bouton de copie rapide (cf. bouton-copie.component.ts, US-042), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { SqmBoutonCopieComponent } from './bouton-copie.component';
import { DomTestUtils } from '../../testing/dom-test.utils';

describe('SqmBoutonCopieComponent', () => {
  let ecrireDansPressePapiers: jest.Mock<Promise<void>, [string]>;

  beforeEach(async () => {
    ecrireDansPressePapiers = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: ecrireDansPressePapiers },
      configurable: true,
    });
    await TestBed.configureTestingModule({
      imports: [SqmBoutonCopieComponent],
    }).compileComponents();
  });

  it('expose un bouton portant le libellé accessible fourni, distinct du texte visible générique', () => {
    const fixture = TestBed.createComponent(SqmBoutonCopieComponent);
    fixture.componentRef.setInput('valeur', 'lodash');
    fixture.componentRef.setInput('libelleAccessible', 'Copier la référence lodash');
    fixture.detectChanges();

    const bouton = DomTestUtils.obtenirElementNatif(fixture).querySelector('button');
    expect(bouton?.getAttribute('aria-label')).toBe('Copier la référence lodash');
    expect(bouton?.textContent?.trim()).toBe('Copier');
  });

  it('copie la valeur fournie dans le presse-papiers au clic', async () => {
    const fixture = TestBed.createComponent(SqmBoutonCopieComponent);
    fixture.componentRef.setInput('valeur', 'lodash');
    fixture.componentRef.setInput('libelleAccessible', 'Copier la référence lodash');
    fixture.detectChanges();

    await fixture.componentInstance.copier();

    expect(ecrireDansPressePapiers).toHaveBeenCalledWith('lodash');
  });

  it('affiche une confirmation visuelle explicite après une copie réussie', async () => {
    const fixture = TestBed.createComponent(SqmBoutonCopieComponent);
    fixture.componentRef.setInput('valeur', 'lodash');
    fixture.componentRef.setInput('libelleAccessible', 'Copier la référence lodash');
    fixture.detectChanges();

    await fixture.componentInstance.copier();
    fixture.detectChanges();

    const statut = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="status"]');
    expect(statut?.textContent?.trim()).toBe('Copié');
    expect(fixture.componentInstance.etat()).toBe('copie');
  });

  it('affiche un message d’échec explicite si la copie échoue, sans lever d’exception', async () => {
    ecrireDansPressePapiers.mockRejectedValue(new Error('refusé'));
    const fixture = TestBed.createComponent(SqmBoutonCopieComponent);
    fixture.componentRef.setInput('valeur', 'lodash');
    fixture.componentRef.setInput('libelleAccessible', 'Copier la référence lodash');
    fixture.detectChanges();

    await fixture.componentInstance.copier();
    fixture.detectChanges();

    const statut = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="status"]');
    expect(statut?.textContent?.trim()).toBe('Échec de la copie');
    expect(fixture.componentInstance.etat()).toBe('echec');
  });

  it('revient à l’état inactif après le délai de confirmation, sans effacer le presse-papiers', async () => {
    jest.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(SqmBoutonCopieComponent);
      fixture.componentRef.setInput('valeur', 'lodash');
      fixture.componentRef.setInput('libelleAccessible', 'Copier la référence lodash');
      fixture.detectChanges();

      await fixture.componentInstance.copier();
      expect(fixture.componentInstance.etat()).toBe('copie');

      jest.advanceTimersByTime(2_000);

      expect(fixture.componentInstance.etat()).toBe('inactif');
      expect(ecrireDansPressePapiers).toHaveBeenCalledTimes(1);
      expect(ecrireDansPressePapiers).not.toHaveBeenCalledWith('');
    } finally {
      jest.useRealTimers();
    }
  });

  it('réarme le délai de confirmation si une nouvelle copie est déclenchée en cours de route', async () => {
    jest.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(SqmBoutonCopieComponent);
      fixture.componentRef.setInput('valeur', 'lodash');
      fixture.componentRef.setInput('libelleAccessible', 'Copier la référence lodash');
      fixture.detectChanges();

      await fixture.componentInstance.copier();
      jest.advanceTimersByTime(1_500);
      expect(fixture.componentInstance.etat()).toBe('copie');

      await fixture.componentInstance.copier();
      jest.advanceTimersByTime(1_500);
      expect(fixture.componentInstance.etat()).toBe('copie');

      jest.advanceTimersByTime(500);
      expect(fixture.componentInstance.etat()).toBe('inactif');
    } finally {
      jest.useRealTimers();
    }
  });

  it('désarme le minuteur à la destruction du composant', async () => {
    jest.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(SqmBoutonCopieComponent);
      fixture.componentRef.setInput('valeur', 'lodash');
      fixture.componentRef.setInput('libelleAccessible', 'Copier la référence lodash');
      fixture.detectChanges();

      await fixture.componentInstance.copier();
      fixture.destroy();

      expect(() => jest.advanceTimersByTime(5_000)).not.toThrow();
    } finally {
      jest.useRealTimers();
    }
  });
});
