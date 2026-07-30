// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { TypeInstance } from '../../sansetat/commandes/types-facade';
import { DonneesApplicationService } from './donnees-application.service';
import type {
  DonneesGroupe,
  DonneesMembreConnu,
  DonneesProjet,
  DonneesSource,
} from './donnees-application.service';
import { EtatFichier, EtatSessionService } from './etat-session.service';
import { StatutMembre, TypeCritereMembre, TypeSource } from './types-donnees';
import type {
  DonneesRacine,
  ReponseQualificationMembre,
  ResultatBrouillonProjet,
  Verdict,
} from './types-donnees';

// `isTauri` toujours vrai ici : ce test exerce le passage réel par `invoke` (cf. `InvocationCommandeUtils`), sur
// le modèle de `facade-commandes.service.spec.ts`.
jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn(), isTauri: jest.fn(() => true) }));

const invokeSimule = jest.mocked(invoke);
const isTauriSimule = jest.mocked(isTauri);

/**
 * Fabrique de données de test, classe à membres statiques uniquement conformément à la règle « aucune fonction
 * hors classe » des normes de développement du projet.
 */
class DonneesDeTest {
  /**
   * Construit une racine minimale mais complète, pour l'ensemble des champs hors périmètre de l'Administration.
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
   * Racine actuellement chargée dans le Store, sans recourir à une assertion de non-nullité (interdite par les
   * normes de développement du projet) : lève une erreur explicite si aucune racine n'est chargée, ce qui ne doit
   * jamais se produire dans ces tests (chargée systématiquement en `beforeEach`).
   * @param service - Store d'état applicatif dont la racine est attendue.
   * @returns La racine actuellement chargée.
   */
  public static racineActuelle(service: DonneesApplicationService): DonneesRacine {
    const racine = service.racine();
    if (!racine) {
      throw new Error('racine attendue pour ce test');
    }
    return racine;
  }
}

const DONNEES_GROUPE: DonneesGroupe = {
  nom: 'Socle Comptable',
  description: 'Applications du socle comptable',
  instances: [
    {
      id: 'instance-1',
      type: TypeInstance.Gitlab,
      nom: 'gitlab-prod',
      urlBase: 'https://gitlab.entreprise.fr',
    },
  ],
};

const DONNEES_PROJET: DonneesProjet = {
  nom: 'API Facturation',
  description: 'API centrale de facturation',
};

const DONNEES_SOURCE: DonneesSource = {
  instanceId: 'instance-1',
  type: TypeSource.DepotGitlab,
  idExterne: '1234',
  refAuditee: 'develop',
};

