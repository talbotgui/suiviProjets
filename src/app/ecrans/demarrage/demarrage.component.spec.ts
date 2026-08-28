// Test de l'écran de Démarrage (cf. demarrage.component.ts, US-001, US-002), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import { StatutMembre, TypeCritereMembre } from '../../services/avecetat/etat/types-donnees';
import type {
  Audit,
  DonneesRacine,
  Groupe,
  MembreConnu,
} from '../../services/avecetat/etat/types-donnees';
import { SqmDemarrageComponent } from './demarrage.component';

// `isTauri` toujours vrai ici : ce test exerce le passage réel par `invoke`/`save`/`open` (cf.
// `InvocationCommandeUtils`, `SelecteurFichierUtils`), les bouchons TS activés hors contexte Tauri étant couverts
// par leurs propres tests dédiés.
jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));
jest.mock('@tauri-apps/plugin-dialog', () => ({ open: jest.fn(), save: jest.fn() }));

const invokeSimule = jest.mocked(invoke);
const isTauriSimule = jest.mocked(isTauri);
const saveSimule = jest.mocked(save);
const openSimule = jest.mocked(open);

/**
 * Composant factice utilisé comme cible de route de test (même motif que `synthese-audits.component.spec.ts`) :
 * seul son enregistrement importe pour vérifier la navigation déclenchée par le composant sous test.
 */
@Component({ selector: 'app-composant-factice', template: '' })
class ComposantFactice {}

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine minimale mais complète.
   * @returns Une racine de test vide de tout groupe.
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
        reglesDependances: [],
        reglesMarqueursIA: [],
        motifNommageBranches: '',
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
  }

  /**
   * Racine avec un groupe et un projet dont le dernier audit signale un membre inconnu (RG-006 à RG-009).
   * @returns La racine construite.
   */
  public static racineAvecMembreInconnu(): DonneesRacine {
    const audit: Audit = {
      id: 'audit-1',
      date: '2026-07-27T08:00:00Z',
      campagneId: 'campagne-1',
      typeAudit: 'reguliere',
      resultats: [
        {
          type: 'gitlab.membres',
          sourceId: 'source-1',
          refEffective: 'main',
          shaTete: 'abc123',
          membres: [
            {
              username: 'inconnu',
              nom: 'Inconnu',
              niveauAcces: 30,
              direct: true,
              groupesInvites: [],
            },
          ],
        },
      ],
    };
    const groupe: Groupe = {
      id: 'groupe-1',
      nom: 'Groupe Test',
      description: '',
      instances: [],
      membresConnus: [],
      annotations: [],
      indicateursDesactives: [],
      projets: [
        {
          id: 'projet-1',
          nom: 'Projet Test',
          description: '',
          iaAutorisee: false,
          sources: [],
          annotations: [],
          audits: [audit],
        },
      ],
    };
    return { ...DonneesDeTest.racineVide(), groupes: [groupe] };
  }

  /**
   * Racine identique à {@link racineAvecMembreInconnu} mais dont le membre est désormais connu (aucune alerte).
   * @returns La racine construite.
   */
  public static racineSansAlerte(): DonneesRacine {
    const racine = DonneesDeTest.racineAvecMembreInconnu();
    const membreConnu: MembreConnu = {
      id: 'membre-1',
      critere: 'inconnu',
      typeCritere: TypeCritereMembre.Username,
      statut: StatutMembre.Interne,
    };
    return {
      ...racine,
      groupes: [{ ...racine.groupes[0], membresConnus: [membreConnu] }],
    };
  }
}

