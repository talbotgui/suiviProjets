// Test des gardes de routage (cf. app.routes.guards.ts, US-001, US-002, US-026), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { AppRoutesGuards } from './app.routes.guards';
import { EtatSessionService } from './services/avecetat/etat/etat-session.service';

describe('AppRoutesGuards', () => {
  let etatSession: EtatSessionService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    etatSession = TestBed.inject(EtatSessionService);
    router = TestBed.inject(Router);
  });

  describe('fichierOuvertGuard', () => {
    it('redirige vers /demarrage tant qu’aucun fichier n’est ouvert', () => {
      const resultat = TestBed.runInInjectionContext(() => AppRoutesGuards.fichierOuvertGuard());

      expect(resultat).toBeInstanceOf(UrlTree);
      if (resultat instanceof UrlTree) {
        expect(router.serializeUrl(resultat)).toBe('/demarrage');
      }
    });

    it('autorise l’accès une fois un fichier ouvert', () => {
      etatSession.ouvrirFichier('/tmp/donnees-test.sqm');

      const resultat = TestBed.runInInjectionContext(() => AppRoutesGuards.fichierOuvertGuard());

      expect(resultat).toBe(true);
    });

    it('autorise l’accès même verrouillé (la superposition masque les données sans démonter le Shell)', () => {
      etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
      etatSession.verrouiller();

      const resultat = TestBed.runInInjectionContext(() => AppRoutesGuards.fichierOuvertGuard());

      expect(resultat).toBe(true);
    });
  });

  describe('demarrageIndisponibleSiOuvertGuard', () => {
    it('autorise l’accès à l’écran de Démarrage tant qu’aucun fichier n’est ouvert', () => {
      const resultat = TestBed.runInInjectionContext(() =>
        AppRoutesGuards.demarrageIndisponibleSiOuvertGuard(),
      );

      expect(resultat).toBe(true);
    });

    it('redirige vers /accueil si un fichier est déjà ouvert', () => {
      etatSession.ouvrirFichier('/tmp/donnees-test.sqm');

      const resultat = TestBed.runInInjectionContext(() =>
        AppRoutesGuards.demarrageIndisponibleSiOuvertGuard(),
      );

      expect(resultat).toBeInstanceOf(UrlTree);
      if (resultat instanceof UrlTree) {
        expect(router.serializeUrl(resultat)).toBe('/accueil');
      }
    });

    it('redirige vers /accueil si le fichier ouvert est verrouillé', () => {
      etatSession.ouvrirFichier('/tmp/donnees-test.sqm');
      etatSession.verrouiller();

      const resultat = TestBed.runInInjectionContext(() =>
        AppRoutesGuards.demarrageIndisponibleSiOuvertGuard(),
      );

      expect(resultat).toBeInstanceOf(UrlTree);
    });
  });
});
