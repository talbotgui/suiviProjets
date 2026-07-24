// Test de RapportAnomaliesUtils (cf. rapport-anomalies.utils.ts), généré avec l'assistance de l'IA (Claude Code),
// conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TypeInstance } from '../../sansetat/commandes/types-facade';
import type { Instance } from '../../sansetat/commandes/types-facade';
import { TypeSource } from '../etat/types-donnees';
import type { Groupe, Projet, Source } from '../etat/types-donnees';
import type { AnomalieResolue } from './rapport-anomalies.utils';
import { RapportAnomaliesUtils } from './rapport-anomalies.utils';

const INSTANCE_GITLAB: Instance = {
  id: 'instance-gitlab',
  type: TypeInstance.Gitlab,
  nom: 'GitLab interne',
  urlBase: 'https://gitlab.exemple.test',
};

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une source GitLab de test.
   * @param id - Identifiant de la source.
   * @returns La source construite.
   */
  public static source(id: string): Source {
    return { id, instanceId: INSTANCE_GITLAB.id, type: TypeSource.DepotGitlab, idExterne: id };
  }

  /**
   * Construit un projet de test.
   * @param id - Identifiant du projet.
   * @param sources - Sources rattachées au projet.
   * @returns Le projet construit.
   */
  public static projet(id: string, sources: readonly Source[]): Projet {
    return {
      id,
      nom: `Projet ${id}`,
      description: '',
      iaAutorisee: false,
      sources,
      annotations: [],
      audits: [],
    };
  }

  /**
   * Construit un groupe de test.
   * @param projets - Projets rattachés au groupe.
   * @returns Le groupe construit.
   */
  public static groupe(projets: readonly Projet[]): Groupe {
    return {
      id: 'groupe-1',
      nom: 'Groupe de test',
      description: '',
      instances: [INSTANCE_GITLAB],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets,
    };
  }
}

