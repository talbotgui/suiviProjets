// Test de DifferentielResultatUtils (cf. differentiel-resultat.utils.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { DifferentielResultatUtils } from './differentiel-resultat.utils';

const VARIATION_RELATIVE = 0.1;

describe('DifferentielResultatUtils', () => {
  describe('comparerAudits - cas transverses', () => {
    it("ne doit rien détecter si l'ancien audit est absent (premier audit du projet)", () => {
      const resultat = DifferentielResultatUtils.comparerAudits(
        undefined,
        [{ type: 'sonar.ncloc', sourceId: 's1', ncloc: 10_000 }],
        VARIATION_RELATIVE,
      );

      expect(resultat).toEqual([]);
    });

    it('ne doit rien détecter pour un tag hors périmètre (ex. gitlab.vitalite, sans mesure numérique)', () => {
      const resultat = DifferentielResultatUtils.comparerAudits(
        [{ type: 'gitlab.vitalite', sourceId: 's1', dernierCommitLe: '2026-01-01' }],
        [{ type: 'gitlab.vitalite', sourceId: 's1', dernierCommitLe: '2026-07-01' }],
        VARIATION_RELATIVE,
      );

      expect(resultat).toEqual([]);
    });

    it('ne doit rien détecter si le mouvement reste en deçà du seuil de matérialité', () => {
      const resultat = DifferentielResultatUtils.comparerAudits(
        [{ type: 'sonar.ncloc', sourceId: 's1', ncloc: 10_000 }],
        [{ type: 'sonar.ncloc', sourceId: 's1', ncloc: 10_500 }],
        VARIATION_RELATIVE,
      );

      expect(resultat).toEqual([]);
    });
  });

  describe('comparerAudits - sonar.ncloc', () => {
    it('doit détecter une hausse au-delà du seuil de matérialité', () => {
      const resultat = DifferentielResultatUtils.comparerAudits(
        [{ type: 'sonar.ncloc', sourceId: 's1', ncloc: 10_000 }],
        [{ type: 'sonar.ncloc', sourceId: 's1', ncloc: 12_000 }],
        VARIATION_RELATIVE,
      );

      expect(resultat).toEqual([
        {
          indicateur: 'sonar.ncloc',
          libelle: 'Volume de code (ncloc)',
          ancienneValeur: 10_000,
          nouvelleValeur: 12_000,
        },
      ]);
    });
  });

  describe('comparerAudits - gitlab.contributeurs (mesure dérivée d’un tableau)', () => {
    it('doit comparer le nombre de contributeurs plutôt que le contenu du tableau', () => {
      const resultat = DifferentielResultatUtils.comparerAudits(
        [
          {
            type: 'gitlab.contributeurs',
            sourceId: 's1',
            contributeurs: [{ email: 'a@x.fr', nom: 'A', nombreCommits: 1 }],
          },
        ],
        [
          {
            type: 'gitlab.contributeurs',
            sourceId: 's1',
            contributeurs: [
              { email: 'a@x.fr', nom: 'A', nombreCommits: 1 },
              { email: 'b@x.fr', nom: 'B', nombreCommits: 1 },
              { email: 'c@x.fr', nom: 'C', nombreCommits: 1 },
            ],
          },
        ],
        VARIATION_RELATIVE,
      );

      expect(resultat).toEqual([
        {
          indicateur: 'gitlab.contributeurs',
          libelle: 'Nombre de contributeurs',
          ancienneValeur: 1,
          nouvelleValeur: 3,
        },
      ]);
    });
  });

  describe('comparerAudits - sonar.violations (mesures imbriquées sous parSeverite)', () => {
    it('doit comparer les mesures imbriquées et le compteur de premier niveau', () => {
      const resultat = DifferentielResultatUtils.comparerAudits(
        [
          {
            type: 'sonar.violations',
            sourceId: 's1',
            nouvellesViolations: 2,
            parSeverite: { bloquant: 1, critique: 1, majeur: 2, mineur: 3, info: 4 },
          },
        ],
        [
          {
            type: 'sonar.violations',
            sourceId: 's1',
            nouvellesViolations: 20,
            parSeverite: { bloquant: 5, critique: 1, majeur: 2, mineur: 3, info: 4 },
          },
        ],
        VARIATION_RELATIVE,
      );

      expect(resultat).toEqual(
        expect.arrayContaining([
          {
            indicateur: 'sonar.violations',
            libelle: 'Nouvelles violations',
            ancienneValeur: 2,
            nouvelleValeur: 20,
          },
          {
            indicateur: 'sonar.violations',
            libelle: 'Violations bloquantes',
            ancienneValeur: 1,
            nouvelleValeur: 5,
          },
        ]),
      );
    });
  });

  describe('comparerAudits - résultat absent d’un des deux côtés', () => {
    it("ne doit rien détecter si l'indicateur n'a pas été obtenu lors du nouvel audit", () => {
      const resultat = DifferentielResultatUtils.comparerAudits(
        [{ type: 'sonar.ncloc', sourceId: 's1', ncloc: 10_000 }],
        [],
        VARIATION_RELATIVE,
      );

      expect(resultat).toEqual([]);
    });

    it("ne doit rien détecter si l'indicateur n'a pas été obtenu lors de l'ancien audit (premier audit exploitable pour ce seul indicateur)", () => {
      const resultat = DifferentielResultatUtils.comparerAudits(
        [],
        [{ type: 'sonar.ncloc', sourceId: 's1', ncloc: 10_000 }],
        VARIATION_RELATIVE,
      );

      expect(resultat).toEqual([]);
    });
  });

  describe('comparerAudits - couverture des autres tags du catalogue', () => {
    it('doit couvrir gitlab.taille_depot, gitlab.merge_requests, gitlab.membres, sonar.dette, sonar.couverture, sonar.notes et croise.activite_sans_qualite', () => {
      const ancien = [
        { type: 'gitlab.taille_depot', sourceId: 's1', tailleOctets: 1_000_000 },
        { type: 'gitlab.merge_requests', sourceId: 's1', mrOuvertes: [{ iid: 1 }] },
        { type: 'gitlab.membres', sourceId: 's1', membres: [{ username: 'a' }] },
        { type: 'sonar.dette', sourceId: 's1', detteMinutes: 100, ratioDette: 1 },
        { type: 'sonar.couverture', sourceId: 's1', couverture: 80, couvertureNouveauCode: 90 },
        {
          type: 'sonar.notes',
          sourceId: 's1',
          fiabilite: 1,
          securite: 1,
          maintenabilite: 1,
          revueSecurite: 1,
        },
        {
          type: 'croise.activite_sans_qualite',
          nombreCommits: 5,
          nouvellesViolations: 1,
          evaluable: true,
        },
      ];
      const nouveau = [
        { type: 'gitlab.taille_depot', sourceId: 's1', tailleOctets: 2_000_000 },
        {
          type: 'gitlab.merge_requests',
          sourceId: 's1',
          mrOuvertes: [{ iid: 1 }, { iid: 2 }, { iid: 3 }],
        },
        {
          type: 'gitlab.membres',
          sourceId: 's1',
          membres: [{ username: 'a' }, { username: 'b' }, { username: 'c' }],
        },
        { type: 'sonar.dette', sourceId: 's1', detteMinutes: 500, ratioDette: 5 },
        { type: 'sonar.couverture', sourceId: 's1', couverture: 10, couvertureNouveauCode: 20 },
        {
          type: 'sonar.notes',
          sourceId: 's1',
          fiabilite: 5,
          securite: 5,
          maintenabilite: 5,
          revueSecurite: 5,
        },
        {
          type: 'croise.activite_sans_qualite',
          nombreCommits: 50,
          nouvellesViolations: 10,
          evaluable: true,
        },
      ];

      const resultat = DifferentielResultatUtils.comparerAudits(
        ancien,
        nouveau,
        VARIATION_RELATIVE,
      );
      const libelles = resultat.map((ecart) => ecart.libelle);

      expect(libelles).toEqual(
        expect.arrayContaining([
          'Taille du dépôt (octets)',
          'Demandes de fusion ouvertes',
          'Nombre de membres',
          'Dette technique (minutes)',
          'Ratio de dette',
          'Couverture de tests',
          'Couverture du nouveau code',
          'Note de fiabilité',
          'Note de sécurité',
          'Note de maintenabilité',
          'Note de revue de sécurité',
          'Commits sans qualité (activité)',
          'Nouvelles violations (activité sans qualité)',
        ]),
      );
    });

    it('ne doit rien détecter pour gitlab.contributeurs, gitlab.merge_requests ou gitlab.membres si le champ attendu n’est pas un tableau', () => {
      const resultat = DifferentielResultatUtils.comparerAudits(
        [
          { type: 'gitlab.contributeurs', sourceId: 's1', contributeurs: 'pas-un-tableau' },
          { type: 'gitlab.merge_requests', sourceId: 's1', mrOuvertes: null },
          { type: 'gitlab.membres', sourceId: 's1' },
        ],
        [
          { type: 'gitlab.contributeurs', sourceId: 's1', contributeurs: [{ email: 'a' }] },
          { type: 'gitlab.merge_requests', sourceId: 's1', mrOuvertes: [{ iid: 1 }] },
          { type: 'gitlab.membres', sourceId: 's1', membres: [{ username: 'a' }] },
        ],
        VARIATION_RELATIVE,
      );

      expect(resultat).toEqual([]);
    });

    it('ne doit prendre en compte que « nouvellesViolations » si sonar.violations ne porte pas de parSeverite indexable', () => {
      const resultat = DifferentielResultatUtils.comparerAudits(
        [{ type: 'sonar.violations', sourceId: 's1', nouvellesViolations: 2, parSeverite: null }],
        [{ type: 'sonar.violations', sourceId: 's1', nouvellesViolations: 20 }],
        VARIATION_RELATIVE,
      );

      expect(resultat).toEqual([
        {
          indicateur: 'sonar.violations',
          libelle: 'Nouvelles violations',
          ancienneValeur: 2,
          nouvelleValeur: 20,
        },
      ]);
    });
  });
});
