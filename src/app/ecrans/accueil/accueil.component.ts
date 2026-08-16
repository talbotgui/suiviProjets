// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Écran Accueil (US-005, Phase 6, incrément 3) : premier écran consommateur du Moteur de jugement. Résumé depuis la
// dernière session (cf. `docs/02_documentation/08_arborescenceNavigation.md#arborescence-des-écrans`, section
// « Shell applicatif ») : encart des projets non audités depuis longtemps (`parametres.seuils.fraicheurAudit.
// ancienJours`) et des alertes non traitées (`traitementsAlertes`, RG-026, `AlertesAccueilUtils`), bandeau membre
// inconnu (RG-009) toujours visible dès qu'un membre inconnu existe sur un projet, quel que soit l'état des autres
// indicateurs, même en l'absence de toute autre alerte : ce bandeau est calculé indépendamment de
// `AlertesAccueilUtils`/`traitementsAlertes` (détection brute, jamais filtrée par un statut de traitement), sur le
// modèle de la maquette de référence (`docs/01_besoin/Suivi Qualimetrie.dc.html`, section « Écran Accueil »).
//
// Périmètre volontairement exclu de cet incrément (cf. commentaire d'en-tête de `08_arborescenceNavigation.md`) :
// les deux cartes d'action « Créer un nouveau fichier »/« Charger un fichier existant » de la maquette relèvent de
// l'écran d'accueil PRÉ-ouverture de fichier (US-001, US-002), distinct de l'écran d'Accueil POST-ouverture décrit
// ici (« résumé depuis la dernière session », au sein du shell) ; aucune route ni aucun composant ne gate
// aujourd'hui l'accès au shell sur la présence d'un fichier chargé (aucun écran de sélection de fichier ne semble
// avoir été construit avant cette phase), point qui reste hors périmètre de cet incrément et à confirmer auprès
// d'un humain le cas échéant.
//
// Décision d'architecture (à valider par un humain, cf. rapport de développement de cet incrément) : faute d'écran
// Synthèse des audits/Fiche projet/Liste de travail déjà construit (incréments suivants de ce plan, ou hors
// périmètre de la Phase 6 pour Liste de travail), la seule cause d'alerte concrètement détectable ici est le membre
// inconnu (RG-006 à RG-009), calculée directement depuis le dernier audit intégré de chaque projet
// (`Resultat.GitlabMembres`) confronté aux membres connus du groupe (`StatutMembreUtils.calculerStatutMembre`,
// Moteur de jugement, incrément 2). L'encart « alertes non traitées » n'affiche donc, pour l'instant, que ce seul
// type de cause ; le mécanisme d'agrégation (`AlertesAccueilUtils`) reste générique et absorbera sans modification
// les futurs types d'alerte au fil des incréments suivants. La clé d'alerte stable retenue (RG-026) est
// `membreInconnu|{projetId}|{username}`.
import { DatePipe } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { SqmBandeauAlerteComponent } from '../../composants/bandeau-alerte/bandeau-alerte.component';
import { DonneesApplicationService } from '../../services/avecetat/etat/donnees-application.service';
import type { Groupe } from '../../services/avecetat/etat/types-donnees';
import { StatutTraitementAlerte } from '../../services/avecetat/etat/types-donnees';
import { PerimetreCampagneUtils } from '../../services/avecetat/campagne/perimetre-campagne.utils';
import { AlertesAccueilUtils } from '../../services/sansetat/jugement/alertes-accueil.utils';
import type {
  AlerteAccueil,
  CauseAlerteActive,
  TraitementAlerteConnu,
} from '../../services/sansetat/jugement/alertes-accueil.utils';
import { HorodatageUtils } from '../../services/sansetat/jugement/horodatage.utils';
import { ParametresJugementUtils } from '../../services/sansetat/jugement/parametres-jugement.utils';
import { StatutMembreUtils } from '../../services/sansetat/jugement/statut-membre.utils';

/**
 * Nombre d'alertes actives affichées dans l'encart « Alertes principales » (décision arbitraire reprise de la
 * maquette de référence, `docs/01_besoin/Suivi Qualimetrie.dc.html` : « Liste des trois alertes les plus
 * importantes »). Aucun critère de priorité n'étant encore calculable (une seule cause d'alerte détectable à ce
 * stade, cf. commentaire d'en-tête), ce plafond ne fait aujourd'hui que tronquer la liste dans son ordre de
 * détection.
 */
const NOMBRE_ALERTES_PRINCIPALES = 3;

/**
 * Projet non audité depuis plus de `ancienJours` jours (ou jamais audité), tel que restitué par l'encart dédié de
 * l'Accueil.
 */
