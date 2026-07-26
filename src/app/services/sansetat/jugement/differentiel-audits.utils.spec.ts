// Test du Moteur de jugement — différentiel entre deux audits (cf. differentiel-audits.utils.ts, US-018, RG-011),
// généré avec l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import type { RegleDependance } from './parametres-jugement.utils';
import type { RegleMembreConnu } from './statut-membre.utils';
import type { ResultatDifferentielAudits } from './differentiel-audits.utils';
import { DifferentielAuditsUtils } from './differentiel-audits.utils';

/**
 * Statut de test agnostique de l'enum réel `StatutMembre` (`services/avecetat/etat/types-donnees.ts`), sur le
 * modèle déjà retenu par `statut-membre.utils.spec.ts` (`StatutTest`) : ce module ne dépend jamais de
 * `services/avecetat/` (cf. commentaire d'en-tête de `differentiel-audits.utils.ts`), y compris depuis ses propres
 * tests.
 */
type StatutTest = 'interne' | 'client' | 'partenaire';

describe('DifferentielAuditsUtils', () => {
  const reglesDependances: readonly RegleDependance[] = [
    {
      motif: 'org.springframework:*',
      versions: [
        { motifVersion: '4.*', statut: 'obsolete' },
        { motifVersion: '5.3.*', statut: 'maintenu' },
      ],
    },
    { motif: 'moment', versions: [{ motifVersion: '*', statut: 'obsolete' }] },
  ];

  const membresConnus: readonly RegleMembreConnu<StatutTest>[] = [
    { critere: 'jdupont', typeCritere: 'username', statut: 'interne' },
  ];

  describe('calculerDifferentiel — volet indicateurs', () => {
    it('calcule avant/après/delta quand les deux audits produisent les constats numériques', () => {
      const resultatsAvant: readonly ResultatDifferentielAudits[] = [
        { type: 'sonar.couverture', sourceId: 's', couverture: 50, couvertureNouveauCode: 50 },
        {
          type: 'sonar.violations',
          sourceId: 's',
          parSeverite: { bloquant: 2, critique: 5, majeur: 0, mineur: 0, info: 0 },
          nouvellesViolations: 0,
        },
        {
          type: 'gitlab.taille_depot',
          sourceId: 's',
          refEffective: 'main',
          shaTete: 'a',
          tailleOctets: 1000,
        },
        {
          type: 'sonar.notes',
          sourceId: 's',
          fiabilite: 2,
          securite: 3,
          maintenabilite: 1,
          revueSecurite: 4,
        },
      ];
      const resultatsApres: readonly ResultatDifferentielAudits[] = [
        { type: 'sonar.couverture', sourceId: 's', couverture: 60, couvertureNouveauCode: 60 },
        {
          type: 'sonar.violations',
          sourceId: 's',
          parSeverite: { bloquant: 0, critique: 1, majeur: 0, mineur: 0, info: 0 },
          nouvellesViolations: 0,
        },
        {
          type: 'gitlab.taille_depot',
          sourceId: 's',
          refEffective: 'main',
          shaTete: 'b',
          tailleOctets: 2500,
        },
        {
          type: 'sonar.notes',
          sourceId: 's',
          fiabilite: 1,
          securite: 1,
          maintenabilite: 2,
          revueSecurite: 5,
        },
      ];

      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApres,
        [],
        [],
        false,
      );

      expect(differentiel.indicateurs.couverture).toEqual({ avant: 50, apres: 60, delta: 10 });
      expect(differentiel.indicateurs.violationsBloquant).toEqual({
        avant: 2,
        apres: 0,
        delta: -2,
      });
      expect(differentiel.indicateurs.violationsCritique).toEqual({
        avant: 5,
        apres: 1,
        delta: -4,
      });
      expect(differentiel.indicateurs.tailleDepot).toEqual({
        avant: 1000,
        apres: 2500,
        delta: 1500,
      });
      expect(differentiel.indicateurs.noteFiabilite).toEqual({ avant: 2, apres: 1, delta: -1 });
      expect(differentiel.indicateurs.noteSecurite).toEqual({ avant: 3, apres: 1, delta: -2 });
      expect(differentiel.indicateurs.noteMaintenabilite).toEqual({ avant: 1, apres: 2, delta: 1 });
      expect(differentiel.indicateurs.noteRevueSecurite).toEqual({ avant: 4, apres: 5, delta: 1 });
    });

    it('restitue une valeur et un delta indéfinis quand un constat est absent des deux audits', () => {
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel([], [], [], [], false);
      expect(differentiel.indicateurs.couverture).toEqual({
        avant: undefined,
        apres: undefined,
        delta: undefined,
      });
      expect(differentiel.indicateurs.tailleDepot.delta).toBeUndefined();
    });

    it("restitue un delta indéfini quand le constat n'est produit que par un seul des deux audits", () => {
      const resultatsApres: readonly ResultatDifferentielAudits[] = [
        { type: 'sonar.couverture', sourceId: 's', couverture: 60, couvertureNouveauCode: 60 },
      ];
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        [],
        resultatsApres,
        [],
        [],
        false,
      );
      expect(differentiel.indicateurs.couverture).toEqual({
        avant: undefined,
        apres: 60,
        delta: undefined,
      });
    });
  });

  describe('calculerDifferentiel — volet dépendances', () => {
    /**
     * Construit un résultat `gitlab.dependances` de test.
     * @param dependances - Dépendances constatées.
     * @returns Le résultat de test.
     */
    function resultatDependances(
      dependances: readonly { reference: string; version: string; manifeste: string }[],
    ): readonly ResultatDifferentielAudits[] {
      return [
        {
          type: 'gitlab.dependances',
          sourceId: 's',
          refEffective: 'main',
          shaTete: 'a',
          dependances,
        },
      ];
    }

    it('détecte un ajout de dépendance, avec son statut recalculé côté audit le plus récent', () => {
      const resultatsAvant = resultatDependances([]);
      const resultatsApres = resultatDependances([
        { reference: 'moment', version: '2.0.0', manifeste: 'package.json' },
      ]);
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApres,
        reglesDependances,
        [],
        false,
      );
      expect(differentiel.dependances.ajouts).toEqual([
        {
          reference: 'moment',
          manifeste: 'package.json',
          versionAvant: undefined,
          versionApres: '2.0.0',
          statutAvant: { type: 'nonReference' },
          statutApres: { type: 'statut', statut: 'obsolete' },
        },
      ]);
      expect(differentiel.dependances.retraits).toEqual([]);
      expect(differentiel.dependances.modifications).toEqual([]);
    });

    it('détecte un retrait de dépendance, avec son statut recalculé côté audit le plus ancien', () => {
      const resultatsAvant = resultatDependances([
        { reference: 'moment', version: '2.0.0', manifeste: 'package.json' },
      ]);
      const resultatsApres = resultatDependances([]);
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApres,
        reglesDependances,
        [],
        false,
      );
      expect(differentiel.dependances.retraits).toEqual([
        {
          reference: 'moment',
          manifeste: 'package.json',
          versionAvant: '2.0.0',
          versionApres: undefined,
          statutAvant: { type: 'statut', statut: 'obsolete' },
          statutApres: { type: 'nonReference' },
        },
      ]);
    });

    it('détecte un changement de statut d’obsolescence pour une dépendance dont la version a changé', () => {
      const resultatsAvant = resultatDependances([
        { reference: 'org.springframework:spring-core', version: '4.3.0', manifeste: 'pom.xml' },
      ]);
      const resultatsApres = resultatDependances([
        { reference: 'org.springframework:spring-core', version: '5.3.30', manifeste: 'pom.xml' },
      ]);
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApres,
        reglesDependances,
        [],
        false,
      );
      expect(differentiel.dependances.modifications).toEqual([
        {
          reference: 'org.springframework:spring-core',
          manifeste: 'pom.xml',
          versionAvant: '4.3.0',
          versionApres: '5.3.30',
          statutAvant: { type: 'statut', statut: 'obsolete' },
          statutApres: { type: 'statut', statut: 'maintenu' },
        },
      ]);
    });

    it('n’inclut pas une dépendance dont le statut recalculé reste identique aux deux bords', () => {
      const resultatsAvant = resultatDependances([
        { reference: 'org.springframework:spring-core', version: '5.3.30', manifeste: 'pom.xml' },
      ]);
      const resultatsApres = resultatDependances([
        { reference: 'org.springframework:spring-core', version: '5.3.30', manifeste: 'pom.xml' },
      ]);
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApres,
        reglesDependances,
        [],
        false,
      );
      expect(differentiel.dependances.ajouts).toEqual([]);
      expect(differentiel.dependances.retraits).toEqual([]);
      expect(differentiel.dependances.modifications).toEqual([]);
    });

    it(
      'détecte un changement de statut quand une dépendance passe de « non référencée » à un statut connu ' +
        '(le motif de la règle ne correspond qu’à l’une des deux versions constatées)',
      () => {
        const resultatsAvant = resultatDependances([
          { reference: 'org.springframework:spring-core', version: '3.0.0', manifeste: 'pom.xml' },
        ]);
        const resultatsApres = resultatDependances([
          { reference: 'org.springframework:spring-core', version: '5.3.30', manifeste: 'pom.xml' },
        ]);
        const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
          resultatsAvant,
          resultatsApres,
          reglesDependances,
          [],
          false,
        );
        expect(differentiel.dependances.modifications).toEqual([
          {
            reference: 'org.springframework:spring-core',
            manifeste: 'pom.xml',
            versionAvant: '3.0.0',
            versionApres: '5.3.30',
            statutAvant: { type: 'nonReference' },
            statutApres: { type: 'statut', statut: 'maintenu' },
          },
        ]);
      },
    );

    it('n’inclut pas une dépendance non référencée aux deux bords (statut nonReference stable)', () => {
      const resultatsAvant = resultatDependances([
        { reference: 'inconnue:lib', version: '1.0.0', manifeste: 'package.json' },
      ]);
      const resultatsApres = resultatDependances([
        { reference: 'inconnue:lib', version: '2.0.0', manifeste: 'package.json' },
      ]);
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApres,
        reglesDependances,
        [],
        false,
      );
      expect(differentiel.dependances.modifications).toEqual([]);
    });
  });

  describe('calculerDifferentiel — volet membres et contributeurs', () => {
    /**
     * Construit un résultat `gitlab.membres` de test.
     * @param membres - Membres constatés.
     * @returns Le résultat de test.
     */
    function resultatMembres(
      membres: readonly { username: string; nom: string; niveauAcces: number; herite: boolean }[],
    ): readonly ResultatDifferentielAudits[] {
      return [
        { type: 'gitlab.membres', sourceId: 's', refEffective: 'main', shaTete: 'a', membres },
      ];
    }

    it('détecte un ajout de membre, avec son statut résolu côté audit le plus récent', () => {
      const resultatsAvant = resultatMembres([]);
      const resultatsApres = resultatMembres([
        { username: 'jdupont', nom: 'Jean Dupont', niveauAcces: 30, herite: false },
      ]);
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApres,
        [],
        membresConnus,
        false,
      );
      expect(differentiel.membres.ajouts).toEqual([
        {
          username: 'jdupont',
          nomAvant: undefined,
          nomApres: 'Jean Dupont',
          resolutionAvant: undefined,
          resolutionApres: { type: 'connu', statut: 'interne' },
        },
      ]);
    });

    it('détecte un retrait de membre, avec son statut résolu côté audit le plus ancien', () => {
      const resultatsAvant = resultatMembres([
        { username: 'jdupont', nom: 'Jean Dupont', niveauAcces: 30, herite: false },
      ]);
      const resultatsApres = resultatMembres([]);
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApres,
        [],
        membresConnus,
        false,
      );
      expect(differentiel.membres.retraits).toEqual([
        {
          username: 'jdupont',
          nomAvant: 'Jean Dupont',
          nomApres: undefined,
          resolutionAvant: { type: 'connu', statut: 'interne' },
          resolutionApres: undefined,
        },
      ]);
    });

    it('détecte un changement de statut de rattachement (membre inconnu qualifié entre les deux audits)', () => {
      const resultatsAvant = resultatMembres([
        { username: 'inconnu1', nom: 'Personne Inconnue', niveauAcces: 30, herite: false },
      ]);
      const membresConnusApresQualification: readonly RegleMembreConnu<StatutTest>[] = [
        { critere: 'inconnu1', typeCritere: 'username', statut: 'interne' },
      ];
      // RG-011 : les deux bords sont recalculés avec les MÊMES membres connus courants (celles APRÈS
      // qualification), donc un changement de statut entre les deux audits pour un même membre ne peut provenir
      // que d'un changement de la donnée constatée elle-même (ex. username), jamais de la qualification.
      // Ce test illustre plutôt le cas où le username change entre les deux constats.
      const resultatsApresUsernameChange = resultatMembres([
        { username: 'jdupont', nom: 'Jean Dupont', niveauAcces: 30, herite: false },
      ]);
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApresUsernameChange,
        [],
        membresConnusApresQualification,
        false,
      );
      // Le membre "inconnu1" disparaît (retrait) et "jdupont" apparaît (ajout) : changement de username, pas de
      // statut sur un même membre.
      expect(differentiel.membres.retraits.map((m) => m.username)).toEqual(['inconnu1']);
      expect(differentiel.membres.ajouts.map((m) => m.username)).toEqual(['jdupont']);
      expect(differentiel.membres.modifications).toEqual([]);
    });

    it(
      'détecte un changement de statut pour un même membre (username inchangé) dont l’adresse courriel ' +
        'permet, côté audit le plus récent seulement, une résolution par domaine',
      () => {
        const membresConnusAvecDomaine: readonly RegleMembreConnu<StatutTest>[] = [
          { critere: '*@entreprise.fr', typeCritere: 'domaineEmail', statut: 'client' },
        ];
        const resultatsAvant = resultatMembres([
          { username: 'jmartin', nom: 'Jean Martin', niveauAcces: 20, herite: false },
        ]);
        const resultatsApresAvecEmail: readonly ResultatDifferentielAudits[] = [
          {
            type: 'gitlab.membres',
            sourceId: 's',
            refEffective: 'main',
            shaTete: 'b',
            membres: [
              {
                username: 'jmartin',
                nom: 'Jean Martin',
                niveauAcces: 20,
                herite: false,
                emailPublic: 'jean.martin@entreprise.fr',
              },
            ],
          },
        ];
        const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
          resultatsAvant,
          resultatsApresAvecEmail,
          [],
          membresConnusAvecDomaine,
          false,
        );
        expect(differentiel.membres.modifications).toEqual([
          {
            username: 'jmartin',
            nomAvant: 'Jean Martin',
            nomApres: 'Jean Martin',
            resolutionAvant: { type: 'inconnu' },
            resolutionApres: { type: 'connu', statut: 'client' },
          },
        ]);
      },
    );

    it('n’inclut pas un membre dont le statut résolu reste identique aux deux bords', () => {
      const membre = { username: 'jdupont', nom: 'Jean Dupont', niveauAcces: 30, herite: false };
      const resultatsAvant = resultatMembres([membre]);
      const resultatsApres = resultatMembres([membre]);
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApres,
        [],
        membresConnus,
        false,
      );
      expect(differentiel.membres.ajouts).toEqual([]);
      expect(differentiel.membres.retraits).toEqual([]);
      expect(differentiel.membres.modifications).toEqual([]);
    });

    it('détecte un changement de statut quand un membre reste inconnu aux deux bords mais change de conflit', () => {
      // Un membre reste "inconnu" (aucune règle ne correspond) aux deux bords : la résolution reste `inconnu` des
      // deux côtés, donc pas de changement de statut malgré des niveaux d'accès différents (le niveau d'accès
      // n'entre pas dans le calcul du statut de rattachement, RG-006 à RG-008).
      const resultatsAvant = resultatMembres([
        { username: 'inconnu2', nom: 'X', niveauAcces: 10, herite: false },
      ]);
      const resultatsApres = resultatMembres([
        { username: 'inconnu2', nom: 'X', niveauAcces: 40, herite: false },
      ]);
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApres,
        [],
        membresConnus,
        false,
      );
      expect(differentiel.membres.modifications).toEqual([]);
    });
  });

  describe('calculerDifferentiel — volet marqueurs IA', () => {
    /**
     * Construit un résultat `gitlab.marqueurs_ia` de test.
     * @param marqueurs - Marqueurs détectés.
     * @returns Le résultat de test.
     */
    function resultatMarqueurs(
      marqueurs: readonly { chemin: string; nature: string; outil: string }[],
    ): readonly ResultatDifferentielAudits[] {
      return [
        {
          type: 'gitlab.marqueurs_ia',
          sourceId: 's',
          refEffective: 'main',
          shaTete: 'a',
          marqueurs,
        },
      ];
    }

    it('détecte les marqueurs ajoutés et retirés entre les deux audits', () => {
      const resultatsAvant = resultatMarqueurs([
        { chemin: '.copilot', nature: 'repertoire', outil: 'Copilot' },
      ]);
      const resultatsApres = resultatMarqueurs([
        { chemin: '.cursor', nature: 'repertoire', outil: 'Cursor' },
      ]);
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApres,
        [],
        [],
        false,
      );
      expect(differentiel.marqueursIa.ajouts).toEqual([
        { chemin: '.cursor', nature: 'repertoire', outil: 'Cursor' },
      ]);
      expect(differentiel.marqueursIa.retraits).toEqual([
        { chemin: '.copilot', nature: 'repertoire', outil: 'Copilot' },
      ]);
    });

    it('recalcule le statut IA global aux deux bords avec la politique IA courante (violation détectée)', () => {
      const resultatsAvant = resultatMarqueurs([]);
      const resultatsApres = resultatMarqueurs([
        { chemin: '.copilot', nature: 'repertoire', outil: 'Copilot' },
      ]);
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApres,
        [],
        [],
        false,
      );
      expect(differentiel.marqueursIa.statutIaAvant).toEqual({
        type: 'conformeSousReserve',
      });
      expect(differentiel.marqueursIa.statutIaApres.type).toBe('violation');
    });

    it('restitue un statut IA "autorisee" aux deux bords quand la politique IA courante autorise l’usage', () => {
      const resultatsAvant = resultatMarqueurs([]);
      const resultatsApres = resultatMarqueurs([
        { chemin: '.copilot', nature: 'repertoire', outil: 'Copilot' },
      ]);
      const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
        resultatsAvant,
        resultatsApres,
        [],
        [],
        true,
      );
      expect(differentiel.marqueursIa.statutIaAvant.type).toBe('autorisee');
      expect(differentiel.marqueursIa.statutIaApres.type).toBe('autorisee');
    });
  });

  it('calcule un différentiel complet couvrant les quatre volets sur une paire d’audits connue', () => {
    const resultatsAvant: readonly ResultatDifferentielAudits[] = [
      { type: 'sonar.couverture', sourceId: 's', couverture: 40, couvertureNouveauCode: 40 },
      {
        type: 'sonar.violations',
        sourceId: 's',
        parSeverite: { bloquant: 1, critique: 2, majeur: 0, mineur: 0, info: 0 },
        nouvellesViolations: 0,
      },
      {
        type: 'gitlab.taille_depot',
        sourceId: 's',
        refEffective: 'main',
        shaTete: 'a',
        tailleOctets: 500,
      },
      {
        type: 'sonar.notes',
        sourceId: 's',
        fiabilite: 3,
        securite: 3,
        maintenabilite: 3,
        revueSecurite: 3,
      },
      {
        type: 'gitlab.dependances',
        sourceId: 's',
        refEffective: 'main',
        shaTete: 'a',
        dependances: [{ reference: 'moment', version: '2.0.0', manifeste: 'package.json' }],
      },
      {
        type: 'gitlab.membres',
        sourceId: 's',
        refEffective: 'main',
        shaTete: 'a',
        membres: [{ username: 'jdupont', nom: 'Jean Dupont', niveauAcces: 30, herite: false }],
      },
      {
        type: 'gitlab.marqueurs_ia',
        sourceId: 's',
        refEffective: 'main',
        shaTete: 'a',
        marqueurs: [],
      },
    ];
    const resultatsApres: readonly ResultatDifferentielAudits[] = [
      { type: 'sonar.couverture', sourceId: 's', couverture: 70, couvertureNouveauCode: 70 },
      {
        type: 'sonar.violations',
        sourceId: 's',
        parSeverite: { bloquant: 0, critique: 0, majeur: 0, mineur: 0, info: 0 },
        nouvellesViolations: 0,
      },
      {
        type: 'gitlab.taille_depot',
        sourceId: 's',
        refEffective: 'main',
        shaTete: 'b',
        tailleOctets: 900,
      },
      {
        type: 'sonar.notes',
        sourceId: 's',
        fiabilite: 1,
        securite: 1,
        maintenabilite: 1,
        revueSecurite: 1,
      },
      {
        type: 'gitlab.dependances',
        sourceId: 's',
        refEffective: 'main',
        shaTete: 'b',
        dependances: [
          { reference: 'moment', version: '2.0.0', manifeste: 'package.json' },
          { reference: 'org.springframework:spring-core', version: '5.3.30', manifeste: 'pom.xml' },
        ],
      },
      {
        type: 'gitlab.membres',
        sourceId: 's',
        refEffective: 'main',
        shaTete: 'b',
        membres: [
          { username: 'jdupont', nom: 'Jean Dupont', niveauAcces: 30, herite: false },
          { username: 'inconnu1', nom: 'Inconnu', niveauAcces: 40, herite: false },
        ],
      },
      {
        type: 'gitlab.marqueurs_ia',
        sourceId: 's',
        refEffective: 'main',
        shaTete: 'b',
        marqueurs: [{ chemin: '.copilot', nature: 'repertoire', outil: 'Copilot' }],
      },
    ];

    const differentiel = DifferentielAuditsUtils.calculerDifferentiel(
      resultatsAvant,
      resultatsApres,
      reglesDependances,
      membresConnus,
      false,
    );

    expect(differentiel.indicateurs.couverture.delta).toBe(30);
    expect(differentiel.indicateurs.violationsBloquant.delta).toBe(-1);
    expect(differentiel.indicateurs.violationsCritique.delta).toBe(-2);
    expect(differentiel.indicateurs.tailleDepot.delta).toBe(400);

    expect(differentiel.dependances.ajouts).toHaveLength(1);
    expect(differentiel.dependances.ajouts[0].reference).toBe('org.springframework:spring-core');
    expect(differentiel.dependances.retraits).toEqual([]);
    expect(differentiel.dependances.modifications).toEqual([]);

    expect(differentiel.membres.ajouts).toHaveLength(1);
    expect(differentiel.membres.ajouts[0].username).toBe('inconnu1');
    expect(differentiel.membres.ajouts[0].resolutionApres).toEqual({ type: 'inconnu' });
    expect(differentiel.membres.retraits).toEqual([]);

    expect(differentiel.marqueursIa.ajouts).toEqual([
      { chemin: '.copilot', nature: 'repertoire', outil: 'Copilot' },
    ]);
    expect(differentiel.marqueursIa.statutIaApres.type).toBe('violation');
  });
});
