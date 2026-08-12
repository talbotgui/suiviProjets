// Test du sous-onglet Annotations de l'écran Administration (cf. annotations-groupe-admin.component.ts, US-019,
// RG-033, Phase 10 incrément 8), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../../../services/avecetat/etat/notification.service';
import type { Annotation, DonneesRacine } from '../../../../services/avecetat/etat/types-donnees';
import { SqmAnnotationsGroupeAdminComponent } from './annotations-groupe-admin.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine minimale, vide de tout groupe.
   * @returns Une racine de test.
   */
  public static racineVide(): DonneesRacine {
    return {
      versionSchema: 1,
      meta: {
        creeLe: '2026-07-20T08:00:00Z',
        modifieLe: '2026-07-20T08:00:00Z',
        application: 'Test',
      },
      groupes: [],
      referentiels: { reglesDependances: [], reglesMarqueursIA: [], motifNommageBranches: '' },
      parametres: {
        seuils: {
          vitalite: { mourantJours: 180, mortJours: 365 },
          tailleDepot: { borneS: 20_000_000, borneL: 100_000_000, borneXL: 500_000_000 },
          couverture: { seuilRouge: 40, seuilOrange: 60 },
          fraicheurSonar: { toleranceJours: 7 },
          activiteSansQualite: { minCommits: 20, minNouvellesViolations: 10 },
          fraicheurAudit: { ancienJours: 30 },
          mrOuvertes: { ageOrangeJours: 30, ageRougeJours: 90, pourcentageConflitRouge: 50 },
          couleursViolations: {
            bloquant: { seuilOrange: 1, seuilRouge: 3 },
            critique: { seuilOrange: 10, seuilRouge: 25 },
          },
          materialiteBrouillon: { variationRelative: 0.1 },
        },
        verrouillage: { delaiInactiviteMinutes: 15, echecsAvantFermeture: 5 },
        audit: { concurrence: 4 },
        proxy: {},
        sauvegarde: { nombreSauvegardesSecurite: 5 },
        seuilAvertissementTailleOctets: 10_485_760,
      },
      campagnes: [],
      brouillon: null,
      traitementsAlertes: [],
      journal: [],
      vuesEnregistrees: [],
    };
  }

  /**
   * Construit une annotation de test.
   * @param id - Identifiant de l'annotation.
   * @param systeme - Indique une annotation système, non supprimable.
   * @returns Une annotation de test.
   */
  public static annotation(id: string, systeme = false): Annotation {
    return {
      id,
      date: '2026-07-27',
      libelle: 'Rupture de charge',
      categorie: 'incident',
      systeme: systeme ? true : undefined,
    };
  }

  /**
   * Racine actuellement chargée dans le Store, sans recourir à une assertion de non-nullité (interdite par les
   * normes de développement du projet).
   * @param donneesApplication - Store d'état applicatif dont la racine est attendue.
   * @returns La racine actuellement chargée.
   */
  public static racineActuelle(donneesApplication: DonneesApplicationService): DonneesRacine {
    const racine = donneesApplication.racine();
    if (!racine) {
      throw new Error('racine attendue pour ce test');
    }
    return racine;
  }
}

describe('SqmAnnotationsGroupeAdminComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let composant: SqmAnnotationsGroupeAdminComponent;
  let groupeId: string;

  beforeEach(async () => {
    invokeSimule.mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmAnnotationsGroupeAdminComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    groupeId = donneesApplication.creerGroupe({
      nom: 'Socle Comptable',
      description: '',
      instances: [],
    });
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
    composant = TestBed.createComponent(SqmAnnotationsGroupeAdminComponent).componentInstance;
  });

  it("n'affiche aucune annotation tant qu'aucun groupe n'est sélectionné", () => {
    expect(composant.annotations()).toEqual([]);
  });

  it('affiche les annotations du groupe sélectionné', () => {
    const racineAvecAnnotation: DonneesRacine = {
      ...DonneesDeTest.racineActuelle(donneesApplication),
      groupes: DonneesDeTest.racineActuelle(donneesApplication).groupes.map((g) =>
        g.id === groupeId ? { ...g, annotations: [DonneesDeTest.annotation('a1')] } : g,
      ),
    };
    donneesApplication.chargerRacine(racineAvecAnnotation);

    composant.selectionnerGroupe(groupeId);

    expect(composant.annotations()).toHaveLength(1);
  });

  it('refuse la création sans date ni libellé', () => {
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.date = '';
    composant.libelle = '';

    composant.demanderCreation();

    expect(composant.messageErreur).toBe('La date et le libellé sont obligatoires.');
    expect(composant.actionEnAttenteMotDePasse()).toBeNull();
  });

  it('crée une annotation de portée groupe après confirmation du mot de passe (projetId omis, US-038 : notification de succès)', async () => {
    invokeSimule.mockResolvedValue(DonneesDeTest.racineActuelle(donneesApplication));
    composant.selectionnerGroupe(groupeId);
    composant.ouvrirCreation();
    composant.libelle = 'Rupture de charge';
    composant.categorie = 'incident';

    composant.demanderCreation();
    expect(composant.actionEnAttenteMotDePasse()).toBe('creation');
    await composant.confirmerCreation('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'creer_annotation',
      expect.objectContaining({ groupeId, projetId: undefined, libelle: 'Rupture de charge' }),
    );
    expect(composant.formulaireVisible()).toBe(false);
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'succes', message: "L'annotation a été créée." }),
    ]);
  });

  it('supprime une annotation après confirmation puis ressaisie du mot de passe (US-019, RG-033)', async () => {
    const racineAvecAnnotation: DonneesRacine = {
      ...DonneesDeTest.racineActuelle(donneesApplication),
      groupes: DonneesDeTest.racineActuelle(donneesApplication).groupes.map((g) =>
        g.id === groupeId ? { ...g, annotations: [DonneesDeTest.annotation('a1')] } : g,
      ),
    };
    donneesApplication.chargerRacine(racineAvecAnnotation);
    composant.selectionnerGroupe(groupeId);
    invokeSimule.mockResolvedValue(racineAvecAnnotation);

    composant.demanderSuppression('a1');
    expect(composant.annotationASupprimerId()).toBe('a1');
    composant.confirmerSuppression();
    expect(composant.actionEnAttenteMotDePasse()).toBe('suppression');
    await composant.confirmerSuppressionMotDePasse('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'supprimer_annotation',
      expect.objectContaining({ groupeId, projetId: undefined, annotationId: 'a1' }),
    );
    expect(composant.annotationASupprimerId()).toBeNull();
  });

  it('convertit un rejet typé « annotationSystemeNonSupprimable » en message explicite', async () => {
    composant.selectionnerGroupe(groupeId);
    invokeSimule.mockRejectedValue({ type: 'annotationSystemeNonSupprimable' });

    composant.demanderSuppression('a1');
    composant.confirmerSuppression();
    await composant.confirmerSuppressionMotDePasse('mot-de-passe');

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'erreur',
        message: 'Cette annotation système ne peut pas être supprimée.',
      }),
    ]);
  });
});
