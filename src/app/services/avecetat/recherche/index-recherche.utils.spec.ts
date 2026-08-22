// Test de IndexRechercheUtils (cf. index-recherche.utils.ts, US-021, F16), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import type { Groupe } from '../etat/types-donnees';
import { TypeSource } from '../etat/types-donnees';
import { IndexRechercheUtils } from './index-recherche.utils';

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une grappe de test à un groupe, un projet, une source GitLab et deux audits (le plus ancien portant
   * une dépendance, un membre, un contributeur et un marqueur IA absents du plus récent).
   * @returns La grappe de test.
   */
  public static grappeAvecHistorique(): readonly Groupe[] {
    return [
      {
        id: 'groupe-1',
        nom: 'Équipe Paiement',
        description: '',
        instances: [],
        membresConnus: [],
        annotations: [],
        indicateursDesactives: [],
        projets: [
          {
            id: 'projet-1',
            nom: 'Service Facturation',
            description: '',
            iaAutorisee: false,
            sources: [
              {
                id: 'source-1',
                instanceId: 'instance-1',
                type: TypeSource.DepotGitlab,
                idExterne: 'groupe/service-facturation',
              },
            ],
            annotations: [],
            audits: [
              {
                id: 'audit-ancien',
                date: '2026-01-10T08:00:00Z',
                campagneId: 'campagne-1',
                typeAudit: 'reguliere',
                resultats: [
                  {
                    type: 'gitlab.dependances',
                    sourceId: 'source-1',
                    refEffective: 'main',
                    shaTete: 'sha1',
                    dependances: [{ reference: 'struts', version: '1.2.0', manifeste: 'pom.xml' }],
                  },
                  {
                    type: 'gitlab.membres',
                    sourceId: 'source-1',
                    refEffective: 'main',
                    shaTete: 'sha1',
                    membres: [
                      {
                        username: 'ancien.membre',
                        nom: 'Ancien Membre',
                        niveauAcces: 30,
                        herite: false,
                      },
                    ],
                  },
                ],
              },
              {
                id: 'audit-recent',
                date: '2026-07-01T08:00:00Z',
                campagneId: 'campagne-2',
                typeAudit: 'reguliere',
                resultats: [
                  {
                    type: 'gitlab.dependances',
                    sourceId: 'source-1',
                    refEffective: 'main',
                    shaTete: 'sha2',
                    dependances: [{ reference: 'log4j', version: '2.17.1', manifeste: 'pom.xml' }],
                  },
                  {
                    type: 'gitlab.membres',
                    sourceId: 'source-1',
                    refEffective: 'main',
                    shaTete: 'sha2',
                    membres: [
                      {
                        username: 'jdupont',
                        nom: 'Jean Dupont',
                        niveauAcces: 40,
                        herite: false,
                        emailPublic: 'jean.dupont@exemple.fr',
                      },
                    ],
                  },
                  {
                    type: 'gitlab.contributeurs',
                    sourceId: 'source-1',
                    refEffective: 'main',
                    shaTete: 'sha2',
                    fenetreJours: 90,
                    contributeurs: [
                      {
                        email: 'contrib@exemple.fr',
                        nom: 'Contributeur Externe',
                        nombreCommits: 3,
                      },
                    ],
                  },
                  {
                    type: 'gitlab.marqueurs_ia',
                    sourceId: 'source-1',
                    refEffective: 'main',
                    shaTete: 'sha2',
                    marqueurs: [{ chemin: 'CLAUDE.md', nature: 'fichier', outil: 'Claude Code' }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
  }

  /**
   * Construit une grappe de test minimale, à un groupe, un projet et une unique source « Projet Sonar » (aucun
   * audit), pour distinguer le libellé indexé d'une source Sonar de celui d'une source GitLab.
   * @returns La grappe de test.
   */
  public static grappeAvecSourceSonar(): readonly Groupe[] {
    return [
      {
        id: 'groupe-2',
        nom: 'Équipe Sonar',
        description: '',
        instances: [],
        membresConnus: [],
        annotations: [],
        indicateursDesactives: [],
        projets: [
          {
            id: 'projet-2',
            nom: 'Service Qualité',
            description: '',
            iaAutorisee: false,
            sources: [
              {
                id: 'source-sonar-1',
                instanceId: 'instance-sonar-1',
                type: TypeSource.ProjetSonar,
                idExterne: 'cle-sonar',
              },
            ],
            annotations: [],
            audits: [],
          },
        ],
      },
    ];
  }
}

describe('IndexRechercheUtils', () => {
  describe('construireIndex', () => {
    it('indexe les entités structurelles (groupe, projet, source) avec le projetId de navigation attendu', () => {
      const index = IndexRechercheUtils.construireIndex(DonneesDeTest.grappeAvecHistorique());

      const entiteGroupe = index.entites.find((entite) => entite.type === 'groupe');
      const entiteProjet = index.entites.find((entite) => entite.type === 'projet');
      const entiteSource = index.entites.find((entite) => entite.type === 'source');

      expect(entiteGroupe?.libelle).toBe('Équipe Paiement');
      expect(entiteGroupe?.projetId).toBeUndefined();
      expect(entiteProjet?.libelle).toBe('Service Facturation');
      expect(entiteProjet?.projetId).toBe('projet-1');
      expect(entiteSource?.libelle).toBe('Dépôt GitLab groupe/service-facturation');
      expect(entiteSource?.projetId).toBe('projet-1');
    });

    it('libelle une source « Projet Sonar » distinctement d’une source « Dépôt GitLab »', () => {
      const index = IndexRechercheUtils.construireIndex(DonneesDeTest.grappeAvecSourceSonar());
      const entiteSource = index.entites.find((entite) => entite.type === 'source');

      expect(entiteSource?.libelle).toBe('Projet Sonar cle-sonar');
    });

    it('indexe les dépendances, membres, contributeurs et outils IA de tous les audits, datés et distingués du dernier audit', () => {
      const index = IndexRechercheUtils.construireIndex(DonneesDeTest.grappeAvecHistorique());

      expect(index.dependances).toHaveLength(2);
      const structs = index.dependances.find((occurrence) => occurrence.reference === 'struts');
      const log4j = index.dependances.find((occurrence) => occurrence.reference === 'log4j');
      expect(structs?.dansDernierAudit).toBe(false);
      expect(structs?.dateAudit).toBe('2026-01-10T08:00:00Z');
      expect(log4j?.dansDernierAudit).toBe(true);

      expect(index.membres.filter((occurrence) => occurrence.nature === 'membre')).toHaveLength(2);
      expect(
        index.membres.filter((occurrence) => occurrence.nature === 'contributeur'),
      ).toHaveLength(1);

      expect(index.outilsIa).toHaveLength(1);
      expect(index.outilsIa[0]?.outil).toBe('Claude Code');
    });
  });

  describe('rechercher', () => {
    const index = IndexRechercheUtils.construireIndex(DonneesDeTest.grappeAvecHistorique());

    it('ne déclenche aucune recherche en-deçà de la longueur minimale du terme', () => {
      const resultats = IndexRechercheUtils.rechercher(index, 'l', { inclureHistorique: false });

      expect(resultats.dependances.nombreTotal).toBe(0);
      expect(resultats.aucunResultat).toBe(false);
    });

    it('restitue aucunResultat=true quand un terme suffisamment long ne correspond à rien', () => {
      const resultats = IndexRechercheUtils.rechercher(index, 'inexistant', {
        inclureHistorique: false,
      });

      expect(resultats.aucunResultat).toBe(true);
    });

    it('limite par défaut les dépendances au dernier audit intégré', () => {
      const resultats = IndexRechercheUtils.rechercher(index, 'struts', {
        inclureHistorique: false,
      });

      expect(resultats.dependances.nombreTotal).toBe(0);
    });

    it('étend la recherche des dépendances à tout l’historique sur option, insensible à la casse', () => {
      const resultats = IndexRechercheUtils.rechercher(index, 'STRUTS', {
        inclureHistorique: true,
      });

      expect(resultats.dependances.nombreTotal).toBe(1);
      expect(resultats.dependances.occurrences[0]?.reference).toBe('struts');
    });

    it('trouve un membre par identifiant (username) ou par nom', () => {
      const parUsername = IndexRechercheUtils.rechercher(index, 'jdupont', {
        inclureHistorique: false,
      });
      const parNom = IndexRechercheUtils.rechercher(index, 'Dupont', { inclureHistorique: false });

      expect(parUsername.membres.nombreTotal).toBe(1);
      expect(parNom.membres.nombreTotal).toBe(1);
    });

    it('trouve un contributeur par courriel dans le dernier audit intégré', () => {
      const resultats = IndexRechercheUtils.rechercher(index, 'contrib@exemple.fr', {
        inclureHistorique: false,
      });

      expect(resultats.membres.nombreTotal).toBe(1);
      expect(resultats.membres.occurrences[0]?.nature).toBe('contributeur');
    });

    it('trouve un outil IA détecté', () => {
      const resultats = IndexRechercheUtils.rechercher(index, 'claude', {
        inclureHistorique: false,
      });

      expect(resultats.outilsIa.nombreTotal).toBe(1);
    });

    it('trouve une entité (groupe, projet ou source) indépendamment de l’option inclureHistorique', () => {
      const resultats = IndexRechercheUtils.rechercher(index, 'Service Facturation', {
        inclureHistorique: false,
      });

      expect(resultats.entites.nombreTotal).toBe(1);
      expect(resultats.entites.occurrences[0]?.type).toBe('projet');
    });

    it('trouve une entité en repliant les accents du terme saisi (R10-18)', () => {
      const resultats = IndexRechercheUtils.rechercher(index, 'Equipe Paiement', {
        inclureHistorique: false,
      });

      expect(resultats.entites.nombreTotal).toBe(1);
      expect(resultats.entites.occurrences[0]?.type).toBe('groupe');
    });

    it('trouve une entité en repliant les accents de la valeur indexée (R10-18)', () => {
      const resultats = IndexRechercheUtils.rechercher(index, 'Depot GitLab', {
        inclureHistorique: false,
      });

      expect(resultats.entites.nombreTotal).toBe(1);
      expect(resultats.entites.occurrences[0]?.type).toBe('source');
    });

    it('plafonne le nombre d’occurrences restituées par nature tout en conservant le décompte réel', () => {
      const grappeVolumineuse = DonneesDeTest.grappeAvecHistorique().map((groupe) => ({
        ...groupe,
        projets: groupe.projets.map((projet) => ({
          ...projet,
          audits: [
            {
              id: 'audit-volumineux',
              date: '2026-07-15T08:00:00Z',
              campagneId: 'campagne-3',
              typeAudit: 'reguliere' as const,
              resultats: [
                {
                  type: 'gitlab.dependances' as const,
                  sourceId: 'source-1',
                  refEffective: 'main',
                  shaTete: 'sha3',
                  dependances: Array.from({ length: 60 }, (_valeur, indice) => ({
                    reference: `paquet-commun-${indice}`,
                    version: '1.0.0',
                    manifeste: 'package.json',
                  })),
                },
              ],
            },
          ],
        })),
      }));
      const indexVolumineux = IndexRechercheUtils.construireIndex(grappeVolumineuse);

      const resultats = IndexRechercheUtils.rechercher(indexVolumineux, 'paquet-commun', {
        inclureHistorique: false,
      });

      expect(resultats.dependances.nombreTotal).toBe(60);
      expect(resultats.dependances.occurrences).toHaveLength(50);
    });
  });
});
