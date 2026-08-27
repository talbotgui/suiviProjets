// Test du composant transverse de saisie en masse (cf. modale-saisie-masse.component.ts, US-043), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmModaleSaisieMasseComponent } from './modale-saisie-masse.component';
import type { ResultatTraitementSaisieMasse } from './modale-saisie-masse.component';

describe('SqmModaleSaisieMasseComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmModaleSaisieMasseComponent],
    }).compileComponents();
  });

  /**
   * Résultat de traitement générique réutilisé par plusieurs tests.
   * @param overrides - Champs à substituer au résultat par défaut (tout enregistré avec succès).
   * @returns Le résultat de traitement construit.
   */
  function resultat(
    overrides: Partial<ResultatTraitementSaisieMasse> = {},
  ): ResultatTraitementSaisieMasse {
    return { texteRestant: '', erreurs: [], nombreReussies: 1, ...overrides };
  }

  it('affiche le titre transmis', () => {
    const fixture = TestBed.createComponent(SqmModaleSaisieMasseComponent);
    fixture.componentRef.setInput('titre', 'Créer des règles en masse');
    fixture.componentRef.setInput('traiter', () => Promise.resolve(resultat()));
    fixture.detectChanges();

    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('Créer des règles en masse');
  });

  it('applique le texte initial une seule fois, sans jamais l’écraser ensuite', () => {
    const fixture = TestBed.createComponent(SqmModaleSaisieMasseComponent);
    fixture.componentRef.setInput('titre', 'Titre');
    fixture.componentRef.setInput('texteInitial', 'lodash;4.17.0=');
    fixture.componentRef.setInput('traiter', () => Promise.resolve(resultat()));
    fixture.detectChanges();

    expect(fixture.componentInstance.texte()).toBe('lodash;4.17.0=');

    fixture.componentInstance.texte.set('texte édité par l’utilisateur');
    fixture.componentRef.setInput('texteInitial', 'autre valeur');
    fixture.detectChanges();

    expect(fixture.componentInstance.texte()).toBe('texte édité par l’utilisateur');
  });

  it('place le focus sur la zone de texte à l’affichage', () => {
    const fixture = TestBed.createComponent(SqmModaleSaisieMasseComponent);
    fixture.componentRef.setInput('titre', 'Titre');
    fixture.componentRef.setInput('traiter', () => Promise.resolve(resultat()));
    fixture.detectChanges();

    const champ = DomTestUtils.obtenirElementNatif(fixture).querySelector(
      '#modale-saisie-masse-champ-texte',
    );
    expect(document.activeElement).toBe(champ);
  });

  it('refuse de valider une zone de texte vide, sans appeler la stratégie de traitement', async () => {
    const fixture = TestBed.createComponent(SqmModaleSaisieMasseComponent);
    const traiter = jest.fn(() => Promise.resolve(resultat()));
    fixture.componentRef.setInput('titre', 'Titre');
    fixture.componentRef.setInput('traiter', traiter);
    fixture.detectChanges();

    await fixture.componentInstance.valider();

    expect(traiter).not.toHaveBeenCalled();
    expect(fixture.componentInstance.erreurGlobale()).toBe('La zone de texte est vide.');
  });

  it('refuse de valider sans mot de passe saisi, sans appeler la stratégie de traitement', async () => {
    const fixture = TestBed.createComponent(SqmModaleSaisieMasseComponent);
    const traiter = jest.fn(() => Promise.resolve(resultat()));
    fixture.componentRef.setInput('titre', 'Titre');
    fixture.componentRef.setInput('traiter', traiter);
    fixture.detectChanges();
    fixture.componentInstance.texte.set('lodash;4.17.0=maintenu');

    await fixture.componentInstance.valider();

    expect(traiter).not.toHaveBeenCalled();
    expect(fixture.componentInstance.erreurGlobale()).toBe(
      'Le mot de passe du fichier est obligatoire.',
    );
  });

  it('transmet le texte et le mot de passe à la stratégie de traitement, puis applique le résultat obtenu', async () => {
    const fixture = TestBed.createComponent(SqmModaleSaisieMasseComponent);
    const traiter = jest.fn((texte: string, motDePasse: string) => {
      expect(texte).toBe('lodash;4.17.0=maintenu');
      expect(motDePasse).toBe('secret-1234');
      return Promise.resolve(resultat({ texteRestant: '', erreurs: [], nombreReussies: 1 }));
    });
    fixture.componentRef.setInput('titre', 'Titre');
    fixture.componentRef.setInput('traiter', traiter);
    fixture.detectChanges();
    fixture.componentInstance.texte.set('lodash;4.17.0=maintenu');
    fixture.componentInstance.motDePasse.set('secret-1234');

    let resultatEmis: ResultatTraitementSaisieMasse | undefined;
    fixture.componentInstance.resultatTraite.subscribe((valeur) => {
      resultatEmis = valeur;
    });

    await fixture.componentInstance.valider();

    expect(traiter).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.texte()).toBe('');
    expect(fixture.componentInstance.erreurs()).toEqual([]);
    expect(fixture.componentInstance.motDePasse()).toBe('');
    expect(resultatEmis).toEqual(resultat());
  });

  it('laisse dans la zone de texte les lignes en échec et affiche leurs erreurs, sans bloquer les lignes correctes déjà enregistrées', async () => {
    const fixture = TestBed.createComponent(SqmModaleSaisieMasseComponent);
    const resultatPartiel: ResultatTraitementSaisieMasse = {
      texteRestant: 'inconnue;1.0=obsolete',
      erreurs: [{ ligne: 'inconnue;1.0=obsolete', message: 'Format invalide.' }],
      nombreReussies: 1,
    };
    fixture.componentRef.setInput('titre', 'Titre');
    fixture.componentRef.setInput('traiter', () => Promise.resolve(resultatPartiel));
    fixture.detectChanges();
    fixture.componentInstance.texte.set('lodash;4.17.0=maintenu\ninconnue;1.0=obsolete');
    fixture.componentInstance.motDePasse.set('secret-1234');

    await fixture.componentInstance.valider();
    fixture.detectChanges();

    expect(fixture.componentInstance.texte()).toBe('inconnue;1.0=obsolete');
    expect(fixture.componentInstance.erreurs()).toEqual(resultatPartiel.erreurs);
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('Format invalide.');
  });

  it('passe en état "en cours" pendant le traitement et ignore une nouvelle validation ou annulation tant que le traitement dure', async () => {
    const fixture = TestBed.createComponent(SqmModaleSaisieMasseComponent);
    let resoudre: ((valeur: ResultatTraitementSaisieMasse) => void) | undefined;
    const traiter = jest.fn(
      () =>
        new Promise<ResultatTraitementSaisieMasse>((resolve) => {
          resoudre = resolve;
        }),
    );
    fixture.componentRef.setInput('titre', 'Titre');
    fixture.componentRef.setInput('traiter', traiter);
    fixture.detectChanges();
    fixture.componentInstance.texte.set('lodash;4.17.0=maintenu');
    fixture.componentInstance.motDePasse.set('secret-1234');

    const promesse = fixture.componentInstance.valider();
    expect(fixture.componentInstance.enCours()).toBe(true);

    let annulee = false;
    fixture.componentInstance.annulee.subscribe(() => {
      annulee = true;
    });
    fixture.componentInstance.annuler();
    await fixture.componentInstance.valider();

    expect(annulee).toBe(false);
    expect(traiter).toHaveBeenCalledTimes(1);

    resoudre?.(resultat());
    await promesse;
    expect(fixture.componentInstance.enCours()).toBe(false);
  });

  it('ferme la modale (émet annulee) lorsque la touche Échap est pressée', () => {
    const fixture = TestBed.createComponent(SqmModaleSaisieMasseComponent);
    fixture.componentRef.setInput('titre', 'Titre');
    fixture.componentRef.setInput('traiter', () => Promise.resolve(resultat()));
    fixture.detectChanges();
    let annulee = false;
    fixture.componentInstance.annulee.subscribe(() => {
      annulee = true;
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(annulee).toBe(true);
  });

  it('ignore la touche Échap pendant le traitement d’une soumission (enCours)', async () => {
    const fixture = TestBed.createComponent(SqmModaleSaisieMasseComponent);
    let resoudre: ((valeur: ResultatTraitementSaisieMasse) => void) | undefined;
    fixture.componentRef.setInput('titre', 'Titre');
    fixture.componentRef.setInput(
      'traiter',
      () =>
        new Promise<ResultatTraitementSaisieMasse>((resolve) => {
          resoudre = resolve;
        }),
    );
    fixture.detectChanges();
    fixture.componentInstance.texte.set('lodash;4.17.0=maintenu');
    fixture.componentInstance.motDePasse.set('secret-1234');

    const promesse = fixture.componentInstance.valider();
    expect(fixture.componentInstance.enCours()).toBe(true);
    let annulee = false;
    fixture.componentInstance.annulee.subscribe(() => {
      annulee = true;
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(annulee).toBe(false);

    resoudre?.(resultat());
    await promesse;
  });

  it("émet annulee lors de l'annulation hors traitement", () => {
    const fixture = TestBed.createComponent(SqmModaleSaisieMasseComponent);
    fixture.componentRef.setInput('titre', 'Titre');
    fixture.componentRef.setInput('traiter', () => Promise.resolve(resultat()));
    fixture.detectChanges();

    let annulee = false;
    fixture.componentInstance.annulee.subscribe(() => {
      annulee = true;
    });

    fixture.componentInstance.annuler();

    expect(annulee).toBe(true);
  });
});
