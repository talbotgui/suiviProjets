// Test de la section Référentiels de l'écran Paramétrage (cf. referentiels-parametrage.component.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { SqmReferentielsParametrageComponent } from './referentiels-parametrage.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));

const invokeSimule = jest.mocked(invoke);

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine minimale avec un référentiel de dépendances et de marqueurs IA connus.
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
      referentiels: {
        reglesDependances: [
          {
            id: 'd1',
            motif: 'moment',
            versions: [{ motifVersion: '*', statut: 'obsolete' }],
          },
        ],
        reglesMarqueursIA: [
          {
            id: 'm1',
            motif: 'CLAUDE.md',
            typeCorrespondance: 'exact',
            portee: 'racine',
            nature: 'fichier',
            outil: 'claude',
          },
        ],
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
        audit: {},
        proxy: {},
        sauvegarde: {},
      },
      campagnes: [],
      brouillon: null,
      traitementsAlertes: [],
      journal: [],
      vuesEnregistrees: [],
    };
  }
}

describe('SqmReferentielsParametrageComponent', () => {
  let donneesApplication: DonneesApplicationService;

  beforeEach(async () => {
    invokeSimule.mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmReferentielsParametrageComponent],
    }).compileComponents();
    donneesApplication = TestBed.inject(DonneesApplicationService);
    donneesApplication.chargerRacine(DonneesDeTest.racineVide());
    TestBed.inject(EtatSessionService).ouvrirFichier('/tmp/donnees-test.sqm');
  });

  it('affiche les règles de dépendances et de marqueurs IA déjà chargées', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    expect(composant.reglesDependances()).toHaveLength(1);
    expect(composant.reglesMarqueursIA()).toHaveLength(1);
    expect(composant.motifNommageBranchesActuel()).toBe('^(main|develop)$');
  });

  it('ouvre le formulaire de dépendances pré-rempli en édition, ignore un identifiant introuvable', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    composant.ouvrirEditionDependance('id-inconnu');
    expect(composant.formulaireDependanceVisible).toBe(false);

    composant.ouvrirEditionDependance('d1');
    expect(composant.formulaireDependanceVisible).toBe(true);
    expect(composant.motifDependance).toBe('moment');
    expect(composant.versionsDependanceTexte).toBe('*=obsolete');

    composant.fermerFormulaireDependance();
    expect(composant.formulaireDependanceVisible).toBe(false);
  });

  it('ouvre le formulaire de création de marqueur IA avec des valeurs par défaut, referme sans enregistrer', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    composant.ouvrirCreationMarqueurIa();

    expect(composant.marqueurIaEnEditionId).toBeNull();
    expect(composant.typeCorrespondanceMarqueurIa).toBe('exact');
    expect(composant.formulaireMarqueurIaVisible).toBe(true);

    composant.fermerFormulaireMarqueurIa();
    expect(composant.formulaireMarqueurIaVisible).toBe(false);
  });

  it('ignore une édition de marqueur IA désignant un identifiant introuvable', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    composant.ouvrirEditionMarqueurIa('id-inconnu');

    expect(composant.formulaireMarqueurIaVisible).toBe(false);
  });

  it('bloque l’enregistrement d’une règle de marqueur IA sans motif ni outil', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirCreationMarqueurIa();

    composant.demanderEnregistrementMarqueurIa();

    expect(composant.messageErreur).toBe('Le motif et l’outil sont obligatoires.');
    expect(composant.actionEnAttenteMotDePasse).toBeNull();
  });

  it('referme le formulaire du motif de nommage sans enregistrer', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirEditionMotifNommage();

    composant.fermerFormulaireMotifNommage();

    expect(composant.formulaireMotifNommageVisible).toBe(false);
  });

  it.each([
    [
      'motifNommageBranchesInvalide',
      "Ce motif n'est pas une expression régulière valide, ou est vide.",
    ],
    ['typeReferentielInconnu', 'Ce type de référentiel est inconnu.'],
    ['motDePasseOuFichierInvalide', 'Mot de passe incorrect.'],
    ['fichierVerrouille', 'Le fichier de données est verrouillé par un autre processus.'],
    ['sessionVerrouillee', 'La session est verrouillée : déverrouillez-la avant de sauvegarder.'],
    [
      'motDePasseSessionDivergent',
      'Le mot de passe saisi ne correspond pas à celui de la session en cours.',
    ],
    ['erreurInterne', "Une erreur inattendue est survenue lors de l'enregistrement."],
  ] as const)('traduit l’anomalie « %s » en message explicite', async (type, messageAttendu) => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirEditionMotifNommage();
    composant.motifNommageBranchesFormulaire = '^feature/.+$';
    invokeSimule.mockRejectedValue({ type });

    composant.demanderEnregistrementMotifNommage();
    await composant.confirmerEnregistrementMotifNommage('mot-de-passe');

    expect(composant.messageErreur).toBe(messageAttendu);
  });

  it('bloque la création avec un motif vide', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirCreationDependance();

    composant.demanderEnregistrementDependance();

    expect(composant.messageErreur).toBe('Le motif est obligatoire.');
    expect(composant.actionEnAttenteMotDePasse).toBeNull();
  });

  it('bloque la création avec une ligne de version malformée', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirCreationDependance();
    composant.motifDependance = 'moment';
    composant.versionsDependanceTexte = 'ligne-sans-egal';

    composant.demanderEnregistrementDependance();

    expect(composant.messageErreur).toContain('motifVersion=statut');
  });

  it('crée une nouvelle règle de dépendances avec un identifiant généré', async () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirCreationDependance();
    composant.motifDependance = 'org.springframework:*';
    composant.versionsDependanceTexte = '4.*=obsolete\n5.3.*=maintenu';
    invokeSimule.mockResolvedValue(DonneesDeTest.racineVide());

    composant.demanderEnregistrementDependance();
    await composant.confirmerEnregistrementDependance('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_referentiel',
      expect.objectContaining({ typeReferentiel: 'reglesDependances' }),
    );
    const parametresAppel = invokeSimule.mock.calls[0]?.[1];
    expect(parametresAppel).toMatchObject({
      entree: {
        motif: 'org.springframework:*',
        versions: [
          { motifVersion: '4.*', statut: 'obsolete' },
          { motifVersion: '5.3.*', statut: 'maintenu' },
        ],
      },
    });
    expect(composant.formulaireDependanceVisible).toBe(false);
  });

  it('modifie une règle de marqueur IA existante en réutilisant son identifiant', async () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirEditionMarqueurIa('m1');
    expect(composant.motifMarqueurIa).toBe('CLAUDE.md');
    composant.outilMarqueurIa = 'claude-code';
    invokeSimule.mockResolvedValue(DonneesDeTest.racineVide());

    composant.demanderEnregistrementMarqueurIa();
    await composant.confirmerEnregistrementMarqueurIa('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_referentiel',
      expect.objectContaining({ typeReferentiel: 'reglesMarqueursIA' }),
    );
    const parametresAppel = invokeSimule.mock.calls[0]?.[1];
    expect(parametresAppel).toMatchObject({ entree: { id: 'm1', outil: 'claude-code' } });
  });

  it('bloque le motif de nommage vide', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirEditionMotifNommage();
    composant.motifNommageBranchesFormulaire = '   ';

    composant.demanderEnregistrementMotifNommage();

    expect(composant.messageErreur).toBe('Le motif de nommage ne peut pas être vide.');
  });

  it('bloque le motif de nommage syntaxiquement invalide sans appeler la commande native', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirEditionMotifNommage();
    composant.motifNommageBranchesFormulaire = '[';

    composant.demanderEnregistrementMotifNommage();

    expect(composant.messageErreur).toContain('expression régulière');
    expect(invokeSimule).not.toHaveBeenCalled();
  });

  it('enregistre le motif de nommage valide après confirmation', async () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirEditionMotifNommage();
    composant.motifNommageBranchesFormulaire = '^feature/.+$';
    invokeSimule.mockResolvedValue(DonneesDeTest.racineVide());

    composant.demanderEnregistrementMotifNommage();
    await composant.confirmerEnregistrementMotifNommage('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_referentiel',
      expect.objectContaining({ typeReferentiel: 'motifNommageBranches', entree: '^feature/.+$' }),
    );
    expect(composant.formulaireMotifNommageVisible).toBe(false);
  });

  it('convertit un rejet typé « entreeReferentielInvalide » en message explicite', async () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirCreationDependance();
    composant.motifDependance = 'moment';
    invokeSimule.mockRejectedValue({ type: 'entreeReferentielInvalide' });

    composant.demanderEnregistrementDependance();
    await composant.confirmerEnregistrementDependance('mot-de-passe');

    expect(composant.messageErreur).toBe(
      "Cette entrée n'est pas valide : vérifiez les champs obligatoires.",
    );
  });
});
