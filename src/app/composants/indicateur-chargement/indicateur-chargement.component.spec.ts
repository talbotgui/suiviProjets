// Test du composant Indicateur de chargement (cf. indicateur-chargement.component.ts, R11-04), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { SqmIndicateurChargementComponent } from './indicateur-chargement.component';
import { IndicateurChargementUtils } from '../../services/sansetat/commandes/indicateur-chargement.utils';
import { DomTestUtils } from '../../testing/dom-test.utils';

describe('SqmIndicateurChargementComponent', () => {
  afterEach(() => {
    while (IndicateurChargementUtils.actif()) {
      IndicateurChargementUtils.terminerAppel();
    }
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmIndicateurChargementComponent],
    }).compileComponents();
  });

  it('n’affiche rien tant qu’aucun appel n’est en cours', () => {
    const fixture = TestBed.createComponent(SqmIndicateurChargementComponent);
    fixture.detectChanges();

    expect(
      DomTestUtils.obtenirElementNatif(fixture).querySelector('.indicateur-chargement'),
    ).toBeNull();
  });

  it('affiche un indicateur avec le rôle status tant qu’un appel est en cours', () => {
    const fixture = TestBed.createComponent(SqmIndicateurChargementComponent);
    IndicateurChargementUtils.demarrerAppel();
    fixture.detectChanges();

    expect(
      DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="status"]'),
    ).not.toBeNull();

    IndicateurChargementUtils.terminerAppel();
    fixture.detectChanges();

    expect(
      DomTestUtils.obtenirElementNatif(fixture).querySelector('.indicateur-chargement'),
    ).toBeNull();
  });
});
