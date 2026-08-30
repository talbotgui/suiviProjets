// Test du composant transverse de sélection de vue enregistrée (cf. selecteur-vue.component.ts, US-028, RG-027),
// généré avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SqmSelecteurVueComponent } from './selecteur-vue.component';
import type { VueSelectionnable } from './selecteur-vue.component';

const VUES: readonly VueSelectionnable[] = [
  { id: 'v1', nom: 'Mon équipe', parDefaut: false, filtres: { groupeId: 'g1' } },
  { id: 'v2', nom: 'Tout voir', parDefaut: true, filtres: { groupeId: null } },
];

describe('SqmSelecteurVueComponent', () => {
  let composant: SqmSelecteurVueComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmSelecteurVueComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(SqmSelecteurVueComponent);
    fixture.componentRef.setInput('vues', VUES);
    fixture.detectChanges();
    composant = fixture.componentInstance;
  });

  it('émet vueAppliquee avec la vue complète lors de la sélection', () => {
    let vueEmise: VueSelectionnable | undefined;
    composant.vueAppliquee.subscribe((vue) => {
      vueEmise = vue;
    });

    composant.selectionner('v1');

    expect(vueEmise).toEqual(VUES[0]);
  });

  it("n'émet rien si l'identifiant sélectionné ne correspond à aucune vue", () => {
    let emis = false;
    composant.vueAppliquee.subscribe(() => {
      emis = true;
    });

    composant.selectionner('');

    expect(emis).toBe(false);
  });

  it('ignore un nom vide (espaces uniquement) lors de la validation du formulaire d’enregistrement', () => {
    composant.ouvrirFormulaireEnregistrement();
    composant.nomSaisi.set('   ');

    composant.validerFormulaireEnregistrement();

    expect(composant.confirmationMotDePasseVisible()).toBe(false);
  });

  it('ouvre la confirmation du mot de passe puis émet enregistrementDemande (création)', () => {
    composant.ouvrirFormulaireEnregistrement();
    composant.nomSaisi.set('Ma nouvelle vue');
    composant.parDefautSaisi.set(true);
    composant.validerFormulaireEnregistrement();
    expect(composant.confirmationMotDePasseVisible()).toBe(true);

    let demande: unknown;
    composant.enregistrementDemande.subscribe((valeur) => {
      demande = valeur;
    });

    composant.confirmerMotDePasse('secret');

    expect(demande).toEqual({
      id: undefined,
      nom: 'Ma nouvelle vue',
      parDefaut: true,
      motDePasse: 'secret',
    });
    expect(composant.confirmationMotDePasseVisible()).toBe(false);
  });

  it('émet enregistrementDemande avec l’identifiant existant lors d’une mise à jour', () => {
    composant.selectionner('v1');

    composant.mettreAJourVueSelectionnee();
    let demande: unknown;
    composant.enregistrementDemande.subscribe((valeur) => {
      demande = valeur;
    });
    composant.confirmerMotDePasse('secret');

    expect(demande).toEqual({
      id: 'v1',
      nom: 'Mon équipe',
      parDefaut: false,
      motDePasse: 'secret',
    });
  });

  it('ne fait rien si la mise à jour est demandée sans vue sélectionnée', () => {
    composant.mettreAJourVueSelectionnee();

    expect(composant.confirmationMotDePasseVisible()).toBe(false);
  });

  it('demande confirmation de suppression puis mot de passe et émet suppressionDemandee', () => {
    composant.selectionner('v2');

    composant.demanderSuppression();
    expect(composant.confirmationSuppressionVisible()).toBe(true);

    composant.confirmerSuppression();
    expect(composant.confirmationSuppressionVisible()).toBe(false);
    expect(composant.confirmationMotDePasseVisible()).toBe(true);

    let demande: unknown;
    composant.suppressionDemandee.subscribe((valeur) => {
      demande = valeur;
    });
    composant.confirmerMotDePasse('secret');

    expect(demande).toEqual({ id: 'v2', motDePasse: 'secret' });
  });

  it('annule la suppression sans jamais afficher la confirmation du mot de passe', () => {
    composant.selectionner('v1');
    composant.demanderSuppression();

    composant.annulerSuppression();

    expect(composant.confirmationSuppressionVisible()).toBe(false);
    expect(composant.confirmationMotDePasseVisible()).toBe(false);
  });

  it("n'affiche pas la confirmation de suppression si aucune vue n'est sélectionnée", () => {
    composant.demanderSuppression();

    expect(composant.confirmationSuppressionVisible()).toBe(false);
  });

  it("n'émet rien si le mot de passe est annulé", () => {
    composant.ouvrirFormulaireEnregistrement();
    composant.nomSaisi.set('Vue annulée');
    composant.validerFormulaireEnregistrement();

    let emis = false;
    composant.enregistrementDemande.subscribe(() => {
      emis = true;
    });
    composant.annulerMotDePasse();

    expect(emis).toBe(false);
    expect(composant.confirmationMotDePasseVisible()).toBe(false);
  });

  it('adapte le message de confirmation du mot de passe selon l’action en attente', () => {
    composant.selectionner('v1');
    composant.demanderSuppression();
    composant.confirmerSuppression();

    expect(composant.messageConfirmationMotDePasse()).toContain('supprimer');
  });

  it("referme le formulaire d'enregistrement sans rien émettre lors de l'annulation", () => {
    composant.ouvrirFormulaireEnregistrement();

    composant.annulerFormulaireEnregistrement();

    expect(composant.formulaireEnregistrementOuvert()).toBe(false);
  });
});
