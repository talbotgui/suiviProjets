// Test du composant de ressaisie du mot de passe (cf. confirmation-mot-de-passe.component.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { DomTestUtils } from '../../testing/dom-test.utils';
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

  it('place le focus sur le champ de mot de passe à l’affichage', () => {
    const fixture = TestBed.createComponent(SqmConfirmationMotDePasseComponent);
    fixture.componentRef.setInput('message', 'Ressaisissez le mot de passe.');
    fixture.detectChanges();

    const champ = DomTestUtils.obtenirElementNatif(fixture).querySelector(
      '#confirmation-mot-de-passe-champ',
    );

    expect(document.activeElement).toBe(champ);
  });

  it('passe en état "en cours" à la confirmation et ignore une nouvelle confirmation ou annulation tant que le traitement dure', () => {
    const fixture = TestBed.createComponent(SqmConfirmationMotDePasseComponent);
    fixture.componentRef.setInput('message', 'Ressaisissez le mot de passe.');
    const composant = fixture.componentInstance;
    let nombreConfirmations = 0;
    let annulee = false;
    composant.confirmee.subscribe(() => {
      nombreConfirmations++;
    });
    composant.annulee.subscribe(() => {
      annulee = true;
    });

    composant.motDePasse.set('secret-1234');
    composant.confirmer();

    expect(composant.enCours()).toBe(true);

    composant.confirmer();
    composant.annuler();

    expect(nombreConfirmations).toBe(1);
    expect(annulee).toBe(false);
  });

  it('désactive le groupement de formulaire (champ et boutons) pendant le traitement', () => {
    // Assertion portée sur le `fieldset` englobant, seul point vérifiable sous jsdom : la cascade native de
    // l'attribut `disabled` du `fieldset` vers ses descendants (`input`, `button`) n'est pas implémentée par
    // jsdom (contrairement aux navigateurs réels), donc `input.disabled`/`button.disabled` resteraient `false`
    // ici même en cas de comportement correct en production.
    const fixture = TestBed.createComponent(SqmConfirmationMotDePasseComponent);
    fixture.componentRef.setInput('message', 'Ressaisissez le mot de passe.');
    const composant = fixture.componentInstance;
    fixture.detectChanges();

    const racine = DomTestUtils.obtenirElementNatif(fixture);
    const groupement = racine.querySelector<HTMLFieldSetElement>('fieldset');
    expect(groupement?.disabled).toBe(false);

    composant.motDePasse.set('secret-1234');
    composant.confirmer();
    fixture.detectChanges();

    expect(groupement?.disabled).toBe(true);
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
