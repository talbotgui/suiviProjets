import { Routes } from '@angular/router';
import { SqmAdministrationComponent } from './ecrans/administration/administration.component';
import { SqmBrouillonComponent } from './ecrans/audits/brouillon/brouillon.component';
import { SqmConstitutionCampagneComponent } from './ecrans/audits/constitution-campagne/constitution-campagne.component';
import { SqmTableauDeBordComponent } from './ecrans/audits/tableau-de-bord/tableau-de-bord.component';

// Décision arbitraire (Phase 3, à signaler dans le rapport de développement) : en l'absence d'écran d'accueil
// (US-001/US-002 n'ont pas encore d'écran), Administration est temporairement le seul écran existant et donc la
// route racine ; à revoir dès que l'écran d'accueil sera construit. Les trois écrans d'Audits (Phase 5, incréments
// 5 et 6) suivent le même choix pragmatique, routés seuls sans shell applicatif (aucun shell ne existe encore, cf.
// commentaire d'en-tête de `ecrans/audits/constitution-campagne/constitution-campagne.component.ts`).
export const routes: Routes = [
  { path: 'administration', component: SqmAdministrationComponent },
  { path: 'audits/constitution-campagne', component: SqmConstitutionCampagneComponent },
  { path: 'audits/tableau-de-bord', component: SqmTableauDeBordComponent },
  { path: 'audits/brouillon', component: SqmBrouillonComponent },
  { path: '', redirectTo: 'administration', pathMatch: 'full' },
];