interface ProjetNonAudite {
  /** Identifiant du projet concerné. */
  readonly projetId: string;
  /** Nom du projet. */
  readonly nomProjet: string;
  /** Nom du groupe de rattachement. */
  readonly nomGroupe: string;
}

/**
 * Écran Accueil : résumé depuis la dernière session (US-005), premier écran consommateur du Moteur de jugement.
 */
@Component({
  selector: 'app-accueil',
  imports: [SqmBandeauAlerteComponent, DatePipe],
  templateUrl: './accueil.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './accueil.component.scss',
})
export class SqmAccueilComponent {
  private readonly donneesApplication: DonneesApplicationService =
    inject(DonneesApplicationService);

  /**
   * Nombre de groupes actuellement chargés.
   * @returns Le nombre de groupes.
   */
  public nombreGroupes(): number {
    return this.donneesApplication.groupes().length;
  }

  /**
   * Nombre total de projets actuellement chargés, tous groupes confondus.
   * @returns Le nombre de projets.
   */
  public nombreProjets(): number {
    return this.donneesApplication
      .groupes()
      .reduce((total, groupe) => total + groupe.projets.length, 0);
  }

  /**
   * Libellé de la date de la dernière campagne exécutée, au format court `JJ/MM HH:mm` (sur le modèle de la
   * maquette de référence).
   * @returns Le libellé de la dernière campagne, ou un libellé explicite si aucune campagne n'a encore été
   * exécutée.
   */
  public derniereCampagneLabel(): string {
    const campagnes = this.donneesApplication.racine()?.campagnes ?? [];
    const derniere = campagnes.reduce<{ readonly date: string } | undefined>(
      (plusRecente, campagne) =>
        plusRecente === undefined ||
        new Date(campagne.date).getTime() > new Date(plusRecente.date).getTime()
          ? campagne
          : plusRecente,
      undefined,
    );
    return derniere === undefined
      ? 'Aucune campagne'
      : HorodatageUtils.formaterHorodatageCourt(derniere.date);
  }

  /**
   * Indique si au moins un membre au statut `inconnu` (ou en `conflit`, RG-008) existe sur un projet quelconque
   * (RG-009). Pilote l'affichage du bandeau, qui reste visible indépendamment de tout traitement d'alerte (cf.
   * commentaire d'en-tête de ce fichier).
   * @returns `true` si au moins une cause de membre inconnu est détectée.
   */
  public membreInconnuDetecte(): boolean {
    return this.causesMembreInconnu().length > 0;
  }

  /**
   * Nombre de projets distincts comportant au moins un membre inconnu, restitué par la carte statistique dédiée.
   * @returns Le nombre de projets concernés.
   */
  public nombreProjetsAvecMembreInconnu(): number {
    return new Set(this.causesMembreInconnu().map((cause) => cause.cleAlerte.split('|')[1])).size;
  }

  /**
   * Message du bandeau membre inconnu (RG-009), au singulier ou au pluriel selon le nombre de projets concernés.
   * @returns Le message à afficher dans le bandeau.
   */
  public messageMembreInconnu(): string {
    const nombre = this.nombreProjetsAvecMembreInconnu();
    return nombre <= 1
      ? '1 projet comporte un membre au statut inconnu — signal de sécurité prioritaire.'
      : `${nombre} projets comportent un membre au statut inconnu — signal de sécurité prioritaire.`;
  }

  /**
   * Alertes actives de l'encart de résumé (RG-026), enrichies de la mention de leur traitement antérieur le cas
   * échéant.
   * @returns Les alertes actives, dans leur ordre de détection.
   */
  public alertesActives(): readonly AlerteAccueil[] {
    return AlertesAccueilUtils.calculerAlertesActives(
      this.causesMembreInconnu(),
      this.traitementsConnus(),
    );
  }

  /**
   * Sous-ensemble le plus important des alertes actives (décision arbitraire reprise de la maquette de référence,
   * cf. {@link NOMBRE_ALERTES_PRINCIPALES}).
   * @returns Les alertes principales à afficher.
   */
  public alertesPrincipales(): readonly AlerteAccueil[] {
    return this.alertesActives().slice(0, NOMBRE_ALERTES_PRINCIPALES);
  }

  /**
   * Projets non audités depuis plus de `parametres.seuils.fraicheurAudit.ancienJours` jours, y compris ceux
   * n'ayant jamais été audités (`PerimetreCampagneUtils.projetsNonAuditesDepuis`, déjà utilisé par
   * `SqmConstitutionCampagneComponent` pour le même seuil, F07).
   * @returns Les projets concernés, avec leur nom et celui de leur groupe de rattachement.
   */
  public projetsNonAuditesDepuisLongtemps(): readonly ProjetNonAudite[] {
    const groupes = this.donneesApplication.groupes();
    const projetIdsConcernes = new Set(
      PerimetreCampagneUtils.projetsNonAuditesDepuis(
        groupes,
        this.extraireAncienJours(),
        new Date(),
      ),
    );
    const projetsConcernes: ProjetNonAudite[] = [];
    for (const groupe of groupes) {
      for (const projet of groupe.projets) {
        if (projetIdsConcernes.has(projet.id)) {
          projetsConcernes.push({
            projetId: projet.id,
            nomProjet: projet.nom,
            nomGroupe: groupe.nom,
          });
        }
      }
    }
    return projetsConcernes;
  }

