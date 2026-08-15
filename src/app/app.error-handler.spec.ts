// Test de ErrorHandlerGlobal (cf. app.error-handler.ts), généré avec l'assistance de l'IA (Claude Code),
// conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerGlobal } from './app.error-handler';
import { NotificationService } from './services/avecetat/etat/notification.service';
import { FacadeCommandesService } from './services/sansetat/commandes/facade-commandes.service';

describe('ErrorHandlerGlobal', () => {
  let gestionnaire: ErrorHandlerGlobal;
  let facadeCommandesMock: { consignerErreurUi: jest.Mock<Promise<void>, [string, string, string?]> };
  let notificationMock: { erreur: jest.Mock<void, [string]> };
  let consoleErreurEspion: jest.SpyInstance;

  beforeEach(() => {
    facadeCommandesMock = {
      consignerErreurUi: jest
        .fn<Promise<void>, [string, string, string?]>()
        .mockResolvedValue(undefined),
    };
    notificationMock = { erreur: jest.fn<void, [string]>() };
    consoleErreurEspion = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerGlobal,
        { provide: FacadeCommandesService, useValue: facadeCommandesMock },
        { provide: NotificationService, useValue: notificationMock },
      ],
    });
    gestionnaire = TestBed.inject(ErrorHandlerGlobal);
  });

  afterEach(() => {
    consoleErreurEspion.mockRestore();
  });

  it('doit consigner nom/message/pile d’une véritable erreur et notifier l’utilisateur', () => {
    const erreur = new TypeError('Cannot read properties of null (reading \'materialiteBrouillon\')');

    gestionnaire.handleError(erreur);

    expect(consoleErreurEspion).toHaveBeenCalledWith(erreur);
    expect(facadeCommandesMock.consignerErreurUi).toHaveBeenCalledWith(
      'TypeError',
      "Cannot read properties of null (reading 'materialiteBrouillon')",
      erreur.stack,
    );
    expect(notificationMock.erreur).toHaveBeenCalledTimes(1);
  });

  it('doit consigner une valeur interceptée qui n’est pas une instance de Error sans planter', () => {
    gestionnaire.handleError('une chaîne quelconque');

    expect(facadeCommandesMock.consignerErreurUi).toHaveBeenCalledWith(
      'ErreurInconnue',
      'une chaîne quelconque',
      undefined,
    );
    expect(notificationMock.erreur).toHaveBeenCalledTimes(1);
  });
});
