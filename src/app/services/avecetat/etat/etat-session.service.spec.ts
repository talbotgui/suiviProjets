// Test du Store d'état applicatif de la session (cf. etat-session.service.ts), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { EtatFichier, EtatSessionService } from './etat-session.service';

describe('EtatSessionService', () => {
  let service: EtatSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EtatSessionService);
  });

  it('doit démarrer fermé, sans fichier, sans credentials et sans clé de session', () => {
    expect(service.etatFichier()).toBe(EtatFichier.Ferme);
    expect(service.cheminFichier()).toBeNull();
    expect(service.credentials()).toBeNull();
    expect(service.cleSessionPresente()).toBe(false);
  });

  it("doit passer à l'état ouvert et mémoriser le chemin lors de l'ouverture d'un fichier", () => {
    service.ouvrirFichier('/chemin/donnees.sqm');

    expect(service.etatFichier()).toBe(EtatFichier.Ouvert);
    expect(service.cheminFichier()).toBe('/chemin/donnees.sqm');
    expect(service.cleSessionPresente()).toBe(true);
  });

  it('doit purger les credentials et le marqueur de clé de session au verrouillage, en conservant le chemin', () => {
    service.ouvrirFichier('/chemin/donnees.sqm');
    service.definirCredentials({ instance1: 'jeton-secret' });

    service.verrouiller();

    expect(service.etatFichier()).toBe(EtatFichier.Verrouille);
    expect(service.credentials()).toBeNull();
    expect(service.cleSessionPresente()).toBe(false);
    expect(service.cheminFichier()).toBe('/chemin/donnees.sqm');
  });

  it("doit repasser à l'état ouvert et restaurer le marqueur de clé de session lors d'un déverrouillage réussi", () => {
    service.ouvrirFichier('/chemin/donnees.sqm');
    service.verrouiller();

    service.marquerDeverrouille();

    expect(service.etatFichier()).toBe(EtatFichier.Ouvert);
    expect(service.cleSessionPresente()).toBe(true);
  });

  it('doit tout purger, y compris le chemin du fichier, à la fermeture', () => {
    service.ouvrirFichier('/chemin/donnees.sqm');
    service.definirCredentials({ instance1: 'jeton-secret' });

    service.fermer();

    expect(service.etatFichier()).toBe(EtatFichier.Ferme);
    expect(service.cheminFichier()).toBeNull();
    expect(service.credentials()).toBeNull();
    expect(service.cleSessionPresente()).toBe(false);
  });

  it('ne doit conserver aucune référence aux anciens credentials après un second verrouillage sans nouvelle saisie', () => {
    service.ouvrirFichier('/chemin/donnees.sqm');
    service.definirCredentials({ instance1: 'jeton-secret' });
    service.verrouiller();
    service.marquerDeverrouille();

    service.verrouiller();

    expect(service.credentials()).toBeNull();
  });

  it("doit incrémenter le compteur d'échecs de déverrouillage sans fermer le fichier avant le seuil paramétré", () => {
    service.ouvrirFichier('/chemin/donnees.sqm');
    service.verrouiller();

    const ferme = service.enregistrerEchecDeverrouillage(5);

    expect(ferme).toBe(false);
    expect(service.echecsDeverrouillage()).toBe(1);
    expect(service.etatFichier()).toBe(EtatFichier.Verrouille);
    expect(service.cheminFichier()).toBe('/chemin/donnees.sqm');
  });

  it("doit fermer complètement le fichier dès que le nombre d'échecs consécutifs atteint le seuil paramétré", () => {
    service.ouvrirFichier('/chemin/donnees.sqm');
    service.verrouiller();

    service.enregistrerEchecDeverrouillage(2);
    const ferme = service.enregistrerEchecDeverrouillage(2);

    expect(ferme).toBe(true);
    expect(service.etatFichier()).toBe(EtatFichier.Ferme);
    expect(service.cheminFichier()).toBeNull();
    expect(service.echecsDeverrouillage()).toBe(0);
  });

  it("doit réinitialiser le compteur d'échecs de déverrouillage après un déverrouillage réussi", () => {
    service.ouvrirFichier('/chemin/donnees.sqm');
    service.verrouiller();
    service.enregistrerEchecDeverrouillage(5);

    service.marquerDeverrouille();

    expect(service.echecsDeverrouillage()).toBe(0);
  });
});
