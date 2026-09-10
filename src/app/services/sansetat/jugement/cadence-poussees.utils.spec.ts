// Test de CadencePousseesUtils (cf. cadence-poussees.utils.ts, US-060, RG-060, plan_17 chapitre 4), Moteur de
// jugement de l'écran « Commits des membres », généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import type { EvenementPoussee } from '../commandes/types-facade';
import {
  CadencePousseesUtils,
  type ActivitePousseesDeveloppeur,
  type SeuilsCadencePoussees,
} from './cadence-poussees.utils';
import type { RegleMembreConnu } from './statut-membre.utils';

type StatutDeveloppeur = 'interne' | 'client' | 'partenaire' | 'inconnu';

/** Lundi midi UTC, instant de référence de tous les tests. */
const MAINTENANT = '2026-03-16T12:00:00.000Z';
const CHEMINS = new Map<number, string>([[1, 'demo/api']]);
const SANS_REGLE: readonly RegleMembreConnu<StatutDeveloppeur>[] = [];

const SEUILS: SeuilsCadencePoussees = {
  fenetreJours: 28,
  seuilJoursOuvresSansPoussee: 3,
  multiplicateurEcartCadence: 2,
  ponderationInactivite: 0.5,
  ponderationEcartCadence: 0.3,
  ponderationSoiree: 0.2,
  heureDebutSoiree: 19,
  heureFinSoiree: 7,
  fuseauHoraire: 'Europe/Paris',
  comptesExclus: [],
};

/**
 * Fabriques de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class Fixtures {
  /**
   * Construit un événement de poussée à `joursAvant` jours et `heureUtc` heures avant l'instant de référence.
   * @param joursAvant - Ancienneté en jours.
   * @param heureUtc - Heure UTC imposée (0–23).
   * @param nombreCommits - Nombre de commits (défaut 1).
   * @returns L'événement.
   */
  public static poussee(joursAvant: number, heureUtc: number, nombreCommits = 1): EvenementPoussee {
    const date = new Date(Date.parse(MAINTENANT) - joursAvant * 24 * 60 * 60 * 1000);
    date.setUTCHours(heureUtc, 0, 0, 0);
    return {
      horodatage: date.toISOString(),
      projetId: 1,
      refPoussee: 'refs/heads/main',
      nombreCommits,
    };
  }

  /**
   * Enveloppe une liste d'événements dans une entrée d'activité.
   * @param username - Identifiant du développeur.
   * @param evenements - Ses événements.
   * @param courriel - Son courriel (défaut `null`).
   * @returns L'entrée d'activité.
   */
  public static activite(
    username: string,
    evenements: readonly EvenementPoussee[],
    courriel: string | null = null,
  ): ActivitePousseesDeveloppeur {
    return { membre: { id: 1, username, nom: username, courriel }, evenements };
  }
}

