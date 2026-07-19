// Test du service de référence exemplaire (cf. exemple-reference.service.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { ExempleReferenceService } from './exemple-reference.service';

describe('ExempleReferenceService', () => {
  let service: ExempleReferenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExempleReferenceService);
  });

  it("doit démarrer à zéro et s'incrémenter", () => {
    expect(service.compteur()).toBe(0);

    service.incrementer();

    expect(service.compteur()).toBe(1);
  });

  it('doit se réinitialiser à zéro', () => {
    service.incrementer();

    service.reinitialiser();

    expect(service.compteur()).toBe(0);
  });
});
