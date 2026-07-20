// Test de la validation du JSON de credentials collé (cf. validation-credentials.utils.ts), généré avec
// l'assistance de l'IA (Claude Code), conformément à .claude/rules/01-usage-ia-et-conventions.md.
import { ValidationCredentialsUtils } from './validation-credentials.utils';

describe('ValidationCredentialsUtils', () => {
  it('doit accepter une map credentials valide', () => {
    const resultat = ValidationCredentialsUtils.validerJsonCredentials(
      '{"instance-1": "jeton-1", "instance-2": "jeton-2"}',
    );

    expect(resultat).toEqual({
      type: 'valide',
      credentials: { 'instance-1': 'jeton-1', 'instance-2': 'jeton-2' },
    });
  });

  it('doit accepter un objet vide (aucune instance renseignée)', () => {
    const resultat = ValidationCredentialsUtils.validerJsonCredentials('{}');

    expect(resultat).toEqual({ type: 'valide', credentials: {} });
  });

  it('doit rejeter un contenu syntaxiquement invalide', () => {
    const resultat = ValidationCredentialsUtils.validerJsonCredentials('{ instance-1: ');

    expect(resultat.type).toBe('invalide');
  });

  it('doit rejeter un tableau JSON', () => {
    const resultat = ValidationCredentialsUtils.validerJsonCredentials('["jeton-1", "jeton-2"]');

    expect(resultat.type).toBe('invalide');
  });

  it('doit rejeter une valeur JSON primitive', () => {
    const resultat = ValidationCredentialsUtils.validerJsonCredentials('42');

    expect(resultat.type).toBe('invalide');
  });

  it('doit rejeter un JSON valant null', () => {
    const resultat = ValidationCredentialsUtils.validerJsonCredentials('null');

    expect(resultat.type).toBe('invalide');
  });

  it('doit rejeter une valeur non-chaîne', () => {
    const resultat = ValidationCredentialsUtils.validerJsonCredentials('{"instance-1": 42}');

    expect(resultat.type).toBe('invalide');
  });

  it('doit rejeter une chaîne vide', () => {
    const resultat = ValidationCredentialsUtils.validerJsonCredentials('{"instance-1": ""}');

    expect(resultat.type).toBe('invalide');
  });
});
