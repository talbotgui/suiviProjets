// Test du composant transverse de filtrage groupe/projet mutualisé (cf. filtre-groupe-projet.component.ts,
// plan_16 incrément 2, RG-053), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { DomTestUtils } from '../../testing/dom-test.utils';
import { SqmFiltreGroupeProjetComponent } from './filtre-groupe-projet.component';
import type {
  GroupeFiltrable,
  ProjetFiltrable,
  SelectionGroupeProjet,
} from './filtre-groupe-projet.component';

const GROUPES: readonly GroupeFiltrable[] = [
  { id: 'g1', nom: 'Groupe 1' },
  { id: 'g2', nom: 'Groupe 2' },
];

const PROJETS: readonly ProjetFiltrable[] = [
  { id: 'p1', nom: 'Projet 1', groupeId: 'g1' },
  { id: 'p2', nom: 'Projet 2', groupeId: 'g1' },
  { id: 'p3', nom: 'Projet 3', groupeId: 'g2' },
];

describe('SqmFiltreGroupeProjetComponent', () => {
  let fixture: ComponentFixture<SqmFiltreGroupeProjetComponent>;
  let composant: SqmFiltreGroupeProjetComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmFiltreGroupeProjetComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SqmFiltreGroupeProjetComponent);
    fixture.componentRef.setInput('groupes', GROUPES);
    fixture.componentRef.setInput('projets', PROJETS);
    fixture.detectChanges();
    composant = fixture.componentInstance;
  });

  it('propose tous les projets quand aucun groupe n’est sélectionné', () => {
    expect(composant.projetsProposes().map((projet) => projet.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('restreint la liste de projets proposée au groupe sélectionné', () => {
    fixture.componentRef.setInput('groupeId', 'g1');
    fixture.detectChanges();

    expect(composant.projetsProposes().map((projet) => projet.id)).toEqual(['p1', 'p2']);
  });

  it('émet une sélection sans projet à chaque changement de groupe (règle de couplage RG-053)', () => {
    fixture.componentRef.setInput('groupeId', 'g1');
    fixture.componentRef.setInput('projetIds', ['p1']);
    fixture.detectChanges();
    let emise: SelectionGroupeProjet | undefined;
    composant.selectionChangee.subscribe((selection) => {
      emise = selection;
    });

    composant.onChangerGroupe('g2');

    expect(emise).toEqual({ groupeId: 'g2', projetIds: null });
  });

  it('émet `groupeId` à `null` quand l’option « Tous les groupes » est choisie', () => {
    let emise: SelectionGroupeProjet | undefined;
    composant.selectionChangee.subscribe((selection) => {
      emise = selection;
    });

    composant.onChangerGroupe('');

    expect(emise).toEqual({ groupeId: null, projetIds: null });
  });

  it('émet la liste des projets sélectionnés en conservant le groupe courant', () => {
    fixture.componentRef.setInput('groupeId', 'g1');
    fixture.detectChanges();
    let emise: SelectionGroupeProjet | undefined;
    composant.selectionChangee.subscribe((selection) => {
      emise = selection;
    });
    const select = document.createElement('select');
    select.multiple = true;
    for (const id of ['p1', 'p2']) {
      const option = document.createElement('option');
      option.value = id;
      option.selected = true;
      select.append(option);
    }

    composant.onChangerProjets(select);

    expect(emise).toEqual({ groupeId: 'g1', projetIds: ['p1', 'p2'] });
  });

  it('émet `projetIds` à `null` quand plus aucun projet n’est sélectionné', () => {
    let emise: SelectionGroupeProjet | undefined;
    composant.selectionChangee.subscribe((selection) => {
      emise = selection;
    });

    composant.onChangerProjets(document.createElement('select'));

    expect(emise).toEqual({ groupeId: null, projetIds: null });
  });

  it('marque comme sélectionnées les options des projets de l’état courant', () => {
    fixture.componentRef.setInput('projetIds', ['p2']);
    fixture.detectChanges();

    expect(composant.estProjetSelectionne('p2')).toBe(true);
    expect(composant.estProjetSelectionne('p1')).toBe(false);
  });

  it('rend un sélecteur de groupe et un sélecteur multi-projets dans le gabarit', () => {
    const selects =
      DomTestUtils.obtenirElementNatif(fixture).querySelectorAll<HTMLSelectElement>('select');
    expect(selects).toHaveLength(2);
    expect(selects[1].multiple).toBe(true);
  });
});
