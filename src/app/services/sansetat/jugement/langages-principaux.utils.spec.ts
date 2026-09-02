// Test de LangagesPrincipauxUtils (cf. langages-principaux.utils.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { LangagesPrincipauxUtils } from './langages-principaux.utils';

describe('LangagesPrincipauxUtils.selectionner (RG-057)', () => {
  it('rend une liste vide pour une ventilation vide', () => {
    expect(LangagesPrincipauxUtils.selectionner({})).toEqual([]);
  });

  it('rend une liste vide quand toutes les valeurs sont nulles', () => {
    expect(LangagesPrincipauxUtils.selectionner({ java: 0, ts: 0 })).toEqual([]);
  });

  it('rend une liste vide quand toutes les valeurs sont négatives (entrées ignorées)', () => {
    expect(LangagesPrincipauxUtils.selectionner({ java: -10, ts: -5 })).toEqual([]);
  });

  it('rend une entrée à 100 % pour un langage unique', () => {
    expect(LangagesPrincipauxUtils.selectionner({ java: 4200 })).toEqual([
      { cleSonar: 'java', pourcentage: 100 },
    ]);
  });

  it('rend deux entrées ordonnées par lignes de code décroissantes (70 / 30)', () => {
    expect(LangagesPrincipauxUtils.selectionner({ ts: 3000, java: 7000 })).toEqual([
      { cleSonar: 'java', pourcentage: 70 },
      { cleSonar: 'ts', pourcentage: 30 },
    ]);
  });

  it('omet le second langage sous 10 % du total (9 %)', () => {
    expect(LangagesPrincipauxUtils.selectionner({ java: 9100, xml: 900 })).toEqual([
      { cleSonar: 'java', pourcentage: 91 },
    ]);
  });

  it('conserve le second langage à exactement 10 % du total (borne incluse)', () => {
    expect(LangagesPrincipauxUtils.selectionner({ java: 9000, xml: 1000 })).toEqual([
      { cleSonar: 'java', pourcentage: 90 },
      { cleSonar: 'xml', pourcentage: 10 },
    ]);
  });

  it('plafonne à deux langages sur trois présents (60 / 30 / 10)', () => {
    expect(LangagesPrincipauxUtils.selectionner({ java: 6000, ts: 3000, xml: 1000 })).toEqual([
      { cleSonar: 'java', pourcentage: 60 },
      { cleSonar: 'ts', pourcentage: 30 },
    ]);
  });

  it.each([
    { ts: 5000, java: 5000 },
    { java: 5000, ts: 5000 },
  ])(
    'départage deux langages à nombre de lignes égal par ordre alphabétique de la clé Sonar, quel que soit l’ordre d’entrée (%j)',
    (parLangage) => {
      expect(LangagesPrincipauxUtils.selectionner(parLangage)).toEqual([
        { cleSonar: 'java', pourcentage: 50 },
        { cleSonar: 'ts', pourcentage: 50 },
      ]);
    },
  );

  it('ignore une entrée nulle sans fausser le total ni les pourcentages', () => {
    expect(LangagesPrincipauxUtils.selectionner({ java: 900, xml: 100, js: 0 })).toEqual([
      { cleSonar: 'java', pourcentage: 90 },
      { cleSonar: 'xml', pourcentage: 10 },
    ]);
  });

  it('ne mute pas la ventilation reçue', () => {
    const parLangage: Readonly<Record<string, number>> = Object.freeze({ java: 7000, ts: 3000 });
    LangagesPrincipauxUtils.selectionner(parLangage);
    expect(parLangage).toEqual({ java: 7000, ts: 3000 });
  });
});

describe('LangagesPrincipauxUtils — constantes de présentation (RG-057)', () => {
  it('expose le seuil du second langage et le plafond de langages', () => {
    expect(LangagesPrincipauxUtils.SEUIL_SECOND_LANGAGE).toBe(0.1);
    expect(LangagesPrincipauxUtils.NOMBRE_MAX_LANGAGES).toBe(2);
  });
});
