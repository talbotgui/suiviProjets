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
          membres: [{ username: 'jdupont', nom: 'Jean Dupont', niveauAcces: 30, herite: false }],
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
