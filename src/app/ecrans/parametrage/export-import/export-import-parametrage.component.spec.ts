// Test de la section Export/Import de configuration de l'écran Paramétrage (cf.
// export-import-parametrage.component.ts), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { DomTestUtils } from '../../../testing/dom-test.utils';
import { SqmExportImportParametrageComponent } from './export-import-parametrage.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));
jest.mock('@tauri-apps/plugin-dialog', () => ({ open: jest.fn(), save: jest.fn() }));

const invokeSimule = jest.mocked(invoke);
const isTauriSimule = jest.mocked(isTauri);
const saveSimule = jest.mocked(save);
const openSimule = jest.mocked(open);

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine minimale.
   * @returns Une racine de test.
   */
  public static racineVide(): DonneesRacine {
    return {
      versionSchema: 3,
      meta: {
        creeLe: '2026-07-28T08:00:00Z',
        modifieLe: '2026-07-28T08:00:00Z',
        application: 'Test',
      },
      groupes: [],
      referentiels: {
        reglesDependances: [],
        reglesMarqueursIA: [],
        motifNommageBranches: '^(main|develop)$',
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
  }
}

describe('SqmExportImportParametrageComponent', () => {
  let donneesApplication: DonneesApplicationService;

  beforeEach(async () => {
    invokeSimule.mockReset();
    isTauriSimule.mockReset().mockReturnValue(true);
    saveSimule.mockReset();
    openSimule.mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmExportImportParametrageComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
  });

  it('exporte la configuration au chemin choisi par la boîte de dialogue native', async () => {
    saveSimule.mockResolvedValue('/tmp/configuration.json');
    invokeSimule.mockResolvedValue(undefined);
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;

    await composant.exporter();

    expect(invokeSimule).toHaveBeenCalledWith('exporter_configuration', {
      chemin: '/tmp/configuration.json',
      donnees: DonneesDeTest.racineVide(),
    });
    const derniere = TestBed.inject(NotificationService).liste().at(-1);
    expect(derniere?.type).toBe('succes');
    expect(derniere?.message).toContain('exportée');
  });

  it("n'exporte rien si l'utilisateur annule la boîte de dialogue", async () => {
    saveSimule.mockResolvedValue(null);
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;

    await composant.exporter();

    expect(invokeSimule).not.toHaveBeenCalled();
  });

  it("affiche un message explicite quand l'export échoue", async () => {
    saveSimule.mockResolvedValue('/tmp/configuration.json');
    invokeSimule.mockRejectedValue({ type: 'erreurInterne' });
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;

    await composant.exporter();

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'erreur',
        message: "Une erreur inattendue est survenue lors de l'opération.",
      }),
    ]);
  });

  it('prévisualise un import et accepte par défaut toutes les lignes non identiques', async () => {
    openSimule.mockResolvedValue('/tmp/configuration.json');
    invokeSimule.mockResolvedValue({
      lignes: [
        {
          chemin: 'referentiels.reglesDependances/d1',
          categorie: 'modification',
          avant: 'a',
          apres: 'b',
        },
        { chemin: 'referentiels.reglesDependances/d2', categorie: 'ajout', apres: 'c' },
        {
          chemin: 'parametres.seuils.vitalite.mourantJours',
          categorie: 'identique',
          avant: 180,
          apres: 180,
        },
      ],
      lignesInvalides: [],
    });
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;

    await composant.choisirEtPrevisualiser();

    expect(invokeSimule).toHaveBeenCalledWith('previsualiser_import_configuration', {
      chemin: '/tmp/configuration.json',
      donnees: DonneesDeTest.racineVide(),
    });
    expect(composant.differentiel?.lignes.length).toBe(3);
    expect(composant.lignesAcceptees.has('referentiels.reglesDependances/d1')).toBe(true);
    expect(composant.lignesAcceptees.has('referentiels.reglesDependances/d2')).toBe(true);
    expect(composant.lignesAcceptees.has('parametres.seuils.vitalite.mourantJours')).toBe(false);
  });

  it('signale explicitement les lignes importées structurellement invalides, sans les proposer à l’acceptation', async () => {
    openSimule.mockResolvedValue('/tmp/configuration.json');
    invokeSimule.mockResolvedValue({
      lignes: [{ chemin: 'referentiels.reglesDependances/d2', categorie: 'ajout', apres: 'c' }],
      lignesInvalides: [
        {
          chemin: 'referentiels.motifNommageBranches',
          motif: 'le motif de nommage de branche soumis est invalide',
        },
      ],
    });
    const fixture = TestBed.createComponent(SqmExportImportParametrageComponent);
    const composant = fixture.componentInstance;

    await composant.choisirEtPrevisualiser();
    fixture.detectChanges();

    expect(composant.differentiel?.lignesInvalides).toHaveLength(1);
    expect(composant.lignesAcceptees.has('referentiels.motifNommageBranches')).toBe(false);
    const element = DomTestUtils.obtenirElementNatif(fixture);
    expect(element.textContent).toContain('referentiels.motifNommageBranches');
    expect(element.textContent).toContain('le motif de nommage de branche soumis est invalide');
  });

  it("n'appelle pas la commande native si l'utilisateur annule la sélection du fichier à importer", async () => {
    openSimule.mockResolvedValue(null);
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;

    await composant.choisirEtPrevisualiser();

    expect(invokeSimule).not.toHaveBeenCalled();
    expect(composant.differentiel).toBeNull();
  });

  it('affiche un message explicite quand la prévisualisation échoue et efface le différentiel courant', async () => {
    openSimule.mockResolvedValue('/tmp/configuration.json');
    invokeSimule.mockRejectedValue({ type: 'versionSchemaConfigurationSuperieure' });
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;

    await composant.choisirEtPrevisualiser();

    expect(TestBed.inject(NotificationService).liste().at(-1)).toEqual(
      expect.objectContaining({
        type: 'erreur',
        message: 'Ce fichier de configuration a été produit par une version plus récente de cette application.',
      }),
    );
    expect(composant.differentiel).toBeNull();
  });

  it('bascule une ligne acceptée, sans effet sur une ligne identique', async () => {
    openSimule.mockResolvedValue('/tmp/configuration.json');
    invokeSimule.mockResolvedValue({
      lignes: [
        { chemin: 'd1', categorie: 'ajout', apres: 'x' },
        { chemin: 'd2', categorie: 'identique', avant: 'y', apres: 'y' },
      ],
      lignesInvalides: [],
    });
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;
    await composant.choisirEtPrevisualiser();
    expect(composant.lignesAcceptees.has('d1')).toBe(true);

    composant.basculerLigne('d1');
    expect(composant.lignesAcceptees.has('d1')).toBe(false);
    composant.basculerLigne('d1');
    expect(composant.lignesAcceptees.has('d1')).toBe(true);

    composant.basculerLigne('d2');
    expect(composant.lignesAcceptees.has('d2')).toBe(false);
  });

  it('tout refuser puis tout accepter réinitialisent la sélection sur les lignes non identiques', async () => {
    openSimule.mockResolvedValue('/tmp/configuration.json');
    invokeSimule.mockResolvedValue({
      lignes: [
        { chemin: 'd1', categorie: 'ajout', apres: 'x' },
        { chemin: 'd2', categorie: 'modification', avant: 'y', apres: 'z' },
        { chemin: 'd3', categorie: 'identique', avant: 'y', apres: 'y' },
      ],
      lignesInvalides: [],
    });
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;
    await composant.choisirEtPrevisualiser();

    composant.toutRefuser();
    expect(composant.lignesAcceptees.size).toBe(0);

    composant.toutAccepter();
    expect(composant.lignesAcceptees).toEqual(new Set(['d1', 'd2']));
  });

  it("n'ouvre pas la ressaisie du mot de passe si aucune ligne n'est acceptée", async () => {
    openSimule.mockResolvedValue('/tmp/configuration.json');
    invokeSimule.mockResolvedValue({
      lignes: [{ chemin: 'd1', categorie: 'ajout', apres: 'x' }],
      lignesInvalides: [],
    });
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;
    await composant.choisirEtPrevisualiser();
    composant.toutRefuser();

    composant.demanderImport();

    expect(composant.importEnAttenteMotDePasse).toBe(false);
  });

  it('importe les lignes acceptées après confirmation du mot de passe, réinitialise la prévisualisation', async () => {
    openSimule.mockResolvedValue('/tmp/configuration.json');
    invokeSimule.mockResolvedValueOnce({
      lignes: [{ chemin: 'referentiels.reglesDependances/d1', categorie: 'ajout', apres: 'x' }],
      lignesInvalides: [],
    });
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;
    await composant.choisirEtPrevisualiser();
    composant.demanderImport();
    expect(composant.importEnAttenteMotDePasse).toBe(true);

    invokeSimule.mockResolvedValueOnce(DonneesDeTest.racineVide());
    await composant.confirmerImport('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith('importer_configuration', {
      chemin: '/tmp/donnees-test.sqm',
      donnees: DonneesDeTest.racineVide(),
      cheminConfiguration: '/tmp/configuration.json',
      cheminsAcceptes: ['referentiels.reglesDependances/d1'],
      motDePasse: 'mot-de-passe',
    });
    expect(composant.differentiel).toBeNull();
    expect(composant.importEnAttenteMotDePasse).toBe(false);
    const derniereNotification = TestBed.inject(NotificationService).liste().at(-1);
    expect(derniereNotification?.type).toBe('succes');
    expect(derniereNotification?.message).toContain('appliquée');
  });

  it("affiche un message explicite quand l'import échoue, sans effacer la prévisualisation", async () => {
    openSimule.mockResolvedValue('/tmp/configuration.json');
    invokeSimule.mockResolvedValueOnce({
      lignes: [{ chemin: 'd1', categorie: 'ajout', apres: 'x' }],
      lignesInvalides: [],
    });
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;
    await composant.choisirEtPrevisualiser();
    composant.demanderImport();

    invokeSimule.mockRejectedValueOnce({ type: 'ligneDifferentielInconnue' });
    await composant.confirmerImport('mot-de-passe');

    expect(TestBed.inject(NotificationService).liste().at(-1)).toEqual(
      expect.objectContaining({
        type: 'erreur',
        message: 'Le contenu du fichier a changé depuis la prévisualisation : recommencez.',
      }),
    );
    expect(composant.importEnAttenteMotDePasse).toBe(false);
    expect(composant.differentiel).not.toBeNull();
  });

  it("affiche un message explicite quand le mot de passe saisi diverge de la session à l'import (R10-01)", async () => {
    openSimule.mockResolvedValue('/tmp/configuration.json');
    invokeSimule.mockResolvedValueOnce({
      lignes: [{ chemin: 'd1', categorie: 'ajout', apres: 'x' }],
      lignesInvalides: [],
    });
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;
    await composant.choisirEtPrevisualiser();
    composant.demanderImport();

    invokeSimule.mockRejectedValueOnce({ type: 'motDePasseSessionDivergent' });
    await composant.confirmerImport('mauvais-mot-de-passe');

    expect(TestBed.inject(NotificationService).liste().at(-1)).toEqual(
      expect.objectContaining({
        type: 'erreur',
        message: 'Le mot de passe saisi ne correspond pas à celui de la session en cours.',
      }),
    );
  });

  it('annule la ressaisie du mot de passe sans modifier la prévisualisation', async () => {
    openSimule.mockResolvedValue('/tmp/configuration.json');
    invokeSimule.mockResolvedValue({
      lignes: [{ chemin: 'd1', categorie: 'ajout', apres: 'x' }],
      lignesInvalides: [],
    });
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;
    await composant.choisirEtPrevisualiser();
    composant.demanderImport();

    composant.annulerMotDePasse();

    expect(composant.importEnAttenteMotDePasse).toBe(false);
    expect(composant.differentiel).not.toBeNull();
  });

  it('annule la prévisualisation en cours', async () => {
    openSimule.mockResolvedValue('/tmp/configuration.json');
    invokeSimule.mockResolvedValue({
      lignes: [{ chemin: 'd1', categorie: 'ajout', apres: 'x' }],
      lignesInvalides: [],
    });
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;
    await composant.choisirEtPrevisualiser();

    composant.annulerImport();

    expect(composant.differentiel).toBeNull();
    expect(composant.lignesAcceptees.size).toBe(0);
  });

  it('met en forme les valeurs simples et complexes sans jamais lever', () => {
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;

    expect(composant.formaterValeur(undefined)).toBe('—');
    expect(composant.formaterValeur('texte')).toBe('texte');
    expect(composant.formaterValeur(42)).toBe('42');
    expect(composant.formaterValeur(true)).toBe('true');
    expect(composant.formaterValeur({ id: 'd1', motif: 'moment' })).toBe(
      '{"id":"d1","motif":"moment"}',
    );
  });

  it.each([
    ['ajout', 'Ajout'],
    ['modification', 'Modification'],
    ['identique', 'Identique'],
  ] as const)('traduit la catégorie « %s » en « %s »', (categorie, libelle) => {
    const composant = TestBed.createComponent(
      SqmExportImportParametrageComponent,
    ).componentInstance;

    expect(composant.libelleCategorie(categorie)).toBe(libelle);
  });
});
