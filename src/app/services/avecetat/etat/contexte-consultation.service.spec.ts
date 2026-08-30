// Test du Store d'état applicatif du filtre groupe/projet mutualisé (cf. contexte-consultation.service.ts,
// plan_16 incrément 2, RG-053), généré avec l'assistance de l'IA (Claude Code), conformément à
// .claude/rules/01-usage-ia-et-conventions.md.
import { TestBed } from '@angular/core/testing';
import { ContexteConsultationService } from './contexte-consultation.service';

describe('ContexteConsultationService', () => {
  let service: ContexteConsultationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContexteConsultationService);
  });

  it('démarre sans restriction et sans modification utilisateur', () => {
    expect(service.etat()).toEqual({ groupeId: null, projetIds: null });
    expect(service.filtreModifieParUtilisateur()).toBe(false);
  });

  it('definirParUtilisateur enregistre la sélection et marque le filtre comme modifié', () => {
    service.definirParUtilisateur({ groupeId: 'g1', projetIds: ['p1', 'p2'] });

    expect(service.etat()).toEqual({ groupeId: 'g1', projetIds: ['p1', 'p2'] });
    expect(service.filtreModifieParUtilisateur()).toBe(true);
  });

  it('normalise une chaîne de groupe vide et un tableau de projets vide en `null`', () => {
    service.definirParUtilisateur({ groupeId: '', projetIds: [] });

    expect(service.etat()).toEqual({ groupeId: null, projetIds: null });
  });

  it('amorcerParVueParDefaut positionne la sélection sans marquer le filtre comme modifié', () => {
    service.amorcerParVueParDefaut({ groupeId: 'g1', projetIds: null });

    expect(service.etat()).toEqual({ groupeId: 'g1', projetIds: null });
    expect(service.filtreModifieParUtilisateur()).toBe(false);
  });

  it("amorcerParVueParDefaut n'écrase jamais un choix déjà fait par l'utilisateur (RG-053)", () => {
    service.definirParUtilisateur({ groupeId: 'g2', projetIds: null });

    service.amorcerParVueParDefaut({ groupeId: 'g1', projetIds: null });

    expect(service.etat()).toEqual({ groupeId: 'g2', projetIds: null });
  });

  it('reinitialiser remet la sélection et l’indicateur de modification à leur état initial', () => {
    service.definirParUtilisateur({ groupeId: 'g1', projetIds: ['p1'] });

    service.reinitialiser();

    expect(service.etat()).toEqual({ groupeId: null, projetIds: null });
    expect(service.filtreModifieParUtilisateur()).toBe(false);
  });

  it('copie le tableau de projets reçu (aucune fuite de référence mutable)', () => {
    const projetIds = ['p1'];
    service.definirParUtilisateur({ groupeId: null, projetIds });
    projetIds.push('p2');

    expect(service.etat().projetIds).toEqual(['p1']);
  });
});
