// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Client typé de la Façade de commandes, dédié à la Phase 1 (US-001, US-002, US-026 ; RG-001 à RG-005) : création,
// chargement et sauvegarde du fichier de données chiffré, verrouillage et déverrouillage de la session. Ces
// commandes existent côté cœur natif (`src-tauri/src/commandes/fichier.rs`) et sont enregistrées dans
// `src-tauri/src/lib.rs` depuis l'origine du projet, mais n'avaient jusqu'ici aucun appelant côté interface : ce
// service comble ce trou (cf. rapport de diagnostic ayant motivé cette tâche).
//
// Sur le modèle strict de `facade-administration.service.ts` (générique sur le type concret de la racine échangée,
// aucun `try`/`catch`) plutôt que sur celui de `facade-commandes.service.ts` : `creerFichier`/`chargerFichier`
// échangent `DonneesRacine`, type de `services/avecetat/etat/`, qu'une dépendance de `services/sansetat/` ne peut
// jamais importer (cf. commentaire d'en-tête de `facade-administration.service.ts` et
// docs/02_documentation/14_normesDeveloppement.md#structuration-du-code-et-découpage-en-couches). Le mapping des
// anomalies (`ErreurFacade` côté cœur natif) reste donc à la charge de l'appelant (`DonneesApplicationService`), qui
// réutilise `ErreurAdministration`/`CategorieErreurAdministration` (`services/avecetat/etat/types-donnees.ts`),
// déjà documentés comme couvrant les catégories techniques héritées des commandes de fichier de cette même phase.
//
// Invocation IPC passée par `InvocationCommandeUtils` (et non `invoke` directement) depuis le 2026-07-28 : point de
// passage unique permettant le bouchon TS des cinq commandes ci-dessous hors contexte Tauri (`ng serve`), cf.
// `invocation-commande.utils.ts` et `bouchon/bouchon-fichier.utils.ts`.
import { Injectable } from '@angular/core';
import { InvocationCommandeUtils } from './invocation-commande.utils';

/**
 * Client typé de la Façade de commandes, dédié au cycle de vie du fichier de données chiffré et de la session
 * (US-001, US-002, US-026). Chaque méthode invoque une commande Tauri identique côté cœur natif (`creer_fichier`,
 * `charger_fichier`, `sauvegarder_fichier`, `verrouiller_session`, `deverrouiller_session`) et reste générique sur
 * le type concret de la racine échangée (cf. commentaire d'en-tête de ce fichier) : c'est l'appelant
 * (`DonneesApplicationService`) qui porte la connaissance du type `DonneesRacine`.
 */
@Injectable({ providedIn: 'root' })
export class FacadeFichierService {
  /**
   * Crée un nouveau fichier de données chiffré, vide (US-001, RG-001).
   * @param chemin - Chemin choisi par l'utilisateur via la boîte de dialogue native de l'OS.
   * @param motDePasse - Mot de passe saisi et confirmé du futur fichier (RG-002).
   * @returns La racine initiale du fichier créé, typée par l'appelant via `TReponse`.
   */
  public async creerFichier<TReponse>(chemin: string, motDePasse: string): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('creer_fichier', { chemin, motDePasse });
  }

  /**
   * Charge un fichier de données existant (US-002, RG-002).
   * @param chemin - Chemin du fichier choisi via la boîte de dialogue native de l'OS.
   * @param motDePasse - Mot de passe saisi par l'utilisateur.
   * @returns La racine du fichier chargé, typée par l'appelant via `TReponse`.
   */
  public async chargerFichier<TReponse>(chemin: string, motDePasse: string): Promise<TReponse> {
    return InvocationCommandeUtils.invoquer<TReponse>('charger_fichier', { chemin, motDePasse });
  }

  /**
   * Sauvegarde le fichier de données actuellement ouvert, avec une sauvegarde de sécurité horodatée de l'ancien
   * contenu (RG-001 à RG-003).
   * @param chemin - Chemin du fichier actuellement ouvert.
   * @param donnees - Racine des données courante, réécrite intégralement, générique sur `TDonnees` pour ne jamais
   * importer `DonneesRacine` depuis `services/avecetat/etat/`.
   * @param motDePasse - Mot de passe ressaisi par l'utilisateur pour cette sauvegarde (RG-002).
   * @returns Une promesse résolue une fois la sauvegarde effectuée.
   */
  public async sauvegarderFichier<TDonnees>(
    chemin: string,
    donnees: TDonnees,
    motDePasse: string,
  ): Promise<void> {
    return InvocationCommandeUtils.invoquer<void>('sauvegarder_fichier', {
      chemin,
      donnees,
      motDePasse,
    });
  }

  /**
   * Verrouille la session courante : efface la clé dérivée détenue côté cœur natif (US-026, RG-004, RG-005).
   * @returns Une promesse résolue une fois le verrouillage effectué.
   */
  public async verrouillerSession(): Promise<void> {
    return InvocationCommandeUtils.invoquer<void>('verrouiller_session', {});
  }

  /**
   * Déverrouille la session courante en revérifiant le mot de passe contre le fichier actuellement ouvert (US-026).
   * @param motDePasse - Mot de passe ressaisi par l'utilisateur.
   * @returns Une promesse résolue une fois le mot de passe revérifié avec succès.
   */
  public async deverrouillerSession(motDePasse: string): Promise<void> {
    return InvocationCommandeUtils.invoquer<void>('deverrouiller_session', { motDePasse });
  }
}
