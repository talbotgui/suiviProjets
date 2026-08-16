// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Test de bout en bout unique (Phase 12) : parcours déterministe couvrant l'ensemble des écrans de l'application,
// exécuté contre `ng serve` (façade de commandes bouchonnée côté TypeScript). Sélecteurs exclusivement fondés sur
// des `id` HTML (cf. docs/03_plan/plan_13_developpement.md#phase-12--test-de-bout-en-bout-playwright-ng-serve),
// aucune valeur de saisie aléatoire (cf. e2e/donnees-test.ts). Capture d'écran et vérification des boutons visibles
// avant chaque changement d'écran (e2e/aides/verification-ecran.ts).
import { expect, test } from '@playwright/test';
import {
  attendreNotificationSucces,
  avantChangementEcran,
  capturerEcran,
  verifierBoutonsVisibles,
} from './aides/verification-ecran';
import {
  CREDENTIAL_TEST,
  GROUPE_A,
  GROUPE_B,
  MARQUEUR_IA,
  MEMBRE_A_QUALIFIER_DEPUIS_ALERTE,
  MEMBRE_QUALIFIE_ANTICIPATION,
  MOT_DE_PASSE_FICHIER,
  PROJET_A1,
  PROJET_A2,
  PROJET_B1,
  PROJET_B2,
  REGLAGE_CONCURRENCE_AUDIT,
  REGLE_DEPENDANCE,
  SEUIL_VITALITE_MORT_JOURS,
  SOURCES,
} from './donnees-test';

test.describe.configure({ mode: 'serial' });

