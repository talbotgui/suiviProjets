// Test de AlertesAccueilUtils (cf. alertes-accueil.utils.ts, RG-026), généré avec l'assistance de l'IA (Claude
// Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { AlertesAccueilUtils } from './alertes-accueil.utils';
import type { CauseAlerteActive, TraitementAlerteConnu } from './alertes-accueil.utils';

describe('AlertesAccueilUtils.calculerAlertesActives', () => {
  it('ne restitue aucune alerte en l’absence de toute cause active', () => {
    const resultat = AlertesAccueilUtils.calculerAlertesActives([], []);

    expect(resultat).toEqual([]);
  });

  it('restitue une cause active jamais traitée sans mention de traitement antérieur', () => {
    const causes: readonly CauseAlerteActive[] = [
      { cleAlerte: 'membreInconnu|projet-1|jdupont', libelle: 'Membre inconnu « jdupont »' },
    ];

    const resultat = AlertesAccueilUtils.calculerAlertesActives(causes, []);

    expect(resultat).toEqual([
      { cleAlerte: 'membreInconnu|projet-1|jdupont', libelle: 'Membre inconnu « jdupont »' },
    ]);
  });

  it('ne fait pas réapparaître une alerte traitée dont la cause a disparu au constat suivant', () => {
    // La cause n'est plus détectée par l'écran appelant (ex. le membre a été qualifié depuis) : elle n'apparaît
    // donc plus du tout parmi les causes actives, quel que soit l'historique de traitement conservé.
    const traitements: readonly TraitementAlerteConnu[] = [
      {
        cleAlerte: 'membreInconnu|projet-1|jdupont',
        traitee: true,
        horodatage: '2026-07-01T09:00:00Z',
        commentaire: 'Qualifié comme interne le 01/07.',
      },
    ];

    const resultat = AlertesAccueilUtils.calculerAlertesActives([], traitements);

    expect(resultat).toEqual([]);
  });

  it('fait réapparaître avec la mention du traitement antérieur une alerte traitée dont la cause persiste', () => {
    const causes: readonly CauseAlerteActive[] = [
      { cleAlerte: 'membreInconnu|projet-1|jdupont', libelle: 'Membre inconnu « jdupont »' },
    ];
    const traitements: readonly TraitementAlerteConnu[] = [
      {
        cleAlerte: 'membreInconnu|projet-1|jdupont',
        traitee: true,
        horodatage: '2026-07-01T09:00:00Z',
        commentaire: 'Investigation en cours, en attente de confirmation RH.',
      },
    ];

    const resultat = AlertesAccueilUtils.calculerAlertesActives(causes, traitements);

    expect(resultat).toEqual([
      {
        cleAlerte: 'membreInconnu|projet-1|jdupont',
        libelle: 'Membre inconnu « jdupont »',
        traitementAnterieur: {
          horodatage: '2026-07-01T09:00:00Z',
          commentaire: 'Investigation en cours, en attente de confirmation RH.',
        },
      },
    ]);
  });

  it('ne mentionne aucun traitement antérieur pour une cause seulement vue, jamais traitée', () => {
    const causes: readonly CauseAlerteActive[] = [
      { cleAlerte: 'membreInconnu|projet-1|jdupont', libelle: 'Membre inconnu « jdupont »' },
    ];
    const traitements: readonly TraitementAlerteConnu[] = [
      {
        cleAlerte: 'membreInconnu|projet-1|jdupont',
        traitee: false,
        horodatage: '2026-07-01T09:00:00Z',
      },
    ];

    const resultat = AlertesAccueilUtils.calculerAlertesActives(causes, traitements);

    expect(resultat).toEqual([
      { cleAlerte: 'membreInconnu|projet-1|jdupont', libelle: 'Membre inconnu « jdupont »' },
    ]);
  });

  it('retient l’entrée traitée la plus récente lorsque plusieurs entrées existent pour la même clé', () => {
    const causes: readonly CauseAlerteActive[] = [
      { cleAlerte: 'membreInconnu|projet-1|jdupont', libelle: 'Membre inconnu « jdupont »' },
    ];
    const traitements: readonly TraitementAlerteConnu[] = [
      {
        cleAlerte: 'membreInconnu|projet-1|jdupont',
        traitee: true,
        horodatage: '2026-06-01T09:00:00Z',
        commentaire: 'Ancien commentaire.',
      },
      {
        cleAlerte: 'membreInconnu|projet-1|jdupont',
        traitee: true,
        horodatage: '2026-07-01T09:00:00Z',
        commentaire: 'Commentaire le plus récent.',
      },
    ];

    const resultat = AlertesAccueilUtils.calculerAlertesActives(causes, traitements);

    expect(resultat).toEqual([
      {
        cleAlerte: 'membreInconnu|projet-1|jdupont',
        libelle: 'Membre inconnu « jdupont »',
        traitementAnterieur: {
          horodatage: '2026-07-01T09:00:00Z',
          commentaire: 'Commentaire le plus récent.',
        },
      },
    ]);
  });

  it('retient toujours l’entrée la plus récente même lorsqu’elle apparaît avant les autres dans l’historique', () => {
    const causes: readonly CauseAlerteActive[] = [
      { cleAlerte: 'membreInconnu|projet-1|jdupont', libelle: 'Membre inconnu « jdupont »' },
    ];
    const traitements: readonly TraitementAlerteConnu[] = [
      {
        cleAlerte: 'membreInconnu|projet-1|jdupont',
        traitee: true,
        horodatage: '2026-07-01T09:00:00Z',
        commentaire: 'Commentaire le plus récent.',
      },
      {
        cleAlerte: 'membreInconnu|projet-1|jdupont',
        traitee: true,
        horodatage: '2026-06-01T09:00:00Z',
        commentaire: 'Ancien commentaire.',
      },
    ];

    const resultat = AlertesAccueilUtils.calculerAlertesActives(causes, traitements);

    expect(resultat[0].traitementAnterieur).toEqual({
      horodatage: '2026-07-01T09:00:00Z',
      commentaire: 'Commentaire le plus récent.',
    });
  });

  it('conserve l’ordre des causes actives fournies en entrée et traite chaque clé indépendamment', () => {
    const causes: readonly CauseAlerteActive[] = [
      { cleAlerte: 'membreInconnu|projet-2|amartin', libelle: 'Membre inconnu « amartin »' },
      { cleAlerte: 'membreInconnu|projet-1|jdupont', libelle: 'Membre inconnu « jdupont »' },
    ];
    const traitements: readonly TraitementAlerteConnu[] = [
      {
        cleAlerte: 'membreInconnu|projet-1|jdupont',
        traitee: true,
        horodatage: '2026-07-01T09:00:00Z',
      },
    ];

    const resultat = AlertesAccueilUtils.calculerAlertesActives(causes, traitements);

    expect(resultat.map((alerte) => alerte.cleAlerte)).toEqual([
      'membreInconnu|projet-2|amartin',
      'membreInconnu|projet-1|jdupont',
    ]);
    expect(resultat[0].traitementAnterieur).toBeUndefined();
    expect(resultat[1].traitementAnterieur).toBeDefined();
  });
});
