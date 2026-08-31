// Test de l'écran Administration (cf. administration.component.ts), généré avec l'assistance de l'IA (Claude
// Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { SqmAdministrationComponent } from './administration.component';

describe('SqmAdministrationComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmAdministrationComponent],
    }).compileComponents();
  });

  it("affiche l'onglet Groupes par défaut", () => {
    const composant = TestBed.createComponent(SqmAdministrationComponent).componentInstance;

    expect(composant.ongletActif).toBe('groupes');
  });

  it.each(['groupes', 'projets', 'sources', 'metriques'] as const)(
    'sélectionne l’onglet « %s »',
    (onglet) => {
      const composant = TestBed.createComponent(SqmAdministrationComponent).componentInstance;

      composant.selectionnerOnglet(onglet);

      expect(composant.ongletActif).toBe(onglet);
    },
  );

  it("expose l'onglet Métriques (US-055) au niveau du modèle, sans rendu du sous-composant", () => {
    // Les tests de ce spec n'appellent jamais detectChanges() : rendre le @case imposerait de mocker
    // `@tauri-apps/api/core` et d'amorcer une racine, le constructeur de SqmMetriquesAdminComponent invoquant
    // la commande native `calculerMetriquesVolumetrie`.
    const composant = TestBed.createComponent(SqmAdministrationComponent).componentInstance;

    composant.selectionnerOnglet('metriques');

    expect(composant.ongletActif).toBe('metriques');
  });

  it(
    'expose groupeId/critere/typeCritere (paramètres de requête du lien « Qualifier ce membre » de la ' +
      'Fiche projet) pour relais vers Groupes/Membres connus',
    () => {
      const fixture = TestBed.createComponent(SqmAdministrationComponent);
      fixture.componentRef.setInput('groupeId', 'groupe-1');
      fixture.componentRef.setInput('critere', 'exemple.fr');
      fixture.componentRef.setInput('typeCritere', 'domaineEmail');

      expect(fixture.componentInstance.groupeId()).toBe('groupe-1');
      expect(fixture.componentInstance.critere()).toBe('exemple.fr');
      expect(fixture.componentInstance.typeCritere()).toBe('domaineEmail');
    },
  );
});