test('parcours complet — tous les écrans de l’application', async ({ page }) => {
  test.setTimeout(600_000);

  /** Remplit le mot de passe de la modale de confirmation partagée puis valide. */
  async function confirmerMotDePasse(): Promise<void> {
    const champ = page.locator('#confirmation-mot-de-passe-champ');
    await expect(champ).toBeVisible();
    await champ.fill(MOT_DE_PASSE_FICHIER);
    await page.locator('#confirmation-mot-de-passe-bouton-confirmer').click();
  }

  /**
   * Navigue vers l'écran Brouillon via le lien « Audits » de la sidebar, jamais `page.goto` (qui rechargerait la
   * page et perdrait tout l'état en mémoire de l'application, faute de persistance réelle en `ng serve`). Reprend
   * le clic jusqu'à atterrir effectivement sur `/audits/brouillon` (constat R12-03, cf. Phase 12 du plan) :
   * juste après l'affichage de « Campagne terminée », `progressionCampagne()` peut rester non nul le temps que
   * l'enregistrement du brouillon se termine côté Store, auquel cas ce lien route encore vers le Tableau de bord.
   */
  async function naviguerVersBrouillon(): Promise<void> {
    await expect(async () => {
      await page.locator('#shell-lien-audits').click();
      await expect(page).toHaveURL(/\/audits\/brouillon$/, { timeout: 2_000 });
    }).toPass({ timeout: 30_000, intervals: [1_000, 2_000, 3_000] });
  }

  /**
   * Navigue vers la Fiche projet du premier projet du tableau dense de la Synthèse des audits, jamais `page.goto`
   * (même raison que {@link naviguerVersBrouillon}) : réutilisé pour revenir sur la même fiche projet à plusieurs
   * étapes du parcours sans jamais recharger la page.
   */
  async function naviguerVersFicheProjet(): Promise<void> {
    await page.locator('#shell-lien-synthese-audits').click();
    await expect(page).toHaveURL(/\/synthese-audits$/);
    await page.locator('#tableau-dense-ligne-0').click();
    await expect(page).toHaveURL(/\/fiche-projet\//);
  }

  /** Crée un groupe (nom, description, deux instances GitLab/Sonar) depuis l'onglet Groupes déjà actif. */
  async function creerGroupe(groupe: typeof GROUPE_A): Promise<void> {
    await page.locator('#groupes-admin-bouton-creer').click();
    await page.locator('#groupes-admin-champ-nom').fill(groupe.nom);
    await page.locator('#groupes-admin-champ-description').fill(groupe.description);

    await page.locator('#groupes-admin-bouton-ajouter-instance').click();
    await page.locator('#groupes-admin-instance-0-champ-type').selectOption('gitlab');
    await page.locator('#groupes-admin-instance-0-champ-nom').fill(groupe.instanceGitlab.nom);
    await page.locator('#groupes-admin-instance-0-champ-url').fill(groupe.instanceGitlab.urlBase);

    await page.locator('#groupes-admin-bouton-ajouter-instance').click();
    await page.locator('#groupes-admin-instance-1-champ-type').selectOption('sonar');
    await page.locator('#groupes-admin-instance-1-champ-nom').fill(groupe.instanceSonar.nom);
    await page.locator('#groupes-admin-instance-1-champ-url').fill(groupe.instanceSonar.urlBase);

    // Mutation directe du Store en mémoire (`DonneesApplicationService.creerGroupe`), jamais une commande IPC :
    // aucune notification de succès n'est émise ici (constat R12-02, cf. Phase 12 du plan) ; le retour visuel
    // attendu est la fermeture du formulaire et l'ajout de la ligne à la liste, vérifiés par l'appelant.
    await page.locator('#groupes-admin-bouton-enregistrer').click();
    await expect(page.locator('#groupes-admin-champ-nom')).toBeHidden();
    await expect(page.locator('#groupes-admin-liste')).toContainText(groupe.nom);
  }

  /** Crée un projet (nom, description) pour le groupe déjà sélectionné dans l'onglet Projets. */
  async function creerProjet(projet: {
    readonly nom: string;
    readonly description: string;
  }): Promise<void> {
    await page.locator('#projets-admin-bouton-creer').click();
    await page.locator('#projets-admin-champ-nom').fill(projet.nom);
    await page.locator('#projets-admin-champ-description').fill(projet.description);
    // Mutation directe du Store en mémoire, sur le même modèle que {@link creerGroupe} (constat R12-02).
    await page.locator('#projets-admin-bouton-enregistrer').click();
    await expect(page.locator('#projets-admin-champ-nom')).toBeHidden();
    await expect(page.locator('#projets-admin-liste')).toContainText(projet.nom);
  }

  /** Crée une source (GitLab ou Sonar) pour le groupe/projet déjà sélectionnés dans l'onglet Sources. */
  async function creerSource(
    type: 'depotGitlab' | 'projetSonar',
    instanceNom: string,
    idExterne: string,
    refAuditee?: string,
  ): Promise<void> {
    await page.locator('#sources-admin-bouton-creer').click();
    await page.locator('#formulaire-source-champ-type').selectOption(type);
    await page.locator('#formulaire-source-champ-instance').selectOption({ label: instanceNom });
    const champIdExterne = page.locator('#formulaire-source-champ-id-externe');
    await champIdExterne.fill(idExterne);
    // Ferme explicitement la liste de suggestions (R11-06, touche Échap déjà gérée par le composant) : sans champ
    // suivant pour faire perdre le focus (cas Sonar, pas de « ref auditée »), elle resterait ouverte et son overlay
    // intercepterait le clic sur le bouton Enregistrer situé en dessous.
    await champIdExterne.press('Escape');
    if (refAuditee !== undefined) {
      await page.locator('#formulaire-source-champ-ref-auditee').fill(refAuditee);
    }
    // Mutation directe du Store en mémoire, sur le même modèle que {@link creerGroupe} (constat R12-02).
    await page.locator('#formulaire-source-bouton-enregistrer').click();
    await expect(page.locator('#formulaire-source-champ-id-externe')).toBeHidden();
    await expect(page.locator('#sources-admin-liste')).toContainText(idExterne);
  }

  // 1. Démarrage — création d'un nouveau fichier de données vierge, mot de passe fixe.
  await test.step('1. Démarrage', async () => {
    await page.goto('/demarrage');
    await avantChangementEcran(page, '01-demarrage');

    await page.locator('#demarrage-bouton-choisir-emplacement-creation').click();
    await expect(page.locator('.demarrage__chemin')).toBeVisible();
    await page.locator('#demarrage-champ-mot-de-passe-creation').fill(MOT_DE_PASSE_FICHIER);
    await page
      .locator('#demarrage-champ-confirmation-mot-de-passe-creation')
      .fill(MOT_DE_PASSE_FICHIER);
    await page.locator('#demarrage-bouton-creer-fichier').click();

    await expect(page).toHaveURL(/\/administration$/);
  });

  // 2. Accueil — constat sur fichier vide.
  await test.step('2. Accueil', async () => {
    await avantChangementEcran(page, '02-accueil');
    await page.locator('#shell-lien-accueil').click();
    await expect(page).toHaveURL(/\/accueil$/);
  });

  // 3. Administration > Groupes — création des deux groupes, chacun avec ses deux instances.
  await test.step('3. Administration > Groupes', async () => {
    await avantChangementEcran(page, '03-administration-groupes');
    await page.locator('#shell-lien-administration').click();
    await page.locator('#administration-onglet-groupes').click();
    await page.locator('#groupes-admin-sous-onglet-groupes').click();

    await creerGroupe(GROUPE_A);
    await creerGroupe(GROUPE_B);
    await expect(page.locator('#groupes-admin-liste')).toContainText(GROUPE_A.nom);
    await expect(page.locator('#groupes-admin-liste')).toContainText(GROUPE_B.nom);
  });

  // 4. Administration > Annotations (portée groupe) — une annotation sur le Groupe A.
  await test.step('4. Administration > Annotations de groupe', async () => {
    await avantChangementEcran(page, '04-administration-annotations');
    await page.locator('#groupes-admin-sous-onglet-annotations').click();
    await page
      .locator('#annotations-groupe-admin-champ-groupe')
      .selectOption({ label: GROUPE_A.nom });
    await page.locator('#annotations-groupe-admin-bouton-creer').click();
    await page.locator('#annotations-groupe-admin-champ-date').fill('2026-08-01');
    await page.locator('#annotations-groupe-admin-champ-libelle').fill('Création du groupe E2E');
    await page.locator('#annotations-groupe-admin-champ-categorie').fill('information');
    await page.locator('#annotations-groupe-admin-bouton-enregistrer').click();
    await confirmerMotDePasse();
    await expect(page.locator('#annotations-groupe-admin-liste')).toContainText(
      'Création du groupe E2E',
    );
  });

  // 5. Administration > Membres connus — qualification par anticipation (règle de domaine, Groupe A).
  await test.step('5. Administration > Membres connus (anticipation)', async () => {
    await avantChangementEcran(page, '05-administration-membres-connus');
    await page.locator('#groupes-admin-sous-onglet-membres-connus').click();
    await page.locator('#membres-connus-admin-champ-groupe').selectOption({ label: GROUPE_A.nom });
    await page.locator('#membres-connus-admin-bouton-creer').click();
    await page
      .locator('#membres-connus-admin-champ-critere')
      .fill(MEMBRE_QUALIFIE_ANTICIPATION.critere);
    await page
      .locator('#membres-connus-admin-champ-type-critere')
      .selectOption(MEMBRE_QUALIFIE_ANTICIPATION.typeCritere);
    await page
      .locator('#membres-connus-admin-champ-statut')
      .selectOption(MEMBRE_QUALIFIE_ANTICIPATION.statut);
    await page.locator('#membres-connus-admin-bouton-enregistrer').click();
    await confirmerMotDePasse();
    await expect(page.locator('#membres-connus-admin-liste')).toContainText(
      MEMBRE_QUALIFIE_ANTICIPATION.critere,
    );
  });

  // 6. Administration > Projets — deux projets par groupe (quatre au total).
  await test.step('6. Administration > Projets', async () => {
    await avantChangementEcran(page, '06-administration-projets');
    await page.locator('#administration-onglet-projets').click();

    await page.locator('#projets-admin-champ-groupe').selectOption({ label: GROUPE_A.nom });
    await creerProjet(PROJET_A1);
    await creerProjet(PROJET_A2);

    await page.locator('#projets-admin-champ-groupe').selectOption({ label: GROUPE_B.nom });
    await creerProjet(PROJET_B1);
    await creerProjet(PROJET_B2);

    await expect(page.locator('#projets-admin-liste')).toContainText(PROJET_B1.nom);
  });

  // 7. Administration > Sources — une source GitLab et une source Sonar par projet (huit au total).
  await test.step('7. Administration > Sources', async () => {
    await avantChangementEcran(page, '07-administration-sources');
    await page.locator('#administration-onglet-sources').click();

    const projetsParGroupe: readonly (readonly [
      typeof GROUPE_A,
      { readonly nom: string; readonly description: string },
      (typeof SOURCES)[keyof typeof SOURCES],
    ])[] = [
      [GROUPE_A, PROJET_A1, SOURCES.a1],
      [GROUPE_A, PROJET_A2, SOURCES.a2],
      [GROUPE_B, PROJET_B1, SOURCES.b1],
      [GROUPE_B, PROJET_B2, SOURCES.b2],
    ];

    for (const [groupe, projet, source] of projetsParGroupe) {
      await page.locator('#sources-admin-champ-groupe').selectOption({ label: groupe.nom });
      await page.locator('#sources-admin-champ-projet').selectOption({ label: projet.nom });
      await creerSource(
        'depotGitlab',
        groupe.instanceGitlab.nom,
        source.idExterneGitlab,
        source.refAuditee,
      );
      await creerSource('projetSonar', groupe.instanceSonar.nom, source.idExterneSonar);
    }

    await expect(page.locator('#sources-admin-liste')).toContainText(SOURCES.b2.idExterneSonar);
  });

  // 8. Credentials — saisie par instance, test de connectivité, collage JSON, sauvegarde.
  await test.step('8. Credentials', async () => {
    await avantChangementEcran(page, '08-credentials');
    await page.locator('#shell-bouton-credentials').click();
    await expect(page).toHaveURL(/\/credentials$/);

    await page.locator('#credentials-instance-0-champ-credential').fill(CREDENTIAL_TEST);
    await page.locator('#credentials-instance-0-bouton-tester').click();
    await expect(page.locator('#credentials-instance-0-verdict')).toContainText('ms');

    await page.locator('#credentials-instance-1-champ-credential').fill(CREDENTIAL_TEST);
    await page.locator('#credentials-instance-2-champ-credential').fill(CREDENTIAL_TEST);

    // Collage JSON pour la quatrième instance plutôt que le formulaire par instance (US-003) : l'identifiant
    // réel de l'instance est lu depuis `data-instance-id` (le binding Angular `[name]` d'un contrôle `ngModel`
    // est consommé par la directive `NgModel` elle-même, jamais reflété sur l'attribut DOM natif — l'attribut
    // `data-instance-id` dédié, ajouté à cette phase, est donc nécessaire pour exposer cet identifiant au test).
    const identifiantInstance = await page
      .locator('#credentials-instance-3-champ-credential')
      .getAttribute('data-instance-id');
    await page
      .locator('#credentials-champ-collage')
      .fill(JSON.stringify({ [identifiantInstance ?? '']: CREDENTIAL_TEST }));
    await expect(page.locator('#credentials-instance-3-champ-credential')).toHaveValue(
      CREDENTIAL_TEST,
    );

    await page.locator('#credentials-bouton-tout-tester').click();
    await expect(page.locator('#credentials-instance-3-verdict')).toContainText('ms');

    await page.locator('#credentials-bouton-enregistrer').click();
    await attendreNotificationSucces(page);
  });

  // 9. Paramétrage > Réglages applicatifs — ajustement de la concurrence d'audit.
  await test.step('9. Paramétrage > Réglages applicatifs', async () => {
    await avantChangementEcran(page, '09-parametrage-reglages-applicatifs');
    await page.locator('#shell-lien-parametrage').click();
    await page.locator('#parametrage-onglet-seuils-referentiels').click();

    await page.locator('#reglages-applicatifs-bouton-modifier-concurrence').click();
    await page
      .locator('#reglages-applicatifs-champ-concurrence')
      .fill(String(REGLAGE_CONCURRENCE_AUDIT));
    await page.locator('#reglages-applicatifs-bouton-enregistrer-concurrence').click();
    await confirmerMotDePasse();
    // `SqmReglagesApplicatifsParametrageComponent.confirmerEnregistrementConcurrence` n'appelle
    // `NotificationService` qu'en cas d'échec (constat R12-02, cf. Phase 12 du plan) : le retour visuel attendu
    // est la fermeture du formulaire d'édition.
    await expect(page.locator('#reglages-applicatifs-champ-concurrence')).toBeHidden();
  });

  // 10. Paramétrage > Seuils et référentiels — un seuil, une règle de dépendance, un marqueur IA.
  await test.step('10. Paramétrage > Seuils et référentiels', async () => {
    await avantChangementEcran(page, '10-parametrage-seuils-referentiels');

    await page
      .locator('#seuils-parametrage-champ-vitalite-mort-jours')
      .fill(String(SEUIL_VITALITE_MORT_JOURS));
    await page.locator('#seuils-parametrage-bouton-enregistrer').click();
    await confirmerMotDePasse();
    await attendreNotificationSucces(page);

    await page.locator('#referentiels-parametrage-bouton-ajouter-dependance').click();
    await page
      .locator('#referentiels-parametrage-champ-motif-dependance')
      .fill(REGLE_DEPENDANCE.motif);
    await page
      .locator('#referentiels-parametrage-champ-versions-dependance')
      .fill(REGLE_DEPENDANCE.versionsInitiales);
    await page.locator('#referentiels-parametrage-bouton-enregistrer-dependance').click();
    await confirmerMotDePasse();
    await expect(page.locator('#referentiels-parametrage-liste-dependances')).toContainText(
      REGLE_DEPENDANCE.motif,
    );

    await page.locator('#referentiels-parametrage-bouton-ajouter-marqueur-ia').click();
    await page.locator('#referentiels-parametrage-champ-motif-marqueur-ia').fill(MARQUEUR_IA.motif);
    await page.locator('#referentiels-parametrage-champ-outil-marqueur-ia').fill(MARQUEUR_IA.outil);
    await page.locator('#referentiels-parametrage-bouton-enregistrer-marqueur-ia').click();
    await confirmerMotDePasse();
    // `confirmerEnregistrementMarqueurIa` n'appelle `NotificationService` qu'en cas d'échec (constat R12-02, cf.
    // Phase 12 du plan) : le retour visuel attendu est l'ajout à la liste des marqueurs IA.
    await expect(page.locator('#referentiels-parametrage-liste-marqueurs-ia')).toContainText(
      MARQUEUR_IA.motif,
    );
  });

  // 11. Sauvegarde du fichier (bouton barre supérieure).
  await test.step('11. Sauvegarde du fichier', async () => {
    await avantChangementEcran(page, '11-sauvegarde');
    await page.locator('#shell-bouton-sauvegarder').click();
    await confirmerMotDePasse();
    // `SqmShellComponent.confirmerSauvegarde` n'appelle `NotificationService` qu'en cas d'échec (constat R12-02,
    // cf. Phase 12 du plan) : le retour visuel attendu est la fermeture de la modale de confirmation.
    await expect(page.locator('#confirmation-mot-de-passe-champ')).toBeHidden();
  });

  // 12. Audits > Constitution de campagne — première campagne sur les quatre projets.
  await test.step('12. Audits > Constitution de campagne (1re campagne)', async () => {
    await avantChangementEcran(page, '12-constitution-campagne');
    await page.locator('#shell-lien-audits').click();
    await expect(page).toHaveURL(/\/audits\/constitution-campagne$/);

    await page.locator('#constitution-campagne-case-tout-selectionner').check();
    await page.locator('#constitution-campagne-bouton-lancer').click();
    await confirmerMotDePasse();
  });

  // 13. Audits > Tableau de bord d'exécution — suivi jusqu'à complétion.
  await test.step('13. Audits > Tableau de bord (1re campagne)', async () => {
    await expect(page).toHaveURL(/\/audits\/tableau-de-bord$/);
    // Capture seule à l'arrivée (sans vérification des boutons) : cet écran se re-rend en continu pendant la
    // campagne (barre de progression, disparition du bouton « Annuler »), incompatible avec une itération par
    // index sur les boutons visibles. La vérification complète intervient une fois l'écran stabilisé, ci-dessous.
    await capturerEcran(page, '13-tableau-de-bord');
    await expect(page.locator('#tableau-de-bord-barre-progression')).toBeVisible();
    await expect(page.locator('#tableau-de-bord-termine')).toBeVisible({ timeout: 120_000 });
    await expect(page.locator('#tableau-de-bord-compteur')).toContainText('4 / 4');
    await verifierBoutonsVisibles(page);
  });

  // 14. Audits > Brouillon — intégration complète du premier audit de chaque projet.
  await test.step('14. Audits > Brouillon (1re intégration)', async () => {
    await naviguerVersBrouillon();
    await avantChangementEcran(page, '14-brouillon');

    await page.locator('#brouillon-bouton-integrer-tout').click();
    await confirmerMotDePasse();
    // Une fois toutes les entrées résolues, `SqmBrouillonComponent` navigue lui-même vers Constitution de
    // campagne (`router.navigateByUrl`), plutôt que de rester sur un Brouillon désormais vide.
    await expect(page).toHaveURL(/\/audits\/constitution-campagne$/);
  });

  // 15. Synthèse des audits — tableau dense, enregistrement d'une vue.
  await test.step('15. Synthèse des audits', async () => {
    await avantChangementEcran(page, '15-synthese-audits');
    await page.locator('#shell-lien-synthese-audits').click();
    await expect(page).toHaveURL(/\/synthese-audits$/);
    await expect(page.locator('#synthese-audits-compteur')).toContainText('4');

    await page.locator('#selecteur-vue-bouton-enregistrer-sous').click();
    await page.locator('#selecteur-vue-champ-nom').fill('Vue E2E');
    await page.locator('#selecteur-vue-bouton-enregistrer').click();
    await confirmerMotDePasse();
    // Depuis R12-03, `SqmSyntheseAuditsComponent.enregistrerVue` émet désormais une notification de succès (retour
    // visuel générique), en plus de la fermeture du formulaire : on l'attend puis on la ferme explicitement pour
    // qu'elle n'expire pas (auto-disparition à 5 s) pendant la vérification des boutons de l'étape suivante.
    await expect(page.locator('#selecteur-vue-champ-nom')).toBeHidden();
    await attendreNotificationSucces(page);
    await page.locator('button[aria-label="Fermer la notification"]').first().click();
  });

  // 16. Fiche projet — détail d'un projet, assertions à bornes tolérantes sur les indicateurs Sonar.
  await test.step('16. Fiche projet', async () => {
    await avantChangementEcran(page, '16-fiche-projet');
    await page.locator('#tableau-dense-ligne-0').click();
    await expect(page).toHaveURL(/\/fiche-projet\//);

    // Indicateurs Sonar jitterés ± 10 % (bouchon) : bornes tolérantes plutôt que valeurs exactes.
    const couverture = page.locator('#fiche-projet-couverture');
    await expect(couverture).toBeVisible();
    const texteCouverture = (await couverture.textContent()) ?? '';
    const valeurCouverture = Number(texteCouverture.match(/[\d.,]+/)?.[0]?.replace(',', '.'));
    if (!Number.isNaN(valeurCouverture)) {
      expect(valeurCouverture).toBeGreaterThanOrEqual(60 * 0.9);
      expect(valeurCouverture).toBeLessThanOrEqual(60 * 1.1);
    }

    await expect(page.locator('.fiche-projet__table')).toContainText(REGLE_DEPENDANCE.motif);
    await expect(page.locator('.fiche-projet__table')).toContainText('obsolète');
  });

  // 17. Liste de travail — qualification d'un membre inconnu depuis une alerte, traitement d'une autre alerte.
  await test.step('17. Liste de travail', async () => {
    await avantChangementEcran(page, '17-liste-travail');
    await page.locator('#shell-lien-liste-travail').click();
    await expect(page).toHaveURL(/\/liste-travail$/);

    await page.locator('#tableau-dense-ligne-0').click();
    await page.locator('#liste-travail-bouton-ouvrir-fiche-projet').click();
    await expect(page).toHaveURL(/\/fiche-projet\//);

    const lienQualifier = page.getByRole('link', { name: 'Qualifier ce membre' }).first();
    if (await lienQualifier.count()) {
      await lienQualifier.click();
      // Le lien « Qualifier ce membre » porte toujours au moins `?groupeId=...`
      // (`queryParamsQualification`, jamais un objet vide) : `$` seul ne peut donc jamais correspondre ici,
      // à la différence des navigations sans paramètre de requête vers ce même écran (ex. ligne 149) — défaut
      // préexistant détecté en relecture isolée de l'incrément R15-01 à R15-06, indépendant de cet incrément
      // (cf. `docs/04_rapports/rapportDeDeveloppement.md`, Étape 15 incrément 1).
      await expect(page).toHaveURL(/\/administration(\?|$)/);
      await page.locator('#administration-onglet-groupes').click();
      await page.locator('#groupes-admin-sous-onglet-membres-connus').click();
      await page
        .locator('#membres-connus-admin-champ-groupe')
        .selectOption({ label: GROUPE_A.nom });
      await page.locator('#membres-connus-admin-bouton-creer').click();
      await page
        .locator('#membres-connus-admin-champ-critere')
        .fill(MEMBRE_A_QUALIFIER_DEPUIS_ALERTE.username);
      await page.locator('#membres-connus-admin-champ-type-critere').selectOption('username');
      await page
        .locator('#membres-connus-admin-champ-statut')
        .selectOption(MEMBRE_A_QUALIFIER_DEPUIS_ALERTE.statut);
      await page.locator('#membres-connus-admin-bouton-enregistrer').click();
      await confirmerMotDePasse();
      // `SqmMembresConnusAdminComponent.confirmerEnregistrement` n'appelle `NotificationService` qu'en cas
      // d'échec (constat R12-02, cf. Phase 12 du plan) : le retour visuel attendu est l'ajout à la liste, sur le
      // modèle déjà retenu à l'étape 5.
      await expect(page.locator('#membres-connus-admin-liste')).toContainText(
        MEMBRE_A_QUALIFIER_DEPUIS_ALERTE.username,
      );
    }

    await page.locator('#shell-lien-liste-travail').click();
    const autreAlerte = page.locator('#tableau-dense-ligne-0');
    if (await autreAlerte.count()) {
      await autreAlerte.click();
      const boutonTraiter = page.locator('#liste-travail-bouton-marquer-traitee');
      if (await boutonTraiter.count()) {
        await page.locator('#liste-travail-champ-commentaire').fill('Traité par le test E2E.');
        await boutonTraiter.click();
        await confirmerMotDePasse();
      }
    }
  });

  // 18. Audits (2e campagne complète) — second point d'historique pour comparaison et graphique.
  await test.step('18. Audits (2e campagne)', async () => {
    await avantChangementEcran(page, '18-audits-seconde-campagne');
    await page.locator('#shell-lien-audits').click();
    await expect(page).toHaveURL(/\/audits\/constitution-campagne$/);

    await page.locator('#constitution-campagne-case-tout-selectionner').check();
    await page.locator('#constitution-campagne-bouton-lancer').click();
    await confirmerMotDePasse();

    await expect(page).toHaveURL(/\/audits\/tableau-de-bord$/);
    await expect(page.locator('#tableau-de-bord-termine')).toBeVisible({ timeout: 120_000 });

    await naviguerVersBrouillon();
    await page.locator('#brouillon-bouton-integrer-tout').click();
    await confirmerMotDePasse();
  });

  // 19. Synthèse graphique — graphique d'évolution (deux points désormais disponibles).
  await test.step('19. Synthèse graphique', async () => {
    await avantChangementEcran(page, '19-synthese-graphique');
    await page.locator('#shell-lien-synthese-graphique').click();
    await expect(page).toHaveURL(/\/synthese-graphique$/);

    await page.locator('#synthese-graphique-bouton-tout-selectionner').click();
    await expect(page.locator('app-graphique-evolution')).toBeVisible();
  });

  // 20. Comparaison entre deux audits — comparaison des deux audits intégrés d'un même projet.
  await test.step('20. Comparaison entre deux audits', async () => {
    await avantChangementEcran(page, '20-comparaison-audits');
    await naviguerVersFicheProjet();
    await page.locator('#fiche-projet-lien-comparer').click();
    await expect(page).toHaveURL(/\/comparaison-audits\//);

    await page.locator('#comparaison-audits-bouton-raccourci-dernier-precedent').click();
    await expect(page.locator('.comparaison-audits__table').first()).toBeVisible();
  });

  // 21. Paramétrage > Journal des modifications.
  await test.step('21. Paramétrage > Journal des modifications', async () => {
    await avantChangementEcran(page, '21-parametrage-journal');
    await page.locator('#shell-lien-parametrage').click();
    await page.locator('#parametrage-onglet-journal').click();
    // RG-023 (journal des modifications) n'est alimenté par aucun des bouchons TS de cette phase (décision déjà
    // documentée dans chacun d'eux, cohérente avec `BouchonAdministrationUtils` avant eux) : l'écran affiche donc
    // ici son état vide plutôt qu'un tableau d'entrées, seul retour visuel exploitable en `ng serve`.
    await expect(page.locator('.journal-parametrage__vide').first()).toBeVisible();
  });

  // 22. Paramétrage > Purge des audits — purge par âge, aucun audit récent supprimé.
  await test.step('22. Paramétrage > Purge des audits', async () => {
    await avantChangementEcran(page, '22-parametrage-purge');
    await page.locator('#parametrage-onglet-purge').click();

    await page.locator('#purge-parametrage-age-mode-suppression').check();
    await page.locator('#purge-parametrage-bouton-previsualiser-age').click();
    await expect(page.locator('#purge-parametrage-age-resultat-vide')).toBeVisible();
  });

  // 23. Recherche transversale — recherche d'un des projets créés.
  await test.step('23. Recherche transversale', async () => {
    await avantChangementEcran(page, '23-recherche-transversale');
    await page.locator('#shell-bouton-recherche').click();
    await page.locator('#recherche-transversale-champ').fill(PROJET_A1.nom);
    await expect(page.locator('#recherche-transversale-resultats-entites')).toContainText(
      PROJET_A1.nom,
    );
    await page.keyboard.press('Escape');
  });

  // 24. Verrouillage / déverrouillage de session.
  await test.step('24. Verrouillage / déverrouillage de session', async () => {
    await avantChangementEcran(page, '24-verrouillage');
    await page.locator('#shell-bouton-verrouiller').click();
    await expect(page.locator('.verrouillage__titre')).toBeVisible();

    await page.locator('#confirmation-mot-de-passe-champ').fill(MOT_DE_PASSE_FICHIER);
    await page.locator('#confirmation-mot-de-passe-bouton-confirmer').click();
    await expect(page.locator('.verrouillage__titre')).toHaveCount(0);
  });

  // 25. Revérification finale — règle de dépendance modifiée, second membre qualifié, jugement recalculé.
  await test.step('25. Revérification finale', async () => {
    await avantChangementEcran(page, '25-reverification-finale');
    await page.locator('#shell-lien-parametrage').click();
    await page.locator('#parametrage-onglet-seuils-referentiels').click();

    await page.locator('#referentiels-parametrage-dependance-0-bouton-modifier').click();
    await page
      .locator('#referentiels-parametrage-champ-versions-dependance')
      .fill(REGLE_DEPENDANCE.versionsRevues);
    await page.locator('#referentiels-parametrage-bouton-enregistrer-dependance').click();
    await confirmerMotDePasse();
    // Constat R12-02 (cf. Phase 12 du plan) : le retour visuel attendu est la mise à jour de la liste, pas une
    // notification (jamais émise par ce composant en cas de succès).
    await expect(page.locator('#referentiels-parametrage-liste-dependances')).toContainText(
      REGLE_DEPENDANCE.motif,
    );

    await naviguerVersFicheProjet();
    await expect(page.locator('.fiche-projet__table')).toContainText('maintenu');
  });
});
