// Test du point unique de lecture défensive des seuils/référentiels (cf. parametres-jugement.utils.ts), généré
// avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { ParametresJugementUtils } from './parametres-jugement.utils';

describe('ParametresJugementUtils', () => {
  describe('lireSeuilsVitalite', () => {
    it('lit les seuils de vitalité quand la branche est valide', () => {
      const resultat = ParametresJugementUtils.lireSeuilsVitalite({
        vitalite: { mourantJours: 180, mortJours: 365 },
      });
      expect(resultat).toEqual({ type: 'valeur', valeur: { mourantJours: 180, mortJours: 365 } });
    });

    it('restitue absent si la racine des seuils n’est pas un objet', () => {
      expect(ParametresJugementUtils.lireSeuilsVitalite(null)).toEqual({ type: 'absent' });
      expect(ParametresJugementUtils.lireSeuilsVitalite('texte')).toEqual({ type: 'absent' });
      expect(ParametresJugementUtils.lireSeuilsVitalite([1, 2])).toEqual({ type: 'absent' });
    });

    it('restitue absent si la branche vitalite est manquante', () => {
      expect(ParametresJugementUtils.lireSeuilsVitalite({})).toEqual({ type: 'absent' });
    });

    it('restitue absent si un champ numérique est manquant ou invalide', () => {
      expect(
        ParametresJugementUtils.lireSeuilsVitalite({ vitalite: { mourantJours: 180 } }),
      ).toEqual({
        type: 'absent',
      });
      expect(
        ParametresJugementUtils.lireSeuilsVitalite({
          vitalite: { mourantJours: 'x', mortJours: 365 },
        }),
      ).toEqual({ type: 'absent' });
      expect(
        ParametresJugementUtils.lireSeuilsVitalite({
          vitalite: { mourantJours: NaN, mortJours: 365 },
        }),
      ).toEqual({ type: 'absent' });
    });
  });

  describe('lireSeuilsTailleDepot', () => {
    it('lit les bornes de taille quand la branche est valide', () => {
      const resultat = ParametresJugementUtils.lireSeuilsTailleDepot({
        tailleDepot: { borneS: 20000000, borneL: 100000000, borneXL: 500000000 },
      });
      expect(resultat).toEqual({
        type: 'valeur',
        valeur: { borneS: 20000000, borneL: 100000000, borneXL: 500000000 },
      });
    });

    it('restitue absent si une borne est manquante', () => {
      expect(
        ParametresJugementUtils.lireSeuilsTailleDepot({ tailleDepot: { borneS: 1, borneL: 2 } }),
      ).toEqual({ type: 'absent' });
    });

    it('restitue absent si la racine des seuils n’est pas un objet', () => {
      expect(ParametresJugementUtils.lireSeuilsTailleDepot(undefined)).toEqual({ type: 'absent' });
    });
  });

  describe('lireSeuilsCouverture', () => {
    it('lit les seuils de couverture quand la branche est valide', () => {
      expect(
        ParametresJugementUtils.lireSeuilsCouverture({
          couverture: { seuilRouge: 40, seuilOrange: 60 },
        }),
      ).toEqual({ type: 'valeur', valeur: { seuilRouge: 40, seuilOrange: 60 } });
    });

    it('restitue absent si la branche est malformée', () => {
      expect(ParametresJugementUtils.lireSeuilsCouverture({ couverture: null })).toEqual({
        type: 'absent',
      });
    });
  });

  describe('lireSeuilsFraicheurSonar', () => {
    it('lit la tolérance de fraîcheur Sonar quand la branche est valide', () => {
      expect(
        ParametresJugementUtils.lireSeuilsFraicheurSonar({ fraicheurSonar: { toleranceJours: 7 } }),
      ).toEqual({
        type: 'valeur',
        valeur: { toleranceJours: 7 },
      });
    });

    it('restitue absent si la branche est absente', () => {
      expect(ParametresJugementUtils.lireSeuilsFraicheurSonar({})).toEqual({ type: 'absent' });
    });
  });

  describe('lireSeuilsActiviteSansQualite', () => {
    it('lit les seuils d’activité sans qualité quand la branche est valide', () => {
      expect(
        ParametresJugementUtils.lireSeuilsActiviteSansQualite({
          activiteSansQualite: { minCommits: 20, minNouvellesViolations: 10 },
        }),
      ).toEqual({ type: 'valeur', valeur: { minCommits: 20, minNouvellesViolations: 10 } });
    });

    it('restitue absent si un champ est invalide', () => {
      expect(
        ParametresJugementUtils.lireSeuilsActiviteSansQualite({
          activiteSansQualite: { minCommits: 20, minNouvellesViolations: 'dix' },
        }),
      ).toEqual({ type: 'absent' });
    });
  });

  describe('lireSeuilsFraicheurAudit', () => {
    it('lit le seuil de fraîcheur d’audit quand la branche est valide', () => {
      expect(
        ParametresJugementUtils.lireSeuilsFraicheurAudit({ fraicheurAudit: { ancienJours: 30 } }),
      ).toEqual({
        type: 'valeur',
        valeur: { ancienJours: 30 },
      });
    });

    it('restitue absent si la racine n’est pas un objet', () => {
      expect(ParametresJugementUtils.lireSeuilsFraicheurAudit(undefined)).toEqual({
        type: 'absent',
      });
    });
  });

  describe('lireAncienJoursAvecRepli', () => {
    it('restitue la valeur paramétrée quand elle est valide et strictement positive', () => {
      expect(
        ParametresJugementUtils.lireAncienJoursAvecRepli({ fraicheurAudit: { ancienJours: 45 } }),
      ).toBe(45);
    });

    it('restitue la valeur de repli quand la branche est absente (aucun fichier chargé)', () => {
      expect(ParametresJugementUtils.lireAncienJoursAvecRepli(undefined)).toBe(
        ParametresJugementUtils.ANCIEN_JOURS_PAR_DEFAUT,
      );
    });

    it('restitue la valeur de repli quand la valeur paramétrée est nulle ou négative', () => {
      expect(
        ParametresJugementUtils.lireAncienJoursAvecRepli({ fraicheurAudit: { ancienJours: 0 } }),
      ).toBe(ParametresJugementUtils.ANCIEN_JOURS_PAR_DEFAUT);
      expect(
        ParametresJugementUtils.lireAncienJoursAvecRepli({ fraicheurAudit: { ancienJours: -5 } }),
      ).toBe(ParametresJugementUtils.ANCIEN_JOURS_PAR_DEFAUT);
    });

    it('restitue la valeur de repli quand la branche est malformée', () => {
      expect(
        ParametresJugementUtils.lireAncienJoursAvecRepli({ fraicheurAudit: { ancienJours: 'x' } }),
      ).toBe(ParametresJugementUtils.ANCIEN_JOURS_PAR_DEFAUT);
    });
  });

  describe('lireSeuilsMrOuvertes', () => {
    it('lit les seuils de MR ouvertes quand la branche est valide', () => {
      expect(
        ParametresJugementUtils.lireSeuilsMrOuvertes({
          mrOuvertes: { ageOrangeJours: 30, ageRougeJours: 90, pourcentageConflitRouge: 50 },
        }),
      ).toEqual({
        type: 'valeur',
        valeur: { ageOrangeJours: 30, ageRougeJours: 90, pourcentageConflitRouge: 50 },
      });
    });

    it('restitue absent si un champ est manquant', () => {
      expect(
        ParametresJugementUtils.lireSeuilsMrOuvertes({
          mrOuvertes: { ageOrangeJours: 30, ageRougeJours: 90 },
        }),
      ).toEqual({ type: 'absent' });
    });
  });

  describe('lireSeuilsCouleursViolations', () => {
    it('lit les seuils bloquant/critique quand les deux branches sont valides', () => {
      const resultat = ParametresJugementUtils.lireSeuilsCouleursViolations({
        couleursViolations: {
          bloquant: { seuilOrange: 1, seuilRouge: 3 },
          critique: { seuilOrange: 10, seuilRouge: 25 },
        },
      });
      expect(resultat).toEqual({
        type: 'valeur',
        valeur: {
          bloquant: { seuilOrange: 1, seuilRouge: 3 },
          critique: { seuilOrange: 10, seuilRouge: 25 },
        },
      });
    });

    it('restitue absent si la sévérité bloquant est manquante', () => {
      expect(
        ParametresJugementUtils.lireSeuilsCouleursViolations({
          couleursViolations: { critique: { seuilOrange: 10, seuilRouge: 25 } },
        }),
      ).toEqual({ type: 'absent' });
    });

    it('restitue absent si la sévérité critique est manquante', () => {
      expect(
        ParametresJugementUtils.lireSeuilsCouleursViolations({
          couleursViolations: { bloquant: { seuilOrange: 1, seuilRouge: 3 } },
        }),
      ).toEqual({ type: 'absent' });
    });

    it('restitue absent si la branche couleursViolations est absente', () => {
      expect(ParametresJugementUtils.lireSeuilsCouleursViolations({})).toEqual({ type: 'absent' });
    });
  });

  describe('lireSeuilsMaterialiteBrouillon', () => {
    it('lit le seuil de matérialité quand la branche est valide', () => {
      expect(
        ParametresJugementUtils.lireSeuilsMaterialiteBrouillon({
          materialiteBrouillon: { variationRelative: 0.1 },
        }),
      ).toEqual({ type: 'valeur', valeur: { variationRelative: 0.1 } });
    });

    it('restitue absent si la branche est manquante', () => {
      expect(ParametresJugementUtils.lireSeuilsMaterialiteBrouillon({})).toEqual({
        type: 'absent',
      });
    });
  });

  describe('lireMotifNommageBranches', () => {
    it('lit le motif quand il est une chaîne non vide', () => {
      expect(
        ParametresJugementUtils.lireMotifNommageBranches({
          motifNommageBranches: '^(main|develop)$',
        }),
      ).toEqual({ type: 'valeur', valeur: '^(main|develop)$' });
    });

    it('restitue absent si le motif est une chaîne vide', () => {
      expect(
        ParametresJugementUtils.lireMotifNommageBranches({ motifNommageBranches: '' }),
      ).toEqual({
        type: 'absent',
      });
    });

    it('restitue absent si le motif est manquant', () => {
      expect(ParametresJugementUtils.lireMotifNommageBranches({})).toEqual({ type: 'absent' });
    });
  });

  describe('lireReglesDependances', () => {
    it('lit les règles de dépendances valides', () => {
      const resultat = ParametresJugementUtils.lireReglesDependances({
        reglesDependances: [
          { motif: 'log4j:log4j', versions: [{ motifVersion: '*', statut: 'obsolete' }] },
        ],
      });
      expect(resultat).toEqual({
        type: 'valeur',
        valeur: [{ motif: 'log4j:log4j', versions: [{ motifVersion: '*', statut: 'obsolete' }] }],
      });
    });

    it('restitue une valeur avec un tableau vide si le référentiel est vide (cas limite : référentiel vide)', () => {
      expect(ParametresJugementUtils.lireReglesDependances({ reglesDependances: [] })).toEqual({
        type: 'valeur',
        valeur: [],
      });
    });

    it('restitue absent si reglesDependances n’est pas un tableau', () => {
      expect(ParametresJugementUtils.lireReglesDependances({ reglesDependances: 'texte' })).toEqual(
        {
          type: 'absent',
        },
      );
      expect(ParametresJugementUtils.lireReglesDependances({})).toEqual({ type: 'absent' });
      expect(ParametresJugementUtils.lireReglesDependances(null)).toEqual({ type: 'absent' });
    });

    it('écarte silencieusement les règles malformées tout en conservant les règles valides', () => {
      const resultat = ParametresJugementUtils.lireReglesDependances({
        reglesDependances: [
          { motif: 'log4j:log4j', versions: [{ motifVersion: '*', statut: 'obsolete' }] },
          { motif: 42, versions: [] },
          'texte',
          { motif: 'moment', versions: 'pas-un-tableau' },
        ],
      });
      expect(resultat).toEqual({
        type: 'valeur',
        valeur: [{ motif: 'log4j:log4j', versions: [{ motifVersion: '*', statut: 'obsolete' }] }],
      });
    });

    it('écarte silencieusement les entrées de version malformées au sein d’une règle valide', () => {
      const resultat = ParametresJugementUtils.lireReglesDependances({
        reglesDependances: [
          {
            motif: 'org.springframework:*',
            versions: [
              { motifVersion: '4.*', statut: 'obsolete' },
              { motifVersion: 123, statut: 'maintenu' },
              'texte',
            ],
          },
        ],
      });
      expect(resultat).toEqual({
        type: 'valeur',
        valeur: [
          {
            motif: 'org.springframework:*',
            versions: [{ motifVersion: '4.*', statut: 'obsolete' }],
          },
        ],
      });
    });

    it('conserve l’attribut categorie valide d’une règle (US-049)', () => {
      const resultat = ParametresJugementUtils.lireReglesDependances({
        reglesDependances: [{ motif: 'moment', versions: [], categorie: 'c1' }],
      });
      expect(resultat).toEqual({
        type: 'valeur',
        valeur: [{ motif: 'moment', versions: [], categorie: 'c1' }],
      });
    });

    it('ignore un attribut categorie malformé sans disqualifier la règle (US-049)', () => {
      const resultat = ParametresJugementUtils.lireReglesDependances({
        reglesDependances: [
          { motif: 'moment', versions: [], categorie: '' },
          { motif: 'lodash', versions: [], categorie: 42 },
        ],
      });
      expect(resultat).toEqual({
        type: 'valeur',
        valeur: [
          { motif: 'moment', versions: [] },
          { motif: 'lodash', versions: [] },
        ],
      });
    });
  });

  describe('lireCategoriesDependances', () => {
    it('lit les catégories de dépendance valides (US-048)', () => {
      const resultat = ParametresJugementUtils.lireCategoriesDependances({
        categoriesDependances: [{ id: 'c1', libelle: 'exec', sigle: 'EXE' }],
      });
      expect(resultat).toEqual({
        type: 'valeur',
        valeur: [{ id: 'c1', libelle: 'exec', sigle: 'EXE' }],
      });
    });

    it('replie un sigle absent ou non-chaîne sur les 3 premières lettres du libellé et tronque un sigle trop long', () => {
      const resultat = ParametresJugementUtils.lireCategoriesDependances({
        categoriesDependances: [
          { id: 'c1', libelle: 'exec' },
          { id: 'c2', libelle: 'os', sigle: 7 },
          { id: 'c3', libelle: 'fmkBack', sigle: 'FRAMEWORK' },
        ],
      });
      expect(resultat).toEqual({
        type: 'valeur',
        valeur: [
          { id: 'c1', libelle: 'exec', sigle: 'EXE' },
          { id: 'c2', libelle: 'os', sigle: 'OS' },
          { id: 'c3', libelle: 'fmkBack', sigle: 'FRA' },
        ],
      });
    });

    it('écarte silencieusement une entrée sans id ou sans libellé, restitue un tableau vide si le référentiel est vide', () => {
      expect(
        ParametresJugementUtils.lireCategoriesDependances({
          categoriesDependances: [{ id: 'c1' }, { libelle: 'exec' }, 'texte'],
        }),
      ).toEqual({ type: 'valeur', valeur: [] });
      expect(
        ParametresJugementUtils.lireCategoriesDependances({ categoriesDependances: [] }),
      ).toEqual({ type: 'valeur', valeur: [] });
    });

    it('restitue absent si categoriesDependances n’est pas un tableau', () => {
      expect(
        ParametresJugementUtils.lireCategoriesDependances({ categoriesDependances: 'texte' }),
      ).toEqual({ type: 'absent' });
      expect(ParametresJugementUtils.lireCategoriesDependances({})).toEqual({ type: 'absent' });
      expect(ParametresJugementUtils.lireCategoriesDependances(null)).toEqual({ type: 'absent' });
    });
  });

  describe('lireReglesMarqueursIA', () => {
    it('lit une règle de marqueur IA valide', () => {
      const resultat = ParametresJugementUtils.lireReglesMarqueursIA({
        reglesMarqueursIA: [
          {
            motif: '.cursorrules',
            typeCorrespondance: 'exact',
            portee: 'racine',
            nature: 'fichier',
            outil: 'cursor',
          },
        ],
      });
      expect(resultat).toEqual({
        type: 'valeur',
        valeur: [
          {
            motif: '.cursorrules',
            typeCorrespondance: 'exact',
            portee: 'racine',
            nature: 'fichier',
            outil: 'cursor',
          },
        ],
      });
    });

    it('restitue une valeur avec un tableau vide si le référentiel est vide (cas limite : référentiel vide)', () => {
      expect(ParametresJugementUtils.lireReglesMarqueursIA({ reglesMarqueursIA: [] })).toEqual({
        type: 'valeur',
        valeur: [],
      });
    });

    it('restitue absent si reglesMarqueursIA n’est pas un tableau', () => {
      expect(ParametresJugementUtils.lireReglesMarqueursIA({ reglesMarqueursIA: 'texte' })).toEqual(
        { type: 'absent' },
      );
      expect(ParametresJugementUtils.lireReglesMarqueursIA({})).toEqual({ type: 'absent' });
      expect(ParametresJugementUtils.lireReglesMarqueursIA(null)).toEqual({ type: 'absent' });
    });

    it('écarte silencieusement les règles dont un champ énuméré (typeCorrespondance/portee/nature) est invalide', () => {
      const regleValide = {
        motif: 'CLAUDE.md',
        typeCorrespondance: 'motif',
        portee: 'partout',
        nature: 'fichier',
        outil: 'claude',
      };
      const resultat = ParametresJugementUtils.lireReglesMarqueursIA({
        reglesMarqueursIA: [
          regleValide,
          { ...regleValide, typeCorrespondance: 'approximatif' },
          { ...regleValide, portee: 'ailleurs' },
          { ...regleValide, nature: 'symlink' },
          { ...regleValide, motif: '' },
          { ...regleValide, outil: 42 },
          'texte',
        ],
      });
      expect(resultat).toEqual({ type: 'valeur', valeur: [regleValide] });
    });
  });

  describe('correspondMotifGlob', () => {
    it('correspond à une valeur strictement égale en l’absence de wildcard', () => {
      expect(ParametresJugementUtils.correspondMotifGlob('log4j:log4j', 'log4j:log4j')).toBe(true);
      expect(ParametresJugementUtils.correspondMotifGlob('log4j:log4j', 'log4j:log4j2')).toBe(
        false,
      );
    });

    it('interprète * comme un joker de sous-chaîne quelconque, y compris vide', () => {
      expect(
        ParametresJugementUtils.correspondMotifGlob(
          'org.springframework:*',
          'org.springframework:spring-core',
        ),
      ).toBe(true);
      expect(
        ParametresJugementUtils.correspondMotifGlob(
          'org.springframework:*',
          'org.springframework:',
        ),
      ).toBe(true);
      expect(
        ParametresJugementUtils.correspondMotifGlob(
          '*@entreprise.fr',
          'marie.durand@entreprise.fr',
        ),
      ).toBe(true);
      expect(
        ParametresJugementUtils.correspondMotifGlob('*@entreprise.fr', 'marie.durand@autre.fr'),
      ).toBe(false);
    });

    it('échappe les caractères spéciaux d’expression régulière hors wildcard', () => {
      expect(
        ParametresJugementUtils.correspondMotifGlob(
          'org.springframework:*',
          'orgXspringframework:spring-core',
        ),
      ).toBe(false);
    });

    it('ne correspond qu’à la chaîne vide pour un motif vide', () => {
      expect(ParametresJugementUtils.correspondMotifGlob('', '')).toBe(true);
      expect(ParametresJugementUtils.correspondMotifGlob('', 'x')).toBe(false);
    });
  });

  describe('cas limites complémentaires : racine des seuils/référentiels non conforme', () => {
    it('lireSeuilsCouverture restitue absent si la racine n’est pas un objet', () => {
      expect(ParametresJugementUtils.lireSeuilsCouverture('texte')).toEqual({ type: 'absent' });
    });

    it('lireSeuilsFraicheurSonar restitue absent si la racine n’est pas un objet', () => {
      expect(ParametresJugementUtils.lireSeuilsFraicheurSonar([])).toEqual({ type: 'absent' });
    });

    it('lireSeuilsActiviteSansQualite restitue absent si la racine n’est pas un objet', () => {
      expect(ParametresJugementUtils.lireSeuilsActiviteSansQualite(3)).toEqual({ type: 'absent' });
    });

    it('lireSeuilsMrOuvertes restitue absent si la racine n’est pas un objet', () => {
      expect(ParametresJugementUtils.lireSeuilsMrOuvertes(true)).toEqual({ type: 'absent' });
    });

    it('lireSeuilsMaterialiteBrouillon restitue absent si la racine n’est pas un objet', () => {
      expect(ParametresJugementUtils.lireSeuilsMaterialiteBrouillon(null)).toEqual({
        type: 'absent',
      });
    });

    it('lireSeuilsCouleursViolations restitue absent si la racine n’est pas un objet', () => {
      expect(ParametresJugementUtils.lireSeuilsCouleursViolations('texte')).toEqual({
        type: 'absent',
      });
    });

    it('lireSeuilsCouleursViolations restitue absent si une sévérité porte un champ numérique invalide', () => {
      expect(
        ParametresJugementUtils.lireSeuilsCouleursViolations({
          couleursViolations: {
            bloquant: { seuilOrange: 1 },
            critique: { seuilOrange: 10, seuilRouge: 25 },
          },
        }),
      ).toEqual({ type: 'absent' });
    });

    it('lireMotifNommageBranches restitue absent si la racine n’est pas un objet', () => {
      expect(ParametresJugementUtils.lireMotifNommageBranches(42)).toEqual({ type: 'absent' });
    });

    it('lireSeuilsTailleDepot restitue absent si la branche tailleDepot est malformée', () => {
      expect(ParametresJugementUtils.lireSeuilsTailleDepot({ tailleDepot: 'texte' })).toEqual({
        type: 'absent',
      });
    });

    it('lireSeuilsCouverture restitue absent si un champ numérique est invalide', () => {
      expect(
        ParametresJugementUtils.lireSeuilsCouverture({
          couverture: { seuilRouge: 'x', seuilOrange: 60 },
        }),
      ).toEqual({ type: 'absent' });
    });

    it('lireSeuilsFraicheurSonar restitue absent si le champ numérique est invalide', () => {
      expect(
        ParametresJugementUtils.lireSeuilsFraicheurSonar({
          fraicheurSonar: { toleranceJours: 'x' },
        }),
      ).toEqual({ type: 'absent' });
    });

    it('lireSeuilsActiviteSansQualite restitue absent si la branche est malformée', () => {
      expect(
        ParametresJugementUtils.lireSeuilsActiviteSansQualite({ activiteSansQualite: null }),
      ).toEqual({
        type: 'absent',
      });
    });

    it('lireSeuilsFraicheurAudit restitue absent si la branche est malformée', () => {
      expect(ParametresJugementUtils.lireSeuilsFraicheurAudit({ fraicheurAudit: null })).toEqual({
        type: 'absent',
      });
    });

    it('lireSeuilsFraicheurAudit restitue absent si le champ numérique est invalide', () => {
      expect(
        ParametresJugementUtils.lireSeuilsFraicheurAudit({ fraicheurAudit: { ancienJours: 'x' } }),
      ).toEqual({ type: 'absent' });
    });

    it('lireSeuilsMrOuvertes restitue absent si la branche est malformée', () => {
      expect(ParametresJugementUtils.lireSeuilsMrOuvertes({ mrOuvertes: null })).toEqual({
        type: 'absent',
      });
    });

    it('lireSeuilsMaterialiteBrouillon restitue absent si le champ numérique est invalide', () => {
      expect(
        ParametresJugementUtils.lireSeuilsMaterialiteBrouillon({
          materialiteBrouillon: { variationRelative: 'x' },
        }),
      ).toEqual({ type: 'absent' });
    });
  });
});