describe('RapportAnomaliesUtils', () => {
  describe('resoudreAnomaliesProjet', () => {
    it('doit retourner un tableau vide si aucune anomalie brute', () => {
      const resolues = RapportAnomaliesUtils.resoudreAnomaliesProjet(
        'p1',
        'Projet p1',
        undefined,
        [],
      );

      expect(resolues).toEqual([]);
    });

    it('doit résoudre une entrée brute valide, y compris son instance', () => {
      const groupes = [
        DonneesDeTest.groupe([DonneesDeTest.projet('p1', [DonneesDeTest.source('s1')])]),
      ];

      const resolues = RapportAnomaliesUtils.resoudreAnomaliesProjet(
        'p1',
        'Projet p1',
        [
          {
            indicateur: 'gitlab.vitalite',
            sourceId: 's1',
            anomalie: { type: 'delaiDepasse', message: 'Timed out' },
          },
        ],
        groupes,
      );

      expect(resolues).toEqual([
        {
          projetId: 'p1',
          projetNom: 'Projet p1',
          sourceId: 's1',
          instanceId: 'instance-gitlab',
          instanceNom: 'GitLab interne',
          indicateur: 'gitlab.vitalite',
          categorie: 'delaiDepasse',
          message: 'Timed out',
        },
      ]);
    });

    it('doit ignorer silencieusement une entrée malformée (forme inattendue)', () => {
      const resolues = RapportAnomaliesUtils.resoudreAnomaliesProjet(
        'p1',
        'Projet p1',
        ['pas un objet', { sansChampsAttendus: true }, null],
        [],
      );

      expect(resolues).toEqual([]);
    });

    it.each([
      [
        'indicateur non-string',
        { indicateur: 42, sourceId: 's1', anomalie: { type: 'delaiDepasse', message: 'x' } },
      ],
      [
        'sourceId non-string',
        {
          indicateur: 'gitlab.vitalite',
          sourceId: 42,
          anomalie: { type: 'delaiDepasse', message: 'x' },
        },
      ],
      [
        'anomalie non-objet',
        { indicateur: 'gitlab.vitalite', sourceId: 's1', anomalie: 'pas un objet' },
      ],
      ['anomalie nulle', { indicateur: 'gitlab.vitalite', sourceId: 's1', anomalie: null }],
      [
        'anomalie sans champ type',
        { indicateur: 'gitlab.vitalite', sourceId: 's1', anomalie: { message: 'x' } },
      ],
      [
        'anomalie sans champ message',
        { indicateur: 'gitlab.vitalite', sourceId: 's1', anomalie: { type: 'delaiDepasse' } },
      ],
      [
        'message non-string',
        {
          indicateur: 'gitlab.vitalite',
          sourceId: 's1',
          anomalie: { type: 'delaiDepasse', message: 42 },
        },
      ],
      [
        'catégorie inconnue',
        {
          indicateur: 'gitlab.vitalite',
          sourceId: 's1',
          anomalie: { type: 'categorieInconnue', message: 'x' },
        },
      ],
    ])('doit ignorer une entrée dont %s', (_description, entree) => {
      const resolues = RapportAnomaliesUtils.resoudreAnomaliesProjet(
        'p1',
        'Projet p1',
        [entree],
        [],
      );

      expect(resolues).toEqual([]);
    });

    it("doit résoudre 'instance inconnue' si la source n'est plus retrouvée, y compris quand un autre projet du même groupe porte des sources différentes", () => {
      const groupes = [
        DonneesDeTest.groupe([
          DonneesDeTest.projet('p1', [DonneesDeTest.source('s1')]),
          DonneesDeTest.projet('p2', [DonneesDeTest.source('s2')]),
        ]),
      ];

      const resolues = RapportAnomaliesUtils.resoudreAnomaliesProjet(
        'p1',
        'Projet p1',
        [
          {
            indicateur: 'gitlab.vitalite',
            sourceId: 'source-disparue',
            anomalie: { type: 'reponseInattendue', message: 'peu importe' },
          },
        ],
        groupes,
      );

      expect(resolues).toEqual([
        expect.objectContaining({ instanceId: undefined, instanceNom: 'Instance inconnue' }),
      ]);
    });
  });

  describe('regrouper', () => {
    it('doit regrouper les anomalies de même catégorie et même instance en une seule ligne', () => {
      const anomalies: readonly AnomalieResolue[] = [
        {
          projetId: 'p1',
          projetNom: 'Projet 1',
          sourceId: 's1',
          instanceId: 'instance-gitlab',
          instanceNom: 'GitLab interne',
          indicateur: 'gitlab.vitalite',
          categorie: 'authentificationRefusee',
          message: 'Statut HTTP 401 reçu',
        },
        {
          projetId: 'p2',
          projetNom: 'Projet 2',
          sourceId: 's2',
          instanceId: 'instance-gitlab',
          instanceNom: 'GitLab interne',
          indicateur: 'gitlab.contributeurs',
          categorie: 'authentificationRefusee',
          message: 'Statut HTTP 401 reçu',
        },
      ];

      const groupes = RapportAnomaliesUtils.regrouper(anomalies);

      expect(groupes).toHaveLength(1);
      expect(groupes[0]).toEqual(
        expect.objectContaining({
          categorie: 'authentificationRefusee',
          libelleCategorie: 'Authentification refusée',
          instanceId: 'instance-gitlab',
          indicateurs: ['gitlab.vitalite', 'gitlab.contributeurs'],
        }),
      );
      expect(groupes[0].projets).toEqual([
        { projetId: 'p1', projetNom: 'Projet 1' },
        { projetId: 'p2', projetNom: 'Projet 2' },
      ]);
    });

    it('doit distinguer deux causes différentes (catégories différentes sur la même instance)', () => {
      const anomalies: readonly AnomalieResolue[] = [
        {
          projetId: 'p1',
          projetNom: 'Projet 1',
          sourceId: 's1',
          instanceId: 'instance-gitlab',
          instanceNom: 'GitLab interne',
          indicateur: 'gitlab.vitalite',
          categorie: 'authentificationRefusee',
          message: 'Statut HTTP 401 reçu',
        },
        {
          projetId: 'p2',
          projetNom: 'Projet 2',
          sourceId: 's2',
          instanceId: 'instance-gitlab',
          instanceNom: 'GitLab interne',
          indicateur: 'gitlab.vitalite',
          categorie: 'instanceInjoignable',
          message: 'connection refused',
        },
      ];

      const groupes = RapportAnomaliesUtils.regrouper(anomalies);

      expect(groupes).toHaveLength(2);
    });

    it('doit trier les groupes par nombre décroissant de projets concernés', () => {
      const anomalies: readonly AnomalieResolue[] = [
        {
          projetId: 'p1',
          projetNom: 'Projet 1',
          sourceId: 's1',
          instanceId: 'instance-a',
          instanceNom: 'Instance A',
          indicateur: 'gitlab.vitalite',
          categorie: 'delaiDepasse',
          message: 'x',
        },
        {
          projetId: 'p2',
          projetNom: 'Projet 2',
          sourceId: 's2',
          instanceId: 'instance-b',
          instanceNom: 'Instance B',
          indicateur: 'gitlab.vitalite',
          categorie: 'instanceInjoignable',
          message: 'y',
        },
        {
          projetId: 'p3',
          projetNom: 'Projet 3',
          sourceId: 's3',
          instanceId: 'instance-b',
          instanceNom: 'Instance B',
          indicateur: 'gitlab.contributeurs',
          categorie: 'instanceInjoignable',
          message: 'y',
        },
      ];

      const groupes = RapportAnomaliesUtils.regrouper(anomalies);

      expect(groupes[0].instanceId).toBe('instance-b');
      expect(groupes[0].projets).toHaveLength(2);
    });

    it('doit retourner un tableau vide en l’absence de toute anomalie', () => {
      expect(RapportAnomaliesUtils.regrouper([])).toEqual([]);
    });
  });
});
