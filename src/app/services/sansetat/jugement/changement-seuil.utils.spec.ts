// Test de ChangementSeuilUtils (cf. changement-seuil.utils.ts, US-016), généré avec l'assistance de l'IA (Claude
// Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import type { EntreeJournalMinimale } from './changement-seuil.utils';
import { ChangementSeuilUtils } from './changement-seuil.utils';

/**
 * Journal de référence repris fidèlement de `docs/01_besoin/exemple-donnees.json` (quatre entrées connues) : une
 * seule concerne un seuil de couleur (`parametres.seuils.vitalite.mortJours`), les trois autres portent sur la
 * politique IA d'un projet, une qualification de membre et un import de référentiel de dépendances — aucune des
 * trois n'est un changement de seuil et ne doit donc jamais être retenue.
 */
const JOURNAL_EXEMPLE_DONNEES: readonly EntreeJournalMinimale[] = [
  {
    horodatage: '2026-05-15T09:30:00Z',
    objet: 'parametres.seuils.vitalite.mortJours',
    avant: null,
    apres: 365,
  },
  {
    horodatage: '2026-05-20T14:00:00Z',
    objet: 'projet:d0000000-0000-4000-8000-000000000004.iaAutorisee',
    avant: false,
    apres: true,
  },
  {
    horodatage: '2026-06-06T10:30:00Z',
    objet: 'groupe:a0000000-0000-4000-8000-000000000002.membresConnus',
    avant: null,
    apres: { critere: 'kbenali', typeCritere: 'username', statut: 'client' },
  },
  {
    horodatage: '2026-06-15T16:45:00Z',
    objet: 'referentiels.reglesDependances[moment]',
    avant: null,
    apres: { motif: 'moment', statut: 'obsolete' },
  },
];

