// Test du composant Notification (cf. notification.component.ts, R11-03), généré avec l'assistance de l'IA
// (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { SqmNotificationComponent } from './notification.component';
import { NotificationService } from '../../services/avecetat/etat/notification.service';
import { DomTestUtils } from '../../testing/dom-test.utils';

describe('SqmNotificationComponent', () => {
  let service: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqmNotificationComponent],
    }).compileComponents();
    service = TestBed.inject(NotificationService);
  });

  it('n’affiche rien tant qu’aucune notification n’est empilée', () => {
    const fixture = TestBed.createComponent(SqmNotificationComponent);
    fixture.detectChanges();

    expect(DomTestUtils.obtenirElementNatif(fixture).querySelector('.notification')).toBeNull();
  });

  it('affiche une notification de succès avec le rôle status', () => {
    const fixture = TestBed.createComponent(SqmNotificationComponent);
    service.succes('Enregistré.');
    fixture.detectChanges();

    const element = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="status"]');
    expect(element?.textContent).toContain('Enregistré.');
  });

  it('affiche une notification d’erreur avec le rôle alert', () => {
    const fixture = TestBed.createComponent(SqmNotificationComponent);
    service.erreur('Échec.');
    fixture.detectChanges();

    const element = DomTestUtils.obtenirElementNatif(fixture).querySelector('[role="alert"]');
    expect(element?.textContent).toContain('Échec.');
  });

  it('referme une notification sur activation du bouton de fermeture', () => {
    const fixture = TestBed.createComponent(SqmNotificationComponent);
    service.succes('Enregistré.');
    fixture.detectChanges();

    DomTestUtils.obtenirElementNatif(fixture).querySelector('button')?.click();
    fixture.detectChanges();

    expect(DomTestUtils.obtenirElementNatif(fixture).querySelector('.notification')).toBeNull();
  });
});
