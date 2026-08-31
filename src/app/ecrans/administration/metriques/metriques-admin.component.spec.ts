// Test de l'onglet Métriques de l'écran Administration (cf. metriques-admin.component.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { DonneesRacine, MetriquesVolumetrie } from '../../../services/avecetat/etat/types-donnees';
import { StatutMembre, TypeCritereMembre } from '../../../services/avecetat/etat/types-donnees';
import { SqmMetriquesAdminComponent } from './metriques-admin.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine peuplée : un groupe, deux projets, trois audits au total, deux règles de membre connu,
   * deux règles de dépendance.
   * @returns Une racine de test.
   */
  public static racinePeuplee(): DonneesRacine {
    const racine: DonneesRacine = {
      versionSchema: 10,
      meta: {
        creeLe: '2026-08-31T08:00:00Z',
        modifieLe: '2026-08-31T08:00:00Z',
        application: 'Test',
      },
      groupes: [
        {
          id: 'groupe-1',
          nom: 'Groupe',
          description: '',
          instances: [],
          membresConnus: [
            {
              id: 'm1',
              critere: 'jdupont',
              typeCritere: TypeCritereMembre.Username,
              statut: StatutMembre.Interne,
            },
            {
              id: 'm2',
              critere: 'exemple.fr',
              typeCritere: TypeCritereMembre.DomaineEmail,
              statut: StatutMembre.Client,
            },
          ],
          annotations: [],
          indicateursDesactives: [],
          projets: [
            {
              id: 'projet-1',
              nom: 'Projet 1',
              description: '',
              iaAutorisee: false,
              sources: [],
              annotations: [],
              audits: [
                { id: 'a1', date: '2026-01-01', campagneId: 'c1', resultats: [], typeAudit: 'reguliere' },
                { id: 'a2', date: '2026-02-01', campagneId: 'c2', resultats: [], typeAudit: 'reguliere' },
              ],
            },
            {
              id: 'projet-2',
              nom: 'Projet 2',
              description: '',
              iaAutorisee: false,
              sources: [],
              annotations: [],
              audits: [
                { id: 'a3', date: '2026-03-01', campagneId: 'c3', resultats: [], typeAudit: 'reguliere' },
              ],
            },
          ],
        },
      ],
      referentiels: {
        reglesDependances: [
          { id: 'd1', motif: 'com.example:*', versions: [] },
          { id: 'd2', motif: 'org.other:*', versions: [] },
        ],
        reglesMarqueursIA: [],
        motifNommageBranches: '^(main|develop)$',
        categoriesDependances: [],
      },
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
    return racine;
  }

  /**
   * Métriques plausibles renvoyées par la commande native simulée.
   * @param tailleDisqueOctets - Poids sur disque simulé (ou `null`).
   * @returns Des métriques dont les cinq postes totalisent `tailleJsonClairOctets`.
   */
  public static metriques(tailleDisqueOctets: number | null): MetriquesVolumetrie {
    return {
      tailleDisqueOctets,
      tailleJsonClairOctets: 1_000_000,
      ventilation: {
        parametrageOctets: 300_000,
        journalOctets: 100_000,
        administrationOctets: 250_000,
        auditsOctets: 200_000,
        autreOctets: 150_000,
      },
    };
  }
}

describe('SqmMetriquesAdminComponent', () => {
  let donneesApplication: DonneesApplicationService;
  let notification: NotificationService;

  beforeEach(async () => {
    invokeSimule.mockReset();
    invokeSimule.mockResolvedValue(DonneesDeTest.metriques(2_400_000));
    await TestBed.configureTestingModule({
      imports: [SqmMetriquesAdminComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racinePeuplee());
    notification = TestBed.inject(NotificationService);
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
  });

  it('dérive les cinq compteurs de la racine en mémoire', () => {
    const composant = TestBed.createComponent(SqmMetriquesAdminComponent).componentInstance;

    expect(composant.nombreGroupes()).toBe(1);
    expect(composant.nombreProjets()).toBe(2);
    expect(composant.nombreAudits()).toBe(3);
    expect(composant.nombreReglesMembre()).toBe(2);
    expect(composant.nombreReglesDependance()).toBe(2);
  });

  it('renseigne les métriques après un calcul réussi et invoque la bonne commande', async () => {
    const composant = TestBed.createComponent(SqmMetriquesAdminComponent).componentInstance;

    await composant.charger();

    expect(invokeSimule).toHaveBeenCalledWith('calculer_metriques_volumetrie', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: DonneesDeTest.racinePeuplee(),
    });
    expect(composant.metriques()).toEqual(DonneesDeTest.metriques(2_400_000));
    expect(composant.enCours()).toBe(false);
  });

  it('produit une ventilation dont les pourcentages totalisent 100', async () => {
    const composant = TestBed.createComponent(SqmMetriquesAdminComponent).componentInstance;
    await composant.charger();
    const ventilation = composant.metriques()?.ventilation;
    expect(ventilation).toBeDefined();
    if (!ventilation) {
      return;
    }

    const lignes = composant.lignesVentilation(ventilation);

    expect(lignes).toHaveLength(5);
    expect(lignes.reduce((total, ligne) => total + ligne.pourcentage, 0)).toBe(100);
  });

  it('affiche « — non sauvegardé » via une taille disque nulle', async () => {
    invokeSimule.mockResolvedValue(DonneesDeTest.metriques(null));
    const composant = TestBed.createComponent(SqmMetriquesAdminComponent).componentInstance;

    await composant.charger();

    expect(composant.metriques()?.tailleDisqueOctets).toBeNull();
  });

  it('notifie une erreur et laisse metriques() à null en cas d’échec de la commande', async () => {
    const erreurNotifiee = jest.spyOn(notification, 'erreur');
    invokeSimule.mockRejectedValue(new Error('échec simulé'));
    const composant = TestBed.createComponent(SqmMetriquesAdminComponent).componentInstance;

    await composant.charger();

    expect(erreurNotifiee).toHaveBeenCalled();
    expect(composant.metriques()).toBeNull();
    expect(composant.enCours()).toBe(false);
  });
});