describe('ChangementSeuilUtils', () => {
  describe('calculerChangementsSeuil', () => {
    it('ne retient, parmi le journal de référence, que l’unique entrée concernant un seuil de couleur', () => {
      const resultat = ChangementSeuilUtils.calculerChangementsSeuil(JOURNAL_EXEMPLE_DONNEES);

      expect(resultat).toHaveLength(1);
      expect(resultat[0]?.objet).toBe('parametres.seuils.vitalite.mortJours');
    });

    it('positionne la ligne verticale exactement à l’horodatage de l’entrée du journal', () => {
      const resultat = ChangementSeuilUtils.calculerChangementsSeuil(JOURNAL_EXEMPLE_DONNEES);

      expect(resultat[0]?.date).toBe('2026-05-15T09:30:00Z');
    });

    it('construit un libellé abrégeant le préfixe constant et restituant les valeurs avant/après', () => {
      const resultat = ChangementSeuilUtils.calculerChangementsSeuil(JOURNAL_EXEMPLE_DONNEES);

      expect(resultat[0]?.libelle).toBe('vitalite.mortJours : — → 365');
    });

    it('restitue un tableau vide quand le journal ne comporte aucun changement de seuil', () => {
      const journal: readonly EntreeJournalMinimale[] = JOURNAL_EXEMPLE_DONNEES.filter(
        (entree) => !entree.objet.startsWith('parametres.seuils.'),
      );

      expect(ChangementSeuilUtils.calculerChangementsSeuil(journal)).toEqual([]);
    });

    it('restitue un tableau vide quand le journal fourni est vide', () => {
      expect(ChangementSeuilUtils.calculerChangementsSeuil([])).toEqual([]);
    });

    it('trie les changements de seuil retenus de la plus ancienne à la plus récente modification', () => {
      const journal: readonly EntreeJournalMinimale[] = [
        {
          horodatage: '2026-07-01T00:00:00Z',
          objet: 'parametres.seuils.couverture.seuilRouge',
          avant: 30,
          apres: 40,
        },
        {
          horodatage: '2026-01-01T00:00:00Z',
          objet: 'parametres.seuils.couverture.seuilOrange',
          avant: 50,
          apres: 60,
        },
      ];

      const resultat = ChangementSeuilUtils.calculerChangementsSeuil(journal);

      expect(resultat.map((changement) => changement.objet)).toEqual([
        'parametres.seuils.couverture.seuilOrange',
        'parametres.seuils.couverture.seuilRouge',
      ]);
    });

    it('conserve l’ordre déjà croissant de deux changements de seuil déjà triés', () => {
      const journal: readonly EntreeJournalMinimale[] = [
        {
          horodatage: '2026-01-01T00:00:00Z',
          objet: 'parametres.seuils.couverture.seuilOrange',
          avant: 50,
          apres: 60,
        },
        {
          horodatage: '2026-07-01T00:00:00Z',
          objet: 'parametres.seuils.couverture.seuilRouge',
          avant: 30,
          apres: 40,
        },
      ];

      const resultat = ChangementSeuilUtils.calculerChangementsSeuil(journal);

      expect(resultat.map((changement) => changement.objet)).toEqual([
        'parametres.seuils.couverture.seuilOrange',
        'parametres.seuils.couverture.seuilRouge',
      ]);
    });

    it('restreint le résultat au préfixe fourni, pour ne retenir que les seuils pertinents pour un indicateur donné', () => {
      const journal: readonly EntreeJournalMinimale[] = [
        {
          horodatage: '2026-01-01T00:00:00Z',
          objet: 'parametres.seuils.couverture.seuilRouge',
          avant: 30,
          apres: 40,
        },
        {
          horodatage: '2026-02-01T00:00:00Z',
          objet: 'parametres.seuils.vitalite.mortJours',
          avant: 300,
          apres: 365,
        },
      ];

      const resultat = ChangementSeuilUtils.calculerChangementsSeuil(
        journal,
        'parametres.seuils.couverture',
      );

      expect(resultat).toHaveLength(1);
      expect(resultat[0]?.objet).toBe('parametres.seuils.couverture.seuilRouge');
    });

    it('met en forme une valeur avant/après complexe (objet) par sérialisation JSON, sans accès non sûr', () => {
      const journal: readonly EntreeJournalMinimale[] = [
        {
          horodatage: '2026-01-01T00:00:00Z',
          objet: 'parametres.seuils.mrOuvertes',
          avant: { ageOrangeJours: 30 },
          apres: { ageOrangeJours: 45 },
        },
      ];

      const resultat = ChangementSeuilUtils.calculerChangementsSeuil(journal);

      expect(resultat[0]?.libelle).toBe(
        'mrOuvertes : {"ageOrangeJours":30} → {"ageOrangeJours":45}',
      );
    });

    it('conserve le chemin complet quand `objet` ne porte pas le préfixe constant `parametres.seuils.`', () => {
      const journal: readonly EntreeJournalMinimale[] = [
        {
          horodatage: '2026-01-01T00:00:00Z',
          objet: 'seuils.couverture.seuilRouge',
          avant: 30,
          apres: 40,
        },
      ];

      const resultat = ChangementSeuilUtils.calculerChangementsSeuil(journal, 'seuils.couverture');

      expect(resultat[0]?.libelle).toBe('seuils.couverture.seuilRouge : 30 → 40');
    });

    it('conserve les deux entrées, sans erreur de tri, quand deux changements de seuil portent le même horodatage', () => {
      const journal: readonly EntreeJournalMinimale[] = [
        {
          horodatage: '2026-01-01T00:00:00Z',
          objet: 'parametres.seuils.couverture.seuilRouge',
          avant: 30,
          apres: 40,
        },
        {
          horodatage: '2026-01-01T00:00:00Z',
          objet: 'parametres.seuils.couverture.seuilOrange',
          avant: 50,
          apres: 60,
        },
      ];

      const resultat = ChangementSeuilUtils.calculerChangementsSeuil(journal);

      expect(resultat.map((changement) => changement.objet).sort()).toEqual([
        'parametres.seuils.couverture.seuilOrange',
        'parametres.seuils.couverture.seuilRouge',
      ]);
    });

    it('met en forme, par un texte de repli, une valeur non sérialisable en JSON (ex. une fonction)', () => {
      const journal: readonly EntreeJournalMinimale[] = [
        {
          horodatage: '2026-01-01T00:00:00Z',
          objet: 'parametres.seuils.exemple',
          avant: (): void => {
            // Valeur volontairement non sérialisable en JSON (JSON.stringify d'une fonction restitue `undefined`).
          },
          apres: 1,
        },
      ];

      const resultat = ChangementSeuilUtils.calculerChangementsSeuil(journal);

      expect(resultat[0]?.libelle).toBe('exemple : — → 1');
    });
  });
});
