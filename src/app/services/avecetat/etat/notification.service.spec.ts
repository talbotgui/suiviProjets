// Test du service de notification transverse (cf. notification.service.ts, R11-03), généré avec l'assistance de
// l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('empile une notification de succès avec un identifiant unique', () => {
    service.succes('Enregistré.');
    service.succes('Enregistré à nouveau.');

    expect(service.liste()).toEqual([
      { id: 0, type: 'succes', message: 'Enregistré.' },
      { id: 1, type: 'succes', message: 'Enregistré à nouveau.' },
    ]);
  });

  it('empile une notification d’erreur', () => {
    service.erreur('Échec de la sauvegarde.');

    expect(service.liste()).toEqual([{ id: 0, type: 'erreur', message: 'Échec de la sauvegarde.' }]);
  });

  it('referme une notification avant son auto-disparition', () => {
    service.succes('Enregistré.');
    const [notif] = service.liste();

    service.fermer(notif.id);

    expect(service.liste()).toEqual([]);
  });

  it('fait disparaître automatiquement une notification de succès après son délai', () => {
    service.succes('Enregistré.');

    jest.advanceTimersByTime(5_000);

    expect(service.liste()).toEqual([]);
  });

  it('fait disparaître automatiquement une notification d’erreur après un délai plus long', () => {
    service.erreur('Échec.');

    jest.advanceTimersByTime(5_000);
    expect(service.liste().length).toBe(1);

    jest.advanceTimersByTime(3_000);
    expect(service.liste()).toEqual([]);
  });

  it('ne lève aucune anomalie si l’identifiant à refermer est déjà absent', () => {
    expect(() => service.fermer(999)).not.toThrow();
  });
});