describe('CadencePousseesUtils.analyser', () => {
  it('ne produit aucune ligne pour un roster vide', () => {
    expect(CadencePousseesUtils.analyser([], SEUILS, CHEMINS, SANS_REGLE, MAINTENANT)).toEqual([]);
  });

  it('retire une ligne dont le compte figure dans comptesExclus', () => {
    const lignes = CadencePousseesUtils.analyser(
      [
        Fixtures.activite('robot-ci', [Fixtures.poussee(1, 10)]),
        Fixtures.activite('dev', [Fixtures.poussee(1, 10)]),
      ],
      { ...SEUILS, comptesExclus: ['robot-ci'] },
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    );
    expect(lignes.map((ligne) => ligne.username)).toEqual(['dev']);
  });

  it('marque « données insuffisantes » un développeur à une seule poussée et retire le signal d’écart', () => {
    const [ligne] = CadencePousseesUtils.analyser(
      [Fixtures.activite('dev', [Fixtures.poussee(1, 10)])],
      SEUILS,
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    );
    expect(ligne.donneesInsuffisantes).toBe(true);
    expect(ligne.cadenceMedianeHeures).toBeNull();
    expect(ligne.ecartCadence).toBeNull();
    expect(ligne.nombrePoussees).toBe(1);
  });

  it('calcule une cadence et un écart cohérents pour un développeur régulier', () => {
    const evenements = [
      Fixtures.poussee(6, 10),
      Fixtures.poussee(5, 10),
      Fixtures.poussee(4, 10),
      Fixtures.poussee(3, 10),
      Fixtures.poussee(2, 10),
    ];
    const [ligne] = CadencePousseesUtils.analyser(
      [Fixtures.activite('dana', evenements)],
      SEUILS,
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    );
    expect(ligne.donneesInsuffisantes).toBe(false);
    expect(ligne.cadenceMedianeHeures).toBeCloseTo(24);
    expect(ligne.nombrePoussees).toBe(5);
    // Dernière poussée il y a ~2 jours (50 h) ; écart ≈ 50 h / 24 h de cadence ≈ 2,08.
    expect(ligne.ecartCadence).toBeGreaterThan(2);
    expect(ligne.ecartCadence).toBeLessThan(2.2);
  });

  it('compte les jours ouvrés en sautant le week-end : vendredi → lundi = 1, même jour = 0', () => {
    const vendrediMidi = new Date('2026-03-13T12:00:00.000Z');
    const [depuisVendredi] = CadencePousseesUtils.analyser(
      [
        Fixtures.activite('dev', [
          {
            horodatage: vendrediMidi.toISOString(),
            projetId: 1,
            refPoussee: 'r',
            nombreCommits: 1,
          },
          {
            horodatage: '2026-03-12T12:00:00.000Z',
            projetId: 1,
            refPoussee: 'r',
            nombreCommits: 1,
          },
        ]),
      ],
      SEUILS,
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    );
    expect(depuisVendredi.joursOuvresDepuisDernierePoussee).toBe(1);

    const [memeJour] = CadencePousseesUtils.analyser(
      [Fixtures.activite('dev', [Fixtures.poussee(0, 8), Fixtures.poussee(0, 9)])],
      SEUILS,
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    );
    expect(memeJour.joursOuvresDepuisDernierePoussee).toBe(0);
  });

  it('borne le signal d’écart à la cadence à 1 (silence très supérieur au multiplicateur)', () => {
    // Deux poussées espacées d'1 h il y a ~20 jours : cadence médiane 1 h, silence ~480 h -> ratio énorme, borné.
    const [ligne] = CadencePousseesUtils.analyser(
      [Fixtures.activite('dev', [Fixtures.poussee(20, 10), Fixtures.poussee(20, 11)])],
      SEUILS,
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    );
    expect(ligne.alertes).toContain('ecartCadence');
    expect(ligne.alertes).toContain('inactivite');
    expect(ligne.scoreRisque).toBeLessThanOrEqual(1);
  });

  it('compte comme « en soirée » une poussée à 20 h UTC vue depuis Europe/Paris (plage circulaire 19 h → 7 h)', () => {
    const [ligne] = CadencePousseesUtils.analyser(
      [Fixtures.activite('nadia', [Fixtures.poussee(1, 20), Fixtures.poussee(2, 20)])],
      SEUILS,
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    );
    expect(ligne.partSoiree).toBe(1);
    expect(ligne.alertes).toContain('soiree');
  });

  it('ne compte pas comme « en soirée » une poussée de milieu de journée, dans deux fuseaux distincts', () => {
    for (const fuseauHoraire of ['Europe/Paris', 'America/New_York']) {
      const [ligne] = CadencePousseesUtils.analyser(
        [Fixtures.activite('dev', [Fixtures.poussee(1, 13), Fixtures.poussee(2, 13)])],
        { ...SEUILS, fuseauHoraire },
        CHEMINS,
        SANS_REGLE,
        MAINTENANT,
      );
      expect(ligne.partSoiree).toBe(0);
    }
  });

  it('bascule sur UTC sans lever quand le fuseau est invalide', () => {
    expect(() =>
      CadencePousseesUtils.analyser(
        [Fixtures.activite('dev', [Fixtures.poussee(1, 20), Fixtures.poussee(2, 20)])],
        { ...SEUILS, fuseauHoraire: 'Pas/UnFuseau' },
        CHEMINS,
        SANS_REGLE,
        MAINTENANT,
      ),
    ).not.toThrow();
  });

  it('rend le score de risque monotone : un silence plus long donne un score plus élevé', () => {
    const construireScore = (joursSilence: number): number => {
      const evenements = [
        Fixtures.poussee(joursSilence + 3, 10),
        Fixtures.poussee(joursSilence + 2, 10),
        Fixtures.poussee(joursSilence, 10),
      ];
      const [ligne] = CadencePousseesUtils.analyser(
        [Fixtures.activite('dev', evenements)],
        SEUILS,
        CHEMINS,
        SANS_REGLE,
        MAINTENANT,
      );
      return ligne.scoreRisque;
    };
    expect(construireScore(8)).toBeGreaterThan(construireScore(1));
  });

  it('neutralise un signal dont la pondération est nulle', () => {
    const evenements = [Fixtures.poussee(2, 20), Fixtures.poussee(3, 20), Fixtures.poussee(4, 20)];
    const avecSoiree = CadencePousseesUtils.analyser(
      [Fixtures.activite('dev', evenements)],
      SEUILS,
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    )[0];
    const sansSoiree = CadencePousseesUtils.analyser(
      [Fixtures.activite('dev', evenements)],
      { ...SEUILS, ponderationSoiree: 0 },
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    )[0];
    expect(sansSoiree.scoreRisque).toBeLessThan(avecSoiree.scoreRisque);
  });

  it('trie les lignes par score de risque décroissant, départage stable par username', () => {
    const lignes = CadencePousseesUtils.analyser(
      [
        Fixtures.activite('b-regulier', [
          Fixtures.poussee(5, 10),
          Fixtures.poussee(4, 10),
          Fixtures.poussee(3, 10),
          Fixtures.poussee(2, 10),
          Fixtures.poussee(1, 10),
        ]),
        Fixtures.activite('a-silencieux', [
          Fixtures.poussee(20, 10),
          Fixtures.poussee(18, 10),
          Fixtures.poussee(16, 10),
        ]),
        Fixtures.activite('c-regulier', [
          Fixtures.poussee(5, 10),
          Fixtures.poussee(4, 10),
          Fixtures.poussee(3, 10),
          Fixtures.poussee(2, 10),
          Fixtures.poussee(1, 10),
        ]),
      ],
      SEUILS,
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    );
    expect(lignes[0].username).toBe('a-silencieux');
    expect(lignes.slice(1).map((ligne) => ligne.username)).toEqual(['b-regulier', 'c-regulier']);
  });

  it('classe un développeur par une règle username, une règle email et une règle de domaine', () => {
    const regles: readonly RegleMembreConnu<StatutDeveloppeur>[] = [
      { critere: 'interne.login', typeCritere: 'username', statut: 'interne' },
      { critere: 'client@client.example', typeCritere: 'email', statut: 'client' },
      { critere: '*.partenaire.example', typeCritere: 'domaineEmail', statut: 'partenaire' },
    ];
    const lignes = CadencePousseesUtils.analyser(
      [
        Fixtures.activite('interne.login', [Fixtures.poussee(1, 10)]),
        Fixtures.activite('inconnu.email', [Fixtures.poussee(1, 10)], 'client@client.example'),
        Fixtures.activite(
          'inconnu.domaine',
          [Fixtures.poussee(1, 10)],
          'x@sous.partenaire.example',
        ),
        Fixtures.activite(
          'parfait.inconnu',
          [Fixtures.poussee(1, 10)],
          'personne@ailleurs.example',
        ),
      ],
      SEUILS,
      CHEMINS,
      regles,
      MAINTENANT,
    );
    const statutParUsername = new Map(lignes.map((ligne) => [ligne.username, ligne.statut]));
    expect(statutParUsername.get('interne.login')).toBe('interne');
    expect(statutParUsername.get('inconnu.email')).toBe('client');
    expect(statutParUsername.get('inconnu.domaine')).toBe('partenaire');
    expect(statutParUsername.get('parfait.inconnu')).toBe('inconnu');
  });

  it('ramène une issue « conflit de règles » à inconnu', () => {
    const regles: readonly RegleMembreConnu<StatutDeveloppeur>[] = [
      { critere: 'a@x.example', typeCritere: 'email', statut: 'interne' },
      { critere: 'a@x.example', typeCritere: 'email', statut: 'client' },
    ];
    const [ligne] = CadencePousseesUtils.analyser(
      [Fixtures.activite('ambigu', [Fixtures.poussee(1, 10)], 'a@x.example')],
      SEUILS,
      CHEMINS,
      regles,
      MAINTENANT,
    );
    expect(ligne.statut).toBe('inconnu');
  });

  it('exclut de la fenêtre les poussées trop anciennes', () => {
    const [ligne] = CadencePousseesUtils.analyser(
      [Fixtures.activite('dev', [Fixtures.poussee(2, 10), Fixtures.poussee(40, 10)])],
      SEUILS,
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    );
    expect(ligne.nombrePoussees).toBe(1);
  });

  it('gère une plage de soirée non circulaire (0 h → 6 h) et un dépôt hors table de correspondance', () => {
    const [ligne] = CadencePousseesUtils.analyser(
      [
        Fixtures.activite('dev', [
          {
            horodatage: Fixtures.poussee(1, 3).horodatage,
            projetId: 42,
            refPoussee: 'r',
            nombreCommits: 1,
          },
          {
            horodatage: Fixtures.poussee(2, 13).horodatage,
            projetId: 42,
            refPoussee: 'r',
            nombreCommits: 1,
          },
        ]),
      ],
      { ...SEUILS, heureDebutSoiree: 0, heureFinSoiree: 6, fuseauHoraire: 'UTC' },
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    );
    expect(ligne.partSoiree).toBe(0.5);
    expect(ligne.depotDernierePoussee).toBe('42');
  });

  it('rend un score nul quand les trois pondérations sont nulles', () => {
    const [ligne] = CadencePousseesUtils.analyser(
      [
        Fixtures.activite('dev', [
          Fixtures.poussee(10, 20),
          Fixtures.poussee(12, 20),
          Fixtures.poussee(14, 20),
        ]),
      ],
      { ...SEUILS, ponderationInactivite: 0, ponderationEcartCadence: 0, ponderationSoiree: 0 },
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    );
    expect(ligne.scoreRisque).toBe(0);
  });

  it('produit une ligne à score nul et « données insuffisantes » pour un membre sans aucune poussée visible', () => {
    const [ligne] = CadencePousseesUtils.analyser(
      [Fixtures.activite('sans-activite', [])],
      SEUILS,
      CHEMINS,
      SANS_REGLE,
      MAINTENANT,
    );
    expect(ligne.scoreRisque).toBe(0);
    expect(ligne.donneesInsuffisantes).toBe(true);
    expect(ligne.dernierePousseeIso).toBeNull();
    expect(ligne.alertes).toEqual([]);
  });
});
