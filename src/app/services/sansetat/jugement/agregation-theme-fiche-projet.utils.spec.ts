// Test de AgregationThemeFicheProjetUtils (cf. agregation-theme-fiche-projet.utils.ts, US-017), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import type { ResultatThemeFicheProjet } from './agregation-theme-fiche-projet.utils';
import { AgregationThemeFicheProjetUtils } from './agregation-theme-fiche-projet.utils';

describe('AgregationThemeFicheProjetUtils', () => {
  describe('regrouper', () => {
    it('restitue pasDeSonar=true et sonar=undefined quand aucun résultat Sonar n’est présent', () => {
      const resultat = AgregationThemeFicheProjetUtils.regrouper([]);

      expect(resultat.pasDeSonar).toBe(true);
      expect(resultat.sonar).toBeUndefined();
    });

    it('restitue pasDeSonar=false dès qu’un seul des trois constats Sonar consommés est présent', () => {
      const resultats: readonly ResultatThemeFicheProjet[] = [
        { type: 'sonar.couverture', sourceId: 's1', couverture: 80, couvertureNouveauCode: 90 },
      ];

      const resultat = AgregationThemeFicheProjetUtils.regrouper(resultats);

      expect(resultat.pasDeSonar).toBe(false);
      expect(resultat.sonar?.couverture?.couverture).toBe(80);
      expect(resultat.sonar?.notes).toBeUndefined();
      expect(resultat.sonar?.violations).toBeUndefined();
    });

    it('regroupe les trois constats Sonar quand ils sont tous présents', () => {
      const resultats: readonly ResultatThemeFicheProjet[] = [
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
          type: 'sonar.violations',
          sourceId: 's1',
          parSeverite: { bloquant: 0, critique: 1, majeur: 2, mineur: 3, info: 4 },
          nouvellesViolations: 0,
        },
      ];

      const resultat = AgregationThemeFicheProjetUtils.regrouper(resultats);

      expect(resultat.pasDeSonar).toBe(false);
      expect(resultat.sonar?.couverture?.couverture).toBe(80);
      expect(resultat.sonar?.notes?.fiabilite).toBe(1);
      expect(resultat.sonar?.violations?.parSeverite.critique).toBe(1);
    });

    it('distingue dependancesDisponibles=false (aucun constat) de dependancesDisponibles=true avec un tableau vide', () => {
      const sansConstat = AgregationThemeFicheProjetUtils.regrouper([]);
      expect(sansConstat.dependancesDisponibles).toBe(false);
      expect(sansConstat.dependances).toEqual([]);

      const avecConstatVide: readonly ResultatThemeFicheProjet[] = [
        {
          type: 'gitlab.dependances',
          sourceId: 's1',
          refEffective: 'main',
          shaTete: 'abc',
          dependances: [],
        },
      ];
      const resultat = AgregationThemeFicheProjetUtils.regrouper(avecConstatVide);
      expect(resultat.dependancesDisponibles).toBe(true);
      expect(resultat.dependances).toEqual([]);
    });

    it('restitue les dépendances déclarées quand le constat en porte', () => {
      const resultats: readonly ResultatThemeFicheProjet[] = [
        {
          type: 'gitlab.dependances',
          sourceId: 's1',
          refEffective: 'main',
          shaTete: 'abc',
          dependances: [
            {
              reference: 'org.springframework:spring-core',
              version: '5.3.30',
              manifeste: 'pom.xml',
            },
          ],
        },
      ];

      const resultat = AgregationThemeFicheProjetUtils.regrouper(resultats);

      expect(resultat.dependancesDisponibles).toBe(true);
      expect(resultat.dependances).toHaveLength(1);
      expect(resultat.dependances[0].reference).toBe('org.springframework:spring-core');
    });

    it('restitue les membres constatés', () => {
      const resultats: readonly ResultatThemeFicheProjet[] = [
        {
          type: 'gitlab.membres',
          sourceId: 's1',
          refEffective: 'main',
          shaTete: 'abc',
          membres: [
            {
              username: 'jdupont',
              nom: 'Jean Dupont',
              niveauAcces: 30,
              direct: true,
              groupesInvites: [],
            },
          ],
        },
      ];

      const resultat = AgregationThemeFicheProjetUtils.regrouper(resultats);

      expect(resultat.membres).toHaveLength(1);
      expect(resultat.membres[0].username).toBe('jdupont');
    });

    it('restitue les marqueurs IA détectés', () => {
      const resultats: readonly ResultatThemeFicheProjet[] = [
        {
          type: 'gitlab.marqueurs_ia',
          sourceId: 's1',
          refEffective: 'main',
          shaTete: 'abc',
          marqueurs: [{ chemin: '.cursorrules', nature: 'fichier', outil: 'cursor' }],
        },
      ];

      const resultat = AgregationThemeFicheProjetUtils.regrouper(resultats);

      expect(resultat.marqueursIa).toHaveLength(1);
      expect(resultat.marqueursIa[0].outil).toBe('cursor');
    });

    it('fusionne les dépendances de plusieurs sources GitLab sans perdre celles de la seconde (R15-06)', () => {
      const resultats: readonly ResultatThemeFicheProjet[] = [
        {
          type: 'gitlab.dependances',
          sourceId: 'back',
          refEffective: 'main',
          shaTete: 'abc',
          dependances: [
            {
              reference: 'org.springframework:spring-core',
              version: '5.3.30',
              manifeste: 'pom.xml',
            },
          ],
        },
        {
          type: 'gitlab.dependances',
          sourceId: 'front',
          refEffective: 'main',
          shaTete: 'def',
          dependances: [
            { reference: '@angular/core', version: '18.0.0', manifeste: 'package.json' },
          ],
        },
      ];

      const resultat = AgregationThemeFicheProjetUtils.regrouper(resultats);

      expect(resultat.dependances).toHaveLength(2);
      expect(resultat.dependances.map((dependance) => dependance.reference)).toEqual(
        expect.arrayContaining(['org.springframework:spring-core', '@angular/core']),
      );
    });

    it('fusionne en une seule ligne les dépendances de triplet référence/version/manifeste identique entre deux sources (R15-04)', () => {
      const dependance = {
        reference: 'org.projectlombok:lombok',
        version: '1.18.30',
        manifeste: 'pom.xml',
      };
      const resultats: readonly ResultatThemeFicheProjet[] = [
        {
          type: 'gitlab.dependances',
          sourceId: 'back',
          refEffective: 'main',
          shaTete: 'abc',
          dependances: [dependance],
        },
        {
          type: 'gitlab.dependances',
          sourceId: 'front',
          refEffective: 'main',
          shaTete: 'def',
          dependances: [{ ...dependance }],
        },
      ];

      const resultat = AgregationThemeFicheProjetUtils.regrouper(resultats);

      expect(resultat.dependances).toHaveLength(1);
      expect(resultat.dependances[0].version).toBe('1.18.30');
    });

    it('conserve deux lignes quand la même dépendance apparaît en versions différentes (modules ou sources distincts)', () => {
      const resultats: readonly ResultatThemeFicheProjet[] = [
        {
          type: 'gitlab.dependances',
          sourceId: 'back',
          refEffective: 'main',
          shaTete: 'abc',
          dependances: [
            {
              reference: 'com.google.guava:guava',
              version: '32.0.0',
              manifeste: 'module-a/pom.xml',
            },
          ],
        },
        {
          type: 'gitlab.dependances',
          sourceId: 'back',
          refEffective: 'main',
          shaTete: 'abc',
          dependances: [
            {
              reference: 'com.google.guava:guava',
              version: '33.0.0',
              manifeste: 'module-b/pom.xml',
            },
          ],
        },
      ];

      const resultat = AgregationThemeFicheProjetUtils.regrouper(resultats);

      expect(resultat.dependances).toHaveLength(2);
      expect(resultat.dependances.map((dependance) => dependance.version)).toEqual(
        expect.arrayContaining(['32.0.0', '33.0.0']),
      );
    });

    it('fusionne les membres de plusieurs sources GitLab sans perdre ceux de la seconde (R15-06)', () => {
      const resultats: readonly ResultatThemeFicheProjet[] = [
        {
          type: 'gitlab.membres',
          sourceId: 'back',
          refEffective: 'main',
          shaTete: 'abc',
          membres: [
            {
              username: 'jdupont',
              nom: 'Jean Dupont',
              niveauAcces: 30,
              direct: true,
              groupesInvites: [],
            },
          ],
        },
        {
          type: 'gitlab.membres',
          sourceId: 'front',
          refEffective: 'main',
          shaTete: 'def',
          membres: [
            {
              username: 'mmartin',
              nom: 'Marie Martin',
              niveauAcces: 40,
              direct: false,
              groupesInvites: [],
            },
          ],
        },
      ];

      const resultat = AgregationThemeFicheProjetUtils.regrouper(resultats);

      expect(resultat.membres).toHaveLength(2);
      expect(resultat.membres.map((membre) => membre.username)).toEqual(
        expect.arrayContaining(['jdupont', 'mmartin']),
      );
    });

    it('fusionne en une seule ligne un même membre présent sur deux sources, avec le niveau d’accès le plus élevé, direct=true dès une source directe et l’union des groupes invités (US-017, R15-04)', () => {
      const resultats: readonly ResultatThemeFicheProjet[] = [
        {
          type: 'gitlab.membres',
          sourceId: 'back',
          refEffective: 'main',
          shaTete: 'abc',
          membres: [
            {
              username: 'guillaume.talbot',
              nom: 'Guillaume Talbot',
              niveauAcces: 30,
              direct: false,
              groupesInvites: ['org/transverse'],
            },
          ],
        },
        {
          type: 'gitlab.membres',
          sourceId: 'front',
          refEffective: 'main',
          shaTete: 'def',
          membres: [
            {
              username: 'guillaume.talbot',
              nom: 'Guillaume Talbot',
              niveauAcces: 40,
              direct: true,
              groupesInvites: ['org/paiements'],
            },
          ],
        },
      ];

      const resultat = AgregationThemeFicheProjetUtils.regrouper(resultats);

      expect(resultat.membres).toHaveLength(1);
      expect(resultat.membres[0].niveauAcces).toBe(40);
      expect(resultat.membres[0].direct).toBe(true);
      expect(resultat.membres[0].groupesInvites).toEqual(['org/transverse', 'org/paiements']);
    });

    it('fusionne les marqueurs IA de plusieurs sources GitLab, sans doublon de couple chemin/outil (R15-06/R15-04)', () => {
      const resultats: readonly ResultatThemeFicheProjet[] = [
        {
          type: 'gitlab.marqueurs_ia',
          sourceId: 'back',
          refEffective: 'main',
          shaTete: 'abc',
          marqueurs: [{ chemin: '.cursorrules', nature: 'fichier', outil: 'cursor' }],
        },
        {
          type: 'gitlab.marqueurs_ia',
          sourceId: 'front',
          refEffective: 'main',
          shaTete: 'def',
          marqueurs: [
            { chemin: '.cursorrules', nature: 'fichier', outil: 'cursor' },
            { chemin: '.github/copilot-instructions.md', nature: 'fichier', outil: 'copilot' },
          ],
        },
      ];

      const resultat = AgregationThemeFicheProjetUtils.regrouper(resultats);

      expect(resultat.marqueursIa).toHaveLength(2);
      expect(resultat.marqueursIa.map((marqueur) => marqueur.chemin)).toEqual(
        expect.arrayContaining(['.cursorrules', '.github/copilot-instructions.md']),
      );
    });

    it('ignore les variantes non consommées (gitlab.merge_requests, croise.*) sans lever d’erreur', () => {
      const resultats: readonly ResultatThemeFicheProjet[] = [
        { type: 'gitlab.merge_requests' },
        { type: 'gitlab.vitalite' },
        { type: 'gitlab.taille_depot' },
        { type: 'gitlab.branches' },
        { type: 'sonar.dette' },
        { type: 'sonar.ncloc' },
        { type: 'croise.fraicheur_sonar' },
        { type: 'croise.activite_sans_qualite' },
        { type: 'croise.ia_nouveau_code' },
      ];

      const resultat = AgregationThemeFicheProjetUtils.regrouper(resultats);

      expect(resultat.pasDeSonar).toBe(true);
      expect(resultat.dependancesDisponibles).toBe(false);
      expect(resultat.membres).toEqual([]);
      expect(resultat.marqueursIa).toEqual([]);
    });
  });
});
