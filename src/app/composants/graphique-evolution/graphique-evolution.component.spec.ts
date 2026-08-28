// Test du composant Graphique d'évolution (cf. graphique-evolution.component.ts, US-016), généré avec l'assistance
// de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { Chart } from 'chart.js';
import { DomTestUtils } from '../../testing/dom-test.utils';
import type {
  LigneVerticaleGraphique,
  SerieGraphiqueEvolution,
} from './graphique-evolution.component';
import { SqmGraphiqueEvolutionComponent } from './graphique-evolution.component';

describe('SqmGraphiqueEvolutionComponent', () => {
  /**
   * Retrouve, dans un canevas rendu, l'instance `chart.js` réellement construite (API publique `Chart.getChart`),
   * pour vérifier le comportement effectif de la bibliothèque plutôt que la seule configuration transmise. Déclarée
   * au sein de ce bloc `describe` plutôt qu'au niveau du module (aucune fonction hors classe autorisée en dehors
   * d'un bloc de test, cf. `.claude/rules/09-normes-developpement.md#rigueur-typescript`).
   * @param conteneur - Élément racine du composant sous test.
   * @returns L'instance `chart.js` trouvée, `undefined` si aucun canevas n'est rendu.
   */
  function trouverInstanceChart(conteneur: HTMLElement): Chart | undefined {
    const canvas = conteneur.querySelector('canvas');
    if (canvas === null) {
      return undefined;
    }
    return Chart.getChart(canvas);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmGraphiqueEvolutionComponent],
    }).compileComponents();
  });

  it('affiche un message explicite quand aucune série ne porte le moindre point', () => {
    const fixture = TestBed.createComponent(SqmGraphiqueEvolutionComponent);
    const series: readonly SerieGraphiqueEvolution[] = [
      { id: 'projet-1', libelle: 'Projet 1', couleur: '#1a56db', points: [] },
    ];
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();

    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Aucune donnée');
    expect(element.querySelector('canvas')).toBeNull();
  });

  it('affiche le graphique dès qu’au moins une série porte un point', () => {
    const fixture = TestBed.createComponent(SqmGraphiqueEvolutionComponent);
    const series: readonly SerieGraphiqueEvolution[] = [
      {
        id: 'projet-1',
        libelle: 'Projet 1',
        couleur: '#1a56db',
        points: [{ date: '2026-06-05T00:00:00Z', valeur: 61.2 }],
      },
      { id: 'projet-2', libelle: 'Projet 2', couleur: '#dc2626', points: [] },
    ];
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();

    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.querySelector('[role="status"]')).toBeNull();
    expect(element.querySelector('canvas')).not.toBeNull();
  });

  it('bascule l’activation d’une série sans affecter les autres séries (pas de recalcul erroné)', () => {
    const fixture = TestBed.createComponent(SqmGraphiqueEvolutionComponent);
    const series: readonly SerieGraphiqueEvolution[] = [
      {
        id: 'projet-1',
        libelle: 'Projet 1',
        couleur: '#1a56db',
        points: [{ date: '2026-06-05T00:00:00Z', valeur: 61.2 }],
      },
      {
        id: 'projet-2',
        libelle: 'Projet 2',
        couleur: '#dc2626',
        points: [{ date: '2026-06-05T00:00:00Z', valeur: 38.4 }],
      },
    ];
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    expect(composant.serieActive('projet-1')).toBe(true);
    expect(composant.serieActive('projet-2')).toBe(true);

    composant.basculerSerie('projet-1');
    fixture.detectChanges();

    expect(composant.serieActive('projet-1')).toBe(false);
    expect(composant.serieActive('projet-2')).toBe(true);

    const boutons = Array.from(
      DomTestUtils.obtenirElementNatif(fixture).querySelectorAll(
        '.graphique-evolution__bouton-serie',
      ),
    );
    const boutonProjet1 = boutons.find((bouton) => bouton.textContent?.includes('Projet 1'));
    const boutonProjet2 = boutons.find((bouton) => bouton.textContent?.includes('Projet 2'));
    expect(boutonProjet1?.getAttribute('aria-pressed')).toBe('false');
    expect(boutonProjet2?.getAttribute('aria-pressed')).toBe('true');

    const instance = trouverInstanceChart(DomTestUtils.obtenirElementNatif(fixture));
    expect(instance?.data.datasets[0]?.hidden).toBe(true);
    expect(instance?.data.datasets[1]?.hidden).toBeFalsy();
    // La donnée de la série toujours active n'est pas altérée par la bascule de l'autre série.
    expect(instance?.data.datasets[1]?.data).toEqual([
      { x: new Date('2026-06-05T00:00:00Z').getTime(), y: 38.4 },
    ]);
  });

  // Ajouté en relecture : seule la bascule d'activation (masquage) était exercée par un test, jamais la bascule
  // de réactivation d'une série déjà masquée (écart décelé par la mesure de couverture de branches).
  it('réactive une série précédemment masquée par un second appel de bascule', () => {
    const fixture = TestBed.createComponent(SqmGraphiqueEvolutionComponent);
    const series: readonly SerieGraphiqueEvolution[] = [
      {
        id: 'projet-1',
        libelle: 'Projet 1',
        couleur: '#1a56db',
        points: [{ date: '2026-06-05T00:00:00Z', valeur: 61.2 }],
      },
    ];
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();
    const composant = fixture.componentInstance;

    composant.basculerSerie('projet-1');
    fixture.detectChanges();
    expect(composant.serieActive('projet-1')).toBe(false);

    composant.basculerSerie('projet-1');
    fixture.detectChanges();
    expect(composant.serieActive('projet-1')).toBe(true);
  });

  it('positionne une ligne verticale de changement de seuil exactement à la date fournie, avec son libellé', () => {
    const fixture = TestBed.createComponent(SqmGraphiqueEvolutionComponent);
    const series: readonly SerieGraphiqueEvolution[] = [
      {
        id: 'projet-1',
        libelle: 'Projet 1',
        couleur: '#1a56db',
        points: [{ date: '2026-06-05T00:00:00Z', valeur: 61.2 }],
      },
    ];
    const lignesVerticales: readonly LigneVerticaleGraphique[] = [
      {
        id: 'seuil-1',
        date: '2026-05-15T09:30:00Z',
        libelle: 'vitalite.mortJours : — → 365',
        categorie: 'changementSeuil',
      },
    ];
    fixture.componentRef.setInput('series', series);
    fixture.componentRef.setInput('lignesVerticales', lignesVerticales);
    fixture.detectChanges();

    const instance = trouverInstanceChart(DomTestUtils.obtenirElementNatif(fixture));
    const annotations = instance?.options.plugins?.annotation?.annotations;
    if (!Array.isArray(annotations)) {
      throw new Error('Annotations attendues sous forme de tableau.');
    }
    expect(annotations).toHaveLength(1);
    const [annotation] = annotations;
    expect(annotation?.xMin).toBe(new Date('2026-05-15T09:30:00Z').getTime());
    expect(annotation?.xMax).toBe(new Date('2026-05-15T09:30:00Z').getTime());
    if (annotation?.type !== 'line') {
      throw new Error('Annotation de type ligne attendue.');
    }
    expect(annotation.label?.content).toBe('vitalite.mortJours : — → 365');
  });

  it('distingue visuellement une annotation d’un changement de seuil (couleur et tirets différents)', () => {
    const fixture = TestBed.createComponent(SqmGraphiqueEvolutionComponent);
    const series: readonly SerieGraphiqueEvolution[] = [
      {
        id: 'projet-1',
        libelle: 'Projet 1',
        couleur: '#1a56db',
        points: [{ date: '2026-06-05T00:00:00Z', valeur: 61.2 }],
      },
    ];
    const lignesVerticales: readonly LigneVerticaleGraphique[] = [
      { id: 'a1', date: '2026-03-10', libelle: 'Migration GitLab 17', categorie: 'annotation' },
      {
        id: 's1',
        date: '2026-05-15T09:30:00Z',
        libelle: 'vitalite.mortJours : — → 365',
        categorie: 'changementSeuil',
      },
    ];
    fixture.componentRef.setInput('series', series);
    fixture.componentRef.setInput('lignesVerticales', lignesVerticales);
    fixture.detectChanges();

    const instance = trouverInstanceChart(DomTestUtils.obtenirElementNatif(fixture));
    const annotations = instance?.options.plugins?.annotation?.annotations;
    if (!Array.isArray(annotations)) {
      throw new Error('Annotations attendues sous forme de tableau.');
    }
    const [annotationCategorie, annotationSeuil] = annotations;
    if (annotationCategorie === undefined || annotationSeuil === undefined) {
      throw new Error('Deux annotations attendues.');
    }

    expect(annotationCategorie.borderColor).not.toBe(annotationSeuil.borderColor);
    expect(annotationSeuil.borderDash).toEqual([6, 4]);
    expect(annotationCategorie.borderDash).toEqual([]);
  });

  it('propose des boutons de zoom accessibles au clavier', () => {
    const fixture = TestBed.createComponent(SqmGraphiqueEvolutionComponent);
    const series: readonly SerieGraphiqueEvolution[] = [
      {
        id: 'projet-1',
        libelle: 'Projet 1',
        couleur: '#1a56db',
        points: [{ date: '2026-06-05T00:00:00Z', valeur: 61.2 }],
      },
    ];
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();

    const element = DomTestUtils.obtenirElementNatif(fixture);
    const boutonReinitialiser = Array.from(element.querySelectorAll('button')).find((bouton) =>
      bouton.textContent?.includes('Réinitialiser le zoom'),
    );
    expect(boutonReinitialiser).not.toBeUndefined();
    expect(boutonReinitialiser?.tabIndex).toBeGreaterThanOrEqual(0);

    const composant = fixture.componentInstance;
    expect(() => {
      composant.zoomerAvant();
      composant.zoomerArriere();
      composant.reinitialiserZoom();
    }).not.toThrow();
  });

  it(
    'restitue les points d’une série (audits historiques et réguliers confondus) en un unique jeu de données ' +
      'relié par une ligne continue, sans jeu de données ni bouton de légende supplémentaire (C15-14, US-046, ' +
      'RG-046)',
    () => {
      const fixture = TestBed.createComponent(SqmGraphiqueEvolutionComponent);
      const series: readonly SerieGraphiqueEvolution[] = [
        {
          id: 'projet-1',
          libelle: 'Projet 1',
          couleur: '#1a56db',
          points: [
            { date: '2026-04-01T00:00:00Z', valeur: 55.0 },
            { date: '2026-06-05T00:00:00Z', valeur: 61.2 },
            { date: '2026-07-08T00:00:00Z', valeur: 64.8 },
          ],
        },
      ];
      fixture.componentRef.setInput('series', series);
      fixture.detectChanges();

      const instance = trouverInstanceChart(DomTestUtils.obtenirElementNatif(fixture));
      expect(instance?.data.datasets).toHaveLength(1);
      expect(instance?.data.datasets[0]?.data).toEqual([
        { x: new Date('2026-04-01T00:00:00Z').getTime(), y: 55.0 },
        { x: new Date('2026-06-05T00:00:00Z').getTime(), y: 61.2 },
        { x: new Date('2026-07-08T00:00:00Z').getTime(), y: 64.8 },
      ]);

      const boutons = DomTestUtils.obtenirElementNatif(fixture).querySelectorAll(
        '.graphique-evolution__bouton-serie',
      );
      expect(boutons).toHaveLength(1);
      expect(
        DomTestUtils.obtenirElementNatif(fixture).querySelector(
          '.graphique-evolution__legende-formes',
        ),
      ).toBeNull();
    },
  );

  it(
    'positionne le repère du premier audit régulier (categorie "premierAuditRegulier") à la date fournie, avec ' +
      'un style distinct de l’annotation et du changement de seuil (C15-14, US-046, RG-046)',
    () => {
      const fixture = TestBed.createComponent(SqmGraphiqueEvolutionComponent);
      const series: readonly SerieGraphiqueEvolution[] = [
        {
          id: 'projet-1',
          libelle: 'Projet 1',
          couleur: '#1a56db',
          points: [{ date: '2026-06-05T00:00:00Z', valeur: 61.2 }],
        },
      ];
      const lignesVerticales: readonly LigneVerticaleGraphique[] = [
        { id: 'a1', date: '2026-03-10', libelle: 'Migration', categorie: 'annotation' },
        {
          id: 's1',
          date: '2026-05-15T09:30:00Z',
          libelle: 'couverture.seuilRouge : 30 → 40',
          categorie: 'changementSeuil',
        },
        {
          id: 'premier-audit-regulier',
          date: '2026-06-05T00:00:00Z',
          libelle: 'Début des audits réguliers',
          categorie: 'premierAuditRegulier',
        },
      ];
      fixture.componentRef.setInput('series', series);
      fixture.componentRef.setInput('lignesVerticales', lignesVerticales);
      fixture.detectChanges();

      const instance = trouverInstanceChart(DomTestUtils.obtenirElementNatif(fixture));
      const annotations = instance?.options.plugins?.annotation?.annotations;
      if (!Array.isArray(annotations)) {
        throw new Error('Annotations attendues sous forme de tableau.');
      }
      const [annotation, seuil, repere] = annotations;
      if (annotation === undefined || seuil === undefined || repere === undefined) {
        throw new Error('Trois lignes verticales attendues.');
      }
      if (repere.type !== 'line') {
        throw new Error('Repère de type ligne attendu.');
      }
      expect(repere.xMin).toBe(new Date('2026-06-05T00:00:00Z').getTime());
      expect(repere.label?.content).toBe('Début des audits réguliers');
      expect(repere.borderColor).not.toBe(annotation.borderColor);
      expect(repere.borderColor).not.toBe(seuil.borderColor);
      expect(repere.borderDash).toEqual([2, 3]);
    },
  );

  it('masque la totalité des points d’une série au clic sur son bouton de bascule', () => {
    const fixture = TestBed.createComponent(SqmGraphiqueEvolutionComponent);
    const series: readonly SerieGraphiqueEvolution[] = [
      {
        id: 'projet-1',
        libelle: 'Projet 1',
        couleur: '#1a56db',
        points: [
          { date: '2026-04-01T00:00:00Z', valeur: 55.0 },
          { date: '2026-06-05T00:00:00Z', valeur: 61.2 },
        ],
      },
    ];
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();
    fixture.componentInstance.basculerSerie('projet-1');
    fixture.detectChanges();

    const instance = trouverInstanceChart(DomTestUtils.obtenirElementNatif(fixture));
    expect(instance?.data.datasets).toHaveLength(1);
    expect(instance?.data.datasets[0]?.hidden).toBe(true);
  });

  it('détruit proprement l’instance chart.js à la destruction du composant', () => {
    const fixture = TestBed.createComponent(SqmGraphiqueEvolutionComponent);
    const series: readonly SerieGraphiqueEvolution[] = [
      {
        id: 'projet-1',
        libelle: 'Projet 1',
        couleur: '#1a56db',
        points: [{ date: '2026-06-05T00:00:00Z', valeur: 61.2 }],
      },
    ];
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();

    expect(() => {
      fixture.destroy();
    }).not.toThrow();
  });
});