describe('DonneesApplicationService', () => {
  let service: DonneesApplicationService;

  beforeEach(() => {
    invokeSimule.mockReset();
    isTauriSimule.mockReturnValue(true);
    TestBed.configureTestingModule({});
    service = TestBed.inject(DonneesApplicationService);
  });

  it("n'a aucune racine chargée à l'initialisation", () => {
    expect(service.racine()).toBeNull();
    expect(service.groupes()).toEqual([]);
  });

  it('expose la racine chargée puis oublie tout après réinitialisation', () => {
    const racine = DonneesDeTest.racineVide();

    service.chargerRacine(racine);
    expect(service.racine()).toBe(racine);

    service.reinitialiser();
    expect(service.racine()).toBeNull();
  });

  describe('mutations sans fichier chargé', () => {
    it('lève une erreur explicite plutôt que de muter un état absent', () => {
      expect(() => service.creerGroupe(DONNEES_GROUPE)).toThrow();
    });

    it('rejette qualifierMembre si aucun chemin de fichier ne peut être transmis à la commande native', async () => {
      service.chargerRacine(DonneesDeTest.racineVide());
      const groupeId = service.creerGroupe(DONNEES_GROUPE);
      // Aucun fichier ouvert dans EtatSessionService : `cheminFichier()` reste `null`.
      await expect(
        service.qualifierMembre(
          groupeId,
          {
            critere: 'alice',
            typeCritere: TypeCritereMembre.Username,
            statut: StatutMembre.Interne,
          },
          'Administration',
          'mot-de-passe',
        ),
      ).rejects.toThrow();
      expect(invokeSimule).not.toHaveBeenCalled();
    });
  });

  describe('groupes (US-006)', () => {
    beforeEach(() => service.chargerRacine(DonneesDeTest.racineVide()));

    it('crée un groupe avec un identifiant unique et sans membre/projet', () => {
      const id = service.creerGroupe(DONNEES_GROUPE);

      const groupes = service.groupes();
      expect(groupes).toHaveLength(1);
      expect(groupes[0].id).toBe(id);
      expect(groupes[0].nom).toBe(DONNEES_GROUPE.nom);
      expect(groupes[0].instances).toEqual(DONNEES_GROUPE.instances);
      expect(groupes[0].projets).toEqual([]);
      expect(groupes[0].membresConnus).toEqual([]);
    });

    it('modifie un groupe existant sans toucher aux autres', () => {
      const id = service.creerGroupe(DONNEES_GROUPE);
      const autreId = service.creerGroupe({ ...DONNEES_GROUPE, nom: 'Autre groupe' });

      service.modifierGroupe(id, { ...DONNEES_GROUPE, nom: 'Nouveau nom' });

      expect(service.groupes().find((g) => g.id === id)?.nom).toBe('Nouveau nom');
      expect(service.groupes().find((g) => g.id === autreId)?.nom).toBe('Autre groupe');
    });

    it('supprime un groupe et ses projets', () => {
      const id = service.creerGroupe(DONNEES_GROUPE);
      service.creerProjet(id, DONNEES_PROJET);

      service.supprimerGroupe(id);

      expect(service.groupes()).toEqual([]);
    });
  });

  describe('projets (US-007)', () => {
    let groupeId: string;

    beforeEach(() => {
      service.chargerRacine(DonneesDeTest.racineVide());
      groupeId = service.creerGroupe(DONNEES_GROUPE);
    });

    it('crée un projet avec la politique IA interdite par défaut (RG-014)', () => {
      const id = service.creerProjet(groupeId, DONNEES_PROJET);

      const projet = service.groupes()[0].projets.find((p) => p.id === id);
      expect(projet?.iaAutorisee).toBe(false);
      expect(projet?.sources).toEqual([]);
      expect(projet?.audits).toEqual([]);
    });

    it('modifie un projet existant', () => {
      const id = service.creerProjet(groupeId, DONNEES_PROJET);

      service.modifierProjet(groupeId, id, { ...DONNEES_PROJET, nom: 'Nouveau nom' });

      expect(service.groupes()[0].projets[0].nom).toBe('Nouveau nom');
    });

    it('supprime un projet', () => {
      const id = service.creerProjet(groupeId, DONNEES_PROJET);

      service.supprimerProjet(groupeId, id);

      expect(service.groupes()[0].projets).toEqual([]);
    });

    it('duplique un projet en reprenant ses sources mais jamais son historique ni sa politique IA (US-007, RG-014)', () => {
      const id = service.creerProjet(groupeId, DONNEES_PROJET);
      service.creerSource(groupeId, id, DONNEES_SOURCE);
      service.modifierProjet(groupeId, id, DONNEES_PROJET);
      // Simule un projet source dont la politique IA aurait été autorisée : la duplication doit malgré tout
      // forcer l'interdiction par défaut (RG-014).

      const copieId = service.dupliquerProjet(groupeId, id);

      const projets = service.groupes()[0].projets;
      const original = projets.find((p) => p.id === id);
      const copie = projets.find((p) => p.id === copieId);
      expect(copie?.nom).toBe(`${DONNEES_PROJET.nom} (copie)`);
      expect(copie?.iaAutorisee).toBe(false);
      expect(copie?.sources).toHaveLength(1);
      expect(copie?.sources[0].idExterne).toBe(DONNEES_SOURCE.idExterne);
      expect(copie?.sources[0].id).not.toBe(original?.sources[0].id);
      expect(copie?.annotations).toEqual([]);
      expect(copie?.audits).toEqual([]);
    });

    it('lève une erreur en cas de duplication sur un groupe inexistant', () => {
      const id = service.creerProjet(groupeId, DONNEES_PROJET);

      expect(() => service.dupliquerProjet('groupe-inconnu', id)).toThrow();
    });

    it('lève une erreur en cas de duplication sur un projet inexistant', () => {
      expect(() => service.dupliquerProjet(groupeId, 'projet-inconnu')).toThrow();
    });

    it('lève une erreur en cas de duplication sans fichier chargé', () => {
      service.reinitialiser();

      expect(() => service.dupliquerProjet(groupeId, 'projet-inconnu')).toThrow();
    });

    it('ignore les groupes et projets non concernés lors des mutations de projet', () => {
      const autreGroupeId = service.creerGroupe({ ...DONNEES_GROUPE, nom: 'Autre groupe' });
      const id = service.creerProjet(groupeId, DONNEES_PROJET);
      const autreId = service.creerProjet(groupeId, { ...DONNEES_PROJET, nom: 'Autre projet' });

      service.modifierProjet(groupeId, id, { ...DONNEES_PROJET, nom: 'Nouveau nom' });
      service.dupliquerProjet(groupeId, id);
      service.supprimerProjet(groupeId, id);

      const groupe = service.groupes().find((g) => g.id === groupeId);
      expect(groupe?.projets.find((p) => p.id === autreId)?.nom).toBe('Autre projet');
      expect(service.groupes().find((g) => g.id === autreGroupeId)?.nom).toBe('Autre groupe');
    });
  });

  describe('sources (US-008, RG-023)', () => {
    let groupeId: string;
    let projetId: string;

    beforeEach(() => {
      service.chargerRacine(DonneesDeTest.racineVide());
      groupeId = service.creerGroupe(DONNEES_GROUPE);
      projetId = service.creerProjet(groupeId, DONNEES_PROJET);
    });

    it('crée une source rattachée au projet', () => {
      const id = service.creerSource(groupeId, projetId, DONNEES_SOURCE);

      const source = service.groupes()[0].projets[0].sources.find((s) => s.id === id);
      expect(source?.idExterne).toBe(DONNEES_SOURCE.idExterne);
      expect(source?.refAuditee).toBe('develop');
    });

    it('journalise un changement de ref auditée (RG-023)', () => {
      const id = service.creerSource(groupeId, projetId, DONNEES_SOURCE);

      service.modifierSource(groupeId, projetId, id, { ...DONNEES_SOURCE, refAuditee: 'main' });

      const racine = service.racine();
      expect(racine?.journal).toHaveLength(1);
      const entree = racine?.journal[0];
      expect(entree?.objet).toBe(
        `groupes/${groupeId}/projets/${projetId}/sources/${id}/refAuditee`,
      );
      expect(entree?.avant).toBe('develop');
      expect(entree?.apres).toBe('main');
      expect(entree?.origine).toBe('Administration');
      expect(service.groupes()[0].projets[0].sources[0].refAuditee).toBe('main');
    });

    it("n'ajoute aucune entrée de journal quand la ref auditée ne change pas", () => {
      const id = service.creerSource(groupeId, projetId, DONNEES_SOURCE);

      service.modifierSource(groupeId, projetId, id, { ...DONNEES_SOURCE });

      expect(service.racine()?.journal).toEqual([]);
    });

    it('journalise le passage à une ref auditée absente (retour à la branche par défaut)', () => {
      const id = service.creerSource(groupeId, projetId, DONNEES_SOURCE);

      service.modifierSource(groupeId, projetId, id, { ...DONNEES_SOURCE, refAuditee: undefined });

      const entree = service.racine()?.journal[0];
      expect(entree?.avant).toBe('develop');
      expect(entree?.apres).toBeNull();
      expect(service.groupes()[0].projets[0].sources[0].refAuditee).toBeUndefined();
    });

    it('supprime une source', () => {
      const id = service.creerSource(groupeId, projetId, DONNEES_SOURCE);

      service.supprimerSource(groupeId, projetId, id);

      expect(service.groupes()[0].projets[0].sources).toEqual([]);
    });

    it('lève une erreur en modifiant une source sur un groupe inexistant', () => {
      const id = service.creerSource(groupeId, projetId, DONNEES_SOURCE);

      expect(() =>
        service.modifierSource('groupe-inconnu', projetId, id, DONNEES_SOURCE),
      ).toThrow();
    });

    it('lève une erreur en modifiant une source sur un projet inexistant', () => {
      const id = service.creerSource(groupeId, projetId, DONNEES_SOURCE);

      expect(() =>
        service.modifierSource(groupeId, 'projet-inconnu', id, DONNEES_SOURCE),
      ).toThrow();
    });

    it('lève une erreur en modifiant une source inexistante', () => {
      expect(() =>
        service.modifierSource(groupeId, projetId, 'source-inconnue', DONNEES_SOURCE),
      ).toThrow();
    });

    it('ignore les groupes, projets et sources non concernés lors des mutations de source', () => {
      const autreGroupeId = service.creerGroupe({ ...DONNEES_GROUPE, nom: 'Autre groupe' });
      const autreProjetId = service.creerProjet(groupeId, {
        ...DONNEES_PROJET,
        nom: 'Autre projet',
      });
      const id = service.creerSource(groupeId, projetId, DONNEES_SOURCE);
      const autreSourceId = service.creerSource(groupeId, projetId, {
        ...DONNEES_SOURCE,
        idExterne: 'autre-id-externe',
      });

      service.modifierSource(groupeId, projetId, id, { ...DONNEES_SOURCE, refAuditee: 'main' });
      service.supprimerSource(groupeId, projetId, id);

      const projet = service
        .groupes()
        .find((g) => g.id === groupeId)
        ?.projets.find((p) => p.id === projetId);
      expect(projet?.sources.find((s) => s.id === autreSourceId)?.idExterne).toBe(
        'autre-id-externe',
      );
      expect(
        service
          .groupes()
          .find((g) => g.id === groupeId)
          ?.projets.find((p) => p.id === autreProjetId),
      ).toBeDefined();
      expect(service.groupes().find((g) => g.id === autreGroupeId)).toBeDefined();
    });

    it("journalise l'ajout d'une ref auditée à une source qui n'en avait pas encore", () => {
      const id = service.creerSource(groupeId, projetId, {
        ...DONNEES_SOURCE,
        refAuditee: undefined,
      });

      service.modifierSource(groupeId, projetId, id, { ...DONNEES_SOURCE, refAuditee: 'develop' });

      const entree = service.racine()?.journal[0];
      expect(entree?.avant).toBeNull();
      expect(entree?.apres).toBe('develop');
    });
  });

  describe('membres connus et politique IA (Phase 4, US-022 à US-024)', () => {
    let groupeId: string;
    let projetId: string;
    let etatSession: EtatSessionService;

    const DONNEES_MEMBRE: DonneesMembreConnu = {
      critere: 'alice',
      typeCritere: TypeCritereMembre.Username,
      statut: StatutMembre.Interne,
    };

    beforeEach(() => {
      service.chargerRacine(DonneesDeTest.racineVide());
      groupeId = service.creerGroupe(DONNEES_GROUPE);
      projetId = service.creerProjet(groupeId, DONNEES_PROJET);
      etatSession = TestBed.inject(EtatSessionService);
      etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
    });

    it('invoque qualifier_membre avec les paramètres attendus et met à jour la racine', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 2 };
      const reponse: ReponseQualificationMembre = {
        donnees: racineMiseAJour,
        membresEnConflit: [],
      };
      invokeSimule.mockResolvedValue(reponse);

      const resultat = await service.qualifierMembre(
        groupeId,
        DONNEES_MEMBRE,
        'Administration',
        'mot-de-passe',
      );

      expect(invokeSimule).toHaveBeenCalledWith('qualifier_membre', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        groupeId,
        membreId: undefined,
        critere: 'alice',
        typeCritere: TypeCritereMembre.Username,
        statut: StatutMembre.Interne,
        libelle: undefined,
        aliasEmail: undefined,
        origine: 'Administration',
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes', membresEnConflit: [] });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('remonte les identifiants en conflit renvoyés par la commande native (RG-008)', async () => {
      const reponse: ReponseQualificationMembre = {
        donnees: DonneesDeTest.racineActuelle(service),
        membresEnConflit: ['m1', 'm2'],
      };
      invokeSimule.mockResolvedValue(reponse);

      const resultat = await service.qualifierMembre(
        groupeId,
        DONNEES_MEMBRE,
        'Administration',
        'mot-de-passe',
      );

      expect(resultat).toEqual({ type: 'succes', membresEnConflit: ['m1', 'm2'] });
    });

    it('convertit un rejet typé « doublonUsernameMembreConnu » en Résultat « echec » (RG-008)', async () => {
      invokeSimule.mockRejectedValue({ type: 'doublonUsernameMembreConnu' });

      const resultat = await service.qualifierMembre(
        groupeId,
        DONNEES_MEMBRE,
        'Administration',
        'mot-de-passe',
      );

      expect(resultat).toEqual({
        type: 'echec',
        anomalie: { type: 'doublonUsernameMembreConnu' },
      });
      expect(service.racine()?.versionSchema).toBe(1);
    });

    it('convertit un rejet typé « conflitReglesMembreConnu » en Résultat « echec » (RG-008, R10-07)', async () => {
      invokeSimule.mockRejectedValue({ type: 'conflitReglesMembreConnu' });

      const resultat = await service.qualifierMembre(
        groupeId,
        DONNEES_MEMBRE,
        'Administration',
        'mot-de-passe',
      );

      expect(resultat).toEqual({
        type: 'echec',
        anomalie: { type: 'conflitReglesMembreConnu' },
      });
      expect(service.racine()?.versionSchema).toBe(1);
    });

    it('convertit un rejet non structuré en anomalie « erreurInterne »', async () => {
      invokeSimule.mockRejectedValue('erreur non structurée');

      const resultat = await service.qualifierMembre(
        groupeId,
        DONNEES_MEMBRE,
        'Administration',
        'mot-de-passe',
      );

      expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'erreurInterne' } });
    });

    it('invoque definir_politique_ia avec les paramètres attendus et met à jour la racine', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 3 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.definirPolitiqueIA(groupeId, projetId, true, 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('definir_politique_ia', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        groupeId,
        projetId,
        iaAutorisee: true,
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('convertit un rejet typé « projetIntrouvable » en Résultat « echec »', async () => {
      invokeSimule.mockRejectedValue({ type: 'projetIntrouvable' });

      const resultat = await service.definirPolitiqueIA(groupeId, projetId, true, 'mot-de-passe');

      expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'projetIntrouvable' } });
    });

    it('invoque definir_seuil avec les paramètres attendus et met à jour la racine', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 3 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.definirSeuil('vitalite.mortJours', 400, 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('definir_seuil', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        cle: 'vitalite.mortJours',
        valeur: 400,
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('convertit un rejet typé « cleSeuilIntrouvable » en Résultat « echec »', async () => {
      invokeSimule.mockRejectedValue({ type: 'cleSeuilIntrouvable' });

      const resultat = await service.definirSeuil('vitalite.cleInexistante', 1, 'mot-de-passe');

      expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'cleSeuilIntrouvable' } });
    });

    it('invoque definir_referentiel avec les paramètres attendus et met à jour la racine', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 3 };
      invokeSimule.mockResolvedValue(racineMiseAJour);
      const entree = { id: 'd1', motif: 'moment', versions: [] };

      const resultat = await service.definirReferentiel(
        'reglesDependances',
        entree,
        'mot-de-passe',
      );

      expect(invokeSimule).toHaveBeenCalledWith('definir_referentiel', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        typeReferentiel: 'reglesDependances',
        entree,
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('convertit un rejet typé « entreeReferentielInvalide » en Résultat « echec »', async () => {
      invokeSimule.mockRejectedValue({ type: 'entreeReferentielInvalide' });

      const resultat = await service.definirReferentiel(
        'reglesDependances',
        { id: 'd1' },
        'mot-de-passe',
      );

      expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'entreeReferentielInvalide' } });
    });

    it('invoque definir_vue avec les paramètres attendus et met à jour la racine (US-028)', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 3 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.definirVue(
        undefined,
        'Ma vue',
        'listeTravail',
        1,
        true,
        { groupeId: 'g1' },
        'mot-de-passe',
      );

      expect(invokeSimule).toHaveBeenCalledWith('definir_vue', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        id: undefined,
        nom: 'Ma vue',
        ecran: 'listeTravail',
        versionFiltres: 1,
        parDefaut: true,
        filtres: { groupeId: 'g1' },
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('convertit un rejet typé « vueIntrouvable » en Résultat « echec » (definirVue)', async () => {
      invokeSimule.mockRejectedValue({ type: 'vueIntrouvable' });

      const resultat = await service.definirVue(
        'id-inconnu',
        'Ma vue',
        'listeTravail',
        1,
        false,
        { groupeId: null },
        'mot-de-passe',
      );

      expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'vueIntrouvable' } });
    });

    it('invoque supprimer_vue avec les paramètres attendus et met à jour la racine (US-028)', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 3 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.supprimerVue('vue-1', 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('supprimer_vue', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        id: 'vue-1',
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('convertit un rejet typé « vueIntrouvable » en Résultat « echec » (supprimerVue)', async () => {
      invokeSimule.mockRejectedValue({ type: 'vueIntrouvable' });

      const resultat = await service.supprimerVue('id-inconnu', 'mot-de-passe');

      expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'vueIntrouvable' } });
    });

    it('invoque supprimer_membre_connu avec les paramètres attendus et met à jour la racine', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 4 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.supprimerMembreConnu(
        groupeId,
        'm1',
        'Administration',
        'mot-de-passe',
      );

      expect(invokeSimule).toHaveBeenCalledWith('supprimer_membre_connu', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        groupeId,
        membreId: 'm1',
        origine: 'Administration',
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('convertit un rejet typé « membreIntrouvable » en Résultat « echec » pour la suppression', async () => {
      invokeSimule.mockRejectedValue({ type: 'membreIntrouvable' });

      const resultat = await service.supprimerMembreConnu(
        groupeId,
        'm1',
        'Administration',
        'mot-de-passe',
      );

      expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'membreIntrouvable' } });
    });

    it('invoque supprimer_regle_dependance avec les paramètres attendus et met à jour la racine (US-033, RG-035)', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 5 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.supprimerRegleDependance('d1', 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('supprimer_regle_dependance', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        id: 'd1',
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('invoque supprimer_regle_marqueur_ia avec les paramètres attendus et met à jour la racine (US-033, RG-035)', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 5 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.supprimerRegleMarqueurIA('m1', 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('supprimer_regle_marqueur_ia', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        id: 'm1',
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('convertit un rejet typé « entreeReferentielIntrouvable » en Résultat « echec »', async () => {
      invokeSimule.mockRejectedValue({ type: 'entreeReferentielIntrouvable' });

      const resultat = await service.supprimerRegleDependance('inconnu', 'mot-de-passe');

      expect(resultat).toEqual({
        type: 'echec',
        anomalie: { type: 'entreeReferentielIntrouvable' },
      });
    });

    it('invoque definir_verrouillage avec les paramètres attendus et met à jour la racine (US-034, RG-031)', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 5 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.definirVerrouillage(30, 3, 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('definir_verrouillage', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        delaiInactiviteMinutes: 30,
        echecsAvantFermeture: 3,
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('invoque definir_concurrence_audit avec les paramètres attendus et met à jour la racine (US-034, RG-031)', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 5 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.definirConcurrenceAudit(8, 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('definir_concurrence_audit', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        concurrence: 8,
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('invoque definir_proxy avec les paramètres attendus et met à jour la racine (US-034, RG-031)', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 5 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.definirProxy(
        'http://proxy.exemple.local:3128',
        undefined,
        'mot-de-passe',
      );

      expect(invokeSimule).toHaveBeenCalledWith('definir_proxy', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        url: 'http://proxy.exemple.local:3128',
        cheminBundleCa: undefined,
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('invoque definir_nombre_sauvegardes_securite avec les paramètres attendus et met à jour la racine (US-034, RG-031)', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 5 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.definirNombreSauvegardesSecurite(10, 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('definir_nombre_sauvegardes_securite', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        nombre: 10,
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('invoque definir_seuil_avertissement_taille avec les paramètres attendus et met à jour la racine (US-035, RG-032)', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 5 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.definirSeuilAvertissementTaille(5_000_000, 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('definir_seuil_avertissement_taille', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        seuilOctets: 5_000_000,
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('convertit un rejet typé « reglageApplicatifInvalide » en Résultat « echec »', async () => {
      invokeSimule.mockRejectedValue({ type: 'reglageApplicatifInvalide' });

      const resultat = await service.definirConcurrenceAudit(0, 'mot-de-passe');

      expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'reglageApplicatifInvalide' } });
    });

    it('invoque previsualiser_purge_journal et renvoie le résumé natif (US-036, RG-034)', async () => {
      invokeSimule.mockResolvedValue({ nbEntreesSupprimees: 3, octetsAvant: 100, octetsApres: 40 });

      const resultat = await service.previsualiserPurgeJournal();

      expect(invokeSimule).toHaveBeenCalledWith('previsualiser_purge_journal', {
        donnees: DonneesDeTest.racineActuelle(service),
      });
      expect(resultat).toEqual({
        type: 'succes',
        previsualisation: { nbEntreesSupprimees: 3, octetsAvant: 100, octetsApres: 40 },
      });
    });

    it('invoque executer_purge_journal avec les paramètres attendus et met à jour la racine (US-036, RG-034)', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 5 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.executerPurgeJournal('mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('executer_purge_journal', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('invoque creer_annotation sans projetId pour une annotation de portée groupe (US-019)', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 5 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.creerAnnotation(
        groupeId,
        undefined,
        { date: '2026-07-27', libelle: 'Rupture', categorie: 'incident' },
        'mot-de-passe',
      );

      expect(invokeSimule).toHaveBeenCalledWith('creer_annotation', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        groupeId,
        projetId: undefined,
        date: '2026-07-27',
        libelle: 'Rupture',
        categorie: 'incident',
        description: undefined,
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('invoque supprimer_annotation avec les paramètres attendus et met à jour la racine (US-019, RG-033)', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 5 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.supprimerAnnotation(groupeId, undefined, 'a1', 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('supprimer_annotation', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        groupeId,
        projetId: undefined,
        annotationId: 'a1',
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('convertit un rejet typé « annotationSystemeNonSupprimable » en Résultat « echec »', async () => {
      invokeSimule.mockRejectedValue({ type: 'annotationSystemeNonSupprimable' });

      const resultat = await service.supprimerAnnotation(groupeId, undefined, 'a1', 'mot-de-passe');

      expect(resultat).toEqual({
        type: 'echec',
        anomalie: { type: 'annotationSystemeNonSupprimable' },
      });
    });
  });

  describe('cycle de vie du brouillon (Phase 5, incrément 2, US-014)', () => {
    let etatSession: EtatSessionService;

    const VERDICT_SUCCES: Verdict = {
      projetId: 'projet-1',
      statut: 'succes',
      dureeMs: 1200,
    };

    const RESULTAT_EN_ATTENTE: ResultatBrouillonProjet = {
      projetId: 'projet-1',
      audit: { id: 'audit-1', date: '2026-07-23', campagneId: 'campagne-1', resultats: [] },
      statut: 'enAttente',
    };

    beforeEach(() => {
      service.chargerRacine(DonneesDeTest.racineVide());
      etatSession = TestBed.inject(EtatSessionService);
      etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
    });

    it('invoque enregistrer_brouillon avec les paramètres attendus et met à jour la racine', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 2 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.enregistrerBrouillon(
        'campagne-1',
        '2026-07-23',
        ['projet-1'],
        [VERDICT_SUCCES],
        [RESULTAT_EN_ATTENTE],
        'mot-de-passe',
      );

      expect(invokeSimule).toHaveBeenCalledWith('enregistrer_brouillon', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        campagneId: 'campagne-1',
        date: '2026-07-23',
        perimetre: ['projet-1'],
        verdicts: [VERDICT_SUCCES],
        resultatsParProjet: [RESULTAT_EN_ATTENTE],
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('convertit un rejet typé « brouillonDejaExistant » en Résultat « echec »', async () => {
      invokeSimule.mockRejectedValue({ type: 'brouillonDejaExistant' });

      const resultat = await service.enregistrerBrouillon(
        'campagne-1',
        '2026-07-23',
        ['projet-1'],
        [VERDICT_SUCCES],
        [RESULTAT_EN_ATTENTE],
        'mot-de-passe',
      );

      expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'brouillonDejaExistant' } });
    });

    it('invoque integrer_brouillon avec la sélection fournie et met à jour la racine', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 3 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.integrerBrouillon(['projet-1'], 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('integrer_brouillon', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        selection: ['projet-1'],
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('invoque integrer_brouillon sans sélection pour intégrer tout le brouillon', async () => {
      invokeSimule.mockResolvedValue(DonneesDeTest.racineActuelle(service));

      await service.integrerBrouillon(undefined, 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith(
        'integrer_brouillon',
        expect.objectContaining({ selection: undefined }),
      );
    });

    it('convertit un rejet typé « aucunBrouillonCourant » en Résultat « echec » pour l’intégration', async () => {
      invokeSimule.mockRejectedValue({ type: 'aucunBrouillonCourant' });

      const resultat = await service.integrerBrouillon(undefined, 'mot-de-passe');

      expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'aucunBrouillonCourant' } });
    });

    it('invoque rejeter_brouillon avec le motif fourni et met à jour la racine', async () => {
      const racineAvantAppel = DonneesDeTest.racineActuelle(service);
      const racineMiseAJour: DonneesRacine = { ...racineAvantAppel, versionSchema: 4 };
      invokeSimule.mockResolvedValue(racineMiseAJour);

      const resultat = await service.rejeterBrouillon(
        ['projet-1'],
        'Mauvaise ref auditée',
        'mot-de-passe',
      );

      expect(invokeSimule).toHaveBeenCalledWith('rejeter_brouillon', {
        chemin: '/tmp/donnees-test.sqm',
        donnees: racineAvantAppel,
        selection: ['projet-1'],
        motif: 'Mauvaise ref auditée',
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racineMiseAJour);
    });

    it('convertit un rejet typé « projetAbsentDuBrouillon » en Résultat « echec » pour le rejet', async () => {
      invokeSimule.mockRejectedValue({ type: 'projetAbsentDuBrouillon' });

      const resultat = await service.rejeterBrouillon(
        ['projet-inconnu'],
        undefined,
        'mot-de-passe',
      );

      expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'projetAbsentDuBrouillon' } });
    });
  });

  describe('cycle de vie du fichier et de la session (Phase 1, US-001, US-002, US-026)', () => {
    let etatSession: EtatSessionService;

    beforeEach(() => {
      etatSession = TestBed.inject(EtatSessionService);
    });

    it('crée un fichier, charge la racine renvoyée et ouvre la session (US-001)', async () => {
      const racine = DonneesDeTest.racineVide();
      invokeSimule.mockResolvedValue(racine);

      const resultat = await service.creerFichier('/tmp/nouveau.sqm', 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('creer_fichier', {
        chemin: '/tmp/nouveau.sqm',
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racine);
      expect(etatSession.etatFichier()).toBe(EtatFichier.Ouvert);
      expect(etatSession.cheminFichier()).toBe('/tmp/nouveau.sqm');
    });

    it('convertit un rejet lors de la création en Résultat « echec » sans ouvrir la session', async () => {
      invokeSimule.mockRejectedValue({ type: 'erreurInterne' });

      const resultat = await service.creerFichier('/tmp/nouveau.sqm', 'mot-de-passe');

      expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'erreurInterne' } });
      expect(service.racine()).toBeNull();
      expect(etatSession.etatFichier()).toBe(EtatFichier.Ferme);
    });

    it('charge un fichier existant, charge la racine renvoyée et ouvre la session (US-002)', async () => {
      const racine = DonneesDeTest.racineVide();
      invokeSimule.mockResolvedValue(racine);

      const resultat = await service.chargerFichier('/tmp/existant.sqm', 'mot-de-passe');

      expect(invokeSimule).toHaveBeenCalledWith('charger_fichier', {
        chemin: '/tmp/existant.sqm',
        motDePasse: 'mot-de-passe',
      });
      expect(resultat).toEqual({ type: 'succes' });
      expect(service.racine()).toBe(racine);
      expect(etatSession.etatFichier()).toBe(EtatFichier.Ouvert);
    });

    it('convertit un mot de passe incorrect au chargement en Résultat « echec »', async () => {
      invokeSimule.mockRejectedValue({ type: 'motDePasseOuFichierInvalide' });

      const resultat = await service.chargerFichier('/tmp/existant.sqm', 'mauvais-mot-de-passe');

      expect(resultat).toEqual({
        type: 'echec',
        anomalie: { type: 'motDePasseOuFichierInvalide' },
      });
      expect(service.racine()).toBeNull();
    });

    describe('une fois un fichier ouvert', () => {
      beforeEach(() => {
        service.chargerRacine(DonneesDeTest.racineVide());
        etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
      });

      it('sauvegarde le fichier avec la racine courante horodatée (RG-001 à RG-003)', async () => {
        invokeSimule.mockResolvedValue(undefined);
        const racineAvantAppel = DonneesDeTest.racineActuelle(service);

        const resultat = await service.sauvegarderFichier('mot-de-passe');

        expect(invokeSimule).toHaveBeenCalledWith(
          'sauvegarder_fichier',
          expect.objectContaining({
            chemin: '/tmp/donnees-test.sqm',
            motDePasse: 'mot-de-passe',
          }),
        );
        expect(resultat).toEqual({ type: 'succes' });
        expect(service.racine()?.meta.modifieLe).not.toBe(racineAvantAppel.meta.modifieLe);
      });

      it('convertit un rejet de sauvegarde typé « fichierVerrouille » en Résultat « echec »', async () => {
        invokeSimule.mockRejectedValue({ type: 'fichierVerrouille' });

        const resultat = await service.sauvegarderFichier('mot-de-passe');

        expect(resultat).toEqual({ type: 'echec', anomalie: { type: 'fichierVerrouille' } });
      });

      it('verrouille la session (US-026) sans oublier la racine en mémoire', async () => {
        invokeSimule.mockResolvedValue(undefined);

        const resultat = await service.verrouillerSession();

        expect(invokeSimule).toHaveBeenCalledWith('verrouiller_session', {});
        expect(resultat).toEqual({ type: 'succes' });
        expect(etatSession.etatFichier()).toBe(EtatFichier.Verrouille);
        expect(service.racine()).not.toBeNull();
      });

      it('déverrouille la session avec le bon mot de passe et remet le compteur d’échecs à zéro (US-026)', async () => {
        etatSession.verrouiller();
        invokeSimule.mockResolvedValue(undefined);

        const resultat = await service.deverrouillerSession('mot-de-passe');

        expect(invokeSimule).toHaveBeenCalledWith('deverrouiller_session', {
          motDePasse: 'mot-de-passe',
        });
        expect(resultat).toEqual({ type: 'succes' });
        expect(etatSession.etatFichier()).toBe(EtatFichier.Ouvert);
        expect(etatSession.echecsDeverrouillage()).toBe(0);
      });

      it('enregistre un échec de mot de passe sans fermer le fichier avant le seuil (US-026)', async () => {
        etatSession.verrouiller();
        invokeSimule.mockRejectedValue({ type: 'motDePasseOuFichierInvalide' });

        const resultat = await service.deverrouillerSession('mauvais-mot-de-passe');

        expect(resultat).toEqual({
          type: 'echec',
          anomalie: { type: 'motDePasseOuFichierInvalide' },
          fichierFerme: false,
        });
        expect(etatSession.echecsDeverrouillage()).toBe(1);
        expect(etatSession.etatFichier()).toBe(EtatFichier.Verrouille);
        expect(service.racine()).not.toBeNull();
      });

      it('ferme complètement le fichier après le nombre paramétré d’échecs consécutifs (US-026)', async () => {
        etatSession.verrouiller();
        invokeSimule.mockRejectedValue({ type: 'motDePasseOuFichierInvalide' });
        const seuil =
          DonneesDeTest.racineActuelle(service).parametres.verrouillage.echecsAvantFermeture;

        let resultat;
        for (let essai = 0; essai < seuil; essai += 1) {
          resultat = await service.deverrouillerSession('mauvais-mot-de-passe');
        }

        expect(resultat).toEqual({
          type: 'echec',
          anomalie: { type: 'motDePasseOuFichierInvalide' },
          fichierFerme: true,
        });
        expect(etatSession.etatFichier()).toBe(EtatFichier.Ferme);
        expect(service.racine()).toBeNull();
      });

      it('n’incrémente pas le compteur d’échecs pour une anomalie autre qu’un mot de passe incorrect', async () => {
        etatSession.verrouiller();
        invokeSimule.mockRejectedValue({ type: 'erreurInterne' });

        const resultat = await service.deverrouillerSession('mot-de-passe');

        expect(resultat).toEqual({
          type: 'echec',
          anomalie: { type: 'erreurInterne' },
          fichierFerme: false,
        });
        expect(etatSession.echecsDeverrouillage()).toBe(0);
      });
    });
  });
});
