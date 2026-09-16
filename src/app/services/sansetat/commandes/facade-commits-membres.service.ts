// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Client typé de la Façade de commandes, dédié à l'écran « Commits des membres » (US-060, RG-060, plan_17
// chapitre 4, amendé par plan_21 le 2026-09-16) : résolution d'un membre connu par nom d'utilisateur GitLab exact
// (`interrogerMembreGitlabParUsername`) et récupération des événements de poussée d'un membre
// (`listerEvenementsPousseesMembre`), les deux appelées en boucle par le Store d'orchestration. Cinquième client
// de la Façade, classé sous `services/sansetat/commandes/` (aucun état interne conservé entre deux appels).
//
// Ces deux commandes échangent des types miroir des structures brutes du Connecteur GitLab (`Instance`,
// `MembreGroupeGitlab`, `EvenementPoussee`), tous possédés par la Façade et typés dans `types-facade.ts` : aucune
// généricité n'est nécessaire ici, à la différence des façades qui échangent la racine complète du fichier ou un
// type possédé par un Store `avecetat/etat/`. Aucun type de `MembreConnu` ne transite par ces commandes (le Store
// dérive lui-même, sans appel réseau, les membres analysables depuis `membresConnus`).
//
// Invocation IPC passée par `InvocationCommandeUtils` (et non `invoke` directement) : point de passage unique
// permettant le bouchon TS hors contexte Tauri (`ng serve`), cf. `bouchon/bouchon-commits-membres.utils.ts`.
import { Injectable } from '@angular/core';
import { ErreurConnecteurUtils } from './erreur-connecteur.utils';
import { InvocationCommandeUtils } from './invocation-commande.utils';
import type {
  ErreurConnecteur,
  EvenementPoussee,
  Instance,
  MembreGroupeGitlab,
  ResultatInterrogerMembreGitlabParUsername,
  ResultatListerEvenementsPousseesMembre,
} from './types-facade';

/**
 * Client typé de la Façade de commandes pour l'écran « Commits des membres » (US-060, RG-060). Chaque méthode
 * invoque une commande Tauri identique côté cœur natif (`interroger_membre_gitlab_par_username`,
 * `lister_evenements_poussees_membre`) et renvoie un Résultat discriminé plutôt qu'un rejet de Promise non typé.
 */
@Injectable({ providedIn: 'root' })
export class FacadeCommitsMembresService {
  /**
   * Résout un membre connu par nom d'utilisateur GitLab exact (US-060, RG-060, plan_21). `resultat` vaut `null` si
   * aucun compte GitLab actif ne correspond (cas métier, pas une anomalie).
   * @param instance - Première instance de type GitLab déclarée par le groupe applicatif analysé.
   * @param username - Nom d'utilisateur GitLab exact du membre connu recherché.
   * @returns Le compte résolu (ou `null`) en cas de succès, ou l'anomalie typée (RG-021) en cas d'échec.
   */
  public async interrogerMembreGitlabParUsername(
    instance: Instance,
    username: string,
  ): Promise<ResultatInterrogerMembreGitlabParUsername> {
    try {
      const resultat = await InvocationCommandeUtils.invoquer<MembreGroupeGitlab | null>(
        'interroger_membre_gitlab_par_username',
        { instance, username },
      );
      return { type: 'succes', resultat };
    } catch (erreur: unknown) {
      return this.enEchec(erreur);
    }
  }

  /**
   * Récupère les événements de poussée d'un membre du roster sur la fenêtre glissante (US-060, RG-060). Appelée en
   * boucle par le Store d'orchestration à concurrence limitée.
   * @param instance - Instance GitLab interrogée.
   * @param utilisateurId - Identifiant numérique GitLab du membre.
   * @param apresDate - Borne basse de la fenêtre au format `AAAA-MM-JJ` (le paramètre `after` de GitLab est
   * exclusif et à granularité de jour ; le filtrage fin est fait côté interface).
   * @returns Les événements de poussée en cas de succès, ou l'anomalie typée (RG-021) en cas d'échec.
   */
  public async listerEvenementsPousseesMembre(
    instance: Instance,
    utilisateurId: number,
    apresDate: string,
  ): Promise<ResultatListerEvenementsPousseesMembre> {
    try {
      const resultat = await InvocationCommandeUtils.invoquer<readonly EvenementPoussee[]>(
        'lister_evenements_poussees_membre',
        { instance, utilisateurId, apresDate },
      );
      return { type: 'succes', resultat };
    } catch (erreur: unknown) {
      return this.enEchec(erreur);
    }
  }

  /**
   * Convertit un rejet `unknown` de `invoke` en variante `echec` d'un Résultat : anomalie de connecteur typée si
   * elle en a la forme, sinon `reponseInattendue` pour une valeur non reconnue de la frontière IPC.
   * @param erreur - Valeur rejetée par `invoke`.
   * @returns La variante `echec` correspondante.
   */
  private enEchec(erreur: unknown): {
    readonly type: 'echec';
    readonly anomalie: ErreurConnecteur;
  } {
    if (ErreurConnecteurUtils.correspondAUneErreurConnecteur(erreur)) {
      return { type: 'echec', anomalie: erreur };
    }
    return {
      type: 'echec',
      anomalie: {
        type: 'reponseInattendue',
        message: 'Réponse inattendue de la frontière IPC (forme non reconnue)',
      },
    };
  }
}
