// Fichier généré avec l'assistance de l'IA (Claude Code), conformément à la mention d'origine requise par
// .claude/rules/01-usage-ia-et-conventions.md.
//
// Module d'aide du test de bout en bout (Phase 12) : capture d'écran avant chaque changement d'écran, vérification
// que chaque bouton visible est cliquable (focus + nom accessible — texte visible ou aria-label, jamais une icône
// littérale exigée, cf. arbitrage explicite de la Phase 12), et attente d'un retour visuel explicite après une
// action (notification, message d'erreur au plus près du champ, ou changement de contenu attendu).
import { expect, type Locator, type Page } from '@playwright/test';

let compteurCapture = 0;

/**
 * Capture une image de l'écran courant avant un changement d'écran, numérotée dans l'ordre du parcours.
 * @param page - Page Playwright courante.
 * @param nomEtape - Nom court de l'étape sur le point de commencer (kebab-case).
 */
export async function capturerEcran(page: Page, nomEtape: string): Promise<void> {
  compteurCapture += 1;
  const numero = String(compteurCapture).padStart(2, '0');
  await page.screenshot({
    path: `e2e/test-output/captures/${numero}-${nomEtape}.png`,
    fullPage: true,
  });
}

/**
 * Vérifie que chaque bouton actuellement visible et non désactivé de la page est focusable et porte un nom
 * accessible (texte visible, `aria-label`, ou `title` à défaut) — jamais qu'il porte une icône littérale, cf.
 * arbitrage explicite de la Phase 12 (convention de l'application : libellé texte seul hors barre supérieure).
 * @param page - Page Playwright courante.
 */
export async function verifierBoutonsVisibles(page: Page): Promise<void> {
  const boutons = page.locator('button:visible, a.bouton:visible, a[class*="bouton"]:visible');
  const total = await boutons.count();
  for (let index = 0; index < total; index += 1) {
    const bouton = boutons.nth(index);
    const desactive = await bouton.isDisabled().catch(() => false);
    if (desactive) {
      continue;
    }
    const nomAccessible = await bouton.evaluate((element) => {
      const texte = (element.textContent ?? '').trim();
      const ariaLabel = element.getAttribute('aria-label') ?? '';
      const title = element.getAttribute('title') ?? '';
      return texte.length > 0 ? texte : ariaLabel.length > 0 ? ariaLabel : title;
    });
    expect(nomAccessible.length, `Bouton sans nom accessible (index ${index})`).toBeGreaterThan(0);
    await bouton.focus();
    await expect(bouton, `Bouton non focusable : « ${nomAccessible} »`).toBeFocused();
  }
}

/**
 * Point d'entrée combiné, à appeler juste avant chaque changement d'écran du parcours : capture d'écran puis
 * vérification exhaustive des boutons visibles sur l'écran quitté.
 * @param page - Page Playwright courante.
 * @param nomEtape - Nom court de l'étape sur le point de commencer (kebab-case).
 */
export async function avantChangementEcran(page: Page, nomEtape: string): Promise<void> {
  await verifierBoutonsVisibles(page);
  await capturerEcran(page, nomEtape);
}

/**
 * Attend qu'une notification de succès (`NotificationService`, `#notification .notification__item--succes`)
 * apparaisse, retour visuel générique après la plupart des actions de mutation de ce parcours.
 * @param page - Page Playwright courante.
 * @returns Le texte de la notification apparue.
 */
export async function attendreNotificationSucces(page: Page): Promise<string> {
  const notification = page.locator('#notification .notification__item--succes').first();
  await expect(notification).toBeVisible();
  return (await notification.textContent()) ?? '';
}

/**
 * Attend qu'un élément désigné devienne visible, retour visuel spécifique après une action (ex. nouvelle ligne
 * dans une liste, message d'erreur au plus près d'un champ) — sur le modèle générique déjà retenu par
 * {@link attendreNotificationSucces} pour le cas transverse.
 * @param locator - Élément dont l'apparition matérialise le retour visuel attendu.
 */
export async function attendreRetourVisuel(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
}