describe('SqmDemarrageComponent', () => {
  beforeEach(async () => {
    invokeSimule.mockReset();
    isTauriSimule.mockReturnValue(true);
    saveSimule.mockReset();
    openSimule.mockReset();
    await TestBed.configureTestingModule({
      imports: [SqmDemarrageComponent],
      providers: [provideRouter([{ path: '**', component: ComposantFactice }])],
    }).compileComponents();
  });

  /**
   * Crée et initialise un fixture du composant.
   * @returns Le fixture prêt à l'emploi.
   */
  function creerFixture(): ComponentFixture<SqmDemarrageComponent> {
    const fixture = TestBed.createComponent(SqmDemarrageComponent);
    fixture.detectChanges();
    return fixture;
  }

  describe('création (US-001)', () => {
    it("refuse de créer sans emplacement choisi et n'appelle pas la commande native", async () => {
      const fixture = creerFixture();

      await fixture.componentInstance.creerFichier();

      expect(fixture.componentInstance.messageErreurCreation()).toBe(
        'Choisissez un emplacement pour le nouveau fichier.',
      );
      expect(invokeSimule).not.toHaveBeenCalled();
    });

    it('refuse de créer si la confirmation ne correspond pas au mot de passe saisi', async () => {
      const fixture = creerFixture();
      saveSimule.mockResolvedValue('/tmp/nouveau.sqm');
      await fixture.componentInstance.choisirEmplacementCreation();
      fixture.componentInstance.motDePasseCreation.set('secret');
      fixture.componentInstance.confirmationMotDePasseCreation.set('autre');

      await fixture.componentInstance.creerFichier();

      expect(fixture.componentInstance.messageErreurCreation()).toBe(
        'La confirmation ne correspond pas au mot de passe saisi.',
      );
      expect(invokeSimule).not.toHaveBeenCalled();
    });

    it('crée le fichier et navigue vers Administration en cas de succès', async () => {
      const fixture = creerFixture();
      const router = TestBed.inject(Router);
      saveSimule.mockResolvedValue('/tmp/nouveau.sqm');
      invokeSimule.mockResolvedValue(DonneesDeTest.racineVide());
      await fixture.componentInstance.choisirEmplacementCreation();
      fixture.componentInstance.motDePasseCreation.set('secret');
      fixture.componentInstance.confirmationMotDePasseCreation.set('secret');

      await fixture.componentInstance.creerFichier();
      await fixture.whenStable();

      expect(invokeSimule).toHaveBeenCalledWith('creer_fichier', {
        chemin: '/tmp/nouveau.sqm',
        motDePasse: 'secret',
      });
      expect(router.url).toBe('/administration');
    });

    it("affiche un message d'erreur sans détail technique en cas de mot de passe incorrect", async () => {
      const fixture = creerFixture();
      saveSimule.mockResolvedValue('/tmp/nouveau.sqm');
      invokeSimule.mockRejectedValue({ type: 'fichierVerrouille' });
      await fixture.componentInstance.choisirEmplacementCreation();
      fixture.componentInstance.motDePasseCreation.set('secret');
      fixture.componentInstance.confirmationMotDePasseCreation.set('secret');

      await fixture.componentInstance.creerFichier();

      expect(fixture.componentInstance.messageErreurCreation()).toBe(
        'Le fichier est verrouillé par un autre processus.',
      );
    });
  });

  describe('chargement (US-002)', () => {
    it('refuse de charger sans fichier choisi', async () => {
      const fixture = creerFixture();

      await fixture.componentInstance.chargerFichier();

      expect(fixture.componentInstance.messageErreurChargement()).toBe(
        'Choisissez un fichier à charger.',
      );
      expect(invokeSimule).not.toHaveBeenCalled();
    });

    it('charge le fichier et navigue vers Synthèse des audits en l’absence d’alerte active', async () => {
      const fixture = creerFixture();
      const router = TestBed.inject(Router);
      openSimule.mockResolvedValue('/tmp/existant.sqm');
      invokeSimule.mockResolvedValue(DonneesDeTest.racineSansAlerte());
      await fixture.componentInstance.choisirFichierChargement();
      fixture.componentInstance.motDePasseChargement.set('secret');

      await fixture.componentInstance.chargerFichier();
      await fixture.whenStable();

      expect(invokeSimule).toHaveBeenCalledWith('charger_fichier', {
        chemin: '/tmp/existant.sqm',
        motDePasse: 'secret',
      });
      expect(router.url).toBe('/synthese-audits');
    });

    it('charge le fichier et navigue vers Liste de travail en présence d’un membre inconnu (RG-009)', async () => {
      const fixture = creerFixture();
      const router = TestBed.inject(Router);
      openSimule.mockResolvedValue('/tmp/existant.sqm');
      invokeSimule.mockResolvedValue(DonneesDeTest.racineAvecMembreInconnu());
      await fixture.componentInstance.choisirFichierChargement();
      fixture.componentInstance.motDePasseChargement.set('secret');

      await fixture.componentInstance.chargerFichier();
      await fixture.whenStable();

      expect(router.url).toBe('/liste-travail');
    });

    it("affiche un message d'erreur sans détail technique en cas de mot de passe incorrect", async () => {
      const fixture = creerFixture();
      openSimule.mockResolvedValue('/tmp/existant.sqm');
      invokeSimule.mockRejectedValue({ type: 'motDePasseOuFichierInvalide' });
      await fixture.componentInstance.choisirFichierChargement();
      fixture.componentInstance.motDePasseChargement.set('mauvais-mot-de-passe');

      await fixture.componentInstance.chargerFichier();

      expect(fixture.componentInstance.messageErreurChargement()).toBe(
        'Mot de passe incorrect ou fichier altéré.',
      );
      const donneesApplication = TestBed.inject(DonneesApplicationService);
      expect(donneesApplication.racine()).toBeNull();
    });

    it('ignore la sélection de fichier annulée par l’utilisateur (dialogue fermé sans choix)', async () => {
      const fixture = creerFixture();
      openSimule.mockResolvedValue(null);

      await fixture.componentInstance.choisirFichierChargement();

      expect(fixture.componentInstance.cheminChargement()).toBeNull();
    });
  });
});
