// Test du composant de ressaisie du mot de passe (cf. confirmation-mot-de-passe.component.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { SqmConfirmationMotDePasseComponent } from './confirmation-mot-de-passe.component';

describe('SqmConfirmationMotDePasseComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmConfirmationMotDePasseComponent],
    }).compileComponents();
  });

  it('émet confirmee avec le mot de passe saisi', () => {
    const fixture = TestBed.createComponent(SqmConfirmationMotDePasseComponent);
    fixture.componentRef.setInput('message', 'Ressaisissez le mot de passe.');
    const composant = fixture.componentInstance;
    let motDePasseRecu: string | null = null;
    composant.confirmee.subscribe((motDePasse) => {
      motDePasseRecu = motDePasse;
    });

    composant.motDePasse.set('secret-1234');
    composant.confirmer();

    expect(motDePasseRecu).toBe('secret-1234');
  });

  it("n'émet rien si le mot de passe est vide", () => {
    const fixture = TestBed.createComponent(SqmConfirmationMotDePasseComponent);
    fixture.componentRef.setInput('message', 'Ressaisissez le mot de passe.');
    const composant = fixture.componentInstance;
    let confirmee = false;
    composant.confirmee.subscribe(() => {
      confirmee = true;
    });

    composant.confirmer();

    expect(confirmee).toBe(false);
  });

  it('réinitialise le champ après confirmation', () => {
    const fixture = TestBed.createComponent(SqmConfirmationMotDePasseComponent);
    fixture.componentRef.setInput('message', 'Ressaisissez le mot de passe.');
    const composant = fixture.componentInstance;
    composant.motDePasse.set('secret-1234');

    composant.confirmer();

    expect(composant.motDePasse()).toBe('');
  });

  it('émet annulee et réinitialise le champ lors de l’annulation', () => {
    const fixture = TestBed.createComponent(SqmConfirmationMotDePasseComponent);
    fixture.componentRef.setInput('message', 'Ressaisissez le mot de passe.');
    const composant = fixture.componentInstance;
    composant.motDePasse.set('brouillon');
    let annulee = false;
    composant.annulee.subscribe(() => {
      annulee = true;
    });

    composant.annuler();

    expect(annulee).toBe(true);
    expect(composant.motDePasse()).toBe('');
  });
});
