// Fichier généré par Angular CLI (ng new) puis adapté avec l'assistance de l'IA (Claude Code), conformément à la
// mention d'origine requise par les conventions du projet (cf. .claude/rules/01-usage-ia-et-conventions.md).
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('doit créer le composant racine', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