  /**
   * Détecte les causes de membre inconnu actuellement actives (RG-006 à RG-009), à partir du dernier audit intégré
   * de chaque projet (`Resultat.GitlabMembres`) confronté aux membres connus de son groupe de rattachement.
   * Dédoublonnée par clé d'alerte (`cleAlerte`, une par couple projet/username) : un projet à plusieurs sources
   * GitLab (ex. un dépôt back et un dépôt front, cf. R15-06) produit un résultat `gitlab.membres` par source, si
   * bien qu'un même membre inconnu des deux dépôts y apparaîtrait sinon deux fois, gonflant artificiellement le
   * nombre d'alertes actives (corrige R15-02, Phase 15, recette du 2026-08-16).
   * @returns Les causes actives détectées, une par membre inconnu ou en conflit distinct d'un dernier audit.
   */
  private causesMembreInconnu(): readonly CauseAlerteActive[] {
    const causesParCle = new Map<string, CauseAlerteActive>();
    for (const groupe of this.donneesApplication.groupes()) {
      for (const projet of groupe.projets) {
        const dernierAudit = projet.audits.at(-1);
        if (dernierAudit === undefined) {
          continue;
        }
        for (const resultat of dernierAudit.resultats) {
          if (resultat.type !== 'gitlab.membres') {
            continue;
          }
          for (const membre of resultat.membres) {
            const resolution = StatutMembreUtils.calculerStatutMembre(
              { username: membre.username, email: membre.emailPublic },
              groupe.membresConnus,
            );
            if (resolution.type === 'inconnu' || resolution.type === 'conflit') {
              const cause = this.construireCauseMembreInconnu(
                projet.id,
                projet.nom,
                groupe,
                membre.username,
              );
              causesParCle.set(cause.cleAlerte, cause);
            }
          }
        }
      }
    }
    return [...causesParCle.values()];
  }

  /**
   * Construit la cause d'alerte membre inconnu pour un membre donné (clé stable RG-026, cf. commentaire d'en-tête).
   * @param projetId - Identifiant du projet concerné.
   * @param nomProjet - Nom du projet concerné.
   * @param groupe - Groupe de rattachement du projet.
   * @param username - Identifiant du membre non reconnu.
   * @returns La cause d'alerte active correspondante.
   */
  private construireCauseMembreInconnu(
    projetId: string,
    nomProjet: string,
    groupe: Groupe,
    username: string,
  ): CauseAlerteActive {
    return {
      cleAlerte: `membreInconnu|${projetId}|${username}`,
      libelle: `Membre inconnu « ${username} » sur ${nomProjet} (${groupe.nom})`,
    };
  }

  /**
   * Traduit `DonneesRacine.traitementsAlertes` (RG-026) en la forme structurelle attendue par `AlertesAccueilUtils`
   * (`services/sansetat/jugement/`, qui ne connaît pas l'énumération `StatutTraitementAlerte` de
   * `services/avecetat/`, cf. commentaire d'en-tête de `alertes-accueil.utils.ts`).
   * @returns L'historique de traitement traduit, tableau vide si aucun fichier n'est chargé.
   */
  private traitementsConnus(): readonly TraitementAlerteConnu[] {
    const traitements = this.donneesApplication.racine()?.traitementsAlertes ?? [];
    return traitements.map((traitement) => ({
      cleAlerte: traitement.cleAlerte,
      traitee: traitement.statut === StatutTraitementAlerte.Traitee,
      commentaire: traitement.commentaire,
      horodatage: traitement.horodatage,
    }));
  }

  /**
   * Extrait le seuil « non audité depuis plus de N jours » paramétré, avec repli défensif désormais centralisé dans
   * `ParametresJugementUtils.lireAncienJoursAvecRepli` (RG-022, Phase 6 incrément 4 : ce seuil était auparavant
   * dupliqué à l'identique ici et dans `SqmConstitutionCampagneComponent`, cf. rapport de développement).
   * @returns Le seuil à appliquer.
   */
  private extraireAncienJours(): number {
    return ParametresJugementUtils.lireAncienJoursAvecRepli(
      this.donneesApplication.racine()?.parametres.seuils,
    );
  }
}
