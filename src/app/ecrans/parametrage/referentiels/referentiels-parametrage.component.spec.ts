// Test de la section Référentiels de l'écran Paramétrage (cf. referentiels-parametrage.component.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke } from '@tauri-apps/api/core';
import { DonneesApplicationService } from '../../../services/avecetat/etat/donnees-application.service';
import { EtatSessionService } from '../../../services/avecetat/etat/etat-session.service';
import { NotificationService } from '../../../services/avecetat/etat/notification.service';
import type { DonneesRacine } from '../../../services/avecetat/etat/types-donnees';
import { DomTestUtils } from '../../../testing/dom-test.utils';
import { SqmReferentielsParametrageComponent } from './referentiels-parametrage.component';

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

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
            categorie: 'cat-front',
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
        categoriesDependances: [{ id: 'cat-front', libelle: 'fmkFront', sigle: 'FMF' }],
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

  it('trie les règles de dépendances affichées par identifiant d’artefact sans réordonner le référentiel', () => {
    const base = DonneesDeTest.racineVide();
    const racine: DonneesRacine = {
      ...base,
      referentiels: {
        ...base.referentiels,
        reglesDependances: [
          { id: 'd-c', motif: 'org.springframework:*', versions: [] },
          { id: 'd-a', motif: 'CLAUDE.md', versions: [] },
          { id: 'd-b', motif: 'moment', versions: [] },
        ],
      },
    };
    donneesApplication.chargerRacine(racine);

    const fixture = TestBed.createComponent(SqmReferentielsParametrageComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.reglesDependancesTriees().map((regle) => regle.motif)).toEqual(
      ['CLAUDE.md', 'moment', 'org.springframework:*'],
    );
    expect(fixture.componentInstance.reglesDependances().map((regle) => regle.id)).toEqual([
      'd-c',
      'd-a',
      'd-b',
    ]);

    const libelles = Array.from(
      DomTestUtils.obtenirElementNatif(fixture).querySelectorAll(
        '#referentiels-parametrage-liste-dependances .referentiels-parametrage__ligne > span:first-child',
      ),
    ).map((element) => element.textContent?.trim());
    expect(libelles).toEqual(['CLAUDE.md', 'moment', 'org.springframework:*']);
  });

  it('distingue le moment de prise en compte des dépendances et des marqueurs IA (US-040)', () => {
    const fixture = TestBed.createComponent(SqmReferentielsParametrageComponent);
    fixture.detectChanges();
    const element = DomTestUtils.obtenirElementNatif(fixture);

    expect(element.textContent).toContain(
      "s'applique instantanément à l'ensemble de l'historique déjà intégré",
    );
    expect(element.textContent).toContain("S'applique uniquement aux prochains audits collectés");
  });

  it('ouvre le formulaire de dépendances pré-rempli en édition, ignore un identifiant introuvable', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    composant.ouvrirEditionDependance('id-inconnu');
    expect(composant.formulaireDependanceVisible()).toBe(false);

    composant.ouvrirEditionDependance('d1');
    expect(composant.formulaireDependanceVisible()).toBe(true);
    expect(composant.motifDependance).toBe('moment');
    expect(composant.versionsDependanceTexte).toBe('*=obsolete');
    expect(composant.categorieDependance).toBe('cat-front');

    composant.fermerFormulaireDependance();
    expect(composant.formulaireDependanceVisible()).toBe(false);
  });

  it('transmet la catégorie choisie à definirReferentiel et l’efface à la création (US-049)', async () => {
    invokeSimule.mockResolvedValue(DonneesDeTest.racineVide());
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    composant.ouvrirCreationDependance();
    expect(composant.categorieDependance).toBeNull();
    composant.motifDependance = 'lodash';
    composant.categorieDependance = 'cat-front';
    composant.demanderEnregistrementDependance();
    await composant.confirmerEnregistrementDependance('mot-de-passe');

    expect(invokeSimule.mock.calls[0]?.[0]).toBe('definir_referentiel');
    expect(invokeSimule.mock.calls[0]?.[1]).toMatchObject({
      typeReferentiel: 'reglesDependances',
      entree: { motif: 'lodash', categorie: 'cat-front' },
    });
  });

  it('n’envoie aucun attribut categorie quand aucune catégorie n’est choisie (US-049)', async () => {
    invokeSimule.mockResolvedValue(DonneesDeTest.racineVide());
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    composant.ouvrirCreationDependance();
    composant.motifDependance = 'lodash';
    composant.demanderEnregistrementDependance();
    await composant.confirmerEnregistrementDependance('mot-de-passe');

    const parametres = invokeSimule.mock.calls[0]?.[1];
    expect(parametres).toBeDefined();
    expect(parametres).toHaveProperty('entree.motif', 'lodash');
    expect(parametres).not.toHaveProperty('entree.categorie');
  });

  it('résout le libellé d’une catégorie, null pour une catégorie inconnue ou absente (US-049)', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    expect(composant.nomCategorie('cat-front')).toBe('fmkFront');
    expect(composant.nomCategorie('cat-supprimee')).toBeNull();
    expect(composant.nomCategorie(undefined)).toBeNull();
  });

  it('ouvre le formulaire de création de marqueur IA avec des valeurs par défaut, referme sans enregistrer', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    composant.ouvrirCreationMarqueurIa();

    expect(composant.marqueurIaEnEditionId).toBeNull();
    expect(composant.typeCorrespondanceMarqueurIa).toBe('exact');
    expect(composant.formulaireMarqueurIaVisible()).toBe(true);

    composant.fermerFormulaireMarqueurIa();
    expect(composant.formulaireMarqueurIaVisible()).toBe(false);
  });

  it('ignore une édition de marqueur IA désignant un identifiant introuvable', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    composant.ouvrirEditionMarqueurIa('id-inconnu');

    expect(composant.formulaireMarqueurIaVisible()).toBe(false);
  });

  it('bloque l’enregistrement d’une règle de marqueur IA sans motif ni outil', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirCreationMarqueurIa();

    composant.demanderEnregistrementMarqueurIa();

    expect(composant.messageErreur).toBe('Le motif et l’outil sont obligatoires.');
    expect(composant.actionEnAttenteMotDePasse()).toBeNull();
  });

  it('referme le formulaire du motif de nommage sans enregistrer', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirEditionMotifNommage();

    composant.fermerFormulaireMotifNommage();

    expect(composant.formulaireMotifNommageVisible()).toBe(false);
  });

  it.each([
    [
      'motifNommageBranchesInvalide',
      "Ce motif n'est pas une expression régulière valide, ou est vide.",
    ],
    ['typeReferentielInconnu', 'Ce type de référentiel est inconnu.'],
    [
      'motifDependanceDejaExistant',
      'Une règle de dépendances existe déjà pour ce motif : modifiez directement la règle existante plutôt que d’en créer une nouvelle.',
    ],
    [
      'libelleCategorieDependanceDejaExistant',
      'Une catégorie de dépendance porte déjà ce libellé : modifiez directement la catégorie existante plutôt que d’en créer une nouvelle.',
    ],
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

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({ type: 'erreur', message: messageAttendu }),
    ]);
  });

  it('bloque la création avec un motif vide', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirCreationDependance();

    composant.demanderEnregistrementDependance();

    expect(composant.messageErreur).toBe('Le motif est obligatoire.');
    expect(composant.actionEnAttenteMotDePasse()).toBeNull();
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

  it('crée une nouvelle règle de dépendances avec un identifiant généré (US-038 : notification de succès)', async () => {
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
    expect(composant.formulaireDependanceVisible()).toBe(false);
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'succes',
        message: 'La règle de dépendances a été ajoutée.',
      }),
    ]);
  });

  it('modifie une règle de marqueur IA existante en réutilisant son identifiant (US-038 : notification de succès)', async () => {
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
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'succes',
        message: 'La règle de marqueur IA a été modifiée.',
      }),
    ]);
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

  it('enregistre le motif de nommage valide après confirmation (US-038 : notification de succès)', async () => {
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
    expect(composant.formulaireMotifNommageVisible()).toBe(false);
    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'succes',
        message: 'Le motif de nommage des branches a été modifié.',
      }),
    ]);
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

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'erreur',
        message: "Cette entrée n'est pas valide : vérifiez les champs obligatoires.",
      }),
    ]);
  });

  // --- Recette Phase 15 : C15-10/RG-042 (motif dupliqué, rejet strict) ---

  it('bloque la création d’une règle de dépendances avec un motif déjà utilisé par une autre règle, sans appeler la commande native (RG-042)', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirCreationDependance();
    composant.motifDependance = 'moment';
    composant.versionsDependanceTexte = '4.*=maintenu';

    composant.demanderEnregistrementDependance();

    expect(composant.messageErreur).toContain('existe déjà');
    expect(composant.actionEnAttenteMotDePasse()).toBeNull();
    expect(invokeSimule).not.toHaveBeenCalled();
  });

  it('n’entrave pas la modification d’une règle de dépendances en conservant son propre motif inchangé (RG-042)', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirEditionDependance('d1');

    composant.demanderEnregistrementDependance();

    expect(composant.messageErreur).toBeNull();
    expect(composant.actionEnAttenteMotDePasse()).toBe('dependance');
  });

  // --- Recette Phase 15 : C15-11/RG-043 (avertissement non bloquant sur un statut inconnu) ---

  it('pose un avertissement non bloquant pour un statut hors des quatre valeurs connues, sans empêcher l’enregistrement (RG-043)', async () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirCreationDependance();
    composant.motifDependance = 'lodash';
    composant.versionsDependanceTexte = '4.*=statutInconnu';
    invokeSimule.mockResolvedValue(DonneesDeTest.racineVide());

    composant.demanderEnregistrementDependance();

    expect(composant.avertissementStatutInconnu).toContain(
      'statut hors des quatre valeurs reconnues',
    );
    expect(composant.actionEnAttenteMotDePasse()).toBe('dependance');

    await composant.confirmerEnregistrementDependance('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'definir_referentiel',
      expect.objectContaining({ typeReferentiel: 'reglesDependances' }),
    );
  });

  it('ne pose aucun avertissement pour un statut connu (RG-043)', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirCreationDependance();
    composant.motifDependance = 'lodash';
    composant.versionsDependanceTexte = '4.*=maintenu';

    composant.demanderEnregistrementDependance();

    expect(composant.avertissementStatutInconnu).toBeNull();
  });

  it('l’avertissement de statut inconnu est déclenché par comparaison sensible à la casse (« Obsolete », RG-043)', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirCreationDependance();
    composant.motifDependance = 'lodash';
    composant.versionsDependanceTexte = '4.*=Obsolete';

    composant.demanderEnregistrementDependance();

    expect(composant.avertissementStatutInconnu).not.toBeNull();
  });

  it('avertit, sans bloquer, quand la première borne n’est pas la version majeure la plus récente (relecture N1, RG-050)', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirCreationDependance();
    composant.motifDependance = 'org.springframework:*';
    composant.versionsDependanceTexte = '4.*=obsolete\n6.*=maintenu';

    composant.demanderEnregistrementDependance();

    expect(composant.avertissementOrdreVersions).toContain('numéro majeur le plus élevé');
    expect(composant.actionEnAttenteMotDePasse()).toBe('dependance');
  });

  it('ne pose aucun avertissement d’ordre quand la première borne porte le majeur le plus élevé (N1)', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    composant.ouvrirCreationDependance();
    composant.motifDependance = 'org.springframework:*';
    composant.versionsDependanceTexte = '6.*=maintenu\n4.*=obsolete\n*=obsolete';

    composant.demanderEnregistrementDependance();

    expect(composant.avertissementOrdreVersions).toBeNull();
  });

  // --- Recette Phase 15 : C15-12/US-045/RG-044 (borne de repli automatique) ---

  it('pré-remplit une nouvelle règle de dépendances d’une borne de repli « *=obsolete » (RG-044)', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    composant.ouvrirCreationDependance();

    expect(composant.versionsDependanceTexte).toBe('*=obsolete');
  });

  it('positionne la ligne spécifique pré-remplie depuis la Fiche projet avant la borne de repli « *=obsolete » (RG-044)', () => {
    const fixture = TestBed.createComponent(SqmReferentielsParametrageComponent);
    fixture.componentRef.setInput('motifPreselectionne', 'pkg-x');
    fixture.componentRef.setInput('versionPreselectionnee', '2.0.0');

    fixture.detectChanges();

    expect(fixture.componentInstance.motifDependance).toBe('pkg-x');
    expect(fixture.componentInstance.versionsDependanceTexte).toBe('2.0.0=\n*=obsolete');
  });

  it('ne duplique pas la borne de repli à l’édition d’une règle portant déjà une borne « * » avec un statut différent (RG-044)', () => {
    const racine = DonneesDeTest.racineVide();
    donneesApplication.chargerRacine({
      ...racine,
      referentiels: {
        ...racine.referentiels,
        reglesDependances: [
          { id: 'd2', motif: 'lodash', versions: [{ motifVersion: '*', statut: 'maintenu' }] },
        ],
      },
    });
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    composant.ouvrirEditionDependance('d2');

    expect(composant.versionsDependanceTexte).toBe('*=maintenu');
  });

  it('ajoute automatiquement une borne de repli en dernière position à l’édition d’une règle n’en portant aucune (RG-044)', () => {
    const racine = DonneesDeTest.racineVide();
    donneesApplication.chargerRacine({
      ...racine,
      referentiels: {
        ...racine.referentiels,
        reglesDependances: [
          { id: 'd3', motif: 'express', versions: [{ motifVersion: '4.*', statut: 'maintenu' }] },
        ],
      },
    });
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    composant.ouvrirEditionDependance('d3');

    expect(composant.versionsDependanceTexte).toBe('4.*=maintenu\n*=obsolete');
  });

  it('demande puis annule la suppression d’une règle de dépendances sans appeler la commande native (US-033, RG-035)', () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;

    composant.demanderSuppressionDependance('d1');
    expect(composant.suppressionEnAttente()).toEqual({ type: 'dependance', id: 'd1' });

    composant.annulerSuppression();
    expect(composant.suppressionEnAttente()).toBeNull();
    expect(invokeSimule).not.toHaveBeenCalled();
  });

  it('supprime une règle de dépendances après confirmation puis ressaisie du mot de passe (US-033, RG-035)', async () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    invokeSimule.mockResolvedValue(DonneesDeTest.racineVide());

    composant.demanderSuppressionDependance('d1');
    composant.confirmerSuppression();
    expect(composant.actionEnAttenteMotDePasse()).toBe('suppressionDependance');
    await composant.confirmerSuppressionMotDePasse('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'supprimer_regle_dependance',
      expect.objectContaining({ id: 'd1', motDePasse: 'mot-de-passe' }),
    );
    expect(composant.suppressionEnAttente()).toBeNull();
    expect(composant.actionEnAttenteMotDePasse()).toBeNull();
  });

  it('supprime une règle de marqueur IA après confirmation puis ressaisie du mot de passe (US-033, RG-035)', async () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    invokeSimule.mockResolvedValue(DonneesDeTest.racineVide());

    composant.demanderSuppressionMarqueurIa('m1');
    composant.confirmerSuppression();
    expect(composant.actionEnAttenteMotDePasse()).toBe('suppressionMarqueurIA');
    await composant.confirmerSuppressionMotDePasse('mot-de-passe');

    expect(invokeSimule).toHaveBeenCalledWith(
      'supprimer_regle_marqueur_ia',
      expect.objectContaining({ id: 'm1', motDePasse: 'mot-de-passe' }),
    );
  });

  it('convertit un rejet typé « entreeReferentielIntrouvable » en message explicite à la suppression', async () => {
    const composant = TestBed.createComponent(
      SqmReferentielsParametrageComponent,
    ).componentInstance;
    invokeSimule.mockRejectedValue({ type: 'entreeReferentielIntrouvable' });

    composant.demanderSuppressionDependance('d1');
    composant.confirmerSuppression();
    await composant.confirmerSuppressionMotDePasse('mot-de-passe');

    expect(TestBed.inject(NotificationService).liste()).toEqual([
      expect.objectContaining({
        type: 'erreur',
        message: "Cette entrée de référentiel n'existe plus (peut-être déjà supprimée).",
      }),
    ]);
    expect(composant.suppressionEnAttente()).toBeNull();
  });
});
