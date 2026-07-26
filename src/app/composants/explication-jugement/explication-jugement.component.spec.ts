// Test du composant Explication du jugement (cf. explication-jugement.component.ts), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { SqmExplicationJugementComponent } from './explication-jugement.component';
import { DomTestUtils } from '../../testing/dom-test.utils';

const SEUILS = {
  vitalite: { mourantJours: 180, mortJours: 365 },
  tailleDepot: { borneS: 20000000, borneL: 100000000, borneXL: 500000000 },
  couverture: { seuilRouge: 40, seuilOrange: 60 },
  fraicheurSonar: { toleranceJours: 7 },
  activiteSansQualite: { minCommits: 20, minNouvellesViolations: 10 },
  fraicheurAudit: { ancienJours: 30 },
  mrOuvertes: { ageOrangeJours: 30, ageRougeJours: 90, pourcentageConflitRouge: 50 },
  couleursViolations: {
    bloquant: { seuilOrange: 1, seuilRouge: 3 },
    critique: { seuilOrange: 10, seuilRouge: 25 },
  },
  materialiteBrouillon: { variationRelative: 0.1 },
};

const REFERENTIELS = { motifNommageBranches: '^(main|develop)$' };

const REFERENTIELS_MARQUEURS = {
  reglesMarqueursIA: [
    {
      motif: '.cursorrules',
      typeCorrespondance: 'exact',
      portee: 'racine',
      nature: 'fichier',
      outil: 'cursor',
    },
    {
      motif: 'CLAUDE.md',
      typeCorrespondance: 'exact',
      portee: 'racine',
      nature: 'fichier',
      outil: 'claude',
    },
  ],
};

const REFERENTIELS_DEPENDANCES = {
  reglesDependances: [
    {
      motif: 'org.springframework:*',
      versions: [
        { motifVersion: '4.*', statut: 'obsolete' },
        { motifVersion: '5.3.*', statut: 'maintenu' },
      ],
    },
  ],
};

