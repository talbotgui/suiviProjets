// Test du Store d'état applicatif de l'historique de navigation interne (cf. historique-navigation.service.ts,
// plan_16 incrément 5, RG-052, US-052), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { EtatSessionService } from './etat-session.service';
import { HistoriqueNavigationService } from './historique-navigation.service';

/**
 * Composant factice cible des routes de test : seul son enregistrement importe, jamais son rendu.
 */
@Component({ selector: 'app-composant-factice', template: '' })
class ComposantFactice {}

describe('HistoriqueNavigationService', () => {
  let service: HistoriqueNavigationService;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'a', component: ComposantFactice },
          { path: 'b', component: ComposantFactice },
          { path: 'c', component: ComposantFactice },
          { path: '**', component: ComposantFactice },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    // Point de départ connu avant l'amorçage de la pile par le constructeur du service.
    await router.navigateByUrl('/a');
    service = TestBed.inject(HistoriqueNavigationService);
  });

  /**
   * Laisse le routeur terminer une navigation déclenchée par `reculer()`/`avancer()` (qui n'exposent pas la
   * promesse sous-jacente) : un tour de macro-tâche suffit à vider la file des micro-tâches de navigation.
   * @returns Une promesse résolue au prochain tour de boucle d'évènements.
   */
  function stabiliser(): Promise<void> {
    return new Promise<void>((resoudre) => setTimeout(resoudre, 0));
  }

  it("démarre sur l'URL courante seule, sans déplacement possible", () => {
    expect(service.peutReculer()).toBe(false);
    expect(service.peutAvancer()).toBe(false);
  });

  it('empile chaque navigation normale et active le bouton Reculer', async () => {
    await router.navigateByUrl('/b');

    expect(service.peutReculer()).toBe(true);
    expect(service.peutAvancer()).toBe(false);
  });

  it("n'empile pas une navigation vers l'URL déjà courante", async () => {
    await router.navigateByUrl('/b');
    await router.navigateByUrl('/b');

    // Une seule entrée « avant » a été empilée (le second /b n'a rien ajouté) : reculer une fois revient en tête.
    service.reculer();
    await stabiliser();
    expect(router.url).toBe('/a');
    expect(service.peutReculer()).toBe(false);
  });

  it('déplace sans empiler : reculer puis avancer restitue la position sans perdre la branche « avant »', async () => {
    await router.navigateByUrl('/b');

    service.reculer();
    await stabiliser();
    expect(router.url).toBe('/a');
    expect(service.peutReculer()).toBe(false);
    expect(service.peutAvancer()).toBe(true);

    service.avancer();
    await stabiliser();
    expect(router.url).toBe('/b');
    expect(service.peutAvancer()).toBe(false);
  });

  it("tronque la branche « avant » lors d'une navigation normale depuis une position antérieure", async () => {
    await router.navigateByUrl('/b');
    await router.navigateByUrl('/c');

    service.reculer();
    await stabiliser();
    service.reculer();
    await stabiliser();
    expect(router.url).toBe('/a');

    await router.navigateByUrl('/b');

    expect(service.peutReculer()).toBe(true);
    expect(service.peutAvancer()).toBe(false);
  });

  it('purge intégralement la pile puis repart de la navigation suivante', async () => {
    await router.navigateByUrl('/b');
    expect(service.peutReculer()).toBe(true);

    service.reinitialiser();
    expect(service.peutReculer()).toBe(false);
    expect(service.peutAvancer()).toBe(false);

    await router.navigateByUrl('/c');
    await router.navigateByUrl('/a');
    expect(service.peutReculer()).toBe(true);
    expect(service.peutAvancer()).toBe(false);
  });

  it('ignore un appel à reculer ou avancer quand le déplacement est impossible', () => {
    expect(() => service.reculer()).not.toThrow();
    expect(() => service.avancer()).not.toThrow();
    expect(router.url).toBe('/a');
  });

  it('conserve la pile au verrouillage de la session (RG-052 : n’observe pas EtatSessionService)', async () => {
    await router.navigateByUrl('/b');
    await router.navigateByUrl('/c');
    expect(service.peutReculer()).toBe(true);

    TestBed.inject(EtatSessionService).verrouiller();

    expect(service.peutReculer()).toBe(true);
    expect(service.peutAvancer()).toBe(false);
    service.reculer();
    await stabiliser();
    expect(router.url).toBe('/b');
  });

  it('ne ré-empile pas un déplacement d’historique, y compris vers une URL répétée non consécutive', async () => {
    await router.navigateByUrl('/b');
    await router.navigateByUrl('/a'); // /a réapparaît, non consécutif

    // Pile logique : /a, /b, /a (index 2). Remonter puis redescendre toute la branche ne doit rien empiler.
    service.reculer();
    await stabiliser();
    expect(router.url).toBe('/b');
    service.reculer();
    await stabiliser();
    expect(router.url).toBe('/a');
    expect(service.peutReculer()).toBe(false);

    service.avancer();
    await stabiliser();
    service.avancer();
    await stabiliser();
    expect(router.url).toBe('/a');
    expect(service.peutAvancer()).toBe(false);
    // Toujours exactement 3 entrées : reculer/avancer n'a rien ré-empilé.
    service.reculer();
    await stabiliser();
    service.reculer();
    await stabiliser();
    expect(service.peutReculer()).toBe(false);
  });
});