describe('SqmExplicationJugementComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmExplicationJugementComponent],
    }).compileComponents();
  });

  it('est fermé par défaut (le contenu n’est pas rendu)', () => {
    const fixture = TestBed.createComponent(SqmExplicationJugementComponent);
    fixture.componentRef.setInput('cle', 'vitalite');
    fixture.componentRef.setInput('seuilsBruts', SEUILS);
    fixture.detectChanges();

    expect(DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="tooltip"]')).toBeNull();
  });

  it('affiche l’explication après activation du bouton déclencheur (focusable au clavier)', () => {
    const fixture = TestBed.createComponent(SqmExplicationJugementComponent);
    fixture.componentRef.setInput('cle', 'vitalite');
    fixture.componentRef.setInput('seuilsBruts', SEUILS);
    fixture.detectChanges();

    const bouton = DomTestUtils.obtenirElementNatif(fixture).querySelector('button');
    expect(bouton).not.toBeNull();
    bouton?.focus();
    expect(document.activeElement).toBe(bouton);

    bouton?.click();
    fixture.detectChanges();

    const popover = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="tooltip"]');
    expect(popover?.textContent).toContain('180 j');
    expect(popover?.textContent).toContain('365 j');
  });

  it('se referme à la touche Échap', () => {
    const fixture = TestBed.createComponent(SqmExplicationJugementComponent);
    fixture.componentRef.setInput('cle', 'vitalite');
    fixture.componentRef.setInput('seuilsBruts', SEUILS);
    fixture.detectChanges();
    fixture.componentInstance.basculer();
    fixture.detectChanges();
    expect(fixture.componentInstance.ouvert()).toBe(true);

    fixture.componentInstance.fermer();
    fixture.detectChanges();

    expect(fixture.componentInstance.ouvert()).toBe(false);
    expect(DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="tooltip"]')).toBeNull();
  });

  it('affiche un message d’indisponibilité si le seuil demandé est absent du document', () => {
    const fixture = TestBed.createComponent(SqmExplicationJugementComponent);
    fixture.componentRef.setInput('cle', 'couverture');
    fixture.componentRef.setInput('seuilsBruts', {});
    fixture.detectChanges();
    fixture.componentInstance.basculer();
    fixture.detectChanges();

    const popover = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="tooltip"]');
    expect(popover?.textContent).toContain('indisponible');
  });

  it.each([
    ['tailleDepot', ['20000000 o', '100000000 o', '500000000 o']],
    ['couverture', ['40 %', '60 %']],
    ['fraicheurSonar', ['7 j']],
    ['activiteSansQualite', ['20 commits', '10 nouvelles violations']],
    ['fraicheurAudit', ['30 j']],
    ['mrOuvertes', ['30 j', '90 j', '50 %']],
    ['couleursViolations', ['1', '3', '10', '25']],
    ['materialiteBrouillon', ['0.1']],
  ] as const)('formate l’explication de la clé %s', (cle, fragments) => {
    const fixture = TestBed.createComponent(SqmExplicationJugementComponent);
    fixture.componentRef.setInput('cle', cle);
    fixture.componentRef.setInput('seuilsBruts', SEUILS);
    fixture.detectChanges();
    fixture.componentInstance.basculer();
    fixture.detectChanges();

    const texte =
      DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="tooltip"]')?.textContent ??
      '';
    for (const fragment of fragments) {
      expect(texte).toContain(fragment);
    }
  });

  it.each([
    'vitalite',
    'tailleDepot',
    'couverture',
    'fraicheurSonar',
    'activiteSansQualite',
    'fraicheurAudit',
    'mrOuvertes',
    'couleursViolations',
    'materialiteBrouillon',
    'motifNommageBranches',
    'reglesMarqueursIA',
    'reglesDependances',
  ] as const)(
    'affiche un message d’indisponibilité pour %s si la donnée brute est absente',
    (cle) => {
      const fixture = TestBed.createComponent(SqmExplicationJugementComponent);
      fixture.componentRef.setInput('cle', cle);
      fixture.detectChanges();
      fixture.componentInstance.basculer();
      fixture.detectChanges();

      const popover = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="tooltip"]');
      expect(popover?.textContent).toContain('indisponible');
    },
  );

  it('formate l’explication du motif de nommage de branche depuis referentielsBruts', () => {
    const fixture = TestBed.createComponent(SqmExplicationJugementComponent);
    fixture.componentRef.setInput('cle', 'motifNommageBranches');
    fixture.componentRef.setInput('referentielsBruts', REFERENTIELS);
    fixture.detectChanges();
    fixture.componentInstance.basculer();
    fixture.detectChanges();

    const popover = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="tooltip"]');
    expect(popover?.textContent).toContain('^(main|develop)$');
  });

  it('formate l’explication du référentiel des marqueurs IA depuis referentielsBruts', () => {
    const fixture = TestBed.createComponent(SqmExplicationJugementComponent);
    fixture.componentRef.setInput('cle', 'reglesMarqueursIA');
    fixture.componentRef.setInput('referentielsBruts', REFERENTIELS_MARQUEURS);
    fixture.detectChanges();
    fixture.componentInstance.basculer();
    fixture.detectChanges();

    const popover = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="tooltip"]');
    expect(popover?.textContent).toContain('cursor (.cursorrules, racine, fichier)');
    expect(popover?.textContent).toContain('claude (CLAUDE.md, racine, fichier)');
    expect(popover?.textContent).toContain('2');
  });

  it('signale explicitement l’absence de règle si le référentiel des marqueurs IA est vide', () => {
    const fixture = TestBed.createComponent(SqmExplicationJugementComponent);
    fixture.componentRef.setInput('cle', 'reglesMarqueursIA');
    fixture.componentRef.setInput('referentielsBruts', { reglesMarqueursIA: [] });
    fixture.detectChanges();
    fixture.componentInstance.basculer();
    fixture.detectChanges();

    const popover = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="tooltip"]');
    expect(popover?.textContent).toContain('Aucune règle de détection de marqueurs IA définie');
  });

  it('formate l’explication du référentiel des dépendances depuis referentielsBruts', () => {
    const fixture = TestBed.createComponent(SqmExplicationJugementComponent);
    fixture.componentRef.setInput('cle', 'reglesDependances');
    fixture.componentRef.setInput('referentielsBruts', REFERENTIELS_DEPENDANCES);
    fixture.detectChanges();
    fixture.componentInstance.basculer();
    fixture.detectChanges();

    const popover = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="tooltip"]');
    expect(popover?.textContent).toContain('org.springframework:*');
    expect(popover?.textContent).toContain('4.* → obsolete');
    expect(popover?.textContent).toContain('5.3.* → maintenu');
  });

  it('signale explicitement l’absence de règle si le référentiel des dépendances est vide', () => {
    const fixture = TestBed.createComponent(SqmExplicationJugementComponent);
    fixture.componentRef.setInput('cle', 'reglesDependances');
    fixture.componentRef.setInput('referentielsBruts', { reglesDependances: [] });
    fixture.detectChanges();
    fixture.componentInstance.basculer();
    fixture.detectChanges();

    const popover = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="tooltip"]');
    expect(popover?.textContent).toContain('Aucune règle de dépendances définie');
  });
});
